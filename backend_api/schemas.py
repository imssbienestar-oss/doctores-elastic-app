from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Union
from datetime import date, datetime

class DoctorBase(BaseModel):
    id_imss: str = Field(..., max_length=100)
    nombre: Optional[str] = Field(None, max_length=255)
    apellido_paterno: Optional[str] = Field(None, max_length=255)
    apellido_materno: Optional[str] = Field(None, max_length=255)
    estatus: Optional[str] = Field(None, max_length=50)
    matrimonio_id: Optional[str] = Field(None, max_length=100)
    curp: Optional[str] = Field(None, max_length=50) 
    cedula_esp: Optional[str] = Field(None, max_length=100)
    cedula_lic: Optional[str] = Field(None, max_length=100)
    especialidad: Optional[str] = Field(None, max_length=255)
    entidad: Optional[str] = Field(None, max_length=100) # Entidad de adscripción
    clues: Optional[str] = Field(None, max_length=100)
    forma_notificacion: Optional[str] = None # Podría ser TEXT
    motivo_baja: Optional[str] = Field(None, max_length=100)
    fecha_extraccion: Optional[str] = Field(None, max_length=100) # Mantener como str si así se usa
    fecha_notificacion: Optional[date] = None
    sexo: Optional[str] = Field(None, max_length=20)
    turno: Optional[str] = Field(None, max_length=50)
    nombre_unidad: Optional[str] = Field(None, max_length=255)
    municipio: Optional[str] = Field(None, max_length=100)
    nivel_atencion: Optional[str] = Field(None, max_length=50)
    fecha_estatus: Optional[date] = None
    despliegue: Optional[str] = Field(None, max_length=255)
    fecha_vuelo: Optional[date] = None
    estrato: Optional[str] = Field(None, max_length=100)
    acuerdo: Optional[str] = Field(None, max_length=255)
    foto_url: Optional[str] = Field(None, max_length=1024) # URLs pueden ser largas
    correo: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)
    comentarios_estatus:  Optional[str] = Field(None, max_length=255)
    fecha_fallecimiento:  Optional[date] = None
    fecha_nacimiento: Optional[date] = None
    edad: Optional[str] = Field(None, max_length=10)
    pasaporte: Optional[str] = Field(None, max_length=255)
    fecha_emision: Optional[date] = None
    fecha_expiracion: Optional[date] = None
    domicilio: Optional[str] = Field(None, max_length=255)
    licenciatura: Optional[str] = Field(None, max_length=255)
    institucion_lic: Optional[str] = Field(None, max_length=255)
    institucion_esp: Optional[str] = Field(None, max_length=255)
    fecha_egreso_lic:  Optional[date] = None
    fecha_egreso_esp: Optional[date] = None
    tipo_establecimiento: Optional[str] = Field(None, max_length=255)
    subtipo_establecimiento: Optional[str] = Field(None, max_length=255)
    direccion_unidad: Optional[str] = Field(None, max_length=255)
    region: Optional[str] = Field(None, max_length=255)
    # Campos para soft delete (opcionales en la base, pero útiles en el schema)
    is_deleted: Optional[bool] = Field(default=False)
    deleted_at: Optional[datetime] = None
    deleted_by_user_id: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    motivo: Optional[str] = Field(None, max_length=255)
    tipo_incapacidad: Optional[str] = Field(None, max_length=255)
    entidad_nacimiento: Optional[str] = Field(None, max_length=255)
    coordinacion: Optional[str] = Field(None, max_length=100)

class UserSimple(BaseModel): # Un schema simple para el usuario
    id: int
    username: str
    class Config:
        from_attributes = True

# Schema para leer un Doctor (incluye el ID y otros campos del modelo)
class Doctor(DoctorBase):
    is_deleted: Optional[bool] = None # Es bueno tenerlo para esta vista
    deleted_at: Optional[datetime] = None
    deleted_by_user_id: Optional[int] = None # Puedes mantener el ID si quieres
    deleted_by_username: Optional[str] = None # <--- NUEVO CAMPO PARA EL NOMBRE

    class Config:
        from_attributes = True


# Schema para recibir datos al CREAR un nuevo doctor (solo los campos iniciales del modal)
class DoctorCreate(BaseModel): # No hereda de DoctorBase para ser explícito con los campos requeridos
    id_imss: str = Field(..., min_length=1, max_length=100) # ID es requerido al crear
    nombre: str = Field(..., min_length=1, max_length=255)
    apellido_paterno: str = Field(..., min_length=1, max_length=255)
    apellido_materno: str = Field(..., min_length=1, max_length=255)
    estatus: str = Field(..., min_length=1, max_length=50)
    curp: Optional[str] = Field(None, pattern=r'^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$|^$', max_length=25)
    especialidad: str = Field(..., min_length=1, max_length=255)
    entidad: str = Field(..., min_length=1, max_length=100) # Entidad de adscripción inicial
    fecha_nacimiento: Optional[date] = None # Se calcula desde CURP, se envía opcionalmente


