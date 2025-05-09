// src/components/DoctorProfileView.jsx
import React from "react";

// Estilos básicos para el perfil (puedes moverlos a tu App.css o un archivo CSS dedicado)
const profileStyles = {
  container: {
    padding: "20px",
    margin: "20px auto", // Centrado y con margen
    maxWidth: "800px", // Ancho máximo para el expediente
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
    paddingBottom: "15px",
    borderBottom: "1px solid #eee",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    color: "#333",
  },
  backButton: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#6c757d", // Gris, similar a tu botón de "Salir de Invitado"
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
  },
  sectionTitle: {
    fontSize: "20px",
    color: "#235b4e", // Verde de tus botones primarios
    fontWeight: "bold",
    marginTop: "30px",
    marginBottom: "15px",
    borderBottom: "1px solid #e0e0e0",
    paddingBottom: "5px",
  },
  fieldGroup: {
    marginBottom: "12px",
    lineHeight: "1.6",
  },
  fieldLabel: {
    fontWeight: "bold",
    color: "#555",
    textAlign: "left",
    paddingRight: "10px",
  },
  fieldValue: {
    color: "#333",
    textAlign: "left",
    wordBreak: "break-word",
  },
  gridContainer: {
    // Para un layout de dos columnas si lo deseas
    display: "grid",
    gap: "20px",
  },
  fieldPair: {
    // Nuevo estilo para el div que envuelve etiqueta y valor
    display: "grid",
    gridTemplateColumns: "auto 1fr", // Columna etiqueta (ancho auto) y columna valor (resto del espacio)
    gap: "0 10px", // Sin espacio vertical, 10px de espacio horizontal entre etiqueta y valor
    alignItems: "baseline", // Alinea las líneas base del texto, bueno para multilínea
    marginBottom: "10px", // Espacio debajo de cada par
  },
  mainLayout: {
    // NUEVO
    display: "grid",
    gridTemplateColumns: "2fr 1fr", // Columna de info (más ancha) y columna de archivos (más angosta)
    // Ajusta estas proporciones según necesites (ej. '3fr 1fr' o '60% 40%')
    gap: "30px", // Espacio entre las dos columnas principales
    padding: "20px",
    margin: "20px auto",
    maxWidth: "1200px", // Podrías necesitar un maxWidth mayor para acomodar la nueva columna
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
  },
  infoColumn: {
    // NUEVO
    // Podrías añadir estilos específicos si es necesario, o dejarlo vacío
  },
  filesColumn: {
    // NUEVO
    // Estilos para la columna derecha
    borderLeft: "1px solid #eee", // Una línea sutil para separar visualmente
    paddingLeft: "30px",
  },
  profilePicSection: {
    // NUEVO
    marginBottom: "30px",
    textAlign: "center", // Para centrar la foto y el input
    // ... más estilos para la imagen, placeholder, etc.
  },
  attachmentsSection: {
    // NUEVO
    // ... estilos para la lista de archivos, etc.
  },
  profileImage: {
    // NUEVO
    width: "150px",
    height: "150px",
    objectFit: "cover",
    borderRadius: "50%", // Para hacerla circular
    marginBottom: "15px",
    border: "2px solid #eee", // Un borde sutil
  },
  profileImagePlaceholder: {
    // NUEVO
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    backgroundColor: "#f0f0f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#888",
    fontSize: "0.9em",
    marginBottom: "15px",
    border: "2px dashed #ccc",
    marginLeft: "30%",
  },
  fileInput: {
    // NUEVO - Para mejorar un poco el aspecto de los inputs de archivo
    display: "block", // Para que ocupe su propia línea
    margin: "10px auto", // Centrado si la sección está centrada
  },
  attachmentList: {
    // NUEVO
    listStyle: "none",
    padding: 0,
    textAlign: "left", // Alinea los items de la lista a la izquierda
  },
  attachmentItem: {
    // NUEVO
    padding: "5px 0",
    borderBottom: "1px dotted #eee",
  },
  attachmentLink: {
    // NUEVO
    textDecoration: "none",
    color: "#007bff", // Color de enlace estándar
  },
  noAttachments: {
    // NUEVO
    color: "#777",
    fontStyle: "italic",
  },
};

