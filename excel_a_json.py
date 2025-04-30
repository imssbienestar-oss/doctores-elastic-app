import pandas as pd
import json
import os

# --- Configuración ---
# Asegúrate de que este nombre coincida exactamente con tu archivo Excel
# y que el archivo esté en la misma carpeta que este script.
nombre_archivo_excel = 'doctores.xlsx'
# Nombre que tendrá el archivo JSON de salida
nombre_archivo_json = 'doctores_output.json'
# --- Fin Configuración ---

# Construye la ruta completa al archivo Excel
ruta_excel = os.path.join(os.path.dirname(__file__), nombre_archivo_excel)

print(f"Intentando leer el archivo: {ruta_excel}")

try:
    # Lee el archivo Excel completo en un DataFrame de Pandas
    # Si tu Excel tiene varias hojas y quieres una específica, usa:
    # df = pd.read_excel(ruta_excel, sheet_name='NombreDeLaHoja')
    df = pd.read_excel(ruta_excel)

    print("Archivo Excel leído correctamente.")

    # --- Limpieza y Transformación Opcional ---
    # Aquí puedes añadir código para limpiar los datos si es necesario:
    # Ejemplo: Renombrar columnas para que no tengan espacios o caracteres raros
    # df.rename(columns={'Nombre Doctor': 'nombre_doctor', 'Especialidad Medica': 'especialidad'}, inplace=True)
    # Ejemplo: Manejar valores nulos (NaN) reemplazándolos con strings vacíos u otros valores
    # df.fillna('', inplace=True)
    # Ejemplo: Convertir columnas a tipos específicos si es necesario
    # df['columna_numerica'] = pd.to_numeric(df['columna_numerica'], errors='coerce') # Convierte a número, errores a NaN
    # df['fecha_columna'] = pd.to_datetime(df['fecha_columna'], errors='coerce') # Convierte a fecha, errores a NaT
    # print("Datos limpiados y transformados (si aplica).")
    # --- Fin Limpieza ---

    # Convierte el DataFrame a una lista de diccionarios (formato JSON ideal para Elastic)
    # orient='records' crea [{columna: valor}, {columna: valor}, ...]
    # indent=4 hace que el JSON sea legible (con sangría)
    # force_ascii=False y encoding='utf-8' aseguran que caracteres especiales (acentos, ñ) se guarden correctamente.
    print("Convirtiendo DataFrame a JSON...")
    datos_json_lista = df.to_dict(orient='records')

    # Construye la ruta completa al archivo JSON de salida
    ruta_json = os.path.join(os.path.dirname(__file__), nombre_archivo_json)

    # Guarda la lista de diccionarios en un archivo JSON
    with open(ruta_json, 'w', encoding='utf-8') as f:
        # json.dump escribe la estructura Python (lista de dicts) a un archivo JSON
        # ensure_ascii=False es crucial para caracteres no ingleses
        # indent=4 para formato legible
        json.dump(datos_json_lista, f, ensure_ascii=False, indent=4)

    print(f"¡Éxito! Los datos se han guardado en: {ruta_json}")

except FileNotFoundError:
    print(f"Error: No se encontró el archivo Excel '{nombre_archivo_excel}'.")
    print("Asegúrate de que el archivo está en la misma carpeta que el script y el nombre es correcto.")
except Exception as e:
    print(f"Ocurrió un error inesperado: {e}")