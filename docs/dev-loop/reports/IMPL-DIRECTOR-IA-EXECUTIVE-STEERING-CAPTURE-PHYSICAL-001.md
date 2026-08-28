# IMPL-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001

```yaml
task_id: "IMPL-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
first_slice: "B_schema_plus_in_process_create_read"
store: "arr.executive_steering_events"
attestation_state: "RECORDED"
implementation: true
http_endpoint: false
ui: false
chat_integration: false
plaud: false
g2_canonical_docs: false
matrix_changes: false
focal_tests: "33/33"
director_ia_suite: "1098/1098 pass, 0 fail, 0 skipped"
git_diff_check: "clean"
next_task_proposed: "AUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "sql/020_executive_steering_capture.sql"
  - "lib/director-ia-executive-steering-capture.js"
  - "test/director-ia-executive-steering-capture.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md"
files_not_touched:
  - "docs/director-ia/EXECUTIVE-STEERING-CAPTURE-CONTRACT.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "lib/director-ia-executive-cycle-composer.js"
  - "lib/action-register-board.js"
  - "lib/director-ia-financial-actual.js"
  - "server.js"
contracts_modified: []
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "G2 Index/EKE/CAPACIDADES queda DESPUÉS de la auditoría física. No se ejecutó."
  - "52.5% no cambia (0.0 pp)."
```

## 1. Executive result

**DONE_PENDING_REVIEW.**

First physical slice B materializado: store dedicado en `arr`, servicio in-process create/read, AUTHZ VIEW+RECORD según DECISION RESOLVED, CORRECTION append-only, fail closed.

`RECORDED` = existe una atestación con provenance. No es verdad, confirmación, aprobación, ejecución, cumplimiento, target, forecast, actual ni FINAL.

No HTTP. No UI. No chat. No Plaud. No G2. No commit / push / merge.

## 2. Contract/ARCH conformance

Implementado contra:

1. `docs/director-ia/EXECUTIVE-STEERING-CAPTURE-CONTRACT.md` v1.0 (intacto)
2. `ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-001.md`
3. `ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md`
4. `DECISION-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-AUTHZ-001.md`

No se reinterpretaron tipos, estados, ni la matriz AUTHZ.

Desviación documentada (no contractual): ARCH física §4 decía `event_plants` solo para `MULTI_PLANT`. AUTHZ + prompt exigen que GG ZONE persista un conjunto demostrable de plantas para VIEW/RECORD full-scope. Sin tabla de zona, esas plantas de demostración se guardan en `executive_steering_event_plants`. No se inventan plantas desde el label. ZP/AD pueden registrar ZONE solo con `scope_label`.

## 3. Files changed

| Archivo | Rol |
|---------|-----|
| `sql/020_executive_steering_capture.sql` | DDL first slice |
| `lib/director-ia-executive-steering-capture.js` | Authz + validate + record/get/list + delete/update forbidden |
| `test/director-ia-executive-steering-capture.test.js` | 33 casos focales |
| `docs/dev-loop/CURRENT_TASK.md` | IN_PROGRESS → DONE_PENDING_REVIEW |
| este reporte | evidencia |

Working tree previo (PRE_CLOSE / NEXT_GAP / contrato / ARCH / AUTHZ) **no restaurado ni limpiado**.

## 4. Physical schema/store

Schema `arr`. Tablas:

- `arr.executive_steering_events` — una fila = un `EXECUTIVE_STEERING_EVENT`
- `arr.executive_steering_event_plants` — membresía MULTI (y plantas de demostración ZONE)
- `arr.executive_steering_event_relations` — `REFERS_PROPOSAL` / `CORRECTS` / `SUPERSEDES`

No Action Register, no bitácora, no IGF, no EKS, no IES, no Plaud store, no meeting blob.

## 5. Event identity/grain

`id SERIAL`. Una fila = un evento. No se agrupan proposal/decision/commitment en un blob.

## 6. Event types

CHECK y validación aceptan únicamente:

`PROPOSAL` `DECISION` `COMMITMENT` `HUMAN_DECLARED_CAUSE` `CORRECTION`

Rechazados: `SCENARIO` `ACTION` `ACTUAL` `FINAL` `FORECAST` `TARGET` `NOTE` `SUMMARY`.

## 7. RECORDED semantics

Columna `attestation_state` CHECK solo `'RECORDED'`. El mapper expone:

```
meaning.recorded = attestation_exists_with_provenance
meaning.not = VERIFIED_TRUE | ORGANIZATIONALLY_CONFIRMED | APPROVED |
              EXECUTED | FULFILLED | TARGET | FORECAST | ACTUAL | FINAL
```

