// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
// import { useModal } from "../src/contexts/ModalContext"; // Solo si onAgregarDoctorClick no se pasa
import logo from "./gobierno.png";
import AlertasModal from "./AlertasModal";

// Estilos (deben estar definidos antes de usarlos en renderNavItems si se define fuera del componente)
const styles = {
  navbarContainer: {
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 1000,
    width: "100%",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  },
  topGovBar: {
    backgroundColor: "#691c32",
    padding: "0px 35px",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    height: "65px",
    boxSizing: "border-box",
  },
  gobiernoLogoContainer: {
    display: "flex",
    alignItems: "left",
    marginLeft: "auto",
    marginRight: "auto",
    paddingLeft: "1%",
    paddingRight: "65%",
  },
  gobiernoLogo: { height: "60px", width: "170px" },
  gobiernoTexto: { display: "none", color: "white", fontSize: "12px" },
  goldenBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 25px",
    backgroundColor: "#A57F2C",
    color: "white",
    boxSizing: "border-box",
    height: "65px",
  },
  titleContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  imssTitle: {
    fontSize: "1.0em",
    fontWeight: "bold",
    lineHeight: "1.1",
    color: "#FFFFFF",
  },
  mainTitle: {
    fontSize: "1.0em",
    fontWeight: "normal",
    lineHeight: "1.1",
    color: "#FFFFFF",
  },
  guestIndicator: {
    fontSize: "0.7em",
    fontWeight: "normal",
    marginLeft: "8px",
    opacity: 0.9,
    fontStyle: "italic",
  },
  usernameIndicator: {
    fontSize: "0.8em",
    fontWeight: "normal",
    marginLeft: "10px",
    fontStyle: "italic",
  },
  actions: { display: "flex", alignItems: "center", gap: "0px" }, // Gap a 0, el separador maneja el espacio
  button: {
    padding: "8px 10px",
    fontSize: "1em",
    cursor: "pointer",
    backgroundColor: "transparent",
    color: "white",
    border: "none", // Sin borde individual
    borderRadius: "0px", // Sin bordes redondeados si se usan separadores
    transition: "background-color 0.2s ease, color 0.2s ease",
    whiteSpace: "nowrap",
    outline: "none", // Quitar outline al hacer foco si no se desea
  },
  logoutButton: {
    backgroundColor: "rgba(159, 34, 65, 0.8)",
  },
  adminButtonLink: {
    padding: "8px 10px",
    fontSize: "1em",
    cursor: "pointer",
    backgroundColor: "transparent",
    color: "white",
    border: "none", // Sin borde individual
    borderRadius: "0px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    transition: "background-color 0.2s ease, color 0.2s ease",
    outline: "none",
  },
  separator: {
    color: "rgba(255, 255, 255, 0.4)", // Color del separador
    margin: "0 8px",
    fontSize: "1em", // Ajustado para ser menos prominente
    lineHeight: "1",
    userSelect: "none",
  },
  alertButton: {
    padding: "8px 10px",
    fontSize: "1.5em", // Aumenta el tamaño para el ícono
    cursor: "pointer",
    backgroundColor: "transparent",
    color: "white",
    border: "none",
    borderRadius: "0px",
    transition: "background-color 0.2s ease, color 0.2s ease",
    whiteSpace: "nowrap",
    outline: "none",
    position: 'relative',
  },
   alertBadge: {
    position: 'absolute',
    top: '2px', // Ajusta la posición del contador
    right: '2px',
    backgroundColor: '#dc3545',
    color: 'white',
    borderRadius: '50%',
    padding: '2px 5px',
    fontSize: '0.6em', // Letra más pequeña para el contador
    fontWeight: 'bold',
    lineHeight: 1,
  },
  downloadStatus: {
    color: "white",
    marginLeft: "10px",
    alignSelf: "center",
    fontSize: "0.85em",
  },
  downloadError: {
    color: "#ffdddd",
    marginLeft: "10px",
    alignSelf: "center",
    maxWidth: "150px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.85em",
    backgroundColor: "rgba(159, 34, 65, 0.7)",
    padding: "3px 6px",
    borderRadius: "3px",
  },
};

// Función auxiliar para renderizar items con separadores
const renderNavItems = (items) => {
  const visibleItems = items.filter(Boolean); // Filtrar elementos nulos o falsos
  return visibleItems.map((item, index) => (
    <React.Fragment key={index}>
      {item}
      {/* No añadir separador después del último elemento visible */}
      {index < visibleItems.length - 1 && (
        <span style={styles.separator}>|</span>
      )}
    </React.Fragment>
  ));
};

