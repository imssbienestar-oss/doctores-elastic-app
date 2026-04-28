import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import { ResponsiveLine } from "@nivo/line";
import DoctoresModal from "./DoctoresModal";
import { useNavigate } from "react-router-dom";
import ColumnSelectorModal from "./ColumnSelectorModal";

// ==========================================
// 1. CONFIGURACIONES ESTÁTICAS
// ==========================================

const COLORS = {
  primary: "#006657",
  secondary: "#B08D55",
  bg: "#F4F7F6",
  cardBg: "#FFFFFF",
  textMain: "#333333",
  textLight: "#666666",
};

const INSTITUTIONAL_COLORS = ["#10312B", "#691C32", "#BC955C", "#DDC9A3"];

const BAR_KEYS = ["value"];
const BAR_MARGIN = { top: 10, right: 50, bottom: 30, left: 140 };
const BAR_VALUE_SCALE = { type: "linear" };
const BAR_INDEX_SCALE = { type: "band", round: true };
const BAR_BORDER_COLOR = { from: "color", modifiers: [["darker", 1.6]] };
const BAR_AXIS_BOTTOM = { tickSize: 0, tickPadding: 10, tickRotation: 0, legend: "", legendOffset: 36 };
const BAR_AXIS_LEFT = { tickSize: 0, tickPadding: 10, tickRotation: 0 };
const BAR_LABEL_TEXT_COLOR = { from: "color", modifiers: [["brighter", 3]] };

const PIE_MARGIN = { top: 20, right: 80, bottom: 40, left: 80 };
const PIE_BORDER_COLOR = { from: "color", modifiers: [["darker", 0.2]] };
const PIE_ARC_LINK_COLOR = { from: 'color' };

const CHART_THEME = {
  background: "#ffffff",
  axis: {
    ticks: { text: { fontSize: 11, fill: "#666", fontFamily: "Segoe UI, sans-serif" } },
  },
  labels: { text: { fontSize: 11, fontWeight: 600, fontFamily: "Segoe UI, sans-serif" } },
  tooltip: {
    container: {
      fontSize: "12px", color: "#333", boxShadow: "0 4px 8px rgba(0,0,0,0.2)", borderRadius: "4px", zIndex: 9999
    }
  }
};

const getBarColorWrapper = (barItem) => {
  const { totalReal, maximo, minimo } = barItem.data;
  if (totalReal > maximo) return "#dc3545";
  if (totalReal < minimo) return "#28a745";
  return "#BC955C";
};

