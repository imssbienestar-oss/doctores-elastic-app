# backend_api/create_users.py (Versión que incluye create_all)
import sys
import os
import traceback # Para imprimir errores completos

# --- BORRA O COMENTA ESTA LÍNEA si ejecutas desde la carpeta padre ---
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# --- FIN BORRADO ---

try:
    print("--- Intentando Imports (ejecuta desde la carpeta padre con: py backend_api/create_users.py) ---")
    # Importar Base, engine, SessionLocal desde database
    # Asegúrate que estos módulos internos usen imports relativos (.) para encontrarse entre sí
    from backend_api.database import SessionLocal, engine, Base
    # Importar los modelos User y Doctor explícitamente para asegurar registro en Base.metadata
    from backend_api.models import User, Doctor
    # Importar la función de hash
    from backend_api.security import get_password_hash
    print("--- Imports correctos ---")
except ImportError as e:
    print(f"FATAL: Error de importación: {e}.")
    print("Asegúrate de ejecutar este script desde la carpeta PADRE (ej: C:\\CUSeN\\CUBANOS\\)")
    print("Usando el comando: py backend_api\\create_users.py") # Ojo con la barra en Windows
    sys.exit(1)

# --- Define aquí tus 4 usuarios REALES ---
INITIAL_USERS = [
    {"username": "admin", "password": "admin"}, # ¡¡CAMBIA ESTA CONTRASEÑA POR UNA SEGURA!!
    {"username": "usuario2", "password": "password_segura_2"}, # Cambia esto
    {"username": "usuario3", "password": "password_segura_3"}, # Cambia esto
    {"username": "usuario4", "password": "password_segura_4"}, # Cambia esto
]

def create_initial_users():
    # Asegurar que las tablas existan ANTES de intentar operaciones
    # La opción extend_existing=True en models.py debe manejar si ya existen
    print("--- Asegurando que las tablas existan (create_all) ---")
    try:
        Base.metadata.create_all(bind=engine) # <-- IMPORTANTE: Crear tablas si no existen
        print("--- Tablas verificadas/creadas por create_all ---")
    except Exception as create_all_error:
        print(f"!!! ERROR durante Base.metadata.create_all: {create_all_error} !!!")
        traceback.print_exc()
        # Si falla aquí, probablemente no podamos continuar
        print("Saliendo debido a error en create_all.")
        return # Salir de la función si no se pueden crear/verificar tablas


    print("--- Conectando a la base de datos para crear/verificar usuarios ---")
    db = SessionLocal()
    if not db:
        print("Error fatal: No se pudo obtener sesión de base de datos desde SessionLocal.")
        return

    try:
        print("--- Creando/Verificando usuarios iniciales ---")
        user_count = 0
        users_to_add = [] # Lista para añadir en batch

        for user_data in INITIAL_USERS:
            try:
                # 1. Verificar si el usuario ya existe
                print(f"Verificando usuario: '{user_data['username']}'...")
                db_user = db.query(User).filter(User.username == user_data["username"]).first()
                if db_user:
                    print(f"Usuario '{user_data['username']}' ya existe.")
                    continue # Pasar al siguiente usuario

                # 2. Si no existe, preparar para añadir
                print(f"Usuario '{user_data['username']}' no encontrado, preparando para añadir...")
                if not user_data.get("password"):
                    print(f"ERROR: Contraseña vacía para usuario '{user_data['username']}'. Saltando.")
                    continue
                hashed_password = get_password_hash(user_data["password"])
                new_user = User(username=user_data["username"], hashed_password=hashed_password)
                users_to_add.append(new_user) # Añadir a la lista temporal
                user_count += 1

            except Exception as loop_error:
                 print(f"Error procesando datos para usuario '{user_data['username']}': {loop_error}")
                 traceback.print_exc()
                 print("Saltando este usuario debido a error.")
                 db.rollback()
                 continue

        # 3. Añadir todos los usuarios nuevos a la sesión fuera del bucle
        if users_to_add:
            print(f"Añadiendo {len(users_to_add)} usuarios nuevos a la sesión...")
            db.add_all(users_to_add)
            # 4. Hacer commit UNA SOLA VEZ al final para todos los nuevos usuarios
            print("Realizando commit final para usuarios añadidos...")
            db.commit()
            print(f"Commit exitoso. Se crearon {user_count} usuarios nuevos.")
        else:
            print("No se añadieron usuarios nuevos (todos existían o hubo errores).")


    except Exception as e:
        print(f"Error general durante la creación/verificación de usuarios: {e}")
        traceback.print_exc()
        db.rollback()
    finally:
        print("--- Cerrando conexión de base de datos ---")
        db.close()

if __name__ == "__main__":
    print("--- Iniciando script para crear usuarios iniciales ---")
    create_initial_users()
    print("--- Script finalizado ---")
