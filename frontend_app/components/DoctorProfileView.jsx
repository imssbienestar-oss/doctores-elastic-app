// src/components/DoctorProfileView.jsx
import React, { useState, useEffect } from "react";

// profileStyles puede permanecer aquí ya que FieldRenderer lo accederá directamente
// si está en el mismo scope de módulo.
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
    // marginRight: '10px', // Estaba en el código anterior, revisa si lo necesitas para el layout
  },
  editButton: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
    marginLeft: "10px",
  },
  saveButton: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
    marginLeft: "10px",
  },
  cancelButton: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
    marginLeft: "10px",
  },
  uploadButton: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
    marginLeft: "10px",
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
    minWidth: "180px", // Ajusta para alinear labels y inputs
  },
  fieldValue: {
    color: "#333",
    textAlign: "left",
    wordBreak: "break-word",
  },
  fieldInput: {
    // Estilo para los inputs en modo edición
    width: "100%",
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxSizing: "border-box", // Importante para que el padding no aumente el ancho total
  },
  gridContainer: {
    display: "grid",
    gap: "20px",
  },
  fieldPair: {
    display: "grid",
    gridTemplateColumns: "auto 1fr", // label auto, input 1fr
    gap: "0 10px",
    alignItems: "center", // Alinea verticalmente el label y el input
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
    margin: "10px auto",
    padding: "5px",
  },
  attachmentList: {
    listStyle: "none",
    padding: 0,
    textAlign: "left",
  },
  attachmentItem: {
    padding: "8px 5px",
    borderBottom: "1px dotted #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.9em",
  },
  attachmentLink: {
    textDecoration: "none",
    color: "#007bff",
    flexGrow: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginRight: "10px",
  },
  deleteAttachmentButton: {
    background: "none",
    border: "none",
    color: "red",
    cursor: "pointer",
    fontSize: "1.2em",
    padding: "0 5px",
    fontWeight: "bold",
  },
  noAttachments: {
    color: "#777",
    fontStyle: "italic",
    textAlign: "center",
    padding: "10px 0",
  },
  loadingMessage: {
    marginTop: "10px",
    fontStyle: "italic",
    color: "#555",
    textAlign: "center",
  },
  errorMessage: {
    marginTop: "10px",
    fontStyle: "italic",
    color: "red",
    textAlign: "center",
  },
  successMessage: {
    marginTop: "10px",
    fontStyle: "italic",
    color: "green",
    textAlign: "center",
  },
  buttonsContainer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Define FieldRenderer FUERA de DoctorProfileView y envuélvelo con React.memo
const FieldRenderer = React.memo(
  ({
    label,
    fieldName,
    type = "text",
    options = [],
    isEditing,
    currentValue, // Usaremos una prop 'currentValue'
    onChange,
    isLoading,
  }) => {
    // Determina el valor para mostrar o editar
    // Para inputs, un string vacío es mejor que null/undefined para evitar warnings de React (controlled/uncontrolled)
    const valueForInput =
      currentValue === null || currentValue === undefined ? "" : currentValue;

    // Determina el valor para visualización (cuando no se está editando)
    const valueForDisplay =
      currentValue === null ||
      currentValue === undefined ||
      String(currentValue).trim() === ""
        ? "No especificado"
        : String(currentValue);

    if (fieldName === "correo_electronico" && !isEditing) {
      // console.log(`FieldRenderer (Display) - ${label}: `, valueForDisplay, "(Original:", currentValue, ")");
    }
    if (fieldName === "correo_electronico" && isEditing) {
      // console.log(`FieldRenderer (Edit) - ${label}: `, valueForInput);
    }

    return (
      <div style={profileStyles.fieldPair}>
        <label htmlFor={fieldName} style={profileStyles.fieldLabel}>
          {label}:
        </label>{" "}
        {/* Añadido htmlFor */}
        {isEditing ? (
          type === "select" ? (
            <select
              id={fieldName} // Añadido id
              name={fieldName}
              value={valueForInput} // Usar valueForInput
              onChange={onChange}
              style={profileStyles.fieldInput}
              disabled={isLoading}
            >
              <option value="">Seleccionar...</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={fieldName} // Añadido id
              type={type}
              name={fieldName}
              value={valueForInput} // Usar valueForInput
              onChange={onChange}
              style={profileStyles.fieldInput}
              disabled={isLoading}
            />
          )
        ) : (
          <span style={profileStyles.fieldValue}>{valueForDisplay}</span>
        )}
      </div>
    );
  }
);
FieldRenderer.displayName = "FieldRenderer"; // Ayuda en React DevTools

