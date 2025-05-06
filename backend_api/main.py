# backend_api/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional # Para especificar listas en los tipos de retorno
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta
from fastapi.middleware.cors import CORSMiddleware
import security # Importa nuestro nuevo módulo de seguridad

# Importaciones locales (usando . por estar en el mismo directorio)
import models, schemas, database
import pandas as pd
from fpdf import FPDF # Para PDF
from io import BytesIO # Para manejar archivos en memoria
from fastapi.responses import StreamingResponse # Para devolver archivos

# Crear tablas en la base de datos (solo si no existen)
# Esto normalmente se hace una vez, a veces con herramientas de migración,
# pero para empezar lo podemos poner aquí. No afectará a la tabla existente.
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="API de Doctores IMSS Bienestar")

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://doctores-elastic-app.vercel.app",
    "https://doctores-elastic-2khh14iea-imssbienestars-projects.vercel.app" # <-- ¿Está esta línea?
]

# --- INICIO DEBUG CORS ---
print("--- [DEBUG CORS] Orígenes Configurados en main.py: ---")
if isinstance(origins, list):
    for origin in origins:
        print(f"- {origin}")
else:
    print(f"- Valor de origins NO es una lista: {origins}")
print("----------------------------------------------------")
    # --- FIN DEBUG CORS ---


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Permite estos orígenes
    allow_credentials=True, # Permite cookies/credenciales (importante para futuro)
    allow_methods=["*"],    # Permite todos los métodos (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],    # Permite todas las cabeceras
)

# ... (el resto de tu código: create_all, endpoints, etc.) ...

# --- Dependencia de Sesión de Base de Datos ---
# Esta función se usará en los endpoints que necesiten hablar con la DB
def get_db_session():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Endpoints de la API ---

@app.get("/")
async def root():
    # Este endpoint ya no necesita acceder a la DB, lo dejamos como estaba
    return {"message": "¡Bienvenido a la API de Doctores!"}

# NUEVO: Endpoint para obtener una lista de doctores
# response_model=List[schemas.Doctor] valida que la salida sea una lista de Doctores
# Depends(get_db_session) inyecta una sesión de base de datos
@app.get("/api/doctores", response_model=schemas.DoctoresPaginados)
async def leer_doctores(skip: int = 0, limit: int = 30, nombre: Optional[str] = None, db: Session = Depends(get_db_session),current_user: schemas.User = Depends(security.get_current_user)):
    print(">>> ¡¡¡FUNCIÓN LEER_DOCTORES EJECUTADA!!! <<<") # <--- NUEVO PRINT AL INICIO
    print(f"--- Recibido leer_doctores: skip={skip}, limit={limit}, nombre='{nombre}' ---")
    
    """
    Obtiene una lista de doctores con paginación.
    """
    query = db.query(models.Doctor)

    # Aplicar filtro si se proporcionó el parámetro 'nombre'
    if nombre:
        # Usamos ilike para búsqueda case-insensitive y % para búsqueda parcial (contiene)
        query = query.filter(models.Doctor.nombre_completo.ilike(f'%{nombre}%')) # <--- NUEVO: Filtrado

    
     # Contar el total DESPUÉS de aplicar filtros
    total_count = query.count() # <--- CONTAR sobre la query filtrada

     # Aplicar orden, paginación y obtener resultados
    doctores = query.order_by(models.Doctor.id).offset(skip).limit(limit).all() # <--- USAR la query filtrada

    # Devolver la estructura paginada
    return {"total_count": total_count, "doctores": doctores} # <--- NUEVO: Devolver objeto

# NUEVO: Endpoint de prueba para obtener un doctor específico por ID
@app.get("/api/doctores/{doctor_id}", response_model=schemas.Doctor)
async def leer_doctor_por_id(doctor_id: int, db: Session = Depends(get_db_session),current_user: schemas.User = Depends(security.get_current_user)):
    """
    Obtiene un doctor por su ID.
    """
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if db_doctor is None:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return db_doctor


# --- Endpoint para Crear un Nuevo Doctor (POST) ---
@app.post("/api/doctores", response_model=schemas.Doctor, status_code=status.HTTP_201_CREATED)
async def crear_doctor(
    doctor_data: schemas.DoctorCreate, # Recibe datos validados por DoctorCreate
    db: Session = Depends(get_db_session),
    current_user: schemas.User = Depends(security.get_current_user) # Protegido
):
    """
    Crea un nuevo registro de doctor en la base de datos (RUTA PROTEGIDA).
    """
    # Crea una nueva instancia del modelo SQLAlchemy Doctor
    # Usando los datos recibidos en doctor_data
    # .dict() convierte el objeto Pydantic a un diccionario
    db_doctor = models.Doctor(**doctor_data.dict())

    # Añade el nuevo objeto a la sesión de la base de datos
    db.add(db_doctor)
    # Confirma la transacción para guardarlo
    db.commit()
    # Refresca el objeto para obtener el ID asignado por la base de datos
    db.refresh(db_doctor)

    # Devuelve el objeto del doctor recién creado
    return db_doctor

