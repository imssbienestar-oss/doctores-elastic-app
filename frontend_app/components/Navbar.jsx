// src/components/Navbar.jsx
import React, { useState } from "react";
import { useAuth } from "../src/contexts/AuthContext"; // Importar useAuth

function Navbar({
  title,
  onAddDoctorClick, // Sigue siendo útil para abrir el modal
  // onLogoutClick, // Ya no se necesita como prop, usaremos logout del contexto
  onVerGraficasClick,
  onVerTablaClick,
  vistaActual,
}) {
  const { isAuthenticated, isGuestMode, token, logout } = useAuth(); // Usar el contexto
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const handleDownload = async (reportType) => {
    setDownloading(true);
    setDownloadError("");

    // El token se obtiene del AuthContext.
    // Se enviará condicionalmente más abajo.

    const backendUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    let urlPath = "";
    // let filenameDefault = ""; // No se usa filenameDefault aquí

    switch (reportType) {
      case "xlsx":
        urlPath = "/api/reporte/xlsx";
        // filenameDefault = "reporte_doctores_completo.xlsx";
        break;
      case "pdf":
        urlPath = "/api/reporte/pdf";
        // filenameDefault = "reporte_resumido_doctores.pdf";
        break;
      default:
        setDownloadError("Tipo de reporte no válido.");
        setDownloading(false);
        return;
    }

    const url = `${backendUrl}${urlPath}`;
    //console.log(`Descargando reporte ${reportType} desde: ${url}`);

    try {
      const headers = {}; // Iniciar headers vacíos
      if (isAuthenticated && token) {
        // Añadir token solo si está autenticado
        headers["Authorization"] = `Bearer ${token}`;
        //console.log("Descargando como usuario autenticado.");
      } else if (isGuestMode) {
        // No añadir token si es invitado
        // Asegúrate que el backend permite esto para los endpoints de reporte/gráficas
        //console.log("Descargando como invitado (sin token de autorización).");
      } else {
        // Ni autenticado ni invitado, no debería poder descargar (aunque los botones no deberían mostrarse)
        setDownloadError("Error: No autorizado para descargar.");
        setDownloading(false);
        return;
      }

      const response = await fetch(url, { method: "GET", headers });

      if (response.ok) {
        const disposition = response.headers.get("content-disposition");
        let filename = `reporte.${reportType}`; // Nombre por defecto simplificado
        if (disposition && disposition.indexOf("attachment") !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, "");
          }
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        //console.log("Descarga iniciada:", filename);
      } else {
        let errorMsg = `Error al descargar reporte (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg += `: ${errorData.detail}`;
        } catch (e) { /* No hacer nada si el cuerpo del error no es JSON */ }
        setDownloadError(errorMsg);
        //console.error("Error en respuesta de descarga:", response.status, response.statusText, errorMsg);
        if (response.status === 401 && isAuthenticated) {
            // Si es 401 y estaba autenticado, la sesión pudo expirar
            logout(); // Cerrar sesión
        }
      }
    } catch (err) {
      setDownloadError("Error de red al intentar descargar el reporte.");
      //console.error("Error de fetch en descarga:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleLogoutOrExitGuest = () => {
    logout(); // Esta función del AuthContext debe resetear isAuthenticated Y isGuestMode a false.
              // App.jsx entonces mostrará LoginPage.
  };


  // El Navbar solo debería mostrarse si isAuthenticated o isGuestMode es true (controlado en App.jsx)
  // Aquí asumimos que si Navbar se renderiza, al menos uno de ellos es true.

  return (
    <nav style={styles.navbar}>
      <div style={styles.title}>
        {title || "Sistema Doctores"}
        {isGuestMode && !isAuthenticated && <span style={styles.guestIndicator}> (Invitado)</span>}
      </div>

      <div style={styles.actions}>
        {/* Botones para cambiar entre Tabla y Gráficas (visibles para todos) */}
        {vistaActual === "tabla" ? (
          <button onClick={onVerGraficasClick} style={styles.button}>
            Ver Gráficas
          </button>
        ) : (
          <button onClick={onVerTablaClick} style={styles.button}>
            Ver Tabla
          </button>
        )}

        {/* Botones de descarga (visibles para todos, funcionalidad adaptada en handleDownload) */}
        {vistaActual === "tabla" && (
          <button
            onClick={() => handleDownload("xlsx")}
            style={styles.button}
            disabled={downloading}
          >
            {downloading && downloadError === "" ? "Generando Excel..." : "Generar Excel"}
          </button>
        )}
        {/* En la vista de gráficas, se asume que el reporte PDF es el relevante */}
        {/* O puedes tener ambos botones siempre y no depender de vistaActual para esto */}
        {vistaActual === "graficas" && ( // O simplemente tener siempre disponible el botón de reporte PDF
             <button
                onClick={() => handleDownload("pdf")}
                style={styles.button}
                disabled={downloading}
            >
                {downloading && downloadError === "" ? "Generando PDF..." : "Generar PDF Resumen"}
            </button>
        )}


        {/* Botón Agregar Doctor (solo para usuarios autenticados y en vista de tabla) */}
        {isAuthenticated && vistaActual === "tabla" && (
          <button
            onClick={() => onAddDoctorClick(null)}
            style={styles.button}
          >
            Agregar Doctor
          </button>
        )}

        {/* Mensajes de descarga/error */}
        {downloading && downloadError === "" && (
            <span style={{ color: "yellow", marginLeft: "10px", alignSelf: "center" }}>
                Generando...
            </span>
        )}
        {downloadError && (
            <span style={{ color: "red", marginLeft: "10px", alignSelf: "center", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Error: {downloadError}
            </span>
        )}


        {/* Botón Cerrar Sesión (si está autenticado) o Salir de Invitado (si es invitado) */}
        {(isAuthenticated || isGuestMode) && (
          <button
            onClick={handleLogoutOrExitGuest}
            style={{ ...styles.button, ...styles.logoutButton }}
          >
            {isAuthenticated ? "Cerrar Sesión" : "Salir de Invitado"}
          </button>
        )}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    position: "fixed",
    top: 0,
    left: 0, // Asegurar que esté pegado a la izquierda
    zIndex: 1000,
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 25px",
    backgroundColor: "#BC955C",
    color: "white",
    boxSizing: "border-box",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: "1.6em",
    fontWeight: "bold",
  },
  guestIndicator: {
    fontSize: "0.7em",
    fontWeight: "normal",
    marginLeft: "8px",
    opacity: 0.9,
  },
  actions: {
    display: "flex",
    alignItems: "center", // Alinear verticalmente los items
    gap: "15px",
  },
  button: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#235b4e",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
    whiteSpace: 'nowrap', // Evitar que el texto del botón se parta
  },
  logoutButton: {
    backgroundColor: "#9F2241",
  },
  // Ya no se usa reportOptions porque los botones son directos
};

export default Navbar;
