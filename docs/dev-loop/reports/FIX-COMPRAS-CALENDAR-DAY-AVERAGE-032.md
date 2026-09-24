# FIX-COMPRAS-CALENDAR-DAY-AVERAGE-032

## Identidad

```yaml
task_id: "FIX-COMPRAS-CALENDAR-DAY-AVERAGE-032"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/compras-excel.js"
  - "test/compras-daily-average-fill-030.test.js"
  - "docs/dev-loop/reports/FIX-COMPRAS-CALENDAR-DAY-AVERAGE-032.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "HG EN KILOS"
  - "frontend"
  - "base de datos"
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
| task_id | FIX-COMPRAS-CALENDAR-DAY-AVERAGE-032 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | ccdeee53260b5166d32d77eec117c9703281ff60 |
| branch | fix/compras-calendar-day-average-032 |
| schema_changes | false |
| data_mutation | false |

## Promedio

Para cada proveedor, el numerador de kilos es la suma de sus kg reales desde el día 1 del mes hasta el día anterior al corte. El numerador de importe se suma aparte. El divisor es la cantidad de días calendario de ese tramo, aunque no haya compra o la fecha no esté en `grid.days`. El día de corte y los días futuros no entran al promedio. Si no hubo ninguna compra real hasta ayer, no hay proyección. Una captura real en una fecha futura sigue ocupando su propia celda.

Con corte 2026-09-24 el divisor es 23.

| Proveedor | Cálculo | Valor |
|---|---|---|
| PEMEX TUXPAN kg | 929020 / 23 | 40392.173913... |
| TOMZA TEPEJI kg | 92750 / 23 | 4032.608695... |
| TOMZA TEPEJI importe | 1045311.27 / 23 | 45448.316086... |

El formato de la celda sigue en un decimal para kilos y dos para importe. El número guardado no se redondea a 40392.2.

Las fechas pasadas y el día de corte sin compra siguen vacías. Solo se estima desde el día siguiente al corte. HG EN KILOS no cambió: sigue con el promedio de sus capturas reales, incluidos cero y negativos.

## Pruebas

- `test/compras-daily-average-fill-030.test.js`: pass, incluido el divisor 23 y el corte 19/24/25.
- `test/compras-hg-costo-importe-020.test.js`: pass.
- `test/compras-flete-collapse-021.test.js`: pass.
- `test/compras-provider-separators-022.test.js`: pass.
- `test/compras-hg-cost-carry-forward-026.test.js`: pass.
- `test/forecast-excel-plant-compras-024.test.js`: pass.
- `test/igf-diario-precio-sheet-027.test.js`: pass.
- `test/igf-diario-pronostico-fill-028.test.js`: pass.
- `test/igf-diario-precio-carry-forward-029.test.js`: pass.

No hay un archivo de prueba aparte de 031. Esa regla sigue cubierta por el caso de corte dentro de 030.

## Limitación

ExcelJS no recalcula el libro. 40392.2, 4032.6 y 45448.32 son el formato visual `#,##0.0` y `#,##0.00` sobre el cociente exacto; la prueba compara el cociente, no una celda abierta en Excel.
