# backend_api/main.py
from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, Body, Response
from sqlalchemy.orm import Session
from sqlalchemy import text, func, or_ # Importar func para server_default
import sqlalchemy.exc
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Any
from fastapi.security import OAuth2PasswordRequestForm
from datetime import date, datetime, timedelta,timezone
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import distinct
import traceback
import uuid
import os
from sqlalchemy.orm import selectinload # Importa selectinload
from urllib.parse import urlparse, unquote
import re
from passlib.context import CryptContext # Para hashing seguro de PINs
import json
import pytz 
import logging

# Importaciones locales
import security
import models, schemas, database
import pandas as pd
from fpdf import FPDF
from io import BytesIO as GlobalBytesIO
from fastapi.responses import StreamingResponse

# Credenciales de Firebase
import firebase_admin
from firebase_admin import credentials, storage
from PIL import Image

# --- INICIALIZACIÓN DE DOTENV ---
from dotenv import load_dotenv
load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

FIREBASE_STORAGE_BUCKET_NAME_GLOBAL: Optional[str] = None
USER_TIMEZONE_STR = "America/Mexico_City" 
try:
    USER_TIMEZONE = pytz.timezone(USER_TIMEZONE_STR)
except pytz.exceptions.UnknownTimeZoneError:
    ##print((f"ADVERTENCIA: Zona horaria '{USER_TIMEZONE_STR}' desconocida. Usando UTC como fallback.")
    USER_TIMEZONE = pytz.utc


# --- FUNCIÓN DE INICIALIZACIÓN DE FIREBASE (SE LLAMARÁ AL INICIAR FASTAPI) ---
def initialize_firebase():
    global FIREBASE_STORAGE_BUCKET_NAME_GLOBAL # Para actualizar la variable global
    try:
        firebase_project_id = os.getenv("FIREBASE_PROJECT_ID")
        firebase_private_key_id = os.getenv("FIREBASE_PRIVATE_KEY_ID")
        firebase_private_key_env = os.getenv("FIREBASE_PRIVATE_KEY")
        firebase_client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
        firebase_client_id_env = os.getenv("FIREBASE_CLIENT_ID")
        firebase_auth_uri_env = os.getenv("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth")
        firebase_token_uri_env = os.getenv("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token")
        firebase_auth_provider_x509_cert_url_env = os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs")
        firebase_client_x509_cert_url_env = os.getenv("FIREBASE_CLIENT_X509_CERT_URL")
        
        FIREBASE_STORAGE_BUCKET_NAME_GLOBAL = os.getenv("FIREBASE_STORAGE_BUCKET") # Actualiza la global

        if not all([firebase_project_id, firebase_private_key_id, firebase_private_key_env, 
                    firebase_client_email, FIREBASE_STORAGE_BUCKET_NAME_GLOBAL, 
                    firebase_client_id_env, firebase_client_x509_cert_url_env]):
            return

        formatted_private_key = firebase_private_key_env.replace('\\n', '\n')
        service_account_info = {
            "type": "service_account", "project_id": firebase_project_id,
            "private_key_id": firebase_private_key_id, "private_key": formatted_private_key,
            "client_email": firebase_client_email, "client_id": firebase_client_id_env,
            "auth_uri": firebase_auth_uri_env, "token_uri": firebase_token_uri_env,
            "auth_provider_x509_cert_url": firebase_auth_provider_x509_cert_url_env,
            "client_x509_cert_url": firebase_client_x509_cert_url_env
        }
        cred = credentials.Certificate(service_account_info)

        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred, {
                'storageBucket': FIREBASE_STORAGE_BUCKET_NAME_GLOBAL
            })

    except Exception as e:
        print(f"Error CRÍTICO durante la inicialización de Firebase en STARTUP: {e}")
SUPER_ADMIN_PIN_HASH = os.getenv("SUPER_ADMIN_PIN_HASH")
# --- FIN FUNCIÓN DE INICIALIZACIÓN DE FIREBASE ---
app = FastAPI(title="API de Doctores IMSS Bienestar")

Generic_pass = os.getenv("GENERIC_PASSWORD")

# En algún lugar accesible, quizás un archivo utils.py o dentro de main.py
def log_action(db: Session, user: models.User, action_type: str, target_entity: str = None, target_id_str: str = None, details: str = None):
    log_entry = models.AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else "System",
        action_type=action_type,
        target_entity=target_entity,
        target_id=target_id_str,
        details=details
    )
    username_to_log = "System"
    user_id_to_log = None
    if user:
        username_to_log = user.username
        user_id_to_log = user.id
    
    log_entry = models.AuditLog(
        user_id=user_id_to_log,
        username=username_to_log,
        action_type=action_type,
        target_entity=target_entity,
        target_id_str=target_id_str,
        details=details,
        timestamp=datetime.now(timezone.utc) # Establecer timestamp explícitamente
    )
    db.add(log_entry)

# --- EVENTO DE INICIO DE FASTAPI ---
@app.on_event("startup")
async def startup_event():
    initialize_firebase() # Llama a la función de inicialización de Firebase

origins = [
    "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173",
    "https://doctores-elastic-app.vercel.app",
    "https://gestion-imssb.vercel.app",
    "https://doctores-elastic-2khh14iea-imssbienestars-projects.vercel.app"
]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# --- Dependencia de Sesión de Base de Datos ---
def get_db_session():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Dependencia para Verificar Usuario Admin ---
async def get_current_admin_user(current_user: models.User = Depends(security.get_current_user)):
    # ... (tu código existente) ...
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no permitida: Se requieren privilegios de administrador",
        )
    return current_user

# --- Helper para subir archivos a Firebase Storage ---
async def upload_to_firebase(file: UploadFile, destination_path: str, optimize_image: bool = False) -> Optional[str]:
    try:
        app_instance = firebase_admin.get_app() # Intenta obtener la app inicializada
    except ValueError:
        return None # No se puede continuar
    
    try:
        bucket_name = app_instance.options.get('storageBucket')
        if not bucket_name:
            return None
        bucket = storage.bucket(bucket_name)
        
        filename, file_extension = os.path.splitext(file.filename)
        safe_filename = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", filename) # Solo permitir caracteres seguros
        unique_filename = f"{uuid.uuid4()}_{safe_filename}{file_extension}" # Añadir UUID y nombre original sanitizado
        blob_path = f"{destination_path}/{unique_filename}"
        blob = bucket.blob(blob_path)
        file_content = await file.read()

        if optimize_image and file.content_type and file.content_type.startswith("image/"):
            try:
                img_io = BytesIO(file_content)
                img = Image.open(img_io)
                
                # Convertir a RGB si es RGBA o P (paleta) para evitar problemas con JPEG
                if img.mode == "RGBA":
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[3]) # Usar el canal alfa como máscara
                    img = background
                elif img.mode == "P":
                    img = img.convert("RGB")

                img.thumbnail((1024, 1024)) # Redimensionar si es más grande
                output_buffer = io.BytesIO()
                
                img_format = "JPEG" # Por defecto a JPEG para optimización
                # Conservar PNG si es el formato original y no tiene alfa (o ya se convirtió)
                # if img.format == "PNG" and img.mode != "RGBA":
                #     img_format = "PNG"
                
                save_kwargs = {'format': img_format}
                if img_format == "JPEG":
                    save_kwargs['quality'] = 80
                    save_kwargs['optimize'] = True
                
                img.save(output_buffer, **save_kwargs)
                file_content_to_upload = output_buffer.getvalue()
                content_type_to_upload = f"image/{img_format.lower()}"
            except Exception as img_e:
                #print((f"Advertencia: Error al optimizar imagen '{file.filename}': {img_e}. Subiendo original.")
                traceback.print_exc()
                file_content_to_upload = file_content
                content_type_to_upload = file.content_type
        else:
            file_content_to_upload = file_content
            content_type_to_upload = file.content_type
        
        blob.upload_from_string(file_content_to_upload, content_type=content_type_to_upload)
        signed_url = blob.generate_signed_url(version="v4", expiration=timedelta(days=7), method="GET")
        return signed_url
    except firebase_admin.exceptions.FirebaseError as fb_e:
            #print((f"Error de Firebase al subir archivo: {fb_e}")
            traceback.print_exc()
            return None
    except Exception as e:
            #print((f"Error inesperado al subir archivo: {e}")
            traceback.print_exc()
            return None