# Schema para actualizar el perfil completo del doctor
class DoctorProfileUpdateSchema(DoctorBase): # Hereda de DoctorBase, todos los campos son opcionales
    pass # No es necesario redefinir los campos si son los mismos que en DoctorBase

    class Config:
        from_attributes = True

# --- Schemas para Doctor Attachments ---
class DoctorAttachmentBase(BaseModel):
    file_name: str
    file_url: str # Debería ser HttpUrl si quieres validación de Pydantic
    file_type: Optional[str] = None

class DoctorAttachmentCreate(DoctorAttachmentBase):
    doctor_id: str
    pass

class DoctorAttachment(DoctorAttachmentBase):
    id: int
    doctor_id: str 
    uploaded_at: datetime

    class Config:
        from_attributes = True

# Schema para DoctorDetail que incluye attachments
class DoctorDetail(Doctor): 
    attachments: List[DoctorAttachment] = []
    class Config:
        from_attributes = True

# --- Schemas para Usuarios y Autenticación ---
class UserBase(BaseModel): # Definición única y consolidada
    username: str = Field(..., min_length=3)
    role: str = Field(default="user", pattern=r'^(admin|user|consulta)$') # Rol con default y patrón

class User(UserBase): # Schema para leer User desde la DB
    id: int
    class Config:
        from_attributes = True

class UserCreateAdmin(BaseModel): # Schema para crear usuario desde panel admin
    username: str = Field(..., min_length=3)
    role: str = Field(default="user", pattern=r'^(admin|user|consulta)$')

class UserAdminView(UserBase): 
    id: int
    username: str
    role: str
    must_change_password: bool # <-- NUEVO

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserResetPasswordPayload(BaseModel):
    new_password: str = Field(..., min_length=8)

# --- Schemas para Paginación y Gráficas ---
class DoctoresPaginados(BaseModel):
    total_count: int
    doctores: List[Doctor]

class DataGraficaItem(BaseModel):
    label: str
    value: Union[int, float]

# --- Schemas para AuditLog ---
class AuditLogBase(BaseModel):
    timestamp: datetime
    username: Optional[str] = None
    action_type: str
    target_entity: Optional[str] = None
    target_id_str: Optional[str] = None
    details: Optional[str] = None

class AuditLogView(AuditLogBase):
    id: int
    class Config:
        from_attributes = True

class AuditLogsPaginados(BaseModel):
    total_count: int
    audit_logs: List[AuditLogView]

class AuditLogBulkDeleteRequest(BaseModel): # CORREGIDO: Hereda de BaseModel
    ids: List[int]
    pin: str # El PIN de confirmación

class CurpCheckResponse(BaseModel): # Para la verificación de CURP
    exists: bool
    message: Optional[str] = None

# --- NUEVO SCHEMA PARA LA TABLA DE ESTADÍSTICA AGRUPADA ---
class EstadisticaAgrupadaItem(BaseModel):
    entidad: Optional[str] = "N/A" # Permitir que sea None y darle un default para Pydantic
    especialidad: Optional[str] = "N/A"
    nivel_atencion: Optional[str] = "N/A"
    cantidad: int

    class Config:
        from_attributes = True # Para que funcione con los resultados de SQLAlchemy si son tuplas nombradas o similares
# --- FIN NUEVO SCHEMA ---
class EstadisticaPaginada(BaseModel): # <--- ASEGÚRATE DE QUE ESTA CLASE ESTÉ DEFINIDA
    total_groups: int # Para la paginación de la tabla de grupos
    total_doctors_in_groups: int # Suma de 'cantidad' de todos los grupos filtrado
    items: List[EstadisticaAgrupadaItem]
    
    class Config: # Añadir Config si no la tiene, aunque para este schema simple puede no ser estrictamente necesaria
        from_attributes = True
# --- FIN SCHEMAS DE ESTADÍSTICA ---
class EspecialidadItem(BaseModel):
    nombre: str
    total_doctores: int

    class Config:
        from_attributes = True

class EspecialidadAgrupada(BaseModel):
    tipo: str  # BASICAS, QUIRURGICAS, MEDICAS
    especialidades: List[EspecialidadItem]
    total: int

    class Config:
        from_attributes = True

class NivelAtencionItem(BaseModel):
    nivel_atencion: str
    total_doctores: int

    class Config:
        from_attributes = True

class CedulasCount(BaseModel):
    con_licenciatura: int
    sin_licenciatura: int
    con_especialidad: int
    sin_especialidad: int
    total_doctores: int

    class Config:
        from_attributes = True   

class DoctorPermanentDeleteRequest(BaseModel):
     ids: List[str]
     pin: str
     
class UserChangePassword(BaseModel):
    new_password: str

class DoctorDetalleItem(BaseModel):
    id_imss: str  # O el ID que uses para ir al perfil
    nombre_completo: str
    especialidad: Optional[str] = "N/A"
    nivel_atencion: Optional[str] = "N/A"
    entidad: str

    class Config:
        from_attributes = True
