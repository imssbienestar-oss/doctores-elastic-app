// src/components/ColumnSelectorModal.jsx
import React, { useState } from 'react';

// --- ESTILOS  ---
const modalStyles = {
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1200,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    width: '90%',
    maxWidth: '600px', // Un poco más ancho para las columnas
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
    textAlign: 'center',
    color: '#10312B',
    borderBottom: '1px solid #dee2e6',
    paddingBottom: '15px',
  },
  controlsContainer: { 
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginBottom: '10px',
  },
  controlButton: { 
    padding: '5px 10px',
    fontSize: '0.8em',
    backgroundColor: '#55b1b6ff',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  checkboxContainer: {
    overflowY: 'auto',
    flexGrow: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)', // Dos columnas de checkboxes
    gap: '10px',
    padding: '10px',
    border: '1px solid #eee',
    borderRadius: '4px',
  },
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: '20px',
    paddingTop: '15px',
    borderTop: '1px solid #dee2e6',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  // ... (puedes añadir estilos para los botones si es necesario)
};

const ALL_COLUMNS = [
    //DATOS PERSONALES
    { key: 'id_imss', label: 'ID IMSS' },
    { key: 'nombre', label: 'Nombre(s)' },
    { key: 'apellido_paterno', label: 'Apellido Paterno' },
    { key: 'apellido_materno', label: 'Apellido Materno' },
    { key: 'curp', label: 'CURP' },
    { key: 'pasaporte', label: 'Pasaporte'},
    { key: 'fecha_emision', label: 'Fecha emisión'},
    { key: 'fecha_expiracion', label: 'Fecha expiración'},
    { key: 'sexo', label: 'Sexo'},
    { key: 'fecha_nacimiento', label: 'Fecha nacimiento'},
    { key: 'matrimonio_id', label: 'Matrimonio ID'},
    { key: 'telefono', label: 'Teléfono'},
    { key: 'correo', label: 'Correo'},
    
    //DATOS ACADEMICOS
    { key: 'licenciatura', label: 'Licenciatura'},
    { key: 'cedula_lic', label: 'Cédula Licenciatura'},
    { key: 'especialidad', label: 'Especialidad' },
    { key: 'cedula_esp', label: 'Cédula Especialidad'},

    //DATOS DE COOPERACIÓN
    { key: 'acuerdo', label: 'Acuerdo'},
    { key: 'fecha_vuelo', label: 'Fecha Llegada'},
    { key: 'estatus', label: 'Estatus' },
    { key: 'fecha_estatus', label: 'Fecha de Estatus' },
    { key: 'fecha_fin', label: 'Fecha Termino'},
    { key: 'turno', label: 'Turno' },
    { key: 'despliegue', label: 'Despliegue'},
    { key: 'clues', label: 'CLUES' },
    { key: 'nombre_unidad', label: 'Unidad Médica' },
    { key: 'direccion_unidad', label: 'Dirección Unidad'},
    { key: 'nivel_atencion', label: 'Nivel de Atención' },
    { key: 'tipo_establecimiento', label: 'Tipo Establecimiento'},
    { key: 'subtipo_establecimiento', label: 'Subtipo Establecimiento'},
    { key: 'estrato', label: 'Estrato'},
    { key: 'entidad', label: 'Entidad'},
    { key: 'municipio', label: 'Municipio'},
    { key: 'region', label: 'Región'}
];

function ColumnSelectorModal({ isOpen, onClose, onConfirmDownload }) {
    const [selectedColumns, setSelectedColumns] = useState(ALL_COLUMNS.map(c => c.key));

    const handleCheckboxChange = (columnKey) => {
        setSelectedColumns(prev => 
            prev.includes(columnKey) 
                ? prev.filter(key => key !== columnKey) 
                : [...prev, columnKey]
        );
    };

    const handleSelectAll = () => {
        setSelectedColumns(ALL_COLUMNS.map(c => c.key));
    };

    const handleDeselectAll = () => {
        setSelectedColumns([]);
    };

    if (!isOpen) return null;

    return (
        <div style={modalStyles.modalBackdrop}>
            <div style={modalStyles.modalContent}>
                <div style={modalStyles.modalHeader}>Seleccionar Columnas para Exportar</div>

                <div style={modalStyles.controlsContainer}>
                    <button onClick={handleSelectAll} style={modalStyles.controlButton}>Seleccionar Todo</button>
                    <button onClick={handleDeselectAll} style={modalStyles.controlButton}>Deseleccionar Todo</button>
                </div>
                <div style={modalStyles.checkboxContainer}>
                    {ALL_COLUMNS.map(col => (
                        <div key={col.key} style={modalStyles.checkboxItem}>
                            <input
                                type="checkbox"
                                id={`col-${col.key}`}
                                checked={selectedColumns.includes(col.key)}
                                onChange={() => handleCheckboxChange(col.key)}
                                style={{ marginRight: '10px' }}
                            />
                            <label htmlFor={`col-${col.key}`}>{col.label}</label>
                        </div>
                    ))}
                </div>
                <div style={modalStyles.buttonContainer}>
                    <button onClick={onClose} style={{backgroundColor: '#6c757d', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px'}}>Cancelar</button>
                    <button onClick={() => onConfirmDownload(selectedColumns)} style={{backgroundColor: '#006657', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px'}}>Confirmar y Descargar</button>
                </div>
            </div>
        </div>
    );
}

export default ColumnSelectorModal;