# --- Helper para eliminar archivos de Firebase Storage ---
async def delete_from_firebase(file_url: Optional[str]) -> bool:
    try:
        app_instance = firebase_admin.get_app()
    except ValueError:
        #print(("Error: Firebase App no inicializada al intentar eliminar archivo.")
        return False
    
    if not file_url:
        return False # No hay URL, no hay nada que borrar

    try:
        # El bucket_name_from_app es el que se usó al inicializar y debe ser el correcto
        bucket_name_from_app = app_instance.options.get('storageBucket')
        if not bucket_name_from_app:
            #print(("Error: Nombre del bucket de Firebase no configurado al intentar eliminar.")
            return False
        
        bucket = storage.bucket(bucket_name_from_app)
        parsed_url = urlparse(file_url)
        
        object_path_encoded = parsed_url.path
        # Quitar el slash inicial si existe
        if object_path_encoded.startswith('/'):
            object_path_encoded = object_path_encoded[1:]
        
        # Si la URL es del tipo .../bucket_name/object_path... quitar bucket_name/
        if object_path_encoded.startswith(f"{bucket_name_from_app}/"):
            object_path = object_path_encoded[len(bucket_name_from_app)+1:]
        else:
            object_path = object_path_encoded
            
        object_path_decoded = unquote(object_path) # Decodificar caracteres como %2F

        if not object_path_decoded:
            #print((f"Advertencia: No se pudo determinar la ruta del objeto para eliminar desde la URL: {file_url}")
            return False # O True si prefieres que la DB se limpie igual

        blob_to_delete = bucket.blob(object_path_decoded)
        if blob_to_delete.exists():
            blob_to_delete.delete()
            #print((f"Archivo '{object_path_decoded}' eliminado de Firebase.")
            return True
        else:
            #print((f"Advertencia: Archivo '{object_path_decoded}' no encontrado en Firebase para eliminar.")
            return True # Considerar éxito para que la DB se limpie
            
    except firebase_admin.exceptions.FirebaseError as fb_e:
        #print((f"Error de Firebase al eliminar archivo: {fb_e}")
        return False
    except Exception as e:
        #print((f"Error inesperado al eliminar archivo de Firebase: {e}")
        return False

# --- Endpoints de la API ---
@app.get("/")
async def root():
    return {"message": "¡Bienvenido a la API de Doctores Cubanos IMSS Bienestar!"}

# --- Endpoints de Doctores CRUD ---
@app.get("/api/doctores", response_model=schemas.DoctoresPaginados, tags=["Doctores"])
async def leer_doctores(
    skip: int = Query(0, ge=0), 
    limit: int = Query(30, ge=1, le=200),
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    estatus: Optional[str] = Query("01 ACTIVO", min_length=1, max_length=50),
    # El parámetro 'incluir_eliminados' se ha eliminado de este endpoint
    db: Session = Depends(get_db_session),
   ):
    # Aplicar SIEMPRE el filtro para excluir doctores eliminados
    query = db.query(models.Doctor)\
              .filter(models.Doctor.is_deleted == False)\
              .filter(models.Doctor.coordinacion == '0')

    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                models.Doctor.nombre.ilike(search_term),
                models.Doctor.apellido_paterno.ilike(search_term),
                models.Doctor.apellido_materno.ilike(search_term),
                models.Doctor.id_imss.ilike(search_term)
            )
        )
    if estatus and estatus.lower() != "todos":
          query = query.filter(
        func.upper(func.trim(models.Doctor.estatus)) == estatus.strip().upper()
    )
    
    try:
        total_count = query.count()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al contar los doctores: {str(e)}")
    doctores = query.order_by(models.Doctor.id_imss).offset(skip).limit(limit).all()
    return {"total_count": total_count, "doctores": doctores}

@app.get("/api/doctores/detalles_filtrados", response_model=List[schemas.DoctorDetalleItem], tags=["Doctores"])
async def obtener_detalles_doctores_filtrados(
    db: Session = Depends(get_db_session),
    entidad: Optional[str] = Query(None),
    especialidad: Optional[str] = Query(None),
    nivel_atencion: Optional[str] = Query(None)
):
    """
    Obtiene la lista detallada de doctores según los filtros aplicados.
    Solo incluye doctores activos y no de coordinación.
    """
    query = db.query(models.Doctor).filter(
        models.Doctor.is_deleted == False,
        models.Doctor.estatus == '01 ACTIVO',
        models.Doctor.coordinacion == '0'
    )

    if entidad:
        query = query.filter(models.Doctor.entidad == entidad)
    if especialidad:
        query = query.filter(models.Doctor.especialidad == especialidad)
    if nivel_atencion:
        query = query.filter(models.Doctor.nivel_atencion == nivel_atencion)

    doctores_filtrados = query.order_by(models.Doctor.nombre.asc()).all()

    # Preparamos la respuesta para que coincida con el schema DoctorDetalleItem
    doctores_para_respuesta = []
    for doc in doctores_filtrados:
        # Creamos un diccionario para cada doctor
        detalle_doctor = {
            "id_imss": doc.id_imss,
            "nombre_completo": f"{doc.nombre or ''} {doc.apellido_paterno or ''} {doc.apellido_materno or ''}".strip(),
            "entidad": doc.entidad or "N/A",
            "especialidad": doc.especialidad or "N/A",
            "nivel_atencion": doc.nivel_atencion or "N/A"
        }
        doctores_para_respuesta.append(detalle_doctor)
        
    return doctores_para_respuesta


@app.get("/api/doctores/{id_imss}", response_model=schemas.DoctorDetail, tags=["Doctores"])
async def leer_doctor_por_id(
    id_imss: str, db: Session = Depends(get_db_session),
  ):
    db_doctor = db.query(models.Doctor).options(selectinload(models.Doctor.attachments)).filter(func.upper(models.Doctor.id_imss) == func.upper(id_imss)).first()
    if db_doctor is None:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    
    return db_doctor