const BarTooltip = ({ value, data }) => (
  <div style={{ padding: '10px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, minWidth: '180px' }}>
    <strong style={{ color: COLORS.primary, fontSize: '1.1em' }}>{data.label}</strong>
    <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#333' }}>
      Viendo: <strong>{value}</strong>
    </div>
    <div style={{ fontSize: '0.85em', color: '#666', borderTop: '1px solid #eee', marginTop: '5px', paddingTop: '5px' }}>
      Médicos: {data.medCount}<br/>
      Admin: {data.admCount}<br/>
      <strong>Total Real: {data.totalReal}</strong>
    </div>
    <div style={{ fontSize: '0.85em', color: data.totalReal > data.maximo ? '#dc3545' : '#666', fontWeight: '600' }}>
      Cupo Max: {data.maximo}
    </div>
  </div>
);

const PieTooltip = ({ datum }) => (
  <div style={{ padding: '8px 12px', background: '#fff', border: '1px solid #eee', borderRadius: 4, display: 'flex', alignItems: 'center', gap: '6px' }}>
    <div style={{ width: 10, height: 10, backgroundColor: datum.color, borderRadius: '50%' }}></div>
    <strong>{datum.label}:</strong> {datum.value}
  </div>
);

const CenteredMetric = ({ dataWithArc, centerX, centerY }) => {
    let total = 0;
    dataWithArc.forEach(datum => { total += datum.value; });
    return (
        <text
            x={centerX} y={centerY}
            textAnchor="middle" dominantBaseline="central"
            style={{ fontSize: '24px', fontWeight: '800', fill: '#333', pointerEvents: 'none' }}
        >
            {total.toLocaleString()}
        </text>
    );
};

const CupoMaximoLayer = ({ bars, fullData }) => (
  <g>
    {bars.map((bar) => {
      const originalData = fullData[bar.index];
      if (!originalData?.maximo) return null;
      return (
        <text
          key={bar.key}
          x={bar.x + bar.width + 6} y={bar.y + bar.height / 2}
          textAnchor="start" dominantBaseline="central"
          style={{ fill: "#999", fontSize: 10, fontWeight: "600", pointerEvents: "none" }}
        >
          / {originalData.maximo}
        </text>
      );
    })}
  </g>
);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const ITEMS_PER_PAGE_ESTADISTICA = 10;

const styles = {
  pageContainer: { padding: "20px", backgroundColor: COLORS.bg, minHeight: "100vh", fontFamily: "Segoe UI, sans-serif" },

  headerRow: {
    display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: "30px", paddingBottom: "15px", borderBottom: "1px solid #e0e0e0", gap: "20px"
  },
  headerCenter: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  headerRight: { display: "flex", justifyContent: "flex-end" },

  title: { color: COLORS.primary, fontSize: "30px", fontWeight: "700", textTransform: "uppercase", margin: "20px", lineHeight: 1.2, textAlign: "center" },
  subtitle: { color: "#666", fontSize: "14px", margin: 0, textAlign: "center", marginBottom: "10px" },

  toggleContainer: { display: "flex", backgroundColor: "#e0e0e0", borderRadius: "30px", padding: "3px", cursor: "pointer", marginTop: "20px", width: "fit-content" },
  getToggleButtonStyle: (isActive) => ({
    padding: "6px 20px", borderRadius: "25px", border: "none", fontSize: "12px", fontWeight: "600", cursor: "pointer",
    backgroundColor: isActive ? COLORS.primary : "transparent", color: isActive ? "#fff" : COLORS.textLight, outline: "none", transition: "0.3s"
  }),

  universeCard: {
    backgroundColor: "#fff", border: `1px solid ${COLORS.secondary}`, borderLeft: `5px solid ${COLORS.secondary}`,
    borderRadius: "6px", padding: "8px 20px", display: "flex", flexDirection: "column", alignItems: "flex-end",
    minWidth: "140px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
  },
  universeLabel: { fontSize: "11px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" },
  universeValue: { fontSize: "24px", fontWeight: "800", color: COLORS.secondary, lineHeight: 1 },

  kpiWrapper: { textAlign: "center", marginBottom: "30px" },
  kpiCard: {
    backgroundColor: COLORS.cardBg, borderRadius: "10px", padding: "15px 40px", textAlign: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)", borderBottom: `4px solid ${COLORS.primary}`, display: "inline-block"
  },
  kpiNumber: { fontSize: "42px", fontWeight: "800", color: COLORS.primary, lineHeight: 1, display: "block" },
  kpiLabel: { fontSize: "12px", color: COLORS.textLight, textTransform: "uppercase", fontWeight: "600", marginTop: "5px", display: "block" },

  // ── NUEVO: fila de mini-KPIs rápidos ──
  quickStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "30px",
    maxWidth: "1600px",
    margin: "0 auto 30px auto",
  },
  quickStatCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: "10px",
    padding: "14px 20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    borderTop: `4px solid ${COLORS.secondary}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  quickStatValue: { fontSize: "28px", fontWeight: "800", color: COLORS.primary, lineHeight: 1 },
  quickStatLabel: { fontSize: "11px", color: COLORS.textLight, textTransform: "uppercase", fontWeight: "600", textAlign: "center" },

  mainGrid: { display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "25px", marginBottom: "40px", alignItems: "start", maxWidth: "1600px", margin: "0 auto 40px auto" },
  leftColumn: { display: "flex", flexDirection: "column", gap: "25px" },
  rightColumn: { display: "flex", flexDirection: "column" },

  chartCard: {
    backgroundColor: COLORS.cardBg, borderRadius: "10px", padding: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee",
    display: "flex", flexDirection: "column"
  },
  chartTitle: { fontSize: "15px", fontWeight: "600", color: COLORS.primary, marginBottom: "15px", textAlign: "center", borderBottom: "1px solid #f0f0f0", paddingBottom: "8px" },

  pieContainer: { height: 300, width: '100%' },
  barContainer: { height: 720, width: '100%' },
  // ── NUEVO: alto para la línea de bajas ──
  lineContainer: { height: 280, width: '100%' },

  sectionTitle: {
    textAlign: "left",
    marginLeft: "20px",
    marginTop: "40px",
    marginBottom: "15px",
    fontSize: "18px",
    color: "#333",
    fontWeight: "700",
    borderLeft: `5px solid ${COLORS.secondary}`,
    paddingLeft: "15px"
  },

  statisticFiltersContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginBottom: "25px",
    padding: "25px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    border: "1px solid #eee",
    alignItems: "end"
  },

  filterGroup: { display: "flex", flexDirection: "column" },
  filterLabel: { fontSize: "0.85em", color: "#555", marginBottom: "6px", fontWeight: "600" },
  filterSelect: {
    padding: "10px 12px", fontSize: "0.9em", border: "1px solid #e0e0e0",
    borderRadius: "6px", backgroundColor: "#fcfcfc", outline: "none",
    transition: "border-color 0.2s", width: "100%", boxSizing: "border-box"
  },

  tableContainer: {
    width: "100%", margin: "0 auto", background: "#fff",
    borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden"
  },
  dataTable: { width: "100%", borderCollapse: "collapse", fontSize: "0.9em", fontFamily: "Segoe UI, sans-serif" },
  dataTableTh: {
    backgroundColor: COLORS.primary, color: "white", padding: "15px", textAlign: "left",
    fontWeight: "600", textTransform: "uppercase", fontSize: "0.85em", letterSpacing: "0.5px",
    borderBottom: `3px solid ${COLORS.secondary}`
  },
  dataTableTd: { padding: "12px 15px", borderBottom: "1px solid #f0f0f0", color: "#333", textAlign: "left" },
  dataTableTrEven: { backgroundColor: "#fbfbfb" },

  button: {
    padding: "10px 20px", fontSize: "0.9em", fontWeight: "600", cursor: "pointer",
    backgroundColor: COLORS.primary, color: "white", border: "none", borderRadius: "6px",
    transition: "all 0.2s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  },
  buttonDisabled: { backgroundColor: "#ccc", cursor: "not-allowed", boxShadow: "none" },
  buttonSmall: { fontSize: "0.85em", padding: "8px 16px" },

  paginationControls: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: "0", padding: "15px 20px", backgroundColor: "#f9f9f9",
    borderTop: "1px solid #eee", borderBottomLeftRadius: "8px", borderBottomRightRadius: "8px"
  }
};

function GraficasPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [tipoPersonal, setTipoPersonal] = useState("medicos");
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [granTotalGlobal, setGranTotalGlobal] = useState(0);

  const [dataPorEstado, setDataPorEstado] = useState([]);
  const [dataPorEstatus, setDataPorEstatus] = useState([]);
  const [dataPorNivel, setDataPorNivel] = useState([]);

  // ── NUEVO: estados para datos rápidos y bajas históricas ──
  const [quickStats, setQuickStats] = useState({
    cedulasLicenciatura: 0,
    cedulasEspecialidad: 0,
    totalMujeres: 0,
    totalHombres: 0,
  });
  const [dataHistoricoBajas, setDataHistoricoBajas] = useState([]);

  const [dataEstadistica, setDataEstadistica] = useState([]);
  const [filtroEntidad, setFiltroEntidad] = useState("");
  const [filtroUnidad, setFiltroUnidad] = useState("");
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");

  const [opcionesEstatus, setOpcionesEstatus] = useState([]);
  const [opcionesEntidad, setOpcionesEntidad] = useState([]);
  const [opcionesUnidad, setOpcionesUnidad] = useState([]);
  const [opcionesEspecialidad, setOpcionesEspecialidad] = useState([]);
  const [opcionesNivel, setOpcionesNivel] = useState([]);

  const [currentPageEstadistica, setCurrentPageEstadistica] = useState(0);
  const [totalGroupsEstadistica, setTotalGroupsEstadistica] = useState(0);
  const [totalDoctorsInGroups, setTotalDoctorsInGroups] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [doctoresEnModal, setDoctoresEnModal] = useState([]);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFiltros, setIsLoadingFiltros] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timerId = setTimeout(() => { setDebouncedBusqueda(filtroBusqueda); }, 500);
    return () => clearTimeout(timerId);
  }, [filtroBusqueda]);

  // --- CARGA DE DATOS PRINCIPALES ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/dashboard/resumen_unificado?tipo=${tipoPersonal}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Error al obtener datos del servidor");
        const data = await response.json();

        setTotalGeneral(data.total_general);
        setGranTotalGlobal(data.universo_total);

        setDataPorEstatus(data.data_estatus.map((item, idx) => ({
          ...item,
          color: INSTITUTIONAL_COLORS[idx % INSTITUTIONAL_COLORS.length]
        })));

        setDataPorNivel(data.data_nivel.map((item, idx) => ({
          ...item,
          id: item.label,
          color: INSTITUTIONAL_COLORS[idx % INSTITUTIONAL_COLORS.length]
        })));

        const estadosMapeados = data.data_estados.map(item => ({
          ...item,
          id: item.label
        })).sort((a, b) => a.value - b.value);
        setDataPorEstado(estadosMapeados);

        // ── NUEVO: datos rápidos (el backend debe incluirlos en la misma respuesta
        //    o puedes ajustar el campo según lo que devuelva tu API) ──
        if (data.cedulas_licenciatura !== undefined) {
          setQuickStats({
            cedulasLicenciatura: data.cedulas_licenciatura ?? 0,
            cedulasEspecialidad: data.cedulas_especialidad ?? 0,
            totalMujeres: data.total_mujeres ?? 0,
            totalHombres: data.total_hombres ?? 0,
          });
        }

      } catch (err) {
        console.error(err);
        setError("No se pudo conectar con el servidor.");
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchDashboardData();
  }, [token, tipoPersonal]);

  // ── NUEVO: Carga histórico de bajas mensuales ──
  useEffect(() => {
    const fetchHistoricoBajas = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/dashboard/historico_bajas?tipo=${tipoPersonal}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) return;
        const data = await response.json();
        setDataHistoricoBajas([
          {
            id: "Bajas",
            color: "#691C32",
            data: data.map(item => ({ x: item.mes, y: item.total })),
          },
        ]);
      } catch (err) {
        console.error("Error historico bajas:", err);
      }
    };
    if (token) fetchHistoricoBajas();
  }, [token, tipoPersonal]);

  // Carga Filtros
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setIsLoadingFiltros(true);
      const params = new URLSearchParams();
      if (filtroEstatus) params.append("estatus", filtroEstatus);
      if (filtroEntidad) params.append("entidad", filtroEntidad);
      if (filtroUnidad) params.append("nombre_unidad", filtroUnidad);
      if (filtroEspecialidad) params.append("especialidad", filtroEspecialidad);
      if (filtroNivel) params.append("nivel_atencion", filtroNivel);
      if (debouncedBusqueda) params.append("search", debouncedBusqueda);
      try {
        const response = await fetch(`${API_BASE_URL}/api/opciones/filtros-dinamicos?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error("Error filtros");
        const data = await response.json();
        setOpcionesEstatus(data.estatus);
        setOpcionesEntidad(data.entidades);
        setOpcionesUnidad(data.unidades);
        setOpcionesEspecialidad(data.especialidades);
        setOpcionesNivel(data.niveles_atencion);
      } catch (error) { console.error(error); }
      finally { setIsLoadingFiltros(false); }
    };
    if (token) fetchFilterOptions();
  }, [filtroEstatus, filtroEntidad, filtroUnidad, filtroEspecialidad, filtroNivel, debouncedBusqueda, token]);

  // Carga Tabla
  useEffect(() => {
    const fetchEstadisticaData = async () => {
      const skip = currentPageEstadistica * ITEMS_PER_PAGE_ESTADISTICA;
      const params = new URLSearchParams({ skip, limit: ITEMS_PER_PAGE_ESTADISTICA, tipo: tipoPersonal });
      if (filtroEntidad) params.append("entidad", filtroEntidad);
      if (filtroUnidad) params.append("nombre_unidad", filtroUnidad);
      if (filtroEspecialidad) params.append("especialidad", filtroEspecialidad);
      if (filtroNivel) params.append("nivel_atencion", filtroNivel);
      if (debouncedBusqueda) params.append("search", debouncedBusqueda);
      if (filtroEstatus) params.append("estatus", filtroEstatus);
      try {
        const response = await fetch(`${API_BASE_URL}/api/graficas/estadistica_doctores_agrupados?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error("Error estadistica");
        const data = await response.json();
        setDataEstadistica(data.items || []);
        setTotalGroupsEstadistica(data.total_groups || 0);
        setTotalDoctorsInGroups(data.total_doctors_in_groups || 0);
      } catch (err) { console.error(err); }
    };
    if (token) fetchEstadisticaData();
  }, [currentPageEstadistica, filtroEntidad, filtroUnidad, filtroEspecialidad, filtroNivel, debouncedBusqueda, filtroEstatus, token, tipoPersonal]);

  const handleEntidadChange = (e) => { setFiltroEntidad(e.target.value); setCurrentPageEstadistica(0); };
  const handleUnidadChange = (e) => { setFiltroUnidad(e.target.value); setCurrentPageEstadistica(0); };
  const handleEspecialidadChange = (e) => { setFiltroEspecialidad(e.target.value); setCurrentPageEstadistica(0); };
  const handleNivelChange = (e) => { setFiltroNivel(e.target.value); setCurrentPageEstadistica(0); };
  const handleEstatusChange = (e) => { setFiltroEstatus(e.target.value); setCurrentPageEstadistica(0); };

  const handleClearStatisticFilters = () => {
    setFiltroEntidad(""); setFiltroUnidad(""); setFiltroEspecialidad("");
    setFiltroNivel(""); setFiltroEstatus(""); setFiltroBusqueda("");
    setDebouncedBusqueda(""); setCurrentPageEstadistica(0);
  };

  const handleVisualizarClick = async () => {
    setIsLoadingModal(true); setIsModalOpen(true);
    const params = new URLSearchParams({ tipo: tipoPersonal });
    if (filtroEntidad) params.append("entidad", filtroEntidad);
    if (filtroUnidad) params.append("nombre_unidad", filtroUnidad);
    if (filtroEspecialidad) params.append("especialidad", filtroEspecialidad);
    if (filtroNivel) params.append("nivel_atencion", filtroNivel);
    if (debouncedBusqueda) params.append("search", debouncedBusqueda);
    if (filtroEstatus) params.append("estatus", filtroEstatus);
    try {
      const response = await fetch(`${API_BASE_URL}/api/doctores/detalles_filtrados?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Error detalles");
      const data = await response.json();
      setDoctoresEnModal(data);
    } catch (error) { console.error(error); } finally { setIsLoadingModal(false); }
  };

  const handleViewProfile = (doctor) => { setIsModalOpen(false); navigate(`/?profile=${doctor.id_imss}`); };
  const handleOpenReportModal = () => { setIsReportModalOpen(true); };
  const handleConfirmDownload = async (selectedColumns) => {
    setIsReportModalOpen(false);
    const body = { tipo: tipoPersonal, entidad: filtroEntidad || null, especialidad: filtroEspecialidad || null, nivel_atencion: filtroNivel || null, nombre_unidad: filtroUnidad || null, estatus: filtroEstatus || null, search: debouncedBusqueda || null, columnas: selectedColumns };
    try {
      const response = await fetch(`${API_BASE_URL}/api/reporte/dinamico/xlsx`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error("Error descarga");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "reporte_filtrado.xlsx";
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (error) { alert(`Error: ${error.message}`); }
  };

  const totalPagesEstadistica = Math.ceil(totalGroupsEstadistica / ITEMS_PER_PAGE_ESTADISTICA);
  const handlePreviousPageEstadistica = () => setCurrentPageEstadistica((p) => Math.max(0, p - 1));
  const handleNextPageEstadistica = () => setCurrentPageEstadistica((p) => Math.min(totalPagesEstadistica - 1, p + 1));

  const barLayers = useMemo(() => [
    "grid", "axes", "bars", "markers", "legends",
    (props) => <CupoMaximoLayer {...props} fullData={dataPorEstado} />
  ], [dataPorEstado]);

  return (
    <div style={styles.pageContainer}>

      {/* HEADER */}
      <div style={styles.headerRow}>
        <div></div>
        <div style={styles.headerCenter}>
          <h1 style={styles.title}>Tablero de Control</h1>
          <div style={styles.toggleContainer}>
            <button style={styles.getToggleButtonStyle(tipoPersonal === "medicos")} onClick={() => setTipoPersonal("medicos")}>PERSONAL MÉDICO</button>
            <button style={styles.getToggleButtonStyle(tipoPersonal === "administrativos")} onClick={() => setTipoPersonal("administrativos")}>ADMINISTRATIVOS</button>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.universeCard}>
            <span style={styles.universeLabel}>Universo Total</span>
            <span style={styles.universeValue}>{granTotalGlobal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {error && <div style={{textAlign: 'center', color: 'red', marginBottom: 20}}>{error}</div>}

      {/* KPI PRINCIPAL */}
      <div style={styles.kpiWrapper}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiNumber}>{isLoading ? "..." : totalGeneral.toLocaleString()}</span>
          <span style={styles.kpiLabel}>Total de {tipoPersonal === "medicos" ? "Médicos" : "Administrativos"}</span>
        </div>
      </div>

      {/* ── NUEVO: MINI-KPIs DE CONSULTA RÁPIDA (excluyen bajas) ── */}
      {!isLoading && (
        <div style={styles.quickStatsRow}>
          <div style={styles.quickStatCard}>
            <span style={styles.quickStatValue}>{quickStats.cedulasLicenciatura.toLocaleString()}</span>
            <span style={styles.quickStatLabel}>Cédulas Licenciatura</span>
          </div>
          <div style={styles.quickStatCard}>
            <span style={styles.quickStatValue}>{quickStats.cedulasEspecialidad.toLocaleString()}</span>
            <span style={styles.quickStatLabel}>Cédulas Especialidad</span>
          </div>
          <div style={{ ...styles.quickStatCard, borderTopColor: "#10312B" }}>
            <span style={styles.quickStatValue}>{quickStats.totalMujeres.toLocaleString()}</span>
            <span style={styles.quickStatLabel}>Mujeres (activas)</span>
          </div>
          <div style={{ ...styles.quickStatCard, borderTopColor: "#10312B" }}>
            <span style={styles.quickStatValue}>{quickStats.totalHombres.toLocaleString()}</span>
            <span style={styles.quickStatLabel}>Hombres (activos)</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>Cargando datos...</div>
      ) : (
        <>
          <div style={styles.mainGrid}>
            <div style={styles.leftColumn}>

              {/* ESTATUS */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Distribución por Estatus</h3>
                <div style={styles.pieContainer}>
                  <ResponsivePie
                    data={dataPorEstatus}
                    margin={PIE_MARGIN}
                    innerRadius={0.6}
                    padAngle={0.7}
                    cornerRadius={3}
                    colors={({ data }) => data.color}
                    activeOuterRadiusOffset={8}
                    borderWidth={1}
                    borderColor={PIE_BORDER_COLOR}
                    enableArcLinkLabels={true}
                    arcLinkLabelsSkipAngle={10}
                    arcLinkLabelsTextColor="#333"
                    arcLinkLabelsThickness={2}
                    arcLinkLabelsColor={PIE_ARC_LINK_COLOR}
                    arcLabelsSkipAngle={10}
                    arcLabelsTextColor="#fff"
                    theme={CHART_THEME}
                    tooltip={PieTooltip}
                    animate={true}
                    motionConfig="stiff"
                    layers={['arcs', 'arcLabels', 'arcLinkLabels', 'legends', CenteredMetric]}
                  />
                </div>
              </div>

              {/* NIVEL ATENCIÓN */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Nivel de Atención (ACTIVOS)</h3>
                <div style={styles.pieContainer}>
                  {dataPorNivel.length > 0 ? (
                    <ResponsivePie
                      data={dataPorNivel}
                      margin={PIE_MARGIN}
                      innerRadius={0.6}
                      padAngle={0.7}
                      cornerRadius={3}
                      colors={({ data }) => data.color}
                      activeOuterRadiusOffset={8}
                      borderWidth={1}
                      borderColor={PIE_BORDER_COLOR}
                      enableArcLinkLabels={true}
                      arcLinkLabelsSkipAngle={10}
                      arcLinkLabelsTextColor="#333"
                      arcLabelsSkipAngle={10}
                      arcLabelsTextColor="#fff"
                      theme={CHART_THEME}
                      tooltip={PieTooltip}
                      animate={true}
                      motionConfig="stiff"
                      layers={['arcs', 'arcLabels', 'arcLinkLabels', 'legends', CenteredMetric]}
                    />
                  ) : (
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '0.9em'}}>
                      No aplica nivel de atención
                    </div>
                  )}
                </div>
              </div>

              {/* ── NUEVO: HISTÓRICO DE BAJAS MENSUALES ── */}
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Registro de Bajas Mensuales</h3>
                <div style={styles.lineContainer}>
                  {dataHistoricoBajas.length > 0 && dataHistoricoBajas[0].data.length > 0 ? (
                    <ResponsiveLine
                      data={dataHistoricoBajas}
                      margin={{ top: 20, right: 30, bottom: 60, left: 50 }}
                      xScale={{ type: 'point' }}
                      yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
                      curve="monotoneX"
                      useMesh={true}
                      crosshairType="cross"
                      enablePointLabel={true}
                      pointLabelYOffset={-12}
                      colors={["#691C32"]}
                      lineWidth={2}
                      pointSize={7}
                      pointColor="#fff"
                      pointBorderWidth={2}
                      pointBorderColor={{ from: 'serieColor' }}
                      enableArea={true}
                      areaOpacity={0.1}
                      axisBottom={{
                        tickSize: 0,
                        tickPadding: 10,
                        tickRotation: -35,
                      }}
                      axisLeft={{
                        tickSize: 0,
                        tickPadding: 8,
                      }}
                      enableGridX={false}
                      theme={CHART_THEME}
                      tooltip={({ point }) => (
                        <div style={{ padding: '8px 12px', background: '#fff', border: '1px solid #eee', borderRadius: 4 }}>
                          <strong style={{ color: "#691C32" }}>{point.data.xFormatted}</strong>
                          <div style={{ fontSize: '0.9em', color: '#333' }}>Bajas: <strong>{point.data.yFormatted}</strong></div>
                        </div>
                      )}
                      animate={true}
                      motionConfig="stiff"
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: '0.9em' }}>
                      Sin datos de bajas históricas
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div style={styles.rightColumn}>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Distribución por Entidad Federativa (ACTIVOS)</h3>
                <div style={styles.barContainer}>
                  <ResponsiveBar
                    data={dataPorEstado}
                    keys={BAR_KEYS}
                    indexBy="id"
                    layout="horizontal"
                    margin={BAR_MARGIN}
                    padding={0.25}
                    valueScale={BAR_VALUE_SCALE}
                    indexScale={BAR_INDEX_SCALE}
                    colors={getBarColorWrapper}
                    borderColor={BAR_BORDER_COLOR}
                    axisBottom={BAR_AXIS_BOTTOM}
                    axisLeft={BAR_AXIS_LEFT}
                    labelSkipWidth={12}
                    labelTextColor={BAR_LABEL_TEXT_COLOR}
                    layers={barLayers}
                    tooltip={BarTooltip}
                    theme={CHART_THEME}
                    animate={true}
                    motionConfig="stiff"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SECCIÓN TABLA Y FILTROS */}
      <h2 style={styles.sectionTitle}>Estadística Detallada</h2>
      <div style={styles.statisticFiltersContainer}>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroBusqueda" style={styles.filterLabel}>Buscar (CLUES):</label>
          <input id="filtroBusqueda" type="search" value={filtroBusqueda} onChange={(e) => setFiltroBusqueda(e.target.value)} style={styles.filterSelect} placeholder="Buscar..." />
        </div>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroEntidad" style={styles.filterLabel}>Entidad:</label>
          <select id="filtroEntidad" value={filtroEntidad} onChange={handleEntidadChange} style={styles.filterSelect} disabled={isLoadingFiltros}>
            <option value="">Todas</option>
            {opcionesEntidad.map((entidad) => (<option key={entidad} value={entidad}>{entidad}</option>))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroUnidad" style={styles.filterLabel}>Unidad:</label>
          <select id="filtroUnidad" value={filtroUnidad} onChange={handleUnidadChange} style={styles.filterSelect} disabled={isLoadingFiltros}>
            <option value="">Todas</option>
            {opcionesUnidad.map((unidad) => (<option key={unidad} value={unidad}>{unidad}</option>))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroEspecialidad" style={styles.filterLabel}>Especialidad:</label>
          <select id="filtroEspecialidad" value={filtroEspecialidad} onChange={handleEspecialidadChange} style={styles.filterSelect} disabled={isLoadingFiltros}>
            <option value="">Todas</option>
            {opcionesEspecialidad.map((esp) => (<option key={esp} value={esp}>{esp}</option>))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroNivel" style={styles.filterLabel}>Nivel:</label>
          <select id="filtroNivel" value={filtroNivel} onChange={handleNivelChange} style={styles.filterSelect} disabled={isLoadingFiltros}>
            <option value="">Todos</option>
            {opcionesNivel.map((nivel) => (<option key={nivel} value={nivel}>{nivel}</option>))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroEstatus" style={styles.filterLabel}>Estatus:</label>
          <select id="filtroEstatus" value={filtroEstatus} onChange={handleEstatusChange} style={styles.filterSelect} disabled={isLoadingFiltros}>
            <option value="">Todos</option>
            {opcionesEstatus.map((estatus) => (<option key={estatus} value={estatus}>{estatus}</option>))}
          </select>
        </div>
        {(filtroBusqueda || filtroEntidad || filtroUnidad || filtroEspecialidad || filtroNivel || filtroEstatus) && (
          <div style={{ ...styles.filterGroup, justifyContent: "flex-end" }}>
            <button onClick={handleClearStatisticFilters} style={{ ...styles.button, ...styles.buttonDisabled, backgroundColor: "#6c757d", cursor: "pointer" }}>Limpiar</button>
          </div>
        )}
        <div style={{ ...styles.filterGroup, justifyContent: "flex-end" }}>
          <button onClick={handleVisualizarClick} style={{ ...styles.button, backgroundColor: "#006657" }}>Visualizar</button>
        </div>
        <div style={{ ...styles.filterGroup, justifyContent: "flex-end" }}>
          <button onClick={handleOpenReportModal} style={{ ...styles.button, backgroundColor: "#006657" }}>Reporte</button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.dataTable}>
          <thead>
            <tr>
              <th style={styles.dataTableTh}>Entidad</th>
              <th style={styles.dataTableTh}>CLUES</th>
              <th style={styles.dataTableTh}>Unidad</th>
              <th style={styles.dataTableTh}>Especialidad</th>
              <th style={styles.dataTableTh}>Nivel</th>
              <th style={{ ...styles.dataTableTh, textAlign: "center" }}>Cant.</th>
            </tr>
          </thead>
          <tbody>
            {dataEstadistica.map((item, index) => (
              <tr
                key={`${item.entidad}-${item.unidad}-${item.especialidad}-${item.nivel_atencion}-${index}`}
                style={{ ...(index % 2 === 0 ? {} : styles.dataTableTrEven), transition: 'background-color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdfa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : '#fbfbfb'}
              >
                <td style={styles.dataTableTd}>{item.entidad}</td>
                <td style={{...styles.dataTableTd, fontWeight: 'bold', fontSize: '0.85em'}}>{item.clues}</td>
                <td style={styles.dataTableTd}>{item.nombre_unidad}</td>
                <td style={styles.dataTableTd}>{item.especialidad}</td>
                <td style={styles.dataTableTd}>{item.nivel_atencion}</td>
                <td style={{ ...styles.dataTableTd, textAlign: "center", fontWeight: "bold", color: COLORS.primary }}>
                  {item.cantidad}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={styles.paginationControls}>
          <div style={{ fontSize: '0.85em', color: '#666' }}>
            Filas: <strong style={{ color: COLORS.primary }}>{totalGroupsEstadistica}</strong>
            | Total Personal: <strong style={{ color: COLORS.secondary, fontSize: '1.1em' }}>{totalDoctorsInGroups}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePreviousPageEstadistica}
              disabled={currentPageEstadistica === 0 || isLoading}
              style={{ ...styles.button, ...(currentPageEstadistica === 0 ? styles.buttonDisabled : {}) }}
            >
              Anterior
            </button>
            <span style={{ fontSize: '0.85em', fontWeight: '600', color: '#333' }}>
              Pág {totalPagesEstadistica === 0 ? 0 : currentPageEstadistica + 1} de {totalPagesEstadistica}
            </span>
            <button
              onClick={handleNextPageEstadistica}
              disabled={currentPageEstadistica >= totalPagesEstadistica - 1 || isLoading}
              style={{ ...styles.button, ...(currentPageEstadistica >= totalPagesEstadistica - 1 ? styles.buttonDisabled : {}) }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <DoctoresModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} doctores={doctoresEnModal} isLoading={isLoadingModal} onViewProfile={handleViewProfile} />
      <ColumnSelectorModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} onConfirmDownload={handleConfirmDownload} />
    </div>
  );
}

export default GraficasPage;
