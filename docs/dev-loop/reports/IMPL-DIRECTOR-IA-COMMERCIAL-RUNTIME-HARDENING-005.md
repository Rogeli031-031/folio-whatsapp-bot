# IMPL-DIRECTOR-IA-COMMERCIAL-RUNTIME-HARDENING-005

## Identidad

| Campo | Valor |
|---|---|
| task_id | IMPL-DIRECTOR-IA-COMMERCIAL-RUNTIME-HARDENING-005 |
| base SHA | df95fafa919a31b37f8efaa82f9d1f7e7bf68dd3 |
| branch | implementation/director-ia-commercial-runtime-hardening-005 |
| schema_changes | false |
| data_mutation | false |
| frontend tocado | no |
| `npm run build` | no ejecutado — no se tocó `frontend-dashboard/` |
| merge | false |
| deploy | false |
| PR | no |

## Resultado de tests

Suites 005 + 004 + 003 + movement/backlog/ranking/discount/historical-new-clients: **verdes**.

| Familia 005 | utterances | passed | failed |
|---|---|---|---|
| CONTEXTUAL_NEW_CLIENT_COUNT | 30 | 30 | 0 |
| NEW_CLIENT_DISCOUNT_EVIDENCE | 30 | 30 | 0 |
| LOST_VOLUME_CONTEXTUAL_AGGREGATE | 30 | 30 | 0 |
| PENDING_CLARIFICATION_OPERATION | 30 | 30 | 0 |
| CHURN_RISK_MATERIALIZATION | 30 | 30 | 0 |
| EXPECTED_NEXT_PURCHASE_MATERIALIZATION | 30 | 30 | 0 |
| CHANNEL_SHARE_REFERENCE_PERIOD | 30 | 30 | 0 |
| CHANNEL_FORECAST_PROJECTION_GUARDRAIL | 30 | 30 | 0 |
| **Total nuevo** | **240** | **240** | **0** |

- anti-collisions nuevas: 166 (≥120)
- multi-turn nuevas: 60 (≥60)
- regresiones literales de la prueba real: verdes
- suite 004 (420 + 200 + 80): verde
- suite 003: verde

Las 240 utterances viven en `test/fixtures/director-ia-commercial-runtime-hardening-005.js`. **No** se importan desde runtime. No son phrasebook de producción.

## Fallos reales corregidos

### 1. Contexto de «total de clientes nuevos»

| | |
|---|---|
| before | Tras «¿Qué clientes nuevos entraron en agosto?» (historical_new_clients) el follow-up «total de clientes nuevos» pedía el mes. |
| after | Hereda `period = agosto 2026` y `family = NEW_CLIENTS`. Responde: «En agosto de 2026 entraron 68 clientes nuevos.» |
| intent | `client_movement` + `want_count` |
| physical source | ARR movimiento NUEVOS |
| semantic rule | Count-only. No vuelve a pedir mes si hay periodo en contexto o `periodoB` histórico. |

### 2. Descuento: DATA_NOT_FOUND ≠ 0

| | |
|---|---|
| before | Fila ausente de descuento se coercía a `monto=0` y se imprimía `0.0000 $/kg` (p. ej. RESIDENCIAL LAS OLAS). |
| after | `hasDiscountRow` / `discount_status=DATA_NOT_FOUND`. El agregado `ABS(SUM(monto))/SUM(kg)` solo usa filas con evidencia. Declara cobertura: X de N tienen evidencia; Y no tienen fila. |
| intent | `client_movement` + `want_discount` |
| physical source | `computeClientesDescuentoMes` (FULL OUTER JOIN; `d.monto` nulo si no hay fila) |
| semantic rule | missing discount row != 0. Cero real solo si hay fila física con monto 0 (`ZERO_OBSERVED`). |

### 3. Pérdida por clientes que cayeron a cero

| | |
|---|---|
| before | «¿Cuánto dejamos de vender por los clientes que cayeron a cero?» volvía a pedir mes o solo relistaba top 10. |
| after | Hereda agosto. Primero: «Pérdida total: X toneladas». |
| intent | `client_movement` + `want_aggregate` + DEJARON_DE_COMPRAR |
| physical source | ARR `delta_kg` |
| semantic rule | `SUM(ABS(delta_kg))` sobre `kg_A > 0 && kg_B <= 0` |

