# FIX-DIRECTOR-IA-CONVERSATIONAL-ACTIVE-SUBTOPIC-001

```yaml
task_id: "FIX-DIRECTOR-IA-CONVERSATIONAL-ACTIVE-SUBTOPIC-001"
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
first_bad_boundary: "ACTIVE_SUBTOPIC_NOT_REPRESENTED"
conv_subtopic_before: "002/004/005/006/007/010/T4 FAIL; 001/003/008/009 PASS"
conv_subtopic_after: "001..010 PASS; T4 PASS"
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
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-SUBTOPIC-DEPTH-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "FRAME_ALLOWED de intra-session acepta active_subtopic porque snapshotCurrentFrame ahora lo copia. No se quitó el campo del frame."
human_decision_needed:
  - "Revisión humana. No merge. No push main. No deploy. No next task."
```

## 1. BEFORE

Pack `test/director-ia-conversational-active-subtopic.test.js` primero. Cruza `askDirectorIa` T1→T2→T3. Sin cambio de producto.

```text
R-CONV-SUBTOPIC-001  PASS   parent_intent=profitability_deterioro_snapshot
R-CONV-SUBTOPIC-002  FAIL   active_subtopic inexistente tras T2
R-CONV-SUBTOPIC-003  PASS   planta y A/B preservados
R-CONV-SUBTOPIC-004  FAIL   T3 no recibe active_subtopic expense
R-CONV-SUBTOPIC-005  FAIL   T3 no resuelve corporativos relativo a gasto
R-CONV-SUBTOPIC-006  FAIL   T3 cae a plant diagnosis / generic AR / GPT
R-CONV-SUBTOPIC-007  FAIL   T3 no deja subtopic estructurado para T4
R-CONV-SUBTOPIC-008  PASS   plant mismatch ya limpiaba parent
R-CONV-SUBTOPIC-009  PASS   "y corporativos?" sin state no inventa hilo
R-CONV-SUBTOPIC-010  FAIL   child no reconocido salía del hilo
R-CONV-SUBTOPIC-T4   FAIL   "¿cuánto subieron?" no conservaba rama
```

FIRST_BAD_BOUNDARY: `ACTIVE_SUBTOPIC_NOT_REPRESENTED`.

Tras T2 el parent, la planta y A/B sobrevivían. No había slot estructurado equivalente a `expense`. T3 heredaba parent; el planner quedaba en `profitability_deterioro_snapshot`; CEL `no_need`. La única profundidad especializada dependía de repetir "gasto". T3 no lo repetía y caía al loader genérico.

## 2. active_subtopic físico agregado

GENERIC_CONVERSATION en `lib/director-ia-conversation-state.js`:

- `emptyConversationState.active_subtopic = null`
- `sanitizeActiveSubtopic(raw)`: token canónico `[a-z][a-z0-9_]{0,31}(\.[a-z][a-z0-9_]{0,31}){0,3}`
- `sanitizeEchoedState`: echo si hay parent y no hay plant mismatch; si no, `null`
- `snapshotCurrentFrame` / `sanitizePreviousFrame`: copian el token sanitizado
- `preserveFramesOnClarify`: restaura el slot del frame actual
- `buildConversationState`: `null` si no hay parent; no inventa el valor
- `formatConversationHiloForModel`: declara `active_subtopic=...`

La sanitización genérica no contiene listas Folios (`gasto`, `corporativos`, `operativos`, `clientes`).

## 3. Separación GENERIC_CONVERSATION / FOLIOS_DOMAIN

GENERIC_CONVERSATION:

- slot, sanitize, echo, preservación intra-session
- `previous_frame` / `snapshotCurrentFrame`
- invalidación por plant mismatch
- limpieza al abandonar parent
- profundidad multi-turno del token, sin semántica de negocio

FOLIOS_DOMAIN (`lib/director-ia-profitability-subtopic.js`):

- parent `profitability_deterioro_snapshot`
- tokens `expense` / `expense.corporate` / `expense.operational`
- resolución `parent + active_subtopic + utterance`
- respuesta breve: no Delta Gastos, no pesos causales, no cifra inventada

MIXED (inevitable):

- `askDirectorIa` llama al helper Folios solo si `inherit` y parent = snapshot
- `isProfitabilityExpenseFollowUp` sigue en conversation-state (FIX anterior; solo `gasto`/`gastos`). Este FIX no añadió `corporativos`/`operativos`/`clientes` al motor genérico.

Planner no se modificó.

## 4. T1 → T2 → T3 AFTER

