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

    //console.log("Intentando login en:", tokenUrl);

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
        //console.log("Login exitoso:", data);

        // Usar la función 'login' del AuthContext
        // AuthContext se encargará de guardar el token y actualizar el estado global
        auth.login(data.access_token);

        if (onLoginSuccess) {
          onLoginSuccess(); // Llama a la prop si el padre necesita reaccionar
        }
        navigate("/doctores"); // Redirige a la página principal o dashboard
      } else {
        let errorDetail = "Usuario o contraseña incorrectos.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorDetail = errorData.detail;
        } catch (e) {
          // No hacer nada si el error no es JSON
        }
        setError(errorDetail);
        //console.error("Error de login:", response.status, response.statusText, errorDetail);
      }
    } catch (err) {
      setError("Error de conexión con el servidor. Intenta de nuevo.");
      //console.error("Error de red o conexión:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    // Usar la función 'enterGuestMode' del AuthContext
    // AuthContext se encargará de limpiar cualquier token y actualizar el estado global
    auth.enterGuestMode();

    if (onGuestLogin) {
      onGuestLogin(); // Llama a la prop si el padre necesita reaccionar
    }
    navigate("/doctores"); // Redirige a la página principal o dashboard
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

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>
              Contraseña:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
            />
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

// Tus estilos permanecen igual
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
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
    width: '150px', // Ajustado ligeramente para que no sea tan grande
    height: '150px',// Ajustado ligeramente para que no sea tan grande
    // borderRadius: '50%', // Comentado si tu logo no es circular y quieres que se vea completo
    objectFit: 'contain', // Cambiado a contain para asegurar que todo el logo sea visible
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
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    boxSizing: 'border-box',
    transition: 'border 0.3s',
  },
  // inputFocus (puedes añadir esto con un estado de 'focus' en el input si lo deseas)
  // inputFocus: {
  //   borderColor: '#4a90e2',
  //   outline: 'none',
  // },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4a90e2', // Un azul un poco más estándar
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease', // Transición más suave
  },
  buttonLoading: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#a0c4ff', // Un azul más claro para el estado de carga
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
    backgroundColor: '#6c757d', // Un gris más estándar para botón secundario
    color: 'white', // Texto blanco para mejor contraste
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    marginTop: '10px', // Pequeño margen superior
  },
  error: {
    color: '#dc3545', // Un rojo más estándar para errores
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
  color: '#999', 
  },
  separatorText: {
    padding: '0 170px', 
    fontSize: '20px', 
    color: '#6c757d',
  },
};

export default LoginPage;
