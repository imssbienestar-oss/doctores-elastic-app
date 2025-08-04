// src/components/AddDoctorModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import Modal from "react-modal";
import { useAuth } from "../src/contexts/AuthContext";

const ESTATUS_OPTIONS = [
  { value: "", label: "Seleccione un estatus..." },
  { value: "01 ACTIVO", label: "01 ACTIVO" },
  { value: "02 RETIRO TEMP. (CUBA)", label: "02 RETIRO TEMPORAL (CUBA)" },
  { value: "03 RETIRO TEMP. (MEXICO)", label: "03 RETIRO TEMPORAL (MEXICO)" },
  { value: "04 SOL. PERSONAL", label: "04 SOLICITUD PERSONAL" },
  { value: "05 INCAPACIDAD", label: "05 INCAPACIDAD" },
  { value: "06 BAJA", label: "06 BAJA" },
];

const ESPECIALIDAD_OPTIONS = [
  { value: "", label: "Seleccione una especialidad..." },
  { value: "01 ANATOMIA PATOLOGICA", label: "01 ANATOMIA PATOLOGICA" },
  { value: "01 ANESTESIOLOGIA", label: "01 ANESTESIOLOGIA" },
  { value: "01 CIRUGIA GENERAL", label: "01 CIRUGIA GENERAL" },
  { value: "01 EPIDEMIOLOGIA", label: "01 EPIDEMIOLOGIA" },
  {
    value: "01 GINECOLOGIA Y OBSTETRICIA",
    label: "01 GINECOLOGIA Y OBSTETRICIA",
  },
  { value: "01 MEDICINA DE URGENCIAS", label: "01 MEDICINA DE URGENCIAS" },
  { value: "01 MEDICINA FAMILIAR", label: "01 MEDICINA FAMILIAR" },
  { value: "01 OFTALMOLOGIA", label: "01 OFTALMOLOGIA" },
  {
    value: "01 OTORRINOLARINGOLOGIA Y CIRUGIA DE CABEZA Y CUELLO",
    label: "01 OTORRINOLARINGOLOGIA Y CIRUGIA DE CABEZA Y CUELLO",
  },
  { value: "01 PSIQUIATRIA", label: "01 PSIQUIATRIA" },
  { value: "01 RADIOLOGIA E IMAGEN", label: "01 RADIOLOGIA E IMAGEN" },
  {
    value: "01 TRAUMATOLOGIA Y ORTOPEDIA",
    label: "01 TRAUMATOLOGIA Y ORTOPEDIA",
  },
  {
    value: "01 MEDICINA DE REHABILITACION",
    label: "01 MEDICINA DE REHABILITACION",
  },
  { value: "01 MEDICINA INTERNA", label: "01 MEDICINA INTERNA" },
  { value: "01 PEDIATRIA MEDICA", label: "01 PEDIATRIA MEDICA" },
  {
    value: "02 ANGIOLOGIA, CIRUGIA VASCULAR Y ENDOVASCULAR",
    label: "02 ANGIOLOGIA, CIRUGIA VASCULAR Y ENDOVASCULAR",
  },
  { value: "02 CIRUGIA ONCOLOGICA", label: "02 CIRUGIA ONCOLOGICA" },
  { value: "02 CIRUGIA PEDIATRICA", label: "02 CIRUGIA PEDIATRICA" },
  { value: "02 COLOPROCTOLOGIA", label: "02 COLOPROCTOLOGIA" },
  { value: "02 NEUROCIRUGIA", label: "02 NEUROCIRUGIA" },
  { value: "02 UROLOGIA", label: "02 UROLOGIA" },
  { value: "02 CARDIOLOGIA CLINICA", label: "02 CARDIOLOGIA CLINICA" },
  { value: "02 DERMATOLOGIA", label: "02 DERMATOLOGIA" },
  { value: "02 ENDOCRINOLOGIA", label: "02 ENDOCRINOLOGIA" },
  { value: "02 GASTROENTEROLOGIA", label: "02 GASTROENTEROLOGIA" },
  { value: "02 GERIATRIA", label: "02 GERIATRIA" },
  { value: "02 HEMATOLOGIA", label: "02 HEMATOLOGIA" },
  {
    value: "02 INMUNOLOGIA CLINICA Y ALERGIA",
    label: "02 INMUNOLOGIA CLINICA Y ALERGIA",
  },
  { value: "02 MEDICINA CRITICA", label: "02 MEDICINA CRITICA" },
  { value: "02 NEFROLOGIA", label: "02 NEFROLOGIA" },
  { value: "02 NEUMOLOGIA", label: "02 NEUMOLOGIA" },
  { value: "02 NEUROLOGIA ADULTOS", label: "02 NEUROLOGIA ADULTOS" },
  { value: "02 ONCOLOGIA MEDICA", label: "02 ONCOLOGIA MEDICA" },
  { value: "02 REUMATOLOGIA", label: "02 REUMATOLOGIA" },
  {
    value: "02 MEDICINA DEL ENFERMO PEDIATRICO EN ESTADO CRITICO",
    label: "02 MEDICINA DEL ENFERMO PEDIATRICO EN ESTADO CRITICO",
  },
  { value: "02 NEONATOLOGIA", label: "02 NEONATOLOGIA" },
  { value: "02 ONCOLOGIA PEDIATRICA", label: "02 ONCOLOGIA PEDIATRICA" },
  {
    value: "02 PSIQUIATRIA INFANTIL Y DE LA ADOLESCENCIA",
    label: "02 PSIQUIATRIA INFANTIL Y DE LA ADOLESCENCIA",
  },
];

