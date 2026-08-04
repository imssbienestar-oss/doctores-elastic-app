import sys
import os
import traceback

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from backend_api.database import SessionLocal
    from backend_api.models import User
    from backend_api.security import get_password_hash
except ImportError as e:
    print(f"Error importando módulos: {e}")
    sys.exit(1)

NEW_USERS_TO_ADD = [
    {"username": "admin2", "password": "Acc350"},
]

def add_new_users():
    print("Agregando usuarios nuevos...")
    db = SessionLocal()
    if not db:
        print("Error: no hay conexión a BD")
        return

    try:
        users_added = 0
        # Verificar si existe
        for user_data in NEW_USERS_TO_ADD:
            existe = db.query(User).filter(User.username == user_data["username"]).first()
            if existe:
                print(f"{user_data['username']} ya existe")
                continue
            # Crear si no existe
            print(f"Creando {user_data['username']}...")
            hashed_password = get_password_hash(user_data["password"])
            
            nuevo = User(
                username=user_data["username"], 
                hashed_password=hashed_password
            )
            db.add(nuevo)
            users_added += 1
        # Guardar cambios
        if users_added > 0:
            db.commit()
            print(f"Listo, {users_added} usuarios creados")
        else:
            print("No había nada nuevo para crear")

    except Exception as e:
        print(f"Error: {e}")
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_new_users()
