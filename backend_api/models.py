from sqlalchemy import Column, Integer, String, Date, Text, DateTime, Boolean, ForeignKey, UniqueConstraint, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class Doctor(Base):
    __tablename__ = "doctores"

    id_imss = Column(String, primary_key=True, index=True)
    nombre = Column(String(255))
    apellido_paterno = Column(String(100), nullable=True)
    apellido_materno = Column(String(100), nullable=True)
    estatus = Column(String(50))
    matrimonio_id = Column(String(100), nullable=True)
    curp = Column(String(20), index=True, nullable=True)
    cedula_esp = Column(String(100), nullable=True)
    cedula_lic = Column(String(100), nullable=True)
    especialidad = Column(String(255), nullable=True)
    entidad = Column(String(100), nullable=True)
    clues = Column(String(100), nullable=True)
    forma_notificacion = Column(Text, nullable=True)
    motivo_baja = Column(String(100), nullable=True)
    fecha_extraccion = Column(String(100), nullable=True)
    fecha_notificacion = Column(String, nullable=True)
    sexo = Column(String(15), nullable=True)
    turno = Column(String(50), nullable=True)
    nombre_unidad = Column(String(255), nullable=True)
    municipio = Column(String(100), nullable=True)
    nivel_atencion = Column(String(50), nullable=True)
    fecha_estatus = Column(Date, nullable=True)
    fecha_aplicacion_cambio = Column(Date, nullable=True)
    despliegue = Column(String(255), nullable=True)
    fecha_vuelo = Column(String, nullable=True)
    estrato = Column(String(100), nullable=True)
    acuerdo = Column(String(255), nullable=True)
    foto_url = Column(String(1024), nullable=True, index=True)
    correo = Column(String(100), nullable=True)
    telefono = Column(String(255), nullable=True)
    edad = Column(String(25), nullable=True)
    comentarios_estatus = Column(Text, nullable=True)
    fecha_fallecimiento = Column(Date, nullable=True)
    fecha_nacimiento = Column(Date, nullable=True)
    pasaporte = Column(String(50), nullable=True)
    fecha_emision = Column(String, nullable=True)
    fecha_expiracion = Column(String, nullable=True)
    domicilio = Column(Text, nullable=True)
    licenciatura = Column(String(255), nullable=True)
    tipo_establecimiento = Column(String(100), nullable=True)
    subtipo_establecimiento = Column(String(100), nullable=True)
    direccion_unidad = Column(String(500), nullable=True)
    region = Column(String(100), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by_user_id = Column(Integer, ForeignKey("users.id", name="fk_doctor_deleted_by_user"), nullable=True)
    fecha_inicio = Column(Date, nullable=True)
    fecha_fin = Column(Date, nullable=True)
    motivo = Column(String(255), nullable=True)
    tipo_incapacidad = Column(String(255), nullable=True)
    coordinacion = Column(String(100), nullable=True)
    area = Column(String(255), nullable=True)
    cargo = Column(String(255), nullable=True)
    
    deleted_by = relationship("User", foreign_keys=[deleted_by_user_id], back_populates="doctores_eliminados")
    attachments = relationship("DoctorAttachment", back_populates="doctor", cascade="all, delete-orphan")
    historial = relationship("EstatusHistorico", back_populates="doctor", cascade="all, delete-orphan")
    
    __table_args__ = {'extend_existing': True}


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String, default="admin")
    must_change_password = Column(Boolean, default=True)

    audit_logs = relationship("AuditLog", back_populates="user")
    doctores_eliminados = relationship("Doctor", foreign_keys="[Doctor.deleted_by_user_id]", back_populates="deleted_by")
    
    __table_args__ = {'extend_existing': True}


class DoctorAttachment(Base):
    __tablename__ = "doctor_attachments"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(String, ForeignKey("doctores.id_imss", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), index=True, nullable=False)
    file_url = Column(String(1024), nullable=False, unique=True)
    file_type = Column(String(100), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    documento_tipo = Column(String(100), nullable=False)
    
    doctor = relationship("Doctor", back_populates="attachments")
    
    __table_args__ = (
        UniqueConstraint('doctor_id', 'documento_tipo', name='_doctor_documento_tipo_uc'),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(100), nullable=True)
    action_type = Column(String(100), nullable=False, index=True)
    target_entity = Column(String(100), nullable=True, index=True)
    target_id = Column(Integer, nullable=True, index=True)
    target_id_str = Column(String(100), nullable=True, index=True)
    details = Column(Text, nullable=True)
    
    user = relationship("User", foreign_keys=[user_id], back_populates="audit_logs")
    
    __table_args__ = {'extend_existing': True}


class CatalogoClues(Base):
    __tablename__ = "clues_catalogo"

    clues = Column(String, primary_key=True, index=True)
    nombre_unidad = Column(String, nullable=True)
    nivel_atencion = Column(String, nullable=True)
    estrato = Column(String, nullable=True)
    tipo_establecimiento = Column(String, nullable=True)
    subtipo_establecimiento = Column(String, nullable=True)
    entidad = Column(String, nullable=True)
    municipio = Column(String, nullable=True)
    codigo_postal = Column(String, nullable=True)
    direccion_unidad = Column(String, nullable=True)


class EstatusHistorico(Base):
    __tablename__ = "estatus_historico"

    id = Column(Integer, primary_key=True, index=True)
    id_imss = Column(String, ForeignKey("doctores.id_imss"), nullable=False, index=True)
    tipo_cambio = Column(String, nullable=False)
    estatus = Column(String, nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=True)
    clues = Column(String, nullable=True)
    entidad = Column(String, nullable=True)
    nombre_unidad = Column(String, nullable=True)
    turno = Column(String, nullable=True)
    comentarios = Column(Text, nullable=True)
    comentarios_estatus = Column(Text, nullable=True)
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())

    doctor = relationship("Doctor", back_populates="historial")


