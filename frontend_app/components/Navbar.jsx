import React, { useState, useEffect } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import logo from "./gobierno.png";
import AlertasModal from "./AlertasModal";

// --- CLASES DE TAILWIND ---
const twClasses = {
  button: "!px-2 !py-1 !text-[13px] !font-normal uppercase tracking-wider cursor-pointer !bg-transparent !text-white !border-none hover:!text-[#B08D55] transition-colors outline-none whitespace-nowrap",
  logoutButton: "!px-4 !py-2 !text-[13px] !font-normal uppercase tracking-wider cursor-pointer !bg-[#8c1d39] hover:!bg-[#691C32] !text-white !border-none rounded-sm transition-colors outline-none whitespace-nowrap ml-2 shadow-sm",
  adminButtonLink: "!px-2 !py-1 !text-[13px] !font-normal uppercase tracking-wider cursor-pointer !bg-transparent !text-white !border-none hover:!text-[#B08D55] transition-colors outline-none whitespace-nowrap inline-flex items-center",
  separator: "text-white/50 mx-1 !text-[20px] select-none",
  alertButton: "relative !px-5 !py-1 !text-sm cursor-pointer !bg-transparent !text-white !border-none hover:scale-110 transition-transform outline-none flex items-center",
  alertBadge: "absolute -top-1 -right-0.5 bg-red-600 text-white rounded-full px-1 py-1 !text-[12px] font-bold leading-none shadow-sm",
};

const renderNavItems = (items) => {
  const visibleItems = items.filter(Boolean);
  return visibleItems.map((item, index) => (
    <React.Fragment key={index}>
      {item}
      {index < visibleItems.length - 1 && (
        <span className={twClasses.separator}>|</span>
      )}
    </React.Fragment>
  ));
};

const obtenerDiasRestantes = (fechaFin) => {
  if (!fechaFin) return null;
  const partesFecha = fechaFin.split('-').map(Number);
  const fin = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);
  const hoy = new Date();

  hoy.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);

  const diferenciaMs = fin.getTime() - hoy.getTime();
  return Math.round(diferenciaMs / (1000 * 60 * 60 * 24));
};

