import React from "react";

// Colores Institucionales (Mismos que en GraficasPage)
const COLORS = {
  primary: "#006657", // Verde IMSS
  secondary: "#B08D55", // Dorado
  textMain: "#333333",
  textLight: "#666666",
  bg: "#F4F7F6"
};

const styles = {
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Un poco más suave
    backdropFilter: "blur(4px)", // Efecto de desenfoque moderno
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: "12px", // Bordes más suaves
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
    width: "95%",
    maxWidth: "1400px",
    height: "85vh", // Altura fija para manejar el scroll interno
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden", // Importante para bordes redondeados
  },
  
  // --- HEADER DEL MODAL ---
  modalHeader: {
    padding: "20px 30px",
    borderBottom: `1px solid #e0e0e0`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: "15px"
  },
  modalTitle: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
    borderLeft: `5px solid ${COLORS.secondary}`, // El toque dorado institucional
    paddingLeft: "15px",
    lineHeight: 1
  },
  badgeCount: {
    backgroundColor: COLORS.bg,
    color: COLORS.textMain,
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "0.9rem",
    fontWeight: "600",
    border: "1px solid #ddd"
  },
  closeButton: {
    background: "transparent",
    border: "none",
    fontSize: "2rem",
    lineHeight: "1rem",
    cursor: "pointer",
    color: "#999",
    transition: "color 0.2s",
    padding: "0 10px",
  },

  // --- CONTENEDOR DE LA TABLA (SCROLL) ---
  tableContainer: {
    flex: 1, // Ocupa el resto del espacio
    overflowY: "auto", // Scroll solo aquí
    padding: "0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "'Segoe UI', sans-serif",
  },
  
  // --- ESTILOS DE TABLA (Iguales a tu Dashboard) ---
  th: {
    position: "sticky", // Cabecera Fija
    top: 0,
    backgroundColor: COLORS.primary,
    color: "white",
    padding: "15px",
    textAlign: "left",
    fontWeight: "600",
    fontSize: "0.85em",
    textTransform: "uppercase",
    borderBottom: `4px solid ${COLORS.secondary}`, // Línea dorada
    zIndex: 10, // Encima del contenido
  },
  td: {
    padding: "12px 15px",
    borderBottom: "1px solid #f0f0f0",
    color: "#333",
    fontSize: "0.9em",
    verticalAlign: "middle"
  },
  
  // --- BOTÓN DE ACCIÓN ---
  actionButton: {
    padding: "8px 16px",
    fontSize: "0.85rem",
    fontWeight: "600",
    borderRadius: "6px",
    border: "none",
    color: "#fff",
    backgroundColor: COLORS.secondary, // Dorado para resaltar la acción
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#666",
    fontSize: "1.1rem"
  }
};

function DoctoresModal({ isOpen, onClose, doctores, isLoading, onViewProfile }) {
  if (!isOpen) return null;

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalContent}>
        
        {/* HEADER */}
        <div style={styles.modalHeader}>
          <div style={styles.titleContainer}>
            <h2 style={styles.modalTitle}>Detalle de Registros</h2>
            {!isLoading && (
              <span style={styles.badgeCount}>
                {doctores.length} Resultados
              </span>
            )}
          </div>
          <button 
            onClick={onClose} 
            style={styles.closeButton}
            onMouseEnter={(e) => e.target.style.color = "#333"}
            onMouseLeave={(e) => e.target.style.color = "#999"}
          >
            &times;
          </button>
        </div>

        {/* CONTENT */}
        <div style={styles.tableContainer}>
          {isLoading ? (
            <div style={{ padding: "50px", textAlign: "center", color: COLORS.textLight }}>
              <p>Cargando información...</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Nombre Completo</th>
                  <th style={styles.th}>CLUES</th>
                  <th style={styles.th}>Entidad</th>
                  <th style={styles.th}>Unidad</th>
                  <th style={styles.th}>Especialidad</th>
                  <th style={styles.th}>Nivel</th>
                  <th style={styles.th}>Estatus</th>
                  <th style={{...styles.th, textAlign: "center"}}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {doctores.length > 0 ? (
                  doctores.map((doc, index) => (
                    <tr 
                      key={doc.id_imss}
                      style={{ 
                        backgroundColor: index % 2 === 0 ? "#fff" : "#fcfcfc",
                        transition: "background-color 0.2s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0fdfa"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#fff" : "#fcfcfc"}
                    >
                      <td style={{...styles.td, fontWeight: "bold", fontSize: "0.8em"}}>{doc.id_imss}</td>
                      <td style={styles.td}>{doc.nombre_completo}</td>
                      <td style={{...styles.td, fontSize: "0.85em"}}>{doc.clues}</td>
                      <td style={styles.td}>{doc.entidad}</td>
                      <td style={styles.td}>{doc.nombre_unidad}</td>
                      <td style={styles.td}>{doc.especialidad}</td>
                      <td style={styles.td}>{doc.nivel_atencion}</td>
                      <td style={styles.td}>
                        {/* Pequeño badge para el estatus */}
                        <span style={{
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            backgroundColor: doc.estatus.includes("ACTIVO") ? "#d1fae5" : "#fee2e2",
                            color: doc.estatus.includes("ACTIVO") ? "#065f46" : "#991b1b",
                            fontSize: "0.8em",
                            fontWeight: "bold"
                        }}>
                            {doc.estatus}
                        </span>
                      </td>
                      <td style={{...styles.td, textAlign: "center"}}>
                        <button
                          onClick={() => onViewProfile(doc)}
                          style={styles.actionButton}
                          onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.target.style.opacity = "1"}
                        >
                          Ver Perfil
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={styles.emptyState}>
                      No se encontraron registros coinciden con los filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default DoctoresModal;