# --- Endpoint para Actualizar Doctor (PUT) ---
@app.put("/api/doctores/{doctor_id}", response_model=schemas.Doctor)
async def actualizar_doctor(
    doctor_id: int,
    doctor_update: schemas.DoctorBase, # Recibe los datos a actualizar en el cuerpo
    db: Session = Depends(get_db_session),
    current_user: schemas.User = Depends(security.get_current_user) # Protegido
):
    print(f"--- Iniciando actualización para ID: {doctor_id} ---") # DEBUG 
    """
    Actualiza la información de un doctor existente por su ID (RUTA PROTEGIDA).
    """
    # Busca el doctor existente en la base de datos
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()

    # Si no se encuentra, devuelve un error 404
    if db_doctor is None:
        print(f"Error: Doctor con ID {doctor_id} no encontrado.") # DEBUG
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    print(f"Doctor encontrado (antes de actualizar): ID={db_doctor.id}, Nombre={db_doctor.nombre_completo}") # DEBUG

    # Obtiene los datos del cuerpo de la petición como un diccionario
    update_data = doctor_update.dict(exclude_unset=True)
    print(f"Datos recibidos para actualizar: {update_data}") # DEBUG
    
    # Actualiza los campos del objeto doctor de la base de datos
    # con los datos recibidos en update_data
    for key, value in update_data.items():
         # Solo actualiza si el campo existe en el modelo Doctor
         if hasattr(db_doctor, key):
            print(f"Actualizando campo '{key}' a '{value}'") # DEBUG
            setattr(db_doctor, key, value)
         else:
             print(f"Advertencia: Campo '{key}' recibido pero no existe en el modelo Doctor.") # DEBUG

    print(f"Doctor DESPUÉS de setattr (antes de commit): ID={db_doctor.id}, Nombre={db_doctor.nombre_completo}") # DEBUG crucial!!

    try:
        # Guarda los cambios en la base de datos
        db.add(db_doctor) # Añade el objeto modificado a la sesión (SQLAlchemy detecta cambios)
        db.commit()      # Confirma la transacción
        print("Commit realizado exitosamente.") # DEBUG
        db.refresh(db_doctor) # Refresca el objeto con los datos de la DB (ej. por si hay triggers)
        print("Refresh realizado exitosamente.") # DEBUG
        print(f"Doctor DESPUÉS de refresh: ID={db_doctor.id}, Nombre={db_doctor.nombre_completo}") # DEBUG
        print(f"--- Finalizando actualización para ID: {doctor_id} ---") # DEBUG

        # Devuelve el objeto doctor actualizado
        return db_doctor
    except Exception as e:
            print(f"!!! ERROR durante commit o refresh: {e}") # DEBUG
            db.rollback() # Revertir cambios si hay error en commit/refresh
            raise HTTPException(status_code=500, detail=f"Error interno al guardar cambios: {e}")


# --- Endpoint para Eliminar Doctor (DELETE) ---
# --- Endpoint para Eliminar Doctor (DELETE) ---
@app.delete("/api/doctores/{doctor_id}", status_code=status.HTTP_200_OK) # Puedes usar 200 OK o 204 No Content
async def eliminar_doctor(
    doctor_id: int,
    db: Session = Depends(get_db_session),
    current_user: schemas.User = Depends(security.get_current_user) # Protegido
):
    """
    Elimina un doctor por su ID (RUTA PROTEGIDA).
    """
    # Busca el doctor existente
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()

    # Si no se encuentra, devuelve error 404
    if db_doctor is None:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    # Elimina el doctor de la sesión de la base de datos
    db.delete(db_doctor)
    # Confirma la transacción
    db.commit()

    # Devuelve una confirmación
    return {"detail": f"Doctor con ID {doctor_id} eliminado exitosamente"}
    # Alternativamente, para un status 204, no devuelvas nada: return None


# --- Aquí añadiremos endpoints para Login, PUT (Update), DELETE, etc. más adelante ---
# Nota: Usamos /token que es convencional para OAuth2/JWT
@app.post("/api/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db_session)
):
    # Busca al usuario en la base de datos
    user = db.query(models.User).filter(models.User.username == form_data.username).first()

    # Verifica si el usuario existe y si la contraseña es correcta
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Genera el token JWT
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    # Devuelve el token
    return {"access_token": access_token, "token_type": "bearer"}