const ESTADOS_OPTIONS = [
  { value: "", label: "Seleccione una entidad..." },
  { value: "AGS", label: "Aguascalientes" },
  { value: "BC", label: "Baja California" },
  { value: "BCS", label: "Baja California Sur" },
  { value: "CAMP", label: "Campeche" },
  { value: "COAH", label: "Coahuila de Zaragoza" },
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
  { value: "MICH", label: "Michoacán de Ocampo" },
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
  { value: "ZAC", label: "Zacatecas" },
];

const modalStyles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1100,
  },
  content: {
    backgroundColor: "#ffffff",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
    width: "90%",
    maxWidth: "500px",
    maxHeight: "calc(100vh - 60px)",
    overflowY: "auto",
    fontFamily: "Arial, sans-serif",
    color: "#333",
    position: "relative",
    inset: "auto",
    border: "none",
  },
  modalHeader: {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "20px",
    textAlign: "center",
    color: "#10312B",
    borderBottom: "1px solid #dee2e6",
    paddingBottom: "15px",
  },
  formGroup: {
    marginBottom: "1rem",
  },
  label: {
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: "500",
    fontSize: "0.9rem",
    color: "#495057",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    fontSize: "0.95rem",
    lineHeight: "1.5",
    color: "#495057",
    backgroundColor: "#fff",
    backgroundClip: "padding-box",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    boxSizing: "border-box",
    transition: "border-color .15s ease-in-out, box-shadow .15s ease-in-out",
  },
  select: {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    fontSize: "0.95rem",
    lineHeight: "1.5",
    color: "#495057",
    backgroundColor: "#fff",
    backgroundClip: "padding-box",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    boxSizing: "border-box",
    appearance: "auto",
    WebkitAppearance: "auto",
    MozAppearance: "auto",
    backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23495057%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.9z%22%2F%3E%3C%2Fsvg%3E')`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right .75rem center",
    backgroundSize: "8px 10px",
    paddingRight: "2.5rem",
  },
  buttonContainer: {
    marginTop: "1.5rem",
    paddingTop: "1rem",
    borderTop: "1px solid #dee2e6",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  button: {
    padding: "10px 20px",
    fontSize: "0.95rem",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    fontWeight: "500",
    transition: "background-color 0.2s ease, opacity 0.2s ease",
  },
  primaryButton: {
    color: "#fff",
    backgroundColor: "#006657",
  },
  secondaryButton: {
    color: "#fff",
    backgroundColor: "#6c757d",
  },
  errorText: {
    color: "#dc3545",
    textAlign: "center",
    margin: "10px 0 0 0",
    fontSize: "0.85em",
  },
  infoText: {
    fontSize: "0.8em",
    color: "#6c757d",
    marginTop: "4px",
    fontStyle: "italic",
  },
};

