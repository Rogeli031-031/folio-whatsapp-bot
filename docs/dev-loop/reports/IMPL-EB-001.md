# Reporte — IMPL-EB-001

```yaml
task_id: "IMPL-EB-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "lib/director-ia-evidence-builder.js"
  - "test/director-ia-evidence-builder.test.js"
  - "fixtures/director-ia/evidence-builder/case-a-input-03a.json"
  - "fixtures/director-ia/evidence-builder/case-b-input-03a.json"
  - "fixtures/director-ia/evidence-builder/acquired-empty.json"
  - "fixtures/director-ia/evidence-builder/tool-error.json"
  - "fixtures/director-ia/evidence-builder/source-restricted.json"
  - "fixtures/director-ia/evidence-builder/entity-unresolved.json"
  - "fixtures/director-ia/evidence-builder/conflict-open.json"
  - "docs/dev-loop/reports/IMPL-EB-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "package.json"
  - ".env.example"
  - "lib/director-ia-eks.js"
  - "test/director-ia-eks.test.js"
  - "test/director-ia-eks-integration.test.js"
  - "sql/"
  - "scripts/"
  - "fixtures/director-ia/eks/"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se abre integración OP/server/EKS."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G8 permanece pendiente. El runtime no calibra wi, k, Fs, R, severidad, materiality productiva, reglas causales ni contratos de tool de inexistencia."
  - "N3/N4 quedan vacíos hasta existir reglas determinísticas autorizadas. No se pide inventarlas aquí."
```

## Ejecución

- Rama: `implementation/eb-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `authorized_by`, `authorized_at`, `human_authorization` no modificados por el implementador.
- G2: `N/A`. G8: `N/A`. No se editó `docs/director-ia/`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → runtime + tests + este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin commit, push, merge. Sin SQL. Sin `append_snapshot`. Sin LLM/tools/DB.

## Runtime

`lib/director-ia-evidence-builder.js` (I2): `to_n1`, `to_n2`, `to_n3`, `to_n4`, `emit_bundle`, `assemble`, `createEvidenceBuilder`.

| Decisión | Aplicación |
|----------|------------|
| D1 I2 | Etapas explícitas; desacoplado de `server.js` |
| D2 E1 + N1_WRAPS_03A | Listas hermanas; N1 envuelve ObservationRecord transportable |
| D3 | Barreras: sin N1 no hay N2; N3/N4 vacíos sin reglas |
| D4 | Registry vacío (`evidence-builder-2.1-physical-v1`) |
| D5 | `trace_id` / `observation_id` preservados; IDs derivados deterministas |
| D6 | Lineage 03A preservado; `k` no aplicado |
| D7 | Fs/R/Cb/Cs/Cb_ov = `null`; sin producto ni `wi` |
| D8 | Fail-closed: no `ABSENCE_CONFIRMED` |
| D9 | Sin ruleset de resolución no hay `RESOLVED` |
| D10 | `MATERIALITY_NOT_ASSESSED`; rule id `null` |
| D11 | Sin mutación de input, sin I/O, sin reloj ambiental |
| D12 | Bundles pasan `validate_structure`; EB no importa EKS |
| D13 | Fixtures 03A A/B + fail-closed requeridos |
| D14 | Solo fixtures; sin OP productivo |
| D15 | Contratos no reabiertos |

## Gaps semánticos N2–N4 (fail-closed, no inventados)

1. **N3 vacío:** no hay `applied_rule` autorizada. 03B `rule_desviacion_periodo_v1` es ilustrativa, no productiva.
2. **N4 vacío:** no hay `classification_criterion` autorizado.
3. **N2:** hechos de reexpresión de campos explícitos del record (`metric_or_event`, `value`). No se interpreta `normalized_payload`. No se emiten comparaciones 03B («menor que»).
4. **Tipo E:** no hay regla de clasificación E. Se prueba que un conflicto E `OPEN` no se oculta en `emit_bundle`.
5. **`metric_or_event` / `value`:** se copian solo si vienen explícitos en el ObservationRecord de fixture; no se extraen del payload.

## Verificaciones

- Tests EB: pasan.
- Tests EKS existentes (`director-ia-eks.test.js`, `director-ia-eks-integration.test.js`): pasan.
- Total: 45 pass, 0 fail.
- `git diff --check`: sin errores.
- `docs/director-ia/`, `server.js`, `package.json`, `lib/director-ia-eks.js`: no modificados.
- Fuente EB no contiene `append_snapshot` ni `createEks`.
