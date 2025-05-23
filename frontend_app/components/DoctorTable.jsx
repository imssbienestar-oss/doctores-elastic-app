// src/components/DoctorTable.jsx
import React from "react";
import { useAuth } from "../src/contexts/AuthContext"; // Asegúrate que la ruta sea correcta
import "../src/App.css"; // Estilos generales (puedes personalizarlos)

function DoctorTable({
  doctores,
  onDelete,
  selectedStatus,
  onStatusChange,
  estatusDisponibles,
  onViewProfile,
}) {
  const { isAuthenticated, currentUser } = useAuth();
  const esAdmin =
    isAuthenticated && currentUser && currentUser.role === "admin";

  const todasLasColumnas = [
    { key: "nombre_completo", label: "Nombre Completo" },
    { key: "estatus", label: "Estatus" }, // El encabezado de estatus ya está aquí
    { key: "curp", label: "CURP" },
    { key: "especialidad", label: "Especialidad" },
  ];

  return (
    <div
      style={{
        width: "100%",
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "10px",
        zIndex: "1000",
      }}
    >
      {" "}
      {/* Añadido padding general */}
      {/* --- NUEVO: Selector de Estatus --- */}
      {/* Solo mostramos el selector si se proporcionan las props necesarias */}
      {estatusDisponibles && typeof onStatusChange === "function" && (
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <label htmlFor="status-filter-table" style={{ fontWeight: "bold" }}>
            Filtrar por Estatus:{" "}
          </label>

          <select
            id="status-filter-table"
            value={selectedStatus || "Activo"} // Asegurar un valor, default a "Activo" si selectedStatus es undefined
            onChange={onStatusChange} // Llama a la función del padre
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
          >
            {estatusDisponibles.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue === "todos" ? "Todos los Estatus" : statusValue}
              </option>
            ))}
          </select>
          {typeof onAgregarDoctorClick === "function" && (
            <button onClick={onAgregarDoctorClick} style={styles.button}>
              Agregar Doctor
            </button>
          )}
          {typeof onDoctorRestored === "function" && (
            <button onClick={onDoctorRestored}>Ver Eliminados</button>
          )}
        </div>
      )}
      {!doctores || doctores.length === 0 ? (
        <p>No hay doctores para mostrar con el filtro actual.</p>
      ) : (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table className="doctors-table">
            <thead>
              <tr>
                {isAuthenticated && (
                  <th className="sticky-col action-header">Acciones</th>
                )}
                {todasLasColumnas.map((col) => (
                  // Si quisieras hacer el encabezado "Estatus" clickeable en el futuro,
                  // aquí es donde modificarías este <th> en particular.
                  // Por ahora, el <select> de arriba maneja el filtro.
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctores.map((doctor) => (
                <tr key={doctor.id || doctor.curp}>
                  {isAuthenticated && (
                    <td className="sticky-col action-cell">
                      {esAdmin && (
                        <button
                          onClick={() =>
                            onDelete(doctor.id, doctor.nombre_completo)
                          }
                          className="table-action-button delete"
                          aria-label={`Borrar ${doctor.nombre_completo}`}
                          style={{
                            marginBottom: "5px",
                            width: "95px",
                          }}
                        >
                          Borrar
                        </button>
                      )}
                      <button
                        onClick={() => onViewProfile(doctor)}
                        className="table-action-button view" // Cambié a 'view' para diferenciar
                        aria-label={`Ver perfil ${doctor.nombre_completo}`}
                      >
                        Ver Perfil
                      </button>
                    </td>
                  )}
                  {todasLasColumnas.map((col) => (
                    <td key={`${doctor.id || doctor.curp}-${col.key}`}>
                      {doctor[col.key] === null || doctor[col.key] === undefined
                        ? ""
                        : String(doctor[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export default DoctorTable;