function getInfoFromCURP(curp) {
  if (!curp || typeof curp !== "string" || curp.length !== 18) {
    return null;
  }

  const sexoChar = curp.charAt(10).toUpperCase();
  const sexo =
    sexoChar === "H" ? "Masculino" : sexoChar === "M" ? "Femenino" : "Otro";

  const anioStr = curp.substring(4, 6);
  const mesStr = curp.substring(6, 8);
  const diaStr = curp.substring(8, 10);

  let anio = parseInt(anioStr, 10);
  const mes = parseInt(mesStr, 10);
  const dia = parseInt(diaStr, 10);

  const anioActualDosDigitos = new Date().getFullYear() % 100;
  const siglo = anio > anioActualDosDigitos + 5 ? 1900 : 2000; // Lógica de siglo mejorada
  anio += siglo;

  const fechaNacimiento = new Date(anio, mes - 1, dia);
  if (isNaN(fechaNacimiento.getTime()) || fechaNacimiento.getDate() !== dia) {
    return null; // Fecha inválida (ej. 31 de Febrero)
  }

  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const m = hoy.getMonth() - fechaNacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }

  return {
    fechaNacimiento: `${anio}-${String(mes).padStart(2, "0")}-${String(
      dia
    ).padStart(2, "0")}`,
    sexo,
    edad,
  };
}

