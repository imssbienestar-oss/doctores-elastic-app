# backend_api/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv 
import sys
from urllib.parse import urlparse 


dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env') 
project_root = os.path.dirname(os.path.abspath(__file__)) 
dotenv_file_path = os.path.join(project_root, '.env')

if os.path.exists(dotenv_file_path):
    load_dotenv(dotenv_path=dotenv_file_path, override=True)
else:
    print(f"DATABASE.PY: ADVERTENCIA - Archivo .env NO encontrado en: {dotenv_file_path}. Usando variables de entorno del sistema si existen.")

SQLALCHEMY_DATABASE_URL_FROM_ENV = os.getenv("DATABASE_URL")

log_safe_db_url = "Variable DATABASE_URL no interpretada o no encontrada"
if SQLALCHEMY_DATABASE_URL_FROM_ENV:
    try:
        parsed = urlparse(SQLALCHEMY_DATABASE_URL_FROM_ENV)
        password = parsed.password
        log_safe_db_url = SQLALCHEMY_DATABASE_URL_FROM_ENV.replace(f":{password}@", ":********@") if password else SQLALCHEMY_DATABASE_URL_FROM_ENV
    except Exception as parse_err:
        print(f"DATABASE.PY - Error al parsear URL para log seguro: {parse_err}")
        log_safe_db_url = "Error al parsear URL"
else:
    print("DATABASE.PY - ERROR FATAL: La variable de entorno DATABASE_URL no está configurada o es None después de intentar cargar .env.")
    sys.exit("Configuración de base de datos ausente. Revisa tu archivo .env y las variables de entorno del sistema.")

try:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL_FROM_ENV, 
        echo=False,
        pool_size=5,          # Límite de conexiones activas (El "escritorio" pequeño)
        max_overflow=10,      # Si hay tráfico extremo, permite hasta 10 extra temporales
        pool_timeout=30,      # Espera 30 seg si el pool está lleno antes de lanzar error
        pool_recycle=1800,    # Destruye y recrea las conexiones cada 30 min para limpiar la RAM
        pool_pre_ping=True    # Verifica que la conexión esté viva antes de usarla
    ) 
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

except Exception as e:
    print(f"DATABASE.PY - ERROR FATAL al crear engine de SQLAlchemy o SessionLocal: {e}")
    print(f"Se intentó usar la URL (ocultando pass): {log_safe_db_url}")
    print(f"URL original completa usada: {SQLALCHEMY_DATABASE_URL_FROM_ENV}")
    sys.exit("Fallo al inicializar la conexión a la base de datos. Revisa la URL y la disponibilidad del servidor.")
