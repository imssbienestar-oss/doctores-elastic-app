// src/components/LoginPage.jsx
import React, { useState } from 'react';

// Recibe una función 'onLoginSuccess' como prop para notificar cuando el login es exitoso
function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevenir recarga de página
    setError(''); // Limpiar errores anteriores
    setLoading(true); // Indicar que estamos cargando

    // Preparamos los datos como 'form data' porque OAuth2PasswordRequestForm los espera así
    const loginData = new URLSearchParams();
    loginData.append('username', username);
    loginData.append('password', password);

    try {
      // Hacemos la petición POST al endpoint /api/token del backend
      // ¡ASEGÚRATE DE QUE LA URL DEL BACKEND SEA CORRECTA SI NO ES LA PREDETERMINADA!
      // Si tu backend corre en un puerto diferente o URL, ajústala aquí.
      const response = await fetch('http://127.0.0.1:8000/api/token', { // Asume que el backend corre en el puerto 8000
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: loginData,
      });

      setLoading(false); // Terminamos de cargar

      if (response.ok) {
        const data = await response.json(); // Obtener el token de la respuesta
        console.log('Login exitoso:', data);
        // Guardar el token en localStorage para usarlo después
        localStorage.setItem('accessToken', data.access_token);
        // Llamar a la función pasada por props para indicar que el login fue exitoso
        onLoginSuccess();
      } else {
        // Intentar leer el detalle del error del backend si es posible
        let errorDetail = 'Usuario o contraseña incorrectos.';
        try {
            const errorData = await response.json();
            if (errorData.detail) {
                errorDetail = errorData.detail;
            }
        } catch(e) {
            // Si no hay cuerpo JSON o falla, usar mensaje genérico
        }
        setError(errorDetail);
        console.error('Error de login:', response.status, response.statusText);
      }
    } catch (err) {
      setLoading(false); // Terminamos de cargar
      setError('Error de conexión con el servidor. Intenta de nuevo.');
      console.error('Error de red o conexión:', err);
    }
  };

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
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;