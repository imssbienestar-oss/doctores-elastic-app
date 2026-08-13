import React, { useState, useEffect } from "react";
import { useAuth } from "../../src/contexts/AuthContext";
import Swal from 'sweetalert2';

const COLORS = {
    primary: "#10312B",
    secondary: "#B08D55",
    bg: "#f4f6f8",
    white: "#ffffff",
    border: "#d1d5db",
    danger: "#9F2241",
    success: "#28a745"
};

export default function ReporteQuincenal() {
    const { token, currentUser } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

    // Estados para la lista de médicos
    const [medicos, setMedicos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [totalMedicos, setTotalMedicos] = useState(0);

    // Controles de periodo
    const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
    const [mesSeleccionado, setMesSeleccionado] = useState("8"); // Agosto
    const [quincenaSeleccionada, setQuincenaSeleccionada] = useState("1");

    // Estados para la Subida Dual (Excel + PDF)
    const [doctorSubida, setDoctorSubida] = useState(null);
    const [archivoPDF, setArchivoPDF] = useState(null);
    const [archivoExcel, setArchivoExcel] = useState(null);
    const [subiendo, setSubiendo] = useState(false);

    // Estados para la Pre-visualización del Excel
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [estadoReportes, setEstadoReportes] = useState({});
    const [refreshKey, setRefreshKey] = useState(0);

    const [autorizado, setAutorizado] = useState(false);

    // 1. Cargar los médicos de la unidad
    useEffect(() => {
        const fetchMedicosUnidad = async () => {
            setIsLoading(true);
            try {
                const skip = (currentPage - 1) * itemsPerPage;
                const response = await fetch(`${API_BASE_URL}/api/doctores?skip=${skip}&limit=${itemsPerPage}&estatus=todos`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setMedicos(data.doctores || []);
                    setTotalMedicos(data.total_count || 0);
                } else {
                    setError("No se pudieron cargar los médicos de la unidad.");
                }
            } catch (err) {
                setError("Error de red al obtener el personal.");
            } finally {
                setIsLoading(false);
            }
        };

        if (token) fetchMedicosUnidad();
    }, [token, currentPage, API_BASE_URL]);

    const totalPages = Math.ceil(totalMedicos / itemsPerPage);

    // 2. Manejar la selección del archivo Excel y pedir pre-visualización
    const handleExcelChange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            setArchivoExcel(null);
            setPreviewData(null);
            return;
        }

        // Validar extensión
        if (!file.name.match(/\.(xls|xlsx)$/)) {
            Swal.fire("Formato Incorrecto", "Por favor selecciona un archivo de Excel válido (.xlsx)", "warning");
            e.target.value = null; // Limpiar el input
            return;
        }

        setArchivoExcel(file);
        setPreviewLoading(true);
        setPreviewData(null);

        const formData = new FormData();
        formData.append("archivo", file);

        try {
            const response = await fetch(`${API_BASE_URL}/api/peas/reporte-quincenal/previsualizar-excel`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Error al leer el Excel");

            setPreviewData(data); // Guardamos la data limpia para mostrarla
        } catch (error) {
            Swal.fire("Error en Excel", error.message, "error");
            setArchivoExcel(null);
            e.target.value = null;
        } finally {
            setPreviewLoading(false);
        }
    };

    // 3. Subir AMBOS archivos y procesar datos reales en la BD
    const handleSubirFormatos = async (e) => {
        e.preventDefault();

        if (!archivoPDF || !archivoExcel) {
            Swal.fire("Faltan Archivos", "Debes adjuntar tanto el PDF firmado como el Excel de datos.", "warning");
            return;
        }

        if (archivoPDF.type !== "application/pdf") {
            Swal.fire("Formato Incorrecto", "El archivo firmado debe ser estrictamente un PDF.", "warning");
            return;
        }

        setSubiendo(true);

        const formData = new FormData();
        formData.append("id_imss", doctorSubida.id_imss);
        formData.append("anio", anioSeleccionado);
        formData.append("mes", mesSeleccionado);
        formData.append("quincena", quincenaSeleccionada);
        formData.append("subido_por", currentUser?.username || "RESPONSABLE_UNIDAD");
        formData.append("archivo_pdf", archivoPDF);
        formData.append("archivo_excel", archivoExcel);

        try {
            const response = await fetch(`${API_BASE_URL}/api/peas/reporte-quincenal/subir`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Error al subir los documentos");

            Swal.fire({
                title: "¡Proceso Completado!",
                text: `${data.mensaje} (${data.dias_procesados} días registrados)`,
                icon: "success",
                confirmButtonColor: COLORS.primary
            });

            cerrarModal();
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            Swal.fire("Error al Subir", `Falló la subida: ${error.message}`, "error");
            cerrarModal();
        } finally {
            setSubiendo(false);
        }
    };

    const cerrarModal = () => {
        setDoctorSubida(null);
        setArchivoPDF(null);
        setArchivoExcel(null);
        setPreviewData(null);
    };

    useEffect(() => {
        const fetchEstadoSubidos = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/peas/reporte-quincenal/estado-subidos/${anioSeleccionado}/${mesSeleccionado}/${quincenaSeleccionada}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setEstadoReportes(data); // Guardamos el diccionario completo
                }
            } catch (error) {
                console.error("Error al obtener estado de subidas:", error);
            }
        };
        if (token) fetchEstadoSubidos();
    }, [anioSeleccionado, mesSeleccionado, quincenaSeleccionada, token, refreshKey]);

    const reportesRechazados = Object.entries(estadoReportes)
        .filter(([id_imss, rep]) => String(rep.estado).toUpperCase().includes("RECHAZADO"))
        .map(([id_imss, rep]) => {
            // Ya no buscamos en el array local de 'medicos', usamos el nombre exacto de la base de datos
            const nombreMostrar = rep.nombre_medico || `Médico ID: ${id_imss}`;
            return { id_imss, nombre: nombreMostrar, observaciones: rep.observaciones };
        });

    // 2. Función mágica para scrollear hacia el médico
    const irAlMedico = (id_imss) => {
        const fila = document.getElementById(`fila-${id_imss}`);
        if (fila) {
            // Bajamos la pantalla suavemente
            fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Iluminamos la fila de amarillo temporalmente
            const colorOriginal = fila.style.backgroundColor;
            fila.style.backgroundColor = "#fff3cd";
            setTimeout(() => { fila.style.backgroundColor = colorOriginal; }, 2000);
        } else {
            Swal.fire("Paginación", "Este médico se encuentra en otra página de la lista. Usa los botones de Siguiente/Anterior abajo.", "info");
        }
    };

    return (
        <div style={{ backgroundColor: COLORS.bg, minHeight: "100vh", padding: "20px", fontFamily: "Arial, sans-serif" }}>

            <div style={{ maxWidth: "1000px", margin: "0 auto", background: "white", padding: "25px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                <h2 style={{ color: COLORS.primary, fontSize: "24px", marginBottom: "15px", borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: "10px" }}>
                    Carga de Asistencia Quincenal (Dual)
                </h2>

                <div style={{
                    backgroundColor: "#ffffff",
                    border: `1px solid ${COLORS.border}`,
                    borderLeft: `4px solid ${COLORS.secondary}`,
                    padding: "16px 20px",
                    borderRadius: "6px",
                    marginBottom: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "15px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                }}>
                    <div>
                        <h4 style={{ color: COLORS.primary, margin: "0 0 4px 0", fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                            Documentación de Apoyo y Plantillas
                        </h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "#4b5563" }}>
                            Descargue la plantilla oficial en Excel y el instructivo en PDF para el llenado correcto de las asistencias.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <a
                            href={`${API_BASE_URL}/api/peas/coordinador/descargar-plantilla-excel`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                backgroundColor: COLORS.primary,
                                color: "white",
                                padding: "9px 14px",
                                borderRadius: "4px",
                                textDecoration: "none",
                                fontSize: "12px",
                                fontWeight: "bold",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                            }}
                        >
                            <span>📄</span> Descargar Excel (Formato 1)
                        </a>
                        <a
                            href={`${API_BASE_URL}/api/peas/coordinador/descargar-instructivo-pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                backgroundColor: "#9F2241", // Guinda institucional para diferenciar el PDF
                                color: "white",
                                padding: "9px 14px",
                                borderRadius: "4px",
                                textDecoration: "none",
                                fontSize: "12px",
                                fontWeight: "bold",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                            }}
                        >
                            <span>📕</span> Descargar Instructivo PDF
                        </a>
                    </div>
                </div>

                {reportesRechazados.length > 0 && (
                    <div className="no-print" style={{ backgroundColor: "#fde8e8", border: "1px solid #9F2241", borderLeft: "5px solid #9F2241", padding: "15px 20px", borderRadius: "4px", marginBottom: "20px" }}>
                        <h4 style={{ color: "#9F2241", margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "15px" }}>
                            ⚠️ ATENCIÓN: FORMATOS DEVUELTOS POR COORDINACIÓN ESTATAL
                        </h4>
                        <p style={{ margin: "10px 0 5px 0", color: "#374151", fontSize: "14px" }}>
                            Se encontraron inconsistencias en los siguientes registros:
                        </p>
                        <ul style={{ margin: "0 0 10px 0", paddingLeft: "25px", color: "#9F2241", fontSize: "13px" }}>
                            {reportesRechazados.map((rep, idx) => (
                                <li key={idx} style={{ marginBottom: "6px" }}>
                                    <button
                                        type="button"
                                        onClick={() => irAlMedico(rep.id_imss)}
                                        style={{ background: 'none', border: 'none', color: '#9F2241', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '13px' }}>
                                        {rep.nombre}
                                    </button>
                                    <span style={{ color: "#374151" }}> — {rep.observaciones}</span>
                                </li>
                            ))}
                        </ul>
                        <p style={{ margin: "0", color: "#6b7280", fontSize: "12px", fontStyle: "italic" }}>
                            Por favor, genera las correcciones necesarias y utiliza el botón "Corregir Formatos" en las filas resaltadas.
                        </p>
                    </div>
                )}

                {/* Controles globales de periodo */}
                <div style={{ display: "flex", gap: "15px", marginBottom: "20px", background: "#f8f9fa", padding: "12px", borderRadius: "6px", alignItems: "center" }}>
                    <div>
                        <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Año:</label>
                        <select value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: `1px solid ${COLORS.border}` }}>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Mes:</label>
                        <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: `1px solid ${COLORS.border}` }}>
                            <option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option>
                            <option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option>
                            <option value="7">Julio</option><option value="8">Agosto</option><option value="9">Septiembre</option>
                            <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "4px" }}>Quincena:</label>
                        <select value={quincenaSeleccionada} onChange={(e) => setQuincenaSeleccionada(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: `1px solid ${COLORS.border}` }}>
                            <option value="1">1ra Quincena (Días 1 - 15)</option>
                            <option value="2">2da Quincena (Días 16 - Fin de Mes)</option>
                        </select>
                    </div>
                </div>

                {error && <p style={{ color: COLORS.danger, fontWeight: "bold" }}>{error}</p>}

                {/* Tabla de Médicos */}
                {isLoading ? (
                    <p style={{ textAlign: "center", padding: "20px" }}>Cargando personal de la unidad...</p>
                ) : (
                    <div>
                        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" }}>
                            <thead>
                                <tr style={{ backgroundColor: "#10312B", color: "white", textAlign: "center", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    <th style={{ padding: "14px 15px", fontWeight: "600" }}>ID IMSS</th>
                                    <th style={{ padding: "14px 15px", fontWeight: "600" }}>Nombre Completo</th>
                                    <th style={{ padding: "14px 15px", fontWeight: "600" }}>Especialidad / Turno</th>
                                    <th style={{ padding: "14px 15px", textAlign: "center", fontWeight: "600" }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {medicos.length > 0 ? (
                                    medicos.map((doc, index) => {
                                        // Extraemos la información del reporte para este médico en específico
                                        const reporte = estadoReportes[doc.id_imss];
                                        const estaSubido = !!reporte;
                                        const esRechazado = String(reporte?.estado).toUpperCase().trim() === "RECHAZADO" || String(reporte?.estado).toUpperCase().includes("RECHAZADO");
                                        const estaAprobado = String(reporte?.estado).toUpperCase() === "APROBADO" || String(reporte?.estado).toUpperCase() === "VALIDADO";

                                        // Definimos el color de fondo (Rojo claro si está rechazado)
                                        const bgColor = esRechazado ? "#fde8e8" : (index % 2 === 0 ? "#ffffff" : "#f9fafb");

                                        return (
                                            <tr id={`fila-${doc.id_imss}`} key={doc.id_imss} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: bgColor, transition: "background-color 0.5s ease" }}>
                                                <td style={{ padding: "14px 15px", fontWeight: "bold", color: "#374151" }}>{doc.id_imss}</td>
                                                <td style={{ padding: "14px 15px", color: "#111827" }}>
                                                    {doc.nombre} {doc.apellido_paterno} {doc.apellido_materno}
                                                    <br />
                                                    <span style={{
                                                        display: "inline-block", marginTop: "6px", padding: "4px 10px",
                                                        borderRadius: "4px", fontSize: "10px", fontWeight: "bold", color: "white", whiteSpace: "nowrap",
                                                        backgroundColor: doc.estatus?.includes("ACTIVO") ? "#10312B" : doc.estatus?.includes("BAJA") ? "#9F2241" : "#B08D55"
                                                    }}>
                                                        {doc.estatus?.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "14px 15px", color: "#4b5563", fontSize: "13px" }}>
                                                    <strong style={{ color: "#111827" }}>{doc.especialidad}</strong> <br />
                                                    {doc.turno?.toUpperCase()}
                                                </td>
                                                <td style={{ padding: "14px 15px", textAlign: "center", verticalAlign: "middle" }}>

                                                    <button
                                                        onClick={() => setDoctorSubida(doc)}
                                                        disabled={estaAprobado}
                                                        style={{
                                                            backgroundColor: estaAprobado ? "#15803d" : (esRechazado ? COLORS.danger : (estaSubido ? "#10312B" : "#B08D55")),
                                                            color: "white",
                                                            border: "none",
                                                            padding: "8px 12px",
                                                            borderRadius: "4px",
                                                            cursor: estaAprobado ? "not-allowed" : "pointer",
                                                            fontWeight: "bold",
                                                            width: "160px",
                                                            whiteSpace: "nowrap",
                                                            fontSize: "11px",
                                                            boxShadow: esRechazado ? "0 2px 4px rgba(159, 34, 65, 0.3)" : "none",
                                                            opacity: estaAprobado ? 0.9 : 1,
                                                            transition: "all 0.2s"
                                                        }}>
                                                        {estaAprobado ? "Validado por Coordinador" : (esRechazado ? "Corregir Formatos" : (estaSubido ? "Actualizar Formatos" : "Subir Formatos"))}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: "center", padding: "30px", color: "#6b7280", fontStyle: "italic" }}>No hay médicos adscritos registrados en tu unidad.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "20px" }}>
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ padding: "6px 12px", cursor: "pointer" }}>Anterior</button>
                                <span>Página {currentPage} de {totalPages}</span>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ padding: "6px 12px", cursor: "pointer" }}>Siguiente</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL MULTI-SUBIDA (EXCEL Y PDF) */}
            {doctorSubida && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
                    <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "8px", width: "90%", maxWidth: previewData ? "700px" : "450px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", transition: "all 0.3s ease" }}>

                        <h3 style={{ margin: "0 0 10px 0", color: COLORS.primary }}>Cargar Asistencias</h3>
                        <p style={{ fontSize: "13px", color: "#4b5563", marginBottom: "20px" }}>
                            Documentos para <strong>{doctorSubida.nombre} {doctorSubida.apellido_paterno} {doctorSubida.apellido_materno}</strong>.
                        </p>

                        <form onSubmit={handleSubirFormatos}>

                            {/* CAJA 1: EL EXCEL DE DATOS */}
                            <div style={{ border: `2px dashed ${COLORS.secondary}`, padding: "20px", borderRadius: "6px", marginBottom: "15px", backgroundColor: "#fdfdfa" }}>
                                <label style={{ fontWeight: "bold", fontSize: "14px", color: COLORS.secondary, display: "block", marginBottom: "10px" }}>1. Archivo de Datos (Excel)</label>
                                <input
                                    type="file"
                                    accept=".xls,.xlsx"
                                    onChange={handleExcelChange}
                                    style={{ width: "100%", fontSize: "13px" }}
                                    required
                                />
                                {previewLoading && <span style={{ fontSize: "12px", color: "#666", marginTop: "10px", display: "block" }}>Leyendo Excel... ⏳</span>}
                            </div>

                            {/* TABLA DE PREVISUALIZACIÓN */}
                            {previewData && (
                                <div style={{ marginBottom: "20px", border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
                                    <div style={{ backgroundColor: "#10312B", color: "white", padding: "10px", fontSize: "13px", fontWeight: "bold", textAlign: "center" }}>
                                        ✅ Se detectaron {previewData.total_dias_registrados} días con registro
                                    </div>
                                    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                            <thead style={{ backgroundColor: "#f9fafb" }}>
                                                <tr>
                                                    <th style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>Fecha</th>
                                                    <th style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>Turno</th>
                                                    <th style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>Entrada</th>
                                                    <th style={{ padding: "8px", borderBottom: "1px solid #e5e7eb" }}>Salida</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.detalle_asistencias.map((fila, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{fila.fecha}</td>
                                                        <td style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>{fila.turno}</td>
                                                        <td style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", textAlign: "center", fontWeight: "bold", color: fila.entrada !== "--:--" ? COLORS.primary : "#999" }}>{fila.entrada}</td>
                                                        <td style={{ padding: "8px", borderBottom: "1px solid #e5e7eb", textAlign: "center", fontWeight: "bold", color: fila.salida !== "--:--" ? COLORS.primary : "#999" }}>{fila.salida}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* CAJA 2: EL PDF FIRMADO */}
                            <div style={{ border: `2px dashed ${COLORS.primary}`, padding: "20px", borderRadius: "6px", marginBottom: "20px", backgroundColor: "#f4f7f6" }}>
                                <label style={{ fontWeight: "bold", fontSize: "14px", color: COLORS.primary, display: "block", marginBottom: "10px" }}>2. Documento Legal (PDF Firmado)</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setArchivoPDF(e.target.files[0])}
                                    style={{ width: "100%", fontSize: "13px" }}
                                    required
                                />
                            </div>

                            <div style={{
                                marginBottom: "20px",
                                backgroundColor: autorizado ? "#f0fdf4" : "#f9fafb",
                                padding: "14px 16px",
                                borderRadius: "6px",
                                border: `1px solid ${autorizedBorder => autorizado ? COLORS.primary : "#e5e7eb"}`,
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                transition: "all 0.2s ease"
                            }}>
                                <input
                                    type="checkbox"
                                    id="check-autorizacion"
                                    checked={autorizado}
                                    onChange={(e) => setAutorizado(e.target.checked)}
                                    style={{
                                        width: "18px",
                                        height: "18px",
                                        cursor: "pointer",
                                        accentColor: COLORS.primary, // Cambia el color nativo del check al verde institucional
                                        flexShrink: 0
                                    }}
                                />
                                <label htmlFor="check-autorizacion" style={{ fontSize: "12px", color: "#1f2937", cursor: "pointer", lineHeight: "1.4", fontWeight: "500" }}>
                                    Bajo protesta de decir verdad, <strong>valido</strong> que el profesional de la salud laboró los días y horarios especificados en la documentación adjunta.
                                </label>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button
                                    type="button"
                                    onClick={() => { setAutorizado(false); cerrarModal(); }}
                                    style={{ backgroundColor: "transparent", border: "none", color: "#6b7280", fontWeight: "bold", cursor: "pointer", padding: "8px 15px" }}
                                    disabled={subiendo}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        backgroundColor: (subiendo || !previewData || !archivoPDF || !autorizado) ? "#9ca3af" : COLORS.primary,
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontWeight: "bold",
                                        cursor: (subiendo || !previewData || !archivoPDF || !autorizado) ? "not-allowed" : "pointer",
                                        padding: "10px 20px",
                                        transition: "background-color 0.2s"
                                    }}
                                    disabled={subiendo || !previewData || !archivoPDF || !autorizado}
                                >
                                    {subiendo ? "Guardando en BD..." : "Guardar Documentos"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
