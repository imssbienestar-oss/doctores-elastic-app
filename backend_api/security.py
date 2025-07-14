# backend_api/security.py
import os
from datetime import datetime, timedelta, timezone # Asegúrate de importar timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db # Importa la función para obtener sesión de DB
import models # El punto indica una importación desde el mismo paquete (backend_api)
import schemas # Asegúrate que tus esquemas Pydantic estén aquí (ej. schemas.TokenData)

load_dotenv() # Cargar variables de .env

# --- Configuración de Seguridad ---
SECRET_KEY = os.getenv("SECRET_KEY", "tu_clave_secreta_por_defecto_si_no_esta_en_env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 43200))

if not SECRET_KEY or SECRET_KEY == "tu_clave_secreta_por_defecto_si_no_esta_en_env":
    # Es mejor advertir si se usa la clave por defecto en lugar de salir
    print("ADVERTENCIA: SECRET_KEY no está definida en .env o es la de por defecto. Usando una clave insegura.")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Definimos UN SOLO esquema de autenticación que se usará en todas partes
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# --- Hashing y Verificación de Contraseñas ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- Creación de Tokens JWT ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire_time = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire_time})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Dependencia para obtener el usuario actual (ESTA ES LA QUE NECESITAS) ---
async def get_current_user(
    token: str = Depends(oauth2_scheme), # Usa el oauth2_scheme que SÍ definiste
    db: Session = Depends(get_db) # Asegúrate que el nombre de la función coincida
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Busca al usuario directamente con el username del token
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
        
    return user

# --- Dependencia para obtener un usuario Administrador ---
# Esta función depende de la anterior (get_current_user)
async def get_current_admin_user(current_user: models.User = Depends(get_current_user)):
    if not current_user or current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tiene permisos de administrador."
        )
    return current_user
