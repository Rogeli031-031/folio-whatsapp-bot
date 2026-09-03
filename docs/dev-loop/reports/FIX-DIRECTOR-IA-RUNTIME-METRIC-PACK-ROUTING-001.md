# FIX-DIRECTOR-IA-RUNTIME-METRIC-PACK-ROUTING-001

```yaml
task_id: "FIX-DIRECTOR-IA-RUNTIME-METRIC-PACK-ROUTING-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
tier1_before: "8/8 PASS"
runtime_before: "4 FAIL"
predeploy_before: "FAIL"
tier1_after: "8/8 PASS"
runtime_after: "4 PASS"
predeploy_after: "PASS"
harness_fail: 0
http_500_production: "NOT_PROVEN"
golden_expectations_changed: false
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/IMPL-DIRECTOR-IA-PREDEPLOY-RUNTIME-GATE-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana G4. No merge. No deploy."
```

## 1. Causa raíz por caso

Los cuatro compartían el mismo principio: **señal explícita del turno no gobernaba la ruta**. Las fronteras concretas diferían.

| Caso | FIRST_BAD_BOUNDARY definitivo | Causa física |
| --- | --- | --- |
| R-RUNTIME-001 | ROUTING (antes de METRIC_PACK) | `isHistoricalMarginQuestion` + loader de planta. El span de cliente embebido (`de NOMBRE`) no participaba. Chat llamaba `loadHistoricalMarginForChat` y hacía `compare_months` de planta. |
| R-RUNTIME-002 | PLANNER + fallthrough chat | `¿descuento de agosto?` era `unknown`. Planner bloqueaba inherit de HM, pero el intent seguía `unknown` y `inherit=true` en conversation-state → `askDirectorIa` caía a contexto AR → HTTP 403. |
| R-RUNTIME-003 | PLANNER / CEL | Mismo `unknown`. Inherit de `plant_diagnosis` + CEL (`unknown` es overridable) reutilizaba materialidad. |
| R-RUNTIME-004 | PLANNER | `descuento`+mes no era intent de dominio → clarificación genérica de intención. |

No compartían una sola función. Sí la misma regla faltante:

`explicit current-turn metric (+ client span si existe) → ruta/pack de esa familia`

## 2. Diff conceptual

**Planner**

* `isDiscountPeriodQuestion`: `descuento` + periodo de calendario (cualquier mes/`mes`/`YYYY-MM`), no `ayer`, no delta.
* Detecta `client_profile` (dominio comercial mensual existente). Sin cliente: `requires_clarification` con razón de descuento, no “no se pudo determinar intención”.
* `explicitClientScopeSpan`: span embebido vía extractor existente, excluyendo planta nombrada. No phrasebook de clientes.
* `inheritBlockedByExplicitMetric`: padres ejecutivos (`plant_diagnosis`, brief, trend, …) también son incompatibles con una métrica explícita.

**Chat**

* HM + span de cliente no-planta: no corre compare de planta. Ancla el span en `active_entities`. Texto estructural sin `$/kg`.
* `client_profile` + descuento-periodo sin identidad (o loader sin canónico): clarificación de **descuento**, `mode=descuento_period_clarification`. No fallthrough AR. No inventa valor.

**No tocado:** `conversation-state` inherit diario (un intento de bloquear inherit ahí rompió venta↔descuento de ayer; se revirtió).

**HTTP 500:** NOT_PROVEN. Con cliente embebido ya no se entra al loader HM; el 500 de Render con FINAL no tiene paridad.

## 3. PRE-DEPLOY BEFORE / AFTER

BEFORE (`npm run test:director-ia:golden`):

```text
TIER 1 8/8 PASS
R-RUNTIME-001..004 FAIL
PRE-DEPLOY GATE = FAIL
```

AFTER:

```text
TIER 1 8/8 PASS
R-RUNTIME-001 PASS
R-RUNTIME-002 PASS
R-RUNTIME-003 PASS
R-RUNTIME-004 PASS
HTTP 5xx 0
HARNESS FAILURE 0
PRE-DEPLOY GATE = PASS
```

`--gate` exit 0.

Expectations TIER 1 / RUNTIME **no** se cambiaron. `G-METRIC-SWITCH-001` ahora observa `actual_intent=client_profile` (antes `unknown`); el caso no exige intent y sigue PASS.

## 4. Suites relacionadas

```text
node --test test/director-ia-historical-margin.test.js test/director-ia-conversational-continuity.test.js test/director-ia-golden-regression.test.js test/director-ia-daily-cross-metric-followup.test.js test/director-ia-client-profile.test.js
```

historical-margin + continuity + golden + daily-cross-metric: 73/73.  
client-profile: 24/24.

## 5. Archivos

* `lib/director-ia-planner.js`
* `lib/director-ia-chat.js`
* `test/director-ia-historical-margin.test.js`
* `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
* `docs/dev-loop/reports/FIX-DIRECTOR-IA-RUNTIME-METRIC-PACK-ROUTING-001.md`

No: `lib/director-ia-conversation-state.js`, fixtures Golden, harness expectations, `server.js`, `docs/director-ia/`, DB.

## 6. Git

* base: `efe055af` (`origin/main`)
* branch: `fix/director-ia-runtime-metric-pack-routing-001`
* commit SHA: `f71e67ff67a64b0146586d06f9e9b26f1fc3174c`
* `git status --short` post-commit de implementación: limpio
* no merge / no deploy / no next task

Nota de cierre Git: el SHA anterior es el commit de implementación. Si este archivo se re-commitea solo para anotar el SHA, el HEAD de la rama puede avanzar un commit docs.
