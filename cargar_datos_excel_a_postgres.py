import pandas as pd
import psycopg2
import os
import numpy as np # Para manejar NaNs/NaTs correctamente

# --- Configuración ---
nombre_archivo_excel = 'doctores.xlsx' # O el nombre correcto de tu Excel
# --- ¡¡¡TUS CREDENCIALES DE RAILWAY AQUÍ!!! ---
# (Más adelante veremos cómo poner esto en variables de entorno por seguridad)
db_host = 'hopper.proxy.rlwy.net'
db_port = '39952 ' # Generalmente 5432
db_name = 'railway' # Ej: railway
db_user = 'postgres' # Ej: postgres
db_password = 'HYIIcVJcZaKHocXLMpWAKZSpfJmqWLhx'
# --- Fin Configuración ---

# Construye la ruta completa al archivo Excel
ruta_excel = os.path.join(os.path.dirname(__file__), nombre_archivo_excel)

conn = None # Inicializa la conexión fuera del try
cursor = None # Inicializa el cursor fuera del try

try:
    # --- 1. Leer y Limpiar Datos del Excel ---
    print(f"Leyendo archivo Excel: {ruta_excel}")
    df = pd.read_excel(ruta_excel)
    print(f"Se leyeron {len(df)} registros del Excel.")

    # Renombrar columnas (¡USA LOS NOMBRES LIMPIOS QUE DEFINIMOS!)
    # Es crucial que los nombres aquí coincidan con los usados en SQL
    df.rename(columns={
        'Identificador.IMSS': 'identificador_imss',
        'NOMBRE COMPLETO': 'nombre_completo',
        'Estatus': 'estatus',
        'Matrimonio_id': 'matrimonio_id', # Ajusta nombres según sea necesario
        'CURP': 'curp',
        'CÉDULA ESP': 'cedula_esp',
        'CÉDULA LIC': 'cedula_lic',
        'Especialidad': 'especialidad',
        'Entidad': 'entidad',
        'CLUES SSA': 'clues_ssa',
        'Forma de notificación de baja': 'forma_notificacion_baja',
        'Motivo de baja': 'motivo_baja',
        'Fecha de Extracción': 'fecha_extraccion',
        'Fecha Notificación': 'fecha_notificacion',
        'Sexo': 'sexo',
        'Turno': 'turno', # Ejemplo, ajusta el nombre original
        'CLUES_IB': 'clues_ib',
        'Nombre Unidad': 'nombre_unidad',
        'Municipio': 'municipio',
        'Nivel de Atención': 'nivel_atencion',
        'Fecha Estatus': 'fecha_estatus',
        'Despliegue': 'despliegue',
        'Fecha Vuelo': 'fecha_vuelo',
        'Estrato': 'estrato',
        'Acuerdo': 'acuerdo'
        # Asegúrate de que TODAS las columnas originales estén aquí con su nuevo nombre limpio
    }, inplace=True)
    print("Columnas renombradas.")

    # Convertir columnas de fecha a texto (si lo hicimos en Excel, este paso podría no ser necesario aquí)
    # O convertir a datetime y manejar errores:
    date_columns = ['fecha_notificacion', 'fecha_estatus', 'fecha_vuelo'] # Ajusta esta lista
    for col in date_columns:
        if col in df.columns:
             # Convierte a datetime, los errores se vuelven NaT (Not a Time)
             df[col] = pd.to_datetime(df[col], errors='coerce', dayfirst=True)
    print("Columnas de fecha procesadas.")


    # Reemplazar NaNs/NaTs de Pandas con None de Python para compatibilidad con SQL NULL
    df = df.astype(object).where(pd.notnull(df), None)
    print("Valores faltantes (NaN, NaT) convertidos a None.")


    # --- 2. Conectar a la Base de Datos ---
    print(f"Conectando a la base de datos {db_name} en {db_host}...")
    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        dbname=db_name,
        user=db_user,
        password=db_password
    )
    cursor = conn.cursor()
    print("Conexión exitosa.")

    # --- 3. Crear la Tabla (si no existe) ---
    # ¡Usa los nombres limpios y tipos de datos que definimos/corregimos!
    create_table_query = """
    CREATE TABLE IF NOT EXISTS doctores (
        id SERIAL PRIMARY KEY,
        identificador_imss VARCHAR(100),
        nombre_completo VARCHAR(255),
        estatus VARCHAR(50),
        matrimonio_id VARCHAR(100),
        curp VARCHAR(18),
        cedula_esp VARCHAR(100),
        cedula_lic VARCHAR(100),
        especialidad VARCHAR(255),
        entidad VARCHAR(100),
        clues_ssa VARCHAR(100),
        forma_notificacion_baja TEXT,
        motivo_baja TEXT,
        fecha_extraccion VARCHAR(100),
        fecha_notificacion DATE,
        sexo VARCHAR(10),
        turno VARCHAR(50),
        clues_ib VARCHAR(100),
        nombre_unidad VARCHAR(255),
        municipio VARCHAR(100),
        nivel_atencion VARCHAR(50),
        fecha_estatus DATE,
        despliegue VARCHAR(255),
        fecha_vuelo DATE,
        estrato VARCHAR(100),
        acuerdo VARCHAR(255)
        -- Asegúrate de que todas las columnas estén aquí con su tipo correcto
    );
    """
    cursor.execute(create_table_query)
    conn.commit() # Guardar la creación de la tabla
    print("Tabla 'doctores' asegurada/creada.")

    # --- 4. Insertar/Actualizar Datos ---
    print("Iniciando inserción/actualización de datos...")
    # Preparar consulta de inserción (o UPSERT si quieres actualizar)
    # La cantidad de %s debe coincidir EXACTAMENTE con la cantidad de columnas (excluyendo 'id')
    # El orden de las columnas en INSERT y en los datos que pasamos DEBE COINCIDIR
    insert_query = """
    INSERT INTO doctores (
        identificador_imss, nombre_completo, estatus, matrimonio_id, curp,
        cedula_esp, cedula_lic, especialidad, entidad, clues_ssa,
        forma_notificacion_baja, motivo_baja, fecha_extraccion, fecha_notificacion, sexo,
        turno, clues_ib, nombre_unidad, municipio, nivel_atencion,
        fecha_estatus, despliegue, fecha_vuelo, estrato, acuerdo
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s
    )
    ON CONFLICT (identificador_imss) DO UPDATE SET -- Ejemplo de UPSERT si identificador_imss es único
        nombre_completo = EXCLUDED.nombre_completo,
        estatus = EXCLUDED.estatus,
        -- ... lista todas las columnas que quieres actualizar si el registro ya existe ...
        especialidad = EXCLUDED.especialidad,
        fecha_estatus = EXCLUDED.fecha_estatus;
        -- Si prefieres simplemente ignorar duplicados: ON CONFLICT (identificador_imss) DO NOTHING;
        -- Si prefieres que falle si hay duplicados, quita la cláusula ON CONFLICT.
        -- ¡¡IMPORTANTE!! Para usar ON CONFLICT, la columna (identificador_imss en este ej.)
        -- debe tener una restricción UNIQUE en la base de datos.
        -- CREATE UNIQUE INDEX IF NOT EXISTS idx_identificador_imss_unique ON doctores(identificador_imss);
        -- (Ejecuta esto una vez después de crear la tabla si quieres usar ON CONFLICT)
        -- Por ahora, para simplificar, podríamos solo insertar y asumir que el identificador es único o no importa si se duplica.
        -- Quitemos el ON CONFLICT por ahora para que sea un INSERT simple:
    -- ); -- Quita el ON CONFLICT
    """
    # INSERT simple (sin ON CONFLICT):
    insert_query_simple = """
    INSERT INTO doctores (
        identificador_imss, nombre_completo, estatus, matrimonio_id, curp,
        cedula_esp, cedula_lic, especialidad, entidad, clues_ssa,
        forma_notificacion_baja, motivo_baja, fecha_extraccion, fecha_notificacion, sexo,
        turno, clues_ib, nombre_unidad, municipio, nivel_atencion,
        fecha_estatus, despliegue, fecha_vuelo, estrato, acuerdo
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s
    );
    """


    # Convertir DataFrame a lista de tuplas para inserción eficiente
    # Asegúrate de que el orden de las columnas en 'df_columns' coincida con INSERT y VALUES
    df_columns = [
        'identificador_imss', 'nombre_completo', 'estatus', 'matrimonio_id', 'curp',
        'cedula_esp', 'cedula_lic', 'especialidad', 'entidad', 'clues_ssa',
        'forma_notificacion_baja', 'motivo_baja', 'fecha_extraccion', 'fecha_notificacion', 'sexo',
        'turno', 'clues_ib', 'nombre_unidad', 'municipio', 'nivel_atencion',
        'fecha_estatus', 'despliegue', 'fecha_vuelo', 'estrato', 'acuerdo'
    ]
    # Crear lista de tuplas solo con las columnas necesarias y en el orden correcto
    data_to_insert = [tuple(row[col] for col in df_columns) for index, row in df.iterrows()]

    # Ejecutar inserción (se puede hacer más eficiente con execute_batch)
    # Por ahora, una por una:
    count = 0
    for record in data_to_insert:
        try:
            cursor.execute(insert_query_simple, record)
            count += 1
        except Exception as insert_error:
            print(f"Error insertando registro: {record}")
            print(f"Error: {insert_error}")
            conn.rollback() # Revertir la transacción actual en caso de error en un registro
            # Podrías decidir si continuar con el siguiente registro o detener todo
            # continue

    conn.commit() # Guardar todas las inserciones exitosas
    print(f"Inserción/actualización completada. Se procesaron {count} registros.")

except FileNotFoundError:
    print(f"Error: No se encontró el archivo Excel '{nombre_archivo_excel}'.")
except psycopg2.Error as db_error:
    print(f"Error de base de datos PostgreSQL: {db_error}")
    if conn:
        conn.rollback() # Revertir transacción si falla la conexión o creación de tabla
except Exception as e:
    print(f"Ocurrió un error inesperado: {e}")
    if conn:
        conn.rollback() # Revertir transacción en caso de otros errores

finally:
    # --- 5. Cerrar Conexión ---
    if cursor:
        cursor.close()
        print("Cursor cerrado.")
    if conn:
        conn.close()
        print("Conexión a base de datos cerrada.")