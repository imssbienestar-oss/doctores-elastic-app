# backend_api/main.py
from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text, func # Importar func para server_default
import sqlalchemy.exc
from typing import List, Optional, Any
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware
import traceback
import uuid
import os
from urllib.parse import urlparse, unquote
import re

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

# Importaciones para optimización de imágenes
from io import BytesIO as IOBytesIO_for_image
from PIL import Image

# --- INICIALIZACIÓN DE DOTENV ---
from dotenv import load_dotenv
load_dotenv()

FIREBASE_STORAGE_BUCKET_NAME_GLOBAL: Optional[str] = None


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
        traceback.print_exc()

# --- FIN FUNCIÓN DE INICIALIZACIÓN DE FIREBASE ---

app = FastAPI(title="API de Doctores IMSS Bienestar")

# --- EVENTO DE INICIO DE FASTAPI ---
@app.on_event("startup")
async def startup_event():
    initialize_firebase() # Llama a la función de inicialización de Firebase
origins = [
    "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173",
    "https://doctores-elastic-app.vercel.app",
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
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        blob_path = f"{destination_path}/{unique_filename}"
        blob = bucket.blob(blob_path)
        file_content = await file.read()

        if optimize_image and file.content_type and file.content_type.startswith("image/"):
            try:
                img_io = IOBytesIO_for_image(file_content)
                img = Image.open(img_io)
                img.thumbnail((1024, 1024))
                output_buffer = IOBytesIO_for_image()
                img_format = img.format if img.format and img.format.upper() in ["JPEG", "PNG", "WEBP"] else "JPEG"
                if img_format.upper() == "PNG" and img.mode == "RGBA":
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[3])
                    img = background
                    img_format = "JPEG"
                save_kwargs = {'format': img_format, 'quality': 80}
                if img_format.upper() != "WEBP":
                    save_kwargs['optimize'] = True
                img.save(output_buffer, **save_kwargs)
                file_content_to_upload = output_buffer.getvalue()
                content_type_to_upload = f"image/{img_format.lower()}"
            except Exception as img_e:
                file_content_to_upload = file_content
                content_type_to_upload = file.content_type
        else:
            file_content_to_upload = file_content
            content_type_to_upload = file.content_type
        blob.upload_from_string(file_content_to_upload, content_type=content_type_to_upload)
        blob.make_public()
        return blob.public_url
    except firebase_admin.exceptions.FirebaseError as fb_e:
        traceback.print_exc(); return None
    except Exception as e:
        traceback.print_exc(); return None

# --- Helper para eliminar archivos de Firebase Storage ---
async def delete_from_firebase(file_url: Optional[str]) -> bool:
    try:
        app_instance = firebase_admin.get_app() # Intenta obtener la app inicializada
    except ValueError:
        return False # No se puede continuar
    
    if not file_url:
        return False

    try:
        bucket_name_from_app = app_instance.options.get('storageBucket')
        if not bucket_name_from_app:
            return False
        bucket = storage.bucket(bucket_name_from_app)

        parsed_url = urlparse(file_url)
        blob_path_encoded = None

        if parsed_url.scheme == 'https' and parsed_url.hostname == 'storage.googleapis.com':
            # El path sería /BUCKET_NAME/OBJECT_PATH
            # Necesitamos quitar el / inicial y el nombre del bucket del path
            path_parts = parsed_url.path.strip('/').split('/', 1)
            if len(path_parts) == 2:
                url_bucket_name = path_parts[0]
                object_path = path_parts[1]
             
                if url_bucket_name == FIREBASE_STORAGE_BUCKET_NAME_GLOBAL: # Usa la variable global definida al inicio
                    blob_path = object_path 
                else:
                    print(f"DEBUG delete_from_firebase: El nombre del bucket en la URL ({url_bucket_name}) no coincide con el configurado ({FIREBASE_STORAGE_BUCKET_CONFIG}).")
            else:
                print(f"DEBUG delete_from_firebase: No se pudo extraer el nombre del bucket y la ruta del objeto de la URL: {parsed_url.path}")
    
            blob = bucket.blob(blob_path) # bucket es storage.bucket(bucket_name_from_app)

            if blob.exists():
                blob.delete()
            return True
        else:
            return True # Considerar éxito para limpiar la BD

    except firebase_admin.exceptions.FirebaseError as fb_e:
        traceback.print_exc(); return False
    except Exception as e:
        traceback.print_exc(); return False

