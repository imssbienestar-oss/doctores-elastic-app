// frontend_app/src/App.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { ModalProvider, useModal } from "./contexts/ModalContext";

// Importa tus componentes existentes desde su ubicación correcta
import LoginPage from "../components/LoginPage";
import DoctorTable from "../components/DoctorTable";
import EditDoctorModal from "../components/EditDoctorModal";
import Navbar from "../components/Navbar";
import GraficasPage from "../components/GraficasPage";
import AdminUsersPage from "../components/AdminUsersPage";
import "./App.css"; // Tu CSS global o específico de App
import Modal from "react-modal";
import DoctorProfileView from "../components/DoctorProfileView";

// Configuración de React Modal (generalmente se hace una vez)
Modal.setAppElement("#root");

// --- COMPONENTES INTERNOS DEFINIDOS AQUÍ ---

// 1. COMPONENTE LAYOUT (para páginas con Navbar)
function Layout({ navbarProps }) {
  // Recibe las props para el Navbar
  const { isAuthenticated, isGuestMode } = useAuth();
  const showNavbar = isAuthenticated || isGuestMode;

  return (
    <>
      {showNavbar && <Navbar {...navbarProps} />}
      <div
        className="container"
        style={{ paddingTop: showNavbar ? "100px" : "20px" }}
      >
        {/* Outlet renderiza el componente hijo de la ruta actual (HomePageContent o AdminUsersPage) */}
        <Outlet />
      </div>
    </>
  );
}

