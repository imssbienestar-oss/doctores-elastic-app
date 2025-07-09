// src/components/AddDoctorModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from "react-modal";
import { useAuth } from "../src/contexts/AuthContext";

const ESTATUS_OPTIONS = [
  { value: "", label: "Seleccione un estatus..." },
  { value: "01 ACTIVO", label: "01 ACTIVO" },
  { value: "02 RETIRO TEMP.", label: "02 RETIRO TEMPORAL" },
  { value: "03 SOL. PERSONAL", label: "03 SOLICITUD PERSONAL" },
  { value: "04 INCAPACIDAD", label: "04 INCAPACIDAD" },
  { value: "05 BAJA", label: "05 BAJA" },
];

const ESPECIALIDAD_OPTIONS = [
{ value: "", label: "Seleccione una especialidad..." },
{ value: "01 ANATOMIA PATOLOGICA", label: "01 ANATOMIA PATOLOGICA"},
{ value: "01 ANESTESIOLOGIA", label: "01 ANESTESIOLOGIA"},
{ value: "01 CIRUGIA GENERAL", label: "01 CIRUGIA GENERAL"},
{ value: "01 EPIDEMIOLOGIA", label: "01 EPIDEMIOLOGIA"},
{ value: "01 GINECOLOGIA Y OBSTETRICIA", label: "01 GINECOLOGIA Y OBSTETRICIA"},
{ value: "01 MEDICINA DE URGENCIAS", label: "01 MEDICINA DE URGENCIAS"},
{ value: "01 MEDICINA FAMILIAR", label: "01 MEDICINA FAMILIAR"},
{ value: "01 OFTALMOLOGIA", label: "01 OFTALMOLOGIA"},
{ value: "01 OTORRINOLARINGOLOGIA Y CIRUGIA DE CABEZA Y CUELLO", label: "01 OTORRINOLARINGOLOGIA Y CIRUGIA DE CABEZA Y CUELLO"},
{ value: "01 PSIQUIATRIA", label: "01 PSIQUIATRIA"},
{ value: "01 RADIOLOGIA E IMAGEN", label: "01 RADIOLOGIA E IMAGEN"},
{ value: "01 TRAUMATOLOGIA Y ORTOPEDIA", label: "01 TRAUMATOLOGIA Y ORTOPEDIA"},
{ value: "01 MEDICINA DE REHABILITACION", label: "01 MEDICINA DE REHABILITACION"},
{ value: "01 MEDICINA INTERNA", label: "01 MEDICINA INTERNA"},
{ value: "01 PEDIATRIA MEDICA", label: "01 PEDIATRIA MEDICA"},
{ value: "02 ANGIOLOGIA, CIRUGIA VASCULAR Y ENDOVASCULAR", label: "02 ANGIOLOGIA, CIRUGIA VASCULAR Y ENDOVASCULAR"},
{ value: "02 CIRUGIA ONCOLOGICA", label: "02 CIRUGIA ONCOLOGICA"},
{ value: "02 CIRUGIA PEDIATRICA", label: "02 CIRUGIA PEDIATRICA"},
{ value: "02 COLOPROCTOLOGIA", label: "02 COLOPROCTOLOGIA"},
{ value: "02 NEUROCIRUGIA", label: "02 NEUROCIRUGIA"},
{ value: "02 UROLOGIA", label: "02 UROLOGIA"},
{ value: "02 CARDIOLOGIA CLINICA", label: "02 CARDIOLOGIA CLINICA"},
{ value: "02 DERMATOLOGIA", label: "02 DERMATOLOGIA"},
{ value: "02 ENDOCRINOLOGIA", label: "02 ENDOCRINOLOGIA"},
{ value: "02 GASTROENTEROLOGIA", label: "02 GASTROENTEROLOGIA"},
{ value: "02 GERIATRIA", label: "02 GERIATRIA"},
{ value: "02 HEMATOLOGIA", label: "02 HEMATOLOGIA"},
{ value: "02 INMUNOLOGIA CLINICA Y ALERGIA", label: "02 INMUNOLOGIA CLINICA Y ALERGIA"},
{ value: "02 MEDICINA CRITICA", label: "02 MEDICINA CRITICA"},
{ value: "02 NEFROLOGIA", label: "02 NEFROLOGIA"},
{ value: "02 NEUMOLOGIA", label: "02 NEUMOLOGIA"},
{ value: "02 NEUROLOGIA ADULTOS", label: "02 NEUROLOGIA ADULTOS"},
{ value: "02 ONCOLOGIA MEDICA", label: "02 ONCOLOGIA MEDICA"},
{ value: "02 REUMATOLOGIA", label: "02 REUMATOLOGIA"},
{ value: "02 MEDICINA DEL ENFERMO PEDIATRICO EN ESTADO CRITICO", label: "02 MEDICINA DEL ENFERMO PEDIATRICO EN ESTADO CRITICO"},
{ value: "02 NEONATOLOGIA", label: "02 NEONATOLOGIA"},
{ value: "02 ONCOLOGIA PEDIATRICA", label: "02 ONCOLOGIA PEDIATRICA"},
{ value: "02 PSIQUIATRIA INFANTIL Y DE LA ADOLESCENCIA", label: "02 PSIQUIATRIA INFANTIL Y DE LA ADOLESCENCIA"},


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
    width: "90%", // Responsivo para pantallas pequeñas
    maxWidth: "500px", // Ancho máximo
    maxHeight: "calc(100vh - 60px)", // Margen vertical de 30px arriba y abajo
    overflowY: "auto",
    fontFamily: "Arial, sans-serif",
    color: "#333",
    position: "relative", // Necesario para el centrado con flex en overlay
    inset: "auto", // Resetea las propiedades de posicionamiento absoluto
    border: "none", // El boxShadow ya define el borde visual
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
    // Hereda de input y añade apariencia para el dropdown
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
    // Nota: '&:hover': {backgroundColor: '#5a6268'} no funciona en estilos en línea JS
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

function AddDoctorModal({ isOpen, onRequestClose, onSave }) {
  const { token: authToken, logout: authLogout } = useAuth();

  const initialFormData = {
    id_imss: "",
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    estatus: "",
    curp: "",
    especialidad: "",
    entidad: "",
    fecha_nacimiento: "",
  };

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";


  const [formData, setFormData] = useState(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [fechaNacimientoCalculada, setFechaNacimientoCalculada] = useState("");

  const [curpError, setCurpError] = useState("");
  const [isCheckingCurp, setIsCheckingCurp] = useState(false);
  const [debouncedCurp, setDebouncedCurp] = useState("");

 // --- ÚNICO useEffect para manejar la apertura del modal ---
   useEffect(() => {
        if (isOpen) {
            setFormData(initialFormData);
            setError("");
            setIsSaving(false);
            setCurpError("");
        }
    }, [isOpen]);


  const calcularFechaNacimientoDesdeCURP = (curp) => {
    if (curp && curp.length >= 10) {
      const anioStr = curp.substring(4, 6);
      const mesStr = curp.substring(6, 8);
      const diaStr = curp.substring(8, 10);

      if (
        !/^\d+$/.test(anioStr) ||
        !/^\d+$/.test(mesStr) ||
        !/^\d+$/.test(diaStr)
      ) {
        return {
          displayDate: "CURP: Formato de fecha inválido en CURP.",
          isoDate: null,
        };
      }

      let anio = parseInt(anioStr, 10);
      const mes = parseInt(mesStr, 10);
      const dia = parseInt(diaStr, 10);

      const currentYear = new Date().getFullYear();
      const currentCentury = Math.floor(currentYear / 100) * 100; // Ej: 2000
      const currentYearLastTwoDigits = currentYear % 100; // Ej: 24 para 2024

      // Heurística para el siglo: si el año del CURP es mayor que los dos dígitos del año actual + un margen (ej. 10),
      // se asume que es del siglo pasado. Si no, del actual o futuro cercano.
      if (anio > currentYearLastTwoDigits + 10 && anio <= 99) {
        anio = currentCentury - 100 + anio; // Ej: 1900 + anio
      } else {
        anio = currentCentury + anio; // Ej: 2000 + anio
      }
      // Corrección para años futuros si el siglo se calculó mal (ej. CURP '00' y estamos en 2024 -> 2000, no 2100)
      if (anio > currentYear + 5) {
        // Si el año calculado es mucho mayor que el actual
        anio -= 100;
      }

      if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
        return { displayDate: "CURP: Fecha en CURP inválida.", isoDate: null };
      }
      try {
        const fecha = new Date(anio, mes - 1, dia); // Mes es 0-indexed
        // Validar que la fecha construida sea la misma que los componentes extraídos
        if (
          fecha.getFullYear() !== anio ||
          fecha.getMonth() !== mes - 1 ||
          fecha.getDate() !== dia
        ) {
          return {
            displayDate: "CURP: Fecha no válida (ej. 31/02).",
            isoDate: null,
          };
        }
        const displayDate = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const isoDate = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        return { displayDate, isoDate };
      } catch (e) {
        return {
          displayDate: "CURP: Error al formatear fecha.",
          isoDate: null,
        };
      }
    }
    return { displayDate: "", isoDate: null };
  };

  // --- FUNCIÓN PARA VERIFICAR SI EL CURP EXISTE ---
  const checkCurpExists = useCallback(async (curpValue) => {
    if (!curpValue || curpValue.length !== 18 || !authToken) {
      setCurpError('');
      return false;
    }
    setIsCheckingCurp(true); setCurpError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/doctores/check-curp/${curpValue}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.exists) {
        setCurpError(data.message || "⚠️ Esta CURP ya está registrada en el sistema");
        return true; // Retorna true cuando la CURP existe
      } else {
        setCurpError('');
        return false; // Retorna false cuando la CURP no existe
      }

    } catch (err) {
      console.error("Error verificando CURP:", err);
      setCurpError("⚠️ Error al verificar la CURP. Intente nuevamente.");
      return false; // En caso de error, asumimos que no existe para permitir continuar
    } finally {
      setIsCheckingCurp(false);
    }
  }, [authToken]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (formData.curp.length === 18) {
        checkCurpExists(formData.curp);
      } else if (formData.curp.length > 0) {
        setCurpError('La CURP debe tener exactamente 18 caracteres');
      } else {
        setCurpError('');
      }
    }, 700);

    return () => clearTimeout(handler);
  }, [formData.curp, checkCurpExists]);


  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevFormData) => {
      const newFormData = { ...prevFormData, [name]: value };
      if (name === "curp") {
        const curpUpper = value.toUpperCase();
        newFormData.curp = curpUpper;

        if (curpUpper.length === 18) {
          const { displayDate, isoDate } = calcularFechaNacimientoDesdeCURP(curpUpper);
          setFechaNacimientoCalculada(displayDate);
          newFormData.fecha_nacimiento = isoDate || "";
        } else {
          setFechaNacimientoCalculada('');
          newFormData.fecha_nacimiento = "";
        }
      }
      return newFormData;
    });
  };

  const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        // --- CORREGIDO: Añadir validación para id_imss ---
        if (!formData.id_imss.trim() || !formData.nombre.trim() || !formData.apellido_paterno.trim() || !formData.estatus || !formData.especialidad || !formData.entidad) {
            setError("Por favor, completa todos los campos requeridos (*).");
            setIsSaving(false);
            return;
        }

        setIsSaving(true);
        
        // --- CORREGIDO: Enviar id_imss en el payload ---
        const dataToSend = {
            id_imss: formData.id_imss.trim(),
            nombre: formData.nombre.trim(),
            apellido_paterno: formData.apellido_paterno.trim(),
            apellido_materno: formData.apellido_materno.trim(),
            estatus: formData.estatus,
            curp: formData.curp.trim() || null,
            especialidad: formData.especialidad.trim(),
            entidad: formData.entidad,
            // ... (resto de campos)
        };

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
                const responseData = await response.json();
                onSave(responseData, false); // El segundo parámetro indica que no estaba editando
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


  const createFields = [
    
    {
      name: "id_imss",
      label: "ID IMSS",
      type: "text",
      required: true,
      placeholder: "Ej: MC_0000",
    },
    {
      name: "nombre",
      label: "Nombres",
      type: "text",
      required: true,
      placeholder: "Ej: Ana Sofía",
    },
    {
      name: "apellido_paterno",
      label: "Apellido Paterno",
      type: "text",
      required: true,
      placeholder: "Ej: Pérez",
    },
    {
      name: "apellido_materno",
      label: "Apellido Materno",
      type: "text",
      required: true,
      placeholder: "Ej: López",
    },

    {
      name: "estatus",
      label: "Estatus",
      type: "select",
      options: ESTATUS_OPTIONS,
      required: true,
    },
    {
      name: "curp",
      label: "CURP",
      type: "text",
      required: false,
      maxLength: 18,
      placeholder: "18 caracteres (opcional)",
    },
    {
      name: "especialidad",
      label: "Especialidad",
      type: "select",
      options: ESPECIALIDAD_OPTIONS,
      required: true,
    },
    {
      name: "entidad",
      label: "Entidad de Adscripción",
      type: "select",
      options: ESTADOS_OPTIONS,
      required: true,
    },
  ];

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
        {createFields.map((field) => {
          const commonProps = {
            id: field.name,
            name: field.name,
            value: formData[field.name] || "",
            onChange: handleChange,
            required: field.required,
            style: {
              ...modalStyles.input,
              ...(field.type === "select" ? modalStyles.select : {}),
            },
            disabled: isSaving,
          };
          return (
            <div key={field.name} style={modalStyles.formGroup}>
              <label htmlFor={field.name} style={modalStyles.label}>

                {field.label}
                {field.required && <span style={{ color: "red" }}>*</span>}:
              </label>
              {field.type === "select" ? (
                <select {...commonProps}>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>

                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  {...commonProps}
                />
              )}
              {field.name === "curp" && (
                <>
                  {fechaNacimientoCalculada && (
                    <p style={modalStyles.infoText}>
                      Fecha de Nacimiento (calculada):{" "}
                      {fechaNacimientoCalculada}
                    </p>
                  )}
                  {isCheckingCurp && (
                    <p style={modalStyles.infoText}>Verificando CURP...</p>
                  )}
                  {curpError && (
                    <p
                      style={{
                        ...modalStyles.errorText,
                        textAlign: "left",
                        marginTop: "5px",
                      }}
                    >
                      {curpError}
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
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
