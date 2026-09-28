# FIX-COMPRAS-DIA1-COSTO-FALLBACK-052

## Identidad

```yaml
task_id: "FIX-COMPRAS-DIA1-COSTO-FALLBACK-052"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/compras-dashboard.js"
  - "lib/compras-excel.js"
  - "test/compras-dia1-costo-fallback-052.test.js"
  - "docs/dev-loop/reports/FIX-COMPRAS-DIA1-COSTO-FALLBACK-052.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "frontend"
  - "IGF Diario"
  - "HG EN KILOS"
  - "tarifas de flete"
  - "permisos / comprasT"
  - "base de datos / schema"
  - "frontend-dashboard/.next"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "O y R del día 1 se resuelven por separado. Si solo uno tiene histórico, el otro puede referenciar el día 2. Los casos A–F traen ambos o ninguno."
  - "Sin histórico, el día 1 guarda la fórmula IF(ISNUMBER(día 2)) y no el número ya calculado. ExcelJS no evalúa fórmulas. Con kg 1000 e importe 11380 y tarifa 0.8, el día 2 resuelve a 11.380 y 12.180."
  - "El caso D guarda esa misma fórmula, pintada de amarillo. En Excel el resultado visible queda en blanco porque el día 2 no es numérico."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | FIX-COMPRAS-DIA1-COSTO-FALLBACK-052 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | d3d75329dec24b00c352cdb6efc66671367c8069 |
| branch | fix/compras-dia1-costo-fallback-052 |
| schema_changes | false |
| data_mutation | false |
| git_diff_check | clean |

## Corrección

Solo el día calendario 1, y solo cuando su consolidado no tiene kg propio mayor que 0 con importe válido.

Prioridad 1: último costo anterior a la fecha, sin límite de mes.

- O toma `costo_kg_anterior` del payload. Es importe consolidado / kg consolidado del último día con kg > 0 e importe válido y costo > 0.
- R toma el costo HG efectivo que ya calcula `loadLatestHgCostBeforeDate` + `applyHgCostCarryForward`.

La lectura de compras y tarifas ocurre una vez por cliente y fecha. La segunda consulta reutiliza ese resultado. No hay INSERT.

Prioridad 2, solo si esa columna no tiene histórico: fórmula al día 2 en la misma columna dinámica.

- `IF(ISNUMBER(consCostoCol día 2),consCostoCol día 2,"")`
- `IF(ISNUMBER(hgCostoCol día 2),hgCostoCol día 2,"")`

Con tres proveedores del layout actual esas columnas son O y R. El día 1 de un mes que empieza en la fila 6 queda `IF(ISNUMBER(O7),O7,"")` y `IF(ISNUMBER(R7),R7,"")`. R del día 1 no se rearma con la tarifa del día 1.

Si el día 1 tiene compra propia, O sigue siendo importe/kg de su fila y R sigue siendo O + tarifa consolidada. No se pinta de amarillo.

El amarillo `FFFFFF00` se aplica solo a O o R del día 1 cuando el valor es heredado. Los días 2 en adelante conservan su fórmula o su arrastre previo. Un hueco como el 08/09 no copia el 09/09.

## Casos

| Caso | O día 1 | R día 1 | Color |
|---|---|---|---|
| A sin histórico; día 2 kg 1000, importe 11380, tarifa 0.8 | fórmula a O del día 2; resuelve 11.380 | fórmula a R del día 2; resuelve 12.180 | amarillo |
| B histórico 31/08 O 11.500 y R 12.300; día 2 11.380 / 12.180 | 11.5 | 12.3 | amarillo |
| C compra propia 12000/1000 | fórmula de su fila | fórmula O + tarifa de su fila | sin amarillo de fallback |
| D sin histórico y día 2 sin costo | fórmula a día 2; resultado Excel en blanco | fórmula a día 2; celda del día 2 vacía | amarillo en la fórmula |
| E hueco 08/09 con compra el 09/09 | fórmula de su propia fila | vacío, sin referencia al 09 | sin amarillo |
| F 01/01/2027 y compra el 31/12/2026 | 11.5 | 12.3 | amarillo |

Los XLSX se reabrieron. En A y D persisten las fórmulas. En B y F persisten el número y el amarillo. El día 2 conserva su fórmula de división y su fórmula con `+`.

## Pruebas

052: 7 PASS, 0 FAIL.

Regresión 013, 014, 016, 020, 021, 022, 024, 026, 030, 048, 049, 051 y 051-R1: 183 PASS, 2 FAIL.

Esos 2 FAIL son el baseline ya conocido. No se cambiaron sus aserciones:

- 014 TOTAL MES de HG: espera −787 y obtiene −3148.
- 016 consolidado de flete del 01/09: espera 200 y obtiene `IF(COUNT(W6,AA6,AE6)=0,"",SUM(W6,AA6,AE6))`.

`git diff --check` no reportó errores.
