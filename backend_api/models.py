# backend_api/models.py
from sqlalchemy import Column, Integer, String, Date, Text, DateTime,Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship # Para definir relaciones entre tablas
from sqlalchemy.sql import func # Para funciones SQL como now() para timestamps
from database import Base # Importa la Base que definimos en database.py

class Doctor(Base):
    __tablename__ = "doctores" # Nombre exacto de la tabla en PostgreSQL

  # Columnas existentes
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
    despliegue = Column(String(255), nullable=True)
    fecha_vuelo = Column(Date, nullable=True)
    estrato = Column(String(100), nullable=True)
    acuerdo = Column(String(255), nullable=True)
    foto_url = Column(String(1024), nullable=True, index=True) 
    correo = Column(String(100), nullable=True)
    telefono = Column(String(255), nullable=True)
    edad = Column(String(10), nullable=True)
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
    deleted_by_user_obj = relationship(
        "User", 
        foreign_keys=[deleted_by_user_id], # Especifica qué columna local es la FK
        back_populates="doctors_soft_deleted_by_this_user"
    )
    fecha_inicio = Column(Date, nullable=True)
    fecha_fin = Column(Date, nullable=True)
    motivo = Column(String(255), nullable=True)
    tipo_incapacidad = Column(String(255), nullable=True) 
    attachments = relationship("DoctorAttachment", back_populates="doctor", cascade="all, delete-orphan")
    coordinacion = Column(String(100), nullable=True)
    __table_args__ = {'extend_existing': True}
    historial = relationship("EstatusHistorico", back_populates="doctor", cascade="all, delete-orphan")

# --- CLASE USUARIO ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String, default="admin")
    must_change_password = Column(Boolean, default=True) 

    __table_args__ = {'extend_existing': True}
    audit_log_entries = relationship("AuditLog", back_populates="user")

    doctors_soft_deleted_by_this_user = relationship(
        "Doctor", 
        foreign_keys="[Doctor.deleted_by_user_id]", # Especifica la FK en la tabla Doctor
        back_populates="deleted_by_user_obj"
    )

# --- CLASE EXPEDIENTES ADJUNTOS ---
class DoctorAttachment(Base):
    __tablename__ = "doctor_attachments" # NOMBRE POSTGRES

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(String, ForeignKey("doctores.id_imss", ondelete="CASCADE"), nullable=False)                                
    file_name = Column(String(255), index=True, nullable=False) 
    file_url = Column(String(1024), nullable=False, unique=True) 
    file_type = Column(String(100), nullable=True) 
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now()) 
    documento_tipo = Column(String(100), nullable=False) 
    __table_args__ = (
        UniqueConstraint('doctor_id', 'documento_tipo', name='_doctor_documento_tipo_uc'),
    )

    doctor = relationship("Doctor", back_populates="attachments")

# --- CLASE AUDITORIA ---
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
    user = relationship("User", foreign_keys=[user_id], back_populates="audit_log_entries")
    __table_args__ = {'extend_existing': True} 

# --- CLASE CATALOGO CLUES ---
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

# --- CLASE HISTORICO ESTATUS ---
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
    fecha_registro = Column(DateTime(timezone=True), server_default=func.now())
    
    doctor = relationship("Doctor", back_populates="historial")

class EntidadCupos(Base):
    __tablename__ = "entidad_cupos"

    entidad = Column(String, primary_key=True, index=True) 
    minimo = Column(Integer, nullable=False, default=0)
    maximo = Column(Integer, nullable=False, default=0)