### 4. Follow-up de aclaración

| | |
|---|---|
| before | «¿Cuánto dejamos de vender…?» → «¿De qué mes?» → «agosto» podía volverse listado. |
| after | El frame pending guarda `want_aggregate`, `pending_operation=AGGREGATE`, `pending_family`, `pending_intent`. «agosto» completa periodo y conserva la operación. |
| intent | `client_movement` AGGREGATE, no RANK |
| semantic rule | La aclaración de mes no reemplaza la operación solicitada. |

### 5. CHURN RISK nunca vacío

| | |
|---|---|
| before | Podía quedar en silencio si no había DICF. |
| after | A) clientes con evidencia (cliente, última compra, freqDays, días desde última compra, días de retraso), B) `INSUFFICIENT_EVIDENCE`, o C) aclara periodo si falta. |
| intent | `predictive_commercial` / CLIENT_CHURN_RISK |
| physical source | `arr.dicf_cliente_mes` + `MAX(fecha)` ARR (solo lectura) |
| semantic rule | Sin probabilidad inventada. |

### 6. EXPECTED NEXT PURCHASE nunca vacío

| | |
|---|---|
| before | Silencio posible. |
| after | Fecha estimada + última compra + freqDays, o `INSUFFICIENT_EVIDENCE: falta freqDays`, o `INSUFFICIENT_EVIDENCE: falta última compra`. |
| intent | `predictive_commercial` / EXPECTED_NEXT_PURCHASE |
| semantic rule | `expected_next = last_purchase_date + freqDays`. No es forecast contractual. |

### 7. «Contra julio»

| | |
|---|---|
| before | Un solo mes explícito «contra julio» se resolvía como junio → julio (`previousYearMonth`). |
| after | Julio es periodo A (referencia). Periodo B = contexto conversacional (agosto). Si no hay B: «¿Contra julio respecto de qué mes?» |
| intent | `predictive_commercial` / SALES_CHANNEL_SHARE_CHANGE |
| semantic rule | context agosto + contra julio → julio → agosto. Nunca junio→julio salvo petición explícita. |

### 8. Top Comisionista — filtro físico

| | |
|---|---|
| before | El ranking inyectado no filtraba canal en memoria. |
| after | `rankClients` y `salesRows` inyectados filtran `COMISIONISTA`. Título: «Top N Comisionista — agosto de 2026». Test: ninguna fila Casa. |
| intent | `client_ranking` |
| physical source | ARR ventas con `canalFilter=comisionista` |

### 9. Forecast por canal reforzado

| | |
|---|---|
| before | «para septiembre que porcentaje de casa y de comisionistas proyectamos al cierre?» devolvía share observado 55/45. |
| after | `CHANNEL_FORECAST_NOT_AVAILABLE`. No contesta una proyección de canal con participación observada. |
| intent | `predictive_commercial` / CHANNEL_FORECAST_GUARDRAIL |
| semantic rule | Casa/Comisionista + proyectamos/forecast/cierre/esperamos/estimamos/terminará → guardrail. Se conserva 003 «porcentaje proyectado es Casa y Comisionista» / «cierre proyectado» (venta observada / forecast de planta). |

## Gate final

- [x] follow-up «total de clientes nuevos» hereda periodo
- [x] descuento ausente permanece DATA_NOT_FOUND
- [x] agregado descuento declara cobertura
- [x] pérdida por caídos hereda periodo
- [x] aclaración de mes conserva operación original
- [x] churn risk nunca responde vacío
- [x] expected next purchase nunca responde vacío
- [x] «contra julio» usa periodo B correcto
- [x] top Comisionistas filtra físicamente Comisionista
- [x] forecast/share proyectado por canal bloqueado
- [x] +240 utterances nuevas
- [x] +120 anti-collisions (166)
- [x] +60 multi-turn
- [x] regresiones reales verdes
- [x] suites 004 siguen verdes

## Fuera de alcance (intacto)

Frontend/IGF UI, Action Register, folios, schema, permisos, deploy, Node, exceljs, phrasebook de producción.

## STOP

Commit y push solo a `implementation/director-ia-commercial-runtime-hardening-005`.  
NO PR. NO merge. NO deploy. NO siguiente tarea.
