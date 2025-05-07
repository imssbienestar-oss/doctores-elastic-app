# backend_api/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
import sqlalchemy.exc # Importar excepciones de SQLAlchemy
from typing import List, Optional # Asegúrate que Optional esté importado
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
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="API de Doctores IMSS Bienestar")

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://doctores-elastic-app.vercel.app",
    "https://doctores-elastic-2khh14iea-imssbienestars-projects.vercel.app"
]

# --- INICIO DEBUG CORS ---
print("--- [DEBUG CORS] Orígenes Configurados en main.py: ---")
if isinstance(origins, list):
    for origin in origins:
        print(f"- {origin}")
else:
    print(f"- Valor de origins NO es una lista: {origins}")
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

# --- Endpoints de la API ---

@app.get("/")
async def root():
    return {"message": "¡Bienvenido a la API de Doctores!"}

# Endpoint para obtener una lista de doctores (Permite invitados)
@app.get("/api/doctores", response_model=schemas.DoctoresPaginados)
async def leer_doctores(
    skip: int = 0,
    limit: int = 30,
    nombre: Optional[str] = None,
    db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user) # <-- Permite invitados
):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado" # <-- Maneja None
    print(f">>> FUNCIÓN LEER_DOCTORES EJECUTADA por {user_info} <<<")
    print(f"--- Recibido leer_doctores: skip={skip}, limit={limit}, nombre='{nombre}' ---")

    query = db.query(models.Doctor)
    if nombre:
        query = query.filter(models.Doctor.nombre_completo.ilike(f'%{nombre}%'))
    total_count = query.count()
    doctores = query.order_by(models.Doctor.id).offset(skip).limit(limit).all()
    return {"total_count": total_count, "doctores": doctores}

# Endpoint para obtener un doctor específico por ID (Permite invitados)
@app.get("/api/doctores/{doctor_id}", response_model=schemas.Doctor)
async def leer_doctor_por_id(
    doctor_id: int,
    db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user) # <-- Permite invitados
):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado" # <-- Maneja None
    print(f"--- Leyendo doctor ID: {doctor_id} por {user_info} ---")
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if db_doctor is None:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return db_doctor

# --- Endpoint para Crear un Nuevo Doctor (POST) --- (PROTEGIDO pero con manejo de '' a None)
@app.post("/api/doctores", response_model=schemas.Doctor, status_code=status.HTTP_201_CREATED)
async def crear_doctor(
    doctor_data: schemas.DoctorCreate,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user) # Requiere autenticación para crear
):
    print(f"--- Creando doctor por usuario: {current_user.username} ---")

    # Convertir el objeto Pydantic a un diccionario para poder modificarlo
    doctor_dict = doctor_data.dict()

    # --- INICIO: Convertir valores vacíos a None antes de guardar ---
    if doctor_dict.get('curp') == '':
        print("Convirtiendo CURP vacío a None para DB.")
        doctor_dict['curp'] = None

    # Convertir fechas vacías a None si el modelo las espera como Date o Datetime
    dateFields = ['fecha_notificacion', 'fecha_estatus', 'fecha_vuelo']
    for field in dateFields:
         if doctor_dict.get(field) == '':
             print(f"Convirtiendo campo de fecha vacío '{field}' a None para DB.")
             doctor_dict[field] = None
    # --- FIN: Convertir valores vacíos a None ---

    # Crear la instancia del modelo SQLAlchemy usando el diccionario modificado
    db_doctor = models.Doctor(**doctor_dict)

    db.add(db_doctor)
    try:
        db.commit() # Intentar guardar en la base de datos
        db.refresh(db_doctor) # Obtener el estado actualizado (incluyendo ID)
        return db_doctor
    except sqlalchemy.exc.IntegrityError as e: # Capturar error específico de integridad
        db.rollback() # Revertir la transacción
        error_info = str(e.orig) if hasattr(e, 'orig') else str(e) # Obtener detalle del error original
        print(f"Error de Integridad al crear doctor: {error_info}")
        if 'unique constraint "ix_doctores_curp"' in error_info:
             # Usar código 409 Conflict para duplicados
             raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Ya existe un doctor con la CURP proporcionada o dejada en blanco (si ya existe uno sin CURP).")
        elif 'violates not-null constraint' in error_info:
             # Usar código 400 Bad Request para campos requeridos faltantes
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Faltan campos requeridos o tienen valores inválidos.")
        else:
            # Otro error de integridad no esperado
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error de base de datos al crear el doctor.")
    except Exception as e: # Capturar cualquier otro error inesperado
        db.rollback()
        print(f"Error inesperado al crear doctor: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error inesperado al crear el doctor.")

