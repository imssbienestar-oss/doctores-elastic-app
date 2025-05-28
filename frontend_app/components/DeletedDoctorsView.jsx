import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const styles = {
  // ... (Tus estilos existentes)
  container: { padding: "20px", margin: "20px auto", maxWidth: "1000px", backgroundColor: "#f9f9f9", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", },
  headerContainer: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", borderBottom: "1px solid #eee", paddingBottom: "10px", },
  backButton: { padding: "8px 15px", fontSize: "0.9em", cursor: "pointer", backgroundColor: "#6c757d", color: "white", border: "none", borderRadius: "4px", },
  title: { textAlign: "center", color: "#333", marginBottom: "25px", fontSize: "40px", borderBottom: "1px solid #eee", paddingBottom: "10px", },
  actionsHeader: { display: "flex", justifyContent: "flex-end", marginBottom: "15px", gap: "10px", },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", },
  th: { backgroundColor: "#006657", color: "white", padding: "12px 15px", textAlign: "left", borderBottom: "1px solid #ddd", fontSize: "0.9em", textTransform: "uppercase", },
  td: { padding: "10px 15px", borderBottom: "1px solid #eee", color: "#555", fontSize: "0.95em", verticalAlign: "middle", },
  checkboxCell: { textAlign: "center", width: "40px" },
  trEven: { backgroundColor: "#f2f2f2" },
  message: { textAlign: "center", padding: "20px", fontSize: "1.1em", color: "#777", },
  error: { textAlign: "center", padding: "20px", fontSize: "1.1em", color: "red", border: "1px solid red", backgroundColor: "#ffe0e0", borderRadius: "4px", },
  successMessage: { textAlign: "center", padding: "10px", margin: "10px 0", color: "green", backgroundColor: "#e6ffed", border: "1px solid green", borderRadius: "4px", },
  paginationControls: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", },
  button: { padding: "8px 15px", fontSize: "0.9em", cursor: "pointer", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "4px", transition: "background-color 0.2s ease", },
  buttonDisabled: { backgroundColor: "#ccc", cursor: "not-allowed", opacity: 0.7, },
  restoreButton: { backgroundColor: "#006657" },
  deleteButton: { backgroundColor: "#691c32" },
  pinContainer: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px', },
  pinBox: { width: '50px', height: '60px', textAlign: 'center', fontSize: '1.8em', border: '2px solid #006657', borderRadius: '20px', outline: 'none', caretColor: 'transparent', },
  confirmationTextarea: { width: '100%', padding: '12px 15px', marginBottom: '15px', border: '1px solid #ced4da', borderRadius: '6px', boxSizing: 'border-box', resize: 'none', fontFamily: 'Arial, sans-serif', fontSize: '1em', lineHeight: '1.5', color: '#495057', backgroundColor: '#fff', outline: 'none', },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  
  const [isConfirmPermanentDeleteModalOpen, setIsConfirmPermanentDeleteModalOpen] = useState(false);
  const [permanentDeleteConfirmationText, setPermanentDeleteConfirmationText] = useState("");
  const [permanentDeletePinInput, setPermanentDeletePinInput] = useState("");
  const [permanentDeleteModalError, setPermanentDeleteModalError] = useState("");
  
  const modalErrorTimerId = useRef(null);
  const permanentDeletePinInputRefs = useRef(new Array(4));

  const BASE_PERMANENT_DELETE_PHRASE = "Yo confirmo que quiero eliminar permanentemente";
  const getFullPermanentDeletePhrase = (count) => {
    const s_el = count === 1 ? "el" : "los";
    const s_doctor = count === 1 ? "doctor" : "doctores";
    const s_seleccionado = count === 1 ? "seleccionado" : "seleccionados";
    return `${BASE_PERMANENT_DELETE_PHRASE} ${s_el} ${s_doctor} ${s_seleccionado}`;
  };

  const handlePinInputChange = (e, index) => {
    const digit = e.target.value;
    if (!/^\d?$/.test(digit)) return;
    const newPinArray = [...permanentDeletePinInput.padEnd(4, " ").split("")];
    newPinArray[index] = digit;
    const newPinString = newPinArray.join("").replace(/\s/g, "").substring(0, 4);
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
      e.key.length === 1 && !/^\d$/.test(e.key) &&
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
      // CORREGIDO: Usar permanentDeletePinInputRefs
      if (permanentDeletePinInputRefs.current[focusIndex]) { 
        permanentDeletePinInputRefs.current[focusIndex]?.focus();
      } else if (permanentDeletePinInputRefs.current[3]) {
        permanentDeletePinInputRefs.current[3]?.focus();
      }
    }
  };

  const fetchDeletedDoctors = useCallback(
    async (page) => {
        if (!authToken || currentUser?.role !== "admin") {
        setError("Acceso denegado o no autenticado.");
        setIsLoading(false); setDeletedDoctors([]); setTotalDoctors(0); return;
        }
        setIsLoading(true); setError(""); setSuccessMessage("");
        const skip = page * ITEMS_PER_PAGE;
        try {
        const response = await fetch(
            `${API_BASE_URL}/api/admin/doctores/eliminados?skip=${skip}&limit=${ITEMS_PER_PAGE}`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Error al cargar doctores eliminados." }));
            throw new Error(errorData.detail || `Error ${response.status}`);
        }
        const data = await response.json();
        setDeletedDoctors(data.doctores || data || []);
        setTotalDoctors(data.total_count || (Array.isArray(data) ? data.length : 0));
        } catch (err) {
        console.error("Error fetching deleted doctors:", err);
        setError(err.message || "Ocurrió un error al cargar los doctores eliminados.");
        setDeletedDoctors([]); setTotalDoctors(0);
        } finally { setIsLoading(false); }
    }, [authToken, currentUser]
  );

  const proceedWithPermanentDoctorDeletion = async () => {
    const count = selectedDoctorIds.length; 
    const expectedPhrase = getFullPermanentDeletePhrase(count);

    console.log("--- Intentando eliminar (Doctores) ---");
    console.log("Texto Esperado:", `"${expectedPhrase}"`);
    console.log("Texto Ingresado:", `"${permanentDeleteConfirmationText.trim()}"`);
    const isPhraseMatching = permanentDeleteConfirmationText.trim() === expectedPhrase;
    console.log("¿Frase Coincide?:", isPhraseMatching);
    console.log("PIN Ingresado:", permanentDeletePinInput);

    if (!isPhraseMatching) {
      setPermanentDeleteModalError(`Texto incorrecto. Por favor, escribe exactamente: "${expectedPhrase}"`);
      return;
    }
    if (permanentDeletePinInput.length !== 4 || !/^\d{4}$/.test(permanentDeletePinInput)) {
      setPermanentDeleteModalError("El PIN debe ser de 4 dígitos numéricos.");
      return;
    }

    setPermanentDeleteModalError("");
    setIsDeleting(true);

    const idsToDelete = Array.from(selectedDoctorIds);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/doctores/permanent-delete-bulk`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ids: idsToDelete, pin: permanentDeletePinInput }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `Error ${response.status}. Intenta de nuevo.`,
        }));
        if (response.status === 403 && errorData.detail && errorData.detail.toLowerCase().includes("pin")) {
          setPermanentDeleteModalError(errorData.detail);
        } else {
          setError(errorData.detail || `Error ${response.status}`);
          setIsConfirmPermanentDeleteModalOpen(false);
        }
        setIsDeleting(false);
        return;
      }
      setSuccessMessage(`${count} doctor(es) eliminado(s) permanentemente.`);
      setIsConfirmPermanentDeleteModalOpen(false);
      fetchDeletedDoctors(0); 
      setCurrentPage(0); 
      setSelectedDoctorIds([]);
    } catch (err) {
      console.error("Error en eliminación permanente de doctores:", err);
      if (isConfirmPermanentDeleteModalOpen && !permanentDeleteModalError) {
         setPermanentDeleteModalError(err.message || "Error de conexión o del servidor.");
      } else if (!isConfirmPermanentDeleteModalOpen) {
         setError(err.message || "Ocurrió un error al procesar la solicitud.");
      }
    } finally {
      setIsDeleting(false);
    }
  };
  
  useEffect(() => {
    if (permanentDeleteModalError) {
      if (modalErrorTimerId.current) clearTimeout(modalErrorTimerId.current);
      modalErrorTimerId.current = setTimeout(() => {
        setPermanentDeleteModalError("");
        modalErrorTimerId.current = null;
      }, 5000);
    }
    return () => { if (modalErrorTimerId.current) clearTimeout(modalErrorTimerId.current); };
  }, [permanentDeleteModalError]);
  
  useEffect(() => {
    if (currentUser?.role === "admin" && authToken) {
        fetchDeletedDoctors(currentPage);
    } else if (authToken && currentUser) {
        setError("Acceso denegado.");
    } else if (!authToken) {
        setError("No autenticado.");
    }
  }, [fetchDeletedDoctors, currentPage, currentUser, authToken]);

  const handleDeleteSelected = async () => {
    const count = selectedDoctorIds.length; 
    if (count === 0) {
      alert("Por favor, seleccione al menos un doctor para eliminar permanentemente.");
      return;
    }
    setPermanentDeleteConfirmationText("");
    setPermanentDeletePinInput("");
    setPermanentDeleteModalError("");
    setIsConfirmPermanentDeleteModalOpen(true);
  };

  const toggleSelect = (id) => setSelectedDoctorIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const handleSelectAllOnPage = (event) => { if (event.target.checked) setSelectedDoctorIds(deletedDoctors.map((d) => d.id)); else setSelectedDoctorIds([]); };
  const isAllSelectedOnPage = deletedDoctors.length > 0 && selectedDoctorIds.length === deletedDoctors.length && deletedDoctors.every((d) => selectedDoctorIds.includes(d.id));
  const formatDate = (dateString) => { if (!dateString) return "N/A"; try { return new Date(dateString).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", }); } catch (e) { return dateString; } };
  const handleRestoreSelected = async () => {
  if (selectedDoctorIds.length === 0) {
    alert("Seleccione al menos un doctor para restaurar.");
    return;
  }

  // Confirmación del usuario
  if (
    !window.confirm(
      `¿Está seguro de que desea restaurar ${selectedDoctorIds.length} doctor(es) seleccionado(s)?`
    )
  ) {
    return;
  }

  setIsLoading(true); // Usar el estado de carga general o uno específico como isRestoring
  setError("");
  setSuccessMessage("");

  try {
    const restorePromises = selectedDoctorIds.map((id) =>
      fetch(`${API_BASE_URL}/api/admin/doctores/${id}/restore`, { // Asegúrate que este sea tu endpoint correcto
        method: "POST", // O el método que use tu API para restaurar
        headers: {
          Authorization: `Bearer ${authToken}`,
          // "Content-Type": "application/json", // No es necesario para POST sin cuerpo usualmente
        },
      })
    );

    const responses = await Promise.all(restorePromises);
    
    const errors = [];
    let successfulRestores = 0;

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (response.ok) {
        successfulRestores++;
      } else {
        // Intentar obtener más detalles del error
        let errorDetail = `Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) {
          // No hacer nada si el cuerpo no es JSON, usar el statusText o el detalle por defecto
          errorDetail = response.statusText || errorDetail;
        }
        errors.push(`ID ${selectedDoctorIds[i]}: ${errorDetail}`);
      }
    }

    if (errors.length > 0) {
      setError(
        `Errores durante la restauración: ${errors.join("; ")}. Restaurados: ${successfulRestores}.`
      );
    }
    
    if (successfulRestores > 0) {
        setSuccessMessage(
            `${successfulRestores} doctor(es) restaurado(s) exitosamente.`
        );
        // Limpiar selección y recargar listas
        setSelectedDoctorIds([]);
        fetchDeletedDoctors(0); // Recargar la lista de doctores eliminados (a la página 0)
        setCurrentPage(0);      // Resetear la página actual de esta vista

        // Notificar al componente padre que se restauraron doctores para que pueda
        // recargar la tabla principal de doctores si es necesario.
        if (onDoctorRestored) {
            onDoctorRestored(); 
        }
    }

  } catch (err) {
    console.error("Error restaurando doctores:", err);
    setError(err.message || "Ocurrió un error de conexión durante la restauración.");
  } finally {
    setIsLoading(false); // O setIsRestoring(false)
  }
};
  const totalPages = Math.ceil(totalDoctors / ITEMS_PER_PAGE);
  const handlePageChange = (newPage) => { setSelectedDoctorIds([]); setCurrentPage(newPage); };
  const handlePreviousPage = () => handlePageChange(Math.max(0, currentPage - 1));
  const handleNextPage = () => handlePageChange(Math.min(totalPages - 1, currentPage + 1));
  const handleGoBack = () => navigate("/");
  useEffect(() => { const timer = setTimeout(() => { setSuccessMessage(""); setError(""); }, 5000); return () => clearTimeout(timer); }, [successMessage, error]);

  if (!currentUser && isLoading) return <div style={styles.message}>Verificando autenticación...</div>;
  if (!authToken && !isLoading && !currentUser) return <div style={styles.error}>{error || "No autenticado."}</div>;
  if (authToken && currentUser && currentUser?.role !== "admin" && !isLoading) return <div style={styles.error}>{error || "Acceso denegado."}</div>;
  if (isLoading && deletedDoctors.length === 0 && !error) return <div style={styles.message}>Cargando doctores eliminados...</div>;

  const numberOfColumns = 6; // Ajustado al número de columnas visibles en la tabla de doctores eliminados

  return (
    <div style={styles.container}>
      <div style={styles.headerContainer}>
        <h1 style={styles.title}>Doctores Eliminados</h1>
        <button onClick={handleGoBack} style={styles.backButton}>
          &larr; Volver a Tabla Principal
        </button>
      </div>

      {successMessage && <div style={styles.successMessage}>{successMessage}</div>}
      {error && <div style={styles.error} role="alert">{error}</div>}

      {deletedDoctors.length > 0 && (
        <div style={styles.actionsHeader}>
          <button
            onClick={handleRestoreSelected}
            disabled={selectedDoctorIds.length === 0 || isLoading || isDeleting}
            style={{ ...styles.button, ...styles.restoreButton, ...(selectedDoctorIds.length === 0 && styles.buttonDisabled) }}
          >
            Restaurar Seleccionados ({selectedDoctorIds.length})
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedDoctorIds.length === 0 || isDeleting}
            style={{ ...styles.button, ...styles.deleteButton, ...(selectedDoctorIds.length === 0 && styles.buttonDisabled) }}
          >
            {isDeleting ? "Procesando..." : `Eliminar Permanentemente (${selectedDoctorIds.length})`}
          </button>
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
                  <input type="checkbox" checked={isAllSelectedOnPage} onChange={handleSelectAllOnPage} disabled={deletedDoctors.length === 0 || isLoading}/>
                </th>
                <th style={styles.th}>ID</th><th style={styles.th}>Nombre Completo</th><th style={styles.th}>CURP</th>
                <th style={styles.th}>Fecha Eliminación</th><th style={styles.th}>Eliminado Por</th>
              </tr>
            </thead>
            <tbody>
              {deletedDoctors.map((doctor, index) => (
                <tr key={doctor.id} style={index % 2 === 0 ? {} : styles.trEven}>
                  <td style={{ ...styles.td, ...styles.checkboxCell }}>
                    <input type="checkbox" checked={selectedDoctorIds.includes(doctor.id)} onChange={() => toggleSelect(doctor.id)}/>
                  </td>
                  <td style={styles.td}>{doctor.id}</td>
                  <td style={styles.td}>{doctor.nombre_completo || "N/A"}</td>
                  <td style={styles.td}>{doctor.curp || "N/A"}</td>
                  <td style={styles.td}>{formatDate(doctor.deleted_at)}</td>
                  <td style={styles.td}>{doctor.deleted_by?.username || doctor.deleted_by_username || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={styles.paginationControls}>
              <button onClick={handlePreviousPage} disabled={currentPage === 0 || isLoading} style={{ ...styles.button, ...((currentPage === 0 || isLoading) && styles.buttonDisabled) }}>
                Anterior
              </button>
              <span>Página {currentPage + 1} de {totalPages} (Total: {totalDoctors})</span>
              <button onClick={handleNextPage} disabled={currentPage >= totalPages - 1 || isLoading} style={{ ...styles.button, ...((currentPage >= totalPages - 1 || isLoading) && styles.buttonDisabled) }}>
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {isConfirmPermanentDeleteModalOpen && (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1050,
        }}>
          <div style={{ 
            backgroundColor: "#fff", padding: "25px", borderRadius: "8px",
            boxShadow: "0 5px 15px rgba(0,0,0,0.3)", width: "90%", maxWidth: "500px",
          }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                proceedWithPermanentDoctorDeletion(); // CORREGIDO
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "15px", textAlign: "center" }}>
                Confirmar Eliminación Permanente
              </h3>
              <p>
                Esta acción es irreversible y eliminará{" "}
                <strong>{selectedDoctorIds.length}</strong>
                {selectedDoctorIds.length === 1 ? " doctor" : " doctores"}.
              </p>
              <p>
                Para confirmar, por favor escribe la siguiente frase exactamente
                en el campo de abajo:
              </p>
              <p><strong>"{getFullPermanentDeletePhrase(selectedDoctorIds.length)}"</strong></p>
              <textarea
                value={permanentDeleteConfirmationText}
                onChange={(e) => setPermanentDeleteConfirmationText(e.target.value)}
                placeholder="Escribe la frase aquí..."
                rows={3}
                style={styles.confirmationTextarea}
                required
              />
              <p style={{ marginTop: "20px" }}>
                Ingresa el PIN de Super Administrador (4 dígitos):
              </p>
              <div style={styles.pinContainer} onPaste={handlePinPaste}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => (permanentDeletePinInputRefs.current[i] = el)} // CORREGIDO
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    style={styles.pinBox}
                    value={permanentDeletePinInput[i] || ""}
                    onChange={(e) => handlePinInputChange(e, i)}
                    onKeyDown={(e) => handlePinKeyDown(e, i)}
                    onFocus={(e) => e.target.select()}
                    aria-label={`Dígito ${i + 1} del PIN`}
                    required
                  />
                ))}
              </div>
              {permanentDeleteModalError && (
                <p style={{ color: "red", textAlign: "center", marginBottom: "15px" }}>
                  {permanentDeleteModalError}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
                <button
                  type="button" // CORRECTO
                  onClick={() => setIsConfirmPermanentDeleteModalOpen(false)}
                  style={{ ...styles.button, backgroundColor: "#6c757d" }}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  type="submit" // CORRECTO
                  style={{ ...styles.button, ...styles.deleteButton }}
                  disabled={
                    isDeleting ||
                    permanentDeleteConfirmationText.trim() !== getFullPermanentDeletePhrase(selectedDoctorIds.length) ||
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
