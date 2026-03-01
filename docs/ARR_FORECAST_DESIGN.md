# Diseño: Módulo Ventas/Descuentos + Forecast IGF

## Restricciones

- **No modificar** comandos, funciones, rutas, flujo de folios ni el Dashboard actual del repo.
- Solo **agregar** funcionalidad nueva: carga ARR, forecast mensual, 3 hojas adicionales.
- Integración mínima: nuevas rutas bajo `/api/arr/` y módulos en `lib/` sin tocar `igf-handler.js` ni rutas existentes de dashboard/folios.

## Punto de integración en server.js

- **Conexión DB**: se usa el mismo `pool` (pg) ya existente. Si en producción cada planta tiene su propia DB, se asume que `DATABASE_URL` (o variable por planta) apunta a esa DB; el código filtra por `plant_code` en todas las tablas.
- **Rutas nuevas** (todas opcionales, no afectan comportamiento actual):
  - `POST /api/arr/load` – carga ARR (body: `plant_code`, `file` o `filePath` según implementación).
  - `POST /api/arr/forecast` – calcula forecast del mes (body: `plant_code`, `year`, `month`).
  - `GET /api/arr/dashboard-excel` – genera Excel con 3 hojas (query: `plant_code`, `year`, `month`).
- **IGF**: el módulo solo **lee** de `igf.versions` y `igf.compromiso_lines` (vMax, V1). No escribe en IGF. Las vistas existentes (`v_compromiso_analisis_*`) se siguen usando igual.

## Esquema de tablas (mínimo viable)

Todas en schema `arr`, con `plant_code` en cada tabla para soportar una DB por planta o una DB compartida.

| Tabla | Propósito |
|-------|-----------|
| `arr.ventas_diarias_cliente` | Kg por día por cliente (y canal/subcanal) para ventas. |
| `arr.descuentos_diarios_cliente` | Descuento unificado por día y cliente (siempre negativo). |
| `arr.cliente_categoria_mes` | Catálogo del mes: cliente → canal (Casa/Comisionista), subcanal. |
| `arr.hg_diario` | %HG por fecha (y planta). |
| `arr.forecast_mensual` | Resultado del forecast: por planta, canal, subcanal (actual, proyectado, forecast kg y $). |

Detalle en `sql/arr_forecast_schema.sql`.

## Fuentes ARR.xlsm (resumen)

- **Total**: Fecha, Cliente, Total kilos, Comision $, Comision acumulada $, DIP $, Descuento $ → venta diaria (kg) y descuento contado = -(Comision $ + Comision acumulada $ + DIP $ + Descuento $).
- **Notas**: Cliente, Total firmado, Fecha de vencimiento → descuento en fecha vencimiento (normalizar a negativo).
- **Factura**: Fecha, Cliente, Descuento → (Descuento * 1.16), negativo.
- **Comision Extra**: Cliente, Comisión extraordinaria, Fecha → descuento.
- **Categoria**: Fecha, Cliente, Total kilos, Comisionista (bool), sub canal com → canal/subcanal y ventas por día.

Identificador cliente: nombre normalizado (MAYÚSCULAS, sin acentos, trim, espacios dobles).

## Forecast mensual (reglas)

- Por planta, canal, subcanal.
- Ventas: promedio por día de semana con **solo los dos últimos días equivalentes** (ej. dos últimos lunes) × días restantes de ese DOW en el mes.
- Descuento: mismo método en $; luego descuento/kg = $desc_forecast / kg_forecast.
- Días feriados federales: factor 0.50 en ventas y descuento.
- Canal/subcanal sin histórico → proyectar en 0 hasta que aparezca.
- Ignorar registros con fecha = hoy (día no cerrado). Ayer = último día cerrado.
- Si hoy es día 2 y falta historia: backfill con mes anterior para “dos últimos equivalentes”.

## Dashboard (3 hojas nuevas)

- **Hoja A**: Tabla diaria Zona Provincia – venta diaria (reales + proyectados en gris), resumen ACUM, PROM, PROY, Comp, Dif Comp (Comp = IGF Compromiso total mensual).
- **Hoja B**: Tabla diaria Zona Provincia – “Comisiones” = descuento total del día / kg del día; proyectados en gris; ACUM = ratio acumulado sum($desc)/sum(kg).
- **Hoja C**: IGF ejecutivo horizontal por planta: bloque Provincia (V1, vMax, Forecast, deltas $/kg y MXN), bloque Centro (V1 vs vMax, sin Forecast), totales Provincia y Centro. Orden de variables: B,C,D,E,F,G,H,I,J,K,K$,N,O,P,Q,R,S (según IGF Compromiso).

Zonas: desde hoja “Proyección” IGF – CDMX = A9:A16, Provincia = A19:A24. Lista de plantas Provincia para hojas A y B viene del IGF Compromiso (vMax) vigente.

## Dependencias nuevas

- `xlsx` (SheetJS): lectura de ARR.xlsm (datos) y generación del Excel de las 3 hojas. No modifica dependencias usadas por el bot actual.
