import React, { useState, useEffect } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import { ResponsiveLine } from "@nivo/line";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const AsistenciaChart = ({ idImss }) => {
  const { token } = useAuth();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!idImss || !token) return;

    const fetchAsistencia = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/doctores/${idImss}/asistencia_anual`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Error al cargar la asistencia");
        
        const result = await response.json();
        const añoActual = new Date().getFullYear().toString();
        const datosDelAnioActual = result.filter(item => item.mes.includes(añoActual));

        setData(datosDelAnioActual);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el historial de asistencia.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAsistencia();
  }, [idImss, token]);

  if (isLoading) return <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>Cargando asistencia...</div>;
  if (error) return <div style={{ padding: "20px", textAlign: "center", color: "red" }}>{error}</div>;
  if (data.length === 0) return <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>Sin datos de asistencia registrados.</div>;

  // Nivo Line requiere que los datos estén agrupados bajo un "id" (Serie)
  const lineData = [
    {
      id: "Días Activos",
      data: data.map(d => ({
        x: d.mes,
        y: d.dias_activos,
        dias_mes: d.dias_mes
      }))
    }
  ];

  return (
    <div style={{ height: "350px", width: "100%", minWidth: 0, boxSizing: "border-box", backgroundColor: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #eee" }}>
      <h4 style={{ textAlign: "center", margin: "0 0 15px 0", color: "#006657" }}>Días Activos por Mes</h4>
      <ResponsiveLine
        data={lineData}
        margin={{ top: 20, right: 20, bottom: 60, left: 40 }} // <-- Aumentamos "bottom" a 60 para que no corte los meses
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 0,
          max: 35, // Ponemos 35 de tope para que la gráfica respire arriba y el 31 no toque el techo
          stacked: false,
          reverse: false
        }}
        curve="monotoneX" // <-- Esto hace que la línea sea curva y suave como unas colinas
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45, // Inclinamos el texto a 45 grados para que quepan todos
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          tickValues: [0, 5, 10, 15, 20, 25, 31], // Obligamos al eje Y a mostrar estos números exactos
        }}
        enableArea={true} // <-- Rellena el color transparente debajo de la curva
        areaOpacity={0.15}
        colors={["#7A243D"]} // <-- Color Guinda institucional similar al de tu captura
        pointSize={8}
        pointColor="#ffffff" // El relleno del puntito es blanco
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }} // El borde del puntito toma el color guinda
        useMesh={true}
        tooltip={({ point }) => (
            <div style={{ padding: '8px 12px', background: '#fff', border: '1px solid #ccc', borderRadius: 4 }}>
              <strong style={{ color: "#006657" }}>{point.data.x}</strong>
              <div style={{ fontSize: '0.9em', color: '#333', marginTop: '4px' }}>
                Días activos: <strong>{point.data.y}</strong> / {point.data.dias_mes}
              </div>
            </div>
        )}
        theme={{
          grid: { line: { stroke: "#f0f0f0" } }, // Líneas de fondo suavecitas
          tooltip: { container: { fontSize: "12px", borderRadius: "4px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" } }
        }}
      />
    </div>
  );
};

export default AsistenciaChart;
