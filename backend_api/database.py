# backend_api/database.py - DEBUG EXTENDIDO
import os
from dotenv import load_dotenv
import sys

load_dotenv()

print("--- [DEBUG INICIO] Verificando variables de entorno ---")

db_url_value = os.getenv("DATABASE_URL")
secret_key_value = os.getenv("SECRET_KEY")
token_minutes_value = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")

# Verificar DATABASE_URL
if db_url_value:
    print(f"[DEBUG] DATABASE_URL raw value: {db_url_value}")
else:
    print("[DEBUG] ERROR: DATABASE_URL environment variable NOT FOUND or EMPTY.")

# Verificar SECRET_KEY
if secret_key_value:
    # No imprimir el valor de la clave secreta, solo si existe
    print(f"[DEBUG] SECRET_KEY found: YES (length {len(secret_key_value)})")
else:
    print("[DEBUG] ERROR: SECRET_KEY environment variable NOT FOUND or EMPTY.")

# Verificar ACCESS_TOKEN_EXPIRE_MINUTES
if token_minutes_value:
    print(f"[DEBUG] ACCESS_TOKEN_EXPIRE_MINUTES found: {token_minutes_value}")
else:
    print("[DEBUG] ERROR: ACCESS_TOKEN_EXPIRE_MINUTES environment variable NOT FOUND or EMPTY.")


print("--- [DEBUG FIN] Saliendo del script de depuración ---")
sys.exit(1) # Salir para que el despliegue falle aquí

# --- Código original inaccesible ---
