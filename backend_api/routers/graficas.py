import traceback
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from .. import models, schemas, security
from ..database import get_db as get_db_session
from ..cache import count_cache, generate_cache_key

router = APIRouter(tags=["Gráficas"])

MESES_ES = {
    "Jan": "Ene", "Feb": "Feb", "Mar": "Mar", "Apr": "Abr",
    "May": "May", "Jun": "Jun", "Jul": "Jul", "Aug": "Ago",
    "Sep": "Sep", "Oct": "Oct", "Nov": "Nov", "Dec": "Dic"
}


@router.get("/api/dashboard/resumen_unificado")
async def get_dashboard_unificado(
    tipo: str = Query("medicos", enum=["medicos", "administrativos"]),
    db: Session = Depends(get_db_session)
):
    cache_key = generate_cache_key("dashboard_unificado", tipo=tipo)
    cached_result = count_cache.get(cache_key)
    if cached_result is not None:
        return cached_result

    filtro_coord = '1' if tipo == "administrativos" else '0'
    condicion_sql = "coordinacion = '1'" if tipo == "administrativos" else "coordinacion != '1'"

    # Conteo total
    total_key = f"total_q:{tipo}"
    total_q = count_cache.get(total_key)
    if total_q is None:
        total_q = db.query(func.count(models.Doctor.id_imss)).filter(
            models.Doctor.is_deleted == False,
            models.Doctor.coordinacion == filtro_coord,
            models.Doctor.estatus != '06 BAJA'
        ).scalar()
        count_cache.set(total_key, total_q, ttl=600)

    # Universo total
    universo_key = "universo_total"
    universo_total = count_cache.get(universo_key)
    if universo_total is None:
        universo_total = db.query(func.count(models.Doctor.id_imss)).filter(
            models.Doctor.is_deleted == False
        ).scalar()
        count_cache.set(universo_key, universo_total, ttl=1800)

    # Por estatus
    estatus_map = {
        '01': '01 ACTIVO', '02': '02 RETIRO TEMP. (CUBA)',
        '03': '03 RETIRO TEMP. (MEXICO)', '04': '04 SOL. PERSONAL',
        '05': '05 INCAPACIDAD', '06': '06 BAJA'
    }
    query_estatus = text(f"""
        SELECT SUBSTRING(TRIM(UPPER(estatus)) FROM 1 FOR 2) as code, COUNT(*) as value
        FROM doctores
        WHERE estatus IS NOT NULL AND TRIM(estatus) != ''
          AND {condicion_sql} AND is_deleted = false
        GROUP BY code ORDER BY value DESC
    """)
    res_estatus = db.execute(query_estatus).all()
    data_estatus = [
        {"id": estatus_map.get(r.code, r.code), "label": estatus_map.get(r.code, r.code), "value": r.value}
        for r in res_estatus
    ]

    # Nivel de atención
    query_nivel = text(f"""
        SELECT nivel_atencion as label, COUNT(*) as value
        FROM doctores
        WHERE nivel_atencion IS NOT NULL AND nivel_atencion != ''
          AND estatus = '01 ACTIVO' AND {condicion_sql} AND is_deleted = false
        GROUP BY nivel_atencion ORDER BY value DESC
    """)
    res_nivel = db.execute(query_nivel).all()
    data_nivel = [{"label": r.label, "value": r.value} for r in res_nivel]

    # Estados vs cupos
    conteo_estados_sub = db.query(
        models.Doctor.entidad,
        func.count(models.Doctor.id_imss).label("conteo")
    ).filter(
        models.Doctor.is_deleted == False,
        models.Doctor.estatus == '01 ACTIVO',
        models.Doctor.coordinacion == filtro_coord
    ).group_by(models.Doctor.entidad).subquery()

    res_estados = db.query(
        models.EntidadCupos.entidad, models.EntidadCupos.minimo, models.EntidadCupos.maximo,
        func.coalesce(conteo_estados_sub.c.conteo, 0).label("value")
    ).outerjoin(conteo_estados_sub, models.EntidadCupos.entidad == conteo_estados_sub.c.entidad).all()

    data_estados = [
        {"label": r.entidad, "value": r.value, "minimo": r.minimo, "maximo": r.maximo}
        for r in res_estados
    ]

    # Cédulas licenciatura
    cedulas_lic_key = f"cedulas_lic:{tipo}"
    cedulas_licenciatura = count_cache.get(cedulas_lic_key)
    if cedulas_licenciatura is None:
        cedulas_licenciatura = db.query(func.count(models.Doctor.id_imss)).filter(
            models.Doctor.is_deleted == False,
            models.Doctor.coordinacion == filtro_coord,
            models.Doctor.estatus != '06 BAJA',
            models.Doctor.cedula_lic.isnot(None),
            models.Doctor.cedula_lic != '',
            models.Doctor.cedula_lic.not_ilike('%NULL%'),
            models.Doctor.cedula_lic.not_ilike('%BAJA%'),
            models.Doctor.cedula_lic.not_ilike('%TRAMITE%')
        ).scalar()
        count_cache.set(cedulas_lic_key, cedulas_licenciatura, ttl=600)

    # Cédulas especialidad
    cedulas_esp_key = f"cedulas_esp:{tipo}"
    cedulas_especialidad = count_cache.get(cedulas_esp_key)
    if cedulas_especialidad is None:
        cedulas_especialidad = db.query(func.count(models.Doctor.id_imss)).filter(
            models.Doctor.is_deleted == False,
            models.Doctor.coordinacion == filtro_coord,
            models.Doctor.estatus != '06 BAJA',
            models.Doctor.cedula_esp.isnot(None),
            models.Doctor.cedula_esp != '',
            models.Doctor.cedula_esp.not_ilike('%NULL%'),
            models.Doctor.cedula_esp.not_ilike('%BAJA%'),
            models.Doctor.cedula_esp.not_ilike('%TRAMITE%')
        ).scalar()
        count_cache.set(cedulas_esp_key, cedulas_especialidad, ttl=600)

    # Género
    query_genero = text(f"""
        SELECT sexo, COUNT(*) as total
        FROM doctores
        WHERE is_deleted = false AND {condicion_sql}
          AND estatus != '06 BAJA' AND sexo IS NOT NULL
        GROUP BY sexo
    """)
    res_genero = db.execute(query_genero).all()

    total_mujeres = 0
    total_hombres = 0
    for r in res_genero:
        valor = (r.sexo or '').strip().upper()
        if valor in ('M', 'MUJER', 'FEMENINO', 'F'):
            total_mujeres = r.total
        elif valor in ('H', 'HOMBRE', 'MASCULINO', 'M'):
            total_hombres = r.total

    result = {
        "total_general": total_q,
        "universo_total": universo_total,
        "data_estatus": data_estatus,
        "data_nivel": data_nivel,
        "data_estados": data_estados,
        "cedulas_licenciatura": cedulas_licenciatura,
        "cedulas_especialidad": cedulas_especialidad,
        "total_mujeres": total_mujeres,
        "total_hombres": total_hombres,
    }

    count_cache.set(cache_key, result, ttl=300)
    return result


