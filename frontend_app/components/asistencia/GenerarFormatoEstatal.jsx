import React, { useState, useEffect } from "react";
import { useAuth } from "../../src/contexts/AuthContext";
import Swal from 'sweetalert2';
import html2pdf from "html2pdf.js";

const COLORS = {
    primary: "#10312B",
    secondary: "#B08D55",
    bg: "#f4f6f8",
    white: "#ffffff",
    border: "#d1d5db",
    textLight: "#6b7280"
};

export default function GenerarFormatoEstatal() {
    const { token, currentUser } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

    const [anio, setAnio] = useState("2026");
    const [mes, setMes] = useState("8");
    const [quincena, setQuincena] = useState("1");
    const entidad = currentUser?.entidad || "BAJA CALIFORNIA";

    const [datosFormato, setDatosFormato] = useState(null);
    const [cargando, setCargando] = useState(false);

    const [archivoFirmado, setArchivoFirmado] = useState(null);
    const [subiendoArchivo, setSubiendoArchivo] = useState(false);

    // ==========================================
    // ESTADOS PARA EL MODAL DE HISTORIAL
    // ==========================================
    const [mostrarModal, setMostrarModal] = useState(false);
    const [historial, setHistorial] = useState([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    const [estadoActual, setEstadoActual] = useState(null);
    const [observacionesRechazo, setObservacionesRechazo] = useState("");

    const handleCargarDatos = async () => {
        setCargando(true);
        setDatosFormato(null);
        setArchivoFirmado(null);

        const periodoStr = `${anio}-${mes.padStart(2, '0')}-Q${quincena}`;

        try {
            const response = await fetch(`${API_BASE_URL}/api/peas/coordinador/generar-formato2/${entidad}/${periodoStr}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Error al obtener los datos");
            }

            const data = await response.json();
            setDatosFormato(data);

        } catch (error) {
            Swal.fire({ title: "Sin Registros", text: error.message, icon: "info", confirmButtonColor: COLORS.primary });
        } finally {
            setCargando(false);
        }
    };

    const handleDescargarPDF = () => {
        const elemento = document.getElementById("formato-2-print");
        const opciones = {
            margin: [10, 10, 10, 10],
            filename: `Formato2_${entidad}_Q${quincena}_${anio}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'landscape' }
        };

        elemento.style.display = "block";
        html2pdf().set(opciones).from(elemento).save().then(() => {
            elemento.style.display = "none";
        });
    };

    const getTextoPeriodo = () => {
        const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        const nombreMes = meses[parseInt(mes) - 1];
        if (quincena === "1") return `01 AL 15 DE ${nombreMes} DE ${anio}`;
        return `16 AL FIN DE ${nombreMes} DE ${anio}`;
    };

    const handleSubirFormatoFirmado = async (e) => {
        e.preventDefault();
        if (!archivoFirmado) {
            Swal.fire("Archivo faltante", "Por favor selecciona el PDF escaneado.", "warning");
            return;
        }

        setSubiendoArchivo(true);
        const formData = new FormData();
        formData.append("entidad", entidad);
        formData.append("anio", anio);
        formData.append("mes", mes);
        formData.append("quincena", quincena);
        formData.append("subido_por", currentUser?.username || "COORDINADOR");
        formData.append("archivo", archivoFirmado);

        try {
            const response = await fetch(`${API_BASE_URL}/api/peas/coordinador/subir-formato-estatal`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Error al subir el archivo");

            Swal.fire({
                title: "¡Éxito!",
                text: "La Bitácora Estatal se ha respaldado correctamente.",
                icon: "success",
                confirmButtonColor: COLORS.primary
            });

            setEstadoActual("PENDIENTE");
            setObservacionesRechazo("");
            setArchivoFirmado(null);
            setDatosFormato(null); // Ocultar el formulario de subida al terminar

        } catch (error) {
            Swal.fire("Error", error.message, "error");
        } finally {
            setSubiendoArchivo(false);
        }
    };

    // ==========================================
    // FUNCIONES DEL HISTORIAL
    // ==========================================
    const abrirHistorial = async () => {
        setCargandoHistorial(true);
        setMostrarModal(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/peas/coordinador/historial-formatos/${entidad}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistorial(data);
            } else {
                throw new Error("No se pudo cargar el historial.");
            }
        } catch (error) {
            Swal.fire("Error", error.message, "error");
            setMostrarModal(false);
        } finally {
            setCargandoHistorial(false);
        }
    };

    const verDocumentoDeNube = async (rutaPdf) => {
        if (!rutaPdf) return;
        try {
            Swal.fire({ title: 'Abriendo...', text: 'Generando enlace seguro...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            const response = await fetch(`${API_BASE_URL}/api/peas/reporte-quincenal/ver-documento?ruta=${encodeURIComponent(rutaPdf)}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                Swal.close();
                window.open(data.url, "_blank");
            } else {
                throw new Error("No se pudo obtener el documento de la nube.");
            }
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    };

    useEffect(() => {
        const verificarEstadoPeriodo = async () => {
            const periodoStr = `${anio}-${mes.padStart(2, '0')}-Q${quincena}`;
            try {
                const res = await fetch(`${API_BASE_URL}/api/peas/coordinador/historial-formatos/${entidad}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Buscamos si en el historial ya existe este formato
                    const formatoPeriodo = data.find(f => f.quincena === periodoStr);

                    if (formatoPeriodo) {
                        setEstadoActual(formatoPeriodo.estado);
                        setObservacionesRechazo(formatoPeriodo.observaciones);
                    } else {
                        setEstadoActual(null);
                        setObservacionesRechazo("");
                    }
                }
            } catch (error) {
                console.error("Error al verificar estado", error);
            }
        };

        if (token) verificarEstadoPeriodo();
    }, [anio, mes, quincena, entidad, token]);

    return (
        <div style={{ backgroundColor: COLORS.bg, minHeight: "100vh", padding: "30px 20px", fontFamily: "Arial, sans-serif", position: "relative" }}>

            <div style={{ maxWidth: "900px", margin: "0 auto" }}>

                {/* ENCABEZADO CON BOTÓN DE HISTORIAL */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "25px", borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: "10px" }}>
                    <div>
                        <h2 style={{ color: COLORS.primary, margin: 0, fontSize: "24px" }}>Bitácora Estatal de Cooperación</h2>
                    </div>
                    <button
                        onClick={abrirHistorial}
                        style={{ backgroundColor: COLORS.white, color: COLORS.primary, border: `1px solid ${COLORS.primary}`, padding: "8px 16px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", transition: "0.2s" }}>
                        📂 Ver Historial de Resguardos
                    </button>
                </div>

                {String(estadoActual).toUpperCase().includes("RECHAZADO") && (
                    <div className="no-print" style={{ backgroundColor: "#fde8e8", border: "1px solid #9F2241", borderLeft: "5px solid #9F2241", padding: "15px 20px", borderRadius: "4px", marginBottom: "25px", display: "flex", flexDirection: "column", gap: "5px" }}>
                        <h4 style={{ color: "#9F2241", margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "15px" }}>
                            ⚠️ ATENCIÓN: FORMATO RECHAZADO POR NIVEL NACIONAL
                        </h4>
                        <p style={{ margin: "5px 0 0 0", color: "#374151", fontSize: "14px" }}>
                            <strong>Motivo del rechazo:</strong> {observacionesRechazo}
                        </p>
                        <p style={{ margin: "10px 0 0 0", color: "#6b7280", fontSize: "12px", fontStyle: "italic" }}>
                            Por favor, revise y corrija la información en el Paso 1, recabe nuevamente las firmas, y vuelva a subir el documento corregido en el Paso 2 para continuar con su validación.
                        </p>
                    </div>
                )}

                {/* PASO 1: GENERACIÓN */}
                <div className="no-print" style={{ background: COLORS.white, padding: "25px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", marginBottom: "30px", border: `1px solid ${COLORS.border}` }}>
                    <h3 style={{ color: COLORS.primary, marginTop: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ backgroundColor: COLORS.primary, color: "white", width: "24px", height: "24px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: "14px" }}>1</span>
                        Generar Formato Quincenal
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px", margin: "20px 0", backgroundColor: "#f9fafb", padding: "20px", borderRadius: "6px" }}>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", display: "block", marginBottom: "6px" }}>Entidad Federativa:</label>
                            <input
                                type="text"
                                value={entidad}
                                disabled
                                style={{ width: "100%", padding: "10px", borderRadius: "4px", border: `1px solid ${COLORS.border}`, backgroundColor: "#e5e7eb", color: "#6b7280", fontWeight: "bold", cursor: "not-allowed" }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", display: "block", marginBottom: "6px" }}>Año:</label>
                            <select value={anio} onChange={(e) => setAnio(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "4px", border: `1px solid ${COLORS.border}` }}>
                                <option value="2025">2025</option><option value="2026">2026</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", display: "block", marginBottom: "6px" }}>Mes:</label>
                            <select value={mes} onChange={(e) => setMes(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "4px", border: `1px solid ${COLORS.border}` }}>
                                <option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option>
                                <option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option>
                                <option value="7">Julio</option><option value="8">Agosto</option><option value="9">Septiembre</option>
                                <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", display: "block", marginBottom: "6px" }}>Quincena:</label>
                            <select value={quincena} onChange={(e) => setQuincena(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "4px", border: `1px solid ${COLORS.border}` }}>
                                <option value="1">1ra Quincena (01-15)</option>
                                <option value="2">2da Quincena (16-Fin)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "center" }}>
                        <button
                            onClick={handleCargarDatos}
                            disabled={cargando}
                            style={{ backgroundColor: COLORS.primary, color: "white", padding: "12px 24px", border: "none", borderRadius: "4px", cursor: cargando ? "wait" : "pointer", fontWeight: "bold", transition: "0.2s" }}>
                            {cargando ? "Consultando Base de Datos..." : "Buscar Registros Validados"}
                        </button>

                        {datosFormato && (
                            <button
                                onClick={handleDescargarPDF}
                                style={{ backgroundColor: COLORS.secondary, color: "white", padding: "12px 24px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 2px 4px rgba(176,141,85,0.4)" }}>
                                Generar PDF para Firma
                            </button>
                        )}
                    </div>
                </div>

                {/* PASO 2: SUBIR DOCUMENTO (Solo aparece si ya cargó datos) */}
                {datosFormato && (
                    <div className="no-print" style={{ background: COLORS.white, padding: "25px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: `1px solid ${COLORS.border}` }}>
                        <h3 style={{ color: COLORS.primary, marginTop: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ backgroundColor: COLORS.primary, color: "white", width: "24px", height: "24px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: "14px" }}>2</span>
                            Resguardar Documento Legal Firmado
                        </h3>

                        <p style={{ fontSize: "13px", color: COLORS.textLight, marginBottom: "20px" }}>
                            Una vez que haya impreso y recabado las firmas físicas del Coordinador y el Enlace Estatal, escanee el documento completo y súbalo aquí para su resguardo definitivo en la nube.
                        </p>

                        <form onSubmit={handleSubirFormatoFirmado} style={{ display: "flex", gap: "15px", alignItems: "flex-end", backgroundColor: "#fdfdfa", padding: "20px", border: `1px dashed ${COLORS.secondary}`, borderRadius: "6px" }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: "12px", fontWeight: "bold", color: COLORS.secondary, display: "block", marginBottom: "8px" }}>Seleccionar archivo PDF escaneado:</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setArchivoFirmado(e.target.files[0])}
                                    style={{ width: "100%", padding: "8px", fontSize: "13px" }}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={subiendoArchivo || !archivoFirmado}
                                style={{ backgroundColor: COLORS.primary, color: "white", padding: "12px 24px", border: "none", borderRadius: "4px", cursor: (subiendoArchivo || !archivoFirmado) ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                                {subiendoArchivo ? "Subiendo a la nube..." : "Guardar en Base de Datos"}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* MODAL DE HISTORIAL (Overlay) */}
            {/* ========================================================= */}
            {mostrarModal && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
                    <div style={{ background: COLORS.white, width: "100%", maxWidth: "800px", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

                        <div style={{ backgroundColor: COLORS.primary, padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ color: "white", margin: 0, fontSize: "18px" }}>Historial de Bitácoras Estatales</h3>
                            <button onClick={() => setMostrarModal(false)} style={{ background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer", fontWeight: "bold" }}>&times;</button>
                        </div>

                        <div style={{ padding: "20px", overflowY: "auto", backgroundColor: COLORS.bg }}>
                            {cargandoHistorial ? (
                                <p style={{ textAlign: "center", padding: "20px" }}>Consultando base de datos...</p>
                            ) : (
                                <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", borderRadius: "6px", overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#e5e7eb", color: "#374151", textAlign: "center", fontSize: "13px" }}>
                                            <th style={{ padding: "12px", borderBottom: `1px solid ${COLORS.border}` }}>Quincena</th>
                                            <th style={{ padding: "12px", borderBottom: `1px solid ${COLORS.border}` }}>Fecha de Resguardo</th>
                                            <th style={{ padding: "12px", borderBottom: `1px solid ${COLORS.border}` }}>Subido Por</th>
                                            <th style={{ padding: "12px", borderBottom: `1px solid ${COLORS.border}`, textAlign: "center" }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historial.length > 0 ? historial.map((item, idx) => (
                                            <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9fafb", textAlign: "center" }}>
                                                <td style={{ padding: "12px", borderBottom: `1px solid ${COLORS.border}`, fontWeight: "bold", fontSize: "13px" }}>{item.quincena}</td>
                                                <td style={{ padding: "12px", borderBottom: `1px solid ${COLORS.border}`, fontSize: "13px", color: COLORS.textLight }}>{item.fecha_subida}</td>
                                                <td style={{ padding: "12px", borderBottom: `1px solid ${COLORS.border}`, fontSize: "13px", color: COLORS.textLight }}>{item.subido_por}</td>
                                                <td style={{ padding: "12px", borderBottom: `1px solid ${COLORS.border}`, textAlign: "center" }}>
                                                    <button
                                                        onClick={() => verDocumentoDeNube(item.url_documento)}
                                                        style={{ backgroundColor: COLORS.secondary, color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                                                        Ver PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: "center", padding: "30px", color: COLORS.textLight, fontSize: "14px" }}>
                                                    No hay formatos estatales registrados en el sistema todavía.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* ÁREA OCULTA PARA EL PDF (Solo se ve al exportar) */}
            {/* ========================================================= */}
            {datosFormato && (
                <div id="formato-2-print" style={{ display: "none", padding: "20px", background: "white", width: "100%", boxSizing: "border-box" }}>

                    {/* Encabezados con Logos Simulados */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <div style={{ width: "200px", color: COLORS.primary, fontWeight: "bold", fontSize: "16px" }}>
                            IMSS-BIENESTAR<br /><span style={{ fontSize: "10px", fontWeight: "normal" }}>SERVICIOS PÚBLICOS DE SALUD</span>
                        </div>
                        <div style={{ textAlign: "center", flex: 1, padding: "0 20px" }}>
                            <h3 style={{ fontSize: "12px", margin: 0, textTransform: "uppercase", color: "#111" }}>
                                BITÁCORA ESTATAL DE COOPERACIÓN TÉCNICA, CIENTÍFICA Y ACADÉMICA DE LOS PROFESIONALES DE LA SALUD DE LA BRIGADA MÉDICA CUBANA
                            </h3>
                        </div>
                        <div style={{ width: "200px", textAlign: "right", fontSize: "10px", fontWeight: "bold", color: "#111" }}>
                            MINISTERIO DE SALUD PÚBLICA<br />República de Cuba
                        </div>
                    </div>

                    {/* Sub-encabezado */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "bold", marginBottom: "15px", textTransform: "uppercase", color: "#111" }}>
                        <div>PERIODO: &nbsp;&nbsp;&nbsp;&nbsp; {getTextoPeriodo()}</div>
                        <div>ENTIDAD FEDERATIVA: &nbsp;&nbsp;&nbsp;&nbsp; <span style={{ borderBottom: "1px solid black", paddingBottom: "2px" }}>{entidad.toUpperCase()}</span></div>
                    </div>

                    {/* Tabla de Datos */}
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", textAlign: "center", border: "1px solid black", color: "#111" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#0b5e46", color: "white" }}>
                                <th style={{ border: "1px solid black", padding: "8px", width: "5%" }}>NO.</th>
                                <th style={{ border: "1px solid black", padding: "8px", width: "10%" }}>ID IMB</th>
                                <th style={{ border: "1px solid black", padding: "8px", width: "25%" }}>PROFESIONAL DE LA SALUD</th>
                                <th style={{ border: "1px solid black", padding: "8px", width: "20%" }}>ESPECIALIDAD</th>
                                <th style={{ border: "1px solid black", padding: "8px", width: "10%" }}>PERIODO DE TIEMPO</th>
                                <th style={{ border: "1px solid black", padding: "8px", width: "10%" }}>CLUES IB</th>
                                <th style={{ border: "1px solid black", padding: "8px", width: "15%" }}>UNIDAD MÉDICA</th>
                                <th style={{ border: "1px solid black", padding: "8px", width: "5%" }}>DIAS DE PARTICIPACIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datosFormato.medicos.map((med) => (
                                <tr key={med.id_imb}>
                                    <td style={{ border: "1px solid black", padding: "6px" }}>{med.no}</td>
                                    <td style={{ border: "1px solid black", padding: "6px" }}>{med.id_imb}</td>
                                    <td style={{ border: "1px solid black", padding: "6px", textAlign: "left" }}>{med.nombre}</td>
                                    <td style={{ border: "1px solid black", padding: "6px" }}>{med.especialidad}</td>
                                    <td style={{ border: "1px solid black", padding: "6px", textTransform: "uppercase" }}>{med.turno}</td>
                                    <td style={{ border: "1px solid black", padding: "6px" }}>{med.clues}</td>
                                    <td style={{ border: "1px solid black", padding: "6px", fontSize: "9px" }}>{med.unidad}</td>
                                    <td style={{ border: "1px solid black", padding: "6px" }}>{med.dias}</td>
                                </tr>
                            ))}
                            {/* Fila de Totales */}
                            <tr>
                                <td colSpan="7" style={{ border: "1px solid black", padding: "6px", borderRight: "none" }}></td>
                                <td style={{ border: "1px solid black", padding: "6px", fontWeight: "bold", backgroundColor: "#f4f6f8" }}>
                                    {datosFormato.total_dias}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Área de Firmas */}
                    <div style={{ display: "flex", justifyContent: "space-around", marginTop: "120px", fontSize: "10px", textAlign: "center", color: "#111" }}>
                        <div style={{ width: "35%" }}>
                            <div style={{ borderTop: "1px solid black", paddingTop: "5px" }}>
                                Nombre y firma del Coordinador Estatal Brigada Médica Cubana
                            </div>
                        </div>
                        <div style={{ width: "35%" }}>
                            <div style={{ borderTop: "1px solid black", paddingTop: "5px" }}>
                                Nombre y firma del Enlace Estatal
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
