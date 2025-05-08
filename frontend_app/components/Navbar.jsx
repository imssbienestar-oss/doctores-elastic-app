// src/components/Navbar.jsx
import React, { useState } from "react";
import { useAuth } from "../src/contexts/AuthContext"; // Ajusta la ruta si es necesario
import { Link, useLocation } from "react-router-dom";
import { useModal } from "../src/contexts/ModalContext";

function Navbar({
  title,
  onVerGraficasClick, // Prop función para cambiar a vista gráficas
  onVerTablaClick, // Prop función para cambiar a vista tabla
  vistaActual, // Prop string que indica la vista actual ("tabla" o "graficas")
}) {
  const { isAuthenticated, isGuestMode, token, logout, currentUser } =
    useAuth();
  const { openModal } = useModal();
  const location = useLocation();
  const currentPath = location.pathname;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const handleDownload = async (reportType) => {
    // Tu lógica de handleDownload parece estar bien.
    // Solo asegúrate de que 'token' se esté obteniendo y usando correctamente si es necesario.
    // El 'token' del hook useAuth() es el que deberías usar para las cabeceras.
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
        // Usar el 'token' del hook useAuth
        headers["Authorization"] = `Bearer ${token}`;
      } else if (isGuestMode) {
        // Modo invitado, sin token
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
        const linkDom = document.createElement("a"); // Renombrado para evitar confusión con el componente Link
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
        } catch (e) {
          /* No hacer nada */
        }
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
    logout(); // Llama al logout del AuthContext
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.title}>
        {title || "Sistema Doctores"}
        {isGuestMode && !isAuthenticated && (
          <span style={styles.guestIndicator}> (Invitado)</span>
        )}
        {/* Opcional: Mostrar nombre de usuario si está logueado */}
        {isAuthenticated && currentUser && currentUser.username && (
          <span
            style={{
              fontSize: "0.8em",
              fontWeight: "normal",
              marginLeft: "10px",
            }}
          >
            ({currentUser.username})
          </span>
        )}
      </div>

      <div style={styles.actions}>
        {
          (isAuthenticated || isGuestMode) &&
            typeof onVerGraficasClick === "function" &&
            typeof onVerTablaClick === "function" &&
            (currentPath === "/admin/users" ? (
              // Si estamos en /admin/users, muestra AMBOS botones para volver a home
              <>
                <button onClick={onVerTablaClick} style={styles.button}>
                  Ir a Tabla Doctores
                </button>
                <button onClick={onVerGraficasClick} style={styles.button}>
                  Ir a Gráficas Doctores
                </button>
              </>
            ) : currentPath === "/" ? (
              // Si estamos en la home ("/"), muestra el botón de toggle normal
              vistaActual === "tabla" ? (
                <button onClick={onVerGraficasClick} style={styles.button}>
                  Ver Gráficas
                </button>
              ) : (
                <button onClick={onVerTablaClick} style={styles.button}>
                  Ver Tabla
                </button>
              )
            ) : null) // En otras rutas (si las hubiera) no mostramos estos botones
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
            {isAuthenticated && ( // Agregar solo si autenticado
              <button onClick={() => openModal(null)} style={styles.button}>
                Agregar Doctor
              </button>
            )}
          </>
        )}
        {/* Mostrar PDF solo si estamos en la home Y la vista es graficas */}
        {currentPath === "/" && vistaActual === "graficas" && (
          <button
            onClick={() => handleDownload("pdf")}
            style={styles.button}
            disabled={downloading}
          >
            {downloading ? "Generando PDF..." : "Generar PDF Resumen"}
          </button>
        )}

        {/* Mensajes de descarga/error */}
        {downloading && downloadError === "" && (
          <span
            style={{ color: "yellow", marginLeft: "10px", alignSelf: "center" }}
          >
            Generando...
          </span>
        )}
        {downloadError && (
          <span
            style={{
              color: "red",
              marginLeft: "10px",
              alignSelf: "center",
              maxWidth: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Error: {downloadError}
          </span>
        )}

        {/* Botón Gestionar Usuarios (solo para admin) */}
        {isAuthenticated && currentUser && currentUser.role === "admin" && (
          <Link
            to="/admin/users"
            style={{
              ...styles.button,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Gestionar Usuarios
          </Link>
        )}

        {/* Botón Cerrar Sesión / Salir de Invitado */}
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

// Tus estilos (no los he cambiado)
const styles = {
  navbar: {
    position: "fixed",
    top: 0,
    left: 0,
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
    alignItems: "center",
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
    whiteSpace: "nowrap",
  },
  logoutButton: {
    backgroundColor: "#9F2241",
  },
};

export default Navbar;