# --- Endpoint para Actualizar Doctor (PUT) --- (PROTEGIDO)
@app.put("/api/doctores/{doctor_id}", response_model=schemas.Doctor)
async def actualizar_doctor(
    doctor_id: int,
    doctor_update: schemas.DoctorBase, # Recibe los datos a actualizar en el cuerpo
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user) # Protegido
):
    print(f"--- Iniciando actualización para ID: {doctor_id} por usuario: {current_user.username} ---")
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()

    if db_doctor is None:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    # Obtener los datos del cuerpo y excluir los no establecidos
    update_data = doctor_update.dict(exclude_unset=True)
    print(f"Datos recibidos para actualizar: {update_data}")

    # --- INICIO: Convertir valores vacíos a None antes de actualizar (similar a crear) ---
    if update_data.get('curp') == '':
        print("Convirtiendo CURP vacío a None para actualizar.")
        update_data['curp'] = None

    dateFields = ['fecha_notificacion', 'fecha_estatus', 'fecha_vuelo']
    for field in dateFields:
        if update_data.get(field) == '':
             print(f"Convirtiendo campo de fecha vacío '{field}' a None para actualizar.")
             update_data[field] = None
    # --- FIN: Convertir valores vacíos a None ---


    # Actualizar los campos del objeto SQLAlchemy
    for key, value in update_data.items():
        if hasattr(db_doctor, key):
            setattr(db_doctor, key, value)
        else:
            print(f"Advertencia: Campo '{key}' recibido pero no existe en el modelo Doctor.")

    try:
        db.add(db_doctor) # Añadir a la sesión (SQLAlchemy detecta cambios)
        db.commit()      # Confirmar transacción
        db.refresh(db_doctor) # Refrescar con datos de la DB
        print(f"--- Finalizando actualización para ID: {doctor_id} ---")
        return db_doctor
    except sqlalchemy.exc.IntegrityError as e: # Manejar errores de integridad también al actualizar
        db.rollback()
        error_info = str(e.orig) if hasattr(e, 'orig') else str(e)
        print(f"Error de Integridad al actualizar doctor: {error_info}")
        if 'unique constraint "ix_doctores_curp"' in error_info:
             raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Ya existe OTRO doctor con la CURP proporcionada.")
        else:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error de base de datos al actualizar.")
    except Exception as e:
        db.rollback()
        print(f"!!! ERROR durante commit o refresh en actualización: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno al guardar cambios: {e}")


# --- Endpoint para Eliminar Doctor (DELETE) --- (PROTEGIDO)
@app.delete("/api/doctores/{doctor_id}", status_code=status.HTTP_200_OK)
async def eliminar_doctor(
    doctor_id: int,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user) # Protegido
):
    print(f"--- Eliminando doctor ID: {doctor_id} por usuario: {current_user.username} ---")
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()

    if db_doctor is None:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    db.delete(db_doctor)
    db.commit()
    return {"detail": f"Doctor con ID {doctor_id} eliminado exitosamente"}


# --- Endpoint de Autenticación (Login) --- (PÚBLICO para obtener token)
@app.post("/api/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db_session)
):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Endpoint para Reporte Excel --- (Permite invitados)
@app.get("/api/reporte/xlsx")
async def generar_reporte_excel(
    db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user) # <-- Permite invitados
):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado" # <-- Maneja None
    print(f"Generando reporte Excel por {user_info}...")
    try:
        doctores_db = db.query(models.Doctor).order_by(models.Doctor.identificador_imss).all()
        if not doctores_db:
            raise HTTPException(status_code=404, detail="No hay doctores para generar el reporte.")
        doctores_list = [schemas.Doctor.from_orm(doc).dict() for doc in doctores_db]
        df = pd.DataFrame(doctores_list)
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Doctores')
        output.seek(0)
        headers = {'Content-Disposition': 'attachment; filename="reporte_doctores.xlsx"'}
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        print(f"Error generando reporte Excel: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno al generar el reporte Excel: {e}")

