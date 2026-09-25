# FIX-IGF-DIARIO-PUEBLA-REVIEW-040

## Identidad

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-REVIEW-040"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "test/igf-diario-puebla-040.test.js"
  - "test/igf-diario-puebla-039.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-REVIEW-040.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "frontend-dashboard/.next"
  - "lib/compras-excel.js"
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
| task_id | FIX-IGF-DIARIO-PUEBLA-REVIEW-040 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | fffdaecbd6e1eda674eadbc33895002a66de3433 |
| branch | fix/igf-diario-puebla-review-040 |
| schema_changes | false |
| data_mutation | false |

## Cambio

La fórmula de arrastre prueba primero el dato propio y después el antecedente más reciente. Con corte 2026-09-24, F28 evalúa O27 antes que O6. Una fuente con fórmula y `result` cuenta como número. El amarillo es formato condicional: se pinta cuando la celda es numérica y la compra propia no lo es, o es cero. Si luego aparece un dato propio válido, deja de pintarse al recalcular.

Cada semana y TOTAL MES tienen A negra con texto blanco y B:AF gris claro con texto oscuro. Quedaron las uniones A1:D1, A4:A5, B4:D4, F4:H4, X4:Y4 y AE4:AF4. Año, mes, M3 y T3 tienen tamaño, centrado y borde inferior. M3 y T3 siguen siendo los importes del ARR.

## Comprobación

La prueba 040 evalúa el orden efectivo con celdas fuente que son fórmulas ExcelJS. F28 da 11.965423104349892 y G28 da 1.23. Cambiar el resultado de O27 cambia F28 y el día siguiente. H del 19, con el precio del día, da 6.33556606. El 24 y el 25 no arrastran. El XLSX temporal se guardó, se reabrió y se borró; no entra al commit. ExcelJS no recalcula AF28: el formato de moneda sin decimales muestra 31042.20 como $31,042.

Pruebas: 69/69 en 040, 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030. `git diff --check` sin hallazgos.
