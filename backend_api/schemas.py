# backend_api/schemas.py
from pydantic import BaseModel
from typing import List, Optional # <--- Importa List y Optional desde typing
from typing import Optional # Para campos opcionales (que pueden ser None/NULL)
from datetime import date # Para importar el tipo date

# Schema base con los campos comunes
class DoctorBase(BaseModel):
    identificador_imss: Optional[str] = None
    nombre_completo: Optional[str] = None
    estatus: Optional[str] = None
    matrimonio_id: Optional[str] = None
    curp: Optional[str] = None
    cedula_esp: Optional[str] = None
    cedula_lic: Optional[str] = None
    especialidad: Optional[str] = None
    entidad: Optional[str] = None
    clues_ssa: Optional[str] = None
    forma_notificacion_baja: Optional[str] = None
    motivo_baja: Optional[str] = None
    fecha_notificacion: Optional[date] = None # O Optional[str] si lo cambiaste a TEXT
    sexo: Optional[str] = None
    turno: Optional[str] = None
    clues_ib: Optional[str] = None
    nombre_unidad: Optional[str] = None
    municipio: Optional[str] = None
    nivel_atencion: Optional[str] = None
    fecha_estatus: Optional[date] = None # O Optional[str] si lo cambiaste a TEXT
    despliegue: Optional[str] = None
    fecha_vuelo: Optional[date] = None # O Optional[str] si lo cambiaste a TEXT
    estrato: Optional[str] = None
    acuerdo: Optional[str] = None # Lo dejo como str, ajusta si es número

    # Asegúrate de que todos los campos de tu modelo estén aquí con el tipo correcto
    # Optional[...] = None significa que el campo puede ser omitido o ser None/NULL

# Schema para leer un Doctor (incluye el ID y permite leer desde el modelo SQLAlchemy)
class Doctor(DoctorBase):
    id: int

    class Config:
       from_attributes = True # Permite que Pydantic lea datos desde modelos ORM como SQLAlchemy

# Schema para recibir datos al CREAR un nuevo doctor
class DoctorCreate(DoctorBase):
    # Si quieres que al crear un doctor todos los campos puedan venir vacíos
    # (igual que al editar), simplemente usa 'pass' para que herede todo
    # de DoctorBase.
    pass

    # Alternativa: Si quieres que ciertos campos sean OBLIGATORIOS al crear,
    # defínelos aquí SIN "Optional". Por ejemplo:
    # nombre_completo: str
    # identificador_imss: str
    # especialidad: str
    # # ... los demás podrían seguir siendo Optional heredados de DoctorBase si no los pones aquí


# --- Schemas para Usuarios y Autenticación ---


class UserBase(BaseModel):
    username: str

# Schema para recibir datos al crear un usuario (si implementamos esa ruta)
# class UserCreate(UserBase):
#     password: str # Recibe la contraseña en texto plano solo al crear

# Schema para leer datos de usuario desde la DB (NO incluye la contraseña)
class User(UserBase):
    id: int
    # is_active: bool # Descomenta si añades is_active al modelo

    class Config:
        from_attributes = True

# Schema para el token JWT que devolveremos
class Token(BaseModel):
    access_token: str
    token_type: str

# Schema para los datos contenidos dentro del token JWT
class TokenData(BaseModel):
    username: Optional[str] = None

# NUEVO: Schema para la respuesta paginada de doctores
class DoctoresPaginados(BaseModel):
    total_count: int  # Número total de doctores
    doctores: List[Doctor] # La lista de doctores para la página actual