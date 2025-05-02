# backend_api/database.py - Versión robusta leyendo PG* vars con Debug
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv # Útil para desarrollo local con .env
import sys # Para salir si hay error crítico

load_dotenv() # Cargar .env localmente si existe

DATABASE_URL = os.getenv("DATABASE_URL") # Intentar leer URL completa (será None en Railway si la borraste)

log_safe_db_url = "No configurada" # Valor inicial para logs

# Si DATABASE_URL no está (como esperamos en Railway ahora), construir desde PG*
if not DATABASE_URL:
    print("--- [INFO] DATABASE_URL no encontrada. Intentando construir desde PG* variables. ---")
    pg_user = os.getenv("PGUSER")
    pg_password = os.getenv("PGPASSWORD")
    pg_host = os.getenv("PGHOST")
    pg_port = os.getenv("PGPORT") # Necesitamos que esté definida en Railway
    pg_database = os.getenv("PGDATABASE")

    # Imprimir qué se encontró para cada variable PG*
    print(f"[DEBUG] PGUSER encontrado: {'SÍ' if pg_user else 'NO'}")
    print(f"[DEBUG] PGPASSWORD encontrado: {'SÍ' if pg_password else 'NO'}") # No imprime la contraseña
    print(f"[DEBUG] PGHOST encontrado: {'SÍ' if pg_host else 'NO'}")
    print(f"[DEBUG] PGPORT encontrado: {'SÍ' if pg_port else 'NO'}")
    print(f"[DEBUG] PGDATABASE encontrado: {'SÍ' if pg_database else 'NO'}")

    # Verificar si todas las variables necesarias tienen valor (no son None ni cadena vacía)
    required_vars = {'PGUSER': pg_user, 'PGPASSWORD': pg_password, 'PGHOST': pg_host, 'PGDATABASE': pg_database, 'PGPORT': pg_port}
    missing_vars = [k for k, v in required_vars.items() if not v] # Busca las que son None o ""

    if not missing_vars: # Si la lista de faltantes está vacía...
        try:
            # Construir la URL
            DATABASE_URL = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
            # Preparar URL segura para logs (ocultar contraseña)
            log_safe_db_url = f"postgresql://{pg_user}:********@{pg_host}:{pg_port}/{pg_database}"
            print(f"--- [INFO] URL construida desde PG* vars: {log_safe_db_url} ---")
        except Exception as e:
             print(f"[ERROR] Error construyendo DATABASE_URL desde PG* vars: {e}")
             DATABASE_URL = None # Asegurar que sea None si falla la construcción
    else:
        # Imprimir cuáles faltan específicamente
        print(f"Error Fatal: Faltan variables de entorno requeridas o están vacías: {', '.join(missing_vars)}")
        sys.exit("Configuración de base de datos incompleta (PG* vars).") # Salir

# Si después de todo, DATABASE_URL sigue sin ser válida
if not DATABASE_URL:
    print("Error Fatal: No se pudo obtener o construir la DATABASE_URL final.")
    sys.exit("Configuración de base de datos ausente.")

print(f"--- [INFO] Usando DATABASE_URL para conectar: {log_safe_db_url} ---")

try:
    # Crear el motor SQLAlchemy con la URL obtenida
    engine = create_engine(DATABASE_URL)

    # Crear una clase SessionLocal configurada
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Crear una clase Base para nuestros modelos SQLAlchemy
    Base = declarative_base()

    # Función para obtener una sesión de base de datos (igual que antes)
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

# Volvemos a intentar crear las tablas aquí
# Si las variables PG* funcionan ahora, este create_all debería funcionar también
try:
    print("--- [INFO] Intentando asegurar que las tablas existan (create_all) ---")
    Base.metadata.create_all(bind=engine)
    print("--- [INFO] Tablas aseguradas/creadas (create_all completado) ---")
except Exception as e:
    # Este error puede ocurrir si la conexión falló antes, o si las tablas ya existen
    print(f"[WARN] Error durante create_all (puede ser normal si ya existen o conexión falló antes): {e}")
    # No salimos aquí, dejamos que FastAPI intente arrancar
