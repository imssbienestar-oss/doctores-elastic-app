// frontend_app/src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom"; // BrowserRouter NO se importa aquí
import { useAuth } from "./contexts/AuthContext"; // Ajusta la ruta si es necesario
import { ModalProvider, useModal } from "./contexts/ModalContext";

// Importa tus componentes existentes desde su ubicación correcta
import LoginPage from "../components/LoginPage";
import DoctorTable from "../components/DoctorTable";
import EditDoctorModal from "../components/EditDoctorModal";
import Navbar from "../components/Navbar";
import GraficasPage from "../components/GraficasPage";
import AdminUsersPage from "../components/AdminUsersPage"; // O '../pages/AdminUsersPage' si lo moviste

import "./App.css"; // Tu CSS global o específico de App
import Modal from "react-modal";

// Configuración de React Modal (generalmente se hace una vez)
Modal.setAppElement("#root");

// --- COMPONENTES INTERNOS DEFINIDOS AQUÍ ---

// 1. COMPONENTE LAYOUT (para páginas con Navbar)
function Layout({ navbarProps }) {
  // Recibe las props para el Navbar
  const { isAuthenticated, isGuestMode } = useAuth();
  const showNavbar = isAuthenticated || isGuestMode;

  // DEBUG (Opcional, puedes quitarlo si ya funciona)
  // console.log("Layout.jsx - navbarProps recibidas:", navbarProps);

  return (
    <>
      {/* Renderiza Navbar si el usuario está autenticado o es invitado, pasando las props recibidas */}
      {showNavbar && <Navbar {...navbarProps} />}
      {/* Contenedor principal con padding superior si el Navbar es visible (ajusta '80px' si es necesario) */}
      <div
        className="container"
        style={{ paddingTop: showNavbar ? "80px" : "20px" }}
      >
        {/* Outlet renderiza el componente hijo de la ruta actual (HomePageContent o AdminUsersPage) */}
        <Outlet />
      </div>
    </>
  );
}

// 2. COMPONENTE PARA LA PÁGINA PRINCIPAL (Tabla de Doctores / Gráficas)
// Recibe vistaActual como prop desde App
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

 
  // El estado vistaActual y sus handlers YA NO ESTÁN AQUÍ, vienen de App

  const totalPages = Math.ceil(totalDoctores / itemsPerPage);

  // Función para obtener doctores (sin cambios respecto a tu versión original)
  const fetchDoctores = async (page = 1, currentSearchTerm = searchTerm) => {
    if (!isAuthenticated && !isGuestMode) {
      setDoctores([]);
      setTotalDoctores(0);
      return;
    }
    setIsLoading(true);
    setFetchError("");
    const skip = (page - 1) * itemsPerPage;
    const limit = itemsPerPage;
    const apiUrlBase =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    let url = `${apiUrlBase}/api/doctores?skip=${skip}&limit=${limit}`;
    if (currentSearchTerm && String(currentSearchTerm).trim() !== "") {
      url += `&nombre=${encodeURIComponent(String(currentSearchTerm).trim())}`;
    }
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
        setCurrentPage(page);
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
  };

  // useEffect para cargar doctores cuando cambian dependencias relevantes
  useEffect(() => {
    if (isAuthenticated || isGuestMode) {
      fetchDoctores(currentPage, searchTerm);
    } else {
      // Limpia estados si no está autenticado/invitado
      setDoctores([]);
      setTotalDoctores(0);
      setCurrentPage(1);
      setSearchTerm("");
      setFetchError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isGuestMode, currentPage, authToken]); // No incluir searchTerm aquí directamente si fetchDoctores ya lo usa

  // Funciones para manejar el modal de edición/creación
  const handleOpenEditModal = (doctor) => {
    if (!isAuthenticated) return;
    openModal(doctor);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDoctor(null);
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

  // Funciones para búsqueda
  const handleSearch = () => {
    setCurrentPage(1);
    fetchDoctores(1, searchTerm); // Va a la página 1 al buscar
  };
  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
    fetchDoctores(1, ""); // Limpia y va a pág 1
  };

  // Renderiza Tabla o Gráficas basado en la prop vistaActualProp recibida de App
  if (vistaActualProp === "tabla") {
    return (
      <>
        <div>
          <h1 style={{ marginTop: "0px" }}>Lista de Doctores</h1>
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
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
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
          {!isLoading && !fetchError && doctores.length > 0 && (
            <DoctorTable
              doctores={doctores}
              onEdit={isAuthenticated ? handleOpenEditModal : undefined} // Pasar la función para abrir modal
              onDelete={isAuthenticated ? handleDeleteClick : undefined} // Pasar la función para borrar
            />
          )}
          {/* --- Mensajes si no hay doctores --- */}
          {!isLoading &&
            !fetchError &&
            doctores.length === 0 &&
            totalDoctores === 0 && <p>No se encontraron doctores.</p>}
          {!isLoading &&
            !fetchError &&
            doctores.length === 0 &&
            totalDoctores > 0 &&
            currentPage > 1 && (
              <p>No hay doctores en esta página. Prueba una página anterior.</p>
            )}
        </div>
        {/* --- Modal de Edición --- */}
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
  } else if (vistaActualProp === "graficas") {
    // Renderiza la página de gráficas.
    // onVolverATabla se pasa desde App -> Layout -> Navbar, por lo que GraficasPage no necesita recibirla aquí.
    return <GraficasPage />;
  }
  // Fallback por si acaso vistaActualProp es un valor inesperado
  return <div>Vista no reconocida</div>;
}

// 3. COMPONENTE PARA LA PÁGINA DE ADMINISTRACIÓN DE USUARIOS (Necesitas implementar su contenido)
function AdminUsersPagePlaceholder() {
  // Renombrado para claridad
  return (
    <div>
      <h1>Gestión de Usuarios (Admin)</h1>
      <p>
        Aquí se mostrará la lista de usuarios y el formulario para agregar
        nuevos.
      </p>
      {/* IMPLEMENTAR: Lógica para fetch de usuarios, tabla, formulario de registro, etc. */}
    </div>
  );
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
  // -----------------------------------------------------------------

  // --- Props que se pasarán al Navbar a través del Layout ---
  // Incluye el estado y los handlers para que Navbar pueda mostrarlos/usarlos
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

        {/* Rutas que usan el Layout (con Navbar) */}
        {/* Protegidas para que solo se muestren si está autenticado o es invitado */}
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
          />{" "}
          {/* Pasa vistaActual a HomePageContent */}
          {/* Ruta de Administración: Protegida y solo para admins */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminUsersPage />{" "}
                {/* Usa el componente placeholder */}
              </ProtectedRoute>
            }
          />
          {/* Puedes añadir más rutas aquí que quieras que usen el Navbar y estén protegidas */}
          {/* Ejemplo: <Route path="/perfil" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} /> */}
        </Route>

        {/* Ruta para cualquier URL no encontrada */}
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
