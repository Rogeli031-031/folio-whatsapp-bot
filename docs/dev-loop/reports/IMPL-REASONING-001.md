# Reporte — IMPL-REASONING-001

```yaml
task_id: "IMPL-REASONING-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "lib/director-ia-reasoning-engine.js"
  - "test/director-ia-reasoning-engine.test.js"
  - "fixtures/director-ia/reasoning/validated-no-evidence.json"
  - "fixtures/director-ia/reasoning/partial-no-evidence.json"
  - "fixtures/director-ia/reasoning/conflicted-no-evidence.json"
  - "fixtures/director-ia/reasoning/no-knowledge.json"
  - "fixtures/director-ia/reasoning/synthetic-with-evidence-for-validator.json"
  - "fixtures/director-ia/reasoning/synthetic-type-e.json"
  - "docs/dev-loop/reports/IMPL-REASONING-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "package.json"
  - ".env"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-observation-pipeline.js"
  - "lib/director-ia-evidence-builder.js"
  - "lib/director-ia-eks.js"
  - "lib/director-ia-op-eb-eks-integration.js"
  - "sql/"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se abre persistencia Run, proveedor real ni Channel Projection."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G8 permanece N/A."
```

## Ejecución

- Rama: `implementation/reasoning-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T11:46:17-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2/G3/G8: `N/A`. No se editó `docs/director-ia/`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → runtime + tests + fixtures + este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin commit, push, merge. Sin proveedor real, networking, API keys, SQL, persistencia Run ni Channel Projection.

## Runtime

`lib/director-ia-reasoning-engine.js`: `createReasoningEngine({ modelAdapter, clock, idFactory, policy }).reason(ies, session)` → `{ reasoning_result, reasoning_run }`.

| Decisión | Aplicación |
|----------|------------|
| REASONING_ENGINE_FACTORY_V1 | factory inyectable; IES única entrada epistemológica |
| PROVIDER_NEUTRAL_MODEL_ADAPTER_V1 | `infer({ reasoning_context, session, output_schema_version })` |
| STRUCTURED_REASONING_RESULT_V1 | arrays siempre presentes |
| THREE_PART_INTERPRETATION_V1 | `what_is_known` / `what_can_be_inferred` / `what_cannot_be_concluded` |
| DETERMINISTIC_POST_VALIDATION_REQUIRED | candidato inválido → REJECT_OR_ABSTAIN; no se inventa soporte |
| MODEL_PROPOSES_VALIDATOR_BOUNDS_V1 | enum WEAK/MODERATE/STRONG; STRONG degradado a WEAK bajo conflicto adverso o limitación bloqueante; techo §5 máximo WEAK |
| RIVAL_GROUP_WITHOUT_AUTORANK_V1 | orden del candidato conservado; `is_primary_candidate=false` |
| DETERMINISTIC_ABSTENTION_GATE_V1 | no consumible sin `infer`; NO_KNOWLEDGE / evidence vacío → abstención |
| SUPPORTED_CONDITIONAL_RECOMMENDATION_V1 | sin evidence suficiente → 0 recommendations |
| EPISTEMIC_ACTION_ONLY_V1 | Next Verification por allowlist de campos; extras (p. ej. tool) rechazados |
| NON_EXECUTED_DECISION_OPTION_V1 | `execution_status=NOT_EXECUTED` |
| IES_ANCHORED_CLARIFICATION_V1 | IDs deben existir en el IES |
| IN_MEMORY_REASONING_RUN_FIRST | Run en el retorno; no EKS/IES/SQL |
| AUDITABLE_NOT_BITWISE_REPLAY_V1 | `bitwise_replay_promised=false` |
| PROVIDER_FAILURE_FAIL_CLOSED_V1 | timeout / error / malformed → 0 hyp / 0 rec |
| ABSTENTION_CAPABLE_PROVIDER_INJECTED_RUNTIME_V1 | adapter fake en tests; sin networking |

`session` allowlist: `analysis_mode`, `canonical_reasoning_language` (default `es-MX`), `channel_hint`, `maximum_semantic_depth`. No transporta hechos/tools.

`engine_version` de implementación: `reasoning-engine-physical-v1` (no institucional).

## Fail-closed observado

- IES `BUILDING`/`EXPIRED`/`SUPERSEDED`/`INVALID`: `infer` no se llama; `status=REJECT`.
- `NO_KNOWLEDGE`: 0 hipótesis, 0 recommendations; abstención `NO_KNOWLEDGE`.
- `evidence[]` vacío (fixtures RE y IES Builder `official-full-minimal`): 0 hipótesis, 0 recommendations; abstención `INSUFFICIENT_EVIDENCE`.
- Candidato con refs/strength inválidos: hipótesis rechazada; no se corrige inventando IDs.
- Timeout/error/malformed: Result vacío de hyp/rec + metadata de error no sensible.
- Fixture `synthetic-with-evidence-for-validator.json` es **solo validador**; no declara N3 productivo.

## Tests

Comando: `node --test` sobre RE + IES + OP + EB + EKS + integración.

| Suite | Resultado |
|-------|-----------|
| RE (`test/director-ia-reasoning-engine.test.js`) | 35 pass |
| IES / OP / EB / EKS / integración | continúan pasando |
| **Total** | **153 pass, 0 fail** |

`git diff --check`: sin errores.

## Limitaciones / gaps diferidos

1. Persistencia durable de Reasoning Run: no implementada.
2. Proveedor LLM real / networking: no implementado.
3. Evidence Builder productivo sigue sin N3; el runtime demuestra abstención, no hipótesis sobre flujo productivo.
4. Channel Projection: fuera.
5. G8: no calibrado.
6. `reason()` es síncrono (adapter fake síncrono); un adapter futuro puede ser envuelto por el llamador. No se congeló async en contrato.

## STOP

IMPL-REASONING-001 cerrado. Espera revisión humana. Este reporte no autoriza otra tarea.
