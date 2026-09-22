# IMPL-COMPRAS-HG-COSTO-IMPORTE-020

## Identidad

```yaml
task_id: "IMPL-COMPRAS-HG-COSTO-IMPORTE-020"
outcome: "DONE"
files_touched:
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "frontend-dashboard/lib/compras-format.ts"
  - "lib/compras-dashboard.js"
  - "lib/compras-excel.js"
  - "test/compras-hg-costo-importe-020.test.js"
  - "test/compras-hg-kilos-014.test.js"
  - "docs/dev-loop/reports/IMPL-COMPRAS-HG-COSTO-IMPORTE-020.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "docs/director-ia/"
  - "schema DB"
  - "arr.compras / arr.compras_hg (sin columnas nuevas)"
  - "arr.compras_flete_tarifas"
  - "Director IA"
  - "gráficas"
  - "frontend-dashboard/.next (no commiteado)"
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
| task_id | IMPL-COMPRAS-HG-COSTO-IMPORTE-020 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 79154e9885303622a0c9a6712029f67759e10e2d |
| branch | implementation/compras-hg-costo-importe-020 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Columnas removidas

Se quitaron los huecos intermedios `w-3` entre proveedores y antes de CONSOLIDADO (las X rojas). COMPRA KG / COSTO KG / IMPORTE de cada origen y el CONSOLIDADO de compra siguen.

Queda un hueco mínimo solo entre CONSOLIDADO compras → HG → VALOR DEL FLETE.

## CONSOLIDADO flete

El bloque final de VALOR DEL FLETE SEGÚN ORIGEN tiene encabezados alineados:

COMPRA KG | TARIFA | IMPORTE

El colspan del banner ya coincide con las columnas reales (sin gaps internos).

## Bloque HG

`COSTO | HG EN KILOS | IMPORTE`

- HG EN KILOS: único manual, `arr.compras_hg.hg_kilos`, celdas diarias grises `#d9d9d9`, más angostas.
- Semana / TOTAL MES: no editables, negrita.

## Fórmulas

`HG_COSTO = CONSOLIDADO.COSTO_KG + FLETE_CONSOLIDADO.TARIFA`

- 11.095 + 1.23 = 12.325
- tarifa null → costo null (no se asume 0)
- tarifa 0 explícita sí suma

`HG_IMPORTE = HG_COSTO × HG_EN_KILOS × -1`

- HG -100, costo 12 → +1,200
- HG +100, costo 12 → -1,200
- HG 0 → 0
- HG null o costo null → importe null

Semana / mes:

- HG = SUM diarios conocidos
- COSTO = costo kg consolidado del periodo + tarifa flete consolidada del periodo
- IMPORTE = SUM(importes HG diarios), no `COSTO_PERIODO × HG_PERIODO`
- Si un día tiene HG y costo null → importe del periodo null

No se persisten `hg_costo` ni `hg_importe`.

## Excel

Mismo bloque HG. Diario: fórmulas `COSTO = COSTO_KG + TARIFA` e `IMPORTE = COSTO * HG * -1`. Semana/mes: valores equivalentes (importe = suma diaria). CONSOLIDADO flete: COMPRA KG / TARIFA / IMPORTE. Sin `#DIV/0!` / `#REF!` / `#VALUE!`.

014 actualizó la columna de valor HG a 19 (el título del bloque sigue en 18).

## Tests

- `test/compras-hg-costo-importe-020.test.js` → 18/18 (A–U + no persistencia)
- `test/compras-dashboard-013.test.js` → verde
- `test/compras-hg-kilos-014.test.js` → verde
- `test/compras-flete-tarifa-016.test.js` → verde

## Build

`cd frontend-dashboard && npm run build` → OK.

`.next` no se commitea.

## Cierre

CURRENT_TASK → `DONE_PENDING_REVIEW`.

Commit + push solo a `implementation/compras-hg-costo-importe-020`.

STOP. No PR. No merge. No deploy. No siguiente tarea.
