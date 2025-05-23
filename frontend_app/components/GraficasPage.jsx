// src/components/GraficasPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveTreeMap } from "@nivo/treemap";
import { ResponsivePie } from "@nivo/pie";

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
    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
    gap: "25px",
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto 40px auto",
  },
  chartWrapper: {
    height: "400px",
    background: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },
  chartTitle: {
    textAlign: "center",
    color: "#333",
    fontSize: "18px",
    fontWeight: "500",
    marginBottom: "15px",
  },
  treemapWithLegendWrapper: {
    height: "400px",
    background: "#f9f9f9",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },
  treemapContent: {
    display: "flex",
    flexDirection: "row",
    gap: "15px",
    flexGrow: 1,
    overflow: "hidden",
  },
  treemapChartStyle: { flex: 3, height: "100%" },
  treemapLegendStyle: {
    flex: 1,
    padding: "10px",
    borderLeft: "1px solid #ddd",
    overflowY: "auto",
    height: "100%",
    background: "#fff",
    borderRadius: "4px",
    fontSize: "0.85em",
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

  // Estilos para los nuevos filtros de la tabla de estadística
  statisticFiltersContainer: {
    display: "flex",
    gap: "15px",
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#e9ecef", // Un fondo ligeramente diferente para los filtros
    borderRadius: "6px",
    flexWrap: "wrap",
    justifyContent: "center", // Centrar los filtros si hay espacio
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
  },
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
    minWidth: "180px", // Ancho mínimo para los selectores
    backgroundColor: "white",
  },
  filterButton: {
    padding: "8px 15px",
    fontSize: "0.9em",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    alignSelf: "flex-end", // Alinear con la parte inferior de los selectores
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
const ITEMS_PER_PAGE_ESTADISTICA = 10; // Paginación para la tabla de estadística

function GraficasPage() {
  const { isAuthenticated, isGuestMode, token, logout: authLogout } = useAuth();
  const [dataPorEstado, setDataPorEstado] = useState([]);
  const [dataPorEspecialidad, setDataPorEspecialidad] = useState({
    name: "root",
    children: [],
  });
  const [dataPorEstatus, setDataPorEstatus] = useState([]);
  const [dataEstadistica, setDataEstadistica] = useState([]);
  const [currentPageEstadistica, setCurrentPageEstadistica] = useState(0);
  const [totalGroupsEstadistica, setTotalGroupsEstadistica] = useState(0);
  const [totalDoctorsInGroups, setTotalDoctorsInGroups] = useState(0);
  const [totalItemsEstadistica, setTotalItemsEstadistica] = useState(0);

  const [filtroEntidad, setFiltroEntidad] = useState("");
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [opcionesEntidad, setOpcionesEntidad] = useState([
    { value: "", label: "Todas las Entidades" },
  ]);
  const [opcionesEspecialidad, setOpcionesEspecialidad] = useState([
    { value: "", label: "Todas las Especialidades" },
  ]);
  const [opcionesNivel, setOpcionesNivel] = useState([
    { value: "", label: "Todos los Niveles" },
  ]);

  const [isLoadingGraphs, setIsLoadingGraphs] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState("");
  const [especialidadesAgrupadas, setEspecialidadesAgrupadas] = useState([]);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(true);
  const [errorEspecialidades, setErrorEspecialidades] = useState("");

  const [nivelesAtencion, setNivelesAtencion] = useState([]);
  const [cedulasData, setCedulasData] = useState(null);
  const [loadingNiveles, setLoadingNiveles] = useState(true);
  const [loadingCedulas, setLoadingCedulas] = useState(true);
  const [errorNiveles, setErrorNiveles] = useState("");
  const [errorCedulas, setErrorCedulas] = useState("");
  // pieData ahora simplemente usa dataPorEstatus, ya que la transformación se hará en el fetch.
  const pieData = useMemo(() => dataPorEstatus, [dataPorEstatus]);

  const fetchNivelesAtencion = useCallback(async () => {
    if (!isAuthenticated && !isGuestMode && !token) {
      setErrorNiveles("No autorizado para ver niveles de atención.");
      setLoadingNiveles(false);
      return;
    }

    setLoadingNiveles(true);
    setErrorNiveles("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/graficas/doctores_por_nivel_atencion`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Error al cargar niveles" }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      const data = await response.json();
      setNivelesAtencion(data);
    } catch (err) {
      console.error("Error obteniendo niveles de atención:", err);
      setErrorNiveles(err.message || "Error al cargar niveles de atención");
    } finally {
      setLoadingNiveles(false);
    }
  }, [isAuthenticated, isGuestMode, token]);

  const fetchCedulasData = useCallback(async () => {
    if (!isAuthenticated && !isGuestMode && !token) {
      setErrorCedulas("No autorizado para ver datos de cédulas.");
      setLoadingCedulas(false);
      return;
    }

    setLoadingCedulas(true);
    setErrorCedulas("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/graficas/doctores_por_cedulas`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Error al cargar cédulas" }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      const data = await response.json();
      setCedulasData(data);
    } catch (err) {
      console.error("Error obteniendo datos de cédulas:", err);
      setErrorCedulas(err.message || "Error al cargar datos de cédulas");
    } finally {
      setLoadingCedulas(false);
    }
  }, [isAuthenticated, isGuestMode, token]);

  //función para obtener los datos
  const fetchEspecialidadesAgrupadas = useCallback(async () => {
    if (!isAuthenticated && !isGuestMode && !token) {
      setErrorEspecialidades("No autorizado para ver especialidades.");
      setLoadingEspecialidades(false);
      return;
    }

    setLoadingEspecialidades(true);
    setErrorEspecialidades("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/graficas/especialidades_agrupadas`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Error al cargar especialidades" }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }

      const data = await response.json();
      setEspecialidadesAgrupadas(data);
    } catch (err) {
      console.error("Error obteniendo especialidades agrupadas:", err);
      setErrorEspecialidades(err.message || "Error al cargar especialidades");
    } finally {
      setLoadingEspecialidades(false);
    }
  }, [isAuthenticated, isGuestMode, token]);

  useEffect(() => {
    if (dataPorEstado.length > 0) {
      const entidades = [
        ...new Set(dataPorEstado.map((item) => item.id)),
      ].sort();
      setOpcionesEntidad([
        { value: "", label: "Todas las Entidades" },
        ...entidades.map((e) => ({ value: e, label: e })),
      ]);
    }
    if (
      dataPorEspecialidad.children &&
      dataPorEspecialidad.children.length > 0
    ) {
      const especialidades = [
        ...new Set(dataPorEspecialidad.children.map((item) => item.name)),
      ].sort();
      setOpcionesEspecialidad([
        { value: "", label: "Todas las Especialidades" },
        ...especialidades.map((e) => ({ value: e, label: e })),
      ]);
    }
    const nivelesFijos = [
      "PRIMER NIVEL",
      "SEGUNDO NIVEL",
      "TERCER NIVEL",
      "NO APLICA",
    ];
    setOpcionesNivel([
      { value: "", label: "Todos los Niveles" },
      ...nivelesFijos.map((n) => ({ value: n, label: n })),
    ]);
  }, [dataPorEstado, dataPorEspecialidad]);

  const fetchGraphData = useCallback(async () => {
    if (!isAuthenticated && !isGuestMode && !token) {
      setError("No autorizado para ver gráficas.");
      setIsLoadingGraphs(false);
      return;
    }
    setIsLoadingGraphs(true);
    setError("");
    const headers = { Authorization: `Bearer ${token}` };
    const apiUrlBase = API_BASE_URL;
    try {
      const graphEndpoints = [
        {
          url: `${apiUrlBase}/api/graficas/doctores_por_estado`,
          setter: setDataPorEstado,
          transform: (d) =>
            Array.isArray(d)
              ? d.map((item) => ({
                  id: String(item.label || item.id || "Desconocido"),
                  label: String(item.label || item.id || "Desconocido"),
                  value: Number(item.value) || 0,
                }))
              : [],
          name: "estado",
        },
        {
          url: `${apiUrlBase}/api/graficas/doctores_por_especialidad`,
          setter: setDataPorEspecialidad,
          transform: (d) => ({
            name: "Especialidades",
            children: Array.isArray(d)
              ? d.map((item) => ({
                  name: String(item.label || "Desconocido"),
                  value: Number(item.value) || 0,
                }))
              : [],
          }),
          name: "especialidad",
        },
        {
          url: `${apiUrlBase}/api/graficas/doctores_por_estatus`,
          setter: setDataPorEstatus,
          transform: (d) =>
            Array.isArray(d)
              ? d.map((item) => ({
                  id: String(item.label || item.id || "Desconocido"),
                  label: String(item.label || item.id || "Desconocido"),
                  value: Number(item.value) || 0,
                }))
              : [],
          name: "estatus",
        },
      ];
      const graphResponses = await Promise.all(
        graphEndpoints.map((ep) => fetch(ep.url, { headers }))
      );
      let partialError = "";
      for (let i = 0; i < graphResponses.length; i++) {
        const response = graphResponses[i];
        const endpoint = graphEndpoints[i];
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: `Error en ${endpoint.name}` }));
          const detail = errorData?.detail || response.statusText;
          const errorMsg = `Error ${endpoint.name}: ${response.status} ${detail}`;
          if (response.status === 401 && isAuthenticated) {
            authLogout();
            partialError = "Tu sesión ha expirado.";
            break;
          }
          partialError += (partialError ? "; " : "") + errorMsg;
        }
      }
      if (partialError)
        setError((prev) => (prev ? `${prev}; ${partialError}` : partialError));

      const allGraphJsonData = await Promise.all(
        graphResponses.map((res) =>
          res.ok ? res.json() : Promise.resolve(null)
        )
      );
      allGraphJsonData.forEach((data, index) => {
        if (data)
          graphEndpoints[index].setter(graphEndpoints[index].transform(data));
      });
    } catch (err) {
      console.error("Error obteniendo datos para gráficas:", err);
      setError((prevError) =>
        prevError
          ? `${prevError}; ${err.message}`
          : err.message || "Error al cargar datos de gráficas."
      );
    } finally {
      setIsLoadingGraphs(false);
    }
  }, [isAuthenticated, isGuestMode, token, authLogout]);

  const fetchEstadisticaData = useCallback(
    async (page) => {
      if (!isAuthenticated && !isGuestMode && !token) {
        setStatsError("No autenticado para ver estadísticas.");
        setIsLoadingStats(false);
        return;
      }
      setIsLoadingStats(true);
      setStatsError("");
      const skip = page * ITEMS_PER_PAGE_ESTADISTICA;
      const headers = { Authorization: `Bearer ${token}` };
      let url = `${API_BASE_URL}/api/graficas/estadistica_doctores_agrupados?skip=${skip}&limit=${ITEMS_PER_PAGE_ESTADISTICA}`;
      if (filtroEntidad) url += `&entidad=${encodeURIComponent(filtroEntidad)}`;
      if (filtroEspecialidad)
        url += `&especialidad=${encodeURIComponent(filtroEspecialidad)}`;
      if (filtroNivel)
        url += `&nivel_atencion=${encodeURIComponent(filtroNivel)}`;

      try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: "Error al cargar datos de estadística." }));
          throw new Error(errorData.detail || `Error ${response.status}`);
        }
        const data = await response.json();
        setDataEstadistica(data.items || []);
        setTotalGroupsEstadistica(data.total_groups || 0);
        setTotalDoctorsInGroups(data.total_doctors_in_groups || 0);
      } catch (err) {
        console.error("Error en fetchEstadisticaData:", err);
        setStatsError(
          err.message || "Ocurrió un error al cargar la estadística."
        );
        setDataEstadistica([]);
        setTotalGroupsEstadistica(0);
        setTotalDoctorsInGroups(0);
      } finally {
        setIsLoadingStats(false);
      }
    },
    [
      isAuthenticated,
      isGuestMode,
      token,
      filtroEntidad,
      filtroEspecialidad,
      filtroNivel,
    ]
  );

  useEffect(() => {
    // La función fetchAllData se define y se llama dentro de este efecto.
    // No es necesario que fetchAllData sea una dependencia de este useEffect.
    const fetchInitialData = async () => {
      if (!isAuthenticated && !isGuestMode) {
        setError("No autorizado para ver esta página.");
        setIsLoadingGraphs(false); // Asegurar que el loading de gráficas se detenga
        setIsLoadingStats(false); // Asegurar que el loading de stats se detenga
        setLoadingEspecialidades(false);
        setLoadingNiveles(false);
        setLoadingCedulas(false);
        return;
      }
      setIsLoadingGraphs(true);
      setIsLoadingStats(true); // Iniciar ambos loadings
      setError("");
      setStatsError("");
      setErrorEspecialidades("");
      setErrorNiveles("");
      setErrorCedulas("");

      // Llama a fetchGraphData (que es useCallback)
      await fetchGraphData();
      // Llama a fetchEstadisticaData (que es useCallback) para la página 0
      await fetchEstadisticaData(0);
      await fetchEspecialidadesAgrupadas();
      await fetchNivelesAtencion();
      await fetchCedulasData();
    };
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    isGuestMode,
    token,
    authLogout,
    fetchGraphData,
    fetchEstadisticaData,
    fetchEspecialidadesAgrupadas,
    fetchNivelesAtencion,
    fetchCedulasData,
  ]); // Dependencias principales para la carga inicial

  // useEffect para carga inicial de gráficas y primera página de estadísticas
  useEffect(() => {
    // La función fetchAllData se define y se llama dentro de este efecto.
    // No es necesario que fetchAllData sea una dependencia de este useEffect.
    const fetchInitialData = async () => {
      if (!isAuthenticated && !isGuestMode) {
        setError("No autorizado para ver esta página.");
        setIsLoadingGraphs(false); // Asegurar que el loading de gráficas se detenga
        setIsLoadingStats(false); // Asegurar que el loading de stats se detenga
        return;
      }
      setIsLoadingGraphs(true);
      setIsLoadingStats(true); // Iniciar ambos loadings
      setError("");
      setStatsError("");

      // Llama a fetchGraphData (que es useCallback)
      await fetchGraphData();
      // Llama a fetchEstadisticaData (que es useCallback) para la página 0
      await fetchEstadisticaData(0);
    };
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isGuestMode, token, authLogout]); // Dependencias principales para la carga inicial

  // useEffect para recargar datos de estadística cuando cambian los filtros o la página de la tabla
  useEffect(() => {
    // No llamar en la carga inicial si el useEffect principal ya lo hizo.
    // Este efecto se enfoca en reaccionar a cambios de paginación o filtros para la tabla.
    if (!isLoadingGraphs && (isAuthenticated || isGuestMode)) {
      // Solo si las gráficas ya cargaron (o no están cargando)
      fetchEstadisticaData(currentPageEstadistica);
    }
  }, [
    currentPageEstadistica,
    fetchEstadisticaData,
    isLoadingGraphs,
    isAuthenticated,
    isGuestMode,
  ]);

  // useEffect para resetear la página de la tabla de estadística cuando los filtros cambian
  useEffect(() => {
    setCurrentPageEstadistica(0);
  }, [filtroEntidad, filtroEspecialidad, filtroNivel]);

  const totalPagesEstadistica = Math.ceil(
    totalGroupsEstadistica / ITEMS_PER_PAGE_ESTADISTICA
  );
  const handlePreviousPageEstadistica = () =>
    setCurrentPageEstadistica((prev) => Math.max(0, prev - 1));
  const handleNextPageEstadistica = () =>
    setCurrentPageEstadistica((prev) =>
      Math.min(totalPagesEstadistica - 1, prev + 1)
    );
  const handleClearStatisticFilters = () => {
    setFiltroEntidad("");
    setFiltroEspecialidad("");
    setFiltroNivel("");
  };

  if (isLoadingGraphs && isLoadingStats)
    return <p style={styles.loadingOrErrorStyle}>Cargando datos...</p>;

  const noGraphData =
    !isLoadingGraphs &&
    dataPorEstado.length === 0 &&
    dataPorEspecialidad.children.length === 0 &&
    dataPorEstatus.length === 0;

  return (
    <div style={styles.pageContainerStyle}>
      <h1 style={styles.headerTitle}>Dashboard</h1>
      {error && (
        <p
          style={{
            ...styles.errorStyle,
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          {error}
        </p>
      )}

      {isLoadingGraphs && (
        <p style={styles.loadingOrErrorStyle}>Cargando gráficas...</p>
      )}
      {!isLoadingGraphs && noGraphData && !error && (
        <p style={styles.message}>
          No hay datos disponibles para las gráficas.
        </p>
      )}

      <div style={styles.chartsGridContainer}>
        {/* Celda 1: Gráfica de Pastel (Estatus) */}
        {dataPorEstatus.length > 0 ? (
          <div style={styles.chartWrapper}>
            <h2 style={styles.chartTitle}>Distribución por Estatus</h2>
            <ResponsivePie
              data={pieData}
              margin={{ top: 20, right: 80, bottom: 80, left: 80 }} // Ajustado bottom para leyenda
              innerRadius={0.4}
              padAngle={1}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={{ scheme: "nivo" }} // Esquema de colores diferente
              borderWidth={1}
              borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: "color" }}
              arcLabelsSkipAngle={15}
              arcLabelsTextColor={{
                from: "color",
                modifiers: [["darker", 3]],
              }}
              tooltip={({ datum: { id, value, color, label } }) => (
                <div
                  style={{
                    padding: "5px 10px",
                    background: "white",
                    color: "#333",
                    border: "1px solid #ccc",
                  }}
                >
                  {" "}
                  <strong style={{ color: color }}>{label || id}:</strong>{" "}
                  {value}{" "}
                </div>
              )}
              legends={[
                {
                  anchor: "bottom",
                  direction: "row",
                  justify: false,
                  translateX: 0,
                  translateY: 56,
                  itemsSpacing: 0,
                  itemWidth: 100,
                  itemHeight: 18,
                  itemTextColor: "#999",
                  itemDirection: "left-to-right",
                  itemOpacity: 1,
                  symbolSize: 14,
                  symbolShape: "circle",
                  effects: [{ on: "hover", style: { itemTextColor: "#000" } }],
                },
              ]}
            />
          </div>
        ) : (
          !isLoading && (
            <div style={styles.chartWrapper}>
              <p style={styles.message}>No hay datos de estatus.</p>
            </div>
          )
        )}

        {/* Celda 2: Gráfica de Barras (Estado) */}
        {dataPorEstado.length > 0 ? (
          <div style={styles.chartWrapper}>
            <h2 style={styles.chartTitle}>Doctores por Estado</h2>
            <ResponsiveBar
              data={dataPorEstado}
              keys={["value"]}
              indexBy="id" // Usar 'id' que se mapeó en la transformación
              margin={{ top: 20, right: 20, bottom: 120, left: 60 }} // Ajustar bottom para labels
              padding={0.3}
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors={{ scheme: "spectral" }}
              borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -40,
                legend: "Estado",
                legendPosition: "middle",
                legendOffset: 70,
                truncateTickAt: 12,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Número de Doctores",
                legendPosition: "middle",
                legendOffset: -50,
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
              animate={true}
              motionStiffness={90}
              motionDamping={15}
              tooltip={({ id, value, color, indexValue }) => (
                <div
                  style={{
                    padding: "5px 10px",
                    background: "white",
                    color: "#333",
                    border: "1px solid #ccc",
                  }}
                >
                  {" "}
                  <strong style={{ color }}>{indexValue}:</strong> {value}{" "}
                </div>
              )}
            />
          </div>
        ) : (
          !isLoading && (
            <div style={styles.chartWrapper}>
              <p style={styles.message}>No hay datos por estado.</p>
            </div>
          )
        )}

        {/* Celda 4 (Opcional - vacía o para otra gráfica) */}
        {/* <div style={styles.chartWrapper}><p style={styles.message}>Gráfica Adicional Aquí</p></div> */}
      </div>

      {/* --- NUEVA SECCIÓN DE ESTADÍSTICA --- */}
      <h2 style={styles.sectionTitle}>Estadística Detallada</h2>
      <div style={styles.statisticFiltersContainer}>
        <div style={styles.filterGroup}>
          <label htmlFor="filtroEntidad" style={styles.filterLabel}>
            Entidad:
          </label>
          <select
            id="filtroEntidad"
            value={filtroEntidad}
            onChange={(e) => setFiltroEntidad(e.target.value)}
            style={styles.filterSelect}
          >
            {opcionesEntidad.map((opt) => (
              <option key={opt.value || "all-ent"} value={opt.value}>
                {opt.label}
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
            onChange={(e) => setFiltroEspecialidad(e.target.value)}
            style={styles.filterSelect}
          >
            {opcionesEspecialidad.map((opt) => (
              <option key={opt.value || "all-esp"} value={opt.value}>
                {opt.label}
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
            onChange={(e) => setFiltroNivel(e.target.value)}
            style={styles.filterSelect}
          >
            {opcionesNivel.map((opt) => (
              <option key={opt.value || "all-niv"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {(filtroEntidad || filtroEspecialidad || filtroNivel) && (
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
        )}
      </div>

      {isLoadingStats && <p style={styles.message}>Cargando estadística...</p>}
      {!isLoadingStats && statsError && (
        <p style={{ ...styles.errorStyle, textAlign: "center" }}>
          {statsError}
        </p>
      )}
      {!isLoadingStats && !statsError && dataEstadistica.length === 0 && (
        <p style={styles.message}>
          No hay datos de estadística agrupada para los filtros aplicados.
        </p>
      )}

      {dataEstadistica.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.dataTable}>
            <thead>
              <tr>
                <th style={styles.dataTableTh}>Entidad</th>
                <th style={styles.dataTableTh}>Especialidad</th>
                <th style={styles.dataTableTh}>Nivel de Atención</th>
                <th style={{ ...styles.dataTableTh, textAlign: "center" }}>
                  Cantidad Doctores
                </th>
              </tr>
            </thead>
            <tbody>
              {dataEstadistica.map((item, index) => (
                <tr
                  key={
                    item.rowId ||
                    `${item.entidad}-${item.especialidad}-${item.nivel_atencion}-${index}`
                  }
                  style={index % 2 === 0 ? {} : styles.dataTableTrEven}
                >
                  <td style={styles.dataTableTd}>{item.entidad}</td>
                  <td style={styles.dataTableTd}>{item.especialidad}</td>
                  <td style={styles.dataTableTd}>{item.nivel_atencion}</td>
                  <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                    {" "}
                    {item.cantidad}{" "}
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
            Total de Doctores (con filtros aplicados): {totalDoctorsInGroups}
          </div>
          {totalPagesEstadistica > 1 && (
            <div style={styles.paginationControls}>
              <button
                onClick={handlePreviousPageEstadistica}
                disabled={currentPageEstadistica === 0 || isLoadingStats}
                style={{
                  ...styles.button,
                  ...((currentPageEstadistica === 0 || isLoadingStats) &&
                    styles.buttonDisabled),
                }}
              >
                {" "}
                Anterior{" "}
              </button>
              <span>
                Página {currentPageEstadistica + 1} de {totalPagesEstadistica}{" "}
                (Total Grupos: {totalGroupsEstadistica})
              </span>
              <button
                onClick={handleNextPageEstadistica}
                disabled={
                  currentPageEstadistica >= totalPagesEstadistica - 1 ||
                  isLoadingStats
                }
                style={{
                  ...styles.button,
                  ...((currentPageEstadistica >= totalPagesEstadistica - 1 ||
                    isLoadingStats) &&
                    styles.buttonDisabled),
                }}
              >
                {" "}
                Siguiente{" "}
              </button>
            </div>
          )}
        </div>
      )}
      {/* --- TABLAS DINÁMICAS DE ESPECIALIDADES --- */}
      <h2 style={styles.sectionTitle}>
        Distribución de Doctores por Especialidades
      </h2>

      {loadingEspecialidades && (
        <p style={styles.message}>Cargando especialidades...</p>
      )}
      {errorEspecialidades && (
        <p style={styles.errorStyle}>{errorEspecialidades}</p>
      )}

      {!loadingEspecialidades &&
        !errorEspecialidades &&
        especialidadesAgrupadas.map((grupo) => (
          <div key={grupo.tipo} style={{ marginBottom: "30px" }}>
            <h3 style={styles.subSectionTitle}>
              {grupo.tipo === "BASICAS"
                ? "Especialidades Básicas"
                : grupo.tipo === "QUIRURGICAS"
                ? "Especialidades Quirúrgicas"
                : "Especialidades Médicas"}
            </h3>

            <div style={styles.tableContainer}>
              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={styles.dataTableTh}>Especialidad</th>
                    <th style={{ ...styles.dataTableTh, textAlign: "center" }}>
                      Número de Doctores
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.especialidades.map((especialidad, index) => (
                    <tr
                      key={`${grupo.tipo}-${especialidad.nombre}`}
                      style={index % 2 === 0 ? styles.dataTableTrEven : {}}
                    >
                      <td style={styles.dataTableTd}>{especialidad.nombre}</td>
                      <td
                        style={{ ...styles.dataTableTd, textAlign: "center" }}
                      >
                        {especialidad.total_doctores.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr
                    style={{ backgroundColor: "#f8f9fa", fontWeight: "bold" }}
                  >
                    <td style={styles.dataTableTd}>Total</td>
                    <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                      {grupo.total.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {/* --- TABLA DE NIVELES DE ATENCIÓN --- */}
      <h2 style={styles.sectionTitle}>Profesionales por Nivel de Atención</h2>

      {loadingNiveles && (
        <p style={styles.message}>Cargando niveles de atención...</p>
      )}
      {errorNiveles && <p style={styles.errorStyle}>{errorNiveles}</p>}

      {!loadingNiveles && !errorNiveles && (
        <div style={styles.tableContainer}>
          <table style={styles.dataTable}>
            <thead>
              <tr>
                <th style={styles.dataTableTh}>Nivel de Atención</th>
                <th style={{ ...styles.dataTableTh, textAlign: "center" }}>
                  Número de Doctores
                </th>
              </tr>
            </thead>
            <tbody>
              {nivelesAtencion.map((nivel, index) => (
                <tr
                  key={nivel.nivel_atencion}
                  style={index % 2 === 0 ? styles.dataTableTrEven : {}}
                >
                  <td style={styles.dataTableTd}>{nivel.nivel_atencion}</td>
                  <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                    {nivel.total_doctores.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr style={{ backgroundColor: "#f8f9fa", fontWeight: "bold" }}>
                <td style={styles.dataTableTd}>Total</td>
                <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                  {nivelesAtencion
                    .reduce((sum, nivel) => sum + nivel.total_doctores, 0)
                    .toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* --- TABLAS DE CÉDULAS PROFESIONALES --- */}
      <h2 style={styles.sectionTitle}>Cédulas Profesionales</h2>

      {loadingCedulas && (
        <p style={styles.message}>Cargando datos de cédulas...</p>
      )}
      {errorCedulas && <p style={styles.errorStyle}>{errorCedulas}</p>}

      {!loadingCedulas && !errorCedulas && cedulasData && (
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          {/* Tabla de Cédulas de Licenciatura */}
          <div style={{ flex: 1, minWidth: "300px" }}>
            <h3 style={styles.subSectionTitle}>Cédula de Licenciatura</h3>
            <div style={styles.tableContainer}>
              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={styles.dataTableTh}>Estatus</th>
                    <th style={{ ...styles.dataTableTh, textAlign: "center" }}>
                      Número de Doctores
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.dataTableTrEven}>
                    <td style={styles.dataTableTd}>Con cédula</td>
                    <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                      {cedulasData.con_licenciatura.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td style={styles.dataTableTd}>Sin cédula</td>
                    <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                      {cedulasData.sin_licenciatura.toLocaleString()}
                    </td>
                  </tr>
                  <tr
                    style={{ backgroundColor: "#f8f9fa", fontWeight: "bold" }}
                  >
                    <td style={styles.dataTableTd}>Total</td>
                    <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                      {cedulasData.total_doctores.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla de Cédulas de Especialidad */}
          <div style={{ flex: 1, minWidth: "300px" }}>
            <h3 style={styles.subSectionTitle}>Cédula de Especialidad</h3>
            <div style={styles.tableContainer}>
              <table style={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={styles.dataTableTh}>Estatus</th>
                    <th style={{ ...styles.dataTableTh, textAlign: "center" }}>
                      Número de Doctores
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={styles.dataTableTrEven}>
                    <td style={styles.dataTableTd}>Con cédula</td>
                    <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                      {cedulasData.con_especialidad.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td style={styles.dataTableTd}>Sin cédula</td>
                    <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                      {cedulasData.sin_especialidad.toLocaleString()}
                    </td>
                  </tr>
                  <tr
                    style={{ backgroundColor: "#f8f9fa", fontWeight: "bold" }}
                  >
                    <td style={styles.dataTableTd}>Total</td>
                    <td style={{ ...styles.dataTableTd, textAlign: "center" }}>
                      {cedulasData.total_doctores.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GraficasPage;
