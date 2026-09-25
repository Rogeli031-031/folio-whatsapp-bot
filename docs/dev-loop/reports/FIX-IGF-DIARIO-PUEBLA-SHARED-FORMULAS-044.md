# FIX-IGF-DIARIO-PUEBLA-SHARED-FORMULAS-044

## Identidad

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-SHARED-FORMULAS-044"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "test/igf-diario-puebla-044.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-SHARED-FORMULAS-044.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "frontend-dashboard/.next"
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
| task_id | FIX-IGF-DIARIO-PUEBLA-SHARED-FORMULAS-044 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | a5ae3d9dd49c6b5e7515f019d13ea913a73dc9ac |
| branch | fix/igf-diario-puebla-shared-formulas-044 |
| schema_changes | false |
| data_mutation | false |

## Cambio

`originNumber` acepta un objeto con `result` numérico aunque no tenga `formula`. Una celda solo con `sharedFormula` desplaza la fórmula maestra y la evalúa desde sus entradas. Si esa lectura no se puede resolver, no se inventa compra ni amarillo. Las fórmulas de F y G no cambian.

## Comprobación

El archivo local `Dashboard_ARR_Forecast_Puebla_2026_9 (15).xlsx` se regeneró en memoria y se reabrió desde un XLSX temporal, que no entra al commit. Después de reabrir: F28 y G28 tienen `FFFFFF00`; F27 y G27 no; F35 y G35 no. F28 sigue probando O28 y después O27. El libro conserva 32 hojas, la fila 45 y la fila 47.

Pruebas: 73/73 en 044, 043, 042, 041, 040, 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030. `git diff --check` sin hallazgos.

Límite: el color físico queda fijo al exportar. Una edición posterior del archivo no lo actualiza hasta una nueva exportación.
