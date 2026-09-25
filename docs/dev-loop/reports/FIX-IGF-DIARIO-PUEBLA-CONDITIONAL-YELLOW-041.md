# FIX-IGF-DIARIO-PUEBLA-CONDITIONAL-YELLOW-041

## Identidad

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-CONDITIONAL-YELLOW-041"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "test/igf-diario-puebla-041.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-CONDITIONAL-YELLOW-041.md"
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
| task_id | FIX-IGF-DIARIO-PUEBLA-CONDITIONAL-YELLOW-041 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 13d72dc21d1cd4cdf39e2c1e5102865eed0a3364 |
| branch | fix/igf-diario-puebla-conditional-yellow-041 |
| schema_changes | false |
| data_mutation | false |

## Cambio

La regla condicional de F y G usa relleno sólido con `fgColor` `FFFFFF00`. El XLSX ya no guarda ese amarillo solo como `bgColor`. Las fórmulas y el resto del formato de la 040 quedan igual.

## Comprobación

La prueba guarda un XLSX temporal, lo reabre y lee `xl/styles.xml`. El `dxf` ligado a F28 y a G28 es `patternFill patternType="solid"` con `<fgColor rgb="FFFFFF00"/>` y sin `bgColor`. El archivo temporal se borra y no entra al commit.

Pruebas: 70/70 en 041, 040, 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030. `git diff --check` sin hallazgos.
