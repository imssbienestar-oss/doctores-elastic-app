// src/components/Navbar.jsx
import React, { useState } from "react";

// Este componente recibe como "props" las funciones que debe ejecutar
// cuando se hace clic en los botones. También recibe el título.
function Navbar({
  title,
  onAddDoctorClick,
  onLogoutClick,
  onVerGraficasClick,
  onVerTablaClick, // <-- NUEVA PROP
  vistaActual, // <-- NUEVA PROP
}) {
  const [showReportOptions, setShowReportOptions] = useState(false); // <-- NUEVO ESTADO
  const [downloading, setDownloading] = useState(false); // Estado de descarga
  const [downloadError, setDownloadError] = useState(""); // Estado de error descarga
  // --- NUEVA FUNCIÓN PARA MANEJAR DESCARGAS ---
  const handleDownload = async (reportType) => {
    setDownloading(true); // Inicia descarga
    setDownloadError(""); // Limpia error previo
    setShowReportOptions(false); // Oculta opciones después de click

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setDownloadError("Error: No autenticado.");
      setDownloading(false);
      return;
    }

    // Determina la URL del backend según el formato
    const backendUrl =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    let urlPath = "";
    let filenameDefault = "";

    // --- ESTA LÓGICA SWITCH ES LA QUE DEBEMOS USAR Y AJUSTAR ---
    switch (reportType) {
      case "xlsx":
        urlPath = "/api/reporte/xlsx"; // Endpoint de Excel
        filenameDefault = "reporte_doctores_completo.xlsx";
        break;
      case "pdf": // Este es el tipo para el PDF resumido que queremos
        urlPath = "/api/reporte/pdf"; // Endpoint del PDF resumido
        filenameDefault = "reporte_resumido_doctores.pdf";
        break;
      // YA NO NECESITAS: 'pdf_lista', 'pdf_por_estado', 'pdf_por_especialidad' si solo quieres dos opciones
      default:
        setDownloadError("Tipo de reporte no válido.");
        setDownloading(false);
        return;
    }

    const url = `${backendUrl}${urlPath}`; // <<< --- ¡ESTA ES LA FORMA CORRECTA! ---

    console.log(`Descargando reporte ${reportType} desde: ${url}`);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Obtener el nombre del archivo de la cabecera Content-Disposition
        const disposition = response.headers.get("content-disposition");
        let filename = `reporte_doctores.${reportType}`; // Nombre por defecto
        if (disposition && disposition.indexOf("attachment") !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, "");
          }
        }

        // Convertir la respuesta en un Blob (Binary Large Object)
        const blob = await response.blob();
        // Crear una URL temporal para el Blob
        const downloadUrl = window.URL.createObjectURL(blob);
        // Crear un enlace temporal <a> para iniciar la descarga
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", filename); // Establecer nombre de archivo
        document.body.appendChild(link); // Añadir enlace al DOM
        link.click(); // Simular clic en el enlace
        link.parentNode.removeChild(link); // Eliminar enlace del DOM
        window.URL.revokeObjectURL(downloadUrl); // Liberar la URL del objeto
        console.log("Descarga iniciada:", filename);
      } else {
        // Manejar errores (ej. 401, 500)
        let errorMsg = `Error al descargar reporte (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg += `: ${errorData.detail}`;
        } catch (e) {}
        setDownloadError(errorMsg);
        console.error(
          "Error en respuesta de descarga:",
          response.status,
          response.statusText
        );
      }
    } catch (err) {
      setDownloadError("Error de red al intentar descargar el reporte.");
      console.error("Error de fetch en descarga:", err);
    } finally {
      setDownloading(false); // Finaliza descarga
    }
  };
  // --- FIN FUNCIÓN DESCARGA ---

  return (
    <nav style={styles.navbar}>
      <div style={styles.title}>
        {title || "Sistema Doctores"} {/* Muestra el título */}
      </div>

      {downloading && (
        <span style={{ color: "yellow", marginLeft: "15px" }}>
          Generando reporte...
        </span>
      )}
      {downloadError && (
        <span style={{ color: "red", marginLeft: "15px" }}>
          {downloadError}
        </span>
      )}

      <div style={styles.actions}>
        {vistaActual === "tabla" ? (
          <button onClick={onVerGraficasClick} style={styles.button}>
            Ver Gráficas
          </button>
        ) : (
          <button onClick={onVerTablaClick} style={styles.button}>
            Ver Tabla
          </button>
        )}
        <div style={{ position: "relative" }}>
          {/* Contenedor relativo para posicionar opciones */}
          {/* Cambia onClick para mostrar/ocultar opciones */}
          <button
            onClick={() => setShowReportOptions(!showReportOptions)} // Toggle state
            style={styles.button /* O un estilo específico */}
            disabled={downloading}
          >
            {downloading ? "Generando..." : "Generar Reporte"}
          </button>
          {/* Opciones de descarga (se muestran si showReportOptions es true) */}
          {showReportOptions && (
            <div style={styles.reportOptions}>
              {/* Estilo para el menú desplegable */}
              <button
                onClick={() => handleDownload("xlsx")}
                style={styles.optionButton}
              >
                Descargar Excel
              </button>
              <button
                onClick={() => handleDownload("pdf")}
                style={styles.optionButton}
                disabled={downloading}
              >
                Descargar PDF
              </button>
            </div>
          )}
        </div>
        {/* Botón Agregar Doctor (condicional a la vista de tabla) */}
        {/* ESTA ES LA PARTE QUE PREGUNTABAS: */}
        {vistaActual === "tabla" && (
          <button
            onClick={() => onAddDoctorClick(null)} // Llama a la función para abrir el modal de agregar
            style={styles.button}
          >
            Agregar Doctor
          </button>
        )}

        {/* Botón Cerrar Sesión */}
        <button
          onClick={onLogoutClick}
          style={{ ...styles.button, ...styles.logoutButton }}
        >
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}

// Estilos básicos para el Navbar (puedes moverlos a un .css si prefieres)
const styles = {
  navbar: {
    position: "fixed",
    top: 0,
    zIndex: 1000,
    width: "100%",
    display: "flex",
    justifyContent: "space-between", // Título a la izq, acciones a la der
    alignItems: "center",
    padding: "10px 25px", // Padding horizontal y vertical
    backgroundColor: "#2c3e50", // Un color oscuro para la barra
    color: "white",
    boxSizing: "border-box",
    marginBottom: "25px", // Espacio debajo del navbar
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)", // Sombra sutil
  },
  title: {
    fontSize: "1.6em", // Tamaño del título
    fontWeight: "bold",
  },
  actions: {
    display: "flex",
    gap: "15px", // Espacio entre los botones
  },
  button: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#3498db", // Un azul para botones de acción
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
  },
  logoutButton: {
    backgroundColor: "#e74c3c", // Un rojo para cerrar sesión
  },
  reportOptions: {
    position: "absolute", // Posicionamiento absoluto respecto al div relativo
    top: "100%", // Justo debajo del botón
    right: 0, // Alineado a la derecha del botón contenedor
    backgroundColor: "#f9f9f9", // Fondo claro
    minWidth: "160px",
    boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
    zIndex: 1001, // Por encima del navbar
    display: "flex",
    flexDirection: "column", // Botones uno debajo del otro
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  optionButton: {
    backgroundColor: "#000",
    padding: "8px",
    marginBottom: "1px",
  },
};

// Añadir efecto hover a los botones (esto es más fácil con CSS, pero un ejemplo inline)
// Para un efecto real, necesitarías manejar onMouseEnter/onMouseLeave o usar CSS Modules/Styled Components
// styles.button[':hover'] = { backgroundColor: '#2980b9' }; // Esto no funciona directamente en estilos inline
// styles.logoutButton[':hover'] = { backgroundColor: '#c0392b' };

export default Navbar;