class EntidadCupos(Base):
    __tablename__ = "entidad_cupos"
    
    entidad = Column(String, primary_key=True, index=True)
    minimo = Column(Integer, nullable=False, default=0)
    maximo = Column(Integer, nullable=False, default=0)


class PeasAsistencia(Base):
    __tablename__ = "peas_asistencia"

    id = Column(Integer, primary_key=True, index=True)
    id_imss = Column(String, ForeignKey("doctores.id_imss", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(20), nullable=False)
    fecha_hora = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    doctor = relationship("Doctor")


class UsuarioAcceso(Base):
    __tablename__ = "usuarios_acceso"

    id = Column(Integer, primary_key=True, index=True)
    id_imss = Column(String(50), ForeignKey("doctores.id_imss"), nullable=True)
    correo = Column(String(150), unique=True, nullable=True) # Nuevo
    hashed_password = Column(String, nullable=False)
    rol = Column(String(50), nullable=False)
    estatus = Column(Boolean, default=True)
    clues = Column(String(50), nullable=True) # Nuevo
    entidad = Column(String(100), nullable=True) # Nuevo

    doctor = relationship("Doctor")

#MODELO DE ASISTENCIAS#
class EstadoReporte(str, enum.Enum):
    PENDIENTE = "pendiente_revision"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"

class ReporteQuincenal(Base):
    __tablename__ = "reportes_quincenales"

    id = Column(Integer, primary_key=True, index=True)
    id_imss = Column(String(50), ForeignKey("doctores.id_imss")) # Relación con el médico
    quincena = Column(String(20)) # Ejemplo: "2026-08-Q1" (Año-Mes-Quincena 1 o 2)
    fecha_inicio = Column(Date)
    fecha_fin = Column(Date)
    
    # Aquí es donde guardaremos la URL de Backblaze
    url_documento = Column(String(500), nullable=True) 
    url_excel = Column(String(500), nullable=True)
    
    estado = Column(Enum(EstadoReporte), default=EstadoReporte.PENDIENTE)
    observaciones = Column(String(1000))
    
    # Auditoría
    fecha_subida = Column(DateTime(timezone=True), server_default=func.now())
    subido_por = Column(String(50)) # El ID del supervisor que lo subió

class BitacoraEstatalValidada(Base):
    __tablename__ = "bitacora_estatal_validada"

    id = Column(Integer, primary_key=True, index=True)
    id_reporte_quincenal = Column(Integer, ForeignKey("reportes_quincenales.id"), unique=True) # Para no validar dos veces el mismo
    id_imss = Column(String, index=True)
    quincena_validada = Column(String) # Ej. "2026-08-Q1"
    
    # Datos extraídos para el Formato 2
    profesional_salud = Column(String)
    especialidad = Column(String)
    turno = Column(String)
    clues_ib = Column(String)
    unidad_medica = Column(String)
    dias_participacion = Column(Integer)
    entidad = Column(String, index=True) # Fundamental para filtrar por estado
    
    # Datos de auditoría
    validado_por = Column(String) # ID o correo del coordinador que dio el clic
    fecha_validacion = Column(DateTime(timezone=True), server_default=func.now())

class FormatoEstatalFirmado(Base):
    __tablename__ = "formatos_estatales_firmados"

    id = Column(Integer, primary_key=True, index=True)
    entidad = Column(String(50), index=True) # Ej. "BC"
    quincena = Column(String(20), index=True) # Ej. "2026-08-Q1"
    url_documento = Column(String(500), nullable=False) # Ruta en Backblaze B2
    fecha_subida = Column(DateTime(timezone=True), server_default=func.now())
    subido_por = Column(String(100)) # ID del coordinador
    estado = Column(Enum(EstadoReporte), default=EstadoReporte.PENDIENTE)
    observaciones = Column(String(1000))
        

class FormatoNacionalFirmado(Base):
    __tablename__ = "formatos_nacionales_firmados"

    id = Column(Integer, primary_key=True, index=True)
    quincena = Column(String(20), index=True, unique=True) # Solo puede haber UNO por quincena a nivel nacional
    url_documento = Column(String(500), nullable=False)
    fecha_subida = Column(DateTime(timezone=True), server_default=func.now())
    subido_por = Column(String(100))
