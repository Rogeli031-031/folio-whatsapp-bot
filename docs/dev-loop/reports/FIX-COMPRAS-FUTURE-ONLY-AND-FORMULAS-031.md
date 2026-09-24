# FIX-COMPRAS-FUTURE-ONLY-AND-FORMULAS-031

## Identidad

```yaml
task_id: "FIX-COMPRAS-FUTURE-ONLY-AND-FORMULAS-031"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/compras-excel.js"
  - "test/compras-daily-average-fill-030.test.js"
  - "test/compras-hg-cost-carry-forward-026.test.js"
  - "docs/dev-loop/reports/FIX-COMPRAS-FUTURE-ONLY-AND-FORMULAS-031.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "frontend"
  - "base de datos"
  - "hoja Pronostico"
  - "reporte 030"
  - "frontend-dashboard/.next (no commiteado)"
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
| task_id | FIX-COMPRAS-FUTURE-ONLY-AND-FORMULAS-031 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 3bef0d76f846cbbba47d897b755ebf800497eded |
| branch | fix/compras-future-only-and-formulas-031 |
| schema_changes | false |
| data_mutation | false |

## Corte

La proyección solo corre si la fecha es posterior al corte. El corte es `opts.corteYmd`, o `payload.corteYmd`, o la fecha calendario de `America/Mexico_City` al generar el Excel. Hoy y los días anteriores sin dato real quedan vacíos y no se pintan de azul. Un real sigue ganando. Las estimaciones no se guardan.

## Fórmulas

El consolidado de kilos e importes usa `SUM`. `SUM` ignora una celda cuya fórmula devuelve `""`. Si no hay números, la celda queda vacía. Costo, flete e importe HG usan `ISNUMBER` antes de dividir o multiplicar, así un vacío no produce `#¡VALOR!`. R sigue siendo O+AJ cuando la fila tiene compra o estimación y tarifa; si no hay insumos, conserva el arrastre numérico. Semana y TOTAL MES suman reales y solo las estimaciones futuras.

## Filas con corte 2026-09-24

| Fecha | PEMEX kg (B) | TOMZA TEPEJI kg (J) | HG kilos (S) | R |
|---|---|---|---|---|
| 19/09 | vacío | vacío | vacío | fórmula O+AJ, porque TOMZA TUXPAN sí tiene compra real (80 kg) |
| 24/09 | vacío | vacío | vacío | vacío |
| 25/09 | 100, azul | 40, azul | 10, azul | fórmula O+AJ |

## Pruebas

- `test/compras-daily-average-fill-030.test.js`: pass, incluido el corte 19/24/25.
- `test/compras-hg-costo-importe-020.test.js`: pass.
- `test/compras-flete-collapse-021.test.js`: pass.
- `test/compras-provider-separators-022.test.js`: pass.
- `test/compras-hg-cost-carry-forward-026.test.js`: pass. Con corte 2026-09-24 el 19/09 no inventa compra y R queda en 13.195.
- `test/forecast-excel-plant-compras-024.test.js`: pass.
- `test/igf-diario-precio-sheet-027.test.js`: pass.
- `test/igf-diario-pronostico-fill-028.test.js`: pass.
- `test/igf-diario-precio-carry-forward-029.test.js`: pass.

## Limitación

ExcelJS no recalcula el libro. `#¡VALOR!` se verificó en el texto de las fórmulas (`SUM` e `ISNUMBER`), no abriendo el archivo en Excel. El huso se comprobó con instantes UTC fijos: `2026-09-24T05:30:00Z` es 23/09 y `2026-09-24T06:30:00Z` es 24/09 en Ciudad de México.
