# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T17:00:56-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: PENDING_IF_REQUIRED

objective: >
  Auditar la realizabilidad física de Diagnóstico N4 en el Evidence Builder
  vigente después de la implementación productiva de Evidence N3 CONTRADICTION.
  Determinar qué categorías diagnósticas y reglas N4 están suficientemente
  definidas para implementación determinística, cuáles requieren G2, cuáles
  requieren G8 y cuáles están bloqueadas por falta de señales N2/N3, sin
  implementar runtime N4 ni inventar causalidad, severity o categorías.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md (solo lectura)"

  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "test/director-ia-evidence-builder.test.js (solo lectura)"
  - "fixtures/director-ia/evidence-n3/ (solo lectura)"

  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "lib/director-ia-reasoning-engine.js (solo lectura)"
  - "lib/director-ia-channel-projection.js (solo lectura)"
  - "lib/director-ia-e2e.js (solo lectura)"
  - "test/director-ia-e2e.test.js (solo lectura)"

out_of_scope:
  - "implementar N4"
  - "modificar Evidence Builder runtime"
  - "crear diagnostic rules"
  - "crear tests N4"
  - "crear fixtures N4"

  - "definir causalidad"
  - "crear causal rules"
  - "crear hipótesis"
  - "crear recommendations"

  - "calibrar severity"
  - "calibrar materiality"
  - "calibrar confidence"
  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "crear thresholds"
  - "activar G8"

  - "inventar categorías diagnósticas"
  - "usar lenguaje de causa probable"
  - "resolver conflictos"
  - "retipificar A como B/C/D/E"
  - "crear Tipo E"

  - "modificar docs/director-ia/"
  - "modificar OP/EKS/IES/RE/CP/E2E"
  - "modificar server.js"
  - "modificar package.json"

  - "commit"
  - "push"
  - "merge"
  - "crear IMPL-EVIDENCE-N4-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"

current_runtime_reality:
  n1: "implemented"
  n2: "implemented"
  n3:
    status: "implemented subset"
    active_rule: "N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE"
    rule_version: "1.0"
    evidence_type: "CONTRADICTION"
    causal_status: "NON_CAUSAL"
    materiality: "MATERIALITY_NOT_ASSESSED"
  n4:
    status: "EMPTY / FAIL-CLOSED"
    current_behavior: >
      to_n4() does not produce diagnoses merely because N3 exists.
  conflict_classifier:
    current_simple_behavior: "Type A OPEN"
    b_c_d_e_classifier: "not implemented"

contractual_constraints:
  - "no N4 without rule and support"
  - "N4 is deterministic classification, not hypothesis"
  - "N4 must identify classification_criterion/rule"
  - "N4 must be supported by facts and/or Evidence N3"
  - "N4 must not use probable-cause language"
  - "N4 must not soften Type E"
  - "severity and impact are distinct from conflict typing"
  - "materiality is not severity"
  - "Reasoning Engine owns hypotheses N5"
  - "Evidence Builder cannot jump N3 -> causal inference"
  - "G8 parameters remain protected"

audit_questions:

  D1_n4_schema:
    question: >
      ¿Cuál es el schema físico mínimo de un Diagnosis N4 exigido por los
      contratos vigentes?

  D2_diagnostic_rule_registry:
    question: >
      ¿N4 requiere un registry físico separado de diagnostic rules y qué
      identidad/versionado mínimo necesita?

  D3_rule_input:
    question: >
      ¿Una diagnostic rule puede consumir Evidence N3 únicamente, facts N2
      únicamente, o ambos? Determinarlo sin inventar semántica.

  D4_support:
    question: >
      ¿Qué soporte mínimo debe citar un Diagnosis N4:
      supporting_fact_ids, supporting_evidence_ids o ambos?

  D5_classification_criterion:
    question: >
      ¿Qué forma física debe tener classification_criterion para que N4 sea
      auditable y no una interpretación libre?

  D6_diagnostic_categories:
    question: >
      Identificar el catálogo diagnóstico permitido por Constitución/Motor/02.
      No crear categorías ausentes.

  D7_contradiction_diagnosis:
    question: >
      ¿Existe hoy una categoría N4 contractual que pueda derivarse
      determinísticamente de Evidence N3 CONTRADICTION sin causalidad ni G8?

  D8_severity:
    question: >
      ¿Severity es obligatoria en todo Diagnosis N4? Si sí, determinar si existe
      enum/default contractual utilizable sin G8 o si bloquea implementación.

  D9_impact:
    question: >
      ¿Impact es campo obligatorio, derivable o diferible? Separarlo de
      severity y materiality.

  D10_materiality:
    question: >
      ¿Puede Diagnosis N4 preservar MATERIALITY_NOT_ASSESSED sin G8 o requiere
      rollup/calibración antes de existir?

  D11_confidence:
    question: >
      ¿Diagnosis N4 tiene confidence propia o solo referencia la confianza de
      facts/evidence soporte?

  D12_causal_boundary:
    question: >
      Definir con precisión qué lenguaje diagnóstico no causal está permitido y
      qué frases pertenecen exclusivamente a N5.

  D13_conflict_boundary:
    question: >
      ¿N4 puede clasificar una situación derivada de conflicto Tipo A sin
      modificar primary_type, resolution_status o governance_escalation?

  D14_resolution_boundary:
    question: >
      Confirmar que un Diagnosis N4 nunca resuelve por sí mismo un conflicto.

  D15_type_e_boundary:
    question: >
      ¿Cómo debe N4 preservar un Tipo E ya existente sin inventarlo ni
      minimizarlo?

  D16_n5_boundary:
    question: >
      ¿Qué información N4 puede aportar al Reasoning Engine y qué sigue
      prohibido inferir automáticamente?

  D17_productive_readiness:
    question: >
      Con N3 CONTRADICTION productiva actual, ¿hay al menos una diagnostic rule
      N4 legítimamente implementable sin G8 ni nueva fuente?

  D18_runtime_readiness:
    question: >
      Emitir GO/NO-GO para IMPL-EVIDENCE-N4-001 separando:
      a) semántica contractual lista;
      b) decisiones G2;
      c) decisiones G8;
      d) data gaps;
      e) blockers absolutos.