@app.post("/api/doctores", response_model=schemas.Doctor, status_code=status.HTTP_201_CREATED, tags=["Doctores"])
async def crear_doctor(
    doctor_data: schemas.DoctorCreate, 
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        doctor_dict = doctor_data.model_dump()
        
        db_doctor = models.Doctor(**doctor_dict)
        
        db.add(db_doctor)
        db.flush()
        log_action(db, current_user, "Crear Registro", "Doctor", target_id_str=db_doctor.id_imss, details=f"Doctor creado: {db_doctor.nombre}")
        
        db.commit()
        db.refresh(db_doctor)
        return db_doctor

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Error de integridad, posible ID o CURP duplicado.")

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error inesperado en el servidor: {str(e)}")

@app.delete("/api/doctores/{id_imss}", status_code=status.HTTP_204_NO_CONTENT, tags=["Doctores"])
async def eliminar_doctor(
    id_imss: str,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss, models.Doctor.is_deleted == False).first()
    if db_doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor no encontrado o ya está eliminado.")

    try:
        db_doctor.is_deleted = True
        db_doctor.deleted_at = datetime.now(timezone.utc)
        db_doctor.deleted_by_user_id = current_user.id
        
        log_details = f"Médico marcado como eliminado: {db_doctor.nombre} (ID: {db_doctor.id_imss})"
        log_action(db, current_user, "Eliminar Registro", "Doctor", target_id_str=id_imss, details=log_details)
        
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al marcar doctor como eliminado: {str(e)}")

# --- Endpoints de Archivos ---
@app.post("/api/doctores/{id_imss}/profile-picture", response_model=schemas.Doctor, tags=["Doctores - Archivos"])
async def subir_foto_perfil_doctor(
    id_imss: str, file: UploadFile = File(...), db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    # ... (sin cambios aquí, asume que upload_to_firebase funciona) ...
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    # Eliminar foto de perfil anterior si existe
    if db_doctor.foto_url:
        await delete_from_firebase(db_doctor.foto_url)
        db_doctor.foto_url = None # Limpiar en DB antes de intentar subir la nueva
        try:
            db.commit() # Guardar el null temporalmente
        except Exception:
            db.rollback() # No crucial si la subida falla igual


    destination_path = f"doctors/{id_imss}/profile_pictures"
    file_url = await upload_to_firebase(file, destination_path, optimize_image=True)
   
    if not file_url:
        raise HTTPException(status_code=500, detail="Error al subir la foto de perfil al almacenamiento.")
    
    db_doctor.foto_url = file_url
    try:
        db.add(db_doctor); db.commit(); db.refresh(db_doctor)
        attachments = db.query(models.DoctorAttachment).filter(models.DoctorAttachment.doctor_id == id_imss).all()
        doctor_detail_response = schemas.DoctorDetail.from_orm(db_doctor)
        doctor_detail_response.attachments = [schemas.DoctorAttachment.from_orm(att) for att in attachments]
        return doctor_detail_response
    except Exception as e:
        db.rollback(); 
        raise HTTPException(status_code=500, detail="Error al guardar info de foto.")

@app.post("/api/doctores/{id_imss}/attachments", response_model=schemas.DoctorAttachment, tags=["Doctores - Archivos"])
async def subir_expediente_doctor(
    id_imss: str, file: UploadFile = File(...), db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    # ... (sin cambios aquí, asume que upload_to_firebase funciona) ...
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado para adjuntar expediente.")
    
    destination_path = f"doctors/{id_imss}/attachments"
    file_url = await upload_to_firebase(file, destination_path, optimize_image=False) # No optimizar PDFs, DOCs, etc.
    
    if not file_url:
        raise HTTPException(status_code=500, detail="Error al subir el expediente al almacenamiento.")
    
    attachment_data_pydantic = schemas.DoctorAttachmentCreate(
        doctor_id=id_imss, 
        file_name=file.filename, # Nombre original para mostrar
        file_url=file_url,        # URL (potencialmente firmada) de Firebase
        file_type=file.content_type
    )
    db_attachment = models.DoctorAttachment(
        **attachment_data_pydantic.model_dump(exclude={'doctor_id'}), # Excluir doctor_id del dump si se asigna explícitamente
        doctor_id=id_imss # Asignación explícita y segura
    )
    try:
        db.add(db_attachment)
        db.commit()
        db.refresh(db_attachment)
        return db_attachment
    except Exception as e:
        db.rollback()
        #print((f"Error al guardar expediente en DB: {e}")
        traceback.print_exc()
        if file_url: # Intentar eliminar si la DB falla
            await delete_from_firebase(file_url)
        raise HTTPException(status_code=500, detail="Error al guardar la información del expediente en la base de datos.")

@app.get("/api/doctores/{id_imss}/attachments", response_model=List[schemas.DoctorAttachment], tags=["Doctores - Archivos"])
async def listar_expedientes_doctor(
    id_imss: str, db: Session = Depends(get_db_session),
    ):
    # ... (sin cambios) ...
    #print((f"--- Listando expedientes para doctor ID: {doctor_id} ---")
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado para listar expedientes.")
    attachments = db.query(models.DoctorAttachment).filter(models.DoctorAttachment.doctor_id == id_imss).all()
    return attachments

@app.delete("/api/doctores/{id_imss}/attachments/{attachment_id}", status_code=status.HTTP_200_OK, tags=["Doctores - Archivos"])
async def eliminar_expediente_doctor(
    id_imss: str, attachment_id: int, db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    # ... (sin cambios, asume que delete_from_firebase funciona) ...
    #print((f"--- Usuario '{current_user.username}' eliminando expediente ID: {attachment_id} para doctor ID: {doctor_id} ---")
    db_attachment = db.query(models.DoctorAttachment).filter(
        models.DoctorAttachment.id == attachment_id,
        models.DoctorAttachment.doctor_id == id_imss
    ).first()
    if not db_attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expediente adjunto no encontrado.")
    file_url_to_delete = db_attachment.file_url
    firebase_deleted = await delete_from_firebase(file_url_to_delete)
    if not firebase_deleted:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar el archivo del almacenamiento. El registro en la base de datos no fue eliminado."
        )
    try:
        db.delete(db_attachment); db.commit()
        return {"detail": f"Expediente ID {attachment_id} eliminado exitosamente."}
    except Exception as e:
        db.rollback(); print(f"Error al eliminar expediente de DB: {e}"); traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error al eliminar expediente de DB.")

@app.put("/api/doctores/{id_imss}", response_model=schemas.DoctorDetail, tags=["Doctores"])
async def actualizar_doctor_perfil_completo(
    id_imss: str,
    doctor_update_data: schemas.DoctorProfileUpdateSchema = Body(...), # Los datos que vienen del frontend
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    
    if current_user.role == 'consulta':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar datos."
        )
     
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if db_doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor no encontrado")
    original_estatus_guardado = db_doctor.estatus
    nuevo_estatus_payload = doctor_update_data.estatus if hasattr(doctor_update_data, 'estatus') else None

    # REGLA: Solo Admin puede cambiar el estatus DESDE "Defunción" a OTRO estatus
    if original_estatus_guardado == "Defunción":
        if nuevo_estatus_payload is not None and nuevo_estatus_payload != "Defunción":
            if current_user.role != "admin":
                #print((f"ERROR BACKEND: Usuario '{current_user.username}' (Rol: {current_user.role}) intentó cambiar estatus 'Defunción'. Acceso denegado.")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Solo un administrador puede cambiar el estatus de un registro marcado como 'Defunción'."
                )
            #print((f"INFO BACKEND: Admin '{current_user.username}' cambiando estatus desde 'Defunción' a '{nuevo_estatus_payload}'.")
    
    if nuevo_estatus_payload == "Defunción" and original_estatus_guardado != "Defunción":
        print(f"ALERTA BACKEND: Usuario '{current_user.username}' (Rol: {current_user.role}) está cambiando estatus a 'Defunción' para doctor ID {id_imss}")

    # 1. Obtener datos enviados por el cliente (SOLO UNA VEZ)
    update_data_dict = doctor_update_data.model_dump(exclude_unset=True) # Solo campos que el cliente envió
    changed_field_names = [] # Lista para guardar los nombres de los campos que realmente cambian

    # 2. Sanear datos en update_data_dict ANTES de compararlos y aplicarlos
    if 'curp' in update_data_dict and update_data_dict['curp'] == '':
        update_data_dict['curp'] = None
    if 'comentarios_estatus' in update_data_dict and update_data_dict['comentarios_estatus'] == '':
        update_data_dict['comentarios_estatus'] = None
    # Añade más saneamientos si es necesario

    # 3. Comparar y aplicar actualizaciones. Registrar campos cambiados.
    for key, new_value in update_data_dict.items():
        if hasattr(db_doctor, key):
            old_value = getattr(db_doctor, key)

            # Normalizar para comparación (especialmente para fechas y None vs string vacío)
            old_value_comp = old_value.isoformat() if isinstance(old_value, (date, datetime)) else (str(old_value) if old_value is not None else None)
            new_value_comp = new_value.isoformat() if isinstance(new_value, (date, datetime)) else (str(new_value) if new_value is not None else None)
            
            if old_value_comp != new_value_comp:
                # Transforma el nombre del campo a un formato más legible para el log si quieres
                # legible_name = key.replace('_', ' ').title()
                # changed_field_names.append(legible_name)
                changed_field_names.append(key) # Guardar el nombre original del campo
                #print((f"INFO BACKEND: Campo '{key}' cambiado de '{old_value_comp}' a '{new_value_comp}'")
            
            #print((f"INFO BACKEND: Aplicando setattr: db_doctor.{key} = {repr(new_value)}")
            setattr(db_doctor, key, new_value) # Aplicar el nuevo valor

    # 4. Lógica de Limpieza Basada en el ESTATUS FINAL que ahora tiene db_doctor
    estatus_final_en_db_obj = db_doctor.estatus
    #print((f"INFO BACKEND: Estatus en db_doctor DESPUÉS de aplicar update_data y ANTES de limpieza específica: '{estatus_final_en_db_obj}'")

    if estatus_final_en_db_obj != "05 BAJA":
        if db_doctor.motivo_baja is not None: print(f"INFO BACKEND: Limpiando motivo_baja (era: '{db_doctor.motivo_baja}') porque estatus es '{estatus_final_en_db_obj}'")
        db_doctor.motivo_baja = None
    
    if estatus_final_en_db_obj != "Defunción":
        if db_doctor.fecha_fallecimiento is not None: print(f"INFO BACKEND: Limpiando fecha_fallecimiento (era: '{db_doctor.fecha_fallecimiento}') porque estatus es '{estatus_final_en_db_obj}'")
        db_doctor.fecha_fallecimiento = None
    
    if estatus_final_en_db_obj == "01 ACTIVO":
        campos_a_limpiar_si_activo = ["notificacion_baja", "fecha_extraccion", "fecha_notificacion"] 
        #print((f"INFO BACKEND: Estatus es 'Activo'. Limpiando campos: {campos_a_limpiar_si_activo}")
        for campo in campos_a_limpiar_si_activo:
            if hasattr(db_doctor, campo) and getattr(db_doctor, campo) is not None: 
                #print((f"INFO BACKEND: Limpiando campo '{campo}' (era: {getattr(db_doctor, campo)})")
                setattr(db_doctor, campo, None)
    
    elif estatus_final_en_db_obj in ["Baja", "Baja Definitiva", "Defunción"]: 
        campos_a_limpiar_si_baja = ["nivel_atencion", "turno", "nombre_unidad"]
        #print((f"INFO BACKEND: Estatus es '{estatus_final_en_db_obj}'. Limpiando campos: {campos_a_limpiar_si_baja}")
        for campo in campos_a_limpiar_si_baja:
            if hasattr(db_doctor, campo) and getattr(db_doctor, campo) is not None:
                #print((f"INFO BACKEND: Limpiando campo '{campo}' (era: {getattr(db_doctor, campo)})")
                setattr(db_doctor, campo, None)

    # 5. Validación de Unicidad para CURP
    if db_doctor.curp is not None: 
        #print((f"INFO BACKEND: Verificando unicidad para CURP: '{db_doctor.curp}'")
        existing_doctor_curp = db.query(models.Doctor).filter(
            models.Doctor.curp == db_doctor.curp,
            models.Doctor.id_imss != id_imss # Excluir el doctor actual de la búsqueda
        ).first()
        if existing_doctor_curp:
            #print((f"ERROR BACKEND: CURP '{db_doctor.curp}' duplicado encontrado para doctor ID {existing_doctor_curp.id}.")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El CURP '{db_doctor.curp}' ya está registrado para otro doctor."
            )
    
    # 6. Commit a la base de datos y registro de auditoría
    try:
        db.add(db_doctor) # SQLAlchemy rastrea el objeto db_doctor y aplicará los cambios con setattr

        if changed_field_names:
            # Crear un string como "Campos actualizados: Nombre Completo, Estatus, Telefono"
            details_for_log = f"Se actualizo Registro:  {db_doctor.nombre}: {', '.join(changed_field_names)}."
        else:
            # Si no hubo cambios de valor, aunque se haya hecho un PUT
            details_for_log = "Actualización procesada, sin cambios de valor detectados en los campos enviados."
        # --- FIN DE MODIFICACIÓN ---
        
        log_action(
            db=db, 
            user=current_user, 
            action_type="Actualizar Registro", 
            target_entity="Doctor",
            target_id_str =id_imss,
            details=details_for_log # Usar el nuevo string descriptivo
        )
        db.commit()
        #print(("INFO BACKEND: db.commit() EJECUTADO.")
        
        db.refresh(db_doctor)
        #print(("INFO BACKEND: db.refresh(db_doctor) EJECUTADO.")
        
        # Preparar la respuesta (DoctorDetail incluye attachments)
        # attachments = db.query(models.DoctorAttachment).filter(models.DoctorAttachment.doctor_id == doctor_id).all()
        # db_doctor.attachments = attachments # Asignar si la relación no se carga automáticamente
        
        doctor_detail_response = schemas.DoctorDetail.from_orm(db_doctor)
        
        #print((f"DEBUG BACKEND (#print( 4): Estatus en RESPONSE OBJECT: '{doctor_detail_response.estatus}'")
        #print((f"--- FIN ACTUALIZAR DOCTOR ID: {doctor_id} ---")
        
        return doctor_detail_response
            
    except IntegrityError as e:
        db.rollback()
        #print((f"ERROR BACKEND: IntegrityError - {e.orig}")
        # ... (tu manejo de IntegrityError mejorado) ...
        error_info_orig = e.orig.diag.message_detail if hasattr(e.orig, 'diag') and hasattr(e.orig.diag, 'message_detail') else str(e.orig)
        detail_message = f"Error de integridad en base de datos. Detalles: {error_info_orig}"
        if hasattr(e, 'orig') and e.orig is not None and getattr(e.orig, 'pgcode', '') == '23505': 
            match = re.search(r'key \((.*?)\)=\((.*?)\) already exists', error_info_orig, re.IGNORECASE)
            if match: detail_message = f"El valor '{match.group(2)}' para el campo '{match.group(1)}' ya existe."
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail_message)

    except Exception as e:
        db.rollback()
        #print((f"ERROR BACKEND: Exception - {e}")
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error inesperado al actualizar: {str(e)}")

