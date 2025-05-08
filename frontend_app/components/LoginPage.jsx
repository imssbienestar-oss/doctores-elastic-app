// src/components/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Para la redirección
import { useAuth } from "../src/contexts/AuthContext"; // Asegúrate que la ruta sea correcta
import image from "../components/IMSSB.png";

// Las props onLoginSuccess y onGuestLogin pueden mantenerse si App.js
// necesita reaccionar directamente, pero la lógica principal de auth
// y redirección se manejará aquí usando el contexto y navigate.
function LoginPage({ onLoginSuccess, onGuestLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // NUEVO: Estado para mostrar/ocultar contraseña

  const navigate = useNavigate();
  const auth = useAuth(); // Obtener el contexto de autenticación

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const loginData = new URLSearchParams();
    loginData.append("username", username);
    loginData.append("password", password);

    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const tokenUrl = `${apiUrl}/api/token`;

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: loginData,
      });

      if (response.ok) {
        const data = await response.json();
        auth.login(data.access_token);

        if (onLoginSuccess) {
          onLoginSuccess();
        }
        navigate("/doctores");
      } else {
        let errorDetail = "Usuario o contraseña incorrectos.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorDetail = errorData.detail;
        } catch (e) {
          // No hacer nada si el error no es JSON
        }
        setError(errorDetail);
      }
    } catch (err) {
      setError("Error de conexión con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    auth.enterGuestMode();
    if (onGuestLogin) {
      onGuestLogin();
    }
    navigate("/doctores");
  };

  // NUEVO: Función para alternar la visibilidad de la contraseña
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginContainer}>
        <div style={styles.imageContainer}>
          <img
            src={image}
            alt="Logo de la aplicación"
            style={styles.logo}
          />
        </div>

        <h2 style={styles.title}>Iniciar Sesión</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="username" style={styles.label}>
              Usuario:
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={styles.input}
              placeholder="Ingresa tu usuario"
              autoComplete="username"
            />
          </div>

          {/* MODIFICADO: Grupo de input para contraseña con botón de mostrar/ocultar */}
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>
              Contraseña:
            </label>
            <div style={styles.passwordInputContainer}> {/* NUEVO: Contenedor para input y botón */}
              <input
                type={showPassword ? "text" : "password"} // MODIFICADO: Tipo dinámico
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.inputFieldInGroup} // MODIFICADO: Usar nuevo estilo
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
              />
              <button
                type="button" // NUEVO: Importante para no enviar el formulario
                onClick={toggleShowPassword}
                style={styles.togglePasswordButton} // NUEVO: Estilo para el botón
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={loading ? styles.buttonLoading : styles.button}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div style={styles.separator}>
          <span style={styles.separatorText}>o</span>
        </div>

        <button onClick={handleGuestLogin} style={styles.guestButton}>
          Ingresar como invitado
        </button>
      </div>
    </div>
  );
}

// Tus estilos
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#235B4E',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  loginContainer: {
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    padding: '30px',
    width: '350px',
    textAlign: 'center',
  },
  imageContainer: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center',
  },
  logo: {
    width: '150px',
    height: '150px',
    objectFit: 'contain',
  },
  title: {
    color: '#333',
    marginBottom: '25px',
    fontSize: '24px',
  },
  form: {
    marginBottom: '20px',
  },
  inputGroup: {
    marginBottom: '20px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#555',
    fontWeight: '500',
  },
  input: { // Estilo para inputs que ocupan todo el ancho del inputGroup
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    boxSizing: 'border-box',
    transition: 'border 0.3s',
  },
  passwordInputContainer: { // NUEVO: Contenedor para el input de contraseña y el botón
    display: 'flex',
    alignItems: 'center',
    width: '100%', // Para que ocupe el ancho del inputGroup
  },
  inputFieldInGroup: { // NUEVO: Estilo para el input cuando está junto a un botón
    flexGrow: 1, // Para que ocupe el espacio restante
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '5px 0 0 5px', // Redondear solo esquinas izquierdas
    fontSize: '14px',
    boxSizing: 'border-box',
    transition: 'border 0.3s',
    // Se elimina width: '100%' porque flexGrow lo maneja
  },
  togglePasswordButton: { // NUEVO: Estilo para el botón de mostrar/ocultar
    padding: '12px', // Misma altura que el input
    border: '1px solid #ddd',
    borderLeft: 'none', // Quitar borde izquierdo para que se una al input
    borderRadius: '0 5px 5px 0', // Redondear solo esquinas derechas
    backgroundColor: '#f0f0f0', // Un color de fondo sutil
    cursor: 'pointer',
    fontSize: '12px', // Un poco más pequeño
    color: '#333', // Color de texto
    height: 'auto', // Ajustar altura al contenido
    lineHeight: 'normal', // Asegurar alineación vertical del texto
    whiteSpace: 'nowrap', // Para que "Mostrar" / "Ocultar" no se parta
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#235B4E',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  buttonLoading: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#a0c4ff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'not-allowed',
  },
  guestButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    marginTop: '10px',
  },
  error: {
    color: '#dc3545',
    margin: '10px 0',
    fontSize: '14px',
  },
  separator: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    margin: '20px 0',
    color: '#999',
    width: '100%', /* Asegura que el contenedor tome todo el ancho */
  },
  separatorText: {
    padding: '0 170px', 
    fontSize: '20px', 
    color: '#6c757d',
  },
};

// Modificación para la línea del separador (opcional, pero mejora la estética)
// Añade esto *después* de la definición del objeto `styles` si quieres que la línea pase por detrás del texto "o"
styles.separator = {
  ...styles.separator, // Mantiene las propiedades existentes
  position: 'relative', // Necesario para el pseudo-elemento
};
styles.separator['::before'] = { // La línea del separador
  content: '""',
  position: 'absolute',
  top: '50%',
  left: 0,
  right: 0,
  borderBottom: '1px solid #ddd', // Color de la línea
  zIndex: 0, // Detrás del texto
};


export default LoginPage;
