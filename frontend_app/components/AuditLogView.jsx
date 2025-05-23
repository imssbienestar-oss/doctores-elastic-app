import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../src/contexts/AuthContext'; // Ajusta la ruta a tu AuthContext
import { Tooltip as ReactTooltip } from 'react-tooltip';
import DatePicker from 'react-datepicker'; // Importar DatePicker
import 'react-datepicker/dist/react-datepicker.css'; // Estilos para DatePicker

// Estilos básicos (puedes moverlos a un archivo CSS o usar styled-components/Tailwind)
const styles = {
  container: {
    padding: "20px",
    margin: "20px auto",
    maxWidth: "1200px", // Aumentado para más espacio
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#fff", // Fondo blanco para un look más limpio
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)", // Sombra más suave
  },
  title: {
    textAlign: "center",
    color: "#333", // Color de título más oscuro
    marginBottom: "30px", // Más espacio debajo del título
    fontSize: "28px", // Tamaño de fuente más grande para el título
    fontWeight: "600", // Título un poco más grueso
    borderBottom: "1px solid #eee", // Añadido para consistencia
    paddingBottom: "15px",    // Añadido para consistencia
  },
  controlsContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    flexWrap: "wrap",
    gap: "15px",
    padding: "15px", // Padding alrededor de los controles
    backgroundColor: "#f8f9fa", // Fondo ligero para la sección de controles
    borderRadius: "6px",
  },
  filterSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  datePickerLabel: {
    fontSize: "0.9em",
    color: "#495057", // Color de label más oscuro
    marginRight: "5px",
    fontWeight: "500",
  },
  datePickerInput: {
    padding: "8px 12px",
    fontSize: "0.9em",
    border: "1px solid #ced4da", // Borde estándar
    borderRadius: "4px",
    width: "130px", // Un poco más de ancho
    boxSizing: "border-box",
  },
  actionsHeader: {
    display: "flex",
    gap: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px", // Reducido ya que los controles tienen su propio espacio
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)", // Sombra más sutil para la tabla
    fontSize: "0.95em", // Tamaño de fuente base para la tabla
  },
  th: {
    backgroundColor: "#006657", // Tu color verde IMSS
    color: "white",
    padding: "12px 15px",
    textAlign: "center", // Alineación a la izquierda para consistencia
    borderBottom: "2px solid #005c4e", // Borde inferior más grueso para el header
    fontSize: "0.9em",
    textTransform: "uppercase",
    letterSpacing: "0.5px", // Ligero espaciado de letras
  },
  td: {
    padding: "12px 15px", // Padding consistente
    borderBottom: "1px solid #e9ecef", // Borde más claro entre filas
    color: "#495057",
    verticalAlign: "middle", // Mejor alineación vertical
  },
  checkboxCell: {
    textAlign: "center",
    width: "40px",
  },
  detailsCell: {
    maxWidth: "350px", // Ajustado el ancho máximo
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  tooltipContentContainer: { // Estilo para el contenedor del tooltip
    backgroundColor: "rgba(33,37,41,0.95)", // Más oscuro, Bootstrap-like .bg-dark
    color: "#f8f9fa", // Texto más claro
    borderRadius: "6px",
    padding: "10px 15px",
    fontSize: "1.2em",
    lineHeight: "1.5",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    maxWidth: '480px',
    maxHeight: '350px',
    overflowY: 'auto',
    zIndex: 1050, // Asegurar que esté por encima de otros elementos del modal si los hay
    textAlign: 'left',
  },
  tooltipList: { listStyleType: 'none', paddingLeft: '0', margin: 0 },
  tooltipListItem: { marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dotted rgba(255,255,255,0.15)' },
  tooltipFieldHeader: { fontWeight: 'bold', color: '#58a6ff', marginBottom: '8px', display: 'block' }, // Azul brillante para el encabezado
  preformattedText: { margin:0, textAlign:'left', fontSize:'0.9em', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  trEven: {
    backgroundColor: "#f8f9fa", // Un gris muy claro para filas pares
  },
  message: { textAlign: "center", padding: "20px", fontSize: "1.1em", color: "#6c757d" }, // Gris para mensajes
  error: {
    textAlign: "center", padding: "15px", fontSize: "1em", color: "#721c24", // Rojo oscuro para texto de error
    border: "1px solid #f5c6cb", backgroundColor: "#f8d7da", borderRadius: "4px", // Fondo rojo claro
    marginTop: '15px', marginBottom: '15px',
  },
  successMessage: {
    textAlign: "center", padding: "15px", fontSize: "1em", color: "#155724", // Verde oscuro para texto
    border: "1px solid #c3e6cb", backgroundColor: "#d4edda", borderRadius: "4px", // Fondo verde claro
    marginTop: '15px', marginBottom: '15px',
  },
  paginationControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "25px",
    paddingTop: "15px",
    borderTop: "1px solid #e9ecef",
  },
  button: {
    padding: "10px 18px", // Botones un poco más grandes
    margin: "0px", // Quitar margen individual, usar gap en el contenedor
    fontSize: "0.95em",
    cursor: "pointer",
    backgroundColor: "#BC955C", // Tu color dorado
    color: "white",
    border: "none",
    borderRadius: "6px",
    transition: "background-color 0.2s ease, opacity 0.2s ease",
    opacity: 1,
    fontWeight: "500",
  },
  buttonSmall: { padding: '6px 12px', fontSize: '0.85em'},
  buttonDisabled: { backgroundColor: "#adb5bd", color: "#6c757d", cursor: "not-allowed", opacity: 0.8 }, // Estilo de deshabilitado más claro
  deleteButton: { backgroundColor: "#dc3545" }, // Rojo Bootstrap para eliminar
};


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const ITEMS_PER_PAGE = 20;

function AuditLogView() {
  const { token: authToken, currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLogs, setSelectedLogs] = useState(new Set());

  const [filterStartDate, setFilterStartDate] = useState(null);
  const [filterEndDate, setFilterEndDate] = useState(null);

    const fetchAuditLogs = useCallback(async (page, startDate, endDate) => {
    //console.log("AuditLogView: Iniciando fetchAuditLogs. Página:", page, "Token:", !!authToken, "Admin:", currentUser?.role);
    if (!authToken || currentUser?.role !== 'admin') {
      setError("Acceso denegado o no autenticado.");
      setIsLoading(false); setLogs([]); setTotalLogs(0); return;
    }
    setIsLoading(true); setError(''); setSuccessMessage('');
    const skip = page * ITEMS_PER_PAGE;
    
    let fetchUrl = `${API_BASE_URL}/api/admin/audit-logs?skip=${skip}&limit=${ITEMS_PER_PAGE}`;
    if (startDate) {
      fetchUrl += `&start_date=${startDate.toISOString().split('T')[0]}`;
    }
    if (endDate) {
      fetchUrl += `&end_date=${endDate.toISOString().split('T')[0]}`; 
    }
    //console.log("AuditLogView: Fetching URL:", fetchUrl);

    try {
      const response = await fetch(fetchUrl, { headers: { 'Authorization': `Bearer ${authToken}` } });
      //console.log("AuditLogView: Respuesta del fetch recibida, status:", response.status);

      if (!response.ok) {
        let errorDetail = `Error ${response.status}`;
        try {
            const errorData = await response.json();
            //console.error("AuditLogView: Error data from server:", errorData);
            errorDetail = errorData.detail || JSON.stringify(errorData) || `Error ${response.status}`;
        } catch (e) {
            const textError = await response.text().catch(() => "No se pudo leer el cuerpo del error.");
            //console.error("AuditLogView: Error response no es JSON, texto:", textError);
            errorDetail = textError || `Error ${response.status} al cargar los logs.`;
        }
        throw new Error(errorDetail);
      }
      
      const data = await response.json();
      //console.log("AuditLogView: Datos recibidos del backend:", data);
      
      // --- LÓGICA CORREGIDA PARA MANEJAR LA RESPUESTA DEL BACKEND ---
      let receivedLogs = [];
      let receivedTotalCount = 0;

      if (data && typeof data === 'object' && data.audit_logs !== undefined && data.total_count !== undefined) {
        // Caso 1: El backend devuelve el objeto esperado { audit_logs: [], total_count: N }
        receivedLogs = data.audit_logs || [];
        receivedTotalCount = data.total_count || 0;
      } else if (Array.isArray(data)) {
        // Caso 2: El backend devuelve directamente un array de logs
        // Esto significa que el backend NO está devolviendo el total_count para paginación del servidor.
        console.warn("AuditLogView: Backend devolvió un array directamente. Asumiendo que no hay paginación del servidor o que es la lista completa para esta página.");
        receivedLogs = data;
        // IMPORTANTE: Si el backend ya pagina y solo envía un array, no podemos saber el total_count global.
        // Esta línea es una suposición para que al menos se muestren los logs de la página actual.
        // Para una paginación robusta, el backend DEBE enviar total_count.
        receivedTotalCount = data.length; // Esto podría ser incorrecto si el backend pagina y no envía el total.
                                         // Si el backend NO pagina y envía todos, esto es el total.
      } else {
        //console.warn("AuditLogView: Formato de datos inesperado del backend:", data);
        // Mantener los valores por defecto (vacíos) si el formato es incorrecto
      }

      setLogs(receivedLogs);
      setTotalLogs(receivedTotalCount);
      //console.log("AuditLogView: Estado actualizado. Logs en estado:", receivedLogs.length, "Total logs en estado:", receivedTotalCount);
      // --- FIN DE LÓGICA CORREGIDA ---

    } catch (err) {
      //console.error("AuditLogView: Error en fetchAuditLogs catch block:", err);
      setError(err.message || "Ocurrió un error al cargar los logs de auditoría.");
      setLogs([]); setTotalLogs(0);
    } finally { setIsLoading(false); }
  }, [authToken, currentUser]);

 useEffect(() => {
    // Este useEffect ahora es el principal para disparar el fetch
    if (currentUser?.role === 'admin' && authToken) { // Asegurarse que authToken también exista
        //console.log("useEffect [fetchTriggers]: User is admin, calling fetchAuditLogs. Page:", currentPage);
        fetchAuditLogs(currentPage, filterStartDate, filterEndDate);
    } else if (authToken && currentUser && currentUser.role !== 'admin') {
        //console.log("useEffect [fetchTriggers]: User is not admin. Role:", currentUser?.role);
        setError("Acceso denegado. Esta sección es solo para administradores.");
        setLogs([]); setTotalLogs(0);
    } else if (!authToken) {
        console.log("useEffect [fetchTriggers]: User not authenticated.");
        setError("No autenticado. Por favor, inicie sesión.");
        setLogs([]); setTotalLogs(0);
    }
  }, [fetchAuditLogs, currentPage, filterStartDate, filterEndDate, currentUser, authToken]);


  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("es-MX", { 
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      });
    } catch (e) { return dateString; }
  };

  const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);
  
  const handlePageChange = (newPage) => {
    setSelectedLogs(new Set()); // Limpiar selección al cambiar de página
    setCurrentPage(newPage);
  };
  const handlePreviousPage = () => handlePageChange(Math.max(0, currentPage - 1));
  const handleNextPage = () => handlePageChange(Math.min(totalPages - 1, currentPage + 1));
  
  const formatDetailsForTooltip = (actionType, detailsString) => {
    // ... (tu función formatDetailsForTooltip sin cambios, o la versión mejorada que tenías) ...
    if (!detailsString) return "Sin detalles específicos.";
    if (actionType === "UPDATE_DOCTOR" || actionType === "UPDATE_USER") {
      try {
        detailsString = detailsString.replace(/^Se actualizo Doctor:\s*[^:]+:\s*/i, '');
        const changedFields = JSON.parse(detailsString);
        if (Array.isArray(changedFields) && changedFields.length > 0) {
          let htmlOutput = `<strong style="${Object.entries(styles.tooltipFieldHeader).map(([k,v])=>`${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(';')}">Campos Actualizados:</strong>`;
          htmlOutput += `<ul style="${Object.entries(styles.tooltipList).map(([k,v])=>`${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(';')}">`;
          changedFields.forEach(field => {
            const legibleFieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            htmlOutput += `<li style="${Object.entries(styles.tooltipListItem).map(([k,v])=>`${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(';')}">${legibleFieldName}</li>`;
          });
          htmlOutput += '</ul>';
          return htmlOutput;
        } else if (Array.isArray(changedFields) && changedFields.length === 0) {
          return "Actualización procesada, sin cambios de valor detectados.";
        }
      } catch (e) {}
    }
    try {
      const parsed = JSON.parse(detailsString);
      return `<pre style="${Object.entries(styles.preformattedText).map(([k,v])=>`${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(';')}">${JSON.stringify(parsed, null, 2)}</pre>`;
    } catch (e) {
      return `<pre style="${Object.entries(styles.preformattedText).map(([k,v])=>`${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`).join(';')}">${detailsString.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
    }
  };

  const handleSelectLog = (logId) => {
    setSelectedLogs((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(logId)) { newSelected.delete(logId); } 
      else { newSelected.add(logId); }
      return newSelected;
    });
  };

  const handleSelectAllLogsOnPage = (event) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      const allLogIdsOnPage = new Set(logs.map((log) => log.id));
      setSelectedLogs(allLogIdsOnPage);
    } else {
      setSelectedLogs(new Set());
    }
  };

  const isAllSelectedOnPage = logs.length > 0 && selectedLogs.size === logs.length && logs.every((log) => selectedLogs.has(log.id));

  const handleApplyDateFilter = () => {
    setCurrentPage(0); 
    // fetchAuditLogs se disparará por el useEffect que depende de filterStartDate/EndDate
  };

  const handleClearDateFilters = () => {
    setFilterStartDate(null);
    setFilterEndDate(null);
    setCurrentPage(0);
    // fetchAuditLogs se disparará por el useEffect
  };

  const handleDeleteSelected = async () => {
    if (selectedLogs.size === 0) {
      alert("Por favor, seleccione al menos un registro para eliminar.");
      return;
    }
    if (window.confirm(`ADVERTENCIA: ¿Está seguro de que desea eliminar ${selectedLogs.size} registro(s) de auditoría? Esta acción es generalmente irreversible y no recomendada.`)) {
      setIsLoading(true); setError(''); setSuccessMessage('');
      const idsToDelete = Array.from(selectedLogs);
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/audit-logs/bulk-delete`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: idsToDelete }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: "Error al eliminar logs." }));
          throw new Error(errorData.detail || `Error ${response.status}`);
        }
        setSuccessMessage(`${idsToDelete.length} registro(s) de auditoría eliminados exitosamente.`);
        setSelectedLogs(new Set());
        fetchAuditLogs(0, filterStartDate, filterEndDate); // Refrescar a la página 0 con filtros actuales
      } catch (err) {
        console.error("Error deleting audit logs:", err);
        setError(err.message || "Ocurrió un error al eliminar los logs.");
      } finally { setIsLoading(false); }
    }
  };
  
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => { setSuccessMessage(''); setError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

   // Lógica de renderizado condicional
  if (!currentUser && !isLoading && !error) { // Si currentUser es null y no hay error/carga, podría ser el estado inicial antes de que AuthContext cargue
    return <div style={styles.message}>Verificando autenticación...</div>;
  }
  if (!authToken && !isLoading) return <div style={styles.error}>{error || "No autenticado. Por favor, inicie sesión."}</div>;
  if (authToken && currentUser?.role !== "admin" && !isLoading) return <div style={styles.error}>{error || "Acceso denegado. Esta sección es solo para administradores."}</div>;
  if (isLoading && logs.length === 0) return <div style={styles.message}>Cargando logs de auditoría...</div>;
  
  return (
    <div style={styles.container}>
      <h1>Auditoría del sistema</h1>

      <div style={styles.controlsContainer}>
        <div style={styles.filterSection}>
          <label style={styles.datePickerLabel}>Desde:</label>
          <DatePicker
            selected={filterStartDate}
            onChange={(date) => setFilterStartDate(date)}
            selectsStart
            startDate={filterStartDate}
            endDate={filterEndDate}
            dateFormat="dd/MM/yyyy"
            placeholderText="Fecha inicio"
            customInput={<input style={styles.datePickerInput} />}
            isClearable
            wrapperClassName="date-picker-wrapper" // Para estilos adicionales si es necesario
          />
          <label style={styles.datePickerLabel}>Hasta:</label>
          <DatePicker
            selected={filterEndDate}
            onChange={(date) => setFilterEndDate(date)}
            selectsEnd
            startDate={filterStartDate}
            endDate={filterEndDate}
            minDate={filterStartDate}
            dateFormat="dd/MM/yyyy"
            placeholderText="Fecha fin"
            customInput={<input style={styles.datePickerInput} />}
            isClearable
            wrapperClassName="date-picker-wrapper"
          />
          {/* El botón de aplicar filtro ahora está implícito en el useEffect que observa las fechas */}
          {/* Podrías añadirlo si prefieres un accionamiento manual:
           <button onClick={handleApplyDateFilter} style={{...styles.button, ...styles.buttonSmall}} disabled={isLoading}>
            Filtrar
          </button> 
          */}
          {(filterStartDate || filterEndDate) && (
            <button onClick={handleClearDateFilters} style={{...styles.button, ...styles.buttonSmall, backgroundColor: '#6c757d'}} disabled={isLoading}>
              Limpiar Fechas
            </button>
          )}
        </div>

        <div style={styles.actionsHeader}>
          {logs.length > 0 && (
            <button 
              onClick={handleDeleteSelected} 
              disabled={selectedLogs.size === 0 || isLoading}
              style={{...styles.button, ...styles.deleteButton, ...(selectedLogs.size === 0 && styles.buttonDisabled)}}
              title="Eliminar logs seleccionados (¡Precaución!)"
            >
              Eliminar Seleccionados
            </button>
          )}
        </div>
      </div>
      
      {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
      {error && <div style={styles.error} role="alert">{error}</div>} {/* Muestra error general incluso si hay logs */}


      {logs.length === 0 && !isLoading && !error && (
        <p style={styles.message}>No hay registros de auditoría disponibles para los filtros aplicados.</p>
      )}

      {logs.length > 0 && (
        <>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.checkboxCell }}>
                  <input 
                    type="checkbox"
                    checked={isAllSelectedOnPage}
                    onChange={handleSelectAllLogsOnPage}
                    disabled={logs.length === 0 || isLoading}
                    title="Seleccionar todos en esta página"
                  />
                </th>
                <th style={styles.th}>Fecha y Hora</th>
                <th style={styles.th}>Usuario</th>
                <th style={styles.th}>Acción</th>
                <th style={styles.th}>Entidad</th>
                <th style={styles.th}>ID Entidad</th>
                <th style={styles.th}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={log.id || index} style={index % 2 === 0 ? {} : styles.trEven}>
                  <td style={{ ...styles.td, ...styles.checkboxCell }}>
                    <input 
                      type="checkbox"
                      checked={selectedLogs.has(log.id)}
                      onChange={() => handleSelectLog(log.id)}
                    />
                  </td>
                  <td style={styles.td}>{formatDate(log.timestamp)}</td>
                  <td style={styles.td}>{log.username || "N/A"}</td>
                  <td style={styles.td}>{log.action_type}</td>
                  <td style={styles.td}>{log.target_entity || "N/A"}</td>
                  <td style={styles.td}>
                    {log.target_id !== null && log.target_id !== undefined
                      ? log.target_id
                      : "N/A"}
                  </td>
                  <td 
                    style={{ ...styles.td, ...styles.detailsCell }}
                    data-tooltip-id={`tooltip-details-${log.id || index}`}
                    data-tooltip-html={formatDetailsForTooltip(log.action_type, log.details)}
                    data-tooltip-place="top-start"
                  >
                    {log.action_type === "UPDATE_DOCTOR"
                      ? "Ver campos actualizados"
                      : log.details && log.details.length > 50
                      ? `${log.details.substring(0, 21)}...`
                      : log.details || "Sin detalles"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {logs.map((log, index) => (
            <ReactTooltip 
                key={`tooltip-content-${log.id || index}`} 
                id={`tooltip-details-${log.id || index}`}
                style={styles.tooltipContentContainer}
            />
          ))}

          {totalPages > 1 && (
            <div style={styles.paginationControls}>
              <button onClick={handlePreviousPage} disabled={currentPage === 0 || isLoading} style={{...styles.button, ...((currentPage === 0 || isLoading) && styles.buttonDisabled)}}> Anterior </button>
              <span>Página {currentPage + 1} de {totalPages} (Total Registros: {totalLogs})</span>
              <button onClick={handleNextPage} disabled={currentPage >= totalPages - 1 || isLoading} style={{...styles.button, ...((currentPage >= totalPages - 1 || isLoading) && styles.buttonDisabled)}}> Siguiente </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AuditLogView;
