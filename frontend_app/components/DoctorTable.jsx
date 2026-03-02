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
  // ✅ NUEVAS PROPS PARA EL FILTRO DE COORDINACIÓN
  selectedCoord,
  onCoordChange,
  onAgregarDoctorClick
}) {
  const { isAuthenticated, currentUser } = useAuth();
  const esAdmin = isAuthenticated && currentUser && currentUser.role === "admin";

  const buttonStyle = {
    padding: "8px 15px",
    backgroundColor: "#006657",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500"
  };

  const cellStyle = { whiteSpace: "nowrap", padding: "10px 15px", textAlign: "center" };
  const headerCellStyle = { ...cellStyle, backgroundColor: "#006657", color: "white", borderBottom: "1px solid #ddd", fontSize: "0.9em", textTransform: "uppercase" };
  const dataCellStyle = { ...cellStyle, borderBottom: "1px solid #eee", color: "#555", fontSize: "0.95em", verticalAlign: "middle" };

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
    <div style={{ width: "100%", border: "1px solid #ccc", borderRadius: "8px", padding: "20px", backgroundColor: "#fff" }}>
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "25px", flexWrap: "wrap" }}>
        
        {/* FILTRO ESTATUS */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label htmlFor="status-filter" style={{ fontWeight: "bold", fontSize: "0.9em" }}>Estatus:</label>
          <select
            id="status-filter"
            value={selectedStatus || "01 ACTIVO"} 
            onChange={onStatusChange} 
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            {estatusDisponibles.map((statusValue) => (
              <option key={statusValue} value={statusValue}>
                {statusValue === "todos" ? "Todos los Estatus" : statusValue}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ NUEVO FILTRO: TIPO DE PERSONAL (COORDINACIÓN) */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label htmlFor="coord-filter" style={{ fontWeight: "bold", fontSize: "0.9em" }}>Tipo de Personal:</label>
          <select
            id="coord-filter"
            value={selectedCoord} 
            onChange={onCoordChange} 
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #006657", backgroundColor: "#f0fdfa" }}
          >
            <option value="todos">Todos</option>
            <option value="0">Solo Médicos</option>
            <option value="1">Solo Administrativos</option>
          </select>
        </div>

        {/* ACCIONES EXTRA */}
        {currentUser && currentUser.role !== "consulta" && (
          <div style={{ display: "flex", gap: "10px" }}>
             {onAgregarDoctorClick && (
               <button onClick={onAgregarDoctorClick} style={buttonStyle}>+ Registrar</button>
             )}
          </div>
        )}
      </div>

      {/* TABLA (Misma lógica) */}
      {!doctores || doctores.length === 0 ? (
        <p style={{ textAlign: "center", padding: "20px", color: "#666" }}>No hay registros para mostrar.</p>
      ) : (
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table className="doctors-table">
            <thead>
              <tr>
                {isAuthenticated && <th className="sticky-col action-header">Acciones</th>}
                {todasLasColumnas.map((col) => (
                  <th key={col.key} style={headerCellStyle}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctores.map((doctor) => (
                <tr key={doctor.id_imss || doctor.curp}>
                  {isAuthenticated && (
                    <td style={dataCellStyle} className="sticky-col action-cell">
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {esAdmin && (
                          <button onClick={() => onDelete(doctor.id_imss, doctor.nombre)} className="table-action-button delete">Borrar</button>
                        )}
                        <button onClick={() => onViewProfile(doctor)} className="table-action-button view">Perfil</button>
                      </div>
                    </td>
                  )}
                  {todasLasColumnas.map((col) => (
                    <td key={`${doctor.id_imss}-${col.key}`} style={dataCellStyle}>
                      {doctor[col.key] || ""}
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
