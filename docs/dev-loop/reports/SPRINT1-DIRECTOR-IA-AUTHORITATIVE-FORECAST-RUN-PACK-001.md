# SPRINT1-DIRECTOR-IA-AUTHORITATIVE-FORECAST-RUN-PACK-001

task_id: SPRINT1-DIRECTOR-IA-AUTHORITATIVE-FORECAST-RUN-PACK-001
outcome: DONE
DASHBOARD_BEHAVIOR_CHANGED: NO

```yaml
task_id: SPRINT1-DIRECTOR-IA-AUTHORITATIVE-FORECAST-RUN-PACK-001
outcome: DONE
files_touched:
  - lib/director-ia-authoritative-forecast-run-pack.js
  - lib/director-ia-conversational-executive-layer.js
  - lib/director-ia-chat.js
  - test/director-ia-authoritative-forecast-run-pack.test.js
  - test/director-ia-sprint1-core-conversational-recovery.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-AUTHORITATIVE-FORECAST-RUN-PACK-001.md
files_not_touched:
  - server.js computeIgfForecastMiniPayload (cuerpo)
  - lib/dashboard-arr-forecast.js
  - frontend-dashboard/components/IgfForecastClient.tsx
  - arr.pronostico_dias_seleccion / arr.pronostico_mini_snapshot
  - Excel / schema / datos
  - docs/director-ia/
contracts_consulted:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-PROM-CUTOFF-PRODUCTION-UNAVAILABLE-AUDIT.md
  - auditoría forense de consultoría (arquitectura C)
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "Ejecución en rama main (mismo desvío que sprints previos de Director IA; sin push/merge)."
next_task_proposed: ""
secrets_check: none
human_decision_needed: []
```

## A. Causa raíz

Director IA ya podía llamar `computeIgfForecastMiniPayload`, pero el Estado Ejecutivo **no convergía** en esa row:

1. Un adapter paralelo reconstruía PROY (venta/desc) y **no copiaba** util/resultado.
2. CEL podía tomar venta/desc del adapter o ARR y util/resultado solo del mini.
3. Sin cutoff el mini no corría (fail-closed correcto) y no había un pack único que dijera UNAVAILABLE con las cuatro magnitudes juntas.
4. FORECAST_STORED competía en superficie.

El objetivo no era «volver a mostrar un número». Era que, cuando hay FORECAST, sea **exactamente** la corrida del mini de IGF Forecast.

## B. Arquitectura anterior

```
cutoff → loadDashboardForecastParity (PROY+snapshot, solo venta/desc)
      → loadIgfForecastMiniPayload (cuatro campos)
      → CEL: mini || adapter || ARR
      → prompt → LLM
```

Dos caminos. Util/resultado se perdían si solo corría el adapter.

## C. Arquitectura resultante (C)

```
cutoff YMD
  → loadIgfForecastMiniPayload ≡ computeIgfForecastMiniPayload
  → buildAuthoritativeForecastRunPack(mini.rows[planta])
  → CEL lee SOLO el pack para FORECAST
  → prompt (cuatro magnitudes + run_identity)
```

Sin cutoff: pack UNAVAILABLE, `mini_loader_invoked=false`. No ARR, no fin de mes, no stored.

`loadDashboardForecastParity` se conserva para ACTUAL_TO_DATE venta. Su `forecast` **ya no gobierna**.

## D. Authoritative run identity

```
plant_code, plant_label, year, month,
upload_day, corte_day (getPronosticoCorteYmdStr),
cutoff_origin, igf_version_id, igf_version_number
```

PROM entra por `corte_day` dentro del motor Dashboard (no se reimplementa).

## E. Authoritative forecast runtime pack

`lib/director-ia-authoritative-forecast-run-pack.js`

- `forecast.venta` ← `rows[].ventaTon`
- `forecast.descuento` ← `dashboardDescSigned(comDesc)`
- `forecast.utilidad_operativa` ← `utilOperImporte`
- `forecast.resultado_final` ← `resultadoFinalImporte`

