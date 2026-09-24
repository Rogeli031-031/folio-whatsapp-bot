# FIX-COMPRAS-INCLUDE-CUTOFF-DAY-035

## Identidad

```yaml
task_id: "FIX-COMPRAS-INCLUDE-CUTOFF-DAY-035"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/compras-excel.js"
  - "lib/dashboard-arr-forecast.js"
  - "test/compras-daily-average-fill-030.test.js"
  - "docs/dev-loop/reports/FIX-COMPRAS-INCLUDE-CUTOFF-DAY-035.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "docs/dev-loop/reports/FIX-COMPRAS-INCLUDE-CUTOFF-DAY-034.md"
  - "server.js"
  - "frontend"
  - "HG EN KILOS: método de promedio"
  - "frontend-dashboard/.next (sin commit)"
contracts_consulted:
  - "AGENTS.md"
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
| task_id | FIX-COMPRAS-INCLUDE-CUTOFF-DAY-035 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | a2cfac4a12b6200d306e97cd1fcc40287629e8fc |
| integrated_main_sha | 095ba9586003a0d7282582228b68aa7641a8aab4 |
| branch | fix/compras-include-cutoff-day-035 |
| schema_changes | false |
| data_mutation | false |

## Cambio

La proyección de compras aplica desde el día del corte cuando falta el dato real. El promedio de proveedores sigue sumando solo compras reales anteriores al corte y divide entre los días calendario anteriores. Con corte 2026-09-24 el divisor sigue siendo 23.

| Celda | Valor |
|---|---|
| PEMEX TUXPAN kg | 929020 / 23 |
| TOMZA TEPEJI kg | 92750 / 23 |
| TOMZA TEPEJI importe | 1045311.27 / 23 |

Un real del 24 ocupa su celda y no entra al numerador. El 19 sin compra queda vacío. HG EN KILOS puede estimarse el día del corte con el promedio de capturas reales que ya tenía.

`generarDashboardArrForecast` pasa `options.fechaCorte` a `appendComprasWorksheet`. Sin fecha, Compras independiente sigue usando hoy en Ciudad de México.

## Pruebas

111 pruebas, 0 fallos: 030, 020, 021, 022, 024, 026, 027, 028 y 029.

## Límite

ExcelJS no recalcula fórmulas. 40392.2, 4032.6 y 45448.32 son el formato visual sobre el cociente exacto.
