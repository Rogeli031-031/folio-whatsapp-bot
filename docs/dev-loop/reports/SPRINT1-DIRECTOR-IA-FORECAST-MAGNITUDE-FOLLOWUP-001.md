# SPRINT1-DIRECTOR-IA-FORECAST-MAGNITUDE-FOLLOWUP-001

task_id: SPRINT1-DIRECTOR-IA-FORECAST-MAGNITUDE-FOLLOWUP-001
outcome: DONE
DASHBOARD_BEHAVIOR_CHANGED: NO

```yaml
task_id: SPRINT1-DIRECTOR-IA-FORECAST-MAGNITUDE-FOLLOWUP-001
outcome: DONE
files_touched:
  - lib/director-ia-conversational-executive-layer.js
  - lib/director-ia-chat.js
  - lib/director-ia-conversation-state.js
  - test/director-ia-forecast-magnitude-followup.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-MAGNITUDE-FOLLOWUP-001.md
files_not_touched:
  - lib/director-ia-authoritative-forecast-run-pack.js
  - server.js computeIgfForecastMiniPayload (cuerpo)
  - lib/dashboard-arr-forecast.js
  - loadProyVentaDescByPlantForIgf
  - arr.pronostico_dias_seleccion / arr.pronostico_mini_snapshot
  - selector Fecha de carga / IGF Forecast UI
  - transporte IGF → Acciones
  - Excel / schema / datos de producción
  - frontend-dashboard/
  - docs/director-ia/
contracts_consulted:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-MAGNITUDE-FOLLOWUP-AUDIT-001.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-AUTHORITATIVE-FORECAST-RUN-PACK-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "Ejecución en rama main (mismo desvío que sprints previos de Director IA; sin push/merge)."
next_task_proposed: ""
secrets_check: none
human_decision_needed: []
```

## A. Causa raíz

El authoritative forecast run pack ya producía juntas `forecast.venta`, `forecast.descuento`, `forecast.utilidad_operativa` y `forecast.resultado_final`. El Estado Ejecutivo no estaba roto.

Dos fallas de exposición/routing:

1. **Descuento Forecast no se nombraba como magnitud propia.** El pack lo traía en `forecast_venta_desc.desc_kg`, pero Magnitudes Clave no tenía la línea aditiva «Descuento (Forecast)». El LLM podía omitirlo. IGF descuento almacenado sí aparecía.

2. **Follow-ups de magnitud no entraban a CEL.** `isExecutiveStatusQuestion` rechaza «descuento» sin cue «cómo vamos» / planta / cutoff-aware. El planner queda `unknown`. La continuidad hereda `parent_intent=plant_diagnosis`. Gana diagnóstico de planta → MATERIALIDAD COMERCIAL → `loadArrProyForPlant` → `computePronosticoProyByPlant(fechaCorte: "")` → ARR (1432 t en producción). El follow-up de fecha ya funcionaba vía `isCutoffExplainQuestion`.

`conversation_state` guardaba `forecast_run` (identidad), no las cuatro magnitudes.

## B. Baseline protegido

El Estado Ejecutivo de «¿Cómo vamos?» no se reescribió. Siguen AVAILABLE cuando lo están:

- Venta Actual / ACTUAL_TO_DATE
- Forecast venta
- IGF almacenado (FORECAST_STORED)
- IGF descuento almacenado (FORECAST_STORED)
- Utilidad operativa Forecast
- Resultado final Forecast
- Tendencias CASA / Comisionista
- identidad / cutoff autoritativo
- pack autoritativo como productor

Única adición: **Descuento (Forecast)** ← `pack.forecast.descuento` (comDesc, signo UI).

Cifras de producción (1261, 1491.5, 1536.5405, 0.1137, 3197215, 831250, 1432) se usaron como evidencia/fixtures de test, no como constantes de producto.

## C. Archivos modificados

| Archivo | Cambio |
|---|---|
| `lib/director-ia-conversational-executive-layer.js` | Item MAGNITUDE `forecast_desc_kg`; foco «cómo vamos»; detector/respuesta de follow-up acotado |
| `lib/director-ia-chat.js` | Handler de magnitud antes de inherit/`plant_diagnosis`; persistencia de eco ligado a identity; «de qué corte es esa cifra» |
| `lib/director-ia-conversation-state.js` | `forecast_magnitudes` sanitizado y anulado si cambia planta o `run_key` |
| `test/director-ia-forecast-magnitude-followup.test.js` | Conversación multiturno + anti-ARR + invalidación |
| `docs/dev-loop/CURRENT_TASK.md` | `status: DONE_PENDING_REVIEW` |
| este reporte | Cierre de implementación |

No se tocó `lib/director-ia-authoritative-forecast-run-pack.js`.

## D. Routing anterior

