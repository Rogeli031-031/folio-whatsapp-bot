# FIX-IGF-DIARIO-PUEBLA-EXPORT-YELLOW-043

## Identidad

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-EXPORT-YELLOW-043"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "test/igf-diario-puebla-043.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-EXPORT-YELLOW-043.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "lib/dashboard-arr-forecast.js"
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
| task_id | FIX-IGF-DIARIO-PUEBLA-EXPORT-YELLOW-043 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | ece45315cfff0ddf683823a2093876a83fb12bd5 |
| branch | fix/igf-diario-puebla-export-yellow-043 |
| schema_changes | false |
| data_mutation | false |

## Cambio

Las fórmulas de F y G no cambian. Al exportar, la celda recibe relleno físico `FFFFFF00` cuando el costo o el flete propio no es un número distinto de cero y sí hay un antecedente válido. Una fórmula de CONTROL DE COMPRAS sin `result` se resuelve desde las celdas de origen; si esas celdas tienen compra, el día no se pinta. Costo y flete se deciden por separado. El día del corte y las fechas futuras no reciben este amarillo. Una edición posterior del archivo no actualiza el color hasta una nueva exportación.

## Comprobación

F28 y G28 quedan amarillas antes de guardar y después de reabrir el XLSX temporal. El 18, con fórmula sin resultado que apunta a 11.965423104349892 y 1.23, no queda amarillo. El 20 pinta solo el costo. El 24 y el 25 no. El archivo temporal no entra al commit.

Pruebas: 72/72 en 043, 042, 041, 040, 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030. `git diff --check` sin hallazgos.