@router.get("/api/graficas/estadistica_doctores_agrupados", response_model=schemas.EstadisticaPaginada)
async def obtener_estadistica_doctores_agrupados(
    db: Session = Depends(get_db_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    tipo: str = Query("medicos"),
    entidad: Optional[str] = None,
    especialidad: Optional[str] = None,
    nivel_atencion: Optional[str] = None,
    nombre_unidad: Optional[str] = None,
    estatus: Optional[str] = None,
    search: Optional[str] = None
):
    try:
        filtro_coord = '1' if tipo == "administrativos" else '0'

        use_cache = not search
        cache_key = None
        cached_result = None

        if use_cache:
            cache_key = generate_cache_key(
                "estadistica", tipo=tipo, entidad=entidad, especialidad=especialidad,
                nivel_atencion=nivel_atencion, nombre_unidad=nombre_unidad,
                estatus=estatus, skip=skip, limit=limit
            )
            cached_result = count_cache.get(cache_key)
            if cached_result is not None:
                return cached_result

        base_query = db.query(models.Doctor).filter(
            models.Doctor.is_deleted == False,
            models.Doctor.coordinacion == filtro_coord
        )

        if entidad:
            base_query = base_query.filter(models.Doctor.entidad == entidad)
        if especialidad:
            base_query = base_query.filter(models.Doctor.especialidad == especialidad)
        if nivel_atencion:
            base_query = base_query.filter(models.Doctor.nivel_atencion == nivel_atencion)
        if nombre_unidad:
            base_query = base_query.filter(models.Doctor.nombre_unidad == nombre_unidad)
        if estatus:
            base_query = base_query.filter(models.Doctor.estatus == estatus)
        if search:
            base_query = base_query.filter(models.Doctor.clues.ilike(f"%{search}%"))

        total_personal = None
        if use_cache:
            count_key = generate_cache_key(
                "estadistica_count", tipo=tipo, entidad=entidad, especialidad=especialidad,
                nivel_atencion=nivel_atencion, nombre_unidad=nombre_unidad, estatus=estatus
            )
            total_personal = count_cache.get(count_key)

        if total_personal is None:
            total_personal = base_query.count()
            if use_cache:
                count_cache.set(count_key, total_personal, ttl=300)

        columns_to_group = [
            models.Doctor.entidad, models.Doctor.nombre_unidad, models.Doctor.clues,
            models.Doctor.especialidad, models.Doctor.nivel_atencion
        ]

        total_grupos = db.query(func.count()).select_from(
            base_query.with_entities(*columns_to_group).distinct().subquery()
        ).scalar() or 0

        query_result = base_query.with_entities(
            *columns_to_group,
            func.count(models.Doctor.id_imss).label("cantidad")
        ).group_by(*columns_to_group).order_by(models.Doctor.entidad.asc()).offset(skip).limit(limit).all()

        items_list = []
        for row in query_result:
            items_list.append({
                "entidad": row.entidad or "N/A",
                "nombre_unidad": row.nombre_unidad or "N/A",
                "clues": row.clues or "N/A",
                "especialidad": row.especialidad or "N/A",
                "nivel_atencion": row.nivel_atencion or "N/A",
                "cantidad": row.cantidad
            })

        result = {
            "total_groups": total_grupos,
            "total_doctors_in_groups": total_personal,
            "items": items_list
        }

        if use_cache and cache_key:
            count_cache.set(cache_key, result, ttl=300)

        return result

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno en la consulta de estadísticas")


@router.get("/api/graficas/especialidades_agrupadas", response_model=List[schemas.EspecialidadAgrupada])
async def obtener_especialidades_agrupadas(
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        base_query = db.query(
            models.Doctor.especialidad,
            func.count(models.Doctor.id_imss).label("total_doctores")
        ).filter(models.Doctor.is_deleted == False)

        basicas = base_query.filter(models.Doctor.especialidad.in_([
            "ANESTESIOLOGIA", "CIRUGIA GENERAL", "GINECOLOGIA Y OBSTETRICIA",
            "MEDICINA FAMILIAR", "MEDICINA INTERNA", "MEDICINA DE URGENCIAS", "PEDIATRIA MEDICA"
        ])).group_by(models.Doctor.especialidad).order_by(models.Doctor.especialidad).all()

        quirurgicas = base_query.filter(models.Doctor.especialidad.in_([
            "ANGIOLOGIA, CIRUGIA VASCULAR Y ENDOVASCULAR", "CIRUGIA PEDIATRICA", "CIRUGIA ONCOLOGICA",
            "COLOPROCTOLOGIA", "NEUROCIRUGIA", "OFTALMOLOGIA",
            "OTORRINOLARINGOLOGIA Y CIRUGIA DE CABEZA Y CUELLO", "TRAUMATOLOGIA Y ORTOPEDIA", "UROLOGIA"
        ])).group_by(models.Doctor.especialidad).order_by(models.Doctor.especialidad).all()

        medicas = base_query.filter(models.Doctor.especialidad.in_([
            "ANATOMIA PATOLOGICA", "CARDIOLOGIA CLINICA", "DERMATOLOGIA", "ENDOCRINOLOGIA",
            "EPIDEMIOLOGIA", "GASTROENTEROLOGIA", "GERIATRIA", "HEMATOLOGIA",
            "INMUNOLOGIA CLINICA Y ALERGIA", "MEDICINA CRITICA", "MEDICINA DE REHABILITACION",
            "MEDICINA DEL ENFERMO PEDIATRICO EN ESTADO CRITICO", "NEFROLOGIA", "NEONATOLOGIA",
            "NEUMOLOGIA", "NEUROLOGIA ADULTOS", "ONCOLOGIA MEDICA", "ONCOLOGIA PEDIATRICA",
            "PSIQUIATRIA", "PSIQUIATRIA INFANTIL Y DE LA ADOLESCENCIA", "RADIOLOGIA E IMAGEN", "REUMATOLOGIA"
        ])).group_by(models.Doctor.especialidad).order_by(models.Doctor.especialidad).all()

        return [
            {
                "tipo": "BASICAS",
                "especialidades": [{"nombre": e.especialidad, "total_doctores": e.total_doctores} for e in basicas],
                "total": sum(e.total_doctores for e in basicas)
            },
            {
                "tipo": "QUIRURGICAS",
                "especialidades": [{"nombre": e.especialidad, "total_doctores": e.total_doctores} for e in quirurgicas],
                "total": sum(e.total_doctores for e in quirurgicas)
            },
            {
                "tipo": "MEDICAS",
                "especialidades": [{"nombre": e.especialidad, "total_doctores": e.total_doctores} for e in medicas],
                "total": sum(e.total_doctores for e in medicas)
            }
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener especialidades: {str(e)}")


@router.get("/api/dashboard/historico_bajas")
async def get_historico_bajas(
    tipo: str = Query("medicos", enum=["medicos", "administrativos"]),
    db: Session = Depends(get_db_session)
):
    condicion_sql = "coordinacion = '1'" if tipo == "administrativos" else "coordinacion = '0'"

    query_bajas = text(f"""
        SELECT
            TO_CHAR(DATE_TRUNC('month', fecha_estatus), 'Mon YYYY') AS mes,
            DATE_TRUNC('month', fecha_estatus) AS mes_orden,
            COUNT(*) AS total
        FROM doctores
        WHERE is_deleted = false
          AND {condicion_sql}
          AND estatus = '06 BAJA'
          AND fecha_estatus IS NOT NULL
        GROUP BY mes_orden
        ORDER BY mes_orden ASC
    """)

    res = db.execute(query_bajas).all()

    resultado = []
    for r in res:
        mes_traducido = r.mes
        for en, es in MESES_ES.items():
            if en in mes_traducido:
                mes_traducido = mes_traducido.replace(en, es)
                break
        resultado.append({"mes": mes_traducido, "total": r.total})

    return resultado