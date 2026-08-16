# Reporte — ARCH-EB-PHYSICAL-DECISIONS-003

```yaml
task_id: "ARCH-EB-PHYSICAL-DECISIONS-003"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-003.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-002.md"
  - "server.js"
  - "package.json"
  - "lib/"
  - "test/"
  - "sql/"
  - "scripts/"
  - "fixtures/"
  - "código productivo"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-002.md"
contracts_modified:
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-EB-001 permanece no autorizado. Este reporte no es G5."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no abre IMPL-EB-001."
  - "G8 permanece pendiente. No se calibró ninguna materia reservada."
```

## Ejecución

- Rama: `architecture/eb-physical-decisions-003` (≠ `main`; no se cambió de rama).
- G1 intacto: `authorized_by`, `authorized_at`, `human_authorization` no modificados por el implementador.
- G2 leído: `G2_architecture_change: AUTHORIZED` (humano); usado solo para `02` y la aclaración mínima de `03`.
- G8 leído: `N/A`; no se calibró.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → registro D1–D15 y este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime. Sin tests. Sin fixtures. Sin commit, push, merge. Sin IMPL-EB-001.

## Qué se registró

Únicamente `proposed_human_decisions` de `CURRENT_TASK.md`, sin reinterpretación.

### `02` v2.0 → v2.1

| ID | Valor registrado |
|----|------------------|
| D1 | I2 |
| D2 | E1 + N1_WRAPS_03A |
| D3 | SEQUENTIAL_BARRIERS |
| D4 | R_MOD_EMPTY_GOVERNED_SETS |
| D5 | OPAQUE_TRACEABLE_IDS |
| D6 | PRESERVE_FULL_03A_LINEAGE_NO_K |
| D7 | DIMENSIONS_WITHOUT_FALSE_PRECISION |
| D8 | FAIL_CLOSED |
| D9 | LITERAL_STATE_MACHINE |
| D10 | NOT_ASSESSED_UNTIL_G8 |
| D11 | PURE_NO_SIDE_EFFECTS |
| D12 | EB_SEMANTICS_PLUS_EKS_STRUCTURE |
| D13 | 03B_PLUS_MINIMAL_03A_FAIL_CLOSED_CASES |
| D14 | EB_FIXTURES_FIRST_OP_BEFORE_PRODUCTION |
| D15 | REGISTER_MINIMUM_PHYSICAL_BOUNDARY |

Cambios en `02`:

- Cabecera y control documental v2.1.
- Dependencias: `03A` (entrada) y `03` (consumidor del Bundle).
- §2: frontera 03A → N1 → `bundle.observations`; listas hermanas; regla de preservación.
- §14: `source_family`, `source_instance_id`, `trace_id` y `raw_payload_reference` como lineage preservado de `03A`.
- Invariante 19: `bundle.observations` = N1; AcquisitionStatus no vive en N1.
- Nueva §19 Realización física v1 (D1–D15).
- Implementación sigue **PENDIENTE**. G8 sigue pendiente. No se fijaron `wi`, `k`, Fs, R, severidad, materiality productiva, reglas causales ni contratos de tool de inexistencia.

### `03` v1.2 → v1.3 (aclaración mínima)

- `bundle.observations` = Observaciones N1 emitidas por EB, derivadas de ObservationRecords transportables de `03A`.
- No son AcquisitionStatus. AcquisitionStatus se resume en `source_health`.
- EKS no reinterpreta; no se redefine `validate_structure` ni la realización física D1–D9 de `03`.
- No se reabrió epistemología, coverage ni append-only.

## Verificaciones

- `git diff --check` se ejecuta al cerrar.
- Otros contratos: no modificados.
- Código productivo, tests, fixtures: no modificados.
