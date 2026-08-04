import calendar
import traceback
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, or_, and_
from sqlalchemy.exc import IntegrityError

from .. import models, schemas, security
from ..database import get_db as get_db_session
from ..config import USER_TIMEZONE, MESES_ES
from ..cache import count_cache, generate_cache_key
from ..services.audit_service import log_action

router = APIRouter(tags=["Doctores"])


@router.get("/api/doctores", response_model=schemas.DoctoresPaginados)
async def leer_doctores(
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=200),
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    estatus: Optional[str] = Query("01 ACTIVO", min_length=1, max_length=50),
    coordinacion: Optional[str] = Query("todos"),
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user) # Exigimos usuario
):
    query = db.query(models.Doctor).filter(models.Doctor.is_deleted == False)
    
    user_clues = "todas"
    rol_usuario = getattr(current_user, "rol", "")

    if rol_usuario == "responsable_unidad":
        if not current_user.clues:
            raise HTTPException(status_code=403, detail="Tu usuario no tiene una CLUES asignada.")
        
        query = query.filter(models.Doctor.clues == current_user.clues)
        user_clues = current_user.clues # Para el caché

    elif rol_usuario == "coordinador_estatal":
        if not current_user.entidad:
            raise HTTPException(status_code=403, detail="Tu usuario no tiene una Entidad asignada.")
        
        query = query.filter(models.Doctor.entidad == current_user.entidad)
        user_clues = current_user.entidad # Para el caché


    if coordinacion != "todos":
        query = query.filter(models.Doctor.coordinacion == coordinacion)

    if search and search.strip():
        search_words = search.strip().split()
        for word in search_words:
            term = f"%{word}%"
            query = query.filter(
                and_(
                    or_(
                        models.Doctor.nombre.ilike(term),
                        models.Doctor.apellido_paterno.ilike(term),
                        models.Doctor.apellido_materno.ilike(term),
                        models.Doctor.id_imss.ilike(term),
                        models.Doctor.matrimonio_id.ilike(term),
                        models.Doctor.clues.ilike(term)
                    )
                )
            )

    if estatus and estatus.lower() != "todos":
        query = query.filter(
            func.upper(func.trim(models.Doctor.estatus)) == estatus.strip().upper()
        )

    use_cache = not search
    total_count = None

    if use_cache:
        count_key = generate_cache_key("doctores_count", estatus=estatus or "todos", coordinacion=coordinacion, clues=user_clues)
        total_count = count_cache.get(count_key)

    if total_count is None:
        try:
            total_count = query.count()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al contar doctores: {str(e)}")
        if use_cache:
            count_cache.set(count_key, total_count, ttl=300)

    doctores = query.order_by(models.Doctor.id_imss).offset(skip).limit(limit).all()
    return {"total_count": total_count, "doctores": doctores}


@router.get("/api/doctores/detalles_filtrados", response_model=List[schemas.DoctorDetalleItem])
async def obtener_detalles_doctores_filtrados(
    db: Session = Depends(get_db_session),
    entidad: Optional[str] = Query(None),
    nombre_unidad: Optional[str] = Query(None),
    especialidad: Optional[str] = Query(None),
    nivel_atencion: Optional[str] = Query(None),
    estatus: Optional[str] = Query(None),
    tipo: str = Query("medicos"),
    search: Optional[str] = Query(None)
):
    filtro_coord = '1' if tipo == "administrativos" else '0'
    query = db.query(models.Doctor).filter(
        models.Doctor.is_deleted == False,
        models.Doctor.coordinacion == filtro_coord
    )

    if entidad:
        query = query.filter(models.Doctor.entidad == entidad)
    if nombre_unidad:
        query = query.filter(models.Doctor.nombre_unidad == nombre_unidad)
    if especialidad:
        query = query.filter(models.Doctor.especialidad == especialidad)
    if nivel_atencion:
        query = query.filter(models.Doctor.nivel_atencion == nivel_atencion)
    if estatus:
        query = query.filter(models.Doctor.estatus == estatus)

    if search and search.strip():
        search_words = search.strip().split()
        for word in search_words:
            term = f"%{word}%"
            query = query.filter(
                and_(
                    or_(
                        models.Doctor.clues.ilike(term),
                        models.Doctor.id_imss.ilike(term),
                        models.Doctor.nombre.ilike(term),
                        models.Doctor.apellido_paterno.ilike(term),
                        models.Doctor.apellido_materno.ilike(term)
                    )
                )
            )

    doctores_filtrados = query.order_by(models.Doctor.nombre.asc()).all()

    resultado = []
    for doc in doctores_filtrados:
        resultado.append({
            "id_imss": doc.id_imss,
            "nombre_completo": f"{doc.nombre or ''} {doc.apellido_paterno or ''} {doc.apellido_materno or ''}".strip(),
            "entidad": doc.entidad or "N/A",
            "nombre_unidad": doc.nombre_unidad or "N/A",
            "especialidad": doc.especialidad or "N/A",
            "nivel_atencion": doc.nivel_atencion or "N/A",
            "estatus": doc.estatus or "N/A",
            "clues": doc.clues or "N/A"
        })

    return resultado


