# backend_api/database.py - Versión Funcional Limpia
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import sys
from urllib.parse import urlparse # Para ocultar pass en log

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error Fatal: La variable de entorno DATABASE_URL no está definida.")
    sys.exit("Configuración de base de datos ausente.")

# Intentar ocultar contraseña para el log
log_safe_db_url = DATABASE_URL
try:
    parsed = urlparse(DATABASE_URL)
    if parsed.password:
        log_safe_db_url = DATABASE_URL.replace(f":{parsed.password}@", ":********@")
except:
    log_safe_db_url = "No se pudo parsear URL para ocultar contraseña"
print(f"--- [INFO] Usando DATABASE_URL: {log_safe_db_url} ---")

try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

except Exception as e:
    print(f"Error Fatal al crear el engine de SQLAlchemy: {e}")
    print(f"Se intentó usar la URL (segura): {log_safe_db_url}")
    sys.exit("Fallo al inicializar la conexión a la base de datos.")

# Asegurar creación de tablas (mantener esto)
try:
    print("--- [INFO] Intentando asegurar que las tablas existan (create_all) ---")
    # Aquí podrías querer importar 'Base' desde models si no está disponible globalmente
    # from models import Base # Descomentar si Base no está definida aquí
    Base.metadata.create_all(bind=engine)
    print("--- [INFO] Tablas aseguradas/creadas (create_all completado) ---")
except Exception as e:
    print(f"[WARN] Error durante create_all: {e}")
