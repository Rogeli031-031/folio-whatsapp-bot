# FIX-IGF-DIARIO-PUEBLA-CARRY-FORWARD-STYLE-039

## Identidad

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-CARRY-FORWARD-STYLE-039"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "lib/dashboard-arr-forecast.js"
  - "test/igf-diario-puebla-039.test.js"
  - "test/igf-diario-puebla-037.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-CARRY-FORWARD-STYLE-039.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "test/igf-diario-puebla-036.test.js"
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
| task_id | FIX-IGF-DIARIO-PUEBLA-CARRY-FORWARD-STYLE-039 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | b8b15fa2a770d898d8777793704f8b6c85b21793 |
| branch | fix/igf-diario-puebla-carry-forward-style-039 |
| schema_changes | false |
| data_mutation | false |

## Cambio

F y G de un día anterior al corte son fórmulas. Si la celda de CONTROL DE COMPRAS del mismo día es numérica y distinta de cero, se usa. Si no, la fórmula recorre hacia atrás las celdas de días calendario anteriores y toma la primera que cumpla lo mismo. Costo y flete se buscan por separado. Sin antecedente válido, la celda queda vacía. El 24/09 y las fechas posteriores no arrastran. El amarillo se pinta al generar cuando el dato propio no es un número distinto de cero y sí hay un antecedente.

Los promedios semanales ponderan con `IF(AND(ISNUMBER), …, 0)` escalar. El cero interno no se muestra: si el denominador es cero, el resultado es vacío. Septiembre 2026 conserva 25 hábiles. M3 y T3 siguen saliendo del ARR mini. X sigue siendo IMPORTE HG.

La presentación replica anchos, altos, colores y decimales del archivo de referencia. La semana 5 queda en la fila 45 y TOTAL MES en la 47.

## Comprobación

El texto de las fórmulas se revisó en prueba. ExcelJS no recalcula. El precio ponderado de la semana 1, con los kg y precios del archivo de referencia, da 18.908463847 y el formato de dos decimales es 18.91. H del 19, con precio 19.530989164349892, costo 11.965423104349892 y flete 1.23, da 6.33556606. Esas cifras no están escritas en la fórmula del 19.

Pruebas: 68/68 en 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030. `git diff --check` sin hallazgos.
