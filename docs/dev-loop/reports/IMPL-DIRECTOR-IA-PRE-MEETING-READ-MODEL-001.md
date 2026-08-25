# Reporte — IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001

```yaml
task_id: "IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
architecture: "B — structured pre-meeting read model"
first_slice: "B — core ejecutivo"
canonical_intent: "pre_meeting_brief"
materiality: "B — existing deterministic signals + GPT"
phrasebook: false
plaud_runtime: false
internal_http: false
snapshot_persisted: false
destination: "chat legado (askDirectorIa + planner + tools + conversation_state); NO Motor N1–N5; NO IES; NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g5: "pending HUMAN_APPROVER"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "First slice B compone capacidades existentes; no COMPLETE. 0.0 pp."
sql_execution: "out_of_scope / not used"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001.md"
  - "lib/director-ia-pre-meeting.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-client-profile.js"
  - "test/director-ia-pre-meeting.test.js"
  - "test/director-ia-intra-session-topic-return.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
  - "contracts"
  - "matrix"
  - "Plaud"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-PRE-MEETING-READ-MODEL-SYNC-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**Arquitectura B + first slice B implementados.** `pre_meeting_brief` es un read model de preparación de junta para **una planta** y **mes abierto CDMX**. Compone loaders existentes. No rediseña.

Pack del first slice:

1. comercial (`daily_executive_brief` + `commercial_trend` 90d both + `client_profile` recortado a movers ya rankeados, cap 3)
2. IGF abierto (pregunta sintética `"igf"`)
3. acciones (`buildActionRegisterBoardPayload` + `summarizeActionRegisterBoard` + `summarizeTopOverdueActions` + `assertActionRegisterAccess`)
4. IGF reviewable (pregunta sintética `"apoyos reviewable"` + mes abierto)
5. information gaps (output crítico)

No Taller Mayor, no Mejora Continua, no Plaud dentro del brief. Una fuente puede fallar sin matar el pack. missing ≠ 0. GPT hace **una** síntesis. State solo: plant, `meeting_period` (`active_period_months`), `meeting_type=monthly_close`, `parent_intent=pre_meeting_brief`. Requery fresco.

**NEXT_TASK** (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-PRE-MEETING-READ-MODEL-SYNC-001`.

---

## Ejecución

- Rama: `architecture/director-ia-pre-meeting-read-model-001` (≠ `main`).
- HEAD base: `1e3c9878 Merge branch 'audit/director-ia-production-conversation-gap-012'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin contratos, schema, SQL, matriz, commit, push, merge.

---

## Confirmaciones

| Requisito | Estado |
|-----------|--------|
| Arquitectura B | Sí. Structured pre-meeting read model. |
| First slice B | comercial + IGF abierto + acciones + reviewable + gaps. |
| Una planta | `planta_id` autorizado. Cross-plant limpia. Authz fail-closed si todas las críticas abortan. |
| Mes abierto CDMX | `meeting_period` = YYYY-MM abierto. IGF/reviewable no heredan «mayo» del usuario. |
| Mes cerrado nombrado | limitation `closed_month_requested_out_of_first_slice`. Sigue cargando el abierto etiquetado. No swap silencioso. |
| Reuso | loaders/helpers existentes. Sin HTTP interno. Sin SQL/fórmulas duplicadas. |
| Isolation | `safeLoad` por fuente. Provenance y limitations separados. |
| Gaps | Ausencia de evidencia cargada ≠ causa. `suggested_requests` read-only (`writes=false`). |
| Materialidad B | Señales existentes (deviations, rankings, statuses, overdue, reviewability, gaps). GPT ordena. Sin thresholds nuevos. Sin learned score. |
| Question anticipation | Prompt permite «Conviene estar preparado…». Prohíbe «El Consejo te va a preguntar…». |
| Read-only | No envía, no escribe comentarios, no crea/edita acciones, no cancela Folios, no persiste el brief. |
| Follow-ups | preocupa / falta explicar heredan. Acciones, reviewable, profile, trend, Taller Mayor son standalone. |
| No phrasebook | Tokens. Canónicas y hold-outs no están en `lib/`. |
| Plaud | Sin integración runtime. |
| 52.5% | 10.5 / 20. 0.0 pp. |
| `git diff --check` | se reporta al cierre. |

---

## Mecanismo

1. `isPreMeetingQuestion` (tokens de junta/reunión/pre-cierre + preparación). Daily, trend, reviewable, Taller Mayor y acciones vencidas ganan.
2. Planner: detecta `pre_meeting_brief` **después** de profile y **antes** de `\barr\b` / `\bigf\b`.
3. `loadPreMeetingBriefForChat` carga cada fuente en isolation. Profiles solo de movers ya rankeados (cap 3).
4. `INHERITABLE_INTENTS` + `isPreMeetingFollowUp` estrecho. Slot `meeting_type` sanitizado (`monthly_close` o null).
5. Chat in-process: una llamada OpenAI. State sin pack. `active_entities=[]`.
6. Tool `get_pre_meeting_brief` read-only, dominio `arr`.
7. `Háblame del cliente X` → `client_profile` (`háblame` + `cliente`). No convierte «Háblame del primero» en profile.

---

## Tests

| Suite | Resultado |
|-------|-----------|
| Focal `test/director-ia-pre-meeting.test.js` | **14/14** |
| `node --test test/director-ia-*.test.js` | **978/978** |
| `node scripts/test-director-ia-planner.js` | **58/58** |
| `node scripts/test-director-ia-capabilities.js` | **56/56** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **28/28** |
| `git diff --check` | se ejecuta al cierre |

Regresiones cubiertas por la suite: daily brief, daily sales, daily discount, commercial trend, client profile, actions, IGF, IGF reviewable, taller_mayor, topic return, persistent memory, folio_status, taller_at.

---

## Límites (no reabiertos)

- Mes cerrado IGF: fuera de scope. Limitation explícita.
- Taller Mayor / Mejora Continua / Plaud: no van en el pack; Taller es handoff.
- Ingreso real / SEH / writes / snapshot persistido: no implementados.
- Inventario `docs/director-ia/` no se toca (sync documental es la NEXT_TASK).

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`DOCS-DIRECTOR-IA-PRE-MEETING-READ-MODEL-SYNC-001`

STOP.
