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

  // Definimos un estilo base para las celdas para asegurar que no se parta el texto
  const cellStyle = {
    whiteSpace: "nowrap",
    padding: "10px 15px", // Ejemplo de tu objeto styles en App.jsx
    textAlign: "center", // Ejemplo
  };

  const headerCellStyle = {
    ...cellStyle, // Hereda whiteSpace: "nowrap" y padding/textAlign si los defines arriba
    backgroundColor: "#006657", // De tu objeto styles en App.jsx
    color: "white",
    borderBottom: "1px solid #ddd",
    fontSize: "0.9em",
    textTransform: "uppercase",
    position: "relative", // Si necesitas esto para algo como tooltips en headers
  };

  const dataCellStyle = {
    ...cellStyle, // Hereda whiteSpace: "nowrap"
    borderBottom: "1px solid #eee", // De tu objeto styles en App.jsx
    color: "#555",
    fontSize: "0.95em",
    verticalAlign: "middle",
  };

  const todasLasColumnas = [
    { key: "id_imss", label: "id"},
    { key: "estatus", label: "Estatus" },
    { key: "acuerdo", label: "Acuerdo" },
    { key: "curp", label: "CURP" },
    { key: "apellido_paterno", label: "Apellido Paterno" },
    { key: "apellido_materno", label: "Apellido Materno" },
    { key: "nombre", label: "Nombre" },
    { key: "especialidad", label: "Especialidad" },
    { key: "clues", label: "CLUES" },
    { key: "nombre_unidad", label: "Nombre Unidad" },
    { key: "nivel_atencion", label: "NIVEL ATENCIÓN" },
    { key: "entidad", label: "ENTIDAD" },
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
      {estatusDisponibles && typeof onStatusChange === "function" && (
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <label
            htmlFor="status-filter-table"
            style={{ fontWeight: "bold", marginRight: "5px" }}
          >
            Filtrar por Estatus:
          </label>

          <select
            id_imss="status-filter-table"
            value={selectedStatus || "Activo"} // Asegurar un valor, default a "Activo" si selectedStatus es undefined
            onChange={onStatusChange} // Llama a la función del padre
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              marginRight: "10px",
            }}
          >
            {estatusDisponibles.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue === "todos" ? "Todos los Estatus" : statusValue}
              </option>
            ))}
          </select>
          {typeof onAgregarDoctorClick === "function" && (
            <button
              onClick={onAgregarDoctorClick}
              style={stylesFromParent.button}
            >
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
                  <th key={col.key} style={headerCellStyle}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctores.map((doctor) => (
                <tr key={doctor.id_imss || doctor.curp}>
                  {isAuthenticated && (
                    <td
                      style={dataCellStyle}
                      className="sticky-col action-cell"
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column", // <-- AQUÍ ESTÁ LA CLAVE
                          gap: "5px", // Espacio entre botones
                          alignItems: "center", // Centra los botones si son más angostos que la celda
                          // O usa 'stretch' si quieres que ocupen el ancho
                        }}
                      >
                        {esAdmin && (
                          <button
                            onClick={() =>
                              onDelete(doctor.id_imss, doctor.nombre)
                            }
                            className="table-action-button delete"
                            aria-label={`Borrar ${doctor.nombre}`}
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
                          aria-label={`Ver perfil ${doctor.nombre}`}
                        >
                          Ver Perfil
                        </button>
                      </div>
                    </td>
                  )}
                  {todasLasColumnas.map((col) => (
                    <td
                      key={`${doctor.id_imss || doctor.curp}-${col.key}`}
                      style={dataCellStyle}
                    >
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