```
«¿Cuál es el descuento forecast al corte que estás usando?»
  → isExecutiveStatusQuestion = false
  → planner unknown
  → inherit parent_intent=plant_diagnosis
  → plant_diagnosis
  → MATERIALIDAD COMERCIAL
  → loadArrProyForPlant / computePronosticoProyByPlant(fechaCorte: "")
  → ARR distinto del pack
```

«¿Qué fecha de corte usaste?» ya salía por `isCutoffExplainQuestion` + `forecast_run`.

## E. Routing resultante

```
computeIgfForecastMiniPayload
  → authoritative forecast run pack
  → Estado Ejecutivo («¿Cómo vamos?»)
  → conversation_state.forecast_run + eco forecast_magnitudes (misma run_identity)
  → follow-up de magnitud (detector acotado)
  → re-ejecuta el pack con esa identidad
  → respuesta directa de ESA corrida
```

Orden en `askDirectorIa`: CEL Estado Ejecutivo → cutoff explain → **follow-up de magnitud** → inherit / plant_diagnosis.

Q3 Golden Set («cómo va el descuento de Acapulco este mes») sigue en CEL. El detector no relaja «descuento» genérico.

## F. conversation_state anterior / resultante

Anterior: `forecast_run` (plant_code, year, month, upload_day, corte_day, origin). Sin cifras.

Resultante: mismo `forecast_run` + `forecast_magnitudes` como **eco** del pack (`venta`, `descuento`, `utilidad_operativa`, `resultado_final`, `semantics=FORECAST`, `run_key`). No es fuente de verdad. La respuesta re-ejecuta el pack. Si `run_key` no coincide o hay `plant_mismatch`, el eco se anula.

## G. Authoritative run binding

Precedencia de cutoff intacta: EXPLICIT_QUESTION → REQUEST_UPLOAD_DAY → PLANT_LAST_UPLOAD → UNAVAILABLE.

El follow-up re-llama `loadIgfForecastMiniPayload` + `buildAuthoritativeForecastRunPack` con planta/year/month/upload_day de la identidad vigente. No usa ARR, stored ni adapter paralelo.

## H. Descuento Forecast agregado

Cuando `forecast.descuento` está AVAILABLE, Magnitudes Clave incluye:

`Descuento (Forecast): <forecast.descuento> $/kg`

Misma `run_identity` que venta/util/resultado. Fail-closed si UNAVAILABLE.

## I. Separación Forecast vs Stored

FORECAST.descuento (`forecast_desc_kg`) ≠ FORECAST_STORED.descuento (`com_desc_kg`). Coexisten. El follow-up de descuento responde solo FORECAST. El decoy stored 0.1137 no gana.

## J. Prueba conversacional multiturno

Turno 1 «¿Cómo vamos?» → pack A/B/C/D/E.

Turno 2 «¿Cuál es el descuento forecast al corte que estás usando?» → B + corte E. `openai_called=false`. `used_plant_diagnosis=false`.

Turnos 3–5 utilidad / resultado / venta proyectada → C / D / A, misma `run_key`.

Turno 6 «¿Qué fecha de corte usaste?» → E (`cutoff_explain`).

## K. Prueba anti-ARR legacy

El follow-up no llama `loadPlantDiagnosisForChat`, `loadDashboardForecastParity` ni OpenAI. Metadata: `used_arr_legacy=false`, `computePronosticoProyByPlant=false`, `used_materialidad=false`. La respuesta no contiene 1432 ni MATERIALIDAD COMERCIAL.

## L. Invalidación por planta / corte / periodo

- Corte A→B (upload_day nuevo): re-ejecuta pack B; no devuelve descuento A.
- Planta A→B: `sanitizeEchoedState` anula run/magnitudes; sin cutoff nuevo → UNAVAILABLE.
- Periodo nombrado distinto (julio vs agosto): no reutiliza el cutoff residual del hilo; UNAVAILABLE; no contamina.

## M. Golden Set

Q1–Q3 siguen CEL. Q3 no fue relajado a follow-up. Suite Golden Set incluida en la corrida completa.

## N. Suite completa

```
node --test test/director-ia-*.test.js
ℹ tests 1271
ℹ pass 1271
ℹ fail 0
```

Incluye `test/director-ia-forecast-magnitude-followup.test.js` (10 casos).

## O. DASHBOARD_BEHAVIOR_CHANGED

NO.

## P. Riesgos residuales

- El wording del Estado Ejecutivo «¿Cómo vamos?» sigue pasando por el LLM; el item y el foco son deterministas, la prosa no.
- «¿Y el descuento?» solo se clasifica con hilo ejecutivo + `forecast_run` vigente. Fuera de ese hilo no se secuestra daily_discount.
- Un `upload_day` residual del hilo se ignora si la pregunta nombra otro mes; un cutoff **explícito en la pregunta** de otro periodo sí re-ejecuta (identidad nueva, no eco A).
- Ejecución en `main` (desvío ya documentado). Sin git add / commit / push / merge / deploy.

Un DONE no autoriza otra tarea.
