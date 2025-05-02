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
import models
import schemas

load_dotenv() # Cargar variables de .env

# --- Configuración de Seguridad ---
# !! MUY IMPORTANTE: Genera una clave secreta fuerte y ponla en tu .env !!
# Puedes generar una con: openssl rand -hex 32
# En tu archivo .env añade: SECRET_KEY='tu_clave_generada'
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256" # Algoritmo estándar para firmar JWT
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30)) # Lee del .env o usa 30 min por defecto

if SECRET_KEY is None:
    print("Error Crítico: La variable de entorno SECRET_KEY no está definida.")
    print("Genera una con 'openssl rand -hex 32' y añádela a tu archivo .env")
    exit()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# --- Hashing de Contraseñas ---
# Configura passlib para usar bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña plana coincide con el hash guardado."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Genera el hash de una contraseña plana."""
    return pwd_context.hash(password)


# --- Creación de Tokens JWT ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un nuevo token de acceso JWT."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Usa el tiempo de expiración de la configuración
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- (Añadiremos la función para decodificar/validar tokens más tarde) ---

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Decodifica el token JWT, valida al usuario y lo devuelve.
    Se usa como dependencia en las rutas protegidas.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodifica el token usando la clave secreta y el algoritmo
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Extrae el nombre de usuario del campo 'sub' (subject) del token
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        # Crea un objeto TokenData para validación (opcional pero bueno)
        token_data = schemas.TokenData(username=username)
    except JWTError:
        # Si hay error al decodificar (token inválido, expirado, etc.)
        raise credentials_exception

    # Busca al usuario en la base de datos
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        # Si el usuario extraído del token ya no existe en la DB
        raise credentials_exception
    # Podrías añadir una comprobación de usuario activo aquí si tuvieras user.is_active
    # if not user.is_active:
    #     raise HTTPException(status_code=400, detail="Usuario inactivo")
    return user # Devuelve el objeto User de SQLAlchemy