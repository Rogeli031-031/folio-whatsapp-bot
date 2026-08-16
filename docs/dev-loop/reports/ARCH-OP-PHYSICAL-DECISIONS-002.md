# Reporte — ARCH-OP-PHYSICAL-DECISIONS-002

```yaml
task_id: "ARCH-OP-PHYSICAL-DECISIONS-002"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-002.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-001.md"
  - "lib/"
  - "test/"
  - "fixtures/"
  - "server.js"
  - "package.json"
  - "código productivo"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md"
  - "docs/dev-loop/reports/ARCH-OP-PHYSICAL-DECISIONS-001.md"
contracts_modified:
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-OP-001 permanece no autorizado. Este reporte no es G5."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no abre IMPL-OP-001."
  - "G8 permanece fuera de alcance del OP. No se calibró."
```

## Ejecución

- Rama: `architecture/op-physical-decisions-002` (≠ `main`; no se cambió de rama).
- G1 intacto: `authorized_by`, `authorized_at`, `human_authorization` no modificados por el implementador.
- G2 leído: `AUTHORIZED` (humano); usado solo para `03A`.
- G8: `N/A`; no se calibró.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → registro D1–D15 y este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime. Sin tests. Sin fixtures. Sin commit, push, merge. Sin IMPL-OP-001.

## Qué se registró en `03A` v1.4

Únicamente `proposed_human_decisions` de `CURRENT_TASK.md`, sin reinterpretación.

| ID | Valor registrado |
|----|------------------|
| D1 | PURE_FACTORY |
| D2 | MINIMAL_EXECUTION_ENVELOPE |
| D3 | EXPLICIT_STATUS_OBJECT |
| D4 | USE_03A_ENUM_ONLY |
| D5 | ONE_STATUS_ZERO_TO_MANY_RECORDS |
| D6 | TRANSPORTABLE_BUSINESS_RESULT_ONLY |
| D7 | ACQUIRED_EMPTY_FAIL_CLOSED |
| D8 | PRESERVE_UPSTREAM_GENERATE_OPAQUE_OBSERVATION_IDS |
| D9 | PRESERVE_WITHOUT_SUBSTITUTION |
| D10 | RAW_REFERENCE_PLUS_NORMALIZED_VIEW |
| D11 | FAIL_CLOSED_ENTITY_RESOLUTION |
| D12 | NO_SILENT_DEDUP_V1 |
| D13 | INPUT_ORDER_STABLE_AND_CLOCK_INJECTABLE |
| D14 | STRUCTURAL_AND_TRANSPORT_VALIDATION_ONLY |
| D15 | FIXTURES_FIRST_THEN_OP_TO_EB |

UNKNOWN cerrados:

- Tool Execution Results → envelope mínimo de entrada (no N1, no verdad empresarial).
- AcquisitionStatus → objeto técnico con campos mínimos; enum §2 sin estados nuevos.
- Retries/deduplicación → no deduplicación silenciosa v1; retries conservan correlación.
- Reloj → `pipeline_received_at` inyectable; no determina semántica.

Cambios en `03A`:

- Cabecera y control documental 1.1/1.3 → **1.4** (alineación + realización física).
- Objeto `AcquisitionStatus` bajo §2.
- `pipeline_received_at` / `extracted_at` alineados a D13.
- §6: envelope + cardinalidad 1 status / 0..N records / listas hermanas.
- Invariantes 11–14.
- Nueva §8 Realización física v1 (D1–D15) + MINIMAL_EXECUTION_ENVELOPE.
- Implementación sigue **PENDIENTE**.
- Separación status/record, no autoridad N2–N5, `ACQUIRED_EMPTY` ≠ `ABSENCE_CONFIRMED`, procedencia no sustituible: intactos.

## Verificaciones

- `git diff --check` se ejecuta al cerrar.
- Otros contratos: no modificados.
- Código, tests, fixtures, `server.js`, `package.json`: no modificados.