@router.get("/api/doctores/alertas-vencimiento", response_model=List[schemas.AlertaVencimiento])
async def get_alertas_de_vencimiento(db: Session = Depends(get_db_session)):
    now_aware = datetime.now(USER_TIMEZONE)
    hoy_inicio = now_aware.replace(hour=0, minute=0, second=0, microsecond=0)
    fecha_actual = hoy_inicio.date()

    estatus_temporales = [
        "02 RETIRO TEMP%", "03 RETIRO TEMP%", "04 SOL. PERSONAL%", "05 INCAPACIDAD%"
    ]

    doctores = db.query(models.Doctor).filter(
        and_(
            or_(*[models.Doctor.estatus.ilike(p) for p in estatus_temporales]),
            models.Doctor.fecha_fin.isnot(None),
            models.Doctor.is_deleted == False
        )
    ).order_by(models.Doctor.fecha_fin.asc()).all()

    respuesta = []
    for doc in doctores:
        fecha_fin = doc.fecha_fin
        if isinstance(fecha_fin, datetime):
            fecha_fin = fecha_fin.date()
        dias_restantes = (fecha_fin - fecha_actual).days
        respuesta.append({
            "id_imss": doc.id_imss,
            "nombre_completo": f"{doc.nombre or ''} {doc.apellido_paterno or ''} {doc.apellido_materno or ''}".strip(),
            "estatus": doc.estatus,
            "entidad": doc.entidad,
            "fecha_fin": doc.fecha_fin,
            "dias_restantes": dias_restantes
        })

    return respuesta


@router.get("/api/doctores/{id_imss}", response_model=schemas.DoctorDetail)
async def leer_doctor_por_id(id_imss: str, db: Session = Depends(get_db_session), current_user: models.User = Depends(security.get_current_user)
):
    db_doctor = db.query(models.Doctor).options(
        selectinload(models.Doctor.attachments),
        selectinload(models.Doctor.historial)
    ).filter(func.upper(models.Doctor.id_imss) == func.upper(id_imss)).first()

    if db_doctor is None:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    rol_usuario = getattr(current_user, "rol", "")
    
    if rol_usuario == "responsable_unidad":
        if db_doctor.clues != current_user.clues:
            raise HTTPException(
                status_code=403, 
                detail="Acceso denegado: El médico consultado no está adscrito a tu Unidad Médica."
            )
            
    elif rol_usuario == "coordinador_estatal":
        if db_doctor.entidad != current_user.entidad:
            raise HTTPException(
                status_code=403, 
                detail="Acceso denegado: El médico consultado no pertenece a tu Entidad Federativa."
            )
   
    historial_con_usuario = []
    if db_doctor.historial:
        for item in db_doctor.historial:
            item_data = schemas.EstatusHistoricoItem.model_validate(item).model_dump()
            ventana = timedelta(seconds=30)
            tiempo_registro = item.fecha_registro

            possible_actions = ['%Actualizar%', 'Crear Registro']
            if item.comentarios == "Registro inicial en el sistema.":
                possible_actions = ['Crear Registro', '%Actualizar%']

            audit_entry = db.query(models.AuditLog).filter(
                models.AuditLog.target_id_str == item.id_imss,
                or_(*[models.AuditLog.action_type.like(p) for p in possible_actions]),
                models.AuditLog.timestamp >= tiempo_registro - ventana,
                models.AuditLog.timestamp <= tiempo_registro + ventana
            ).order_by(
                func.abs(func.extract('epoch', models.AuditLog.timestamp - tiempo_registro))
            ).first()

            item_data['username'] = audit_entry.username if audit_entry else "Sistema"
            historial_con_usuario.append(schemas.EstatusHistoricoItem(**item_data))

        historial_con_usuario.sort(key=lambda x: x.fecha_inicio, reverse=True)

    doctor_attrs = {
        k: v for k, v in db_doctor.__dict__.items()
        if not k.startswith('_sa_') and k not in ['attachments', 'historial']
    }

    return schemas.DoctorDetail(
        **doctor_attrs,
        attachments=db_doctor.attachments,
        historial=historial_con_usuario
    )


