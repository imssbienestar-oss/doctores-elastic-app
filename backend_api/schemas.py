# backend_api/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Union  # <--- Importa List y Optional desde typing
from datetime import date, datetime  # Para importar el tipo date

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
    notificacion_baja: Optional[str] = None
    motivo_baja: Optional[str] = None
    fecha_extraccion: Optional[str] = None # O Optional[str] si lo cambiaste a TEXT
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
    profile_pic_url: Optional[str] = None
    tel: Optional[str] = None
    entidad_nacimiento: Optional[str] = None
    correo_electronico: Optional[str] = Field(default=None)
    

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

class DoctorAttachmentBase(BaseModel):
    file_name: str
    file_url: str
    file_type: Optional[str] = None

class DoctorAttachmentCreate(DoctorAttachmentBase):
    doctor_id: int # Necesario al crear, pero no se devuelve al leer un attachment individual

class DoctorAttachment(DoctorAttachmentBase):
    id: int
    doctor_id: int # Útil para saber a qué doctor pertenece
    uploaded_at: datetime # Para mostrar cuándo se subió

    class Config:
        from_attributes = True

class DoctorDetail(Doctor): # Hereda de Doctor (que ya tiene id y profile_pic_url)
    attachments: List[DoctorAttachment] = [] # Lista de expedientes adjuntos

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    username: str

# Schema para recibir datos al crear un usuario (si implementamos esa ruta)
# class UserCreate(UserBase):
#     password: str # Recibe la contraseña en texto plano solo al crear

# Schema para leer datos de usuario desde la DB (NO incluye la contraseña)
class User(UserBase):
    id: int
    role: str
    
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

class DataGraficaItem(BaseModel):
    label: str           # La etiqueta que se muestra en el gráfico (ej. nombre del estado, especialidad, estatus)
    value: Union[int, float] # El valor numérico (ej. conteo de doctores)


class UserBase(BaseModel):
    username: str
    role: Optional[str] = None # Hacemos role opcional aquí por si acaso

class UserAdminView(UserBase): # Lo que devolvemos al listar usuarios
    id: int
    role: str

    class Config:
        from_attributes = True # Para compatibilidad con SQLAlchemy

# Schema para recibir datos al crear un usuario desde el panel de admin
class UserCreateAdmin(BaseModel):
    username: str
    password: str # Recibimos la contraseña en texto plano
    role: str = "user" # Default a 'user', pero se puede especificar 'admin'

class UserResetPasswordPayload(BaseModel):
    new_password: str # El único campo que necesitamos es la nueva contraseña

class DoctorProfileUpdateSchema(BaseModel):
    # Información Personal
    nombre_completo: Optional[str] = Field(None, max_length=255)
    curp: Optional[str] = Field(None, max_length=18, description="CURP del doctor. Debe ser único si se provee.")
    tel: Optional[str] = Field(None, max_length=20)
    correo_electronico: Optional[str] = Field(default=None)
    fecha_nacimiento: Optional[date] = None
    sexo: Optional[str] = Field(None, max_length=20) # Cambiado para admitir 'Masculino', 'Femenino', 'Otro'
    entidad_nacimiento: Optional[str] = None
    matrimonio_id: Optional[str] = Field(None, max_length = 20)
    
    # Información Profesional y Adscripción
    especialidad: Optional[str] = Field(None, max_length=255) # Aumentado max_length
    cedula_profesional: Optional[str] = Field(None, max_length=50)
    estatus: Optional[str] = Field(None, max_length=50) # e.g., Activo, Inactivo
    nombre_unidad: Optional[str] = Field(None, max_length=100)
    consultorio: Optional[str] = Field(None, max_length=50)
    turno: Optional[str] = Field(None, max_length=50) # e.g., Matutino, Vespertino
    identificador_imss: Optional[str] = Field(None, max_length=50)
    fecha_notificacion: Optional[date] = None
    fecha_estatus: Optional[date] = None
    fecha_vuelo: Optional[date] = None
    cedula_esp: Optional[str] = Field(None, max_length=50)
    cedula_lic: Optional[str] = Field(None, max_length=50)
    nivel_atencion: Optional[str] = Field(None, max_length=50)
    entidad: Optional[str] = Field(None, max_length = 50)


    # Campo 'entidad' que aparece en tus reportes y podría ser relevante
    entidad: Optional[str] = Field(None, max_length=100, description="Entidad Federativa de adscripción")


    class Config:
        orm_mode = True 
