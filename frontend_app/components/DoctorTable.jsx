// src/components/DoctorTable.jsx
import React from 'react';

// Recibe la lista de doctores como una prop
function DoctorTable({ doctores, onEdit, onDelete }) {

  if (!doctores || doctores.length === 0) {
    return <p>No hay doctores para mostrar.</p>;
  }

  // Decide qué columnas mostrar inicialmente (usa los nombres LIMPIOS del backend/schema)
  const columnasVisibles = [
    { key: 'id', label: 'ID' },
    { key: 'nombre_completo', label: 'Nombre Completo' },
    { key: 'especialidad', label: 'Especialidad' },
    { key: 'estatus', label: 'Estatus' },
    { key: 'entidad', label: 'Entidad' },
    // Añade más objetos { key: 'nombre_columna', label: 'Titulo Columna' } si quieres mostrar más
  ];

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}> {/* Contenedor para scroll horizontal */}
      <table>
        <thead>
          <tr>
            {columnasVisibles.map(col => <th key={col.key}>{col.label}</th>)}
            <th>Acciones</th> {/* Columna extra para botones */}
          </tr>
        </thead>
        <tbody>
          {doctores.map((doctor) => (
            <tr key={doctor.id}>
              {columnasVisibles.map(col => (
                <td key={`<span class="math-inline">\{doctor\.id\}\-</span>{col.key}`}>
                  {/* Manejar valores null/undefined */}
                  {doctor[col.key] !== null && doctor[col.key] !== undefined ? String(doctor[col.key]) : ''}
                </td>
              ))}
              <td>
                {/* Llama a onEdit pasando el objeto 'doctor' completo */}
                <button onClick={() => onEdit(doctor)} style={{marginRight: '5px'}}>Editar</button>
                <button onClick={() => onDelete(doctor.id, doctor.nombre_completo)}>Borrar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DoctorTable;