# Reporte — IMPL-OP-001

```yaml
task_id: "IMPL-OP-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "lib/director-ia-observation-pipeline.js"
  - "test/director-ia-observation-pipeline.test.js"
  - "fixtures/director-ia/observation-pipeline/acquired-ok-single.json"
  - "fixtures/director-ia/observation-pipeline/acquired-ok-multiple.json"
  - "fixtures/director-ia/observation-pipeline/acquired-empty.json"
  - "fixtures/director-ia/observation-pipeline/tool-error.json"
  - "fixtures/director-ia/observation-pipeline/source-restricted.json"
  - "fixtures/director-ia/observation-pipeline/source-not-integrated.json"
  - "fixtures/director-ia/observation-pipeline/query-scope-incomplete.json"
  - "fixtures/director-ia/observation-pipeline/entity-unresolved.json"
  - "fixtures/director-ia/observation-pipeline/entity-resolved.json"
  - "fixtures/director-ia/observation-pipeline/retry-pair.json"
  - "docs/dev-loop/reports/IMPL-OP-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "package.json"
  - ".env"
  - ".env.example"
  - "lib/director-ia-evidence-builder.js"
  - "test/director-ia-evidence-builder.test.js"
  - "fixtures/director-ia/evidence-builder/"
  - "lib/director-ia-eks.js"
  - "test/director-ia-eks.test.js"
  - "test/director-ia-eks-integration.test.js"
  - "sql/"
  - "scripts/"
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/TASK_TEMPLATE.md"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se abre Tool Execution productivo, integración server/chat/dashboard ni escritura EKS."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G8 permanece N/A. El runtime no calibra wi, k, Fs, R, severidad ni materiality."
  - "Tool Execution productivo, server.js, chat, dashboard y append_snapshot quedan fuera hasta G1 separado."
```

## Ejecución

- Rama: `implementation/op-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `authorized_by`, `authorized_at`, `human_authorization` no modificados por el implementador.
- G2: `N/A`. G3: `N/A`. G8: `N/A`. No se editó `docs/director-ia/`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → runtime + fixtures + tests + este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin commit, push, merge. Sin SQL. Sin DB. Sin red. Sin LLM. Sin tools productivas. Sin `append_snapshot`.

## Runtime

`lib/director-ia-observation-pipeline.js`: `createObservationPipeline({ clock, idFactory }).process(execution_results)` → `{ acquisition_statuses, observation_records }`.

Entrada: array de envelopes o contenedor `{ execution_results | envelopes }`. Fixtures sintéticos de `MINIMAL_EXECUTION_ENVELOPE`. No es N1, no es hecho, no expresa confidence/materiality/coverage/`ABSENCE_CONFIRMED`.

| Decisión | Aplicación |
|----------|------------|
| D1 PURE_FACTORY | Factory inyectable; desacoplado de `server.js` |
| D2 MINIMAL_EXECUTION_ENVELOPE | Consume envelopes sintéticos; no ejecuta tools |
| D3 EXPLICIT_STATUS_OBJECT | Un objeto `AcquisitionStatus` por envelope; sin facts/confidence/materiality/coverage |
| D4 USE_03A_ENUM_ONLY | Solo enum §2; status desconocido → `INVALID_STATUS` |
| D5 ONE_STATUS_ZERO_TO_MANY_RECORDS | 1 status / envelope; `ACQUIRED_OK` → 0..N records |
| D6 TRANSPORTABLE_BUSINESS_RESULT_ONLY | `TOOL_ERROR` / `SOURCE_*` / `QUERY_SCOPE_INCOMPLETE` / `ENTITY_UNRESOLVED` → 0 records de negocio |
| D7 ACQUIRED_EMPTY_FAIL_CLOSED | Status técnico; registro de transporte vacío opcional (§2); nunca `ABSENCE_CONFIRMED` |
| D8 PRESERVE_UPSTREAM_GENERATE_OPAQUE_OBSERVATION_IDS | Preserva ids upstream; `observation_id` vía `idFactory` inyectable |
| D9 PRESERVE_WITHOUT_SUBSTITUTION | `content_author_id` null permanece null; extractor/disparador no sustituyen autor |
| D10 RAW_REFERENCE_PLUS_NORMALIZED_VIEW | `raw_payload_reference` + `normalized_payload`; no se elimina la referencia |
| D11 FAIL_CLOSED_ENTITY_RESOLUTION | Solo `RESOLVED` copia `subject.entity_id`; `UNRESOLVED` no inventa entidad |
| D12 NO_SILENT_DEDUP_V1 | Retries se conservan; sin deduplicación semántica |
| D13 INPUT_ORDER_STABLE_AND_CLOCK_INJECTABLE | Orden = input; `pipeline_received_at` = clock inyectable (default `"unclocked"`) |
| D14 STRUCTURAL_AND_TRANSPORT_VALIDATION_ONLY | Valida estructura/enum/identidad; no verdad empresarial |
| D15 FIXTURES_FIRST_THEN_OP_TO_EB | Fixtures primero; frontera OP → `assemble()` verificada en tests sin modificar EB |

## Invariantes aplicados

- `AcquisitionStatus` y `ObservationRecord` son listas hermanas; no se fusionan.
- OP no produce N2–N5, coverage, confidence, materiality ni `ABSENCE_CONFIRMED`.
- `ACQUIRED_EMPTY` ≠ `ABSENCE_CONFIRMED`. El EB sigue siendo propietario de ausencia empresarial.
- `QUERY_SCOPE_INCOMPLETE` fuerza `scope_complete: false`.
- Input no se muta (se clona antes de procesar).
- `metric_or_event` / `value` se copian solo si vienen explícitos en envelope o fila; no se extraen por interpretación.
- Fuente OP no contiene `append_snapshot` ni importa EKS.

## Verificaciones

- Tests Observation Pipeline: pasan.
- Tests Evidence Builder existentes: pasan.
- Tests EKS existentes (`director-ia-eks.test.js`, `director-ia-eks-integration.test.js`): pasan.
- Total: 70 pass, 0 fail.
- `git diff --check`: sin errores.
- `docs/director-ia/`, `server.js`, `package.json`, `lib/director-ia-evidence-builder.js`, `lib/director-ia-eks.js`: no modificados.

## STOP

Implementación de IMPL-OP-001 cerrada. Espera revisión humana. Este reporte no autoriza otra tarea.
