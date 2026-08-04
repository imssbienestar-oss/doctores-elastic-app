import React, { useState } from "react";
import Swal from 'sweetalert2';
import { useAuth } from "../../src/contexts/AuthContext";

const COLORS = {
    primary: "#10312B",     // Verde IMSS-Bienestar
    headerBg: "#10312B",    // Verde oscuro institucional
    gold: "#B08D55",        // Acento dorado institucional
    cardBg: "#FFFFFF",
    textMain: "#1A332C",
    textLight: "#555555",
    border: "#D1DED8",
    inputBg: "#FAFCFB"
};

const styles = {
    container: {
        maxWidth: "500px",
        margin: "40px auto",
        fontFamily: "'Segoe UI', Roboto, sans-serif",
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(0, 50, 40, 0.08)",
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
    },
    header: {
        backgroundColor: COLORS.headerBg,
        color: "#FFFFFF",
        padding: "20px",
        textAlign: "center",
        borderBottom: `4px solid ${COLORS.gold}`,
    },
    title: {
        margin: 0,
        fontSize: "20px",
        fontWeight: "700",
        letterSpacing: "0.5px"
    },
    subtitle: {
        margin: "6px 0 0 0",
        fontSize: "13px",
        opacity: 0.9,
        fontWeight: "400"
    },
    body: {
        padding: "30px",
    },
    formGroup: {
        marginBottom: "20px",
    },
    label: {
        display: "block",
        fontSize: "13px",
        fontWeight: "700",
        color: COLORS.textMain,
        marginBottom: "8px",
    },
    input: {
        width: "100%",
        padding: "12px 14px",
        fontSize: "15px",
        borderRadius: "6px",
        border: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.inputBg,
        boxSizing: "border-box",
        outline: "none",
        color: COLORS.textMain,
        transition: "border-color 0.2s"
    },
    button: {
        width: "100%",
        padding: "14px",
        fontSize: "15px",
        fontWeight: "700",
        color: "#FFFFFF",
        backgroundColor: COLORS.primary,
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        marginTop: "10px",
        transition: "background-color 0.2s"
    }
};

export default function GenerarAccesoMedico() {
    const [idImss, setIdImss] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const { token } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Validaciones locales iniciales
        if (!idImss.trim() || !password || !confirmPassword) {
            Swal.fire({
                title: "Campos Incompletos",
                text: "Por favor, llena todos los campos para continuar.",
                icon: "warning",
                confirmButtonColor: COLORS.gold
            });
            return;
        }

        if (password !== confirmPassword) {
            Swal.fire({
                title: "Contraseñas no coinciden",
                text: "Verifica que hayas escrito la misma contraseña en ambos campos.",
                icon: "error",
                confirmButtonColor: "#9F2241"
            });
            return;
        }

        if (password.length < 8) {
            Swal.fire({
                title: "Contraseña muy corta",
                text: "La contraseña debe tener al menos 8 caracteres por seguridad.",
                icon: "warning",
                confirmButtonColor: COLORS.gold
            });
            return;
        }

        setIsSubmitting(true);

        // 2. Preparar los datos para tu endpoint exacto
        const payload = {
            id_imss: idImss.trim().toUpperCase(),
            password: password,
            rol: "medico",
            estatus: true,
            correo: null,
            clues: null
        };

        try {
            const response = await fetch(`${API_URL}/api/peas/usuarios-acceso`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                let mensajeError = "Error desconocido al contactar al servidor.";

                if (data.detail) {
                    if (Array.isArray(data.detail)) {
                        mensajeError = data.detail.map(err =>
                            `Campo '${err.loc[err.loc.length - 1]}': ${err.msg}`
                        ).join(" | ");
                    } else {
                        // Si es un texto simple (Error 400 o 404)
                        mensajeError = data.detail;
                    }
                }
                throw new Error(mensajeError);
            }

            Swal.fire({
                title: "¡Cuenta Generada!",
                text: `El médico con ID ${payload.id_imss} ya puede ingresar a su app para ver su código QR.`,
                icon: "success",
                confirmButtonColor: COLORS.primary
            });

            setIdImss("");
            setPassword("");
            setConfirmPassword("");

        } catch (error) {
            console.error("Error al crear cuenta:", error);
            Swal.fire({
                title: "No se pudo crear la cuenta",
                text: error.message, // Ahora esto mostrará exactamente qué pide FastAPI
                icon: "error",
                confirmButtonColor: "#9F2241"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Accesos para Médicos</h2>
                    <p style={styles.subtitle}>Genera la credencial digital vinculando el ID IMSS oficial</p>
                </div>

                <div style={styles.body}>
                    <form onSubmit={handleSubmit}>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>ID IMSS del Médico:</label>
                            <input
                                type="text"
                                style={{ ...styles.input, textTransform: "uppercase" }}
                                placeholder="Ej. MC_0001"
                                value={idImss}
                                onChange={(e) => setIdImss(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Contraseña Inicial:</label>
                            <input
                                type="password"
                                style={styles.input}
                                placeholder="Crea una contraseña segura"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <label style={styles.label}>Confirmar Contraseña:</label>
                            <input
                                type="password"
                                style={styles.input}
                                placeholder="Repite la contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>

                        <button
                            type="submit"
                            style={{
                                ...styles.button,
                                opacity: isSubmitting ? 0.7 : 1,
                                cursor: isSubmitting ? "not-allowed" : "pointer"
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Generando Acceso..." : "Generar Cuenta de Médico"}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
}
