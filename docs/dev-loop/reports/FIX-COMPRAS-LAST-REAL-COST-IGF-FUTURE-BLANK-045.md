# FIX-COMPRAS-LAST-REAL-COST-IGF-FUTURE-BLANK-045

## Identidad

```yaml
task_id: "FIX-COMPRAS-LAST-REAL-COST-IGF-FUTURE-BLANK-045"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/compras-excel.js"
  - "lib/igf-diario-puebla.js"
  - "test/compras-last-real-cost-igf-future-blank-045.test.js"
  - "docs/dev-loop/reports/FIX-COMPRAS-LAST-REAL-COST-IGF-FUTURE-BLANK-045.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "frontend-dashboard/.next"
  - "test/compras-daily-average-fill-030.test.js"
  - "test/igf-diario-puebla-039.test.js"
  - "test/igf-diario-puebla-040.test.js"
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
| task_id | FIX-COMPRAS-LAST-REAL-COST-IGF-FUTURE-BLANK-045 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 5b2baf4eff486b20d13441e0bd32799cdabb763b |
| branch | fix/compras-last-real-cost-igf-future-blank-045 |
| schema_changes | false |
| data_mutation | false |

## Cambio

COMPRA KG sigue con el promedio de días calendario anteriores al corte. El importe faltante de una fecha proyectable es los kilos de esa fecha por el último costo unitario real del mismo proveedor: importe real dividido entre kilos reales de una fecha anterior, sin redondeo. Un importe real se conserva. Una compra real completa del día de corte actualiza el costo para los días siguientes. Sin antecedente válido, el importe queda vacío.

En IGF Diario Puebla, cada fecha posterior al corte conserva la fecha en A y deja B:AF sin valores ni fórmulas. La semana 4 suma solo hasta el 24. La semana 5 no entra a TOTAL MES. El 24 conserva sus fórmulas. M3, T3 y el arrastre histórico no cambian.

## Comprobación

El 25/09 de PEMEX, con kilos proyectados 38709.16666666667 y último real del 23/09 de 19370 kg y 236938.17, guarda el producto completo. El formato de Excel lo muestra a dos decimales; ExcelJS no recalcula esa presentación.

Pruebas: 115/115 en 045, Compras 020, 021, 022, 024, 026 y 030, e IGF Diario Puebla 036 a 044. No hizo falta cambiar aserciones anteriores. `git diff --check` sin hallazgos.