function DoctorProfileView({ doctor: initialDoctor, onBack, onProfileUpdate }) {
  const [doctor, setDoctor] = useState(initialDoctor);
  const [editableDoctorData, setEditableDoctorData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [selectedProfilePicFile, setSelectedProfilePicFile] = useState(null);
  const [profilePicPreviewUrl, setProfilePicPreviewUrl] = useState(null);
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setDoctor(initialDoctor);
    if (initialDoctor) {
      setEditableDoctorData({ ...initialDoctor });
    } else {
      setEditableDoctorData(null);
    }
    // No resetear isEditing aquí si initialDoctor cambia debido a una actualización
    // setIsEditing(false); // Podría causar que se salga del modo edición prematuramente
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

  const handleEditToggle = () => {
    if (isEditing) {
      setEditableDoctorData({ ...doctor });
      setError("");
    } else {
      if (doctor) setEditableDoctorData({ ...doctor });
    }
    setIsEditing(!isEditing);
    setSuccessMessage("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditableDoctorData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!editableDoctorData || !doctor?.id) {
      setError("No hay datos del doctor para guardar.");
      return;
    }
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    const authToken = localStorage.getItem("authToken");

    const { profile_pic_url, attachments, id, ...dataToUpdate } =
      editableDoctorData;

    Object.keys(dataToUpdate).forEach((key) => {
      if (key.startsWith("fecha_") && dataToUpdate[key] === "") {
        dataToUpdate[key] = null;
      }
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctores/${doctor.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(dataToUpdate),
        }
      );

      const responseDataText = await response.text(); // Leer como texto primero

      if (!response.ok) {
        let errorDetail = `Error ${response.status}`;
        try {
          const errorJson = JSON.parse(responseDataText); // Intentar parsear como JSON
          errorDetail = errorJson.detail || JSON.stringify(errorJson);
        } catch (parseError) {
          errorDetail =
            responseDataText ||
            `Error ${response.status} al actualizar (sin detalle JSON).`;
        }
        console.error("Error response text from server:", responseDataText);
        throw new Error(errorDetail);
      }

      const updatedDoctor = JSON.parse(responseDataText); // Parsear el texto a JSON

      console.log(
        "Datos del doctor actualizados desde el backend (objeto completo):",
        updatedDoctor
      );
      if (
        Object.prototype.hasOwnProperty.call(
          updatedDoctor,
          "correo_electronico"
        )
      ) {
        console.log(
          "Correo electrónico del backend:",
          updatedDoctor.correo_electronico
        );
      } else {
        console.warn(
          "El campo 'correo_electronico' NO vino en la respuesta del backend."
        );
      }

      setDoctor(updatedDoctor);
      setEditableDoctorData({ ...updatedDoctor });
      setIsEditing(false); // Salir del modo edición
      setSuccessMessage("Perfil del doctor actualizado exitosamente.");
      if (onProfileUpdate) onProfileUpdate(updatedDoctor.id);
    } catch (err) {
      console.error("Error al actualizar perfil:", err.message); // err.message ya debería ser el string
      setError(err.message || "Ocurrió un error al actualizar el perfil.");
    } finally {
      setIsLoading(false);
    }
  };

  // ... (resto de tus funciones: handleProfilePicSelect, uploadProfilePic, etc. sin cambios)
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
      setError(
        "Por favor, selecciona una foto y asegúrate de que haya un doctor cargado."
      );
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
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Error al subir la foto." }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      const updatedDoctorData = await response.json(); // Aquí esperamos DoctorDetail

      // Actualizar el estado 'doctor' completamente con la respuesta
      setDoctor(updatedDoctorData);
      if (isEditing) {
        setEditableDoctorData({ ...updatedDoctorData });
      }

      setSelectedProfilePicFile(null);
      setProfilePicPreviewUrl(null); // La URL vendrá de updatedDoctorData.profile_pic_url
      setSuccessMessage("Foto de perfil actualizada exitosamente.");
      if (onProfileUpdate) onProfileUpdate(updatedDoctorData.id); // Usa el ID de la respuesta
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
      setError(
        "Por favor, selecciona un archivo y asegúrate de que haya un doctor cargado."
      );
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
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Error al subir el adjunto." }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      const newAttachment = await response.json(); // Esto es un DoctorAttachment, no el Doctor completo

      // Actualizar el array de attachments en el estado 'doctor' y 'editableDoctorData'
      const updatedAttachmentsList = [
        ...(doctor.attachments || []),
        newAttachment,
      ];
      setDoctor((prevDoctor) => ({
        ...prevDoctor,
        attachments: updatedAttachmentsList,
      }));
      if (isEditing) {
        setEditableDoctorData((prev) => ({
          ...prev,
          attachments: updatedAttachmentsList,
        }));
      }

      setSelectedAttachmentFile(null);
      const attachmentInput = document.getElementById("attachment-file-input");
      if (attachmentInput) attachmentInput.value = "";
      setSuccessMessage(
        `Archivo "${newAttachment.file_name}" subido exitosamente.`
      );
      if (onProfileUpdate) onProfileUpdate(doctor.id); // Notificar que algo cambió
    } catch (err) {
      console.error("Error al subir adjunto:", err);
      setError(err.message || "Ocurrió un error al subir el adjunto.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId, attachmentName) => {
    if (!doctor?.id) return;
    if (
      !window.confirm(
        `¿Estás seguro de que quieres eliminar el archivo "${attachmentName}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
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
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Error al eliminar el adjunto." }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      const filteredAttachments = doctor.attachments.filter(
        (att) => att.id !== attachmentId
      );
      setDoctor((prevDoctor) => ({
        ...prevDoctor,
        attachments: filteredAttachments,
      }));
      if (isEditing) {
        setEditableDoctorData((prev) => ({
          ...prev,
          attachments: filteredAttachments,
        }));
      }
      setSuccessMessage(`Archivo "${attachmentName}" eliminado exitosamente.`);
      if (onProfileUpdate) onProfileUpdate(doctor.id);
    } catch (err) {
      console.error("Error al eliminar adjunto:", err);
      setError(err.message || "Ocurrió un error al eliminar el adjunto.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!doctor && !initialDoctor) {
    return (
      <div style={profileStyles.container}>
        <p>Cargando perfil del doctor o no se ha seleccionado un doctor.</p>
        <button onClick={onBack} style={profileStyles.backButton}>
          &larr; Volver a la Tabla
        </button>
      </div>
    );
  }

  if (!doctor || !editableDoctorData) {
    return (
      <div style={profileStyles.container}>
        <p>Cargando datos...</p>
      </div>
    );
  }

  const currentProfilePicUrl =
    profilePicPreviewUrl || (doctor ? doctor.profile_pic_url : null);

  return (
    <div style={profileStyles.mainLayout}>
      <div style={profileStyles.infoColumn}>
        <div style={profileStyles.header}>
          <h1 style={profileStyles.title}>Expediente del Doctor</h1>
          <div style={profileStyles.buttonsContainer}>
            <button
              onClick={onBack}
              style={profileStyles.backButton}
              disabled={isLoading && isEditing}
            >
              &larr; Volver a la Tabla
            </button>
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveProfile}
                  style={profileStyles.saveButton}
                  disabled={isLoading}
                >
                  {isLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
                <button
                  onClick={handleEditToggle}
                  style={profileStyles.cancelButton}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={handleEditToggle}
                style={profileStyles.editButton}
                disabled={isLoading}
              >
                Editar Expediente
              </button>
            )}
          </div>
        </div>

        {isLoading && !selectedProfilePicFile && !selectedAttachmentFile && (
          <p style={profileStyles.loadingMessage}>
            Procesando cambios del perfil...
          </p>
        )}
        {error && <p style={profileStyles.errorMessage}>{error}</p>}
        {successMessage && (
          <p style={profileStyles.successMessage}>{successMessage}</p>
        )}

        <div style={profileStyles.sectionTitle}>Información Personal</div>
        <div
          style={{
            ...profileStyles.gridContainer,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div>
            <FieldRenderer
              label="Nombre Completo"
              fieldName="nombre_completo"
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.nombre_completo
                  : doctor.nombre_completo
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="CURP"
              fieldName="curp"
              isEditing={isEditing}
              currentValue={isEditing ? editableDoctorData.curp : doctor.curp}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            {/* CORREGIDO: fieldName para telefono */}
            <FieldRenderer
              label="Teléfono"
              fieldName="tel"
              type="tel"
              isEditing={isEditing}
              currentValue={isEditing ? editableDoctorData.tel : doctor.tel}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Correo Electrónico"
              fieldName="correo_electronico"
              type="email"
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.correo_electronico
                  : doctor.correo_electronico
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
          </div>
          <div>
            <FieldRenderer
              label="Fecha de Nacimiento"
              fieldName="fecha_nacimiento"
              type="date"
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.fecha_nacimiento
                  : doctor.fecha_nacimiento
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Sexo"
              fieldName="sexo"
              type="select"
              options={[
                { value: "M", label: "Masculino" }, // Asegúrate que estos values coincidan con lo que espera/tiene tu DB
                { value: "F", label: "Femenino" },
                { value: "Otro", label: "Otro" }, // O el valor que uses, ej. 'O'
              ]}
              isEditing={isEditing}
              currentValue={isEditing ? editableDoctorData.sexo : doctor.sexo}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Entidad de Nacimiento"
              fieldName="entidad_nacimiento"
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.entidad_nacimiento
                  : doctor.entidad_nacimiento
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Matrimonio ID"
              fieldName="matrimonio_id" // Idem
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.matrimonio_id
                  : doctor.matrimonio_id
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div style={profileStyles.sectionTitle}>
          Información Profesional y Adscripción
        </div>
        <div
          style={{
            ...profileStyles.gridContainer,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div>
            <FieldRenderer
              label="Especialidad"
              fieldName="especialidad"
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.especialidad
                  : doctor.especialidad
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Cédula Licenciatura"
              fieldName="cedula_lic" // Asegúrate que 'cedula_lic' es el campo correcto en tus objetos doctor/editableDoctorData
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.cedula_lic : doctor.cedula_lic
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Cédula Especialidad"
              fieldName="cedula_esp" // Idem para 'cedula_esp'
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.cedula_esp : doctor.cedula_esp
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Estatus"
              fieldName="estatus"
              type="select"
              options={[
                { value: "Activo", label: "Activo" },
                { value: "Baja", label: "Baja" },
                {
                  value: "Incapacidad por Enfermedad",
                  label: "Incapacidad por Enfermedad",
                },
                { value: "Retiro Temporal", label: "Retiro Temporal" },
                { value: "Solicitud Personal", label: "Solicitud Personal" },
              ]}
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.estatus : doctor.estatus
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />

            <FieldRenderer
             label="Entidad Laborando"
             fieldName="entidad" // Idem para 'cedula_esp'
             isEditing={isEditing}
             currentValue={
               isEditing ? editableDoctorData.entidad : doctor.entidad
             }
             onChange={handleInputChange}
             isLoading={isLoading}
            />
            <FieldRenderer
              label="Unidad Médica"
              fieldName="nombre_unidad"
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.nombre_unidad
                  : doctor.nombre_unidad
              } // Asumiendo que este campo se llama 'unidad_medica' en tus datos
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Nivel de Atención"
              fieldName="nivel_atencion"
              type="select"
              options={[
                { value: "PRIMER NIVEL", label: "PRIMER NIVEL" }, // Asegúrate que estos values coincidan con lo que espera/tiene tu DB
                { value: "SEGUNDO NIVEL", label: "SEGUNDO NIVEL" },
                { value: "TERCER NIVEL", label: "TERCER NIVEL" }, // O el valor que uses, ej. 'O'
              ]}
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.nivel_atencion
                  : doctor.nivel_atencion
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
          </div>
          <div>
            <FieldRenderer
              label="Turno"
              fieldName="turno"
              type="select"
              options={[
                { value: "Jornada Acumulada", label: "Jornada Acumulada" },
                { value: "Matutino", label: "Matutino" },
                { value: "Nocturno A", label: "Nocturno A" },
                { value: "Nocturno B", label: "Nocturno B" },
                { value: "Vespertino", label: "Vespertino" },
              ]}
              isEditing={isEditing}
              currentValue={isEditing ? editableDoctorData.turno : doctor.turno}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Fecha de Notificación"
              fieldName="fecha_notificacion"
              type="date"
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.fecha_notificacion
                  : doctor.fecha_notificacion
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Fecha de Estatus"
              fieldName="fecha_estatus"
              type="date"
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.fecha_estatus
                  : doctor.fecha_estatus
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Fecha de Vuelo"
              fieldName="fecha_vuelo"
              type="date"
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.fecha_vuelo : doctor.fecha_vuelo
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      <div style={profileStyles.filesColumn}>
        {/* ... (resto de la columna de archivos sin cambios) ... */}
        <div style={profileStyles.profilePicSection}>
          <h2>Foto de Perfil</h2>
          {currentProfilePicUrl ? (
            <img
              src={currentProfilePicUrl}
              alt="Foto de perfil"
              style={profileStyles.profileImage}
            />
          ) : (
            <div style={profileStyles.profileImagePlaceholder}>
              <span>Sin Foto</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleProfilePicSelect}
            style={profileStyles.fileInput}
            disabled={isLoading || isEditing}
          />
          {selectedProfilePicFile && (
            <button
              onClick={uploadProfilePic}
              disabled={isLoading || isEditing}
              style={profileStyles.uploadButton}
            >
              {isLoading ? "Subiendo Foto..." : "Subir Foto"}
            </button>
          )}
        </div>

        <div style={profileStyles.attachmentsSection}>
          <h2>Expedientes Adjuntos</h2>
          {doctor.attachments && doctor.attachments.length > 0 ? (
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
                    {file.file_name && file.file_name.length > 35
                      ? `${file.file_name.substring(0, 32)}...`
                      : file.file_name}
                  </a>
                  <button
                    onClick={() =>
                      handleDeleteAttachment(file.id, file.file_name)
                    }
                    disabled={isLoading || isEditing}
                    style={profileStyles.deleteAttachmentButton}
                    title={`Eliminar ${file.file_name}`}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p style={profileStyles.noAttachments}>
              No hay expedientes adjuntos.
            </p>
          )}
          <input
            id="attachment-file-input"
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            onChange={handleAttachmentSelect}
            style={profileStyles.fileInput}
            disabled={isLoading || isEditing}
          />
          {selectedAttachmentFile && (
            <button
              onClick={uploadAttachment}
              disabled={isLoading || isEditing}
              style={profileStyles.uploadButton}
            >
              {isLoading ? "Subiendo Adjunto..." : "Subir Adjunto"}
            </button>
          )}
        </div>
        {isLoading && (selectedProfilePicFile || selectedAttachmentFile) && (
          <p style={profileStyles.loadingMessage}>Procesando archivo...</p>
        )}
      </div>
    </div>
  );
}

export default DoctorProfileView;