# --- Endpoint para Reporte Excel ---
@app.get("/api/reporte/excel")
async def generar_reporte_excel(
    db: Session = Depends(get_db_session),
    current_user: schemas.User = Depends(security.get_current_user) # Protegido
):
    try:
        print("Generando reporte Excel...")
        # 1. Obtener TODOS los datos de doctores (sin paginación)
        #    Considera añadir filtros si es necesario en el futuro
        doctores_db = db.query(models.Doctor).order_by(models.Doctor.identificador_imss).all()
        if not doctores_db:
            raise HTTPException(status_code=404, detail="No hay doctores para generar el reporte.")

        # 2. Convertir a DataFrame de Pandas
        #    Podemos convertir los objetos SQLAlchemy directamente a dicts
        #    o usar una función para seleccionar/renombrar columnas si es necesario
        doctores_list = [schemas.Doctor.from_orm(doc).dict() for doc in doctores_db] # Usar Pydantic para serializar
        df = pd.DataFrame(doctores_list)

        # Opcional: Seleccionar/Reordenar/Renombrar columnas para el Excel
        # df = df[['id', 'nombre_completo', 'especialidad', ... ]] # Ejemplo
        # df.rename(columns={'nombre_completo': 'Nombre del Doctor'}, inplace=True) # Ejemplo

        print(f"DataFrame creado con {len(df)} filas. Generando Excel...")

        # 3. Crear archivo Excel en memoria
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Doctores')
        output.seek(0) # Mover el "cursor" al inicio del stream

        print("Excel generado. Enviando respuesta...")

        # 4. Devolver como respuesta descargable
        headers = {
            'Content-Disposition': 'attachment; filename="reporte_doctores.xlsx"'
        }
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except Exception as e:
        print(f"Error generando reporte Excel: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno al generar el reporte Excel: {e}")

# --- Endpoint para Reporte PDF ---
@app.get("/api/reporte/pdf")
async def generar_reporte_pdf(
    db: Session = Depends(get_db_session),
    current_user: schemas.User = Depends(security.get_current_user) # Protegido
):
    try:
        print("Generando reporte PDF...")
        # 1. Obtener TODOS los datos (igual que en Excel)
        doctores_db = db.query(models.Doctor).order_by(models.Doctor.id).all()
        if not doctores_db:
            raise HTTPException(status_code=404, detail="No hay doctores para generar el reporte.")

         # Convertir a lista de diccionarios (simplificado)
        doctores_list = [schemas.Doctor.from_orm(doc).dict() for doc in doctores_db]

        print(f"Datos obtenidos ({len(doctores_list)} filas). Generando PDF...")

        # 2. Crear PDF con FPDF
        pdf = FPDF(orientation='L', unit='mm', format='A4') # L=Landscape (Horizontal)
        pdf.add_page()
        pdf.set_font('Arial', 'B', 14) # Fuente para el título
        pdf.cell(277, 10, 'Reporte de Doctores', 0, 1, 'C') # Ancho A4-márgenes, alto, texto, borde, salto línea, align
        pdf.ln(5) # Salto de línea

        # Encabezados de la tabla (¡AJUSTA ESTOS Y SUS ANCHOS!)
        pdf.set_font('Arial', 'B', 8) # Fuente más pequeña para tabla
        headers = ['ID', 'Nombre Completo', 'Especialidad', 'Estatus', 'Entidad', 'CURP', 'Cedula Esp.'] # Ejemplo
        col_widths = [10, 60, 40, 20, 30, 40, 30] # Ancho de cada columna en mm (¡DEBEN SUMAR MENOS DE 277!)
        for header, width in zip(headers, col_widths):
            pdf.cell(width, 7, header, 1, 0, 'C', fill=True) # Borde 1, sin salto, centrado, con relleno
        pdf.ln() # Salto de línea después de encabezados

        # Datos de la tabla (¡AJUSTA LOS CAMPOS A MOSTRAR!)
        pdf.set_font('Arial', '', 8)
        for doctor in doctores_list:
            # Asegúrate que las claves coincidan con tu schema/modelo
            # y que manejes valores None (usamos '??' o get con default)
            row = [
                str(doctor.get('id', '')),
                str(doctor.get('nombre_completo', '')),
                str(doctor.get('especialidad', '')),
                str(doctor.get('estatus', '')),
                str(doctor.get('entidad', '')),
                str(doctor.get('curp', '')),
                str(doctor.get('cedula_esp', '')),
                # Añade más campos aquí si es necesario, ajustando headers y col_widths
            ]
            for item, width in zip(row, col_widths):
                pdf.cell(width, 6, item, 1, 0) # Borde 1, sin salto
            pdf.ln() # Salto al final de la fila

        print("PDF generado. Enviando respuesta...")

        # 3. Devolver PDF como respuesta descargable
        pdf_output = BytesIO(pdf.output(dest='S').encode('latin-1')) # Guardar en memoria como bytes

        headers = {
            'Content-Disposition': 'attachment; filename="reporte_doctores.pdf"'
        }
        return StreamingResponse(pdf_output, headers=headers, media_type='application/pdf')

    except Exception as e:
        print(f"Error generando reporte PDF: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno al generar el reporte PDF: {e}")
