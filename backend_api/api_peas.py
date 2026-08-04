# api_peas.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from calendar import monthrange
from fastapi import File, UploadFile, Form
from botocore.config import Config


# Importa tus módulos locales (ajusta los puntos si tu estructura es distinta)
from . import models, schemas
from .database import get_db
from datetime import datetime, date, timedelta
import pytz
import os
import uuid
import boto3
from . import security
from . import models
from . import schemas

router = APIRouter(
    prefix="/api/peas",
    tags=["PEAS Asistencia"]
)


@router.post("/usuarios-acceso", response_model=schemas.UsuarioAccesoResponse, tags=["Gestión de Accesos"])
async def registrar_usuario_acceso(
    usuario: schemas.UsuarioAccesoCreate, 
    db: Session = Depends(get_db),
    # Opcional: Descomenta la siguiente línea si quieres que SOLO los admins puedan crear estos accesos
    # current_user: models.User = Depends(security.get_current_active_user) 
):
    # 1. Verificar si el ID IMSS realmente existe en tu padrón de doctores
    doctor_existe = db.query(models.Doctor).filter(models.Doctor.id_imss == usuario.id_imss).first()
    if not doctor_existe:
        raise HTTPException(status_code=404, detail="El ID IMSS no existe en el registro principal de médicos.")

    # 2. Verificar si este médico ya tiene una cuenta de acceso creada
    cuenta_existe = db.query(models.UsuarioAcceso).filter(models.UsuarioAcceso.id_imss == usuario.id_imss).first()
    if cuenta_existe:
        raise HTTPException(status_code=400, detail="Este usuario ya tiene una cuenta de acceso.")

    # 3. Hashear la contraseña y guardar en la nueva tabla
    nuevo_acceso = models.UsuarioAcceso(
        id_imss=usuario.id_imss,
        hashed_password=security.get_password_hash(usuario.password), # ¡Encriptación vital!
        rol=usuario.rol,
        estatus=usuario.estatus
    )
    
    db.add(nuevo_acceso)
    db.commit()
    db.refresh(nuevo_acceso)
    
    return nuevo_acceso

@router.post("/asistencia")
async def registrar_asistencia_peas(
    registro: schemas.RegistroAsistenciaPeas, 
    db: Session = Depends(get_db)
):
    id_medico = registro.id_imss.strip().upper()
    doctor_db = db.query(models.Doctor).filter(models.Doctor.id_imss == id_medico).first()
    
    if not doctor_db:
        raise HTTPException(status_code=404, detail=f"No se encontró al médico con ID: {id_medico}")

    # 1. Definir zona horaria de México
    mx_tz = pytz.timezone('America/Mexico_City')
    fecha_hora_local = datetime.now(mx_tz)
    
    # 2. Calcular los límites exactos de "HOY" en hora de México y pasarlos a UTC
    inicio_dia_local = fecha_hora_local.replace(hour=0, minute=0, second=0, microsecond=0)
    fin_dia_local = fecha_hora_local.replace(hour=23, minute=59, second=59, microsecond=999999)

    inicio_utc = inicio_dia_local.astimezone(pytz.utc).replace(tzinfo=None)
    fin_utc = fin_dia_local.astimezone(pytz.utc).replace(tzinfo=None)

    # 3. Buscar si YA EXISTE ese mismo registro (Entrada o Salida) el día de HOY
    registro_existente = db.query(models.PeasAsistencia).filter(
        models.PeasAsistencia.id_imss == id_medico,
        models.PeasAsistencia.tipo == registro.tipo,
        models.PeasAsistencia.fecha_hora >= inicio_utc,
        models.PeasAsistencia.fecha_hora <= fin_utc
    ).first()

    if registro_existente:
        raise HTTPException(
            status_code=400,
            detail=f"El médico ya tiene registrada una {registro.tipo} el día de hoy."
        )
        
    # 4. Guardar el nuevo registro en la hora UTC pura (buena práctica de bases de datos)
    fecha_hora_utc = datetime.utcnow()

    nueva_asistencia = models.PeasAsistencia(
        id_imss=id_medico,
        tipo=registro.tipo,
        fecha_hora=fecha_hora_utc
    )
    
    db.add(nueva_asistencia)
    db.commit()
    db.refresh(nueva_asistencia)
    
    return {
        "mensaje": f"{registro.tipo} registrada exitosamente",
        "registro": {
            "id": nueva_asistencia.id,
            "idImss": doctor_db.id_imss,
            "nombre": f"{doctor_db.nombre} {doctor_db.apellido_paterno or ''}".strip(),
            "unidad": doctor_db.nombre_unidad or "Unidad No Asignada",
            "tipo": nueva_asistencia.tipo,
            "hora": fecha_hora_local.strftime("%I:%M:%S %p") # Devolvemos hora de México a la alerta
        }
    }

