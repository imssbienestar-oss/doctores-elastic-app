# backend_api/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
import sqlalchemy.exc # Importar excepciones de SQLAlchemy
from typing import List, Optional # Asegúrate que Optional y List estén importados
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from fastapi.middleware.cors import CORSMiddleware
import traceback
import security # Importa nuestro módulo de seguridad actualizado

# Importaciones locales
import models, schemas, database
import pandas as pd
from fpdf import FPDF
from io import BytesIO
from fastapi.responses import StreamingResponse

# Crear tablas en la base de datos (solo si no existen)
# ¡CUIDADO! Si haces cambios en los modelos, create_all no los actualizará.
# Necesitarías migraciones (ej. con Alembic) para cambios en producción.
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="API de Doctores IMSS Bienestar")

# --- Configuración de CORS ---
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://doctores-elastic-app.vercel.app",
    "https://doctores-elastic-2khh14iea-imssbienestars-projects.vercel.app"
]
print("--- [DEBUG CORS] Orígenes Configurados en main.py: ---")
if isinstance(origins, list): [print(f"- {origin}") for origin in origins]
else: print(f"- Valor de origins NO es una lista: {origins}")
print("----------------------------------------------------")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependencia de Sesión de Base de Datos ---
def get_db_session():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- NUEVA Dependencia para Verificar Usuario Admin ---
# Asegúrate que security.get_current_user esté definida y funcione correctamente
async def get_current_admin_user(current_user: models.User = Depends(security.get_current_user)):
    """
    Dependencia que verifica si el usuario autenticado actual tiene el rol 'admin'.
    Lanza HTTP 403 Forbidden si no lo es.
    """
    print(f"[Admin Check] Verificando usuario: '{current_user.username}', Rol: '{current_user.role}'") # Log para depuración
    if current_user.role != "admin": # Asegúrate que "admin" sea el valor exacto en tu DB
        print(f"[Admin Check] Acceso denegado para '{current_user.username}'.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación no permitida: Se requieren privilegios de administrador",
        )
    print(f"[Admin Check] Acceso permitido para admin '{current_user.username}'.")
    return current_user

# --- Endpoints de la API ---

@app.get("/")
async def root():
    return {"message": "¡Bienvenido a la API de Doctores!"}

# --- Endpoints de Doctores (Sin cambios) ---
@app.get("/api/doctores", response_model=schemas.DoctoresPaginados, tags=["Doctores"])
async def leer_doctores(
    skip: int = 0, limit: int = 30, nombre: Optional[str] = None,
    db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user)
):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado"
    print(f">>> LEER_DOCTORES por {user_info} (skip={skip}, limit={limit}, nombre='{nombre}') <<<")
    query = db.query(models.Doctor)
    if nombre: query = query.filter(models.Doctor.nombre_completo.ilike(f'%{nombre}%'))
    total_count = query.count()
    doctores = query.order_by(models.Doctor.id).offset(skip).limit(limit).all()
    return {"total_count": total_count, "doctores": doctores}

@app.get("/api/doctores/{doctor_id}", response_model=schemas.Doctor, tags=["Doctores"])
async def leer_doctor_por_id(
    doctor_id: int, db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user)
):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado"
    print(f"--- Leyendo doctor ID: {doctor_id} por {user_info} ---")
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if db_doctor is None: raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return db_doctor

@app.post("/api/doctores", response_model=schemas.Doctor, status_code=status.HTTP_201_CREATED, tags=["Doctores"])
async def crear_doctor(
    doctor_data: schemas.DoctorCreate, db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    print(f"--- Creando doctor por usuario: {current_user.username} ---")
    doctor_dict = doctor_data.dict()
    # ... (Tu lógica para convertir '' a None para CURP y fechas) ...
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
        print(f"Error de Integridad al crear doctor: {error_info}")
        if 'unique constraint "ix_doctores_curp"' in error_info:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"CURP duplicada o ya existe un registro sin CURP.")
        elif 'violates not-null constraint' in error_info:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Faltan campos requeridos.")
        else: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error DB al crear.")
    except Exception as e:
        db.rollback(); print(f"Error inesperado al crear doctor: {e}"); traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error inesperado al crear.")

