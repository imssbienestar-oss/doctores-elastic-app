// frontend_app/src/App.jsx

import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext"; // Asegúrate que la ruta sea correcta
import LoginPage from "../components/LoginPage";
import DoctorTable from "../components/DoctorTable";
import "./App.css";
import Modal from "react-modal";
import EditDoctorModal from "../components/EditDoctorModal";
import Navbar from "../components/Navbar";
import GraficasPage from "../components/GraficasPage";
// Si usas react-router-dom para navegación programática, también lo importarías
// import { useNavigate } from "react-router-dom";

Modal.setAppElement("#root");

function App() {
  const { isAuthenticated, isGuestMode, token: authToken, logout: authLogout } = useAuth(); // Usar token y logout del contexto
  // const navigate = useNavigate(); // Descomentar si necesitas navegación programática aquí

  const [doctores, setDoctores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalDoctores, setTotalDoctores] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [vistaActual, setVistaActual] = useState("tabla");

  const totalPages = Math.ceil(totalDoctores / itemsPerPage);

  const handleVerGraficas = () => setVistaActual("graficas");
  const handleVerTabla = () => setVistaActual("tabla");

  const fetchDoctores = async (page = 1, currentSearchTerm = searchTerm) => {
    // Solo proceder si está autenticado o es invitado
    if (!isAuthenticated && !isGuestMode) {
      setDoctores([]); // Limpiar datos si no debe haber acceso
      setTotalDoctores(0);
      return;
    }

    setIsLoading(true);
    setFetchError("");

    const skip = (page - 1) * itemsPerPage;
    const limit = itemsPerPage;
    const apiUrlBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    let url = `${apiUrlBase}/api/doctores?skip=${skip}&limit=${limit}`;

    if (currentSearchTerm && String(currentSearchTerm).trim() !== "") {
      const encodedSearchTerm = encodeURIComponent(String(currentSearchTerm).trim());
      url += `&nombre=${encodedSearchTerm}`;
    }
    //console.log("URL FINAL a usar en fetch:", url);

    try {
      const headers = { "Content-Type": "application/json" };
      // Añadir token solo si está autenticado
      if (isAuthenticated && authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      } else {
        // Si es invitado, no se añade el header Authorization.
        // El backend con get_optional_current_user lo permitirá para este endpoint.
        //console.log("Realizando fetch como invitado (sin token de autorización).");
      }

      //console.log("Realizando fetch a:", url, "con headers:", headers);
      const response = await fetch(url, { method: "GET", headers });
      //console.log("Respuesta recibida, status:", response.status);

      if (response.ok) {
        const data = await response.json();
        //console.log("Datos recibidos ok:", data);
        setDoctores(data.doctores);
        setTotalDoctores(data.total_count);
        setCurrentPage(page);
      } else if (response.status === 401 && isAuthenticated) {
        // Si falla con 401 Y ESTABA AUTENTICADO, entonces la sesión expiró.
        //console.error("Error de autenticación (401) estando autenticado.");
        setFetchError("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
        authLogout(); // Usar logout del contexto
      } else {
        //console.error("Error al obtener doctores:", response.status, response.statusText);
        const errorData = await response.json().catch(() => null);
        setFetchError(`Error del servidor: ${response.status} ${response.statusText} ${errorData?.detail ? '- '+errorData.detail : ''}`);
      }
    } catch (err) {
      //console.error("Error de red o conexión al obtener doctores:", err);
      setFetchError("Error de conexión al obtener datos. Revisa el backend y tu conexión.");
    } finally {
      setIsLoading(false);
      //console.log("--- fetchDoctores FIN ---");
    }
  };

  useEffect(() => {
    if (isAuthenticated || isGuestMode) {
      fetchDoctores(currentPage, searchTerm);
    } else {
      // No autenticado y no invitado (ej. después de logout o estado inicial)
      setDoctores([]);
      setTotalDoctores(0);
      setCurrentPage(1);
      setSearchTerm("");
      setVistaActual("tabla"); // Resetear vista
      setFetchError(""); // Limpiar errores
    }
  }, [isAuthenticated, isGuestMode, currentPage, authToken]); // authToken aquí asegura que si el token cambia (aunque improbable sin re-login), se recargue.

  const handleLogoutClick = () => {
    authLogout(); // Llama al logout del AuthContext
    // AuthContext se encarga de limpiar localStorage y estados.
    // El useEffect se encargará de limpiar los datos de la tabla.
    // La redirección a LoginPage (o el cambio de vista) ocurrirá por el renderizado condicional.
  };

  const handleOpenEditModal = (doctor) => {
    if (!isAuthenticated) return; // Doble chequeo, aunque Navbar ya lo haría
    //console.log("Editando doctor:", doctor);
    setEditingDoctor(doctor);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDoctor(null);
  };

  const handleDoctorSave = () => {
    handleCloseModal();
    fetchDoctores(currentPage, searchTerm); // Volver a cargar con el término de búsqueda actual
  };

  const handleDeleteClick = (doctorId, doctorNombre) => {
    if (!isAuthenticated) return; // Doble chequeo
    if (window.confirm(`¿Estás seguro de que quieres eliminar al doctor "${doctorNombre}" (ID: ${doctorId})?`)) {
      deleteDoctor(doctorId);
    }
  };

  const deleteDoctor = async (doctorId) => {
    if (!isAuthenticated || !authToken) return; // Necesita estar autenticado y tener token para borrar

    setFetchError("");
    //console.log(`Intentando eliminar doctor con ID: ${doctorId}`);
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const deleteUrl = `${apiUrl}/api/doctores/${doctorId}`;
    //console.log("Llamando a DELETE en:", deleteUrl);

    try {
      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        //console.log(`Doctor con ID ${doctorId} eliminado exitosamente.`);
        fetchDoctores(currentPage, searchTerm);
      } else if (response.status === 401) {
        //console.error("Error de autenticación (401) al borrar");
        setFetchError("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
        authLogout();
      } else if (response.status === 404) {
        //console.error("Error al borrar: Doctor no encontrado (404)");
        setFetchError(`Error: No se encontró el doctor con ID ${doctorId}. Refresca la lista.`);
        fetchDoctores(currentPage, searchTerm);
      } else {
        const errorData = await response.json().catch(() => null);
        const errorDetail = `Error del servidor al borrar: ${response.status} ${errorData?.detail ? '- '+errorData.detail : ''}`;
        //console.error("Error al borrar doctor:", response.status, response.statusText, errorDetail);
        setFetchError(errorDetail);
      }
    } catch (err) {
      //console.error("Error de red o conexión al borrar doctor:", err);
      setFetchError("Error de conexión al borrar. Revisa el backend y tu conexión.");
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDoctores(1, searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
    fetchDoctores(1, "");
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  // Si no está autenticado y no es invitado, muestra LoginPage
  if (!isAuthenticated && !isGuestMode) {
    // LoginPage fue actualizado para usar useAuth y useNavigate internamente,
    // por lo que no necesita onLoginSuccess ni onGuestLogin aquí.
    return (
      <div style={{ padding: "20px" }}>
        <LoginPage />
      </div>
    );
  }

  // Si está autenticado o es invitado, muestra el Navbar y el contenido principal
  return (
    <>
      {(isAuthenticated || isGuestMode) && ( // Navbar visible para autenticados e invitados
        <Navbar
          title="Sistema Doctores"
          // onAddDoctorClick solo se mostrará/funcionará si está autenticado (lógica interna de Navbar)
          onAddDoctorClick={isAuthenticated ? handleOpenEditModal : undefined}
          onLogoutClick={isAuthenticated ? handleLogoutClick : undefined} // Logout solo para autenticados
          onVerGraficasClick={handleVerGraficas}
          onVerTablaClick={handleVerTabla}
          vistaActual={vistaActual}
          isAuthenticated={isAuthenticated} // Pasar isAuthenticated a Navbar
          isGuestMode={isGuestMode} // Pasar isGuestMode a Navbar
        />
      )}

      <div className="container">
        {vistaActual === "tabla" ? (
          <div>
            <h1 style={{ marginTop: "20px" }}>Lista de Doctores</h1>
            {isGuestMode && !isAuthenticated && ( // Mensaje específico para invitados
                <p style={{ backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
                    Estás navegando como invitado. Las opciones de modificación están desactivadas.
                </p>
            )}
            <div style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "12px" }}>
              <label htmlFor="search-nombre" style={{ fontWeight: "bold", fontSize: "20px" }}>
                Buscar por Nombre:
              </label>
              <input
                type="search"
                id="search-nombre"
                placeholder="Escribe un nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                style={{ padding: "12px", width: "340px" }}
              />
              <button onClick={handleSearch} className="form-button primary">Buscar</button>
              <button onClick={handleClearSearch} className="form-button secondary">Limpiar</button>
            </div>

            {isLoading && <p>Cargando doctores...</p>}
            {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}

            {!isLoading && !fetchError && totalPages > 0 && ( // Corregido para mostrar paginación incluso si doctores.length es 0 en la página actual pero hay otras páginas
              <div style={{ marginTop: "20px", marginBottom: "20px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <button className="form-button primary" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                  Anterior
                </button>
                <span style={{ margin: "0 15px", fontSize: "18px", fontWeight: "bold" }}>
                  Página {currentPage} de {totalPages} (Total: {totalDoctores})
                </span>
                <button className="form-button primary" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}>
                  Siguiente
                </button>
              </div>
            )}

            {!isLoading && !fetchError && doctores.length > 0 && (
              <DoctorTable
                doctores={doctores}
                onEdit={isAuthenticated ? handleOpenEditModal : undefined} // Solo pasar si está autenticado
                onDelete={isAuthenticated ? handleDeleteClick : undefined} // Solo pasar si está autenticado
              />
            )}
            {!isLoading && !fetchError && doctores.length === 0 && totalDoctores === 0 && (
              <p>No se encontraron doctores.</p>
            )}
             {!isLoading && !fetchError && doctores.length === 0 && totalDoctores > 0 && currentPage > 1 && ( // Caso: página vacía pero hay datos en otras
              <p>No hay doctores en esta página. Prueba una página anterior.</p>
            )}
          </div>
        ) : vistaActual === "graficas" ? (
          <GraficasPage
            onVolverATabla={handleVerTabla}
            // token={authToken} // GraficasPage puede usar useAuth() para obtener el token si lo necesita
          />
        ) : null}
      </div>

      {isAuthenticated && ( // El modal de edición solo tiene sentido si está autenticado
        <EditDoctorModal
          isOpen={isModalOpen}
          onRequestClose={handleCloseModal}
          doctorData={editingDoctor}
          onSave={handleDoctorSave}
        />
      )}
    </>
  );
}

export default App;