# --- Endpoint para Reporte PDF --- (Permite invitados)
@app.get("/api/reporte/pdf")
async def generar_reporte_resumen_pdf(
    db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user) # <-- Permite invitados
):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado" # <-- Maneja None
    print(f"Generando reporte PDF Resumido por {user_info}...")
    try:
        # (Tu lógica para generar PDF sigue igual aquí)
        query_total_general = text("SELECT COUNT(*) FROM doctores;")
        total_general_doctores = db.execute(query_total_general).scalar_one_or_none() or 0
        query_estado = text("SELECT entidad, COUNT(*) as total FROM doctores WHERE entidad IS NOT NULL AND entidad != '' GROUP BY entidad ORDER BY entidad;")
        result_estado = db.execute(query_estado)
        data_por_estado = [{"label": row[0], "total": row[1]} for row in result_estado]
        query_especialidad = text("SELECT especialidad, COUNT(*) as total FROM doctores WHERE especialidad IS NOT NULL AND especialidad != '' GROUP BY especialidad ORDER BY especialidad;")
        result_especialidad = db.execute(query_especialidad)
        data_por_especialidad = [{"label": row[0], "total": row[1]} for row in result_especialidad]
        if not data_por_estado and not data_por_especialidad and total_general_doctores == 0 : raise HTTPException(status_code=404, detail="No hay datos para generar los resúmenes del reporte.")
        pdf = FPDF(orientation='P', unit='mm', format='A4'); pdf.add_page(); pdf.set_auto_page_break(auto=True, margin=15)
        pdf.set_font('Arial', 'B', 16); pdf.cell(0, 10, 'Reporte Doctores', 0, 1, 'C'); pdf.ln(5)
        pdf.set_font('Arial', 'B', 12); pdf.cell(0, 10, f'Total de Doctores Registrados: {total_general_doctores}', 0, 1, 'L'); pdf.ln(10)
        if data_por_estado:
            pdf.set_font('Arial', 'B', 12); pdf.cell(0, 10, 'Doctores por Estado', 0, 1, 'L'); pdf.set_font('Arial', 'B', 10)
            col_widths_estado = [130, 40]; headers_estado = ['Estado', 'Total Doctores']; pdf.set_fill_color(220, 220, 220)
            for header, width in zip(headers_estado, col_widths_estado): pdf.cell(width, 7, header, 1, 0, 'C', fill=True)
            pdf.ln(); pdf.set_font('Arial', '', 10)
            for item in data_por_estado:
                row_data = [str(item['label']), str(item['total'])];
                for data_cell, width in zip(row_data, col_widths_estado): pdf.cell(width, 6, data_cell, 1, 0)
                pdf.ln()
            pdf.ln(10)
        if data_por_especialidad:
             pdf.set_font('Arial', 'B', 12); pdf.cell(0, 10, 'Doctores por Especialidad', 0, 1, 'L'); pdf.set_font('Arial', 'B', 10)
             col_widths_especialidad = [130, 40]; headers_especialidad = ['Especialidad', 'Total Doctores']; pdf.set_fill_color(220, 220, 220)
             for header, width in zip(headers_especialidad, col_widths_especialidad): pdf.cell(width, 7, header, 1, 0, 'C', fill=True)
             pdf.ln(); pdf.set_font('Arial', '', 10)
             for item in data_por_especialidad:
                 row_data = [str(item['label']), str(item['total'])];
                 for data_cell, width in zip(row_data, col_widths_especialidad): pdf.cell(width, 6, data_cell, 1, 0)
                 pdf.ln()
             pdf.ln(10)
        pdf_bytes = pdf.output(dest='S')
        if isinstance(pdf_bytes, str): pdf_bytes = pdf_bytes.encode('latin-1')
        pdf_output_stream = BytesIO(pdf_bytes)
        response_headers = {'Content-Disposition': 'attachment; filename="reporte_resumido_doctores.pdf"'}
        return StreamingResponse(pdf_output_stream, headers=response_headers, media_type='application/pdf')
    except Exception as e:
        print(f"Error generando reporte PDF resumido: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno al generar el reporte PDF resumido: {e}")

# --- Endpoints para Gráficas --- (Permiten invitados)
@app.get("/api/graficas/doctores_por_estado", response_model=List[schemas.DataGraficaItem])
async def get_data_grafica_doctores_por_estado(
    db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user) # <-- Permite invitados
):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado" # <-- Maneja None
    print(f"Accediendo a datos de gráfica (estado) por {user_info}")
    query = text("SELECT entidad as label, COUNT(*) as value FROM doctores WHERE entidad IS NOT NULL AND entidad != '' GROUP BY entidad ORDER BY value DESC;")
    result = db.execute(query)
    data_items = [{"label": row.label, "value": row.value} for row in result]
    return data_items

@app.get("/api/graficas/doctores_por_especialidad", response_model=List[schemas.DataGraficaItem])
async def get_data_grafica_doctores_por_especialidad(
    db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user) # <-- Permite invitados
):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado" # <-- Maneja None
    print(f"Accediendo a datos de gráfica (especialidad) por {user_info}")
    query = text("SELECT especialidad as label, COUNT(*) as value FROM doctores WHERE especialidad IS NOT NULL AND especialidad != '' GROUP BY especialidad ORDER BY value DESC;")
    result = db.execute(query)
    data_items = [{"label": row.label, "value": row.value} for row in result]
    return data_items

@app.get("/api/graficas/doctores_por_estatus", response_model=List[schemas.DataGraficaItem])
async def get_data_grafica_doctores_por_estatus(
    db: Session = Depends(get_db_session),
    current_user: Optional[models.User] = Depends(security.get_optional_current_user) # <-- Permite invitados
):
    user_info = f"usuario: {current_user.username}" if current_user else "invitado" # <-- Maneja None
    print(f"Accediendo a datos de gráfica (estatus) por {user_info}")
    query = text("""
        SELECT COALESCE(estatus, 'No Especificado') as label, COUNT(*) as value
        FROM doctores
        WHERE estatus IS NOT NULL AND estatus != '' -- O ajusta este WHERE si quieres incluir nulos/vacíos agrupados
        GROUP BY label -- Agrupar por el alias 'label'
        ORDER BY value DESC;
    """)
    # Se usó COALESCE para agrupar nulos/vacíos si existieran y fueran relevantes.
    # También se agrupó por el alias 'label'.
    result = db.execute(query)
    data_items = []
    for row in result:
        # El label ya no debería ser null por COALESCE, pero verificamos por si acaso
        if row.label:
            data_items.append({"id": row.label, "label": row.label, "value": row.value})
    return data_items