# --- Endpoint de Autenticación (Login) ---
@app.post("/api/token", response_model=schemas.Token, tags=["Autenticación"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db_session)
):
    # ... (tu código sin cambios) ...
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos",
        )
    # Crea el token de acceso siempre
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role, "userId": user.id}
    )
    
    # Prepara la respuesta base
    response_data = {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {"id": user.id, "username": user.username, "role": user.role}
    }

    # Si el usuario debe cambiar su contraseña, AÑADE el flag a la respuesta exitosa
    if user.must_change_password:
        response_data["action_required"] = "change_password"

    return response_data
@app.put("/api/users/me/change-password", status_code=status.HTTP_200_OK, tags=["Usuarios"])
async def user_change_own_password(
    payload: schemas.UserChangePassword,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user) # Tu función para obtener el usuario actual
):
    if not payload.new_password or len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 8 caracteres."
        )
    
    user_to_update = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="No se encontró el usuario para actualizar.")

    user_to_update.hashed_password = security.get_password_hash(payload.new_password)
    user_to_update.must_change_password = False
    
    try:
        # Ya no es necesario db.add() porque el objeto fue obtenido de esta sesión
        db.commit()
        return {"detail": "Contraseña actualizada exitosamente. Por favor, inicia sesión de nuevo."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Error al guardar la nueva contraseña."
        )
    
