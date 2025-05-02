// src/components/EditDoctorModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';

// Recibe props: isOpen (si está abierto), onRequestClose (función para cerrar),
// doctorData (los datos del doctor a editar), onSave (función a llamar al guardar)
function EditDoctorModal({ isOpen, onRequestClose, doctorData, onSave }) {
  // Estado interno para los datos del formulario
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // useEffect para cargar los datos del doctor en el formulario cuando el modal se abre o doctorData cambia
  useEffect(() => {
    // Solo carga si hay datos de doctor (evita error si es null al inicio)
    if (doctorData) {
      // Inicializa el formData con los datos del doctor recibido
      // Asegúrate de incluir aquí TODOS los campos que quieres poder editar
      setFormData({
        nombre_completo: doctorData.nombre_completo || '', // Usa '' si es null/undefined
        especialidad: doctorData.especialidad || '',
        estatus: doctorData.estatus || '',
        entidad: doctorData.entidad || '',
        // Añade más campos aquí...
        // ejemplo: curp: doctorData.curp || '',
      });
    } else {
      // Limpiar si no hay doctorData (al cerrar)
      setFormData({
        nombre_completo: '',
        especialidad: '',
        estatus: '',
        entidad: '',});
    }
    setError(''); // Limpiar errores al abrir/cambiar modo
    setIsSaving(false); // Resetear estado de guardado
  }, [doctorData]); // Se ejecuta cuando doctorData cambia

  // Manejador para actualizar el estado del formulario cuando un input cambia
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Manejador para enviar el formulario
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    const token = localStorage.getItem('accessToken');
    // 1. Verificar SOLO el token al principio. Es necesario para AMBAS operaciones.
    if (!token) {
      setError("Error de autenticación: Token no encontrado. Inicia sesión de nuevo."); // Mensaje más específico
      setIsSaving(false);
      return;
    }

    // 2. Determinar si estamos editando o creando
    const isEditing = !!doctorData?.id; // True si doctorData existe y tiene id

    // 3. Construir la URL y el método basado en el modo
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'; // Usar variable de entorno
    let url;
    let method;

    if (isEditing) {
      if (!doctorData?.id) { // Comprobación extra
            setError("Error interno: Intentando editar sin ID de doctor.");
            setIsSaving(false);
            return;
       }
      // Ya sabemos que doctorData.id existe si isEditing es true
      url = `${apiUrl}/api/doctores/${doctorData.id}`;
      method = 'PUT';
    } else {
      url = `${apiUrl}/api/doctores`;
      method = 'POST';
    }

    console.log(`Modo: ${isEditing ? 'Editando' : 'Creando'}, URL: ${url}, Method: ${method}`); // Log para depurar

    // 4. Ejecutar la petición fetch
    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData), // Datos del formulario (formData se actualiza con useState)
      });

      // 5. Procesar respuesta (igual que antes)
      if (response.ok) {
        console.log(`Doctor ${isEditing ? 'actualizado' : 'creado'} exitosamente!`);
        onSave(); // Llama a la función onSave pasada desde App (que refrescará los datos y cerrará el modal)
      } else {
        let errorDetail = `Error al ${isEditing ? 'guardar' : 'crear'} los cambios.`;
        try {
             const errorData = await response.json();
             if (errorData.detail) {
                 // Si el backend envía un detalle específico, úsalo
                 if(typeof errorData.detail === 'string') {
                   errorDetail = errorData.detail;
                 } else if (Array.isArray(errorData.detail)) {
                   // Si FastAPI envía errores de validación Pydantic
                   errorDetail = errorData.detail.map(err => `${err.loc[1]}: ${err.msg}`).join(', ');
                 }
             }
         } catch(e) {}
        setError(errorDetail);
        console.error(`Error al ${isEditing ? 'guardar' : 'crear'}:`, response.status, response.statusText);
      }
    } catch (err) {
      setError(`Error de conexión al ${isEditing ? 'guardar' : 'crear'}. Intenta de nuevo.`);
      console.error('Error de red al guardar/crear:', err);
    } finally {
      // Asegurarse de que el estado de guardado se desactive incluso si hay errores
      setIsSaving(false);
    }
  }; // Fin de handleSubmit

  // Estilos básicos para el modal (puedes personalizarlos)
  const customStyles = {
    content: {
      top: '50%', left: '50%', right: 'auto', bottom: 'auto',
      marginRight: '-50%', transform: 'translate(-50%, -50%)',
      width: '80%', maxWidth: '600px'
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
        <h2>{doctorData ? `Editar Doctor (ID: ${doctorData.id})` : 'Agregar Nuevo Doctor'}</h2>

          {/* --- Campos del Formulario --- */}
          {/* Añade aquí inputs para todos los campos que quieras editar */}
          <div className="form-group">
            <label htmlFor="nombre_completo_modal" className="form-label" >Nombre Completo:</label>
            <input
              type="text"
              id="nombre_completo"
              name="nombre_completo" // 'name' debe coincidir con la clave en formData/schema
              value={formData.nombre_completo || ''}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="especialidad_modal" className="form-label">Especialidad:</label>
            <input
              type="text"
              id="especialidad"
              name="especialidad"
              value={formData.especialidad || ''}
              onChange={handleChange}
              className="form-input"
            />
          </div>
           <div className="form-group"> 
            <label htmlFor="estatus_model" className="form-label">Estatus:</label>
            <input
              type="text"
              id="estatus"
              name="estatus"
              value={formData.estatus || ''}
              onChange={handleChange}
              className="form-input"
            />
          </div>
           <div className="form-group">
            <label htmlFor="entidad_modal" className="form-label">Entidad:</label>
            <input
              type="text"
              id="entidad"
              name="entidad"
              value={formData.entidad || ''}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          {/* ... Agrega más campos según necesites ... */}

          {/* --- Errores y Botones --- */}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <div className="button-group" style={{ marginTop: '20px' }}>
            <button type="submit" disabled={isSaving} className="form-button primary">
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button type="button" onClick={onRequestClose} style={{ marginLeft: '10px' }} disabled={isSaving} className="form-button secondary">
              Cancelar
            </button>
          </div>
        </form>
     

    </Modal>
  );
}

export default EditDoctorModal;