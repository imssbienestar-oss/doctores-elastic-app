import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
const styles = {
  container: {
    padding: "20px",
    margin: "20px auto",
    maxWidth: "1000px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  headerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    borderBottom: "1px solid #eee",
    paddingBottom: "10px",
  },
  backButton: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
  },
  title: {
    textAlign: "center",
    color: "#333",
    marginBottom: "25px",
    fontSize: "40px",
    borderBottom: "1px solid #eee",
    paddingBottom: "10px",
  },
  actionsHeader: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "15px",
    gap: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  th: {
    backgroundColor: "#006657",
    color: "white",
    padding: "12px 15px",
    textAlign: "center",
    borderBottom: "1px solid #ddd",
    fontSize: "0.9em",
    textTransform: "uppercase",
  },
  td: {
    padding: "10px 15px",
    borderBottom: "1px solid #eee",
    color: "#555",
    fontSize: "0.95em",
    verticalAlign: "middle",
  },
  checkboxCell: { textAlign: "center", width: "40px" },
  trEven: { backgroundColor: "#f2f2f2" },
  message: {
    textAlign: "center",
    padding: "20px",
    fontSize: "1.1em",
    color: "#777",
  },
  error: {
    textAlign: "center",
    padding: "20px",
    fontSize: "1.1em",
    color: "red",
    border: "1px solid red",
    backgroundColor: "#ffe0e0",
    borderRadius: "4px",
  },
  successMessage: {
    textAlign: "center",
    padding: "10px",
    margin: "10px 0",
    color: "green",
    backgroundColor: "#e6ffed",
    border: "1px solid green",
    borderRadius: "4px",
  },
  paginationControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
  },
  button: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
    opacity: 0.7,
  },
  restoreButton: { backgroundColor: "#006657" },
  deleteButton: { backgroundColor: "#691c32" },
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

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const ITEMS_PER_PAGE = 15;

