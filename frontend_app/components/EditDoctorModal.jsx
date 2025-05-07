// src/components/EditDoctorModal.jsx
import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { useAuth } from "../src/contexts/AuthContext"; // 1. Importar useAuth

// Las props siguen siendo las mismas
function EditDoctorModal({ isOpen, onRequestClose, doctorData, onSave }) {
  // 2. Obtener token y logout del contexto de autenticación
  const { token: authToken, logout: authLogout } = useAuth();
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // useEffect para inicializar/limpiar el formulario (sin cambios)
  useEffect(() => {
    if (doctorData) {
      setFormData({
        identificador_imss: doctorData.identificador_imss || "",
        nombre_completo: doctorData.nombre_completo || "",
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
      // Limpiar formulario para "Agregar Nuevo"
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
    setError("");
    setIsSaving(false);
  }, [doctorData, isOpen]); // Añadir isOpen a las dependencias para resetear al abrir/cerrar

  // handleChange (sin cambios)
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // handleSubmit (MODIFICADO para usar authToken del contexto)
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    // 3. Usar token del AuthContext (renombrado a authToken para claridad)
    //console.log("DEBUG: Token obtenido del AuthContext:", authToken);
    if (!authToken) {
      // Verificar el token del contexto
      setError(
        "Error de autenticación: Token no disponible vía Context. Inicia sesión de nuevo."
      );
      setIsSaving(false);
      // Opcional: podrías llamar a authLogout() si el token desaparece inesperadamente
      // authLogout();
      return;
    }

    const isEditing = !!doctorData?.id;
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const url = isEditing
      ? `${apiUrl}/api/doctores/${doctorData.id}`
      : `${apiUrl}/api/doctores`;
    const method = isEditing ? "PUT" : "POST";

    {/*
    console.log(
      `Modo: ${
        isEditing ? "Editando" : "Creando"
      }, URL: ${url}, Method: ${method}`
    );*/}

    // Preparar datos (conversión de '' a null para fechas)
    const dataToSend = { ...formData };
    const dateFields = ["fecha_notificacion", "fecha_estatus", "fecha_vuelo"];
    dateFields.forEach((field) => {
      if (dataToSend.hasOwnProperty(field) && dataToSend[field] === "") {
        dataToSend[field] = null;
      }
    });
    //console.log("Datos a enviar (después de convertir '' a null):", dataToSend);

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          // 4. Usar authToken del contexto en el header Authorization
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        {/*
        console.log(
          `Doctor ${isEditing ? "actualizado" : "creado"} exitosamente!`
        );*/}
        onSave(); // Llama a la función onSave de App.jsx (que refresca datos y cierra modal)
      } else {
        // Manejo de errores mejorado
        let errorDetail = `Error al ${
          isEditing ? "guardar" : "crear"
        } los cambios.`;
        if (response.status === 401) {
          errorDetail =
            "Error de autenticación (401). Tu sesión puede haber expirado.";
          // Llamar logout del contexto si la sesión expiró durante el intento de guardado
          authLogout();
        } else {
          try {
            const errorData = await response.json();
            if (errorData.detail) {
              if (typeof errorData.detail === "string") {
                errorDetail = errorData.detail;
              } else if (Array.isArray(errorData.detail)) {
                errorDetail = errorData.detail
                  .map((err) => `${err.loc[1]}: ${err.msg}`)
                  .join("; ");
              }
            } else {
              errorDetail = `Error ${response.status}: ${response.statusText}`;
            }
          } catch (e) {
            errorDetail = `Error ${response.status}: ${response.statusText}`;
          }
        }
        setError(errorDetail);
        {/*
        console.error(
          `Error al ${isEditing ? "guardar" : "crear"}:`,
          response.status,
          response.statusText
        );*/}
      }
    } catch (err) {
      setError(
        `Error de conexión al ${
          isEditing ? "guardar" : "crear"
        }. Intenta de nuevo.`
      );
      //console.error("Error de red al guardar/crear:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Estilos (sin cambios)
  const customStyles = {
    overlay: {
      backgroundColor: "transparent", // O el overlay que prefieras
      zIndex: 1000,
    },

    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      backgroundColor: "#DDC9A3",
      padding: "0px",
      borderRadius: "8px",
      border: "1px solid #ccc",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
      color: "#333",
      width: "50%", // --- NUEVO: Para Scroll Vertical ---
      maxHeight: "85vh",
      overflowY: "auto", // --- FIN NUEVO ---
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={customStyles}
      contentLabel={doctorData ? "Editar Doctor" : "Agregar Nuevo Doctor"}
    >
      <form onSubmit={handleSubmit} className="modal-form">
        <h2>
          {doctorData
            ? `Editar Doctor - ${doctorData.nombre_completo}`
            : "Agregar Nuevo Doctor"}
        </h2>

        {/* --- Campos del Formulario (sin cambios) --- */}
        {/* ... (todos tus inputs como los tenías) ... */}
        <div className="form-group">
          <label>ID IMSS:</label>
          <input
            type="text"
            name="identificador_imss"
            value={formData.identificador_imss || ""}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Nombre Completo:</label>
          <input
            type="text"
            name="nombre_completo"
            value={formData.nombre_completo || ""}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Estatus:</label>
          <input
            type="text"
            name="estatus"
            value={formData.estatus || ""}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Matrimonio:</label>
          <input
            type="text"
            name="matrimonio_id"
            value={formData.matrimonio_id || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>CURP:</label>
          <input
            type="text"
            name="curp"
            value={formData.curp || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Cédula Especialidad:</label>
          <input
            type="text"
            name="cedula_esp"
            value={formData.cedula_esp || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Cédula Licenciatura:</label>
          <input
            type="text"
            name="cedula_lic"
            value={formData.cedula_lic || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Especialidad:</label>
          <input
            type="text"
            name="especialidad"
            value={formData.especialidad || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Entidad:</label>
          <input
            type="text"
            name="entidad"
            value={formData.entidad || ""}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>CLUES SSA:</label>
          <input
            type="text"
            name="clues_ssa"
            value={formData.clues_ssa || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Forma de Notificación Baja:</label>
          <input
            type="text"
            name="notificacion_baja"
            value={formData.notificacion_baja || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Motivo Baja:</label>
          <input
            type="text"
            name="motivo_baja"
            value={formData.motivo_baja || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Fecha Extracción:</label>
          <input
            type="text"
            name="fecha_extraccion"
            value={formData.fecha_extraccion || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Fecha Notificación:</label>
          <input
            type="date"
            name="fecha_notificacion"
            value={formData.fecha_notificacion || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Sexo:</label>
          <input
            type="text"
            name="sexo"
            value={formData.sexo || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Turno:</label>
          <input
            type="text"
            name="turno"
            value={formData.turno || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>CLUES IMB:</label>
          <input
            type="text"
            name="clues_ib"
            value={formData.clues_ib || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Nombre Unidad:</label>
          <input
            type="text"
            name="nombre_unidad"
            value={formData.nombre_unidad || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Municipio:</label>
          <input
            type="text"
            name="municipio"
            value={formData.municipio || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Nivel Atención:</label>
          <input
            type="text"
            name="nivel_atencion"
            value={formData.nivel_atencion || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Fecha Estatus:</label>
          <input
            type="date"
            name="fecha_estatus"
            value={formData.fecha_estatus || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Despliegue:</label>
          <input
            type="text"
            name="despliegue"
            value={formData.despliegue || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Fecha Vuelo:</label>
          <input
            type="date"
            name="fecha_vuelo"
            value={formData.fecha_vuelo || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Estrato:</label>
          <input
            type="text"
            name="estrato"
            value={formData.estrato || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Acuerdo:</label>
          <input
            type="text"
            name="acuerdo"
            value={formData.acuerdo || ""}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        {/* --- Errores y Botones (sin cambios en la estructura) --- */}
        {error && (
          <p style={{ color: "red", textAlign: "center", margin: "10px 0" }}>
            {error}
          </p>
        )}
        <div
          className="button-group"
          style={{
            marginTop: "20px",
            padding: "0 20px 20px 20px",
            textAlign: "right",
          }}
        >
          <button
            type="submit"
            disabled={isSaving}
            className="form-button primary"
          >
            {isSaving
              ? "Guardando..."
              : doctorData
              ? "Guardar Cambios"
              : "Crear Doctor"}
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
