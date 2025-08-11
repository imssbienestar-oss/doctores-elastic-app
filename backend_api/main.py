# backend_api/main.py
from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, Body, Response, Form 
from sqlalchemy.orm import Session
from fastapi import Form 
from sqlalchemy import text, func, or_, and_  # Importar func para server_default
import sqlalchemy.exc
from io import BytesIO 
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
    USER_TIMEZONE = pytz.utc

# --- INICIO FIREBASE CREDENCIALES ---
def initialize_firebase():
    global FIREBASE_STORAGE_BUCKET_NAME_GLOBAL
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
        
        FIREBASE_STORAGE_BUCKET_NAME_GLOBAL = os.getenv("FIREBASE_STORAGE_BUCKET")

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
# --- FIN FIREBASE ---

app = FastAPI(title="API de Doctores IMSS Bienestar")

Generic_pass = os.getenv("GENERIC_PASSWORD")

# --- LOG ACTION (AUDITORIA) ---
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
        timestamp=datetime.now(timezone.utc) 
    )
    db.add(log_entry)

@app.on_event("startup")
async def startup_event():
    initialize_firebase() 

# --- ORIGINS (ACCESO A SOLICITUDES) ---
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

# --- DEPENDENCIA BD ---
def get_db_session():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- VERIFICAR USUARIO ---
async def get_current_admin_user(current_user: models.User = Depends(security.get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no permitida: Se requieren privilegios de administrador",
        )
    return current_user

# --- SUBIR ARCHIVOS FIREBASE ---
async def upload_to_firebase(file: UploadFile, destination_path: str, optimize_image: bool = False) -> Optional[str]:
    try:
        app_instance = firebase_admin.get_app() 
    except ValueError:
        return None
    
    try:
        bucket_name = app_instance.options.get('storageBucket')
        if not bucket_name:
            return None
        bucket = storage.bucket(bucket_name)
        
        filename, file_extension = os.path.splitext(file.filename)
        safe_filename = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", filename) 
        unique_filename = f"{uuid.uuid4()}_{safe_filename}{file_extension}"
        blob_path = f"{destination_path}/{unique_filename}"
        blob = bucket.blob(blob_path)
        file_content = await file.read()

        # --- OPTIMIZAR IMAGEN ---
        if optimize_image and file.content_type and file.content_type.startswith("image/"):
            try:
                img_io = BytesIO(file_content)
                img = Image.open(img_io)
                
                if img.mode == "RGBA":
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[3])
                    img = background
                elif img.mode == "P":
                    img = img.convert("RGB")

                img.thumbnail((1024, 1024))
                output_buffer =io.BytesIO()
                
                img_format = "JPEG" 
                
                save_kwargs = {'format': img_format}
                if img_format == "JPEG":
                    save_kwargs['quality'] = 80
                    save_kwargs['optimize'] = True
                
                img.save(output_buffer, **save_kwargs)
                file_content_to_upload = output_buffer.getvalue()
                content_type_to_upload = f"image/{img_format.lower()}"
            except Exception as img_e:
               
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
            traceback.print_exc()
            return None
    except Exception as e:
            traceback.print_exc()
            return None

# --- ELIMINAR ARCHIVOS FIREBASE ---
async def delete_from_firebase(file_url: Optional[str]) -> bool:
    try:
        app_instance = firebase_admin.get_app()
    except ValueError:
        return False
    
    if not file_url:
        return False 

    try:
        bucket_name_from_app = app_instance.options.get('storageBucket')
        if not bucket_name_from_app:
            return False
        
        bucket = storage.bucket(bucket_name_from_app)
        parsed_url = urlparse(file_url)
        
        object_path_encoded = parsed_url.path
        if object_path_encoded.startswith('/'):
            object_path_encoded = object_path_encoded[1:]
        
        if object_path_encoded.startswith(f"{bucket_name_from_app}/"):
            object_path = object_path_encoded[len(bucket_name_from_app)+1:]
        else:
            object_path = object_path_encoded
            
        object_path_decoded = unquote(object_path) 

        if not object_path_decoded:
            return False 

        blob_to_delete = bucket.blob(object_path_decoded)
        if blob_to_delete.exists():
            blob_to_delete.delete()
            return True
        else:
            return True 
            
    except firebase_admin.exceptions.FirebaseError as fb_e:
        return False
    except Exception as e:
        return False

# --- INICIO ENDPOINT ---
@app.get("/")
async def root():
    return {"message": "¡Bienvenido a la API de Doctores Cubanos IMSS Bienestar!"}

# --- ENDPOINT (MOSTRAR REGISTROS) ---
@app.get("/api/doctores", response_model=schemas.DoctoresPaginados, tags=["Doctores"])
async def leer_doctores(
    skip: int = Query(0, ge=0), 
    limit: int = Query(30, ge=1, le=200),
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    estatus: Optional[str] = Query("01 ACTIVO", min_length=1, max_length=50),
    db: Session = Depends(get_db_session),
   ):
    # FILTROS (ELIMINADOS Y COORDINACION O)
    query = db.query(models.Doctor)\
              .filter(models.Doctor.is_deleted == False)\
              .filter(models.Doctor.coordinacion == '0')

    # --- BARRA DE BUSQUEDA ---
    if search and search.strip():
        search_words = search.strip().split()
        search_conditions = []
        for word in search_words:
            word_term = f"%{word}%"
            search_conditions.append(
                or_(
                    models.Doctor.nombre.ilike(word_term),
                    models.Doctor.apellido_paterno.ilike(word_term),
                    models.Doctor.apellido_materno.ilike(word_term),
                    models.Doctor.id_imss.ilike(word_term),
                    models.Doctor.matrimonio_id.ilike(word_term),
                    models.Doctor.clues.ilike(word_term) 
                )
            )
            query = query.filter(and_(*search_conditions))

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