Misma semántica de signo que la UI. No HTTP. No fórmula nueva.

## F. Provenance

```
source: computeIgfForecastMiniPayload
governed_by: dashboard_authoritative_mini | unavailable_no_cutoff | unavailable_no_forecast
mini_loader_invoked, row_found
```

Prompt: `authoritative_forecast_status` + `authoritative_run plant_code/upload_day/corte_day`.

## G. Semánticas

| Clase | Estado |
|---|---|
| FORECAST | pack; cuatro campos de la misma row |
| ACTUAL_TO_DATE venta | `getPronosticoPlantDetail.venta_sheet.total_mes_sum` |
| ACTUAL_TO_DATE desc | **UNAVAILABLE** |
| FORECAST_STORED | `igf.compromiso_lines`; no gobierna forecast |
| TARGET_COMMITMENT | **UNAVAILABLE** (`igf_meta` sin loader) |

## H. Capas

| Pieza | Clase |
|---|---|
| `computeIgfForecastMiniPayload` | KEEP |
| identidad cutoff/PROM | KEEP |
| fail-closed sin YMD | KEEP |
| transporte IGF → Acciones | KEEP |
| `forecast_run` / `conversation_state` | KEEP_BUT_SIMPLIFY |
| last-upload plant-aware | KEEP_BUT_SIMPLIFY (no es identidad IGF) |
| CEL MAGNITUDE desde el pack | KEEP |
| `loadDashboardForecastParity` como forecast | SUPERSEDE (sigue para actual venta) |
| ARR / adapter como fallback FORECAST | SUPERSEDE |
| `fechaCorte=""` / fin de mes | REMOVE_LATER (no se usa en este runtime) |

No se borró código histórico.

## I. Prueba de igualdad numérica

`test/director-ia-authoritative-forecast-run-pack.test.js`

```
dashboard_row = miniPayload.rows[Acapulco]   // shape de computeIgfForecastMiniPayload
pack.forecast.venta === dashboard_row.ventaTon
pack.forecast.descuento === dashboardDescSigned(dashboard_row.comDesc)
pack.forecast.utilidad_operativa === dashboard_row.utilOperImporte
pack.forecast.resultado_final === dashboard_row.resultadoFinalImporte
```

Fixtures, no 1307/1432/1503.29. CEL/prompt se assertan contra esos mismos números, no contra prosa LLM.

## J. No contaminación

Corte A vs B; Puebla no pisa Acapulco; ARR/stored/fin de mes no ganan.

## K. Fail-closed

Sin `upload_day`: pack UNAVAILABLE, mini no invocado en chat, `unavailable_no_cutoff`. Payload inyectado de fin de mes se ignora.

## L. Golden Set

Q1–Q3 CEL; Q4 commercial_trend. Fixture Golden Set ahora pone las cuatro magnitudes en `mini` (antes venta/desc vivían solo en el adapter SUPERSEDIDO).

## M. Suite completa

`node --test test/director-ia-*.test.js`

**1261/1261 PASS**, fail 0.

Focales del pack: **12/12**.

## N. DASHBOARD_BEHAVIOR_CHANGED

**NO.** No se tocó el cuerpo de `computeIgfForecastMiniPayload`, Pronóstico, selector, PROM, snapshots, Excel, schema ni UI IGF Forecast.

## O. Riesgos residuales

- Paridad de producción sigue exigiendo el mismo `upload_day` (transporte IGF→Acciones). El pack no inventa D.
- `version_as_of_corte` del GET Dashboard no viaja en Director IA; util puede divergir si la UI lo activa.
- year/month del chat = CDMX si la pregunta no nombra mes.
- Deploy de este runtime: **NOT_PROVEN** hasta revisión humana / deploy.
- `loadDashboardForecastParity` no se eliminó (REMOVE_LATER del camino forecast).
