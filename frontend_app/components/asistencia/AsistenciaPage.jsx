import React from "react";
import { useAuth } from "../../src/contexts/AuthContext";
import AsistenciaSupervisor from "./AsistenciaSupervisor";
import AsistenciaMedico from "./AsistenciaMedico";

const COLORS = {
    bg: "#F4F7F6",
};

const styles = {
    pageContainer: {
        minHeight: "calc(100vh - 120px)",
        backgroundColor: COLORS.bg,
        padding: "12px",
        fontFamily: "'Segoe UI', Roboto, sans-serif",
        boxSizing: "border-box",
    },
    wrapper: {
        maxWidth: "800px",
        margin: "0 auto",
    },
};

export default function AsistenciaDemo() {
    const { currentUser } = useAuth();
    
    // Verificamos si el usuario actual es un médico o un rol de asistencia
    const esRolMedico = currentUser?.role === "asistencia" || currentUser?.role === "medico";
    const identificadorUsuario = currentUser?.username || currentUser?.sub || "MC_0001";

    return (
        <div className="flex flex-col min-h-screen">
            <div style={styles.pageContainer}>
                <div style={styles.wrapper}>
                    {/* Renderizado condicional según el rol del usuario en sesión */}
                    {esRolMedico ? (
                        <AsistenciaMedico userIdentifier={identificadorUsuario} />
                    ) : (
                        <AsistenciaSupervisor />
                    )}
                </div>
            </div>
        </div>
    );
}
