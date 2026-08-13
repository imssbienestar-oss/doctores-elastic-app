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

export default function FormatosNacionales() {
    const { token, currentUser } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

    const [anio, setAnio] = useState("2026");
    const [mes, setMes] = useState("8");
    const [quincena, setQuincena] = useState("1");

    const [datosFormato3, setDatosFormato3] = useState(null);
    const [datosFormato4, setDatosFormato4] = useState(null);
    const [cargando, setCargando] = useState(false);

    const [archivoFirmado, setArchivoFirmado] = useState(null);
    const [subiendoArchivo, setSubiendoArchivo] = useState(false);
    const [documentosGenerados, setDocumentosGenerados] = useState(false);

    // ==========================================
    // ESTADOS PARA EL MODAL DE HISTORIAL
    // ==========================================
    const [mostrarModal, setMostrarModal] = useState(false);
    const [historial, setHistorial] = useState([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    const [formatosEstatales, setFormatosEstatales] = useState([]);
    const [cargandoFormatos, setCargandoFormatos] = useState(false);

    const [filtroQuincena, setFiltroQuincena] = useState("completo");

    const getTextoPeriodo = () => {
        const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        const nombreMes = meses[parseInt(mes) - 1];

        const ultimoDia = new Date(parseInt(anio), parseInt(mes), 0).getDate();

        if (quincena === "completo") {
            return `1 AL ${ultimoDia} DE ${nombreMes} DE ${anio}`;
        } else if (quincena === "1") {
            return `1 AL 15 DE ${nombreMes} DE ${anio}`;
        } else {
            return `16 AL ${ultimoDia} DE ${nombreMes} DE ${anio}`;
        }
    };

    const cargarYDescargar = async (tipoFormato) => {
        setCargando(true);
        const endpoint = tipoFormato === 3 ? "formato3" : "formato4";

        try {
            const response = await fetch(`${API_BASE_URL}/api/peas/nacional/${endpoint}/${anio}/${mes}/${quincena}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("No se encontraron registros para este periodo.");
            const data = await response.json();

            if (tipoFormato === 3) {
                setDatosFormato3(data);
                setTimeout(() => descargarPDF("formato-3-print", `Formato3_Nacional_Q${quincena}_${anio}.pdf`, 'landscape'), 500);
            } else {
                setDatosFormato4(data);
                setTimeout(() => descargarPDF("formato-4-print", `Formato4_Nacional_Q${quincena}_${anio}.pdf`, 'portrait'), 500);
            }

            setDocumentosGenerados(true);

        } catch (error) {
            Swal.fire({ title: "Sin Registros", text: error.message, icon: "info", confirmButtonColor: COLORS.primary });
        } finally {
            setCargando(false);
        }
    };

    const descargarPDF = (elementId, filename, orientation) => {
        const elemento = document.getElementById(elementId);
        const opciones = {
            margin: [10, 10, 10, 10],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: orientation }
        };

        elemento.style.display = "block";
        html2pdf().set(opciones).from(elemento).save().then(() => {
            elemento.style.display = "none";
            setDatosFormato3(null);
            setDatosFormato4(null);
        });
    };

    const handleSubirDocumentoNacional = async (e) => {
        e.preventDefault();
        if (!archivoFirmado) {
            Swal.fire("Archivo faltante", "Selecciona el archivo PDF con ambos formatos firmados.", "warning");
            return;
        }

        setSubiendoArchivo(true);
        const formData = new FormData();
        formData.append("anio", anio);
        formData.append("mes", mes);
        formData.append("quincena", quincena);
        formData.append("subido_por", currentUser?.username || "ADMIN_NACIONAL");
        formData.append("archivo", archivoFirmado);

        try {
            const response = await fetch(`${API_BASE_URL}/api/peas/nacional/subir-formato-nacional`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Error al subir el archivo");

            Swal.fire({ title: "¡Éxito!", text: "El Formato Nacional ha sido resguardado correctamente.", icon: "success", confirmButtonColor: COLORS.primary });
            setArchivoFirmado(null);
            setDocumentosGenerados(false); // Ocultamos la caja de subida tras el éxito

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
            const res = await fetch(`${API_BASE_URL}/api/peas/nacional/historial-formatos`, {
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

    const fetchFormatosEstatales = async () => {
        setCargandoFormatos(true);
        try {
            // Aquí cambiamos las variables a las correctas: anio, mes, quincena
            const response = await fetch(`${API_BASE_URL}/api/peas/nacional/estado-formatos/${anio}/${mes}/${quincena}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setFormatosEstatales(data);
            }
        } catch (error) {
            console.error("Error al cargar formatos estatales:", error);
        } finally {
            setCargandoFormatos(false);
        }
    };

    // Aquí también actualizamos las dependencias del useEffect
    useEffect(() => {
        fetchFormatosEstatales();
    }, [anio, mes, quincena]);

    const handleAprobarEstatal = async (idFormato) => {
        const confirm = await Swal.fire({
            title: '¿Aprobar Formato?',
            text: "Al aprobarlo, este estado se incluirá en el PDF Nacional.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10312B',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, aprobar'
        });

        if (confirm.isConfirmed) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/peas/nacional/aprobar-formato/${idFormato}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    Swal.fire('¡Aprobado!', 'El formato ha sido integrado exitosamente.', 'success');
                    fetchFormatosEstatales(); // Recargamos la tabla
                }
            } catch (error) {
                Swal.fire('Error', 'No se pudo aprobar el formato', 'error');
            }
        }
    };

    const handleRechazarEstatal = async (formato) => {
        const { value: observaciones, isConfirmed } = await Swal.fire({
            title: '<span style="color: #9F2241; font-weight: bold; border-bottom: 2px solid #B08D55; padding-bottom: 5px;">Rechazar Formato Estatal</span>',
            html: `
            <div style="text-align: left; margin-top: 15px;">
                <p style="font-size: 14px; margin-bottom: 15px;">
                    Detalle las inconsistencias del Formato 2 de <strong>${formato.entidad}</strong>:
                </p>
                <textarea id="swal-obs-estatal" style="width: 100%; height: 80px; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px; resize: none;"></textarea>
            </div>
        `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#9F2241',
            confirmButtonText: 'Confirmar Rechazo',
            preConfirm: () => {
                const texto = document.getElementById('swal-obs-estatal').value;
                if (!texto) { Swal.showValidationMessage('La observación es obligatoria'); return false; }
                return texto;
            }
        });

        if (isConfirmed && observaciones) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/peas/coordinador/rechazar-formato-estatal/${formato.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ observaciones })
                });
                if (response.ok) {
                    Swal.fire('¡Rechazado!', 'Devuelto al Coordinador Estatal.', 'success');
                    fetchFormatosEstatales(); // Recargamos la tabla
                }
            } catch (error) {
                Swal.fire('Error', 'Error de conexión', 'error');
            }
        }
    };


    return (
        <div style={{ backgroundColor: COLORS.bg, minHeight: "100vh", padding: "30px 20px", fontFamily: "Arial, sans-serif", position: "relative" }}>
            <div style={{ maxWidth: "900px", margin: "0 auto" }}>

                {/* ENCABEZADO CON BOTÓN DE HISTORIAL */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "25px", borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: "10px" }}>
                    <div>
                        <h2 style={{ color: COLORS.primary, margin: 0, fontSize: "24px" }}>Gestión Nacional de Cooperación</h2>
                    </div>
                    <button
                        onClick={abrirHistorial}
                        style={{ backgroundColor: COLORS.white, color: COLORS.primary, border: `1px solid ${COLORS.primary}`, padding: "8px 16px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", transition: "0.2s" }}>
                        Ver Historial de Resguardos
                    </button>
                </div>

                {/* PASO 1: GENERACIÓN */}
                <div className="no-print" style={{ background: COLORS.white, padding: "25px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", marginBottom: "30px", border: `1px solid ${COLORS.border}` }}>
                    <h3 style={{ color: COLORS.primary, marginTop: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ backgroundColor: COLORS.primary, color: "white", width: "24px", height: "24px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: "14px" }}>1</span>
                        Generar Documentos para Firma
                    </h3>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px", margin: "20px 0", backgroundColor: "#f9fafb", padding: "20px", borderRadius: "6px" }}>
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
                            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", display: "block", marginBottom: "6px" }}>Periodo a Descargar:</label>
                            <select value={quincena} onChange={(e) => setQuincena(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "4px", border: `1px solid ${COLORS.border}` }}>
                                <option value="completo">Mes Completo (Q1 y Q2)</option>
                                <option value="1">1ra Quincena (01-15)</option>
                                <option value="2">2da Quincena (16-Fin)</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                        <button onClick={() => cargarYDescargar(3)} disabled={cargando} style={{ backgroundColor: COLORS.primary, color: "white", padding: "10px 18px", border: "none", borderRadius: "4px", cursor: cargando ? "wait" : "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", transition: "0.2s" }}>
                            <span>Desglose Nacional<br /></span>
                        </button>
                        <button onClick={() => cargarYDescargar(4)} disabled={cargando} style={{ backgroundColor: COLORS.secondary, color: "white", padding: "12px 24px", border: "none", borderRadius: "4px", cursor: cargando ? "wait" : "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", transition: "0.2s" }}>
                            <span>Resumen Nacional<br /></span>
                        </button>
                    </div>
                </div>

                {/* PASO 2: SUBIR DOCUMENTO (Aparece al generar el primero) */}
                {documentosGenerados && (
                    <div className="no-print" style={{ background: COLORS.white, padding: "25px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: `1px solid ${COLORS.border}` }}>
                        <h3 style={{ color: COLORS.primary, marginTop: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ backgroundColor: COLORS.primary, color: "white", width: "24px", height: "24px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: "14px" }}>2</span>
                            Resguardar Documento Legal Firmado
                        </h3>

                        <p style={{ fontSize: "13px", color: COLORS.textLight, marginBottom: "20px" }}>
                            Imprima ambos formatos, recabe las firmas institucionales correspondientes, escanee todo en un <strong>único archivo PDF</strong> y súbalo aquí para su resguardo definitivo.
                        </p>

                        <form onSubmit={handleSubirDocumentoNacional} style={{ display: "flex", gap: "15px", alignItems: "flex-end", backgroundColor: "#fdfdfa", padding: "20px", border: `1px dashed ${COLORS.secondary}`, borderRadius: "6px" }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: "12px", fontWeight: "bold", color: COLORS.secondary, display: "block", marginBottom: "8px" }}>Seleccionar archivo PDF escaneado (Formatos 3 y 4 juntos):</label>
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
                                {subiendoArchivo ? "Subiendo al sistema..." : "Guardar en Sistema"}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* TABLA DE AUDITORÍA NACIONAL (Buzón de Recepción) */}
            {/* ========================================================= */}
            <div className="no-print" style={{ marginTop: "30px", background: "white", padding: "20px", borderRadius: "8px", border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                <h3 style={{ color: COLORS.primary, marginTop: 0, marginBottom: "15px", borderBottom: `2px solid ${COLORS.secondary}`, paddingBottom: "10px" }}>
                    Buzón de Recepción Estatal
                </h3>

                {cargandoFormatos ? (
                    <p style={{ textAlign: "center", color: COLORS.textLight }}>Cargando formatos recibidos...</p>
                ) : formatosEstatales.length === 0 ? (
                    <p style={{ textAlign: "center", padding: "20px", color: COLORS.textLight, fontStyle: "italic", backgroundColor: "#f9fafb", borderRadius: "4px" }}>
                        Ningún estado ha subido su Formato 2 para este periodo.
                    </p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                        <thead>
                            <tr style={{ backgroundColor: COLORS.primary, color: "white", textAlign: "left" }}>
                                <th style={{ padding: "12px" }}>Entidad Federativa</th>
                                <th style={{ padding: "12px" }}>Fecha de Recepción</th>
                                <th style={{ padding: "12px", textAlign: "center" }}>Estatus</th>
                                <th style={{ padding: "12px", textAlign: "center" }}>Auditoría</th>
                            </tr>
                        </thead>
                        <tbody>
                            {formatosEstatales.map((formato) => {
                                const esAprobado = String(formato.estado).toUpperCase().includes("APROBADO");
                                const esRechazado = String(formato.estado).toUpperCase().includes("RECHAZADO");

                                return (
                                    <tr key={formato.id} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: esRechazado ? "#fde8e8" : (esAprobado ? "#f0fdf4" : "white") }}>
                                        <td style={{ padding: "12px", fontWeight: "bold" }}>{formato.entidad}</td>
                                        <td style={{ padding: "12px", color: COLORS.textLight }}>{formato.fecha_subida}</td>

                                        <td style={{ padding: "12px", textAlign: "center", fontWeight: "bold", color: esAprobado ? "#15803d" : (esRechazado ? "#9F2241" : COLORS.secondary) }}>
                                            {esAprobado ? "APROBADO" : (esRechazado ? "RECHAZADO" : "PENDIENTE POR VALIDAR")}
                                        </td>

                                        <td style={{ padding: "12px", display: "flex", gap: "8px", justifyContent: "center" }}>
                                            {/* Ajustado a tu función verDocumentoDeNube */}
                                            <button onClick={() => verDocumentoDeNube(formato.url_documento)} style={{ backgroundColor: "#6c757d", color: "white", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>
                                                Ver PDF
                                            </button>

                                            {!esAprobado && !esRechazado && (
                                                <>
                                                    <button onClick={() => handleAprobarEstatal(formato.id)} style={{ backgroundColor: COLORS.primary, color: "white", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>
                                                        Aprobar
                                                    </button>
                                                    <button onClick={() => handleRechazarEstatal(formato)} style={{ backgroundColor: "#9F2241", color: "white", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>
                                                        Rechazar
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ========================================================= */}
            {/* MODAL DE HISTORIAL (Overlay) */}
            {/* ========================================================= */}

            {mostrarModal && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
                    <div style={{ background: COLORS.white, width: "100%", maxWidth: "800px", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

                        {/* Cabecera del Modal */}
                        <div style={{ backgroundColor: COLORS.primary, padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ color: "white", margin: 0, fontSize: "18px" }}>Historial Nacional de Resguardos</h3>
                            <button onClick={() => setMostrarModal(false)} style={{ background: "none", border: "none", color: "white", fontSize: "20px", cursor: "pointer", fontWeight: "bold" }}>&times;</button>
                        </div>

                        {/* Cuerpo del Modal (Tabla) */}
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
                                                    No hay formatos nacionales registrados en el sistema todavía.
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

            {/* FORMATO 3 (OCULTO - LANDSCAPE) */}
            {datosFormato3 && (
                <div id="formato-3-print" style={{ display: "none", padding: "20px", background: "white", width: "100%", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                        <div style={{ width: "200px", color: COLORS.primary, fontWeight: "bold", fontSize: "16px" }}>IMSS-BIENESTAR<br /><span style={{ fontSize: "10px", fontWeight: "normal" }}>SERVICIOS PÚBLICOS DE SALUD</span></div>
                        <div style={{ textAlign: "center", flex: 1, padding: "0 20px" }}>
                            <h3 style={{ fontSize: "11px", margin: 0, textTransform: "uppercase" }}>BITÁCORA NACIONAL DE COOPERACIÓN TÉCNICA, CIENTÍFICA Y ACADÉMICA DE LOS PROFESIONALES DE LA SALUD DE LA BRIGADA MÉDICA CUBANA</h3>
                            <div style={{ textAlign: "center", marginBottom: "20px" }}>
                                <div style={{ fontSize: "11px", fontWeight: "bold", color: COLORS.primary, marginBottom: "4px" }}>FORMATO 3</div>
                                <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>
                                    PERIODO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {getTextoPeriodo()}
                                </div>
                            </div>
                        </div>
                        <div style={{ width: "200px", textAlign: "right", fontSize: "10px", fontWeight: "bold" }}>MINISTERIO DE SALUD PÚBLICA<br />República de Cuba</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "35px", border: "1px solid black", fontSize: "12px", fontWeight: "bold", backgroundColor: "#f4f6f8", padding: "0 5px", textAlign: "center" }}>
                        PROFESIONALES DE LA SALUD CORRESPONDIENTES AL ACUERDO DE COOPERACIÓN TÉCNICA, CIENTÍFICA Y ACADÉMICA EN MATERIA DE SALUD
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px", textAlign: "center", border: "1px solid black" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#0b5e46", color: "white" }}>
                                <th style={{ border: "1px solid black", padding: "6px" }}>NO.</th>
                                <th style={{ border: "1px solid black", padding: "6px" }}>UNIDAD</th>
                                <th style={{ border: "1px solid black", padding: "6px" }}>ENTIDAD FEDERATIVA</th>
                                <th style={{ border: "1px solid black", padding: "6px" }}>CLUES IB</th>
                                <th style={{ border: "1px solid black", padding: "6px" }}>ESPECIALIDAD</th>
                                <th style={{ border: "1px solid black", padding: "6px" }}>PERIODO DE TIEMPO</th>
                                <th style={{ border: "1px solid black", padding: "6px" }}>PROFESIONAL DE LA SALUD</th>
                                <th style={{ border: "1px solid black", padding: "6px" }}>DIAS CONCILIADOS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datosFormato3.medicos.map((med) => (
                                <tr key={med.no}>
                                    <td style={{ border: "1px solid black", padding: "4px" }}>{med.no}</td>
                                    <td style={{ border: "1px solid black", padding: "4px", textAlign: "center" }}>{med.unidad}</td>
                                    <td style={{ border: "1px solid black", padding: "4px" }}>{med.entidad}</td>
                                    <td style={{ border: "1px solid black", padding: "4px" }}>{med.clues}</td>
                                    <td style={{ border: "1px solid black", padding: "4px" }}>{med.especialidad}</td>
                                    <td style={{ border: "1px solid black", padding: "4px", textTransform: "uppercase" }}>{med.turno}</td>
                                    <td style={{ border: "1px solid black", padding: "4px", textAlign: "center" }}>{med.medico}</td>
                                    <td style={{ border: "1px solid black", padding: "4px" }}>{med.dias}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "150px", fontSize: "9px", textAlign: "center" }}>
                        <div style={{ width: "30%" }}>
                            <div style={{ borderTop: "1px solid black", paddingTop: "5px" }}>Jefa de la Coordinación Nacional<br />de la Brigada Cubana</div>
                        </div>
                        <div style={{ width: "30%" }}>
                            <div style={{ borderTop: "1px solid black", paddingTop: "5px" }}>Responsable del Programa de Personal<br />Extranjero de Atención a la Salud</div>
                        </div>
                        <div style={{ width: "30%" }}>
                            <div style={{ borderTop: "1px solid black", paddingTop: "5px" }}>Titular de la Coordinación de<br />Normatividad y Planeación Médica</div>
                        </div>
                    </div>
                </div>
            )}

            {/* FORMATO 4 (OCULTO - PORTRAIT) */}
            {datosFormato4 && (
                <div id="formato-4-print" style={{ display: "none", padding: "20px", background: "white", width: "100%", boxSizing: "border-box" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <div style={{ width: "200px", color: COLORS.primary, fontWeight: "bold", fontSize: "14px" }}>IMSS-BIENESTAR<br /><span style={{ fontSize: "9px", fontWeight: "normal" }}>SERVICIOS PÚBLICOS DE SALUD</span></div>
                        <div style={{ textAlign: "center", flex: 1, padding: "0 10px" }}>
                            <h3 style={{ fontSize: "11px", margin: 0, textTransform: "uppercase", color: "#111" }}>RESUMEN DE COOPERACIÓN TÉCNICA, CIENTÍFICA Y ACADÉMICA DE LOS PROFESIONALES DE LA SALUD, DE LA BRIGADA MÉDICA CUBANA</h3>
                        </div>
                        <div style={{ width: "200px", textAlign: "right", fontSize: "9px", fontWeight: "bold", color: "#111" }}>MINISTERIO DE SALUD PÚBLICA<br />República de Cuba</div>
                    </div>
                    <div style={{ textAlign: "center", marginBottom: "20px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: COLORS.primary, marginBottom: "4px" }}>FORMATO 4</div>
                        <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>
                            PERIODO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {getTextoPeriodo()}
                        </div>
                    </div>

                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", textAlign: "center", border: "1px solid black", color: "#111" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#0b5e46", color: "white" }}>
                                <th style={{ border: "1px solid black", padding: "6px", width: "40%", textAlign: "center", verticalAlign: "middle" }}>ENTIDAD FEDERATIVA</th>
                                <th style={{ border: "1px solid black", padding: "6px", width: "30%", textAlign: "center", verticalAlign: "middle" }}>PROFESIONALES DE LA SALUD</th>
                                <th style={{ border: "1px solid black", padding: "6px", width: "30%", textAlign: "center", verticalAlign: "middle" }}>DIAS DE PARTICIPACIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datosFormato4.resumen.map((row, i) => (
                                <tr key={i}>
                                    <td style={{ border: "1px solid black", padding: "5px", textAlign: "center", verticalAlign: "middle", textTransform: "uppercase" }}>{row.entidad}</td>
                                    <td style={{ border: "1px solid black", padding: "5px", textAlign: "center", verticalAlign: "middle" }}>{row.medicos}</td>
                                    <td style={{ border: "1px solid black", padding: "5px", textAlign: "center", verticalAlign: "middle" }}>{row.dias}</td>
                                </tr>
                            ))}
                            <tr style={{ backgroundColor: "#0b5e46", color: "white", fontWeight: "bold" }}>
                                <td style={{ border: "1px solid black", padding: "6px", textAlign: "center", verticalAlign: "middle" }}>TOTAL</td>
                                <td style={{ border: "1px solid black", padding: "6px", textAlign: "center", verticalAlign: "middle" }}>{datosFormato4.gran_total_medicos}</td>
                                <td style={{ border: "1px solid black", padding: "6px", textAlign: "center", verticalAlign: "middle" }}>{datosFormato4.gran_total_dias}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* FIRMAS FORMATO 4 (Corregidas a tu imagen) */}
                    <div style={{ marginTop: "80px", fontSize: "10px", textAlign: "center" }}>

                        {/* Fila Superior: Dos firmas alineadas */}
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "60px" }}>
                            <div style={{ width: "40%" }}>
                                <div style={{ borderTop: "1px solid black", paddingTop: "8px" }}>
                                    Jefa de la Coordinación Nacional de la Brigada Cubana
                                </div>
                            </div>
                            <div style={{ width: "40%" }}>
                                <div style={{ borderTop: "1px solid black", paddingTop: "8px" }}>
                                    Responsable del Programa de Personal<br />Extranjero de Atención a la Salud
                                </div>
                            </div>
                        </div>

                        {/* Fila Inferior: Una firma centrada */}
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <div style={{ width: "45%" }}>
                                <div style={{ borderTop: "1px solid black", paddingTop: "8px" }}>
                                    Titular de la Coordinación de Normatividad y<br />Planeación Médica
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
