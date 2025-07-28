from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Union
from datetime import date, datetime

# --- SCHEMA DATOS DOCTOR
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
    entidad: Optional[str] = Field(None, max_length=100) 
    clues: Optional[str] = Field(None, max_length=100)
    forma_notificacion: Optional[str] = None 
    motivo_baja: Optional[str] = Field(None, max_length=100)
    fecha_extraccion: Optional[str] = Field(None, max_length=100) 
    fecha_notificacion: Optional[str] = None
    sexo: Optional[str] = Field(None, max_length=15)
    turno: Optional[str] = Field(None, max_length=50)
    nombre_unidad: Optional[str] = Field(None, max_length=255)
    municipio: Optional[str] = Field(None, max_length=100)
    nivel_atencion: Optional[str] = Field(None, max_length=50)
    fecha_estatus: Optional[date] = None
    despliegue: Optional[str] = Field(None, max_length=255)
    fecha_vuelo: Optional[date] = None
    estrato: Optional[str] = Field(None, max_length=100)
    acuerdo: Optional[str] = Field(None, max_length=255)
    foto_url: Optional[str] = Field(None, max_length=1024) 
    correo: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)
    comentarios_estatus:  Optional[str] = Field(None, max_length=255)
    fecha_fallecimiento:  Optional[date] = None
    fecha_nacimiento: Optional[date] = None
    edad: Optional[str] = Field(None, max_length=10)
    pasaporte: Optional[str] = Field(None, max_length=255)
    fecha_emision: Optional[str] = None
    fecha_expiracion: Optional[str] = None
    domicilio: Optional[str] = Field(None, max_length=255)
    licenciatura: Optional[str] = Field(None, max_length=255)
    tipo_establecimiento: Optional[str] = Field(None, max_length=255)
    subtipo_establecimiento: Optional[str] = Field(None, max_length=255)
    direccion_unidad: Optional[str] = Field(None, max_length=255)
    region: Optional[str] = Field(None, max_length=255)
    is_deleted: Optional[bool] = Field(default=False)
    deleted_at: Optional[datetime] = None
    deleted_by_user_id: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    motivo: Optional[str] = Field(None, max_length=255)
    tipo_incapacidad: Optional[str] = Field(None, max_length=255)
    entidad_nacimiento: Optional[str] = Field(None, max_length=255)
    coordinacion: Optional[str] = Field(None, max_length=100)

# --- SCHEMA DATOS USUARIO
class UserSimple(BaseModel): 
    id: int
    username: str
    class Config:
        from_attributes = True

# --- SCHEMA LEER DOCTOR
class Doctor(DoctorBase):
    is_deleted: Optional[bool] = None 
    deleted_at: Optional[datetime] = None
    deleted_by_user_id: Optional[int] = None 
    deleted_by_username: Optional[str] = None 
    class Config:
        from_attributes = True

# --- SCHEMA CREAR DOCTOR
class DoctorCreate(BaseModel): 
    id_imss: str = Field(..., min_length=1, max_length=100)
    nombre: str = Field(..., min_length=1, max_length=255)
    apellido_paterno: str = Field(..., min_length=1, max_length=255)
    apellido_materno: str = Field(..., min_length=1, max_length=255)
    estatus: str = Field(..., min_length=1, max_length=50)
    curp: Optional[str] = Field(None, pattern=r'^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$|^$', max_length=25)
    especialidad: str = Field(..., min_length=1, max_length=255)
    turno: Optional[str] = None 
    fecha_estatus: Optional[date] = None
    clues: Optional[str] = None
    nombre_unidad: Optional[str] = None
    nivel_atencion: Optional[str] = None
    estrato: Optional[str] = None
    tipo_establecimiento: Optional[str] = None
    subtipo_establecimiento: Optional[str] = None
    entidad: Optional[str] = None
    municipio: Optional[str] = None
    direccion_unidad: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    sexo: Optional[str] = None
    edad: Optional[int] = None

# --- SCHEMA ACTUALIZA EXPEDIENTE
class DoctorProfileUpdateSchema(DoctorBase): 
    pass 

    class Config:
        from_attributes = True

# --- SCHEMA DOCUMENTOS ADJUNTOS
class DoctorAttachmentBase(BaseModel):
    file_name: str
    file_url: str 
    file_type: Optional[str] = None

# --- SCHEMA SUBIR DOCUMENTO
class DoctorAttachmentCreate(DoctorAttachmentBase):
    doctor_id: str
    pass

# --- SCHEMA REGISTRAR DOCUMENTO
class DoctorAttachment(DoctorAttachmentBase):
    id: int
    doctor_id: str 
    uploaded_at: datetime

    class Config:
        from_attributes = True

# --- SCHEMA ESTATUS HISTORICO
class EstatusHistoricoBase(BaseModel):
    tipo_cambio: str
    estatus: str
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    clues: Optional[str] = None
    entidad: Optional[str] = None
    nombre_unidad: Optional[str] = None
    turno: Optional[str] = None
    comentarios: Optional[str] = None

