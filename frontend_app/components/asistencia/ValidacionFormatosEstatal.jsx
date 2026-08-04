import React, { useState, useEffect } from "react";
import { useAuth } from "../../src/contexts/AuthContext";
import Swal from 'sweetalert2';

const COLORS = {
    primary: "#10312B",
    gold: "#B08D55",
    cardBg: "#FFFFFF",
    textMain: "#1A332C",
    textLight: "#555555",
    border: "#D1DED8",
    bg: "#F4F7F6"
};

const styles = {
    container: { padding: "20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Segoe UI', sans-serif" },
    headerCard: { backgroundColor: COLORS.primary, color: "#FFF", padding: "20px", borderRadius: "8px 8px 0 0", borderBottom: `4px solid ${COLORS.gold}` },
    title: { margin: 0, fontSize: "20px", fontWeight: "700" },
    subtitle: { margin: "5px 0 0 0", fontSize: "14px", opacity: 0.9 },
    tableCard: { backgroundColor: COLORS.cardBg, borderRadius: "0 0 8px 8px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: `1px solid ${COLORS.border}`, overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: "900px" },
    th: { backgroundColor: "#F8F9FA", color: COLORS.textMain, padding: "12px 15px", textAlign: "left", fontWeight: "700", fontSize: "13px", borderBottom: `2px solid ${COLORS.border}` },
    td: { padding: "12px 15px", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textLight, fontSize: "13px", verticalAlign: "middle" },
    inputDias: { width: "70px", padding: "8px", borderRadius: "4px", border: `1px solid ${COLORS.border}`, textAlign: "center" },
    btnVer: { backgroundColor: "#6C757D", color: "#FFF", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold", marginRight: "8px" },
    btnValidar: { backgroundColor: COLORS.gold, color: "#FFF", border: "none", padding: "8px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }
};

export default function ValidacionFormatosEstatal() {
    const { token, currentUser } = useAuth();
    const [pendientes, setPendientes] = useState([]);
    const [diasParticipacion, setDiasParticipacion] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    
    // Obtenemos la entidad del usuario logueado (Asegúrate de que tu currentUser la tenga)
    const entidadCoordinador = currentUser?.entidad || "BAJA CALIFORNIA"; 

    const cargarPendientes = async () => {
        try {
            const response = await fetch(`${API_URL}/api/peas/coordinador/reportes-pendientes/${entidadCoordinador}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPendientes(data);
            }
        } catch (error) {
            console.error("Error al cargar reportes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        cargarPendientes();
    }, [entidadCoordinador]);

    const handleDiasChange = (idReporte, valor) => {
        setDiasParticipacion({ ...diasParticipacion, [idReporte]: valor });
    };

    const verDocumento = (url) => {
        // Asumiendo que guardaste la ruta completa o un identificador.
        // Si tu backend tiene un endpoint para devolver el PDF firmado de B2, ponlo aquí.
        Swal.fire({ title: "Atención", text: "Aquí se abriría el PDF: " + url, icon: "info" });
        // window.open(`${API_URL}/ruta-a-tu-pdf/${url}`, "_blank");
    };

    const validarDocumento = async (reporte) => {
        const dias = diasParticipacion[reporte.id_reporte];
        
        if (!dias || dias <= 0) {
            Swal.fire("Faltan Días", "Por favor, ingresa los días de participación válidos para este médico.", "warning");
            return;
        }

        try {
            const payload = {
                ...reporte,
                dias_participacion: parseInt(dias),
                entidad: entidadCoordinador,
                validado_por: currentUser?.username || "Coordinador"
            };

            const response = await fetch(`${API_URL}/api/peas/coordinador/validar-reporte`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                Swal.fire("Validado", "El reporte ha sido validado y agregado a la bitácora estatal.", "success");
                // Recargamos la lista (desaparecerá de los pendientes)
                cargarPendientes();
            } else {
                const err = await response.json();
                throw new Error(err.detail);
            }
        } catch (error) {
            Swal.fire("Error", error.message || "Hubo un problema al validar.", "error");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerCard}>
                <h2 style={styles.title}>Validación de Bitácoras de Asistencia</h2>
                <p style={styles.subtitle}>Entidad Federativa: {entidadCoordinador.toUpperCase()}</p>
            </div>

            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Quincena</th>
                            <th style={styles.th}>CLUES</th>
                            <th style={styles.th}>Médico / ID</th>
                            <th style={styles.th}>Especialidad</th>
                            <th style={styles.th}>Turno</th>
                            <th style={styles.th}>Días Part.</th>
                            <th style={styles.th}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>Cargando documentos pendientes...</td></tr>
                        ) : pendientes.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>No hay documentos pendientes por validar.</td></tr>
                        ) : (
                            pendientes.map((rep) => (
                                <tr key={rep.id_reporte}>
                                    <td style={{ ...styles.td, fontWeight: "bold", color: COLORS.textMain }}>{rep.quincena}</td>
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: "bold" }}>{rep.clues}</div>
                                        <div style={{ fontSize: "11px" }}>{rep.unidad}</div>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: "bold" }}>{rep.medico}</div>
                                        <div style={{ fontSize: "11px" }}>{rep.id_imss}</div>
                                    </td>
                                    <td style={styles.td}>{rep.especialidad}</td>
                                    <td style={styles.td}>{rep.turno}</td>
                                    <td style={styles.td}>
                                        <input 
                                            type="number" 
                                            min="0" max="16"
                                            style={styles.inputDias} 
                                            placeholder="Ej. 15"
                                            value={diasParticipacion[rep.id_reporte] || ""}
                                            onChange={(e) => handleDiasChange(rep.id_reporte, e.target.value)}
                                        />
                                    </td>
                                    <td style={styles.td}>
                                        <button style={styles.btnVer} onClick={() => verDocumento(rep.url_pdf)}>📄 Ver PDF</button>
                                        <button style={styles.btnValidar} onClick={() => validarDocumento(rep)}>✅ Validar</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
