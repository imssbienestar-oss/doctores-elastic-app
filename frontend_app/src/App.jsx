// frontend_app/src/App.jsx

import React, { useState, useEffect } from "react";
import LoginPage from "../components/LoginPage"; // Componente para el formulario de login
import DoctorTable from "../components/DoctorTable"; // Componente para mostrar la tabla de doctores
import "./App.css"; // Estilos generales (puedes personalizarlos)
import Modal from "react-modal"; // <--- NUEVA IMPORTACIÓN
import EditDoctorModal from "../components/EditDoctorModal"; // <--- NUEVA IMPORTACIÓN (lo crearemos después)
import Navbar from "../components/Navbar";
import GraficasPage from "../components/GraficasPage";

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

  const [searchTerm, setSearchTerm] = useState(""); // <--- NUEVO: Término de búsqueda

  const [isModalOpen, setIsModalOpen] = useState(false); // <--- NUEVO: ¿Está abierto el modal?
  const [editingDoctor, setEditingDoctor] = useState(null); // <--- NUEVO: Qué doctor se edita (o null)
  const [vistaActual, setVistaActual] = useState("tabla"); // 'tabla' o 'graficas' <-- NUEVO ESTADO

  // Nueva función para cambiar a la vista de gráficas
  const handleVerGraficas = () => {
    setVistaActual("graficas");
  };

  // Nueva función para volver a la tabla (la necesitarás en Navbar o GraficasPage)
  const handleVerTabla = () => {
    setVistaActual("tabla");
  };

  // Calcula el número total de páginas necesarias.
  const totalPages = Math.ceil(totalDoctores / itemsPerPage);

  // --- FUNCIÓN PARA OBTENER DOCTORES DE LA API WorkspaceDoctores ---
  const fetchDoctores = async (page = 1, currentSearchTerm = searchTerm) => {
    // No intentar si no hay token
    console.log("--- fetchDoctores INICIO ---"); // DEBUG
    console.log(
      "Recibido: page =",
      page,
      ", currentSearchTerm =",
      currentSearchTerm,
      "(Tipo:",
      typeof currentSearchTerm,
      ")"
    ); // DEBUG
    if (!token) {
      console.log("fetchDoctores: No hay token, saliendo."); // DEBUG
      return;
    }

    setIsLoading(true); // Iniciar indicador de carga
    setFetchError(""); // Limpiar errores previos

    // Calcular 'skip' para la API basado en la página y items por página
    const skip = (page - 1) * itemsPerPage;
    const limit = itemsPerPage;
    const apiUrlBase =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"; // URL Base API
    let url = `${apiUrlBase}/api/doctores?skip=${skip}&limit=${limit}`;
    console.log("URL base:", url);

    // Condición para añadir el filtro de nombre
    if (currentSearchTerm && String(currentSearchTerm).trim() !== "") {
      // Convertir a String por si acaso y trim()
      console.log("CONDICIÓN 'if searchTerm' CUMPLIDA. Añadiendo nombre."); // DEBUG
      const encodedSearchTerm = encodeURIComponent(
        String(currentSearchTerm).trim()
      );
      url += `&nombre=${encodedSearchTerm}`;
    } else {
      console.log(
        "CONDICIÓN 'if searchTerm' NO cumplida. currentSearchTerm:",
        currentSearchTerm
      ); // DEBUG
    }

    console.log("URL FINAL a usar en fetch:", url); // DEBUG FINAL URL

    try {
      // Obtener token actual (por seguridad, aunque ya está en el estado)
      const currentToken = localStorage.getItem("accessToken");
      if (!currentToken) {
        console.log(
          "fetchDoctores: No hay token en localStorage antes de fetch."
        ); // DEBUG
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
      });
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
      setSearchTerm(""); // Limpiar búsqueda en logout
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

  const deleteDoctor = async (doctorId) => {
    if (!token) return;

    setFetchError("");
    console.log(`Intentando eliminar doctor con ID: ${doctorId}`);

    // --- CORRECCIÓN: Usar variable de entorno para la URL del backend ---
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"; // Obtener URL base
    const deleteUrl = `${apiUrl}/api/doctores/${doctorId}`;

    console.log("Llamando a DELETE en:", deleteUrl); // DEBUG

    try {
      const currentToken = localStorage.getItem("accessToken");
      if (!currentToken) throw new Error("Token no encontrado");

      // Usa la variable 'deleteUrl' construida
      const response = await fetch(deleteUrl, {
        // <--- USA la variable deleteUrl
        method: "DELETE", // Método HTTP DELETE
        headers: {
          Authorization: `Bearer ${currentToken}`, // ¡Enviar token!
        },
      });
      // --- FIN CORRECCIÓN ---

      if (response.ok) {
        console.log(`Doctor con ID ${doctorId} eliminado exitosamente.`);
        // Refrescar datos (pasando searchTerm por si acaso)
        fetchDoctores(currentPage, searchTerm);
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
        fetchDoctores(currentPage, searchTerm); // Refrescar igualmente
      } else {
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
      // setIsLoading(false); // Si añades estado isDeleting
    }
  }; // Fin de deleteDoctor
  // --- FIN NUEVAS FUNCIONES ---

  // Maneja el clic en el botón "Buscar"
  const handleSearch = () => {
    setCurrentPage(1); // Volver a la página 1 al hacer una nueva búsqueda
    console.log("Valor de searchTerm en handleSearch:", searchTerm); // <--- AÑADE ESTA LÍNEA
    fetchDoctores(1, searchTerm); // Pasar searchTerm explícitamente
  };

  // Maneja el clic en el botón "Limpiar"
  const handleClearSearch = () => {
    setSearchTerm(""); // Limpiar el estado del término de búsqueda
    setCurrentPage(1); // Volver a la página 1
    fetchDoctores(1, ""); // Llamar a fetchDoctores con término vacío
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <>
      {token && (
        <Navbar
          title="Sistema Doctores"
          onAddDoctorClick={handleOpenEditModal}
          onLogoutClick={handleLogout}
          onVerGraficasClick={handleVerGraficas}
          onVerTablaClick={handleVerTabla}
          vistaActual={vistaActual}
          // Añade aquí props para los botones "Generar Reporte", "Ver Graficas" si la lógica está en App.jsx
          // Ejemplo: onGenerarReporte={() => console.log('Generar Reporte...')}
        />
      )}

      {/* Contenedor principal para el resto del contenido */}
      <div className="container">
        {!token ? (
          // --- VISTA CUANDO NO ESTÁ LOGUEADO ---
          <div style={{ padding: "20px" }}>
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          </div>
        ) : vistaActual === "tabla" ? (
          // --- VISTA DE TABLA CUANDO ESTÁ LOGUEADO ---
          <div>
            <div
              style={{
                marginBottom: "15px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <label htmlFor="search-nombre" style={{ fontWeight: "bold" }}>
                Buscar por Nombre:
              </label>
              <input
                type="search"
                id="search-nombre"
                placeholder="Escribe un nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()} // Opcional: buscar con Enter
                style={{ padding: "12px", width: "340px" }}
              />
              <button onClick={handleSearch} className="form-button primary">
                Buscar
              </button>
              <button
                onClick={handleClearSearch}
                className="form-button secondary"
              >
                Limpiar
              </button>
            </div>

            <h2>Lista de Doctores</h2>

            {isLoading && <p>Cargando doctores...</p>}
            {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}

            {!isLoading && !fetchError && totalPages > 1 && (
              <div
                style={{
                  marginTop: "20px",
                  marginBottom: "20px", // Reducido un poco para que no se pegue a la tabla
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </button>
                <span style={{ margin: "0 15px" }}>
                  Página {currentPage} de {totalPages} (Total: {totalDoctores})
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0} // Añadir totalPages === 0
                >
                  Siguiente
                </button>
              </div>
            )}

            {!isLoading && !fetchError && doctores.length > 0 && (
              <DoctorTable
                doctores={doctores}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteClick}
              />
            )}
            {!isLoading &&
              !fetchError &&
              doctores.length === 0 &&
              totalDoctores === 0 && ( // Mostrar solo si el total es 0 realmente, no solo la página actual
                <p>No se encontraron doctores.</p>
              )}
          </div>
        ) : vistaActual === "graficas" ? (
          // --- VISTA DE GRÁFICAS CUANDO ESTÁ LOGUEADO ---
          <GraficasPage
            onVolverATabla={handleVerTabla} // Para un botón de "Volver" en GraficasPage
            token={token} // Pasar el token si GraficasPage necesita hacer sus propios fetches
          />
        ) : null} {/* Fallback por si vistaActual tiene un valor inesperado */}
      </div>

      {/* --- Renderizar el Modal --- */}
      <EditDoctorModal
        isOpen={isModalOpen}
        onRequestClose={handleCloseModal}
        doctorData={editingDoctor} // Pasa el doctor seleccionado
        onSave={handleDoctorSave} // Pasa la función para refrescar datos
      />
    </>
  );
}

export default App;