# --- SCHEMA ESTATUS HISTORICO MANUAL
class EstatusHistoricoCreate(EstatusHistoricoBase):
    pass

# --- SCHEMA ESTATUS HISTORICO AUTOMATICO
class EstatusHistoricoItem(EstatusHistoricoBase):
    id: int
    nombre_unidad: Optional[str] = None
    clues: Optional[str] = None
    fecha_registro: datetime
    class Config:
        from_attributes = True
        
# --- SCHEMA DETALLES REGISTRO
class DoctorDetail(Doctor): 
    attachments: List[DoctorAttachment] = []
    historial: List[EstatusHistoricoItem] = []
    class Config:
        from_attributes = True

# --- SCHEMA AUTENTICACION
class UserBase(BaseModel): 
    username: str = Field(..., min_length=3)
    role: str = Field(default="user", pattern=r'^(admin|user|consulta)$') 

# --- SCHEMA USUARIOS BD
class User(UserBase): 
    id: int
    class Config:
        from_attributes = True

# --- SCHEMA CREAR USUARIOS
class UserCreateAdmin(BaseModel): 
    username: str = Field(..., min_length=3)
    role: str = Field(default="user", pattern=r'^(admin|user|consulta)$')

# --- SCHEMA VISUALIZAR 
class UserAdminView(UserBase): 
    id: int
    username: str
    role: str
    must_change_password: bool 

    class Config:
        orm_mode = True

# --- SCHEMA TOKEN AUTENTICACION
class Token(BaseModel):
    access_token: str
    token_type: str

# --- SCHEMA TOKEN
class TokenData(BaseModel):
    username: Optional[str] = None

# --- SCHEMA ACTUALIZAR CONTRASEÑA
class UserResetPasswordPayload(BaseModel):
    new_password: str = Field(..., min_length=8)

# --- SCHEMA PAGINACION
class DoctoresPaginados(BaseModel):
    total_count: int
    doctores: List[Doctor]

# --- SCHEMA GRAFICAS
class DataGraficaItem(BaseModel):
    label: str
    value: Union[int, float]

# --- SCHEMA PARA AUDITLOG ---
class AuditLogBase(BaseModel):
    timestamp: datetime
    username: Optional[str] = None
    action_type: str
    target_entity: Optional[str] = None
    target_id_str: Optional[str] = None
    details: Optional[str] = None

# --- SCHEMA PARA AUDITLOG VER
class AuditLogView(AuditLogBase):
    id: int
    class Config:
        from_attributes = True

class AuditLogsPaginados(BaseModel):
    total_count: int
    audit_logs: List[AuditLogView]

class AuditLogBulkDeleteRequest(BaseModel): 
    ids: List[int]
    pin: str 

class CurpCheckResponse(BaseModel): 
    exists: bool
    message: Optional[str] = None

# --- SCHEMA ESTADISTICA
class EstadisticaAgrupadaItem(BaseModel):
    entidad: Optional[str] = "N/A"
    nombre_unidad: str
    clues: str 
    especialidad: Optional[str] = "N/A"
    nivel_atencion: Optional[str] = "N/A"
    cantidad: int

    class Config:
        from_attributes = True 


class EstadisticaPaginada(BaseModel):
    total_groups: int # Para la paginación de la tabla de grupos
    total_doctors_in_groups: int # Suma de 'cantidad' de todos los grupos filtrado
    items: List[EstadisticaAgrupadaItem]
    
    class Config: # Añadir Config si no la tiene, aunque para este schema simple puede no ser estrictamente necesaria
        from_attributes = True

# --- SCHEMA ESPECIALIDAD
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
    id_imss: str 
    nombre_completo: str
    nombre_unidad: str
    especialidad: Optional[str] = "N/A"
    nivel_atencion: Optional[str] = "N/A"
    clues: str
    entidad: str

    class Config:
        from_attributes = True

class CluesData(BaseModel):
    clues: str
    nombre_unidad: Optional[str] = None
    nivel_atencion: Optional[str] = None
    estrato: Optional[str] = None
    tipo_establecimiento: Optional[str] = None
    subtipo_establecimiento: Optional[str] = None
    entidad: Optional[str] = None
    municipio: Optional[str] = None
    codigo_postal: Optional[str] = None
    direccion_unidad: Optional[str] = None

    class Config:
        from_attributes = True

#ACTUALIZAR EN GITHUB
class ReporteDinamicoRequest(BaseModel):
    entidad: Optional[str] = None
    especialidad: Optional[str] = None
    nivel_atencion: Optional[str] = None
    nombre_unidad: Optional[str] = None
    
    columnas: List[str]

class OpcionesFiltro(BaseModel):
    entidades: List[str] 
    unidades: List[str]
    especialidades: List[str]
    niveles_atencion: List[str]