@router.get("/asistencia/bitacora-hoy", tags=["Asistencia PEAS"])
async def obtener_bitacora_hoy(db: Session = Depends(get_db)):
    mx_tz = pytz.timezone('America/Mexico_City')
    hoy = datetime.now(mx_tz).date()
    
    # Traemos todos los registros de hoy cronológicamente
    registros = db.query(models.PeasAsistencia).filter(
        func.date(models.PeasAsistencia.fecha_hora) == hoy
    ).order_by(models.PeasAsistencia.fecha_hora).all()
    
    agrupados = {}
    
    for r in registros:
        # Si es la primera vez que vemos a este médico hoy, creamos su fila
        if r.id_imss not in agrupados:
            doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == r.id_imss).first()
            if not doctor:
                continue
                
            agrupados[r.id_imss] = {
                "idImss": r.id_imss,
                "nombre": f"{doctor.nombre} {doctor.apellido_paterno or ''}".strip(),
                "unidad": doctor.nombre_unidad or "Unidad No Asignada",
                "horaEntrada": "--:--",
                "horaSalida": "--:--"
            }
            
        # Ajuste de zona horaria
        dt = r.fecha_hora
        if dt.tzinfo is None:
            dt = pytz.utc.localize(dt).astimezone(mx_tz)
        else:
            dt = dt.astimezone(mx_tz)
            
        hora_formateada = dt.strftime("%I:%M:%S %p")
        
        # Llenamos la columna correspondiente
        if r.tipo == "Entrada":
            agrupados[r.id_imss]["horaEntrada"] = hora_formateada
        elif r.tipo == "Salida":
            agrupados[r.id_imss]["horaSalida"] = hora_formateada

    # Convertimos el diccionario a una lista y la invertimos para ver los movimientos más recientes arriba
    return list(agrupados.values())[::-1]

@router.get("/mi-estado-asistencia/{id_imss}", tags=["Asistencia PEAS"])
async def obtener_estado_asistencia(
    id_imss: str, 
    db: Session = Depends(get_db)
):
    doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    # 1. Definir la zona horaria de México
    mx_tz = pytz.timezone('America/Mexico_City')
    ahora_local = datetime.now(mx_tz)
    
    # 2. Calcular los límites exactos de "HOY" en hora de México
    inicio_dia_local = ahora_local.replace(hour=0, minute=0, second=0, microsecond=0)
    fin_dia_local = ahora_local.replace(hour=23, minute=59, second=59, microsecond=999999)

    # 3. Convertir esos límites a UTC para que la base de datos los entienda
    # Le quitamos la zona horaria (replace tzinfo=None) para evitar conflictos con SQLAlchemy
    inicio_utc = inicio_dia_local.astimezone(pytz.utc).replace(tzinfo=None)
    fin_utc = fin_dia_local.astimezone(pytz.utc).replace(tzinfo=None)

    # 4. Buscar el último registro que caiga EXACTAMENTE dentro del rango de HOY
    ultimo_registro = db.query(models.PeasAsistencia).filter(
        models.PeasAsistencia.id_imss == id_imss,
        models.PeasAsistencia.fecha_hora >= inicio_utc,
        models.PeasAsistencia.fecha_hora <= fin_utc
    ).order_by(desc(models.PeasAsistencia.fecha_hora)).first()

    estado_actual = "Sin registro hoy"
    hora_ultimo = None
    
    if ultimo_registro:
        estado_actual = ultimo_registro.tipo 
        
        # Volvemos a formatear a hora de México para mostrarlo en la credencial
        dt = ultimo_registro.fecha_hora
        if dt.tzinfo is None:
            dt = pytz.utc.localize(dt).astimezone(mx_tz)
        else:
            dt = dt.astimezone(mx_tz)

        hora_ultimo = dt.strftime("%I:%M:%S %p")

    return {
        "id_imss": doctor.id_imss,
        "nombre_completo": f"{doctor.nombre} {doctor.apellido_paterno or ''} {doctor.apellido_materno or ''}".strip(),
        "unidad": doctor.nombre_unidad or "Unidad Médica Asignada",
        "estado_actual": estado_actual,
        "ultima_hora": hora_ultimo
    }


