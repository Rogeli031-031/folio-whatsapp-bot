# SPRINT1-DIRECTOR-IA-FORECAST-NATURAL-LANGUAGE-PARITY-001

```yaml
task_id: SPRINT1-DIRECTOR-IA-FORECAST-NATURAL-LANGUAGE-PARITY-001
outcome: DONE
files_touched:
  - lib/director-ia-conversational-executive-layer.js
  - test/director-ia-forecast-magnitude-followup.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-NATURAL-LANGUAGE-PARITY-001.md
files_not_touched:
  - lib/director-ia-authoritative-forecast-run-pack.js
  - lib/director-ia-planner.js
  - lib/director-ia-conversation-state.js
  - lib/director-ia-chat.js
  - lib/director-ia-plant-diagnosis.js
  - lib/director-ia-igf-arr.js
  - lib/director-ia-executive-cycle-composer.js
  - lib/director-ia-month-close-result.js
  - lib/commercial-trend-engine.js
  - Dashboard / UI
  - docs/director-ia/
contracts_consulted:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-NATURAL-LANGUAGE-PARITY-AUDIT-001.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/LOOP_PROTOCOL.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "CURRENT_TASK previo (COMMERCIAL-MOVERS, DONE_PENDING_REVIEW) fue reemplazado porque el humano autorizó ESTA tarea en el chat (G5 explícito). El implementador no reabrió movers."
  - "Rama de trabajo creada (checkout -b). Sin git add/commit/push."
next_task_proposed: ""
secrets_check: none
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "PRODUCTION_PASS = NOT_YET_PROVEN (solo tests locales)."
```

## Objetivo

Lenguaje natural equivalente → `classifyForecastMagnitudeFollowUp` → `handleForecastMagnitudeFollowUpForChat` (sin cambios) → authoritative forecast run existente → magnitud solicitada.

No se creó capacidad nueva. No se cambió el cálculo ni la fuente.

## Baseline protegido

Estado Ejecutivo, Forecast pack/fórmulas, IGF, ARR, PROM, Commercial Movers, Dashboard, planner, inherit global, `isPreCloseQuestion` general: **no modificados**.

## Causa raíz heredada de auditoría

`\b(forecast|proyectad|al corte|estas usando)\b` no reconoce `proyectado|proyectada|proyectamos`. `cierre|cerrar` no participaban. A6 caía a `pre_meeting_brief` porque `isSpecializedStandaloneQuestion` incluye `isPreCloseQuestion` (`para cerrar`) **antes** de clasificar magnitud.

## Cambio exacto realizado

Solo en `classifyForecastMagnitudeFollowUp` y helpers locales del mismo archivo:

1. **Prospectivo:** `forecast` | stem `proyect` | `proyecc` | `al corte` | `estas usando` (sin `\b` final que mate el lexema).
2. **Cierre acotado:** `cierre|cerrar|cerremos|cerramos` **solo** junto a `descuento`, y no si hay `junta|steering|pre-cierre|precierre|preocup`.
3. **A6:** `isPreCloseQuestion` deja de bloquear el detector **únicamente** cuando la pregunta ya es magnitud Forecast de descuento. `isPreCloseQuestion` y el planner `pre_meeting_brief` **siguen existiendo**; `askDirectorIa` ya evalúa el detector **antes** del handler de pre-reunión.

No phrasebook. No se tocó venta/utilidad/resultado. No se tocó `isPreCloseQuestion`.

## Archivos modificados

| Archivo | Qué |
|---|---|
| `lib/director-ia-conversational-executive-layer.js` | helpers + detector de descuento |
| `test/director-ia-forecast-magnitude-followup.test.js` | A1–A10, A6, decoys, bootstrap, UNAVAILABLE, aislamiento |
| `docs/dev-loop/CURRENT_TASK.md` | esta tarea → `DONE_PENDING_REVIEW` |
| este reporte | evidencia |

## Routing antes / después

| Frase | Antes | Después |
|---|---|---|
| A1–A4 | magnitude / descuento | igual **PASS** |
| A5 | unknown → inherit `plant_diagnosis` → MATERIALIDAD/ARR | magnitude / descuento → pack autoritativo |
| A6 | `pre_meeting_brief` | detector descuento gana; planner sigue `pre_meeting_brief` (sin cambio) |
| A7–A10 | inherit `plant_diagnosis` | magnitude / descuento |
| B1–B10 | sin magnitud Forecast | sin magnitud Forecast |
| «¿Cómo vamos?» | EXECUTIVE_STATUS | igual |

