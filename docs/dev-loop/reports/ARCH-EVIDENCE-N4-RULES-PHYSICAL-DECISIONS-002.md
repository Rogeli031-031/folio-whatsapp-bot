# Reporte — ARCH-EVIDENCE-N4-RULES-PHYSICAL-DECISIONS-002

```yaml
task_id: "ARCH-EVIDENCE-N4-RULES-PHYSICAL-DECISIONS-002"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N4-RULES-PHYSICAL-DECISIONS-002.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "lib/"
  - "test/"
  - "fixtures/"
  - "server.js"
  - "package.json"
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
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001.md"
contracts_modified:
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se crea IMPL-EVIDENCE-N4-001."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 usado solo sobre 02, alcance D1–D17 aprobado."
  - "G3 permanece N/A. G8 permanece N/A y no se usó."
  - "Veredicto: GO contractual para un futuro IMPL-EVIDENCE-N4-001 de alcance D17, condicionado a G5. Esta tarea no lo crea."
```

## Ejecución

- Rama: `architecture/evidence-n4-rules-physical-decisions-002` (≠ `main`; no se cambió de rama).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T17:27:52-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2: `AUTHORIZED`. Usado únicamente para registrar D1–D17 en `02` §21.
- G8: `N/A`. **No usado.**
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime N4, tests, fixtures, calibración, causalidad ni IMPL-EVIDENCE-N4-001.

Numeración: **D1–D17** de `02` §21 son los de esta tarea. **No** sustituyen §19 D1–D15 ni §20 D1–D16.

`UNRESOLVED_CONFLICT` aplica Motor «conflicto no resuelto». No crea categoría. `04` §8 no se redefine.

---

## 1. D1–D17 registradas

| ID | Token | Registro |
|----|-------|----------|
| D1 | `DIAGNOSTIC_RULE_REGISTRY_V1` | Registry cerrado; N4 solo desde rule `ACTIVE` |
| D2 | `UNRESOLVED_CONFLICT_DIAGNOSIS_V1_ONLY` | Única categoría: `UNRESOLVED_CONFLICT` |
| D3 | `N4_UNRESOLVED_CONFLICT_INPUT_V1` | N3 CONTRADICTION **y** Tipo A `OPEN` **y** facts; no solo N3 ni solo conflicto |
| D4 | `N4_TRACEABLE_SUPPORT_V1` | facts + evidence + conflict IDs; orden estable |
| D5 | `UNRESOLVED_CONFLICT_CRITERION_V1` | CONTRADICTION + `NON_CAUSAL` + A + `OPEN` + intersección completa de facts |
| D6 | `DIAGNOSIS_N4_PHYSICAL_V1` | Schema Bundle listado abajo |
| D7 | `N4_UNASSESSED_DIMENSIONS_V1` | `SEVERITY/IMPACT/CONFIDENCE/MATERIALITY_NOT_ASSESSED` |
| D8 | `N4_NON_CAUSAL_V1` | `causal_status=NON_CAUSAL` |
| D9 | `UNRESOLVED_CONFLICT_STATEMENT_V1` | Contradicción no resuelta + conflicto `OPEN`; sin causa/fraude/riesgo |
| D10 | `DIAGNOSTIC_RULE_IDENTITY_STABLE_V1` | `N4_UNRESOLVED_CONFLICT_FROM_N3_CONTRADICTION` `1.0` |
| D11 | `N4_DETERMINISTIC_OUTPUT_V1` | Determinismo; sin reloj/random/LLM/I/O |
| D12 | `N4_DOES_NOT_MUTATE_CONFLICT_V1` | Tipo A sigue A `OPEN` |
| D13 | `N4_PRESERVES_TYPE_E_WITHOUT_CREATING_IT_V1` | Preservar E si ya existe; no fabricar |
| D14 | `N4_NO_RESOLUTION_AUTHORITY_V1` | Sin `RESOLVED`/`SUPERSEDED` |
| D15 | `N4_INFORMS_N5_WITHOUT_BECOMING_N5_V1` | Puede ir a IES/RE; no es N5 |
| D16 | `N4_V1_G8_FREE_PLACEHOLDER_SUBSET` | Solo placeholders; G8 diferido |
| D17 | `IMPL_EVIDENCE_N4_UNRESOLVED_CONFLICT_ONLY_V1` | Futuro IMPL solo esta franja |

---

## 2. Diff contractual conceptual

Único contrato modificado: `02-EVIDENCE-BUILDER.md`.

