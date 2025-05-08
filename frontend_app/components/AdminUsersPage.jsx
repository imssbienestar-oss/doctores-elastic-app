// src/components/AdminUsersPage.jsx (o src/pages/AdminUsersPage.jsx)

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../src/contexts/AuthContext"; // Para obtener token y datos del admin actual

// Componente principal de la página de administración
function AdminUsersPage() {
  const { token, currentUser } = useAuth(); // Obtener token y datos del admin logueado
  const [users, setUsers] = useState([]); // Estado para la lista de usuarios
  const [isLoading, setIsLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(""); // Estado para mensajes de error generales
  const [success, setSuccess] = useState(""); // Estado para mensajes de éxito generales

  // Estado para el formulario de nuevo usuario
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "user",
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // Para deshabilitar botón de crear
  const [formError, setFormError] = useState(""); // Errores específicos del formulario
  const [formSuccess, setFormSuccess] = useState(""); // Mensajes de éxito del formulario
  const [showNewUserPassword, setShowNewUserPassword] = useState(false); // NUEVO: Estado para mostrar/ocultar contraseña

  const apiUrlBase =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  // --- Función para obtener usuarios ---
  const fetchUsers = useCallback(async () => {
    if (!token) {
      setError(
        "No estás autenticado. No se puede obtener la lista de usuarios."
      );
      setIsLoading(false); // Asegúrate de detener la carga si no hay token
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess(""); // Limpiar mensajes generales al recargar

    try {
      const response = await fetch(`${apiUrlBase}/api/admin/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ detail: `Error ${response.status}` }));
        console.error("Error fetchUsers:", response.status, errorData);
        setError(
          `Error al obtener usuarios: ${
            errorData.detail || response.statusText
          }`
        );
        if (response.status === 403)
          setError("No tienes permisos para ver los usuarios.");
      }
    } catch (err) {
      console.error("Error de red fetchUsers:", err);
      setError("Error de red al obtener usuarios.");
    } finally {
      setIsLoading(false);
    }
  }, [token, apiUrlBase]); // Depende del token y la URL base

  // --- Cargar usuarios al montar el componente ---
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // Llamar a fetchUsers cuando cambie (al montar y si cambia token)

  // --- Manejador para cambios en el formulario de nuevo usuario ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
    setFormError(""); // Limpiar error al escribir
    setFormSuccess(""); // Limpiar éxito al escribir
  };

  // --- Manejador para crear un nuevo usuario ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (!newUser.username || !newUser.password) {
      setFormError("Nombre de usuario y contraseña son requeridos.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      const response = await fetch(`${apiUrlBase}/api/admin/users/register`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json(); // Intenta leer siempre la respuesta

      if (response.ok) {
        // status 201 Created
        setFormSuccess(`Usuario '${data.username}' creado exitosamente.`);
        setNewUser({ username: "", password: "", role: "user" }); // Limpiar formulario
        setShowNewUserPassword(false); // NUEVO: Asegurar que la contraseña vuelva a estar oculta
        fetchUsers(); // Recargar la lista de usuarios
      } else {
        console.error("Error handleCreateUser:", response.status, data);
        setFormError(
          `Error al crear usuario: ${data.detail || response.statusText}`
        );
      }
    } catch (err) {
      console.error("Error de red handleCreateUser:", err);
      setFormError("Error de red al crear usuario.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Manejador para eliminar un usuario ---
  const handleDeleteUser = async (userId, username) => {
    if (!token) return;

    if (
      !window.confirm(
        `¿Estás seguro de que quieres eliminar al usuario '${username}' (ID: ${userId})?`
      )
    ) {
      return;
    }

    if (currentUser && currentUser.id === userId) {
      setError("No puedes eliminar tu propia cuenta.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${apiUrlBase}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.detail || `Usuario '${username}' eliminado.`);
        fetchUsers();
      } else {
        console.error("Error handleDeleteUser:", response.status, data);
        setError(
          `Error al eliminar usuario: ${data.detail || response.statusText}`
        );
      }
    } catch (err) {
      console.error("Error de red handleDeleteUser:", err);
      setError("Error de red al eliminar usuario.");
    }
  };

  // --- Manejador para Restablecer Contraseña ---
  const handleResetPassword = async (userId, username) => {
    if (!token) return;

    const newPassword = window.prompt(
      `Introduce la NUEVA contraseña TEMPORAL para el usuario '${username}' (ID: ${userId}):`
    );

    if (newPassword === null) {
      return;
    }
    if (newPassword.trim() === "" || newPassword.length < 4) {
      setError(
        `La nueva contraseña para '${username}' no puede estar vacía y debe tener al menos 4 caracteres.`
      );
      setTimeout(() => setError(""), 5000);
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${apiUrlBase}/api/admin/users/${userId}/reset-password`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ new_password: newPassword }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess(
          data.detail || `Contraseña para '${username}' restablecida.`
        );
        setTimeout(() => setSuccess(""), 5000);
      } else {
        console.error("Error handleResetPassword:", response.status, data);
        setError(
          `Error al restablecer contraseña: ${
            data.detail || response.statusText
          }`
        );
        setTimeout(() => setError(""), 5000);
      }
    } catch (err) {
      console.error("Error de red handleResetPassword:", err);
      setError("Error de red al restablecer la contraseña.");
      setTimeout(() => setError(""), 5000);
    }
  };

  // NUEVO: Función para alternar la visibilidad de la contraseña de nuevo usuario
  const toggleShowNewUserPassword = () => {
    setShowNewUserPassword(!showNewUserPassword);
  };

  // --- Renderizado del Componente ---
  return (
    <div>
      <h1>Gestión de Usuarios</h1>

      {/* Sección para Crear Nuevo Usuario */}
      <div style={styles.section}>
        <h2>Crear Nuevo Usuario</h2>
        <form onSubmit={handleCreateUser} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="username" style={styles.label}>
              Nombre de Usuario:
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={newUser.username}
              onChange={handleInputChange}
              required
              style={styles.input}
              autoComplete="username"
            />
          </div>
          <div style={styles.formGroup}> {/* MODIFICADO: Contenedor para input y botón */}
            <label htmlFor="password" style={styles.label}>
              Contraseña:
            </label>
            <div style={styles.passwordInputContainer}> {/* NUEVO: Contenedor específico */}
              <input
                type={showNewUserPassword ? "text" : "password"} // MODIFICADO: Tipo dinámico
                id="password"
                name="password"
                value={newUser.password}
                onChange={handleInputChange}
                required
                style={styles.inputFieldInGroup} // MODIFICADO: Usar nuevo estilo para que ocupe el espacio disponible
                autoComplete="new-password"
              />
              <button
                type="button" // NUEVO: Importante para no enviar el formulario
                onClick={toggleShowNewUserPassword}
                style={styles.togglePasswordButton} // NUEVO: Estilo para el botón
              >
                {showNewUserPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="role" style={styles.label}>
              Rol:
            </label>
            <select
              id="role"
              name="role"
              value={newUser.role}
              onChange={handleInputChange}
              style={styles.input}
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {formError && <p style={styles.errorMessage}>{formError}</p>}
          {formSuccess && <p style={styles.successMessage}>{formSuccess}</p>}
          <button type="submit" disabled={isSubmitting} style={styles.button}>
            {isSubmitting ? "Creando..." : "Crear Usuario"}
          </button>
        </form>
      </div>

      {/* Separador */}
      <hr style={styles.hr} />

      {/* Sección para Listar Usuarios */}
      <div style={styles.section}>
        <h2>Usuarios Registrados</h2>
        {isLoading && <p>Cargando usuarios...</p>}
        {error && <p style={styles.errorMessage}>{error}</p>}
        {success && <p style={styles.successMessage}>{success}</p>}
        {!isLoading && !error && (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Nombre de Usuario</th>
                <th style={styles.th}>Rol</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td style={styles.td}>{user.id}</td>
                    <td style={styles.td}>{user.username}</td>
                    <td style={styles.td}>{user.role}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        disabled={currentUser && currentUser.id === user.id}
                        style={styles.deleteButton}
                        title={
                          currentUser && currentUser.id === user.id
                            ? "No puedes eliminarte a ti mismo"
                            : "Eliminar usuario"
                        }
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() =>
                          handleResetPassword(user.id, user.username)
                        }
                        style={styles.resetButton}
                        title={`Restablecer contraseña para ${user.username}`}
                      >
                        Restablecer Contraseña
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ ...styles.td, textAlign: "center" }}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- Estilos (Puedes moverlos a un archivo CSS o mejorar estos estilos básicos) ---
const styles = {
  section: {
    maxWidth: "50%",
    marginBottom: "30px",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
    margin: "0 auto 30px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    maxWidth: "400px",
    margin: "20px auto"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    // alignSelf: "center" // MODIFICADO: Quitar para que el label y el input+botón se alineen al inicio
  },
  label: {
    marginBottom: "5px",
    fontWeight: "bold",
  },
  input: { // Estilo para inputs que ocupan todo el ancho del formGroup
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "1em",
    boxSizing: 'border-box', // Asegura que padding no aumente el ancho total
    width: '100%', // NUEVO: Hacer que ocupe el ancho completo del formGroup
  },
  passwordInputContainer: { // NUEVO: Estilo para el div que contiene input de contraseña y botón
    display: 'flex',
    alignItems: 'center',
    position: 'relative', // Para posicionar el botón absolutamente dentro de este div si es necesario
    width: '100%', // Ocupar el ancho del formGroup
  },
  inputFieldInGroup: { // NUEVO: Estilo para el input de contraseña cuando está junto a un botón
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px 0 0 4px", // Redondear solo esquinas izquierdas
    fontSize: "1em",
    flexGrow: 1, // Para que ocupe el espacio restante
    boxSizing: 'border-box',
  },
  togglePasswordButton: { // NUEVO: Estilo para el botón de mostrar/ocultar
    padding: '10px',
    border: '1px solid #ccc',
    borderLeft: 'none', // Quitar borde izquierdo para que se una al input
    borderRadius: '0 4px 4px 0', // Redondear solo esquinas derechas
    backgroundColor: '#f0f0f0',
    cursor: 'pointer',
    fontSize: '0.9em', // Un poco más pequeño para que no sea tan prominente
    whiteSpace: 'nowrap', // Para que "Mostrar" / "Ocultar" no se parta en dos líneas
  },
  button: {
    padding: "10px 15px",
    marginTop:"20px",
    backgroundColor: "#235b4e", // Color primario (ejemplo)
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "1em",
    transition: "background-color 0.2s ease",
    alignSelf: "center",
  },
  deleteButton: {
    padding: "5px 10px",
    backgroundColor: "#9F2241", // Color peligro (ejemplo)
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9em",
    margin: "8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "15px",
  },
  th: {
    borderBottom: "2px solid #dee2e6",
    padding: "12px",
    textAlign: "center",
    backgroundColor: "#e9ecef",
  },
  td: {
    borderBottom: "1px solid #dee2e6",
    padding: "12px",
    textAlign: 'left', // MODIFICADO: Alineación izquierda para el contenido de las celdas
  },
  hr: {
    border: "none",
    borderTop: "1px solid #ccc",
    margin: "30px 0",
  },
  errorMessage: {
    color: "red",
    marginTop: "10px",
    textAlign: 'center', // MODIFICADO: Centrar mensajes
  },
  successMessage: {
    color: "green",
    marginTop: "10px",
    textAlign: 'center', // MODIFICADO: Centrar mensajes
  },
  resetButton: {
    padding: '5px 10px',
    backgroundColor: '#BC955C',
    color: '#FFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9em',
    margin: '8px', // NUEVO: Añadir margen para separar de otros botones
  },
};

export default AdminUsersPage;
