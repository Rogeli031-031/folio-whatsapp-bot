# IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023

## Identidad

```yaml
task_id: "IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023"
outcome: "DONE"
files_touched:
  - "lib/dashboard-arr-forecast.js"
  - "test/arr-forecast-excel-daily-category-023.test.js"
  - "docs/dev-loop/reports/IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "frontend"
  - "server.js (endpoint GET /api/arr/dashboard-excel sin cambio)"
  - "schema DB"
  - "persistencia"
  - "Director IA"
  - "Compras / HG / Flete"
  - "hojas IGF Forecast, Pronostico e históricas"
  - "frontend-dashboard/.next (no commiteado)"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "El encabezado J+ queda en la misma fila 1, con salto de línea PLANTA / CASA y PLANTA / COMISIONISTA. Una segunda fila física movería A-H. La tarea permite nombres planos si dos filas rompen el contrato."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | IMPL-ARR-FORECAST-EXCEL-DAILY-CATEGORY-023 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | f7ccaeb03b0b0ff08afebb57ccee8936cc3d106c |
| branch | implementation/arr-forecast-excel-daily-category-023 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Layout

Mismo Excel de `generarDashboardArrForecast` (`GET /api/arr/dashboard-excel`).

Hojas tocadas: **Provincia Venta Diaria** y **Provincia Comisiones**.

- A-H se escriben igual que antes.
- Columna I queda vacía, ancho 4, sin encabezado.
- Desde J, el orden es el de `getProvinciaPlantsOrdered` / las columnas actuales.
- Cada planta ocupa dos columnas: `PLANTA` + `CASA` y `PLANTA` + `COMISIONISTA` en la misma celda de encabezado (salto de línea).

## Fuente venta

`arr.ventas_diarias_cliente`, mapeada a planta provincia con el mismo `prov_map` (nombre/clave).

Por planta + fecha + canal:

`SUM(kg) / 1000` = toneladas.

Canal canónico solo `CASA` o `COMISIONISTA` (mayúsculas, acentos y espacios). Otro canal o null no entra a CASA. Queda en `unclassifiedKg`. Por eso CASA + COMISIONISTA puede ser menor que el total de la planta.

## Fuente descuento

Numerador: `arr.descuentos_diarios_cliente` clasificado con `arr.cliente_categoria_mes` (`cliente_norm`, `plant_code`, `year`, `month`). Sin `COALESCE(c.canal, 'Casa')`.

Denominador: `SUM(kg)` de `arr.ventas_diarias_cliente` del mismo canal. No se infiere kg desde el descuento.

Diario y ACUM:

`ABS(SUM(monto categoría)) / SUM(kg categoría)`

No es promedio de tasas diarias.

- kg ≤ 0 en día real → celda vacía.
- kg > 0 y monto 0 → `0`.
- Después del corte → `0`, igual que la hoja actual.

## Corte y forecast

El bloque usa el `cutoffDay` ya calculado para cada hoja (`día < cutoffDay` es real).

PROY, Comp y Dif Comp del bloque nuevo quedan vacíos. No hay reparto proporcional del forecast total.

## Tests

`test/arr-forecast-excel-daily-category-023.test.js`: 29 pass / 0 fail. Cubre A–Z y la reconciliación 40 t / 60 t y $5 / $3 por kg.

Regresión de módulo: `require` de `lib/dashboard-arr-forecast.js` OK.

`test/director-ia-period-start-semantics.test.js` y la paridad de delta ingreso: pass.

Dos fallos en `test/director-ia-prom-cutoff-runtime-parity.test.js` (chat mini cutoff null y routing `commercial_trend`) están en Director IA, fuera de alcance, y no leen las columnas J+.

## Build

No hubo cambios de frontend. No se ejecutó `npm run build`.

## Cierre

CURRENT_TASK → `DONE_PENDING_REVIEW`.

Commit + push solo a `implementation/arr-forecast-excel-daily-category-023`.

STOP. No PR. No merge. No deploy. No siguiente tarea.
