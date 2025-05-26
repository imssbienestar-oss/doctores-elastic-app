# backend_api/models.py
from sqlalchemy import Column, Integer, String, Date, Text, DateTime,Boolean, ForeignKey # Asegúrate de tener DateTime y ForeignKey
from sqlalchemy.orm import relationship # Para definir relaciones entre tablas
from sqlalchemy.sql import func # Para funciones SQL como now() para timestamps
from . database import Base # Importa la Base que definimos en database.py

class Doctor(Base):
    __tablename__ = "doctores" # Nombre exacto de la tabla en PostgreSQL

    # Columnas existentes
    id = Column(Integer, primary_key=True, index=True)
    identificador_imss = Column(String(100), index=True)
    nombre_completo = Column(String(255))
    estatus = Column(String(50))
    matrimonio_id = Column(String(100), nullable=True)
    curp = Column(String(18), unique=True, index=True, nullable=True)
    cedula_esp = Column(String(100), nullable=True)
    cedula_lic = Column(String(100), nullable=True)
    especialidad = Column(String(255), nullable=True)
    entidad = Column(String(100), nullable=True)
    clues_ssa = Column(String(100), nullable=True)
    notificacion_baja = Column(Text, nullable=True)
    motivo_baja = Column(Text, nullable=True)
    fecha_extraccion = Column(String(100), nullable=True)
    fecha_notificacion = Column(Date, nullable=True)
    sexo = Column(String(10), nullable=True)
    turno = Column(String(50), nullable=True)
    clues_ib = Column(String(100), nullable=True)
    nombre_unidad = Column(String(255), nullable=True)
    municipio = Column(String(100), nullable=True)
    nivel_atencion = Column(String(50), nullable=True)
    fecha_estatus = Column(Date, nullable=True)
    despliegue = Column(String(255), nullable=True)
    fecha_vuelo = Column(Date, nullable=True)
    estrato = Column(String(100), nullable=True)
    acuerdo = Column(String(255), nullable=True)
    correo_electronico = Column(String(100), nullable=True)
    tel = Column(String(255), nullable=True)
    entidad_nacimiento= Column(String(255), nullable=True)
    comentarios_estatus = Column(Text, nullable=True)
    fecha_fallecimiento = Column(Date, nullable=True)
    profile_pic_url = Column(String(1024), nullable=True, index=True) # Las URLs pueden ser largas
    # --- Columnas para Soft Delete ---
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by_user_id = Column(Integer, ForeignKey("users.id", name="fk_doctor_deleted_by_user"), nullable=True)
    deleted_by_user_obj = relationship(
        "User", 
        foreign_keys=[deleted_by_user_id], # Especifica qué columna local es la FK
        back_populates="doctors_soft_deleted_by_this_user"
    )
    fecha_nacimiento = Column(Date, nullable=True)
    # Relación opcional para ver quién borró (si User tiene una relación inversa)
    # deleted_by_user = relationship("User", foreign_keys=[deleted_by_user_id])

    # --- NUEVA RELACIÓN para acceder a los attachments desde el doctor ---
    # Esto crea un atributo `doctor.attachments` que será una lista de objetos DoctorAttachment
    attachments = relationship("DoctorAttachment", back_populates="doctor", cascade="all, delete-orphan")
    # cascade="all, delete-orphan": si eliminas un Doctor, también se eliminarán sus DoctorAttachment asociados.

    __table_args__ = {'extend_existing': True}


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String, default="admin")
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
    doctor_id = Column(Integer, ForeignKey("doctores.id", ondelete="CASCADE"), nullable=False) # Clave foránea a la tabla doctores
                                                                                        # ondelete="CASCADE" significa que si se borra un doctor,
                                                                                        # sus attachments también se borrarán de esta tabla.
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
    details = Column(Text, nullable=True) # JSON string con cambios o datos relevantes
    user = relationship("User", foreign_keys=[user_id], back_populates="audit_log_entries")
    __table_args__ = {'extend_existing': True} # Mantener por si acaso, aunque no debería ser necesario si la tabla se crea correctamente

