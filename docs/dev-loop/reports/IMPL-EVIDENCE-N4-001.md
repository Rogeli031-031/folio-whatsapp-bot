# Reporte — IMPL-EVIDENCE-N4-001

```yaml
task_id: "IMPL-EVIDENCE-N4-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EVIDENCE-N4-001.md"
  - "lib/director-ia-evidence-builder.js"
  - "test/director-ia-evidence-builder.test.js"
  - "fixtures/director-ia/evidence-n4/unresolved-conflict-valid.json"
  - "fixtures/director-ia/evidence-n4/n3-without-conflict-no-diagnosis.json"
  - "fixtures/director-ia/evidence-n4/conflict-without-n3-no-diagnosis.json"
  - "fixtures/director-ia/evidence-n4/resolved-conflict-no-diagnosis.json"
  - "fixtures/director-ia/evidence-n4/mismatched-support-no-diagnosis.json"
  - "fixtures/director-ia/evidence-n4/type-e-no-fabrication.json"
  - "fixtures/director-ia/evidence-n4/different-conflict-type-no-diagnosis.json"
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
  - "G2/G3/G8 permanecen N/A. G8 no usado."
```

## Ejecución

- Rama: `implementation/evidence-n4-001` (≠ `main`; no se cambió de rama).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T18:05:50-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2/G3/G8: `N/A`. G8 **no usado**. Sin calibración de severity/impact/confidence/materiality, `wi`, `k`, Fs ni thresholds.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin commit, push, merge. Sin siguiente tarea.

---

## Rule implementada

| Campo | Valor |
|-------|--------|
| `rule_id` | `N4_UNRESOLVED_CONFLICT_FROM_N3_CONTRADICTION` |
| `rule_version` | `1.0` |
| `diagnostic_category` | `UNRESOLVED_CONFLICT` |
| `causal` | `false` |
| `status` | `ACTIVE` |
| `input_contract` | `N4_UNRESOLVED_CONFLICT_INPUT_V1` |
| `output_contract` | `DIAGNOSIS_N4_PHYSICAL_V1` |

Registry: exactamente **una** diagnostic rule ACTIVE. `evidence_rules` N3 intacta. Sets vacíos intactos: `absence_rules`, `resolution_rules`, `causal_rules`, `materiality_rules`.

No se añadieron otras categorías diagnósticas. No se añadieron resolution rules. No se fabricó Tipo E. No se implementó N5.

---

## Comportamiento de `to_n4()`

Emite Diagnosis **solo** cuando coinciden simultáneamente:

1. Evidence N3 `evidence_type=CONTRADICTION` y `causal_status=NON_CAUSAL`.
2. Conflicto compuesto `primary_type=A` y `resolution_status=OPEN`.
3. Facts soporte existentes en el mismo contexto Bundle/trace.
4. Correspondencia completa (igualdad de conjuntos) entre `evidence.supporting_fact_ids` y `conflict.facts_in_tension`.

| Caso | Resultado |
|------|-----------|
| N3 CONTRADICTION + Tipo A OPEN + support completo | **exactamente 1** Diagnosis |
| N3 sola (`conflicts=[]` o ausente) | **0** Diagnosis |
| Conflicto solo (`n3=[]`) | **0** Diagnosis |
| Conflicto `RESOLVED` | **0** Diagnosis |
| Conflicto `SUPERSEDED` | **0** Diagnosis |
| Support incompleto o con ids extraños | **0** Diagnosis |
| Conflicto `primary_type` ≠ `A` (p. ej. B, C, E) | **0** Diagnosis |

`assemble` calcula conflictos **antes** de `to_n4` y los pasa en el contexto de lectura. `tipifyConflicts` no cambia: Tipo A permanece Tipo A `OPEN`.

IDs vía `idFactory` existente/inyectado, prefijo `"diagnosis"`. Sin `Date.now`, `Math.random`, LLM, red, DB ni IO.

---

## Schema emitido (`DIAGNOSIS_N4_PHYSICAL_V1`)

Cada Diagnosis N4:

