# FIX-DIRECTOR-IA-CONVERSATIONAL-PROFITABILITY-FOLLOWUP-001

```yaml
task_id: "FIX-DIRECTOR-IA-CONVERSATIONAL-PROFITABILITY-FOLLOWUP-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST"
implementation: true
docs_director_ia_changed: false
live_db: false
live_db_authorized: false
frontend_changed: false
formula_changed: false
delta_gastos_created: false
hardcoded_live: false
first_bad_boundary: "FOLLOWUP_PARENT_NOT_INHERITABLE"
conv_profit_before: "001/003/004/005/006/007 FAIL; 002/008/009 PASS"
conv_profit_after: "001..009 PASS"
tier1_after: "8/8 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
new_failure: 0
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-SHORT-FOLLOWUP-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No push main. No deploy. No next task."
```

## 1. BEFORE

Pack `test/director-ia-conversational-profitability-followup.test.js` primero. Cruza `askDirectorIa` T1→T2. Sin cambio de producto.

```text
R-CONV-PROFIT-001  FAIL   parent_intent=null
R-CONV-PROFIT-002  PASS   planta_id conservado
R-CONV-PROFIT-003  FAIL   active_period_months=[]
R-CONV-PROFIT-004  FAIL   inherit=false
R-CONV-PROFIT-005  FAIL   mode=conversation_clarification
R-CONV-PROFIT-006  FAIL   T2 es aclaración genérica
R-CONV-PROFIT-007  FAIL   T2 no menciona Delta Gastos (clarificación)
R-CONV-PROFIT-008  PASS
R-CONV-PROFIT-009  PASS
```

T2 `"gasto"` visible:

```text
No se pudo determinar una intención clara con las reglas actuales
Indica si quieres el diagnóstico de la planta actual...
No asumo el hilo ni consulto Action Register a ciegas.
```

## 2. Primer boundary demostrado

`FOLLOWUP_PARENT_NOT_INHERITABLE`

T1 escribe `parent_intent=profitability_deterioro_snapshot` pero `buildConversationState` lo anula porque no estaba en `INHERITABLE_INTENTS`. El frontend sí echa `conversation_state`. T2 llega con `parent=null` → `inherit=false` → planner `unknown` → aclaración.

No era el único hop roto: T1 tampoco persistía A/B en `active_period_months`, y `"gasto"` no tenía ruta de respuesta contextual.

## 3. Cambio mínimo realizado

1. `INHERITABLE_INTENTS` incluye `profitability_deterioro_snapshot`.
2. T1 guarda A/B en `active_period_months` (mecanismo canónico; no segundo state).
3. `resolveConversationTurn` trata `"gasto"` / `"gastos"` como follow-up del parent de rentabilidad.
4. Planner: `INTENT_LABELS` + `INTENT_DOMAIN_MAP` para que `inheritParentIntent` remapee `unknown` → parent heredado.
5. Chat: si `inherit` + parent snapshot + cue gasto → respuesta breve FOLIOS (sin rearmar el snapshot, sin Delta Gastos).
6. `preserveFramesOnClarify` no reescribe el parent a otra `planta_id` (008; no cruza planta).

No se creó Delta Gastos. No fórmula nueva. No frontend. No DB.

## 4. Cadena T1 → T2 AFTER

```
T1 snapshot
  → conversationStateForIntent(parent=profitability_deterioro_snapshot, active_period_months=[A,B])
  → buildConversationState conserva parent
  → frontend echo existente
  → T2 sanitizeEchoedState
  → resolveConversationTurn inherit=true
  → planner inheritParentIntent → profitability_deterioro_snapshot
  → chat profitability_expense_followup
  → respuesta breve contextual
```

## 5. Pruebas 001–009

```text
R-CONV-PROFIT-001  PASS   parent_intent=profitability_deterioro_snapshot
R-CONV-PROFIT-002  PASS   planta_id
R-CONV-PROFIT-003  PASS   active_period_months incluye A y B
R-CONV-PROFIT-004  PASS   inherit=true
R-CONV-PROFIT-005  PASS   no conversation_clarification
R-CONV-PROFIT-006  PASS   no reimprime A/B/C de T1
R-CONV-PROFIT-007  PASS   no afirma Delta Gastos; declara que todavía no existe
R-CONV-PROFIT-008  PASS   plant mismatch no continúa el hilo
R-CONV-PROFIT-009  PASS   "gasto" sin state no inventa hilo
```

## 6. Archivos modificados

- `lib/director-ia-conversation-state.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-planner.js`
- `lib/director-ia-rentabilidad-deterioro-snapshot.js`
- `test/director-ia-conversational-profitability-followup.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-PROFITABILITY-FOLLOWUP-001.md`

## 7. Portabilidad

GENERIC_CONVERSATION:

- lista `INHERITABLE_INTENTS` / parent / inherit
- follow-up corto
- echo + `sanitizeEchoedState`
- invalidar parent al aclarar con otra planta
- no inventar hilo sin `conversation_state`

FOLIOS_DOMAIN:

- `profitability_deterioro_snapshot`
- significado de `"gasto"` sobre rentabilidad
- texto honesto: no hay Delta Gastos reconciliado
- periodos A/B del snapshot en `active_period_months`

No se extrajo engine reusable. No refactor masivo.

## 8. Desviaciones

Ninguna.

Suites relacionadas conversation-state / planner / chat: continuity, natural-followup, intra-session, historical-margin, rent-chat-cut PASS.

TIER 1 8/8 PASS. PRE-DEPLOY `--gate` PASS. HTTP 5xx = 0. HARNESS FAILURE = 0.

`test/director-ia-forecast-magnitude-followup.test.js` tiene 2 FAIL preexistentes (Q3 `client_profile`; A5 `inheritParentIntent` bloqueado por métrica explícita). No los introduce este FIX (`git diff origin/main -- lib/director-ia-planner.js` solo añade label/map del snapshot). Fuera de alcance; no se tocaron.

`git diff --check`: sin error funcional.
