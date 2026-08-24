# Reporte — IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001

```yaml
task_id: "IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001"
outcome: "DONE_PENDING_REVIEW"
determination: "IMPLEMENTED"
first_slice: "pending_work_items_only"
storage_owner: "chat legado operativo (arr.director_ia_pending_work_items)"
new_table: true
eks: false
ies: false
n5: false
raw_history_persisted: false
memory_is_evidence: false
cross_session: true
g2: "N/A"
g3: "N/A"
g5_contract_conformance: "APPROVED (prior AUDIT; not next-task auth)"
g8: "N/A"
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Persistent conversational memory is not module coverage."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001.md"
  - "lib/director-ia-persistent-memory.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "server.js"
  - "sql/017_director_ia_pending_work_items.sql"
  - "test/director-ia-persistent-memory.test.js"
  - "test/director-ia-conversational-continuity.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
  - "lib/director-ia-eks.js"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "sql/015_director_ia_eks.sql"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-READINESS-001.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PERSISTENT-MEMORY-EKE-GATE-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea y, si aplica, autoriza NEXT_TASK."
  - "Aplicar sql/017_director_ia_pending_work_items.sql en el entorno es acto operativo humano."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

Quedó implementado **A — `pending_work_items_only`**.

Un pendiente de trabajo (planta + entidad única + intent + brecha objetiva) se persiste en `arr.director_ia_pending_work_items`. Al día siguiente, «¿Qué pasó con Arturo?» recupera ese pendiente, **revalida authz/planta/entidad**, **requery** las fuentes y habla con evidencia **fresca**. El recuerdo no afirma «Arturo sigue sin comprar».

MEMORY ≠ CURRENT EVIDENCE. Sin history, transcript, answers, hipótesis, payloads ni authz cacheada.

Baseline intacto: **10.5 / 20 = 52.5%**, **0.0 pp**.

NEXT_TASK (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-persistent-conversational-memory-001` (≠ `main`).
- HEAD de partida: `4d0e0edb`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. `AUTHORIZED` → `IN_PROGRESS` solo cambió `status`.
- Transición final: `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin matriz, sin contratos, sin EKS/IES/N5, sin commit, sin push, sin merge.

---

## Storage

| Campo | Valor |
|---|---|
| Owner | Chat legado operativo |
| Schema | `arr` |
| Tabla | `arr.director_ia_pending_work_items` (`sql/017_*.sql`, `CREATE IF NOT EXISTS`) |
| Naming | Sigue `014` bitácora / `016` entidad. No se tocó `eks` |

Columnas: `id`, `user_scope_key`, `planta_id`, `entity_type` (`client`), `entity_key`, `entity_display`, `parent_intent`, `pending_information_gap` (JSONB sanitizado), `gap_fingerprint`, `status`, `created_at`, `updated_at`, `last_revalidated_at`.

No hay columnas de history, transcript, answer, payload ni snapshot de authz. `physical_person` no se persiste.

Dedupe: unique parcial active `(user_scope_key, planta_id, entity_key, parent_intent, gap_fingerprint)`.

Runtime: `createPgStore(pool)` en `server.js`. Tests usan `createInMemoryStore`. Si la tabla no existe, el store PG falla cerrado hacia «sin memoria» (el chat sigue).

---

## Creation / retrieval / revalidation

**Auto-create** solo si: planta autorizada, `user_scope_key`, entidad única, intent `plant_diagnosis` \| `expediente_comercial`, gap objetivo (sin `SOURCE_RESTRICTED` como dato).

**Remember** («recuérdame…») usa el mismo shape.

**No** se crea por smalltalk, unknown suelto, ni cada mensaje.

**Retrieve** solo si el turno es retoma («qué pasó con», «en qué quedó», «seguimos con», «qué quedó pendiente»). Filtro: usuario + planta + `active`. Máx. 3. No en cada chat.

**Revalidation obligatoria:** authz actual, planta del request, entidad re-resuelta, requery. Dato actual gana. `SOURCE_RESTRICTED` actual no se salta con memoria.

Estados del **pendiente** (no del cliente): `active` / `resolved` / `superseded` / `stale` / `dismissed`.

GPT recibe `HILO` efímero + bloque `PENDIENTE DE TRABAJO` etiquetado como no-evidencia. No hay respuesta rígida programada.

Estado efímero se hidrata tras requery: `parent_intent` del ítem, `planta_id` del request, entidad solo si sigue única, gap fresco, `last_evidence_bundle_type` del pack actual.

---

## Day 1 → Day 2

1. «¿Por qué dejó de comprar Arturo?» → `plant_diagnosis` + work item `active`.
2. Sesión nueva (sin history / sin `conversation_state`).
3. «¿Qué pasó con Arturo?» → retrieve + requery + GPT con pendiente ≠ evidencia.

Comprobado en `test/director-ia-persistent-memory.test.js`.

---

## Tests

| Suite | Resultado |
|---|---|
| `test/director-ia-persistent-memory.test.js` | 19/19 |
| `test/director-ia-conversational-continuity.test.js` | 20/20 |
| plant_diagnosis + financial_diagnosis | verdes |
| `test/director-ia-*.test.js` | **761/761** |

`git diff --check`: limpio.

---

## Confirmaciones

- Persistencia cross-session: sí (store `arr` / in-memory en tests).
- No raw history: sí.
- Memory ≠ evidence: sí (bloque explícito + requery).
- Requery: sí (loader se vuelve a llamar el día 2).
- Authz revalidada: sí. Memory no concede acceso.
- Isolation: cross-user, cross-plant, acceso revocado, SOURCE_RESTRICTED actual.
- Lifecycle: resolved / superseded / stale / dismissed.
- Day1/day2: sí.
- Continuidad efímera: preservada.
- 52.5%: intacto.

---

## NEXT_TASK (no autorizada, no ejecutada)

Exactamente una:

`DOCS-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-SYNC-001`

STOP.