function DoctorProfileView({ doctor, onBack }) {
  if (!doctor) {
    return (
      <div style={profileStyles.container}>
        <p>No se ha seleccionado un doctor para ver el perfil.</p>
        <button onClick={onBack} style={profileStyles.backButton}>
          &larr; Volver a la Tabla
        </button>
      </div>
    );
  }

  const handleProfilePicUpload = (event) => {
    const file = event.target.files[0]; // Obtiene el archivo seleccionado
    if (file) {
      console.log("Foto de perfil seleccionada:", file);
      // Aquí irá la lógica para subir la foto de perfil
      // Por ejemplo, crear un FormData, llamar a una API, etc.
      alert(`Foto de perfil seleccionada: ${file.name}`); // Placeholder
    }
  };

  const handleAttachmentUpload = (event) => {
    const files = event.target.files; // Obtiene la lista de archivos seleccionados (puede ser multiple)
    if (files && files.length > 0) {
      console.log("Expedientes seleccionados:", files);
      // Aquí irá la lógica para subir los expedientes
      // Puede que necesites iterar sobre 'files' si permites subidas múltiples
      alert(
        `${files.length} expediente(s) seleccionado(s). El primero es: ${files[0].name}`
      ); // Placeholder
    }
  };

  const displayField = (label, value) => (
    <div style={profileStyles.fieldPair}>
      <span style={profileStyles.fieldLabel}>{label}:</span>
      <span style={profileStyles.fieldValue}>
        {value === null || value === undefined || String(value).trim() === ""
          ? "No especificado"
          : String(value)}
      </span>
    </div>
  );

  return (
    <div style={profileStyles.mainLayout}>
      <div style={profileStyles.infoColumn}>
        <div style={profileStyles.header}>
          <h1 style={profileStyles.title}>Expediente del Doctor</h1>
          <button onClick={onBack} style={profileStyles.backButton}>
            &larr; Volver a la Tabla
          </button>
        </div>

        {/* Puedes organizar los campos en secciones o columnas */}
        <div style={profileStyles.sectionTitle}>Información Personal</div>
        <div
          style={{
            ...profileStyles.gridContainer,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          {" "}
          {/* 2 columnas principales */}
          <div>
            {" "}
            {/* Columna 1 */}
            {displayField("Nombre Completo", doctor.nombre_completo)}
            {displayField("CURP", doctor.curp)}
            {displayField("RFC", doctor.rfc)}
            {displayField("Teléfono", doctor.telefono)}
            {displayField("Correo Electrónico", doctor.correo_electronico)}
          </div>
          <div>
            {" "}
            {/* Columna 2 */}
            {displayField("Fecha de Nacimiento", doctor.fecha_nacimiento)}
            {displayField("Sexo", doctor.sexo)}
            {displayField("Entidad de Nacimiento", doctor.entidad_nacimiento)}
            {/* Agrega más campos personales aquí si los tienes */}
          </div>
        </div>

        <div style={profileStyles.sectionTitle}>
          Información Profesional y Adscripción
        </div>
        <div
          style={{
            ...profileStyles.gridContainer,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          {" "}
          {/* 2 columnas principales */}
          <div>
            {displayField("Especialidad", doctor.especialidad)}
            {displayField("Cédula Profesional", doctor.cedula_profesional)}
            {displayField("Estatus", doctor.estatus)}
            {displayField("Unidad Médica", doctor.unidad_medica)}
            {displayField("Consultorio", doctor.consultorio)}
          </div>
          <div>
            {displayField("Turno", doctor.turno)}
            {displayField("Identificador IMSS", doctor.identificador_imss)}
            {displayField("Fecha de Notificación", doctor.fecha_notificacion)}
            {displayField("Fecha de Estatus", doctor.fecha_estatus)}
            {displayField("Fecha de Vuelo", doctor.fecha_vuelo)}
          </div>
        </div>
      </div>

      <div style={profileStyles.filesColumn}>
        {/* Sección de Foto de Perfil */}
        <div style={profileStyles.profilePicSection}>
          <h2>Foto de Perfil</h2>
          {doctor.profilePicUrl ? (
            <img
              src={doctor.profilePicUrl}
              alt="Foto de perfil"
              style={profileStyles.profileImage}
            />
          ) : (
            <div style={profileStyles.profileImagePlaceholder}>
              <span>Sin Foto</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleProfilePicUpload}
            style={profileStyles.fileInput}
          />
        </div>

        {/* Sección de Expedientes Adjuntos */}
        <div style={profileStyles.attachmentsSection}>
          <h2>Expedientes Adjuntos</h2>
          {doctor.attachments && doctor.attachments.length > 0 ? (
            <ul style={profileStyles.attachmentList}>
              {doctor.attachments.map(
                (
                  file,
                  index // Asumiendo que attachments es un array
                ) => (
                  <li
                    key={file.id || index}
                    style={profileStyles.attachmentItem}
                  >
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={profileStyles.attachmentLink}
                    >
                      {file.name || `Archivo ${index + 1}`}
                    </a>
                    {/* Podrías añadir más info como tipo de archivo, fecha, etc. */}
                  </li>
                )
              )}
            </ul>
          ) : (
            <p style={profileStyles.noAttachments}>
              No hay expedientes adjuntos.
            </p>
          )}
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleAttachmentUpload}
            multiple
            style={profileStyles.fileInput}
          />
        </div>
      </div>
    </div>
  );
}

export default DoctorProfileView;