| Cambio | Qué es | Qué no es |
|--------|--------|-----------|
| Cabecera `Estado` | Anuncia §21 | No cambia v2.1 ni §19/§20 |
| §9 puntero | Franja `UNRESOLVED_CONFLICT` v1.0 | No reabre taxonomía Motor |
| §21 nueva | D1–D17 + registry + schema + criterion | No implementa runtime |
| Control documental | Auditoría 2026-08-17 N4 Rules | No calibra G8 |

---

## 3. Registry final

| Set | v1 |
|-----|----|
| `diagnostic_rules` | 1 rule (`N4_UNRESOLVED_CONFLICT_FROM_N3_CONTRADICTION` `1.0`) |
| `evidence_rules` | Intactas (§20) |
| `absence_rules` | vacío |
| `resolution_rules` | vacío |
| `causal_rules` | vacío |
| `materiality_rules` | vacío |

---

## 4. Identity / version

| Campo | Valor |
|-------|--------|
| `rule_id` | `N4_UNRESOLVED_CONFLICT_FROM_N3_CONTRADICTION` |
| `rule_version` | `1.0` |
| `diagnostic_category` | `UNRESOLVED_CONFLICT` |
| `causal` | `false` |
| `status` | `ACTIVE` |
| `input_contract` | `N4_UNRESOLVED_CONFLICT_INPUT_V1` |
| `output_contract` | `DIAGNOSIS_N4_PHYSICAL_V1` |

---

## 5. Schema N4 (Bundle)

`diagnosis_id`, `diagnostic_category`, `statement`, `classification_criterion`, `supporting_fact_ids`, `supporting_evidence_ids`, `supporting_conflict_ids`, `severity`, `impact`, `confidence`, `materiality`, `causal_status`, `applied_rule.{rule_id,rule_version}`, `traceability`.

Fijos en esta franja: `UNRESOLVED_CONFLICT`, `NON_CAUSAL`, `SEVERITY_NOT_ASSESSED`, `IMPACT_NOT_ASSESSED`, `CONFIDENCE_NOT_ASSESSED`, `MATERIALITY_NOT_ASSESSED`.

---

## 6. Classification criterion

Emitir solo si, en el mismo Bundle:

- Evidence `CONTRADICTION` + `NON_CAUSAL`;
- conflicto `primary_type=A` + `OPEN`;
- facts existentes;
- intersección completa `supporting_fact_ids` ∩ `facts_in_tension` para el soporte del diagnóstico.

No solo N3. No solo conflicto.

---

## 7. Support contract

Tres arrays obligatorios, IDs existentes, orden estable, sin reescribir N1/N2/N3.

---

## 8. Semántica `NOT_ASSESSED`

No evaluado. ≠ `LOW`. ≠ `NONE`. No afirma ausencia de riesgo/impacto. Sin scoring ni orden. No es G8.

---

## 9. Fronteras

- **Causal:** `NON_CAUSAL`. Statement solo contradicción no resuelta + `OPEN`.
- **Conflicto:** N4 no muta el objeto. Tipo A permanece A `OPEN`.
- **Tipo E:** no se crea; si ya existe, se preserva.
- **N5:** N4 puede alimentar IES/RE; no crea hyp/rec ni causa.
- **Resolution:** sin autoridad de cierre.

---

## 10. G8 no usado

G8 = `N/A`. No se fijaron ordinales, scores, `wi`, `k`, Fs ni thresholds. `02` §18 permanece pendiente.

---

## 11. GO/NO-GO para IMPL-EVIDENCE-N4-001

**GO contractual** para un futuro `IMPL-EVIDENCE-N4-001` **solo** en el alcance D17:

- registry + rule `UNRESOLVED_CONFLICT` + schema N4 + placeholders `NOT_ASSESSED` + tests/regresión;
- sin G8, sin categorías extra, sin clasificador B/C/D/E, sin Tipo E, sin resolution, sin cambios OP/EKS/IES/RE/CP.

Esta tarea **no** crea el IMPL. El GO no es G5.

El NO-GO de `ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001` queda superado **solo** para esta franja, tras el G2 aquí registrado.

---

## STOP

ARCH-EVIDENCE-N4-RULES-PHYSICAL-DECISIONS-002 cerrado en `DONE_PENDING_REVIEW`.

G8 no se usó. Constitución, Motor, `03A`, `03`, `04`, `05`, `06` y runtimes no se modificaron. Sin commit, push, merge ni siguiente tarea.

Espera revisión humana (G5). Este reporte no autoriza otra tarea.
