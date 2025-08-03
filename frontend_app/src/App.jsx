// frontend_app/src/App.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  Link,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ModalProvider, useModal } from "./contexts/ModalContext";
import LoginPage from "../components/LoginPage";
import DoctorTable from "../components/DoctorTable";
import EditDoctorModal from "../components/EditDoctorModal";
import Navbar from "../components/Navbar";
import GraficasPage from "../components/GraficasPage";
import AdminUsersPage from "../components/AdminUsersPage";
import "./App.css"; 
import Modal from "react-modal";
import DoctorProfileView from "../components/DoctorProfileView";
import AuditLogView from "../components/AuditLogView";
import DeletedDoctorsView from "../components/DeletedDoctorsView";
import ChangePasswordPage from "../components/ChangePasswordPage";
import ProfilePage from "../components/ProfilePage";
import { useSearchParams } from "react-router-dom";

Modal.setAppElement("#root");

const styles = {
  pageTitle: {
    marginTop: "30px",
    marginBottom: "25px",
    textAlign: "center",
    color: "#333",
    fontSize: "2rem",
  },
  controlsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    padding: "15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    flexWrap: "wrap",
    gap: "15px",
  },
  searchControls: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexGrow: 1,
  },
  searchLabel: {
    fontWeight: "500",
    fontSize: "1rem",
    color: "#495057",
  },
  searchInput: {
    padding: "10px 12px",
    minWidth: "250px",
    flexGrow: 1,
    maxWidth: "400px",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    fontSize: "1rem",
  },
  addButton: {
    padding: "10px 18px",
    fontSize: "0.95em",
    cursor: "pointer",
    backgroundColor: "#006657",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "background-color 0.2s ease",
    whiteSpace: "nowrap",
  },
  guestMessage: {
    backgroundColor: "#fff3cd",
    color: "#856404",
    border: "1px solid #ffeeba",
    padding: "10px",
    borderRadius: "5px",
    marginBottom: "15px",
    textAlign: "center",
  },
  paginationControls: {
    marginTop: "20px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
  },
  paginationButton: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
  },
  paginationInfo: {
    margin: "0 15px",
    fontSize: "1rem",
    fontWeight: "500",
  },
  loadingText: {
    textAlign: "center",
    fontSize: "1.1em",
    color: "#6c757d",
    padding: "20px",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    padding: "10px",
  },
  message: {
    textAlign: "center",
    fontSize: "1.1em",
    color: "#6c757d",
    padding: "20px",
  },
};

function Layout({ navbarProps }) {
  const { isAuthenticated, isGuestMode } = useAuth();
  const showNavbar = isAuthenticated || isGuestMode;

  return (
    <>
      {showNavbar && <Navbar {...navbarProps} />}
      <div
        className="container"
        style={{ paddingTop: showNavbar ? "100px" : "20px" }}
      >
        <Outlet />
      </div>
    </>
  );
}

