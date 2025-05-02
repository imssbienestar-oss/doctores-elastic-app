# backend_api/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import sys # Importar sys para salir en caso de error fatal

load_dotenv() # Cargar .env para desarrollo local (no afectará a Railway si las variables están definidas allí)

DATABASE_URL = os.getenv("DATABASE_URL") # Intentar leer la URL completa primero

# Si DATABASE_URL no está, intentar construirla desde PG* vars
if not DATABASE_URL:
    print("--- DATABASE_URL no encontrada, intentando construir desde PG* variables ---")
    pg_user = os.getenv("PGUSER")
    pg_password = os.getenv("PGPASSWORD")
    pg_host = os.getenv("PGHOST") # Debería ser 'postgres' en Railway
    pg_port = os.getenv("PGPORT", "5432") # Usar 5432 como default si no está definida
    pg_database = os.getenv("PGDATABASE")

    if all([pg_user, pg_password, pg_host, pg_database]): # Comprobar que las variables esenciales existen
        DATABASE_URL = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
        print(f"--- URL construida: postgresql://{pg_user}:******@{pg_host}:{pg_port}/{pg_database} ---")
    else:
        print("Error Fatal: Faltan variables de entorno requeridas (PGUSER, PGPASSWORD, PGHOST, PGDATABASE).")
        sys.exit("Configuración de base de datos incompleta.")

if not DATABASE_URL:
    print("Error Fatal: No se pudo obtener o construir la DATABASE_URL.")
    sys.exit("Configuración de base de datos ausente.")

# Ocultar contraseña en logs posteriores por seguridad
log_safe_db_url = DATABASE_URL
if pg_password: # O podrías re-leer os.getenv("PGPASSWORD") si fuera necesario
  log_safe_db_url = DATABASE_URL.replace(pg_password, "********")
print(f"--- Usando DATABASE_URL: {log_safe_db_url} ---")

try:
    # Crear el motor SQLAlchemy
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
    print(f"Error Fatal al crear el engine de SQLAlchemy: {e}")
    print(f"Se intentó usar la URL: {log_safe_db_url}")
    sys.exit("Fallo al inicializar la conexión a la base de datos.")