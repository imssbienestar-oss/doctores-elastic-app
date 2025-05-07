// src/components/DoctorTable.jsx
import React from 'react';
import { useAuth } from '../src/contexts/AuthContext'; // Asegúrate que la ruta sea correcta
import "../src/App.css"; // Estilos generales (puedes personalizarlos)

// Recibe la lista de doctores y las funciones de callback como props
function DoctorTable({ doctores, onEdit, onDelete }) {
  const { isAuthenticated } = useAuth(); // Obtener el estado de autenticación

  if (!doctores || doctores.length === 0) {
    return <p>No hay doctores para mostrar.</p>;
  }

  // Define las columnas a mostrar.
  const todasLasColumnas = [
    { key: 'identificador_imss', label: 'ID IMSS' },
    { key: 'nombre_completo', label: 'Nombre Completo' },
    { key: 'estatus', label: 'Estatus' },
    { key: 'matrimonio_id', label: 'ID Matrimonio' },
    { key: 'curp', label: 'CURP' },
    { key: 'cedula_esp', label: 'Cédula Especialidad' },
    { key: 'cedula_lic', label: 'Cédula Licenciatura' },
    { key: 'especialidad', label: 'Especialidad' },
    { key: 'entidad', label: 'Entidad' },
    { key: 'clues_ssa', label: 'CLUES SSA' },
    { key: 'notificacion_baja', label: 'Forma Notificación Baja' },
    { key: 'motivo_baja', label: 'Motivo Baja' },
    { key: 'fecha_extraccion', label: 'Fecha de Extracción' },
    { key: 'fecha_notificacion', label: 'Fecha de Notificación' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'turno', label: 'Turno' },
    { key: 'clues_ib', label: 'CLUES IBM' },
    { key: 'nombre_unidad', label: 'Nombre Unidad' },
    { key: 'municipio', label: 'Municipio' },
    { key: 'nivel_atencion', label: 'Nivel Atención' },
    { key: 'fecha_estatus', label: 'Fecha de Estatus' },
    { key: 'despliegue', label: 'Despliegue' },
    { key: 'fecha_vuelo', label: 'Fecha de Vuelo' },
    { key: 'estrato', label: 'Estrato' },
    { key: 'acuerdo', label: 'Acuerdo' },
  ];

  return (
    <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <table className="doctors-table">
        <thead>
          <tr>
            {isAuthenticated && (
              <th className="sticky-col action-header">Acciones</th>
            )}
            {todasLasColumnas.map(col => <th key={col.key}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {doctores.map((doctor) => (
            <tr key={doctor.id || doctor.curp}>
              {isAuthenticated && (
                <td className="sticky-col action-cell">
                  <button
                    onClick={() => onEdit(doctor)} 
                    className="table-action-button edit"
                    aria-label={`Editar ${doctor.nombre_completo}`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(doctor.id, doctor.nombre_completo)}
                    className="table-action-button delete"
                    aria-label={`Borrar ${doctor.nombre_completo}`}
                  >
                    Borrar
                  </button>
                </td>
              )}
              {todasLasColumnas.map(col => (
                <td key={`${doctor.id || doctor.curp}-${col.key}`}>
                  {doctor[col.key] === null || doctor[col.key] === undefined ? '' : String(doctor[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default DoctorTable;
