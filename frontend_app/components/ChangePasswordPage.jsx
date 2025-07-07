import React, { useState } from "react";
import { useAuth } from "../src/contexts/AuthContext"; // Necesitas el token para la autenticación
import { useNavigate } from "react-router-dom";

function ChangePasswordPage() {
 const { token, logout, currentUser } = useAuth(); // Asume que el token se guarda incluso si es para cambio
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (!token) {
            setError("Error de autenticación. No se encontró el token. Por favor, inicia sesión de nuevo.");
            setTimeout(() => navigate('/login'), 3000);
            return;
        }

    setError("");
    setSuccess("");

    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const changePasswordUrl = `${apiUrl}/api/users/me/change-password`; // <-- Asegúrate de usar apiUrl

    try {
      const response = await fetch(changePasswordUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // Importante: Debes estar autenticado para hacer este cambio
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Error al cambiar la contraseña.");
      }

      setSuccess("Contraseña cambiada. Serás redirigido para iniciar sesión.");
      // Desconecta al usuario y lo manda a login para que entre con la nueva contraseña
      setTimeout(() => {
        // logout(); // Llama a tu función de logout
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Cambiar Contraseña</h2>
      <p>
        Por seguridad, debes establecer una nueva contraseña para tu cuenta.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nueva Contraseña"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirmar Nueva Contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">Cambiar Contraseña</button>
        {error && <p style={{ color: "red" }}>{error}</p>}
        {success && <p style={{ color: "green" }}>{success}</p>}
      </form>
    </div>
  );
}

export default ChangePasswordPage;