@router.get("/reporte-quincenal/datos/{id_imss}", tags=["Reportes PEAS"])
async def obtener_datos_quincena(
    id_imss: str,
    anio: int,
    mes: int,
    quincena: int,
    db: Session = Depends(get_db)
):
    # 1. Validar doctor
    doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    turno_raw = doctor.turno or "Matutino"
    turno = turno_raw.strip().lower()

    # 2. Calcular fechas
    if quincena == 1:
        fecha_inicio = date(anio, mes, 1)
        fecha_fin = date(anio, mes, 15)
    else:
        fecha_inicio = date(anio, mes, 16)
        ultimo_dia = monthrange(anio, mes)[1]
        fecha_fin = date(anio, mes, ultimo_dia)

    # 3. Traer asistencias reales de la BD
    asistencias = db.query(models.PeasAsistencia).filter(
        models.PeasAsistencia.id_imss == id_imss,
        func.date(models.PeasAsistencia.fecha_hora) >= fecha_inicio,
        func.date(models.PeasAsistencia.fecha_hora) <= fecha_fin
    ).order_by(models.PeasAsistencia.fecha_hora).all()

    historial = db.query(models.EstatusHistorico).filter(
        models.EstatusHistorico.id_imss == id_imss
    ).order_by(desc(models.EstatusHistorico.fecha_inicio)).all()

    def obtener_estatus_en_fecha(fecha_buscada, estatus_actual_bd):
        # Buscamos en memoria RAM (rapidísimo) si la fecha cae dentro de un periodo histórico
        for registro in historial:
            inicio_valido = registro.fecha_inicio <= fecha_buscada
            # Si fecha_fin es None, significa que es su estatus actual/vigente
            fin_valido = registro.fecha_fin is None or registro.fecha_fin >= fecha_buscada
            
            if inicio_valido and fin_valido:
                return registro.estatus
                
        return estatus_actual_bd

    mx_tz = pytz.timezone('America/Mexico_City')
    mapa_asistencias = {}

    for a in asistencias:
        # 1. Ajustar la zona horaria del registro de la base de datos
        dt = a.fecha_hora
        if dt.tzinfo is None:
            # Si la base de datos lo devuelve sin zona horaria, asumimos UTC y lo pasamos a México
            dt = pytz.utc.localize(dt).astimezone(mx_tz)
        else:
            # Si ya trae zona horaria (UTC), lo convertimos directamente a México
            dt = dt.astimezone(mx_tz)

        # 2. Extraer el día y la hora ya corregidos
        dia_str = dt.strftime("%Y-%m-%d")
        hora_str = dt.strftime("%H:%M")
        
        # 3. Guardarlo en el diccionario
        if dia_str not in mapa_asistencias:
            mapa_asistencias[dia_str] = {"entrada": None, "salida": None}
            
        if a.tipo == "Entrada" and not mapa_asistencias[dia_str]["entrada"]:
            mapa_asistencias[dia_str]["entrada"] = hora_str
        elif a.tipo == "Salida":
            mapa_asistencias[dia_str]["salida"] = hora_str

    # 4. CONSTRUIR EL CALENDARIO IDEAL QUINCENAL
    registros_quincena = []
    dia_actual = fecha_inicio

    while dia_actual <= fecha_fin:
        dia_semana = dia_actual.weekday() # 0=Lunes, ..., 6=Domingo
        dia_str = dia_actual.strftime("%Y-%m-%d")
        es_laborable = False
        horario_esperado = ""

        # Lógica de turnos (ahora compara en minúsculas y tolera variaciones)
        if "matutino" in turno:
            if dia_semana < 5: # Lunes a Viernes
                es_laborable = True
                horario_esperado = "07:00 a 15:00"
        
        elif "vespertino" in turno:
            if dia_semana < 5: # Lunes a Viernes
                es_laborable = True
                horario_esperado = "13:00 a 21:00"
                
        elif "nocturno" in turno:
            if dia_semana in [0, 2, 4]: # Lunes(0), Miércoles(2), Viernes(4)
                es_laborable = True
                horario_esperado = "21:00 a 09:00"
                
        elif "jornada" in turno or "acumulada" in turno:
            if dia_semana == 5: # Sábado
                es_laborable = True
                horario_esperado = "07:00 a 22:00"
            elif dia_semana == 6: # Domingo
                es_laborable = True
                horario_esperado = "08:00 a 20:00"

        # Si el día es laborable, cruzamos los datos
        if es_laborable:
            asistencia_real = mapa_asistencias.get(dia_str, {"entrada": None, "salida": None})

            estatus_del_dia = obtener_estatus_en_fecha(dia_actual, doctor.estatus)
            registros_quincena.append({
                "fecha": dia_str,
                "horario_esperado": horario_esperado,
                "hora_ingreso": asistencia_real.get("entrada") or "--:--",
                "hora_egreso": asistencia_real.get("salida") or "--:--",
                "falta": asistencia_real.get("entrada") is None,
                "estatus_dia": estatus_del_dia
            })

        dia_actual += timedelta(days=1)

    # 5. Respuesta lista para React (le devolvemos el turno original para mostrarlo bonito)
    return {
        "medico": {
            "nombre": f"{doctor.nombre} {doctor.apellido_paterno or ''} {doctor.apellido_materno or ''}".strip(),
            "especialidad": doctor.especialidad or "Médico General",
            "unidad": doctor.nombre_unidad or "Unidad Médica Asignada",
            "turno": turno_raw
        },
        "periodo": {
            "quincena": quincena,
            "mes": mes,
            "anio": anio,
            "fecha_inicio": str(fecha_inicio),
            "fecha_fin": str(fecha_fin)
        },
        "dias_laborables": registros_quincena
    }


