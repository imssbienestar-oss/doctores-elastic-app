import React from 'react';
import { Link } from 'react-router-dom';

// Estilos CSS para el modal. Puedes moverlos a un archivo .css si lo prefieres.
const styles = {
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
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
    width: '100%',
    maxWidth: '1200px',
    maxHeight: '80vh',
    overflowY: 'auto',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '15px',
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#333',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  },
  th: {
    borderBottom: '2px solid #dee2e6',
    padding: '12px',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
  },
  td: {
    borderBottom: '1px solid #dee2e6',
    padding: '12px',
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '0.875rem',
    borderRadius: '0.25rem',
    border: '1px solid transparent',
    color: '#fff',
    backgroundColor: '#BC955C',
    borderColor: '#BC955C',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    textAlign: 'center',
  }
};

function DoctoresModal({ isOpen, onClose, doctores, isLoading, onViewProfile }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalContent}>
        <button onClick={onClose} style={styles.closeButton}>&times;</button>
        <h2>Registros Filtrados</h2>
        
        {isLoading ? (
          <p>Cargando...</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Nombre Completo</th>
                <th style={styles.th}>Entidad</th>
                <th style={styles.th}>Especialidad</th>
                <th style={styles.th}>Nivel de Atención</th>
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {doctores.length > 0 ? (
                doctores.map((doc) => (
                  <tr key={doc.id_imss}>
                    <td style={styles.td}>{doc.id_imss}</td>
                    <td style={styles.td}>{doc.nombre_completo}</td>
                    <td style={styles.td}>{doc.entidad}</td>
                    <td style={styles.td}>{doc.especialidad}</td>
                    <td style={styles.td}>{doc.nivel_atencion}</td>
                    <td style={styles.td}>
                     <button onClick={() => onViewProfile(doc)} style={styles.actionButton}>
                        Ir a Perfil
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ ...styles.td, textAlign: 'center' }}>
                    No se encontraron doctores con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default DoctoresModal;
