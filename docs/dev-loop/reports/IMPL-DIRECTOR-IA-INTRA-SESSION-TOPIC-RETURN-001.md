# Reporte — IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001

```yaml
task_id: "IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
determination: "IMPLEMENTED"
first_slice: "B — standalone precedence + exactly one previous_frame"
topic_stack: false
previous_frame_max: 1
raw_evidence_in_frame: false
self_contained_return: true
implicit_return: true
persistent_memory_for_navigation: false
strategy_b_after_return: true
destination: "chat legado (askDirectorIa + conversation_state), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
sql_017_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Intra-session topic return is not module coverage."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001.md"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "test/director-ia-intra-session-topic-return.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-planner.js"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea (CLOSED/REJECTED) y, si aplica, autoriza NEXT_TASK."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

Quedó implementado el first slice **B**.

1. **Precedencia standalone.** Si el planner ya tiene un intent válido, «volvamos» / «retomemos» no lo tiran. «Volvamos a la venta de ayer.» ejecuta `daily_sales_deviation` (0.92). No entra a `topic_return → out_of_slice_clarify`.

2. **Exactamente un `previous_frame` efímero.** No hay topic stack. Cada switch standalone nuevo reemplaza el prior. El frame guarda solo contexto estructurado mínimo. No guarda evidence payload, filas, prosa, authz ni history.

El retorno autocontenido no necesita prior. El retorno implícito restaura el prior si es compatible, revalida, hace requery y llama a GPT. Si no hay prior seguro, clarifica. Un tema más antiguo que `previous_frame` no se recupera en silencio.

## Confirmaciones de aceptación

| Requisito | Resultado |
|-----------|-----------|
| Standalone precedence | Sí. `out_of_slice_clarify` no corre si hay standalone. |
| Exactly one previous_frame | Sí. Un objeto, no lista. |
| No stack | Sí. Cada switch reemplaza. |
| No raw evidence | Sí. Solo refs: intent, entity key, date, bundle type, gap, planta. |
| Self-contained return | Sí. «Volvamos a la venta de ayer.» usa el turno actual (`ayer`). |
| Implicit return | Sí. Arturo / acción / Puebla restauran prior compatible. |
| Entity / date / action safety | Re-resolve; `ayer` del turno gana en standalone; 0/1/N sin silent pick. |
| Requery | Cada restore y cada inherit recarga evidencia. |
| Persistent memory separate | `volvamos` = `none`. No retrieve en restore. `pending_work_items_only` intacto. |
| Strategy B after return | Unknown con estado restaurado hereda y llama GPT. |
| Tests | Ver tabla. |
| 52.5% | Preservado. 0.0 pp. |

## Qué se cambió

### `lib/director-ia-conversation-state.js`

- Estado y sanitización incluyen `previous_frame`.
- Captura al cambiar a un standalone distinto o a un intent no inheritable (presupuesto, taller, financial).
- Restore = swap de un nivel: current válido → previous; prior compatible → current.
- `classifyTurnKind`: `^retomemos` es `topic_return`.
- `reconstructFromUserHistory` ya no wipea por `plant_switch` / `topic_return`. Solo `period_switch` limpia parent/entity.
- Standalone gana sobre `out_of_slice_clarify`.
- Return verb (`volvamos` / `retomemos` / `volviendo a`) vs switch verb (`hablemos de` / `hablando de`).
- Compatibilidad del cue: no restaurar un prior incompatible; no quedarse en el current si el pedido nombra otro dominio.
- `plant_switch` sin standalone no hereda; estaciona el current en previous y vacía el current.
- Fecha standalone no arrastra `active_date` echo; `ayer` del turno actual gana.

### `lib/director-ia-chat.js`

- Intents inheribles (daily sales/discount, plant, action, expediente) y no inheribles (budget, taller, financial) escriben `previous_frame` vía `conversationStateForIntent`.
- Clarify de `plant_switch` usa `parkCurrentAndClear`.
- Clarify de unknown/out_of_slice usa `preserveFramesOnClarify` (no wipea un prior ya estacionado).
- Resume de memoria persistente no corre si hay standalone o `restore_previous`.
- Restore no crea work items.

### Planner

No se tocó. «Volvamos a la venta de ayer.» ya clasificaba. No se inventó wording de M18.

## Conversaciones de producto

1. venta ayer → descuento/kg (sin `ayer`, no inventa discount) → volver venta ayer → quién explicó más.
2. Puebla → Arturo (no captura) → venta ayer (captura plant+Arturo) → volver Arturo (requery plant, revalida) → qué faltaba.
3. acción Julio Pérez → Ahora dime Puebla (estaciona, no inventa plant) → retomar acción (requery AR) → por qué seguía abierta.
4. Puebla → Ahora dime el presupuesto (no inventa semana) → ¿Y eso? clarifica → Volvamos a Puebla → qué más.
5. acción → plant → venta evicta acción del único slot → Retomemos la acción clarifica. No recupera el tema equivocado.

## Tests

| Suite | Resultado |
|-------|-----------|
| Focal `test/director-ia-intra-session-topic-return.test.js` | **19/19** |
| Daily sales | pass |
| Daily discount | pass |
| Action-person | pass |
| Natural followup | pass |
| Persistent memory | pass |
| Plant diagnosis | pass |
| Financial diagnosis | pass |
| Conversational continuity | pass |
| `node scripts/test-director-ia-planner.js` | **58/58** |
| `node scripts/test-director-ia-capabilities.js` | **56/56** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **28/28** |
| `node --test test/director-ia-*.test.js` | **854/854** |
| `git diff --check` | clean |

## Límites (READY_WITH_LIMITS, no reabiertos)

- Un tercer standalone inheritable distinto evicta el único prior. No se implementó stack.
- «Ahora dime el descuento/kg» sin `ayer` no abre `daily_discount_deviation`.
- «Ahora dime el presupuesto» sin semana/carro no abre M18.
- «Ahora dime Puebla» no es `plant_diagnosis` standalone.
- «Bueno, volviendo a…» (sin ancla `^volviendo`) hereda current.

## NEXT_TASK (no autorizada, no ejecutada)

`DOCS-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-SYNC-001`

STOP.
