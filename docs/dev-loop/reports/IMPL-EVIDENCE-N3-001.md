# Reporte — IMPL-EVIDENCE-N3-001

```yaml
task_id: "IMPL-EVIDENCE-N3-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EVIDENCE-N3-001.md"
  - "lib/director-ia-evidence-builder.js"
  - "test/director-ia-evidence-builder.test.js"
  - "fixtures/director-ia/evidence-n3/contradiction-two-values.json"
  - "fixtures/director-ia/evidence-n3/contradiction-three-facts.json"
  - "fixtures/director-ia/evidence-n3/same-value-no-contradiction.json"
  - "fixtures/director-ia/evidence-n3/different-period-no-contradiction.json"
  - "fixtures/director-ia/evidence-n3/different-metric-no-contradiction.json"
  - "fixtures/director-ia/evidence-n3/different-entity-no-contradiction.json"
  - "fixtures/director-ia/evidence-n3/ambiguous-entity-no-contradiction.json"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-observation-pipeline.js"
  - "lib/director-ia-eks.js"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "lib/director-ia-channel-projection.js"
  - "lib/director-ia-e2e.js"
  - "server.js"
  - "package.json"
  - ".env"
  - "sql/"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
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

- Rama: `implementation/evidence-n3-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T16:25:13-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2/G3/G8: `N/A`. G8 **no usado**.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin commit, push, merge. Sin siguiente tarea.

---

## Rule implementada

| Campo | Valor |
|-------|--------|
| `rule_id` | `N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE` |
| `rule_version` | `1.0` |
| `rule_category` | `CONTRADICTION` |
| `causal` | `false` |
| `status` | `ACTIVE` |
| `input_contract` | `FACT_COMPARABILITY_KEY_V1` |
| `output_contract` | `EVIDENCE_N3_PHYSICAL_V1` |

Registry restante vacío: `absence_rules`, `resolution_rules`, `causal_rules`, `materiality_rules`.

Comparabilidad: identidad canónica (`entity_id`) o scope sin entidad (`entity === null`); mismo `metric_or_event`; mismo `period`. `UNRESOLVED` / `AMBIGUOUS` fuera. Representación estable de `value` = `JSON.stringify` (la misma que el clasificador Tipo A). Sin tolerancia, threshold, fuzzy ni LLM.

---

## Schema emitido

Cada Evidence N3:

- `evidence_id` (idFactory `evidence`)
- `evidence_type` = `CONTRADICTION`
- `statement` = `facts report distinct values for the same comparison scope`
- `supporting_fact_ids` (≥2, orden lexicográfico)
- `applied_rule.rule_id` / `applied_rule.rule_version`
- `materiality` = `MATERIALITY_NOT_ASSESSED`
- `causal_status` = `NON_CAUSAL`
- `traceability.trace_id` + `rule_id` + `rule_version`

`to_n4()` permanece `[]`. `tipifyConflicts` no se cambió.

---

## Casos que producen y no producen N3

| Caso | N3 |
|------|----|
| Dos facts comparables, values distintos | 1 CONTRADICTION |
| Tres facts comparables, values distintos | 1 CONTRADICTION, 3 `supporting_fact_ids` |
| Scope sin entidad, values distintos | 1 CONTRADICTION |
| Mismo value | 0 |
| <2 facts | 0 |
| Periodo distinto | 0 |
| Métrica distinta | 0 |
| Entidad distinta | 0 |
| AMBIGUOUS / UNRESOLVED | 0 |
| case-a (métricas distintas) | 0 |

---

## G8 no usado

No se añadieron `wi`, `k`, Fs, `MAT_*`, severity, thresholds ni causal rules. Materiality N3 = `MATERIALITY_NOT_ASSESSED`.

---

## No se creó

- Tipo E
- clasificador B/C/D/E
- `secondary_types`
- `governance_escalation=true`
- severity
- resolution / `RESOLVED`
- N4 / diagnostic rules
- causalidad
- trend / deviation / deterioration / co-occurrence

Conflicto simple permanece Tipo A `OPEN`.

---

## Tests y regresión

- `node --test test/director-ia-evidence-builder.test.js`: **48 pass**.
- Regresión OP/EB/EKS/integración/IES/RE/CP/E2E: **245 pass / 0 fail**.
- `git diff --check`: limpio.

---

## Gaps reales downstream

1. IES `projectEvidence` clona el objeto Bundle. Conserva `evidence_type` / `applied_rule`. **No** remapea a `relation_type` / `applied_rule_id` de `04` §7. Estructuralmente válido; el remap IES no es esta tarea.
2. E2E `type-e-conflict` ahora emite N3 CONTRADICTION real junto al Tipo A. Los tests E2E no exigían `evidence[]` vacío y siguen verdes. Overlay Tipo E sigue siendo `not_from_assemble`.
3. N3 no obliga hypotheses. RE conserva gates: sin `supporting_evidence_ids` → 0 hyp. Un IES `CONFLICTED` + conflicto OPEN puede seguir rechazando/degradando un candidato N5; eso es gate RE, no defecto N3.
4. Happy-path de un solo fact sigue sin N3 (correcto).

---

## STOP

IMPL-EVIDENCE-N3-001 cerrado. Espera revisión humana. Este reporte no autoriza otra tarea.
