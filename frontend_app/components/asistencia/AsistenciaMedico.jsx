import React, { useState, useEffect } from "react";
import { QRCodeSVG } from 'qrcode.react';

const COLORS = {
    primary: "#10312B",     // Verde IMSS-Bienestar
    headerBg: "#10312B",    // Verde oscuro institucional
    gold: "#B08D55",        // Acento dorado institucional
    cardBg: "#FFFFFF",
    textMain: "#1A332C",
    textLight: "#555555",
    border: "#D1DED8",
    successBg: "#D4EDDA",
    successText: "#155724",
    warningBg: "#FFF3CD",
    warningText: "#856404",
};

const styles = {
    credencialCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: "16px",
        boxShadow: "0 10px 25px rgba(0, 50, 40, 0.12)",
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
        maxWidth: "400px",
        margin: "0 auto",
        fontFamily: "'Segoe UI', Roboto, sans-serif",
    },
    cardHeader: {
        backgroundColor: COLORS.headerBg,
        color: "#FFFFFF",
        padding: "16px 20px",
        textAlign: "center",
        borderBottom: `4px solid ${COLORS.gold}`,
    },
    cardBody: {
        padding: "24px 20px",
        textAlign: "center",
    },
    badge: (tipo) => ({
        display: "inline-block",
        padding: "6px 14px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "700",
        marginBottom: "20px",
        backgroundColor: tipo === "Entrada" ? COLORS.successBg : COLORS.warningBg,
        color: tipo === "Entrada" ? COLORS.successText : COLORS.warningText,
        boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
    }),
    qrWrapper: {
        padding: "16px",
        backgroundColor: "#FAFCFB",
        border: `2px dashed ${COLORS.primary}`,
        borderRadius: "16px",
        display: "inline-block",
        margin: "10px 0",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.03)",
    },
    idBox: {
        backgroundColor: "#F0F4F2",
        padding: "8px 12px",
        borderRadius: "8px",
        display: "inline-block",
        fontSize: "13px",
        fontWeight: "700",
        color: COLORS.primary,
        letterSpacing: "1px",
        marginBottom: "15px",
    }
};

export default function AsistenciaMedico({ userIdentifier }) {
    const [infoMedico, setInfoMedico] = useState({
        nombre_completo: "Cargando credencial...",
        unidad: "Unidad Médica",
        estado_actual: "Cargando...",
        ultima_hora: null
    });
    const [isLoading, setIsLoading] = useState(true);

    const idMedicoActual = userIdentifier || "MC_0001";
    const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

    useEffect(() => {
        const fetchEstadoMedico = async () => {
            try {
                const response = await fetch(`${API_URL}/api/peas/mi-estado-asistencia/${idMedicoActual}`);
                if (response.ok) {
                    const data = await response.json();
                    setInfoMedico(data);
                }
            } catch (error) {
                console.error("Error al obtener estado del médico:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (idMedicoActual) {
            fetchEstadoMedico();
        }
    }, [idMedicoActual]);

    return (
        <div style={styles.credencialCard}>
            {/* CABECERA DE CREDENCIAL */}
            <div style={styles.cardHeader}>
                <span style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "2px", color: COLORS.gold, textTransform: "uppercase" }}>
                    PROGRAMA DE ATENCIÓN A LA SALUD
                </span>
                <h3 style={{ margin: "4px 0 0 0", fontSize: "15px", fontWeight: "700", letterSpacing: "0.5px" }}>
                    CREDENCIAL DIGITAL
                </h3>
            </div>

            {/* CUERPO DE LA CREDENCIAL */}
            <div style={styles.cardBody}>
                <h2 style={{ margin: "0 0 6px 0", color: COLORS.textMain, fontSize: "19px", fontWeight: "800", textTransform: "uppercase" }}>
                    {isLoading ? "CARGANDO..." : infoMedico.nombre_completo}
                </h2>
                
                <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: COLORS.textLight, fontWeight: "600" }}>
                    {infoMedico.unidad}
                </p>

                <div style={styles.idBox}>
                    ID: {idMedicoActual}
                </div>

                <div>
                    {!isLoading && (
                        <span style={styles.badge(infoMedico.estado_actual)}>
                            {infoMedico.estado_actual === "Entrada" && `🟢 En Turno (Entrada: ${infoMedico.ultima_hora})`}
                            {infoMedico.estado_actual === "Salida" && `🔴 Fuera de Turno (Salida: ${infoMedico.ultima_hora})`}
                            {infoMedico.estado_actual === "Sin registro hoy" && `🟡 Sin registro de asistencia hoy`}
                        </span>
                    )}
                </div>

                {/* CONTENEDOR DEL CÓDIGO QR */}
                <div style={styles.qrWrapper}>
                    <QRCodeSVG
                        value={idMedicoActual}
                        size={160}
                        bgColor={"#FAFCFB"}
                        fgColor={COLORS.primary}
                        level={"H"}
                    />
                </div>

                <p style={{ fontSize: "11px", color: COLORS.textLight, maxWidth: "290px", margin: "18px auto 0 auto", lineHeight: "1.4" }}>
                    Presente este código QR ante el Responsable de Unidad para validar su acceso y registrar su asistencia de forma automática.
                </p>
            </div>
        </div>
    );
}
