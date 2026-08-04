import React, { useState } from "react";
import { useAuth } from "../../src/contexts/AuthContext";

function RegistroEncargadosPage() {
  const { token } = useAuth(); 
  const [formSuccess, setFormSuccess] = useState(""); 
  const [formError, setFormError] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false); 

  // Estado actualizado para manejar correo, clues y entidad
  const [newUser, setNewUser] = useState({
    correo: "", // Cambiamos id_imss por email
    password: "",
    rol: "responsable_unidad",
    clues: "",
    entidad: "",
  });

  const apiUrlBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (!newUser.correo || !newUser.password) {
      setFormError("El correo electrónico y la contraseña son requeridos.");
      return;
    }

    // Validaciones dependiendo del rol
    if (newUser.rol === "responsable_unidad" && !newUser.clues) {
        setFormError("Debes ingresar la CLUES a la que estará a cargo este administrador.");
        return;
    }
    if (newUser.rol === "coordinador_estatal" && !newUser.entidad) {
        setFormError("Debes especificar la Entidad Federativa para el coordinador.");
        return;
    }

    setIsSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      // OJO: Tendremos que ajustar el endpoint en FastAPI para recibir este nuevo JSON
      const response = await fetch(`${apiUrlBase}/api/admin/encargados/registrar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });

      const data = await response.json(); 

      if (response.ok) {
        setFormSuccess(`Cuenta creada exitosamente para '${newUser.correo}'.`);
        setNewUser({ email: "", password: "", rol: "responsable_unidad", clues: "", entidad: "" });
        setTimeout(() => setFormSuccess(""), 5000);
      } else {
        setFormError(`Error: ${data.detail || response.statusText}`);
      }
    } catch (err) {
      setFormError("Error de red al crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Si cambia el rol, limpiamos los campos de clues y entidad para evitar datos cruzados
    if (name === "rol") {
        setNewUser((prev) => ({ ...prev, [name]: value, clues: "", entidad: "" }));
    } else {
        setNewUser((prev) => ({ ...prev, [name]: value }));
    }
    
    setFormError(""); 
    setFormSuccess("");
  };

  return (
    <div>
      <h1>Gestión de Encargados y Coordinadores</h1>
      <p style={{ textAlign: "center", marginBottom: "20px", color: "#666" }}>
        Registra los accesos para el personal administrativo asignando directamente su jurisdicción (CLUES o Estado).
      </p>

      <div style={styles.section}>
        <h2>Crear Cuenta de Acceso</h2>
        <form onSubmit={handleCreateUser} style={styles.form}>
          
          <div style={styles.formGroup}>
            <label htmlFor="correo" style={styles.label}>Correo Electrónico (Usuario):</label>
            <input
              type="email"
              id="correo"
              name="correo"
              value={newUser.correo}
              onChange={handleInputChange}
              required
              placeholder="ejemplo@imssbienestar.gob.mx"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="password" style={styles.label}>Contraseña Inicial:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={newUser.password}
              onChange={handleInputChange}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="rol" style={styles.label}>Rol en el Sistema:</label>
            <select
              id="rol"
              name="rol"
              value={newUser.rol}
              onChange={handleInputChange}
              style={styles.input}
            >
              <option value="responsable_unidad">Administrador de Unidad (CLUES)</option>
              <option value="coordinador_estatal">Coordinador Estatal</option>
            </select>
          </div>

          {/* RENDERIZADO CONDICIONAL: Solo muestra CLUES si es responsable de unidad */}
          {newUser.rol === "responsable_unidad" && (
            <div style={styles.formGroup}>
              <label htmlFor="clues" style={styles.label}>CLUES Asignada:</label>
              <input
                type="text"
                id="clues"
                name="clues"
                value={newUser.clues}
                onChange={handleInputChange}
                required
                placeholder="Ej. YNSME000016"
                style={{...styles.input, border: "1px solid #10312B"}}
              />
            </div>
          )}

          {/* RENDERIZADO CONDICIONAL: Solo muestra Entidad si es coordinador estatal */}
          {newUser.rol === "coordinador_estatal" && (
            <div style={styles.formGroup}>
              <label htmlFor="entidad" style={styles.label}>Entidad Federativa (Estado):</label>
              <select
                id="entidad"
                name="entidad"
                value={newUser.entidad}
                onChange={handleInputChange}
                required
                style={{...styles.input, border: "1px solid #10312B"}}
              >
                <option value="">Selecciona un estado...</option>
                <option value="AGUASCALIENTES">Aguascalientes</option>
                <option value="BAJA CALIFORNIA">Baja California</option>
                <option value="CAMPECHE">Campeche</option>
                <option value="CHIAPAS">Chiapas</option>
                <option value="CIUDAD DE MEXICO">Ciudad de México</option>
                <option value="COLIMA">Colima</option>
                <option value="ESTADO DE MEXICO">Estado de México</option>
                <option value="GUERRERO">Guerrero</option>
                <option value="HIDALGO">Hidalgo</option>
                <option value="MICHOACAN">Michoacán</option>
                <option value="MORELOS">Morelos</option>
                <option value="NAYARIT">Nayarit</option>
                <option value="OAXACA">Oaxaca</option>
                <option value="PUEBLA">Puebla</option>
                <option value="QUINTANA ROO">Quintana Roo</option>
                <option value="SAN LUIS POTOSI">San Luis Potosí</option>
                <option value="SINALOA">Sinaloa</option>
                <option value="SONORA">Sonora</option>
                <option value="TABASCO">Tabasco</option>
                <option value="TAMAULIPAS">Tamaulipas</option>
                <option value="TLAXCALA">Tlaxcala</option>
                <option value="VERACRUZ">Veracruz</option>
                <option value="YUCATAN">Yucatán</option>
                <option value="ZACATECAS">Zacatecas</option>
              </select>
            </div>
          )}

          {formError && <p style={styles.errorMessage}>{formError}</p>}
          {formSuccess && <p style={styles.successMessage}>{formSuccess}</p>}
          
          <button type="submit" disabled={isSubmitting} style={styles.button}>
            {isSubmitting ? "Registrando..." : "Registrar Cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  section: {
    maxWidth: "50%",
    padding: "20px",
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
    margin: "20px auto",
  },
  formGroup: { display: "flex", flexDirection: "column" },
  label: { marginBottom: "5px", fontWeight: "bold", fontSize: "14px" },
  input: { padding: "10px", border: "1px solid #ccc", borderRadius: "4px", width: "100%" },
  button: {
    padding: "10px 15px",
    marginTop: "10px",
    backgroundColor: "#10312B", 
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  errorMessage: { color: "red", textAlign: "center", fontSize: "14px", fontWeight: "bold" },
  successMessage: { color: "green", textAlign: "center", fontWeight: "bold" },
};

export default RegistroEncargadosPage;