# Cómo ejecutar: Carga ARR + Forecast + Dashboard

Este documento describe cómo correr el **módulo adicional** de Ventas/Descuentos + Forecast IGF sin modificar el flujo existente del bot ni el Dashboard actual.

## Requisitos

- Node.js con dependencias instaladas (`npm install`; se añade `xlsx`).
- PostgreSQL con el schema `arr` y tablas del forecast aplicadas: ejecutar `sql/arr_forecast_schema.sql` en la base.
- IGF ya cargado en `igf.versions` e `igf.compromiso_lines` (para las 3 hojas del dashboard).

## 1. Aplicar el esquema ARR Forecast

En la base de datos (misma que usa el bot):

```bash
psql $DATABASE_URL -f sql/arr_forecast_schema.sql
```

Si cada planta tiene su propia DB, ejecutar este script en cada una.

## 2. Carga diaria ARR (archivo .xlsm por planta)

Estrategia: **borrar el mes objetivo** en las tablas `arr.ventas_diarias_cliente`, `arr.descuentos_diarios_cliente`, `arr.cliente_categoria_mes` y **recargar limpio** desde el archivo.

### Opción A: API (recomendado desde el Dashboard o un script)

- **Endpoint:** `POST /api/arr/load`
- **Auth:** Header `Authorization: Bearer <token>` (mismo JWT del dashboard).
- **Body (JSON):**
  - `plant_code` (obligatorio): código de la planta, ej. `"Puebla"`.
  - `fileBase64` (obligatorio): contenido del archivo ARR.xlsm en Base64.
  - `targetYear`, `targetMonth` (opcionales): si no se envían, el mes se detecta por las fechas del archivo.

Ejemplo con `curl` (sustituir `TOKEN`, `PLANT`, y el base64 del archivo):

```bash
# Generar base64 del archivo (ej. ARR Puebla.xlsm)
B64=$(base64 -w0 "ARR Puebla.xlsm")
curl -s -X POST "https://tu-servidor.com/api/arr/load" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"plant_code\":\"Puebla\",\"fileBase64\":\"$B64\"}"
```

Respuesta esperada: `{ "ok": true, "year": 2026, "month": 3, "ventasCount": ..., "descuentosCount": ..., "catalogCount": ... }`.

### Opción B: Script Node local

Puedes llamar a la función de carga desde un script que use el mismo `pool` o un cliente pg:

```js
const { loadArrFromBuffer } = require("./lib/arr-load");
const fs = require("fs");
const client = await pool.connect();
const buf = fs.readFileSync("./ARR Puebla.xlsm");
const result = await loadArrFromBuffer(client, "Puebla", buf, {});
console.log(result);
client.release();
```

## 3. Calcular forecast mensual

Después de cargar el ARR (o en paralelo si ya hay datos del mes):

- **Endpoint:** `POST /api/arr/forecast`
- **Auth:** Bearer token del dashboard.
- **Body (JSON):** `plant_code`, `year`, `month`. Opcional: `today` (YYYY-MM-DD) para pruebas.

Ejemplo:

```bash
curl -s -X POST "https://tu-servidor.com/api/arr/forecast" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plant_code":"Puebla","year":2026,"month":3}'
```

El forecast se escribe en `arr.forecast_mensual` (por canal/subcanal). Se usa:
- Promedio por día de semana con los **dos últimos días equivalentes** (y backfill del mes anterior si hace falta).
- Días feriados federales con factor **0.50**.
- Se ignora la fecha “hoy”; “ayer” es el último día cerrado.

## 4. Generar el Excel con las 3 hojas del Dashboard

- **Endpoint:** `GET /api/arr/dashboard-excel?year=2026&month=3&plant_code=Puebla`
- **Auth:** Bearer token del dashboard.
- **Query:** `year`, `month` obligatorios; `plant_code` opcional (si no se envía, se usan todas las plantas con forecast en esa DB).

Ejemplo:

```bash
curl -s -o Dashboard_ARR_2026_3.xlsx \
  -H "Authorization: Bearer TOKEN" \
  "https://tu-servidor.com/api/arr/dashboard-excel?year=2026&month=3&plant_code=Puebla"
```

El Excel incluye:

- **Hoja A – Provincia Venta Diaria:** tabla por día (reales + proyectados), filas resumen ACUM, PROM, PROY, Comp, Dif Comp (Comp = compromiso IGF total mensual Provincia).
- **Hoja B – Provincia Comisiones:** descuento/kg por día; ACUM = ratio acumulado sum(descuento)/sum(kg).
- **Hoja C – IGF Ejecutivo:** bloque Provincia (V1, vMax, Forecast, deltas $/kg y MXN), bloque Centro (V1 vs vMax), totales.

**Zona Provincia:** por defecto se consideran todas las empresas del IGF del mes. Para restringir a “solo Provincia”, configurar la variable de entorno:

```bash
ARR_ZONA_PROVINCIA=Puebla,Morelos,Acapulco
```

(lista separada por comas; debe coincidir con los nombres de empresa en IGF).

### Tablas diarias solo Provincia

Para reportes de **venta en toneladas diarias** y **descuento por kilo diario** solo de plantas de provincia se usan:

- **`arr.provincia_plants`** – Lista de códigos de planta considerados "provincia". Se sincroniza desde `ARR_ZONA_PROVINCIA` (env) si está definida; si no, desde **public.plantas**: primeras 6 por `id`, excluyendo Corporativo (se usa `nombre` como plant_code para coincidir con la carga ARR).
- **`arr.venta_toneladas_diarias_provincia`** – Por (plant_code, fecha): venta en toneladas, redondeada a 0. Se rellena desde `arr.ventas_diarias_cliente` (suma de kg/1000 por planta y fecha).
- **`arr.descuento_por_kilo_diario_provincia`** – Por (plant_code, fecha): descuento por kilo en $/kg con 2 decimales (total descuento / total kg del día).

**Cuándo se actualizan:** Tras cada **carga ARR** (`POST /api/arr/load`) se ejecuta el refresh (sincroniza provincia y recalcula las dos tablas). También puedes llamar a **`POST /api/arr/refresh-provincia`** (mismo auth) para refrescar sin subir archivo; la respuesta incluye `provinciaPlants`, `ventaRows` y `descuentoRows`. Para rellenar solo `arr.provincia_plants` desde **public.plantas** (primeras 6, sin Corporativo), ejecutar una vez: `psql $DATABASE_URL -f sql/arr_provincia_plants_seed.sql`. Si en la carga ARR usas la **clave** de la planta (ej. PUEBLA) en vez del nombre, edita ese script y cambia `p.nombre` por `p.clave`.

## 5. Ver el Forecast desde WhatsApp (comando Dashboard)

Cuando un usuario escribe **dashboard** o **dashboard resumen** en WhatsApp, el bot responde con:

1. **Link al Dashboard de Folios** (tablero web, mismo que antes).
2. **Link al Forecast (Ventas/IGF)** del mes actual: al abrirlo en el navegador se descarga el Excel con las 3 hojas.

El enlace del Forecast incluye el token en la URL (`?t=...`), así que al hacer clic (o abrir desde el celular) se descarga el archivo sin tener que poner el token a mano. El token es válido 20 minutos.

**Comandos en WhatsApp:**
- `dashboard` → link al tablero + link Forecast del mes.
- `dashboard resumen` → lo mismo + resumen de folios activos y pendientes ZP.

Si el bot está en un servidor (ej. Render), configura `BASE_URL` o `PUBLIC_URL` con la URL pública del bot (ej. `https://folio-bot.onrender.com`) para que el link del Forecast funcione desde WhatsApp. Si no está configurado, se usa el host de la petición.

## Orden recomendado de ejecución

1. Aplicar `sql/arr_forecast_schema.sql` (una vez por base).
2. **Cada día:** subir el ARR de cada planta (`POST /api/arr/load`).
3. Después de la carga (o cuando se quiera actualizar el forecast): `POST /api/arr/forecast` por planta.
4. Para ver el reporte: escribir **dashboard** en WhatsApp y abrir el segundo link (Forecast), o llamar a `GET /api/arr/dashboard-excel` con token.

## Carga de %HG diario (opcional)

La tabla `arr.hg_diario` (plant_code, fecha, hg_pct) se alimenta aparte (por proceso o script que ustedes tengan). El forecast de variables G y H del IGF usa ese %HG acumulado mensual y el costo de compra del compromiso; la reexpresión completa (regla de tres, K, R, etc.) está contemplada en el diseño y puede ampliarse en `lib/dashboard-arr-forecast.js` (Hoja C) cuando tengan el origen de costo compra y %HG definido en producción.
