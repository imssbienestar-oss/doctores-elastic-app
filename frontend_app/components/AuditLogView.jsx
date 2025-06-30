import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../src/contexts/AuthContext"; // Ajusta la ruta a tu AuthContext
import { Tooltip as ReactTooltip } from "react-tooltip";
import DatePicker from "react-datepicker"; // Importar DatePicker
import "react-datepicker/dist/react-datepicker.css"; // Estilos para DatePicker

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
    paddingBottom: "15px", // Añadido para consistencia
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
    position: "relative",
  },
  td: {
    padding: "12px 15px", // Padding consistente
    borderBottom: "1px solid #e9ecef", // Borde más claro entre filas
    color: "#495057",
    verticalAlign: "middle", // Mejor alineación vertical
    textAlign: "center",
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
    textAlign: "left",
  },
  tooltipContentContainer: {
    // Estilo para el contenedor del tooltip
    backgroundColor: "rgba(33,37,41,0.95)", // Más oscuro, Bootstrap-like .bg-dark
    color: "#f8f9fa", // Texto más claro
    borderRadius: "6px",
    padding: "10px 15px",
    fontSize: "1.2em",
    lineHeight: "1.5",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    maxWidth: "480px",
    maxHeight: "350px",
    overflowY: "auto",
    zIndex: 1050, // Asegurar que esté por encima de otros elementos del modal si los hay
    textAlign: "left",
  },
  tooltipList: { listStyleType: "none", paddingLeft: "0", margin: 0 },
  tooltipListItem: {
    marginBottom: "6px",
    paddingBottom: "6px",
    borderBottom: "1px dotted rgba(255,255,255,0.15)",
  },
  tooltipFieldHeader: {
    fontWeight: "bold",
    color: "#58a6ff",
    marginBottom: "8px",
    display: "block",
  }, // Azul brillante para el encabezado
  preformattedText: {
    margin: 0,
    textAlign: "left",
    fontSize: "0.9em",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  trEven: {
    backgroundColor: "#f8f9fa", // Un gris muy claro para filas pares
  },
  message: {
    textAlign: "center",
    padding: "20px",
    fontSize: "1.1em",
    color: "#6c757d",
  }, // Gris para mensajes
  error: {
    textAlign: "center",
    padding: "15px",
    fontSize: "1em",
    color: "#721c24", // Rojo oscuro para texto de error
    border: "1px solid #f5c6cb",
    backgroundColor: "#f8d7da",
    borderRadius: "4px", // Fondo rojo claro
    marginTop: "15px",
    marginBottom: "15px",
  },
  successMessage: {
    textAlign: "center",
    padding: "15px",
    fontSize: "1em",
    color: "#155724", // Verde oscuro para texto
    border: "1px solid #c3e6cb",
    backgroundColor: "#d4edda",
    borderRadius: "4px", // Fondo verde claro
    marginTop: "15px",
    marginBottom: "15px",
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
  buttonSmall: { padding: "6px 12px", fontSize: "0.85em" },
  buttonDisabled: {
    backgroundColor: "#adb5bd",
    color: "#6c757d",
    cursor: "not-allowed",
    opacity: 0.8,
  }, // Estilo de deshabilitado más claro
  deleteButton: { backgroundColor: "#dc3545" },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    backgroundColor: "white",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
    zIndex: 1000,
    minWidth: "200px",
    maxHeight: "250px",
    overflowY: "auto",
    textAlign: "left", // Asegura que el texto dentro del dropdown esté a la izquierda
  },
  dropdownItem: {
    padding: "10px 15px",
    cursor: "pointer",
    color: "#333", // Color de texto para las opciones
    fontSize: "0.9em",
    textTransform: "none", // Anula text-transform del th si es necesario
    letterSpacing: "normal", // Anula letter-spacing del th si es necesario
  },
  pinContainer: {
    display: "flex",
    justifyContent: "center", // Centra los cuadritos
    gap: "10px", // Espacio entre los cuadritos
    marginBottom: "20px", // Espacio debajo del contenedor del PIN
  },
  pinBox: {
    width: "50px", // Ancho de cada cuadrito
    height: "60px", // Altura de cada cuadrito
    textAlign: "center",
    fontSize: "1.8em", // Tamaño del número/punto dentro del cuadrito
    border: "none", // Quitar borde por defecto si solo quieres la línea inferior
    borderBottom: "2px solid #006657", // Línea inferior (tu color verde)
    // O si prefieres un borde completo para cada caja:
    border: "2px solid #006657",
    borderRadius: "20px",
    outline: "none", // Quitar el outline azul por defecto al enfocar
    caretColor: "transparent", // Opcional: Oculta el cursor de texto si se ve raro
    // Para un efecto de foco en la línea inferior (necesitarías :focus en CSS o manejarlo con estado en JS)
    // Si usas un archivo CSS separado, podrías añadir:
    // .pin-box:focus {
    //   border-bottom-color: '#BC955C'; /* Tu color dorado para el foco */
    // }
  },
  confirmationTextarea: {
    width: "100%",
    padding: "12px 15px", // Un poco más de padding
    marginBottom: "15px",
    border: "1px solid #ced4da", // Un color de borde estándar y más suave
    borderRadius: "6px", // Un poco más de radio para consistencia si otros inputs lo tienen
    boxSizing: "border-box",
    resize: "none", // Ya lo tenías, bueno para evitar que el usuario lo redimensione
    fontFamily: "Arial, sans-serif", // Asegúrate que coincida con la fuente general de tu app
    fontSize: "1em", // O el tamaño que prefieras
    lineHeight: "1.5", // Mejor legibilidad para texto multilínea
    color: "#495057", // Color de texto oscuro pero no negro puro
    backgroundColor: "#fff", // Fondo blanco
    // Para un efecto sutil al enfocar (esto es más fácil con CSS, pero podemos simularlo o prepararlo)
    // Si quieres un cambio de borde en foco usando JS, necesitarías un estado para el foco.
    // Con CSS puro (si mueves esto a un archivo .css y usas className):
    // '&:focus': { // Sintaxis para JSS o librerías CSS-in-JS
    borderColor: "#BC955C", // Tu color dorado
    boxShadow: "0 0 0 0.2rem rgba(38, 32, 22, 0.25)", // Un "glow" sutil
    outline: "none",
    // }
  },
  // (Si quieres un estilo específico para el foco manejado por JS)
  confirmationTextareaFocus: {
    borderColor: "#BC955C", // Tu color dorado
    boxShadow: "0 0 0 0.2rem rgba(188, 149, 92, 0.25)",
    outline: "none",
  },
};



