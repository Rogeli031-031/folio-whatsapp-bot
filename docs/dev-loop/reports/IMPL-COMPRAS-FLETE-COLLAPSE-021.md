# IMPL-COMPRAS-FLETE-COLLAPSE-021

## Identidad

```yaml
task_id: "IMPL-COMPRAS-FLETE-COLLAPSE-021"
outcome: "DONE"
files_touched:
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "test/compras-flete-collapse-021.test.js"
  - "docs/dev-loop/reports/IMPL-COMPRAS-FLETE-COLLAPSE-021.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "docs/director-ia/"
  - "schema DB"
  - "API"
  - "persistencia HG"
  - "persistencia tarifas"
  - "fórmulas COSTO/HG/IMPORTE"
  - "Excel"
  - "Director IA"
  - "ARR / IGF"
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
| task_id | IMPL-COMPRAS-FLETE-COLLAPSE-021 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | d3c2e13f0e62446afd7354331b39b8e7cb793fbc |
| branch | implementation/compras-flete-collapse-021 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Separadores 70px

Se reemplazaron los gaps finos `w-3` por columnas vacías blancas de ancho estándar:

`min-w-[70px] w-[70px]` (`COMPRAS_SEP_CLS`)

Ubicación exacta:

1. `compras-hg-gap` — entre CONSOLIDADO compras y HG
2. `compras-flete-gap` — entre HG y VALOR DEL FLETE

Ambas existen en encabezado (`rowSpan={3}`), filas diarias, Semana N y TOTAL MES. No tienen texto. Permanecen visibles con flete oculto o desplegado.

No se reintrodujeron gaps entre proveedores de compras.

## Default oculto

`fleteExpanded` inicia en `false` (`useState(false)`).

Al abrir `/compras` se ve:

FECHA | proveedores de compra | CONSOLIDADO compra | separador | HG | separador

No se renderizan título, orígenes, CONSOLIDADO de flete ni filas internas de flete.

## Toggle

Botón en la barra superior:

- oculto: `▶ MOSTRAR FLETE`
- desplegado: `▼ OCULTAR FLETE`

`aria-expanded={fleteExpanded}`

`aria-label`: "Mostrar valor del flete según origen" / "Ocultar valor del flete según origen"

`onClick` solo hace `setFleteExpanded((v) => !v)`.

## Colspan dinámico

`comprasGridColSpan(providerCount, fleteExpanded)`:

`1 + n*3 + 3 + 1 + 3 + 1 + (fleteExpanded ? n*3 + 3 : 0)`

Usado en fila vacía/loading y en `compras-week-gap`.

Ejemplos: 3 proveedores oculto = 18; desplegado = 30.

Con flete oculto no quedan celdas invisibles ni hueco del bloque.

## No API extra

Mostrar/ocultar no llama `fetchComprasMonth` ni otra API. Los datos ya cargados se re-renderizan.

## No persistencia

No se guarda `fleteExpanded` en DB ni en `localStorage`. El `localStorage` existente sigue siendo solo planta/año/mes (`compras-dashboard-sheet`).

## HG y compras

Sin cambios de fórmulas, persistencia, Excel, anchos internos de HG ni estilo de flete al desplegar.

## Tests

`test/compras-flete-collapse-021.test.js` A–T: pass.

Regresión:

- `test/compras-hg-costo-importe-020.test.js` pass
- `test/compras-flete-tarifa-016.test.js` pass
- `test/compras-dashboard-013.test.js` pass
- `test/compras-hg-kilos-014.test.js` pass

Total: 105 pass / 0 fail.

## Build

`cd frontend-dashboard && npm run build`: Compiled successfully. `/compras` 8.66 kB.

`.next` no se commitea.

## Cierre

CURRENT_TASK → `DONE_PENDING_REVIEW`.

Commit + push solo a `implementation/compras-flete-collapse-021`.

STOP. No PR. No merge. No deploy. No siguiente tarea.
