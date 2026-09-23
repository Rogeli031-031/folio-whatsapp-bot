# IMPL-IGF-DIARIO-PRECIO-CARRY-FORWARD-029

## Identidad

```yaml
task_id: "IMPL-IGF-DIARIO-PRECIO-CARRY-FORWARD-029"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/dashboard-arr-forecast.js"
  - "test/igf-diario-precio-carry-forward-029.test.js"
  - "test/igf-diario-precio-sheet-027.test.js"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRECIO-CARRY-FORWARD-029.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "server.js"
  - "schema DB"
  - "arr.precio_diario"
  - "arr.precio_detalle"
  - "VBA"
  - "frontend"
  - "CONTROL DE COMPRAS"
  - "Pronostico"
  - "frontend-dashboard/.next (no commiteado)"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "test/igf-diario-precio-sheet-027.test.js: tres celdas que esperaban vacío ahora esperan el último PRECIO válido del mismo mes, porque 029 sustituye esa regla"
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | IMPL-IGF-DIARIO-PRECIO-CARRY-FORWARD-029 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | fe1da1f81af672dc3d057ddda2d8423b3a4e572f |
| branch | implementation/igf-diario-precio-carry-forward-029 |
| schema_changes | false |
| data_mutation | false |

## Regla

`appendPrecioWorksheet` recorre los días del mes en orden. Conserva `lastValidPrecio`, que empieza vacío.

Un precio propio es válido cuando `Number.isFinite(Number(precio))` y `precio > 0`. Si el día trae uno, la celda usa ese número y pasa a ser el vigente. Si el día no trae valor, o trae `null`, `""`, `NaN` o `0`, la celda usa el último válido anterior. No se busca el mes previo. El día 1 sin precio propio queda vacío.

## Ejemplo

Con 22-sep = 19.76902713 y sin dato del 23 al 25, esas celdas quedan en 19.76902713. Si 26-sep = 19.81234567, desde ese día el arrastre usa 19.81234567.

El número se guarda completo. El formato visual sigue `0.00000000`. 19.76902713 no se redondea a 19.77.

## Persistencia

`loadPrecioDiario` no cambió. Sigue leyendo `arr.precio_diario` y no escribe filas. El arrastre existe solo en el Excel generado.

## Hojas

A sigue siendo Fecha y B sigue siendo PRECIO. PRECIO permanece en tercera posición. CONTROL DE COMPRAS permanece en cuarta. Pronostico no se tocó.

## Pruebas

- `test/igf-diario-precio-carry-forward-029.test.js`: pass (A–K).
- `test/igf-diario-precio-sheet-027.test.js`: pass. Los días 5, 23 y 30 de septiembre heredan el último precio válido del mes.
- `test/igf-diario-pronostico-fill-028.test.js`: pass.

No hubo cambios de frontend. No se corrió `npm run build`.
