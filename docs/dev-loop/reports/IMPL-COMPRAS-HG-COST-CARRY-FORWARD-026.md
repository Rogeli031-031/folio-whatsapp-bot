# IMPL-COMPRAS-HG-COST-CARRY-FORWARD-026

## Identidad

```yaml
task_id: "IMPL-COMPRAS-HG-COST-CARRY-FORWARD-026"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/compras-dashboard.js"
  - "lib/compras-excel.js"
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "frontend-dashboard/lib/compras-format.ts"
  - "frontend-dashboard/lib/api.ts"
  - "test/compras-hg-cost-carry-forward-026.test.js"
  - "docs/dev-loop/reports/IMPL-COMPRAS-HG-COST-CARRY-FORWARD-026.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "schema DB"
  - "Director IA"
  - "frontend-dashboard/.next (build local; no commiteado)"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "compras-format.ts y api.ts no estaban en in_scope. Hacen falta para que la UI y la suma semanal/mensual lean hg_costo_efectivo y hg_importe_efectivo sin un segundo arrastre."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | IMPL-COMPRAS-HG-COST-CARRY-FORWARD-026 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | a18929aaedc3178dcec3b1cca557553d2b40d5a5 |
| branch | implementation/compras-hg-cost-carry-forward-026 |
| schema_changes | false |
| data_mutation | false |

## Semántica

El arrastre corre una sola vez, en el grid del backend, después de pegar el flete. No se persiste.

Un día tiene costo HG crudo válido cuando el costo consolidado de compra es finito y mayor que 0 y la tarifa consolidada de flete es finita y mayor o igual que 0. El resultado `hgCosto` tiene que ser mayor que 0. Costo de compra 0 más tarifa no abre una secuencia nueva.

Si el día no tiene ese costo, usa el último costo HG válido anterior, sin límite de días. Si el mes empieza sin compra, la semilla es el último costo válido anterior a `YYYY-MM-01` de la misma planta, con la tarifa de flete de esa fecha. Sin historial el costo queda null. No se escribe 0.

El importe diario es `hgImporte(costo efectivo, hg kilos)`. Semana y mes suman esos importes diarios. El COSTO semanal y el mensual siguen siendo el consolidado de compra más la tarifa consolidada de flete. El costo por proveedor y el consolidado de compra no arrastran.

La UI diaria lee el campo efectivo. El Excel de Compras y CONTROL DE COMPRAS de IGFDiario usan el mismo renderer: fórmula `consolidado + tarifa` cuando el día tiene costo crudo válido; número efectivo cuando el día arrastra. El importe diario sigue referenciando esa celda por `*-1`.

## Caso 18/09 y 19/09

18/09 costo válido 11.965 + 1.230 = 13.195. 19/09 sin compra y HG 7,685.

19/09 COSTO = 13.195.

19/09 IMPORTE contractual = `hgImporte(13.195, 7685)` = -101,403.57.

El producto es 13.195 × 7,685 × -1 = -101,403.575. El redondeo existente a 2 decimales, con el empate de `Math.round` hacia +∞, da -101,403.57. La cifra -101,406.83 del pedido no coincide con esa función y no se forzó.

## Pruebas

- `test/compras-hg-cost-carry-forward-026.test.js`: pass (A–AA).
- `test/compras-hg-kilos-014.test.js`: pass.
- `test/compras-flete-tarifa-016.test.js`: pass.
- `test/compras-hg-costo-importe-020.test.js`: pass.
- `test/compras-flete-collapse-021.test.js`: pass.
- `test/compras-provider-separators-022.test.js`: pass.
- `test/forecast-excel-plant-compras-024.test.js`: pass.
- `test/igf-diario-ui-scoped-view-025.test.js`: pass.
- `cd frontend-dashboard && npm run build`: exit 0.

La pantalla de Compras en vivo no se recorrió con sesión autenticada. El caso 18/09–19/09, el arrastre y la equivalencia Excel / CONTROL DE COMPRAS quedan cubiertos por los tests del grid y del libro.