# --- Endpoints de Administración de Usuarios ---
@app.get("/api/admin/users", response_model=List[schemas.UserAdminView], tags=["Admin - Usuarios"])
async def admin_leer_usuarios(
    db: Session = Depends(get_db_session), current_admin: models.User = Depends(get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role == 'consulta':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar datos."
        )
    # ... (tu código sin cambios) ...
    users = db.query(models.User).order_by(models.User.id).all()
    return users

@app.post("/api/admin/users/register", response_model=schemas.UserAdminView, status_code=status.HTTP_201_CREATED, tags=["Admin - Usuarios"])
async def admin_crear_usuario(
    user_data: schemas.UserCreateAdmin, 
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
 
    # ... (tu código sin cambios) ...
    existing_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing_user: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nombre de usuario ya existe.")
    valid_roles = ["user", "admin","consulta"];
    if user_data.role not in valid_roles: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol inválido.")
    hashed_password = security.get_password_hash(Generic_pass)
    db_user = models.User(username=user_data.username, hashed_password=hashed_password, role=user_data.role, must_change_password=True)
    try:
        db.add(db_user); db.commit(); db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback(); traceback.print_exc(); raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al crear usuario.")

@app.delete("/api/admin/users/{user_id}", status_code=status.HTTP_200_OK, tags=["Admin - Usuarios"])
async def admin_eliminar_usuario(
    user_id: int, db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role == 'consulta':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar datos."
        )
    # ... (tu código sin cambios) ...
    if current_admin.id == user_id: raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes eliminarte.")
    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if user_to_delete is None: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    try:
        db.delete(user_to_delete); db.commit()
        return {"detail": f"Usuario '{user_to_delete.username}' eliminado."}
    except Exception as e:
        db.rollback(); traceback.print_exc(); raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al eliminar usuario.")

@app.put("/api/admin/users/{user_id}/reset-password", status_code=status.HTTP_200_OK, tags=["Admin - Usuarios"])
async def admin_reset_password(
    user_id: int,
    db: Session = Depends(get_db_session), current_admin: models.User = Depends(get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role == 'consulta':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar datos."
        )
    # ... (tu código sin cambios) ...
    user_to_update = db.query(models.User).filter(models.User.id == user_id).first()
    if user_to_update is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    new_hashed_password = security.get_password_hash(Generic_pass)
    
    try:
        user_to_update.hashed_password = new_hashed_password
        user_to_update.must_change_password = True
        db.add(user_to_update); db.commit()
        return {"detail": f"Contraseña para '{user_to_update.username}' restablecida."}
    except Exception as e:
        db.rollback(); traceback.print_exc(); raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al resetear contraseña.")

# --- Endpoints de Reportes y Gráficas ---
@app.get("/api/reporte/xlsx", tags=["Reportes"])
async def generar_reporte_excel(
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role == 'consulta':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar datos."
        )
    try:
        # Construir la consulta base
        query = db.query(models.Doctor)

        # Aplicar filtros según la lógica de negocio para el reporte
        # Por ejemplo, siempre excluir los eliminados para este reporte público
        query = query.filter(models.Doctor.is_deleted == False)
        #print("DEBUG Reporte Excel: Aplicando filtro is_deleted == False")

        
        # Ordenar los resultados si es necesario
        if hasattr(models.Doctor, 'id_imss'):
            query = query.order_by(models.Doctor.id_imss)
        
        doctores_orm = query.all()

        if not doctores_orm:
            # Considera devolver un 204 No Content o un Excel vacío con encabezados
            # Por ahora, un error si no hay datos podría ser confuso, mejor un Excel vacío.
            #print("DEBUG Reporte Excel: No hay doctores para el reporte.")
            # Crear un DataFrame vacío con las columnas esperadas para que el archivo no esté corrupto
            column_names = [
                "ID_IMSS", "NOMBRE","APELLIDO_PATERNO","APELLIDO_MATERNO", "ESTATUS","MATRIMONIO_ID", "CURP", 
                "CEDULA_ESP","CEDULA_LIC","ESPECIALIDAD","ENTIDAD","CLUES","FORMA_NOTIFICACION","MOTIVO_BAJA",
                "FECHA_EXTRACCION","FECHA_NOTIFICACION","SEXO","TURNO","NOMBRE_UNIDAD","MUNICIPIO","NIVEL_ATENCION",
                "FECHA_ESTATUS","DESPLIEGUE","FECHA_VUELO","ESTRATO","ACUERDO","CORREO","ENTIDAD_NACIMIENTO","TELEFONO",
                "COMENTARIOS_ESTATUS","FECHA_NACIMIENTO","PASAPORTE","FECHA_EMISION","FECHA_EXPIRACION",
                "DOMICILIO","LICENCIATURA","INSTITUCION_LIC","INSTITUCION_ESP","FECHA_EGRESO_LIC", "FECHA_EGRESO_ESP", "TIPO_ESTABLECIMIENTO","SUBTIPO_ESTABLECIMIENTO","DIRECCION_UNIDAD","REGION"
                "FECHA_INICIO","FECHA_FIN","MOTIVO","TIPO_INCAPACIDAD",
            ]
            df = pd.DataFrame(columns=column_names)

        else:
            # Convertir la lista de objetos SQLAlchemy a una lista de diccionarios
            # Selecciona los campos que quieres en el reporte
            doctores_data = []
            for doc in doctores_orm:
                doctores_data.append({
                    "ID_IMSS": doc.id_imss,
                    "NOMBRE": doc.nombre,
                    "APELLIDO_PATERNO": doc.apellido_paterno,
                    "APELLIDO_MATERNO": doc.apellido_materno, 
                    "ESTATUS": doc.estatus,
                    "MATRIMONIO_ID": doc.matrimonio_id, 
                    "CURP": doc.curp, 
                    "CEDULA_ESP": doc.cedula_esp,
                    "CEDULA_LIC": doc.cedula_lic,
                    "ESPECIALIDAD": doc.especialidad,
                    "ENTIDAD": doc.entidad,
                    "CLUES": doc.clues,
                    "FORMA_NOTIFICACION":doc.forma_notificacion,
                    "MOTIVO_BAJA": doc.motivo_baja,
                    "FECHA_EXTRACCION": doc.fecha_extraccion,
                    "FECHA_NOTIFICACION":  doc.fecha_notificacion,
                    "SEXO": doc.sexo,
                    "TURNO": doc.turno,
                    "NOMBRE_UNIDAD": doc.nombre_unidad,
                    "MUNICIPIO": doc.municipio,
                    "NIVEL_ATENCION": doc.nivel_atencion,
                    "FECHA_ESTATUS" : doc.fecha_estatus,
                    "DESPLIEGUE" : doc.despliegue,
                    "FECHA_VUELO" : doc.fecha_vuelo,
                    "ESTRATO" : doc.estrato,
                    "ACUERDO" : doc.acuerdo,
                    "CORREO" : doc.correo,
                    "ENTIDAD_NACIMIENTO" : doc.entidad_nacimiento,
                    "TELEFONO" : doc.telefono,
                    "COMENTARIOS_ESTATUS" : doc.comentarios_estatus,
                    "FECHA_NACIMIENTO" : doc.fecha_nacimiento,
                    "PASAPORTE" : doc.pasaporte,
                    "FECHA_EMISION": doc.fecha_emision,
                    "FECHA_EXPIRACION": doc.fecha_expiracion,
                    "DOMICILIO" : doc.domicilio,
                    "LICENCIATURA" : doc.licenciatura,
                    "INSTITUCION_LIC" : doc.institucion_lic,
                    "INSTITUCION_ESP" : doc.institucion_esp,
                    "FECHA_EGRESO_LIC" : doc.fecha_egreso_lic, 
                    "FECHA_EGRESO_ESP" : doc.fecha_egreso_esp, 
                    "TIPO_ESTABLECIMIENTO" : doc.tipo_establecimiento ,
                    "SUBTIPO_ESTABLECIMIENTO": doc. subtipo_establecimiento,
                    "DIRECCION_UNIDAD": doc.direccion_unidad,
                    "REGION": doc.region,
                    "FECHA_INICIO" : doc.fecha_inicio,
                    "FECHA_FIN": doc.fecha_fin,
                    "MOTIVO": doc.motivo,
                    "TIPO_INCAPACIDAD":doc.tipo_incapacidad
                })
            df = pd.DataFrame(doctores_data)

        # --- CORRECCIÓN PARA DATETIMES CON TIMEZONE ---
        for col in df.columns:
            # Verificar si la columna es de tipo datetime y tiene timezone
            if pd.api.types.is_datetime64_any_dtype(df[col]) and getattr(df[col].dt, 'tz', None) is not None:
                #print(f"DEBUG Reporte Excel: Convirtiendo columna '{col}' a timezone-naive.")
                df[col] = df[col].dt.tz_localize(None)
            # Si tus fechas son objetos 'date' de Python y no datetimes, usualmente no tienen tz y no causan problema.
            # Si son strings que representan fechas, pandas podría inferirlos como datetime al crear el DataFrame.
        # --- FIN CORRECCIÓN ---

        output = GlobalBytesIO()
        # Usar with para asegurar que el writer se cierre correctamente
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Doctores')
        
        output.seek(0)

        headers = {
            'Content-Disposition': 'attachment; filename="reporte_doctores.xlsx"'
        }
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except Exception as e:
        print(f"Error al generar reporte Excel: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor al generar el reporte Excel: {str(e)}"
        )

@app.get("/api/reporte/pdf", tags=["Reportes"])
async def generar_reporte_resumen_pdf(
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role == 'consulta':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar datos."
        )
    # ... (tu código sin cambios, con pdf.output()) ...
    query_total_general = text("SELECT COUNT(*) FROM doctores;"); total_general_doctores = db.execute(query_total_general).scalar_one_or_none() or 0
    query_estado = text("SELECT entidad, COUNT(*) as total FROM doctores WHERE entidad IS NOT NULL AND entidad != '' GROUP BY entidad ORDER BY entidad;"); result_estado = db.execute(query_estado); data_por_estado = [{"label": row[0], "total": row[1]} for row in result_estado]
    query_especialidad = text("SELECT especialidad, COUNT(*) as total FROM doctores WHERE especialidad IS NOT NULL AND especialidad != '' GROUP BY especialidad ORDER BY especialidad;"); result_especialidad = db.execute(query_especialidad); data_por_especialidad = [{"label": row[0], "total": row[1]} for row in result_especialidad]
    if not data_por_estado and not data_por_especialidad and total_general_doctores == 0 : raise HTTPException(status_code=404, detail="No hay datos.")
    pdf = FPDF(orientation='P', unit='mm', format='A4'); pdf.add_page(); pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font('Arial', 'B', 16); pdf.cell(0, 10, 'Reporte Doctores', 0, 1, 'C'); pdf.ln(5)
    pdf.set_font('Arial', 'B', 12); pdf.cell(0, 10, f'Total de Doctores Registrados: {total_general_doctores}', 0, 1, 'L'); pdf.ln(10)
    if data_por_estado:
        pdf.set_font('Arial', 'B', 12); pdf.cell(0, 10, 'Doctores por Estado', 0, 1, 'L'); pdf.set_font('Arial', 'B', 10)
        col_widths = [130, 40]; headers = ['Estado', 'Total Doctores']; pdf.set_fill_color(220, 220, 220)
        for h, w in zip(headers, col_widths): pdf.cell(w, 7, h, 1, 0, 'C', fill=True)
        pdf.ln(); pdf.set_font('Arial', '', 10)
        for item in data_por_estado:
            for d, w in zip([str(item['label']), str(item['total'])], col_widths): pdf.cell(w, 6, d, 1, 0)
            pdf.ln()
        pdf.ln(10)
    if data_por_especialidad:
        pdf.set_font('Arial', 'B', 12); pdf.cell(0, 10, 'Doctores por Especialidad', 0, 1, 'L'); pdf.set_font('Arial', 'B', 10)
        col_widths = [130, 40]; headers = ['Especialidad', 'Total Doctores']; pdf.set_fill_color(220, 220, 220)
        for h, w in zip(headers, col_widths): pdf.cell(w, 7, h, 1, 0, 'C', fill=True)
        pdf.ln(); pdf.set_font('Arial', '', 10)
        for item in data_por_especialidad:
            for d, w in zip([str(item['label']), str(item['total'])], col_widths): pdf.cell(w, 6, d, 1, 0)
            pdf.ln()
        pdf.ln(10)
    pdf_bytes = pdf.output(); pdf_output_stream = GlobalBytesIO(pdf_bytes)
    return StreamingResponse(pdf_output_stream, headers={'Content-Disposition': 'attachment; filename="reporte_resumido_doctores.pdf"'}, media_type='application/pdf')

@app.get("/api/graficas/doctores_por_estado", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
async def get_data_grafica_doctores_por_estado(
    db: Session = Depends(get_db_session)
):
    # ... (tu código sin cambios) ...
    query = text("SELECT entidad as label, COUNT(*) as value FROM doctores WHERE estatus = '01 ACTIVO' AND entidad IS NOT NULL AND coordinacion != '1' AND entidad != '' AND entidad != 'NO APLICA'GROUP BY entidad ORDER BY value ASC;")
    result = db.execute(query); return [{"label": row.label, "value": row.value} for row in result]

@app.get("/api/graficas/doctores_por_especialidad", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
async def get_data_grafica_doctores_por_especialidad(
    db: Session = Depends(get_db_session)
):
    # ... (tu código sin cambios) ...
    query = text("SELECT especialidad as label, COUNT(*) as value FROM doctores WHERE especialidad IS NOT NULL AND especialidad != '' GROUP BY especialidad ORDER BY value DESC;")
    result = db.execute(query); return [{"label": row.label, "value": row.value} for row in result]

@app.get("/api/graficas/doctores_por_estatus", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
async def get_data_grafica_doctores_por_estatus(
    db: Session = Depends(get_db_session)
):
    # ... (tu código sin cambios) ...
    query = text("""SELECT COALESCE(estatus, 'SD') as label, COUNT(*) as value FROM doctores WHERE estatus IS NOT NULL AND coordinacion != '1' AND estatus != '' GROUP BY label ORDER BY value DESC;""")
    result = db.execute(query); data_items = []
    for row in result:
        if row.label: data_items.append({"id": row.label, "label": row.label, "value": row.value})
    return data_items

@app.get("/api/graficas/doctores_por_nivel_atencion", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
async def get_data_grafica_doctores_por_nivel_atencion(
    db: Session = Depends(get_db_session)
):
    """
    Obtiene el número de doctores agrupados por su nivel de atención.
    Los niveles de atención nulos o vacíos se agrupan como 'SD' (Sin Dato).
    """
    query = text("""
        SELECT 
            COALESCE(nivel_atencion, 'SD') as label,  -- Asigna 'SD' si es NULL o vacío
            COUNT(*) as value 
        FROM doctores 
            WHERE 
            estatus = '01 ACTIVO' AND coordinacion = '0'  
        GROUP BY label 
        ORDER BY value DESC;
    """)
    
    result = db.execute(query)
    
    data_items = []
    for row in result:
        data_items.append({"id": row.label, "label": row.label, "value": row.value})
        
    return data_items

@app.get("/api/admin/audit-logs", response_model=schemas.AuditLogsPaginados, tags=["Admin - Auditoría"])
async def leer_logs_auditoria(
   db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user), 
    skip: int = Query(0, ge=0, description="Número de registros a saltar para paginación"),
    limit: int = Query(100, ge=1, le=200, description="Número máximo de registros a devolver"),
    start_date: Optional[date] = Query(None, description="Fecha de inicio (YYYY-MM-DD) en zona horaria local del usuario"),
    end_date: Optional[date] = Query(None, description="Fecha de fin (YYYY-MM-DD) en zona horaria local del usuario"),
    username: Optional[str] = Query(None, description="Filtrar por nombre de usuario exacto"),
    action_type: Optional[str] = Query(None, description="Filtrar por tipo de acción exacto"),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role == 'consulta':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar datos."
        )
    logs_query = db.query(models.AuditLog)

    if username:
        # Asegúrate que 'username' es el nombre correcto del campo en tu modelo AuditLog
        logs_query = logs_query.filter(models.AuditLog.username == username)
    
    if action_type:
        # Asegúrate que 'action_type' es el nombre correcto del campo en tu modelo AuditLog
        logs_query = logs_query.filter(models.AuditLog.action_type == action_type)

    if start_date:
        # 1. Crear un datetime "naive" (sin zona horaria) al inicio del día local seleccionado
        local_start_dt_naive = datetime.combine(start_date, datetime.min.time())
        # 2. Asignar la zona horaria del usuario a este datetime naive para hacerlo "aware"
        local_start_dt_aware = USER_TIMEZONE.localize(local_start_dt_naive)
        # 3. Convertir este datetime aware (en zona horaria del usuario) a UTC
        start_datetime_utc = local_start_dt_aware.astimezone(pytz.utc)
        logs_query = logs_query.filter(models.AuditLog.timestamp >= start_datetime_utc)

    if end_date:
        # 1. Crear un datetime "naive" para el inicio del DÍA SIGUIENTE al end_date seleccionado
        local_end_dt_exclusive_naive = datetime.combine(end_date + timedelta(days=1), datetime.min.time())
        # 2. Asignar la zona horaria del usuario
        local_end_dt_exclusive_aware = USER_TIMEZONE.localize(local_end_dt_exclusive_naive)
        # 3. Convertirlo a UTC
        end_datetime_exclusive_utc = local_end_dt_exclusive_aware.astimezone(pytz.utc)
        
        logs_query = logs_query.filter(models.AuditLog.timestamp < end_datetime_exclusive_utc)
        
    # Contar
    try:
        # No es necesario reasignar a count_query, logs_query ya tiene todos los filtros.
        total_count = logs_query.count() 
    except Exception as e:
        # print(f"Error al contar logs: {e}")
        # traceback.print_exc() # Para depuración
        raise HTTPException(status_code=500, detail=f"Error al obtener el conteo de logs: {str(e)}")

    # Ordenar y paginar
    logs = logs_query.order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    return {"total_count": total_count, "audit_logs": logs}
  
@app.get("/api/admin/doctores/eliminados", response_model=schemas.DoctoresPaginados, tags=["Admin - Auditoría"])
async def leer_doctores_eliminados(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role == 'consulta':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar datos."
        )
    base_query = db.query(models.Doctor).filter(models.Doctor.is_deleted == True)
    total_count = base_query.count() 
    doctores_eliminados_orm = base_query.options(
        selectinload(models.Doctor.deleted_by_user_obj) # Carga la relación User
    ).order_by(models.Doctor.deleted_at.desc()).offset(skip).limit(limit).all()
    
    response_doctores = []
    for doc_orm in doctores_eliminados_orm:
        # 1. Convertir el objeto ORM a un schema Pydantic.
        #    schemas.Doctor debe tener el campo 'deleted_by_username: Optional[str]'
        doc_schema_instance = schemas.Doctor.from_orm(doc_orm)
        
        # 2. Asignar el username al campo correspondiente en la instancia del schema
        if doc_orm.deleted_by_user_obj and hasattr(doc_orm.deleted_by_user_obj, 'username'):
            doc_schema_instance.deleted_by_username = doc_orm.deleted_by_user_obj.username
        else:
            # Si no hay usuario asociado a la eliminación, o el objeto no tiene username
            doc_schema_instance.deleted_by_username = "Desconocido" # O None si tu schema lo permite y prefieres

        response_doctores.append(doc_schema_instance) 
    
    return {"total_count": total_count, "doctores": response_doctores}

@app.post("/api/admin/doctores/{id_imss}/restore", response_model=schemas.Doctor, tags=["Admin - Auditoría"])
async def restaurar_doctor(
     id_imss: str,
     db: Session = Depends(get_db_session),
     current_admin: models.User = Depends(security.get_current_admin_user),
     current_user: models.User = Depends(security.get_current_user)
 ):
    if current_user.role == 'consulta':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar datos."
        )
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss, models.Doctor.is_deleted == True).first()
    if db_doctor is None:
        # Verificar si no existe o si no estaba eliminado
        check_exists_not_deleted = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss, models.Doctor.is_deleted == False).first()
        if check_exists_not_deleted:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El doctor no está eliminado y no puede ser restaurado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor eliminado no encontrado.")

    try:
        db_doctor.is_deleted = False
        db_doctor.deleted_at = None
        # Considera si quieres limpiar deleted_by_user_id o mantenerlo para el historial
        # db_doctor.deleted_by_user_id = None 
        
        log_details = f"Registro restaurado: {db_doctor.nombre} (ID: {db_doctor.id_imss})"
        log_action(db, current_admin, "Restaurar Registro", "Doctor", id_imss, log_details)
        
        db.commit()
        db.refresh(db_doctor)
        return db_doctor
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al restaurar el doctor: {str(e)}")

@app.delete("/api/admin/audit-logs/bulk-delete", status_code=status.HTTP_200_OK, tags=["Admin - Auditoría"])
async def eliminar_logs_auditoria_en_lote(
    request_data: schemas.AuditLogBulkDeleteRequest, 
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user) 
):
    
    if not SUPER_ADMIN_PIN_HASH:
        logging.error("Intento de eliminación de logs sin SUPER_ADMIN_PIN_HASH configurado en el servidor.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de configuración del servidor: La función de eliminación no está disponible."
        )

    if not request_data.pin or not pwd_context.verify(request_data.pin, SUPER_ADMIN_PIN_HASH):
        # El PIN es incorrecto o no se proporcionó el hash almacenado
        # Podrías añadir rate limiting aquí si te preocupan los ataques de fuerza bruta al PIN.
        logging.warning(f"Intento fallido de eliminación de logs por el usuario {current_admin.username if current_admin else 'desconocido'} debido a PIN incorrecto.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, # 403 Forbidden es apropiado
            detail="PIN de confirmación incorrecto."
        )

    # 2. Procesar la solicitud de eliminación
    ids_a_eliminar = request_data.ids
    if not ids_a_eliminar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se proporcionaron IDs de logs para eliminar."
        )

    try:
        # Eliminar los logs especificados
        # models.AuditLog.id se asume que es la columna PK de tu tabla de auditoría
        num_eliminados = db.query(models.AuditLog).filter(models.AuditLog.id.in_(ids_a_eliminar)).delete(synchronize_session=False)
        
        # Es importante hacer commit después de una operación de delete que modifica la base de datos.
        db.commit()

        logging.info(f"El administrador {current_admin.username} (ID: {current_admin.id}) eliminó {num_eliminados} registro(s) de auditoría. IDs solicitados: {ids_a_eliminar}")

        # Un 204 NO CONTENT significa que la operación fue exitosa pero no hay contenido para devolver.
        # Esto es apropiado incluso si num_eliminados es 0 (significa que los IDs no existían o ya habían sido borrados).
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        db.rollback() # Revertir la transacción en caso de error
        logging.exception(f"Error interno al intentar eliminar logs de auditoría por {current_admin.username if current_admin else 'desconocido'}:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor al procesar la eliminación de logs: {str(e)}"
        )

@app.get("/api/doctores/check-curp/{curp_valor}", 
         response_model=schemas.CurpCheckResponse, # Necesitarás crear este schema
         tags=["Doctores"])
async def verificar_curp_existente(
    curp_valor: str, 
    db: Session = Depends(get_db_session),
    # current_user: models.User = Depends(security.get_current_user) # Si la verificación requiere autenticación
):
    if not curp_valor or len(curp_valor) != 18:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de CURP inválido.")

    # Busca un doctor existente con ese CURP que no esté marcado como eliminado
    existing_doctor = db.query(models.Doctor).filter(
        models.Doctor.curp == curp_valor.upper(),
        models.Doctor.is_deleted == False 
    ).first()

    if existing_doctor:
        return {"exists": True, "message": "Este CURP ya está registrado."}
    return {"exists": False, "message": "CURP disponible."}

@app.get("/api/graficas/estadistica_doctores_agrupados", response_model=schemas.EstadisticaPaginada, tags=["Graficas y Estadísticas"])
async def obtener_estadistica_doctores_agrupados(
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    entidad: Optional[str] = Query(None),
    especialidad: Optional[str] = Query(None),
    nivel_atencion: Optional[str] = Query(None)
):
    try:
        # CORRECCIÓN: Se elimina el filtro forzado por estatus 'Activo'
        base_filtered_query = db.query(models.Doctor).filter(
            models.Doctor.is_deleted == False,
            models.Doctor.estatus == '01 ACTIVO',
            models.Doctor.coordinacion == '0'
        )
        if entidad: base_filtered_query = base_filtered_query.filter(models.Doctor.entidad == entidad)
        if especialidad: base_filtered_query = base_filtered_query.filter(models.Doctor.especialidad == especialidad)
        if nivel_atencion: base_filtered_query = base_filtered_query.filter(models.Doctor.nivel_atencion == nivel_atencion)

        total_doctors_in_groups_count = base_filtered_query.count() or 0

        grouped_query_for_items = base_filtered_query.with_entities(
            models.Doctor.entidad,
            models.Doctor.especialidad,
            models.Doctor.nivel_atencion,
            func.count(models.Doctor.id_imss).label("cantidad")
        ).group_by(
            models.Doctor.entidad,
            models.Doctor.especialidad,
            models.Doctor.nivel_atencion
        )

        count_subquery = grouped_query_for_items.with_entities(
             models.Doctor.entidad, models.Doctor.especialidad, models.Doctor.nivel_atencion
        ).distinct().subquery('grouped_data_for_count')
        
        total_groups_count_query = db.query(func.count()).select_from(count_subquery)
        total_groups_count = total_groups_count_query.scalar() or 0

        query_result_paginated = grouped_query_for_items.order_by(
            models.Doctor.entidad.asc().nullsfirst(),
            models.Doctor.especialidad.asc().nullsfirst(),
            models.Doctor.nivel_atencion.asc().nullsfirst()
        ).offset(skip).limit(limit).all()

        items_for_response = []
        for row in query_result_paginated:
            item_data = {
                "entidad": row.entidad if row.entidad is not None else "N/A",
                "especialidad": row.especialidad if row.especialidad is not None else "N/A",
                "nivel_atencion": row.nivel_atencion if row.nivel_atencion is not None else "N/A",
                "cantidad": row.cantidad if row.cantidad is not None else 0
            }
            items_for_response.append(schemas.EstadisticaAgrupadaItem(**item_data))
        
        return {
            "total_groups": total_groups_count,
            "total_doctors_in_groups": total_doctors_in_groups_count,
            "items": items_for_response
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error interno del servidor al generar la estadística: {str(e)}")

@app.get("/api/graficas/especialidades_agrupadas", response_model=List[schemas.EspecialidadAgrupada], tags=["Graficas y Estadísticas"])
async def obtener_especialidades_agrupadas(db: Session = Depends(get_db_session), current_user: models.User = Depends(security.get_current_user)):
    try:
        base_query = db.query(
            models.Doctor.especialidad,
            func.count(models.Doctor.id_imss).label("total_doctores")
        ).filter(
            models.Doctor.is_deleted == False
        )

        query_basicas = base_query.filter(models.Doctor.especialidad.in_([
            "ANESTESIOLOGIA", "CIRUGIA GENERAL", "GINECOLOGIA Y OBSTETRICIA",
            "MEDICINA FAMILIAR", "MEDICINA INTERNA", "MEDICINA DE URGENCIAS", "PEDIATRIA MEDICA"
        ])).group_by(models.Doctor.especialidad).order_by(models.Doctor.especialidad)

        query_quirurgicas = base_query.filter(models.Doctor.especialidad.in_([
            "ANGIOLOGIA, CIRUGIA VASCULAR Y ENDOVASCULAR", "CIRUGIA PEDIATRICA", "CIRUGIA ONCOLOGICA",
            "COLOPROCTOLOGIA", "NEUROCIRUGIA", "OFTALMOLOGIA", 
            "OTORRINOLARINGOLOGIA Y CIRUGIA DE CABEZA Y CUELLO", "TRAUMATOLOGIA Y ORTOPEDIA", "UROLOGIA"
        ])).group_by(models.Doctor.especialidad).order_by(models.Doctor.especialidad)

        query_medicas = base_query.filter(models.Doctor.especialidad.in_([
            "ANATOMIA PATOLOGICA", "CARDIOLOGIA CLINICA", "DERMATOLOGIA", "ENDOCRINOLOGIA",
            "EPIDEMIOLOGIA", "GASTROENTEROLOGIA", "GERIATRIA", "HEMATOLOGIA",
            "INMUNOLOGIA CLINICA Y ALERGIA", "MEDICINA CRITICA", "MEDICINA DE REHABILITACION",
            "MEDICINA DEL ENFERMO PEDIATRICO EN ESTADO CRITICO", "NEFROLOGIA", "NEONATOLOGIA",
            "NEUMOLOGIA", "NEUROLOGIA ADULTOS", "ONCOLOGIA MEDICA", "ONCOLOGIA PEDIATRICA",
            "PSIQUIATRIA", "PSIQUIATRIA INFANTIL Y DE LA ADOLESCENCIA", "RADIOLOGIA E IMAGEN", "REUMATOLOGIA"
        ])).group_by(models.Doctor.especialidad).order_by(models.Doctor.especialidad)
        
        basicas = query_basicas.all()
        quirurgicas = query_quirurgicas.all()
        medicas = query_medicas.all()
        
        response = [
            {"tipo": "BASICAS", "especialidades": [{"nombre": item.especialidad, "total_doctores": item.total_doctores} for item in basicas], "total": sum(item.total_doctores for item in basicas)},
            {"tipo": "QUIRURGICAS", "especialidades": [{"nombre": item.especialidad, "total_doctores": item.total_doctores} for item in quirurgicas], "total": sum(item.total_doctores for item in quirurgicas)},
            {"tipo": "MEDICAS", "especialidades": [{"nombre": item.especialidad, "total_doctores": item.total_doctores} for item in medicas], "total": sum(item.total_doctores for item in medicas)}
        ]
        return response
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al obtener especialidades agrupadas: {str(e)}")

@app.get("/api/graficas/doctores_por_nivel_atencion", response_model=List[schemas.NivelAtencionItem], tags=["Graficas y Estadísticas"])
async def obtener_doctores_por_nivel_atencion(
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        # Lista de los niveles de atención predefinidos tal como los conoces.
        niveles_predefinidos_raw = ["01 PNA", "02 SNA", "03 TNA", "04 OTRO", "05 NO APLICA"]

        # Normaliza estos niveles predefinidos para que coincidan con cómo se procesan los datos de la DB.
        # Esto es crucial para la comparación posterior en Python.
        niveles_predefinidos_normalizados = [
            (nivel.strip() if nivel is not None else "") or "SIN REGISTRO"
            for nivel in niveles_predefinidos_raw
        ]

        # Define cómo la columna 'nivel_atencion' de la base de datos será normalizada para la consulta.
        # Esto asegura que los valores de la DB se limpien y unifiquen antes de agruparlos.
        nivel_normalizado_db = func.coalesce(
            func.nullif(func.trim(models.Doctor.nivel_atencion), ""),
            "SIN REGISTRO"
        )

        # --- SECCIÓN DE DEBUGGING: Vista previa de la normalización de datos RAW ---
        # Este bloque te ayudará a ver si hay caracteres inesperados en tus datos originales
        # y cómo la normalización de la DB los está transformando.
        raw_data_check_query = db.query(
            models.Doctor.nivel_atencion,
            nivel_normalizado_db.label("nivel_atencion_normalizado")
        ).filter(
            models.Doctor.is_deleted == False # Solo mira los doctores activos
        ).limit(10).all() # Limita la salida para no llenar la terminal
        
        print("\n--- DEBUG: Vista previa de la normalización de datos RAW (primeros 10 doctores activos) ---")
        if not raw_data_check_query:
            print("  No se encontraron registros de doctores activos para la comprobación RAW.")
        for row in raw_data_check_query:
            # Usamos repr() para mostrar la representación exacta de la cadena, incluyendo caracteres ocultos
            print(f"  RAW: {repr(row.nivel_atencion)} -> NORMALIZADO DB: {repr(row.nivel_atencion_normalizado)}")
        print("-------------------------------------------------------------------------------------\n")


        # Consulta principal: Agrupa y cuenta doctores activos por su nivel de atención normalizado.
        query = db.query(
            nivel_normalizado_db.label("nivel_atencion"), # El nombre del nivel normalizado
            func.count('*').label("total_doctores")     # Contar *todas* las filas en el grupo (confiable)
        ).filter(
            models.Doctor.is_deleted == False # Filtra solo doctores "activos"
        ).group_by(nivel_normalizado_db) # Agrupa por el nivel ya normalizado

        # Ejecuta la consulta y obtiene los resultados (una lista de objetos con 'nivel_atencion' y 'total_doctores').
        resultados = query.all()

        # --- SECCIÓN DE DEBUGGING: Resultados de la consulta y el diccionario ---
        print("Resultados de la consulta de base de datos (normalizados DB y conteos):", resultados)
        print("Niveles predefinidos normalizados (Python para comparación):", niveles_predefinidos_normalizados)

        # Crea un diccionario para acceso rápido a los conteos por nivel de atención.
        # Las claves de este diccionario serán los niveles NORMALIZADOS tal como vienen de la DB.
        resultados_dict = {item.nivel_atencion: item.total_doctores for item in resultados}
        print("Diccionario de resultados (tras la consulta):", resultados_dict)

        # Prepara la lista de respuesta final para el frontend.
        response = []
        # 1. Añade los niveles predefinidos. Si un nivel predefinido no se encontró en la DB, su conteo será 0.
        for nivel_norm in niveles_predefinidos_normalizados:
            count = resultados_dict.get(nivel_norm, 0)
            # Aquí, la respuesta incluirá el nombre del nivel NORMALIZADO.
            response.append({"nivel_atencion": nivel_norm, "total_doctores": count})
            
        # 2. Identifica y añade cualquier "otro" nivel de atención que haya salido de la base de datos
        #    pero que no estaba en tu lista de niveles predefinidos.
        otros_niveles = set(resultados_dict.keys()) - set(niveles_predefinidos_normalizados)
        for nivel_extra in otros_niveles:
            response.append({"nivel_atencion": nivel_extra, "total_doctores": resultados_dict[nivel_extra]})
            
        # --- SECCIÓN DE DEBUGGING: Respuesta final ---
        print("Respuesta FINAL que el backend enviará al frontend:", response)
        
        return response

    except Exception as e:
        # Si ocurre un error, imprime el traceback completo en la terminal para depuración
        # y devuelve un error HTTP 500 al cliente.
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al obtener doctores por nivel de atención: {str(e)}")

@app.get("/api/graficas/doctores_por_cedulas", response_model=schemas.CedulasCount, tags=["Graficas y Estadísticas"])
async def obtener_doctores_por_cedulas(db: Session = Depends(get_db_session), current_user: models.User = Depends(security.get_current_user)):
    try:
        # Query base para doctores no eliminados
        base_query = db.query(models.Doctor).filter(models.Doctor.is_deleted == False)

        total_doctores = base_query.count() or 0
        
        # CORRECCIÓN: Se ajusta la lógica para contar correctamente, considerando "Sin Informacion" como sin cédula.
        con_licenciatura = base_query.filter(
            models.Doctor.cedula_lic.isnot(None),
            models.Doctor.cedula_lic != '',
            models.Doctor.cedula_lic != 'Sin Informacion'
        ).count() or 0
        
        con_especialidad = base_query.filter(
            models.Doctor.cedula_esp.isnot(None),
            models.Doctor.cedula_esp != '',
            models.Doctor.cedula_esp != 'Sin Informacion'
        ).count() or 0
        
        return {
            "con_licenciatura": con_licenciatura,
            "sin_licenciatura": total_doctores - con_licenciatura,
            "con_especialidad": con_especialidad,
            "sin_especialidad": total_doctores - con_especialidad,
            "total_doctores": total_doctores
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al obtener conteo de cédulas: {str(e)}")

@app.delete("/api/doctores/{id_imss}/permanent", tags=["Doctores"])
async def eliminar_doctor_permanentemente(
    id_imss: str,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        # Verificar si el doctor existe y está marcado como eliminado
        doctor = db.query(models.Doctor).filter(
            models.Doctor.id_imss == id_imss,
            models.Doctor.is_deleted == True
        ).first()

        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor no encontrado o no está eliminado"
            )

        # Eliminar permanentemente
        db.delete(doctor)
        db.commit()
        
        # Registrar la acción
        log_action(db, current_user, "Eliminación permanente", "Doctor", id_imss, f"Doctor eliminado permanentemente: {doctor.nombre}")

        return {"message": "Doctor eliminado permanentemente con éxito"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar doctor: {str(e)}"
        )

@app.delete("/api/admin/doctores/permanent-delete-bulk", status_code=status.HTTP_204_NO_CONTENT, tags=["Admin - Doctores"])
async def admin_eliminar_doctores_permanentemente_bulk(
    request_data: schemas.DoctorPermanentDeleteRequest, # Schema: {ids: List[int], pin: str}
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user) # O la dependencia de admin que uses
):
# 1. Validación del PIN (igual que en el endpoint de logs)
    if not SUPER_ADMIN_PIN_HASH:
        logging.error("Intento de eliminación permanente de doctores sin SUPER_ADMIN_PIN_HASH configurado.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de configuración del servidor: Función no disponible."
        )
    if not request_data.pin or not pwd_context.verify(request_data.pin, SUPER_ADMIN_PIN_HASH):
        logging.warning(f"Intento fallido de eliminación permanente de doctores por {current_admin.username} (PIN incorrecto).")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PIN de confirmación incorrecto."
        )

    # 2. Lógica de Eliminación Permanente en Bloque
    ids_a_eliminar = request_data.ids
    if not ids_a_eliminar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se proporcionaron IDs de doctores para eliminar."
        )

    doctores_a_eliminar_objetos = []
    doctores_no_encontrados_o_no_validos_ids = []

    for doctor_id in ids_a_eliminar:
        doctor = db.query(models.Doctor).filter(
            models.Doctor.id_imss == doctor_id,
            models.Doctor.is_deleted == True # Verifica que esté marcado como eliminado
        ).first()

        if not doctor:
            doctores_no_encontrados_o_no_validos_ids.append(doctor_id)
        else:
            doctores_a_eliminar_objetos.append(doctor)

    # Decisión de manejo de errores: Si alguno no es válido, ¿abortar todo o eliminar los válidos?
    # Opción 1: Abortar si alguno no es válido (más seguro para evitar eliminaciones parciales inesperadas)
    if doctores_no_encontrados_o_no_validos_ids:
        db.rollback() # Asegurar que no haya cambios pendientes si hubo errores previos
        error_detail = f"Los siguientes IDs de doctores no se encontraron, no están marcados como eliminados, o ya no existen: {doctores_no_encontrados_o_no_validos_ids}."
        logging.warning(f"Intento de eliminación permanente fallido para {current_admin.username}. Detalle: {error_detail}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, # O 400 BAD_REQUEST
            detail=error_detail
        )
    
    if not doctores_a_eliminar_objetos: # Si la lista quedó vacía después de las validaciones
        # Esto podría pasar si todos los IDs enviados no eran válidos.
        return Response(status_code=status.HTTP_204_NO_CONTENT)


    try:
        nombres_doctores_eliminados = [d.nombre for d in doctores_a_eliminar_objetos] # Para el log

        # Eliminar permanentemente los objetos válidos
        for doctor_obj in doctores_a_eliminar_objetos:
            db.delete(doctor_obj)
        
        db.commit()

        # Registrar la acción para cada doctor eliminado (o un solo log para el bulk)
        # Aquí un log general para la operación bulk podría ser más eficiente que uno por doctor.
        # Pero si necesitas granularidad, itera.
        details_log_bulk = f"Eliminación permanente en bloque de {len(doctores_a_eliminar_objetos)} doctor(es). Nombres: {', '.join(nombres_doctores_eliminados)}. IDs: {[d.id_imss for d in doctores_a_eliminar_objetos]}"
        log_action(db, current_admin, "Eliminación permanente en bloque", "Doctor", None, details_log_bulk)
        # Si prefieres logs individuales:
        # for doctor_obj in doctores_a_eliminar_objetos:
        #     log_action(db, current_admin, "Eliminación permanente", "Doctor", doctor_obj.id, f"Doctor eliminado permanentemente: {doctor_obj.nombre_completo}")
        #     (Necesitarías hacer commit después del bucle de logs si log_action no lo hace)

        logging.info(f"Admin {current_admin.username} eliminó permanentemente {len(doctores_a_eliminar_objetos)} doctor(es). IDs: {[d.id_imss for d in doctores_a_eliminar_objetos]}")
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        db.rollback()
        logging.exception(f"Error en eliminación permanente en bloque de doctores por {current_admin.username}:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al eliminar doctores: {str(e)}"
        )

@app.get("/api/admin/audit-log-options/users", response_model=List[str], tags=["Admin - Auditoría Opciones"])
async def leer_usuarios_unicos_auditoria(
    db: Session = Depends(get_db_session), # Reemplaza get_db_session con tu dependencia de DB
    current_admin: models.User = Depends(security.get_current_admin_user) # Tu dependencia de autenticación
):
    """
    Obtiene una lista de nombres de usuario únicos de los logs de auditoría.
    """
    try:
        # Asegúrate que 'username' es el nombre correcto del campo en tu modelo AuditLog
        query_result = db.query(distinct(models.AuditLog.username)).all()
        # El resultado será una lista de tuplas, ej: [('admin',), ('rodrigo',)]
        # Necesitamos extraer el primer elemento de cada tupla.
        # También filtramos None si no quieres que aparezca como opción.
        unique_users = [item[0] for item in query_result if item[0] is not None]
        return sorted(list(set(unique_users))) # Asegura unicidad y ordena
    except Exception as e:
        # Loggear el error e
        raise HTTPException(status_code=500, detail=f"Error al obtener usuarios únicos: {str(e)}")

@app.get("/api/admin/audit-log-options/actions", response_model=List[str], tags=["Admin - Auditoría Opciones"])
async def leer_acciones_unicas_auditoria(
    db: Session = Depends(get_db_session), # Reemplaza get_db_session con tu dependencia de DB
    current_admin: models.User = Depends(security.get_current_admin_user) # Tu dependencia de autenticación
):
    """
    Obtiene una lista de tipos de acción únicos de los logs de auditoría.
    """
    try:
        # Asegúrate que 'action_type' es el nombre correcto del campo en tu modelo AuditLog
        query_result = db.query(distinct(models.AuditLog.action_type)).all()
        unique_actions = [item[0] for item in query_result if item[0] is not None]
        return sorted(list(set(unique_actions))) # Asegura unicidad y ordena
    except Exception as e:
        # Loggear el error e
        raise HTTPException(status_code=500, detail=f"Error al obtener acciones únicas: {str(e)}")

