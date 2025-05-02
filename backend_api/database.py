# backend_api/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Cargar variables de entorno del archivo .env (para desarrollo local)
load_dotenv()

# Obtener la URL de conexión de la variable de entorno
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL is None:
    print("Error: La variable de entorno DATABASE_URL no está definida.")
    # Podrías lanzar una excepción aquí o manejarlo como prefieras
    # Por ahora, saldremos si no está definida para evitar errores posteriores
    exit()

# Crear el motor SQLAlchemy
# connect_args solo es necesario para SQLite, lo quitamos para Postgres
engine = create_engine(DATABASE_URL)

# Crear una clase SessionLocal configurada
# autocommit=False y autoflush=False son configuraciones estándar para APIs
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Crear una clase Base para nuestros modelos SQLAlchemy
Base = declarative_base()

# Función para obtener una sesión de base de datos (se usará en los endpoints)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()