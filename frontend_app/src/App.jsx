// frontend_app/src/App.jsx

import React, { useState, useEffect } from "react";
import LoginPage from "../components/LoginPage"; // Componente para el formulario de login
import DoctorTable from "../components/DoctorTable"; // Componente para mostrar la tabla de doctores
import "./App.css"; // Estilos generales (puedes personalizarlos)
import Modal from "react-modal"; // <--- NUEVA IMPORTACIÓN
import EditDoctorModal from "../components/EditDoctorModal"; // <--- NUEVA IMPORTACIÓN (lo crearemos después)

// Configuración inicial para react-modal (ayuda con accesibilidad)
Modal.setAppElement("#root"); // #root es el id del div principal en public/index.html o similar

function App() {
  // --- ESTADOS ---
  // Guarda el token JWT. Intenta leerlo de localStorage al inicio.
  const [token, setToken] = useState(localStorage.getItem("accessToken"));
  // Guarda la lista de doctores de la página actual.
  const [doctores, setDoctores] = useState([]);
  // Indica si se están cargando datos.
  const [isLoading, setIsLoading] = useState(false);
  // Guarda mensajes de error al obtener datos.
  const [fetchError, setFetchError] = useState("");
  // Guarda el número de la página actual que se está mostrando.
  const [currentPage, setCurrentPage] = useState(1);
  // Define cuántos doctores mostrar por página.
  const [itemsPerPage, setItemsPerPage] = useState(20); // Puedes ajustar este número
  // Guarda el número total de doctores (devuelto por la API).
  const [totalDoctores, setTotalDoctores] = useState(0);

  const [searchTerm, setSearchTerm] = useState(''); // <--- NUEVO: Término de búsqueda

  const [isModalOpen, setIsModalOpen] = useState(false); // <--- NUEVO: ¿Está abierto el modal?
  const [editingDoctor, setEditingDoctor] = useState(null); // <--- NUEVO: Qué doctor se edita (o null)

  // Calcula el número total de páginas necesarias.
  const totalPages = Math.ceil(totalDoctores / itemsPerPage);

  // --- FUNCIÓN PARA OBTENER DOCTORES DE LA API WorkspaceDoctores ---
  const fetchDoctores = async (page = 1,  currentSearchTerm = searchTerm) => {
    // No intentar si no hay token
    console.log("--- fetchDoctores INICIO ---"); // DEBUG
    console.log("Recibido: page =", page, ", currentSearchTerm =", currentSearchTerm, "(Tipo:", typeof currentSearchTerm, ")"); // DEBUG
    if (!token) {
      console.log("fetchDoctores: No hay token, saliendo."); // DEBUG
      return;
  }

    setIsLoading(true); // Iniciar indicador de carga
    setFetchError(""); // Limpiar errores previos

    // Calcular 'skip' para la API basado en la página y items por página
    const skip = (page - 1) * itemsPerPage;
    const limit = itemsPerPage;
    const apiUrlBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'; // URL Base API
    let url = `${apiUrlBase}/api/doctores?skip=${skip}&limit=${limit}`;
    console.log("URL base:", url);

    // Condición para añadir el filtro de nombre
    if (currentSearchTerm && String(currentSearchTerm).trim() !== '') { // Convertir a String por si acaso y trim()
      console.log("CONDICIÓN 'if searchTerm' CUMPLIDA. Añadiendo nombre."); // DEBUG
      const encodedSearchTerm = encodeURIComponent(String(currentSearchTerm).trim());
      url += `&nombre=${encodedSearchTerm}`;
  } else {
      console.log("CONDICIÓN 'if searchTerm' NO cumplida. currentSearchTerm:", currentSearchTerm); // DEBUG
  }

  console.log("URL FINAL a usar en fetch:", url); // DEBUG FINAL URL

  
    try {
      // Obtener token actual (por seguridad, aunque ya está en el estado)
      const currentToken = localStorage.getItem("accessToken");
      if (!currentToken) {
        console.log("fetchDoctores: No hay token en localStorage antes de fetch."); // DEBUG
        throw new Error("Token no encontrado al intentar obtener doctores.");
      }
      console.log("Realizando fetch a:", url); // DEBUG
      // Llamada a la API Backend (asegúrate que la URL y puerto sean correctos)
      const response = await fetch(url, {
          method: "GET",
          headers: {
            // ¡Enviar el token para autenticación!
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Respuesta recibida, status:", response.status);
      
      // Procesar la respuesta
      if (response.ok) {
        const data = await response.json(); // Esperamos { total_count, doctores }
        console.log("Datos recibidos ok:", data);
        setDoctores(data.doctores); // Actualizar la lista de doctores
        setTotalDoctores(data.total_count); // Actualizar el contador total
        setCurrentPage(page); // Confirmar la página actual
      } else if (response.status === 401) {
        // Error de autenticación (token inválido/expirado)
        console.error("Error de autenticación (401)");
        setFetchError(
          "Tu sesión ha expirado o es inválida. Por favor, cierra sesión e inicia de nuevo."
        );
        handleLogout(); // Forzar cierre de sesión
      } else {
        // Otros errores del servidor
        console.error(
          "Error al obtener doctores:",
          response.status,
          response.statusText
        );
        setFetchError(
          `Error del servidor: ${response.status} ${response.statusText}`
        );
      }
    } catch (err) {
      // Errores de red o conexión
      console.error("Error de red o conexión al obtener doctores:", err);
      setFetchError(
        "Error de conexión al obtener datos. Revisa el backend y tu conexión."
      );
    } finally {
      setIsLoading(false); // Terminar indicador de carga
      console.log("--- fetchDoctores FIN ---"); // DEBUG
    }
  };

  // --- EFECTO PARA CARGAR DATOS ---
  // Se ejecuta cuando el componente se monta y cada vez que 'token' o 'currentPage' cambian.
  useEffect(() => {
    if (token) {
      // Si hay token, obtener los doctores para la página actual
      fetchDoctores(currentPage, searchTerm);
    } else {
      // Si no hay token (logout), limpiar los datos
      setDoctores([]);
      setTotalDoctores(0);
      setCurrentPage(1); // Resetear a la página 1
      setSearchTerm(''); // Limpiar búsqueda en logout
    }
  }, [token, currentPage]); // Dependencias del efecto

  // --- MANEJADORES DE EVENTOS ---
  // Se llama desde LoginPage cuando el login es exitoso
  const handleLoginSuccess = () => {
    setToken(localStorage.getItem("accessToken"));
    setCurrentPage(1); // Ir a la primera página después de iniciar sesión
    // fetchDoctores se llamará automáticamente por el useEffect al cambiar 'token'
  };

  // Se llama al hacer clic en el botón "Cerrar Sesión"
  const handleLogout = () => {
    localStorage.removeItem("accessToken"); // Eliminar token
    setToken(null); // Actualizar estado (esto disparará el useEffect)
  };

  // --- NUEVAS FUNCIONES PARA MANEJAR EL MODAL ---
  const handleOpenEditModal = (doctor) => {
    console.log("Editando doctor:", doctor);
    setEditingDoctor(doctor); // Guarda el doctor a editar
    setIsModalOpen(true); // Abre el modal
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); // Cierra el modal
    setEditingDoctor(null); // Limpia el doctor en edición
  };

  // Función que se llamará desde el modal cuando se guarde exitosamente
  const handleDoctorSave = () => {
    handleCloseModal(); // Cierra el modal
    fetchDoctores(currentPage); // Vuelve a cargar los doctores de la página actual
  };

  // Función que se llama desde DoctorTable al hacer clic en "Borrar"
  const handleDeleteClick = (doctorId, doctorNombre) => {
    // Mostrar un diálogo de confirmación nativo del navegador
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar al doctor "${doctorNombre}" (ID: ${doctorId})?`
      )
    ) {
      // Si el usuario hace clic en "Aceptar", llamar a la función que hace el borrado
      deleteDoctor(doctorId);
    }
    // Si hace clic en "Cancelar", no se hace nada
  };

  // Función asíncrona que llama a la API para borrar
  const deleteDoctor = async (doctorId) => {
    if (!token) return; // Comprobar token por si acaso

    // Podrías añadir un estado de "isDeleting" si quieres mostrar un indicador
    // setIsLoading(true); // O usar el mismo isLoading
    setFetchError(""); // Limpiar errores previos
    console.log(`Intentando eliminar doctor con ID: ${doctorId}`);

    try {
      const currentToken = localStorage.getItem("accessToken");
      if (!currentToken) throw new Error("Token no encontrado");

      const response = await fetch(
        `http://127.0.0.1:8000/api/doctores/${doctorId}`,
        {
          method: "DELETE", // Método HTTP DELETE
          headers: {
            Authorization: `Bearer ${currentToken}`, // ¡Enviar token!
          },
        }
      );

      if (response.ok) {
        console.log(`Doctor con ID ${doctorId} eliminado exitosamente.`);
        // Vuelve a cargar los datos de la página actual para que la tabla se refresque
        // Nota: Si borras el último item de una página, esta lógica te mostrará
        // la misma página (ahora vacía o con menos items). Podría mejorarse para ir
        // a la página anterior si la actual queda vacía, pero esto es más simple.
        fetchDoctores(currentPage);
      } else if (response.status === 401) {
        console.error("Error de autenticación (401) al borrar");
        setFetchError(
          "Tu sesión ha expirado o es inválida. Por favor, cierra sesión e inicia de nuevo."
        );
        handleLogout();
      } else if (response.status === 404) {
        console.error("Error al borrar: Doctor no encontrado (404)");
        setFetchError(
          `Error: No se encontró el doctor con ID ${doctorId}. Refresca la lista.`
        );
        // Refrescar igualmente por si acaso la lista estaba desactualizada
        fetchDoctores(currentPage);
      } else {
        // Otros errores del servidor
        console.error(
          "Error al borrar doctor:",
          response.status,
          response.statusText
        );
        let errorDetail = `Error del servidor al borrar: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) errorDetail += ` - ${errorData.detail}`;
        } catch (e) {}
        setFetchError(errorDetail);
      }
    } catch (err) {
      console.error("Error de red o conexión al borrar doctor:", err);
      setFetchError(
        "Error de conexión al borrar. Revisa el backend y tu conexión."
      );
    } finally {
      // setIsLoading(false); // Si usaste estado de carga
    }
  };
  // --- FIN NUEVAS FUNCIONES ---

    // Maneja el clic en el botón "Buscar"
    const handleSearch = () => {
      setCurrentPage(1); // Volver a la página 1 al hacer una nueva búsqueda
      console.log("Valor de searchTerm en handleSearch:", searchTerm); // <--- AÑADE ESTA LÍNEA
      fetchDoctores(1, searchTerm); // Pasar searchTerm explícitamente
    };
  
    // Maneja el clic en el botón "Limpiar"
    const handleClearSearch = () => {
      setSearchTerm(''); // Limpiar el estado del término de búsqueda
      setCurrentPage(1); // Volver a la página 1
      fetchDoctores(1, ''); // Llamar a fetchDoctores con término vacío
    };
    
  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div className="App">
      <h1>Aplicación de Doctores</h1>

      {/* Renderizado Condicional: Muestra contenido diferente si el usuario está logueado o no */}
      {token ? (
        // --- VISTA CUANDO ESTÁ LOGUEADO ---
        <div>
          <p>¡Estás logueado!</p>
          <button onClick={handleLogout} style={{ marginBottom: "20px" }}>
            Cerrar Sesión
          </button>

             {/* --- INICIO: Sección de Búsqueda --- */}
             <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <label htmlFor="search-nombre" style={{fontWeight: 'bold'}}>Buscar por Nombre:</label>
             <input
                type="search"
                id="search-nombre"
                placeholder="Escribe un nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{padding: '5px'}}
             />
             <button onClick={handleSearch} className="form-button primary">Buscar</button>
             <button onClick={handleClearSearch} className="form-button secondary">Limpiar</button>
          </div>
          {/* --- FIN: Sección de Búsqueda --- */}

          {/* --- NUEVO: Botón para Agregar --- */}
          <div style={{ marginBottom: "15px" }}>
            <button onClick={() => handleOpenEditModal(null)}>
              {" "}
              {/* Llama a la misma función, pero con null */}
              Agregar Nuevo Doctor
            </button>
          </div>
          {/* --- FIN NUEVO --- */}

          <h2>Lista de Doctores</h2>

          {/* Indicador de Carga */}
          {isLoading && <p>Cargando doctores...</p>}

          {/* Mensaje de Error */}
          {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}

          {/* Tabla de Doctores (si no está cargando y no hay error) */}
          {!isLoading && !fetchError && doctores.length > 0 && (
            <DoctorTable
              doctores={doctores}
              onEdit={handleOpenEditModal} // <--- PASAR LA FUNCIÓN COMO PROP 'onEdit'
              onDelete={handleDeleteClick} // <--- PASAR LA FUNCIÓN COMO PROP 'onDelete'
              // onDelete={handleDeleteClick} // Añadiremos esto después para borrar
            />
          )}
          {/* Mensaje si no hay doctores y no está cargando */}
          {!isLoading && !fetchError && doctores.length === 0 && (
            <p>No se encontraron doctores.</p>
          )}

          {/* Controles de Paginación (solo si no carga, no hay error y hay más de 1 página) */}
          {!isLoading && !fetchError && totalPages > 1 && (
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1} // Deshabilitar en la primera página
              >
                Anterior
              </button>
              <span style={{ margin: "0 15px" }}>
                Página {currentPage} de {totalPages} (Total: {totalDoctores})
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages} // Deshabilitar en la última página
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      ) : (
        // --- VISTA CUANDO NO ESTÁ LOGUEADO ---
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
      {/* --- Renderizar el Modal --- */}
      {/* Se mostrará u ocultará basado en isModalOpen */}
      {/* Asegúrate de que editingDoctor no sea null antes de pasarlo */}
      <EditDoctorModal
        isOpen={isModalOpen}
        onRequestClose={handleCloseModal}
        doctorData={editingDoctor} // Pasa el doctor seleccionado
        onSave={handleDoctorSave} // Pasa la función para refrescar datos
      />
    </div>
  );
}

export default App;
