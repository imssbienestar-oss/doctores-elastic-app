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

const MOTIVO_BAJA_OPTIONS = [
  { value: "Renuncia Voluntaria", label: "Renuncia Voluntaria" },
  { value: "Término de Contrato", label: "Término de Contrato" },
  { value: "Jubilación", label: "Jubilación" },
  { value: "Abandono de Empleo", label: "Abandono de Empleo" },
  { value: "Reubicación", label: "Reubicación" },
  { value: "Otro", label: "Otro" },
];

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// --- FUNCIÓN PARA FORMATEAR FECHAS YYYY-MM-DD a DD/MM/YYYY ---
const formatDateForDisplay = (isoDateString) => {
  if (!isoDateString || typeof isoDateString !== 'string') {
    return "No especificado"; // O devuelve una cadena vacía: ""
  }
  // Asume que isoDateString es como "YYYY-MM-DD"
  const parts = isoDateString.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    // Validar que sean números (básico)
    if (!isNaN(parseInt(year)) && !isNaN(parseInt(month)) && !isNaN(parseInt(day))) {
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
        "fecha_nacimiento", "fecha_notificacion", "fecha_estatus", 
        "fecha_vuelo", "fecha_fallecimiento", "fecha_extraccion" // Si fecha_extraccion también es YYYY-MM-DD
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
      telefono: "", correo_electronico: "", fecha_nacimiento: "", entidad_nacimiento: "",
      matrimonio_id: "", cedula_lic: "", cedula_esp: "", nombre_unidad: "", nivel_atencion: "Seleccionar..", turno: "", fecha_notificacion: "",
      notificacion_baja: "", fecha_extraccion: "", motivo_baja: "", fecha_fallecimiento: "",
      fecha_estatus: "", despliegue: "", fecha_vuelo: "", estrato: "", acuerdo: "",
      comentarios_estatus: "", matrimonio_id: "",
      // No incluyas aquí los campos que SÍ o SÍ vienen de initialDoctor del paso 1,
      // como nombre_completo, estatus, curp, especialidad, id.
    };
       setEditableDoctorData({
      ...defaultFormValuesForAllFields, // Primero los defaults para todos los campos posibles
      ...initialDoctor,                 // Luego sobrescribe con lo que realmente trae initialDoctor
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
          motivo_baja: doctor.motivo_baja || "",
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

    if (name === "estatus") {
      const nuevoEstatus = value;
      const camposDeInfoBaja = [
        "fecha_notificacion",
        "notificacion_baja",
        "fecha_extraccion",
      ];
      const camposDeActividadRegular = ["nivel_atencion", "turno"];

      // Limpiar motivo_baja si el estatus no es "Baja" (o tu valor específico de baja general)
      if (nuevoEstatus !== "Baja") {
        // Ajusta "Baja" al valor exacto que usas
        newData.motivo_baja = null;
      }
      // Limpiar fecha_fallecimiento si el estatus no es "Defunción"
      if (nuevoEstatus !== "Defunción") {
        newData.fecha_fallecimiento = null;
      }

      if (nuevoEstatus === "Activo") {
        camposDeInfoBaja.forEach((campo) => {
          if (campo in newData) newData[campo] = null;
        });
      } else if (["Baja", "Defunción"].includes(nuevoEstatus)) {
        camposDeActividadRegular.forEach((campo) => {
          if (campo in newData) newData[campo] = null;
        });
      }
    }
    setEditableDoctorData(newData);
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

    const estatusFinal = dataToUpdate.estatus;
    const camposDeInfoBaja = [
      "fecha_notificacion",
      "notificacion_baja",
      "fecha_extraccion",
    ];
    const camposDeActividadRegular = ["nivel_atencion", "turno"];

    if (estatusFinal !== "Baja") {
      dataToUpdate.motivo_baja = null;
    }
    if (estatusFinal !== "Defunción") {
      dataToUpdate.fecha_fallecimiento = null;
    }

    if (estatusFinal === "Activo") {
      camposDeInfoBaja.forEach((f) => {
        if (f in dataToUpdate) dataToUpdate[f] = null;
      });
      // motivo_baja y fecha_fallecimiento ya se limpiaron si es necesario
    } else if (["Baja", "Defunción"].includes(estatusFinal)) {
      camposDeActividadRegular.forEach((f) => {
        if (f in dataToUpdate) dataToUpdate[f] = null;
      });
    }

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
      console.log(
        "RESPUESTA DEL BACKEND (updatedDoctor entero):",
        updatedDoctor
      );
      console.log(
        // <-- LOG ESPECÍFICO PARA EL ESTATUS
        "ESTATUS en la respuesta del backend:",
        updatedDoctor.estatus
      );
      setDoctor(updatedDoctor);
      setEditableDoctorData({
        comentarios_estatus: updatedDoctor.comentarios_estatus || "",
        motivo_baja: updatedDoctor.motivo_baja || "",
        fecha_fallecimiento: updatedDoctor.fecha_fallecimiento || "",
        ...updatedDoctor,
      });
      setIsEditing(false);
      setSuccessMessage("Perfil actualizado.");
      if (onProfileUpdate) onProfileUpdate(updatedDoctor.id);
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

  const estatusActualParaUI = isEditing
    ? editableDoctorData.estatus
    : doctor.estatus;

  const ocultarCamposActividadRegular = ["Baja", "Defunción"].includes(
    estatusActualParaUI
  );

  const ocultarCaposIncapacidad = [
    "Incapacidad por Enfermedad",
    "Retiro Temporal",
    "Solicitud Personal",
    "Activo",
  ].includes(estatusActualParaUI);

  const ocultarCamposDefuncion = ["Defunción"].includes(estatusActualParaUI);

  
  const currentProfilePicUrl =
    profilePicPreviewUrl || doctor.profile_pic_url || null;
  const campoEstatusDeshabilitado =
    isEditing &&
    doctorGuardadoEsDefuncion &&
    !puedeEditarAdminRegistroDefuncion;
  const camposGeneralesDeshabilitados = isEditing && edicionGeneralBloqueada;

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
              &larr; Volver
            </button>
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
            <FieldRenderer
              label="Teléfono"
              fieldName="tel"
              type="tel"
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.tel : doctor.tel
              }
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
                { value: "M", label: "Masculino" },
                { value: "F", label: "Femenino" },
                { value: "Otro", label: "Otro" },
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
              fieldName="matrimonio_id"
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
              fieldName="cedula_lic"
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.cedula_lic : doctor.cedula_lic
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
            <FieldRenderer
              label="Estatus"
              fieldName="estatus"
              type="select"
              options={[
                { value: "Activo", label: "Activo" },
                { value: "Baja", label: "Baja" },
                { value: "Defunción", label: "Defunción" },
                {
                  value: "Incapacidad por Enfermedad",
                  label: "Incapacidad por Enfermedad",
                },
                { value: "Retiro Temporal", label: "Retiro Temporal" },
                { value: "Solicitud Personal", label: "Solicitud Personal" },
              ]}
              isEditing={isEditing}
              currentValue={estatusActualParaUI}
              onChange={handleInputChange}
              isLoading={isLoading}
              disabled={isLoading || campoEstatusDeshabilitado} // Si ya es defunción, no se puede cambiar ni en modo vista si el botón de editar se las arreglara para activarse
            />

            {!ocultarCamposDefuncion && (
            <FieldRenderer
              label="Entidad Laborando"
              fieldName="entidad"
                type="select"
                options={[
                  { value: "Aguascalientes", label: "Aguascalientes" },
                  { value: "Baja California", label: "Baja California" },
                  { value: "Baja California Sur", label: "Baja California Sur" },
                  { value: "Campeche", label: "Campeche" },
                  { value: "Coahuila de Zaragoza", label: "Coahuila de Zaragoza" },
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
                  { value: "Michoacán de Ocampo", label: "Michoacán de Ocampo" },
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
                  { value: "Veracruz de Ignacio de la Llave", label: "Veracruz de Ignacio de la Llave" },
                  { value: "Yucatán", label: "Yucatán" },
                  { value: "Zacatecas ", label: "Zacatecas " },
                ]}
              isEditing={isEditing}
              currentValue={
                isEditing ? editableDoctorData.entidad : doctor.entidad
              }
              onChange={handleInputChange}
              isLoading={isLoading}
              disabled={camposGeneralesDeshabilitados}
            />)}

            {!ocultarCamposActividadRegular && (
              <FieldRenderer
                label="Unidad Médica"
                fieldName="nombre_unidad"
                isEditing={isEditing}
                currentValue={
                  isEditing
                    ? editableDoctorData.nombre_unidad
                    : doctor.nombre_unidad
                }
                onChange={handleInputChange}
                isLoading={isLoading}
                disabled={camposGeneralesDeshabilitados}
              />
            )}

            {!ocultarCamposActividadRegular && (
              <FieldRenderer
                label="Nivel de Atención"
                fieldName="nivel_atencion"
                type="select"
                options={[
                  { value: "NO APLICA", label: "NO APLICA" },
                  { value: "PRIMER NIVEL", label: "PRIMER NIVEL" },
                  { value: "SEGUNDO NIVEL", label: "SEGUNDO NIVEL" },
                  { value: "TERCER NIVEL", label: "TERCER NIVEL" },
                ]}
                isEditing={isEditing}
                currentValue={
                  isEditing
                    ? editableDoctorData.nivel_atencion
                    : doctor.nivel_atencion
                }
                onChange={handleInputChange}
                isLoading={isLoading}
                disabled={camposGeneralesDeshabilitados}
              />
            )}
          </div>
          <div>
            {!ocultarCamposActividadRegular && (
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
                currentValue={
                  isEditing ? editableDoctorData.turno : doctor.turno
                }
                onChange={handleInputChange}
                isLoading={isLoading}
                disabled={camposGeneralesDeshabilitados}
              />
            )}

            {!ocultarCaposIncapacidad &&
              !["Defunción"].includes(estatusActualParaUI) && ( // No mostrar si es defunción, ya que tiene su propia fecha
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
                  disabled={camposGeneralesDeshabilitados}
                />
              )}

            {!ocultarCaposIncapacidad && !ocultarCamposDefuncion && (
              <FieldRenderer
                label="Forma de Notificación"
                fieldName="notificacion_baja"
                type="select"
                options={[
                  {
                    value: "Brigada Cubana (concentrado)",
                    label: "Brigada Cubana (concentrado)",
                  },
                  { value: "Correo electrónico", label: "Correo electrónico" },
                  {
                    value: "Notificada a la entrega",
                    label: "Notificada a la entrega",
                  },
                  { value: "Oficio", label: "Oficio" },
                ]}
                isEditing={isEditing}
                currentValue={
                  isEditing
                    ? editableDoctorData.notificacion_baja
                    : doctor.notificacion_baja
                }
                onChange={handleInputChange}
                isLoading={isLoading}
                disabled={camposGeneralesDeshabilitados}
              />
            )}

            {!ocultarCaposIncapacidad &&
              estatusActualParaUI !== "Defunción" && (
                <FieldRenderer
                  label="Fecha Extracción / Comentario" // O un label más apropiado
                  fieldName="fecha_extraccion"
                  type="text" // o "textarea" si puede ser largo
                  isEditing={isEditing}
                  currentValue={
                    isEditing
                      ? editableDoctorData.fecha_extraccion
                      : doctor.fecha_extraccion
                  }
                  onChange={handleInputChange}
                  isLoading={isLoading}
                  disabled={camposGeneralesDeshabilitados}
                />
              )}
            {!ocultarCaposIncapacidad && !ocultarCamposDefuncion &&(
              <FieldRenderer
                label="Motivo de Baja"
                fieldName="motivo_baja"
                type="select"
                options={MOTIVO_BAJA_OPTIONS}
                isEditing={isEditing}
                currentValue={
                  isEditing
                    ? editableDoctorData.motivo_baja
                    : doctor.motivo_baja
                }
                onChange={handleInputChange}
                isLoading={isLoading}
              />
            )}

              {ocultarCamposDefuncion &&(
              <FieldRenderer
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
                disabled={camposGeneralesDeshabilitados}
              />
              )}

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
            {!ocultarCamposDefuncion && (
              <FieldRenderer
                label="Fecha de Vuelo"
                fieldName="fecha_vuelo"
                type="date"
                isEditing={isEditing}
                currentValue={
                  isEditing
                    ? editableDoctorData.fecha_vuelo
                    : doctor.fecha_vuelo
                }
                onChange={handleInputChange}
                isLoading={isLoading}
              />
            )}
            {!ocultarCamposActividadRegular && (
              <FieldRenderer
                label="Despliegue"
                fieldName="despliegue" // Asegúrate que este es el nombre correcto en tus datos
                type="text" // o el tipo que corresponda
                isEditing={isEditing}
                currentValue={
                  isEditing ? editableDoctorData.despliegue : doctor.despliegue
                }
                onChange={handleInputChange}
                isLoading={isLoading}
                disabled={camposGeneralesDeshabilitados}
              />
            )}

            {!ocultarCamposActividadRegular && (
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
                disabled={camposGeneralesDeshabilitados}
              />
            )}

            {!ocultarCamposActividadRegular && (
              <FieldRenderer
                label="Acuerdo"
                fieldName="acuerdo"
                type="text" // o textarea si puede ser largo
                isEditing={isEditing}
                currentValue={
                  isEditing ? editableDoctorData.acuerdo : doctor.acuerdo
                }
                onChange={handleInputChange}
                isLoading={isLoading}
                disabled={camposGeneralesDeshabilitados}
              />
            )}

            {(isEditing ||
              (doctor.comentarios_estatus &&
                doctor.comentarios_estatus.trim() !== "")) && (
              <FieldRenderer
                label="Comentarios Adicionales"
                fieldName="comentarios_estatus"
                type="textarea"
                isEditing={isEditing}
                currentValue={
                  isEditing
                    ? editableDoctorData.comentarios_estatus
                    : doctor.comentarios_estatus
                }
                onChange={handleInputChange}
                isLoading={isLoading}
                disabled={camposGeneralesDeshabilitados}
              />
            )}
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