function Navbar({
  title,
  onVerGraficasClick,
  onVerTablaClick,
  vistaActual,
  onAgregarDoctorClick,
}) {
  const { isAuthenticated, isGuestMode, token, logout, currentUser, dataRefreshKey } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [reportTypeBeingDownloaded, setReportTypeBeingDownloaded] = useState(null);

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
            const alertasFiltradas = data.filter((alerta) => {
              const dias = obtenerDiasRestantes(alerta.fecha_fin);
              return dias !== null && dias <= 5;
            });
            setAlertCount(alertasFiltradas.length);
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
  }, [isAuthenticated, token, location.pathname, dataRefreshKey]);

  const handleDownload = async (reportType) => {
    // ... Lógica de descarga intacta ...
    setDownloading(true);
    setDownloadError("");
    setReportTypeBeingDownloaded(reportType);
    const backendUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    let urlPath = "";
    switch (reportType) {
      case "xlsx": urlPath = "/api/reporte/xlsx"; break;
      case "pdf": urlPath = "/api/reporte/pdf"; break;
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
        } catch (e) { }
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

  // NUEVO: Identificamos si es el encargado de unidad/asistencia
  const isEncargado = currentUser?.role === "responsable_unidad" || currentUser?.role === "asistencia";

  const navActionItems = [];

  if (showViewToggleButtons && canClickVerGraficas && canClickVerTabla) {

    if (!isEncargado) {

      navActionItems.push(
        <button
          key="alertas"
          onClick={() => setIsAlertsModalOpen(true)}
          className={twClasses.alertButton}
          title="Ver alertas de vencimiento"
        >
          <span role="img" aria-label="alertas">🔔</span>
          {alertCount > 0 && <span className={twClasses.alertBadge}>{alertCount}</span>}
        </button>
      );
      if (currentPath === "/") {
        if (vistaActual === "tabla") {
          navActionItems.push(
            <button key="verGraficas" onClick={onVerGraficasClick} className={twClasses.button}>
              Ver Gráficas
            </button>
          );
        } else {
          navActionItems.push(
            <button key="verTabla" onClick={onVerTablaClick} className={twClasses.button}>
              Ver Tabla
            </button>
          );
        }
      } else if (currentPath.startsWith("/admin") || currentPath === "/perfil") {
        navActionItems.push(
          <button key="verTablaAdmin" onClick={onVerTablaClick} className={twClasses.button}>
            Ver Tabla
          </button>
        );
        navActionItems.push(
          <button key="verGraficasAdmin" onClick={onVerGraficasClick} className={twClasses.button}>
            Ver Gráficas
          </button>
        );
      }
    }
  }

  // NUEVO: Agregamos !isEncargado para que tampoco pueda ver el botón "Agregar Doctor"
  if (
    currentPath === "/" &&
    vistaActual === "tabla" &&
    isAuthenticated &&
    currentUser?.role !== "guest" &&
    !isEncargado &&
    typeof onAgregarDoctorClick === "function"
  ) {
    navActionItems.push(
      <button key="agregarDoctor" onClick={onAgregarDoctorClick} className={twClasses.button}>
        Agregar Doctor
      </button>
    );
  }

  if (isEncargado) {
    if (currentPath !== "/asistencia") {
      navActionItems.push(
        <Link key="navAsistencia" to="/asistencia" className={twClasses.adminButtonLink}>
          Registro de Asistencia
        </Link>
      );
    }
    if (currentPath !== "/reportes") {
      navActionItems.push(
        <Link key="navReportes" to="/reportes" className={twClasses.adminButtonLink}>
          Reportes Quincenales
        </Link>
      );
    }
  }

  // La Auditoría y Usuarios ya están protegidas automáticamente porque requieren role === "admin"
  if (isAuthenticated && currentUser && currentUser.role === "admin") {
    if (currentPath !== "/admin/users") {
      navActionItems.push(
        <Link key="adminUsers" to="/admin/users" className={twClasses.adminButtonLink}>
          Gestionar Usuarios
        </Link>
      );
    }
    if (currentPath !== "/admin/audit-log") {
      navActionItems.push(
        <Link key="adminAudit" to="/admin/audit-log" className={twClasses.adminButtonLink}>
          Auditoría
        </Link>
      );
    }
  }

  if (isAuthenticated || isGuestMode) {
    navActionItems.push(
      <button key="logout" onClick={handleLogoutOrExitGuest} className={twClasses.logoutButton}>
        {isAuthenticated ? "Cerrar Sesión" : "Salir"}
      </button>
    );
  }

  return (
    <header className="sticky top-0 z-1000 w-full shadow-md font-sans bg-white">
      {/* Barra Superior: Gobierno */}
      <div className="bg-[#691C32] w-full">
        <div className="container mx-auto px-4 md:px-8 py-2 flex items-center">
          <img
            src={logo}
            alt="Gobierno de México"
            className="h-8 md:h-10 object-contain"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>
      </div>

      {/* Barra Principal: IMSS Bienestar */}
      <div className="bg-[#10312B] relative w-full overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full opacity-5 bg-white transform skew-x-12 pointer-events-none"></div>

        <div className="container mx-auto px-4 md:px-8 py-2.5 relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">

          {/* LADO IZQUIERDO: Logo y Títulos */}
          <div className="flex items-center gap-4">
            <img
              src="/fotos/imss-bienestar-blanco.png"
              alt="IMSS Bienestar"
              className="h-9 md:h-11 w-auto object-contain border-r border-white/20 pr-4 hidden sm:block"
            />
            <div className="flex flex-col">
              <h2 className="text-white text-sm md:text-lg font-light opacity-90">Sistema del Programa de Personal Extranjero de Atención a la Salud</h2>
              <div className="text-[#DDC9A3] text-[10px] md:text-[11px] uppercase mt-0.5 flex items-center gap-2">
                <span>IMSS BIENESTAR</span>

                {isGuestMode && !isAuthenticated && (
                  <span className="text-white/70 italic normal-case font-normal">(Invitado)</span>
                )}
                {isAuthenticated && currentUser && currentUser.username && (
                  <Link
                    to="/perfil"
                    title="Ir a mi perfil"
                    className="text-white/70 hover:text-white transition-colors italic normal-case font-normal text-[10px] md:text-[11px]"
                  >
                    ({currentUser.username} - {currentUser.role})
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* LADO DERECHO: Botones de Acción */}
          <div className="flex items-center flex-wrap md:flex-nowrap gap-1 justify-end">
            {renderNavItems(navActionItems)}

            {downloading && downloadError === "" && (
              <span className="text-white/80 ml-2 text-xs font-medium">Generando...</span>
            )}
            {downloadError && (
              <span className="bg-[#9F2241]/80 text-[#ffdddd] ml-2 px-2 py-1 rounded text-[10px] max-w-37.5 truncate">
                Error: {downloadError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Franja Dorada Inferior */}
      <div className="h-1 w-full bg-[#B08D55]"></div>

      <AlertasModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
      />
    </header>
  );
}

export default Navbar;