# --- ENDPOINT (GRAFICAS MOSTRAR REGISTROS FILTRADOS) ---
@app.get("/api/doctores/detalles_filtrados", response_model=List[schemas.DoctorDetalleItem], tags=["Doctores"])
async def obtener_detalles_doctores_filtrados(
    db: Session = Depends(get_db_session),
    entidad: Optional[str] = Query(None),
    nombre_unidad: Optional[str] = Query(None),
    especialidad: Optional[str] = Query(None),
    nivel_atencion: Optional[str] = Query(None),
    estatus: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    query = db.query(models.Doctor).filter(
        models.Doctor.is_deleted == False,
        models.Doctor.coordinacion == '0'
    )
    if entidad:
        query = query.filter(models.Doctor.entidad == entidad)
    if nombre_unidad: 
        query = query.filter(models.Doctor.nombre_unidad == nombre_unidad)
    if especialidad:
        query = query.filter(models.Doctor.especialidad == especialidad)
    if nivel_atencion:
        query = query.filter(models.Doctor.nivel_atencion == nivel_atencion)
    if estatus:
        query = query.filter(models.Doctor.estatus == estatus)

    if search and search.strip():
        search_words = search.strip().split()
        search_conditions = []
        for word in search_words:
            word_term = f"%{word}%"
            search_conditions.append(
                or_(
                    models.Doctor.clues.ilike(word_term),
                    models.Doctor.id_imss.ilike(word_term),
                    models.Doctor.nombre.ilike(word_term),
                    models.Doctor.apellido_paterno.ilike(word_term),
                    models.Doctor.apellido_materno.ilike(word_term)
                )
            )
        query = query.filter(and_(*search_conditions))

    doctores_filtrados = query.order_by(models.Doctor.nombre.asc()).all()
    doctores_para_respuesta = []
    for doc in doctores_filtrados:
        # DATOS A MOSTRAR
        detalle_doctor = {
            "id_imss": doc.id_imss,
            "nombre_completo": f"{doc.nombre or ''} {doc.apellido_paterno or ''} {doc.apellido_materno or ''}".strip(),
            "entidad": doc.entidad or "N/A",
            "nombre_unidad": doc.nombre_unidad or "N/A",
            "especialidad": doc.especialidad or "N/A",
            "nivel_atencion": doc.nivel_atencion or "N/A",
            "estatus": doc.estatus or "N/A",
            "clues": doc.clues or "N/A"
        }
        doctores_para_respuesta.append(detalle_doctor)
        
    return doctores_para_respuesta

@app.get("/api/doctores/alertas-vencimiento", response_model=List[schemas.AlertaVencimiento], tags=["Doctores"])
async def get_alertas_de_vencimiento(db: Session = Depends(get_db_session)):
    """
    Obtiene una lista de doctores cuyo estatus temporal está programado 
    para finalizar en los próximos 15 días.
    """ 
    now_aware = datetime.now(USER_TIMEZONE)
    hoy_inicio_dia = now_aware.replace(hour=0, minute=0, second=0, microsecond=0)
    fecha_actual = hoy_inicio_dia.date()
    fecha_inicio_rango = fecha_actual - timedelta(days=30) 
    fecha_limite_rango = fecha_actual + timedelta(days=15)

    estatus_temporales_patterns = [
        "02 RETIRO TEMP%",
        "03 RETIRO TEMP%",
        "04 SOL. PERSONAL%",
        "05 INCAPACIDAD%"
    ]

    doctores_por_vencer = db.query(models.Doctor).filter(
        and_(
            or_(*[models.Doctor.estatus.ilike(pattern) for pattern in estatus_temporales_patterns]),
            models.Doctor.fecha_fin >= fecha_inicio_rango,
            models.Doctor.fecha_fin <= fecha_limite_rango,
            models.Doctor.is_deleted == False
        )
    ).order_by(models.Doctor.fecha_fin.asc()).all()

    respuesta = []
    for doc in doctores_por_vencer:
        fecha_fin_obj = doc.fecha_fin
        if isinstance(fecha_fin_obj, datetime):
            fecha_fin_obj = fecha_fin_obj.date()
        delta = fecha_fin_obj - fecha_actual
        dias_restantes = delta.days
        respuesta.append({
            "id_imss": doc.id_imss,
            "nombre_completo": f"{doc.nombre or ''} {doc.apellido_paterno or ''} {doc.apellido_materno or ''}".strip(),
            "estatus": doc.estatus,
            "entidad": doc.entidad,
            "fecha_fin": doc.fecha_fin,
            "dias_restantes": dias_restantes
        })
        
    return respuesta

# --- ENDPOINT (REGISTRO POR ID) ---
@app.get("/api/doctores/{id_imss}", response_model=schemas.DoctorDetail, tags=["Doctores"])
async def leer_doctor_por_id(
    id_imss: str, db: Session = Depends(get_db_session),
  ):
    db_doctor = db.query(models.Doctor).options(
        selectinload(models.Doctor.attachments),
        selectinload(models.Doctor.historial)
        ).filter(func.upper(models.Doctor.id_imss) == func.upper(id_imss)).first()
    
    if db_doctor is None:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    
    return db_doctor

# --- ENDPOINT (CREAR NUEVO REGISTRO) ---
@app.post("/api/doctores", response_model=schemas.DoctorDetail, status_code=status.HTTP_201_CREATED, tags=["Doctores"])
async def crear_doctor(
    doctor_data: schemas.DoctorCreate, 
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        doctor_dict = doctor_data.model_dump()
        
        if doctor_dict.get("fecha_estatus"):
            doctor_dict['fecha_vuelo'] = doctor_dict['fecha_estatus']

        if 'coordinacion' not in doctor_dict or doctor_dict['coordinacion'] is None:
            doctor_dict['coordinacion'] = '0'
        
        db_doctor = models.Doctor(**doctor_dict)
        db.add(db_doctor)

        fecha_de_inicio = db_doctor.fecha_estatus or date.today()
        print(f"Creando registro de historial inicial para el doctor {db_doctor.id_imss} con estatus '{db_doctor.estatus}'.")
        
        nuevo_registro_historial = models.EstatusHistorico(
            id_imss=db_doctor.id_imss,
            tipo_cambio="Estatus",
            estatus=db_doctor.estatus,
            fecha_inicio=fecha_de_inicio,
            comentarios="Registro inicial en el sistema.",
            clues=db_doctor.clues,
            entidad=db_doctor.entidad,
            nombre_unidad=db_doctor.nombre_unidad,
            turno=db_doctor.turno
        )

        cupo = db.query(models.EntidadCupos).filter(models.EntidadCupos.entidad == db_doctor.entidad).first()
        if cupo:
            # Contar cuántos doctores activos hay actualmente en esa entidad
            conteo_actual = db.query(models.Doctor).filter(
                models.Doctor.entidad == db_doctor.entidad,
                models.Doctor.is_deleted == False,
                models.Doctor.estatus == '01 ACTIVO'
            ).count()

            # Si al añadir este nuevo doctor se supera el máximo, lanzar un error
            if conteo_actual >= cupo.maximo:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"La entidad {db_doctor.entidad} ha alcanzado su cupo máximo de {cupo.maximo} médicos."
                )
        db.add(nuevo_registro_historial)
        db.flush()
        log_action(db, current_user, "Crear Registro", "Doctor", target_id_str=db_doctor.id_imss, details=f"Doctor creado: {db_doctor.nombre}")
        db.commit()
        db.refresh(db_doctor)
        doctor_completo = db.query(models.Doctor).options(
            selectinload(models.Doctor.historial)
        ).filter(models.Doctor.id_imss == db_doctor.id_imss).first()
        return doctor_completo
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Error de integridad, posible ID o CURP duplicado.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error inesperado en el servidor: {str(e)}")

# --- ENDPOINT (ELIMINAR REGISTRO) ---
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

# --- ENDPOINT (SUBIR FOTO FIREBASE) ---
@app.post("/api/doctores/{id_imss}/profile-picture", response_model=schemas.Doctor, tags=["Doctores - Archivos"])
async def subir_foto_perfil_doctor(
    id_imss: str, file: UploadFile = File(...), db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    if db_doctor.foto_url:
        await delete_from_firebase(db_doctor.foto_url)
        db_doctor.foto_url = None 
        try:
            db.commit() 
        except Exception:
            db.rollback() 

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

# --- ENDPOINT (SUBIR ARCHIVO FIREBASE) ---
@app.post("/api/doctores/{id_imss}/attachments", response_model=schemas.DoctorAttachment, tags=["Doctores - Archivos"])
async def subir_expediente_doctor(
    id_imss: str, file: UploadFile = File(...), documento_tipo: str = Form(...), db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado para adjuntar expediente.")
    
    destination_path = f"doctors/{id_imss}/attachments"
    file_url = await upload_to_firebase(file, destination_path, optimize_image=False)
    
    if not file_url:
        raise HTTPException(status_code=500, detail="Error al subir el expediente al almacenamiento.")
    
    attachment_data_pydantic = schemas.DoctorAttachmentCreate(
        doctor_id=id_imss, 
        file_name=file.filename, 
        file_url=file_url,      
        file_type=file.content_type,
        documento_tipo=documento_tipo
    )
    db_attachment = models.DoctorAttachment(
        **attachment_data_pydantic.model_dump(exclude={'doctor_id'}),
        doctor_id=id_imss 
    )
    try:
        db.add(db_attachment)
        db.commit()
        db.refresh(db_attachment)
        return db_attachment
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        if file_url:
            await delete_from_firebase(file_url)
        raise HTTPException(status_code=500, detail="Error al guardar la información del expediente en la base de datos.")

# --- ENDPOINT (MOSTRAR EXPEDIENTE) ---
@app.get("/api/doctores/{id_imss}/attachments", response_model=List[schemas.DoctorAttachment], tags=["Doctores - Archivos"])
async def listar_expedientes_doctor(
    id_imss: str, db: Session = Depends(get_db_session),
    ):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado para listar expedientes.")
    attachments = db.query(models.DoctorAttachment).filter(models.DoctorAttachment.doctor_id == id_imss).all()
    return attachments

# --- ENDPOINT (ELIMINAR ARCHIVOS FIREBASE) ---
@app.delete("/api/doctores/{id_imss}/attachments/{attachment_id}", status_code=status.HTTP_200_OK, tags=["Doctores - Archivos"])
async def eliminar_expediente_doctor(
    id_imss: str, attachment_id: int, db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
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

# --- ENDPOINT (MODIFICAR EXPEDIENTE) ---
@app.put("/api/doctores/{id_imss}", response_model=schemas.DoctorDetail, tags=["Doctores"])
async def actualizar_doctor_perfil_completo(
    id_imss: str,
    doctor_update_data: schemas.DoctorProfileUpdateSchema = Body(...), 
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
   
    original_estatus = db_doctor.estatus
    original_clues = db_doctor.clues
    original_turno = db_doctor.turno
        
    update_data_dict = doctor_update_data.model_dump(exclude_unset=True)
    changed_field_names = []
    for key, new_value in update_data_dict.items():
        if hasattr(db_doctor, key):
            old_value = getattr(db_doctor, key)
            if str(old_value) != str(new_value):
                 changed_field_names.append(key)
            setattr(db_doctor, key, new_value)

    if 'curp' in update_data_dict and db_doctor.curp == '':
        db_doctor.curp = None
    if 'comentarios_estatus' in update_data_dict and db_doctor.comentarios_estatus == '':
        db_doctor.comentarios_estatus = None
      
    estatus_final_en_db_obj = db_doctor.estatus
    if estatus_final_en_db_obj != "06 BAJA":
        db_doctor.motivo_baja = None
    
    if estatus_final_en_db_obj != "Defunción":
        db_doctor.fecha_fallecimiento = None

    if estatus_final_en_db_obj == "01 ACTIVO":
        campos_a_limpiar_si_activo = ["notificacion_baja", "fecha_extraccion", "fecha_notificacion"] 
        for campo in campos_a_limpiar_si_activo:
            if hasattr(db_doctor, campo) and getattr(db_doctor, campo) is not None: 
                setattr(db_doctor, campo, None)

    elif estatus_final_en_db_obj in ["Baja", "Baja Definitiva", "Defunción"]: 
        campos_a_limpiar_si_baja = ["nivel_atencion", "turno", "nombre_unidad"]
        for campo in campos_a_limpiar_si_baja:
            if hasattr(db_doctor, campo) and getattr(db_doctor, campo) is not None:
                setattr(db_doctor, campo, None)
    
 
    try:
        if 'curp' in update_data_dict and db_doctor.curp:
            existing_doctor_curp = db.query(models.Doctor).filter(
                models.Doctor.curp == db_doctor.curp,
                models.Doctor.id_imss != id_imss
            ).first()
            if existing_doctor_curp:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"El CURP '{db_doctor.curp}' ya está registrado para otro doctor."
                )


        cambio_estatus = 'estatus' in update_data_dict and db_doctor.estatus != original_estatus
        cambio_clues = 'clues' in update_data_dict and db_doctor.clues != original_clues
        cambio_turno = 'turno' in update_data_dict and db_doctor.turno != original_turno

        if cambio_estatus or cambio_clues or cambio_turno:
            tipos_de_cambio = []
            comentarios = ["Registro de Expediente."]

            if cambio_estatus:
                tipos_de_cambio.append("Estatus")
                comentarios.append(f" Estatus anterior: '{original_estatus}'.")
            
            if cambio_clues and cambio_turno:
                tipos_de_cambio.append("Redistribución y Turno")
                comentarios.append(f" CLUES anterior: {original_clues} y Turno anterior: '{original_turno}'.")
            elif cambio_clues:
                tipos_de_cambio.append("Redistribución")
                comentarios.append(f" CLUES anterior: {original_clues}.")
            elif cambio_turno:
                tipos_de_cambio.append("Turno")
                comentarios.append(f" Turno anterior: '{original_turno}'.")

            # Unimos los tipos de cambio y comentarios
            tipo_cambio_final = " / ".join(tipos_de_cambio)
            comentario_final = " ".join(comentarios)
        
        # Determinamos la fecha de inicio (la fecha del estatus tiene prioridad)
            fecha_de_inicio = db_doctor.fecha_estatus if cambio_estatus and db_doctor.fecha_estatus else date.today()

            nuevo_registro = models.EstatusHistorico(
                id_imss=id_imss,
                tipo_cambio=tipo_cambio_final,
                estatus=db_doctor.estatus,
                fecha_inicio=fecha_de_inicio,
                fecha_fin=db_doctor.fecha_fin if cambio_estatus else None,
                clues=db_doctor.clues,
                entidad=db_doctor.entidad,
                nombre_unidad=db_doctor.nombre_unidad,
                turno=db_doctor.turno,
                comentarios=comentario_final
            )
            db.add(nuevo_registro)

        
        if changed_field_names:
            details_for_log = f"Se actualizo Registro: {db_doctor.nombre}: {', '.join(changed_field_names)}."
        else:
            details_for_log = "Actualización procesada, sin cambios de valor detectados."
        
        log_action(
            db=db, user=current_user, action_type="Actualizar Registro",
            target_entity="Doctor", target_id_str=id_imss, details=details_for_log
        )
        
        db.commit()
        db.refresh(db_doctor)
    
        return db_doctor
            
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Error de integridad de datos. Verifique que el ID o CURP no esté duplicado.")

    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error inesperado al actualizar: {str(e)}")


# --- ENDPOINT (REGISTRO HISTORIAL MANUAL) ---
@app.post("/api/doctores/{id_imss}/historial", response_model=schemas.EstatusHistoricoItem, tags=["Doctores - Historial"])
async def crear_registro_historial(
    id_imss: str,
    historial_data: schemas.EstatusHistoricoCreate,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    historial_dict = historial_data.model_dump()

    if not historial_dict.get("comentarios"):
        historial_dict["comentarios"] = "Registro retroactivo."
        
    nuevo_registro = models.EstatusHistorico(
        id_imss=id_imss, 
        **historial_dict
    )

    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    return nuevo_registro

# --- Endpoint de Autenticación (Login) ---
@app.post("/api/token", response_model=schemas.Token, tags=["Autenticación"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db_session)
):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos",
        )
    
    # Creamos el único token de larga duración
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role, "userId": user.id}
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": user
    }

# --- ENDPOINT (CAMBIAR CONTRASEÑA) ---
@app.put("/api/users/me/change-password", status_code=status.HTTP_200_OK, tags=["Usuarios"])
async def user_change_own_password(
    payload: schemas.UserChangePassword,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user) 
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
        db.commit()
        return {"detail": "Contraseña actualizada exitosamente. Por favor, inicia sesión de nuevo."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Error al guardar la nueva contraseña."
        )
    
# --- ENDPOINT (GESTION DE USUARIOS LEER) ---
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
    users = db.query(models.User).order_by(models.User.id).all()
    return users

# --- ENDPOINT (GESTION DE USUARIOS CREAR) ---
@app.post("/api/admin/users/register", response_model=schemas.UserAdminView, status_code=status.HTTP_201_CREATED, tags=["Admin - Usuarios"])
async def admin_crear_usuario(

    user_data: schemas.UserCreateAdmin, 
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
 
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

# --- ENDPOINT (GESTION DE USUARIOS ELIMINAR) ---
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
    
    if current_admin.id == user_id: raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes eliminarte.")
    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if user_to_delete is None: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    try:
        db.delete(user_to_delete); db.commit()
        return {"detail": f"Usuario '{user_to_delete.username}' eliminado."}
    except Exception as e:
        db.rollback(); traceback.print_exc(); raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al eliminar usuario.")

# --- ENDPOINT (GESTION DE USUARIOS RESTABLCER PASS) ---
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

# --- ENDPOINT (REPORTE EXCEL) ---
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
        query = db.query(models.Doctor)

        query = query.filter(models.Doctor.is_deleted == False)

        if hasattr(models.Doctor, 'id_imss'):
            query = query.order_by(models.Doctor.id_imss)
        
        doctores_orm = query.all()

        if not doctores_orm:
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
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]) and getattr(df[col].dt, 'tz', None) is not None:

                df[col] = df[col].dt.tz_localize(None)

        output = GlobalBytesIO()
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

# --- ENDPOINT (REPORTE PDF - PENDIENTE) ---
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

# --- ENDPOINT (GRAFICAS BARRAS) ---
@app.get("/api/graficas/doctores_por_estado", response_model=List[schemas.DataGraficaConCupos], tags=["Gráficas"])
async def get_data_grafica_doctores_por_estado(
    db: Session = Depends(get_db_session)
):
    #Contamos cuantos doctores Activos tenemos 
    conteo_actual_subquery = db.query(
        models.Doctor.entidad,
        func.count(models.Doctor.id_imss).label("conteo_actual")
    ).filter(
        models.Doctor.is_deleted == False,
        models.Doctor.estatus == '01 ACTIVO',
        models.Doctor.coordinacion != '1'
    ).group_by(models.Doctor.entidad).subquery()

    #Unimos los cupos con el conteo total
    resultados = db.query(
        models.EntidadCupos.entidad,
        models.EntidadCupos.minimo,
        models.EntidadCupos.maximo,
        func.coalesce(conteo_actual_subquery.c.conteo_actual, 0).label("value")
    ).outerjoin(
        conteo_actual_subquery, 
        models.EntidadCupos.entidad == conteo_actual_subquery.c.entidad
    ).order_by(func.coalesce(conteo_actual_subquery.c.conteo_actual, 0).desc()).all()

    return [
        {
            "label": r.entidad,
            "value": r.value,
            "minimo": r.minimo,
            "maximo": r.maximo
        } for r in resultados
    ]

# --- ENDPOINT (GRAFICAS PASTEL ESPECIALIDAD) ---
@app.get("/api/graficas/doctores_por_especialidad", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
async def get_data_grafica_doctores_por_especialidad(
    db: Session = Depends(get_db_session)
):
    query = text("SELECT especialidad as label, COUNT(*) as value FROM doctores WHERE especialidad IS NOT NULL AND especialidad != '' GROUP BY especialidad ORDER BY value DESC;")
    result = db.execute(query); return [{"label": row.label, "value": row.value} for row in result]

# --- ENDPOINT (GRAFICAS PASTEL ESTATUS) ---
@app.get("/api/graficas/doctores_por_estatus", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
async def get_data_grafica_doctores_por_estatus(
    db: Session = Depends(get_db_session)
):
    """
    Obtiene el número de doctores agrupados por el tipo principal de estatus,
    ignorando las variaciones en el texto.
    """
    estatus_map = {
        '01': '01 ACTIVO',
        '02': '02 RETIRO TEMP. (CUBA)',
        '03': '03 RETIRO TEMP. (MEXICO)',
        '04': '04 SOL. PERSONAL',
        '05': '05 INCAPACIDAD',
        '06': '06 BAJA'
    }

    # La consulta ahora extrae los primeros 2 caracteres del estatus para agrupar.
    query = text("""
        SELECT 
            SUBSTRING(estatus FROM 1 FOR 2) as estatus_code, 
            COUNT(*) as value 
        FROM doctores 
        WHERE estatus IS NOT NULL AND estatus != '' AND coordinacion != '1'
        GROUP BY estatus_code 
        ORDER BY value DESC;
    """)
    
    result = db.execute(query)
    
    # Transformamos el resultado para usar las etiquetas limpias del mapa.
    data_items = []
    for row in result:
        # Usamos el mapa para obtener la etiqueta correcta, o el código si no se encuentra.
        label = estatus_map.get(row.estatus_code, row.estatus_code)
        data_items.append({"id": label, "label": label, "value": row.value})
        
    return data_items

# --- ENDPOINT (GRAFICAS PASTEL NIVEL ATENCION) ---
@app.get("/api/graficas/doctores_por_nivel_atencion", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
async def get_data_grafica_doctores_por_nivel_atencion(
    db: Session = Depends(get_db_session)
):
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

# --- ENDPOINT (AUDITORIA MOSTRAR) ---
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
        logs_query = logs_query.filter(models.AuditLog.username == username)
    
    if action_type:
        logs_query = logs_query.filter(models.AuditLog.action_type == action_type)

    if start_date:
        # 1. Crear un datetime 
        local_start_dt_naive = datetime.combine(start_date, datetime.min.time())
        # 2. Asignar la zona horaria del usuario a este datetime 
        local_start_dt_aware = USER_TIMEZONE.localize(local_start_dt_naive)
        # 3. Convertir este datetime (en zona horaria del usuario) a UTC
        start_datetime_utc = local_start_dt_aware.astimezone(pytz.utc)
        logs_query = logs_query.filter(models.AuditLog.timestamp >= start_datetime_utc)

    if end_date:
        local_end_dt_exclusive_naive = datetime.combine(end_date + timedelta(days=1), datetime.min.time())
        local_end_dt_exclusive_aware = USER_TIMEZONE.localize(local_end_dt_exclusive_naive)
        end_datetime_exclusive_utc = local_end_dt_exclusive_aware.astimezone(pytz.utc)
        logs_query = logs_query.filter(models.AuditLog.timestamp < end_datetime_exclusive_utc)
        
    try:
        total_count = logs_query.count() 
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el conteo de logs: {str(e)}")

    logs = logs_query.order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    return {"total_count": total_count, "audit_logs": logs}

# --- ENDPOINT (REGISTROS ELIMINADOS) ---
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
        doc_schema_instance = schemas.Doctor.from_orm(doc_orm)
        
        if doc_orm.deleted_by_user_obj and hasattr(doc_orm.deleted_by_user_obj, 'username'):
            doc_schema_instance.deleted_by_username = doc_orm.deleted_by_user_obj.username
        else:
            doc_schema_instance.deleted_by_username = "Desconocido" 

        response_doctores.append(doc_schema_instance) 
    
    return {"total_count": total_count, "doctores": response_doctores}

# --- ENDPOINT (RESTAURAR REGISTRO) ---
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
        check_exists_not_deleted = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss, models.Doctor.is_deleted == False).first()
        if check_exists_not_deleted:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El doctor no está eliminado y no puede ser restaurado.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor eliminado no encontrado.")

    try:
        db_doctor.is_deleted = False
        db_doctor.deleted_at = None
        log_details = f"Registro restaurado: {db_doctor.nombre} (ID: {db_doctor.id_imss})"
        log_action(db, current_admin, "Restaurar Registro", "Doctor", id_imss, log_details)
        
        db.commit()
        db.refresh(db_doctor)
        return db_doctor
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al restaurar el doctor: {str(e)}")

# --- ENDPOINT (AUDITORIA ELIMINAR) ---
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
        logging.warning(f"Intento fallido de eliminación de logs por el usuario {current_admin.username if current_admin else 'desconocido'} debido a PIN incorrecto.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PIN de confirmación incorrecto."
        )

    ids_a_eliminar = request_data.ids
    if not ids_a_eliminar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se proporcionaron IDs de logs para eliminar."
        )

    try:
        num_eliminados = db.query(models.AuditLog).filter(models.AuditLog.id.in_(ids_a_eliminar)).delete(synchronize_session=False)
        db.commit()

        logging.info(f"El administrador {current_admin.username} (ID: {current_admin.id}) eliminó {num_eliminados} registro(s) de auditoría. IDs solicitados: {ids_a_eliminar}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        db.rollback() 
        logging.exception(f"Error interno al intentar eliminar logs de auditoría por {current_admin.username if current_admin else 'desconocido'}:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor al procesar la eliminación de logs: {str(e)}"
        )

# --- ENDPOINT (VALIDAR CURP) ---
@app.get("/api/doctores/check-curp/{curp_valor}", response_model=schemas.CurpCheckResponse, tags=["Doctores"])
async def verificar_curp_existente(
    curp_valor: str, 
    db: Session = Depends(get_db_session),
):
    if not curp_valor or len(curp_valor) != 18:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Formato de CURP inválido.")

    existing_doctor = db.query(models.Doctor).filter(
        models.Doctor.curp == curp_valor.upper(),
        models.Doctor.is_deleted == False 
    ).first()

    if existing_doctor:
        return {"exists": True, "message": "Este CURP ya está registrado."}
    return {"exists": False, "message": "CURP disponible."}

# --- ENDPOINT (TABLA DINAMICA - PENDIENTE ACTUALIZAR GIT) ---
@app.get("/api/graficas/estadistica_doctores_agrupados", response_model=schemas.EstadisticaPaginada, tags=["Graficas y Estadísticas"])
async def obtener_estadistica_doctores_agrupados(
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    entidad: Optional[str] = Query(None),
    especialidad: Optional[str] = Query(None),
    nivel_atencion: Optional[str] = Query(None),
    nombre_unidad: Optional[str] = Query(None),
    estatus: Optional[str] = Query(None) 
):
    try:
        base_filtered_query = db.query(models.Doctor).filter(
            models.Doctor.is_deleted == False,
            models.Doctor.coordinacion == '0'
        )
        if entidad: base_filtered_query = base_filtered_query.filter(models.Doctor.entidad == entidad)
        if especialidad: base_filtered_query = base_filtered_query.filter(models.Doctor.especialidad == especialidad)
        if nivel_atencion: base_filtered_query = base_filtered_query.filter(models.Doctor.nivel_atencion == nivel_atencion)
        if nombre_unidad: base_filtered_query = base_filtered_query.filter(models.Doctor.nombre_unidad == nombre_unidad)
        if estatus: base_filtered_query = base_filtered_query.filter(models.Doctor.estatus == estatus)


        if search and search.strip():
            search_words = search.strip().split()
            search_conditions = []
            for word in search_words:
                word_term = f"%{word}%"
                search_conditions.append(
                    or_(
                        models.Doctor.clues.ilike(word_term) # Búsqueda por CLUES
                    )
                )
            base_filtered_query = base_filtered_query.filter(and_(*search_conditions))


        total_doctors_in_groups_count = base_filtered_query.count() or 0

        grouped_query_for_items = base_filtered_query.with_entities(
            models.Doctor.entidad,
            models.Doctor.nombre_unidad,
            models.Doctor.clues,   
            models.Doctor.especialidad,
            models.Doctor.nivel_atencion,
            models.Doctor.estatus,
            func.count(models.Doctor.id_imss).label("cantidad")
        ).group_by(
            models.Doctor.entidad,
            models.Doctor.nombre_unidad, 
            models.Doctor.clues,        
            models.Doctor.especialidad,
            models.Doctor.nivel_atencion,
            models.Doctor.estatus
        )

        count_subquery = grouped_query_for_items.with_entities(
             models.Doctor.entidad, models.Doctor.especialidad, models.Doctor.nivel_atencion, models.Doctor.estatus
        ).distinct().subquery('grouped_data_for_count')
        
        total_groups_count_query = db.query(func.count()).select_from(count_subquery)
        total_groups_count = total_groups_count_query.scalar() or 0

        query_result_paginated = grouped_query_for_items.order_by(
            models.Doctor.entidad.asc().nullsfirst(),
            models.Doctor.especialidad.asc().nullsfirst(),
            models.Doctor.nivel_atencion.asc().nullsfirst(),
            models.Doctor.nombre_unidad.asc().nullsfirst(),
            models.Doctor.estatus.asc().nullsfirst()
        ).offset(skip).limit(limit).all()

        items_for_response = []
        for row in query_result_paginated:
            item_data = {
                "entidad": row.entidad if row.entidad is not None else "N/A",
                "nombre_unidad": row.nombre_unidad or "N/A",
                "clues": row.clues or "N/A",   
                "especialidad": row.especialidad if row.especialidad is not None else "N/A",
                "nivel_atencion": row.nivel_atencion if row.nivel_atencion is not None else "N/A",
                "estatus": row.estatus if row.estatus is not None else "N/A",
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

# --- ENDPOINT (TABLA DINAMICA ESPECIALIDAD - PENDIENTE ACTUALIZAR GIT) ---
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

# --- ENDPOINT (TABLA DINAMICA NIVEL ATENCION - PENDIENTE ACTUALIZAR GIT) ---
@app.get("/api/graficas/doctores_por_nivel_atencion", response_model=List[schemas.NivelAtencionItem], tags=["Graficas y Estadísticas"])
async def obtener_doctores_por_nivel_atencion(
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        niveles_predefinidos_raw = ["PRIMER NIVEL", "SEGUNDO NIVEL", "TERCER NIVEL", "OTRO", "NO APLICA"]
        niveles_predefinidos_normalizados = [
            (nivel.strip() if nivel is not None else "") or "SIN REGISTRO"
            for nivel in niveles_predefinidos_raw
        ]
        nivel_normalizado_db = func.coalesce(
            func.nullif(func.trim(models.Doctor.nivel_atencion), ""),
            "SIN REGISTRO"
        )
        raw_data_check_query = db.query(
            models.Doctor.nivel_atencion,
            nivel_normalizado_db.label("nivel_atencion_normalizado")
        ).filter(
            models.Doctor.is_deleted == False 
        ).limit(10).all() 
        
        print("\n--- DEBUG: Vista previa de la normalización de datos RAW (primeros 10 doctores activos) ---")
        if not raw_data_check_query:
            print("  No se encontraron registros de doctores activos para la comprobación RAW.")
        for row in raw_data_check_query:
            print(f"  RAW: {repr(row.nivel_atencion)} -> NORMALIZADO DB: {repr(row.nivel_atencion_normalizado)}")
        print("-------------------------------------------------------------------------------------\n")

        query = db.query(
            nivel_normalizado_db.label("nivel_atencion"), 
            func.count('*').label("total_doctores")    
        ).filter(
            models.Doctor.is_deleted == False 
        ).group_by(nivel_normalizado_db) 

        resultados = query.all()
        print("Resultados de la consulta de base de datos (normalizados DB y conteos):", resultados)
        print("Niveles predefinidos normalizados (Python para comparación):", niveles_predefinidos_normalizados)

        resultados_dict = {item.nivel_atencion: item.total_doctores for item in resultados}
        print("Diccionario de resultados (tras la consulta):", resultados_dict)

        response = []
        for nivel_norm in niveles_predefinidos_normalizados:
            count = resultados_dict.get(nivel_norm, 0)
            response.append({"nivel_atencion": nivel_norm, "total_doctores": count})
            
        otros_niveles = set(resultados_dict.keys()) - set(niveles_predefinidos_normalizados)
        for nivel_extra in otros_niveles:
            response.append({"nivel_atencion": nivel_extra, "total_doctores": resultados_dict[nivel_extra]})
            
        print("Respuesta FINAL que el backend enviará al frontend:", response)
        
        return response

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al obtener doctores por nivel de atención: {str(e)}")

# --- ENDPOINT (ELIMINAR REGISTRO PERMANENTEMENTE) ---
@app.delete("/api/doctores/{id_imss}/permanent", tags=["Doctores"])
async def eliminar_doctor_permanentemente(
    id_imss: str,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        # Verifica si el doctor existe y está marcado como eliminado
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

# --- ENDPOINT (ELIMINAR REGISTRO PERMANENTEMENTE) ---
@app.delete("/api/admin/doctores/permanent-delete-bulk", status_code=status.HTTP_204_NO_CONTENT, tags=["Admin - Doctores"])
async def admin_eliminar_doctores_permanentemente_bulk(
    request_data: schemas.DoctorPermanentDeleteRequest, 
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user) 
):
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
            models.Doctor.is_deleted == True
        ).first()

        if not doctor:
            doctores_no_encontrados_o_no_validos_ids.append(doctor_id)
        else:
            doctores_a_eliminar_objetos.append(doctor)

    if doctores_no_encontrados_o_no_validos_ids:
        db.rollback() 
        error_detail = f"Los siguientes IDs de doctores no se encontraron, no están marcados como eliminados, o ya no existen: {doctores_no_encontrados_o_no_validos_ids}."
        logging.warning(f"Intento de eliminación permanente fallido para {current_admin.username}. Detalle: {error_detail}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=error_detail
        )
    
    if not doctores_a_eliminar_objetos:  
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    try:
        nombres_doctores_eliminados = [d.nombre for d in doctores_a_eliminar_objetos] # Para el log

        for doctor_obj in doctores_a_eliminar_objetos:
            db.delete(doctor_obj)
        
        db.commit()

        details_log_bulk = f"Eliminación permanente en bloque de {len(doctores_a_eliminar_objetos)} doctor(es). Nombres: {', '.join(nombres_doctores_eliminados)}. IDs: {[d.id_imss for d in doctores_a_eliminar_objetos]}"
        log_action(db, current_admin, "Eliminación permanente en bloque", "Doctor", None, details_log_bulk)
        logging.info(f"Admin {current_admin.username} eliminó permanentemente {len(doctores_a_eliminar_objetos)} doctor(es). IDs: {[d.id_imss for d in doctores_a_eliminar_objetos]}")
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        db.rollback()
        logging.exception(f"Error en eliminación permanente en bloque de doctores por {current_admin.username}:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al eliminar doctores: {str(e)}"
        )

# --- ENDPOINT (AUDITORIA - LEER USUARIOS) ---
@app.get("/api/admin/audit-log-options/users", response_model=List[str], tags=["Admin - Auditoría Opciones"])
async def leer_usuarios_unicos_auditoria(
    db: Session = Depends(get_db_session), 
    current_admin: models.User = Depends(security.get_current_admin_user) 
):
    try:
        query_result = db.query(distinct(models.AuditLog.username)).all()
    
        unique_users = [item[0] for item in query_result if item[0] is not None]
        return sorted(list(set(unique_users))) # Asegura unicidad y ordena
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener usuarios únicos: {str(e)}")

# --- ENDPOINT (AUDITORIA - LEER ACCIONES) ---
@app.get("/api/admin/audit-log-options/actions", response_model=List[str], tags=["Admin - Auditoría Opciones"])
async def leer_acciones_unicas_auditoria(
    db: Session = Depends(get_db_session), 
    current_admin: models.User = Depends(security.get_current_admin_user)
):
    try:
        query_result = db.query(distinct(models.AuditLog.action_type)).all()
        unique_actions = [item[0] for item in query_result if item[0] is not None]
        return sorted(list(set(unique_actions))) # Asegura unicidad y ordena
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener acciones únicas: {str(e)}")

# --- ENDPOINT (CATALOGO CLUES) ---
@app.get("/api/clues/{clues_code}", response_model=schemas.CluesData, tags=["Catálogos"])
async def get_clues_data(clues_code: str, db: Session = Depends(get_db_session)):

    clues_info = db.query(models.CatalogoClues).filter(models.CatalogoClues.clues == clues_code).first()
    
    if not clues_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La CLUES no fue encontrada en el catálogo."
        )
    return clues_info

# --- ENDPOINT (GENERA REPORTE DINAMICO - PENDIENTE) ---
@app.post("/api/reporte/dinamico/xlsx", tags=["Reportes"])
async def generar_reporte_dinamico_excel(
    request_data: schemas.ReporteDinamicoRequest,
    db: Session = Depends(get_db_session)
):
    query = db.query(models.Doctor).filter(
        models.Doctor.is_deleted == False,
        models.Doctor.coordinacion == '0'
    )

    if request_data.entidad:
        query = query.filter(models.Doctor.entidad == request_data.entidad)
    if request_data.especialidad:
        query = query.filter(models.Doctor.especialidad == request_data.especialidad)
    if request_data.nivel_atencion:
        query = query.filter(models.Doctor.nivel_atencion == request_data.nivel_atencion)
    if request_data.nombre_unidad:
        query = query.filter(models.Doctor.nombre_unidad == request_data.nombre_unidad)
    if request_data.estatus:
        query = query.filter(models.Doctor.estatus == request_data.estatus)

    if request_data.search and request_data.search.strip():
        search_words = request_data.search.strip().split()
        search_conditions = []
        for word in search_words:
            word_term = f"%{word}%"
            search_conditions.append(
                or_(
                    models.Doctor.clues.ilike(word_term)
                )
            )
        query = query.filter(and_(*search_conditions))

    doctores_filtrados = query.all()

    if not doctores_filtrados:
        raise HTTPException(status_code=404, detail="No se encontraron doctores con los filtros especificados.")

    doctores_data = [doc.__dict__ for doc in doctores_filtrados]
    
    df = pd.DataFrame(doctores_data)

    columnas_validas = [col for col in request_data.columnas if col in df.columns]
    if not columnas_validas:
        raise HTTPException(status_code=400, detail="Ninguna de las columnas seleccionadas es válida.")

    df_seleccionado = df[columnas_validas]

    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df_seleccionado.to_excel(writer, index=False, sheet_name='Registros Filtrados')
    output.seek(0)

    headers = {
        'Content-Disposition': 'attachment; filename="reporte_filtrado.xlsx"'
    }
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

# --- ENDPOINT (GENERA REPORTE OPCIONES FILTRO - PENDIENTE) ---
@app.get("/api/opciones/filtros-dinamicos", response_model=schemas.OpcionesFiltro, tags=["Opciones de Filtro"])
async def get_opciones_dinamicas(
    entidad: Optional[str] = Query(None),
    nombre_unidad: Optional[str] = Query(None),
    especialidad: Optional[str] = Query(None),
    nivel_atencion: Optional[str] = Query(None),
    estatus: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db_session)
):
    """
    Obtiene las listas de opciones disponibles para TODOS los filtros, 
    basadas en los filtros ya aplicados.
    """
    # Consulta base: siempre sobre doctores no eliminados y no de coordinación.
    base_query = db.query(models.Doctor).filter(
        models.Doctor.is_deleted == False,
        models.Doctor.coordinacion == '0'
    )

    # Aplicamos los filtros que vienen del frontend a nuestra consulta base
    if entidad:
        base_query = base_query.filter(models.Doctor.entidad == entidad)
    if nombre_unidad:
        base_query = base_query.filter(models.Doctor.nombre_unidad == nombre_unidad)
    if especialidad:
        base_query = base_query.filter(models.Doctor.especialidad == especialidad)
    if nivel_atencion:
        base_query = base_query.filter(models.Doctor.nivel_atencion == nivel_atencion)
    if estatus:
        base_query = base_query.filter(models.Doctor.estatus == estatus)

    if search and search.strip():
        search_words = search.strip().split()
        search_conditions = []
        for word in search_words:
            word_term = f"%{word}%"
            search_conditions.append(
                or_(
                    models.Doctor.nombre.ilike(word_term),
                    models.Doctor.apellido_paterno.ilike(word_term),
                    models.Doctor.apellido_materno.ilike(word_term),
                    models.Doctor.id_imss.ilike(word_term),
                    models.Doctor.clues.ilike(word_term)
                )
            )
        base_query = base_query.filter(and_(*search_conditions))


    # Función auxiliar para obtener valores únicos de una columna
    def get_distinct_values(field):
        query = base_query.with_entities(distinct(field)).filter(field.isnot(None), field != '').order_by(field)
        return [row[0] for row in query.all()]

    # --- CORRECCIÓN CLAVE AQUÍ ---
    # A partir de la consulta base filtrada, obtenemos las opciones únicas para cada campo
    # y nos aseguramos de incluir 'estatuses' en la respuesta.
    return {
        "entidades": get_distinct_values(models.Doctor.entidad),
        "unidades": get_distinct_values(models.Doctor.nombre_unidad),
        "especialidades": get_distinct_values(models.Doctor.especialidad),
        "niveles_atencion": get_distinct_values(models.Doctor.nivel_atencion),
        "estatus": get_distinct_values(models.Doctor.estatus),
    }


@app.get("/api/opciones/entidades-capacidad", response_model=List[schemas.EntidadCapacidad], tags=["Opciones de Filtro"])
async def get_entidades_con_capacidad(db: Session = Depends(get_db_session)):
    # 1. Contar los médicos activos por entidad
    conteo_actual_query = db.query(
        models.Doctor.entidad,
        func.count(models.Doctor.id_imss).label("conteo")
    ).filter(
        models.Doctor.is_deleted == False,
        models.Doctor.estatus == '01 ACTIVO'
    ).group_by(models.Doctor.entidad).subquery()

    # 2. Unir los cupos con el conteo actual
    resultados = db.query(
        models.EntidadCupos.entidad,
        models.EntidadCupos.minimo,
        models.EntidadCupos.maximo,
        func.coalesce(conteo_actual_query.c.conteo, 0).label("actual")
    ).outerjoin(
        conteo_actual_query, models.EntidadCupos.entidad == conteo_actual_query.c.entidad
    ).order_by(models.EntidadCupos.entidad).all()

    # Aquí necesitarás un diccionario para mapear 'BC' a 'Baja California', etc.
    # Por simplicidad, usamos el código de la entidad como label.
    return [
        {
            "entidad": r.entidad, "label": r.entidad, "minimo": r.minimo,
            "maximo": r.maximo, "actual": r.actual
        } for r in resultados
    ]

@app.get("/api/clues-con-capacidad/{clues_code}", response_model=schemas.CluesConCapacidad, tags=["Catálogos"])
async def get_clues_data_with_capacity(clues_code: str, db: Session = Depends(get_db_session)):
  
    clues_info = db.query(models.CatalogoClues).filter(models.CatalogoClues.clues == clues_code).first()
    
    if not clues_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La CLUES no fue encontrada en el catálogo."
        )

    entidad_de_clues = clues_info.entidad
    cupo_info = db.query(models.EntidadCupos).filter(models.EntidadCupos.entidad == entidad_de_clues).first()

    if not cupo_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontraron datos de cupo para la entidad {entidad_de_clues}."
        )

    conteo_actual = db.query(models.Doctor).filter(
        models.Doctor.entidad == entidad_de_clues,
        models.Doctor.is_deleted == False,
        models.Doctor.estatus == '01 ACTIVO'
    ).count()

    return {
        "clues": clues_info.clues,
        "nombre_unidad": clues_info.nombre_unidad,
        "direccion_unidad": clues_info.direccion_unidad, 
        "entidad": clues_info.entidad,
        "municipio": clues_info.municipio,
        "nivel_atencion": clues_info.nivel_atencion,
        "tipo_establecimiento": clues_info.tipo_establecimiento,
        "subtipo_establecimiento": clues_info.subtipo_establecimiento,
        "estrato": clues_info.estrato,
        "minimo": cupo_info.minimo,
        "maximo": cupo_info.maximo,
        "actual": conteo_actual
    }


