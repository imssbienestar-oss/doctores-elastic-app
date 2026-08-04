import gc
import calendar
import traceback
from datetime import date, datetime
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models, schemas, security
from ..database import get_db as get_db_session

router = APIRouter(tags=["Reportes"])


@router.get("/api/reporte/xlsx")
async def generar_reporte_excel(
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role == 'consulta':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos.")

    try:
        column_names = [
            "ID_IMSS", "NOMBRE", "APELLIDO_PATERNO", "APELLIDO_MATERNO", "ESTATUS",
            "MATRIMONIO_ID", "CURP", "CEDULA_ESP", "CEDULA_LIC", "ESPECIALIDAD",
            "ENTIDAD", "CLUES", "FORMA_NOTIFICACION", "MOTIVO_BAJA",
            "FECHA_EXTRACCION", "FECHA_NOTIFICACION", "SEXO", "TURNO",
            "NOMBRE_UNIDAD", "MUNICIPIO", "NIVEL_ATENCION",
            "FECHA_ESTATUS", "DESPLIEGUE", "FECHA_VUELO", "ESTRATO", "ACUERDO",
            "CORREO", "ENTIDAD_NACIMIENTO", "TELEFONO",
            "COMENTARIOS_ESTATUS", "FECHA_NACIMIENTO", "PASAPORTE",
            "FECHA_EMISION", "FECHA_EXPIRACION", "DOMICILIO",
            "LICENCIATURA", "INSTITUCION_LIC", "INSTITUCION_ESP",
            "FECHA_EGRESO_LIC", "FECHA_EGRESO_ESP",
            "TIPO_ESTABLECIMIENTO", "SUBTIPO_ESTABLECIMIENTO",
            "DIRECCION_UNIDAD", "REGION",
            "FECHA_INICIO", "FECHA_FIN", "MOTIVO", "TIPO_INCAPACIDAD"
        ]

        output = BytesIO()

        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            worksheet = writer.book.create_sheet('Doctores')
            writer.sheets['Doctores'] = worksheet

            for col_idx, col_name in enumerate(column_names, 1):
                worksheet.cell(row=1, column=col_idx, value=col_name)

            CHUNK_SIZE = 500
            offset = 0
            row_idx = 2

            while True:
                chunk = db.query(models.Doctor)\
                    .filter(models.Doctor.is_deleted == False)\
                    .order_by(models.Doctor.id_imss)\
                    .offset(offset)\
                    .limit(CHUNK_SIZE)\
                    .all()

                if not chunk:
                    break

                for doc in chunk:
                    row_data = {
                        "ID_IMSS": doc.id_imss, "NOMBRE": doc.nombre,
                        "APELLIDO_PATERNO": doc.apellido_paterno, "APELLIDO_MATERNO": doc.apellido_materno,
                        "ESTATUS": doc.estatus, "MATRIMONIO_ID": doc.matrimonio_id,
                        "CURP": doc.curp, "CEDULA_ESP": doc.cedula_esp,
                        "CEDULA_LIC": doc.cedula_lic, "ESPECIALIDAD": doc.especialidad,
                        "ENTIDAD": doc.entidad, "CLUES": doc.clues,
                        "FORMA_NOTIFICACION": doc.forma_notificacion, "MOTIVO_BAJA": doc.motivo_baja,
                        "FECHA_EXTRACCION": doc.fecha_extraccion, "FECHA_NOTIFICACION": doc.fecha_notificacion,
                        "SEXO": doc.sexo, "TURNO": doc.turno,
                        "NOMBRE_UNIDAD": doc.nombre_unidad, "MUNICIPIO": doc.municipio,
                        "NIVEL_ATENCION": doc.nivel_atencion, "FECHA_ESTATUS": doc.fecha_estatus,
                        "DESPLIEGUE": doc.despliegue, "FECHA_VUELO": doc.fecha_vuelo,
                        "ESTRATO": doc.estrato, "ACUERDO": doc.acuerdo,
                        "CORREO": doc.correo, "ENTIDAD_NACIMIENTO": doc.entidad_nacimiento,
                        "TELEFONO": doc.telefono, "COMENTARIOS_ESTATUS": doc.comentarios_estatus,
                        "FECHA_NACIMIENTO": doc.fecha_nacimiento, "PASAPORTE": doc.pasaporte,
                        "FECHA_EMISION": doc.fecha_emision, "FECHA_EXPIRACION": doc.fecha_expiracion,
                        "DOMICILIO": doc.domicilio, "LICENCIATURA": doc.licenciatura,
                        "INSTITUCION_LIC": doc.institucion_lic, "INSTITUCION_ESP": doc.institucion_esp,
                        "FECHA_EGRESO_LIC": doc.fecha_egreso_lic, "FECHA_EGRESO_ESP": doc.fecha_egreso_esp,
                        "TIPO_ESTABLECIMIENTO": doc.tipo_establecimiento,
                        "SUBTIPO_ESTABLECIMIENTO": doc.subtipo_establecimiento,
                        "DIRECCION_UNIDAD": doc.direccion_unidad, "REGION": doc.region,
                        "FECHA_INICIO": doc.fecha_inicio, "FECHA_FIN": doc.fecha_fin,
                        "MOTIVO": doc.motivo, "TIPO_INCAPACIDAD": doc.tipo_incapacidad
                    }

                    for key, value in row_data.items():
                        if isinstance(value, datetime) and getattr(value, 'tzinfo', None) is not None:
                            row_data[key] = value.replace(tzinfo=None)

                    for col_idx, col_name in enumerate(column_names, 1):
                        worksheet.cell(row=row_idx, column=col_idx, value=row_data.get(col_name))

                    row_idx += 1

                del chunk
                offset += CHUNK_SIZE

                if offset % (CHUNK_SIZE * 5) == 0:
                    gc.collect()

        gc.collect()
        output.seek(0)

        headers = {'Content-Disposition': 'attachment; filename="reporte_doctores.xlsx"'}
        return StreamingResponse(
            output,
            headers=headers,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al generar reporte Excel: {str(e)}")


@router.post("/api/reporte/dinamico/xlsx")
async def generar_reporte_dinamico_excel(
    request_data: schemas.ReporteDinamicoRequest,
    db: Session = Depends(get_db_session),
    current_user: models.User = Depends(security.get_current_user)
):
    try:
        filtro_coord = '1' if request_data.tipo == "administrativos" else '0'

        query = db.query(models.Doctor).filter(
            models.Doctor.is_deleted == False,
            models.Doctor.coordinacion == filtro_coord
        )

        if request_data.entidad:
            query = query.filter(models.Doctor.entidad == request_data.entidad)
        if request_data.especialidad:
            query = query.filter(models.Doctor.especialidad == request_data.especialidad)
        if request_data.nivel_atencion:
            query = query.filter(models.Doctor.nivel_atencion == request_data.nivel_atencion)
        if request_data.nombre_unidad:
            query = query.filter(models.Doctor.nombre_unidad == request_data.nombre_unidad)
        if request_data.estatus:
            query = query.filter(models.Doctor.estatus == request_data.estatus)

        if request_data.search and request_data.search.strip():
            word_term = f"%{request_data.search.strip()}%"
            query = query.filter(models.Doctor.clues.ilike(word_term))

        COLUMNA_VIRTUAL = "dias_activos_mes_actual"
        columnas_solicitadas = request_data.columnas if request_data.columnas else []

        if not columnas_solicitadas:
            columnas_validas = ["id_imss", "nombre", "apellido_paterno", "entidad", "estatus", COLUMNA_VIRTUAL]
        else:
            columnas_disponibles = [col.key for col in models.Doctor.__table__.columns]
            columnas_validas = [c for c in columnas_solicitadas if c in columnas_disponibles or c == COLUMNA_VIRTUAL]
            if not columnas_validas:
                columnas_validas = ["id_imss", "nombre", "apellido_paterno", "entidad", "estatus"]

        hoy = date.today()

        if request_data.mes_evaluacion:
            anio_eval, mes_eval = map(int, request_data.mes_evaluacion.split("-"))
            primer_dia_mes_evaluado = date(anio_eval, mes_eval, 1)
            dias_del_mes = calendar.monthrange(anio_eval, mes_eval)[1]
            limite_superior = date(anio_eval, mes_eval, dias_del_mes)
            if anio_eval == hoy.year and mes_eval == hoy.month:
                limite_superior = hoy
            columna_header_title = f"DÍAS ACTIVOS ({request_data.mes_evaluacion})"
        else:
            primer_dia_mes_evaluado = date(hoy.year, hoy.month, 1)
            limite_superior = hoy
            columna_header_title = "DÍAS ACTIVOS (MES ACTUAL)"

        if "id_imss" in columnas_validas:
            columnas_validas.remove("id_imss")
            columnas_validas.insert(0, "id_imss")

        if COLUMNA_VIRTUAL in columnas_validas:
            columnas_validas.remove(COLUMNA_VIRTUAL)
            columnas_validas.append(COLUMNA_VIRTUAL)

        output = BytesIO()
        total_procesados = 0

        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            worksheet = writer.book.create_sheet('Registros Filtrados')
            writer.sheets['Registros Filtrados'] = worksheet

            for col_idx, col_name in enumerate(columnas_validas, 1):
                header_title = columna_header_title if col_name == COLUMNA_VIRTUAL else col_name.upper()
                worksheet.cell(row=1, column=col_idx, value=header_title)

            CHUNK_SIZE = 500
            offset = 0
            row_idx = 2

            while True:
                chunk = query.order_by(models.Doctor.id_imss).offset(offset).limit(CHUNK_SIZE).all()

                if not chunk:
                    break

                historial_agrupado = {}
                if COLUMNA_VIRTUAL in columnas_validas:
                    chunk_ids = [doc.id_imss for doc in chunk]
                    historial_chunk = db.query(models.EstatusHistorico).filter(
                        models.EstatusHistorico.id_imss.in_(chunk_ids)
                    ).order_by(
                        models.EstatusHistorico.id_imss,
                        models.EstatusHistorico.fecha_inicio.asc(),
                        models.EstatusHistorico.id.asc()
                    ).all()

                    for reg in historial_chunk:
                        if reg.id_imss not in historial_agrupado:
                            historial_agrupado[reg.id_imss] = []
                        historial_agrupado[reg.id_imss].append(reg)

                for doc in chunk:
                    doc_dict = schemas.Doctor.model_validate(doc).model_dump()

                    if COLUMNA_VIRTUAL in columnas_validas:
                        historial_doc = historial_agrupado.get(doc.id_imss, [])
                        dias_activos = 0

                        for idx, reg in enumerate(historial_doc):
                            if reg.estatus == "01 ACTIVO":
                                inicio_real = max(primer_dia_mes_evaluado, reg.fecha_inicio)
                                fin_calculado = reg.fecha_fin
                                fue_cortado = False

                                if not fin_calculado:
                                    if idx + 1 < len(historial_doc):
                                        fin_calculado = historial_doc[idx + 1].fecha_inicio
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

                        doc_dict[COLUMNA_VIRTUAL] = dias_activos

                    for col_idx, col_name in enumerate(columnas_validas, 1):
                        cell_value = doc_dict.get(col_name)
                        if isinstance(cell_value, datetime) and getattr(cell_value, 'tzinfo', None) is not None:
                            cell_value = cell_value.replace(tzinfo=None)
                        worksheet.cell(row=row_idx, column=col_idx, value=cell_value)

                    row_idx += 1
                    total_procesados += 1

                del chunk
                offset += CHUNK_SIZE

                if offset % (CHUNK_SIZE * 5) == 0:
                    gc.collect()

            if total_procesados == 0:
                raise HTTPException(status_code=404, detail="No se encontraron registros para exportar.")

        gc.collect()
        output.seek(0)

        headers = {
            'Content-Disposition': 'attachment; filename="reporte_personal.xlsx"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }

        return StreamingResponse(
            output,
            headers=headers,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error interno al generar el reporte: {str(e)}")