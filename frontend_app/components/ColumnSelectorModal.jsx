// src/components/ColumnSelectorModal.jsx
import React, { useState, useMemo } from 'react';
import { X, CheckSquare, Square, Download } from 'lucide-react';

// ==========================================
// 1. AGREGAMOS LOS GRUPOS DE COLUMNAS
// ==========================================

const COLUMNS_PERSONAL = [
    //DATOS PERSONALES
    { key: 'id_imss', label: 'ID IMSS' },
    { key: 'estatus', label: 'Estatus' },
    { key: 'nombre', label: 'Nombre(s)' },
    { key: 'apellido_paterno', label: 'Apellido Paterno' },
    { key: 'apellido_materno', label: 'Apellido Materno' },
    { key: 'curp', label: 'CURP' },
    { key: 'pasaporte', label: 'Pasaporte' },
    { key: 'fecha_emision', label: 'Fecha emisión' },
    { key: 'fecha_expiracion', label: 'Fecha expiración' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'fecha_nacimiento', label: 'Fecha nacimiento' },
    { key: 'matrimonio_id', label: 'Matrimonio ID' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'correo', label: 'Correo' },
    { key: 'domicilio', label: 'Domicilio' },
];

const COLUMNS_ACADEMIC = [
    //DATOS ACADEMICOS
    { key: 'licenciatura', label: 'Licenciatura' },
    { key: 'cedula_lic', label: 'Cédula Licenciatura' },
    { key: 'especialidad', label: 'Especialidad' },
    { key: 'cedula_esp', label: 'Cédula Especialidad' },
];

const COLUMNS_COLABORACION = [
    //DATOS DE COOPERACIÓN
    { key: 'acuerdo', label: 'Acuerdo' },
    { key: 'fecha_vuelo', label: 'Fecha Llegada' },
    { key: 'fecha_estatus', label: 'Fecha de Estatus' },
    { key: 'fecha_fin', label: 'Fecha Termino' },
    { key: 'turno', label: 'Turno' },
    { key: 'despliegue', label: 'Despliegue' },
    { key: 'clues', label: 'CLUES' },
    { key: 'nombre_unidad', label: 'Unidad Médica' },
    { key: 'direccion_unidad', label: 'Dirección Unidad' },
    { key: 'nivel_atencion', label: 'Nivel de Atención' },
    { key: 'tipo_establecimiento', label: 'Tipo Establecimiento' },
    { key: 'subtipo_establecimiento', label: 'Subtipo Establecimiento' },
    { key: 'estrato', label: 'Estrato' },
    { key: 'entidad', label: 'Entidad' },
    { key: 'municipio', label: 'Municipio' },
    { key: 'region', label: 'Región' },
    { key: 'dias_activos_mes_actual', label: 'Días Activos (Mes Actual)' },

    //DATOS DE COOPERACIÓN BAJA
    { key: 'motivo_baja', label: 'Motivo de Baja' },
    { key: 'fecha_notificacion', label: 'Fecha Notificación' },
    { key: 'forma_notificacion', label: 'Forma Notificación' },
    { key: 'tipo_incapacidad', label: 'Tipo Incapacidad'},
    { key: 'comentarios_estatus', label: 'Comentarios'}
];

// ==========================================
// 2. UNIMOS TODO Y LO ORDENAMOS ALFABÉTICAMENTE POR LABEL
// ==========================================

// Función para ordenar alfabéticamente por etiqueta (label)
const sortByLabel = (columns) => [...columns].sort((a, b) => a.label.localeCompare(b.label));

// Creamos el array final con todas las columnas (ya ordenadas por grupo)
const ALL_COLUMNS = [
    ...sortByLabel(COLUMNS_PERSONAL),
    ...sortByLabel(COLUMNS_ACADEMIC),
    ...sortByLabel(COLUMNS_COLABORACION)
];