function DeletedDoctorsView({ onDoctorRestored }) {
  const { token: authToken, currentUser } = useAuth();
  const [deletedDoctors, setDeletedDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false); // Lo usas para el texto del botón, asegúrate de setearlo
  const navigate = useNavigate();
  const [
    isConfirmPermanentDeleteModalOpen,
    setIsConfirmPermanentDeleteModalOpen,
  ] = useState(false);
  const [permanentDeleteConfirmationText, setPermanentDeleteConfirmationText] =
    useState("");
  const [permanentDeletePinInput, setPermanentDeletePinInput] = useState("");
  const [permanentDeleteModalError, setPermanentDeleteModalError] =
    useState("");
  const modalErrorTimerId = useRef(null); // Para guardar el ID del timer

  const permanentDeletePinInputRefs = useRef(new Array(4));

  const BASE_PERMANENT_DELETE_PHRASE =
    "Yo confirmo que quiero eliminar permanentemente";
  const getFullPermanentDeletePhrase = (count) => {
    const s_el = count === 1 ? "el" : "los";
    const s_doctor = count === 1 ? "doctor" : "doctores";
    const s_seleccionado = count === 1 ? "seleccionado" : "seleccionados";
    return `${BASE_PERMANENT_DELETE_PHRASE} ${s_el} ${s_doctor} ${s_seleccionado}`;
  };

  // !!! NECESITAS DEFINIR ESTAS FUNCIONES AQUÍ !!!
  // Copia y adapta las definiciones de mi respuesta anterior, asegurándote
  // de que usan 'permanentDeletePinInput', 'setPermanentDeletePinInput',
  // y 'permanentDeletePinInputRefs'.

  const handlePinInputChange = (e, index) => {
    const digit = e.target.value;
    if (!/^\d?$/.test(digit)) return;
    const newPinArray = [...permanentDeletePinInput.padEnd(4, " ").split("")];
    newPinArray[index] = digit;
    const newPinString = newPinArray
      .join("")
      .replace(/\s/g, "")
      .substring(0, 4);
    setPermanentDeletePinInput(newPinString);
    if (digit && index < 3) {
      permanentDeletePinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!permanentDeletePinInput[index] && index > 0) {
        permanentDeletePinInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      permanentDeletePinInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      permanentDeletePinInputRefs.current[index + 1]?.focus();
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
      setPermanentDeletePinInput(newPin);
      const focusIndex = Math.min(newPin.length, 3);
      if (inputRefs.current[focusIndex]) {
        // DEBERÍA SER permanentDeletePinInputRefs
        permanentDeletePinInputRefs.current[focusIndex]?.focus();
      } else if (permanentDeletePinInputRefs.current[3]) {
        permanentDeletePinInputRefs.current[3]?.focus();
      }
    }
  };

  const fetchDeletedDoctors = useCallback(
    /* ... (tu función sin cambios) ... */
    async (page) => {
      if (!authToken || currentUser?.role !== "admin") {
        setError("Acceso denegado o no autenticado.");
        setIsLoading(false);
        setDeletedDoctors([]);
        setTotalDoctors(0);
        return;
      }
      setIsLoading(true);
      setError("");
      setSuccessMessage("");
      const skip = page * ITEMS_PER_PAGE;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/admin/doctores/eliminados?skip=${skip}&limit=${ITEMS_PER_PAGE}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: "Error al cargar doctores eliminados." }));
          throw new Error(errorData.detail || `Error ${response.status}`);
        }
        const data = await response.json();
        setDeletedDoctors(data.doctores || data || []);
        setTotalDoctors(
          data.total_count || (Array.isArray(data) ? data.length : 0)
        );
      } catch (err) {
        console.error("Error fetching deleted doctors:", err);
        setError(
          err.message || "Ocurrió un error al cargar los doctores eliminados."
        );
        setDeletedDoctors([]);
        setTotalDoctors(0);
      } finally {
        setIsLoading(false);
      }
    },
    [authToken, currentUser]
  );

  const proceedWithPermanentDoctorDeletion = async () => {
    // Usar isDeleting para el estado de carga específico de esta acción
    // const count = selectedDoctorIds.length; // selectedDoctorIds es array
    // (Ya está en el código que me pasaste, lo mantengo igual, pero revisa selectedDoctorIds.size vs .length)
    const count = Array.isArray(selectedDoctorIds)
      ? selectedDoctorIds.length
      : selectedDoctorIds.size;

    const expectedPhrase = getFullPermanentDeletePhrase(count);

    if (permanentDeleteConfirmationText.trim() !== expectedPhrase) {
      setPermanentDeleteModalError(`Texto incorrecto. Escribe: "${expectedPhrase}"`);
    return; // SE DETIENE AQUÍ si la frase es incorrecta
  
    }
    if (
      permanentDeletePinInput.length !== 4 || !/^\d{4}$/.test(permanentDeletePinInput)) {
      setPermanentDeleteModalError("El PIN debe ser de 4 dígitos numéricos.");
      return;
    }

    setPermanentDeleteModalError("");
    setIsDeleting(true); // Usar isDeleting para este proceso

    const idsToDelete = Array.from(selectedDoctorIds); // Funciona para Array y Set

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/doctores/permanent-delete-bulk`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ids: idsToDelete,
            pin: permanentDeletePinInput,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `Error ${response.status}. Intenta de nuevo.`,
        }));
        if (
          response.status === 403 &&
          errorData.detail &&
          errorData.detail.toLowerCase().includes("pin")
        ) {
          setPermanentDeleteModalError(errorData.detail);
        } else {
          setError(errorData.detail || `Error ${response.status}`);
          setIsConfirmPermanentDeleteModalOpen(false);
        }
        setIsDeleting(false); // Asegúrate de resetear isDeleting aquí
        return;
      }
      setSuccessMessage(`${count} doctor(es) eliminado(s) permanentemente.`);
      setIsConfirmPermanentDeleteModalOpen(false);
      fetchDeletedDoctors(0); // Recargar a la primera página
      setCurrentPage(0); // Resetear la página actual a 0
      setSelectedDoctorIds([]); // Limpiar selección (si es array)
    } catch (err) {
      console.error("Error en eliminación permanente de doctores:", err);
      if (isConfirmPermanentDeleteModalOpen && !permanentDeleteModalError) {
        // Error de red o similar ANTES de obtener respuesta
        setPermanentDeleteModalError(
          err.message || "Error de conexión o del servidor."
        );
      } else if (!isConfirmPermanentDeleteModalOpen) {
        // Si el modal ya se cerró
        setError(err.message || "Ocurrió un error al procesar la solicitud.");
      }
    } finally {
      setIsDeleting(false); // Siempre resetea isDeleting
    }
  };
  useEffect(() => {
    // Si hay un mensaje de error en el modal
    if (permanentDeleteModalError) {
      // Si ya había un timer, lo limpiamos para resetearlo
      if (modalErrorTimerId.current) {
        clearTimeout(modalErrorTimerId.current);
      }
      // Creamos un nuevo timer para borrar el mensaje después de X segundos
      modalErrorTimerId.current = setTimeout(() => {
        setPermanentDeleteModalError(""); // Borra el mensaje
        modalErrorTimerId.current = null; // Resetea el ID del timer
      }, 5000); // 5000 milisegundos = 5 segundos. Ajusta este tiempo como prefieras.
    }

    // Función de limpieza: si el componente se desmonta o el error cambia
    // antes de que se cumpla el timer, limpiamos el timer pendiente.
    return () => {
      if (modalErrorTimerId.current) {
        clearTimeout(modalErrorTimerId.current);
      }
    };
  }, [permanentDeleteModalError]);
  useEffect(() => {
    /* ... fetchDeletedDoctors ... */
    if (currentUser?.role === "admin" && authToken) {
      fetchDeletedDoctors(currentPage);
    } else if (authToken && currentUser) {
      // No es necesario currentUser?.role !== "admin"
      setError("Acceso denegado.");
    } else if (!authToken) {
      setError("No autenticado.");
    }
  }, [fetchDeletedDoctors, currentPage, currentUser, authToken]);

  // La función handlePermanentDelete es para eliminar un SOLO doctor, no la usamos con el modal de bulk.
  // Si quieres mantenerla para otra parte de la UI, está bien, pero el modal usa handleDeleteSelected.
  // const handlePermanentDelete = async (doctorId) => { ... };

  const handleDeleteSelected = async () => {
    const count = Array.isArray(selectedDoctorIds)
      ? selectedDoctorIds.length
      : selectedDoctorIds.size; // Sé consistente

    if (count === 0) {
      // Un solo check es suficiente
      alert(
        "Por favor, seleccione al menos un doctor para eliminar permanentemente."
      );
      return;
    }
    setPermanentDeleteConfirmationText("");
    setPermanentDeletePinInput("");
    setPermanentDeleteModalError("");
    setIsConfirmPermanentDeleteModalOpen(true);
  };

  // ... (tus otras funciones: toggleSelect, handleSelectAllOnPage, isAllSelectedOnPage, formatDate, handleRestoreSelected, etc. sin cambios)
  const toggleSelect = (id) => {
    setSelectedDoctorIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const handleSelectAllOnPage = (event) => {
    if (event.target.checked) {
      setSelectedDoctorIds(deletedDoctors.map((d) => d.id));
    } else {
      setSelectedDoctorIds([]);
    }
  };
  const isAllSelectedOnPage =
    deletedDoctors.length > 0 &&
    selectedDoctorIds.length === deletedDoctors.length &&
    deletedDoctors.every((d) => selectedDoctorIds.includes(d.id));
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return dateString;
    }
  };
  const handleRestoreSelected = async () => {
    /* ... tu lógica ... */
  };
  const totalPages = Math.ceil(totalDoctors / ITEMS_PER_PAGE);
  const handlePageChange = (newPage) => {
    setSelectedDoctorIds([]);
    setCurrentPage(newPage);
  };
  const handlePreviousPage = () =>
    handlePageChange(Math.max(0, currentPage - 1));
  const handleNextPage = () =>
    handlePageChange(Math.min(totalPages - 1, currentPage + 1));
  const handleGoBack = () => navigate("/");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSuccessMessage("");
      setError("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [successMessage, error]);

  // Lógica de renderizado condicional inicial (sin cambios)
  if (!currentUser && isLoading)
    return <div style={styles.message}>Verificando autenticación...</div>;
  // ...

  return (
    <div style={styles.container}>
      {/* ... (header, mensajes de error/éxito, botones de acción Restaurar/Eliminar) ... */}
      <div style={styles.headerContainer}>
        {" "}
        <h1 style={styles.title}>Doctores Eliminados</h1>{" "}
        <button onClick={handleGoBack} style={styles.backButton}>
          {" "}
          &larr; Volver a Tabla Principal{" "}
        </button>{" "}
      </div>
      {successMessage && (
        <div style={styles.successMessage}>{successMessage}</div>
      )}
      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}
      {deletedDoctors.length > 0 && (
        <div style={styles.actionsHeader}>
          {" "}
          <button
            onClick={handleRestoreSelected}
            disabled={selectedDoctorIds.length === 0 || isLoading}
            style={{
              ...styles.button,
              ...styles.restoreButton,
              ...(selectedDoctorIds.length === 0 && styles.buttonDisabled),
            }}
          >
            {" "}
            Restaurar Seleccionados ({selectedDoctorIds.length}){" "}
          </button>{" "}
          <button
            onClick={handleDeleteSelected}
            disabled={selectedDoctorIds.length === 0 || isDeleting}
            style={{
              ...styles.button,
              ...styles.deleteButton,
              ...(selectedDoctorIds.length === 0 && styles.buttonDisabled),
            }}
          >
            {" "}
            {isDeleting
              ? "Eliminando..."
              : `Eliminar Permanentemente (${selectedDoctorIds.length})`}{" "}
          </button>{" "}
        </div>
      )}
      {deletedDoctors.length === 0 && !isLoading && !error && (
        <p style={styles.message}>No hay doctores eliminados para mostrar.</p>
      )}
      {deletedDoctors.length > 0 && (
        <>
       
          <table style={styles.table}>
       
            <thead>
       
              <tr>
         
                <th style={{ ...styles.th, ...styles.checkboxCell }}>
            
                  <input
                    type="checkbox"
                    checked={isAllSelectedOnPage}
                    onChange={handleSelectAllOnPage}
                    disabled={deletedDoctors.length === 0 || isLoading}
                  />
                </th>
                <th style={styles.th}>ID</th>{" "}
                <th style={styles.th}>Nombre Completo</th>{" "}
                <th style={styles.th}>CURP</th>{" "}
                <th style={styles.th}>Fecha Eliminación</th>{" "}
                <th style={styles.th}>Eliminado Por</th>{" "}
              </tr>
            </thead>
            <tbody>
           
              {deletedDoctors.map((doctor, index) => (
                <tr
                  key={doctor.id}
                  style={index % 2 === 0 ? {} : styles.trEven}
                >
              
                  <td style={{ ...styles.td, ...styles.checkboxCell }}>
                  
                    <input
                      type="checkbox"
                      checked={selectedDoctorIds.includes(doctor.id)}
                      onChange={() => toggleSelect(doctor.id)}
                    />
                  </td>
                  <td style={styles.td}>{doctor.id}</td>{" "}
                  <td style={styles.td}>{doctor.nombre_completo || "N/A"}</td>{" "}
                  <td style={styles.td}>{doctor.curp || "N/A"}</td>{" "}
                  <td style={styles.td}>{formatDate(doctor.deleted_at)}</td>{" "}
                  <td style={styles.td}>
                
                    {doctor.deleted_by?.username ||
                      doctor.deleted_by_username ||
                      "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* ... (paginación) ... */}
          {totalPages > 1 && (
            <div style={styles.paginationControls}>
              {" "}
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
                {" "}
                Página {currentPage + 1} de {totalPages} (Total: {totalDoctors}){" "}
              </span>{" "}
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1 || isLoading}
                style={{
                  ...styles.button,
                  ...((currentPage >= totalPages - 1 || isLoading) &&
                    styles.buttonDisabled),
                }}
              >
                {" "}
                Siguiente{" "}
              </button>{" "}
            </div>
          )}{" "}
        </>
      )}

      {isConfirmPermanentDeleteModalOpen && (
        <div
          style={{
            /* overlay */ position: "fixed",
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
              /* content */ backgroundColor: "#fff",
              padding: "25px",
              borderRadius: "8px",
              boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
              width: "90%",
              maxWidth: "500px",
            }}
          >
            {/* SIN ESPACIO {" "} AQUÍ */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                proceedWithPermanentDoctorDeletion(); // <--- CORREGIDO EL NOMBRE DE LA FUNCIÓN
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
                <strong>{selectedDoctorIds.length}</strong>{" "}
                {/* CORREGIDO a .length */}
                {selectedDoctorIds.length === 1 ? "doctor" : "doctores"}.
              </p>
              <p>
                Para confirmar, por favor escribe la siguiente frase exactamente
                en el campo de abajo:
              </p>
              <p>
                <strong>
                  "{getFullPermanentDeletePhrase(selectedDoctorIds.length)}"{" "}
                  {/* CORREGIDO a .length */}
                </strong>
              </p>
              <textarea
                value={permanentDeleteConfirmationText}
                onChange={(e) =>
                  setPermanentDeleteConfirmationText(e.target.value)
                }
                placeholder="Escribe la frase aquí..."
                rows={3}
                style={styles.confirmationTextarea} // Usa tu estilo
                required
              />
              <p style={{ marginTop: "20px" }}>
                Ingresa el PIN de Super Administrador (4 dígitos):
              </p>
              <div
                style={styles.pinContainer}
                onPaste={
                  handlePinPaste /* Asegúrate que esta función esté definida y use los estados/refs correctos */
                }
              >
                {/* SIN ESPACIO {" "} AQUÍ */}
                {Array.from({ length: 4 }).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => (permanentDeletePinInputRefs.current[i] = el)} // CORREGIDO a permanentDeletePinInputRefs
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    style={styles.pinBox}
                    value={permanentDeletePinInput[i] || ""}
                    onChange={(e) => handlePinInputChange(e, i)} // ASEGÚRATE QUE ESTA FUNCIÓN ESTÉ DEFINIDA
                    onKeyDown={(e) => handlePinKeyDown(e, i)} // ASEGÚRATE QUE ESTA FUNCIÓN ESTÉ DEFINIDA
                    onFocus={(e) => e.target.select()}
                    aria-label={`Dígito ${i + 1} del PIN`}
                    required
                  />
                ))}
              </div>
              {permanentDeleteModalError && (
                <p
                  style={{
                    color: "red",
                    textAlign: "center",
                    marginBottom: "15px",
                  }}
                >
                  {permanentDeleteModalError}
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
                  type="button" // CORRECTO
                  onClick={() => setIsConfirmPermanentDeleteModalOpen(false)}
                  style={{ ...styles.button, backgroundColor: "#6c757d" }}
                  disabled={isDeleting} // Usar isDeleting aquí
                >
                  Cancelar
                </button>
                <button
                  type="submit" // CORRECTO
                  style={{ ...styles.button, ...styles.deleteButton }}
                  disabled={
                    isDeleting || // Usar isDeleting aquí
                    permanentDeleteConfirmationText.trim() !==
                      getFullPermanentDeletePhrase(selectedDoctorIds.length) ||
                    permanentDeletePinInput.length !== 4
                  }
                >
                  {isDeleting ? "Eliminando..." : "Confirmar Eliminación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeletedDoctorsView;
