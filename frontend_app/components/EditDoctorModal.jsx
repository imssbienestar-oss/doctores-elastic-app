// src/components/AddDoctorModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; 
import Modal from "react-modal";
import { useAuth } from "../src/contexts/AuthContext";

const ESTATUS_OPTIONS = [
  { value: "", label: "Seleccione un estatus..." },
  { value: "Activo", label: "Activo" },
  { value: "Baja", label: "Baja" },
  { value: "Defunción", label: "Defunción" },
  { value: "Incapacidad por Enfermedad", label: "Incapacidad por Enfermedad" },
  { value: "Retiro Temporal", label: "Retiro Temporal" },
  { value: "Solicitud Personal", label: "Solicitud Personal" },
];

const ESTADOS_OPTIONS = [
  { value: "", label: "Seleccione una entidad..." },
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
  {
    value: "Veracruz de Ignacio de la Llave",
    label: "Veracruz de Ignacio de la Llave",
  },
  { value: "Yucatán", label: "Yucatán" },
  { value: "Zacatecas", label: "Zacatecas" },
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
    nombre_completo: "",
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

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData); // Ahora initialFormData es una referencia estable
      setError("");
      setIsSaving(false);
      setFechaNacimientoCalculada("");
      setCurpError(""); // Limpiar error de CURP al abrir
      setDebouncedCurp(""); // Limpiar CURP para debounce
    }
  }, [isOpen]); // Quitado initialFormData de las dependencias

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
    if (curpError) {
      alert(`Error con CURP: ${curpError}`); // O mostrarlo de otra forma
      setIsSaving(false); // Asegurar que no se quede en "guardando"
      return;
    }
    if (isCheckingCurp) {
      alert("Por favor, espere a que termine la verificación del CURP.");
      setIsSaving(false);
      return;
    }
    setIsSaving(true); // isSaving se vuelve true
    console.log("AddDoctorModal: isSaving establecido a true."); // LOG 2

    const curpYaExiste = await checkCurpExists(formData.curp);
    if (curpYaExiste) {
      alert("⚠️ La CURP ya está registrada. No se puede guardar.");
      setIsSaving(false);
      return;
    }

    if (!authToken) {
      console.error("AddDoctorModal: No hay authToken. Abortando."); // LOG 3
      setError(
        "Error de autenticación: Token no disponible. Inicia sesión de nuevo."
      );
      setIsSaving(false); // Asegurar que se resetee
      return;
    }
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const url = `${apiUrl}/api/doctores`;
    const method = "POST";
    const dataToSend = {
      nombre_completo: formData.nombre_completo.trim(),
      estatus: formData.estatus,
      curp: formData.curp.trim() || null,
      especialidad: formData.especialidad.trim(),
      entidad: formData.entidad,
      fecha_nacimiento: formData.fecha_nacimiento || null,
    };
    console.log("AddDoctorModal: dataToSend preparado:", dataToSend); // LOG 4

    if (
      !dataToSend.nombre_completo ||
      !dataToSend.estatus ||
      !dataToSend.especialidad ||
      !dataToSend.entidad
    ) {
      console.error("AddDoctorModal: Campos requeridos faltantes."); // LOG 5
      setError(
        "Por favor, completa todos los campos requeridos (Nombre, Estatus, Especialidad, Entidad)."
      );
      setIsSaving(false); // Asegurar que se resetee
      return;
    }
    if (dataToSend.curp && dataToSend.curp.length !== 18) {
      console.error("AddDoctorModal: CURP con longitud incorrecta."); // LOG 6
      setError("El CURP debe tener 18 caracteres si se proporciona.");
      setIsSaving(false); // Asegurar que se resetee
      return;
    }
    
    if (
      formData.curp.length === 18 &&
      fechaNacimientoCalculada.startsWith("CURP:")
    ) {
      console.error(
        "AddDoctorModal: Problema con CURP detectado por fechaNacimientoCalculada."
      ); // LOG 7
      setError(
        `Problema con CURP: ${fechaNacimientoCalculada}. Verifique el CURP.`
      );
      setIsSaving(false); // Asegurar que se resetee
      return;
    }
    try {
      console.log("AddDoctorModal: Intentando fetch a:", url); // LOG 8
      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });
      console.log(
        "AddDoctorModal: Respuesta del fetch recibida, status:",
        response.status
      ); // LOG 9

      if (response.ok) {
        const responseData = await response.json();
        console.log("AddDoctorModal: Respuesta OK, data:", responseData); // LOG 10
        onSave(responseData, false); // Llama a la función onSave del padre
        console.log("AddDoctorModal: onSave llamado."); // LOG 11
      } else {
        let errorDetail = "Error la 'CURP' ya esta registrada.";
        // ... (tu lógica de manejo de errores de response.ok) ...
        console.error(
          `AddDoctorModal: Error en respuesta del backend - ${response.status}`,
          errorDetail
        ); // LOG 12
        setError(errorDetail);
      }
    } catch (err) {
      console.error(
        "AddDoctorModal: Error en el bloque catch (fetch o JSON parse):",
        err
      ); // LOG 13
      setError(
        err.message || "Error de conexión al crear el doctor. Intenta de nuevo."
      );
    } finally {
      console.log("AddDoctorModal: Entrando al bloque finally."); // LOG 14
      setIsSaving(false); // isSaving DEBERÍA volverse false aquí
      console.log("AddDoctorModal: isSaving establecido a false."); // LOG 15
    }
  };

  const createFields = [
    {
      name: "nombre_completo",
      label: "Nombre Completo",
      type: "text",
      required: true,
      placeholder: "Ej: Dra. Ana Sofía Pérez López",
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
      type: "text",
      required: true,
      placeholder: "Ej: Cardiología Pediátrica",
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
                {" "}
                {field.label}{" "}
                {field.required && <span style={{ color: "red" }}>*</span>}:{" "}
              </label>
              {field.type === "select" ? (
                <select {...commonProps}>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {" "}
                      {opt.label}{" "}
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
            {" "}
            Cancelar{" "}
          </button>
          <button
            type="submit"
            style={{ ...modalStyles.button, ...modalStyles.primaryButton }}
            disabled={isSaving}
          >
            {" "}
            {isSaving ? "Creando..." : "Crear Doctor"}{" "}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default AddDoctorModal;
