# backend_api/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv # Útil para desarrollo local con .env
import sys # Para salir si hay error crítico

# Carga .env solo para desarrollo local, Railway inyectará la variable directamente
load_dotenv()

# Lee la única variable que esperamos ahora, inyectada por Railway
DATABASE_URL = os.getenv("DATABASE_URL")

log_safe_db_url = "Variable DATABASE_URL no encontrada"
if DATABASE_URL:
    # Intenta ocultar contraseña para el log (mejor esfuerzo)
    try:
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(DATABASE_URL)
        password = parsed.password
        log_safe_db_url = DATABASE_URL.replace(f":{password}@", ":********@") if password else DATABASE_URL
        
    except:
        log_safe_db_url = "Error al parsear URL para ocultar contraseña"
else:
    # Si la variable no está definida, es un error fatal en despliegue
    print("Error Fatal: La variable de entorno DATABASE_URL no fue encontrada o inyectada por Railway.")
    sys.exit("Configuración de base de datos ausente.")

try:
    # Crear el motor SQLAlchemy con la URL obtenida
    engine = create_engine(DATABASE_URL)

    # Crear una clase SessionLocal configurada
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Crear una clase Base para nuestros modelos SQLAlchemy
    Base = declarative_base()

    # Función para obtener una sesión de base de datos
    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

except Exception as e:
    print(f"Error Fatal al crear el engine de SQLAlchemy o conectar: {e}")
    print(f"Se intentó usar la URL (segura): {log_safe_db_url}")
    sys.exit("Fallo al inicializar la conexión a la base de datos.")
