# IMPL-COMPRAS-DAILY-AVERAGE-FILL-030

## Identidad

```yaml
task_id: "IMPL-COMPRAS-DAILY-AVERAGE-FILL-030"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/compras-excel.js"
  - "test/compras-daily-average-fill-030.test.js"
  - "test/compras-hg-cost-carry-forward-026.test.js"
  - "docs/dev-loop/reports/IMPL-COMPRAS-DAILY-AVERAGE-FILL-030.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "schema DB"
  - "arr.compras"
  - "arr.compras_hg"
  - "UI web /compras"
  - "VBA"
  - "Pronostico"
  - "PRECIO"
  - "Director IA"
  - "frontend-dashboard/.next (no commiteado)"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "test/compras-hg-cost-carry-forward-026.test.js: el costo del proveedor en el día sin compra ya no queda null; queda la fórmula IMPORTE/KG porque 030 estima esa compra"
  - "test/compras-hg-cost-carry-forward-026.test.js: el COSTO HG del día estimado ya no es el número arrastrado; es la fórmula de costo consolidado más tarifa de esa fila"
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | IMPL-COMPRAS-DAILY-AVERAGE-FILL-030 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 114b662846d77225bc0515231754bfb7d38dbda6 |
| branch | implementation/compras-daily-average-fill-030 |
| schema_changes | false |
| data_mutation | false |

## Columnas base

`buildComprasDailyEstimateContext` calcula, por fecha y antes de pintar, los valores efectivos de:

- B y D, compra e importe del proveedor 1
- F y H, proveedor 2
- J y L, proveedor 3
- S, HG en kilos
- T, importe HG

Solo se rellenan filas `type === "day"`. Si el día trae un real válido, se usa ese real. Si no, el promedio aritmético de los días anteriores del mismo mes con real válido en esa columna. Una estimación no entra al promedio siguiente. El primer día sin historia queda vacío. No se busca el mes anterior y no se escribe 0 para inventar una compra.

En compras e importe, un real válido es finito y mayor que 0. El cero es ausencia y no entra al promedio. En HG kilos, cualquier número finito capturado es real, incluido el negativo y el cero. Si no hay captura, S se estima. T real es el importe ya asociado a una captura HG; si falta, se usa el promedio de los T reales anteriores y se pinta el número. No se sustituye ese hueco por la fórmula de costo por kilos.

## Color y derivadas

El azul de una celda estimada es `FF5B9BD5`. Los reales, las fórmulas, Semana y TOTAL MES no usan ese azul.

Las filas de fecha calculan las derivadas con fórmula:

- C = D / B, G = H / F, K = L / J
- N = B + F + J, P = D + H + L, O = P / N
- R, en cada fila de fecha con compra o estimación suficiente, es la fórmula de esa fila: costo consolidado + tarifa consolidada de flete. No usa el costo crudo del payload ni el arrastre cuando O y AJ ya se pueden calcular. Si la fila no tiene base suficiente, conserva el número arrastrado. Semana y TOTAL MES siguen agregados y no usan esa fórmula diaria. R no se pinta de azul y no se persiste.
- el flete de cada origen toma los kilos de la compra y la tarifa vigente; el importe es kilos por tarifa
- el flete consolidado suma kilos e importes y pondera la tarifa

## Semana y mes

Semana y TOTAL MES no se promedian. Kilos e importes suman reales más estimados. El costo sigue siendo importe / kilos. El importe HG de la semana y del mes suma el T efectivo de cada día.

## Persistencia

Las estimaciones existen solo en el workbook. No hay inserts ni updates. El Excel de Compras y la hoja CONTROL DE COMPRAS de IGFDiario pasan por `appendComprasWorksheet`, así que el mismo payload produce los mismos valores. Si después aparece un dato real, la siguiente generación usa ese real.

## Pruebas

- `test/compras-daily-average-fill-030.test.js`: pass (A–AB).
- `test/compras-hg-costo-importe-020.test.js`: pass.
- `test/compras-flete-collapse-021.test.js`: pass.
- `test/compras-provider-separators-022.test.js`: pass.
- `test/compras-hg-cost-carry-forward-026.test.js`: pass.
- `test/forecast-excel-plant-compras-024.test.js`: pass.
- `test/igf-diario-precio-sheet-027.test.js`: pass.
- `test/igf-diario-pronostico-fill-028.test.js`: pass.
- `test/igf-diario-precio-carry-forward-029.test.js`: pass.

No hubo cambios de frontend. No se corrió `npm run build`.
