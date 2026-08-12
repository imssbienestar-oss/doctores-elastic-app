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

class RechazoRequest(BaseModel):
    observaciones: str

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

@router.post("/reporte-quincenal/previsualizar-excel", tags=["Reportes PEAS"])
async def previsualizar_excel_asistencia(archivo: UploadFile = File(...)):
    # 1. Validar que sea un archivo de Excel
    if not archivo.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="El archivo debe ser un formato de Excel (.xlsx)")

    try:
        # 2. Leer el archivo directamente desde la memoria
        contents = await archivo.read()
        df = pd.read_excel(BytesIO(contents))

        # 3. Limpieza: quitar filas que estén completamente en blanco
        df = df.dropna(how='all')

        asistencias_extraidas = []
        dias_validos = 0

        # 4. Recorrer el Excel fila por fila usando los encabezados acordados
        for index, row in df.iterrows():
            # Extraemos la fecha (si viene vacía o es error, la saltamos)
            if pd.isna(row.get('FECHA (DD/MM/AAAA)')):
                continue

            # Convertimos la fecha a formato string estándar (YYYY-MM-DD)
            fecha_cruda = pd.to_datetime(row['FECHA (DD/MM/AAAA)'], dayfirst=True)
            fecha_str = fecha_cruda.strftime('%Y-%m-%d')

            # Extraemos los demás datos, limpiando posibles errores de tipeo
            turno = str(row.get('TIPO_TURNO', 'No especificado')).strip()
            
            entrada_val = row.get('HORA_ENTRADA (HH:MM)')
            salida_val = row.get('HORA_SALIDA (HH:MM)')

            # Si el médico puso horas, las convertimos a string. Si lo dejó vacío, ponemos "--:--"
            hora_entrada = str(entrada_val).strip() if pd.notnull(entrada_val) and str(entrada_val).strip() != "" else "--:--"
            hora_salida = str(salida_val).strip() if pd.notnull(salida_val) and str(salida_val).strip() != "" else "--:--"

            if hora_entrada != "--:--" or hora_salida != "--:--":
                dias_validos += 1

            asistencias_extraidas.append({
                "fecha": fecha_str,
                "turno": turno,
                "entrada": hora_entrada,
                "salida": hora_salida,
                "observaciones": str(row.get('OBSERVACIONES', '')).strip() if pd.notnull(row.get('OBSERVACIONES')) else ""
            })

        # 5. Le devolvemos a React un JSON ordenado
        return {
            "mensaje": "Excel procesado exitosamente",
            "total_dias_registrados": dias_validos,
            "detalle_asistencias": asistencias_extraidas
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno al leer el Excel. Verifica que tenga las columnas correctas. Error: {str(e)}")

# 1. Endpoint para traer los reportes pendientes de un Estado
@router.get("/coordinador/reportes-pendientes/{entidad}", tags=["Coordinador Estatal"])
async def obtener_reportes_pendientes_estado(entidad: str, db: Session = Depends(get_db)):
    entidad_limpia = entidad.upper().strip()

    mapa_entidades = {
        "BAJA CALIFORNIA": "BC",
        "BAJA CALIFORNIA SUR": "BCS",
        "CAMPECHE": "CAMP",
        "CIUDAD DE MEXICO": "CDMX",
        "CHIAPAS": "CHIS",
        "COLIMA": "COL",
        "GUERRERO": "GRO",
        "HIDALGO": "HGO",
        "MEXICO": "MEX",
        "MICHOACAN": "MICH",
        "MORELOS": "MOR",
        "NAYARIT": "NAY",
        "OAXACA": "OAX",
        "PUEBLA": "PUE",
        "QUINTANA ROO": "QROO",
        "SINALOA": "SIN",
        "SAN LUIS POTOSI": "SLP",
        "SONORA": "SON",
        "TABASCO": "TAB",
        "TAMAULIPAS": "TAMPS",
        "TLAXCALA": "TLAX",
        "VERACRUZ": "VER",
        "YUCATAN": "YUC",
        "ZACATECAS": "ZAC"
    }
    entidad_query = mapa_entidades.get(entidad_limpia, entidad_limpia)

    # REGLA DE ORO: Solo traemos reportes cuyo estado sea explícitamente PENDIENTE.
    # Si fue RECHAZADO, ya no entrará aquí, aunque no esté en la tabla de validados.
    reportes = db.query(models.ReporteQuincenal, models.Doctor)\
        .join(models.Doctor, models.ReporteQuincenal.id_imss == models.Doctor.id_imss)\
        .filter(models.Doctor.entidad == entidad_query)\
        .filter(models.ReporteQuincenal.estado == models.EstadoReporte.PENDIENTE)\
        .all()
        
    resultado = []
    for reporte, doctor in reportes:
        resultado.append({
            "id_reporte": reporte.id,
            "id_imss": doctor.id_imss,
            "medico": f"{doctor.nombre} {doctor.apellido_paterno or ''} {doctor.apellido_materno or ''}".strip(),
            "especialidad": doctor.especialidad or "No especificada",
            "turno": doctor.turno or "Matutino",
            "clues": doctor.clues or "Sin CLUES",
            "unidad": doctor.nombre_unidad or "Sin Unidad",
            "quincena": reporte.quincena,
            "url_pdf": reporte.url_documento,
            "subido_por": reporte.subido_por
        })
        
    return resultado

# 2. Endpoint para Validar y Guardar en la nueva tabla
@router.post("/coordinador/validar-reporte", tags=["Coordinador Estatal"])
async def validar_reporte_estatal(
    datos_validacion: dict, # Aquí recibiremos los datos desde React
    db: Session = Depends(get_db)
):
    # Verificamos que no esté validado ya
    existe = db.query(models.BitacoraEstatalValidada).filter(
        models.BitacoraEstatalValidada.id_reporte_quincenal == datos_validacion["id_reporte"]
    ).first()
    
    if existe:
        raise HTTPException(status_code=400, detail="Este documento ya fue validado.")

    nuevo_registro = models.BitacoraEstatalValidada(
        id_reporte_quincenal=datos_validacion["id_reporte"],
        id_imss=datos_validacion["id_imss"],
        quincena_validada=datos_validacion["quincena"],
        profesional_salud=datos_validacion["medico"],
        especialidad=datos_validacion["especialidad"],
        turno=datos_validacion["turno"],
        clues_ib=datos_validacion["clues"],
        unidad_medica=datos_validacion["unidad"],
        dias_participacion=datos_validacion["dias_participacion"], # Lo pasará el coordinador
        entidad=datos_validacion["entidad"],
        validado_por=datos_validacion["validado_por"]
    )
    
    db.add(nuevo_registro)
    reporte_original = db.query(models.ReporteQuincenal).filter(models.ReporteQuincenal.id == datos_validacion["id_reporte"]).first()
    if reporte_original:
        reporte_original.estado = "aprobado"
    db.commit()
    
    return {"mensaje": "Documento validado e insertado en la Bitácora Estatal"}

@router.post("/reporte-quincenal/subir", tags=["Reportes PEAS"])
async def subir_reporte_y_excel(
    id_imss: str = Form(...),
    anio: int = Form(...),
    mes: int = Form(...),
    quincena: int = Form(...),
    subido_por: str = Form(...),
    archivo_pdf: UploadFile = File(...),
    archivo_excel: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Validaciones básicas
    if not archivo_pdf.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El primer archivo debe ser un PDF firmado.")
    if not archivo_excel.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="El segundo archivo debe ser un Excel (.xlsx).")

    doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    # 2. Subir ambos archivos a Backblaze B2
    bucket_name = os.getenv('B2_BUCKET_NAME')
    nombre_pdf = f"reportes/{anio}/{mes:02d}/Q{quincena}/{id_imss}_FIRMADO.pdf"
    nombre_excel = f"reportes/{anio}/{mes:02d}/Q{quincena}/{id_imss}_DATOS.xlsx"

    try:
        # Subir PDF
        s3_client.upload_fileobj(archivo_pdf.file, bucket_name, nombre_pdf, ExtraArgs={"ContentType": "application/pdf"})
        
        # Subir Excel (necesitamos leerlo en memoria primero para procesarlo y luego subirlo)
        excel_contents = await archivo_excel.read()
        s3_client.upload_fileobj(BytesIO(excel_contents), bucket_name, nombre_excel, ExtraArgs={"ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir archivos a la nube: {str(e)}")

    # 3. Guardar el registro principal del Reporte en la BD
    periodo_str = f"{anio}-{mes:02d}-Q{quincena}"
    fecha_ini = date(anio, mes, 1) if quincena == 1 else date(anio, mes, 16)
    fecha_fin = date(anio, mes, 15) if quincena == 1 else date(anio, mes, monthrange(anio, mes)[1])
    

    reporte_existente = db.query(models.ReporteQuincenal).filter(
        models.ReporteQuincenal.id_imss == id_imss,
        models.ReporteQuincenal.quincena == periodo_str
    ).first()   

    if reporte_existente:
        if reporte_existente.estado == models.EstadoReporte.APROBADO:
            raise HTTPException(
                status_code=400, 
                detail=f"La quincena {periodo_str} ya fue APROBADA por el Coordinador Estatal. Si necesitas corregirla, contáctalo directamente."
            )
        else:
            if reporte_existente.url_documento:
                try: s3_client.delete_object(Bucket=bucket_name, Key=reporte_existente.url_documento)
                except: pass
            if getattr(reporte_existente, 'url_excel', None):
                try: s3_client.delete_object(Bucket=bucket_name, Key=reporte_existente.url_excel)
                except: pass
            db.delete(reporte_existente)
            db.query(models.PeasAsistencia).filter(
                models.PeasAsistencia.id_imss == id_imss,
                func.date(models.PeasAsistencia.fecha_hora) >= fecha_ini,
                func.date(models.PeasAsistencia.fecha_hora) <= fecha_fin
            ).delete(synchronize_session=False)
            db.commit()

    nuevo_reporte = models.ReporteQuincenal(
        id_imss=id_imss,
        quincena=periodo_str,
        fecha_inicio=fecha_ini,
        fecha_fin=fecha_fin,
        url_documento=nombre_pdf,
        url_excel=nombre_excel, # Asegúrate de haber agregado este campo en models.py
        subido_por=subido_por
    )
    db.add(nuevo_reporte)

    # 4. Procesar el Excel y crear las Asistencias
    df = pd.read_excel(BytesIO(excel_contents))
    df = df.dropna(how='all')
    mx_tz = pytz.timezone('America/Mexico_City')
    
    asistencias_a_guardar = []

    for index, row in df.iterrows():
        if pd.isna(row.get('FECHA (DD/MM/AAAA)')):
            continue

        fecha_cruda = pd.to_datetime(row['FECHA (DD/MM/AAAA)'], dayfirst=True)
        
        entrada_val = str(row.get('HORA_ENTRADA (HH:MM)', '')).strip()[:5]
        salida_val = str(row.get('HORA_SALIDA (HH:MM)', '')).strip()[:5]

        # Si hay hora de entrada válida
        if entrada_val and entrada_val != "nan" and entrada_val != "--:--":
            # Combinar fecha y hora, y convertir a UTC para guardar en BD
            dt_entrada_local = mx_tz.localize(datetime.strptime(f"{fecha_cruda.strftime('%Y-%m-%d')} {entrada_val}", "%Y-%m-%d %H:%M"))
            dt_entrada_utc = dt_entrada_local.astimezone(pytz.utc).replace(tzinfo=None)
            
            asistencias_a_guardar.append(models.PeasAsistencia(id_imss=id_imss, tipo="Entrada", fecha_hora=dt_entrada_utc))

        # Si hay hora de salida válida
        if salida_val and salida_val != "nan" and salida_val != "--:--":
            dt_salida_local = mx_tz.localize(datetime.strptime(f"{fecha_cruda.strftime('%Y-%m-%d')} {salida_val}", "%Y-%m-%d %H:%M"))
            dt_salida_utc = dt_salida_local.astimezone(pytz.utc).replace(tzinfo=None)
            
            asistencias_a_guardar.append(models.PeasAsistencia(id_imss=id_imss, tipo="Salida", fecha_hora=dt_salida_utc))

    # Guardamos todas las asistencias de golpe (Bulk Insert)
    if asistencias_a_guardar:
        db.add_all(asistencias_a_guardar)

    # Confirmamos todos los cambios en la base de datos
    db.commit()

    return {
        "mensaje": "Archivos subidos y asistencias registradas exitosamente.",
        "dias_procesados": len(asistencias_a_guardar) // 2
    }

@router.get("/reporte-quincenal/ver-documento", tags=["Reportes PEAS"])
async def obtener_url_documento(ruta: str):
    """
    Genera una URL temporal y segura (válida por 1 hora) 
    para ver un documento almacenado en Backblaze B2.
    """
    if not ruta:
        raise HTTPException(status_code=400, detail="Ruta del documento no proporcionada")
        
    try:
        bucket_name = os.getenv('B2_BUCKET_NAME')
        
        # Generamos la "Presigned URL" con boto3
        url_temporal = s3_client.generate_presigned_url(
            ClientMethod='get_object',
            Params={
                'Bucket': bucket_name,
                'Key': ruta
            },
            ExpiresIn=3600 # El link expira en 1 hora (3600 segundos)
        )
        
        return {"url": url_temporal}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar enlace seguro: {str(e)}")

@router.get("/coordinador/generar-formato2/{entidad}/{quincena}", tags=["Coordinador Estatal"])
async def obtener_datos_formato_2(entidad: str, quincena: str, db: Session = Depends(get_db)):
    entidad = entidad.upper().strip()
    
    # 1. Buscamos todos los registros validados de ese estado en esa quincena
    registros = db.query(models.BitacoraEstatalValidada).filter(
        models.BitacoraEstatalValidada.entidad == entidad,
        models.BitacoraEstatalValidada.quincena_validada == quincena
    ).order_by(models.BitacoraEstatalValidada.profesional_salud).all()
    
    if not registros:
        raise HTTPException(status_code=404, detail="No hay registros validados para esta quincena.")

    # 2. Calculamos el total de días de participación
    total_dias = sum(reg.dias_participacion for reg in registros if reg.dias_participacion)

    # 3. Formateamos la respuesta para que React la consuma fácil
    detalle = []
    for i, reg in enumerate(registros, start=1):
        detalle.append({
            "no": i,
            "id_imb": reg.id_imss,
            "nombre": reg.profesional_salud,
            "especialidad": reg.especialidad,
            "turno": reg.turno,
            "clues": reg.clues_ib,
            "unidad": reg.unidad_medica,
            "dias": reg.dias_participacion
        })

    return {
        "entidad": entidad,
        "quincena": quincena,
        "total_dias": total_dias,
        "medicos": detalle
    }

@router.post("/coordinador/subir-formato-estatal", tags=["Coordinador Estatal"])
async def subir_formato_estatal(
    entidad: str = Form(...),
    anio: int = Form(...),
    mes: int = Form(...),
    quincena: int = Form(...),
    subido_por: str = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not archivo.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El formato final debe ser un archivo PDF escaneado.")

    entidad = entidad.upper().strip()
    periodo_str = f"{anio}-{mes:02d}-Q{quincena}"

    # Verificamos si ya existe uno subido para reemplazarlo
    formato_existente = db.query(models.FormatoEstatalFirmado).filter(
        models.FormatoEstatalFirmado.entidad == entidad,
        models.FormatoEstatalFirmado.quincena == periodo_str
    ).first()

    # Generar ruta única en Backblaze
    bucket_name = os.getenv('B2_BUCKET_NAME')
    nombre_unico = f"formatos_estatales/{anio}/{mes:02d}/Q{quincena}/{entidad}_FORMATO2.pdf"

    try:
        # Subimos el nuevo archivo
        s3_client.upload_fileobj(
            archivo.file, bucket_name, nombre_unico, ExtraArgs={"ContentType": "application/pdf"}
        )
        
        # Si ya había uno viejo, lo borramos de B2 para no hacer basura
        if formato_existente and formato_existente.url_documento:
            try: s3_client.delete_object(Bucket=bucket_name, Key=formato_existente.url_documento)
            except: pass
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir a la nube: {str(e)}")

    if formato_existente:
        # Actualizamos el existente
        formato_existente.url_documento = nombre_unico
        formato_existente.fecha_subida = func.now()
        formato_existente.subido_por = subido_por

        formato_existente.estado = models.EstadoReporte.PENDIENTE 
        formato_existente.observaciones = None
    else:
        # Creamos uno nuevo
        nuevo_formato = models.FormatoEstatalFirmado(
            entidad=entidad,
            quincena=periodo_str,
            url_documento=nombre_unico,
            subido_por=subido_por
        )
        db.add(nuevo_formato)

    db.commit()

    return {"mensaje": "Formato Estatal Firmado guardado con éxito", "url": nombre_unico}

@router.get("/coordinador/historial-formatos/{entidad}", tags=["Coordinador Estatal"])
async def obtener_historial_formatos(entidad: str, db: Session = Depends(get_db)):
    entidad_limpia = entidad.upper().strip()
    
    # Traemos los formatos ordenados del más reciente al más antiguo
    formatos = db.query(models.FormatoEstatalFirmado).filter(
        models.FormatoEstatalFirmado.entidad == entidad_limpia
    ).order_by(desc(models.FormatoEstatalFirmado.fecha_subida)).all()
    
    historial = []
    for f in formatos:
        historial.append({
            "id": f.id,
            "quincena": f.quincena,
            "fecha_subida": f.fecha_subida.strftime("%Y-%m-%d %H:%M") if f.fecha_subida else "Sin fecha",
            "subido_por": f.subido_por,
            "url_documento": f.url_documento,
            "estado": f.estado.value if hasattr(f.estado, 'value') else f.estado, 
            "observaciones": f.observaciones 
        })
        
    return historial

@router.get("/nacional/formato3/{anio}/{mes}/{quincena}", tags=["Nacional"])
async def obtener_formato_3_nacional(anio: int, mes: int, quincena: int, db: Session = Depends(get_db)):
    periodo_str = f"{anio}-{mes:02d}-Q{quincena}"
    
    # 1. Buscamos qué estados ya fueron APROBADOS por el nivel Nacional
    formatos_aprobados = db.query(models.FormatoEstatalFirmado.entidad).filter(
        models.FormatoEstatalFirmado.quincena == periodo_str,
        models.FormatoEstatalFirmado.estado == models.EstadoReporte.APROBADO
    ).all()
    
    # Extraemos solo los nombres de los estados en una lista (Ej. ["BAJA CALIFORNIA", "SONORA"])
    estados_aprobados = [f[0] for f in formatos_aprobados]
    
    if not estados_aprobados:
        raise HTTPException(
            status_code=400, 
            detail="No se puede generar el reporte: Aún no hay ningún estado con Formato 2 APROBADO para esta quincena."
        )

    # 2. Traemos los registros SOLO de los estados aprobados
    registros = db.query(models.BitacoraEstatalValidada).filter(
        models.BitacoraEstatalValidada.quincena_validada == periodo_str,
        models.BitacoraEstatalValidada.entidad.in_(estados_aprobados) # <-- AQUÍ ESTÁ EL CANDADO
    ).order_by(
        models.BitacoraEstatalValidada.entidad, 
        models.BitacoraEstatalValidada.unidad_medica
    ).all()
    
    detalle = []
    for i, reg in enumerate(registros, start=1):
        detalle.append({
            "no": i,
            "unidad": reg.unidad_medica or "SIN UNIDAD",
            "entidad": reg.entidad,
            "clues": reg.clues_ib,
            "especialidad": reg.especialidad,
            "turno": reg.turno,
            "medico": reg.profesional_salud,
            "dias": reg.dias_participacion
        })
        
    return {
        "periodo": periodo_str,
        "anio": anio,
        "mes": mes,
        "quincena": quincena,
        "medicos": detalle
    }

@router.get("/nacional/formato4/{anio}/{mes}/{quincena}", tags=["Nacional"])
async def obtener_formato_4_nacional(anio: int, mes: int, quincena: int, db: Session = Depends(get_db)):
    periodo_str = f"{anio}-{mes:02d}-Q{quincena}"
    
    # 1. Buscamos qué estados ya fueron APROBADOS
    formatos_aprobados = db.query(models.FormatoEstatalFirmado.entidad).filter(
        models.FormatoEstatalFirmado.quincena == periodo_str,
        models.FormatoEstatalFirmado.estado == models.EstadoReporte.APROBADO
    ).all()
    
    estados_aprobados = [f[0] for f in formatos_aprobados]
    
    if not estados_aprobados:
        raise HTTPException(
            status_code=400, 
            detail="No se puede generar el resumen: Aún no hay ningún estado con Formato 2 APROBADO para esta quincena."
        )
    
    # 2. Le pedimos a PostgreSQL que cuente los médicos y sume los días SOLO de estados aprobados
    resultados = db.query(
        models.BitacoraEstatalValidada.entidad,
        func.count(models.BitacoraEstatalValidada.id).label("total_medicos"),
        func.sum(models.BitacoraEstatalValidada.dias_participacion).label("total_dias")
    ).filter(
        models.BitacoraEstatalValidada.quincena_validada == periodo_str,
        models.BitacoraEstatalValidada.entidad.in_(estados_aprobados) # <-- AQUÍ ESTÁ EL CANDADO
    ).group_by(
        models.BitacoraEstatalValidada.entidad
    ).order_by(
        models.BitacoraEstatalValidada.entidad
    ).all()
    
    detalle = []
    gran_total_medicos = 0
    gran_total_dias = 0
    
    for res in resultados:
        dias_validos = res.total_dias or 0
        detalle.append({
            "entidad": res.entidad,
            "medicos": res.total_medicos,
            "dias": dias_validos
        })
        gran_total_medicos += res.total_medicos
        gran_total_dias += dias_validos
        
    return {
        "periodo": periodo_str,
        "anio": anio,
        "mes": mes,
        "resumen": detalle,
        "gran_total_medicos": gran_total_medicos,
        "gran_total_dias": gran_total_dias
    }

@router.post("/nacional/subir-formato-nacional", tags=["Nacional"])
async def subir_formato_nacional(
    anio: int = Form(...),
    mes: int = Form(...),
    quincena: int = Form(...),
    subido_por: str = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not archivo.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El formato final debe ser un archivo PDF.")

    periodo_str = f"{anio}-{mes:02d}-Q{quincena}"

    # Verificamos si ya existe uno subido
    formato_existente = db.query(models.FormatoNacionalFirmado).filter(
        models.FormatoNacionalFirmado.quincena == periodo_str
    ).first()

    # Generar ruta única
    bucket_name = os.getenv('B2_BUCKET_NAME')
    nombre_unico = f"formatos_nacionales/{anio}/{mes:02d}/Q{quincena}/NACIONAL_FORMATO3y4.pdf"
    

    try:
        s3_client.upload_fileobj(archivo.file, bucket_name, nombre_unico, ExtraArgs={"ContentType": "application/pdf"})
        
        if formato_existente and formato_existente.url_documento:
            try: s3_client.delete_object(Bucket=bucket_name, Key=formato_existente.url_documento)
            except: pass
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir a la nube: {str(e)}")

    if formato_existente:
        formato_existente.url_documento = nombre_unico
        formato_existente.fecha_subida = func.now()
        formato_existente.subido_por = subido_por
    else:
        nuevo_formato = models.FormatoNacionalFirmado(
            quincena=periodo_str, url_documento=nombre_unico, subido_por=subido_por
        )
        db.add(nuevo_formato)

    db.commit()

    return {"mensaje": "Formato Nacional Firmado guardado con éxito"}

@router.get("/nacional/historial-formatos", tags=["Nacional"])
async def obtener_historial_nacional(db: Session = Depends(get_db)):
    # Traemos todos los formatos nacionales ordenados por fecha
    formatos = db.query(models.FormatoNacionalFirmado).order_by(
        desc(models.FormatoNacionalFirmado.fecha_subida)
    ).all()
    
    historial = []
    for f in formatos:
        historial.append({
            "id": f.id,
            "quincena": f.quincena,
            "fecha_subida": f.fecha_subida.strftime("%Y-%m-%d %H:%M") if f.fecha_subida else "Sin fecha",
            "subido_por": f.subido_por,
            "url_documento": f.url_documento
        })
        
    return historial

@router.get("/reporte-quincenal/estado-subidos/{anio}/{mes}/{quincena}", tags=["Responsable Unidad"])
async def obtener_estado_subidos(anio: str, mes: str, quincena: str, db: Session = Depends(get_db)):
    mes_formateado = mes.zfill(2) 
    periodo_buscado = f"{anio}-{mes_formateado}-Q{quincena}"
    
    reportes = db.query(models.ReporteQuincenal).filter(
        models.ReporteQuincenal.quincena == periodo_buscado
    ).all()
    
    estado_reportes = {}
    for rep in reportes:
        # Extraemos el valor del enum (PENDIENTE, APROBADO, RECHAZADO)
        estado_reportes[rep.id_imss] = {
            "estado": rep.estado.value if hasattr(rep.estado, 'value') else rep.estado,
            "observaciones": rep.observaciones
        }
        
    return estado_reportes

@router.post("/reporte-quincenal/rechazar/{id_reporte}", tags=["Coordinador Estatal"])
async def rechazar_reporte_unidad(id_reporte: int, req: RechazoRequest, db: Session = Depends(get_db)):
    # 1. Buscamos el reporte por su ID
    reporte = db.query(models.ReporteQuincenal).filter(models.ReporteQuincenal.id == id_reporte).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    
    # 2. Le cambiamos el semáforo y le guardamos el texto
    reporte.estado = models.EstadoReporte.RECHAZADO
    reporte.observaciones = req.observaciones
    
    db.commit()
    return {"mensaje": "Reporte rechazado. El Encargado de Unidad ha sido notificado."}

@router.post("/coordinador/rechazar-formato-estatal/{id_formato}", tags=["Nacional"])
async def rechazar_formato_estatal(id_formato: int, req: RechazoRequest, db: Session = Depends(get_db)):
    # 1. Buscamos el formato estatal por su ID
    formato = db.query(models.FormatoEstatalFirmado).filter(models.FormatoEstatalFirmado.id == id_formato).first()
    if not formato:
        raise HTTPException(status_code=404, detail="Formato estatal no encontrado")
    
    # 2. Le cambiamos el semáforo y le guardamos el texto
    formato.estado = models.EstadoReporte.RECHAZADO
    formato.observaciones = req.observaciones
    
    db.commit()
    return {"mensaje": "Formato estatal rechazado. El Coordinador ha sido notificado."}

@router.get("/nacional/estado-formatos/{anio}/{mes}/{quincena}", tags=["Nacional"])
async def obtener_estado_formatos_estatales(anio: int, mes: str, quincena: int, db: Session = Depends(get_db)):
    mes_formateado = str(mes).zfill(2)
    periodo_str = f"{anio}-{mes_formateado}-Q{quincena}"
    
    # Traemos todos los Formatos 2 subidos en esa quincena
    formatos = db.query(models.FormatoEstatalFirmado).filter(
        models.FormatoEstatalFirmado.quincena == periodo_str
    ).order_by(models.FormatoEstatalFirmado.entidad).all()
    
    # Devolvemos la lista limpia
    resultado = []
    for f in formatos:
        resultado.append({
            "id": f.id,
            "entidad": f.entidad,
            "url_documento": f.url_documento,
            "estado": f.estado.value if hasattr(f.estado, 'value') else f.estado,
            "observaciones": f.observaciones,
            "fecha_subida": f.fecha_subida.strftime("%Y-%m-%d %H:%M") if f.fecha_subida else "Sin fecha"
        })
        
    return resultado

@router.post("/nacional/aprobar-formato/{id_formato}", tags=["Nacional"])
async def aprobar_formato_estatal(id_formato: int, db: Session = Depends(get_db)):
    formato = db.query(models.FormatoEstatalFirmado).filter(models.FormatoEstatalFirmado.id == id_formato).first()
    if not formato:
        raise HTTPException(status_code=404, detail="Formato estatal no encontrado")
    
    formato.estado = models.EstadoReporte.APROBADO
    formato.observaciones = None # Limpiamos cualquier observación vieja
    
    db.commit()
    return {"mensaje": "Formato estatal aprobado y bloqueado para su generación."}

@router.get("/coordinador/reportes-validados/{entidad}/{periodo}", tags=["Coordinador Estatal"])
async def obtener_reportes_validados(entidad: str, periodo: str, db: Session = Depends(get_db)):
    entidad_limpia = entidad.upper().strip()
    
    # Traemos los registros de la bitácora estatal validada para ese periodo y entidad
    registros = db.query(models.BitacoraEstatalValidada).filter(
        models.BitacoraEstatalValidada.entidad == entidad_limpia,
        models.BitacoraEstatalValidada.quincena_validada == periodo
    ).order_by(models.BitacoraEstatalValidada.profesional_salud).all()
    
    validados = []
    for reg in registros:
        validados.append({
            "id_bitacora": reg.id,
            "id_reporte": reg.id_reporte_quincenal,
            "quincena": reg.quincena_validada,
            "clues": reg.clues_ib,
            "unidad": reg.unidad_medica,
            "medico": reg.profesional_salud,
            "id_imss": reg.id_imss,
            "especialidad": reg.especialidad,
            "turno": reg.turno,
            "dias": reg.dias_participacion
        })
        
    return validados

class RevocarRequest(BaseModel):
    observaciones: str

@router.post("/coordinador/revocar-reporte/{id_reporte}", tags=["Coordinador Estatal"])
async def revocar_reporte(id_reporte: int, req: RevocarRequest, db: Session = Depends(get_db)):
    # 1. Buscamos el reporte original que la unidad subió
    reporte_original = db.query(models.ReporteQuincenal).filter(models.ReporteQuincenal.id == id_reporte).first()
    if not reporte_original:
        raise HTTPException(status_code=404, detail="Reporte original no encontrado")
        
    # 2. Eliminamos el registro validado de la bitácora estatal
    db.query(models.BitacoraEstatalValidada).filter(
       models.BitacoraEstatalValidada.id_reporte_quincenal == id_reporte
    ).delete()
    
    # 3. Regresamos el reporte original a estado RECHAZADO y guardamos el regaño
    reporte_original.estado = models.EstadoReporte.RECHAZADO
    reporte_original.observaciones = req.observaciones
    
    db.commit()
    return {"mensaje": "Reporte revocado exitosamente y devuelto a la unidad."}

"""
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

"""
