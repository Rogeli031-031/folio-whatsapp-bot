# AUDIT-DIRECTOR-IA-CONVERSATIONAL-SUBTOPIC-DEPTH-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-SUBTOPIC-DEPTH-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
tests_written: false
product_changed: false
classification: "C. ACTIVE_SUBTOPIC_NOT_REPRESENTED"
first_bad_boundary: "T2 conversation_state no tiene ACTIVE_SUBTOPIC; last_evidence_bundle_type sigue siendo profitability_deterioro_snapshot"
t2_parent_intent: "profitability_deterioro_snapshot"
t2_subtopic: null
t3_inherit: true
t3_planner_intent: "profitability_deterioro_snapshot"
t3_specialized_gasto: false
t3_route: "generic AR/GPT fallthrough"
cel_need: "no_need"
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
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-PROFITABILITY-FOLLOWUP-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task. No implementación."
```

## 0. G1

Rama: `audit/director-ia-conversational-subtopic-depth-001` ≠ `main`.

Solo se cambió `AUTHORIZED` → `IN_PROGRESS`. Campos humanos intactos. `implementation_authorized: NO`.

North Star: T1 rentabilidad → T2 gasto → T3 `y corporativos?` = “de los gastos que acabamos de mencionar, háblame de los corporativos”.

Probe read-only (módulos existentes, sin tests nuevos): `buildConversationState`, `emptyConversationState`, `sanitizeEchoedState`, `resolveConversationTurn`, `isProfitabilityExpenseFollowUp`, `detectDirectorIaIntent`, `planDirectorIaQuestion`, `resolveExecutiveNeed`, `shouldHandleExecutiveStatus`. Lectura de `DirectorIaChatPanel.tsx` y `askDirectorIa`.

## 1. FIRST_BAD_BOUNDARY

```
C. ACTIVE_SUBTOPIC_NOT_REPRESENTED
```

El parent de rentabilidad **sí sobrevive** T2→T3. El sistema **no representa** que T2 dejó `gasto` como subtopic activo.

`emptyConversationState` no tiene `active_subtopic`. Tras T2, `conversation_state` es estructuralmente el mismo topic que T1:

```
parent_intent = profitability_deterioro_snapshot
last_evidence_bundle_type = profitability_deterioro_snapshot
active_period_months = [A, B]
active_subtopic = <campo inexistente>
```

T2 habla de gasto solo en la prosa de la respuesta. El state no guarda esa rama.

No es A: el panel echa `conversation_state`.
No es B: `sanitize` + `resolveConversationTurn` conservan parent; T3 `inherit=true`.
D, G son hops **posteriores**.

## 2. Traza T2 → T3

| HOP | FIELD | WHAT HAPPENS | VERDICT | PORTABILITY |
|---|---|---|---|---|
| T2 `conversationStateForIntent` | parent / bundle / periods | parent y A/B se escriben; bundle sigue siendo snapshot; **no hay campo de subtopic**; no se escribe `gasto` | **NO_SUBTOPIC_MODEL** (FIRST) | MIXED — schema genérico + intent de dominio |
| T2 answer | prosa | menciona gasto; no es estado estructurado | PRESERVED (texto) / DROPPED (como frame) | FOLIOS_DOMAIN |
| Frontend `DirectorIaChatPanel` | `conversationState` | T2 `setConversationState`; T3 `body.conversation_state` | PRESERVED | GENERIC_CONVERSATION |
| T3 POST | echo | transporta el state de T2 (sin subtopic) | PRESERVED | GENERIC_CONVERSATION |
| `sanitizeEchoedState` | parent / months / bundle | parent, periodos y bundle sobreviven; sigue sin subtopic | PRESERVED + NO_SUBTOPIC_MODEL | MIXED |
| `resolveConversationTurn("y corporativos?")` | inherit / parent | `kind=other`, `inherit=true`, `inherit_parent=profitability_deterioro_snapshot` | PRESERVED (parent) / NO_SUBTOPIC_MODEL | MIXED |
| representación de subtopic | — | no existe en state ni en el turn | NO_SUBTOPIC_MODEL | GENERIC_CONVERSATION |
| `detectDirectorIaIntent` | intent | `unknown` / `no_rule_matched` (igual que T2 `"y gasto?"`) | PRESERVED | FOLIOS_DOMAIN |
| planner + inheritParent | intent | remapea `unknown` → `profitability_deterioro_snapshot` | PRESERVED | MIXED |
| CEL | need | `no_need`; `shouldHandleExecutiveStatus=false` | PRESERVED | MIXED |
| specialized route | `isProfitabilityExpenseFollowUp` | false; solo `gasto`/`gastos` / `y gasto` | LEXICAL_GATE_MISS (posterior) | FOLIOS_DOMAIN |
| generic route | `askDirectorIa` | no hay handler de `intent===profitability_deterioro_snapshot` salvo T1 snapshot o T2 gasto | GENERIC_FALLTHROUGH (posterior) | MIXED |
| plant diagnosis / AR | final | cae al loader genérico de Action Register + OpenAI | GENERIC_FALLTHROUGH | FOLIOS_DOMAIN |

## 3. Evidencia física por hop

T2 state (probe `buildConversationState` con los mismos campos que escribe chat ~4108–4117):

```
parent_intent: profitability_deterioro_snapshot
planta_id: 1
last_evidence_bundle_type: profitability_deterioro_snapshot
active_period_months: ["2026-08","2026-09"]
has_active_subtopic_field: false
```

Frontend (`DirectorIaChatPanel.tsx` ~87, ~102–108): guarda `context_meta.conversation_state` y lo reenvía. No inventa ni borra subtopic: echa lo que T2 escribió.

T3 `"y corporativos?"` (probe):

```
kind=other
inherit=true
inherit_parent=profitability_deterioro_snapshot
detected=unknown
planned=profitability_deterioro_snapshot
cel=no_need
expenseFollowUp=false
specialized_gasto=false
route=NO dedicated handler -> generic AR/GPT fallthrough
```

`isProfitabilityExpenseFollowUp` (~293–297) solo acepta:

```
^(el |la |los |las )?gastos?$
^y (el |la |los |las )?gastos?$
```

`"y gasto?"` entra. `"y corporativos?"` no.

Chat specialized (~4094–4097) exige **las tres**: `inherit` + parent snapshot + ese regex. T3 cumple las dos primeras y falla la tercera.

No existe `if (directorIaPlan.intent === "profitability_deterioro_snapshot")` genérico. Tras fallar el regex, el flujo sigue hasta ~5752: contexto Action Register + OpenAI. Eso produce el diagnóstico de planta / acciones / mantenimiento que vio LIVE.

## 4. Por qué T3 cae en plant diagnosis / Action Register

No porque pierda el parent. No porque CEL secuestre. No porque el planner cambie a `plant_diagnosis`.

Cadena:

1. T2 no dejó `gasto` como frame.
2. T3 hereda el **topic** rentabilidad (`inherit=true` → planner = snapshot).
3. La única ruta especializada de profundidad es un recognizer léxico de la palabra `gasto`.
4. `"y corporativos?"` no la dispara.
5. El intent heredado `profitability_deterioro_snapshot` no tiene handler de profundidad.
6. `unknown && inherit` evita la aclaración (~4081) y cae al **generic fallthrough** (AR + GPT).

Síntoma LIVE = G. Causa primera = C.

## 5. Matriz de variantes (después de T2, estático)

Todas con el mismo T2 state. Ninguna tiene subtopic estructurado.

| Utterance | parent | subtopic | detect | inherit / planned | route probable |
|---|---|---|---|---|---|
| `y corporativos?` | sí | no | unknown | true / snapshot | generic AR/GPT |
| `y operativos?` | sí | no | unknown | true / snapshot | generic AR/GPT |
| `cuánto subieron?` | sí | no | unknown | true / snapshot | generic AR/GPT |
| `cuál pesa más?` | sí | no | unknown | true / snapshot | generic AR/GPT |
| `y los clientes?` | sí | no | unknown | true / snapshot | generic AR/GPT (no commercial_trend) |
| `el primero?` | sí | no | unknown | true / snapshot | generic AR/GPT |
| `por qué?` | sí | no | unknown | true / snapshot | CEL `CAUSE_EXPLANATION` later_slice; no intercepta; generic AR/GPT |
| `y gasto?` (control) | sí | no | unknown | true / snapshot | specialized gasto (regex) |

Arreglar solo `"corporativos"` en el regex dejaría operativos / cuánto / cuál pesa / clientes / el primero / por qué en el mismo fallthrough. Whack-a-mole.

Aunque se añadieran esas palabras, el regex seguiría siendo un **sibling** del parent rentabilidad, no un hijo de `gasto`. `"y corporativos?"` no quedaría anclado a “gastos que acabamos de mencionar”.

## 6. Evaluación arquitectónica

La implementación **no** modela `ACTIVE_TOPIC + ACTIVE_SUBTOPIC`.

Modela:

- un `parent_intent` heredable (topic);
- periodos / planta / bundle;
- una **colección de recognizers** por frase (`isProfitabilityExpenseFollowUp`, `isDailyFollowUpKind`, `isMonthCloseFollowUp`, `isClientProfileFollowUp`, …).

T2 funciona porque la utterance **repite** el nombre de la rama (`gasto`). T3 profundiza esa rama sin repetirla. Sin subtopic persistido, no hay frame contra el cual resolver `corporativos`.

## 7. Portabilidad

GENERIC_CONVERSATION:

- echo de `conversation_state`;
- inherit de parent;
- follow-up elíptico;
- profundidad > 2 turnos;
- ausencia de modelo de subtopic (el hueco portable).

FOLIOS_DOMAIN:

- rentabilidad / gasto / corporativos / operativos / clientes;
- regex de `gasto`;
- snapshot vs Action Register;
- fuentes financieras.

La cadena T3 es MIXED: parent genérico + gate léxico de dominio + fallthrough de planta.

No se extrae engine.

## 8. Qué NO debe hacerse como siguiente FIX

- NO parchear `isProfitabilityExpenseFollowUp()` con `corporativos`.
- NO agregar `operativos`, `clientes`, `primero`, etc. al mismo regex.
- Eso no crea `ACTIVE_SUBTOPIC`. Cada elipsis nueva volvería a romper.
- NO tratar G (fallthrough) como el primer boundary.
- NO reabrir A/B: transporte y parent ya funcionan.
- NO Delta Gastos, NO fórmula, NO frontend, NO DB.

Un FIX posterior, si el humano lo autoriza, tendría que decidir si se introduce un subtopic estructurado efímero (p. ej. que T2 deje `gasto` como rama activa) o se acepta que cada profundidad sea otro recognizer. Esta auditoría no elige. No implementa.

## 9. Prohibiciones

No producto. No tests nuevos. No regex. No LIVE_DB. No `docs/director-ia/`. No merge. No deploy. No next task.
