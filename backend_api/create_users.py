# backend_api/create_users.py
import sys
import os

# Añadir el directorio padre al path para poder importar módulos del backend
# Esto es necesario si ejecutas este script directamente
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend_api.database import SessionLocal, engine # Asegúrate que la ruta sea correcta
from backend_api.models import User, Base # Asegúrate que la ruta sea correcta
from backend_api.security import get_password_hash # Asegúrate que la ruta sea correcta

# --- Define aquí tus 4 usuarios ---
INITIAL_USERS = [
    {"username": "admin", "password": "admin"},
    {"username": "usuario2", "password": "password_usuario2"},
    {"username": "usuario3", "password": "password_usuario3"},
    {"username": "usuario4", "password": "password_usuario4"},
    # Cambia estos nombres de usuario y contraseñas por los reales que necesites
]

def create_initial_users():
    db = SessionLocal()
    try:
        print("Creando tablas si no existen...")
        # Asegurarse de que la tabla users exista
        Base.metadata.create_all(bind=engine)
        print("Tablas listas.")

        print("Creando usuarios iniciales...")
        user_count = 0
        for user_data in INITIAL_USERS:
            # Verificar si el usuario ya existe
            db_user = db.query(User).filter(User.username == user_data["username"]).first()
            if db_user:
                print(f"Usuario '{user_data['username']}' ya existe, saltando.")
                continue

            # Hashear la contraseña
            hashed_password = get_password_hash(user_data["password"])
            # Crear el nuevo usuario
            new_user = User(username=user_data["username"], hashed_password=hashed_password)
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            print(f"Usuario '{user_data['username']}' creado con ID: {new_user.id}")
            user_count += 1
        print(f"Se crearon {user_count} usuarios nuevos.")

    except Exception as e:
        print(f"Error durante la creación de usuarios: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("--- Iniciando script para crear usuarios iniciales ---")
    create_initial_users()
    print("--- Script finalizado ---")