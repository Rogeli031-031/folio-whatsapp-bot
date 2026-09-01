# SPRINT1-DIRECTOR-IA-CLIENT-KNOWLEDGE-CONSISTENCY-001

```yaml
task_id: SPRINT1-DIRECTOR-IA-CLIENT-KNOWLEDGE-CONSISTENCY-001
outcome: DONE
previous_task_closed: SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-001
files_touched:
  - lib/director-ia-client-profile.js
  - test/director-ia-client-profile.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-KNOWLEDGE-CONSISTENCY-001.md
files_not_touched:
  - lib/commercial-trend-engine.js
  - lib/director-ia-commercial-trend.js
  - lib/director-ia-conversational-executive-layer.js
  - lib/director-ia-planner.js
  - lib/director-ia-chat.js
  - lib/dashboard-arr-forecast.js
  - Forecast / IGF / ARR / PROM / DICF / Action Register
  - Dashboard
  - docs/director-ia/
  - reportes COMMENTS-001 / COMMENTS-AUDIT / KNOWLEDGE-CONSISTENCY-AUDIT
contracts_consulted:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-KNOWLEDGE-CONSISTENCY-HUMAN-REVIEW-AUDIT-001.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/LOOP_PROTOCOL.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "G5 humano: COMMENTS-001 CLOSED y esta tarea AUTHORIZED se transcribieron a CURRENT_TASK.md con la línea AUTHORIZED_BY_HUMAN dictada por Ing. Rogelio Zaragoza. Track B no se inició."
next_task_proposed: "SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-001 (Track B). No autorizada."
secrets_check: none
human_decision_needed:
  - "G5: HUMAN_APPROVER CLOSED o REJECTED de ESTA tarea."
  - "Validación humana: «¿Cómo vamos?» luego «¿Qué sabemos de TORTILLERIA ERICK?»."
  - "PRODUCTION_PASS = NOT_YET_PROVEN"
```

## Causa raíz

`client_profile` consultaba `arr.cliente_comentarios` solo por `cliente_key` no vacía. Commercial Movers usa `loadRecentCommentsByClienteNombres` (nombre+planta). Un comentario con key NULL era visible en «¿Cómo vamos?» e invisible en «¿Qué sabemos de X?». El prompt decía «ninguno para estas keys»; el LLM lo verbalizaba como «no se han registrado comentarios». `FALSE_ABSENCE_RISK` sistémico. PRE_EXISTING_GAP; no regresión de COMMENTS-001.

## Solución mínima

Reutilizar el loader ya existente. No se creó un sistema de comentarios.

1. **Key primero.** `queryCommentsByKeys` sigue igual.
2. **Complemento nombre+planta** si hay `cliente_norm` / `display_name` / `entity_hint`: `loadRecentCommentsByClienteNombres` con `getPlantaIdsEquivalentes`.
3. **Merge** por `body|created_at`. No duplicar. Key gana en empate.
4. **Falsa ausencia.** Vacío = `NO_ENCONTRADO_EN_ESTA_RUTA` + `comments_absence_not_confirmed`. Prohibido «no se han registrado / no hay / no existen comentarios» como hecho. DICF vacío: no afirmar ausencia global de acciones; AR sigue unsupported.
5. **Verbalización.** `Comentario registrado [YYYY-MM-DD]: «…». El comentario no es la causa.` Fecha solo si ya viene. No causalidad.

## cliente_key

Se conserva. Un hit por key no se descarta. El nombre no sustituye la ruta key.

## Acciones

Solo wording local. DICF sigue por key. AR no se consulta. No rediseño.

## Tests

Focal `director-ia-client-profile.test.js`: 17/17.

Suite `node --test test/director-ia*.js`: **1318/1318**, fail 0.

Cubierto: Erick por nombre; created_at; no-causa; vacío no inventa; ausencia no confirmada; key se conserva; no duplicar; planta 2; mensual/descuento; routing perfil.

## Pendientes (fuera)

- Track B (0 t día 1).
- A2/A3/A8 routing fragmentado.
- «¿Por qué bajó X?».
- Migración schema a `cliente_key`.

```
DASHBOARD_BEHAVIOR_CHANGED = NO
PRODUCTION_PASS = NOT_YET_PROVEN
IMPLEMENTATION_AUTHORIZED_NEXT = NO
TRACK_B_STARTED = NO
```

## STOP

No CLOSED ni APPROVED. Un DONE no autoriza otra tarea.
