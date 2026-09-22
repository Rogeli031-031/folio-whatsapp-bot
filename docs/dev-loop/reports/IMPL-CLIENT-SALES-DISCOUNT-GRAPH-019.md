# IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019

## Identidad

```yaml
task_id: "IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019"
outcome: "DONE"
files_touched:
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
  - "test/client-sales-discount-graph-019.test.js"
  - "docs/dev-loop/reports/IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/commercial-trend-engine.js"
  - "frontend-dashboard/lib/api.ts"
  - "Delta Ingreso / Ingreso A / Ingreso B"
  - "tabla mensual Venta y descuento por mes"
  - "arr.descuentos_diarios_cliente"
  - "Director IA"
  - "Compras / HG / Flete"
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
| task_id | IMPL-CLIENT-SALES-DISCOUNT-GRAPH-019 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | cdda80f88bb0074d688a024adda42683b9bf6d89 |
| branch | implementation/client-sales-discount-graph-019 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Qué se hizo

Solo `mode === "cliente"` en `ArrVentaGraficaModal`.

| Serie | Eje | Color | Escala |
|---|---|---|---|
| Venta (Ton) | izquierdo | `#ca8a04` | toneladas + tendencia OLS |
| Descuento ($/kg) | derecho | `#7c3aed` | `discountGraphValue = ABS(descuento_kg)` |

Mismo eje X y las mismas ventanas 1D–Todo. No hay segunda lógica temporal.

Dato contractual: `points[].descuento_kg` de `GET /api/arr/venta-serie` / `assemblePoints` (`ABS(descuento_mxn)/kg` si hay fila de descuento). La gráfica no recalcula desde otra fuente. El ABS de presentación no se persiste.

## null vs 0

- `null`: sin fila de descuento → hueco (`buildGappedPath` corta la línea). No se dibuja 0.
- `0`: evidencia explícita → se grafica en 0 y el tooltip muestra `$0.000/kg`.

Si la ventana no tiene ningún descuento: el eje derecho se oculta; la venta sigue.

## Tooltip / tendencia / no afectación

Tooltip cliente: toneladas + `Descuento: $X.XXX/kg` o `—`. Nunca signo negativo.

Tendencia: solo `series.ton`. Leyenda: `Línea de tendencia · venta`.

CASA/COMISIONISTA (`mode === "canal"`): una serie, sin eje derecho de $/kg.

Tabla `Venta y descuento por mes (Enero → Forecast)` no se tocó.

## Tests

- `test/client-sales-discount-graph-019.test.js` → 18/18 (A–X)
- `test/client-sales-graph-018.test.js` → 18/18
- Motor gráfico (OLS/rango/canal/top-6/parity/delegación) → pasa

Planner `commercial_trend` (`¿Cómo vamos…?` → `executive_sales_context` / `category_commission`) ya fallaba en `cdda80f8` / 017. Fuera de alcance. No reabierto.

## Build

`cd frontend-dashboard && npm run build` → OK (compile + types).

`.next` no se commitea.

## Cierre

CURRENT_TASK → `DONE_PENDING_REVIEW`.

Commit + push solo a `implementation/client-sales-discount-graph-019`.

STOP. No PR. No merge. No deploy. No siguiente tarea.