No CANDIDATE / CONFIRMED / APPROVED / REJECTED / FULFILLED runtime. Sin workflow. Sin promotion.

## 8. Actor model

| Campo | Norma |
|-------|--------|
| `captured_by_usuario_id` | Del auth (`actor_id` / `usuario_id`). Body ignorado. |
| `declared_kind` | `KNOWN_USER` / `KNOWN_ROLE` / `FREE_TEXT_SPEAKER` / `UNKNOWN` |
| `declared_user_id` | Solo si `KNOWN_USER` |
| `extracted_by` | NULL en slice manual |

No se hace `declared_by = recorded_by` por default. Speaker UNKNOWN permanece UNKNOWN.

## 9. Provenance

Campos: `source_type`, `source_id`, `source_location`, `meeting_ref`, `declared_*`, `captured_by_usuario_id`, `created_at`, `captured_at`, `declared_at`, relations.

`source_type` default `MANUAL`. Meeting/source nullable. Sin transcript store. `PLAUD_FUTURE` es literal de fuente, no runtime Plaud.

## 10. Scope model

`scope_kind` ∈ `PLANT` | `MULTI_PLANT` | `ZONE` | `OTHER_EXPLICIT` | `UNKNOWN`.

- PLANT: `plant_id` NOT NULL
- MULTI: `plant_id` NULL + filas en `event_plants` (≥1)
- ZONE: `scope_label`; plantas de demostración opcionales (obligatorias para GG)

Identidad de planta: `public.plantas.id`.

## 11. AUTHZ VIEW

| Actor | Resultado |
|-------|-----------|
| ZP + aliases (`DIR_ZP`, `DIRZP`, `DIRECTORZP`, `DIRECTOR_ZP`, `DZP`, `DIR-ZP`) | YES / ALL_PLANTS |
| AD | YES / ALL_PLANTS |
| GG | YES / ASSIGNED_PLANTS (scope **completo**) |
| resto (GA GV CF_CDMX CDMX ZC GO SG SEH) | DENY |
| USUARIOS ACCESS_KEY | DENY (no es rol) |

JWT que colapsa GO→GG: se mira `rol_clave` real → DENY.

Authz **antes** de devolver el evento. Un MULTI con una planta fuera de assigned no se recorta: el evento entero es invisible.

No se hereda `canViewFinancialActual`.

## 12. AUTHZ RECORD

Misma matriz que VIEW. Los cinco tipos comparten RECORD.

ACCESS_KEY no concede RECORD. Plaud / LLM / Director IA / live no tienen path autónomo de RECORD (solo servicio in-process con actor autenticado).

## 13. GG PLANT

GG registra/ve PLANT solo si `plant_id ∈ ASSIGNED_PLANTS`. Si no: `STEERING_SCOPE_DENIED` y no hay INSERT.

## 14. GG MULTI_PLANT

Regla: `requested_scope ⊆ assigned_scope`.

Caso explícito:

- assigned = Puebla(1), Querétaro(2)
- requested = Puebla(1), Acapulco(3)
- resultado: DENY, `events.length === 0`

No basta “al menos una coincide”.

## 15. GG ZONE

| Caso | Resultado |
|------|-----------|
| zone fully assigned (`plant_ids` ⊆ assigned) | allow |
| zone partially assigned | `SCOPE_DENIED` |
| zone unresolved (solo label) | `ZONE_UNRESOLVED` |

ZP/AD pueden ZONE sin plantas (ALL_PLANTS). No se confía en el label solo para GG.

## 16. Correction/history

CORRECTION = evento **nuevo**. Relación `CORRECTS` + `SUPERSEDES`. Original intacto (`raw_text`, `numeric_value`, type). `vigor` del original pasa a `SUPERSEDED` en la misma TX. Historia listable: original + correction.

## 17. Supersession/current-effective semantics

Patrón ARCH B: arista `SUPERSEDES` append-only + `vigor` metadata.

`list(..., { vigor: "CURRENT" })` = atestación no superseded. **No** es truth.

No `is_current`. No `igf.versions.financial_state`. Sin autoridad organizacional SUPERSEDE.

## 18. Delete/update protection

| Path | Comportamiento |
|------|----------------|
| `deleteExecutiveSteeringEvent()` | `STEERING_DELETE_FORBIDDEN` |
| `updateExecutiveSteeringEvent()` | `STEERING_UPDATE_FORBIDDEN` |

Inmutabilidad de **producto**. No se promete inmunidad frente a superusuario PostgreSQL.

Corrección semántica = CORRECTION event, no UPDATE.

## 19. Transactions

