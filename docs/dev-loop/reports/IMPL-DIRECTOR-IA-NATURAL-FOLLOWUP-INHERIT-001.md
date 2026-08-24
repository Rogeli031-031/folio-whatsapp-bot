# Reporte — IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001

```yaml
task_id: "IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001"
outcome: "DONE_PENDING_REVIEW"
determination: "IMPLEMENTED"
strategy: "B — unknown + valid state -> inherit"
destination: "chat legado (askDirectorIa + post-planner inherit + OpenAI existente), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
phrasebook_enlarged: false
holdout_coded_in_production: false
blind_ar_fallback: false
evidence_strategy: "requery_every_turn"
planner_mutated_to_conversational_lm: false
julio_action: "deferred (not this slice)"
daily_discount: "deferred"
sql_017: "not executed"
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Natural follow-up inherit is not module coverage."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-001.md"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "test/director-ia-natural-followup.test.js"
  - "test/director-ia-conversational-continuity.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-planner.js"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-READINESS-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea (CLOSED/REJECTED) y, si aplica, autoriza NEXT_TASK."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

Quedó implementada la **estrategia B**.

El planner aislado sigue clasificando el turno. Si el resultado es `unknown`, hay `parent_intent` inheritable, el estado conversacional es válido, no hay standalone ≥ 0.55, y no hay plant/topic/period switch ni conflicto de entidad, el runtime **hereda el parent_intent**, hace **requery** y llega a **GPT** con HILO + pack fresco.

Unknown **sin** contexto válido clarifica. No cae a Action Register.

Standalone siempre gana (presupuesto, Taller AT-15, Querétaro, venta ayer, IGF, acciones vencidas).

No se agrandó el phrasebook: no hay listas de frases/sinónimos, ni umbral de palabras como condición de inherit, ni score de anáforas. Los hold-out (`No te seguí`, `¿En qué sentido?`, `¿O sea?`, etc.) viven solo en tests.

Baseline intacto: **10.5 / 20 = 52.5%**, **0.0 pp**.

NEXT_TASK (propuesta; no autorizada; no ejecutada): `DOCS-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-SYNC-001`.

---

## Confirmaciones

- **strategy B:** sí. Inherit post-planner en `resolveConversationTurn`; el planner no se convirtió en LM conversacional.
- **unknown + valid context inherit:** sí. `isolatedUnknown` + `parent_intent` inheritable + bundle defendible + sin topic/plant conflict + sin standalone → `inherit_parent_intent` → requery → GPT.
- **standalone wins:** sí. Presupuesto, Taller AT, `¿Cómo va Querétaro?`, venta ayer, IGF y acciones vencidas no se pisan con el hilo anterior. Un standalone no inheritable (presupuesto/Taller) limpia el parent reconstruido del history.
- **entity safety:** sí. `eso/esto/aquello` no son clientes. `él/ella/ese cliente` solo usan `active_entity` válida. Nombre propio se resuelve en la planta actual (único / ambiguo / none). Sin fuzzy. Plant switch invalida entidad/gap incompatibles.
- **requery:** sí. Cada turno heredado vuelve a cargar el pack. Context inherit ≠ evidence reuse. History no es evidencia.
- **GPT open interpretation:** sí. Se quitaron early-returns enlatados de hueco en `plant_diagnosis`. GPT recibe parent intent, HILO, entity/date válidos, pack fresco y limitations. Redacta el follow-up.
- **no bigger phrasebook:** sí. Inherit no depende de reconocer “qué más”, “cómo así”, “No te seguí”, etc.
- **hold-out generalization:** sí. Tests cubren frases ausentes en `lib/`. Grep de producción: esos textos no están en routing.
- **no blind AR fallback:** sí. Unknown sin estado válido → clarificación explícita.
- **52.5%:** sí. `10.5 / 20 = 52.5%`, `0.0 pp`.

---

## Ejecución

- Rama: `implementation/director-ia-natural-followup-inherit-001` (≠ `main`).
- HEAD de partida: `1a4efe56 Merge branch 'architecture/director-ia-natural-followup-inherit-readiness-001'`.
- G1 heredado: `HUMAN_APPROVER` / `2026-08-24`. No se tocaron `authorized_*`.
- `lib/director-ia-planner.js` no se modificó.

### Inherit B

Condición:

```
planner aislado = unknown
+ parent_intent ∈ {plant_diagnosis, expediente_comercial, daily_sales_deviation}
+ last_evidence_bundle_type ausente o compatible
+ misma planta
+ sin standalone ≥ 0.55
+ sin topic/plant/period switch
=> heredar parent_intent
=> REQUERY
=> HILO + evidence fresca
=> GPT
```

Excepción puntual (no catálogo de follow-ups): un `entity_intro` con nombre propio puede correr el intent de planta **en el scope actual** tras plant switch, sin arrastrar la entidad anterior.

### GPT / enlatados

En `plant_diagnosis`, los follow-ups de hueco (`qué falta`, `quién`, `para qué`) ya no cortan con prosa rígida. Van a GPT con HILO + pack. Las clarificaciones de seguridad/ambigüedad (unknown sin estado, entidad ambigua/ausente, periodo/topic fuera de slice) se conservan.

Presupuesto, Taller AT y `financial_diagnosis` dejan `conversation_state` vacío para que un follow-up posterior no herede Puebla.

### Entity / history

- Demostrativos y “¿Y después?” no se leen como cliente (identidad por casing/token, no lista de follow-ups).
- Follow-up abierto conserva `active_entity` ya validada (`carryActiveEntities`).
- History: un standalone no inheritable o un plant/topic/period switch anula el parent reconstruido. No se reabre Puebla por transcript después de presupuesto.

---

## Tests

| Suite | Resultado |
|---|---|
| `test/director-ia-natural-followup.test.js` | pass |
| `test/director-ia-daily-deviation.test.js` | pass |
| `test/director-ia-conversational-continuity.test.js` | pass |
| `test/director-ia-persistent-memory.test.js` | pass |
| `scripts/test-director-ia-capabilities.js` | 56/56 |
| `scripts/test-director-ia-planner.js` | 49/49 |
| `scripts/test-director-ia-tool-orchestrator.js` | 27/27 |
| `node --test test/director-ia-*.test.js` | 795/795 |
| `git diff --check` | clean |

Hold-out en tests, no en producción: `No te seguí`, `¿En qué sentido?`, `¿Me explicas mejor?`, `¿Qué otra cosa ves?`, `¿Y después?`, `¿O sea?`, `¿Qué quieres decir con eso?`, `No me cuadró`, `Explícamelo otra vez`.

No se resolvió: Julio/Action Register routing, daily discount, SQL 017.

---

## Porcentaje

Antes: **10.5 / 20 = 52.5%**  
Después: **10.5 / 20 = 52.5%**  
Delta: **0.0 pp**

---

## NEXT_TASK (solo propuesta)

`DOCS-DIRECTOR-IA-NATURAL-FOLLOWUP-INHERIT-SYNC-001`

No autorizar. No ejecutar.

---

STOP.
