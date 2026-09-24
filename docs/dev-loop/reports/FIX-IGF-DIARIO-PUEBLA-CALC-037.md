# FIX-IGF-DIARIO-PUEBLA-CALC-037

## Identidad

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-CALC-037"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "server.js"
  - "test/igf-diario-puebla-037.test.js"
  - "test/igf-diario-puebla-036.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-CALC-037.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "lib/feriados-mx.js"
  - "cálculo del ARR mini"
  - "frontend-dashboard/.next"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "Se actualizó la aserción de fuente en test/igf-diario-puebla-036.test.js porque exigía Number() sobre el gasto del mini y eso convertía null en cero."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | FIX-IGF-DIARIO-PUEBLA-CALC-037 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | dc1580ab840b660e1667e16fe1ed3f8597228020 |
| branch | fix/igf-diario-puebla-calc-037 |
| schema_changes | false |
| data_mutation | false |

## Cálculo

En día hábil, O exige H y M numéricos. V exige O y T numéricos. Si falta el presupuesto, el margen no copia el paso anterior. En domingo o descanso, M y T siguen vacías y amarillas; O toma H y V toma O, porque ese día no reparte el gasto.

`null`, `undefined` y `""` no se convierten en cero ni en la hoja ni en la ruta. Un cero explícito del ARR mini se conserva. El cálculo del mini no cambió.

Los ponderados semanales usan `N()` sobre celdas numéricas y no multiplican el rango de texto. B, D, X y AF quedan vacíos si `COUNT` es cero.

El descanso de transmisión del Poder Ejecutivo es el 1 de octubre cada seis años desde 2024. Septiembre 2026 sigue con 25 hábiles: 6, 13, 16, 20 y 27.

## Pruebas

64 pruebas, 0 fallos: 037, 036, 024, 026, 027, 028, 029 y 030.

## Límite

ExcelJS no recalcula fórmulas. La prueba compara el texto. No se abrió el libro en Excel.
