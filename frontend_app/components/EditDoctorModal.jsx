// src/components/EditDoctorModal.jsx
import React, { useState, useEffect } from "react";
import Modal from "react-modal";

// Recibe props: isOpen (si está abierto), onRequestClose (función para cerrar),
// doctorData (los datos del doctor a editar), onSave (función a llamar al guardar)
function EditDoctorModal({ isOpen, onRequestClose, doctorData, onSave }) {
  // Estado interno para los datos del formulario
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // useEffect para cargar los datos del doctor en el formulario cuando el modal se abre o doctorData cambia
  useEffect(() => {
    // Solo carga si hay datos de doctor (evita error si es null al inicio)
    if (doctorData) {
      // Modo Editar
      setFormData({
        identificador_imss: doctorData.identificador_imss || "",
        nombre_completo: doctorData.nombre_completo || "", // Usa '' si es null/undefined
        estatus: doctorData.estatus || "",
        matrimonio_id: doctorData.matrimonio_id || "",
        curp: doctorData.curp || "",
        cedula_esp: doctorData.cedula_esp || "",
        cedula_lic: doctorData.cedula_lic || "",
        especialidad: doctorData.especialidad || "",
        entidad: doctorData.entidad || "",
        clues_ssa: doctorData.clues_ssa || "",
        notificacion_baja: doctorData.notificacion_baja || "",
        motivo_baja: doctorData.motivo_baja || "",
        fecha_extraccion: doctorData.fecha_extraccion || "",
        fecha_notificacion: doctorData.fecha_notificacion || "",
        sexo: doctorData.sexo || "",
        turno: doctorData.turno || "",
        clues_ib: doctorData.clues_ib || "",
        nombre_unidad: doctorData.nombre_unidad || "",
        municipio: doctorData.municipio || "",
        nivel_atencion: doctorData.nivel_atencion || "",
        fecha_estatus: doctorData.fecha_estatus || "",
        despliegue: doctorData.despliegue || "",
        fecha_vuelo: doctorData.fecha_vuelo || "",
        estrato: doctorData.estrato || "",
        acuerdo: doctorData.acuerdo || "",
      });
    } else {
      // Limpiar si no hay doctorData (al cerrar)
      setFormData({
        identificador_imss: "",
        nombre_completo: "",
        estatus: "",
        matrimonio_id: "",
        curp: "",
        cedula_esp: "",
        cedula_lic: "",
        especialidad: "",
        entidad: "",
        clues_ssa: "",
        notificacion_baja: "",
        motivo_baja: "",
        fecha_extraccion: "",
        fecha_notificacion: "",
        sexo: "",
        turno: "",
        clues_ib: "",
        nombre_unidad: "",
        municipio: "",
        nivel_atencion: "",
        fecha_estatus: "",
        despliegue: "",
        fecha_vuelo: "",
        estrato: "",
        acuerdo: "",
      });
    }
    setError(""); // Limpiar errores al abrir/cambiar modo
    setIsSaving(false); // Resetear estado de guardado
  }, [doctorData]); // Se ejecuta cuando doctorData cambia

  // Manejador para actualizar el estado del formulario cuando un input cambia
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Manejador para enviar el formulario
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const token = localStorage.getItem("accessToken");
    // 1. Verificar SOLO el token al principio. Es necesario para AMBAS operaciones.
    if (!token) {
      setError(
        "Error de autenticación: Token no encontrado. Inicia sesión de nuevo."
      ); // Mensaje más específico
      setIsSaving(false);
      return;
    }

    // 2. Determinar si estamos editando o creando
    const isEditing = !!doctorData?.id; // True si doctorData existe y tiene id

    // 3. Construir la URL y el método basado en el modo
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"; // Usar variable de entorno
    let url;
    let method;

    if (isEditing) {
      if (!doctorData?.id) {
        // Comprobación extra
        setError("Error interno: Intentando editar sin ID de doctor.");
        setIsSaving(false);
        return;
      }
      // Ya sabemos que doctorData.id existe si isEditing es true
      url = `${apiUrl}/api/doctores/${doctorData.id}`;
      method = "PUT";
    } else {
      url = `${apiUrl}/api/doctores`;
      method = "POST";
    }

    console.log(
      `Modo: ${
        isEditing ? "Editando" : "Creando"
      }, URL: ${url}, Method: ${method}`
    ); // Log para depurar

     // --- ¡¡VERIFICA QUE ESTE BLOQUE ESTÉ AQUÍ Y SEA CORRECTO!! ---
     console.log("Datos del formulario ANTES de convertir '' a null:", formData); // DEBUG
     // Copiar formData para no mutar el estado directamente
    const dataToSend = { ...formData };
    // Definir los campos que son de tipo fecha en el formulario
    // ¡Asegúrate que los nombres ('name' de los inputs) estén aquí!
    const dateFields = ['fecha_notificacion', 'fecha_estatus', 'fecha_vuelo'];
    // Convertir '' a null para los campos de fecha antes de enviar
    dateFields.forEach(field => {
      // Si el campo existe en dataToSend y su valor es una cadena vacía...
      if (dataToSend.hasOwnProperty(field) && dataToSend[field] === '') {
           console.log(`Convirtiendo campo '${field}' de '' a null`); // DEBUG
           dataToSend[field] = null; // ...lo cambiamos a null
       }
    });
    console.log("Datos a enviar (DESPUÉS de convertir '' a null):", dataToSend); // DEBUG
    // --- FIN DEL BLOQUE IMPORTANTE A VERIFICAR ---


    // 4. Ejecutar la petición fetch
    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend), // Datos del formulario (formData se actualiza con useState)
      });

      // 5. Procesar respuesta (igual que antes)
      if (response.ok) {
        console.log(
          `Doctor ${isEditing ? "actualizado" : "creado"} exitosamente!`
        );
        onSave(); // Llama a la función onSave pasada desde App (que refrescará los datos y cerrará el modal)
      } else {
        let errorDetail = `Error al ${
          isEditing ? "guardar" : "crear"
        } los cambios.`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            // Si el backend envía un detalle específico, úsalo
            if (typeof errorData.detail === "string") {
              errorDetail = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
              // Si FastAPI envía errores de validación Pydantic
              errorDetail = errorData.detail
                .map((err) => `${err.loc[1]}: ${err.msg}`)
                .join(", ");
            }
          }
        } catch (e) {}
        setError(errorDetail);
        console.error(
          `Error al ${isEditing ? "guardar" : "crear"}:`,
          response.status,
          response.statusText
        );
      }
    } catch (err) {
      setError(
        `Error de conexión al ${
          isEditing ? "guardar" : "crear"
        }. Intenta de nuevo.`
      );
      console.error("Error de red al guardar/crear:", err);
    } finally {
      // Asegurarse de que el estado de guardado se desactive incluso si hay errores
      setIsSaving(false);
    }
  }; // Fin de handleSubmit

  // Estilos básicos para el modal (puedes personalizarlos)
  const customStyles = {
    overlay: {
      backgroundColor: "transparent", // O el overlay que prefieras
      zIndex: 1000,
    },
    content: {
      top: "50%",
      left: "50%",
      right: 'auto',                  
      bottom: 'auto', 
      marginRight: '-50%',              
      transform: 'translate(-50%, -50%)',
      backgroundColor: "#ffffff",
      padding: "0px",
      borderRadius: "8px",
      border: "1px solid #ccc",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
      color: "#333",
      width: "50%",

      // --- NUEVO: Para Scroll Vertical ---
      maxHeight: "85vh",
      overflowY: "auto",
      // --- FIN NUEVO ---
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose} // Función para cerrar al hacer clic fuera o presionar Esc
      style={customStyles}
      contentLabel="Editar Doctor"
    >
      {/* Solo renderizar el form si tenemos datos del doctor */}

      <form onSubmit={handleSubmit} className="modal-form">
        <h2>
          {doctorData
            ? `Editar Doctor - ${doctorData.nombre_completo}`
            : "Agregar Nuevo Doctor"}
        </h2>

        {/* --- Campos del Formulario --- */}
        {/* Añade aquí inputs para todos los campos que quieras editar */}
        <div className="form-group">
          <label htmlFor="identificador_imss" className="form-label">
            ID IMSS:
          </label>
          <input
            type="text"
            id="identificador_imss"
            name="identificador_imss"
            value={formData.identificador_imss || ""}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="nombre_completo_modal" className="form-label">
            Nombre Completo:
          </label>
          <input
            type="text"
            id="nombre_completo"
            name="nombre_completo"
            value={formData.nombre_completo || ""}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="estatus_modal" className="form-label">
            Estatus:
          </label>
          <input
            type="text"
            id="estatus_modal"
            name="estatus"
            value={formData.estatus || ""}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="matrimonio_id" className="form-label">
            Matrimonio:
          </label>
          <input
            type="text"
            id="matrimonio_id"
            name="matrimonio_id"
            value={formData.matrimonio_id || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="curp" className="form-label">
            Curp:
          </label>
          <input
            type="text"
            id="curp"
            name="curp"
            value={formData.curp || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="cedula_esp" className="form-label">
            Cédula Especialidad:
          </label>
          <input
            type="text"
            id="cedula_esp"
            name="cedula_esp"
            value={formData.cedula_esp || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="cedula_lic" className="form-label">
            Cédula Licenciatura:
          </label>
          <input
            type="text"
            id="cedula_lic"
            name="cedula_lic"
            value={formData.cedula_lic || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="especialidad" className="form-label">
            Especialidad
          </label>
          <input
            type="text"
            id="especialidad"
            name="especialidad"
            value={formData.especialidad || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="entidad" className="form-label">
            Entidad
          </label>
          <input
            type="text"
            id="entidad"
            name="entidad"
            value={formData.entidad || ""}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="clues_ssa" className="form-label">
            Clues - SSA
          </label>
          <input
            type="text"
            id="clues_ssa"
            name="clues_ssa"
            value={formData.clues_ssa || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="notificacion_baja" className="form-label">
            Notificación Baja
          </label>
          <input
            type="text"
            id="notificacion_baja"
            name="notificacion_baja"
            value={formData.notificacion_baja || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="motivo_baja" className="form-label">
            Motivo Baja
          </label>
          <input
            type="text"
            id="motivo_baja"
            name="motivo_baja"
            value={formData.motivo_baja || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="fecha_extraccion" className="form-label">
            Fecha Extracción
          </label>
          <input
            type="text"
            id="fecha_extraccion"
            name="fecha_extraccion"
            value={formData.fecha_extraccion || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="fecha_notificacion" className="form-label">
            Fecha Notificación
          </label>
          <input
            type="date"
            id="fecha_notificacion"
            name="fecha_notificacion"
            value={formData.fecha_notificacion || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="sexo" className="form-label">
            sexo
          </label>
          <input
            type="text"
            id="sexo"
            name="sexo"
            value={formData.sexo || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="turno" className="form-label">
            turno
          </label>
          <input
            type="text"
            id="turno"
            name="turno"
            value={formData.turno || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="clues_ib" className="form-label">
            Clues IMB
          </label>
          <input
            type="text"
            id="clues_ib"
            name="clues_ib"
            value={formData.clues_ib || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="nombre_unidad" className="form-label">
            Nombre Unidad
          </label>
          <input
            type="text"
            id="nombre_unidad"
            name="nombre_unidad"
            value={formData.nombre_unidad || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="municipio" className="form-label">
            Municipio
          </label>
          <input
            type="text"
            id="municipio"
            name="municipio"
            value={formData.municipio || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="nivel_atencion" className="form-label">
            Nivel Atención
          </label>
          <input
            type="text"
            id="nivel_atencion"
            name="nivel_atencion"
            value={formData.nivel_atencion || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="fecha_estatus" className="form-label">
            Fecha Estatus
          </label>
          <input
            type="date"
            id="fecha_estatus"
            name="fecha_estatus"
            value={formData.fecha_estatus || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="despliegue" className="form-label">
            despliegue
          </label>
          <input
            type="text"
            id="despliegue"
            name="despliegue"
            value={formData.despliegue || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="fecha_vuelo" className="form-label">
            Fecha Vuelo
          </label>
          <input
            type="date"
            id="fecha_vuelo"
            name="fecha_vuelo"
            value={formData.fecha_vuelo || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="estrato" className="form-label">
            estrato
          </label>
          <input
            type="text"
            id="estrato"
            name="estrato"
            value={formData.estrato || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="acuerdo" className="form-label">
            acuerdo
          </label>
          <input
            type="text"
            id="acuerdo"
            name="acuerdo"
            value={formData.acuerdo || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>

        {/* ... Agrega más campos según necesites ... */}

        {/* --- Errores y Botones --- */}
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div className="button-group" style={{ marginTop: "20px" }}>
          <button
            type="submit"
            disabled={isSaving}
            className="form-button primary"
          >
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
          <button
            type="button"
            onClick={onRequestClose}
            style={{ marginLeft: "10px" }}
            disabled={isSaving}
            className="form-button secondary"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default EditDoctorModal;
