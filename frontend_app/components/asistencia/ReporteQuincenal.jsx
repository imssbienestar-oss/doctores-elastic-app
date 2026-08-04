import React, { useState, useEffect } from "react";
import { useAuth } from "../../src/contexts/AuthContext";
import MainLayout from "../Navbar";
import html2pdf from "html2pdf.js";
import Swal from 'sweetalert2';

const COLORS = {
    primary: "#10312B",
    secondary: "#B08D55",
    bg: "#f4f6f8",
    white: "#ffffff",
    border: "#d1d5db",
    danger: "#9F2241"
};

export default function ReporteQuincenal() {
    const { token } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

    // Estados para la lista de médicos de la unidad
    const [medicos, setMedicos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [totalMedicos, setTotalMedicos] = useState(0);

    // Estados para el reporte del médico seleccionado
    const [doctorSeleccionado, setDoctorSeleccionado] = useState(null);
    const [mesSeleccionado, setMesSeleccionado] = useState("8"); // Agosto por defecto (2026)
    const [quincenaSeleccionada, setQuincenaSeleccionada] = useState("1");
    const [reporteData, setReporteData] = useState(null);
    const [cargandoReporte, setCargandoReporte] = useState(false);

    // Estados para subir PDF firmados (tu flujo anterior)
    const [doctorSubida, setDoctorSubida] = useState(null);
    const [archivoPDF, setArchivoPDF] = useState(null);
    const [subiendo, setSubiendo] = useState(false);

    // 1. Cargar los médicos adscritos a la unidad del responsable actual
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

        if (token) {
            fetchMedicosUnidad();
        }
    }, [token, currentPage, API_BASE_URL]);

    // 2. Generar datos del reporte para un médico específico
    const handleGenerarReporte = async (doc) => {
        setDoctorSeleccionado(doc);
        setCargandoReporte(true);
        setReporteData(null);
        setError("");

        try {
            const url = `${API_BASE_URL}/api/peas/reporte-quincenal/datos/${doc.id_imss}?anio=2026&mes=${mesSeleccionado}&quincena=${quincenaSeleccionada}`;
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setReporteData(data);
            } else {
                const errData = await response.json().catch(() => ({}));
                setError(errData.detail || "Error al calcular el formato quincenal.");
            }
        } catch (err) {
            setError("Error de conexión al generar datos.");
        } finally {
            setCargandoReporte(false);
        }
    };

    const totalPages = Math.ceil(totalMedicos / itemsPerPage);

    const handleDescargarPDF = () => {
        const elemento = document.getElementById("hoja-reporte"); // Tomamos solo el formato
        const opciones = {
            margin: 10,
            filename: `Asistencia_${doctorSeleccionado?.id_imss}_Quincena${quincenaSeleccionada}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true }, // Mayor calidad
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' } // Formato carta
        };

        // Genera y descarga el archivo automáticamente
        html2pdf().set(opciones).from(elemento).save();
    };

    const turnoLower = (doctorSeleccionado?.turno || "").toLowerCase();
    let horarioExtra = "";
    if (turnoLower.includes("matutino")) horarioExtra = "(07:00 a 15:00)";
    else if (turnoLower.includes("vespertino")) horarioExtra = "(13:00 a 21:00)";
    else if (turnoLower.includes("nocturno")) horarioExtra = "(21:00 a 09:00)";
    else if (turnoLower.includes("jornada") || turnoLower.includes("acumulada")) horarioExtra = "(07:00 a 22:00 sábado y 08:00 a 20:00 domingos)";

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    let textoPeriodo = "";
    if (reporteData?.periodo) {
        const p = reporteData.periodo;
        const nombreMes = meses[p.mes - 1]; // Convierte el 8 en "Agosto"
        if (p.quincena == 1) { // Nota: en Javascript puede ser "1" o 1, usar == es más seguro aquí
            textoPeriodo = `01 al 15 de ${nombreMes} ${p.anio}`;
        } else {
            const ultimoDia = p.fecha_fin.split("-")[2]; // Extrae el "30" o "31" de la fecha
            textoPeriodo = `16 al ${ultimoDia} de ${nombreMes} ${p.anio}`;
        }
    }

    const handleSubirPDF = async (e) => {
        e.preventDefault();
        if (!archivoPDF) {
            alert("Por favor selecciona un archivo PDF.");
            return;
        }

        // Validación en el cliente para no gastar recursos del servidor
        if (archivoPDF.type !== "application/pdf") {
            Swal.fire({
                title: "Formato Incorrecto",
                text: "El archivo debe ser estrictamente un documento PDF.",
                icon: "warning",
                confirmButtonColor: "#B08D55" // Dorado
            });
            return;
        }
        if (archivoPDF.size > 5 * 1024 * 1024) { // Límite de 5MB
            alert("El archivo es demasiado pesado. El máximo es 5MB.");
            return;
        }

        setSubiendo(true);

        // Armamos el "paquete" de datos igual que un formulario HTML
        const formData = new FormData();
        formData.append("id_imss", doctorSubida.id_imss);
        // NOTA: Asegúrate de usar tus variables de estado reales para año, mes y quincena
        formData.append("anio", 2026); // Cambiar por tu estado de año
        formData.append("mes", 8);     // Cambiar por tu estado de mesSeleccionado
        formData.append("quincena", 1); // Cambiar por tu estado de quincenaSeleccionada
        formData.append("subido_por", "RESPONSABLE_UNIDAD"); // O el ID del usuario logueado
        formData.append("archivo", archivoPDF);

        try {
            const response = await fetch(`${API_BASE_URL}/api/peas/reporte-quincenal/subir`, {
                method: "POST",
                headers: {
                    // OJO: No se pone "Content-Type" cuando mandas FormData, el navegador lo calcula solo
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.detail || "Error al subir el documento");

            Swal.fire({
                title: "¡Documento Respaldado!",
                text: "El reporte se ha enviado correctamente",
                icon: "success",
                confirmButtonColor: "#10312B" // Verde Institucional
            });
            setDoctorSubida(null); // Cerramos el modal
            setArchivoPDF(null); // Limpiamos el input
        } catch (error) {
            Swal.fire({
                title: "Error al Subir",
                text: `Falló la subida: ${error.message}`,
                icon: "error",
                confirmButtonColor: "#9F2241" // Rojo Institucional
            });
        } finally {
            setSubiendo(false);
        }
    };


    return (
        <div style={{ backgroundColor: COLORS.bg, minHeight: "100vh", padding: "20px", fontFamily: "Arial, sans-serif" }}>

            {/* CSS para impresión limpia del formato */}
            <style>
                {`
                    @media print {
                        body * { visibility: hidden; }
                        #hoja-reporte, #hoja-reporte * { visibility: visible; }
                        #hoja-reporte { 
                            position: absolute; 
                            left: 0; 
                            top: 0; 
                            width: 100%;
                            margin: 0;
                            padding: 20px;
                            background: white;
                        }
                        .no-print { display: none !important; }
                    }
                    `}
            </style>

            <div className="no-print" style={{ maxWidth: "1000px", margin: "0 auto", background: "white", padding: "25px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                <h2 style={{ color: COLORS.primary, marginBottom: "15px", borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: "10px" }}>
                    Personal Adscrito a tu Unidad - Control de Asistencia
                </h2>

                {/* Controles globales de periodo para el reporte */}
                <div style={{ display: "flex", gap: "15px", marginBottom: "20px", background: "#f8f9fa", padding: "12px", borderRadius: "6px", alignItems: "center" }}>
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

                {/* Tabla de Médicos de la Unidad */}
                {isLoading ? (
                    <p style={{ textAlign: "center", padding: "20px" }}>Cargando personal de la unidad...</p>
                ) : (
                    <div>
                        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" }}>
                            <thead>
                                <tr style={{ backgroundColor: "#10312B", color: "white", textAlign: "left", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    <th style={{ padding: "14px 15px", fontWeight: "600" }}>ID IMSS</th>
                                    <th style={{ padding: "14px 15px", fontWeight: "600" }}>Nombre Completo</th>
                                    <th style={{ padding: "14px 15px", fontWeight: "600" }}>Especialidad / Turno</th>
                                    <th style={{ padding: "14px 15px", textAlign: "center", fontWeight: "600" }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {medicos.length > 0 ? (
                                    medicos.map((doc, index) => (
                                        <tr key={doc.id_imss} style={{
                                            borderBottom: "1px solid #e5e7eb",
                                            backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9fafb", // Efecto cebra
                                            transition: "background-color 0.2s"
                                        }}>
                                            <td style={{ padding: "14px 15px", fontWeight: "bold", color: "#374151" }}>{doc.id_imss}</td>
                                            <td style={{ padding: "14px 15px", color: "#111827" }}>
                                                {doc.nombre} {doc.apellido_paterno} {doc.apellido_materno}
                                                {doc.reporte_subido && (
                                                    <span title="Reporte Firmado y Subido a la Nube" style={{ marginLeft: "8px", cursor: "help", fontSize: "15px" }}>
                                                        ✅
                                                    </span>
                                                )}
                                                <br />
                                                <span style={{
                                                    display: "inline-block",
                                                    marginTop: "6px",
                                                    padding: "4px 10px",
                                                    borderRadius: "4px", // Cuadrado redondeado más formal
                                                    fontSize: "11px",
                                                    fontWeight: "bold",
                                                    letterSpacing: "0.3px",
                                                    color: "white",
                                                    backgroundColor:
                                                        doc.estatus?.includes("ACTIVO") ? "#10312B" :
                                                            doc.estatus?.includes("BAJA") ? "#9F2241" :
                                                                "#B08D55"
                                                }}>
                                                    {doc.estatus}
                                                </span>
                                            </td>
                                            <td style={{ padding: "14px 15px", color: "#4b5563", fontSize: "13px" }}>
                                                <strong style={{ color: "#111827" }}>{doc.especialidad}</strong> <br />
                                                {doc.turno}
                                            </td>
                                            <td style={{ padding: "14px 15px", textAlign: "center" }}>
                                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                                                    <button
                                                        onClick={() => handleGenerarReporte(doc)}
                                                        style={{ backgroundColor: "#10312B", color: "white", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "13px", width: "130px" }}
                                                    >
                                                        Ver Reporte
                                                    </button>

                                                    {/* NUEVO BOTÓN DE SUBIDA */}
                                                    <button
                                                        onClick={() => setDoctorSubida(doc)}
                                                        style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", fontWeight: "600", fontSize: "12px", width: "130px" }}
                                                    >
                                                        Subir Firmado
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: "center", padding: "30px", color: "#6b7280", fontStyle: "italic" }}>No hay médicos adscritos registrados en tu unidad.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Paginación simple */}
                        {totalPages > 1 && (
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "20px" }}>
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    style={{ padding: "6px 12px", cursor: "pointer" }}
                                >
                                    Anterior
                                </button>
                                <span>Página {currentPage} de {totalPages}</span>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    style={{ padding: "6px 12px", cursor: "pointer" }}
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* VISUALIZACIÓN DEL REPORTE / HOJA OFICIAL (Se despliega al dar clic en Ver Reporte) */}
            {reporteData && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px"
                }}>
                    {/* Contenedor blanco del Modal */}
                    <div style={{
                        backgroundColor: "#f4f6f8",
                        width: "100%",
                        maxWidth: "850px",
                        maxHeight: "90vh", /* Altura máxima del 90% de la pantalla */
                        overflowY: "auto", /* AQUÍ ESTÁ EL TRUCO: Scroll solo en la caja blanca */
                        borderRadius: "10px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                        padding: "25px",
                        position: "relative"
                    }}>


                        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid #d1d5db`, paddingBottom: "15px" }}>
                            <h3 style={{ margin: 0, color: "#10312B", fontSize: "18px" }}>Vista Previa: {doctorSeleccionado?.nombre}</h3>

                            {/* Contenedor de botones alineados */}
                            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>

                                {/* NUEVO BOTÓN QUE USA LA LIBRERÍA PDF */}
                                <button
                                    onClick={handleDescargarPDF}
                                    style={{ backgroundColor: "#B08D55", color: "white", border: "none", padding: "10px 20px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                                >
                                    📥 Descargar PDF Oficial
                                </button>

                                <button
                                    onClick={() => setReporteData(null)}
                                    style={{ background: "none", border: "none", fontSize: "24px", fontWeight: "bold", color: "#9F2241", cursor: "pointer", padding: "0 5px" }}
                                    title="Cerrar"
                                >
                                    ✖
                                </button>
                            </div>
                        </div>

                        {/* La hoja oficial con la tabla de asistencias y horarios (Lo que se imprime) */}
                        <div id="hoja-reporte" style={{ backgroundColor: "white", padding: "40px", borderRadius: "8px", border: "1px solid #ddd" }}>
                            <h4 style={{ textAlign: "center", marginBottom: "20px", fontSize: "14px", textTransform: "uppercase" }}>
                                Registro de Cooperación Técnica, Científica y Académica de los Profesionales de la Salud
                            </h4>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", fontSize: "13px", marginBottom: "20px", borderBottom: "1px solid #ddd", paddingBottom: "15px" }}>

                                {/* COLUMNA IZQUIERDA */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <div><strong>Nombre:</strong> {doctorSeleccionado?.nombre} {doctorSeleccionado?.apellido_paterno} {doctorSeleccionado?.apellido_materno}</div>
                                    <div><strong>Especialidad:</strong> {doctorSeleccionado?.especialidad}</div>
                                    <div><strong>Unidad Médica:</strong> {doctorSeleccionado?.nombre_unidad}</div>
                                </div>

                                {/* COLUMNA DERECHA */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <div>
                                        <strong>Turno:</strong> {doctorSeleccionado?.turno} <span style={{ fontSize: "11px", color: "#555" }}>{horarioExtra}</span>
                                    </div>
                                    <div>
                                        <strong>Periodo:</strong> {textoPeriodo}
                                    </div>
                                </div>

                            </div>

                            {/* Tabla de asistencias de la quincena */}
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                <thead>
                                    <tr style={{ backgroundColor: COLORS.primary, color: "white" }}>
                                        <th style={{ border: "1px solid #333", padding: "6px" }}>Fecha</th>
                                        <th style={{ border: "1px solid #333", padding: "6px" }}>Hora Ingreso</th>
                                        <th style={{ border: "1px solid #333", padding: "6px" }}>Firma</th>
                                        <th style={{ border: "1px solid #333", padding: "6px" }}>Hora Egreso</th>
                                        <th style={{ border: "1px solid #333", padding: "6px" }}>Firma</th>
                                        <th style={{ border: "1px solid #333", padding: "6px" }}>Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reporteData.dias_laborables?.map((item, idx) => {

                                        const partesFecha = item.fecha.split("-");
                                        const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
                                        // Lógica inteligente para las Observaciones
                                        let textoObservacion = "ASISTENCIA";
                                        let colorObs = "#10312B"; // Verde por defecto
                                        let weightObs = "normal";

                                        const sinRegistro = item.hora_ingreso === "--:--" && item.hora_egreso === "--:--";

                                        if (sinRegistro) {
                                            // Leemos el estatus HISTÓRICO exacto que nos mandó Python
                                            if (item.estatus_dia && !item.estatus_dia.includes("ACTIVO")) {
                                                textoObservacion = item.estatus_dia;
                                                colorObs = "#B08D55"; // Mostaza
                                                weightObs = "bold";
                                            } else {
                                                textoObservacion = "FALTA / SIN REGISTRO";
                                                colorObs = "#9F2241"; // Rojo
                                                weightObs = "bold";
                                            }
                                        }

                                        return (
                                            <tr key={idx}>
                                                <td style={{ border: "1px solid #333", padding: "6px", textAlign: "center" }}>{fechaFormateada}</td>
                                                <td style={{ border: "1px solid #333", padding: "6px", textAlign: "center" }}>{item.hora_ingreso}</td>
                                                <td style={{ border: "1px solid #333", padding: "6px" }}></td>
                                                <td style={{ border: "1px solid #333", padding: "6px", textAlign: "center" }}>{item.hora_egreso}</td>
                                                <td style={{ border: "1px solid #333", padding: "6px" }}></td>
                                                <td style={{
                                                    border: "1px solid #333",
                                                    padding: "6px",
                                                    textAlign: "center",
                                                    color: colorObs,
                                                    fontWeight: weightObs,
                                                    fontSize: "11px"
                                                }}>
                                                    {textoObservacion}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* SECCIÓN DE FIRMAS PARA EL PDF */}
                            <div style={{
                                marginTop: "50px",
                                display: "flex",
                                justifyContent: "space-between",
                                textAlign: "center",
                                fontSize: "12px",
                                pageBreakInside: "avoid" /* Evita que las firmas se corten a la mitad en otra página */
                            }}>
                                <div style={{ width: "45%" }}>
                                    <div style={{ borderBottom: "1px solid #333", height: "40px", marginBottom: "8px" }}></div>
                                    <strong>Firma del Profesional de la Salud</strong>
                                    <br />
                                    <span style={{ color: "#555" }}>
                                        {doctorSeleccionado?.nombre} {doctorSeleccionado?.apellido_paterno} {doctorSeleccionado?.apellido_materno}
                                    </span>
                                </div>
                                <div style={{ width: "45%" }}>
                                    <div style={{ borderBottom: "1px solid #333", height: "40px", marginBottom: "8px" }}></div>
                                    <strong>Nombre, Firma y Sello</strong>
                                    <br />
                                    <span style={{ color: "#555" }}>Responsable de la Unidad Médica</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PARA SUBIR EL PDF FIRMADO */}
            {doctorSubida && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
                    <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "8px", width: "90%", maxWidth: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>

                        <h3 style={{ margin: "0 0 10px 0", color: "#10312B" }}>Subir Reporte Firmado</h3>
                        <p style={{ fontSize: "13px", color: "#4b5563", marginBottom: "20px" }}>
                            Adjunta el formato PDF firmado físicamente por <strong>{doctorSubida.nombre} {doctorSubida.apellido_paterno}</strong>.
                        </p>

                        <form onSubmit={handleSubirPDF}>
                            <div style={{ border: "2px dashed #d1d5db", padding: "30px 20px", textAlign: "center", borderRadius: "6px", marginBottom: "20px", backgroundColor: "#f9fafb" }}>
                                <input
                                    type="file"
                                    accept=".pdf" // Obligamos al navegador a solo buscar PDFs
                                    onChange={(e) => setArchivoPDF(e.target.files[0])}
                                    style={{ width: "100%", fontSize: "14px" }}
                                    required
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button
                                    type="button"
                                    onClick={() => { setDoctorSubida(null); setArchivoPDF(null); }}
                                    style={{ backgroundColor: "transparent", border: "none", color: "#6b7280", fontWeight: "bold", cursor: "pointer", padding: "8px 15px" }}
                                    disabled={subiendo}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{ backgroundColor: "#B08D55", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: subiendo ? "not-allowed" : "pointer", padding: "8px 20px" }}
                                    disabled={subiendo}
                                >
                                    {subiendo ? "Subiendo..." : "Guardar Documento"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}