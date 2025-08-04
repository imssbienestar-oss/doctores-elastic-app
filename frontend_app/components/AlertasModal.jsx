  // src/components/AlertasModal.jsx
  import React, { useState, useEffect } from "react";
  import { useAuth } from "../src/contexts/AuthContext";
  import { useNavigate } from "react-router-dom";

  // Estilos para el modal (puedes personalizarlos)
  const styles = {
    modalBackdrop: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1200,
    },
    modalContent: {
      backgroundColor: "#fff", 
      borderTop: "5px solid #ffc107", 
      padding: "25px",
      borderRadius: "8px",
      boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
      width: "90%",
      maxWidth: "800px",
      maxHeight: "80vh",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: "25px",
      color: "#5d4902", 
      paddingBottom: "1px",
      borderBottom: "1px solid #eee",
    },
    title: { margin: 0, fontSize: "25px" },
    tableContainer: {
      flexGrow: 1,
      overflowY: "auto",
    },
    table: { width: "100%", borderCollapse: "collapse", marginTop: "1px" },
    th: {
      backgroundColor: "#f8f9fa",
      padding: "8px",
      borderBottom: "2px solid #dee2e6",
      textAlign: "center",
      color: "#495057",
      fontWeight: "600",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #dee2e6",
      verticalAlign: "middle",
    },
    button: {
      padding: "6px 12px",
      fontSize: "0.875rem",
      cursor: "pointer",
      backgroundColor: "#006657", // Color verde consistente
      color: "white",
      border: "none",
      borderRadius: "4px",
      transition: "background-color 0.2s ease",
    },
    closeButton: {
      position: "absolute",
      top: "15px",
      right: "20px",
      background: "transparent",
      border: "none",
      fontSize: "1.8rem",
      cursor: "pointer",
      color: "#6c757d",
      lineHeight: 1,
      padding: 0,
    },
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    // Usamos UTC para evitar problemas de zona horaria al formatear
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  function AlertasModal({ isOpen, onClose }) {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [alertas, setAlertas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

    useEffect(() => {
      // Solo busca las alertas si el modal está abierto
      if (isOpen) {
        const fetchAlertas = async () => {
          setIsLoading(true);
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/doctores/alertas-vencimiento`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!response.ok) throw new Error("Error al cargar alertas.");
            const data = await response.json();
            setAlertas(data);
          } catch (error) {
            console.error(error);
          } finally {
            setIsLoading(false);
          }
        };
        fetchAlertas();
      }
    }, [isOpen, token, API_BASE_URL]);

    const handleVerPerfil = (id_imss) => {
      onClose(); // Cierra el modal antes de navegar
      navigate(`/?profile=${id_imss}`);
    };

    if (!isOpen) return null;

    return (
      <div style={styles.modalBackdrop}>
        <div style={styles.modalContent}>
          <button onClick={onClose} style={styles.closeButton}>
            &times;
          </button>
          <div style={styles.header}>
            <span
              style={{ fontSize: "24px", color: "#ffc107" }}
              role="img"
              aria-label="alerta"
            >
              ⚠️
            </span>
            <h2 style={styles.title}>Alertas de Vencimiento</h2> <h4>(Proximos 15 días)</h4>
          </div>
          {isLoading ? (
            <p>Cargando alertas...</p>
          ) : alertas.length === 0 ? (
            <p>No hay vencimientos en los próximos 15 días.</p>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Médico</th>
                    <th style={styles.th}>Estatus Actual</th>
                    <th style={styles.th}>Fecha de Término</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((alerta) => (
                    <tr key={alerta.id_imss}>
                      <td style={styles.td}>{alerta.nombre_completo}</td>
                      <td style={styles.td}>{alerta.estatus}</td>
                      <td style={styles.td}>{formatDate(alerta.fecha_fin)}</td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleVerPerfil(alerta.id_imss)}
                          style={styles.button}
                        >
                          Ver Expediente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  export default AlertasModal;
