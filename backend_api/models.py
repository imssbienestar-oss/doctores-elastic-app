# backend_api/models.py
from sqlalchemy import Column, Integer, String, Date, Text # Importa los tipos necesarios
from database import Base # Importa la Base que definimos en database.py

class Doctor(Base):

    __tablename__ = "doctores" # Nombre exacto de la tabla en PostgreSQL

    # Define las columnas - ¡¡¡AJUSTA LOS TIPOS Y LONGITUDES SEGÚN TU TABLA REAL!!!
    id = Column(Integer, primary_key=True, index=True) # ID autoincremental
    identificador_imss = Column(String(100), index=True) # index=True si buscas frecuentemente por este campo
    nombre_completo = Column(String(255))
    estatus = Column(String(50))
    matrimonio_id = Column(String(100), nullable=True) # nullable=True si la columna permite NULLs
    curp = Column(String(18), unique=True, index=True, nullable=True) # unique=True si debe ser único
    cedula_esp = Column(String(100), nullable=True)
    cedula_lic = Column(String(100), nullable=True)
    especialidad = Column(String(255), nullable=True)
    entidad = Column(String(100), nullable=True)
    clues_ssa = Column(String(100), nullable=True)
    notificacion_baja = Column(Text, nullable=True)
    motivo_baja = Column(Text, nullable=True)
    fecha_extraccion = Column(String(100), nullable=True) # O TEXT si lo cambiaste en la DB
    fecha_notificacion = Column(Date, nullable=True) # O TEXT si lo cambiaste en la DB
    sexo = Column(String(10), nullable=True)
    turno = Column(String(50), nullable=True)
    clues_ib = Column(String(100), nullable=True)
    nombre_unidad = Column(String(255), nullable=True)
    municipio = Column(String(100), nullable=True)
    nivel_atencion = Column(String(50), nullable=True)
    fecha_estatus = Column(Date, nullable=True) # O TEXT si lo cambiaste en la DB
    despliegue = Column(String(255), nullable=True)
    fecha_vuelo = Column(Date, nullable=True) # O TEXT si lo cambiaste en la DB
    estrato = Column(String(100), nullable=True)
    acuerdo = Column(String(255), nullable=True) # Lo pongo como String por el 2024.0 que vimos, ajusta si es necesario
    # Añade aquí CUALQUIER OTRA COLUMNA que tengas en tu tabla 'doctores'
    __table_args__ = {'extend_existing': True}
    # Nota: Añadí nullable=True a la mayoría asumiendo que pueden estar vacías (NULL).
    # Ajusta unique=True, index=True, nullable=True según la definición real de tu tabla.
    # Si cambiaste las columnas de fecha a TEXT en la base de datos, CAMBIA Date por Text o String aquí también.


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False) # Nombre de usuario único
    hashed_password = Column(String(255), nullable=False) # Contraseña almacenada de forma segura (hash)
    # is_active = Column(Boolean, default=True) # Opcional: para desactivar usuarios    
    __table_args__ = {'extend_existing': True}
