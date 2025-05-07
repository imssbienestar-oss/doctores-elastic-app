// src/components/GraficasPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveTreeMap } from "@nivo/treemap";
import { ResponsivePie } from "@nivo/pie";

function GraficasPage() {
  const { isAuthenticated, isGuestMode, token, logout: authLogout } = useAuth();
  const [dataPorEstado, setDataPorEstado] = useState([]);
  const [dataPorEspecialidad, setDataPorEspecialidad] = useState({ name: "root", children: [] }); // Inicializar con estructura base para TreeMap
  const [dataPorEstatus, setDataPorEstatus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // pieData ahora simplemente usa dataPorEstatus, ya que la transformación se hará en el fetch.
  const pieData = useMemo(() => dataPorEstatus, [dataPorEstatus]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated && !isGuestMode) {
        setError("No autorizado para ver esta página.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      const headers = {};
      if (isAuthenticated && token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const apiUrlBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

      try {
        const endpoints = [
          {
            url: `${apiUrlBase}/api/graficas/doctores_por_estado`,
            setter: setDataPorEstado,
            transform: (apiData) => // Para ResponsiveBar
              Array.isArray(apiData)
                ? apiData.map(item => ({
                    id: String(item.label || item.id || 'Desconocido'), // Nivo Bar usa 'id' para indexBy
                    label: String(item.label || item.id || 'Desconocido'), // Para tooltips o si se necesita
                    value: Number(item.value) || 0,
                  }))
                : [],
            name: "estado",
          },
          {
            url: `${apiUrlBase}/api/graficas/doctores_por_especialidad`,
            setter: setDataPorEspecialidad,
            transform: (apiData) => { // Para ResponsiveTreeMap
              const children = Array.isArray(apiData)
                ? apiData.map((item) => ({
                    name: String(item.label || 'Desconocido'), // 'name' es la identidad para TreeMap
                    value: Number(item.value) || 0,
                  }))
                : [];
              return { // Siempre devolver la estructura de objeto que espera TreeMap
                name: "Especialidades", // Nodo raíz
                children: children,
              };
            },
            name: "especialidad",
          },
          {
            url: `${apiUrlBase}/api/graficas/doctores_por_estatus`,
            setter: setDataPorEstatus,
            transform: (apiData) => // Para ResponsivePie
              Array.isArray(apiData)
                ? apiData.map(item => ({
                    id: String(item.label || item.id || 'Desconocido'), // Nivo Pie usa 'id'
                    label: String(item.label || item.id || 'Desconocido'), // Y 'label' para la leyenda
                    value: Number(item.value) || 0,
                  }))
                : [],
            name: "estatus",
          },
        ];

        const responses = await Promise.all(
          endpoints.map(ep => fetch(ep.url, { headers }))
        );

        for (let i = 0; i < responses.length; i++) {
          const response = responses[i];
          const endpoint = endpoints[i];
          if (!response.ok) {
            if (response.status === 401 && isAuthenticated) {
              setError("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
              authLogout();
              throw new Error(`Error ${endpoint.name}: ${response.statusText} (Sesión expirada)`);
            } else if (response.status === 401 && isGuestMode) {
              setError(`Acceso denegado para invitados al recurso: ${endpoint.name}. Revisa el backend.`);
              throw new Error(`Error ${endpoint.name}: ${response.statusText} (Acceso denegado para invitados)`);
            }
            const errorData = await response.json().catch(() => null);
            const detail = errorData?.detail || response.statusText;
            throw new Error(`Error ${endpoint.name}: ${response.status} ${detail}`);
          }
        }

        const allJsonData = await Promise.all(responses.map(res => res.json()));

        allJsonData.forEach((data, index) => {
          const endpoint = endpoints[index];
          endpoint.setter(endpoint.transform(data));
        });

      } catch (err) {
        //console.error("Error obteniendo datos para gráficas:", err);
        if (!error) {
          setError(err.message || "Error al cargar datos para las gráficas.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isGuestMode, token, authLogout]);

  if (isLoading) return <p style={{ textAlign: 'center', marginTop: '50px' }}>Cargando gráficas...</p>;
  // Mostrar error solo si no hay datos específicos que ya se pudieron cargar.
  // A veces un endpoint puede fallar pero otros no.
  if (error && dataPorEstado.length === 0 && dataPorEspecialidad.children.length === 0 && dataPorEstatus.length === 0) {
    return <p style={{ color: "red", textAlign: 'center', marginTop: '50px' }}>{error}</p>;
  }
  if (!isLoading && !error && dataPorEstado.length === 0 && dataPorEspecialidad.children.length === 0 && dataPorEstatus.length === 0) {
    return <p style={{ textAlign: 'center', marginTop: '50px' }}>No hay datos disponibles para mostrar en las gráficas.</p>;
  }


  const pageContainerStyle = { padding: "20px", paddingTop: "80px" };
  const chartBaseStyle = {
    height: "450px",
    width: "90%",
    maxWidth: "900px",
    margin: "30px auto 60px auto",
    background: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
  };
  const treemapLayoutContainerStyle = { ...chartBaseStyle, display: "flex", flexDirection: "row", gap: "20px", height: "550px" };
  const treemapChartStyle = { flex: 2, height: "90%" };
  const treemapLegendStyle = { flex: 1, padding: "10px", borderLeft: "1px solid #ddd", overflowY: "auto", height: "100%", background: '#fff', borderRadius: '4px' };
  const pieChartContainerStyle = { ...chartBaseStyle, height: "450px", maxWidth: "900px" };

  return (
    <div style={pageContainerStyle}>
      <h1 style={{ textAlign: "center", marginBottom: "40px", marginTop:"-50px" }}>Dashboard de Gráficas</h1>
      {error && <p style={{ color: "red", textAlign: 'center', marginBottom: '20px' }}>Error parcial: {error}</p>}


      {dataPorEstatus.length > 0 ? (
        <div style={pieChartContainerStyle}>
          <h2 style={{ textAlign: "center" }}>Distribución por Estatus</h2>
          <ResponsivePie
            data={pieData} // pieData ya está formateado por el useMemo/transform
            margin={{ top: 20, right: 80, bottom: 130, left: 80 }}
            innerRadius={0.4}
            padAngle={2}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            colors={{ scheme: "category10" }}
            borderWidth={1}
            borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: "color" }}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: "color", modifiers: [["darker", 3]] }}
            tooltip={({ datum: { id, value, color, label } }) => (
              <div style={{ padding: "5px 10px", background: "white", color: "#333", border: "1px solid #ccc", borderRadius: "3px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <strong style={{ color: color }}>{label || id}:</strong> {value}
              </div>
            )}
            legends={[{ anchor: "right", direction: "column", justify: false, translateX: 0, translateY: 0, itemsSpacing: 20, itemWidth: 100, itemHeight: 28, itemTextColor: "#999", itemDirection: "left-to-right", itemOpacity: 1, symbolSize: 18, symbolShape: "circle", effects: [{ on: "hover", style: { itemTextColor: "#000" }}]}]}
          />
        </div>
      ) : !isLoading && !error && <p style={{ textAlign: "center" }}>No hay datos de estatus para mostrar.</p>}

      {dataPorEstado.length > 0 && (
        <div style={chartBaseStyle}> {/* Usar chartBaseStyle */}
          <h2 style={{ textAlign: "center", marginBottom: "10px" }}>Doctores por Estado</h2>
          <ResponsiveBar
            data={dataPorEstado}
            keys={["value"]}
            indexBy="id"
            margin={{ top: 20, right: 30, bottom: 160, left: 60 }}
            padding={0.3}
            valueScale={{ type: "linear" }}
            indexScale={{ type: "band", round: true }}
            colors={{ scheme: "spectral" }}
            borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: -45, legend: "Estado", legendPosition: "middle", legendOffset: 100, truncateTickAt: 15 }}
            axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: "Número de Doctores", legendPosition: "middle", legendOffset: -50 }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
            animate={true}
            motionStiffness={90}
            motionDamping={15}
            tooltip={({ id, value, color, indexValue }) => (
                <div style={{ padding: '5px 10px', background: 'white', color: '#333', border: '1px solid #ccc', borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                    <strong style={{ color }}>{indexValue /* indexValue es el 'id' del eje X */}:</strong> {value}
                </div>
            )}
          />
        </div>
      )}

      {dataPorEspecialidad && dataPorEspecialidad.children && dataPorEspecialidad.children.length > 0 && (
        <div style={treemapLayoutContainerStyle}>
            <div style={treemapChartStyle}>
                <h2 style={{ textAlign: "center", marginBottom: "10px" }}>Doctores por Especialidad (Treemap)</h2>
                <ResponsiveTreeMap
                    data={dataPorEspecialidad} // Ya tiene la estructura { name: "root", children: [...] }
                    identity="name" // 'name' está en los hijos
                    value="value"   // 'value' está en los hijos
                    valueFormat=".0f"
                    margin={{ top: 20, right: 10, bottom: 10, left: 10 }}
                    labelSkipSize={18}
                    labelTextColor={{ from: "color", modifiers: [["brighter", 3]] }}
                     // Esto es correcto y debería funcionar
                    nodeOpacity={0.85}
                    borderWidth={2}
                    borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
                     tooltip={({ node }) => (
                        <div style={{ padding: '5px 10px', background: 'white', color: '#333', border: '1px solid #ccc', borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                            {/* node.id en TreeMap es el 'name' que definiste en los children */}
                            <strong style={{ color: node.color }}>{node.id}:</strong> {node.formattedValue}
                        </div>
                    )}
                />
            </div>
             <div style={treemapLegendStyle}>
                <h4 style={{ marginTop: "10px", marginBottom: "15px", color: "#333", textAlign: "center" }}>
                    Especialidades y Cantidad
                </h4>
                <ol style={{ listStyle: 'none', paddingLeft: "0" }}>
                {[...(dataPorEspecialidad.children || [])] // Asegurar que children existe
                    .sort((a, b) => b.value - a.value)
                    .map((item, index) => (
                    <li key={item.name} style={{ marginBottom: "8px", padding: "6px", backgroundColor: index % 2 === 0 ? "#f0f0f0" : "#ffffff", borderRadius: "3px", fontSize: '0.9em' }}>
                        <strong>{index + 1}. {item.name}</strong>: {item.value}
                    </li>
                    ))}
                </ol>
            </div>
        </div>
      )}
    </div>
  );
}

export default GraficasPage;
