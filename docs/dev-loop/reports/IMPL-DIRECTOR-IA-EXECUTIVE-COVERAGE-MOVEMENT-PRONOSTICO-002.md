# IMPL-DIRECTOR-IA-EXECUTIVE-COVERAGE-MOVEMENT-PRONOSTICO-002

## Identidad

| Campo | Valor |
|---|---|
| task_id | IMPL-DIRECTOR-IA-EXECUTIVE-COVERAGE-MOVEMENT-PRONOSTICO-002 |
| base SHA | 0c5d9adc77cec2ea565ff21ee21cc9a4e997b9a8 |
| branch | implementation/director-ia-executive-coverage-movement-pronostico-002 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |

## Root cause — «dejaron → top venta»

`isClientRankingQuestion` aceptaba `top` + `clientes` antes de leer movimiento. El pending de periodo heredaba `parent_intent=client_ranking`. «septiembre» completaba el ranking VENTA_TON.

Corrección: excluir movimiento y OPEN_PRONOSTICO del ranking; ruteo `client_movement` antes de ranking; pending conserva `domain/operation/entity_type/movement/metric/direction/limit/plant/channel/subcategory`. El mes solo llena PERIOD.

## Definiciones físicas (ARR Clientes por mes)

Fuente: `dashboard-arr-forecast.computeClientesDescuentoMes` (histórico A = mes previo, B = mes pedido).

| Código | Regla física |
|---|---|
| DEJARON_DE_COMPRAR | kg_B ≤ 0 y kg_A > 0 |
| NUEVOS | kg_B > 0 y kg_A ≤ 0 (NEW_IN_PERIOD, no first-ever) |
| DISMINUYERON | ambos > 0 y kg_B < kg_A |
| AUMENTARON | ambos > 0 y kg_B > kg_A |

RANK dejaron: `ABS(delta_kg)` = LOST_VOLUME. LOST_INCOME usa `ABS(delta_ingreso)` cuando la pregunta nombra ingreso.

DICF Excel «Movimiento de clientes» (`lib/dicf.js`) usa otra regla (`ingreso_anterior>0 && ingreso_forecast≤0`) y ordena por ingreso anterior. No se duplicó. Se documenta la diferencia.

Activo / Latente / Inactivo y `freqDays` viven en DICF. Sin esa lectura: PARTIAL / no se inventa umbral.

## OPEN_PRONOSTICO

Backend: `abre/muéstrame/llévame` + pronóstico/forecast/proyección → `UI_ACTION OPEN_PRONOSTICO`. No afirma apertura.

Frontend: `DirectorIaChatPanel` ejecuta el callback; en IGF reutiliza `openPronosticoMiniRow`. Fuera de IGF navega a `/igf-forecast?open_pronostico=1`. No hay modal paralelo.

Anti-colisión: «cuál es el pronóstico» / «cómo vamos a cerrar» / «cuál es el PROY» no navegan. «abre venta diaria» no abre Pronóstico.

## Pending completion

`refineFrame` ya hacía merge. El frame de movimiento ahora incluye los campos semánticos. «septiembre» no reconstruye CLIENT_RANKING.

## Cobertura de lenguaje

- ≥30 utterances por familia en `test/fixtures/director-ia-executive-utterance-coverage.js`
- Test 30/30 automático
- ≥150 anti-collisions
- ≥100 conversaciones E2E
- El fixture no se importa desde `lib/`

## Matriz (resumen)

| Family | Status | 30/30 | Source | Metric | No-data | Follow-up | Limitation |
|---|---|---|---|---|---|---|---|
| CLIENTS_STOPPED_BUYING | SUPPORTED | sí | computeClientesDescuentoMes | LOST_VOLUME | sin comparación del mes | pending periodo/canal | — |
| CLIENTS_DECREASED | SUPPORTED | sí | idem | VOLUME_DELTA MOST_NEGATIVE | idem | idem | no es menor volumen absoluto |
| CLIENTS_INCREASED | SUPPORTED | sí | idem | VOLUME_DELTA MOST_POSITIVE | idem | idem | no es mayor volumen absoluto |
| CLIENTS_NEW | SUPPORTED | sí | idem | NEW_IN_PERIOD | idem | idem | ≠ first-ever |
| CLIENTS_REACTIVATED | SOURCE_MISSING | sí | — | — | limitación explícita | — | no hay contrato hueco+regreso ≠ NUEVOS |
| LOST_INCOME | SUPPORTED | sí | delta_ingreso ARR | LOST_INCOME | idem | idem | — |
| MOVEMENT_SUMMARY | SUPPORTED | sí | conteos por estatus | — | idem | idem | — |
| CLIENT_RANKING | SUPPORTED | sí | ventas_diarias_cliente | VENTA_TON | ya existente | sí | — |
| DISCOUNT_RANKING | SUPPORTED | sí | DISCOUNT_PER_KG | ABS(SUM monto)/SUM kg | ya existente | sí | — |
| OPEN_PRONOSTICO | SUPPORTED | sí | IGF modal | UI_ACTION | no finge apertura | planta en query | — |
| FORECAST_CLOSE | SUPPORTED | sí | IGF | forecast | ya existente | — | ≠ navegación |
| CLIENT_STATUS / LAST_PURCHASE / FREQUENCY | PARTIAL | sí | DICF | umbrales fuente | no inventa | — | requiere fila DICF |
| FREQUENCY_DEVIATION | CONTRACT_MISSING | sí | — | — | limitación | — | hace falta contrato days vs freq |
| FORECAST_SCENARIOS | CONTRACT_MISSING | sí | — | — | limitación | — | no hay conservador/base/agresivo |
| UNIT_COST | SOURCE_MISSING | sí | — | — | limitación | — | no se infiere de nº de folios |
| BLOCKED_PROJECTS | SOURCE_MISSING | sí | — | — | limitación | — | no inferir bloqueo |
| resto de familias | PARTIAL / CONTRACT_MISSING / SOURCE_MISSING | sí | ver FAMILY_STATUS | — | limitación específica | sí vía classify | no caen a unknown si la familia se reconoce |

SUPPORTED exige routing + fuente + métrica + filtros + no-data + 30/30 + anti-colisión. Si falta fuente, el estado no es SUPPORTED.

## Archivos

- `lib/director-ia-client-movement.js` (nuevo)
- `lib/director-ia-executive-coverage.js` (nuevo)
- `lib/director-ia-planner.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-client-ranking.js`
- `lib/director-ia-executive-backlog.js`
- `lib/director-ia-conversation-state.js`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatModal.tsx`
- `frontend-dashboard/modules/director-ia/lib/api.ts`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/director-ia-executive-coverage-movement-pronostico.test.js`
- `test/fixtures/director-ia-executive-utterance-coverage.js`

## Regresiones tocadas a propósito

Listas «dejaron / disminuyeron / aumentaron / nuevos» dejan de ir a `commercial_trend` (trailing 30d) y van a movimiento mensual ARR. Comentarios sobre movers siguen en `commercial_trend`.

## Flags

schema_changes=false  
data_mutation=false  
merge=false  
deploy=false  
next_task=false