function AddDoctorModal({ isOpen, onRequestClose, onSave }) {
  const { token: authToken, logout: authLogout } = useAuth();

  const initialFormData = {
    id_imss: "",
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    estatus: "",
    fecha_estatus: "",
    clues: "",
    entidad: "",
    nombre_unidad: "",
    curp: "",
    especialidad: "",
    fecha_nacimiento: "",
    sexo: "",
    turno: "",
    municipio: "",
    nivel_atencion: ""
  };

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  const [isLoadingClues, setIsLoadingClues] = useState(false);
  const [cluesError, setCluesError] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [fechaNacimientoCalculada, setFechaNacimientoCalculada] = useState("");

  const [curpError, setCurpError] = useState("");
  const [isCheckingCurp, setIsCheckingCurp] = useState(false);
  const [debouncedCurp, setDebouncedCurp] = useState("");

  const [opcionesEntidad, setOpcionesEntidad] = useState([]);
  const [isLoadingEntidades, setIsLoadingEntidades] = useState(false);

  // --- useEffect para manejar la apertura del modal ---
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setError("");
      setIsSaving(false);
      setCurpError("");
      setCluesError("");

      const fetchEntidades = async () => {
        setIsLoadingEntidades(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/opciones/entidades-capacidad`
          );
          const data = await response.json();
          setOpcionesEntidad(data);
        } catch (error) {
          console.error("Error al cargar capacidades de entidades:", error);
        } finally {
          setIsLoadingEntidades(false);
        }
      };
      fetchEntidades();
    }
  }, [isOpen]);

  // --- FUNCIÓN PARA VERIFICAR SI EL CURP EXISTE ---
  const checkCurpExists = useCallback(
    async (curpValue) => {
      if (!curpValue || curpValue.length !== 18 || !authToken) {
        setCurpError("");
        return false;
      }
      setIsCheckingCurp(true);
      setCurpError("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/doctores/check-curp/${curpValue}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.exists) {
          setCurpError(
            data.message || "⚠️ Esta CURP ya está registrada en el sistema"
          );
          return true; // Retorna true cuando la CURP existe
        } else {
          setCurpError("");
          return false; // Retorna false cuando la CURP no existe
        }
      } catch (err) {
        console.error("Error verificando CURP:", err);
        setCurpError("Error al verificar la CURP. Intente nuevamente.");
        return false;
      } finally {
        setIsCheckingCurp(false);
      }
    },
    [authToken]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      if (formData.curp.length === 18) {
        checkCurpExists(formData.curp);
      } else if (formData.curp.length > 0) {
        setCurpError("La CURP debe tener exactamente 18 caracteres");
      } else {
        setCurpError("");
      }
    }, 700);

    return () => clearTimeout(handler);
  }, [formData.curp, checkCurpExists]);

  const fetchAndApplyCluesData = async (cluesCode) => {
    if (cluesCode.length !== 11) {
      setCluesError("");
      return;
    }

    setIsLoadingClues(true);
    setCluesError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/clues-con-capacidad/${cluesCode}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      if (!response.ok) {
        if (response.status === 404) setCluesError("CLUES no encontrada.");
        else setCluesError("Error al buscar CLUES.");
        return;
      }
      const data = await response.json();

      if (data.actual >= data.maximo) {
        setCluesError(
          `La entidad ${data.entidad} ha alcanzado su cupo máximo (${data.actual}/${data.maximo}).`
        );
        return;
      }

      // Rellenamos el formulario con los datos encontrados
      setFormData((prev) => ({
        ...prev,
        direccion_unidad: data.direccion_unidad || "",
        nombre_unidad: data.nombre_unidad || "",
        entidad: data.entidad || "",
        municipio: data.municipio || "",
        nivel_atencion: data.nivel_atencion || "",
        tipo_establecimiento: data.tipo_establecimiento || "",
        subtipo_establecimiento: data.subtipo_establecimiento || "",
        estrato: data.estrato || "",
      }));
    } catch (error) {
      console.error("Error al obtener datos de CLUES:", error);
      setCluesError("Error de conexión al buscar CLUES.");
    } finally {
      setIsLoadingClues(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "clues") {
      fetchAndApplyCluesData(value);
    }

    setFormData((prevFormData) => {
      const newFormData = { ...prevFormData, [name]: value };
      if (name === "curp") {
        const curpUpper = value.toUpperCase();
        newFormData.curp = curpUpper;

        const info = getInfoFromCURP(curpUpper);
        if (info) {
          newFormData.fecha_nacimiento = info.fechaNacimiento;
          newFormData.sexo = info.sexo;
          newFormData.edad = info.edad;
        } else {
          newFormData.fecha_nacimiento = "";
          newFormData.sexo = "";
          newFormData.edad = null; // Limpiamos la edad si la CURP es inválida
        }
      }
      return newFormData;
    });

    if (name === "clues") {
      fetchAndApplyCluesData(value);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // --- Añadir validación para id_imss ---
    if (
      !formData.id_imss.trim() ||
      !formData.nombre.trim() ||
      !formData.apellido_paterno.trim() ||
      !formData.estatus ||
      !formData.especialidad ||
      !formData.entidad ||
      !formData.fecha_estatus
    ) {
      setError("Por favor, completa todos los campos requeridos (*).");
      setIsSaving(false);
      return;
    }

    setIsSaving(true);

    const dataToSend = { ...formData };
    Object.keys(dataToSend).forEach((key) => {
      if (typeof dataToSend[key] === "string") {
        dataToSend[key] = dataToSend[key].trim();
      }
      if (dataToSend[key] === "") {
        dataToSend[key] = null;
      }
    });

    try {
      const url = `${API_BASE_URL}/api/doctores`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        const savedDoctor = await response.json();
        onSave(savedDoctor, false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Hubo un error al crear el doctor.");
      }
    } catch (err) {
      setError(err.message || "Error de conexión. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={modalStyles}
      contentLabel="Agregar Nuevo Doctor"
      appElement={document.getElementById("root") || undefined}
    >
      <form onSubmit={handleSubmit}>
        <div style={modalStyles.modalHeader}>Agregar Nuevo Doctor</div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>ID IMSS*:</label>
          <input
            type="text"
            name="id_imss"
            value={formData.id_imss}
            onChange={handleChange}
            required
            style={modalStyles.input}
          />
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Nombres*:</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            style={modalStyles.input}
          />
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Apellido Paterno*:</label>
          <input
            type="text"
            name="apellido_paterno"
            value={formData.apellido_paterno}
            onChange={handleChange}
            required
            style={modalStyles.input}
          />
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Apellido Materno:</label>
          <input
            type="text"
            name="apellido_materno"
            value={formData.apellido_materno}
            onChange={handleChange}
            style={modalStyles.input}
          />
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>CURP:</label>
          <input
            type="text"
            name="curp"
            value={formData.curp}
            onChange={handleChange}
            maxLength={18}
            style={modalStyles.input}
          />
          {curpError && <p style={modalStyles.errorText}>{curpError}</p>}
          {fechaNacimientoCalculada && (
            <p style={modalStyles.infoText}>
              Fecha de Nacimiento (calculada): {fechaNacimientoCalculada}
            </p>
          )}
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Estatus*:</label>
          <select
            name="estatus"
            value={formData.estatus}
            onChange={handleChange}
            required
            style={modalStyles.select}
          >
            {ESTATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Fecha de Inicio (Estatus)*:</label>
          <input
            type="date"
            name="fecha_estatus"
            value={formData.fecha_estatus}
            onChange={handleChange}
            required
            style={modalStyles.input}
          />
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Especialidad*:</label>
          <select
            name="especialidad"
            value={formData.especialidad}
            onChange={handleChange}
            required
            style={modalStyles.select}
          >
            {ESPECIALIDAD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Turno:</label>
          <select
            name="turno"
            value={formData.turno}
            onChange={handleChange}
            style={modalStyles.select}
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
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>CLUES*:</label>
          <input
            type="text"
            name="clues"
            value={formData.clues}
            onChange={handleChange}
            required
            style={modalStyles.input}
          />{" "}
          {isLoadingClues && <p style={modalStyles.infoText}>Buscando...</p>}{" "}
          {cluesError && <p style={modalStyles.errorText}>{cluesError}</p>}
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Entidad*:</label>
          <select
            name="entidad"
            value={formData.entidad}
            onChange={handleChange}
            required
            style={modalStyles.select}
          >
            <option value="">
              {isLoadingEntidades ? "Cargando..." : "Seleccione una entidad..."}
            </option>
            {opcionesEntidad.map((opt) => {
              const isFull = opt.actual >= opt.maximo;
              const isLow = opt.actual < opt.minimo;
              let label = `${opt.label} (${opt.actual}/${opt.maximo})`;
              if (isFull) label += " - CUPO LLENO";
              if (isLow) label += " - BAJA OCUPACIÓN";

              return (
                <option
                  key={opt.entidad}
                  value={opt.entidad}
                  disabled={isFull}
                  style={{ color: isLow ? "green" : isFull ? "red" : "black" }}
                >
                  {label}
                </option>
              );
            })}
          </select>
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Unidad Médica:</label>
          <input
            type="text"
            name="nombre_unidad"
            value={formData.nombre_unidad}
            onChange={handleChange}
            style={modalStyles.input}
            readOnly
          />
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Municipio:</label>
          <input
            type="text"
            name="municipio"
            value={formData.municipio}
            onChange={handleChange}
            style={modalStyles.input}
            readOnly
          />
        </div>
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Nivel de Atención:</label>
          <input
            type="text"
            name="nivel_atencion"
            value={formData.nivel_atencion}
            onChange={handleChange}
            style={modalStyles.input}
            readOnly
          />
        </div>

        {error && <p style={modalStyles.errorText}>{error}</p>}
        <div style={modalStyles.buttonContainer}>
          <button
            type="button"
            onClick={onRequestClose}
            style={{ ...modalStyles.button, ...modalStyles.secondaryButton }}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            style={{ ...modalStyles.button, ...modalStyles.primaryButton }}
            disabled={isSaving}
          >
            {isSaving ? "Creando..." : "Crear Doctor"}{" "}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default AddDoctorModal;