s3_client = boto3.client(
   's3',
    endpoint_url=os.getenv('B2_ENDPOINT'),
    aws_access_key_id=os.getenv('B2_KEY_ID'),
    aws_secret_access_key=os.getenv('B2_APPLICATION_KEY'),
    config=Config(
        signature_version='s3v4',
        s3={'addressing_style': 'virtual'}
    )
)

@router.post("/reporte-quincenal/subir", tags=["Reportes PEAS"])
async def subir_reporte_quincenal(
    id_imss: str = Form(...),
    anio: int = Form(...),
    mes: int = Form(...),
    quincena: int = Form(...),
    subido_por: str = Form(...), # El ID del coordinador/responsable que lo sube
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Validar que sea un PDF
    if not archivo.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un documento PDF")

    # 2. Validar que el médico exista
    doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    # 3. Generar un nombre único para el archivo en el bucket
    # Ejemplo: reportes/2026/08/Q1/MC_0001_asdasd123.pdf
    extension = archivo.filename.split('.')[-1]
    nombre_unico = f"reportes/{anio}/{mes:02d}/Q{quincena}/{id_imss}_{uuid.uuid4().hex[:8]}.{extension}"
    bucket_name = os.getenv('B2_BUCKET_NAME')

    try:
        # 4. Subir el archivo "al vuelo" a Backblaze B2
        s3_client.upload_fileobj(
            archivo.file,
            bucket_name,
            nombre_unico,
            ExtraArgs={"ContentType": archivo.content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir archivo a la nube: {str(e)}")

    # 5. Guardar el registro en la Base de Datos
    # Construimos el periodo (ej. 2026-08-Q1)
    periodo_str = f"{anio}-{mes:02d}-Q{quincena}"
    
    # Calculamos fechas igual que en el otro endpoint
    if quincena == 1:
        fecha_ini = date(anio, mes, 1)
        fecha_fin = date(anio, mes, 15)
    else:
        fecha_ini = date(anio, mes, 16)
        fecha_fin = date(anio, mes, monthrange(anio, mes)[1])

    # El bucket es privado, pero guardamos la ruta interna para que el backend la firme después
    nuevo_reporte = models.ReporteQuincenal(
        id_imss=id_imss,
        quincena=periodo_str,
        fecha_inicio=fecha_ini,
        fecha_fin=fecha_fin,
        url_documento=nombre_unico, # Guardamos el "Key" del objeto en B2
        subido_por=subido_por
    )

    db.add(nuevo_reporte)
    db.commit()
    db.refresh(nuevo_reporte)

    return {
        "mensaje": "Reporte subido y registrado exitosamente",
        "id_reporte": nuevo_reporte.id,
        "archivo": nombre_unico
    }
