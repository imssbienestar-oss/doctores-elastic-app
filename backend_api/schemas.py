from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Union
from datetime import date, datetime

class Doctor(Base):
    __tablename__ = "doctores" # Nombre exacto de la tabla en PostgreSQL

    # Columnas existentes
    id_imss = Column(String, primary_key=True, index=True) 
    nombre = Column(String(255))
    apellido_paterno = Column(String(100), nullable=True)
    apellido_materno = Column(String(100), nullable=True)
    estatus = Column(String(50))
    matrimonio_id = Column(String(100), nullable=True)
    curp = Column(String(50), index=True, nullable=True)
    cedula_esp = Column(String(100), nullable=True)
    cedula_lic = Column(String(100), nullable=True)
    especialidad = Column(String(255), nullable=True)
    entidad = Column(String(100), nullable=True)
    clues = Column(String(100), nullable=True)
    forma_notificacion = Column(Text, nullable=True)
    motivo_baja = Column(String(100), nullable=True)
    fecha_extraccion = Column(String(100), nullable=True)
    fecha_notificacion = Column(Date, nullable=True)
    sexo = Column(String(10), nullable=True)
    turno = Column(String(50), nullable=True)
    nombre_unidad = Column(String(255), nullable=True)
    municipio = Column(String(100), nullable=True)
    nivel_atencion = Column(String(50), nullable=True)
    fecha_estatus = Column(Date, nullable=True)
    despliegue = Column(String(255), nullable=True)
    fecha_vuelo = Column(Date, nullable=True)
    estrato = Column(String(100), nullable=True)
    acuerdo = Column(String(255), nullable=True)
    foto_url = Column(String(1024), nullable=True, index=True) # Las URLs pueden ser largas
    correo = Column(String(100), nullable=True)
    telefono = Column(String(255), nullable=True)
    comentarios_estatus = Column(Text, nullable=True)
    fecha_fallecimiento = Column(Date, nullable=True) # Ya lo tenías
    fecha_nacimiento = Column(Date, nullable=True)   # Ya lo tenías
    pasaporte = Column(String(50), nullable=True)
    fecha_emision = Column(Date, nullable=True) # Asumiendo que es la vigencia del pasaporte (fecha)
    fecha_expiracion = Column(Date, nullable=True) # Asumiendo que es la vigencia del pasaporte (fecha)
    domicilio = Column(Text, nullable=True)
    licenciatura = Column(String(255), nullable=True) # Nombre de la carrera
    institucion_lic = Column(String(255), nullable=True)
    institucion_esp = Column(String(255), nullable=True)
    fecha_egreso_lic = Column(Date, nullable=True)
    fecha_egreso_esp = Column(Date, nullable=True)
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
    entidad_nacimiento= Column(String(255), nullable=True)
    attachments = relationship("DoctorAttachment", back_populates="doctor", cascade="all, delete-orphan")
    __table_args__ = {'extend_existing': True}


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


# --- NUEVO MODELO para los Expedientes Adjuntos del Doctor ---
class DoctorAttachment(Base):
    __tablename__ = "doctor_attachments" # Nombre para la nueva tabla

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(String, ForeignKey("doctores.id_imss", ondelete="CASCADE"), nullable=False)                                
    file_name = Column(String(255), index=True, nullable=False) # Nombre original del archivo
    file_url = Column(String(1024), nullable=False, unique=True) # URL de Firebase Storage, debe ser única
    file_type = Column(String(100), nullable=True) # ej. 'application/pdf', 'image/jpeg'
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now()) # Fecha y hora de subida con zona horaria

    # --- NUEVA RELACIÓN INVERSA para acceder al doctor desde el attachment ---
    # Esto crea un atributo `attachment.doctor`
    doctor = relationship("Doctor", back_populates="attachments")

    # No necesitas __table_args__ = {'extend_existing': True} aquí porque es una tabla nueva
    # y no debería existir antes de que `create_all` la cree por primera vez.

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Esta es la FK para el usuario
    username = Column(String(100), nullable=True) # Nombre del usuario (para fácil visualización)
    action_type = Column(String(100), nullable=False, index=True) # Ej: "CREATE_DOCTOR", "UPDATE_DOCTOR"
    target_entity = Column(String(100), nullable=True, index=True) # Ej: "Doctor"
    target_id = Column(Integer, nullable=True, index=True) # Ej: ID del doctor afectado
    target_id_str = Column(String(100), nullable=True, index=True) # Para IDs como 'MC_123'
    details = Column(Text, nullable=True) # JSON string con cambios o datos relevantes
    user = relationship("User", foreign_keys=[user_id], back_populates="audit_log_entries")
    __table_args__ = {'extend_existing': True} # Mantener por si acaso, aunque no debería ser necesario si la tabla se crea correctamente


