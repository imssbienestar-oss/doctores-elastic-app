from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import distinct, func, or_, and_

from .. import models, schemas, security
from ..database import get_db as get_db_session

router = APIRouter(tags=["Catálogos"])


@router.get("/api/clues/{clues_code}", response_model=schemas.CluesData)
async def get_clues_data(clues_code: str, db: Session = Depends(get_db_session)):
    clues_info = db.query(models.CatalogoClues).filter(models.CatalogoClues.clues == clues_code).first()

    if not clues_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CLUES no encontrada en el catálogo.")

    return clues_info


@router.get("/api/clues-con-capacidad/{clues_code}", response_model=schemas.CluesConCapacidad)
async def get_clues_data_with_capacity(clues_code: str, db: Session = Depends(get_db_session)):
    clues_info = db.query(models.CatalogoClues).filter(models.CatalogoClues.clues == clues_code).first()

    if not clues_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CLUES no encontrada.")

    entidad_de_clues = clues_info.entidad
    cupo_info = db.query(models.EntidadCupos).filter(models.EntidadCupos.entidad == entidad_de_clues).first()

    if not cupo_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No hay datos de cupo para {entidad_de_clues}.")

    conteo_actual = db.query(models.Doctor).filter(
        models.Doctor.entidad == entidad_de_clues,
        models.Doctor.is_deleted == False,
        models.Doctor.estatus == '01 ACTIVO',
        models.Doctor.coordinacion != '1'
    ).count()

    return {
        "clues": clues_info.clues,
        "nombre_unidad": clues_info.nombre_unidad,
        "direccion_unidad": clues_info.direccion_unidad,
        "entidad": clues_info.entidad,
        "municipio": clues_info.municipio,
        "nivel_atencion": clues_info.nivel_atencion,
        "tipo_establecimiento": clues_info.tipo_establecimiento,
        "subtipo_establecimiento": clues_info.subtipo_establecimiento,
        "estrato": clues_info.estrato,
        "minimo": cupo_info.minimo,
        "maximo": cupo_info.maximo,
        "actual": conteo_actual
    }


@router.get("/api/opciones/filtros-dinamicos", response_model=schemas.OpcionesFiltro)
async def get_opciones_dinamicas(
    entidad: Optional[str] = Query(None),
    nombre_unidad: Optional[str] = Query(None),
    especialidad: Optional[str] = Query(None),
    nivel_atencion: Optional[str] = Query(None),
    estatus: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db_session)
):
    base_query = db.query(models.Doctor).filter(
        models.Doctor.is_deleted == False,
        models.Doctor.coordinacion == '0'
    )

    if search and search.strip():
        search_words = search.strip().split()
        conditions = []
        for word in search_words:
            term = f"%{word}%"
            conditions.append(
                or_(
                    models.Doctor.nombre.ilike(term),
                    models.Doctor.apellido_paterno.ilike(term),
                    models.Doctor.apellido_materno.ilike(term),
                    models.Doctor.id_imss.ilike(term),
                    models.Doctor.clues.ilike(term)
                )
            )
        base_query = base_query.filter(and_(*conditions))

    def get_distinct_values(field, exclude_filter=None):
        query = base_query

        if exclude_filter != 'entidad' and entidad:
            query = query.filter(models.Doctor.entidad == entidad)
        if exclude_filter != 'nombre_unidad' and nombre_unidad:
            query = query.filter(models.Doctor.nombre_unidad == nombre_unidad)
        if exclude_filter != 'especialidad' and especialidad:
            query = query.filter(models.Doctor.especialidad == especialidad)
        if exclude_filter != 'nivel_atencion' and nivel_atencion:
            query = query.filter(models.Doctor.nivel_atencion == nivel_atencion)
        if exclude_filter != 'estatus' and estatus:
            query = query.filter(models.Doctor.estatus == estatus)

        query = query.with_entities(distinct(field)).filter(field.isnot(None), field != '').order_by(field)
        return [row[0] for row in query.all()]

    return {
        "entidades": get_distinct_values(models.Doctor.entidad, 'entidad'),
        "unidades": get_distinct_values(models.Doctor.nombre_unidad, 'nombre_unidad'),
        "especialidades": get_distinct_values(models.Doctor.especialidad, 'especialidad'),
        "niveles_atencion": get_distinct_values(models.Doctor.nivel_atencion, 'nivel_atencion'),
        "estatus": get_distinct_values(models.Doctor.estatus, 'estatus'),
    }


@router.get("/api/opciones/entidades-capacidad", response_model=List[schemas.EntidadCapacidad])
async def get_entidades_con_capacidad(db: Session = Depends(get_db_session)):
    conteo_actual_query = db.query(
        models.Doctor.entidad,
        func.count(models.Doctor.id_imss).label("conteo")
    ).filter(
        models.Doctor.is_deleted == False,
        models.Doctor.estatus == '01 ACTIVO',
        models.Doctor.coordinacion != '1'
    ).group_by(models.Doctor.entidad).subquery()

    resultados = db.query(
        models.EntidadCupos.entidad,
        models.EntidadCupos.minimo,
        models.EntidadCupos.maximo,
        func.coalesce(conteo_actual_query.c.conteo, 0).label("actual")
    ).outerjoin(
        conteo_actual_query, models.EntidadCupos.entidad == conteo_actual_query.c.entidad
    ).order_by(models.EntidadCupos.entidad).all()

    return [
        {
            "entidad": r.entidad,
            "label": r.entidad,
            "minimo": r.minimo,
            "maximo": r.maximo,
            "actual": r.actual
        } for r in resultados
    ]


@router.delete("/api/historico/{historico_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Histórico"])
async def delete_registro_historico(
    historico_id: int,
    db: Session = Depends(get_db_session),
    admin_user: models.User = Depends(security.get_current_admin_user)
):
    registro = db.query(models.EstatusHistorico).filter(models.EstatusHistorico.id == historico_id).first()

    if not registro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Registro {historico_id} no encontrado.")

    db.delete(registro)
    db.commit()
    return


@router.put("/api/historial/{historial_id}", tags=["Historial"])
async def actualizar_fechas_historial(
    historial_id: int,
    datos: schemas.HistorialUpdate,
    db: Session = Depends(get_db_session)
):
    registro = db.query(models.EstatusHistorico).filter(models.EstatusHistorico.id == historial_id).first()

    if not registro:
        raise HTTPException(status_code=404, detail="Registro de historial no encontrado.")

    registro.fecha_inicio = datos.fecha_inicio
    registro.fecha_fin = datos.fecha_fin

    try:
        db.commit()
        db.refresh(registro)
        return {"mensaje": "Fechas actualizadas correctamente", "id": registro.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar: {str(e)}")