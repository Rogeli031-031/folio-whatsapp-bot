# FIX-IGF-DIARIO-PUEBLA-HISTORICAL-HOLIDAYS-038

## Identidad

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-HISTORICAL-HOLIDAYS-038"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "test/igf-diario-puebla-038.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-HISTORICAL-HOLIDAYS-038.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "test/igf-diario-puebla-036.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-CALC-037.md"
  - "lib/feriados-mx.js"
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
| task_id | FIX-IGF-DIARIO-PUEBLA-HISTORICAL-HOLIDAYS-038 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 6d5b53100ee7828ab189f0ab41e1c5e8c5c05b33 |
| branch | fix/igf-diario-puebla-historical-holidays-038 |
| schema_changes | false |
| data_mutation | false |

## Calendario

El descanso por transmisión del Poder Ejecutivo queda en el 1 de diciembre de 2018 y en el 1 de octubre cada seis años desde 2024. El 1 de diciembre de 2036 no entra por esa regla. Ese día es lunes, así que tampoco lo cierra el domingo. El 1 de diciembre de 2018 es sábado y queda inhábil solo por la transmisión.

Septiembre 2026 sigue con 25 días hábiles: 6, 13, 16, 20 y 27. Las fórmulas no cambiaron.

## Pruebas

67 pruebas, 0 fallos: 038, 037, 036, 024, 026, 027, 028, 029 y 030. `git diff --check` no reportó problemas en los archivos de la tarea.

## Límite

La prueba compara la lista de fechas. ExcelJS no interviene en este calendario.
