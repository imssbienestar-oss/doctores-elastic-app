from pydantic import BaseModel, Field, model_validator, EmailStr
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
    fecha_aplicacion_cambio: Optional[date] = None
    despliegue: Optional[str] = Field(None, max_length=255)
    fecha_vuelo: Optional[str] = None
    estrato: Optional[str] = Field(None, max_length=100)
    acuerdo: Optional[str] = Field(None, max_length=255)
    foto_url: Optional[str] = Field(None, max_length=1024)
    correo: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=50)
    comentarios_estatus: Optional[str] = Field(None, max_length=255)
    fecha_fallecimiento: Optional[date] = None
    fecha_nacimiento: Optional[date] = None
    edad: Optional[str] = Field(None, max_length=25)
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
    coordinacion: Optional[str] = Field(None, max_length=100)
    area: Optional[str] = Field(None, max_length=255)
    cargo: Optional[str] = Field(None, max_length=255)


class UserSimple(BaseModel):
    id: int
    username: str
    
    class Config:
        from_attributes = True


class Doctor(DoctorBase):
    is_deleted: Optional[bool] = None
    deleted_at: Optional[datetime] = None
    deleted_by_user_id: Optional[int] = None
    deleted_by_username: Optional[str] = None
    
    class Config:
        from_attributes = True


class DoctorCreate(BaseModel):
    id_imss: str = Field(..., min_length=1, max_length=100)
    nombre: str = Field(..., min_length=1, max_length=255)
    apellido_paterno: str = Field(..., min_length=1, max_length=255)
    apellido_materno: str = Field(..., min_length=1, max_length=255)
    estatus: str = Field(..., min_length=1, max_length=50)
    curp: Optional[str] = Field(None, pattern=r'^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$|^$', max_length=25)
    especialidad: Optional[str] = Field(None, max_length=255)
    coordinacion: Optional[str] = Field(None, max_length=10)
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


class DoctorProfileUpdateSchema(DoctorBase):
    @model_validator(mode='after')
    def validar_fecha_fin_segun_estatus(self):
        estatus = self.estatus
        fecha_fin = self.fecha_fin
        
        requieren_fecha = [
            '02 RETIRO TEMP. (CUBA)',
            '03 RETIRO TEMP. (MEXICO)',
            '04 SOL. PERSONAL',
            '05 INCAPACIDAD'
        ]
        
        if estatus in requieren_fecha and not fecha_fin:
            raise ValueError("La fecha de fin es obligatoria para este estatus")
        
        if estatus and estatus not in requieren_fecha:
            self.fecha_fin = None
        
        return self
    
    class Config:
        from_attributes = True


class DoctorAttachmentBase(BaseModel):
    file_name: str
    file_url: str
    file_type: Optional[str] = None
    documento_tipo: str


class DoctorAttachmentCreate(DoctorAttachmentBase):
    doctor_id: str
    documento_tipo: str


class DoctorAttachment(DoctorAttachmentBase):
    id: int
    doctor_id: str
    uploaded_at: datetime
    documento_tipo: str
    
    class Config:
        from_attributes = True


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
    comentarios_estatus: Optional[str] = None


class HistorialUpdate(BaseModel):
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None


class EstatusHistoricoCreate(EstatusHistoricoBase):
    pass


class EstatusHistoricoItem(EstatusHistoricoBase):
    id: int
    nombre_unidad: Optional[str] = None
    clues: Optional[str] = None
    fecha_registro: datetime
    username: Optional[str] = None
    
    class Config:
        from_attributes = True


class DoctorDetail(Doctor):
    attachments: List[DoctorAttachment] = []
    historial: List[EstatusHistoricoItem] = []
    
    class Config:
        from_attributes = True


class UserBase(BaseModel):
    username: str = Field(..., min_length=3)
    role: str = Field(default="user", pattern=r'^(admin|user|consulta)$')


