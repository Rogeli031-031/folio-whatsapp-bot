# Forecast (Ventas/IGF): paso a paso

Guía corta para entender el flujo y **ver el dashboard del Forecast desde WhatsApp**.

---

## Resumen en 4 pasos

| Paso | Qué hace | Dónde |
|------|----------|--------|
| 1 | Crear tablas del forecast en la base | Una vez: `psql` con `sql/arr_forecast_schema.sql` |
| 2 | Cargar el ARR del mes (por planta) | Cada día: API `POST /api/arr/load` o script |
| 3 | Calcular el forecast del mes | Cada día o cuando quieras: API `POST /api/arr/forecast` |
| 4 | **Ver el dashboard (Excel con 3 hojas)** | **WhatsApp: escribe `dashboard` y abre el link “Forecast”** |

---

## Paso 1: Dejar lista la base de datos (una vez)

En la misma base que usa el bot:

```bash
psql $DATABASE_URL -f sql/arr_forecast_schema.sql
```

Eso crea el schema `arr` y las tablas: ventas diarias, descuentos, cliente_categoria_mes, hg_diario, forecast_mensual.

---

## Paso 2: Cargar el ARR (cada día, por planta)

Subes el archivo **ARR.xlsm** (ej. ARR Puebla.xlsm) para que el sistema tenga ventas y descuentos del mes.

- **Quién:** un proceso, el dashboard web o un script.
- **Cómo:** `POST /api/arr/load` con `plant_code` y el archivo en Base64 (o buffer).
- **Efecto:** se borra el mes en ventas/descuentos/categoría y se vuelve a cargar con los datos del Excel.

Sin este paso no hay datos para el forecast ni para las hojas del Excel.

---

## Paso 3: Calcular el forecast (cada día o cuando quieras)

Con los datos ya cargados, se calcula el forecast del mes (por planta, canal, subcanal).

- **Quién:** mismo proceso que carga el ARR o un cron.
- **Cómo:** `POST /api/arr/forecast` con `plant_code`, `year`, `month`.
- **Efecto:** se llena/actualiza `arr.forecast_mensual` (kg y descuento actual, proyectado y forecast).

Sin este paso el Excel se puede generar, pero las columnas “proyectado” y “forecast” no tendrán datos nuevos.

---

## Paso 4: Ver el dashboard del Forecast (desde WhatsApp)

Aquí es donde **aparece en el dashboard con el comando en WhatsApp**:

1. En WhatsApp escribes: **`dashboard`** (o **`dashboard resumen`**).
2. El bot te contesta con dos enlaces:
   - **Primer enlace:** Dashboard de Folios (tablero web de siempre).
   - **Segundo enlace:** **“Forecast (Ventas/IGF AÑO/MES)”**.
3. Abres el **segundo enlace** (Forecast) en el navegador o en el celular.
4. Se descarga un archivo Excel (`.xlsx`) con **3 hojas**:
   - **Provincia Venta Diaria:** venta por día, ACUM, PROM, PROY, Comp, Dif Comp.
   - **Provincia Comisiones:** descuento/kg por día y ACUM.
   - **IGF Ejecutivo:** V1, vMax, Forecast y deltas por planta (Provincia y Centro).

El enlace lleva el token en la URL (`?t=...`), así que no tienes que poner usuario/contraseña; el token dura 20 minutos.

---

## Comandos en WhatsApp (resumen)

| Comando | Respuesta |
|--------|-----------|
| **dashboard** | Link al tablero de folios + **link al Forecast del mes** (descarga Excel). |
| **dashboard resumen** | Lo mismo + resumen de folios activos y pendientes ZP. |

No hay un comando aparte tipo “forecast”: el Forecast **aparece en la misma respuesta** del comando **dashboard**.

---

## Si el link del Forecast no abre o no descarga

- El bot debe ser accesible por URL (ej. en Render, Heroku, etc.).
- Configura en el servidor la variable de entorno **`BASE_URL`** (o **`PUBLIC_URL`**) con la URL pública del bot, por ejemplo:
  - `BASE_URL=https://folio-bot.onrender.com`
  Así el link que manda WhatsApp apunta a tu servidor y la descarga del Excel funciona al hacer clic.

---

## Orden recomendado (día a día)

1. Cargar ARR de cada planta (`POST /api/arr/load`).
2. Calcular forecast de cada planta (`POST /api/arr/forecast`).
3. Cuando alguien quiera ver el reporte: que escriba **dashboard** en WhatsApp y abra el link **“Forecast (Ventas/IGF …)”**.

Más detalle técnico (API, curl, variables de entorno) está en **ARR_FORECAST_RUN.md**.
