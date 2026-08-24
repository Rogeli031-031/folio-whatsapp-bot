# Reporte — IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001

```yaml
task_id: "IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001"
outcome: "DONE_PENDING_REVIEW"
determination: "IMPLEMENTED"
slice: "structured_conversation_state"
destination: "chat legado (askDirectorIa + planner + OpenAI existente), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
ephemeral_state: true
persistent_db: false
cross_session: false
raw_history_to_openai: false
evidence_strategy: "requery_every_turn"
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-001.md"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "test/director-ia-conversational-continuity.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "frontend-dashboard/"
  - "server.js"
  - "sql/"
  - "package.json"
  - "lockfiles"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-financial-diagnosis.js"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-READINESS-001.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

El chat legado ya no reclasifica cada elipsis desde cero. Hay un **`structured_conversation_state` efímero** (por request; sin tablas; sin cross-session) con:

- `parent_intent`
- `planta_id` del request autorizado
- `active_entities` (máximo 1, solo si es único en la planta actual)
- `last_evidence_bundle_type`
- `pending_information_gap` derivado del pack **fresco**

OpenAI recibe el turno + evidencia requery + un bloque `HILO` etiquetado como **conversación, no evidencia**. No recibe el history crudo.

`unknown` sin estado válido **ya no cae al dump de Action Register**: pide clarificación.

La conversación maestra Puebla → atención → por qué → Arturo → él → acción → qué falta **hereda** `plant_diagnosis` cuando el follow-up es defendible.

Global: **10.5 / 20 = 52.5%** (0.0 pp). Continuidad no es cobertura de módulo.

NEXT_TASK (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-conversational-continuity-001` (≠ `main`).
- HEAD al iniciar: `06ab5da8`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `AUTHORIZED` → `IN_PROGRESS` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge, matriz, contratos, frontend, server.js, SQL.

---

## Qué se implementó

### Estado efímero — `lib/director-ia-conversation-state.js`

Reconstrucción por request desde `history` user-only y/o `req.body.conversation_state` (eco opcional; el FE no se tocó). Claims de assistant **no** aportan identidad ni hechos.

Follow-up defendible (atención, por qué, ¿y Nombre?, pronombre, acción, brecha, «estás seguro») **puede** heredar `parent_intent` si es `plant_diagnosis` o `expediente_comercial`.

No se hereda si:

- el turno es standalone de alta confianza;
- no hay estado válido;
- hay `period_switch` / `topic_return` (fuera de slice → clarificar);
- el unknown no es follow-up.

Cambio de planta (`conversation_state.planta_id` ≠ request, o «Ahora …»): invalida entidad y gap. `planta_id` **nunca** se toma del texto.

Entidad: match de palabra completa / nombre exacto sobre candidatos del pack fresco. Cero o más de uno → clarificar. No fuzzy (`Art` ≠ `Arturo`).

### Planner

- `inheritParentIntent` solo si el detectado es `unknown`. Standalone intacto.
- `dejó de comprar` singular → `plant_diagnosis` (el plural `dejaron` sigue `commercial_state`).

### Chat

- `askDirectorIa` aplica continuidad **antes** de ramificar.
- `unknown` sin inherit → clarificación (no AR).
- `plant_diagnosis`: requery cada turno; authz del loader; `SOURCE_RESTRICTED` aborta igual que antes; `HILO` se antepone al user content.
- Brecha `quién` / `qué falta` / `para qué`: respuesta estructurada desde el gap fresco. Persona solo si hay responsable de acción en evidencia.

---

## Confirmaciones pedidas

| Requisito | Resultado |
|---|---|
| state efímero | Sí. Sin DB, sin sesión persistente. |
| parent_intent | Sí, en follow-ups defendibles. |
| entity continuity | Máximo 1; único en planta actual. |
| plant switch seguro | Invalida entidad/gap; no reusa `cliente_key` de otra planta. |
| pending information gap | Derivado del pack requery. |
| requery cada turno | `loadPlantDiagnosisForChat` por turno de planta. |
| history != evidence | History solo reconstruye estado; OpenAI no recibe turnos crudos. |
| unknown follow-ups corregidos | Heredan o clarifican; no AR ciego. |
| master conversation mejora | Puebla + follow-ups entran a `plant_diagnosis` / clarificación de entidad. |
| authz preservada | Cada POST + cada loader. |
| no cross-plant leakage | Mismatch de `planta_id` limpia entidad/gap. |
| 52.5% sin cambio | 0.0 pp. |

No implementado (a propósito): periodo, ayer, semana anterior, topic stack, multi-entidad, memoria persistente, history selectivo al LLM, motor diario.

---

## Tests

```
node --test test/director-ia-conversational-continuity.test.js   20/20
node scripts/test-director-ia-capabilities.js                     56/56
node scripts/test-director-ia-planner.js                          49/49
node scripts/test-director-ia-tool-orchestrator.js                26/26
node --test test/director-ia-*.test.js                            742/742
git diff --check                                                  limpio
```

---

## NEXT_TASK

Propuesta **exacta** (no autorizada, no ejecutada):

**`DOCS-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-SYNC-001`**

---

STOP.