## A1–A10

Todas clasifican `{ kind: "descuento" }` con y sin `forecast_run`. Tests: `SPRINT1 FORECAST-NL-PARITY`.

## Tratamiento especial A6

`isPreCloseQuestion(A6) === true` y `detectDirectorIaIntent(A6) === pre_meeting_brief` **se conservan**. La precedencia en chat es:

`EXPLICIT FORECAST MAGNITUDE` (detector) `>` handler `pre_meeting_brief`.

Preguntas legítimas de junta/precierre no son magnitud de descuento (`hasMeetingPrepCue`) y siguen specialized/pre-close. Tests PRE_CLOSE / pre_meeting: PASS.

## Decoys

B1–B10: detector `null`. B4/B5 `arr_status`. B6 `igf_status`. B8 `daily_discount_deviation`. «descuento» solo y «al cierre» solo: `null`.

## forecast_run / bootstrap / fail-closed

Camino A: A5–A10 tras «¿Cómo vamos?» reutilizan `run_key` y `AUTH.descuento` del fixture (no Puebla).
Camino B: A5 + `upload_day` deriva year/month y llama mini.
Camino C: A5 sin identidad → UNAVAILABLE, sin ARR/stored.
Planta / corte / periodo: sin contaminación.

## FORECAST_PROJECTION vs Stored vs ARR

La respuesta de magnitud sigue `formatForecastMagnitudeFollowUpAnswer` → `pack.forecast.descuento`. `used_arr_legacy=false`, `used_forecast_stored=false`. Stored e ARR decoys no entran al handler.

## Regresiones

«¿Cómo vamos?», pack ejecutivo, follow-up canónico A1, utilidad/resultado con hilo, movers, PRE_CLOSE, Golden Set: no se tocaron sus handlers.

## Tests y conteos

| Comando | Resultado |
|---|---|
| `node --test test/director-ia-forecast-magnitude-followup.test.js` | **18/18 pass** |
| regresión + Golden Set (bootstrap, CEL, pack, movers, PRE_CLOSE, pre-meeting, `sprint1-core-conversational-recovery`) | **164/164 pass** |
| `node --test test/director-ia-*.test.js` | **1309/1309 pass, 0 fail** |

`PRODUCTION_PASS = NOT_YET_PROVEN`.

## Limitaciones

- Venta natural (C1–C3) no se generalizó (fuera del caso PROVEN de descuento).
- «cierre» + mes nombrado puede seguir siendo `month_close` si no hay evidencia prospectiva de descuento inequívoca; el aislamiento de periodo se prueba con «descuento proyectado de julio».
- Sin verificación en chat de producción Puebla.

## Explicit non-changes

Pack, engine, fórmulas, PROM, IGF, ARR, `run_identity`, bootstrap semántico, Estado Ejecutivo, movers, trend engine, Dashboard, planner, conversation-state, `isPreCloseQuestion`.

## Git status

```
rama: sprint1/director-ia-forecast-natural-language-parity-001  (≠ main)
sin git add / commit / push / merge / deploy

 M docs/dev-loop/CURRENT_TASK.md
 M lib/director-ia-conversational-executive-layer.js
 M test/director-ia-forecast-magnitude-followup.test.js
?? docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-NATURAL-LANGUAGE-PARITY-AUDIT-001.md
?? docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-NATURAL-LANGUAGE-PARITY-001.md
```

El informe de auditoría es de la ejecución previa (solo lectura). Este reporte es el de implementación.

## Confirmaciones finales

```
AUTHORITATIVE_FORECAST_PACK_CHANGED = NO
FORECAST_ENGINE_CHANGED = NO
FORECAST_FORMULAS_CHANGED = NO
PROM_CHANGED = NO
IGF_FORECAST_CHANGED = NO
IGF_STORED_CHANGED = NO
ARR_CHANGED = NO
FORECAST_RUN_IDENTITY_CHANGED = NO
DIRECT_BOOTSTRAP_SEMANTICS_CHANGED = NO
EXECUTIVE_STATUS_CHANGED = NO
COMMERCIAL_MOVERS_CHANGED = NO
COMMERCIAL_TREND_ENGINE_CHANGED = NO
DASHBOARD_BEHAVIOR_CHANGED = NO

PRODUCTION_PASS = NOT_YET_PROVEN
```

**STOP.** Un DONE no autoriza otra tarea. Espera revisión humana.