BEGIN → INSERT event → INSERT plants → INSERT relations → UPDATE vigor → COMMIT.

Fallo en plants/relations: ROLLBACK. Test 34: `failNext("insert_plant")` deja 0 filas.

Authz denegada ocurre **antes** de BEGIN (MULTI parcial no escribe).

## 20. Constraints

DDL + servicio:

- event_type CHECK cinco valores
- attestation_state CHECK `RECORDED`
- DECISION exige `decision_outcome`; no-DECISION lo anula
- no self-relation
- PLANT ⇒ `plant_id` NOT NULL
- numeric sin `value_mode` ⇒ reject
- `raw_text` no vacío
- `captured_by_usuario_id` NOT NULL

Periodo, metric, actor, meeting, baseline **no** obligatorios.

## 21. Read model

In-process:

- `getExecutiveSteeringEvent(client, auth, id)` — authz full-scope
- `listExecutiveSteeringEvents(client, auth, filters)` — type / vigor / meeting_ref / plant_id; cada fila pasa VIEW

Sin HTTP. Sin “current = verdad oficial”.

## 22. Other-domain isolation

El módulo no contiene `INSERT`/`UPDATE` a `igf.*`, `action_register`, `ventas_diarias`, `financial_state`, `compromiso_lines`.

No auto-crea ACTION. No muta IGF / ARR / ACTUAL_FINANCIAL / PRE_CLOSE / `month_close_result`.

Suites de esos dominios: 0 fallos.

## 23. EVAL-003 probes

| Caso | Persistido como | No se afirma |
|------|-----------------|--------------|
| Puebla 1,177 | `PROPOSAL` ABSOLUTE 1177 t | COMMITMENT / FORECAST / FINAL |
| Acapulco +40 | `COMMITMENT` DELTA 40 t | ACTION / forecast |
| Canal Acapulco | `CORRECTION` de ese commitment | truth de canal |
| Querétaro +15 | `PROPOSAL` DELTA 15 t | commitment auto |
| Morelos | `COMMITMENT` | número eterno |
| Zona +632 | **no persistido** | COMMITMENT zonal / scenario store |

Periodo y actor: UNKNOWN / FREE_TEXT cuando no hay evidencia. Sin backfill a DB real.

## 24. Tests

`test/director-ia-executive-steering-capture.test.js` — **33/33 pass**.

Cubre los 35 ítems del prompt (varios agrupados: 15–19, 22–24, 26–27, 28–30, 32–33) más:

- JWT collapse GO→GG deny
- `captured_by` desde auth, no body
- delete/update forbidden
- ZP aliases
- schema isolation
- EVAL-003

Cliente en memoria honra BEGIN/COMMIT/ROLLBACK.

## 25. Regression

| Suite | Resultado |
|-------|-----------|
| Focal steering | 33/33 |
| PRE_CLOSE `director-ia-pre-close-steering` | 37/37 |
| ACTUAL_FINANCIAL `director-ia-financial-actual` | 23/23 |
| IGF M7 | 13/13 |
| IGF reviewable supports | 26/26 |
| IGF FINAL `igf-financial-final` | 28/28 |
| ARR `director-ia-real-input-arr` | 24/24 |
| Action Register routing | 19/19 |
| `month_close_result` | 27/27 |
| `node --test test/director-ia-*.test.js` | **1098/1098**, 0 fail, 0 skipped |

No se ocultaron fallos. No se corrigió regresión fuera de scope.

## 26. Known limits

- Sin endpoint HTTP / UI / chat (ARCH slice B).
- Sin Plaud, meeting store, transcript.
- `SERIAL` no es UUID global.
- `ZONE` sin roster canónico: GG exige `plant_ids` demostrables; ZP/AD pueden label-only.
- `vigor` es metadata de cadena, no aprobación.
- Delete de superusuario PostgreSQL no está bloqueado por trigger (política de producto, no DB absoluta).
- CONFIRM / APPROVE / SUPERSEDE org / LINK_ACTION = FUTURE.
- Store nace vacío (`NO_BACKFILL`).
- G2 Index/EKE/CAPACIDADES no ejecutado.

## 27. Matrix impact

| | |
|--|--|
| Baseline | 10.5 / 20 = 52.5% |
| Después | 10.5 / 20 = 52.5% |
| Delta | **0.0 pp** |
| M0–M20 | **no modificados** |

## 28. Exactly one NEXT_TASK

**`AUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001`**

Auditoría independiente de esta implementación. **No autorizada. No ejecutada.**

G2 documental **después** de esa auditoría. No se abre en este turno.

STOP. No commit. No push. No merge.
