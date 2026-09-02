# IMPL-DIRECTOR-IA-GOLDEN-REGRESSION-GATE-001

```yaml
task_id: "IMPL-DIRECTOR-IA-GOLDEN-REGRESSION-GATE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "TEST_INFRASTRUCTURE_ONLY"
implementation: true
runtime_changed: false
planner_changed: false
tools_changed: false
conversation_state_changed: false
docs_director_ia_changed: false
live_db: false
authenticated_e2e: false
golden_pass: 7
golden_fail: 1
harness_fail: 0
product_golden_fail: 1
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
files_touched:
  - test/fixtures/director-ia-golden-cases.js
  - test/helpers/director-ia-golden-harness.js
  - test/director-ia-golden-regression.test.js
  - scripts/director-ia-golden-regression.js
  - package.json
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/IMPL-DIRECTOR-IA-GOLDEN-REGRESSION-GATE-001.md
  - docs/dev-loop/reports/DEPLOY-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001.md
files_not_touched:
  - lib/director-ia-planner.js
  - lib/director-ia-chat.js
  - lib/director-ia-conversation-state.js
  - lib/director-ia-tools.js
  - lib/director-ia-client-profile.js
  - server.js
  - docs/director-ia/
human_decision_needed:
  - "Revisión humana del harness. No autoriza FIX de G-METRIC-SWITCH-001."
```

## A. Inventario

Infraestructura física encontrada (no inventada):

| Área | Archivos reales |
| --- | --- |
| Runner | `node --test` + `package.json` `test:eks` |
| Planner | `test/director-ia-*.test.js` vía `detectDirectorIaIntent` / `planDirectorIaQuestion` |
| Client / profile | `test/director-ia-client-profile.test.js` |
| Compound client | `test/director-ia-compound-client-query.test.js` (C5 = G-CLIENT-001) |
| Conversation state | `lib/director-ia-conversation-state.js` + tests de continuity |
| Continuity | `test/director-ia-conversational-continuity.test.js` |
| Persistent memory | `test/director-ia-persistent-memory.test.js` |
| Historical margin | `test/director-ia-historical-margin.test.js` (R-METRIC-SWITCH documentado en AUDIT-…-RECOVERY-001) |
| New clients | `test/director-ia-new-clients-purchase-discount.test.js` (P2 hermana) |
| Movers | `test/director-ia-commercial-movers-additive.test.js` |
| Tools | `lib/director-ia-tools.js` `getDirectorIaTool` / `listToolsForDomain` |
| Capabilities script | `scripts/test-director-ia-capabilities.js` (`¿Qué clientes dejaron de comprar?`) |

No se introdujo Jest/Vitest/Mocha.

## B. Diseño

Un Golden Case es un objeto JS en `test/fixtures/director-ia-golden-cases.js`.

Campos: `id`, `category`, `tier`, `turns`, `expected_intent`, `forbidden_intent`, `expected_entity`, `expected_metrics`, `expected_period`, `expected_granularity`, `expected_movement`, `clarification_allowed`, `expected_tool_or_route`, `expected_evidence_behavior`, `notes`.

El runner (`test/helpers/director-ia-golden-harness.js`) llama funciones productivas de solo lectura y recorre fronteras:

INPUT → CONTEXT → PLANNER → ENTITY_EXTRACTION → CANONICAL_RESOLUTION → METRIC_RESOLUTION → PERIOD_RESOLUTION → TOOL_ORCHESTRATOR_ROUTE → EVIDENCE → USER_VISIBLE_OUTCOME

No compara prosa LLM.

TIER 1 = fixtures deterministas (`now` 2026-09-01). TIER 2/3 reservados: `NOT_PROVEN` / no ejecutados.

REPORT MODE: exit 0 si no hay `HARNESS_FAILURE`.  
GATE MODE (`--gate`): exit 1 si hay `PRODUCT_GOLDEN_FAILURE`. No se cableó GATE al pipeline global.

## C. Casos sembrados

