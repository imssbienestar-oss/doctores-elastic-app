// src/components/LoginPage.jsx
import React, { useState } from "react";

// Recibe una función 'onLoginSuccess' como prop para notificar cuando el login es exitoso
function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const loginData = new URLSearchParams();
    loginData.append("username", username);
    loginData.append("password", password);

    // --- CORRECCIÓN: Usar variable de entorno para la URL del backend ---
    // Obtener la URL base desde la variable de entorno o usar localhost como fallback
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    // Construir la URL completa para el endpoint de token
    const tokenUrl = `${apiUrl}/api/token`;

    console.log("Intentando login en:", tokenUrl); // Log para verificar la URL que se usará

    try {
      // Usar la variable 'tokenUrl' en la llamada fetch
      const response = await fetch(tokenUrl, {
        // <--- USA LA VARIABLE tokenUrl
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: loginData,
      });
      // --- FIN CORRECCIÓN ---

      // Mover setLoading(false) aquí para que se ejecute tras la respuesta
      setLoading(false);

      if (response.ok) {
        const data = await response.json();
        console.log("Login exitoso:", data);
        localStorage.setItem("accessToken", data.access_token);
        onLoginSuccess();
      } else {
        let errorDetail = "Usuario o contraseña incorrectos.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorDetail = errorData.detail;
        } catch (e) {}
        setError(errorDetail);
        console.error("Error de login:", response.status, response.statusText);
      }
    } catch (err) {
      // Mover setLoading(false) al finally es más seguro
      // setLoading(false);
      setError("Error de conexión con el servidor. Intenta de nuevo.");
      console.error("Error de red o conexión:", err);
    } finally {
      // Asegurarse que se desactive loading incluso si hay errores antes del fetch
      setLoading(false);
    }
  }; // Fin handleSubmit

  return (
    <div>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Usuario:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