# --- Endpoints de la API ---
@app.get("/")
async def root():
    return {"message": "¡Bienvenido a la API de Doctores Cubanos IMSS Bienestar!"}

# --- Endpoints de Archivos ---
@app.post("/api/doctores/{doctor_id}/profile-picture", response_model=schemas.Doctor, tags=["Doctores - Archivos"])
async def subir_foto_perfil_doctor(
    doctor_id: int, file: UploadFile = File(...), db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    # ... (sin cambios aquí, asume que upload_to_firebase funciona) ...
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    destination_path = f"doctors/{doctor_id}/profile_pictures"
    file_url = await upload_to_firebase(file, destination_path, optimize_image=True)
    if not file_url:
        raise HTTPException(status_code=500, detail="Error al subir la foto de perfil al almacenamiento.")
    db_doctor.profile_pic_url = file_url
    try:
        db.add(db_doctor); db.commit(); db.refresh(db_doctor)
        return db_doctor
    except Exception as e:
        db.rollback(); traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error al guardar info de foto.")

@app.post("/api/doctores/{doctor_id}/attachments", response_model=schemas.DoctorAttachment, tags=["Doctores - Archivos"])
async def subir_expediente_doctor(
    doctor_id: int, file: UploadFile = File(...), db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    # ... (sin cambios aquí, asume que upload_to_firebase funciona) ...
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado para adjuntar expediente.")
    destination_path = f"doctors/{doctor_id}/attachments"
    file_url = await upload_to_firebase(file, destination_path, optimize_image=False)
    if not file_url:
        raise HTTPException(status_code=500, detail="Error al subir el expediente al almacenamiento.")
    attachment_data = schemas.DoctorAttachmentCreate(
        doctor_id=doctor_id, file_name=file.filename,
        file_url=file_url, file_type=file.content_type
    )
    db_attachment = models.DoctorAttachment(**attachment_data.model_dump()) # Usar model_dump()
    try:
        db.add(db_attachment); db.commit(); db.refresh(db_attachment)
        return db_attachment
    except Exception as e:
        db.rollback(); print(f"Error al guardar expediente en DB: {e}"); traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error al guardar info de expediente.")

@app.get("/api/doctores/{doctor_id}/attachments", response_model=List[schemas.DoctorAttachment], tags=["Doctores - Archivos"])
async def listar_expedientes_doctor(
    doctor_id: int, db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user)
):
    # ... (sin cambios) ...
    print(f"--- Listando expedientes para doctor ID: {doctor_id} ---")
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado para listar expedientes.")
    attachments = db.query(models.DoctorAttachment).filter(models.DoctorAttachment.doctor_id == doctor_id).all()
    return attachments

@app.delete("/api/doctores/{doctor_id}/attachments/{attachment_id}", status_code=status.HTTP_200_OK, tags=["Doctores - Archivos"])
async def eliminar_expediente_doctor(
    doctor_id: int, attachment_id: int, db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    # ... (sin cambios, asume que delete_from_firebase funciona) ...
    print(f"--- Usuario '{current_user.username}' eliminando expediente ID: {attachment_id} para doctor ID: {doctor_id} ---")
    db_attachment = db.query(models.DoctorAttachment).filter(
        models.DoctorAttachment.id == attachment_id,
        models.DoctorAttachment.doctor_id == doctor_id
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

# --- Endpoints de Doctores CRUD ---
@app.get("/api/doctores", response_model=schemas.DoctoresPaginados, tags=["Doctores"])
async def leer_doctores(
    skip: int = 0, limit: int = 30, nombre: Optional[str] = Query(None),
    estatus: Optional[str] = Query("Activo"), db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user)
):
    # ... (tu código sin cambios) ...
    query = db.query(models.Doctor)
    if nombre: query = query.filter(models.Doctor.nombre_completo.ilike(f'%{nombre}%'))
    if estatus and estatus.lower() != "todos": query = query.filter(models.Doctor.estatus == estatus)
    total_count = query.count()
    doctores = query.order_by(models.Doctor.id).offset(skip).limit(limit).all()
    return {"total_count": total_count, "doctores": doctores}

@app.get("/api/doctores/{doctor_id}", response_model=schemas.DoctorDetail, tags=["Doctores"])
async def leer_doctor_por_id(
    doctor_id: int, db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user)
):
    # ... (tu código sin cambios) ...
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if db_doctor is None: raise HTTPException(status_code=404, detail="Doctor no encontrado")
    attachments = db.query(models.DoctorAttachment).filter(models.DoctorAttachment.doctor_id == doctor_id).all()
    doctor_detail_response = schemas.DoctorDetail.from_orm(db_doctor)
    doctor_detail_response.attachments = [schemas.DoctorAttachment.from_orm(att) for att in attachments]
    return doctor_detail_response

@app.post("/api/doctores", response_model=schemas.Doctor, status_code=status.HTTP_201_CREATED, tags=["Doctores"])
async def crear_doctor(
    doctor_data: schemas.DoctorCreate, db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    # ... (tu código sin cambios, usando model_dump()) ...
    doctor_dict = doctor_data.model_dump()
    if doctor_dict.get('curp') == '': doctor_dict['curp'] = None
    dateFields = ['fecha_notificacion', 'fecha_estatus', 'fecha_vuelo']
    for field in dateFields:
        if doctor_dict.get(field) == '': doctor_dict[field] = None
    db_doctor = models.Doctor(**doctor_dict)
    db.add(db_doctor)
    try:
        db.commit(); db.refresh(db_doctor); return db_doctor
    except sqlalchemy.exc.IntegrityError as e:
        db.rollback(); error_info = str(e.orig) if hasattr(e, 'orig') else str(e)
        if 'ix_doctores_curp' in error_info: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CURP duplicada.")
        else: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error DB al crear.")
    except Exception as e:
        db.rollback(); traceback.print_exc(); raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error inesperado.")

@app.put("/api/doctores/{doctor_id}", response_model=schemas.Doctor, tags=["Doctores"])
async def actualizar_doctor(
    doctor_id: int, doctor_update: schemas.DoctorBase, db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    # ... (tu código sin cambios, usando model_dump()) ...
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if db_doctor is None: raise HTTPException(status_code=404, detail="Doctor no encontrado")
    update_data = doctor_update.model_dump(exclude_unset=True)
    if update_data.get('curp') == '': update_data['curp'] = None
    dateFields = ['fecha_notificacion', 'fecha_estatus', 'fecha_vuelo']
    for field in dateFields:
        if update_data.get(field) == '': update_data[field] = None
    for key, value in update_data.items():
        if hasattr(db_doctor, key): setattr(db_doctor, key, value)
    try:
        db.add(db_doctor); db.commit(); db.refresh(db_doctor)
        return db_doctor
    except sqlalchemy.exc.IntegrityError as e:
        db.rollback(); error_info = str(e.orig) if hasattr(e, 'orig') else str(e)
        if 'ix_doctores_curp' in error_info: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CURP duplicada.")
        else: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error DB al actualizar.")
    except Exception as e:
        db.rollback(); traceback.print_exc(); raise HTTPException(status_code=500, detail="Error inesperado.")

@app.delete("/api/doctores/{doctor_id}", status_code=status.HTTP_200_OK, tags=["Doctores"])
async def eliminar_doctor(
    doctor_id: int, db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    # ... (tu código sin cambios, con borrado de archivos de Firebase) ...
    db_doctor_to_delete = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if db_doctor_to_delete is None: raise HTTPException(status_code=404, detail="Doctor no encontrado")
    if db_doctor_to_delete.profile_pic_url: await delete_from_firebase(db_doctor_to_delete.profile_pic_url)
    attachments_to_delete = db.query(models.DoctorAttachment).filter(models.DoctorAttachment.doctor_id == doctor_id).all()
    for att in attachments_to_delete: await delete_from_firebase(att.file_url)
    try:
        db.delete(db_doctor_to_delete); db.commit()
        return {"detail": f"Doctor con ID {doctor_id} eliminado."}
    except Exception as e:
        db.rollback(); traceback.print_exc(); raise HTTPException(status_code=500, detail="Error al eliminar de DB.")

# --- Endpoint de Autenticación (Login) ---
@app.post("/api/token", response_model=schemas.Token, tags=["Autenticación"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db_session)
):
    # ... (tu código sin cambios) ...
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Credenciales incorrectas",headers={"WWW-Authenticate": "Bearer"},)
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {"sub": user.username, "role": user.role, "userId": user.id}
    access_token = security.create_access_token(data=token_data, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

# --- Endpoints de Administración de Usuarios ---
@app.get("/api/admin/users", response_model=List[schemas.UserAdminView], tags=["Admin - Usuarios"])
async def admin_leer_usuarios(
    db: Session = Depends(get_db_session), current_admin: models.User = Depends(get_current_admin_user)
):
    # ... (tu código sin cambios) ...
    users = db.query(models.User).order_by(models.User.id).all()
    return users

@app.post("/api/admin/users/register", response_model=schemas.UserAdminView, status_code=status.HTTP_201_CREATED, tags=["Admin - Usuarios"])
async def admin_crear_usuario(
    user_data: schemas.UserCreateAdmin, db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(get_current_admin_user)
):
    # ... (tu código sin cambios) ...
    existing_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing_user: raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nombre de usuario ya existe.")
    valid_roles = ["user", "admin"];
    if user_data.role not in valid_roles: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol inválido.")
    hashed_password = security.get_password_hash(user_data.password)
    db_user = models.User(username=user_data.username, hashed_password=hashed_password, role=user_data.role)
    try:
        db.add(db_user); db.commit(); db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback(); traceback.print_exc(); raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al crear usuario.")

@app.delete("/api/admin/users/{user_id}", status_code=status.HTTP_200_OK, tags=["Admin - Usuarios"])
async def admin_eliminar_usuario(
    user_id: int, db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(get_current_admin_user)
):
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
    user_id: int, payload: schemas.UserResetPasswordPayload,
    db: Session = Depends(get_db_session), current_admin: models.User = Depends(get_current_admin_user)
):
    # ... (tu código sin cambios) ...
    if not payload.new_password or len(payload.new_password) < 4: raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Contraseña inválida.")
    user_to_update = db.query(models.User).filter(models.User.id == user_id).first()
    if user_to_update is None: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    new_hashed_password = security.get_password_hash(payload.new_password)
    try:
        user_to_update.hashed_password = new_hashed_password; db.add(user_to_update); db.commit()
        return {"detail": f"Contraseña para '{user_to_update.username}' restablecida."}
    except Exception as e:
        db.rollback(); traceback.print_exc(); raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al resetear contraseña.")

# --- Endpoints de Reportes y Gráficas ---
@app.get("/api/reporte/xlsx", tags=["Reportes"])
async def generar_reporte_excel(
    db: Session = Depends(get_db_session), current_user: Optional[models.User] = Depends(security.get_optional_current_user)
):
    # ... (tu código sin cambios, usando model_dump()) ...
    doctores_db = db.query(models.Doctor).order_by(models.Doctor.identificador_imss).all()
    if not doctores_db: raise HTTPException(status_code=404, detail="No hay doctores.")
    doctores_list = [schemas.Doctor.from_orm(doc).model_dump() for doc in doctores_db]
    df = pd.DataFrame(doctores_list); output = GlobalBytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer: df.to_excel(writer, index=False, sheet_name='Doctores')
    output.seek(0); headers = {'Content-Disposition': 'attachment; filename="reporte_doctores.xlsx"'}
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@app.get("/api/reporte/pdf", tags=["Reportes"])
async def generar_reporte_resumen_pdf(
    db: Session = Depends(get_db_session), current_user: Optional[models.User] = Depends(security.get_optional_current_user)
):
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
    db: Session = Depends(get_db_session), current_user: Optional[models.User] = Depends(security.get_optional_current_user)
):
    # ... (tu código sin cambios) ...
    query = text("SELECT entidad as label, COUNT(*) as value FROM doctores WHERE entidad IS NOT NULL AND entidad != '' GROUP BY entidad ORDER BY value DESC;")
    result = db.execute(query); return [{"label": row.label, "value": row.value} for row in result]

@app.get("/api/graficas/doctores_por_especialidad", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
async def get_data_grafica_doctores_por_especialidad(
    db: Session = Depends(get_db_session), current_user: Optional[models.User] = Depends(security.get_optional_current_user)
):
    # ... (tu código sin cambios) ...
    query = text("SELECT especialidad as label, COUNT(*) as value FROM doctores WHERE especialidad IS NOT NULL AND especialidad != '' GROUP BY especialidad ORDER BY value DESC;")
    result = db.execute(query); return [{"label": row.label, "value": row.value} for row in result]

@app.get("/api/graficas/doctores_por_estatus", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
async def get_data_grafica_doctores_por_estatus(
    db: Session = Depends(get_db_session), current_user: Optional[models.User] = Depends(security.get_optional_current_user)
):
    # ... (tu código sin cambios) ...
    query = text("""SELECT COALESCE(estatus, 'No Especificado') as label, COUNT(*) as value FROM doctores WHERE estatus IS NOT NULL AND estatus != '' GROUP BY label ORDER BY value DESC;""")
    result = db.execute(query); data_items = []
    for row in result:
        if row.label: data_items.append({"id": row.label, "label": row.label, "value": row.value})
    return data_items
