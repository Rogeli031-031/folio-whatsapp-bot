# IMPL-COMPRAS-HG-KILOS-014

## Identidad

```yaml
task_id: "IMPL-COMPRAS-HG-KILOS-014"
outcome: "DONE"
files_touched:
  - "sql/022_compras_hg.sql"
  - "lib/compras-dashboard.js"
  - "lib/compras-excel.js"
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "frontend-dashboard/lib/compras-format.ts"
  - "frontend-dashboard/lib/compras-hg-write.js"
  - "frontend-dashboard/lib/compras-hg-write.d.ts"
  - "frontend-dashboard/lib/api.ts"
  - "test/compras-hg-kilos-014.test.js"
  - "test/compras-dashboard-013.test.js"
  - "docs/dev-loop/reports/IMPL-COMPRAS-HG-KILOS-014.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "docs/director-ia/"
  - "arr.compras (sin columna hg_kilos)"
  - "filtro de las 6 plantas"
  - "cálculo ponderado COMPRA KG / COSTO KG / IMPORTE / CONSOLIDADO"
  - "proveedores"
  - "facturas"
  - "server.js"
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
| task_id | IMPL-COMPRAS-HG-KILOS-014 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | de00d2e1a028d41e6d096f2059aeb6ddfb408092 |
| branch | implementation/compras-hg-kilos-014 |
| schema_changes | true |
| data_mutation | true |
| merge | false |
| deploy | false |
| PR | no |

## Arquitectura

Bloque independiente **HG EN KILOS** a la derecha de CONSOLIDADO, con gap visual. No forma parte del triple COMPRA KG / COSTO KG / IMPORTE.

- Persistencia: `arr.compras_hg`, un valor por `(planta_id, fecha)`.
- Semana N y TOTAL MES = `SUM` de los días con dato. No se persisten.
- Vacío = DELETE / ausencia. Cero es un valor guardado.
- GET `/api/compras` incluye `hg` y `grid.*.hg_kilos`.
- POST `/api/compras/hg` UPSERT o DELETE si `hg_kilos` es null/vacío.
- DELETE `/api/compras/hg?planta_id=&fecha=`.
- Auth + `assertPlantaAccess`. Cross-plant 403.
- Excel: columna HG EN KILOS en col 18 (tras gap 17). CONSOLIDADO permanece en 14.

### HG write failure ≠ reload failure

`commitHgWrite` separa WRITE y RELOAD. No comparten el mismo catch.

**WRITE failure** (`write(next)` lanza):

- `persisted: false`
- error visible: `No se pudo guardar HG.`
- `restore` = último valor confirmado por servidor
- no reload obligatorio
- el fallo no se convierte en 0 ni en vacío persistente
- no se implica persistencia exitosa

**WRITE OK + RELOAD OK**:

- `persisted: true`, `reloadOk: true`
- sin error
- la vista usa los datos confirmados del reload

**WRITE OK + RELOAD failure** (incluye DELETE vacío):

- el dato ya fue aceptado por backend
- `persisted: true`, `reloadOk: false`, `restore` = `next` (vacío si DELETE)
- error distinto: `HG guardado, pero no se pudo actualizar la vista.`
- NO se muestra `No se pudo guardar HG.`
- NO se restaura `confirmed` como si el write hubiera fallado
- el próximo GET/refresh mostrará el valor persistido

Saving/disabled se mantiene durante el write. Banner vía `onError={setError}`.

## Schema

`arr.compras_hg`: `id`, `planta_id` → `public.plantas(id)`, `fecha DATE`, `hg_kilos NUMERIC(14,3)` (positivo/negativo/cero), `created_by_usuario_id`, `updated_by_usuario_id`, `created_at`, `updated_at`, `UNIQUE (planta_id, fecha)`.

Migración: `sql/022_compras_hg.sql`. Runtime: `ensureComprasTables`. **No** se agregó `hg_kilos` a `arr.compras`.

## Tests

- `node --test test/compras-hg-kilos-014.test.js` → 17/17
- `node --test test/compras-dashboard-013.test.js` → 34/34
- Total combinado: 51/51

## Build

`frontend-dashboard`: `npm run build` (ver cierre). No se commitea `.next`.

## Cierre

- CURRENT_TASK → `DONE_PENDING_REVIEW`
- Commit + push solo a `implementation/compras-hg-kilos-014`
- NO PR / NO merge / NO deploy / NO siguiente tarea
