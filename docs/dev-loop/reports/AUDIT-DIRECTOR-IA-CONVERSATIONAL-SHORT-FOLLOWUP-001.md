# AUDIT-DIRECTOR-IA-CONVERSATIONAL-SHORT-FOLLOWUP-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-SHORT-FOLLOWUP-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
tests_written: false
product_changed: false
classification: "B. FOLLOWUP_PARENT_NOT_INHERITABLE"
first_bad_boundary: "buildConversationState / INHERITABLE_INTENTS excludes profitability_deterioro_snapshot"
t1_parent_intent_written: null
t2_planner_intent: "unknown"
t2_inherit: false
cel_need: "no_need"
delta_gastos: "NOT_IMPLEMENTED — subsequent, not first"
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
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task. No implementación."
```

## 0. G1

Rama: `audit/director-ia-conversational-short-followup-001` ≠ `main`.

Solo se cambió `AUTHORIZED` → `IN_PROGRESS`. Campos humanos intactos. `implementation_authorized: NO`.

North Star: T1 pregunta de deterioro de rentabilidad; T2 = `gasto`.

Probe read-only (módulos existentes, sin tests nuevos): `buildConversationState`, `sanitizeEchoedState`, `resolveConversationTurn`, `detectDirectorIaIntent`, `planDirectorIaQuestion`, `resolveExecutiveNeed`.

## 1. Clasificación decisiva

```
B. FOLLOWUP_PARENT_NOT_INHERITABLE
```

El análisis activo de T1 **no puede** quedar como `parent_intent` heredable.

T1 llama `conversationStateForIntent` con `parent_intent: "profitability_deterioro_snapshot"`. Eso entra a `buildConversationState`:

```js
const parent_intent = INHERITABLE_INTENTS.includes(opts.parent_intent) ? opts.parent_intent : null;
```

`INHERITABLE_INTENTS` **no** incluye `profitability_deterioro_snapshot` (tampoco `financial_diagnosis` ni `expense_analysis`).

Probe:

```
inheritable: false
t1_parent: null
t1_bundle: "profitability_deterioro_snapshot"
t1_periods: []
```

Ese es el **primer** hop que impide continuar el análisis activo. Sin parent, T2 no puede heredar planta/periodos/tema como hilo de rentabilidad.

No se asume que sea el único defecto posterior. Es el primero.

## 2. Matriz de hops

| HOP | FIELD | WHAT HAPPENS | VERDICT | PORTABILITY |
|---|---|---|---|---|
| T1 response `conversation_state` | `parent_intent` | escrito `profitability_deterioro_snapshot` → `buildConversationState` lo anula | **NOT_INHERITABLE** (FIRST) | MIXED — motor genérico + lista de intents de dominio |
| T1 response | `last_evidence_bundle_type` | sí se guarda el string del snapshot | PRESERVED | GENERIC_CONVERSATION |
| T1 response | `active_period_months` / cut | T1 **no** los pasa al state | DROPPED (secundario; no es el primer gate) | FOLIOS_DOMAIN |
| Frontend `DirectorIaChatPanel` | `conversationState` | T1 → `setConversationState`; T2 → `body.conversation_state` | PRESERVED (transporta lo que T1 escribió, incl. `parent_intent: null`) | GENERIC_CONVERSATION |
| T2 POST | `conversation_state` | se reenvía si el panel está montado | PRESERVED | GENERIC_CONVERSATION |
| `sanitizeEchoedState` | `parent_intent` | volvería a anular el parent si existiera; con T1 ya es null | NOT_INHERITABLE (eco del mismo gate) | MIXED |
| `resolveConversationTurn` | inherit | `parent=null`, `kind=other`, `inherit=false`, `inherit_parent_intent=null` | NOT_INHERITABLE | MIXED |
| planner T2 `"gasto"` | intent | `unknown` / `no_rule_matched` / clarification. No es snapshot ni `expense_analysis` | NOT_RECOGNIZED (posterior) | FOLIOS_DOMAIN |
| CEL | need | `need_type=null`, `reason=no_need` | NOT_RECOGNIZED (posterior) | MIXED |
| specialized route | — | `unknown && !inherit` → `buildUnknownClarificationResult` | NOT_RECOGNIZED | MIXED |
| capacidad gasto-en-rentabilidad | Delta Gastos | el propio T1 dice que no existe Delta Gastos reconciliado; M6 es gastos de **folios** | CAPABILITY_MISSING (posterior, no first) | FOLIOS_DOMAIN |

## 3. Por qué no A / C / D / E / F

**A REJECTED.** El panel sí conserva y reenvía `conversation_state`. El hueco no es transporte; es que T1 no puede dejar un parent heredable.

**C posterior.** Si el parent sobreviviera, `resolveConversationTurn` no tiene rama de follow-up para rentabilidad, y el planner no trata `"gasto"` como profundización del snapshot. Eso sería el *siguiente* boundary, no el primero.

**D posterior.** No hay capacidad física de “gasto del mini IGF / Delta Gastos” en el contexto del snapshot. M6 (`expense_analysis`) es categoría de folios y ni siquiera se alcanza con la utterance `"gasto"`. El T1 ya declara la ausencia. No es el primer hop.

**E REJECTED.** Probe: T2 `intent=unknown`, `inherit=false` → aclaración, no continuación.

**F REJECTED.** La cadena queda demostrada en código + probe. No hace falta DevTools.

## 4. T2 físico (`"gasto"`)

Probe:

```
classifyTurnKind = "other"
detect/plan = unknown, confidence 0.35, no_rule_matched
isRentabilidadDeterioroSnapshotQuestion = false
CEL = no_need
resolveConversationTurn.inherit = false
```

`askDirectorIa` (~4081): `intent === "unknown" && !inherit` → aclaración (“No se pudo determinar una intención clara…”).

Reglas de `gastos?` del planner exigen folio/categoría/`cómo van`/`rentabilidad` en la *misma* utterance. `"gasto"` solo no entra.

## 5. Cadena

```
T1 snapshot
  → conversationStateForIntent(parent=profitability_deterioro_snapshot)
  → buildConversationState
      INHERITABLE_INTENTS excludes parent     FIRST  NOT_INHERITABLE
  → context_meta.conversation_state.parent_intent = null
  → frontend echo                            PRESERVED
  → T2 sanitize parent=null
  → resolveConversationTurn inherit=false
  → planner unknown
  → CEL no_need
  → aclaración
```

## 6. Portabilidad (sin extracción)

Reutilizable como capa conversacional genérica: panel que echa `conversation_state`; `sanitizeEchoedState` / `resolveConversationTurn` / kinds / inherit.

Anclado a este producto: contenido de `INHERITABLE_INTENTS`; planner de `"gasto"`; snapshot de rentabilidad; M6 folios; ausencia de Delta Gastos.

No se propone refactor.

## 7. Human-like acceptance (solo evaluación)

La arquitectura actual **no** puede llegar a T2 “gasto” como profundización del T1: el parent del snapshot no es heredable. Aun si lo fuera, faltarían cue de follow-up, routing contextual y una fuente de gasto del mismo corte. No se implementa.

## 8. Prohibiciones

No producto. No tests nuevos. No DB. No Delta Gastos. No `docs/director-ia/`. No merge. No deploy. No next task.
