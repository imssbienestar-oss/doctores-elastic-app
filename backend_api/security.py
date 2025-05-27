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
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

if SECRET_KEY is None:
    print("Error Crítico: La variable de entorno SECRET_KEY no está definida.")
    print("Genera una con 'openssl rand -hex 32' y añádela a tu archivo .env")
    # Considera usar 'raise EnvironmentError("SECRET_KEY no definida")' en lugar de exit()
    # para que FastAPI pueda manejarlo mejor si se ejecuta en un contexto de servidor.
    exit()

# Esquema OAuth2 para rutas que REQUIEREN autenticación
oauth2_scheme_strict = OAuth2PasswordBearer(tokenUrl="/api/token")

# NUEVO: Esquema OAuth2 para rutas donde la autenticación es OPCIONAL (invitados)
# auto_error=False significa que si no se provee el token, la dependencia recibirá 'None'
# en lugar de lanzar un error 401 automáticamente.
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/token", auto_error=False)


# --- Hashing de Contraseñas ---
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
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Dependencia para obtener el usuario actual (autenticación REQUERIDA) ---
async def get_current_user(token: str = Depends(oauth2_scheme_strict), db: Session = Depends(get_db)):
    """
    Decodifica el token JWT, valida al usuario y lo devuelve.
    Se usa como dependencia en las rutas protegidas que requieren autenticación.
    """
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
        token_data = schemas.TokenData(username=username) # Asumiendo que schemas.TokenData existe
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == token_data.username).first() # Asumiendo models.User
    if user is None:
        raise credentials_exception
    # Aquí podrías añadir comprobaciones como user.is_active si es necesario
    # if not user.is_active:
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario inactivo")
    return user

# --- NUEVA: Dependencia para obtener el usuario actual (autenticación OPCIONAL) ---
async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme_optional), # Usa el esquema opcional
    db: Session = Depends(get_db)
) -> Optional[models.User]: # El tipo de retorno es Optional[models.User]
    """
    Decodifica el token JWT si se proporciona y devuelve el usuario.
    Si no se proporciona token o es inválido, devuelve None (invitado).
    Se usa para rutas que pueden ser accedidas por invitados o usuarios autenticados.
    """
    if not token:
        # No se proporcionó token, el usuario es un invitado
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            # Token proporcionado pero malformado (sin 'sub')
            return None # Tratar como invitado, no lanzar error
        token_data = schemas.TokenData(username=username)
    except JWTError:
        # Token inválido (expirado, firma incorrecta, etc.)
        return None # Tratar como invitado, no lanzar error

    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    # Si el usuario existe en la BD, devuélvelo.
    # Si el token era válido pero el usuario ya no existe, devuelve None (como invitado).
    # Aquí también podrías añadir user.is_active si es relevante y no quieres que un usuario
    # inactivo, incluso con token válido, acceda. Pero para "opcional", None es lo más simple.
    return user

async def get_current_admin_user(current_user: models.User = Depends(get_current_user)): # Llama a tu get_current_user
    if not current_user or current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tiene permisos de administrador para acceder a este recurso."
        )
    return current_user
