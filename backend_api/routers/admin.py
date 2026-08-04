from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import distinct
from typing import List, Optional
from datetime import date, datetime, timedelta
import pytz
import traceback
import logging

from .. import models, schemas, security
from ..database import get_db as get_db_session
from ..config import USER_TIMEZONE, SUPER_ADMIN_PIN_HASH, Generic_pass, pwd_context
from ..services.audit_service import log_action

router = APIRouter()


# helper local para no repetir
def _verificar_no_consulta(current_user: models.User):
    if current_user.role == 'consulta':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para modificar datos."
        )


# ── GESTIÓN DE USUARIOS ──

@router.get("/api/admin/users", response_model=List[schemas.UserAdminView], tags=["Admin - Usuarios"])
async def admin_leer_usuarios(
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
    _verificar_no_consulta(current_user)
    users = db.query(models.User).order_by(models.User.id).all()
    return users


@router.post("/api/admin/users/register", response_model=schemas.UserAdminView, status_code=status.HTTP_201_CREATED, tags=["Admin - Usuarios"])
async def admin_crear_usuario(
    user_data: schemas.UserCreateAdmin,
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
    _verificar_no_consulta(current_user)

    existing_user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nombre de usuario ya existe.")
    
    valid_roles = ["user", "admin", "consulta"]
    if user_data.role not in valid_roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol inválido.")
    
    hashed_password = security.get_password_hash(Generic_pass)
    db_user = models.User(
        username=user_data.username,
        hashed_password=hashed_password,
        role=user_data.role,
        must_change_password=True
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al crear usuario.")


@router.delete("/api/admin/users/{user_id}", status_code=status.HTTP_200_OK, tags=["Admin - Usuarios"])
async def admin_eliminar_usuario(
    user_id: int,
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
    _verificar_no_consulta(current_user)

    if current_admin.id == user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes eliminarte a ti mismo.")
    
    user_to_delete = db.query(models.User).filter(models.User.id == user_id).first()
    if user_to_delete is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    
    try:
        db.delete(user_to_delete)
        db.commit()
        return {"detail": f"Usuario '{user_to_delete.username}' eliminado."}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al eliminar usuario.")


@router.put("/api/admin/users/{user_id}/reset-password", status_code=status.HTTP_200_OK, tags=["Admin - Usuarios"])
async def admin_reset_password(
    user_id: int,
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
    _verificar_no_consulta(current_user)

    user_to_update = db.query(models.User).filter(models.User.id == user_id).first()
    if user_to_update is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    new_hashed_password = security.get_password_hash(Generic_pass)
    
    try:
        user_to_update.hashed_password = new_hashed_password
        user_to_update.must_change_password = True
        db.add(user_to_update)
        db.commit()
        return {"detail": f"Contraseña para '{user_to_update.username}' restablecida."}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al resetear contraseña.")


# ── AUDITORÍA ──

@router.get("/api/admin/audit-logs", response_model=schemas.AuditLogsPaginados, tags=["Admin - Auditoría"])
async def leer_logs_auditoria(
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    username: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    current_user: models.User = Depends(security.get_current_user)
):
    _verificar_no_consulta(current_user)

    logs_query = db.query(models.AuditLog)

    if username:
        logs_query = logs_query.filter(models.AuditLog.username == username)
    if action_type:
        logs_query = logs_query.filter(models.AuditLog.action_type == action_type)

    if start_date:
        local_start = datetime.combine(start_date, datetime.min.time())
        local_start_aware = USER_TIMEZONE.localize(local_start)
        start_utc = local_start_aware.astimezone(pytz.utc)
        logs_query = logs_query.filter(models.AuditLog.timestamp >= start_utc)

    if end_date:
        local_end = datetime.combine(end_date + timedelta(days=1), datetime.min.time())
        local_end_aware = USER_TIMEZONE.localize(local_end)
        end_utc = local_end_aware.astimezone(pytz.utc)
        logs_query = logs_query.filter(models.AuditLog.timestamp < end_utc)

    try:
        total_count = logs_query.count()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el conteo de logs: {str(e)}")

    logs = logs_query.order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return {"total_count": total_count, "audit_logs": logs}


@router.delete("/api/admin/audit-logs/bulk-delete", status_code=status.HTTP_200_OK, tags=["Admin - Auditoría"])
async def eliminar_logs_auditoria_en_lote(
    request_data: schemas.AuditLogBulkDeleteRequest,
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user)
):
    if not SUPER_ADMIN_PIN_HASH:
        logging.error("SUPER_ADMIN_PIN_HASH no configurado.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Función no disponible.")

    if not request_data.pin or not pwd_context.verify(request_data.pin, SUPER_ADMIN_PIN_HASH):
        logging.warning(f"PIN incorrecto de {current_admin.username}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PIN incorrecto.")

    if not request_data.ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se proporcionaron IDs.")

    try:
        num_eliminados = db.query(models.AuditLog).filter(
            models.AuditLog.id.in_(request_data.ids)
        ).delete(synchronize_session=False)
        db.commit()
        logging.info(f"Admin {current_admin.username} eliminó {num_eliminados} logs.")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        logging.exception(f"Error eliminando logs: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error: {str(e)}")


@router.get("/api/admin/audit-log-options/users", response_model=List[str], tags=["Admin - Auditoría Opciones"])
async def leer_usuarios_unicos_auditoria(
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user)
):
    try:
        result = db.query(distinct(models.AuditLog.username)).all()
        users = [r[0] for r in result if r[0] is not None]
        return sorted(list(set(users)))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/api/admin/audit-log-options/actions", response_model=List[str], tags=["Admin - Auditoría Opciones"])
async def leer_acciones_unicas_auditoria(
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user)
):
    try:
        result = db.query(distinct(models.AuditLog.action_type)).all()
        actions = [r[0] for r in result if r[0] is not None]
        return sorted(list(set(actions)))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ── DOCTORES ELIMINADOS / RESTAURAR ──

@router.get("/api/admin/doctores/eliminados", response_model=schemas.DoctoresPaginados, tags=["Admin - Auditoría"])
async def leer_doctores_eliminados(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
    _verificar_no_consulta(current_user)

    base_query = db.query(models.Doctor).filter(models.Doctor.is_deleted == True)
    total_count = base_query.count()

    doctores = base_query.options(
        selectinload(models.Doctor.deleted_by_user_obj)
    ).order_by(models.Doctor.deleted_at.desc()).offset(skip).limit(limit).all()

    response = []
    for doc in doctores:
        doc_schema = schemas.Doctor.from_orm(doc)
        if doc.deleted_by_user_obj and hasattr(doc.deleted_by_user_obj, 'username'):
            doc_schema.deleted_by_username = doc.deleted_by_user_obj.username
        else:
            doc_schema.deleted_by_username = "Desconocido"
        response.append(doc_schema)

    return {"total_count": total_count, "doctores": response}


@router.post("/api/admin/doctores/{id_imss}/restore", response_model=schemas.Doctor, tags=["Admin - Auditoría"])
async def restaurar_doctor(
    id_imss: str,
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user),
    current_user: models.User = Depends(security.get_current_user)
):
    _verificar_no_consulta(current_user)

    db_doctor = db.query(models.Doctor).filter(
        models.Doctor.id_imss == id_imss,
        models.Doctor.is_deleted == True
    ).first()

    if db_doctor is None:
        activo = db.query(models.Doctor).filter(
            models.Doctor.id_imss == id_imss,
            models.Doctor.is_deleted == False
        ).first()
        if activo:
            raise HTTPException(status_code=400, detail="El doctor no está eliminado.")
        raise HTTPException(status_code=404, detail="Doctor eliminado no encontrado.")

    try:
        db_doctor.is_deleted = False
        db_doctor.deleted_at = None
        log_action(db, current_admin, "Restaurar Registro", "Doctor", id_imss,
                   f"Registro restaurado: {db_doctor.nombre} (ID: {db_doctor.id_imss})")
        db.commit()
        db.refresh(db_doctor)
        return db_doctor
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al restaurar: {str(e)}")


@router.delete("/api/admin/doctores/permanent-delete-bulk", status_code=status.HTTP_204_NO_CONTENT, tags=["Admin - Doctores"])
async def admin_eliminar_doctores_permanentemente_bulk(
    request_data: schemas.DoctorPermanentDeleteRequest,
    db: Session = Depends(get_db_session),
    current_admin: models.User = Depends(security.get_current_admin_user)
):
    if not SUPER_ADMIN_PIN_HASH:
        logging.error("SUPER_ADMIN_PIN_HASH no configurado.")
        raise HTTPException(status_code=500, detail="Función no disponible.")

    if not request_data.pin or not pwd_context.verify(request_data.pin, SUPER_ADMIN_PIN_HASH):
        logging.warning(f"PIN incorrecto de {current_admin.username}")
        raise HTTPException(status_code=403, detail="PIN incorrecto.")

    if not request_data.ids:
        raise HTTPException(status_code=400, detail="No se proporcionaron IDs.")

    doctores_a_eliminar = []
    no_encontrados = []

    for doctor_id in request_data.ids:
        doctor = db.query(models.Doctor).filter(
            models.Doctor.id_imss == doctor_id,
            models.Doctor.is_deleted == True
        ).first()
        if not doctor:
            no_encontrados.append(doctor_id)
        else:
            doctores_a_eliminar.append(doctor)

    if no_encontrados:
        db.rollback()
        raise HTTPException(status_code=404, detail=f"No encontrados: {no_encontrados}")

    if not doctores_a_eliminar:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    try:
        nombres = [d.nombre for d in doctores_a_eliminar]
        for d in doctores_a_eliminar:
            db.delete(d)
        db.commit()

        log_action(db, current_admin, "Eliminación permanente en bloque", "Doctor", None,
                   f"{len(doctores_a_eliminar)} doctores: {', '.join(nombres)}")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        logging.exception(f"Error en eliminación permanente: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")