class User(UserBase):
    id: int
    
    class Config:
        from_attributes = True


class UserCreateAdmin(BaseModel):
    username: str = Field(..., min_length=3)
    role: str = Field(default="user", pattern=r'^(admin|user|consulta)$')


class UserAdminView(UserBase):
    id: int
    username: str
    role: str
    must_change_password: bool
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserResetPasswordPayload(BaseModel):
    new_password: str = Field(..., min_length=8)


class UserChangePassword(BaseModel):
    new_password: str


class DoctoresPaginados(BaseModel):
    total_count: int
    doctores: List[Doctor]


class DataGraficaItem(BaseModel):
    label: str
    value: Union[int, float]


class DesglosePersonalResponse(BaseModel):
    total_general: int
    medicos: List[DataGraficaItem]
    administrativos: List[DataGraficaItem]


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


class AuditLogBulkDeleteRequest(BaseModel):
    ids: List[int]
    pin: str


class CurpCheckResponse(BaseModel):
    exists: bool
    message: Optional[str] = None


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
    total_groups: int
    total_doctors_in_groups: int
    items: List[EstadisticaAgrupadaItem]
    
    class Config:
        from_attributes = True


class EspecialidadItem(BaseModel):
    nombre: str
    total_doctores: int
    
    class Config:
        from_attributes = True


class EspecialidadAgrupada(BaseModel):
    tipo: str
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


class DoctorDetalleItem(BaseModel):
    id_imss: str
    nombre_completo: str
    nombre_unidad: str
    especialidad: Optional[str] = "N/A"
    nivel_atencion: Optional[str] = "N/A"
    clues: str
    entidad: str
    estatus: Optional[str] = "N/A"
    
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


class ReporteDinamicoRequest(BaseModel):
    tipo: Optional[str] = "medicos"
    entidad: Optional[str] = None
    especialidad: Optional[str] = None
    nivel_atencion: Optional[str] = None
    nombre_unidad: Optional[str] = None
    search: Optional[str] = None
    estatus: Optional[str] = None
    columnas: List[str]
    mes_evaluacion: Optional[str] = None


class OpcionesFiltro(BaseModel):
    entidades: List[str]
    unidades: List[str]
    especialidades: List[str]
    niveles_atencion: List[str]
    estatus: List[str]


class EntidadCapacidad(BaseModel):
    entidad: str
    label: str
    minimo: int
    maximo: int
    actual: int


class CluesConCapacidad(BaseModel):
    clues: str
    nombre_unidad: Optional[str] = None
    entidad: Optional[str] = None
    municipio: Optional[str] = None
    direccion_unidad: Optional[str] = None
    nivel_atencion: Optional[str] = None
    tipo_establecimiento: Optional[str] = None
    subtipo_establecimiento: Optional[str] = None
    estrato: Optional[str] = None
    minimo: int
    maximo: int
    actual: int
    
    class Config:
        from_attributes = True


class AlertaVencimiento(BaseModel):
    id_imss: str
    nombre_completo: str
    estatus: str
    entidad: str
    fecha_fin: date
    
    class Config:
        from_attributes = True


class DataGraficaConCupos(BaseModel):
    label: str
    value: int
    minimo: int
    maximo: int


class SignedUrlResponse(BaseModel):
    signed_url: str


class RegistroAsistenciaPeas(BaseModel):
    id_imss: str
    tipo: str


class UsuarioAccesoBase(BaseModel):
    id_imss: Optional[str] = None
    correo: Optional[EmailStr] = None
    rol: str = Field(..., pattern="^(medico|responsable_unidad|coordinador_estatal)$")
    estatus: Optional[bool] = True
    clues: Optional[str] = None
    entidad: Optional[str] = None


class UsuarioAccesoCreate(UsuarioAccesoBase):
    password: str = Field(..., min_length=8)


class UsuarioAccesoResponse(UsuarioAccesoBase):
    id: int
    
    class Config:
        from_attributes = True