@router.post("/api/doctores", response_model=schemas.DoctorDetail, status_code=status.HTTP_201_CREATED)
async def crear_doctor(
    doctor_data: schemas.DoctorCreate,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):

    rol_usuario = getattr(current_user, "role", getattr(current_user, "rol", ""))
    if rol_usuario in ["responsable_unidad", "asistencia"]:
        raise HTTPException(
            status_code=403, 
            detail="Acceso Denegado: Los encargados de unidad no tienen permisos para dar de alta nuevos médicos."
        )
    
    try:
        doctor_dict = doctor_data.model_dump()

        if doctor_dict.get("fecha_estatus"):
            doctor_dict['fecha_vuelo'] = doctor_dict['fecha_estatus']

        if 'coordinacion' not in doctor_dict or doctor_dict['coordinacion'] is None:
            doctor_dict['coordinacion'] = '0'

        if doctor_dict.get('curp'):
            existe_curp = db.query(models.Doctor).filter(models.Doctor.curp == doctor_dict['curp']).first()
            if existe_curp:
                raise HTTPException(status_code=409, detail=f"CURP '{doctor_dict['curp']}' ya registrado.")

        existe_id = db.query(models.Doctor).filter(models.Doctor.id_imss == doctor_dict['id_imss']).first()
        if existe_id:
            raise HTTPException(status_code=409, detail=f"ID IMSS '{doctor_dict['id_imss']}' ya registrado.")

        db_doctor = models.Doctor(**doctor_dict)
        db.add(db_doctor)

        fecha_inicio = db_doctor.fecha_estatus or date.today()

        nuevo_historial = models.EstatusHistorico(
            id_imss=db_doctor.id_imss,
            tipo_cambio="Estatus",
            estatus=db_doctor.estatus,
            fecha_inicio=fecha_inicio,
            comentarios="Registro inicial en el sistema.",
            clues=db_doctor.clues,
            entidad=db_doctor.entidad,
            nombre_unidad=db_doctor.nombre_unidad,
            turno=db_doctor.turno
        )

        cupo = db.query(models.EntidadCupos).filter(models.EntidadCupos.entidad == db_doctor.entidad).first()
        if cupo:
            conteo = db.query(models.Doctor).filter(
                models.Doctor.entidad == db_doctor.entidad,
                models.Doctor.is_deleted == False,
                models.Doctor.estatus == '01 ACTIVO',
                models.Doctor.coordinacion != '1'
            ).count()
            if conteo >= cupo.maximo:
                raise HTTPException(status_code=409, detail=f"Entidad {db_doctor.entidad} alcanzó cupo máximo de {cupo.maximo}.")

        db.add(nuevo_historial)
        db.flush()

        log_action(db, current_user, "Crear Registro", "Doctor", target_id_str=db_doctor.id_imss,
                   details=f"Doctor creado: {db_doctor.nombre}")
        db.commit()
        db.refresh(db_doctor)
        db.refresh(nuevo_historial)

        count_cache.invalidate("total_q")
        count_cache.invalidate("universo_total")
        count_cache.invalidate("doctores_count")
        count_cache.invalidate("dashboard")
        count_cache.invalidate("estadistica")
        count_cache.invalidate("estadistica_count")
        count_cache.invalidate("cedulas")

        doctor_completo = db.query(models.Doctor).options(
            selectinload(models.Doctor.historial)
        ).filter(models.Doctor.id_imss == db_doctor.id_imss).first()

        historial_con_usuario = []
        if doctor_completo and doctor_completo.historial:
            for item in doctor_completo.historial:
                item_data = schemas.EstatusHistoricoItem.model_validate(item).model_dump()
                ventana = timedelta(seconds=30)
                tiempo_reg = item.fecha_registro
                possible_actions = ['Crear Registro', '%Actualizar%']

                audit_entry = db.query(models.AuditLog).filter(
                    models.AuditLog.target_id_str == item.id_imss,
                    or_(*[models.AuditLog.action_type.like(p) for p in possible_actions]),
                    models.AuditLog.timestamp >= tiempo_reg - ventana,
                    models.AuditLog.timestamp <= tiempo_reg + ventana
                ).order_by(
                    func.abs(func.extract('epoch', models.AuditLog.timestamp - tiempo_reg))
                ).first()

                item_data['username'] = audit_entry.username if audit_entry else "Sistema"
                historial_con_usuario.append(schemas.EstatusHistoricoItem(**item_data))

            historial_con_usuario.sort(key=lambda x: x.fecha_inicio, reverse=True)

        doctor_attrs = {
            k: v for k, v in doctor_completo.__dict__.items()
            if not k.startswith('_sa_') and k not in ['attachments', 'historial']
        } if doctor_completo else {}

        return schemas.DoctorDetail(
            **doctor_attrs,
            attachments=doctor_completo.attachments if doctor_completo else [],
            historial=historial_con_usuario
        )

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Error de integridad, posible ID o CURP duplicado.")
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error inesperado: {str(e)}")


