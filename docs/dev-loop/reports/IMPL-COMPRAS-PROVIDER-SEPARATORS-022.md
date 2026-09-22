# IMPL-COMPRAS-PROVIDER-SEPARATORS-022

## Identidad

```yaml
task_id: "IMPL-COMPRAS-PROVIDER-SEPARATORS-022"
outcome: "DONE"
files_touched:
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "test/compras-provider-separators-022.test.js"
  - "test/compras-flete-collapse-021.test.js"
  - "docs/dev-loop/reports/IMPL-COMPRAS-PROVIDER-SEPARATORS-022.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "docs/director-ia/"
  - "API"
  - "schema DB"
  - "persistencia"
  - "fórmulas"
  - "Excel"
  - "Director IA"
  - "ARR / IGF"
  - "frontend-dashboard/.next (no commiteado)"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "Se ajustó un regex de 021 C para aceptar Fragment alrededor del origen de flete + gap. El toggle y el default oculto no cambian."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | IMPL-COMPRAS-PROVIDER-SEPARATORS-022 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | ccbde39247369dfa39e79839dc56293bf95026e0 |
| branch | implementation/compras-provider-separators-022 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Gap pequeño entre proveedores

`COMPRAS_PROVIDER_GAP_CLS` = `compras-provider-gap w-3 min-w-[12px] border-0 bg-white p-0`

Columna vacía blanca, sin texto y sin borde negro, después de cada proveedor de compras (incluido el último, antes de CONSOLIDADO).

Misma columna en encabezado (`rowSpan={3}`), filas diarias, Semana N y TOTAL MES.

No se usa 70px entre proveedores.

## Separadores grandes

Sin cambio:

- CONSOLIDADO compras → HG: `compras-hg-gap` 70px
- HG → Flete: `compras-flete-gap` 70px

## Flete oculto / desplegado

Oculto: `FleteRowCells` no se renderiza; los gaps internos de orígenes no ocupan ancho.

Desplegado: cada origen (COMPRA KG | TARIFA | IMPORTE) lleva gap ~12px. CONSOLIDADO de flete no tiene gap final.

El toggle 021 no cambia: inicia oculto, sin API extra, sin persistencia.

## Colspan

`comprasGridColSpan(n, fleteExpanded)`:

`1 + n*3 + n + 3 + 1 + 3 + 1 + (fleteExpanded ? n*3 + n + 3 : 0)`

Ejemplos con 3 proveedores: oculto = 21; desplegado = 36.

Banner de flete: `providers.length * 4 + 3`.

## Tests

`test/compras-provider-separators-022.test.js` A–T: pass.

Regresión: 021, 020, 016, 013, 014 pass.

Total: 125 pass / 0 fail.

## Build

`cd frontend-dashboard && npm run build`: Compiled successfully. `/compras` 8.7 kB.

`.next` no se commitea.

## Cierre

CURRENT_TASK → `DONE_PENDING_REVIEW`.

Commit + push solo a `implementation/compras-provider-separators-022`.

STOP. No PR. No merge. No deploy. No siguiente tarea.
