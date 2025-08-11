// src/components/DoctorProfileView.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../src/contexts/AuthContext";

const profileStyles = {
  container: {
    padding: "20px",
    margin: "20px auto",
    maxWidth: "1400px",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  idStyle: {
    fontSize: ".8em",
    color: "#6c757d",
    fontWeight: "500",
    marginLeft: "10px",
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
    backgroundColor: "#006657",
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
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
    marginLeft: "10px",
  },
  uploadButton: {
    padding: "10px 18px",
    fontSize: "0.95em",
    cursor: "pointer",
    backgroundColor: "#006657",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: "500",
    display: "inline-block",
    marginTop: "20px",
    marginLeft: "10px",
  },
  uploadSelect: {
    marginBottom: "10px",
    width: "100%",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "1em",
  },
  uploadFileInput: {
    display: "block",
    marginBottom: "10px",
    color: "#495057",
    fontSize: "0.9em",
  },
  sectionTitle: {
    fontSize: "24px",
    color: "#235b4e",
    fontWeight: "bold",
    marginTop: "30px",
    marginBottom: "15px",
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: "5px",
  },
  sectionTitleAttachments: {
    fontSize: "24px",
    color: "#235b4e",
    fontWeight: "bold",
    marginTop: "30px",
  },
  fieldLabel: {
    fontWeight: "bold",
    color: "#555",
    textAlign: "left",
    paddingRight: "10px",
    minWidth: "180px",
  },
  fieldValue: {
    color: "#333",
    textAlign: "left",
    wordBreak: "break-word",
    textTransform: "uppercase",
  },
  fieldInput: {
    width: "100%",
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxSizing: "border-box",
  },
  gridContainer: {
    display: "grid",
    gap: "20px",
  },
  fieldPair: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "0 10px",
    alignItems: "center",
    marginBottom: "10px",
  },
  mainLayout: {
    display: "grid",
    gridTemplateColumns: "3fr 1fr",
    gap: "30px",
    padding: "20px",
    margin: "20px auto",
    maxWidth: "1400px",
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
    padding: "10px 5px",
    borderBottom: "3px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.9em",
  },
  attachmentLabel: {
    fontWeight: "500",
    color: "#333",
  },
  attachmentActions: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },
  attachmentLink: {
    textDecoration: "none",
    color: "#007bff",
    fontWeight: "bold",
    flexGrow: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginRight: "10px",
  },
  statusPending: {
    color: "#dc3545", // Rojo
    fontStyle: "italic",
  },
  deleteButton: {
    background: "#dc3545",
    color: "#fff",
  },
  uploadSection: {
    marginTop: "10px",
    paddingTop: "10px",
  },
  uploadTitle: {
    fontSize: "1.1em",
    fontWeight: "600",
    marginBottom: "15px",
    color: "#333",
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
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  addHistoryButton: {
    padding: "10px 18px",
    fontSize: "0.95em",
    cursor: "pointer",
    backgroundColor: "#006657",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
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
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "25px",
    borderRadius: "8px",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
    width: "90%",
    maxWidth: "500px",
    position: "relative",
  },
  modalCloseButton: {
    position: "absolute",
    top: "10px",
    right: "15px",
    background: "transparent",
    border: "none",
    fontSize: "1.5rem",
    cursor: "pointer",
    color: "#333",
  },
  modalFormLabel: {
    display: "block",
    fontWeight: "bold",
    marginBottom: "5px",
    fontSize: "0.9em",
  },
  modalFormInput: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxSizing: "border-box",
    fontSize: "1em",
  },
  modalFormGroup: {
    marginBottom: "15px",
  },
  modalActions: {
    marginTop: "20px",
    textAlign: "right",
  },
  dataTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9em",
    marginTop: "20px", // Espacio arriba de la tabla
  },
  dataTableTh: {
    backgroundColor: "#006657", // Fondo verde oscuro
    color: "white",
    padding: "10px 12px",
    textAlign: "center",
    border: "1px solid #005c4e",
    fontWeight: "bold",
  },
  dataTableTd: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    color: "#333",
    textAlign: "center",
  },
  dataTableTrEven: {
    backgroundColor: "#f2f2f2",
  },
  modalFormInputDisabled: {
    backgroundColor: "#6e6c6cff",
    cursor: "not-allowed",
  },
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const renderCommentWithBoldPrefix = (comment) => {
  if (!comment) return null;

  const prefix1 = "Registro de Expediente.";
  const prefix2 = "Registro inicial en el sistema.";
  const prefix3 = "Registro retroactivo.";

  if (comment.startsWith(prefix1)) {
    return (
      <span>
        <strong>{prefix1}</strong>
        {comment.substring(prefix1.length)}
      </span>
    );
  }

  if (comment.trim() === prefix2 || comment.trim() === prefix3) {
    return <strong>{comment}</strong>;
  }
  return comment;
};

