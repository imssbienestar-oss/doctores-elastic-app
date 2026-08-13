import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../src/contexts/AuthContext";
import Swal from 'sweetalert2';

const COLORS = {
    primary: "#10312B",
    gold: "#B08D55",
    cardBg: "#FFFFFF",
    textMain: "#1A332C",
    textLight: "#555555",
    border: "#D1DED8",
    bg: "#F4F7F6"
};

export default function ValidacionFormatosEstatal() {
    const { token, currentUser } = useAuth();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    const entidadCoordinador = currentUser?.entidad || "BAJA CALIFORNIA";

    // ESTADOS PARA PESTAÑAS
    const [activeTab, setActiveTab] = useState("pendientes"); // "pendientes" | "validados"

    // ESTADOS PARA PENDIENTES
    const [pendientes, setPendientes] = useState([]);
    const [diasParticipacion, setDiasParticipacion] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    // ESTADOS PARA VALIDADOS (HISTORIAL)
    const [validados, setValidados] = useState([]);
    const [isLoadingValidados, setIsLoadingValidados] = useState(false);
    const [anio, setAnio] = useState("2026");
    const [mes, setMes] = useState("8");
    const [quincena, setQuincena] = useState("1");
    const [busqueda, setBusqueda] = useState("");
    const [alertaNacional, setAlertaNacional] = useState({ rechazado: false, observaciones: "" });


    useEffect(() => {
        const verificarEstadoNacional = async () => {
            try {
                // Usamos el endpoint que YA EXISTE en tu sistema
                const res = await fetch(`${API_BASE_URL}/api/peas/coordinador/historial-formatos/${entidadCoordinador}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();

                    // Buscamos si hay algún formato estatal que esté RECHAZADO
                    const formatoRechazado = data.find(f => String(f.estado).toUpperCase().includes("RECHAZADO"));

                    if (formatoRechazado) {
                        setAlertaNacional({
                            rechazado: true,
                            observaciones: formatoRechazado.observaciones || "Sin observaciones registradas."
                        });
                    } else {
                        setAlertaNacional({ rechazado: false, observaciones: "" });
                    }
                }
            } catch (error) {
                console.error("Error al verificar el estado nacional", error);
            }
        };

        if (token && entidadCoordinador) {
            verificarEstadoNacional();
        }
    }, [token, entidadCoordinador, API_BASE_URL]);

    // ==========================================
    // LÓGICA DE PENDIENTES
    // ==========================================
    const cargarPendientes = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/peas/coordinador/reportes-pendientes/${entidadCoordinador}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPendientes(data);
            }
        } catch (error) {
            console.error("Error al cargar reportes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "pendientes") {
            cargarPendientes();
        }
    }, [activeTab, entidadCoordinador]);

    const handleDiasChange = (idReporte, valor) => {
        setDiasParticipacion({ ...diasParticipacion, [idReporte]: valor });
    };

    const verDocumento = async (rutaPdf) => {
        if (!rutaPdf) {
            Swal.fire("Archivo no encontrado", "Este registro no tiene un documento PDF asociado.", "error");
            return;
        }
        try {
            Swal.fire({
                title: 'Abriendo documento...', text: 'Generando enlace seguro...', allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch(`${API_BASE_URL}/api/peas/reporte-quincenal/ver-documento?ruta=${encodeURIComponent(rutaPdf)}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                Swal.close();
                window.open(data.url, "_blank");
            } else {
                const err = await response.json();
                throw new Error(err.detail || "No se pudo obtener el documento");
            }
        } catch (error) {
            Swal.fire("Error", error.message, "error");
        }
    };

    const validarDocumento = async (reporte) => {
        const dias = reporte.dias;
        if (!dias || dias <= 0) {
            Swal.fire("Faltan Días", "El reporte no tiene días válidos registrados por la unidad.", "warning");
            return;
        }

        try {
            const payload = {
                ...reporte,
                dias_participacion: parseInt(dias),
                entidad: entidadCoordinador,
                validado_por: currentUser?.username || "Coordinador"
            };
            const response = await fetch(`${API_BASE_URL}/api/peas/coordinador/validar-reporte`, {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify(payload)
            });

            if (response.ok) {
                Swal.fire("Validado", "El reporte ha sido validado y agregado a la bitácora estatal.", "success");
                cargarPendientes();
            } else {
                const err = await response.json();
                throw new Error(err.detail);
            }
        } catch (error) {
            Swal.fire("Error", error.message || "Hubo un problema al validar.", "error");
        }
    };

    const handleRechazar = async (rep) => {
        const { value: observaciones, isConfirmed } = await Swal.fire({
            title: '<span style="color: #9F2241; font-weight: bold; border-bottom: 2px solid #B08D55; padding-bottom: 5px;">Solicitar Corrección</span>',
            html: `
                <div style="text-align: left; margin-top: 15px; font-family: Arial, sans-serif;">
                    <p style="font-size: 14px; color: #4b5563; margin-bottom: 15px;">
                        Detalle las inconsistencias encontradas en los formatos de <strong style="color: #111;">${rep.medico}</strong>.
                    </p>
                    <textarea id="swal-observaciones" placeholder="Ej. Falta firma en la segunda hoja..." style="width: 100%; height: 100px; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px; resize: none; font-size: 13px;"></textarea>
                </div>
            `,
            icon: 'warning', iconColor: '#9F2241', showCancelButton: true, confirmButtonColor: '#9F2241', confirmButtonText: 'Confirmar Rechazo',
            preConfirm: () => {
                const texto = document.getElementById('swal-observaciones').value;
                if (!texto || texto.trim() === '') { Swal.showValidationMessage('El campo es obligatorio.'); return false; }
                return texto;
            }
        });

        if (isConfirmed && observaciones) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/peas/reporte-quincenal/rechazar/${rep.id_reporte}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ observaciones })
                });

                if (response.ok) {
                    Swal.fire({ title: '¡Notificación Enviada!', text: 'El reporte ha sido devuelto a la unidad.', icon: 'success', confirmButtonColor: '#10312B' });
                    setPendientes(prev => prev.filter(item => item.id_reporte !== rep.id_reporte));
                } else {
                    const errorData = await response.json();
                    Swal.fire('Error', errorData.detail || 'No se pudo rechazar', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
            }
        }
    };

    // ==========================================
    // LÓGICA DE VALIDADOS (HISTORIAL)
    // ==========================================
    const buscarValidados = async () => {
        setIsLoadingValidados(true);
        const periodoStr = `${anio}-${mes.padStart(2, '0')}-Q${quincena}`;

        try {
            const response = await fetch(`${API_BASE_URL}/api/peas/coordinador/reportes-validados/${entidadCoordinador}/${periodoStr}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setValidados(data);
            }
        } catch (error) {
            Swal.fire("Error", "No se pudieron cargar los registros validados", "error");
        } finally {
            setIsLoadingValidados(false);
        }
    };

    const handleRevocar = async (rep) => {
        const { value: observaciones, isConfirmed } = await Swal.fire({
            title: '<span style="color: #9F2241; font-weight: bold; border-bottom: 2px solid #B08D55; padding-bottom: 5px;">Revocar Validación</span>',
            html: `
                <div style="text-align: left; margin-top: 15px; font-family: Arial, sans-serif;">
                    <p style="font-size: 14px; color: #4b5563; margin-bottom: 15px;">
                        Al revocar, el médico <strong style="color: #111;">${rep.medico}</strong> será eliminado de la Bitácora Estatal y devuelto a la Unidad Médica para su corrección.
                    </p>
                    <label style="font-size: 13px; font-weight: bold; color: #10312B; margin-bottom: 5px; display: block;">Motivo de la revocación:</label>
                    <textarea id="swal-observaciones-revocar" placeholder="Ej. Días reportados incorrectos según revisión nacional..." style="width: 100%; height: 80px; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px; resize: none; font-size: 13px;"></textarea>
                </div>
            `,
            icon: 'warning', iconColor: '#9F2241', showCancelButton: true, confirmButtonColor: '#9F2241', confirmButtonText: 'Revocar y Devolver',
            preConfirm: () => {
                const texto = document.getElementById('swal-observaciones-revocar').value;
                if (!texto || texto.trim() === '') { Swal.showValidationMessage('El campo es obligatorio.'); return false; }
                return texto;
            }
        });

        if (isConfirmed && observaciones) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/peas/coordinador/revocar-reporte/${rep.id_reporte}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ observaciones })
                });

                if (response.ok) {
                    Swal.fire({ title: '¡Revocado!', text: 'El reporte fue devuelto a la unidad.', icon: 'success', confirmButtonColor: '#10312B' });
                    setValidados(prev => prev.filter(item => item.id_reporte !== rep.id_reporte));
                } else {
                    const errorData = await response.json();
                    Swal.fire('Error', errorData.detail || 'No se pudo revocar', 'error');
                }
            } catch (error) {
                Swal.fire('Error', 'Error de conexión con el servidor.', 'error');
            }
        }
    };

    // Buscador en tiempo real
    const validadosFiltrados = useMemo(() => {
        if (!busqueda) return validados;
        return validados.filter(item =>
            item.medico.toLowerCase().includes(busqueda.toLowerCase()) ||
            item.id_imss.toLowerCase().includes(busqueda.toLowerCase())
        );
    }, [validados, busqueda]);

    return (
        <div style={{ backgroundColor: "#f4f6f8", minHeight: "100vh", padding: "30px 20px", fontFamily: "Arial, sans-serif" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

                <div style={{ marginBottom: "25px", borderBottom: `2px solid ${COLORS.gold}`, paddingBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                        <h2 style={{ color: COLORS.primary, margin: 0, fontSize: "24px" }}>Validación de Bitácoras de Asistencia</h2>
                        <p style={{ color: "#6b7280", margin: "5px 0 0 0", fontSize: "14px" }}>Entidad Federativa: <strong>{entidadCoordinador}</strong></p>
                    </div>
                </div>

                {/* TABS (PESTAÑAS) */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                    <button
                        onClick={() => setActiveTab("pendientes")}
                        style={{
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: "6px 6px 0 0",
                            fontWeight: "bold",
                            cursor: "pointer",
                            backgroundColor: activeTab === "pendientes" ? COLORS.primary : "#e5e7eb",
                            color: activeTab === "pendientes" ? "white" : "#4b5563",
                            transition: "0.2s"
                        }}>
                        Bandeja de Pendientes
                    </button>
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setActiveTab("validados")}
                            style={{
                                padding: "10px 20px",
                                border: "none",
                                borderRadius: "6px 6px 0 0",
                                fontWeight: "bold",
                                cursor: "pointer",
                                backgroundColor: activeTab === "validados" ? COLORS.primary : "#e5e7eb",
                                color: activeTab === "validados" ? "white" : "#4b5563",
                                transition: "0.2s"
                            }}>
                            Historial de Validados
                        </button>

                        {alertaNacional.rechazado && (
                            <span style={{
                                position: "absolute",
                                top: "-8px",
                                right: "-8px",
                                backgroundColor: "#9F2241", // Guinda institucional
                                color: "white",
                                borderRadius: "50%",
                                width: "22px",
                                height: "22px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                fontSize: "12px",
                                fontWeight: "bold",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                animation: "pulse 2s infinite" // Opcional: una pequeña animación
                            }}>
                                !
                            </span>
                        )}
                    </div>
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div style={{ background: "#ffffff", borderRadius: "0 8px 8px 8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: `1px solid #d1d5db`, overflow: "hidden" }}>

                    {/* VISTA 1: PENDIENTES */}
                    {activeTab === "pendientes" && (
                        isLoading ? (
                            <p style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>Cargando documentos pendientes...</p>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "14px" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#10312B", color: "white" }}>
                                            <th style={{ padding: "15px 10px" }}>Quincena</th>
                                            <th style={{ padding: "15px 10px" }}>CLUES</th>
                                            <th style={{ padding: "15px 10px" }}>Médico / ID</th>
                                            <th style={{ padding: "15px 10px" }}>Días Part.</th>
                                            <th style={{ padding: "15px 10px" }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendientes.length > 0 ? pendientes.map((rep, index) => (
                                            <tr key={rep.id_reporte} style={{ borderBottom: "1px solid #eee", backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb" }}>
                                                <td style={{ padding: "12px 10px", fontWeight: "bold" }}>{rep.quincena}</td>
                                                <td style={{ padding: "12px 10px" }}>
                                                    <div style={{ fontWeight: "bold" }}>{rep.clues}</div>
                                                    <div style={{ fontSize: "11px", color: "#666" }}>{rep.unidad}</div>
                                                </td>
                                                <td style={{ padding: "12px 10px" }}>
                                                    <div style={{ fontWeight: "bold" }}>{rep.medico}</div>
                                                    <div style={{ fontSize: "12px", color: "#666" }}>{rep.id_imss}</div>
                                                </td>
                                                <td style={{ padding: "12px 10px", fontWeight: "bold", color: COLORS.primary }}>
                                                    {rep.dias} días
                                                </td>
                                                <td style={{ padding: "12px 10px", display: "flex", gap: "8px", justifyContent: "center" }}>
                                                    <button onClick={() => verDocumento(rep.url_pdf)} style={{ backgroundColor: "#6c757d", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>Ver PDF</button>
                                                    <button onClick={() => validarDocumento(rep)} style={{ backgroundColor: "#B08D55", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>Validar</button>
                                                    <button onClick={() => handleRechazar(rep)} style={{ backgroundColor: "#9F2241", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>❌ Rechazar</button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5" style={{ padding: "40px", color: "#6b7280" }}>No hay documentos pendientes por validar.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* VISTA 2: HISTORIAL DE VALIDADOS */}
                    {activeTab === "validados" && (
                        <div style={{ padding: "20px" }}>
                            {/* Filtros */}
                            {alertaNacional.rechazado && (
                                <div style={{
                                    backgroundColor: "#fde8e8",
                                    border: "1px solid #9F2241",
                                    borderLeft: "5px solid #9F2241",
                                    padding: "15px 20px",
                                    borderRadius: "4px",
                                    marginBottom: "20px"
                                }}>
                                    <h4 style={{ color: "#9F2241", margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: "bold" }}>
                                        ⚠️ ATENCIÓN: FORMATO ESTATAL RECHAZADO POR NIVEL NACIONAL
                                    </h4>
                                    <p style={{ margin: "10px 0 5px 0", color: "#374151", fontSize: "14px" }}>
                                        <strong>Motivo del rechazo:</strong> {alertaNacional.observaciones}
                                    </p>
                                    <p style={{ margin: "5px 0 0 0", color: "#6b7280", fontSize: "13px", fontStyle: "italic" }}>
                                        <strong>Instrucciones:</strong> Por favor, busque la quincena en curso y utilice la opción "Revocar y Rechazar" en el registro del médico con inconsistencias para devolverlo a la unidad. Una vez que la unidad corrija, valide de nuevo los registros, genere el nuevo PDF estatal en el apartado de Reportes (Bitácora Estatal), recabe las firmas y súbalo firmado para completar el proceso.
                                    </p>
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "15px", marginBottom: "20px", background: "#f9fafb", padding: "15px", borderRadius: "6px", alignItems: "flex-end", flexWrap: "wrap", border: "1px solid #e5e7eb" }}>
                                <div>
                                    <label style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", display: "block", marginBottom: "6px" }}>Año:</label>
                                    <select value={anio} onChange={(e) => setAnio(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
                                        <option value="2025">2025</option><option value="2026">2026</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", display: "block", marginBottom: "6px" }}>Mes:</label>
                                    <select value={mes} onChange={(e) => setMes(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
                                        <option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option>
                                        <option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option>
                                        <option value="7">Julio</option><option value="8">Agosto</option><option value="9">Septiembre</option>
                                        <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: "12px", fontWeight: "bold", color: "#374151", display: "block", marginBottom: "6px" }}>Quincena:</label>
                                    <select value={quincena} onChange={(e) => setQuincena(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
                                        <option value="1">1ra Quincena (01-15)</option><option value="2">2da Quincena (16-Fin)</option>
                                    </select>
                                </div>
                                <button onClick={buscarValidados} disabled={isLoadingValidados} style={{ backgroundColor: COLORS.primary, color: "white", padding: "9px 16px", border: "none", borderRadius: "4px", cursor: isLoadingValidados ? "wait" : "pointer", fontWeight: "bold" }}>
                                    {isLoadingValidados ? "Buscando..." : " Buscar"}
                                </button>
                            </div>

                            {/* Buscador y Tabla */}
                            {validados.length > 0 ? (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre o ID del médico..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "4px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
                                    />
                                    <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "14px" }}>
                                            <thead>
                                                <tr style={{ backgroundColor: "#f3f4f6", color: "#374151" }}>
                                                    <th style={{ padding: "12px", borderBottom: "2px solid #d1d5db" }}>CLUES</th>
                                                    <th style={{ padding: "12px", borderBottom: "2px solid #d1d5db" }}>Médico / ID</th>
                                                    <th style={{ padding: "12px", borderBottom: "2px solid #d1d5db" }}>Días Validados</th>
                                                    <th style={{ padding: "12px", borderBottom: "2px solid #d1d5db" }}>Acción de Auditoría</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {validadosFiltrados.map((rep, index) => (
                                                    <tr key={rep.id_bitacora} style={{ borderBottom: "1px solid #eee", backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb" }}>
                                                        <td style={{ padding: "12px" }}>
                                                            <div style={{ fontWeight: "bold" }}>{rep.clues}</div>
                                                            <div style={{ fontSize: "11px", color: "#666" }}>{rep.unidad}</div>
                                                        </td>
                                                        <td style={{ padding: "12px" }}>
                                                            <div style={{ fontWeight: "bold" }}>{rep.medico}</div>
                                                            <div style={{ fontSize: "12px", color: "#666" }}>{rep.id_imss}</div>
                                                        </td>
                                                        <td style={{ padding: "12px", fontWeight: "bold", color: COLORS.primary }}>
                                                            {rep.dias} días
                                                        </td>
                                                        <td style={{ padding: "12px", display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }}>
                                                            <button
                                                                onClick={() => verDocumento(rep.url_pdf)}
                                                                style={{ backgroundColor: "#6c757d", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>
                                                                Ver PDF
                                                            </button>
                                                            <button
                                                                onClick={() => handleRevocar(rep)}
                                                                style={{ backgroundColor: "#9F2241", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>
                                                                ❌ Revocar y Rechazar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {validadosFiltrados.length === 0 && (
                                                    <tr><td colSpan="4" style={{ padding: "30px", color: "#6b7280" }}>No se encontraron coincidencias para la búsqueda.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                <p style={{ textAlign: "center", padding: "40px", color: "#6b7280", fontStyle: "italic", border: "1px dashed #d1d5db", borderRadius: "6px" }}>
                                    Utiliza los filtros de arriba para buscar los registros validados en un periodo específico.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
