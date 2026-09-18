# IMPL-DIRECTOR-IA-PREDICTIVE-COMMERCIAL-COVERAGE-003

## Identidad

| Campo | Valor |
|---|---|
| task_id | IMPL-DIRECTOR-IA-PREDICTIVE-COMMERCIAL-COVERAGE-003 |
| base SHA | b5a3e1c0d21e4ee7a266711d73b0b79988939e0d |
| branch | implementation/director-ia-predictive-commercial-coverage-003 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Source map

| Family | Status | 30/30 | Source | Metric | Numerator | Denominator | Observed/Forecast | Plant | Channel | Period | No-data | Follow-up | Anti-collision | Limitation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CLIENT_CHURN_RISK | PARTIAL | sí | DICF `lastPurchaseDate` + `freqDays` | señales de atraso | días desde última compra | frecuencia histórica | OBSERVED | planta UI | Casa/Comi/ALL | as-of | sin freqDays no se afirma riesgo | canal/limit | ≠ DEJARON_DE_COMPRAR | No afirma «va a dejar de comprar». Sin DICF no hay señal. |
| EXPECTED_NEXT_PURCHASE | PARTIAL | sí | DICF last + freqDays | fecha estimada | lastPurchaseDate + freqDays | — | OBSERVED | planta UI | opcional cliente | ventana | sin frecuencia no hay fecha | conserva cliente | ≠ LAST_PURCHASE sola | «según frecuencia histórica», no compromiso. |
| NEW_CLIENT_RETENTION | SUPPORTED | sí | `computeClientesDescuentoMes` | retención NEW_IN_PERIOD | nuevos del mes previo que compran en B | clientes con estatus Nuevo en A | OBSERVED | planta ARR | canal si se pide | mes A→B | sin generación comparable | periodo | ≠ CLIENTS_NEW / FIRST_EVER | NEW_IN_PERIOD, no primera compra histórica. |
| CLIENT_CHURN_RATE | SUPPORTED | sí | `computeClientesDescuentoMes` | tasa de pérdida | kg_B≤0 | clientes con kg_A>0 | OBSERVED | planta ARR | canal/subcat si se pide | mes | sin base previa | periodo | ≠ CHURN_RISK / DEJARON lista | Denominador contractual: compraron el mes previo. |
| CLIENT_PARETO | SUPPORTED | sí | `arr.ventas_diarias_cliente` | acumulación de ton | kg acumulado ordenado | kg total observado del scope | OBSERVED | planta | Casa/Comi/subcat | mes | sin volumen | umbral 50/70/80/90 | ≠ concentración proyectada | No llama «estratégicos». |
| SALES_MIX_SHIFT | SUPPORTED | sí | `queryMonthlySales` canal/subcanal | participación % | kg categoría | kg total observado | OBSERVED | planta | mix de categorías | mes vs previo | sin mezcla | periodo | ≠ toneladas absolutas; ≠ solo Casa/Comi share | Autotanque/Carburación son mix, no share de canal. |
| FORECAST_ACCURACY | SOURCE_MISSING | sí | no hay snapshot histórico de forecast | — | — | — | n/d | — | — | — | mensaje de ausencia | — | ≠ FORECAST_CLOSE | No se recalcula hoy un mes viejo. |
| DATA_FRESHNESS | PARTIAL | sí | `MAX(fecha)` de `arr.ventas_diarias_cliente` | corte | — | — | OBSERVED | planta | — | — | sin MAX(fecha) | — | ≠ fecha del servidor | Solo se auditó ARR ventas. IGF/otras fuentes no se afirman. |
| COMMERCIAL_ANOMALIES | CONTRACT_MISSING | sí | — | — | — | — | — | — | — | — | criterio ausente | — | ≠ intuición LLM | No hay método estadístico aprobado. |
| SINCE_LAST_REVIEW | PARTIAL | sí | necesita `reference_timestamp` | — | — | — | — | — | — | — | pide fecha | periodo explícito | no inventa «última junta» | Pregunta: ¿desde qué fecha comparar? |
| SALES_CHANNEL_SHARE | PARTIAL | sí | observed: `queryMonthlySales` + `canalSqlFor`; forecast canal: **no existe** | VENTA_TON % | casa_ton / comi_ton | casa_ton + comisionista_ton | OBSERVED soportado; FORECAST SOURCE_MISSING | planta | CASA, COMISIONISTA | mes | sin venta observada | periodo / «y proyectado» | ≠ venta absoluta; ≠ % de clientes | No se reparte el forecast de planta. |
| SALES_CHANNEL_SHARE_CHANGE | SUPPORTED | sí | dos meses de venta observada | puntos porcentuales | Δ (casa_pct, comi_pct) | mismos denominadores observados | OBSERVED | planta | CASA, COMISIONISTA | mes vs previo | sin ambos meses | periodo | ≠ «+5.2%» si es +5.2 pp | Respuesta etiqueta `pp`. |
| TOP_CLIENTS_PROJECTED_SHARE | SUPPORTED | sí | ranking observado + `arr.forecast_mensual` planta | VENTA_TON | **kg observado del cliente** | **kg_forecast total planta** | OBSERVED_OVER_PROJECTED_PLANT (regla A) | planta | default Comisionista | mes | sin ranking o sin forecast planta | ranking→%→limit→canal | ≠ ranking puro; ≠ forecast por cliente | No existe forecast contractual por cliente. |
| TOP_CLIENTS_PROJECTED_CONCENTRATION | SUPPORTED | sí | mismo que share | % acumulado top N | Σ kg observados top N | kg_forecast planta | OBSERVED_OVER_PROJECTED_PLANT | planta | Casa/Comi/ALL | mes | igual | juntos / top 5 / ahora Casa | ≠ % individual | Acumulado, no «proyección del cliente». |

