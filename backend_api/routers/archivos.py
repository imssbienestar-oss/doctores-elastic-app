import traceback
import urllib.parse
from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
import firebase_admin
from firebase_admin import storage

from .. import models, schemas, security
from ..database import get_db as get_db_session
from ..services.firebase_service import upload_to_firebase, delete_from_firebase

router = APIRouter(tags=["Doctores - Archivos"])


@router.post("/api/doctores/{id_imss}/profile-picture", response_model=schemas.DoctorDetail)
async def subir_foto_perfil_doctor(
    id_imss: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")

    if db_doctor.foto_url:
        await delete_from_firebase(db_doctor.foto_url)
        db_doctor.foto_url = None
        try:
            db.commit()
        except Exception:
            db.rollback()

    destination_path = f"doctors/{id_imss}/profile_pictures"
    file_url = await upload_to_firebase(file, destination_path, optimize_image=True)

    if not file_url:
        raise HTTPException(status_code=500, detail="Error al subir la foto de perfil.")

    db_doctor.foto_url = file_url
    try:
        db.add(db_doctor)
        db.commit()
        db.refresh(db_doctor)

        attachments = db.query(models.DoctorAttachment).filter(
            models.DoctorAttachment.doctor_id == id_imss
        ).all()

        doctor_response = schemas.DoctorDetail.from_orm(db_doctor)
        doctor_response.attachments = [schemas.DoctorAttachment.from_orm(a) for a in attachments]
        return doctor_response
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al guardar info de foto.")


@router.post("/api/doctores/{id_imss}/attachments", response_model=schemas.DoctorAttachment)
async def subir_expediente_doctor(
    id_imss: str,
    file: UploadFile = File(...),
    documento_tipo: str = Form(...),
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado.")

    destination_path = f"doctors/{id_imss}/attachments"
    file_url = await upload_to_firebase(file, destination_path, optimize_image=False)

    if not file_url:
        raise HTTPException(status_code=500, detail="Error al subir el expediente.")

    attachment_data = schemas.DoctorAttachmentCreate(
        doctor_id=id_imss,
        file_name=file.filename,
        file_url=file_url,
        file_type=file.content_type,
        documento_tipo=documento_tipo
    )

    db_attachment = models.DoctorAttachment(
        **attachment_data.model_dump(exclude={'doctor_id'}),
        doctor_id=id_imss
    )

    try:
        db.add(db_attachment)
        db.commit()
        db.refresh(db_attachment)
        return db_attachment
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        if file_url:
            await delete_from_firebase(file_url)
        raise HTTPException(status_code=500, detail="Error al guardar el expediente en la BD.")


@router.get("/api/doctores/{id_imss}/attachments", response_model=List[schemas.DoctorAttachment])
async def listar_expedientes_doctor(
    id_imss: str,
    db: Session = Depends(get_db_session)
):
    db_doctor = db.query(models.Doctor).filter(models.Doctor.id_imss == id_imss).first()
    if not db_doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado.")

    attachments = db.query(models.DoctorAttachment).filter(
        models.DoctorAttachment.doctor_id == id_imss
    ).all()
    return attachments


@router.delete("/api/doctores/{id_imss}/attachments/{attachment_id}", status_code=status.HTTP_200_OK)
async def eliminar_expediente_doctor(
    id_imss: str,
    attachment_id: int,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    db_attachment = db.query(models.DoctorAttachment).filter(
        models.DoctorAttachment.id == attachment_id,
        models.DoctorAttachment.doctor_id == id_imss
    ).first()

    if not db_attachment:
        raise HTTPException(status_code=404, detail="Expediente no encontrado.")

    file_url_to_delete = db_attachment.file_url
    firebase_deleted = await delete_from_firebase(file_url_to_delete)

    if not firebase_deleted:
        raise HTTPException(status_code=500, detail="Error al eliminar el archivo del almacenamiento.")

    try:
        db.delete(db_attachment)
        db.commit()
        return {"detail": f"Expediente ID {attachment_id} eliminado."}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error al eliminar de la BD.")


@router.get("/api/attachments/{attachment_id}/signed-url", response_model=schemas.SignedUrlResponse)
async def get_signed_url_for_attachment(
    attachment_id: int,
    db: Session = Depends(get_db_session)
):
    attachment = db.query(models.DoctorAttachment).filter(
        models.DoctorAttachment.id == attachment_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Archivo no encontrado.")

    try:
        firebase_app = firebase_admin.get_app()
        firebase_bucket = storage.bucket(app=firebase_app)
        bucket_name = firebase_bucket.name
        file_url = attachment.file_url

        # Extraer ruta del objeto según el formato de URL
        if '/o/' in file_url:
            object_path = urllib.parse.unquote(file_url.split('/o/')[1].split('?')[0])
        elif f'https://storage.googleapis.com/{bucket_name}/' in file_url:
            object_path = file_url.split(f'https://storage.googleapis.com/{bucket_name}/', 1)[1]
        elif file_url.startswith(f'gs://{bucket_name}/'):
            object_path = file_url.replace(f'gs://{bucket_name}/', '', 1)
        else:
            object_path = file_url

        blob = firebase_bucket.blob(object_path)
        signed_url = blob.generate_signed_url(
            expiration=timedelta(minutes=15),
            method='GET',
            version="v4"
        )
        return {"signed_url": signed_url}

    except IndexError:
        raise HTTPException(status_code=500, detail="URL del archivo inválida.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar URL firmada: {str(e)}")