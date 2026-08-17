# Reporte — IMPL-IES-001

```yaml
task_id: "IMPL-IES-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "lib/director-ia-ies-builder.js"
  - "test/director-ia-ies-builder.test.js"
  - "fixtures/director-ia/ies/official-no-knowledge.json"
  - "fixtures/director-ia/ies/official-partial.json"
  - "fixtures/director-ia/ies/official-conflicted-type-e.json"
  - "fixtures/director-ia/ies/official-full-minimal.json"
  - "docs/dev-loop/reports/IMPL-IES-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "package.json"
  - "lib/director-ia-observation-pipeline.js"
  - "lib/director-ia-evidence-builder.js"
  - "lib/director-ia-eks.js"
  - "lib/director-ia-op-eb-eks-integration.js"
  - "sql/"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se abre persistencia IES, ALTERNATIVE, RE ni Channel Projection."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G8 permanece N/A. Digest sha256 es huella de implementación, no firma."
```

## Ejecución

- Rama: `implementation/ies-001` (≠ `main`; no se cambió de rama).
- Encabezado G1 ya registrado por HUMAN_APPROVER; no modificado por el implementador salvo `status`.
- G2/G3/G8: `N/A`. No se editó `docs/director-ia/`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → runtime + fixtures + tests + este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin commit, push, merge. Sin persistencia IES. Sin ALTERNATIVE. Sin LLM/tools/DB.

## Runtime

`lib/director-ia-ies-builder.js`: `createIesBuilder({ clock, idFactory }).build(snapshot)` → IES OFFICIAL. `validate(ies)` estructural.

Entrada única: Knowledge Snapshot con `bundle`, `snapshot_id`, `version` y `query_context_metadata`. Sin segunda entrada. Sin importar OP/EB/EKS.

| Decisión | Aplicación |
|----------|------------|
| SNAPSHOT_CARRIES_QUERY_CONTEXT_METADATA | `query_context` solo desde metadata |
| CANONICAL_JSON_V1 | claves lexicográficas; arrays en orden; UTF-8 compacto |
| OFFICIAL_IN_MEMORY_PROJECTION_FIRST | `ies_type=OFFICIAL`; `alternative_context=null` |
| INITIAL_VERSION_1 | `ies_version=1` |
| EXPIRES_AT_NULL_UNTIL_POLICY | `expires_at=null` |
| FAIL_CLOSED_CONTROLLED_REFERENCES | resumen: Tipo E + limitaciones mapeadas; sin `SUM_*` |
| PROJECT_ONLY_EXPLICIT_LIMITATIONS | `statement_token` = status contractual (`SOURCE_NOT_INTEGRATED`, …) |
| GENERATE_THEN_FINGERPRINT | huella al final |
| FACTORY_WITH_INJECTED_CLOCK_AND_ID_FACTORY | clock e idFactory obligatorios |

`valid_at` = `query_context.knowledge_effective_date` (documentado). `generated_at` = clock.

## Digest (implementación, no contrato)

Algoritmo: **SHA-256** vía `crypto.createHash` (ya en runtime Node; misma familia que EKS I_DIGEST). Prefijo `sha256:`. **No** es firma digital. `signature=null`. `signature_status=NOT_IMPLEMENTED`.

Material hasheado: raíz semántica + `audit` + `integrity.snapshot_reference` + `integrity.signature_status`. Excluye `content_fingerprint`, `canonical_representation`, `signature`.

`audit.engine_version` = constante de implementación `ies-builder-physical-v1` (no versión institucional del Motor).

## Proyección fail-closed

- Coverage/status: tabla contractual 1:1.
- `source_health[]`: desde `traceability.acquisition` + mapa `04` §11.
- Conflictos: letra A–E → `CONF_TYPE_*` (`04` §24). `resolution_status` copiado.
- Facts: copia; `concept` ← `metric_or_event` si hace falta; `statement_token` ← `statement` del Bundle; `priority`/`validity` = `undeclared` si el Snapshot no los trae (no ranking).
- Materiality copiada; `highest_materiality_detected` ignora `MATERIALITY_NOT_ASSESSED`.
- Evidence/diagnoses: copia (vacíos en runtime EB vigente).

## Verificaciones

- Tests IES: 32 pass.
- Suites OP + EB + EKS + integración: pasan.
- Total: 118 pass, 0 fail.
- `git diff --check`: sin errores.
- `docs/director-ia/`, `server.js`, `package.json`, runtimes OP/EB/EKS: no modificados.

## STOP

IMPL-IES-001 cerrado. Espera revisión humana. Este reporte no autoriza otra tarea.