| ID | Pregunta exacta |
| --- | --- |
| G-CLIENT-001 | `Dame los kg comprados y el descuento por cada mes de TORTILLERIA ERICK desde enero a la fecha.` |
| G-CLIENT-002 | `¿Qué sabemos de TORTILLERIA ERICK?` |
| G-CLIENT-003 | turno1 G-CLIENT-002 + turno2 G-CLIENT-001 |
| G-NEW-CLIENTS-001 | `¿Qué clientes nuevos entraron en el mes de agosto? ¿Cuánto compraron y con qué descuento?` |
| G-MOVEMENT-UP-001 | `¿Qué clientes aumentaron?` |
| G-MOVEMENT-DOWN-001 | `¿Qué clientes disminuyeron?` |
| G-MOVEMENT-STOPPED-001 | `¿Qué clientes dejaron de comprar?` |
| G-METRIC-SWITCH-001 | `¿Cuál fue el margen en mayo?` → `¿descuento de agosto?` (R-METRIC-SWITCH) |

## D. Baseline BEFORE

Primer intento (sin `node_modules/exceljs`): 7 archivos de suite no cargaron (`Cannot find module 'exceljs'`). Preexistente de entorno, no se corrigió producto.

Tras instalar la dependencia **ya listada** en `package.json` (`npm install exceljs --no-save`):

```text
node --test test/director-ia-compound-client-query.test.js test/director-ia-historical-margin.test.js
```

exit `0` — 59/59 pass.

No se redujeron tests existentes.

## E. Golden baseline (REPORT)

```text
npm run test:director-ia:golden
```

exit `0`

| ID | Pregunta/Escenario | Resultado | FIRST_BAD_BOUNDARY |
| --- | --- | --- | --- |
| G-CLIENT-001 | compuesto first-turn ERICK | PASS | — |
| G-CLIENT-002 | perfil first-turn ERICK | PASS | — |
| G-CLIENT-003 | continuidad perfil → compuesto | PASS | — |
| G-NEW-CLIENTS-001 | clientes nuevos agosto + kg/descuento | PASS | — |
| G-MOVEMENT-UP-001 | aumentaron (agregado) | PASS | — |
| G-MOVEMENT-DOWN-001 | disminuyeron (agregado) | PASS | — |
| G-MOVEMENT-STOPPED-001 | dejaron de comprar (agregado) | PASS | — |
| G-METRIC-SWITCH-001 | HM → descuento de agosto | FAIL | PLANNER |

`HARNESS FAILURE: 0`  
`PRODUCT GOLDEN FAILURE: 1`

TIER 1 no reproduce «first-turn FAIL / continuidad PASS»: ambos G-CLIENT-001 y G-CLIENT-003 pasan con fixture. LIVE_DB queda `NOT_PROVEN`.

## F. FIRST_BAD_BOUNDARY

Único FAIL:

**G-METRIC-SWITCH-001 / PLANNER**

Observed: `plan.intent=historical_margin`, `inherit=true`, `forbidden=historical_margin`.

`detectDirectorIaIntent("¿descuento de agosto?")` no es margen; `resolveConversationTurn` hereda el parent `historical_margin` y `planDirectorIaQuestion` aplica `inheritParentIntent`. No se corrigió.

Clase: `PRODUCT_GOLDEN_FAILURE` (no harness).

## G. Ejecución

Comando único (REPORT):

```text
npm run test:director-ia:golden
```

Equivalente: `node scripts/director-ia-golden-regression.js`

GATE (no cableado a CI): `node scripts/director-ia-golden-regression.js --gate` → exit `1` con el FAIL actual.

Harness tests: `node --test test/director-ia-golden-regression.test.js` — 2/2 pass, exit `0`.

## H. Archivos

| Archivo | Propósito |
| --- | --- |
| `test/fixtures/director-ia-golden-cases.js` | Casos |
| `test/helpers/director-ia-golden-harness.js` | Runner + fronteras |
| `test/director-ia-golden-regression.test.js` | Contrato del harness |
| `scripts/director-ia-golden-regression.js` | CLI REPORT/GATE |
| `package.json` | script `test:director-ia:golden` |
| reporte DEPLOY BLOCKED | preservado, no mezclado con runtime |

## I. Git

* base SHA: `cc55a607202e997fb1817b2616f43be4de8b198d`
* branch: `implementation/director-ia-golden-regression-gate-001`
* commit SHA: `b0ca898374d3ef5be5cc33deb51535b8603306b8`
* no merge; no push a `main`

## J. Scope

* no runtime behavior changes;
* no planner / tools / conversation-state / chat changes;
* no DB / LIVE_DB / token;
* no frontend;
* no Director IA production behavior changed;
* no FIX del FAIL de producto;
* no merge;
* no deploy;
* no next task.

Deploy anterior permanece `BLOCKED / NOT_EXECUTED`.
