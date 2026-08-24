# Reporte — IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001

```yaml
task_id: "IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
determination: "IMPLEMENTED"
selected_strategy: "C"
canonical_parent_intent: "action_status"
destination: "chat legado (planner + askDirectorIa + board AR existente), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
phrasebook_enlarged: false
new_intent: false
accion_singular_covered: true
action_status_inheritable: true
ar_wins_over_memory_resume: true
silent_pick: false
blame: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Action-person routing is not module coverage."
daily_discount: "deferred"
sql_017: "not executed"
person_scoring: "not implemented"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-ACTION-PERSON-ROUTING-001.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-action-person.js"
  - "test/director-ia-action-person-routing.test.js"
  - "scripts/test-director-ia-planner.js"
  - "test/director-ia-natural-followup.test.js"
  - "test/director-ia-persistent-memory.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-ACTION-PERSON-ROUTING-READINESS-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-ACTION-PERSON-ROUTING-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**Estrategia C implementada.** No hay intent nuevo. No hay phrasebook más grande.

«acción» normalizado a `accion` ahora coincide con `/\baccion(es)?\b/` (singular y plural). `action_status` cubre acción + responsable (nombre propio estructural, no lista de personas). `action_status` es inheritable (estrategia B). Un intent AR standalone gana sobre resume genérico de memoria; «qué pasó con» no se apaga.

Julio Pérez, si está en el board de la planta, se resuelve como **responsable registrado de la acción**. No es culpable ni responsable del problema. 0 / 1 / N sin elección silenciosa. GPT recibe evidencia + limitations; si no hay motivo de retraso, puede decirlo y pedir actualización.

## Qué se cambió

### Planner

- Token estructural `accion` | `acciones`.
- `overdue_actions` sigue siendo acciones vencidas **de planta** (sin span de nombre propio).
- `responsible_lookup` y `como_va_tema_ar` preservados.
- `action_status` si hay `accion(es)` + span de nombre propio, o el genérico previo `abiert|pendient|estado|tema|register`, o `vencid` + span de nombre propio.
- No se hardcodea «qué pasó con la acción de» ni nombres.

### Conversación

- `INHERITABLE_INTENTS` incluye `action_status`.
- `active_entities` puede ecoar `ar_responsable` / `ar_action` (no como cliente).
- `action_id` solo si esa persona tiene **una** acción en el board.

### Chat / evidencia

- Rama in-process para `action_status` cuando hay persona resoluble o señal de acción/vencido.
- Lookup físico en el board de la planta actual (authz AR, fail-closed, sin cross-plant).
- Pack: id, título/tema, status, responsable, fecha compromiso, vencida sí/no, última actualización / historial / `resultado_cierre` **solo si el ítem los trae** (p. ej. fila DICF ya inyectada en el board). No se mezcla DICF por nombre.
- Consultas AR de planta («cómo va mantenimiento») siguen el dump legado.

## Confirmaciones pedidas

| Criterio | Resultado |
|---|---|
| Strategy C | Sí |
| accion(es) | Sí |
| action_status | Parent canónico e inheritable |
| AR > memory resume | Sí; «¿Qué pasó con Arturo?» sigue resume |
| Responsible resolution | Física, sin fuzzy, ambiguo → clarificar |
| 0/1/N | Ausencia / carga directa / listar |
| No silent pick | Sí |
| No blame | Prompt + limitations; no se programa culpa |
| Natural follow-ups | Estrategia B sobre `action_status` |
| Tests | Ver abajo |
| 52.5% | 0.0 pp |

## Tests

| Suite | Resultado |
|---|---|
| Focal `test/director-ia-action-person-routing.test.js` | 19/19 |
| Planner `scripts/test-director-ia-planner.js` | 57/57 |
| Natural follow-up | pass (en suite) |
| Persistent memory | pass (en suite) |
| Daily deviation | pass (en suite) |
| Capabilities `scripts/test-director-ia-capabilities.js` | 56/56 |
| Orchestrator `scripts/test-director-ia-tool-orchestrator.js` | 27/27 |
| `node --test test/director-ia-*.test.js` | **814/814** |

Hold-outs viven en tests, no en routing de producción.

## NEXT_TASK (no autorizada, no ejecutada)

`DOCS-DIRECTOR-IA-ACTION-PERSON-ROUTING-SYNC-001`

STOP.
