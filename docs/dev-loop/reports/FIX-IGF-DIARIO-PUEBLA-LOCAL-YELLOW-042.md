# FIX-IGF-DIARIO-PUEBLA-LOCAL-YELLOW-042

## Identidad

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-LOCAL-YELLOW-042"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "test/igf-diario-puebla-042.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-LOCAL-YELLOW-042.md"
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
| task_id | FIX-IGF-DIARIO-PUEBLA-LOCAL-YELLOW-042 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 836294a4e4a6908e21288fcd2ba57f26d711b8af |
| branch | fix/igf-diario-puebla-local-yellow-042 |
| schema_changes | false |
| data_mutation | false |

## Cambio

F y G conservan el arrastre de la 041. El amarillo ya no consulta CONTROL DE COMPRAS desde la regla condicional. AI y AJ, ocultas, valen 1 cuando la compra propia no es un número distinto de cero. La regla de F28 es `AND(ISNUMBER(F28),AI28=1)` y la de G28 usa AJ28. Si la compra propia pasa a ser válida, la auxiliar queda en 0 y el amarillo se quita al recalcular. AH sigue visible. El relleno sólido conserva `fgColor` `FFFFFF00`.

## Comprobación

El XLSX temporal se guardó y se reabrió. La condición de F28 y G28 no contiene referencias a otras hojas. AI y AJ están ocultas. El `dxf` ligado sigue con `<fgColor rgb="FFFFFF00"/>`. El archivo temporal no entra al commit. ExcelJS no pinta el color en pantalla; la captura de Excel es la que lo muestra.

Pruebas: 71/71 en 042, 041, 040, 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030. `git diff --check` sin hallazgos.
