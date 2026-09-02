# FIX-DIRECTOR-IA-METRIC-SWITCH-EXPLICIT-OVERRIDES-INHERITANCE-001

```yaml
task_id: "FIX-DIRECTOR-IA-METRIC-SWITCH-EXPLICIT-OVERRIDES-INHERITANCE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
implementation: true
planner_changed: true
conversation_state_changed: false
historical_margin_parser_changed: false
golden_expectations_changed: false
docs_director_ia_changed: false
merge: false
deploy: false
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana G4. No merge. No deploy. No next task."
```

## A. Causa raíz

`G-METRIC-SWITCH-001` (parent `¿Cuál fue el margen en mayo?` → `¿descuento de agosto?`) fallaba en **PLANNER**.

Cadena física:

1. `detectDirectorIaIntent("¿descuento de agosto?")` queda `unknown` porque `isHistoricalMarginQuestion` exige `margen` y no hay intent diario/descuento mensual para esa frase.
2. `resolveConversationTurn` marca `inherit=true` / `inherit_parent_intent=historical_margin` porque el detector es `unknown` y `historical_margin` está en `INHERITABLE_INTENTS`.
3. `planDirectorIaQuestion` aplicaba herencia siempre que `detected.intent === "unknown"` y el parent era un intent de dominio válido.
4. El plan resultante era `intent=historical_margin`. Esa era la primera frontera causal (FIRST_BAD_BOUNDARY = PLANNER).

`crossMetricSwitch` de conversation-state no aplica: exige parent diario + fecha heredada. `historical_margin` no es esa ruta.

No se tocó `lib/director-ia-conversation-state.js` (fuera de `in_scope`). La herencia conversacional puede seguir `inherit=true`; el planner ya no fuerza la métrica incompatible.

## B. Frontera modificada

Archivo: `lib/director-ia-planner.js`  
Función: `planDirectorIaQuestion`  
Condición de `inheritParent`.

Se añadió `inheritBlockedByExplicitMetric`: si el turno actual nombra una sola familia métrica (`descuento` / `margen` / `venta|kg`) y esa familia no coincide con la del `inheritParentIntent`, la herencia no se aplica.

`¿Y en mayo?` no nombra métrica nueva → `explicitTurnMetricFamily` es `null` → no bloquea → continuidad elíptica intacta.

## C. Diff conceptual

Before:

```
unknown + inheritParentIntent válido → hereda siempre
```

After:

```
unknown + inheritParentIntent válido + (sin métrica explícita incompatible) → hereda
unknown + métrica explícita de otra familia → no hereda
```

Precedencia: `explicit_current_turn_metric > incompatible_inherited_metric`.

Harness (`test/helpers/director-ia-golden-harness.js`): el parser de mes de margen es elíptico a propósito (`¿Y en mayo?`). Tras el fix del planner, `resolveHistoricalMarginRequest("¿descuento de agosto?")` sigue aceptando agosto. Eso no es fallo de producto si `plan.intent !== historical_margin`. El harness solo marca PERIOD FAIL cuando el plan todavía enruta `historical_margin`. No se cambiaron expectations del caso Golden.

## D. Golden BEFORE / AFTER

Comando: `npm run test:director-ia:golden`

BEFORE (planner sin el guard; 7 PASS / 1 FAIL / HARNESS 0):

| Caso | Resultado | FIRST_BAD_BOUNDARY |
| --- | --- | --- |
| G-CLIENT-001 | PASS | none |
| G-CLIENT-002 | PASS | none |
| G-CLIENT-003 | PASS | none |
| G-NEW-CLIENTS-001 | PASS | none |
| G-MOVEMENT-UP-001 | PASS | none |
| G-MOVEMENT-DOWN-001 | PASS | none |
| G-MOVEMENT-STOPPED-001 | PASS | none |
| G-METRIC-SWITCH-001 | FAIL | PLANNER |

Detalle BEFORE: `intent=historical_margin inherit=true forbidden=historical_margin`

AFTER (planner + observación PERIOD del harness):

| Caso | Resultado | actual_intent |
| --- | --- | --- |
| G-CLIENT-001 | PASS | client_profile |
| G-CLIENT-002 | PASS | client_profile |
| G-CLIENT-003 | PASS | client_profile |
| G-NEW-CLIENTS-001 | PASS | historical_new_clients |
| G-MOVEMENT-UP-001 | PASS | commercial_trend |
| G-MOVEMENT-DOWN-001 | PASS | commercial_trend |
| G-MOVEMENT-STOPPED-001 | PASS | commercial_trend |
| G-METRIC-SWITCH-001 | PASS | unknown |

```text
PASS: 8
FAIL: 0
HARNESS FAILURE: 0
PRODUCT GOLDEN FAILURE: 0
```

GATE (`node scripts/director-ia-golden-regression.js --gate`): exit 0.

Los siete casos previamente PASS siguen PASS. Expectations de `test/fixtures/director-ia-golden-cases.js` no se modificaron.

## E. Casos mínimos

| Caso | Input | Resultado |
| --- | --- | --- |
| A | HM → `¿descuento de agosto?` | `plan.intent !== historical_margin`; detector sigue `unknown`; agosto se conserva en la pregunta |
| B | HM → `¿Y en mayo?` | `plan.intent === historical_margin`; `resolveHistoricalMarginRequest` = `single_month` mayo |
| C | HM → `¿venta de agosto?` | `plan.intent !== historical_margin` |

## F. Suites adicionales

```text
node --test test/director-ia-historical-margin.test.js test/director-ia-conversational-continuity.test.js test/director-ia-golden-regression.test.js test/director-ia-daily-cross-metric-followup.test.js test/director-ia-natural-followup.test.js
```

| Resultado | Valor |
| --- | --- |
| tests | 87 |
| pass | 87 |
| fail | 0 |

## G. Archivos

Modificados:

* `lib/director-ia-planner.js`
* `test/director-ia-historical-margin.test.js`
* `test/helpers/director-ia-golden-harness.js`
* `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
* `docs/dev-loop/reports/FIX-DIRECTOR-IA-METRIC-SWITCH-EXPLICIT-OVERRIDES-INHERITANCE-001.md`

No tocados (entre otros):

* `lib/director-ia-conversation-state.js`
* `lib/director-ia-historical-margin.js`
* `test/fixtures/director-ia-golden-cases.js`
* `lib/director-ia-chat.js`
* `lib/director-ia-tools.js`
* `server.js`
* `docs/director-ia/`
* DB / schema / frontend / LIVE_DB

## H. Git

* base SHA: `3c4e53d188e877581afc0d868607779a33b5117c` (`origin/main`)
* branch: `fix/director-ia-metric-switch-explicit-overrides-inheritance-001` (≠ `main`)
* commit SHA: se anota tras el commit de implementación
* no push a `main`
* no merge
* no deploy
* no siguiente tarea
