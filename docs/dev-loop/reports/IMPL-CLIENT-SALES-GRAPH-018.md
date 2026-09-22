# IMPL-CLIENT-SALES-GRAPH-018

## Identidad

```yaml
task_id: "IMPL-CLIENT-SALES-GRAPH-018"
outcome: "DONE"
files_touched:
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
  - "frontend-dashboard/components/DeltaIngresoClienteForecastModal.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "lib/commercial-trend-engine.js"
  - "server.js"
  - "test/client-sales-graph-018.test.js"
  - "docs/dev-loop/reports/IMPL-CLIENT-SALES-GRAPH-018.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "docs/director-ia/"
  - "Director IA planner/chat/intents"
  - "cálculo Delta Ingreso / Ingreso A / Ingreso B"
  - "Compras / HG / Flete"
  - "schema DB"
  - "mutación ARR"
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
| task_id | IMPL-CLIENT-SALES-GRAPH-018 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | d3fa61b457ce730f256e2912f33af2f13d12b32e |
| branch | implementation/client-sales-graph-018 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Auditoría — gráfica reutilizada

No se copió un motor gráfico nuevo.

| Pieza | Existente | Uso 018 |
|---|---|---|
| Componente | `ArrVentaGraficaModal.tsx` | Mismo archivo. `mode: "canal" \| "cliente"` |
| Endpoint | `GET /api/arr/venta-serie` | Query opcional `cliente_norm` |
| Motor | `lib/commercial-trend-engine.js` | Filtro SQL exacto por `cliente_norm` |
| Fuente física | `arr.ventas_diarias_cliente` + `arr.descuentos_diarios_cliente` | Igual, filtrada al cliente |
| Identidad | `cliente.cliente` DICF = `cliente_norm` ARR | `LOWER(TRIM(cliente_norm))` igualdad, no LIKE |
| Ventanas | `resolveRangeWindow` 1d/5d/1m/3m/ytd/1a/5a/todo | Ancla planta `MIN/MAX(fecha)` sin reinterpretar |
| Trendline | OLS `linearTrend` del componente | Misma función; serie ya filtrada |
| Comentarios | `arr.cliente_comentarios` adjuntos a `clientes_top` | Un solo nombre → solo ese cliente |
| CASA/COMISIONISTA | `ArrClient` sin `mode` | Selector y tooltip MXN intactos |

## Implementación

Delta Ingreso Cliente Forecast muestra **GRAFICA** junto al nombre. Al abrir, monta el mismo modal (`z-[60]`) con:

- título `Gráfica · Toneladas de venta`
- subtítulo `<cliente_norm> · <planta>`
- sin selector CASA/COMISIONISTA
- canal API `ambos` + `cliente_norm`
- tooltip: toneladas + `Descuento: $X.XXX/kg` o `—`
- panel `MOVIMIENTO DEL CLIENTE` (incluye `sin_cambio`)
- `ÚLTIMOS COMENTARIOS` del mismo cliente
- vacío: `Sin ventas del cliente en este periodo.`

Cerrar la gráfica solo hace `setShowClienteGrafica(false)`. El padre queda montado.

El histórico no se pide al abrir Delta; `fetchArrVentaSerie` corre al montar la gráfica.

`descuento_kg = ABS(descuento_mxn) / (venta_ton * 1000)` solo si hay fila de descuento y kg > 0. CASA sigue mostrando `descuento_mxn`.

## Tests

- `test/client-sales-graph-018.test.js` → 18/18 (A–W)
- Motor CASA/COMISIONISTA (`director-ia-commercial-trend` OLS/rango/canal/top-6/parity/delegación) → 14/14

Planner/hold-outs de `commercial_trend` (`¿Cómo vamos…?` → `executive_sales_context` / `category_commission`) ya fallan en `d3fa61b4` (017). Fuera de alcance 018. No reabiertos.

No hay suite UI previa de Delta Ingreso Cliente Forecast ni de `ClienteComentariosPanel`. Cubiertos en 018 A/R/S.

## Build

`cd frontend-dashboard && npm run build` → OK (types + compile).

`.next` no se commitea.

## Cierre

CURRENT_TASK → `DONE_PENDING_REVIEW`.

Commit + push solo a `implementation/client-sales-graph-018`.

STOP. No PR. No merge. No deploy. No siguiente tarea.
