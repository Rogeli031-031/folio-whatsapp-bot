# Reporte — ARCH-EVIDENCE-N3-RULES-PHYSICAL-DECISIONS-002

```yaml
task_id: "ARCH-EVIDENCE-N3-RULES-PHYSICAL-DECISIONS-002"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N3-RULES-PHYSICAL-DECISIONS-002.md"
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
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001.md"
contracts_modified:
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se crea IMPL-EVIDENCE-N3-001."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 usado solo sobre 02, en el alcance D1–D16 aprobado."
  - "G3 permanece N/A. G8 permanece N/A y no se usó."
  - "Veredicto: GO contractual para un futuro IMPL-EVIDENCE-N3-001 de alcance D16, condicionado a G5. Esta tarea no lo crea."
```

## Ejecución

- Rama: `architecture/evidence-n3-rules-physical-decisions-002` (≠ `main`; no se cambió de rama).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-17T16:17:33-06:00` / `AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17`.
- G2: `AUTHORIZED`. Usado únicamente para registrar D1–D16 en `02-EVIDENCE-BUILDER.md`. No se tocó otro contrato.
- G3: `N/A`. G8: `N/A`. **No usado.**
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime N3, tests, fixtures, classifier, thresholds, causal rules, N4 ni IMPL-EVIDENCE-N3-001. Sin commit, push, merge. Sin siguiente tarea.

Numeración: **D1–D16** de este reporte y de `02` §20 son las de `CURRENT_TASK.md`. **No** sustituyen **D1–D15** de `02` §19.

---

## 1. D1–D16 registradas

Registradas en `02` §20 exactamente como `proposed_human_decisions` / `human_approval_scope`. No se amplió el alcance.

| ID | Token | Registro |
|----|-------|----------|
| D1 | `EVIDENCE_RULE_REGISTRY_V1` | Registry cerrado; N3 solo desde rule registrada; campos mínimos; `causal=false`; `ACTIVE` para ejecutar; sin LLM |
| D2 | `NON_CAUSAL_CONTRADICTION_RULE_V1_ONLY` | Única categoría productiva: `CONTRADICTION`. Resto diferido |
| D3 | `FACT_COMPARABILITY_KEY_V1` | Entidad canónica / scope permitido + `metric_or_event` + `period`. Sin resolver ambigüedad |
| D4 | `DISTINCT_VALUE_CONTRADICTION_V1` | ≥2 facts y ≥2 values distintos. Sin threshold. No declara verdad. No resuelve |
| D5 | `EVIDENCE_N3_PHYSICAL_V1` | Schema Bundle N3. `NON_CAUSAL`. `MATERIALITY_NOT_ASSESSED`. Sin rollup `MAT_*` |
| D6 | `NON_CAUSAL_CONTRADICTION_STATEMENT_V1` | Solo incompatibilidad/contradicción. Sin causa, culpa, fraude, valor verdadero ni prioridad de fuentes |
| D7 | `TRACEABLE_FACT_SUPPORT_V1` | ≥2 `supporting_fact_ids` del mismo Bundle; no reescribe N1/N2 |
| D8 | `RULE_IDENTITY_STABLE_V1` | `N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE` / `1.0` / `causal=false` / `ACTIVE` |
| D9 | `N3_DETERMINISTIC_OUTPUT_V1` | Determinismo; orden estable; sin reloj, random, LLM ni I/O |
| D10 | `N3_CONTRADICTION_DOES_NOT_RETYPE_CONFLICT_V1` | N3 ≠ clasificador. No retipifica A→B/C/D/E |
| D11 | `TYPE_A_DEFAULT_FOR_SIMPLE_VALUE_CONFLICT_V1` | Tipo A `OPEN` permanece permitido. Sin secondary_types, escalation ni severity |
| D12 | `NO_RESOLUTION_RULES_IN_N3_V1` | Sin `RESOLVED`/`SUPERSEDED` desde N3. `OPEN` permitido |
| D13 | `N3_V1_G8_FREE_SUBSET` | Subset libre de G8. G8 no usado |
| D14 | `N4_REMAINS_OUT_OF_SCOPE_V1` | N4 fuera |
| D15 | `N3_MAY_ENABLE_N5_WITHOUT_GUARANTEE_V1` | N3 puede habilitar estructuralmente N5; no obliga hypotheses |
| D16 | `IMPL_EVIDENCE_N3_CONTRADICTION_ONLY_V1` | Futuro IMPL solo CONTRADICTION. Esta tarea no lo crea |

---

## 2. Diff contractual conceptual

Único contrato modificado: `docs/director-ia/02-EVIDENCE-BUILDER.md`.

| Cambio | Qué es | Qué no es |
|--------|--------|-----------|
| Cabecera `Estado` | Anuncia §20 y runtime N3 pendiente | No cambia versión 2.1 ni D1–D15 de §19 |
| §8 puntero | Primera franja productiva = CONTRADICTION v1.0 | No reabre categorías §8 como productivas |
| §20 nueva | Registro D1–D16 + registry + identity + schema + key + fronteras | No implementa runtime |
| Control documental | Auditoría 2026-08-17; G8 sigue pendiente | No calibra G8 |

`R_MOD_EMPTY_GOVERNED_SETS` (§19 D4) permanece: `absence_rules`, `resolution_rules`, `causal_rules`, `materiality_rules` vacíos. Solo se autoriza `evidence_rules` v1 con **una** rule.

`04` §7 (IES `relation_type` / `applied_rule_id` / `statement_token`) **no** se redefine. El schema D5 es del objeto Evidence en el Knowledge Bundle.

Constitución III (N3 = relaciones determinísticas entre ≥2 hechos con reglas), IV (tipo antes que severidad; A = datos), V (Tipo E no se inventa) y EKE §5 (contradicción permitida; causalidad informal prohibida) no se contradicen.

---

## 3. Registry final

| Set | v1 |
|-----|----|
| `evidence_rules` | 1 rule (`N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE` `1.0`) |
| `absence_rules` | vacío |
| `resolution_rules` | vacío |
| `causal_rules` | vacío |
| `materiality_rules` | vacío |

---

## 4. Identity / version de la rule

| Campo | Valor |
|-------|--------|
| `rule_id` | `N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE` |
| `rule_version` | `1.0` |
| `rule_category` | `CONTRADICTION` |
| `causal` | `false` |
| `status` | `ACTIVE` |
| `input_contract` | `FACT_COMPARABILITY_KEY_V1` |
| `output_contract` | `EVIDENCE_N3_PHYSICAL_V1` |

No es el nombre de una función JS.

---

## 5. Schema físico Evidence N3

Campos requeridos del Bundle: `evidence_id`, `evidence_type` (`CONTRADICTION`), `statement`, `supporting_fact_ids` (≥2), `applied_rule.{rule_id,rule_version}`, `materiality` (`MATERIALITY_NOT_ASSESSED`), `causal_status` (`NON_CAUSAL`), `traceability` (`trace_id` + identity de la rule).

Sin rollup `MAT_*`. Sin score de confidence. Sin `04` modificado.

---

## 6. Comparability key

Facts comparables solo si coinciden: identidad canónica de entidad (o scope sin entidad **ya** permitido), `metric_or_event`, `period`.

Prohibido: periodos distintos, métricas distintas, entidades distintas, resolver `UNRESOLVED`/`AMBIGUOUS` en N3.

Valores distintos = representación estable existente de `value`. Sin tolerancia ni umbral.

---

## 7. Statement semantics

Permitido: facts incompatibles; valores en contradicción; fuentes/facts reportan valores distintos.

Prohibido: causa, probabilidad de error, prioridad de fuente, valor verdadero, fraude, error humano, mala gestión, culpabilidad.

---

## 8. Frontera con conflict classifier

N3 CONTRADICTION y el conflicto compuesto son artefactos distintos. Emitir N3 no retipifica.

Tipo A simple `OPEN` permanece permitido. `governance_escalation=false`. Sin `secondary_types` inventados. Sin severity. Sin resolution automática.

B/C/D/E diferidos. Tipo E no se produce desde contradicción de values. Tipo E sigue bloqueado hasta criterio futuro + señales N2.

---

## 9. G8 no usado

G8 = `N/A`. No se fijaron `wi`, `k`, Fs, materiality `MAT_*`, severity, thresholds ni reglas causales. D13 registra el subset como libre de G8. `02` §18 permanece pendiente.

---

## 10. Diferidos confirmados

| Tema | Estado |
|------|--------|
| Clasificador B/C/D/E | Diferido |
| Tipo E productivo | Diferido (no inventado; no A→E) |
| N4 | Fuera de alcance |
| Thresholds | Diferidos (G8) |
| Causalidad | Diferida; `causal_rules` vacío |
| Resolution `RESOLVED`/`SUPERSEDED` | Diferida; `resolution_rules` vacío |
| CO_OCCURRENCE / TREND / DEVIATION / DETERIORATION | Diferidas |
| IMPL-EVIDENCE-N3-001 | No creado |

---

## 11. N4 y Reasoning

- N4: D14. Existir N3 no autoriza diagnósticos.
- N5: D15. N3 puede satisfacer `supporting_evidence_ids`. El RE conserva gates. Cero obligación de hypotheses/recommendations.

---

## 12. GO/NO-GO para IMPL-EVIDENCE-N3-001

**GO contractual** para un futuro `IMPL-EVIDENCE-N3-001` **solo** en el alcance D16:

- registry + rule CONTRADICTION + schema Evidence N3 + tests/regresión;
- sin G8, sin clasificador B/C/D/E, sin N4, sin causalidad, sin thresholds, sin LLM, sin nuevas fuentes, sin cambios OP/EKS/IES/RE/CP.

Esta tarea **no** crea `IMPL-EVIDENCE-N3-001`. El GO no es G5. HUMAN_APPROVER debe cerrar esta tarea y autorizar el IMPL por separado.

El NO-GO de `ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001` queda superado **solo** para esta franja, tras el G2 aquí registrado.

---

## STOP

ARCH-EVIDENCE-N3-RULES-PHYSICAL-DECISIONS-002 cerrado en `DONE_PENDING_REVIEW`.

G8 no se usó. Constitución, Motor, `03A`, `04`, `05` y runtimes no se modificaron. Sin commit, push, merge ni siguiente tarea.

Espera revisión humana (G5). Este reporte no autoriza otra tarea.