// COMPONENTE PARA LA PÁGINA PRINCIPAL
function HomePageContent({ vistaActualProp, doctorListRefreshKey, onSwitchToTableView }) {
  const {
    isAuthenticated,
    isGuestMode,
    token: authToken,
    logout: authLogout,
    currentUser,
  } = useAuth();
  const { isModalOpen, editingDoctor, openModal, closeModal } = useModal();
  const navigate = useNavigate(); // <--- ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ PRESENTE

  // Estados específicos de esta página
  const [doctores, setDoctores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalDoctores, setTotalDoctores] = useState(0);
  const [searchTermInput, setSearchTermInput] = useState(""); 
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(""); 
  const [selectedStatus, setSelectedStatus] = useState("01 ACTIVO"); 
  const estatusDisponibles = [
    "01 ACTIVO",
    "02 RETIRO TEMP. (CUBA)",
    "03 RETIRO TEMP. (MEXICO)",
    "04 SOL. PERSONAL",
    "05 INCAPACIDAD",
    "06 BAJA",
    "todos",
  ];

  const [viewMode, setViewMode] = useState("table"); 
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState(null);
  const [searchParams] = useSearchParams(); 
  const totalPages = Math.ceil(totalDoctores / itemsPerPage);
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTermInput);
    }, 700);
    return () => {
      clearTimeout(timerId); 
    };
  }, [searchTermInput]); 
  useEffect(() => {
  const profileId = searchParams.get('profile');

  if (profileId) {
    onSwitchToTableView(); 
    handleViewProfileClick({ id_imss: profileId });
  }
}, [searchParams]);

  const fetchDoctores = useCallback(async () => {
    const canProceedBasedOnAuth =
      (isAuthenticated && authToken && currentUser) ||
      (isGuestMode && !isAuthenticated);

    if (!canProceedBasedOnAuth) {
      setDoctores([]);
      setTotalDoctores(0);
      if (!isGuestMode && !isAuthenticated) {
        ("Por favor, inicie sesión para ver los datos.");
      }
      setIsLoading(false);
      return;
    }

    if (isAuthenticated && !authToken) {
      setIsLoading(false); // Detener loading
      return;
    }

    setIsLoading(true);
    setFetchError("");

    const skip = (currentPage - 1) * itemsPerPage;
    let url = `${API_BASE_URL}/api/doctores?skip=${skip}&limit=${itemsPerPage}`;

    if (debouncedSearchTerm && String(debouncedSearchTerm).trim() !== "") {
      url += `&search=${encodeURIComponent(
        String(debouncedSearchTerm).trim()
      )}`;
    }
    if (selectedStatus) {
      url += `&estatus=${encodeURIComponent(selectedStatus)}`;
    }

    if (isAuthenticated && currentUser && currentUser.role === "admin") {
      url += "&incluir_eliminados=true";
    }

    try {
      const headers = { "Content-Type": "application/json" };
      if (isAuthenticated && authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, { method: "GET", headers });

      if (response.ok) {
        const data = await response.json();
        setDoctores(data.doctores || []);
        setTotalDoctores(data.total_count || 0);
      } else {
        const errorText = await response.text(); 

        let detailErrorMessage = `Error del servidor: ${response.status}.`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData && errorData.detail) {
            detailErrorMessage = errorData.detail;
          }
        } catch (parseError) {
          if (errorText.length < 100 && errorText.length > 0)
            detailErrorMessage = errorText;
        }

        if (response.status === 401 && isAuthenticated) {
          setFetchError(
            "Tu sesión ha expirado. Por favor, inicia sesión de nuevo."
          );
          authLogout();
        } else {
          setFetchError(detailErrorMessage);
        }
        setDoctores([]);
        setTotalDoctores(0);
      }
    } catch (err) {
      console.error("APP.JSX - fetchDoctores: Error de red o JS:", err);
      setFetchError(
        "Error de conexión al obtener datos de doctores. Verifica tu conexión o la URL de la API."
      );
      setDoctores([]);
      setTotalDoctores(0);
    } finally {
      setIsLoading(false);
      console.log("APP.JSX - fetchDoctores: FINALIZADO. isLoading=false");
    }
  }, [
    isAuthenticated,
    isGuestMode,
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    selectedStatus,
    authToken,
    authLogout,
    API_BASE_URL,
    currentUser, 
  ]);

  useEffect(() => {
    let shouldFetch = false;
    if (isGuestMode && !isAuthenticated) {
      // Modo invitado
      shouldFetch = true;
    } else if (isAuthenticated && authToken && currentUser) {
      shouldFetch = true;
    }

    if (shouldFetch && viewMode === "table") {
      fetchDoctores();
    } else if (viewMode !== "profile") {
      if (!shouldFetch) {
        setDoctores([]);
        setTotalDoctores(0);
      }
    }
  }, [
    fetchDoctores, 
    isAuthenticated,
    isGuestMode,
    authToken,
    currentUser,
    viewMode,
    doctorListRefreshKey,
  ]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, selectedStatus]);

  const fetchFullDoctorProfile = async (doctorId) => {
    if (!doctorId) return;
    
    setFetchError(""); 

    try {
      const headers = { "Content-Type": "application/json" };
      if (isAuthenticated && authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const response = await fetch(`${API_BASE_URL}/api/doctores/${doctorId}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: `Error al cargar el perfil del doctor ${doctorId}`,
        }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      const data = await response.json(); 
      setSelectedDoctorProfile(data); 
    } catch (err) {
      console.error("Error al cargar perfil completo del doctor:", err);
      setFetchError(err.message || "Ocurrió un error al cargar el perfil.");
    } finally {
     setIsLoading(false);
    }
  };

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
    setCurrentPage(1);
  };

  const handleViewProfileClick = async (doctorToList) => {
    setIsLoading(true);
    await fetchFullDoctorProfile(doctorToList.id_imss);
    setIsLoading(false);
    setViewMode("profile");
  };

  const handleBackToTable = () => {
    setViewMode("table");
    setSelectedDoctorProfile(null);
    fetchDoctores();
  };

  const handleDoctorProfileWasUpdated = (doctorId) => {
    fetchFullDoctorProfile(doctorId);
  };

  const handleOpenCreateDoctorModal = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (currentUser?.role === "consulta") {
      alert("El Rol Consulta no pueden agregar doctores.");
      return;
    }
    openModal(null);
  };

  const handleOpenEditModal = (doctor) => {
    if (!isAuthenticated) return;
    openModal(doctor);
  };

  const handleDoctorSave = async (savedDoctorData, wasEditing) => {
    closeModal(); 
    if (!wasEditing && savedDoctorData && savedDoctorData.id_imss) {
      setFetchError(""); 
      setIsLoading(true); 
      try {
        setSelectedDoctorProfile(savedDoctorData); 
        setViewMode("profile"); 
      } catch (error) {
        console.error("Error al cargar el perfil del nuevo doctor:", error);
        setFetchError(
          "Se creó el doctor, pero hubo un error al cargar su perfil completo."
        );
        fetchDoctores();
      } finally {
        setIsLoading(false);
      }
    } else if (wasEditing && savedDoctorData && savedDoctorData.id_imss) {
      if (viewMode === "table") {
        fetchDoctores(); 
      } else if (
        viewMode === "profile" &&
        selectedDoctorProfile?.id_imss === savedDoctorData.id_imss
      ) {
        await fetchFullDoctorProfile(savedDoctorData.id_imss);
      } else {
        fetchDoctores();
      }
    } else {
      fetchDoctores();
    }
  };
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
        fetchDoctores();
      } else if (response.status === 401) {
        setFetchError("Tu sesión ha expirado.");
        authLogout();
      } else if (response.status === 404) {
        setFetchError(`Error: No se encontró el doctor con ID ${doctorId}.`);
        fetchDoctores(currentPage, searchTerm); 
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

  const handleSearchInputChange = (event) => {
    setSearchTermInput(event.target.value);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedStatus]); 

  const handleNavigateToDeletedDoctors = () => {
    navigate("/admin/deleted-doctors"); 
  };

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
          <h1 style={{ marginTop: "30px" }}>Registro de Médicos</h1>
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
          <div style={styles.controlsRow}>
            <div style={styles.searchControls}>
              <label htmlFor="search-nombre" style={styles.searchLabel}>
                {" "}
                Buscar por Nombre:{" "}
              </label>
              <input
                type="search"
                id_imss="search-nombre"
                placeholder="Escribe un nombre o ID..."
                value={searchTermInput}
                onChange={handleSearchInputChange}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    setDebouncedSearchTerm(searchTermInput);
                    setCurrentPage(1);
                  }
                }}
                style={styles.searchInput}
              />
              
            </div>
            {isAuthenticated && currentUser?.role !== "consulta" && (
              <button
                onClick={handleOpenCreateDoctorModal}
                style={styles.addButton}
              >
                <span
                  role="img"
                  aria-label="agregar"
                  style={{ marginRight: "8px" }}
                >
                  ➕
                </span>
                Registrar Médico
              </button>
            )}
            {isAuthenticated && currentUser?.role === "admin" && (
              <button
                onClick={handleNavigateToDeletedDoctors}
                style={{
                  ...styles.button,
                  backgroundColor: "#BC955C",
                  color: "white" 
                }}
              >
                Registros Eliminados
              </button>
            )}
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
              onEdit={isAuthenticated ? handleOpenEditModal : undefined} 
              onDelete={isAuthenticated ? handleDeleteClick : undefined} 
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

function ProtectedRoute({ adminOnly = false, children }) {
  const { isAuthenticated, currentUser, isLoading } = useAuth();

  if (!isAuthenticated) {
    // Si no está autenticado, redirige a login
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && (!currentUser || currentUser.role !== "admin")) {
    // Si requiere admin pero no lo es, redirige a la página principal
    return <Navigate to="/" replace />;
  }
  // Si cumple las condiciones, renderiza el componente hijo
  return children;
}

function AppContent() {
  const { isAuthenticated, isGuestMode, currentUser } = useAuth();
  const navigate = useNavigate();
  const initialVista = new URLSearchParams(window.location.search).has('profile') ? 'tabla' : 'graficas';
  const [vistaActual, setVistaActual] = useState(initialVista);

  const [doctorListRefreshKey, setDoctorListRefreshKey] = useState(0);

  const handleVerGraficas = () => { 
    setVistaActual("graficas");
    navigate("/");
  };
  const handleVerTabla = () => {
    setVistaActual("tabla");
    navigate("/");
  };

  const handleDoctorHasBeenRestored = () => {
    setDoctorListRefreshKey((prevKey) => prevKey + 1); 
    
  };

  const navbarProps = {
    title: "Sistema de Gestión de Información de Médicos Extranjeros",
    vistaActual: vistaActual,
    onVerGraficasClick: handleVerGraficas,
    onVerTablaClick: handleVerTabla,
  };

  return (
    <Routes>
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

      <Route element={<Layout navbarProps={navbarProps} />}>
        <Route
          path="/"
          element={
            isAuthenticated || isGuestMode ? (
              <HomePageContent
                vistaActualProp={vistaActual}
                onSwitchToTableView={handleVerTabla} 
                doctorListRefreshKey={doctorListRefreshKey}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute adminOnly={true}>
              {" "}
              <AdminUsersPage />{" "}
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-log"
          element={
            <ProtectedRoute adminOnly={true}>
              {" "}
              <AuditLogView />{" "}
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/deleted-doctors"
          element={
            <ProtectedRoute adminOnly={true}>
              <DeletedDoctorsView
                onDoctorRestored={handleDoctorHasBeenRestored}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cambiar-contrasena"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="*"
        element={
          <div style={{ padding: "50px", textAlign: "center" }}>
            {" "}
            <h1>404 - Página No Encontrada</h1>{" "}
            <p>Lo sentimos, la página que buscas no existe.</p>{" "}
            <Link to="/">Volver a la página principal</Link>{" "}
          </div>
        }
      />
    </Routes>
  );
}

function Root() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ModalProvider>
          <AppContent />
        </ModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default Root;