const formatDateForDisplay = (dateString) => {
  if (!dateString) {
    return "No especificado";
  }
  const specialTexts = ["EN TRAMITE", "SIN DATOS"];
  if (specialTexts.includes(String(dateString).toUpperCase())) {
    return dateString;
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

const formatDateTimeForDisplay = (isoDateTimeString) => {
  if (!isoDateTimeString) return "N/A";
  try {
    const date = new Date(isoDateTimeString);
    if (isNaN(date.getTime())) return "Fecha inválida";
    const datePart = date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} ${timePart}`;
  } catch (error) {
    return "Inválido";
  }
};

const FieldRenderer = React.memo(
  ({
    label,
    fieldName,
    type = "text",
    options = [],
    isEditing,
    currentValue,
    onChange,
    isLoading,
    disabled = false,
  }) => {
    const valueForInput =
      currentValue === null || currentValue === undefined ? "" : currentValue;

    let valueForDisplay;

    const dateFieldsToFormat = [
      "fecha_nacimiento",
      "fecha_notificacion",
      "fecha_estatus",
      "fecha_vuelo",
      "fecha_fallecimiento",
      "fecha_extraccion",
      "fecha_inicio",
      "fecha_fin",
      "fecha_egreso_esp",
      "fecha_egreso_lic",
      "fecha_emision",
      "fecha_expiracion",
    ];

    if (!isEditing) {
      if (type === "date") {
        valueForDisplay = formatDateForDisplay(currentValue);
      } else {
        // Para otros campos, si el valor es nulo o vacío, muestra "No especificado".
        // Si tiene un valor (como "Sin Datos"), lo muestra tal cual.
        valueForDisplay =
          currentValue === null ||
          currentValue === undefined ||
          String(currentValue).trim() === ""
            ? "No especificado"
            : String(currentValue);
      }
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
  const userRole = currentUser?.role;
  const { triggerDataRefresh } = useAuth();

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
  const edicionGeneralBloqueada =
    doctorGuardadoEsDefuncion && !puedeEditarAdminRegistroDefuncion;
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const initialHistoryState = {
    tipo_cambio: "",
    estatus: "",
    fecha_inicio: "",
    fecha_fin: "",
    clues: "",
    entidad: "",
    nombre_unidad: "",
    turno: "",
    comentarios: "",
  };

  const [isLoadingClues, setIsLoadingClues] = useState(false);
  const [cluesError, setCluesError] = useState("");

  const DOCUMENTOS_REQUERIDOS = [
    { key: "CURP", label: "CURP" },
    { key: "Pasaporte", label: "Pasaporte" },
    { key: "Cédulas Profesionales", label: "Cédulas Profesionales" },
    { key: "Revalidación de Estudios", label: "Revalidación de Estudios" },
    { key: "Títulos de Estudio", label: "Títulos de Estudio" },
    { key: "Solicitud de Vacaciones", label: "Solicitud de Vacaciones" },
  ];
  const [registrosHistorico, setRegistrosHistorico] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState("");

  const tiposDeDocumentoFaltantes = DOCUMENTOS_REQUERIDOS.filter(
    (doc) => !doctor.attachments.some((att) => att.documento_tipo === doc.key)
  );

  const handleEliminarRegistro = async (historicoId, tipoCambio) => {
    if (
      !window.confirm(
        `¿Estás seguro de que quieres eliminar el movimiento "${tipoCambio}" (ID: ${historicoId})? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    const token = localStorage.getItem("authToken");

    if (!token) {
      setError("Error de autenticación. No se encontró el token.");
      setIsLoading(false);
      return;
    }

    try {
      // 4. Llamada a la API usando la URL completa (resuelve el 404)
      // Asegúrate de que API_URL está definida y apunta a http://localhost:8000
      const response = await fetch(
        `${API_BASE_URL}/api/historico/${historicoId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 5. Manejo de errores de la respuesta (igual que tu función de referencia)
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Error al eliminar el registro." }));
        throw new Error(
          errorData.detail || `Error del servidor: ${response.status}`
        );
      }

      setDoctor((prevDoctor) => ({
        ...prevDoctor,
        historial: prevDoctor.historial.filter(
          (registro) => registro.id !== historicoId
        ),
      }));

      setSuccessMessage(
        `Registro (ID: ${historicoId}) eliminado exitosamente.`
      );
      alert(`El registro (ID: ${historicoId}) fue eliminado con éxito.`);
    } catch (err) {
      console.error("Error al eliminar registro del histórico:", err);
      setError(err.message || "Ocurrió un error al eliminar el registro.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (tiposDeDocumentoFaltantes.length > 0) {
      setSelectedDocType(tiposDeDocumentoFaltantes[0].key);
    } else {
      setSelectedDocType("");
    }
  }, [doctor.attachments]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "El archivo es demasiado grande. El tamaño máximo permitido es de 5 MB."
      );
      event.target.value = null;
      setSelectedFile(null);
      return;
    }

    setError(""); // Limpia cualquier error anterior
    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedDocType) {
      alert("Por favor, seleccione un tipo de documento y un archivo.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("documento_tipo", selectedDocType);

    const authToken = localStorage.getItem("authToken");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctores/${doctor.id_imss}/attachments`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` }, // Para FormData, no se pone 'Content-Type'
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Error al subir el archivo." }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      // Si todo sale bien, notificamos al componente padre para que recargue el perfil completo
      if (onProfileUpdate) {
        onProfileUpdate(doctor.id_imss);
      }
      setSuccessMessage(`Documento "${selectedDocType}" subido exitosamente.`);
      setSelectedFile(null); // Limpiamos el archivo seleccionado
    } catch (err) {
      console.error("Error al subir adjunto:", err);
      setError(err.message || "Ocurrió un error al subir el archivo.");
    } finally {
      setIsLoading(false);
    }
  };

  const [nuevoHistorial, setNuevoHistorial] = useState(initialHistoryState);

  const r = async (cluesCode) => {
    if (cluesCode.length !== 11) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/clues/${cluesCode}`);
      if (!response.ok) throw new Error("CLUES no encontrada");
      const data = await response.json();
      // Actualiza el estado del formulario del modal
      setNuevoHistorial((prev) => ({
        ...prev,
        entidad: data.entidad || "",
        nombre_unidad: data.nombre_unidad || "",
      }));
    } catch (error) {
      console.error("Error al buscar CLUES para el modal:", error);
    }
  };

  const fetchCluesDataForModal = async (cluesCode) => {
    if (cluesCode.length !== 11) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/clues/${cluesCode}`);
      if (!response.ok) throw new Error("CLUES no encontrada");
      const data = await response.json();
      setNuevoHistorial((prev) => ({
        ...prev,
        entidad: data.entidad || "",
        nombre_unidad: data.nombre_unidad || "",
      }));
    } catch (error) {
      console.error("Error al buscar CLUES para el modal:", error);
    }
  };

  const handleHistorialChange = (e) => {
    const { name, value } = e.target;

    setNuevoHistorial((prev) => {
      const newState = { ...prev, [name]: value };

      if (name === "tipo_cambio") {
        if (value === "Estatus") {
          return {
            ...initialHistoryState,
            tipo_cambio: "Estatus",
            clues: doctor.clues,
            entidad: doctor.entidad,
            nombre_unidad: doctor.nombre_unidad,
            turno: doctor.turno,
          };
        } else if (value === "Redistribución") {
          return {
            ...initialHistoryState,
            tipo_cambio: "Redistribución",
            estatus: doctor.estatus,
            turno: doctor.turno,
            fecha_fin: "",
          };
        } else if (value === "Turno") {
          return {
            ...initialHistoryState,
            tipo_cambio: "Turno",
            estatus: doctor.estatus,
            clues: doctor.clues,
            entidad: doctor.entidad,
            nombre_unidad: doctor.nombre_unidad,
            fecha_fin: "",
          };
        } else {
          return initialHistoryState;
        }
      }

      if (name === "clues" && newState.tipo_cambio === "Redistribución") {
        fetchCluesDataForModal(value);
      }

      return newState;
    });
  };

  const handleAgregarHistorial = async (e) => {
    e.preventDefault();

    const { tipo_cambio, estatus, fecha_inicio, fecha_fin, clues, turno } =
      nuevoHistorial;
    const esEstatusTemporal = !["01 ACTIVO", "06 BAJA"].includes(estatus);

    if (!tipo_cambio || !estatus || !fecha_inicio) {
      alert("Por favor, complete Tipo de Cambio, Estatus y Fecha de Inicio.");
      return;
    }
    if (tipo_cambio === "Estatus" && esEstatusTemporal && !fecha_fin) {
      alert("Para este tipo de estatus, la Fecha de Fin es obligatoria.");
      return;
    }

    if (tipo_cambio === "Redistribución" && !clues) {
      alert("Para una redistribución, el campo CLUES es obligatorio.");
      return;
    }
    if (tipo_cambio === "Turno" && !turno) {
      alert("Para un cambio de turno, el campo Turno es obligatorio.");
      return;
    }

    setIsLoading(true);
    setError("");
    const authToken = localStorage.getItem("authToken");

    const payload = { ...nuevoHistorial };
    if (
      !payload.fecha_fin ||
      ["01 ACTIVO", "06 BAJA"].includes(payload.estatus) ||
      payload.tipo_cambio === "Redistribución"
    ) {
      payload.fecha_fin = null;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctores/${doctor.id_imss}/historial`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al guardar el registro.");
      }
      setIsHistoryModalOpen(false);
      setNuevoHistorial({
        tipo_cambio: "",
        estatus: "",
        fecha_inicio: "",
        fecha_fin: "",
        clues: "",
        entidad: "",
        nombre_unidad: "",
        comentarios: "",
      });
      triggerDataRefresh();
      onProfileUpdate(doctor.id_imss);
      setSuccessMessage("Registro de historial añadido exitosamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setDoctor(initialDoctor);
    if (initialDoctor) {
      const defaultFormValuesForAllFields = {
        telefono: "",
        correo_electronico: "",
        edad: "",
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
      };
      setEditableDoctorData({
        ...defaultFormValuesForAllFields,
        ...initialDoctor,
      });
    } else {
      setEditableDoctorData(null);
    }
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

  const fetchAndApplyCluesDataForEdit = async (cluesCode) => {
    if (!cluesCode || cluesCode.length !== 11) {
      setCluesError("");
      return;
    }
    setIsLoadingClues(true);
    setCluesError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/clues-con-capacidad/${cluesCode}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al buscar CLUES.");
      }
      const data = await response.json();

      if (data.actual >= data.maximo) {
        setCluesError(
          `La entidad ${data.entidad} tiene el cupo lleno (${data.actual}/${data.maximo}).`
        );
        // No actualizamos los datos si el cupo está lleno
      } else {
        // Si hay cupo, actualizamos el formulario de edición
        setEditableDoctorData((prev) => ({
          ...prev,
          nombre_unidad: data.nombre_unidad || "",
          direccion_unidad: data.direccion_unidad || "",
          nivel_atencion: data.nivel_atencion || "",
          tipo_establecimiento: data.tipo_establecimiento || "",
          subtipo_establecimiento: data.subtipo_establecimiento || "",
          estrato: data.estrato || "",
          entidad: data.entidad || "",
          municipio: data.municipio || "",

          region: data.region || "SIN ESPECIFICAR",
        }));
      }
    } catch (error) {
      setCluesError(error.message);
    } finally {
      setIsLoadingClues(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setEditableDoctorData((prevData) => {
      let newData = { ...prevData, [name]: value };
      if (isEditing && name === "clues") {
        fetchAndApplyCluesDataForEdit(value);
      }

      if (name === "estatus") {
        const nuevoEstatus = value;
        const camposActividad = [
          "direccion_unidad",
          "tipo_establecimiento",
          "subtipo_establecimiento",
          "municipio",
          "region",
          "turno",
          "nivel_atencion",
        ];
        const camposBaja = [
          "fecha_extraccion",
          "motivo_baja",
          "fecha_notificacion",
          "forma_notificacion",
        ];

        if (nuevoEstatus === "06 BAJA") {
          camposActividad.forEach((campo) => {
            newData[campo] = null;
          });
        } else {
          camposBaja.forEach((campo) => {
            newData[campo] = null;
          });
        }

        if (nuevoEstatus !== "Defunción") {
          newData.fecha_fallecimiento = null;
        }
      }

      return newData;
    });
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
      triggerDataRefresh();
      if (onProfileUpdate) onProfileUpdate(updatedDoctor.id_imss);
    } catch (err) {
      console.error("Error saving profile:", err.message);
      setError(err.message || "Error al guardar.");
    } finally {
      setIsLoading(false);
    }
  };

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
      const updatedDoctorData = await response.json();

      setDoctor(updatedDoctorData);
      if (isEditing) {
        setEditableDoctorData({ ...updatedDoctorData });
      }

      setSelectedProfilePicFile(null);
      setProfilePicPreviewUrl(null);
      setSuccessMessage("Foto de perfil actualizada exitosamente.");
      if (onProfileUpdate) onProfileUpdate(updatedDoctorData.id_imss);
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
      const newAttachment = await response.json();

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
      if (onProfileUpdate) onProfileUpdate(doctor.id_imss);
    } catch (err) {
      console.error("Error al subir adjunto:", err);
      setError(err.message || "Ocurrió un error al subir el adjunto.");
    } finally {
      setIsLoading(false);
    }
  };

  const { user, token } = useAuth();
  const API_URL = import.meta.env.VITE_API_BASE_URL;

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
  const esEstatusDeBaja = estatusActualParaUI === "06 BAJA";
  const esEstatusDeDefuncion = estatusActualParaUI === "Defunción";
  const esEstatusDeRetiro =
    estatusActualParaUI === "02 RETIRO TEMP. (CUBA)" ||
    estatusActualParaUI === "03 RETIRO TEMP. (MEXICO)";
  const esEstatusDeSolicitud = estatusActualParaUI === "04 SOL. PERSONAL";
  const esEstatusDeIncapacidad = estatusActualParaUI === "05 INCAPACIDAD";
  const currentProfilePicUrl = profilePicPreviewUrl || doctor.foto_url || null;

  return (
    <>
      <div style={profileStyles.mainLayout}>
        {/* APARTADO PRINCIPAL EXPEDIENTE */}
        <div style={profileStyles.infoColumn}>
          <div style={profileStyles.header}>
            <h1 style={profileStyles.title}>
              Expediente del Médico
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
                label="Edad"
                fieldName="edad"
                isEditing={isEditing}
                currentValue={
                  doctor.edad ? `${parseInt(doctor.edad)} años` : ""
                }
                onChange={handleInputChange}
                isLoading={isLoading}
              />
              <FieldRenderer
                label="Sexo"
                fieldName="sexo"
                type="select"
                options={[
                  { value: "MASCULINO", label: "Masculino" },
                  { value: "FEMENINO", label: "Femenino" },
                  { value: "OTRO", label: "Otro" },
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
                  { value: "AC231222", label: "AC231222" },
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
                label="Fecha de llegada"
                fieldName="fecha_vuelo"
                type="date"
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
                  {
                    value: "02 RETIRO TEMP. (CUBA)",
                    label: "02 RETIRO TEMP. (CUBA)",
                  },
                  {
                    value: "03 RETIRO TEMP. (MEXICO)",
                    label: "03 RETIRO TEMP. (MEXICO)",
                  },
                  { value: "04 SOL. PERSONAL", label: "04 SOL. PERSONAL" },
                  {
                    value: "05 INCAPACIDAD",
                    label: "05 INCAPACIDAD",
                  },
                  { value: "06 BAJA", label: "06 BAJA" },
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
              {!esEstatusDeBaja && !esEstatusDeDefuncion && (
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
                    fieldName="despliegue"
                    type="text"
                    isEditing={isEditing}
                    currentValue={editableDoctorData.despliegue}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />
                  <FieldRenderer
                    label="Clues"
                    fieldName="clues"
                    type="text"
                    isEditing={isEditing}
                    currentValue={editableDoctorData.clues}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />
                  {isEditing && isLoadingClues && (
                    <p style={{ fontStyle: "italic" }}>Buscando CLUES...</p>
                  )}
                  {isEditing && cluesError && (
                    <p style={{ color: "red" }}>{cluesError}</p>
                  )}

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
              {!esEstatusDeBaja && !esEstatusDeDefuncion && (
                <>
                  <FieldRenderer
                    label="Dirección Unidad"
                    fieldName="direccion_unidad"
                    type="text"
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
                      { value: "PRIMER NIVEL", label: "PRIMER NIVEL" },
                      { value: "SEGUNDO NIVEL", label: "SEGUNDO NIVEL" },
                      { value: "TERCER NIVEL", label: "TERCER NIVEL" },
                      { value: "OTRO", label: "OTRO" },
                      { value: "NO APLICA", label: "NO APLICA" },
                    ]}
                    isEditing={isEditing}
                    currentValue={editableDoctorData.nivel_atencion}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Tipo Establecimiento"
                    fieldName="tipo_establecimiento"
                    type="text"
                    isEditing={isEditing}
                    currentValue={editableDoctorData.tipo_establecimiento}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />

                  <FieldRenderer
                    label="Subtipo Establecimiento"
                    fieldName="subtipo_establecimiento"
                    type="text"
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
                      { value: "AGS", label: "Aguascalientes" },
                      { value: "BC", label: "Baja California" },
                      {
                        value: "BCS",
                        label: "Baja California Sur",
                      },
                      { value: "CAMP", label: "Campeche" },
                      {
                        value: "COAH",
                        label: "Coahuila de Zaragoza",
                      },
                      { value: "COL", label: "Colima" },
                      { value: "CHIS", label: "Chiapas" },
                      { value: "CHIH", label: "Chihuahua" },
                      { value: "CDMX", label: "Ciudad de México" },
                      { value: "DGO", label: "Durango" },
                      { value: "GTO", label: "Guanajuato" },
                      { value: "GRO", label: "Guerrero" },
                      { value: "HGO", label: "Hidalgo" },
                      { value: "JAL", label: "Jalisco" },
                      { value: "MEX", label: "México" },
                      {
                        value: "MICH",
                        label: "Michoacán de Ocampo",
                      },
                      { value: "MOR", label: "Morelos" },
                      { value: "NAY", label: "Nayarit" },
                      { value: "NL", label: "Nuevo León" },
                      { value: "OAX", label: "Oaxaca" },
                      { value: "PUE", label: "Puebla" },
                      { value: "QRO", label: "Querétaro" },
                      { value: "QROO", label: "Quintana Roo" },
                      { value: "SLP", label: "San Luis Potosí" },
                      { value: "SIN", label: "Sinaloa" },
                      { value: "SON", label: "Sonora" },
                      { value: "TAB", label: "Tabasco" },
                      { value: "TAMPS", label: "Tamaulipas" },
                      { value: "TLAX", label: "Tlaxcala" },
                      {
                        value: "VER",
                        label: "Veracruz de Ignacio de la Llave",
                      },
                      { value: "YUC", label: "Yucatán" },
                      { value: "ZAC", label: "Zacatecas " },
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
                <>
                  <FieldRenderer
                    label="Motivo de Baja"
                    fieldName="motivo_baja"
                    type="select"
                    options={[
                      {
                        value: "01 INCUMPLIMIENTO DE ACUERDO",
                        label: "01 INCUMPLIMIENTO DE ACUERDO",
                      },
                      {
                        value: "02 DESERCION",
                        label: "02 DESERCION",
                      },
                      { value: "03 ENFERMEDAD", label: "03 ENFERMEDAD" },
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
                    label="Fecha Extracción"
                    fieldName="fecha_extraccion"
                    type="text"
                    isEditing={isEditing}
                    currentValue={editableDoctorData.fecha_extraccion}
                    onChange={handleInputChange}
                    isLoading={isLoading}
                  />
                </>
              )}

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
        </div>

        {/*Apartado Foto y Archivos Adjuntos */}
        <div style={profileStyles.filesColumn}>
          <div style={profileStyles.profilePicSection}>
            <h2 style={profileStyles.sectionTitleAttachments}>
              Foto de Perfil
            </h2>
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

            {currentUser && currentUser.role !== "consulta" && (
              <>
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
              </>
            )}
          </div>

          <div style={profileStyles.attachmentsSection}>
            <h2 style={profileStyles.sectionTitleAttachments}>
              Expedientes Adjuntos{" "}
            </h2>
            <div style={{ listStyle: "none", padding: 0, marginBottom: "5px" }}>
              {DOCUMENTOS_REQUERIDOS.map((doc) => {
                const archivoExistente = doctor.attachments.find(
                  (att) => att.documento_tipo === doc.key
                );
                return (
                  <div key={doc.key} style={profileStyles.attachmentItem}>
                    <span style={profileStyles.attachmentLabel}>
                      {doc.label}:
                    </span>
                    {archivoExistente ? (
                      <div style={profileStyles.attachmentActions}>
                        <a
                          href={archivoExistente.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver Archivo
                        </a>
                        {currentUser && currentUser.role !== "consulta" && (
                          <>
                            <button
                              onClick={() =>
                                handleDeleteAttachment(
                                  archivoExistente.id,
                                  archivoExistente.file_name
                                )
                              }
                            >
                              &times;
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span style={profileStyles.statusPending}>Pendiente</span>
                    )}
                  </div>
                );
              })}
            </div>

            {currentUser && currentUser.role !== "consulta" && (
              <>
                {/* Formulario de Subida Unificado */}
                {tiposDeDocumentoFaltantes.length > 0 && (
                  <div style={profileStyles.uploadSection}>
                    <h4 style={profileStyles.uploadTitle}>
                      Subir Documento Faltante
                    </h4>
                    {/* Menú para seleccionar el tipo de documento */}
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      style={profileStyles.uploadSelect}
                    >
                      {tiposDeDocumentoFaltantes.map((doc) => (
                        <option key={doc.key} value={doc.key}>
                          {doc.label}
                        </option>
                      ))}
                    </select>

                    {currentUser && currentUser.role !== "consulta" && (
                      <>
                        {/* Selector de archivo */}
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          style={profileStyles.uploadFileInput}
                        />

                        {/* Botón único de subida */}
                        <button
                          onClick={handleFileUpload}
                          disabled={
                            !selectedFile || !selectedDocType || isLoading
                          }
                          style={profileStyles.uploadButton}
                        >
                          {isLoading ? "Subiendo..." : "Subir Documento"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {isLoading && (selectedProfilePicFile || selectedAttachmentFile) && (
            <p style={profileStyles.loadingMessage}>Procesando archivo...</p>
          )}
        </div>

        {/* Modal Rediseñado */}
        {isHistoryModalOpen && (
          <div style={profileStyles.modalBackdrop}>
            <div style={profileStyles.modalContent}>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                style={profileStyles.modalCloseButton}
              >
                &times;
              </button>
              <h2>Añadir Registro Retroactivo</h2>
              <form onSubmit={handleAgregarHistorial}>
                {/* Tipo de Cambio */}
                <div style={profileStyles.modalFormGroup}>
                  <label style={profileStyles.modalFormLabel}>
                    Tipo de Cambio:
                  </label>
                  <select
                    name="tipo_cambio"
                    value={nuevoHistorial.tipo_cambio}
                    onChange={handleHistorialChange}
                    style={profileStyles.modalFormInput}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Estatus">Estatus</option>
                    <option value="Redistribución">Redistribución</option>
                    <option value="Turno">Turno</option>
                  </select>
                </div>
                {/* Estatus */}
                <div style={profileStyles.modalFormGroup}>
                  <label style={profileStyles.modalFormLabel}>Estatus:</label>
                  <select
                    name="estatus"
                    value={nuevoHistorial.estatus}
                    onChange={handleHistorialChange}
                    style={{
                      ...profileStyles.modalFormInput,
                      ...(nuevoHistorial.tipo_cambio === "Estatus"
                        ? profileStyles.modalFormInputDisabled
                        : {}),
                    }}
                    disabled={
                      nuevoHistorial.tipo_cambio === "Redistribución" ||
                      nuevoHistorial.tipo_cambio === "Turno"
                    }
                  >
                    <option value="">Seleccione...</option>
                    <option value="01 ACTIVO">01 ACTIVO</option>
                    <option value="02 RETIRO TEMP. (CUBA)">
                      02 RETIRO TEMP.CUBA
                    </option>
                    <option value="03 RETIRO TEMP. (MEXICO)">
                      03 RETIRO TEMP.MEXICO
                    </option>
                    <option value="04 SOL. PERSONAL">04 SOL. PERSONAL</option>
                    <option value="05 INCAPACIDAD">05 INCAPACIDAD</option>
                    <option value="06 BAJA">06 BAJA</option>
                  </select>
                </div>
                {/* Fechas */}
                <div style={{ display: "flex", gap: "15px" }}>
                  <div style={{ ...profileStyles.modalFormGroup, flex: 1 }}>
                    <label style={profileStyles.modalFormLabel}>
                      Fecha Inicio:
                    </label>
                    <input
                      name="fecha_inicio"
                      type="date"
                      value={nuevoHistorial.fecha_inicio}
                      onChange={handleHistorialChange}
                      style={profileStyles.modalFormInput}
                    />
                  </div>
                  <div style={{ ...profileStyles.modalFormGroup, flex: 1 }}>
                    <label style={profileStyles.modalFormLabel}>
                      Fecha Fin:
                    </label>
                    <input
                      name="fecha_fin"
                      type="date"
                      value={nuevoHistorial.fecha_fin}
                      onChange={handleHistorialChange}
                      style={{
                        ...profileStyles.modalFormInput,
                        ...(["01 ACTIVO", "06 BAJA"].includes(
                          nuevoHistorial.estatus
                        ) ||
                        nuevoHistorial.tipo_cambio === "Redistribución" ||
                        nuevoHistorial.tipo_cambio === "Turno"
                          ? profileStyles.modalFormInputDisabled
                          : {}),
                      }}
                      disabled={["01 ACTIVO", "06 BAJA"].includes(
                        nuevoHistorial.estatus ||
                          nuevoHistorial.tipo_cambio === "Turno"
                      )}
                    />
                  </div>
                </div>
                {/* Turno */}
                <div style={profileStyles.modalFormGroup}>
                  <label style={profileStyles.modalFormLabel}>Turno:</label>
                  <select
                    name="turno"
                    value={nuevoHistorial.turno}
                    onChange={handleHistorialChange}
                    style={{
                      ...profileStyles.modalFormInput,
                      ...(nuevoHistorial.tipo_cambio === "Estatus"
                        ? profileStyles.modalFormInputDisabled
                        : {}),
                    }}
                    disabled={nuevoHistorial.tipo_cambio === "Estatus"}
                  >
                    <option value="">Seleccione un turno...</option>
                    <option value="Jornada Acumulada">Jornada Acumulada</option>
                    <option value="Matutino">Matutino</option>
                    <option value="No Aplica">No Aplica</option>
                    <option value="Nocturno A">Nocturno A</option>
                    <option value="Nocturno B">Nocturno B</option>
                    <option value="Vespertino">Vespertino</option>
                  </select>
                </div>
                {/* CLUES (con autocompletado) */}
                <div style={profileStyles.modalFormGroup}>
                  <label style={profileStyles.modalFormLabel}>CLUES:</label>
                  <input
                    name="clues"
                    value={nuevoHistorial.clues}
                    onChange={handleHistorialChange}
                    style={{
                      ...profileStyles.modalFormInput,
                      ...(nuevoHistorial.tipo_cambio === "Estatus" ||
                      nuevoHistorial.tipo_cambio === "Turno"
                        ? profileStyles.modalFormInputDisabled
                        : {}),
                    }}
                    disabled={nuevoHistorial.tipo_cambio === "Estatus"}
                  />
                </div>
                {/* ... (campos para Entidad y Unidad, que se autocompletarían con la CLUES) ... */}
                <div style={profileStyles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(false)}
                    style={profileStyles.cancelButton}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={profileStyles.saveButton}
                  >
                    Añadir al Historial
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <div style={profileStyles.container}>
        {/* Nueva Tabla de Historial */}
        <div style={profileStyles.historyHeader}>
          <div style={profileStyles.sectionTitle}>Historial de Movimientos</div>
          {currentUser && currentUser.role !== "consulta" && (
            <>
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                style={profileStyles.addHistoryButton}
              >
                <span role="img" aria-label="agregar">
                  ➕
                </span>
                Añadir Registro
              </button>
            </>
          )}
        </div>

        {/* Nueva Tabla de Historial */}
        <table style={profileStyles.dataTable}>
          <thead>
            <tr>
              <th style={profileStyles.dataTableTh}>Tipo de Cambio</th>
              <th style={profileStyles.dataTableTh}>Estatus</th>
              <th style={profileStyles.dataTableTh}>Hora de Registro</th>
              <th style={profileStyles.dataTableTh}>Fecha Inicio</th>
              <th style={profileStyles.dataTableTh}>Fecha Conclusión</th>
              <th style={profileStyles.dataTableTh}>CLUES</th>
              <th style={profileStyles.dataTableTh}>Unidad</th>
              <th style={profileStyles.dataTableTh}>Turno</th>
              <th style={profileStyles.dataTableTh}>Entidad</th>
              <th style={profileStyles.dataTableTh}>Registro</th>
              {currentUser && currentUser.role === "admin" && (
                <th style={profileStyles.dataTableTh}>Acciones</th>
              )}
            </tr>
          </thead>
          <tbody>
            {doctor.historial && doctor.historial.length > 0 ? (
              doctor.historial
                .sort((a, b) => {
                  const dateComparison =
                    new Date(b.fecha_inicio) - new Date(a.fecha_inicio);
                  if (dateComparison !== 0) return dateComparison;
                  return (
                    new Date(b.fecha_registro) - new Date(a.fecha_registro)
                  );
                })
                .map((item) => (
                  <tr key={item.id}>
                    <td style={profileStyles.dataTableTd}>
                      {item.tipo_cambio}
                    </td>
                    <td style={profileStyles.dataTableTd}>{item.estatus}</td>
                    <td style={profileStyles.dataTableTd}>
                      {formatDateTimeForDisplay(item.fecha_registro)}
                    </td>
                    <td style={profileStyles.dataTableTd}>
                      {formatDateForDisplay(item.fecha_inicio)}
                    </td>

                    <td style={profileStyles.dataTableTd}>
                      {["01 ACTIVO", "06 BAJA"].includes(item.estatus)
                        ? "N/A"
                        : formatDateForDisplay(item.fecha_fin)}
                    </td>
                    <td style={profileStyles.dataTableTd}>{item.clues}</td>
                    <td style={profileStyles.dataTableTd}>
                      {item.nombre_unidad}
                    </td>
                    <td style={profileStyles.dataTableTd}>{item.turno}</td>
                    <td style={profileStyles.dataTableTd}>{item.entidad}</td>
                    <td style={profileStyles.dataTableTd}>
                      {renderCommentWithBoldPrefix(item.comentarios)}
                    </td>
                    {currentUser && currentUser.role === "admin" && (
                      <td style={profileStyles.dataTableTd}>
                        <button
                          style={profileStyles.deleteButton}
                          onClick={() =>
                            handleEliminarRegistro(item.id, item.tipo_cambio)
                          }
                          className="boton-eliminar"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: "center", padding: "10px" }}
                >
                  No hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Modal Rediseñado */}
        {isHistoryModalOpen && (
          <div style={profileStyles.modalBackdrop}>
            <div style={profileStyles.modalContent}>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                style={profileStyles.modalCloseButton}
              >
                &times;
              </button>
              <h2>Añadir Registro Retroactivo</h2>
              <form onSubmit={handleAgregarHistorial}>
                {/* Tipo de Cambio */}
                <div style={profileStyles.modalFormGroup}>
                  <label style={profileStyles.modalFormLabel}>
                    Tipo de Cambio:
                  </label>
                  <select
                    name="tipo_cambio"
                    value={nuevoHistorial.tipo_cambio}
                    onChange={handleHistorialChange}
                    style={profileStyles.modalFormInput}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Estatus">Estatus</option>
                    <option value="Redistribución">Redistribución</option>
                    <option value="Turno">Turno</option>
                  </select>
                </div>
                {/* Estatus */}
                <div style={profileStyles.modalFormGroup}>
                  <label style={profileStyles.modalFormLabel}>Estatus:</label>
                  <select
                    name="estatus"
                    value={nuevoHistorial.estatus}
                    onChange={handleHistorialChange}
                    style={{
                      ...profileStyles.modalFormInput, // 1. Estilo base
                      ...(nuevoHistorial.tipo_cambio === "Redistribución" ||
                      nuevoHistorial.tipo_cambio === "Turno" // 2. La misma condición que 'disabled'
                        ? profileStyles.modalFormInputDisabled // 3. Si es verdad, aplica el estilo gris
                        : {}), // 4. Si no, no hagas nada
                    }}
                    disabled={
                      nuevoHistorial.tipo_cambio === "Redistribución" ||
                      nuevoHistorial.tipo_cambio === "Turno"
                    }
                  >
                    <option value="">Seleccione...</option>
                    <option value="01 ACTIVO">01 ACTIVO</option>
                    <option value="02 RETIRO TEMP. (CUBA)">
                      02 RETIRO TEMP. (CUBA)
                    </option>
                    <option value="03 RETIRO TEMP. (MEXICO)">
                      03 RETIRO TEMP. (MEXICO)
                    </option>
                    <option value="04 SOL. PERSONAL">04 SOL. PERSONAL</option>
                    <option value="05 INCAPACIDAD">05 INCAPACIDAD</option>
                    <option value="06 BAJA">06 BAJA</option>
                  </select>
                </div>
                {/* Fechas */}
                <div style={{ display: "flex", gap: "15px" }}>
                  <div style={{ ...profileStyles.modalFormGroup, flex: 1 }}>
                    <label style={profileStyles.modalFormLabel}>
                      Fecha Inicio:
                    </label>
                    <input
                      name="fecha_inicio"
                      type="date"
                      value={nuevoHistorial.fecha_inicio}
                      onChange={handleHistorialChange}
                      style={profileStyles.modalFormInput}
                    />
                  </div>
                  <div style={{ ...profileStyles.modalFormGroup, flex: 1 }}>
                    <label style={profileStyles.modalFormLabel}>
                      Fecha Fin
                      {!["", "01 ACTIVO", "06 BAJA"].includes(
                        nuevoHistorial.estatus
                      ) && "*"}
                      :
                    </label>
                    <input
                      name="fecha_fin"
                      type="date"
                      value={nuevoHistorial.fecha_fin}
                      onChange={handleHistorialChange}
                      style={{
                        ...profileStyles.modalFormInput,
                        ...(["01 ACTIVO", "06 BAJA"].includes(
                          nuevoHistorial.estatus
                        ) ||
                        nuevoHistorial.tipo_cambio === "Redistribución" ||
                        nuevoHistorial.tipo_cambio === "Turno"
                          ? profileStyles.modalFormInputDisabled
                          : {}),
                      }}
                      disabled={
                        ["01 ACTIVO", "06 BAJA"].includes(
                          nuevoHistorial.estatus
                        ) ||
                        nuevoHistorial.tipo_cambio === "Redistribución" ||
                        nuevoHistorial.tipo_cambio === "Turno"
                      }
                    />
                  </div>
                </div>
                {/* TURNO */}
                <div style={profileStyles.modalFormGroup}>
                  <label style={profileStyles.modalFormLabel}>TURNO:</label>
                  <select
                    name="turno"
                    value={nuevoHistorial.turno}
                    onChange={handleHistorialChange}
                    style={{
                      ...profileStyles.modalFormInput,
                      ...(nuevoHistorial.tipo_cambio === "Estatus" ||
                      nuevoHistorial.tipo_cambio === "Redistribución"
                        ? profileStyles.modalFormInputDisabled
                        : {}),
                    }}
                    disabled={
                      nuevoHistorial.tipo_cambio === "Estatus" ||
                      nuevoHistorial.tipo_cambio === "Redistribución"
                    }
                  >
                    <option value="">Seleccione un turno...</option>
                    <option value="Jornada Acumulada">Jornada Acumulada</option>
                    <option value="Matutino">Matutino</option>
                    <option value="No Aplica">No Aplica</option>
                    <option value="Nocturno A">Nocturno A</option>
                    <option value="Nocturno B">Nocturno B</option>
                    <option value="Vespertino">Vespertino</option>
                  </select>
                </div>
                {/* CLUES (con autocompletado) */}
                <div style={profileStyles.modalFormGroup}>
                  <label style={profileStyles.modalFormLabel}>CLUES:</label>
                  <input
                    name="clues"
                    value={nuevoHistorial.clues}
                    onChange={handleHistorialChange}
                    style={{
                      ...profileStyles.modalFormInput,
                      ...(nuevoHistorial.tipo_cambio === "Estatus" ||
                      nuevoHistorial.tipo_cambio === "Turno"
                        ? profileStyles.modalFormInputDisabled
                        : {}),
                    }}
                    disabled={
                      nuevoHistorial.tipo_cambio === "Estatus" ||
                      nuevoHistorial.tipo_cambio === "Turno"
                    }
                  />
                </div>
                <div style={profileStyles.modalFormGroup}>
                  <label style={profileStyles.modalFormLabel}>Entidad:</label>
                  <input
                    type="text"
                    name="entidad"
                    value={nuevoHistorial.entidad || ""}
                    style={{
                      ...profileStyles.modalFormInput,
                      ...(nuevoHistorial.tipo_cambio === "Estatus" ||
                      nuevoHistorial.tipo_cambio === "Turno"
                        ? profileStyles.modalFormInputDisabled
                        : {}),
                    }}
                    readOnly
                  />
                </div>
                <div style={profileStyles.modalFormGroup}>
                  <label style={profileStyles.modalFormLabel}>Unidad:</label>
                  <input
                    type="text"
                    name="nombre_unidad"
                    value={nuevoHistorial.nombre_unidad || ""}
                    style={{
                      ...profileStyles.modalFormInput,
                      ...(nuevoHistorial.tipo_cambio === "Estatus" ||
                      nuevoHistorial.tipo_cambio === "Turno"
                        ? profileStyles.modalFormInputDisabled
                        : {}),
                    }}
                    readOnly
                  />
                </div>
                {/* ... (campos para Entidad y Unidad, que se autocompletarían con la CLUES) ... */}
                <div style={profileStyles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(false)}
                    style={profileStyles.cancelButton}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={profileStyles.saveButton}
                  >
                    Añadir al Historial
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default DoctorProfileView;
