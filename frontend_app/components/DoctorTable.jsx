// src/components/DoctorTable.jsx
import React from "react";
import { useAuth } from "../src/contexts/AuthContext"; 
import "../src/App.css"; 
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

  const cellStyle = {
    whiteSpace: "nowrap",
    padding: "10px 15px",
    textAlign: "center",
  };

  const headerCellStyle = {
    ...cellStyle, 
    backgroundColor: "#006657", 
    color: "white",
    borderBottom: "1px solid #ddd",
    fontSize: "0.9em",
    textTransform: "uppercase",
    position: "relative",
  };

  const dataCellStyle = {
    ...cellStyle, 
    borderBottom: "1px solid #eee",
    color: "#555",
    fontSize: "0.95em",
    verticalAlign: "middle",
  };

  const todasLasColumnas = [
    { key: "id_imss", label: "id" },
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
            value={selectedStatus || "Activo"} 
            onChange={onStatusChange} 
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

          {currentUser && currentUser.role !== "consulta" && (
            <>
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
            </>
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
                          flexDirection: "column", 
                          gap: "5px",
                          alignItems: "center", 
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
                          className="table-action-button view"
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
