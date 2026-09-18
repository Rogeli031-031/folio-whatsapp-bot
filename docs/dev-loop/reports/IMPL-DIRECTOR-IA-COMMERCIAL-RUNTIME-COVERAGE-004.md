# IMPL-DIRECTOR-IA-COMMERCIAL-RUNTIME-COVERAGE-004

## Identidad

| Campo | Valor |
|---|---|
| task_id | IMPL-DIRECTOR-IA-COMMERCIAL-RUNTIME-COVERAGE-004 |
| base SHA | 2e50dabae05df7cdad24cbfefaca285c16615db8 |
| branch | implementation/director-ia-commercial-runtime-coverage-004 |
| schema_changes | false |
| data_mutation | false |
| frontend tocado | no |
| `npm run build` | no ejecutado — no se tocó `frontend-dashboard/` |
| merge | false |
| deploy | false |
| PR | no |

## Resultado de tests

Suite 004 + 003 + movement/backlog/historical-new-clients: **83/83 verdes**.

| Familia | utterances | passed | failed |
|---|---|---|---|
| NEW_CLIENTS | 30 | 30 | 0 |
| NEW_CLIENT_PURCHASE_TOTAL | 30 | 30 | 0 |
| NEW_CLIENT_DISCOUNT | 30 | 30 | 0 |
| NEW_CLIENT_RETENTION | 30 | 30 | 0 |
| LOST_CLIENTS | 30 | 30 | 0 |
| LOST_CLIENT_VOLUME_TOTAL | 30 | 30 | 0 |
| DECREASED_CLIENT_VOLUME_TOTAL | 30 | 30 | 0 |
| CLIENT_CHURN_RISK | 30 | 30 | 0 |
| EXPECTED_NEXT_PURCHASE | 30 | 30 | 0 |
| SALES_CHANNEL_SHARE | 30 | 30 | 0 |
| SALES_CHANNEL_SHARE_CHANGE | 30 | 30 | 0 |
| TOP_CLIENTS_BY_CHANNEL | 30 | 30 | 0 |
| SALES_MIX_SHIFT | 30 | 30 | 0 |
| CHANNEL_FORECAST_GUARDRAIL | 30 | 30 | 0 |
| **Total** | **420** | **420** | **0** |

- anti-collisions: 200
- multi-turn: 80
- 12 regresiones de la prueba real de Acapulco: verdes
- 003 (30/familia, anti-collisions, E2E): verde
- listado P1 «¿Qué clientes nuevos entraron en agosto?» se conserva en `historical_new_clients`

Las 420 utterances viven en `test/fixtures/director-ia-commercial-runtime-coverage-004.js`. **No** se importan desde runtime. No son phrasebook de producción.

## Familias

### NEW_CLIENTS

| | |
|---|---|
| before | Listado NEW_IN_PERIOD ya respondía. |
| after | Se conserva. Semántica `kg_B > 0 && kg_A <= 0`. |
| intent | `historical_new_clients` si «entraron/hubo/dime los/qué clientes nuevos»; si no, `client_movement` NUEVOS |
| physical source | ARR `computeClientesDescuentoMes` |
| semantic rule | NEW_IN_PERIOD |

### NEW_CLIENT_PURCHASE_TOTAL

| | |
|---|---|
| before | «¿Cuánto compraron los clientes nuevos de agosto?» repetía solo ranking. |
| after | Primero agregado: count + toneladas en conjunto; luego detalle. |
| intent | `client_movement` + `want_aggregate` |
| physical source | ARR ventas cliente (`kg_B` de NUEVOS) |
| semantic rule | `SUM(kg_B)` del conjunto NUEVOS, no solo top 10 |

### NEW_CLIENT_DISCOUNT

| | |
|---|---|
| before | «¿Qué descuento tuvieron los clientes nuevos?» caía a Action Register / client_profile. |
| after | ARR descuento contractual. No Action Register. |
| intent | `client_movement` + `want_discount` |
| physical source | ARR `monto` / `kg` de `computeClientesDescuentoMes` |
| semantic rule | `descuento_kg = ABS(SUM(monto_descuento)) / SUM(kg)` si `SUM(kg) > 0`. Sin evidencia: no inventa. |

### NEW_CLIENT_RETENTION

| | |
|---|---|
| before | Fallaba o usaba el mes pedido como M+1. |
| after | Cohorte M = periodo pedido; retenido = compra > 0 en M+1. |
| intent | `predictive_commercial` |
| physical source | ARR movimiento mes M y M+1 |
| semantic rule | `retention_rate = retained_next_month_count / new_clients_count`. Lista retained / not_retained si se pide. Sin mes posterior: no afirma retención. |

### LOST_CLIENTS

| | |
|---|---|
| before | Listaba DEJARON_DE_COMPRAR. |
| after | Se conserva. |
| intent | `client_movement` DEJARON_DE_COMPRAR |
| physical source | ARR |
| semantic rule | `kg_B <= 0 && kg_A > 0` |

### LOST_CLIENT_VOLUME_TOTAL

| | |
|---|---|
| before | Listaba y no sumaba. |
| after | TOTAL `lost_volume` + detalle. |
| intent | `client_movement` + aggregate |
| physical source | ARR |
| semantic rule | `lost_volume = SUM(ABS(delta_kg))` del conjunto DEJARON |

