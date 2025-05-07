// src/components/GraficasPage.jsx
import React, { useState, useEffect } from "react";
import { ResponsiveBar } from "@nivo/bar"; // Importa el componente de gráfico de barras
import { ResponsiveTreeMap } from "@nivo/treemap";
import { ResponsivePie } from "@nivo/pie";

function GraficasPage() {
  const [dataPorEstado, setDataPorEstado] = useState([]);
  const [dataPorEspecialidad, setDataPorEspecialidad] = useState([]);
  const [dataPorEstatus, setDataPorEstatus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError("");
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("No autenticado.");
        setIsLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const apiUrlBase =
        import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

      try {
        // Obtener datos por estado
        const responseEstado = await fetch(
          `${apiUrlBase}/api/graficas/doctores_por_estado`,
          { headers }
        );
        if (!responseEstado.ok)
          throw new Error(`Error estado: ${responseEstado.statusText}`);
        const estadoData = await responseEstado.json();
        // Nivo Bar a menudo espera que la 'label' se llame 'id' o el nombre de la key que uses para el index.
        // Y el valor sea una key numérica (ej. 'value'). Ajustamos el formato aquí.
        setDataPorEstado(
          estadoData.map((item) => ({ ...item, id: item.label }))
        ); // Añadimos 'id' para Nivo

        // Obtener datos por especialidad (similar)
        const responseEspecialidad = await fetch(
          `${apiUrlBase}/api/graficas/doctores_por_especialidad`,
          { headers }
        );
        if (!responseEspecialidad.ok)
          throw new Error(
            `Error especialidad: ${responseEspecialidad.statusText}`
          );
        const especialidadData = await responseEspecialidad.json();
        // Formatear datos para treemap
        const treeMapData = {
          name: "Especialidades",
          children: especialidadData.map((item) => ({
            name: item.label,
            value: item.value,
          })),
        };
        setDataPorEspecialidad(treeMapData);

        // --- NUEVO: Obtener datos por estatus para Gráfico de Pastel ---
        const responseEstatus = await fetch(
          `${apiUrlBase}/api/graficas/doctores_por_estatus`, // Endpoint para activos/inactivos
          { headers }
        );
        if (!responseEstatus.ok) {
          throw new Error(`Error estatus: ${responseEstatus.statusText}`);
        }
        const estatusData = await responseEstatus.json();
        // Nivo Pie espera un array de objetos con 'id', 'label', y 'value'.
        // Asegúrate que tu API devuelva esto o ajústalo aquí.
        // Por ejemplo, si la API devuelve { "estatus_nombre": "Activo", "total": 3500 }
        // const transformedEstatusData = estatusData.map(item => ({
        //    id: item.estatus_nombre,
        //    label: item.estatus_nombre, // O una etiqueta más descriptiva
        //    value: item.total
        // }));
        // setDataPorEstatus(transformedEstatusData);
        // Si la API ya devuelve el formato { id, label, value }, es directo:
        setDataPorEstatus(estatusData);
        // console.log("Datos para Pie Chart (Estatus):", JSON.stringify(estatusData, null, 2));
      } catch (err) {
        console.error("Error obteniendo datos para gráficas:", err);
        setError("Error al cargar datos para las gráficas.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) return <p>Cargando gráficas...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  // Estilo para el contenedor del gráfico para que Nivo funcione bien responsive
  const chartContainerStyle = {
    height: "400px",
    width: "80%",
    margin: "80px auto",
  };

  const pieChartContainerStyle = {
    // Estilo específico para el gráfico de pastel
    height: "400px",
    width: "70%",
    maxWidth: "550px",
    margin: "40px auto",
  };

  return (
    <div>
      <h2>Dashboard de Gráficas</h2>

      {dataPorEstado.length > 0 && (
        <div style={chartContainerStyle}>
          <h3>Doctores por Estado</h3>
          <ResponsiveBar
            data={dataPorEstado}
            keys={["value"]} // La key del dato numérico a graficar
            indexBy="label" // La key del dato que va en el eje de categorías (X o Y)
            margin={{ top: 10, right: 50, bottom: 120, left: 50 }} // Ajustar márgenes para labels
            padding={0.3}
            valueScale={{ type: "linear" }}
            indexScale={{ type: "band", round: true }}
            colors={{ scheme: "nivo" }}
            borderColor={{ from: "color", modifiers: [["darker", 100]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 1,
              tickRotation: 45,
              legend: "Estado",
              legendPosition: "middle",
              legendOffset: 112,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 1,
              tickRotation: 0,
              legend: "Número de Doctores",
              legendPosition: "middle",
              legendOffset: -40, // Ajustar para que no se corte
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: "color", modifiers: [["darker", 100]] }}
            legends={
              [
                /* ... configuraciones de leyenda si quieres ... */
              ]
            }
            role="application"
            ariaLabel="Gráfico de barras de doctores por estado"
            // layout="horizontal" // Descomenta para barras horizontales
          />
        </div>
      )}
      <h3>Doctores por Especialidad</h3>
      {dataPorEspecialidad.children &&
        dataPorEspecialidad.children.length > 0 && (
          <div style={{ display: "flex", ...chartContainerStyle }}>
            {/* Treemap con números */}
            <div style={{ flex: 3 }}>
              <ResponsiveTreeMap
                data={dataPorEspecialidad}
                identity="name"
                value="value"
                valueFormat=".0f"
                margin={{ right: 10, bottom: 10, left: 10 }}
                label={(node) => {
                  // Encontramos el índice correcto en los datos ordenados
                  const sortedData = [...dataPorEspecialidad.children].sort(
                    (a, b) => b.value - a.value
                  );
                  const index = sortedData.findIndex(
                    (item) => item.name === node.id
                  );
                  return `#${index + 1}`;
                }}
                labelSkipSize={15}
                labelTextColor={{ from: "color", modifiers: [["brighter", 3]] }}
                colors={{ scheme: "spectral" }}
                nodeOpacity={0.8}
                borderWidth={1}
                borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
                tooltip={({ node }) => {
                  const sortedData = [...dataPorEspecialidad.children].sort(
                    (a, b) => b.value - a.value
                  );
                  const index = sortedData.findIndex(
                    (item) => item.name === node.id
                  );
                  return (
                    <div
                      style={{
                        padding: 12,
                        background: "white",
                        borderRadius: 4,
                        boxShadow: "0 3px 9px rgba(0,0,0,0.15)",
                        fontWeight: 600,
                      }}
                    >
                      <div style={{ color: node.color, fontSize: "1.1em" }}>
                        #{index + 1}: {node.id}
                      </div>
                      <div style={{ marginTop: 4, fontSize: "1.2em" }}>
                        {node.formattedValue} doctores
                      </div>
                    </div>
                  );
                }}
              />
            </div>

            {/* Leyenda numerada - ahora mantiene el mismo orden que el gráfico */}
            <div
              style={{
                flex: 1,
                padding: "20px",
                overflowY: "auto",
                maxHeight: "500px",
                borderLeft: "1px solid #eee",
                marginLeft: "20px",
              }}
            >
              <h4 style={{ marginBottom: "15px", color: "#555" }}>
                Referencia de especialidades
              </h4>
              <ol style={{ paddingLeft: "20px" }}>
                {[...dataPorEspecialidad.children]
                  .sort((a, b) => b.value - a.value) // Orden descendente por cantidad
                  .map((item, index) => (
                    <li
                      key={item.name}
                      style={{
                        marginBottom: "8px",
                        padding: "5px",
                        backgroundColor: index % 2 === 0 ? "#f8f8f8" : "white",
                        borderRadius: "4px",
                      }}
                    >
                      {item.name}
                      <div
                        style={{
                          fontSize: "0.85em",
                          color: "#666",
                          marginTop: "2px",
                        }}
                      >
                        ({item.value} doctores)
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
          </div>
        )}

      {/* --- GRÁFICO DE PASTEL POR ESTATUS --- */}
      {dataPorEstatus.length > 0 ? (
        <div style={pieChartContainerStyle}>
          <h3 style={{ textAlign: "center", marginBottom: "20px" }}>
            Distribución por Estatus (Activos/Inactivos)
          </h3>
          <ResponsivePie
            data={dataPorEstatus} // Ej: [{ id: 'Activos', label: 'Activos', value: 100 }, { id: 'Inactivos', label: 'Inactivos', value: 20 }]
            margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
            innerRadius={0.5} // 0 para Pie, >0 para Donut
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            colors={{ scheme: "paired" }} // Buen esquema para pocas categorías. Otras: 'set2', 'pastel1'
            // O puedes definir colores manualmente: colors={['green', 'red']} si sabes el orden
            // o colors={{ datum: 'data.color' }} y añadir 'color' a tus objetos de datos
            borderWidth={1}
            borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: "color" }}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
            tooltip={({ datum: { id, value, color, label } }) => (
              <div
                style={{
                  padding: "10px 12px",
                  background: "white",
                  color: "#333333",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  boxShadow: "0 3px 5px rgba(0,0,0,0.1)",
                }}
              >
                <strong style={{ color: color }}>{label || id}:</strong> {value}
              </div>
            )}
            legends={[
              {
                anchor: "bottom",
                direction: "row",
                justify: false,
                translateX: 0,
                translateY: 56,
                itemsSpacing: 2, // Espacio entre items de leyenda
                itemWidth: 100,
                itemHeight: 18,
                itemTextColor: "#999",
                itemDirection: "left-to-right",
                itemOpacity: 1,
                symbolSize: 18,
                symbolShape: "circle",
                effects: [{ on: "hover", style: { itemTextColor: "#000" } }],
              },
            ]}
          />
        </div>
      ) : (
        !isLoading && (
          <p style={{ textAlign: "center" }}>
            No se encontraron datos de estatus para mostrar.
          </p>
        )
      )}
    </div>
  );
}

export default GraficasPage;