function ColumnSelectorModal({ isOpen, onClose, onConfirmDownload }) {
    const [selectedColumns, setSelectedColumns] = useState(ALL_COLUMNS.map(c => c.key));

    const handleCheckboxChange = (columnKey) => {
        setSelectedColumns(prev =>
            prev.includes(columnKey)
                ? prev.filter(key => key !== columnKey)
                : [...prev, columnKey]
        );
    };

    const handleSelectAll = () => {
        setSelectedColumns(ALL_COLUMNS.map(c => c.key));
    };

    const handleDeselectAll = () => {
        setSelectedColumns([]);
    };

    const mesActual = useMemo(() => {
        const hoy = new Date();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        return `${hoy.getFullYear()}-${mes}`;
    }, []);

    const [mesSeleccionado, setMesSeleccionado] = useState(mesActual);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[1200] flex justify-center items-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[85vh] flex flex-col">

                {/* Botón de cierre */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-gray-800 text-2xl font-bold cursor-pointer border-none shadow-sm transition-colors"
                >
                    ×
                </button>

                {/* Cabecera */}
                <div className="mb-5 pb-3 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-[#10312B] text-center">Seleccionar Columnas para Exportar</h2>
                </div>

                {/* Controles de selección global */}
                <div className="flex justify-end gap-2 mb-3">
                    <button onClick={handleSelectAll} className="px-3 py-1.5 text-xs font-semibold bg-teal-50 text-[#10312B] border border-teal-200 rounded hover:bg-teal-100 transition-colors">
                        Seleccionar Todo
                    </button>
                    <button onClick={handleDeselectAll} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 rounded hover:bg-gray-200 transition-colors">
                        Deseleccionar Todo
                    </button>
                </div>

                {/* Selector de Mes (Condicional) */}
                {selectedColumns.includes("dias_activos_mes_actual") && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <label className="block font-bold text-xs text-[#10312B] mb-2 uppercase tracking-wide">
                            Mes de Evaluación de Asistencia:
                        </label>
                        <input
                            type="month"
                            value={mesSeleccionado}
                            min="2026-01"
                            max={mesActual}
                            onChange={(e) => setMesSeleccionado(e.target.value)}
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-[#B08D55] [color-scheme:light]"/>
                        <p className="text-[11px] text-gray-500 mt-1 italic">
                            El reporte calculará los días activos del médico en el mes seleccionado.
                        </p>
                    </div>
                )}

                {/* Contenedor de Checkboxes agrupado por secciones */}
                <div className="overflow-y-auto flex-1 p-3 border border-gray-200 rounded-lg bg-white mb-6">

                    {/* SECCIÓN 1: INFORMACIÓN PERSONAL */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-[#10312B] mb-3 pb-2 border-b border-gray-100">
                            Información Personal
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {sortByLabel(COLUMNS_PERSONAL).map(col => (
                                <div key={col.key} className="flex items-center gap-2.5 p-1 hover:bg-gray-50 rounded transition-colors">
                                    <input
                                        type="checkbox"
                                        id={`col-${col.key}`}
                                        checked={selectedColumns.includes(col.key)}
                                        onChange={() => handleCheckboxChange(col.key)}
                                        className="w-4 h-4 text-[#10312B] focus:ring-[#B08D55] border-gray-300 rounded cursor-pointer"
                                    />
                                    <label htmlFor={`col-${col.key}`} className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                                        {col.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECCIÓN 2: DATOS ACADÉMICOS */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-[#10312B] mb-3 pb-2 border-b border-gray-100">
                            Datos Académicos
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {sortByLabel(COLUMNS_ACADEMIC).map(col => (
                                <div key={col.key} className="flex items-center gap-2.5 p-1 hover:bg-gray-50 rounded transition-colors">
                                    <input
                                        type="checkbox"
                                        id={`col-${col.key}`}
                                        checked={selectedColumns.includes(col.key)}
                                        onChange={() => handleCheckboxChange(col.key)}
                                        className="w-4 h-4 text-[#10312B] focus:ring-[#B08D55] border-gray-300 rounded cursor-pointer"
                                    />
                                    <label htmlFor={`col-${col.key}`} className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                                        {col.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SECCIÓN 3: DATOS DE COLABORACIÓN */}
                    <div>
                        <h3 className="text-sm font-bold text-[#10312B] mb-3 pb-2 border-b border-gray-100">
                            Datos de Colaboración
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {sortByLabel(COLUMNS_COLABORACION).map(col => (
                                <div key={col.key} className="flex items-center gap-2.5 p-1 hover:bg-gray-50 rounded transition-colors">
                                    <input
                                        type="checkbox"
                                        id={`col-${col.key}`}
                                        checked={selectedColumns.includes(col.key)}
                                        onChange={() => handleCheckboxChange(col.key)}
                                        className="w-4 h-4 text-[#10312B] focus:ring-[#B08D55] border-gray-300 rounded cursor-pointer"
                                    />
                                    <label htmlFor={`col-${col.key}`} className="text-xs font-medium text-gray-700 cursor-pointer select-none">
                                        {col.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Botones Finales */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirmDownload(selectedColumns, mesSeleccionado)}
                        className="px-5 py-2 text-sm font-bold text-white bg-[#10312B] hover:bg-[#0a201c] rounded-md shadow-sm transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Confirmar y Descargar
                    </button>
                </div>

            </div>
        </div>
    );
}

export default ColumnSelectorModal;