@router.put("/api/doctores/{id_imss}", response_model=schemas.DoctorDetail)
async def actualizar_doctor_perfil_completo(
    id_imss: str,
    doctor_update_data: schemas.DoctorProfileUpdateSchema = Body(...),
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role == 'consulta':
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar datos.")

    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if db_doctor is None:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    original_estatus = db_doctor.estatus
    original_clues = db_doctor.clues
    original_turno = db_doctor.turno

    update_data = doctor_update_data.model_dump(exclude_unset=True)
    changed_fields = []

    for key, new_value in update_data.items():
        if hasattr(db_doctor, key):
            old_value = getattr(db_doctor, key)
            if str(old_value) != str(new_value):
                changed_fields.append(key)
            setattr(db_doctor, key, new_value)

    if 'curp' in update_data and db_doctor.curp == '':
        db_doctor.curp = None
    if 'comentarios_estatus' in update_data and db_doctor.comentarios_estatus == '':
        db_doctor.comentarios_estatus = None

    if db_doctor.estatus != "06 BAJA":
        db_doctor.motivo_baja = None
    if db_doctor.estatus != "Defunción":
        db_doctor.fecha_fallecimiento = None

    if db_doctor.estatus == "01 ACTIVO":
        for campo in ["notificacion_baja", "fecha_extraccion", "fecha_notificacion"]:
            if hasattr(db_doctor, campo) and getattr(db_doctor, campo) is not None:
                setattr(db_doctor, campo, None)

    ESTATUS_REQUIEREN_FECHA_FIN = [
        '02 RETIRO TEMP. (CUBA)', '03 RETIRO TEMP. (MEXICO)',
        '04 SOL. PERSONAL', '05 INCAPACIDAD'
    ]

    if db_doctor.estatus in ESTATUS_REQUIEREN_FECHA_FIN and not db_doctor.fecha_fin:
        db.rollback()
        raise HTTPException(status_code=422, detail="La fecha de fin es obligatoria para este estatus.")

    try:
        if 'curp' in update_data and db_doctor.curp:
            existe = db.query(models.Doctor).filter(
                models.Doctor.curp == db_doctor.curp,
                models.Doctor.id_imss != id_imss
            ).first()
            if existe:
                raise HTTPException(status_code=409, detail=f"CURP '{db_doctor.curp}' ya registrado.")

        cambio_estatus = 'estatus' in update_data and db_doctor.estatus != original_estatus
        cambio_clues = 'clues' in update_data and db_doctor.clues != original_clues
        cambio_turno = 'turno' in update_data and db_doctor.turno != original_turno

        if cambio_estatus or cambio_clues or cambio_turno:
            tipos = []
            comentarios = ["Registro de Expediente."]

            if cambio_estatus:
                tipos.append("Estatus")
                comentarios.append(f"Estatus anterior: '{original_estatus}'.")
            if cambio_clues and cambio_turno:
                tipos.append("Redistribución y Turno")
                comentarios.append(f"CLUES anterior: {original_clues}, Turno anterior: '{original_turno}'.")
            elif cambio_clues:
                tipos.append("Redistribución")
                comentarios.append(f"CLUES anterior: {original_clues}.")
            elif cambio_turno:
                tipos.append("Turno")
                comentarios.append(f"Turno anterior: '{original_turno}'.")

            tipo_cambio = " / ".join(tipos)
            comentario_final = " ".join(comentarios)

            fecha_inicio = date.today()
            if cambio_estatus and db_doctor.fecha_estatus:
                fecha_inicio = db_doctor.fecha_estatus
            elif (cambio_clues or cambio_turno) and db_doctor.fecha_aplicacion_cambio:
                fecha_inicio = db_doctor.fecha_aplicacion_cambio

            nuevo_registro = models.EstatusHistorico(
                id_imss=id_imss,
                tipo_cambio=tipo_cambio,
                estatus=db_doctor.estatus,
                fecha_inicio=fecha_inicio,
                fecha_fin=db_doctor.fecha_fin if cambio_estatus else None,
                clues=db_doctor.clues,
                entidad=db_doctor.entidad,
                nombre_unidad=db_doctor.nombre_unidad,
                turno=db_doctor.turno,
                comentarios=comentario_final,
                comentarios_estatus=update_data.get('comentarios_estatus', db_doctor.comentarios_estatus)
            )
            db.add(nuevo_registro)

        details = f"Se actualizó: {db_doctor.nombre}: {', '.join(changed_fields)}." if changed_fields else "Sin cambios detectados."
        log_action(db=db, user=current_user, action_type="Actualizar Registro",
                   target_entity="Doctor", target_id_str=id_imss, details=details)

        db.commit()
        db.refresh(db_doctor)

        count_cache.invalidate("total_q")
        count_cache.invalidate("doctores_count")
        count_cache.invalidate("dashboard")
        count_cache.invalidate("estadistica")
        count_cache.invalidate("estadistica_count")
        count_cache.invalidate("cedulas")
        if cambio_estatus:
            count_cache.invalidate("universo_total")

        return db_doctor

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Error de integridad.")
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error inesperado: {str(e)}")


@router.delete("/api/doctores/{id_imss}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_doctor(
    id_imss: str,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    db_doctor = db.query(models.Doctor).filter(
        models.Doctor.id_imss == id_imss,
        models.Doctor.is_deleted == False
    ).first()

    if db_doctor is None:
        raise HTTPException(status_code=404, detail="Doctor no encontrado o ya eliminado.")

    try:
        db_doctor.is_deleted = True
        db_doctor.deleted_at = datetime.now(timezone.utc)
        db_doctor.deleted_by_user_id = current_user.id

        log_action(db, current_user, "Eliminar Registro", "Doctor", target_id_str=id_imss,
                   details=f"Médico eliminado: {db_doctor.nombre} (ID: {db_doctor.id_imss})")
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar: {str(e)}")


@router.delete("/api/doctores/{id_imss}/permanent")
async def eliminar_doctor_permanentemente(
    id_imss: str,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        doctor = db.query(models.Doctor).filter(
            models.Doctor.id_imss == id_imss,
            models.Doctor.is_deleted == True
        ).first()

        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor no encontrado o no está eliminado.")

        db.delete(doctor)
        db.commit()

        log_action(db, current_user, "Eliminación permanente", "Doctor", id_imss,
                   f"Doctor eliminado permanentemente: {doctor.nombre}")
        return {"message": "Doctor eliminado permanentemente."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/api/doctores/{id_imss}/asistencia_anual")
async def obtener_asistencia_anual(id_imss: str, db: Session = Depends(get_db_session)):
    historial_completo = db.query(models.EstatusHistorico).filter(
        models.EstatusHistorico.id_imss == id_imss
    ).order_by(models.EstatusHistorico.fecha_inicio.asc(), models.EstatusHistorico.id.asc()).all()

    meses_data = []
    hoy = date.today()

    for i in range(11, -1, -1):
        mes_evaluado = hoy.month - i
        anio_evaluado = hoy.year
        while mes_evaluado <= 0:
            mes_evaluado += 12
            anio_evaluado -= 1

        primer_dia = date(anio_evaluado, mes_evaluado, 1)
        dias_del_mes = calendar.monthrange(anio_evaluado, mes_evaluado)[1]
        ultimo_dia_mes = date(anio_evaluado, mes_evaluado, dias_del_mes)
        limite_superior = hoy if (anio_evaluado == hoy.year and mes_evaluado == hoy.month) else ultimo_dia_mes

        nombre_mes = f"{MESES_ES[mes_evaluado]} {anio_evaluado}"
        dias_activos = 0

        for idx, reg in enumerate(historial_completo):
            if reg.estatus == "01 ACTIVO":
                inicio_real = max(primer_dia, reg.fecha_inicio)
                fin_calculado = reg.fecha_fin
                fue_cortado = False

                if not fin_calculado:
                    if idx + 1 < len(historial_completo):
                        fin_calculado = historial_completo[idx + 1].fecha_inicio
                        fue_cortado = True
                    else:
                        fin_calculado = limite_superior
                else:
                    fue_cortado = True

                fin_real = min(limite_superior, fin_calculado)

                if inicio_real <= fin_real:
                    dias_tramo = (fin_real - inicio_real).days
                    if not fue_cortado or fin_calculado > limite_superior:
                        dias_tramo += 1
                    dias_activos += dias_tramo

        dias_tope = limite_superior.day if (anio_evaluado == hoy.year and mes_evaluado == hoy.month) else dias_del_mes
        dias_activos = min(dias_activos, dias_tope)

        meses_data.append({
            "mes": nombre_mes,
            "dias_activos": dias_activos,
            "dias_mes": dias_tope
        })

    return meses_data


@router.get("/api/doctores/check-curp/{curp_valor}", response_model=schemas.CurpCheckResponse)
async def verificar_curp_existente(curp_valor: str, db: Session = Depends(get_db_session)):
    if not curp_valor or len(curp_valor) != 18:
        raise HTTPException(status_code=400, detail="Formato de CURP inválido.")

    existe = db.query(models.Doctor).filter(
        models.Doctor.curp == curp_valor.upper(),
        models.Doctor.is_deleted == False
    ).first()

    if existe:
        return {"exists": True, "message": "Este CURP ya está registrado."}
    return {"exists": False, "message": "CURP disponible."}


@router.post("/api/doctores/{id_imss}/historial", response_model=schemas.EstatusHistoricoItem, tags=["Doctores - Historial"])
async def crear_registro_historial(
    id_imss: str,
    historial_data: schemas.EstatusHistoricoCreate,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    historial_dict = historial_data.model_dump()
    if not historial_dict.get("comentarios"):
        historial_dict["comentarios"] = "Registro retroactivo."

    nuevo_registro = models.EstatusHistorico(id_imss=id_imss, **historial_dict)
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)

    count_cache.invalidate("dashboard")
    count_cache.invalidate("estadistica")

    return nuevo_registro