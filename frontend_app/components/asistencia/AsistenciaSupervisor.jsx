import React, { useState, useEffect } from "react";
import { Html5QrcodeScanner } from 'html5-qrcode';

const COLORS = {
    primary: "#006657",
    headerBg: "#10312B",
    secondary: "#B08D55",
    accentRed: "#691C32",
    bg: "#F4F7F6",
    cardBg: "#FFFFFF",
    textMain: "#333333",
    textLight: "#666666",
    border: "#E0E0E0",
    successBg: "#D4EDDA",
    successText: "#155724",
    errorBg: "#F8D7DA",
    errorText: "#721C24",
};

const styles = {
    headerCard: {
        backgroundColor: COLORS.headerBg, color: "#ffffff", padding: "16px 20px",
        borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: "10px",
    },
    headerTitle: { margin: 0, fontSize: "18px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" },
    headerSubtitle: { margin: "4px 0 0 0", fontSize: "12px", opacity: 0.8 },
    badgeDemo: { backgroundColor: COLORS.accentRed, color: "#fff", fontSize: "10px", fontWeight: "800", padding: "4px 10px", borderRadius: "20px", textTransform: "uppercase" },
    bodyCard: { backgroundColor: COLORS.cardBg, padding: "20px 16px", borderRadius: "0 0 12px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: `1px solid ${COLORS.border}`, borderTop: "none", marginBottom: "20px" },
    label: { display: "block", fontSize: "13px", fontWeight: "700", color: COLORS.textMain, marginBottom: "8px" },
    input: { width: "100%", padding: "14px", fontSize: "16px", borderRadius: "8px", border: `2px solid ${COLORS.border}`, boxSizing: "border-box", outline: "none", textTransform: "uppercase", marginBottom: "15px" },
    buttonGroup: { display: "flex", flexDirection: "row", gap: "10px", flexWrap: "wrap" },
    btnEntrada: { flex: "1 1 140px", padding: "14px", fontSize: "14px", fontWeight: "700", color: "#ffffff", backgroundColor: COLORS.primary, border: "none", borderRadius: "8px", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
    btnSalida: { flex: "1 1 140px", padding: "14px", fontSize: "14px", fontWeight: "700", color: "#ffffff", backgroundColor: COLORS.secondary, border: "none", borderRadius: "8px", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
    tableCard: { backgroundColor: COLORS.cardBg, borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: `1px solid ${COLORS.border}`, overflow: "hidden" },
    tableHeaderTitle: { padding: "14px 16px", backgroundColor: "#F8F9FA", borderBottom: `1px solid ${COLORS.border}`, fontSize: "14px", fontWeight: "700", color: COLORS.textMain, margin: 0 },
    tableScrollContainer: { overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "480px" },
    th: { backgroundColor: "#FAFAFA", color: COLORS.textLight, padding: "10px 14px", textAlign: "center", fontWeight: "600", borderBottom: `2px solid ${COLORS.border}`, fontSize: "11px", textTransform: "uppercase" },
    td: { padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textMain, textAlign: "center" },
    alert: (tipo) => ({ padding: "12px 16px", borderRadius: "8px", marginBottom: "15px", fontSize: "13px", fontWeight: "600", backgroundColor: tipo === "success" ? COLORS.successBg : COLORS.errorBg, color: tipo === "success" ? COLORS.successText : COLORS.errorText }),
};

export default function AsistenciaSupervisor() {

    const [idImss, setIdImss] = useState("");
    // Eliminamos 'logs' y dejamos solo 'bitacora' como la única fuente de la verdad
    const [bitacora, setBitacora] = useState([]);
    const [mensaje, setMensaje] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Unificamos la URL para que sirva en todo el componente
    const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const token = localStorage.getItem("token") || ""; // Borra esto si usas useAuth arriba

    const handleRegistrar = async (tipo) => {
        if (!idImss.trim()) {
            mostrarMensaje("Ingresa o escanea un ID IMSS.", "error");
            return;
        }
        setIsScanning(true);

        try {
            const response = await fetch(`${API_URL}/api/peas/asistencia`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` // Agregamos seguridad
                },
                body: JSON.stringify({ id_imss: idImss.toUpperCase(), tipo: tipo })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Error al registrar la asistencia");
            }

            // Si es exitoso, agregamos el nuevo registro al inicio de la bitácora
            await cargarBitacora();

            mostrarMensaje(`¡${tipo} registrada para ${data.registro.nombre}!`, "success");
            setIdImss("");
        } catch (error) {
            console.error(error);
            mostrarMensaje(error.message, "error"); // Muestra la alerta roja al usuario
        } finally {
            setIsScanning(false);
        }
    };

    const mostrarMensaje = (texto, tipo) => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje(null), 3500);
    };

    const cargarBitacora = async () => {
        try {
            const response = await fetch(`${API_URL}/api/peas/asistencia/bitacora-hoy`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setBitacora(data);
            }
        } catch (error) {
            console.error("Error al cargar la bitácora:", error);
        }
    };

    // Cargar los registros reales de HOY al entrar a la página
    useEffect(() => {
        cargarBitacora();
    }, [token, API_URL]);

    // Configuración del escáner QR
    useEffect(() => {
        let scanner = null;
        if (showScanner) {
            scanner = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    videoConstraints: {
                        facingMode: "environment"
                    }
                },
                false
            );
            scanner.render(
                (decodedText) => {
                    setIdImss(decodedText);
                    setShowScanner(false);
                    scanner.clear();
                    mostrarMensaje("Código escaneado correctamente", "success");
                },
                (error) => { }
            );
        }
        return () => {
            if (scanner) {
                scanner.clear().catch(error => console.error("Error al limpiar scanner", error));
            }
        };
    }, [showScanner]);

    return (
        <div>
            <div style={styles.headerCard}>
                <div>
                    <h1 style={styles.headerTitle}>Control de Asistencia PEAS</h1>
                    <p style={styles.headerSubtitle}>Módulo del Responsable de Unidad</p>
                </div>
            </div>

            <div style={styles.bodyCard}>
                {mensaje && <div style={styles.alert(mensaje.tipo)}>{mensaje.texto}</div>}
                {showScanner ? (
                    <div className="mb-4">
                        <div id="reader" style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}></div>
                        <button onClick={() => setShowScanner(false)} style={{ ...styles.btnSalida, width: "100%", marginTop: "10px", backgroundColor: COLORS.accentRed }}>
                            Cancelar Escáner
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setShowScanner(true)} style={{ ...styles.btnEntrada, width: "100%", marginBottom: "15px", backgroundColor: "#333" }}>
                        📷 Escanear Código QR
                    </button>
                )}
                <label style={styles.label}>ID IMSS del Médico / Escáner</label>
                <input
                    type="text"
                    style={styles.input}
                    value={idImss}
                    onChange={(e) => setIdImss(e.target.value)}
                    placeholder="EJ. MC_0001"
                    disabled={isScanning}
                />
                <div style={styles.buttonGroup}>
                    <button style={styles.btnEntrada} onClick={() => handleRegistrar("Entrada")} disabled={isScanning}>
                        {isScanning ? "..." : "Registrar Entrada"}
                    </button>
                    <button style={styles.btnSalida} onClick={() => handleRegistrar("Salida")} disabled={isScanning}>
                        {isScanning ? "..." : "Registrar Salida"}
                    </button>
                </div>
            </div>

            <div style={styles.tableCard}>
                <h2 style={styles.tableHeaderTitle}>Bitácora de Hoy</h2>
                <div style={styles.tableScrollContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>ID IMSS</th>
                                <th style={styles.th}>Médico</th>
                                <th style={styles.th}>Entrada</th>
                                <th style={styles.th}>Salida</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bitacora.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ ...styles.td, textAlign: "center", color: COLORS.textLight, padding: "20px" }}>
                                        Sin registros guardados el día de hoy.
                                    </td>
                                </tr>
                            ) : (
                                bitacora.map((log, index) => (
                                    <tr key={log.idImss || index}>
                                        <td style={{ ...styles.td, fontWeight: "bold" }}>{log.idImss}</td>
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: "600" }}>{log.nombre}</div>
                                            <div style={{ fontSize: "11px", color: COLORS.textLight }}>{log.unidad}</div>
                                        </td>

                                        {/* Columna de Entrada */}
                                        <td style={styles.td}>
                                            {log.horaEntrada !== "--:--" ? (
                                                <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", backgroundColor: COLORS.successBg, color: COLORS.successText }}>
                                                    {log.horaEntrada}
                                                </span>
                                            ) : (
                                                <span style={{ color: COLORS.textLight }}>--:--</span>
                                            )}
                                        </td>

                                        {/* Columna de Salida */}
                                        <td style={styles.td}>
                                            {log.horaSalida !== "--:--" ? (
                                                <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", backgroundColor: "#FFEBAA", color: "#8A6D3B" }}>
                                                    {log.horaSalida}
                                                </span>
                                            ) : (
                                                <span style={{ color: COLORS.textLight }}>--:--</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
