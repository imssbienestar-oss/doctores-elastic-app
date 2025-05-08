// src/components/Navbar.jsx
import React, { useState } from "react";
import { useAuth } from "../src/contexts/AuthContext"; // Ajusta la ruta si es necesario
import { Link, useLocation } from "react-router-dom";
import { useModal } from "../src/contexts/ModalContext";
import logo from "./gobierno.png";

// Importa tu logo del Gobierno de México aquí. Ejemplo:
// import logoGobiernoMx from './assets/logo-gobierno-mexico.png';

function Navbar({
  title,
  onVerGraficasClick,
  onVerTablaClick,
  vistaActual,
}) {
  const { isAuthenticated, isGuestMode, token, logout, currentUser } =
    useAuth();
  const { openModal } = useModal();
  const location = useLocation();
  const currentPath = location.pathname;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const handleDownload = async (reportType) => {
    setDownloading(true);
    setDownloadError("");
    const backendUrl =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    let urlPath = "";

    switch (reportType) {
      case "xlsx":
        urlPath = "/api/reporte/xlsx";
        break;
      case "pdf":
        urlPath = "/api/reporte/pdf";
        break;
      default:
        setDownloadError("Tipo de reporte no válido.");
        setDownloading(false);
        return;
    }
    const url = `${backendUrl}${urlPath}`;
    try {
      const headers = {};
      if (isAuthenticated && token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (isGuestMode) {
        // Modo invitado
      } else {
        setDownloadError("Error: No autorizado para descargar.");
        setDownloading(false);
        return;
      }
      const response = await fetch(url, { method: "GET", headers });
      if (response.ok) {
        const disposition = response.headers.get("content-disposition");
        let filename = `reporte.${reportType}`;
        if (disposition && disposition.indexOf("attachment") !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, "");
          }
        }
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const linkDom = document.createElement("a");
        linkDom.href = downloadUrl;
        linkDom.setAttribute("download", filename);
        document.body.appendChild(linkDom);
        linkDom.click();
        linkDom.parentNode.removeChild(linkDom);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        let errorMsg = `Error al descargar reporte (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg += `: ${errorData.detail}`;
        } catch (e) { /* No hacer nada */ }
        setDownloadError(errorMsg);
        if (response.status === 401 && isAuthenticated) logout();
      }
    } catch (err) {
      setDownloadError("Error de red al intentar descargar el reporte.");
    } finally {
      setDownloading(false);
    }
  };

  const handleLogoutOrExitGuest = () => {
    logout();
  };

  return (
    // Contenedor principal para ambas barras, maneja la posición fija
    <div style={styles.navbarContainer}>
      {/* Barra Superior - Gobierno de México */}
      <div style={styles.topGovBar}>
        <div style={styles.gobiernoLogoContainer}>
          {/* REEMPLAZA con tu logo real */}
          <img
            // src={logoGobiernoMx} // Si lo importas
            src={logo} // O si es una URL externa
            alt="Gobierno de México"
            style={styles.gobiernoLogo}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }} // Muestra texto si el logo falla
          />
          {/* Placeholder de texto si la imagen del logo no carga o no está disponible */}
          <span style={{ ...styles.gobiernoTexto, display: 'none', color: 'white', fontSize: '12px' }}>
            Gobierno de México
          </span>
        </div>
      </div>

      {/* Barra Dorada Principal (tu navbar anterior) */}
      <nav style={styles.goldenBar}>
        <div style={styles.titleContainer}>
          <span style={styles.imssTitle}>IMSS</span> {/* Título IMSS */}
          <span style={styles.mainTitle}>
            {title || "Sistema Doctores"}
            {isGuestMode && !isAuthenticated && (
              <span style={styles.guestIndicator}> (Invitado)</span>
            )}
            {isAuthenticated && currentUser && currentUser.username && (
              <span style={styles.usernameIndicator}>
                ({currentUser.username})
              </span>
            )}
          </span>
        </div>

        <div style={styles.actions}>
          {
            (isAuthenticated || isGuestMode) &&
              typeof onVerGraficasClick === "function" &&
              typeof onVerTablaClick === "function" &&
              (currentPath === "/admin/users" ? (
                <>
                  <button onClick={onVerTablaClick} style={styles.button}>
                    Ir a Tabla Doctores
                  </button>
                  <button onClick={onVerGraficasClick} style={styles.button}>
                    Ir a Gráficas Doctores
                  </button>
                </>
              ) : currentPath === "/" ? (
                vistaActual === "tabla" ? (
                  <button onClick={onVerGraficasClick} style={styles.button}>
                    Ver Gráficas
                  </button>
                ) : (
                  <button onClick={onVerTablaClick} style={styles.button}>
                    Ver Tabla
                  </button>
                )
              ) : null)
          }

          {currentPath === "/" && vistaActual === "tabla" && (
            <>
              <button
                onClick={() => handleDownload("xlsx")}
                style={styles.button}
                disabled={downloading}
              >
                {downloading ? "Generando Excel..." : "Generar Excel"}
              </button>
              {isAuthenticated && (
                <button onClick={() => openModal(null)} style={styles.button}>
                  Agregar Doctor
                </button>
              )}
            </>
          )}
          {currentPath === "/" && vistaActual === "graficas" && (
            <button
              onClick={() => handleDownload("pdf")}
              style={styles.button}
              disabled={downloading}
            >
              {downloading ? "Generando PDF..." : "Generar PDF Resumen"}
            </button>
          )}

          {downloading && downloadError === "" && (
            <span style={styles.downloadStatus}>Generando...</span>
          )}
          {downloadError && (
            <span style={styles.downloadError}>Error: {downloadError}</span>
          )}

          {isAuthenticated && currentUser && currentUser.role === "admin" && (
            <Link to="/admin/users" style={styles.adminButtonLink}>
              Gestionar Usuarios
            </Link>
          )}

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
    </div>
  );
}

const styles = {
  // Contenedor principal para ambas barras
  navbarContainer: {
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 1000,
    width: "100%",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)", // Sombra general
  },
  // Barra superior Guinda (Gobierno de México)
  topGovBar: {
    backgroundColor: "#691c32", // Color guinda/vino oficial o aproximado
    padding: "30px 25px", // Ajusta el padding vertical y horizontal
    display: "flex",
    justifyContent: "flex-start", // Alinea el contenido a la derecha
    alignItems: "center",
    height: "35px", // Altura estimada, ajusta según tu logo e imagen de referencia
    boxSizing: "border-box",
  },
  gobiernoLogoContainer: {
    display: "flex",
    alignItems: "center",
    marginLeft: "250px",
  },
  gobiernoLogo: {
    height: "35px", // Altura del logo, ajusta para que quepa bien
    // Si tu logo ya tiene el texto "Gobierno de México", no necesitas el span de abajo.
    // Si el logo es solo el escudo, y el texto "Gobierno de México" está en la imagen del logo, ajusta el height.
  },
  // Estilos para la barra dorada (antes styles.navbar)
  goldenBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 25px", // Mantenemos tu padding
    backgroundColor: "#A57F2C", // Tu color dorado
    color: "white",
    boxSizing: "border-box",
    minHeight: "60px", // Para asegurar que tenga una buena altura
  },
  // Contenedor para los títulos en la barra dorada
  titleContainer: {
    display: 'flex',
    flexDirection: 'column', // IMSS arriba, título principal abajo
    alignItems: 'flex-start', // Alineación a la izquierda
  },
  imssTitle: {
    fontSize: "1.0em", // Tamaño para "IMSS"
    fontWeight: "bold",
    lineHeight: '1.1',
  },
  mainTitle: {
    fontSize: "1.0em", // Reducido un poco para dar espacio a IMSS
    fontWeight: "bold",
    lineHeight: '1.1',
  },
  guestIndicator: {
    fontSize: "0.7em",
    fontWeight: "normal",
    marginLeft: "8px",
    opacity: 0.9,
  },
  usernameIndicator: {
    fontSize: "0.8em",
    fontWeight: "normal",
    marginLeft: "10px",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "10px", // Reducido un poco el gap si hay muchos botones
  },
  button: {
    padding: "8px 12px", // Ajustado un poco el padding
    fontSize: "0.85em", // Ajustado un poco el tamaño de fuente
    cursor: "pointer",
    backgroundColor: "#235b4e",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
    whiteSpace: "nowrap",
  },
  logoutButton: {
    backgroundColor: "#9F2241",
  },
  adminButtonLink: { // Estilo para el Link que parece botón
    padding: "8px 12px",
    fontSize: "0.85em",
    cursor: "pointer",
    backgroundColor: "#235b4e", // Mismo color que otros botones
    color: "white",
    border: "none",
    borderRadius: "4px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  },
  downloadStatus: {
    color: "white", // Cambiado a blanco para mejor contraste en barra dorada
    marginLeft: "10px",
    alignSelf: "center",
    fontSize: "0.85em",
  },
  downloadError: {
    color: "#ffdddd", // Un rojo más claro para errores en barra dorada
    marginLeft: "10px",
    alignSelf: "center",
    maxWidth: "150px", // Ajustado
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.85em",
    backgroundColor: 'rgba(159, 34, 65, 0.7)', // Fondo para destacar el error
    padding: '3px 6px',
    borderRadius: '3px',
  },
};

export default Navbar;
