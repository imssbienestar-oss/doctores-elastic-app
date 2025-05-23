import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../src/contexts/AuthContext"; // Ajusta la ruta
import { Tooltip as ReactTooltip } from "react-tooltip"; // Si quieres tooltips para más info
import { useNavigate } from "react-router-dom";

// Estilos (puedes reutilizar o adaptar los de AuditLogView o DoctorTable)
const styles = {
  container: { padding: '20px', margin: '20px auto', maxWidth: '1000px', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', fontFamily: 'Arial, sans-serif' },
  headerContainer: { // Nuevo contenedor para el título y el botón de volver
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px',
  },
  backButton: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
    // marginRight: '10px', // Estaba en el código anterior, revisa si lo necesitas para el layout
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
    textAlign: "left",
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
    opacity: 1,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
    opacity: 0.7,
  },
  restoreButton: { backgroundColor: "#28a745" }, // Verde para restaurar
  // Añade estilos para el botón de eliminar permanentemente si lo implementas
  // permanentDeleteButton: { backgroundColor: '#dc3545' },
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const ITEMS_PER_PAGE = 15;

function DeletedDoctorsView({ onDoctorRestored }) {
  // onDoctorRestored es un callback opcional
  const { token: authToken, currentUser } = useAuth();
  const [deletedDoctors, setDeletedDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState(new Set());
  const navigate = useNavigate();

  const fetchDeletedDoctors = useCallback(
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
      const fetchUrl = `${API_BASE_URL}/api/admin/doctores/eliminados?skip=${skip}&limit=${ITEMS_PER_PAGE}`;

      try {
        const response = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: "Error al cargar doctores eliminados." }));
          throw new Error(errorData.detail || `Error ${response.status}`);
        }
        const data = await response.json(); // Asume que el backend devuelve { total_count: N, doctores: [] }
        // Si solo devuelve un array, ajusta como en AuditLogView
        setDeletedDoctors(data.doctores || data || []); // Maneja ambos formatos de respuesta
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

  useEffect(() => {
    if (currentUser?.role === "admin" && authToken) {
      fetchDeletedDoctors(currentPage);
    } else if (authToken && currentUser) {
      setError("Acceso denegado.");
    } else if (!authToken) {
      setError("No autenticado.");
    }
  }, [fetchDeletedDoctors, currentPage, currentUser, authToken]);

  useEffect(() => {
    // Timer para mensajes
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

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

  const handleSelectDoctor = (doctorId) => {
    setSelectedDoctorIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(doctorId)) newSelected.delete(doctorId);
      else newSelected.add(doctorId);
      return newSelected;
    });
  };

  const handleSelectAllOnPage = (event) => {
    if (event.target.checked)
      setSelectedDoctorIds(new Set(deletedDoctors.map((d) => d.id)));
    else setSelectedDoctorIds(new Set());
  };

  const isAllSelectedOnPage =
    deletedDoctors.length > 0 &&
    selectedDoctorIds.size === deletedDoctors.length &&
    deletedDoctors.every((d) => selectedDoctorIds.has(d.id));

  const handleRestoreSelected = async () => {
    if (selectedDoctorIds.size === 0) {
      alert("Seleccione al menos un doctor para restaurar.");
      return;
    }
    if (
      !window.confirm(
        `¿Está seguro de que desea restaurar ${selectedDoctorIds.size} doctor(es) seleccionado(s)?`
      )
    )
      return;

    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    const idsToRestore = Array.from(selectedDoctorIds);
    let restoredCount = 0;
    let errorsEncountered = [];

    for (const doctorId of idsToRestore) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/admin/doctores/${doctorId}/restore`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({
              detail: `Error al restaurar doctor ID ${doctorId}`,
            }));
          throw new Error(errorData.detail || `Error ${response.status}`);
        }
        restoredCount++;
      } catch (err) {
        console.error(`Error restaurando doctor ID ${doctorId}:`, err);
        errorsEncountered.push(`ID ${doctorId}: ${err.message}`);
      }
    }
    setIsLoading(false);
    if (errorsEncountered.length > 0) {
      setError(
        `Errores durante la restauración: ${errorsEncountered.join("; ")}`
      );
    }
    if (restoredCount > 0) {
      setSuccessMessage(
        `${restoredCount} doctor(es) restaurado(s) exitosamente.`
      );
    }
    setSelectedDoctorIds(new Set());
    fetchDeletedDoctors(0); // Refrescar y volver a la primera página
    setCurrentPage(0);
    if (onDoctorRestored && restoredCount > 0) onDoctorRestored(); // Notificar al padre si es necesario
  };

  const totalPages = Math.ceil(totalDoctors / ITEMS_PER_PAGE);
  const handlePageChange = (newPage) => {
    setSelectedDoctorIds(new Set());
    setCurrentPage(newPage);
  };
  const handlePreviousPage = () =>
    handlePageChange(Math.max(0, currentPage - 1));
  const handleNextPage = () =>
    handlePageChange(Math.min(totalPages - 1, currentPage + 1));

  const handleGoBack = () => {
    navigate("/"); // Navega a la ruta principal (tabla de doctores)
  };

  if (!currentUser && isLoading)
    return <div style={styles.message}>Verificando autenticación...</div>;
  if (!authToken && !isLoading)
    return <div style={styles.error}>{error || "No autenticado."}</div>;
  if (authToken && currentUser?.role !== "admin" && !isLoading)
    return <div style={styles.error}>{error || "Acceso denegado."}</div>;
  if (isLoading && deletedDoctors.length === 0)
    return <div style={styles.message}>Cargando doctores eliminados...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.headerContainer}>
        <h1 style={styles.title}>Doctores Eliminados</h1>
        <button onClick={handleGoBack} style={styles.backButton}>
          &larr; Volver a Tabla Principal
        </button>
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
          <button
            onClick={handleRestoreSelected}
            disabled={selectedDoctorIds.size === 0 || isLoading}
            style={{
              ...styles.button,
              ...styles.restoreButton,
              ...(selectedDoctorIds.size === 0 && styles.buttonDisabled),
            }}
          >
            Restaurar Seleccionados ({selectedDoctorIds.size})
          </button>
          {/* Aquí podrías añadir un botón para "Eliminar Permanentemente Seleccionados" si lo necesitas */}
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
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Nombre Completo</th>
                <th style={styles.th}>CURP</th>
                <th style={styles.th}>Fecha Eliminación</th>
                <th style={styles.th}>Eliminado Por (ID)</th>
                {/* Podrías añadir una columna para el nombre del admin si lo obtienes */}
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
                      checked={selectedDoctorIds.has(doctor.id)}
                      onChange={() => handleSelectDoctor(doctor.id)}
                    />
                  </td>
                  <td style={styles.td}>{doctor.id}</td>
                  <td style={styles.td}>{doctor.nombre_completo || "N/A"}</td>
                  <td style={styles.td}>{doctor.curp || "N/A"}</td>
                  <td style={styles.td}>{formatDate(doctor.deleted_at)}</td>
                  <td style={styles.td}>
                    {doctor.deleted_by?.username ||
                      doctor.deleted_by_username ||
                      "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
                {" "}
                Anterior{" "}
              </button>
              <span>
                Página {currentPage + 1} de {totalPages} (Total: {totalDoctors})
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
                {" "}
                Siguiente{" "}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DeletedDoctorsView;