@app.put("/api/doctores/{doctor_id}", response_model=schemas.Doctor, tags=["Doctores"])
async def actualizar_doctor(
    doctor_id: int, doctor_update: schemas.DoctorBase, db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    print(f"--- Actualizando ID: {doctor_id} por usuario: {current_user.username} ---")
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if db_doctor is None: raise HTTPException(status_code=404, detail="Doctor no encontrado")
    update_data = doctor_update.dict(exclude_unset=True)
    # ... (Tu lógica para convertir '' a None para CURP y fechas al actualizar) ...
    if update_data.get('curp') == '': update_data['curp'] = None
    dateFields = ['fecha_notificacion', 'fecha_estatus', 'fecha_vuelo']
    for field in dateFields:
         if update_data.get(field) == '': update_data[field] = None

    for key, value in update_data.items():
        if hasattr(db_doctor, key): setattr(db_doctor, key, value)
        else: print(f"Advertencia: Campo '{key}' no existe en modelo Doctor.")
    try:
        db.add(db_doctor); db.commit(); db.refresh(db_doctor)
        print(f"--- Actualización finalizada ID: {doctor_id} ---")
        return db_doctor
    except sqlalchemy.exc.IntegrityError as e:
        db.rollback(); error_info = str(e.orig) if hasattr(e, 'orig') else str(e)
        print(f"Error de Integridad al actualizar doctor: {error_info}")
        if 'unique constraint "ix_doctores_curp"' in error_info:
             raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Ya existe OTRO doctor con la CURP proporcionada.")
        else: raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error DB al actualizar.")
    except Exception as e:
        db.rollback(); print(f"!!! ERROR durante commit/refresh en actualización: {e}"); traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno al guardar cambios: {e}")

@app.delete("/api/doctores/{doctor_id}", status_code=status.HTTP_200_OK, tags=["Doctores"])
async def eliminar_doctor(
    doctor_id: int, db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    print(f"--- Eliminando doctor ID: {doctor_id} por usuario: {current_user.username} ---")
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if db_doctor is None: raise HTTPException(status_code=404, detail="Doctor no encontrado")
    db.delete(db_doctor); db.commit()
    return {"detail": f"Doctor con ID {doctor_id} eliminado exitosamente"}

# --- Endpoint de Autenticación (Login) (Verificado, está correcto) ---
@app.post("/api/token", response_model=schemas.Token, tags=["Autenticación"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db_session)
):
    print(f">>> LOGIN ATTEMPT FOR USERNAME:", form_data.username)
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user: print(f"--- User '{form_data.username}' not found."); raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas", headers={"WWW-Authenticate": "Bearer"})
    if not security.verify_password(form_data.password, user.hashed_password): print(f"--- Password verification failed for '{form_data.username}'."); raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas", headers={"WWW-Authenticate": "Bearer"})
    print(f"--- User '{user.username}' authenticated. ID: {user.id}, Role: {user.role}")
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {"sub": user.username, "role": user.role, "userId": user.id}
    print(f"--- Data for token creation: {token_data}")
    access_token = security.create_access_token(data=token_data, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

# --- INICIO: Endpoints de Administración de Usuarios ---

@app.get("/api/admin/users", response_model=List[schemas.UserAdminView], tags=["Admin - Usuarios"])
async def admin_leer_usuarios(
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(get_current_admin_user) # <-- USA LA DEPENDENCIA DE ADMIN
):
    """ Obtiene lista de usuarios (Solo Admin). """
    print(f"Admin '{current_admin.username}' solicitando lista de usuarios.")
    users = db.query(models.User).order_by(models.User.id).all()
    return users # Pydantic se encarga de usar UserAdminView

@app.post("/api/admin/users/register", response_model=schemas.UserAdminView, status_code=status.HTTP_201_CREATED, tags=["Admin - Usuarios"])
async def admin_crear_usuario(
    user_data: schemas.UserCreateAdmin,
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(get_current_admin_user) # <-- USA LA DEPENDENCIA DE ADMIN
):
    """ Crea un nuevo usuario (admin o user) (Solo Admin). """
    print(f"Admin '{current_admin.username}' creando usuario: {user_data.username}, Rol: {user_data.role}")
    existing_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing_user:
        print(f"Error: Username '{user_data.username}' ya existe.")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El nombre de usuario ya está en uso.")
    valid_roles = ["user", "admin"]
    if user_data.role not in valid_roles:
         print(f"Error: Rol '{user_data.role}' inválido.")
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Rol inválido. Permitidos: {valid_roles}")
    hashed_password = security.get_password_hash(user_data.password)
    db_user = models.User(username=user_data.username, hashed_password=hashed_password, role=user_data.role)
    try:
        db.add(db_user); db.commit(); db.refresh(db_user)
        print(f"Usuario '{db_user.username}' creado. ID: {db_user.id}, Rol: {db_user.role}")
        return db_user # Pydantic se encarga de usar UserAdminView
    except Exception as e:
        db.rollback(); print(f"Error inesperado al crear usuario '{user_data.username}': {e}"); traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al crear usuario.")

@app.delete("/api/admin/users/{user_id}", status_code=status.HTTP_200_OK, tags=["Admin - Usuarios"])
async def admin_eliminar_usuario(
    user_id: int,
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(get_current_admin_user) # <-- USA LA DEPENDENCIA DE ADMIN
):
    """ Elimina un usuario por ID (Solo Admin). No permite auto-eliminación. """
    print(f"Admin '{current_admin.username}' eliminando usuario ID: {user_id}")
    if current_admin.id == user_id:
        print("Error: Admin intentando auto-eliminarse.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes eliminar tu propia cuenta.")
    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if user_to_delete is None:
        print(f"Error: Usuario ID {user_id} no encontrado para eliminar.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    try:
        print(f"Eliminando usuario: {user_to_delete.username} (ID: {user_id})")
        db.delete(user_to_delete); db.commit()
        return {"detail": f"Usuario '{user_to_delete.username}' eliminado exitosamente"}
    except Exception as e:
        db.rollback(); print(f"Error inesperado al eliminar usuario ID {user_id}: {e}"); traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al eliminar usuario.")

@app.put("/api/admin/users/{user_id}/reset-password", status_code=status.HTTP_200_OK, tags=["Admin - Usuarios"])
async def admin_reset_password(
    user_id: int,
    payload: schemas.UserResetPasswordPayload, # Recibe la nueva contraseña en el cuerpo
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(get_current_admin_user) # Protegido por Admin
):
    """
    Restablece la contraseña de un usuario específico por su ID (Solo Admin).
    Recibe la nueva contraseña en el cuerpo de la solicitud.
    """
    print(f"Admin '{current_admin.username}' intentando restablecer contraseña para usuario ID: {user_id}")

    # Validar que la nueva contraseña no esté vacía (puedes añadir más validaciones si quieres)
    if not payload.new_password or len(payload.new_password) < 4: # Ejemplo: mínimo 4 caracteres
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña no puede estar vacía y debe tener al menos 4 caracteres."
         )

    # Buscar al usuario cuya contraseña se va a restablecer
    user_to_update = db.query(models.User).filter(models.User.id == user_id).first()
    if user_to_update is None:
        print(f"Error: Usuario ID {user_id} no encontrado para restablecer contraseña.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    # Hashear la nueva contraseña
    new_hashed_password = security.get_password_hash(payload.new_password)

    # Actualizar la contraseña en la base de datos
    try:
        user_to_update.hashed_password = new_hashed_password
        db.add(user_to_update)
        db.commit()
        print(f"Contraseña para usuario '{user_to_update.username}' (ID: {user_id}) restablecida exitosamente por admin '{current_admin.username}'.")
        return {"detail": f"Contraseña para '{user_to_update.username}' restablecida exitosamente."}
    except Exception as e:
        db.rollback()
        print(f"Error inesperado al restablecer contraseña para usuario ID {user_id}: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al actualizar la contraseña."
        )
# --- FIN: Endpoints de Administración de Usuarios ---

# --- Endpoints de Reportes y Gráficas (Sin cambios) ---
@app.get("/api/reporte/xlsx", tags=["Reportes"])
# ... (tu código)
async def generar_reporte_excel(db: Session = Depends(get_db_session), current_user: Optional[models.User] = Depends(security.get_optional_current_user)):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado"; print(f"Generando reporte Excel por {user_info}...")
    try:
        doctores_db = db.query(models.Doctor).order_by(models.Doctor.identificador_imss).all()
        if not doctores_db: raise HTTPException(status_code=404, detail="No hay doctores para generar el reporte.")
        doctores_list = [schemas.Doctor.from_orm(doc).dict() for doc in doctores_db]
        df = pd.DataFrame(doctores_list); output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer: df.to_excel(writer, index=False, sheet_name='Doctores')
        output.seek(0); headers = {'Content-Disposition': 'attachment; filename="reporte_doctores.xlsx"'}
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e: print(f"Error generando reporte Excel: {e}"); traceback.print_exc(); raise HTTPException(status_code=500, detail=f"Error interno al generar el reporte Excel: {e}")


@app.get("/api/reporte/pdf", tags=["Reportes"])
# ... (tu código)
async def generar_reporte_resumen_pdf(db: Session = Depends(get_db_session), current_user: Optional[models.User] = Depends(security.get_optional_current_user)):
     user_info = f"usuario: {current_user.username}" if current_user else "invitado"; print(f"Generando reporte PDF Resumido por {user_info}...")
     try:
         query_total_general = text("SELECT COUNT(*) FROM doctores;"); total_general_doctores = db.execute(query_total_general).scalar_one_or_none() or 0
         query_estado = text("SELECT entidad, COUNT(*) as total FROM doctores WHERE entidad IS NOT NULL AND entidad != '' GROUP BY entidad ORDER BY entidad;"); result_estado = db.execute(query_estado); data_por_estado = [{"label": row[0], "total": row[1]} for row in result_estado]
         query_especialidad = text("SELECT especialidad, COUNT(*) as total FROM doctores WHERE especialidad IS NOT NULL AND especialidad != '' GROUP BY especialidad ORDER BY especialidad;"); result_especialidad = db.execute(query_especialidad); data_por_especialidad = [{"label": row[0], "total": row[1]} for row in result_especialidad]
         if not data_por_estado and not data_por_especialidad and total_general_doctores == 0 : raise HTTPException(status_code=404, detail="No hay datos para generar los resúmenes del reporte.")
         pdf = FPDF(orientation='P', unit='mm', format='A4'); pdf.add_page(); pdf.set_auto_page_break(auto=True, margin=15)
         pdf.set_font('Arial', 'B', 16); pdf.cell(0, 10, 'Reporte Doctores', 0, 1, 'C'); pdf.ln(5)
         pdf.set_font('Arial', 'B', 12); pdf.cell(0, 10, f'Total de Doctores Registrados: {total_general_doctores}', 0, 1, 'L'); pdf.ln(10)
         if data_por_estado:
             pdf.set_font('Arial', 'B', 12); pdf.cell(0, 10, 'Doctores por Estado', 0, 1, 'L'); pdf.set_font('Arial', 'B', 10)
             col_widths_estado = [130, 40]; headers_estado = ['Estado', 'Total Doctores']; pdf.set_fill_color(220, 220, 220)
             for header, width in zip(headers_estado, col_widths_estado): pdf.cell(width, 7, header, 1, 0, 'C', fill=True)
             pdf.ln(); pdf.set_font('Arial', '', 10)
             for item in data_por_estado: row_data = [str(item['label']), str(item['total'])]; 
             for data_cell, width in zip(row_data, col_widths_estado): pdf.cell(width, 6, data_cell, 1, 0)
             pdf.ln(); pdf.ln(10)
         if data_por_especialidad:
              pdf.set_font('Arial', 'B', 12); pdf.cell(0, 10, 'Doctores por Especialidad', 0, 1, 'L'); pdf.set_font('Arial', 'B', 10)
              col_widths_especialidad = [130, 40]; headers_especialidad = ['Especialidad', 'Total Doctores']; pdf.set_fill_color(220, 220, 220)
              for header, width in zip(headers_especialidad, col_widths_especialidad): pdf.cell(width, 7, header, 1, 0, 'C', fill=True)
              pdf.ln(); pdf.set_font('Arial', '', 10)
              for item in data_por_especialidad: row_data = [str(item['label']), str(item['total'])]; 
              for data_cell, width in zip(row_data, col_widths_especialidad): pdf.cell(width, 6, data_cell, 1, 0)
              pdf.ln(); pdf.ln(10)
         pdf_bytes = pdf.output(dest='S'); pdf_bytes = pdf_bytes.encode('latin-1') if isinstance(pdf_bytes, str) else pdf_bytes
         pdf_output_stream = BytesIO(pdf_bytes); response_headers = {'Content-Disposition': 'attachment; filename="reporte_resumido_doctores.pdf"'}
         return StreamingResponse(pdf_output_stream, headers=response_headers, media_type='application/pdf')
     except Exception as e: print(f"Error generando reporte PDF resumido: {e}"); traceback.print_exc(); raise HTTPException(status_code=500, detail=f"Error interno al generar el reporte PDF resumido: {e}")


@app.get("/api/graficas/doctores_por_estado", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
# ... (tu código)
async def get_data_grafica_doctores_por_estado(db: Session = Depends(get_db_session), current_user: Optional[models.User] = Depends(security.get_optional_current_user)):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado"; print(f"Accediendo a datos de gráfica (estado) por {user_info}")
    query = text("SELECT entidad as label, COUNT(*) as value FROM doctores WHERE entidad IS NOT NULL AND entidad != '' GROUP BY entidad ORDER BY value DESC;")
    result = db.execute(query); data_items = [{"label": row.label, "value": row.value} for row in result]; return data_items


@app.get("/api/graficas/doctores_por_especialidad", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
# ... (tu código)
async def get_data_grafica_doctores_por_especialidad(db: Session = Depends(get_db_session), current_user: Optional[models.User] = Depends(security.get_optional_current_user)):
     user_info = f"usuario: {current_user.username}" if current_user else "invitado"; print(f"Accediendo a datos de gráfica (especialidad) por {user_info}")
     query = text("SELECT especialidad as label, COUNT(*) as value FROM doctores WHERE especialidad IS NOT NULL AND especialidad != '' GROUP BY especialidad ORDER BY value DESC;")
     result = db.execute(query); data_items = [{"label": row.label, "value": row.value} for row in result]; return data_items


@app.get("/api/graficas/doctores_por_estatus", response_model=List[schemas.DataGraficaItem], tags=["Gráficas"])
# ... (tu código)
async def get_data_grafica_doctores_por_estatus(db: Session = Depends(get_db_session), current_user: Optional[models.User] = Depends(security.get_optional_current_user)):
     user_info = f"usuario: {current_user.username}" if current_user else "invitado"; print(f"Accediendo a datos de gráfica (estatus) por {user_info}")
     query = text("""SELECT COALESCE(estatus, 'No Especificado') as label, COUNT(*) as value FROM doctores WHERE estatus IS NOT NULL AND estatus != '' GROUP BY label ORDER BY value DESC;""")
     result = db.execute(query); data_items = []
     for row in result:
         if row.label: data_items.append({"id": row.label, "label": row.label, "value": row.value})
     return data_items
