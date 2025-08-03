// src/components/GraficasPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsivePie } from "@nivo/pie";
import DoctoresModal from "./DoctoresModal";
import { useNavigate } from "react-router-dom";


// --- ESTILOS (Sin cambios) ---
const styles = {
  pageContainerStyle: { padding: "20px" },
  headerTitle: {
    textAlign: "center",
    marginBottom: "30px",
    fontSize: "45px",
    color: "#333",
    fontWeight: "600",
  },
  sectionTitle: {
    textAlign: "center",
    marginTop: "50px",
    marginBottom: "25px",
    fontSize: "24px",
    color: "#333",
    fontWeight: "600",
    borderTop: "1px solid #eee",
    paddingTop: "30px",
  },
  chartsGridContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1.5fr",
    gap: "25px",
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto 40px auto",
  },
  pieChartsColumn: { display: "flex", flexDirection: "column", gap: "25px" },
  chartWrapper: {
    height: "450px",
    width: "100%",
    background: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  chartTitle: {
    textAlign: "center",
    color: "#333",
    fontSize: "18px",
    fontWeight: "500",
    marginBottom: "5px",
    flexShrink: 0,
  },
  tableContainer: {
    width: "100%",
    maxWidth: "1000px",
    margin: "0 auto",
    background: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  dataTable: { width: "100%", borderCollapse: "collapse", fontSize: "0.9em" },
  dataTableTh: {
    backgroundColor: "#006657",
    color: "white",
    padding: "10px 12px",
    textAlign: "center",
    border: "1px solid #005c4e",
  },
  dataTableTd: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    color: "#333",
    textAlign: "center",
  },
  dataTableTrEven: { backgroundColor: "#f2f2f2" },
  statisticFiltersContainer: {
    display: "flex",
    gap: "15px",
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#e9ecef",
    borderRadius: "6px",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  filterGroup: { display: "flex", flexDirection: "column" },
  filterLabel: {
    fontSize: "0.85em",
    color: "#495057",
    marginBottom: "5px",
    fontWeight: "500",
  },
  filterSelect: {
    padding: "8px 10px",
    fontSize: "0.9em",
    border: "1px solid #ced4da",
    borderRadius: "4px",
    minWidth: "180px",
    backgroundColor: "white",
  },
  loadingOrErrorStyle: {
    textAlign: "center",
    marginTop: "50px",
    fontSize: "1.2em",
  },
  errorStyle: { color: "red" },
  message: {
    textAlign: "center",
    padding: "20px",
    fontSize: "1.1em",
    color: "#777",
  },
  paginationControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
    padding: "10px",
    backgroundColor: "#f0f0f0",
    borderRadius: "4px",
  },
  button: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    transition: "background-color 0.2s ease",
  },
  buttonDisabled: { backgroundColor: "#ccc", cursor: "not-allowed" },
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const ITEMS_PER_PAGE_ESTADISTICA = 10;

function GraficasPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  // --- Estados para los datos de las gráficas y tablas ---
  const [dataPorEstado, setDataPorEstado] = useState([]);
  const [dataPorEstatus, setDataPorEstatus] = useState([]);
  const [dataPorNivelAtencion, setDataPorNivelAtencion] = useState([]);
  const [dataEstadistica, setDataEstadistica] = useState([]);

  // --- Estados para los valores seleccionados en los filtros ---
  const [filtroEntidad, setFiltroEntidad] = useState("");
  const [filtroUnidad, setFiltroUnidad] = useState("");
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [debouncedBusqueda, setDebouncedBusqueda] = useState("");

  // --- Estados para las OPCIONES de los filtros ---
  const [opcionesEntidad, setOpcionesEntidad] = useState([]);
  const [opcionesUnidad, setOpcionesUnidad] = useState([]);
  const [opcionesEspecialidad, setOpcionesEspecialidad] = useState([]);
  const [opcionesNivel, setOpcionesNivel] = useState([]);

  // --- Estados de Carga y Error ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoadingFiltros, setIsLoadingFiltros] = useState(false);

  // --- Estados de Paginación ---
  const [currentPageEstadistica, setCurrentPageEstadistica] = useState(0);
  const [totalGroupsEstadistica, setTotalGroupsEstadistica] = useState(0);
  const [totalDoctorsInGroups, setTotalDoctorsInGroups] = useState(0);

  // --- Estados para el Modal de Visualización ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [doctoresEnModal, setDoctoresEnModal] = useState([]);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const misColoresPastel = [
    "#10312B",
    "#BC955C",
    "#691C32",
    "#DDC9A3",
    "#669BBC",
  ];

  // --- LÓGICA DE CARGA DE DATOS ---
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedBusqueda(filtroBusqueda);
    }, 500); // Espera 500ms antes de actualizar
    return () => clearTimeout(timerId);
  }, [filtroBusqueda]);

  // Carga los datos iniciales para las gráficas
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const urls = [
          `${API_BASE_URL}/api/graficas/doctores_por_estado`,
          `${API_BASE_URL}/api/graficas/doctores_por_estatus`,
          `${API_BASE_URL}/api/graficas/doctores_por_nivel_atencion`,
        ];
        const responses = await Promise.all(
          urls.map((url) => fetch(url, { headers }))
        );
        const [estadoRes, estatusRes, nivelRes] = responses;

        if (!estadoRes.ok || !estatusRes.ok || !nivelRes.ok)
          throw new Error("Error al cargar datos iniciales.");

        const estadoData = await estadoRes.json();
        const estatusData = await estatusRes.json();
        const nivelData = await nivelRes.json();

        setDataPorEstado(
          estadoData
            .map((item) => ({
              id: item.label,
              label: item.label,
              value: item.value,
            }))
            .reverse()
        );
        setDataPorEstatus(
          estatusData.map((item) => ({
            id: item.label,
            label: item.label,
            value: item.value,
          }))
        );
        setDataPorNivelAtencion(
          nivelData.map((item) => ({
            id: item.label,
            label: item.label,
            value: item.value,
          }))
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchInitialData();
  }, [token]);

  // Carga y actualiza las opciones de TODOS los filtros cada vez que un filtro cambia
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setIsLoadingFiltros(true);
      const params = new URLSearchParams();
      if (filtroEntidad) params.append("entidad", filtroEntidad);
      if (filtroUnidad) params.append("nombre_unidad", filtroUnidad);
      if (filtroEspecialidad) params.append("especialidad", filtroEspecialidad);
      if (filtroNivel) params.append("nivel_atencion", filtroNivel);
      if (debouncedBusqueda) params.append("search", debouncedBusqueda);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/opciones/filtros?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) throw new Error("Error al cargar opciones de filtro");
        const data = await response.json();

        setOpcionesEntidad(data.entidades);
        setOpcionesUnidad(data.unidades);
        setOpcionesEspecialidad(data.especialidades);
        setOpcionesNivel(data.niveles_atencion);
      } catch (error) {
        console.error("Error al cargar opciones de filtro:", error);
      } finally {
        setIsLoadingFiltros(false);
      }
    };
    if (token) fetchFilterOptions();
  }, [
    filtroEntidad,
    filtroUnidad,
    filtroEspecialidad,
    filtroNivel,
    debouncedBusqueda,
    token,
  ]);

  // Carga los datos de la tabla de estadísticas cuando cambian los filtros o la página
  useEffect(() => {
    const fetchEstadisticaData = async () => {
      setIsLoading(true);
      const skip = currentPageEstadistica * ITEMS_PER_PAGE_ESTADISTICA;
      const params = new URLSearchParams({
        skip,
        limit: ITEMS_PER_PAGE_ESTADISTICA,
      });
      if (filtroEntidad) params.append("entidad", filtroEntidad);
      if (filtroUnidad) params.append("nombre_unidad", filtroUnidad);
      if (filtroEspecialidad) params.append("especialidad", filtroEspecialidad);
      if (filtroNivel) params.append("nivel_atencion", filtroNivel);
      if (debouncedBusqueda) params.append("search", debouncedBusqueda);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/graficas/estadistica_doctores_agrupados?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) throw new Error("Error al cargar la estadística.");
        const data = await response.json();
        setDataEstadistica(data.items || []);
        setTotalGroupsEstadistica(data.total_groups || 0);
        setTotalDoctorsInGroups(data.total_doctors_in_groups || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchEstadisticaData();
  }, [
    currentPageEstadistica,
    filtroEntidad,
    filtroUnidad,
    filtroEspecialidad,
    filtroNivel,
    debouncedBusqueda,
    token,
  ]);

  // --- MANEJADORES DE EVENTOS ---
  const handleEntidadChange = (e) => {
    setFiltroEntidad(e.target.value);
    setCurrentPageEstadistica(0);
  };
  const handleUnidadChange = (e) => {
    setFiltroUnidad(e.target.value);
    setCurrentPageEstadistica(0);
  };
  const handleEspecialidadChange = (e) => {
    setFiltroEspecialidad(e.target.value);
    setCurrentPageEstadistica(0);
  };
  const handleNivelChange = (e) => {
    setFiltroNivel(e.target.value);
    setCurrentPageEstadistica(0);
  };

  const handleClearStatisticFilters = () => {
    setFiltroEntidad("");
    setFiltroUnidad("");
    setFiltroEspecialidad("");
    setFiltroNivel("");
    setFiltroBusqueda("");
    setDebouncedBusqueda("");
    setCurrentPageEstadistica(0);
  };

  const handleVisualizarClick = async () => {
    setIsLoadingModal(true);
    setIsModalOpen(true);
    const params = new URLSearchParams();
    if (filtroEntidad) params.append("entidad", filtroEntidad);
    if (filtroUnidad) params.append("nombre_unidad", filtroUnidad);
    if (filtroEspecialidad) params.append("especialidad", filtroEspecialidad);
    if (filtroNivel) params.append("nivel_atencion", filtroNivel);
    if (debouncedBusqueda) params.append("search", debouncedBusqueda);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctores/detalles_filtrados?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Error al obtener los detalles");
      const data = await response.json();
      setDoctoresEnModal(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoadingModal(false);
    }
  };

  const handleViewProfile = (doctor) => {
    setIsModalOpen(false);
    navigate(`/?profile=${doctor.id_imss}`);
  };

  const handleOpenReportModal = () => {
    setIsReportModalOpen(true);
  };

  const handleConfirmDownload = async (selectedColumns) => {
    setIsReportModalOpen(false); // Cierra el modal de selección

    // Prepara el cuerpo de la petición con los filtros actuales y las columnas seleccionadas
    const body = {
      entidad: filtroEntidad || null,
      especialidad: filtroEspecialidad || null,
      nivel_atencion: filtroNivel || null,
      nombre_unidad: filtroUnidad || null,
      search: debouncedBusqueda || null,
      columnas: selectedColumns,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/reporte/dinamico/xlsx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Error al generar el reporte." }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      // Procesa el archivo para la descarga
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte_filtrado_doctores.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error al descargar el archivo:", error);
      alert(`No se pudo descargar el archivo: ${error.message}`);
    }
  };

  const totalPagesEstadistica = Math.ceil(
    totalGroupsEstadistica / ITEMS_PER_PAGE_ESTADISTICA
  );
  const handlePreviousPageEstadistica = () =>
    setCurrentPageEstadistica((p) => Math.max(0, p - 1));
  const handleNextPageEstadistica = () =>
    setCurrentPageEstadistica((p) =>
      Math.min(totalPagesEstadistica - 1, p + 1)
    );

  // --- RENDERIZADO ---
  if (isLoading && dataPorEstado.length === 0) {
    return <p style={styles.loadingOrErrorStyle}>Cargando datos...</p>;
  }
  if (error) {
    return (
      <p style={{ ...styles.loadingOrErrorStyle, ...styles.errorStyle }}>
        {error}
      </p>
    );
  }

  return (
    <div style={styles.pageContainerStyle}>
      <h1 style={styles.headerTitle}>Gráficas</h1>

      <div style={styles.chartsGridContainer}>
        <div style={styles.pieChartsColumn}>
          <div style={styles.chartWrapper}>
            <h2 style={styles.chartTitle}>
              Médicos por Estatus de Cooperación
            </h2>
            <ResponsivePie
              data={dataPorEstatus}
              margin={{ top: 40, right: 160, bottom: 120, left: 20 }}
              innerRadius={0.6}
              padAngle={3}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={misColoresPastel}
              borderWidth={1}
              borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
              enableArcLinkLabels={false}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor="#ffffff"
              legends={[
                {
                  anchor: "right",
                  direction: "column",
                  justify: false,
                  translateX: 140,
                  translateY: 0,
                  itemsSpacing: 5,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemTextColor: "#333",
                  itemDirection: "left-to-right",
                  itemOpacity: 1,
                  symbolSize: 20,
                  symbolShape: "circle",
                },
              ]}
            />
          </div>
          <div style={styles.chartWrapper}>
            <h2 style={styles.chartTitle}>Médicos por Nivel de Atención</h2>
            <ResponsivePie
              data={dataPorNivelAtencion}
              margin={{ top: 40, right: 160, bottom: 120, left: 20 }}
              innerRadius={0.6}
              padAngle={3}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={misColoresPastel}
              borderWidth={1}
              borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
              enableArcLinkLabels={false}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor="#ffffff"
              legends={[
                {
                  anchor: "right",
                  direction: "column",
                  justify: false,
                  translateX: 140,
                  translateY: 0,
                  itemsSpacing: 5,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemTextColor: "#333",
                  itemDirection: "left-to-right",
                  itemOpacity: 1,
                  symbolSize: 20,
                  symbolShape: "circle",
                },
              ]}
            />
          </div>
        </div>
        <div style={{ ...styles.chartWrapper, height: "925px" }}>
          <h2 style={styles.chartTitle}>Médicos por Entidad Federativa</h2>
          <ResponsiveBar
            data={dataPorEstado}
            keys={["value"]}
            indexBy="id"
            layout="horizontal"
            margin={{ top: 10, right: 60, bottom: 100, left: 120 }}
            padding={0.35}
            valueScale={{ type: "linear" }}
            indexScale={{ type: "band", round: true }}
            colors="#BC955C"
            borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: "Número de Médicos",
              legendPosition: "middle",
              legendOffset: 50,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: "Estado",
              legendPosition: "middle",
              legendOffset: -90,
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor="white"
            animate={true}
            motionStiffness={90}
            motionDamping={15}
          />
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Estadística Detallada</h2>
      <div style={styles.statisticFiltersContainer}>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroBusqueda" style={styles.filterLabel}>
            Buscar (CLUES):
          </label>
          <input
            id="filtroBusqueda"
            type="search"
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
            style={styles.filterSelect}
            placeholder="Escriba para buscar..."
          />
        </div>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroEntidad" style={styles.filterLabel}>
            Entidad:
          </label>
          <select
            id="filtroEntidad"
            value={filtroEntidad}
            onChange={handleEntidadChange}
            style={styles.filterSelect}
            disabled={isLoadingFiltros}
          >
            <option value="">
              {isLoadingFiltros ? "Cargando..." : "Todas las Entidades"}
            </option>
            {opcionesEntidad.map((entidad) => (
              <option key={entidad} value={entidad}>
                {entidad}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label htmlFor="filtroUnidad" style={styles.filterLabel}>
            Unidad:
          </label>
          <select
            id="filtroUnidad"
            value={filtroUnidad}
            onChange={handleUnidadChange}
            style={styles.filterSelect}
            disabled={isLoadingFiltros}
          >
            <option value="">
              {isLoadingFiltros ? "Cargando..." : "Todas las Unidades"}
            </option>
            {opcionesUnidad.map((unidad) => (
              <option key={unidad} value={unidad}>
                {unidad}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroEspecialidad" style={styles.filterLabel}>
            Especialidad:
          </label>
          <select
            id="filtroEspecialidad"
            value={filtroEspecialidad}
            onChange={handleEspecialidadChange}
            style={styles.filterSelect}
            disabled={isLoadingFiltros}
          >
            <option value="">
              {isLoadingFiltros ? "Cargando..." : "Todas las Especialidades"}
            </option>
            {opcionesEspecialidad.map((esp) => (
              <option key={esp} value={esp}>
                {esp}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroNivel" style={styles.filterLabel}>
            Nivel de Atención:
          </label>
          <select
            id="filtroNivel"
            value={filtroNivel}
            onChange={handleNivelChange}
            style={styles.filterSelect}
            disabled={isLoadingFiltros}
          >
            <option value="">
              {isLoadingFiltros ? "Cargando..." : "Todos los Niveles"}
            </option>
            {opcionesNivel.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>
        </div>
        {(filtroBusqueda ||
          filtroEntidad ||
          filtroEspecialidad ||
          filtroUnidad ||
          filtroNivel) && (
          <>
            <div style={{ ...styles.filterGroup, justifyContent: "flex-end" }}>
              <button
                onClick={handleClearStatisticFilters}
                style={{
                  ...styles.button,
                  ...styles.buttonSmall,
                  backgroundColor: "#6c757d",
                }}
              >
                Limpiar Filtros
              </button>
            </div>

            <div style={{ ...styles.filterGroup, justifyContent: "flex-end" }}>
              <button
                onClick={handleVisualizarClick}
                style={{
                  ...styles.button,
                  ...styles.buttonSmall,
                  backgroundColor: "#006657",
                }}
              >
                Visualizar Registros
              </button>
            </div>

            
          </>
          
        )}
        <div style={{ ...styles.filterGroup, justifyContent: "flex-end" }}>
              <button
                onClick={handleOpenReportModal}
                style={{ ...styles.button, backgroundColor: "#006657" }}
              >
                Generar Reporte
              </button>
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
              <th style={styles.dataTableTh}>Nivel de Atención</th>
              <th style={{ ...styles.dataTableTh, textAlign: "center" }}>
                Cantidad Médicos
              </th>
            </tr>
          </thead>
          <tbody>
            {dataEstadistica.map((item, index) => (
              <tr
                key={`${item.entidad}-${item.unidad}-${item.especialidad}-${item.nivel_atencion}-${index}`}
                style={index % 2 === 0 ? {} : styles.dataTableTrEven}
              >
                <td style={styles.dataTableTd}>{item.entidad}</td>
                <td style={styles.dataTableTd}>{item.clues}</td>
                <td style={styles.dataTableTd}>{item.nombre_unidad}</td>
                <td style={styles.dataTableTd}>{item.especialidad}</td>
                <td style={styles.dataTableTd}>{item.nivel_atencion}</td>
                <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                  {item.cantidad}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          style={{
            textAlign: "right",
            marginTop: "10px",
            fontWeight: "bold",
            paddingRight: "10px",
          }}
        >
          Total de Médicos (con filtros aplicados): {totalDoctorsInGroups}
        </div>
        {totalPagesEstadistica > 1 && (
          <div style={styles.paginationControls}>
            <button
              onClick={handlePreviousPageEstadistica}
              disabled={currentPageEstadistica === 0 || isLoading}
              style={{
                ...styles.button,
                ...(currentPageEstadistica === 0 || isLoading
                  ? styles.buttonDisabled
                  : {}),
              }}
            >
              Anterior
            </button>
            <span>
              Página {currentPageEstadistica + 1} de {totalPagesEstadistica}{" "}
              (Total Grupos: {totalGroupsEstadistica})
            </span>
            <button
              onClick={handleNextPageEstadistica}
              disabled={
                currentPageEstadistica >= totalPagesEstadistica - 1 || isLoading
              }
              style={{
                ...styles.button,
                ...(currentPageEstadistica >= totalPagesEstadistica - 1 ||
                isLoading
                  ? styles.buttonDisabled
                  : {}),
              }}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      <DoctoresModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        doctores={doctoresEnModal}
        isLoading={isLoadingModal}
        onViewProfile={handleViewProfile}
      />

      <ColumnSelectorModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onConfirmDownload={handleConfirmDownload}
      />
    </div>
  );
}

export default GraficasPage;

