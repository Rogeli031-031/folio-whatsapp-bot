# IMPL-COMPRAS-FLETE-TARIFA-016

## Identidad

```yaml
task_id: "IMPL-COMPRAS-FLETE-TARIFA-016"
outcome: "DONE"
files_touched:
  - "sql/023_compras_flete_tarifas.sql"
  - "lib/compras-dashboard.js"
  - "lib/compras-excel.js"
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "frontend-dashboard/lib/compras-format.ts"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/lib/compras-flete-write.js"
  - "frontend-dashboard/lib/compras-flete-write.d.ts"
  - "test/compras-flete-tarifa-016.test.js"
  - "test/compras-dashboard-013.test.js"
  - "test/compras-hg-kilos-014.test.js"
  - "docs/dev-loop/reports/IMPL-COMPRAS-FLETE-TARIFA-016.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "docs/director-ia/"
  - "cálculo COMPRA KG / COSTO KG / IMPORTE / CONSOLIDADO de compras"
  - "arr.compras / arr.compras_hg (sin columnas nuevas)"
  - "facturas"
  - "HG persistencia y reglas"
contracts_consulted:
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
| task_id | IMPL-COMPRAS-FLETE-TARIFA-016 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 872bf076ac4f2d9f2119e2904d951062709ea725 |
| branch | implementation/compras-flete-tarifa-016 |
| schema_changes | true |
| data_mutation | true |
| merge | false |
| deploy | false |
| PR | no |

## Arquitectura

TARIFA = flete por kilo, **no** COSTO KG de compra. Una tarifa por `planta + proveedor + año + mes`.

- Persistencia: `arr.compras_flete_tarifas` UNIQUE(planta_id, proveedor_id, year, month).
- Vacío = DELETE. No se convierte en 0.
- GET `/api/compras` incluye `tarifas_flete` y `grid.*.flete`.
- POST `/api/compras/flete-tarifa` UPSERT o DELETE si `tarifa` es null/vacío.
- Auth + planta + proveedor de la misma planta. Cross-plant 403.

Derivados (no persistidos):

- diario: `IMPORTE = KG × TARIFA`
- CONSOLIDADO: `KG = SUM(kg)`, `IMPORTE = SUM(importe)`, `TARIFA = SUM(importe)/SUM(kg)` o vacío si KG=0
- Semana N y TOTAL MES: misma ponderación

UI: cuadro TARIFA editable arriba de cada origen en CONTROL DE COMPRAS. No sobre CONSOLIDADO ni HG. Tabla **VALOR DEL FLETE SEGÚN ORIGEN** a la derecha de HG. Proveedores extra del mismo catálogo.

Excel: tarifas visibles, bloque de flete, HG y compras intactos, sin `#DIV/0!`.

Si el guardado de tarifa falla: error visible y se restaura el último valor confirmado.

## Tests

- `test/compras-flete-tarifa-016.test.js` → 14/14 (A–U)
- `test/compras-dashboard-013.test.js` → 34/34
- `test/compras-hg-kilos-014.test.js` → 17/17

## Build

`frontend-dashboard`: `npm run build` OK. No se commitea `.next`.

## Cierre

- CURRENT_TASK → `DONE_PENDING_REVIEW`
- Commit + push solo a `implementation/compras-flete-tarifa-016`
- NO PR / NO merge / NO deploy / NO siguiente tarea

## REOPEN — TARIFA AUSENTE ≠ FLETE CERO

`Number(cell.importe) || 0` trataba `tarifa == null` + `kg > 0` como importe 0 y producía una tarifa ponderada falsa (p. ej. 0.50).

Regla: solo `null/ausente` es desconocido. `tarifa = 0` es valor explícito y sí participa.

Si cualquier origen con `kg > 0` tiene `tarifa == null`:

- KG consolidado = SUM(all kg)
- IMPORTE consolidado = null
- TARIFA consolidada = null

Misma regla en día, Semana N, TOTAL MES y Excel. No se muestra subtotal parcial. No `#DIV/0!`.

Implementación: `hasMissingTarifaForPositiveKg` + `freightConsolidado` en `attachFleteToGrid` / `freightRollup`. Excel `writeEmptyNum` para no convertir `null` en 0 (`Number(null) === 0`). UI: `formatFleteImporte(null)` y `formatTarifa(null)` vacíos aunque `showZero`.

No se tocó persistencia de tarifa, compras ni HG.

Tests añadidos (1–6): ausente vs 0 explícita; semana/mes incompletos; recálculo al capturar tarifa; Excel vacío.

Validación reopen:

- `test/compras-flete-tarifa-016.test.js` → 19/19
- `test/compras-dashboard-013.test.js` → 34/34
- `test/compras-hg-kilos-014.test.js` → 17/17
- `frontend-dashboard` `npm run build` OK. No se commitea `.next`.
