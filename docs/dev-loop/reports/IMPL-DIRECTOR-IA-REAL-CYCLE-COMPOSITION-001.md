# Reporte — IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001

```yaml
task_id: "IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-CYCLE-COMPOSITION-001.md"
  - "lib/director-ia-real-cycle.js"
  - "test/director-ia-real-cycle.test.js"
  - "fixtures/director-ia/real-cycle/arr-ok-full-cycle.json"
  - "fixtures/director-ia/real-cycle/arr-empty-full-cycle.json"
  - "fixtures/director-ia/real-cycle/arr-tool-error-full-cycle.json"
  - "fixtures/director-ia/real-cycle/arr-entity-unresolved-full-cycle.json"
  - "fixtures/director-ia/real-cycle/arr-scope-incomplete-full-cycle.json"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-real-input-arr.js"
  - "lib/director-ia-observation-pipeline.js"
  - "lib/director-ia-evidence-builder.js"
  - "lib/director-ia-eks.js"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "lib/director-ia-channel-projection.js"
  - "lib/director-ia-e2e.js"
  - "server.js"
  - "package.json"
  - ".env"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-CYCLE-COMPLETION-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se encadena otra tarea."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
```

## Ejecución

- Rama: `implementation/director-ia-real-cycle-composition-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-19T13:06:59-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-19`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. COMPOSITION_ONLY. Sin persistencia, sesión, WhatsApp, Twilio, chat, endpoint ni `server.js`. Sin commit, push, merge. Sin siguiente tarea.

`lib/director-ia-real-input-arr.js` **no se modificó**: el hook no era necesario; `arrInput.run` ya devuelve el Snapshot EKS.

---

## 1. Composición realizada

Factory `createDirectorIaRealCycle({ arrInput, iesBuilder, reasoningEngine, channelProjection, clock, idFactory }).run(input)`:

1. Invoca `arrInput.run` **una vez** (ciclo ARR existente).
2. Clona el Snapshot EKS (no lo muta).
3. Adjunta `query_context_metadata` con la forma E2E/IES; **sustituye `trace_id` por el de la fachada ARR**.
4. `iesBuilder.build(snapshotForIes)`.
5. `reasoningEngine.reason(ies, session)` — IES only.
6. `channelProjection.project({ channel: "DASHBOARD", ... })`.

No reejecuta OP/EB/EKS. No reutiliza `createDirectorIaE2e.run` (ese orquestador parte de envelopes sintéticos y volvería a ensamblar).

`clock` / `idFactory` se exigen por convención de factory; **no generan `trace_id`**.

---

## 2. Artefactos atravesados

| Etapa | Artefacto | Producer | Consumer en este ciclo |
|-------|-----------|----------|------------------------|
| ARR | `MINIMAL_EXECUTION_ENVELOPE` | ARR facade | OP (dentro de ARR) |
| OP | AcquisitionStatus / ObservationRecord | OP | EB (dentro de ARR) |
| EB | Knowledge Bundle | EB | EKS (dentro de ARR) |
| EKS | Knowledge Snapshot | EKS | composición → IES |
| overlay | `query_context_metadata` | composición (forma E2E/IES) | IES |
| IES | IES OFFICIAL | IES Builder | RE, CP |
| RE | Reasoning Result + Run | RE | CP |
| CP | `CHANNEL_OUTPUT_ENVELOPE_V1` DASHBOARD | CP | caller/tests |

---

## 3. `query_context_metadata`

Campos requeridos idénticos a IES/`QUERY_REQUIRED` y fixtures E2E: `executive_query_id`, `trace_id`, `original_question`, `intent`, `requesting_user_id`, `requesting_role`, `channel`, `resolved_entities`, `permission_restrictions`, `knowledge_effective_date`. Opcionales ya usados por E2E: `plant_or_scope`, `period`.

- `intent` = `arr_venta_ton` (ya existía en el plan ARR).
- `original_question` = pregunta del input ARR.
- `channel` metadata = `dashboard` (string IES); CP fuerza enum `DASHBOARD`.
- `trace_id` del fixture (`replaced_by_arr_facade`) se **reemplaza** por el de ARR; no se regenera en composición.
- Sin month no se inventa `period` (fixture scope incomplete).
- Sin `plant_code` no se inventa `entity_id` (fixture unresolved).

---

## 4. Propagación de `trace_id`

Owner: fachada ARR (`idFactory("trace")`). Composición copia ese valor a metadata, IES `query_context.trace_id` y resultado. Tests: un solo `trace` en ARR; composición no llama `idFactory("trace")`. Igualdad ARR envelope = snapshot = metadata = IES. RE/CP referencian `ies_id`.

---

## 5. Cinco estados ARR

| Fixture | Envelope | IES | source_health / listas | N5 | CP |
|---------|----------|-----|------------------------|----|----|
| OK | `ACQUIRED_OK` | `VALIDATED`, 1 fact | `DATA_AVAILABLE` | 0 hyp; `ABSTAIN` | DASHBOARD |
| empty | `ACQUIRED_EMPTY` | `PARTIAL`, 0 facts | `DATA_NOT_FOUND`; `partial_domains: [arr]` | 0 hyp | DASHBOARD |
| tool error | `TOOL_ERROR` | `PARTIAL` | `TOOL_ERROR`; `failed_tools: [get_arr_snapshot]` | 0 hyp | DASHBOARD |
| entity unresolved | `ENTITY_UNRESOLVED` | `PARTIAL`; sin `entity_id` canónico | `unresolved_entities` incluye `arr` y `original_value` `9001`, no `SYN-NTE` | 0 hyp | DASHBOARD |
| scope incomplete | `QUERY_SCOPE_INCOMPLETE` | `PARTIAL`; `scope_complete: false` | `incomplete_scopes: [arr]` | 0 hyp | DASHBOARD |

Ningún path produce `ABSENCE_CONFIRMED`, Evidence, Diagnosis ni Hypothesis. Empty ≠ `venta_ton = 0`.

---

## 6. Tests

| Suite | Comando | Resultado |
|-------|---------|-----------|
| Focal composición | `node --test test/director-ia-real-cycle.test.js` | **19 pass / 0 fail** |
| Regresión Director IA | `node --test test/director-ia-*.test.js` | **311 pass / 0 fail** (19 nuevos + 292 previos) |
| Whitespace | `git diff --check` | limpio |

---

## 7. Gaps físicos restantes (no bloqueantes de esta tarea)

1. **`server.js` no cablea la fachada.** Fuera de alcance. El caller productivo HTTP queda para una tarea futura.
2. **`loadArrProyForPlant` sigue sin exportarse.** Consumo por inyección, sin cambio de semántica ARR.
3. **Debt N4 IES** (`projectDiagnoses = cloneJson`) **intacta** (DEBT_NON_BLOCKING).
4. **N5 sustantivo** exige Evidence real; un `venta_ton` no la produce. `ABSTAIN` / cero hypotheses es el comportamiento constitucional, no un fallo.
5. **`modelAdapter`** sigue inyectado en RE (vacío/fake en tests). No se añadió SDK LLM.
6. Persistencia durable y sesión conversacional **no** se introdujeron (no eran prerrequisito).

---

## 8. STOP

Sin commit. Sin push. Sin merge. Sin siguiente tarea.