// 2. COMPONENTE PARA LA PÁGINA PRINCIPAL (Tabla de Doctores / Gráficas)
function HomePageContent({ vistaActualProp }) {
  const {
    isAuthenticated,
    isGuestMode,
    token: authToken,
    logout: authLogout,
  } = useAuth();
  const { isModalOpen, editingDoctor, openModal, closeModal } = useModal();
  // Estados específicos de esta página (doctores, carga, paginación, modal, etc.)
  const [doctores, setDoctores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // Puedes ajustar esto
  const [totalDoctores, setTotalDoctores] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Activo"); // Default a "Activo"
  const estatusDisponibles = [
    "Activo",
    "Baja",
    "Incapacidad por Enfermedad",
    "Retiro Temporal",
    "Solicitud Personal",
    "todos",
  ];

  const [viewMode, setViewMode] = useState("table"); // 'table' o 'profile'
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState(null);

  const totalPages = Math.ceil(totalDoctores / itemsPerPage);
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  // Función para obtener doctores (sin cambios respecto a tu versión original)
  const fetchDoctores = useCallback(async () => {
    if (!isAuthenticated && !isGuestMode) {
      setDoctores([]);
      setTotalDoctores(0);
      return;
    }
    setIsLoading(true);
    setFetchError("");
    const skip = (currentPage - 1) * itemsPerPage;
    const limit = itemsPerPage;

    let url = `${API_BASE_URL}/api/doctores?skip=${skip}&limit=${limit}`;
    if (searchTerm && String(searchTerm).trim() !== "") {
      url += `&nombre=${encodeURIComponent(String(searchTerm).trim())}`;
    }
    url += `&estatus=${encodeURIComponent(selectedStatus)}`;

    try {
      const headers = { "Content-Type": "application/json" };
      if (isAuthenticated && authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const response = await fetch(url, { method: "GET", headers });
      if (response.ok) {
        const data = await response.json();
        setDoctores(data.doctores);
        setTotalDoctores(data.total_count);
      } else if (response.status === 401 && isAuthenticated) {
        setFetchError("Tu sesión ha expirado.");
        authLogout();
      } else {
        const errorData = await response.json().catch(() => null);
        setFetchError(
          `Error del servidor: ${response.status} ${
            errorData?.detail ? "- " + errorData.detail : ""
          }`
        );
      }
    } catch (err) {
      setFetchError("Error de conexión al obtener datos.");
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated,
    isGuestMode,
    currentPage,
    itemsPerPage,
    searchTerm,
    selectedStatus, // NUEVA DEPENDENCIA
    authToken,
    authLogout,
    API_BASE_URL,
  ]);

  // useEffect para cargar doctores cuando cambian dependencias relevantes
  useEffect(() => {
    if ((isAuthenticated || isGuestMode) && viewMode === "table") {
      fetchDoctores();
    } else if (viewMode !== "profile") {
      // Limpia estados si no está autenticado/invitado
      setDoctores([]);
      setTotalDoctores(0);
      setCurrentPage(1);
      setSearchTerm("");
      setSelectedStatus("Activo");
      setFetchError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDoctores, isAuthenticated, isGuestMode, viewMode]);

  // --- NUEVA FUNCIÓN PARA CARGAR EL PERFIL COMPLETO DEL DOCTOR ---
  const fetchFullDoctorProfile = async (doctorId) => {
    if (!doctorId) return;
    // Podrías tener un estado de carga específico para el perfil si lo deseas
    // setIsLoading(true); // O un nuevo estado como setIsLoadingProfile(true)
    setFetchError(""); // Limpiar errores anteriores

    try {
      const headers = { "Content-Type": "application/json" };
      if (isAuthenticated && authToken) {
        // Usa el authToken del hook useAuth
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const response = await fetch(`${API_BASE_URL}/api/doctores/${doctorId}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({
            detail: `Error al cargar el perfil del doctor ${doctorId}`,
          }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      const data = await response.json(); // data debe ser del tipo schemas.DoctorDetail
      setSelectedDoctorProfile(data); // Actualiza el estado con los datos frescos y completos
    } catch (err) {
      console.error("Error al cargar perfil completo del doctor:", err);
      setFetchError(err.message || "Ocurrió un error al cargar el perfil.");
      // Opcional: si falla, podrías volver a la tabla o limpiar el perfil seleccionado
      // setViewMode('table');
      // setSelectedDoctorProfile(null);
    } finally {
      // setIsLoading(false); // O setIsLoadingProfile(false)
    }
  };

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
    setCurrentPage(1);
  };

  const handleViewProfileClick = async (doctorToList) => {
    setIsLoading(true);
    await fetchFullDoctorProfile(doctorToList.id);
    setIsLoading(false);
    setViewMode("profile");
  };

  const handleBackToTable = () => {
    setViewMode("table");
    setSelectedDoctorProfile(null);
    fetchDoctores();
  };

  // --- NUEVA FUNCIÓN: CALLBACK PARA CUANDO EL PERFIL SE ACTUALIZA ---
  const handleDoctorProfileWasUpdated = (doctorId) => {
    fetchFullDoctorProfile(doctorId); // Vuelve a cargar los datos completos del doctor
  };

  // Funciones para manejar el modal de edición/creación
  const handleOpenEditModal = (doctor) => {
    if (!isAuthenticated) return;
    openModal(doctor);
  };

  const handleDoctorSave = () => {
    closeModal(); // <--- Usa closeModal del contexto
    fetchDoctores(currentPage, searchTerm); // Recarga después de guardar
  };

  // Funciones para eliminar doctor
  const handleDeleteClick = (doctorId, doctorNombre) => {
    if (!isAuthenticated) return;
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar al doctor "${doctorNombre}" (ID: ${doctorId})?`
      )
    ) {
      deleteDoctor(doctorId);
    }
  };
  const deleteDoctor = async (doctorId) => {
    if (!isAuthenticated || !authToken) return;
    setFetchError("");
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const deleteUrl = `${apiUrl}/api/doctores/${doctorId}`;
    try {
      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        fetchDoctores(currentPage, searchTerm); // Recarga después de borrar
      } else if (response.status === 401) {
        setFetchError("Tu sesión ha expirado.");
        authLogout();
      } else if (response.status === 404) {
        setFetchError(`Error: No se encontró el doctor con ID ${doctorId}.`);
        fetchDoctores(currentPage, searchTerm); // Refresca lista
      } else {
        const errorData = await response.json().catch(() => null);
        setFetchError(
          `Error del servidor al borrar: ${response.status} ${
            errorData?.detail ? "- " + errorData.detail : ""
          }`
        );
      }
    } catch (err) {
      setFetchError("Error de conexión al borrar.");
    }
  };

  {
    /*
  // Funciones para búsqueda
  const handleSearch = () => {
    setCurrentPage(1);
    fetchDoctores(1, searchTerm); // Va a la página 1 al buscar
  };
  
  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
    //fetchDoctores(1, ""); // Limpia y va a pág 1
  };*/
  }

  // Renderiza Tabla o Gráficas basado en la prop vistaActualProp recibida de App
  if (vistaActualProp === "graficas") {
    return <GraficasPage />;
  }

  if (vistaActualProp === "tabla") {
    if (viewMode === "profile" && selectedDoctorProfile) {
      return (
        <DoctorProfileView
          doctor={selectedDoctorProfile}
          onBack={handleBackToTable}
          onProfileUpdate={handleDoctorProfileWasUpdated}
        />
      );
    }
    return (
      <>
        <div>
          <h1 style={{ marginTop: "30px" }}>Lista de Doctores</h1>
          {isGuestMode && !isAuthenticated && (
            <p
              style={{
                backgroundColor: "#fff3cd",
                color: "#856404",
                border: "1px solid #ffeeba",
                padding: "10px",
                borderRadius: "5px",
                marginBottom: "15px",
              }}
            >
              Estás navegando como invitado. Las opciones de modificación están
              desactivadas.
            </p>
          )}
          {/* --- Controles de Búsqueda --- */}
          <div
            style={{
              marginBottom: "15px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label
              htmlFor="search-nombre"
              style={{ fontWeight: "bold", fontSize: "20px" }}
            >
              Buscar por Nombre:
            </label>
            <input
              type="search"
              id="search-nombre"
              placeholder="Escribe un nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  setCurrentPage(1);
                }
              }}
              style={{ padding: "12px", width: "300px" }}
            />
          </div>

          {isLoading && <p>Cargando doctores...</p>}
          {fetchError && <p style={{ color: "red" }}>{fetchError}</p>}

          {/* --- Controles de Paginación --- */}
          {!isLoading && !fetchError && totalPages > 0 && (
            <div
              style={{
                marginTop: "20px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <button
                className="form-button primary"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span
                style={{
                  margin: "0 15px",
                  fontSize: "18px",
                  fontWeight: "bold",
                }}
              >
                Página {currentPage} de {totalPages} (Total: {totalDoctores})
              </span>
              <button
                className="form-button primary"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Siguiente
              </button>
            </div>
          )}

          {/* --- Tabla de Doctores --- */}
          {!isLoading && !fetchError && (
            <DoctorTable
              doctores={doctores}
              onEdit={isAuthenticated ? handleOpenEditModal : undefined} // Pasa la función para abrir modal
              onDelete={isAuthenticated ? handleDeleteClick : undefined} // Pasa la función para borrar
              onViewProfile={handleViewProfileClick}
              selectedStatus={selectedStatus}
              onStatusChange={handleStatusChange}
              estatusDisponibles={estatusDisponibles}
            />
          )}
        </div>
        {isAuthenticated && (
          <EditDoctorModal
            isOpen={isModalOpen}
            onRequestClose={closeModal}
            doctorData={editingDoctor}
            onSave={handleDoctorSave}
          />
        )}
      </>
    );
  }
  return <div>Vista no reconocida o estado inesperado.</div>;
}

// 4. COMPONENTE PARA PROTEGER RUTAS
function ProtectedRoute({ adminOnly = false, children }) {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated) {
    // Si no está autenticado, redirige a login
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && (!currentUser || currentUser.role !== "admin")) {
    // Si requiere admin pero no lo es, redirige a la página principal
    return <Navigate to="/" replace />;
  }
  // Si cumple las condiciones, renderiza el componente hijo (la página protegida)
  return children;
}

// 5. COMPONENTE APP PRINCIPAL (CONFIGURA RUTAS)
function App() {
  const { isAuthenticated, isGuestMode } = useAuth();
  const navigate = useNavigate();

  // --- Estado y Handlers para la vista Tabla/Gráficas (VIVEN AQUÍ) ---
  const [vistaActual, setVistaActual] = useState("tabla"); // Inicia en "tabla"
  const handleVerGraficas = () => {
    setVistaActual("graficas");
    navigate("/"); // <--- CAMBIO NECESARIO: Añadir navegación
  };
  const handleVerTabla = () => {
    setVistaActual("tabla");
    navigate("/"); // <--- CAMBIO NECESARIO: Añadir navegación
  };

  const navbarProps = {
    title: "Sistema Doctores",
    vistaActual: vistaActual,
    onVerGraficasClick: handleVerGraficas,
    onVerTablaClick: handleVerTabla,
  };

  return (
    <ModalProvider>
      <Routes>
        {/* Ruta de Login: Si ya está autenticado o es invitado, redirige a home, si no, muestra Login */}
        <Route
          path="/login"
          element={
            isAuthenticated || isGuestMode ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          element={
            isAuthenticated || isGuestMode ? (
              <Layout
                navbarProps={navbarProps}
              /> /* Pasa las props al Layout */
            ) : (
              <Navigate to="/login" replace />
            ) /* Si no, redirige a login */
          }
        >
          {/* Ruta Principal: Renderiza HomePageContent si está autenticado/invitado */}
          <Route
            path="/"
            element={<HomePageContent vistaActualProp={vistaActual} />}
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminUsersPage /> {/* Usa el componente placeholder */}
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="*"
          element={
            <div style={{ padding: "50px", textAlign: "center" }}>
              <h1>404 - Página No Encontrada</h1>
              <p>Lo sentimos, la página que buscas no existe.</p>
              {/* Opcional: Redirigir a home o login según el estado */}
              {/* <Navigate to={ (isAuthenticated || isGuestMode) ? "/" : "/login" } replace /> */}
            </div>
          }
        />
      </Routes>
    </ModalProvider>
  );
}

export default App;