const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const ITEMS_PER_PAGE = 15;

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

  const [filtroUsuario, setFiltroUsuario] = useState(null); // o '' para todos
  const [filtroAccion, setFiltroAccion] = useState(null); // o '' para todos

  const [mostrarDropdownUsuario, setMostrarDropdownUsuario] = useState(false);
  const [mostrarDropdownAccion, setMostrarDropdownAccion] = useState(false);

  const [allUniqueUsers, setAllUniqueUsers] = useState([]);
  const [allUniqueActions, setAllUniqueActions] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingActions, setIsLoadingActions] = useState(false);

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [deleteModalError, setDeleteModalError] = useState("");

  const BASE_CONFIRMATION_PHRASE = `Yo confirmo que quiero eliminar`;
  const getFullConfirmationPhrase = (count) => {
    const s = count === 1 ? "" : "s";
    return `${BASE_CONFIRMATION_PHRASE} registro${s} seleccionado${s}`;
  };

  const inputRefs = useRef(new Array(4));

  const handlePinInputChange = (e, index) => {
    const digit = e.target.value;

    if (!/^\d?$/.test(digit)) {
      return;
    }

    const newPinArray = [...pinInput.padEnd(4, " ").split("")];
    newPinArray[index] = digit;

    const newPinString = newPinArray
      .join("")
      .replace(/\s/g, "")
      .substring(0, 4);
    setPinInput(newPinString);

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!pinInput[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (
      e.key.length === 1 &&
      !/^\d$/.test(e.key) &&
      !["Tab", "Enter", "Shift", "Control", "Alt", "Meta"].includes(e.key)
    ) {
      e.preventDefault();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pastedData) {
      const newPin = pastedData.substring(0, 4);
      setPinInput(newPin);

      const focusIndex = Math.min(newPin.length, 3);
      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex]?.focus();
      } else if (inputRefs.current[3]) {
        inputRefs.current[3]?.focus();
      }
    }
  };

  useEffect(() => {
    const fetchUniqueUsers = async () => {
      if (!authToken || currentUser?.role !== "admin") return;
      setIsLoadingUsers(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/admin/audit-log-options/users`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        if (!response.ok)
          throw new Error("Error al cargar la lista de usuarios");
        const data = await response.json();
        setAllUniqueUsers(Array.isArray(data) ? data.sort() : []);
      } catch (err) {
        console.error("Error fetching unique users:", err.message);
        setAllUniqueUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUniqueUsers();
  }, [authToken, currentUser]);

  useEffect(() => {
    const fetchUniqueActions = async () => {
      if (!authToken || currentUser?.role !== "admin") return;
      setIsLoadingActions(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/admin/audit-log-options/actions`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        if (!response.ok)
          throw new Error("Error al cargar la lista de acciones");
        const data = await response.json();
        setAllUniqueActions(Array.isArray(data) ? data.sort() : []);
      } catch (err) {
        console.error("Error fetching unique actions:", err.message);
        setAllUniqueActions([]);
      } finally {
        setIsLoadingActions(false);
      }
    };
    fetchUniqueActions();
  }, [authToken, currentUser]);

  const fetchAuditLogs = useCallback(
    async (page, startDate, endDate, usuario, accion) => {
      if (!authToken || currentUser?.role !== "admin") {
        setError("Acceso denegado o no autenticado.");
        setIsLoading(false);
        setLogs([]);
        setTotalLogs(0);
        return;
      }
      setIsLoading(true);
      setError("");
      setSuccessMessage("");
      const skip = page * ITEMS_PER_PAGE;

      let fetchUrl = `${API_BASE_URL}/api/admin/audit-logs?skip=${skip}&limit=${ITEMS_PER_PAGE}`;
      if (startDate) {
        fetchUrl += `&start_date=${startDate.toISOString().split("T")[0]}`;
      }
      if (endDate) {
        fetchUrl += `&end_date=${endDate.toISOString().split("T")[0]}`;
      }
      if (usuario) fetchUrl += `&username=${encodeURIComponent(usuario)}`;
      if (accion) fetchUrl += `&action_type=${encodeURIComponent(accion)}`;

      try {
        const response = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!response.ok) {
          let errorDetail = `Error ${response.status}`;
          try {
            const errorData = await response.json();
            errorDetail =
              errorData.detail ||
              JSON.stringify(errorData) ||
              `Error ${response.status}`;
          } catch (e) {
            const textError = await response
              .text()
              .catch(() => "No se pudo leer el cuerpo del error.");
            errorDetail =
              textError || `Error ${response.status} al cargar los logs.`;
          }
          throw new Error(errorDetail);
        }

        const data = await response.json();

        let receivedLogs = [];
        let receivedTotalCount = 0;

        if (
          data &&
          typeof data === "object" &&
          data.audit_logs !== undefined &&
          data.total_count !== undefined
        ) {
          receivedLogs = data.audit_logs || [];
          receivedTotalCount = data.total_count || 0;
        } else if (Array.isArray(data)) {
          console.warn(
            "AuditLogView: Backend devolvió un array directamente. Total_count puede ser incorrecto."
          );
          receivedLogs = data;
          receivedTotalCount = data.length;
        }
        setLogs(receivedLogs);
        setTotalLogs(receivedTotalCount);
      } catch (err) {
        setError(
          err.message || "Ocurrió un error al cargar los logs de auditoría."
        );
        setLogs([]);
        setTotalLogs(0);
      } finally {
        setIsLoading(false);
      }
    },
    [authToken, currentUser]
  );

  useEffect(() => {
    if (currentUser?.role === "admin" && authToken) {
      fetchAuditLogs(
        currentPage,
        filterStartDate,
        filterEndDate,
        filtroUsuario,
        filtroAccion
      );
    } else if (authToken && currentUser && currentUser.role !== "admin") {
      setError("Acceso denegado.");
      setLogs([]);
      setTotalLogs(0);
    } else if (!authToken) {
      setError("No autenticado.");
      setLogs([]);
      setTotalLogs(0);
    }
  }, [
    fetchAuditLogs,
    currentPage,
    filterStartDate,
    filterEndDate,
    filtroUsuario,
    filtroAccion,
    currentUser,
    authToken,
  ]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch (e) {
      return dateString;
    }
  };

  const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);

  const handlePageChange = (newPage) => {
    setSelectedLogs(new Set());
    setCurrentPage(newPage);
  };
  const handlePreviousPage = () =>
    handlePageChange(Math.max(0, currentPage - 1));
  const handleNextPage = () =>
    handlePageChange(Math.min(totalPages - 1, currentPage + 1));

  const formatDetailsForTooltip = (actionType, detailsString) => {
    if (!detailsString) return "Sin detalles específicos.";
    if (actionType === "UPDATE_DOCTOR" || actionType === "UPDATE_USER") {
      try {
        detailsString = detailsString.replace(
          /^Se actualizo Doctor:\s*[^:]+:\s*/i,
          ""
        );
        const changedFields = JSON.parse(detailsString);
        if (Array.isArray(changedFields) && changedFields.length > 0) {
          let htmlOutput = `<strong style="${Object.entries(
            styles.tooltipFieldHeader
          )
            .map(
              ([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`
            )
            .join(";")}">Campos Actualizados:</strong>`;
          htmlOutput += `<ul style="${Object.entries(styles.tooltipList)
            .map(
              ([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`
            )
            .join(";")}">`;
          changedFields.forEach((field) => {
            const legibleFieldName = field
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            htmlOutput += `<li style="${Object.entries(styles.tooltipListItem)
              .map(
                ([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`
              )
              .join(";")}">${legibleFieldName}</li>`;
          });
          htmlOutput += "</ul>";
          return htmlOutput;
        } else if (Array.isArray(changedFields) && changedFields.length === 0) {
          return "Actualización procesada, sin cambios de valor detectados.";
        }
      } catch (e) {}
    }
    try {
      const parsed = JSON.parse(detailsString);
      return `<pre style="${Object.entries(styles.preformattedText)
        .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`)
        .join(";")}">${JSON.stringify(parsed, null, 2)}</pre>`;
    } catch (e) {
      return `<pre style="${Object.entries(styles.preformattedText)
        .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}:${v}`)
        .join(";")}">${detailsString
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>`;
    }
  };

  const handleSelectLog = (logId) => {
    setSelectedLogs((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(logId)) newSelected.delete(logId);
      else newSelected.add(logId);
      return newSelected;
    });
  };

  const handleSelectAllLogsOnPage = (event) => {
    const isChecked = event.target.checked;
    if (isChecked) setSelectedLogs(new Set(logs.map((log) => log.id)));
    else setSelectedLogs(new Set());
  };

  const isAllSelectedOnPage =
    logs.length > 0 &&
    selectedLogs.size === logs.length &&
    logs.every((log) => selectedLogs.has(log.id));

  const handleDateChange = (setterFunction, date) => {
    setterFunction(date);
    setCurrentPage(0);
  };

  const handleClearDateFilters = () => {
    setFilterStartDate(null);
    setFilterEndDate(null);
    setCurrentPage(0);
  };
  const handleSetFiltroUsuario = (usuario) => {
    setFiltroUsuario(usuario);
    setCurrentPage(0);
    setMostrarDropdownUsuario(false);
  };

  const handleSetFiltroAccion = (accion) => {
    setFiltroAccion(accion);
    setCurrentPage(0);
    setMostrarDropdownAccion(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedLogs.size === 0) {
      alert("Por favor, seleccione al menos un registro para eliminar.");
      return;
    }
    setConfirmationText("");
    setPinInput("");
    setDeleteModalError("");
    setIsConfirmDeleteModalOpen(true);
  };

  const proceedWithActualDeletion = async () => {
    const expectedPhrase = getFullConfirmationPhrase(selectedLogs.size);
    if (confirmationText.trim() !== expectedPhrase) {
      setDeleteModalError(
        `Texto de confirmación incorrecto. Por favor, escribe exactamente: "${expectedPhrase}"`
      );
      return;
    }

    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setDeleteModalError("El PIN debe ser de 4 dígitos numéricos.");
      return;
    }

    setDeleteModalError("");
    setIsLoading(true);

    const idsToDelete = Array.from(selectedLogs);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/audit-logs/bulk-delete`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: idsToDelete, pin: pinInput }),
        }
      );

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          errorData = { detail: `Error ${response.status}: ${response.statusText || "Respuesta no JSON."}` };
        }

        let displayErrorMessage = `Error ${response.status}.`;
        if (errorData && errorData.detail) {
            if (typeof errorData.detail === 'string') {
                displayErrorMessage = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
                const messages = errorData.detail.map(err => {
                    const loc = Array.isArray(err.loc) ? err.loc.join('.') : '';
                    return err.msg ? `${loc}: ${err.msg}` : `Error en ${loc}`;
                }).join('; ');
                displayErrorMessage = `Datos inválidos: ${messages}`;
            } else {
                displayErrorMessage = `Error ${response.status}: ${JSON.stringify(errorData.detail)}`;
            }
        }

        if (
          response.status === 403 &&
          displayErrorMessage.toLowerCase().includes("pin")
        ) {
          setDeleteModalError(displayErrorMessage);
        } else {
          setError(displayErrorMessage);
          setIsConfirmDeleteModalOpen(false);
        }
        // Eliminado: throw new Error(...)
        return; // ¡Importante: salir aquí si hay un error de la API!
      }

      setSuccessMessage(
        `${idsToDelete.length} registro(s) de auditoría eliminados exitosamente.`
      );
      setSelectedLogs(new Set());
      setIsConfirmDeleteModalOpen(false); // Cerrar modal solo en caso de éxito
      fetchAuditLogs(
        0,
        filterStartDate,
        filterEndDate,
        filtroUsuario,
        filtroAccion
      );
    } catch (err) {
      console.error("Error deleting audit logs with confirmation:", err);
      if (isConfirmDeleteModalOpen && !deleteModalError) {
        setDeleteModalError(err.message || "Error de conexión o del servidor.");
      } else if (!isConfirmDeleteModalOpen) {
        setError(err.message || "Ocurrió un error al eliminar los logs.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  if (!currentUser && !isLoading && !error)
    return <div style={styles.message}>Verificando autenticación...</div>;
  if (!authToken && !isLoading)
    return (
      <div style={styles.error}>
        {error || "No autenticado. Por favor, inicie sesión."}
      </div>
    );
  if (authToken && currentUser?.role !== "admin" && !isLoading)
    return <div style={styles.error}>{error || "Acceso denegado."}</div>;
  if (isLoading && logs.length === 0)
    return <div style={styles.message}>Cargando logs de auditoría...</div>;

  const numberOfColumns = 7;

  return (
    <div style={styles.container}>
      <h1>Auditoría del sistema</h1>

      <div style={styles.controlsContainer}>
        <div style={styles.filterSection}>
          <label style={styles.datePickerLabel}>Desde:</label>
          <DatePicker
            selected={filterStartDate}
            onChange={(date) => handleDateChange(setFilterStartDate, date)}
            selectsStart
            startDate={filterStartDate}
            endDate={filterEndDate}
            dateFormat="dd/MM/yyyy"
            placeholderText="Fecha inicio"
            customInput={<input style={styles.datePickerInput} />}
            isClearable
            wrapperClassName="date-picker-wrapper"
          />
          <label style={styles.datePickerLabel}>Hasta:</label>
          <DatePicker
            selected={filterEndDate}
            onChange={(date) => handleDateChange(setFilterEndDate, date)}
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
          {(filterStartDate || filterEndDate) && (
            <button
              onClick={handleClearDateFilters}
              style={{
                ...styles.button,
                ...styles.buttonSmall,
                backgroundColor: "#6c757d",
              }}
              disabled={isLoading}
            >
              Limpiar Fechas
            </button>
          )}
        </div>

        <div style={styles.actionsHeader}>
          {logs.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={selectedLogs.size === 0 || isLoading}
              style={{
                ...styles.button,
                ...styles.deleteButton,
                ...(selectedLogs.size === 0 && styles.buttonDisabled),
              }}
              title="Eliminar logs seleccionados (¡Precaución!)"
            >
              Eliminar Seleccionados
            </button>
          )}
        </div>
      </div>
      {successMessage && (
        <div style={styles.successMessage}>{successMessage}</div>
      )}
      {error &&
        !(
          error.includes("No autenticado") || error.includes("Acceso denegado")
        ) && (
          <div style={styles.error} role="alert">
            {error}
          </div>
        )}
      {!(
        error &&
        (error.includes("No autenticado") || error.includes("Acceso denegado"))
      ) && (
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
              <th style={styles.th}>
                Usuario
                <button
                  onClick={() =>
                    setMostrarDropdownUsuario(!mostrarDropdownUsuario)
                  }
                  style={{
                    marginLeft: "5px",
                    background: "none",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                  }}
                  disabled={
                    isLoadingUsers || allUniqueUsers.length === 0 || isLoading
                  }
                  aria-expanded={mostrarDropdownUsuario}
                  aria-haspopup="listbox"
                >
                  ▼
                </button>
                {mostrarDropdownUsuario && (
                  <div className="dropdown-menu" style={styles.dropdownMenu}>
                    <div
                      style={styles.dropdownItem}
                      onClick={() => handleSetFiltroUsuario(null)}
                      role="option"
                    >
                      Todos los usuarios {isLoadingUsers && "(cargando...)"}
                    </div>
                    {allUniqueUsers.map((usuario) => (
                      <div
                        style={styles.dropdownItem}
                        key={usuario}
                        onClick={() => handleSetFiltroUsuario(usuario)}
                        role="option"
                      >
                        {usuario}
                      </div>
                    ))}
                    {allUniqueUsers.length === 0 && !isLoadingUsers && (
                      <div
                        style={{ ...styles.dropdownItem, cursor: "default" }}
                      >
                        No hay usuarios para filtrar.
                      </div>
                    )}
                  </div>
                )}
              </th>
              <th style={styles.th}>
                Acción
                <button
                  onClick={() =>
                    setMostrarDropdownAccion(!mostrarDropdownAccion)
                  }
                  style={{
                    marginLeft: "5px",
                    background: "none",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                  }}
                  disabled={
                    isLoadingActions ||
                    allUniqueActions.length === 0 ||
                    isLoading
                  }
                  aria-expanded={mostrarDropdownAccion}
                  aria-haspopup="listbox"
                >
                  ▼
                </button>
                {mostrarDropdownAccion && (
                  <div className="dropdown-menu" style={styles.dropdownMenu}>
                    <div
                      style={styles.dropdownItem}
                      onClick={() => handleSetFiltroAccion(null)}
                      role="option"
                    >
                      Todas las acciones {isLoadingActions && "(cargando...)"}
                    </div>
                    {allUniqueActions.map((accion) => (
                      <div
                        style={styles.dropdownItem}
                        key={accion}
                        onClick={() => handleSetFiltroAccion(accion)}
                        role="option"
                      >
                        {accion}
                      </div>
                    ))}
                    {allUniqueActions.length === 0 && !isLoadingActions && (
                      <div
                        style={{ ...styles.dropdownItem, cursor: "default" }}
                      >
                        No hay acciones para filtrar.
                      </div>
                    )}
                  </div>
                )}
              </th>
              <th style={styles.th}>ID Entidad</th>
              <th style={styles.th}>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              logs.length === 0 && (
                <tr>
                  <td colSpan={numberOfColumns} style={styles.message}>
                    Cargando logs de auditoría...
                  </td>
                </tr>
              )}
            {!isLoading &&
              logs.length > 0 &&
              logs.map((log, index) => (
                <tr
                  key={log.id || index}
                  style={index % 2 === 0 ? {} : styles.trEven}
                >
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
                  <td style={styles.td}>{log.target_id ?? "N/A"}</td>
                  <td
                    style={{ ...styles.td, ...styles.detailsCell }}
                    data-tooltip-id={`tooltip-details-${log.id || index}`}
                    data-tooltip-html={formatDetailsForTooltip(
                      log.action_type,
                      log.details
                    )}
                    data-tooltip-place="top-start"
                  >
                    {log.action_type === "Actualizar Doctor" ||
                    log.action_type === "Actualizar Usuario"
                      ? "Ver campos actualizados"
                      : log.details && log.details.length > 21
                      ? `${log.details.substring(0, 21)}...`
                      : log.details || "Sin detalles"}
                  </td>
                </tr>
              ))}
            {!isLoading && logs.length === 0 && !error && (
              <tr>
                <td colSpan={numberOfColumns} style={styles.message}>
                  No hay registros de auditoría disponibles para los filtros
                  aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {!isLoading && logs.length > 0 && (
        <>
          {logs.map((log, index) => (
            <ReactTooltip
              key={`tooltip-content-${log.id || index}`}
              id={`tooltip-details-${log.id || index}`}
              style={styles.tooltipContentContainer}
            />
          ))}
          {totalPages > 1 && (
            <div style={styles.paginationControls}>
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 0 || isLoading}
                style={{
                  ...styles.button,
                  ...((currentPage === 0 || isLoading) &&
                    styles.buttonDisabled),
                }}
              >
                Anterior
              </button>
              <span>
                Página {currentPage + 1} de {totalPages} (Total Registros:{" "}
                {totalLogs})
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1 || isLoading}
                style={{
                  ...styles.button,
                  ...((currentPage >= totalPages - 1 || isLoading) &&
                    styles.buttonDisabled),
                }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {isConfirmDeleteModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "25px",
              borderRadius: "8px",
              boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
              width: "90%",
              maxWidth: "500px",
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                proceedWithActualDeletion();
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "15px",
                  textAlign: "center",
                }}
              >
                Confirmar Eliminación Permanente
              </h3>
              <p>
                Esta acción es irreversible y eliminará{" "}
                <strong>{selectedLogs.size}</strong> registro(s) de auditoría.
              </p>
              <p>
                Para confirmar, por favor escribe la siguiente frase exactamente
                en el campo de abajo:
              </p>
              <p>
                <strong>
                  "{getFullConfirmationPhrase(selectedLogs.size)}"
                </strong>
              </p>

              <textarea
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Escribe la frase aquí..."
                rows={3}
                style={styles.confirmationTextarea}
              />

              <p style={{ marginTop: "20px" }}>
                Ingresa el PIN de Super Administrador (4 dígitos):
              </p>
              <div style={styles.pinContainer} onPaste={handlePinPaste}>
                {" "}
                {Array.from({ length: 4 }).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    style={styles.pinBox}
                    value={pinInput[i] || ""}
                    onChange={(e) => handlePinInputChange(e, i)}
                    onKeyDown={(e) => handlePinKeyDown(e, i)}
                    onFocus={(e) => e.target.select()}
                    aria-label={`Dígito ${i + 1} del PIN`}
                  />
                ))}
              </div>

              {deleteModalError && (
                <p
                  style={{
                    color: "red",
                    textAlign: "center",
                    marginBottom: "15px",
                  }}
                >
                  {deleteModalError}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "20px",
                }}
              >
                <button
                  onClick={() => setIsConfirmDeleteModalOpen(false)}
                  style={{ ...styles.button, backgroundColor: "#6c757d" }}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit" // Correcto: Este botón enviará el formulario
                  style={{ ...styles.button, ...styles.deleteButton }}
                  disabled={isLoading}
                >
                  {isLoading ? "Eliminando..." : "Confirmar Eliminación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogView;