```
T1 snapshot
  → parent=profitability_deterioro_snapshot
  → active_subtopic=null
T2 "y gasto?"
  → inherit parent
  → FOLIOS open_branch → active_subtopic=expense
  → planta y A/B intactos
T3 "y corporativos?"
  → recibe parent + active_subtopic=expense
  → resolveProfitabilitySubtopicTurn(parent, expense, "y corporativos?")
  → expense.corporate
  → respuesta breve dentro de gasto; no reporte A/B/C; no AR/GPT
```

Sin `conversation_state`, la misma frase no abre rentabilidad/gasto.

## 5. T4 exploratorio

Tras T1→T2→T3, `¿cuánto subieron?`:

- parent = `profitability_deterioro_snapshot`
- `active_subtopic` = `expense.corporate` (conservado)
- kind = `probe_unavailable`
- no cifra, no Action Register, no plant diagnosis, no cambio de dominio
- declara que el comparativo corporativo todavía no está conectado

PASS seguro tipo B. No se añadió capacidad financiera.

## 6. Pruebas 001–010

```text
R-CONV-SUBTOPIC-001  PASS   T1 parent profitability_deterioro_snapshot
R-CONV-SUBTOPIC-002  PASS   T2 active_subtopic expense
R-CONV-SUBTOPIC-003  PASS   T2 planta + A/B
R-CONV-SUBTOPIC-004  PASS   T3 recibe parent + expense
R-CONV-SUBTOPIC-005  PASS   T3 → expense.corporate; no plant diagnosis
R-CONV-SUBTOPIC-006  PASS   T3 no AR / GPT / generic clarification
R-CONV-SUBTOPIC-007  PASS   T3 state válido para T4
R-CONV-SUBTOPIC-008  PASS   plant mismatch limpia parent y subtopic
R-CONV-SUBTOPIC-009  PASS   "y corporativos?" sin state no inventa hilo
R-CONV-SUBTOPIC-010  PASS   child desconocido conserva hilo
R-CONV-SUBTOPIC-T4   PASS   conserva corporate/expense; no inventa cifra
```

## 7. Archivos modificados

- `lib/director-ia-conversation-state.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-profitability-subtopic.js` (nuevo)
- `test/director-ia-conversational-active-subtopic.test.js` (nuevo)
- `test/director-ia-intra-session-topic-return.test.js` (allowlist de frame)
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-ACTIVE-SUBTOPIC-001.md`

No tocados: `lib/director-ia-planner.js`, frontend, `docs/director-ia/`, SQL, fórmulas.

## 8. Diff funcional resumido

1. Slot `active_subtopic` entra a la infraestructura normal de conversation_state.
2. Chat, con inherit + parent snapshot, resuelve profundidad vía helper Folios en vez de exigir otra vez el cue `gasto`.
3. T2 escribe `expense`. T3 escribe `expense.corporate`. T4 conserva el token y falla cerrado si no hay comparativo conectado.
4. Plant mismatch y abandono de parent anulan el slot.
5. Intra-session allowlist admite el campo nuevo del frame.

No Delta Gastos. No `computeDeltaGastos`. No fórmula `operativa - final`. No SQL nuevo. No adquisición nueva.

## 9. Evidencia anti-whack-a-mole

`corporativos` no es una ruta global.

- R-CONV-SUBTOPIC-009: `"y corporativos?"` sin state → aclaración genérica; no parent snapshot; no `active_subtopic`.
- R-CONV-SUBTOPIC-005: la misma frase, con parent snapshot + `active_subtopic=expense`, resuelve `expense.corporate`.

La resolución depende de `parent + active_subtopic + utterance`. No se añadió `/corporativos/` al planner ni a `isProfitabilityExpenseFollowUp`.

T3 hereda porque `unknown` + parent válido (mecanismo genérico ya existente). El significado "corporate expense" lo pone solo el helper Folios cuando el slot activo es `expense`.

## 10. Desviaciones

1. `FRAME_ALLOWED` en `test/director-ia-intra-session-topic-return.test.js` incluye `active_subtopic`. Era NEW FAILURE introducido por copiar el slot al frame, como exige la tarea. No se removió el campo del snapshot.

2. Planner intacto: no era físicamente necesario.

3. `isProfitabilityExpenseFollowUp` (solo `gasto`) permanece del FIX anterior. No se movió en este alcance para no reabrir T2. No se usó como fundamento de T3.

Suites relacionadas: conversation-state / continuity, natural-followup, profitability-followup, intra-session PASS (77/77 en el lote).

TIER 1 8/8 PASS. PRE-DEPLOY `--gate` PASS. HTTP 5xx = 0. HARNESS FAILURE = 0. NEW FAILURE = 0.

`git diff --check`: limpio (aviso LF/CRLF de working copy, sin error funcional).
