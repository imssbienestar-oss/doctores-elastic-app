// src/components/DoctorProfileView.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../src/contexts/AuthContext";

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
  idStyle: {
    fontSize: ".8em", // Más pequeño que el título
    color: "#6c757d", // Un color secundario
    fontWeight: "500",
    marginLeft: "10px", // Espacio entre el título y el ID
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
    marginLeft: "100px",
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
  defuncionMessage: {
    // Nuevo estilo para el mensaje de defunción
    color: "red",
    fontWeight: "bold",
    textAlign: "center",
    padding: "10px",
    border: "1px solid red",
    borderRadius: "4px",
    backgroundColor: "#ffe0e0",
    marginTop: "15px",
    marginBottom: "15px",
  },
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// --- FUNCIÓN PARA FORMATEAR FECHAS YYYY-MM-DD a DD/MM/YYYY ---
const formatDateForDisplay = (isoDateString) => {
  if (!isoDateString || typeof isoDateString !== "string") {
    return "No especificado"; // O devuelve una cadena vacía: ""
  }
  // Asume que isoDateString es como "YYYY-MM-DD"
  const parts = isoDateString.split("-");
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    // Validar que sean números (básico)
    if (
      !isNaN(parseInt(year)) &&
      !isNaN(parseInt(month)) &&
      !isNaN(parseInt(day))
    ) {
      // Re-formatear a DD/MM/YYYY
      return `${day}/${month}/${year}`;
    }
  }
  // Si no es el formato esperado o es inválido, devuelve el original o un placeholder
  return isoDateString; // O "Fecha inválida"
};
// --- FIN FUNCIÓN ---

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
    disabled = false,
  }) => {
    const valueForInput =
      currentValue === null || currentValue === undefined ? "" : currentValue;

    let valueForDisplay;
    // Lista de campos que son fechas y deben formatearse para visualización
    const dateFieldsToFormat = [
      "fecha_nacimiento",
      "fecha_notificacion",
      "fecha_estatus",
      "fecha_vuelo",
      "fecha_fallecimiento",
      "fecha_extraccion", // Si fecha_extraccion también es YYYY-MM-DD
      "fecha_inicio",
      "fecha_fin",
      "fecha_egreso_esp",
      "fecha_egreso_lic",
    ];

    if (!isEditing && dateFieldsToFormat.includes(fieldName) && currentValue) {
      valueForDisplay = formatDateForDisplay(currentValue);
    } else {
      valueForDisplay =
        currentValue === null ||
        currentValue === undefined ||
        String(currentValue).trim() === ""
          ? "No especificado"
          : String(currentValue);
    }
    return (
      <div style={profileStyles.fieldPair}>
        <label htmlFor={fieldName} style={profileStyles.fieldLabel}>
          {label}:
        </label>
        {isEditing ? (
          type === "select" ? (
            <select
              id={fieldName}
              name={fieldName}
              value={valueForInput}
              onChange={onChange}
              style={profileStyles.fieldInput}
              disabled={isLoading || disabled}
            >
              <option value="">Seleccionar...</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : type === "textarea" ? (
            <textarea
              id={fieldName}
              name={fieldName}
              value={valueForInput}
              onChange={onChange}
              style={{
                ...profileStyles.fieldInput,
                height: "100px",
                resize: "vertical",
              }}
              disabled={isLoading || disabled}
              rows={4}
            />
          ) : (
            <input
              id={fieldName}
              type={type}
              name={fieldName}
              value={valueForInput}
              onChange={onChange}
              style={profileStyles.fieldInput}
              disabled={isLoading || disabled}
            />
          )
        ) : (
          <span style={profileStyles.fieldValue}>{valueForDisplay}</span>
        )}
      </div>
    );
  }
);
FieldRenderer.displayName = "FieldRenderer";

