// src/components/DoctorTable.jsx
import React from 'react';
import "../src/App.css"; // Estilos generales (puedes personalizarlos)

// Recibe la lista de doctores como una prop
function DoctorTable({ doctores, onEdit, onDelete }) {

  if (!doctores || doctores.length === 0) {
    return <p>No hay doctores para mostrar.</p>;
  }

  // Decide qué columnas mostrar inicialmente (usa los nombres LIMPIOS del backend/schema)
  const todasLasColumnas = [
    // { key: 'id', label: 'ID' }, // Puedes incluir el ID si quieres
    { key: 'identificador_imss', label: 'ID IMSS' },
    { key: 'nombre_completo', label: 'Nombre Completo' },
    { key: 'estatus', label: 'Estatus' },
    { key: 'matrimonio_id', label: 'ID Matrimonio' }, // Ajusta el label si es necesario
    { key: 'curp', label: 'CURP' },
    { key: 'cedula_esp', label: 'Cédula Esp.' },
    { key: 'cedula_lic', label: 'Cédula Lic.' },
    { key: 'especialidad', label: 'Especialidad' },
    { key: 'entidad', label: 'Entidad' },
    { key: 'clues_ssa', label: 'CLUES SSA' },
    { key: 'notificacion_baja', label: 'Notificación Baja' },
    { key: 'motivo_baja', label: 'Motivo Baja' },
    { key: 'fecha_extraccion', label: 'Fecha de Extracción' }, // Asumiendo que es TEXT
    { key: 'fecha_notificacion', label: 'Fecha de Notificación' }, // Asumiendo que es TEXT
    { key: 'sexo', label: 'Sexo' },
    { key: 'turno', label: 'Turno' },
    { key: 'clues_ib', label: 'CLUES IB' },
    { key: 'nombre_unidad', label: 'Nombre Unidad' },
    { key: 'municipio', label: 'Municipio' },
    { key: 'nivel_atencion', label: 'Nivel Atención' },
    { key: 'fecha_estatus', label: 'Fecha de Estatus' }, // Asumiendo que es TEXT
    { key: 'despliegue', label: 'Despliegue' },
    { key: 'fecha_vuelo', label: 'Fecha de Vuelo' }, // Asumiendo que es TEXT
    { key: 'estrato', label: 'Estrato' },
    { key: 'acuerdo', label: 'Acuerdo' }, // Asumiendo que es TEXT/VARCHAR
  ];

  return (
    // Contenedor div para habilitar el scroll horizontal
    <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #444' /* Borde opcional para ver límites */ }}>
      <table className="doctors-table">
        <thead>
          <tr>
            {/* --- Columna de Acciones AHORA VA PRIMERO --- */}
            {/* Le añadimos clases para poder fijarla con CSS */}
            <th className="sticky-col action-header">Acciones</th>

            {/* Resto de encabezados */}
            {todasLasColumnas.map(col => <th key={col.key}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {doctores.map((doctor) => (
            <tr key={doctor.id}>
              {/* --- Celda de Acciones AHORA VA PRIMERO --- */}
              {/* Le añadimos clases para poder fijarla con CSS */}
              <td className="sticky-col action-cell">
                <button
                   onClick={() => onEdit(doctor)}
                   className="table-action-button edit">
                   Editar
                </button>
                <button
                   onClick={() => onDelete(doctor.id, doctor.nombre_completo)}
                   className="table-action-button delete">
                   Borrar
                </button>
              </td>

              {/* Resto de celdas de datos */}
              {todasLasColumnas.map(col => (
                <td key={`<span class="math-inline">\{doctor\.id\}\-</span>{col.key}`}>
                  {/* Usamos ?? '' para mostrar cadena vacía si el valor es null o undefined */}
                  {doctor[col.key] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default DoctorTable