## Casa vs Comisionista — fuentes

### Observed

- Tabla: `arr.ventas_diarias_cliente` (+ `arr.cliente_categoria_mes` para canal).
- Helper: `queryMonthlySales` / `canalSqlFor`.
- Fórmula: `casa_pct = casa_ton / (casa_ton + comisionista_ton) * 100`.
- Se muestran toneladas si existen.

### Forecast por canal

- `arr.forecast_mensual` / `getForecastByPlant` es **total planta** (`SUM(kg_forecast)`).
- No hay forecast contractual Casa/Comisionista.
- El factor planta × kg observado **no** se usa para inventar share proyectado.
- Pregunta «qué porcentaje proyectado es Casa»: `SOURCE_MISSING` / PARTIAL con texto explícito.

## Top Comisionistas vs total proyectado

- **A (usada):** venta observada del cliente / cierre proyectado total de planta.
- **B (no usada):** forecast individual / forecast planta. No existe fuente contractual de B.
- La respuesta dice: «venta observada como porcentaje del cierre proyectado total». «No es proyección del cliente».

## Follow-up

Cadena soportada:

1. top 10 Comisionistas que más compran → `client_ranking`
2. septiembre → periodo
3. qué porcentaje representa cada uno del total proyectado → `RANK_COMPOSITION` + denominador planta
4. y juntos cuánto → concentración
5. solo top 5 → limit
6. ahora Casa → channel

Conserva plant/period/channel/limit/denominator/result_set. Share Casa/Comi + «enero» + «y proyectado» cambia `DATA_SEMANTICS` a FORECAST y no inventa split.

## Cobertura de tests

- 14 familias × ≥30 utterances distintas en `test/fixtures/director-ia-predictive-commercial-coverage.js` (no phrasebook runtime).
- ≥100 anti-collisions nuevas.
- ≥50 E2E multi-turn.
- Assertion automática `utterance_count >= 30` y clasificación por familia.
- Regresión 002 (30/30, 150 anti, 100 E2E, pending DEJARON) verde.

## Limitaciones honestas

1. No hay snapshot histórico de forecast: FORECAST_ACCURACY = SOURCE_MISSING.
2. No hay forecast por canal ni por cliente.
3. Anomalías sin contrato: CONTRACT_MISSING.
4. Frescura: solo MAX(fecha) de ventas ARR, no IGF ni demás tablas.
5. Riesgo / próxima compra dependen de DICF freqDays.
6. Sprint1 Q2/Q3 (`profitability_period_ranking` / `client_profile`) ya existían en el linaje integrado; no se reabrieron.

## Cierre

CURRENT_TASK → DONE_PENDING_REVIEW.  
Push solo `implementation/director-ia-predictive-commercial-coverage-003`.  
NO PR. NO merge. NO deploy. NO siguiente tarea.
