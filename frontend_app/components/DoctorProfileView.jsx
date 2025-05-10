// src/components/DoctorProfileView.jsx
import React, { useState, useEffect } from "react";

const profileStyles = {
  container: {
    padding: "20px",
    margin: "20px auto",
    maxWidth: "800px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    paddingBottom: "15px",
    borderBottom: "1px solid #eee",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    color: "#333",
  },
  backButton: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
  },
  uploadButton: { // Estilo un poco diferente para los botones de subir
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#28a745", // Verde
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
    marginLeft: '10px', // Espacio si hay varios botones
  },
  sectionTitle: {
    fontSize: "20px",
    color: "#235b4e",
    fontWeight: "bold",
    marginTop: "30px",
    marginBottom: "15px",
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: "5px",
  },
  fieldLabel: {
    fontWeight: "bold",
    color: "#555",
    textAlign: "left",
    paddingRight: "10px",
  },
  fieldValue: {
    color: "#333",
    textAlign: "left",
    wordBreak: "break-word",
  },
  gridContainer: {
    display: "grid",
    gap: "20px",
  },
  fieldPair: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "0 10px",
    alignItems: "baseline",
    marginBottom: "10px",
  },
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "30px",
    padding: "20px",
    margin: "20px auto",
    maxWidth: "1200px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  infoColumn: {},
  filesColumn: {
    borderLeft: "1px solid #eee",
    paddingLeft: "30px",
  },
  profilePicSection: {
    marginBottom: "30px",
    textAlign: "center",
  },
  attachmentsSection: {},
  profileImage: {
    width: "150px",
    height: "150px",
    objectFit: "cover",
    borderRadius: "50%",
    marginBottom: "15px",
    border: "2px solid #eee",
  },
  profileImagePlaceholder: {
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    backgroundColor: "#f0f0f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#888",
    fontSize: "0.9em",
    marginBottom: "15px",
    border: "2px dashed #ccc",
  },
  fileInput: {
    display: "block",
    margin: "10px auto", // Centra el input de archivo si la sección está centrada
    padding: "5px",
  },
  attachmentList: {
    listStyle: "none",
    padding: 0,
    textAlign: "left",
  },
  attachmentItem: {
    padding: "8px 5px", // Un poco más de padding
    borderBottom: "1px dotted #eee",
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.9em',
  },
  attachmentLink: {
    textDecoration: "none",
    color: "#007bff",
    flexGrow: 1, // Para que el nombre del archivo ocupe el espacio disponible
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginRight: '10px', // Espacio antes del botón de eliminar
  },
  deleteAttachmentButton: {
    background: 'none',
    border: 'none',
    color: 'red',
    cursor: 'pointer',
    fontSize: '1.2em', // Un poco más grande para que sea fácil de clickear
    padding: '0 5px',
    fontWeight: 'bold',
  },
  noAttachments: {
    color: "#777",
    fontStyle: "italic",
    textAlign: 'center',
    padding: '10px 0',
  },
  loadingMessage: {
    marginTop: "10px",
    fontStyle: "italic",
    color: "#555",
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: "10px",
    fontStyle: "italic",
    color: "red",
    textAlign: 'center',
  },
  successMessage: { // Nuevo estilo para mensaje de éxito
    marginTop: "10px",
    fontStyle: "italic",
    color: "green",
    textAlign: 'center',
  }
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function DoctorProfileView({ doctor: initialDoctor, onBack, onProfileUpdate }) {
  const [doctor, setDoctor] = useState(initialDoctor);
  const [selectedProfilePicFile, setSelectedProfilePicFile] = useState(null);
  const [profilePicPreviewUrl, setProfilePicPreviewUrl] = useState(null);
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setDoctor(initialDoctor);
    setSelectedProfilePicFile(null);
    setProfilePicPreviewUrl(null);
    setSelectedAttachmentFile(null);
  }, [initialDoctor]);

  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const handleProfilePicSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedProfilePicFile(file);
      setProfilePicPreviewUrl(URL.createObjectURL(file));
      setError("");
      setSuccessMessage("");
    }
  };

  const uploadProfilePic = async () => {
    if (!selectedProfilePicFile || !doctor?.id) {
      setError("Por favor, selecciona una foto y asegúrate de que haya un doctor cargado.");
      return;
    }
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    const formData = new FormData();
    formData.append("file", selectedProfilePicFile);
    const authToken = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctores/${doctor.id}/profile-picture`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData,
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Error al subir la foto." }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      const updatedDoctorData = await response.json();
      setDoctor((prevDoctor) => ({
        ...prevDoctor,
        profile_pic_url: updatedDoctorData.profile_pic_url,
      }));
      setSelectedProfilePicFile(null);
      setProfilePicPreviewUrl(null);
      setSuccessMessage("Foto de perfil actualizada exitosamente.");
      if (onProfileUpdate) onProfileUpdate(doctor.id);
    } catch (err) {
      console.error("Error al subir foto de perfil:", err);
      setError(err.message || "Ocurrió un error al subir la foto.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachmentSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedAttachmentFile(file);
      setError("");
      setSuccessMessage("");
    }
  };

  const uploadAttachment = async () => {
    if (!selectedAttachmentFile || !doctor?.id) {
      setError("Por favor, selecciona un archivo y asegúrate de que haya un doctor cargado.");
      return;
    }
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    const formData = new FormData();
    formData.append("file", selectedAttachmentFile);
    const authToken = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctores/${doctor.id}/attachments`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData,
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Error al subir el adjunto." }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      const newAttachment = await response.json();
      setDoctor((prevDoctor) => ({
        ...prevDoctor,
        attachments: [...(prevDoctor.attachments || []), newAttachment],
      }));
      setSelectedAttachmentFile(null);
      const attachmentInput = document.getElementById("attachment-file-input");
      if (attachmentInput) attachmentInput.value = ""; // Resetear el input
      setSuccessMessage(`Archivo "${newAttachment.file_name}" subido exitosamente.`);
      if (onProfileUpdate) onProfileUpdate(doctor.id);
    } catch (err) {
      console.error("Error al subir adjunto:", err);
      setError(err.message || "Ocurrió un error al subir el adjunto.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId, attachmentName) => {
    if (!doctor?.id) return;
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el archivo "${attachmentName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctores/${doctor.id}/attachments/${attachmentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Error al eliminar el adjunto." }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      setDoctor((prevDoctor) => ({
        ...prevDoctor,
        attachments: prevDoctor.attachments.filter((att) => att.id !== attachmentId),
      }));
      setSuccessMessage(`Archivo "${attachmentName}" eliminado exitosamente.`);
      if (onProfileUpdate) onProfileUpdate(doctor.id); // Notificar al padre que los datos cambiaron
    } catch (err) {
      console.error("Error al eliminar adjunto:", err);
      setError(err.message || "Ocurrió un error al eliminar el adjunto.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!doctor) {
    return (
      <div style={profileStyles.container}>
        <p>No se ha seleccionado un doctor para ver el perfil.</p>
        <button onClick={onBack} style={profileStyles.backButton}>
          &larr; Volver a la Tabla
        </button>
      </div>
    );
  }

  const displayField = (label, value) => (
    <div style={profileStyles.fieldPair}>
      <span style={profileStyles.fieldLabel}>{label}:</span>
      <span style={profileStyles.fieldValue}>
        {value === null || value === undefined || String(value).trim() === ""
          ? "No especificado"
          : String(value)}
      </span>
    </div>
  );

  const currentProfilePicUrl = profilePicPreviewUrl || doctor.profile_pic_url;

  return (
    <div style={profileStyles.mainLayout}>
      <div style={profileStyles.infoColumn}>
        <div style={profileStyles.header}>
          <h1 style={profileStyles.title}>Expediente del Doctor</h1>
          <button onClick={onBack} style={profileStyles.backButton}>
            &larr; Volver a la Tabla
          </button>
        </div>
        <div style={profileStyles.sectionTitle}>Información Personal</div>
        <div style={{ ...profileStyles.gridContainer, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            {displayField("Nombre Completo", doctor.nombre_completo)}
            {displayField("CURP", doctor.curp)}
            {displayField("RFC", doctor.rfc)}
            {displayField("Teléfono", doctor.telefono)}
            {displayField("Correo Electrónico", doctor.correo_electronico)}
          </div>
          <div>
            {displayField("Fecha de Nacimiento", doctor.fecha_nacimiento)}
            {displayField("Sexo", doctor.sexo)}
            {displayField("Entidad de Nacimiento", doctor.entidad_nacimiento)}
          </div>
        </div>
        <div style={profileStyles.sectionTitle}>Información Profesional y Adscripción</div>
        <div style={{ ...profileStyles.gridContainer, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            {displayField("Especialidad", doctor.especialidad)}
            {displayField("Cédula Profesional", doctor.cedula_profesional)}
            {displayField("Estatus", doctor.estatus)}
            {displayField("Unidad Médica", doctor.unidad_medica)}
            {displayField("Consultorio", doctor.consultorio)}
          </div>
          <div>
            {displayField("Turno", doctor.turno)}
            {displayField("Identificador IMSS", doctor.identificador_imss)}
            {displayField("Fecha de Notificación", doctor.fecha_notificacion)}
            {displayField("Fecha de Estatus", doctor.fecha_estatus)}
            {displayField("Fecha de Vuelo", doctor.fecha_vuelo)}
          </div>
        </div>
      </div>

      <div style={profileStyles.filesColumn}>
        <div style={profileStyles.profilePicSection}>
          <h2>Foto de Perfil</h2>
          {currentProfilePicUrl ? (
            <img src={currentProfilePicUrl} alt="Foto de perfil" style={profileStyles.profileImage} />
          ) : (
            <div style={profileStyles.profileImagePlaceholder}><span>Sin Foto</span></div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleProfilePicSelect}
            style={profileStyles.fileInput}
            disabled={isLoading}
          />
          {selectedProfilePicFile && (
            <button onClick={uploadProfilePic} disabled={isLoading} style={profileStyles.uploadButton}>
              {isLoading ? "Subiendo Foto..." : "Subir Foto"}
            </button>
          )}
        </div>

        <div style={profileStyles.attachmentsSection}>
          <h2>Expedientes Adjuntos</h2>
          {(doctor.attachments && doctor.attachments.length > 0) ? (
            <ul style={profileStyles.attachmentList}>
              {doctor.attachments.map((file) => (
                <li key={file.id} style={profileStyles.attachmentItem}>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={profileStyles.attachmentLink}
                    title={file.file_name}
                  >
                    {file.file_name && file.file_name.length > 35 ? `${file.file_name.substring(0, 32)}...` : file.file_name}
                  </a>
                  <button
                    onClick={() => handleDeleteAttachment(file.id, file.file_name)}
                    disabled={isLoading}
                    style={profileStyles.deleteAttachmentButton}
                    title={`Eliminar ${file.file_name}`}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p style={profileStyles.noAttachments}>No hay expedientes adjuntos.</p>
          )}
          <input
            id="attachment-file-input"
            type="file"
            accept=".pdf,.doc,.docx,image/*" // Ampliado para incluir .doc y .docx
            onChange={handleAttachmentSelect}
            style={profileStyles.fileInput}
            disabled={isLoading}
          />
          {selectedAttachmentFile && (
            <button onClick={uploadAttachment} disabled={isLoading} style={profileStyles.uploadButton}>
              {isLoading ? "Subiendo Adjunto..." : "Subir Adjunto"}
            </button>
          )}
        </div>

        {isLoading && <p style={profileStyles.loadingMessage}>Procesando...</p>}
        {error && <p style={profileStyles.errorMessage}>{error}</p>}
        {successMessage && <p style={profileStyles.successMessage}>{successMessage}</p>}
      </div>
    </div>
  );
}

export default DoctorProfileView;