function Navbar({
  title,
  onVerGraficasClick,
  onVerTablaClick,
  vistaActual,
  onAgregarDoctorClick,
}) {
  const { isAuthenticated, isGuestMode, token, logout, currentUser,dataRefreshKey } =
    useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [reportTypeBeingDownloaded, setReportTypeBeingDownloaded] =
    useState(null);

  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  useEffect(() => {
    const fetchAlertCount = async () => {
      if (isAuthenticated && token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/doctores/alertas-vencimiento`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          if (response.ok) {
            const data = await response.json();
            setAlertCount(data.length);
          } else {
            setAlertCount(0);
          }
        } catch (error) {
          console.error("Error al cargar conteo de alertas:", error);
          setAlertCount(0);
        }
      }
    };
    fetchAlertCount();
  }, [isAuthenticated, token, location.pathname,dataRefreshKey]); // Se recarga al cambiar de página

  const handleDownload = async (reportType) => {
    setDownloading(true);
    setDownloadError("");
    setReportTypeBeingDownloaded(reportType);
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
        setReportTypeBeingDownloaded(null);
        return;
    }
    const url = `${backendUrl}${urlPath}`;
    try {
      const headers = {};
      if (isAuthenticated && token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (!isGuestMode && !isAuthenticated) {
        setDownloadError("Error: No autorizado para descargar.");
        setDownloading(false);
        setReportTypeBeingDownloaded(null);
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
      setReportTypeBeingDownloaded(null);
    }
  };

  const handleLogoutOrExitGuest = () => {
    logout();
  };

  const showViewToggleButtons = isAuthenticated || isGuestMode;
  const canClickVerGraficas = typeof onVerGraficasClick === "function";
  const canClickVerTabla = typeof onVerTablaClick === "function";

  // Construir el array de items de acción
  const navActionItems = [];

  // Botones de Ver Tabla / Ver Gráficas
  if (showViewToggleButtons && canClickVerGraficas && canClickVerTabla) {
    navActionItems.push(
      <button
        key="alertas"
        onClick={() => setIsAlertsModalOpen(true)}
        style={styles.alertButton}
        title="Ver alertas de vencimiento"
      >
            <span role="img" aria-label="alertas">🔔</span>
            {alertCount > 0 && <span style={styles.alertBadge}>{alertCount}</span>}
      </button>
    );
    if (currentPath === "/") {
      // Si estamos en la página principal de doctores
      if (vistaActual === "tabla") {
        navActionItems.push(
          <button
            key="verGraficas"
            onClick={onVerGraficasClick}
            style={styles.button}
            title="Ir a la vista de gráficas de doctores"
          >
            Ver Gráficas
          </button>
        );
      } else {
        // vistaActual es 'graficas'
        navActionItems.push(
          <button
            key="verTabla"
            onClick={onVerTablaClick}
            style={styles.button}
            title="Ir a la vista de tabla de doctores"
          >
            Ver Tabla
          </button>
        );
      }
    } else if (currentPath.startsWith("/admin") || currentPath === "/perfil") {
      // Si estamos en cualquier página de admin O en la página de perfil
      // Mostrar ambos botones para navegar de vuelta a la vista principal
      navActionItems.push(
        <button
          key="verTablaAdmin"
          onClick={onVerTablaClick}
          style={styles.button}
          title="Ir a la vista de tabla de doctores"
        >
          Ver Tabla
        </button>
      );
      navActionItems.push(
        <button
          key="verGraficasAdmin"
          onClick={onVerGraficasClick}
          style={styles.button}
          title="Ir a la vista de gráficas de doctores"
        >
          Ver Gráficas
        </button>
      );
    }
  }

  // Botón Agregar Doctor
  if (
    currentPath === "/" &&
    vistaActual === "tabla" &&
    isAuthenticated &&
    currentUser?.role !== "guest" &&
    typeof onAgregarDoctorClick === "function"
  ) {
    navActionItems.push(
      <button
        key="agregarDoctor"
        onClick={onAgregarDoctorClick}
        style={styles.button}
      >
        Agregar Doctor
      </button>
    );
  }

  // Enlaces de Admin
  if (isAuthenticated && currentUser && currentUser.role === "admin") {
    if (currentPath !== "/admin/users") {
      navActionItems.push(
        <Link key="adminUsers" to="/admin/users" style={styles.adminButtonLink}>
          Gestionar Usuarios
        </Link>
      );
    }
    if (currentPath !== "/admin/audit-log") {
      navActionItems.push(
        <Link
          key="adminAudit"
          to="/admin/audit-log"
          style={styles.adminButtonLink}
        >
          Auditoría
        </Link>
      );
    }
  }
  // Botón de Logout (siempre se añade si está autenticado o es invitado)
  if (isAuthenticated || isGuestMode) {
    navActionItems.push(
      <button
        key="logout"
        onClick={handleLogoutOrExitGuest}
        style={{ ...styles.button, ...styles.logoutButton }}
      >
        {isAuthenticated ? "Cerrar Sesión" : "Salir de Invitado"}
      </button>
    );
  }

  return (
    <div style={styles.navbarContainer}>
      <div style={styles.topGovBar}>
        <div style={styles.gobiernoLogoContainer}>
          <img
            src={logo}
            alt="Gobierno de México"
            style={styles.gobiernoLogo}
            onError={(e) => {
              e.target.style.display = "none";
              if (e.target.nextSibling)
                e.target.nextSibling.style.display = "inline";
            }}
          />
          <span style={{ ...styles.gobiernoTexto, display: "none" }}>
            {" "}
            Gobierno de México{" "}
          </span>
        </div>
      </div>
      <nav style={styles.goldenBar}>
        <div style={styles.titleContainer}>
          <span style={styles.imssTitle}>IMSS</span>
          <span style={styles.mainTitle}>
            {title || "Sistema Doctores"}
            {isGuestMode && !isAuthenticated && (
              <span style={styles.guestIndicator}> (Invitado)</span>
            )}
            {isAuthenticated && currentUser && currentUser.username && (
              <Link
                to="/perfil"
                title="Ir a mi perfil"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span style={styles.usernameIndicator}>
                  {" "}
                  ({currentUser.username} - {currentUser.role})
                </span>{" "}
              </Link>
            )}
          </span>
        </div>

        <div style={styles.actions}>
          {renderNavItems(navActionItems)}

          {downloading && downloadError === "" && (
            <span style={styles.downloadStatus}>Generando...</span>
          )}
          {downloadError && (
            <span style={styles.downloadError}>Error: {downloadError}</span>
          )}
        </div>
      </nav>
      <AlertasModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
      />
    </div>
  );
}

export default Navbar;
