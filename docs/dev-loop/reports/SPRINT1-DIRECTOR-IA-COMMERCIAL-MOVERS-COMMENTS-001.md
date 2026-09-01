# SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-001

```yaml
task_id: SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-001
outcome: DONE
files_touched:
  - lib/director-ia-conversational-executive-layer.js
  - lib/director-ia-commercial-trend.js
  - test/director-ia-commercial-movers-additive.test.js
  - test/director-ia-forecast-magnitude-followup.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-001.md
files_not_touched:
  - lib/commercial-trend-engine.js
  - lib/director-ia-planner.js
  - lib/director-ia-chat.js
  - lib/director-ia-plant-diagnosis.js
  - lib/director-ia-authoritative-forecast-run-pack.js
  - lib/cliente-comentarios.js
  - Dashboard / UI / gráfica 1M-3M
  - Forecast / IGF / ARR / PROM / DICF / Action Register / Bitácora
  - EKS / IES / Reasoning Engine / Channel Projection
  - docs/director-ia/
  - esquema DB / join nombre+planta
contracts_consulted:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-AUDIT-001.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/LOOP_PROTOCOL.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "La sesión partió en main; se creó rama local sprint1-director-ia-commercial-movers-comments-001. Sin git add/commit/push."
  - "«¿Por qué cayó Grupo Move?» no se ruteó: requeriría handler causal o tocar plant_diagnosis. Queda pendiente separado."
next_task_proposed: "Handler local hecho+declaración+no-causa para «¿Por qué cayó X?» sin Reasoning Engine ni plant_diagnosis global."
secrets_check: none
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "Validación humana en chat real: «¿Cómo vamos?» y lista + comentarios."
  - "PRODUCTION_PASS = NOT_YET_PROVEN"
```

## Objetivo

Hacer **obligatoria** y **no causal** la verbalización del comentario registrado que ya llega al pack/prompt de los movers verbalizados 2+2. Corregir el stem `negativa`/`negativo`/`negativos`/`negativas`. Tarea aditiva.

## Causa raíz heredada

El comentario podía estar en `formatOneMoverLine` y en el prompt. IGF stored tenía «No las omitas». El comentario no. El LLM podía omitirlo legalmente.

## Cambio exacto

### MUST — obligación verbal + no-causa

En `executiveQuestionFocusLines` («cómo vamos») y en `formatPackForPrompt`:

- Si la línea verbal trae `Comentario registrado`, **copiarla completa**. No omitirla.
- Prohibido: `disminuyó porque [comentario]`, `dejó de comprar porque [comentario]`, paréntesis causal.
- `Sin comentario reciente` no se sustituye con Bitácora / DICF / Action Register / ARR ni causa inferida.
- El comentario no cambia el delta.

En `COMMERCIAL_TREND_SYSTEM_ADDENDUM`: misma veda causal para preguntas directas `commercial_trend`.

No se tocó Top 6, 2+2, engine, ni el join nombre+planta.

### SHOULD — fecha ya cargada

`registeredCommentDay` / `formatOneRegisteredComment`:

- Si `created_at` parsea a `YYYY-MM-DD`, se muestra: `Comentario registrado [YYYY-MM-DD]: …`
- Null, vacío o no-ISO: **no** se inventa fecha.
- El prompt aclara: la fecha es de **registro**, no de la ventana del delta.

### Tendencia negativa

`isCommercialMoversQuestion`: `\bnegativ\b` → `\bnegativ[oa]s?\b`.

No phrasebook. No se tocó `positiv` (fuera de la lista autorizada).

### Pregunta causal — no implementada

`¿Por qué cayó Grupo Move?` sigue fuera de `commercial_trend`. Resolverlo bien exige un handler de hecho+declaración+no-causa o tocar `plant_diagnosis`. **Pendiente separado.** Esta tarea no modifica `plant_diagnosis`.

## Archivos

| Archivo | Qué |
|---|---|
| `lib/director-ia-commercial-trend.js` | stem `negativ[oa]s?`; fecha; addendum no-causa |
| `lib/director-ia-conversational-executive-layer.js` | `formatOneMoverLine` usa el formatter; obligación «No la omitas» |
| `test/director-ia-commercial-movers-additive.test.js` | MUST/SHOULD/2+2/plantas/morph |
| `test/director-ia-forecast-magnitude-followup.test.js` | A5/A6 no regresan |
| `CURRENT_TASK.md` | solo `status` |
| este reporte | evidencia |

## Preguntas protegidas

| Frase | Intent |
|---|---|
| ¿Qué clientes tienen tendencia negativa en ventas? | `commercial_trend` (antes: unknown) |
| …y qué comentarios tienen? | `commercial_trend` |
| comentarios + disminuyeron | `commercial_trend` |
| comentarios + dejaron de comprar | `commercial_trend` |
| ¿Por qué cayó Grupo Move? | **no** `commercial_trend` (sin cambio de routing) |

## Tests

Focal movers + forecast followup: **42/42**.

Suite `node --test test/director-ia*.js`: **1315/1315**, fail 0.

Cubierto: comentario visible; sin comentario no inventa; 2 comentarios en orden del payload; fecha ISO; created_at null/basura; no-causa COMPRA DIARIAMENTE / POR FALTA DE PIPAS; ranking/Top 6/2+2 intactos; NEG-C con comentario fuera del prompt; aislamiento Acapulco/Puebla; morph; Forecast/IGF/Tendencias/Riesgos/Ejecución; A5/A6 autoritativos.

## Validación humana posterior (no hecha)

1. «¿Cómo vamos?» — ver un mover con comentario real.
2. «¿Qué clientes tienen tendencia negativa en ventas y qué comentarios tienen?»
3. Comprobar: delta, `Comentario registrado`, fecha si hay, no causalidad, Forecast/IGF presentes.

```
DASHBOARD_BEHAVIOR_CHANGED = NO
PRODUCTION_PASS = NOT_YET_PROVEN
IMPLEMENTATION_AUTHORIZED_NEXT = NO
```

## STOP

No se declaró CLOSED ni APPROVED. Un DONE no autoriza otra tarea.