| Campo | Valor en esta franja |
|-------|----------------------|
| `diagnostic_category` | `UNRESOLVED_CONFLICT` |
| `severity` | `SEVERITY_NOT_ASSESSED` |
| `impact` | `IMPACT_NOT_ASSESSED` |
| `confidence` | `CONFIDENCE_NOT_ASSESSED` |
| `materiality` | `MATERIALITY_NOT_ASSESSED` |
| `causal_status` | `NON_CAUSAL` |
| `applied_rule` | `{ rule_id, rule_version }` de la rule v1.0 |
| `classification_criterion` | identity de la misma rule |
| `traceability` | `trace_id` + identity de la rule |
| `supporting_fact_ids` / `supporting_evidence_ids` / `supporting_conflict_ids` | no vacíos, existentes, ordenados |

`NOT_ASSESSED` **no** equivale a `LOW`, `NONE`, cero ni irrelevante. Sin scoring ni orden.

Statement: `supported facts remain incompatible under the contradiction rule and the associated conflict remains OPEN`. No declara causa, culpa, valor verdadero, fuente incorrecta, fraude, incumplimiento, deterioro ni riesgo.

---

## Fronteras

- Diagnosis y Conflict permanecen objetos distintos.
- N4 no muta `primary_type`, `resolution_status`, `secondary_types`, `governance_escalation` ni severity del conflicto.
- Tipo A permanece Tipo A `OPEN`.
- N4 no crea Tipo E. Un Tipo E ya presente no dispara esta rule y no se oculta en `emit_bundle`.
- N4 no emite `RESOLVED` ni `SUPERSEDED`.
- N4 no emite hypothesis, recommendation ni inferencia causal.

Confirmado por tests: facts, evidence, conflicts e input **no se mutan**.

---

## Tests

| Suite | Resultado |
|-------|-----------|
| Evidence Builder (`test/director-ia-evidence-builder.test.js`) | **71 pass / 0 fail** |
| Regresión Director IA (`node --test test/director-ia-*.test.js`, 10 archivos) | **268 pass / 0 fail** |
| `git diff --check` | limpio (exit 0) |

Los 23 tests N4 nuevos cubren registry, criterio positivo/negativo, schema, placeholders, support/trazabilidad, determinismo, no mutación y fronteras Conflict / Tipo E / N5, más compatibilidad EKS/IES/RE/CP leída desde el test EB (sin modificar esos runtimes ni sus tests).

---

## Integración downstream (sin modificar otros runtimes)

No fue necesario cambiar EKS, IES, RE, CP, OP, E2E, `server.js` ni `package.json` para **aceptar** el N4 aprobado. La regresión existente permanece verde.

Gaps reales, no blockers de esta tarea:

1. **IES** clona `diagnoses` (`projectDiagnoses` = copia JSON). No remapea al schema extra de `04` §8 (`model`, `primary_classification`, `coverage_*`). El `validate()` del runtime IES acepta el schema Bundle `DIAGNOSIS_N4_PHYSICAL_V1`. `04` no se redefinió (D6).
2. **E2E `type-e-conflict`**: el assemble de dos values distintos ahora emite también un Diagnosis N4 real junto al Tipo A OPEN. Los tests E2E no fallan; E2E sigue sin fabricar Tipo E.
3. **IES `collectMateriality`** ignora `MATERIALITY_NOT_ASSESSED`; compatible con D7.
4. **CP** ya distinguía `DIAGNOSIS` de `EVIDENCE`/`HYPOTHESIS`; consume el N4 sin reinterpretarlo como N5.
5. **RE** conserva gates de evidence/hypothesis: presencia de N4 no autoriza hypothesis ni recommendation.

Ningún runtime downstream exigió cambio para aceptar el N4 aprobado.

---

## Alcance respetado

- Contratos en `docs/director-ia/` no modificados.
- Sin G8, sin categorías nuevas, sin clasificador B/C/D/E, sin resolution authority, sin causalidad, sin N5.
- Solo archivos autorizados.

STOP. No commit. No push. No merge. No siguiente tarea.
