# IMPL-IGF-DIARIO-UI-SCOPED-VIEW-025

## Identidad

```yaml
task_id: "IMPL-IGF-DIARIO-UI-SCOPED-VIEW-025"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "lib/dashboard-arr-forecast.js"
  - "test/igf-diario-ui-scoped-view-025.test.js"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-UI-SCOPED-VIEW-025.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/app/page.tsx"
  - "lib/compras-excel.js"
  - "schema DB"
  - "Director IA"
  - "frontend-dashboard/.next (build local; no commiteado)"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | IMPL-IGF-DIARIO-UI-SCOPED-VIEW-025 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 49db0dadb9c419edf1519652e850808ead8c6692 |
| branch | implementation/igf-diario-ui-scoped-view-025 |
| schema_changes | false |
| data_mutation | false |

## Botón

El botón salió de la barra superior. Queda en el encabezado de la tarjeta, a la derecha del selector existente:

Planta: [selector] [IGFDiario] [mes · versión]

El texto es exactamente `IGFDiario`. No queda `Descargar Excel (Forecast)` en `IgfForecastClient`. Sigue un solo selector.

Con Todas el botón permanece visible. El click no descarga y muestra: `Selecciona una planta para descargar el Excel Forecast.`

Con planta usa `getDashboardExcelDownloadUrl(..., plantaFilter, true)`, es decir `plant_code` y `require_plant=1`. No hay endpoint nuevo.

El botón de KPI Financieros en `app/page.tsx` no se tocó.

## Tabla

El título de la tarjeta es siempre `IGF Forecast`.

La tabla principal (mini resumen) ya no depende de `!plantaFilter`. Con Todas muestra todas las filas y Zona Provincia. Con una planta muestra solo esa fila de `igfMini.rows`, sin recalcular, y no muestra Zona Provincia.

La tabla detallada permanece en la misma tarjeta. Con planta sigue filtrando a esa fila. Sus columnas existentes no se rediseñaron.

## Columna C

Solo el Excel plant-scoped (`omitTotProvincia` cuando `generarDashboardArrForecast` recibe planta) deja vacía la columna de Tot Provincia en Provincia Venta Diaria: encabezado, días, ACUM, PROM, PROY, Comp y Dif Comp. La columna sigue existiendo. J y K no se mueven: CASA y COMISIONISTA siguen desde J. La venta de la planta conserva `#,##0.000`.

Sin ese flag, el libro global conserva Tot Provincia y no agrega CONTROL DE COMPRAS. En el flujo con planta, CONTROL DE COMPRAS sigue siendo la tercera hoja.

## Pruebas

- `test/igf-diario-ui-scoped-view-025.test.js`: 15 pass (A–M de UI y N–X de Excel).
- `test/forecast-excel-plant-compras-024.test.js`: pass.
- `test/arr-forecast-excel-daily-category-023.test.js`: pass.
- `cd frontend-dashboard && npm run build`: exit 0.

La pantalla IGF en vivo no se recorrió con sesión autenticada. El botón, el filtro y la columna C se cubren en el fuente y en el libro generado por los tests.