### DECREASED_CLIENT_VOLUME_TOTAL

| | |
|---|---|
| before | Listaba DISMINUYERON y no sumaba. |
| after | TOTAL `SUM(ABS(delta_kg))` + detalle. |
| intent | `client_movement` DISMINUYERON + aggregate |
| physical source | ARR |
| semantic rule | `kg_A > 0 && kg_B > 0 && kg_B < kg_A` |

### CLIENT_CHURN_RISK

| | |
|---|---|
| before | Solo metodología («Puedo marcar señales…»). |
| after | Materializa clientes cuando hay `last_purchase_date` + `freqDays`. |
| intent | `predictive_commercial` |
| physical source | DICF cache `arr.dicf_cliente_mes` (lectura) + `MAX(fecha)` ARR por cliente |
| semantic rule | Señal de interrupción / retraso vs frecuencia. No afirma «va a dejar de comprar». Sin freq: `INSUFFICIENT_EVIDENCE`. No hay score predictivo. No se llama `computeDicf` (escribe cache). |

### EXPECTED_NEXT_PURCHASE

| | |
|---|---|
| before | Solo explicaba la fórmula. |
| after | Fecha = `last_purchase_date + freqDays` cuando hay evidencia. |
| intent | `predictive_commercial` |
| physical source | DICF freqDays + última compra ARR |
| semantic rule | Estimación histórica, no compromiso, no forecast contractual. Declara exactamente qué evidencia falta. |

### SALES_CHANNEL_SHARE

| | |
|---|---|
| before | A veces caía a movimiento. |
| after | Toneladas + % + periodo. |
| intent | `predictive_commercial` |
| physical source | ARR `queryMonthlySales` |
| semantic rule | `casa_share = casa_ton / (casa_ton + comisionista_ton)` |

### SALES_CHANNEL_SHARE_CHANGE

| | |
|---|---|
| before | Colisionaba con movimiento / % relativo. |
| after | `share_B - share_A` en **pp**. |
| intent | `predictive_commercial` |
| physical source | ARR dos meses |
| semantic rule | Puntos porcentuales, no % relativo salvo pedido explícito. |

### TOP_CLIENTS_BY_CHANNEL

| | |
|---|---|
| before | «Dame los 10 clientes comisionistas que más compran» caía a movimiento o ranking sin familia 004. |
| after | Ranking filtrado CASA/COMISIONISTA; 003 conserva `client_ranking` para «top 10 Comisionistas que más compran». |
| intent | `client_ranking` (003) o familia 004 de test; no `client_movement` |
| physical source | ARR ventas observada |
| semantic rule | top N, periodo, toneladas; participación canal/total cuando se pide |

### SALES_MIX_SHIFT

| | |
|---|---|
| before | Caía a movimiento / `delta_sales`. |
| after | Mix comercial ARR = Casa vs Comisionista en pp, salvo autotanque/carburación/subcategoría. |
| intent | `predictive_commercial` |
| physical source | ARR |
| semantic rule | Δ participación canal en pp |

### CHANNEL_FORECAST_GUARDRAIL

| | |
|---|---|
| before | «¿Cuál será la venta proyectada de Casa?» devolvía forecast de planta (1373.2 t). |
| after | `CHANNEL_FORECAST_NOT_AVAILABLE`. No reparte `forecast_total * share`. |
| intent | `predictive_commercial` |
| physical source | IGF forecast es solo planta completa; no hay forecast contractual por canal/cliente |
| semantic rule | Guardrail. Puede ofrecer venta/participación observada o forecast total de planta, sin atribuirlo al canal. |

## Contexto conversacional

- Follow-up «agosto» tras DEJARON hereda movimiento; «¿Cuántas toneladas perdimos por esos?» no vuelve a pedir mes.
- Result set: «con ellos», «cuáles eran comisionistas», descuento del conjunto previo.
- No sobrehereda: movimiento agosto + «qué porcentaje de enero fue Casa» → `SALES_CHANNEL_SHARE` enero.

## Source discipline

- Ventas / descuento / movimiento / mix / share: ARR
- Frecuencia: DICF (lectura)
- Forecast: IGF total planta
- Action Register: no se usa para métricas comerciales

## No inventar

No hay forecast por cliente/Casa/Comisionista, probabilidad de churn, fecha próxima sin freqDays, descuento sin monto/kg, retención sin mes posterior.

## Limitaciones

1. Señales DICF en runtime leen `arr.dicf_cliente_mes` si existe; no se recalcula DICF porque `computeDicf` muta cache.
2. TOP_CLIENTS_BY_CHANNEL de 003 («top 10 Comisionistas que más compran») permanece en `client_ranking` para no romper E2E 003; la pregunta real «clientes comisionistas» no cae a movimiento.
3. Frontend no se tocó: IGF UI, OPEN_PRONOSTICO, Action Register, folios, schema, permissions, deploy, Node, exceljs intactos.

## Cierre

CURRENT_TASK → `DONE_PENDING_REVIEW`. Commit + push solo de esta rama. No PR. No merge. No deploy. No siguiente tarea.
