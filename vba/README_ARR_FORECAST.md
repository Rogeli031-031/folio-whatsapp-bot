# VBA: Subir ARR Forecast desde Excel

Módulo **ModArrForecastUpload.bas** para ejecutar **dentro** del archivo **ARR Puebla.xlsm**. Sube los datos de las hojas al esquema `arr` (ventas_diarias_cliente, descuentos_diarios_cliente, cliente_categoria_mes).

## Requisitos en el archivo .xlsm

1. **Solo necesitas el módulo modDb** (con DbConnect, ExecSQL, BeginTrans, CommitTrans, RollbackTrans). ModArrForecastUpload ya incluye sus propias funciones de texto/número/fecha; no hace falta modUtils ni modConfig.
2. **modDb** debe usar un DSN ODBC configurado en Windows (Panel de control → Herramientas administrativas → Orígenes de datos ODBC) apuntando a tu PostgreSQL (Render). El nombre del DSN lo define modDb (ej. "RenderFolios" en modConfig del proyecto IGF_Postgres_Upload).

## Cómo agregar el módulo a "ARR Puebla.xlsm"

1. Abre **ARR Puebla.xlsm**.
2. Alt+F11 para abrir el **Editor de VBA**.
3. Si ya existía **ModArrForecastUpload**, elimínalo: clic derecho sobre el módulo → **Eliminar ModArrForecastUpload** → marcar "No exportar" y Aceptar.
4. Menú **Archivo** → **Importar archivo...** (o clic derecho en el proyecto → Importar archivo).
5. Elige el archivo **ModArrForecastUpload.bas** desde la carpeta `folio-whatsapp-bot\vba\` (no copies el código a mano; importar el .bas evita errores de sintaxis por caracteres truncados).
6. Si en ese libro **no** tienes modDb, impórtalo desde `IGF_Postgres_Upload\vba\` (modDb.bas). Si modDb usa DSN_NAME de otro módulo, importa también modConfig.bas para que exista la constante del DSN.

## Cómo ejecutar la subida

1. Abre el archivo del ARR (ej. **ARR Puebla.xlsm**, **ARR Acapulco.xlsm**) con las hojas Total, Notas, Factura, Comision Extra, Categoria con datos.
2. Deja **ese libro como ventana activa** (así la macro usa sus hojas y su nombre para detectar la planta).
3. Alt+F8 (o Desarrollador → Macros).
3. Elige la macro **Subir_ARR_Forecast** y pulsa **Ejecutar**.
4. En los cuadros de diálogo:
   - **Planta:** se rellena solo con el nombre detectado del archivo (ej. “ARR Puebla.xlsm” → Puebla, “ARR Acapulco.xlsm” → Acapulco). Puedes cambiarlo si hace falta.
   - **Año:** ej. 2026.
   - **Mes:** ej. 3.
5. Aceptar. La macro borra ese mes en las tablas `arr` y vuelve a cargar desde las hojas. Al final mostrará “ARR Forecast subido correctamente”.

## Qué hace la macro

- Borra en la base los datos del mes indicado en: `arr.ventas_diarias_cliente`, `arr.descuentos_diarios_cliente`, `arr.cliente_categoria_mes`.
- Lee las hojas **Total**, **Notas**, **Factura**, **Comision Extra**, **Categoria**.
- Aplica las mismas reglas que el script Node (cliente normalizado, descuento contado, Notas por fecha vencimiento, Factura × 1.16, etc.).
- Inserta de nuevo ese mes en las tres tablas.

Después de subir, puedes calcular el forecast desde Node (`POST /api/arr/forecast`) o desde el script `upload-arr-puebla.js`, y ver el dashboard desde WhatsApp (comando **dashboard** → link Forecast).