mandatory_diagnostic_category_matrix:
  columns:
    - "diagnostic_category"
    - "contract authority"
    - "required N2 inputs"
    - "required N3 inputs"
    - "classification_criterion"
    - "causal: YES|NO"
    - "severity required"
    - "requires G8"
    - "physical readiness"
    - "notes"

mandatory_schema_matrix:
  columns:
    - "field"
    - "required"
    - "contract owner"
    - "source"
    - "derivation allowed"
    - "requires rule"
    - "requires G8"
    - "notes"

mandatory_gate_matrix:
  columns:
    - "decision/gap"
    - "blocks IMPL-EVIDENCE-N4-001"
    - "requires G2"
    - "requires G8"
    - "requires source/tool change"
    - "owner"
    - "recommended next action"

mandatory_language_matrix:
  columns:
    - "phrase/semantic"
    - "allowed in N4"
    - "reason"
    - "belongs to N5"
    - "notes"

  examples_to_classify:
    - "Existe una contradicción operativa"
    - "Los datos son inconsistentes bajo la regla X"
    - "Hay deterioro"
    - "La causa probable es..."
    - "El problema se debe a..."
    - "La fuente A es incorrecta"
    - "Se requiere revisión"
    - "Existe riesgo"
    - "Existe incumplimiento"
    - "Hay fraude"

classification_rules:
  CONTRACTUAL: >
    Definido suficientemente por contratos vigentes para implementación sin
    nueva decisión humana.

  PHYSICAL_UNKNOWN: >
    Semántica requerida pero realización física no congelada.

  REQUIRES_G2: >
    Necesita decisión arquitectónica/contractual humana.

  REQUIRES_G8: >
    Necesita calibración de severity/materiality/confidence/thresholds u otra
    política reservada.

  DATA_GAP: >
    La regla podría existir, pero N2/N3 actual no trae señales suficientes.

  BLOCKER: >
    Impide implementación segura.

audit_constraints:
  - "no diseñar diagnostic rules productivas durante auditoría"
  - "no inventar enum de severity"
  - "no inventar categorías diagnósticas"
  - "no inventar thresholds"
  - "no usar materiality como severity"
  - "no usar conflict type como diagnosis automático"
  - "no convertir CONTRADICTION N3 en causalidad"
  - "no generar hypothesis"
  - "no resolver conflictos"
  - "no usar G8"
  - "no modificar contratos"

required_report_sections:
  - "1. Executive result"
  - "2. Contracts/runtime inspected"
  - "3. Current N4 physical reality"
  - "4. D1-D18 findings"
  - "5. Diagnosis schema readiness"
  - "6. Diagnostic category readiness matrix"
  - "7. Rule registry readiness"
  - "8. Classification criterion boundary"
  - "9. Severity / impact / materiality / G8 boundary"
  - "10. Causal language boundary"
  - "11. Conflict and Type E boundary"
  - "12. N4 -> N5 boundary"
  - "13. Data gaps"
  - "14. Productive N4 feasibility with current N3"
  - "15. G2 decisions required"
  - "16. G8 decisions required"
  - "17. Blockers"
  - "18. GO/NO-GO for IMPL-EVIDENCE-N4-001"
  - "19. STOP"

acceptance_criteria:
  - "D1-D18 auditados"
  - "diagnostic category matrix completa"
  - "schema matrix completa"
  - "gate matrix completa"
  - "language matrix completa"
  - "severity/materiality/impact separados"
  - "G2/G8 separados explícitamente"
  - "N4 vs N5 claramente separado"
  - "N4 no resuelve conflictos"
  - "Type E no inventado"
  - "causalidad no inventada"
  - "ningún contrato modificado"
  - "ningún runtime modificado"
  - "sin tests/fixtures nuevos"
  - "git diff --check limpio"
  - "reporte obligatorio creado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer Evidence Builder runtime/tests"
  - "leer fixtures N3"
  - "leer IES/RE/CP/E2E solo para frontera downstream"
  - "clasificar D1-D18"
  - "crear matrices obligatorias"
  - "crear docs/dev-loop/reports/ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"
  - "ejecutar tests existentes solo para comprobar realidad"
  - "ejecutar git diff --check"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar runtimes"
  - "crear diagnostic rules"
  - "crear N4"
  - "crear tests/fixtures"
  - "calibrar G8"
  - "crear severity enum"
  - "crear thresholds"
  - "crear causalidad"
  - "crear hypotheses/recommendations"
  - "crear IMPL-EVIDENCE-N4-001"
  - "commit"
  - "push"
  - "merge"
  - "autoaprobar G2/G8"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la auditoría determina con precisión qué N4 es
  implementable hoy y qué requiere G2, G8 o señales adicionales.
  BLOCKED o STOPPED si completar el análisis exige inventar categorías,
  severity, thresholds, causalidad o calibraciones.

implementation_followup_rule: >
  IMPL-EVIDENCE-N4-001 no puede crearse desde esta tarea. HUMAN_APPROVER debe
  revisar primero el veredicto y cualquier decisión G2/G8.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-EVIDENCE-N4-PHYSICAL-DECISIONS-001.md"