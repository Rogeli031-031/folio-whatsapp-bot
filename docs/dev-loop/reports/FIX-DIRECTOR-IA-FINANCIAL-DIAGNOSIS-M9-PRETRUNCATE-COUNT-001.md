# FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-PRETRUNCATE-COUNT-001

IMPLEMENTATION_SHA:
aeab5a95d5f233c53fe3eebefb16645ec9944aba

BASE_MAIN_SHA:
7686c093724550da184ae3329a56b96a85a1c217

REJECTED_REFERENCE:
3ef8579ac76e1372ee1a087be4604543e15e0775 (inspeccionada con `git show`; no merge; no cherry-pick; no es ancestro de HEAD)

BEFORE:
B-001 base usa «presentes» = true (pre-fix, contra working tree base)
B-002 rejected contó `bucket.clientes.length` post-slice = true (`git show` 3ef8579a)
B-003 fixture 17 → post-truncate length 3 y rejected imprimiría `clientes=${count}` = true
B-004 `payload_client_count` ausente tras slice en base = true
B-005 PARTIAL `NO DISPONIBLE exacto` = true (conservado)
B-006 alignment comparable IGF/ARR 2026-09 + M9 2026-08→2026-09 = true (conservado)

PRETRUNCATE_COUNT_MODEL:
`truncateM9Datos` captura `payload_client_count` **antes** de `slice(0, 3)`. Después escribe `sample_client_count` y `clientes_truncated`. `formatM9Bucket` lee solo esos metadatos para el conteo de payload; no usa `bucket.clientes.length`.

PAYLOAD_CLIENT_COUNT_MODEL:
Longitud del array `clientes` del payload FD **antes** del truncate de contexto. No es universo M9. No es el 80/20 aguas arriba.

SAMPLE_CLIENT_COUNT_MODEL:
Longitud del array conservado en contexto (`slice(0, 3)`).

TRUNCATION_MODEL:
`truncated=YES` si payload_count > 3. `NO` si payload_count ≤ 3 y el array existía. Bucket ausente: `exists=NO`, `payload_client_count=UNAVAILABLE`.

UNIVERSE_COUNT_CLAIMED:
NO

FORMATTER_MODEL:
AVAILABLE: `unit=` + tres buckets `exists/state/payload_client_count/sample_client_count/truncated` + total físico. Sin «presentes». PARTIAL/NOT_FOUND/ERROR/RESTRICTED sin cambio de contrato Root 2.

SOURCE_COERCION_MODEL:
Etiquetado `CONVENCION_ESTRUCTURAL`. No es DATA_NOT_FOUND ni «el periodo no tiene clientes». COALESCE/loaders no tocados.

PARTIAL_MODEL:
`NO DISPONIBLE exacto` + `missing_inputs`. No EMPTY/NONEMPTY.

NUMERIC_TOTAL_MODEL:
venta `totalDeltaKg`; descuento `totalDeltaRatio`; ingreso `totalDeltaIngreso`. `0` disponible; null/ausente → UNAVAILABLE.

17_CLIENT_FIXTURE:
payload_client_count=17, sample_client_count=3, truncated=YES, state=NONEMPTY. `clientes.length` post-truncate=3 ≠ payload count.

4_CLIENT_FIXTURE:
payload_client_count=4, sample_client_count=3, truncated=YES.

001..055:
55/55 PASS. NEW FAILURE = 0.

SUITES:
- focal R-PRECOUNT: 55/55
- FD existentes + M9 + ARR Root1 + ARR + IGF + commercial + continuity + plant-diagnosis/orchestrator + golden harness: 243/243
- TIER 1: 8/8
- pre-deploy --gate: PASS

FILES:
- lib/director-ia-financial-diagnosis.js
- test/director-ia-financial-diagnosis-m9-pretruncate-count.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-PRETRUNCATE-COUNT-001.md

RISKS:
- `payload_client_count` sigue siendo el array del payload FD, no el universo clasificado M9 ni el 80/20.
- El LLM aún puede narrar causalidad o contradecir alignment (fuera de alcance).

REJECTED_IMPLEMENTATION_MERGED:
NO

REJECTED_IMPLEMENTATION_CHERRYPICKED:
NO

FORMATTER_AMBIGUITY_FIXED:
YES

POST_TRUNCATE_FALSE_COUNT_FIXED:
YES

PROMPT_REDESIGNED:
NO

POST_GENERATION_VALIDATOR_ADDED:
NO

M9_LOADERS_CHANGED:
NO

ARR_CHANGED:
NO

ALIGNMENT_CHANGED:
NO

PLANNER_CHANGED:
NO

ROUTING_CHANGED:
NO

SERVER_CHANGED:
NO

SQL_CHANGED:
NO

SCHEMA_CHANGED:
NO

DEPENDENCY_CHANGED:
NO

LIVE_DB_USED:
NO

FINAL:
PASS

```yaml
task_id: "FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-PRETRUNCATE-COUNT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST_REPLACEMENT"
implementation: true
cherry_pick_rejected: false
merge_rejected: false
base_main_sha: "7686c093724550da184ae3329a56b96a85a1c217"
rejected_reference: "3ef8579ac76e1372ee1a087be4604543e15e0775"
live_db: false
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```