function DoctorProfileView({ doctor: initialDoctor, onBack, onProfileUpdate }) {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role; // Obtener el rol del usuario

  const [doctor, setDoctor] = useState(initialDoctor);
  const [editableDoctorData, setEditableDoctorData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [selectedProfilePicFile, setSelectedProfilePicFile] = useState(null);
  const [profilePicPreviewUrl, setProfilePicPreviewUrl] = useState(null);
  const [selectedAttachmentFile, setSelectedAttachmentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const doctorGuardadoEsDefuncion = doctor?.estatus === "Defunción";
  const puedeEditarAdminRegistroDefuncion = userRole === "admin";
  // El perfil general está bloqueado para edición si es Defunción Y el usuario actual NO es admin.
  const edicionGeneralBloqueada =
    doctorGuardadoEsDefuncion && !puedeEditarAdminRegistroDefuncion;

  useEffect(() => {
    setDoctor(initialDoctor);
    if (initialDoctor) {
      const defaultFormValuesForAllFields = {
        telefono: "",
        correo_electronico: "",
        fecha_nacimiento: "",
        entidad_nacimiento: "",
        cedula_lic: "",
        cedula_esp: "",
        nombre_unidad: "",
        nivel_atencion: "Seleccionar..",
        turno: "",
        fecha_notificacion: "",
        notificacion_baja: "",
        fecha_extraccion: "",
        motivo_baja: "",
        fecha_fallecimiento: "",
        fecha_estatus: "",
        despliegue: "",
        fecha_vuelo: "",
        estrato: "",
        acuerdo: "",
        comentarios_estatus: "",
        matrimonio_id: "",
        fecha_inicio: "",
        fecha_fin: "",
        motivo: "",
        tipo_incapacidad: "",
        // No incluyas aquí los campos que SÍ o SÍ vienen de initialDoctor del paso 1,
        // como nombre_completo, estatus, curp, especialidad, id.
      };
      setEditableDoctorData({
        ...defaultFormValuesForAllFields, // Primero los defaults para todos los campos posibles
        ...initialDoctor, // Luego sobrescribe con lo que realmente trae initialDoctor
      });
    } else {
      setEditableDoctorData(null);
    }
    // ... resto del useEffect ...
  }, [initialDoctor, userRole]);

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
    if (edicionGeneralBloqueada) {
      setError(
        "Este registro está cerrado por defunción y su rol actual no permite modificarlo."
      );
      return;
    }

    if (isEditing) {
      setEditableDoctorData({
        comentarios_estatus: doctor.comentarios_estatus || "",
        motivo_baja: doctor.motivo_baja || "",
        fecha_fallecimiento: doctor.fecha_fallecimiento || "",
        ...doctor,
      });
      setError("");
    } else {
      if (doctor)
        setEditableDoctorData({
          comentarios_estatus: doctor.comentarios_estatus || "",
          fecha_fallecimiento: doctor.fecha_fallecimiento || "",
          ...doctor,
        });
    }
    setIsEditing(!isEditing);
    setSuccessMessage("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newData = { ...editableDoctorData, [name]: value };

    // Si el campo que cambió es el ESTATUS, aplicamos las reglas de negocio
    if (name === "estatus") {
      const nuevoEstatus = value;

      // Campos que pertenecen a un doctor activo o en despliegue
      const camposActividad = [
        "direccion_unidad",
        "tipo_establecimiento",
        "subtipo_establecimiento",
        "municipio",
        "region",
        "turno",
        "nivel_atencion",
      ];
      // Campos que pertenecen a un doctor dado de baja
      const camposBaja = [
        "fecha_extraccion",
        "motivo_baja",
        "fecha_notificacion",
        "forma_notificacion",
      ];

      const camposIncapacidad = [
        "tipo_incapacidad",
        "fecha_inicio",
        "fecha_fin",
      ];

      const camposRetiro = ["motivo", "fecha_inicio", "fecha_fin"];

      const camposSolicitud = ["motivo", "fecha_inicio", "fecha_fin"];

      if (nuevoEstatus === "05 BAJA") {
        // Si el estatus es BAJA, limpiamos los campos de actividad
        camposActividad.forEach((campo) => {
          newData[campo] = null;
        });
      } else {
        // Si el estatus NO es BAJA, limpiamos los campos de baja
        camposBaja.forEach((campo) => {
          newData[campo] = null;
        });
      }

      // Regla para Defunción (si es diferente de Baja)
      if (nuevoEstatus !== "Defunción") {
        newData.fecha_fallecimiento = null;
      }
    }
    setEditableDoctorData(newData);
  };

  const handleSaveProfile = async () => {
    if (!editableDoctorData || !doctor?.id_imss) {
      setError("No hay datos del doctor para guardar.");
      return;
    }
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    const authToken = localStorage.getItem("authToken");

    const { attachments, foto_url, ...dataToUpdate } = editableDoctorData;

    Object.keys(dataToUpdate).forEach((key) => {
      if (
        (key.startsWith("fecha_") || key.startsWith("vigencia_")) &&
        dataToUpdate[key] === ""
      ) {
        dataToUpdate[key] = null;
      }
    });

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctores/${doctor.id_imss}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(dataToUpdate),
        }
      );
      const responseDataText = await response.text();
      if (!response.ok) {
        let errorDetail = `Error ${response.status}`;
        try {
          const errorJson = JSON.parse(responseDataText);
          errorDetail =
            typeof errorJson.detail === "string"
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        } catch (parseError) {
          errorDetail =
            responseDataText || `Error ${response.status} al actualizar.`;
        }
        console.error("Error response from server:", responseDataText);
        throw new Error(errorDetail);
      }

      const updatedDoctor = JSON.parse(responseDataText);
      setDoctor(updatedDoctor);
      setEditableDoctorData({ ...updatedDoctor });
      setIsEditing(false);
      setSuccessMessage("Perfil actualizado.");
      if (onProfileUpdate) onProfileUpdate(updatedDoctor.id_imss);
    } catch (err) {
      console.error("Error saving profile:", err.message);
      setError(err.message || "Error al guardar.");
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
    if (!selectedProfilePicFile || !doctor?.id_imss) {
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
        `${API_BASE_URL}/api/doctores/${doctor.id_imss}/profile-picture`,
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
      if (onProfileUpdate) onProfileUpdate(updatedDoctorData.id_imss); // Usa el ID de la respuesta
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
    if (!selectedAttachmentFile || !doctor?.id_imss) {
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
        `${API_BASE_URL}/api/doctores/${doctor.id_imss}/attachments`,
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
      if (onProfileUpdate) onProfileUpdate(doctor.id_imss); // Notificar que algo cambió
    } catch (err) {
      console.error("Error al subir adjunto:", err);
      setError(err.message || "Ocurrió un error al subir el adjunto.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId, attachmentName) => {
    if (!doctor?.id_imss) return;
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
        `${API_BASE_URL}/api/doctores/${doctor.id_imss}/attachments/${attachmentId}`,
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
      if (onProfileUpdate) onProfileUpdate(doctor.id_imss);
    } catch (err) {
      console.error("Error al eliminar adjunto:", err);
      setError(err.message || "Ocurrió un error al eliminar el adjunto.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialDoctor && !doctor) {
    return (
      <div style={profileStyles.container}>
        <p>No se ha seleccionado un doctor para ver el perfil.</p>
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

  const estatusActualParaUI = editableDoctorData.estatus;
  const esEstatusDeBaja = estatusActualParaUI === "05 BAJA";
  const esEstatusDeDefuncion = estatusActualParaUI === "Defunción";
  const esEstatusDeRetiro = estatusActualParaUI === "02 RETIRO TEMP.";
  const esEstatusDeSolicitud = estatusActualParaUI === "03 SOL. PERSONAL";
  const esEstatusDeIncapacidad = estatusActualParaUI === "04 INCAPACIDAD";
  const currentProfilePicUrl = profilePicPreviewUrl || doctor.foto_url || null;

  return (
    <div style={profileStyles.mainLayout}>
      <div style={profileStyles.infoColumn}>
        <div style={profileStyles.header}>
          <h1 style={profileStyles.title}>
            Expediente del Doctor
            <span style={profileStyles.idStyle}>({doctor.id_imss})</span>
          </h1>
          <div style={profileStyles.buttonsContainer}>
            <button
              onClick={onBack}
              style={profileStyles.backButton}
              disabled={isLoading && isEditing}
            >
              &larr; Volver
            </button>

            {currentUser && currentUser.role !== "consulta" && (
              <>
                {!edicionGeneralBloqueada &&
                  (isEditing ? (
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
                  ))}
              </>
            )}
          </div>
        </div>

        {doctorGuardadoEsDefuncion && (
          <div style={profileStyles.defuncionMessage}>
            EXPEDIENTE CERRADO POR DEFUNCIÓN
          </div>
        )}

        {isLoading && !selectedProfilePicFile && !selectedAttachmentFile && (
          <p style={profileStyles.loadingMessage}>Procesando...</p>
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
              label="Nombres"
              fieldName="nombre"
              isEditing={isEditing}
              currentValue={editableDoctorData.nombre}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Apellido Paterno"
              fieldName="apellido_paterno"
              isEditing={isEditing}
              currentValue={editableDoctorData.apellido_paterno}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Apellido Materno"
              fieldName="apellido_materno"
              isEditing={isEditing}
              currentValue={editableDoctorData.apellido_materno}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="CURP"
              fieldName="curp"
              isEditing={isEditing}
              currentValue={editableDoctorData.curp}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Pasaporte"
              fieldName="pasaporte"
              isEditing={isEditing}
              currentValue={editableDoctorData.pasaporte}
              onChange={handleInputChange}
              isLoading={isLoading}
            />

            <FieldRenderer
              label="Fecha Emision"
              fieldName="fecha_emision"
              type="date"
              isEditing={isEditing}
              currentValue={editableDoctorData.fecha_emision}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Fecha Expiración"
              fieldName="fecha_expiracion"
              type="date"
              isEditing={isEditing}
              currentValue={editableDoctorData.fecha_expiracion}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
          </div>
          <div>
            <FieldRenderer
              label="Sexo"
              fieldName="sexo"
              type="select"
              options={[
                { value: "M", label: "Masculino" },
                { value: "F", label: "Femenino" },
                { value: "Otro", label: "Otro" },
              ]}
              isEditing={isEditing}
              currentValue={editableDoctorData.sexo}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Fecha de Nacimiento"
              fieldName="fecha_nacimiento"
              type="date"
              isEditing={isEditing}
              currentValue={editableDoctorData.fecha_nacimiento}
              onChange={handleInputChange}
              isLoading={isLoading}
            />

            <FieldRenderer
              label="Lugar de Nacimiento"
              fieldName="entidad_nacimiento"
              isEditing={isEditing}
              currentValue={editableDoctorData.entidad_nacimiento}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Matrimonio ID"
              fieldName="matrimonio_id"
              isEditing={isEditing}
              currentValue={editableDoctorData.matrimonio_id}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Teléfono"
              fieldName="telefono"
              type="tel"
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.telefono : doctor.telefono
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Correo Electrónico"
              fieldName="correo"
              type="email"
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.correo : doctor.correo
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
          </div>
        </div>
        <div style={profileStyles.sectionTitle}>Datos Académicos</div>
        <div
          style={{
            ...profileStyles.gridContainer,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div>
            <FieldRenderer
              label="Licenciatura"
              fieldName="licenciatura"
              isEditing={isEditing}
              currentValue={editableDoctorData.licenciatura}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Institución"
              fieldName="institucion_lic"
              isEditing={isEditing}
              currentValue={editableDoctorData.institucion_lic}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Año de Egreso"
              fieldName="fecha_egreso_lic"
              type="date"
              isEditing={isEditing}
              currentValue={editableDoctorData.fecha_egreso_lic}
              onChange={handleInputChange}
              isLoading={isLoading}
            />

            <FieldRenderer
              label="Cédula Licenciatura"
              fieldName="cedula_lic"
              isEditing={isEditing}
              currentValue={editableDoctorData.cedula_lic}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
          </div>
          <div>
            <FieldRenderer
              label="Especialidad"
              fieldName="especialidad"
              isEditing={isEditing}
              currentValue={editableDoctorData.especialidad}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Institución"
              fieldName="institucion_esp"
              isEditing={isEditing}
              currentValue={editableDoctorData.institucion_esp}
              onChange={handleInputChange}
              isLoading={isLoading}
            />

            <FieldRenderer
              label="Año de Egreso"
              fieldName="fecha_egreso_esp"
              type="date"
              isEditing={isEditing}
              currentValue={
                isEditing
                  ? editableDoctorData.fecha_egreso_esp
                  : doctor.fecha_egreso_esp
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />

            <FieldRenderer
              label="Cédula Especialidad"
              fieldName="cedula_esp"
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.cedula_esp : doctor.cedula_esp
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div style={profileStyles.sectionTitle}>Datos de Colaboración:</div>
        <div
          style={{
            ...profileStyles.gridContainer,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div>
            <FieldRenderer
              label="Acuerdo"
              fieldName="acuerdo"
              type="select"
              options={[
                { value: "AAC231222ctivo", label: "AC231222" },
                { value: "AC240511", label: "AC240511" },
              ]}
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.acuerdo : doctor.acuerdo
              }
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Fecha Inicio(vuelo)"
              fieldName="fecha_vuelo"
              type="date"
              isEditing={isEditing}
              currentValue={editableDoctorData.fecha_vuelo}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Estatus"
              fieldName="estatus"
              type="select"
              options={[
                { value: "01 ACTIVO", label: "01 ACTIVO" },
                { value: "02 RETIRO TEMP.", label: "02 RETIRO TEMP." },
                { value: "03 SOL. PERSONAL", label: "03 SOL. PERSONAL" },
                {
                  value: "04 INCAPACIDAD",
                  label: "04 INCAPACIDAD",
                },
                { value: "05 BAJA", label: "05 BAJA" },
              ]}
              isEditing={isEditing}
              currentValue={estatusActualParaUI}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            <FieldRenderer
              label="Fecha Estatus"
              fieldName="fecha_estatus"
              type="date"
              isEditing={isEditing}
              currentValue={editableDoctorData.fecha_estatus}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
            {!esEstatusDeBaja &&
              !esEstatusDeDefuncion &&
              !esEstatusDeRetiro &&
              !esEstatusDeSolicitud &&
              !esEstatusDeIncapacidad && (
                <>
                  <FieldRenderer
                    label="Turno"
                    fieldName="turno"
                    type="select"
                    options={[
                      {
                        value: "Jornada Acumulada",
                        label: "Jornada Acumulada",
                      },
                      { value: "Matutino", label: "Matutino" },
                      { value: "Nocturno A", label: "Nocturno A" },
                      { value: "Nocturno B", label: "Nocturno B" },
                      { value: "Vespertino", label: "Vespertino" },
                    ]}
                    isEditing={isEditing}
                    currentValue={editableDoctorData.turno}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Despliegue"
                    fieldName="despliegue" // Asegúrate que este es el nombre correcto en tus datos
                    type="text" // o el tipo que corresponda
                    isEditing={isEditing}
                    currentValue={editableDoctorData.despliegue}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Clues"
                    fieldName="clues" // Asegúrate que este es el nombre correcto en tus datos
                    type="text" // o el tipo que corresponda
                    isEditing={isEditing}
                    currentValue={editableDoctorData.clues}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Unidad Médica"
                    fieldName="nombre_unidad"
                    isEditing={isEditing}
                    currentValue={editableDoctorData.nombre_unidad}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />
                </>
              )}
          </div>
          <div>
            {!esEstatusDeBaja &&
              !esEstatusDeDefuncion &&
              !esEstatusDeRetiro &&
              !esEstatusDeSolicitud &&
              !esEstatusDeIncapacidad && (
                <>
                  <FieldRenderer
                    label="Dirección Unidad"
                    fieldName="direccion_unidad" // Asegúrate que este es el nombre correcto en tus datos
                    type="text" // o el tipo que corresponda
                    isEditing={isEditing}
                    currentValue={editableDoctorData.direccion_unidad}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Nivel de Atención"
                    fieldName="nivel_atencion"
                    type="select"
                    options={[
                      { value: "01 PNA", label: "01 PNA" },
                      { value: "02 SNA", label: "02 SNA" },
                      { value: "03 TNA", label: "03 TNA" },
                      { value: "04 OTRO", label: "04 OTRO" },
                      { value: "05 NO APLICA", label: "05 NO APLICA" },
                    ]}
                    isEditing={isEditing}
                    currentValue={editableDoctorData.nivel_atencion}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Tipo Establecimiento"
                    fieldName="tipo_establecimiento" // Asegúrate que este es el nombre correcto en tus datos
                    type="text" // o el tipo que corresponda
                    isEditing={isEditing}
                    currentValue={editableDoctorData.tipo_establecimiento}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Subtipo Establecimiento"
                    fieldName="subtipo_establecimiento" // Asegúrate que este es el nombre correcto en tus datos
                    type="text" // o el tipo que corresponda
                    isEditing={isEditing}
                    currentValue={editableDoctorData.subtipo_establecimiento}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Estrato"
                    fieldName="estrato"
                    type="text"
                    isEditing={isEditing}
                    currentValue={
                      isEditing ? editableDoctorData.estrato : doctor.estrato
                    }
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Entidad"
                    fieldName="entidad"
                    type="select"
                    options={[
                      { value: "Aguascalientes", label: "Aguascalientes" },
                      { value: "Baja California", label: "Baja California" },
                      {
                        value: "Baja California Sur",
                        label: "Baja California Sur",
                      },
                      { value: "Campeche", label: "Campeche" },
                      {
                        value: "Coahuila de Zaragoza",
                        label: "Coahuila de Zaragoza",
                      },
                      { value: "Colima", label: "Colima" },
                      { value: "Chiapas", label: "Chiapas" },
                      { value: "Chihuahua", label: "Chihuahua" },
                      { value: "Ciudad de México", label: "Ciudad de México" },
                      { value: "Durango", label: "Durango" },
                      { value: "Guanajuato", label: "Guanajuato" },
                      { value: "Guerrero", label: "Guerrero" },
                      { value: "Hidalgo", label: "Hidalgo" },
                      { value: "Jalisco", label: "Jalisco" },
                      { value: "México", label: "México" },
                      {
                        value: "Michoacán de Ocampo",
                        label: "Michoacán de Ocampo",
                      },
                      { value: "Morelos", label: "Morelos" },
                      { value: "Nayarit", label: "Nayarit" },
                      { value: "Nuevo León", label: "Nuevo León" },
                      { value: "Oaxaca", label: "Oaxaca" },
                      { value: "Puebla", label: "Puebla" },
                      { value: "Querétaro", label: "Querétaro" },
                      { value: "Quintana Roo", label: "Quintana Roo" },
                      { value: "San Luis Potosí", label: "San Luis Potosí" },
                      { value: "Sinaloa", label: "Sinaloa" },
                      { value: "Sonora", label: "Sonora" },
                      { value: "Tabasco", label: "Tabasco" },
                      { value: "Tamaulipas", label: "Tamaulipas" },
                      { value: "Tlaxcala", label: "Tlaxcala" },
                      {
                        value: "Veracruz de Ignacio de la Llave",
                        label: "Veracruz de Ignacio de la Llave",
                      },
                      { value: "Yucatán", label: "Yucatán" },
                      { value: "Zacatecas ", label: "Zacatecas " },
                    ]}
                    isEditing={isEditing}
                    currentValue={
                      isEditing ? editableDoctorData.entidad : doctor.entidad
                    }
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Municipio"
                    fieldName="municipio"
                    type="text"
                    isEditing={isEditing}
                    currentValue={
                      isEditing
                        ? editableDoctorData.municipio
                        : doctor.municipio
                    }
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Región"
                    fieldName="region"
                    type="text"
                    isEditing={isEditing}
                    currentValue={
                      isEditing ? editableDoctorData.region : doctor.region
                    }
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />
                </>
              )}

            {esEstatusDeRetiro && (
              <>
                <FieldRenderer
                  label="Motivo del Retiro"
                  fieldName="motivo"
                  isEditing={isEditing}
                  currentValue={editableDoctorData.motivo}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />

                <FieldRenderer
                  label="Fecha de Inicio"
                  fieldName="fecha_inicio"
                  type="date"
                  isEditing={isEditing}
                  currentValue={editableDoctorData.fecha_inicio}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />

                <FieldRenderer
                  label="Fecha de Fin"
                  fieldName="fecha_fin"
                  type="date"
                  isEditing={isEditing}
                  currentValue={editableDoctorData.fecha_fin}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />
              </>
            )}

            {esEstatusDeSolicitud && (
              <>
                <FieldRenderer
                  label="Motivo Solicitud"
                  fieldName="motivo"
                  isEditing={isEditing}
                  currentValue={editableDoctorData.motivo}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />

                <FieldRenderer
                  label="Fecha de Inicio"
                  fieldName="fecha_inicio"
                  type="date"
                  isEditing={isEditing}
                  currentValue={editableDoctorData.fecha_inicio}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />

                <FieldRenderer
                  label="Fecha de Fin"
                  fieldName="fecha_fin"
                  type="date"
                  isEditing={isEditing}
                  currentValue={editableDoctorData.fecha_fin}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />
              </>
            )}

            {esEstatusDeIncapacidad && (
              <>
                <FieldRenderer
                  label="Tipo de Incapacidad"
                  fieldName="tipo_incapacidad"
                  isEditing={isEditing}
                  currentValue={editableDoctorData.tipo_incapacidad}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />

                <FieldRenderer
                  label="Fecha de Inicio"
                  fieldName="fecha_inicio"
                  type="date"
                  isEditing={isEditing}
                  currentValue={editableDoctorData.fecha_inicio}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />

                <FieldRenderer
                  label="Fecha de Fin"
                  fieldName="fecha_fin"
                  type="date"
                  isEditing={isEditing}
                  currentValue={editableDoctorData.fecha_fin}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />
              </>
            )}

            {esEstatusDeBaja && (
              // No mostrar si es defunción, ya que tiene su propia fecha
              <>
                <FieldRenderer
                  label="Motivo de Baja"
                  fieldName="motivo_baja"
                  type="select"
                  options={[
                    {
                      value: "Renuncia Voluntaria",
                      label: "Renuncia Voluntaria",
                    },
                    {
                      value: "Término de Contrato",
                      label: "Término de Contrato",
                    },
                    { value: "Jubilación", label: "Jubilación" },
                    {
                      value: "Abandono de Empleo",
                      label: "Abandono de Empleo",
                    },
                    { value: "Reubicación", label: "Reubicación" },
                    { value: "Otro", label: "Otro" },
                  ]}
                  isEditing={isEditing}
                  currentValue={editableDoctorData.motivo_baja}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />

                <FieldRenderer
                  label="Fecha de Notificación"
                  fieldName="fecha_notificacion"
                  type="date"
                  isEditing={isEditing}
                  currentValue={editableDoctorData.fecha_notificacion}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />

                <FieldRenderer
                  label="Forma de Notificación"
                  fieldName="forma_notificacion"
                  type="select"
                  options={[
                    {
                      value: "Brigada Cubana (concentrado)",
                      label: "Brigada Cubana (concentrado)",
                    },
                    {
                      value: "Correo electrónico",
                      label: "Correo electrónico",
                    },
                    {
                      value: "Notificada a la entrega",
                      label: "Notificada a la entrega",
                    },
                    { value: "Oficio", label: "Oficio" },
                  ]}
                  isEditing={isEditing}
                  currentValue={editableDoctorData.forma_notificacion}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />

                <FieldRenderer
                  label="Fecha Extracción" // O un label más apropiado
                  fieldName="fecha_extraccion"
                  type="text" // o "textarea" si puede ser largo
                  isEditing={isEditing}
                  currentValue={editableDoctorData.fecha_extraccion}
                  onChange={handleInputChange}
                  isLoading={isLoading}
                />
              </>
            )}

            {/*  <FieldRenderer
                label="Fecha de Fallecimiento"
                fieldName="fecha_fallecimiento"
                type="date"
                isEditing={isEditing}
                currentValue={
                  isEditing
                    ? editableDoctorData.fecha_fallecimiento
                    : doctor.fecha_fallecimiento
                }
                onChange={handleInputChange}
                isLoading={isLoading}
              /> */}

            {(isEditing ||
              (doctor.comentarios_estatus &&
                doctor.comentarios_estatus.trim() !== "")) && (
              <FieldRenderer
                label="Comentarios Adicionales"
                fieldName="comentarios_estatus"
                type="textarea"
                isEditing={isEditing}
                currentValue={editableDoctorData.comentarios_estatus}
                onChange={handleInputChange}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        <div style={profileStyles.sectionTitle}>Historico de Movimientos:</div>
        <div
          style={{
            ...profileStyles.gridContainer,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div>
            <FieldRenderer
              label="Estatus"
              fieldName="estatus"
              currentValue={editableDoctorData.estatus}
              onChange={handleInputChange}
              isLoading={isLoading}
            />

            <FieldRenderer
              label="Fecha Estatus"
              fieldName="fecha_estatus"
              currentValue={editableDoctorData.fecha_estatus}
              onChange={handleInputChange}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      <div style={profileStyles.filesColumn}>
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
            disabled={
              isLoading ||
              edicionGeneralBloqueada ||
              (isEditing && edicionGeneralBloqueada)
            }
          />
          {selectedProfilePicFile && (
            <button
              onClick={uploadProfilePic}
              disabled={
                isLoading ||
                edicionGeneralBloqueada ||
                (isEditing && edicionGeneralBloqueada)
              }
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
