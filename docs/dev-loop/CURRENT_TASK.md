# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T16:00:34-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: PENDING_IF_REQUIRED

objective: >
  Auditar la realizabilidad física de Evidence N3 y de la tipificación
  determinística de conflictos A-E en el Evidence Builder vigente.
  Determinar qué reglas N3 pueden implementarse sin G8, cuáles requieren
  calibración/gobernanza adicional, por qué el runtime actual produce N3 vacío
  y conflicto Tipo A por defecto, y qué decisiones humanas deben resolverse
  antes de autorizar un futuro IMPL-EVIDENCE-N3-001.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"

  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "test/director-ia-evidence-builder.test.js (solo lectura)"
  - "fixtures/director-ia/ (solo lectura)"

  - "lib/director-ia-e2e.js (solo lectura)"
  - "test/director-ia-e2e.test.js (solo lectura)"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-E2E-001.md (solo lectura)"

out_of_scope:
  - "implementar N3"
  - "modificar Evidence Builder runtime"
  - "crear evidence rules"
  - "crear causal rules"
  - "crear materiality rules"
  - "crear resolution rules"
  - "crear tests/fixtures N3"

  - "modificar docs/director-ia/"
  - "modificar OP/EKS/IES/RE/CP"
  - "modificar server.js"
  - "modificar package.json"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar materiality"
  - "calibrar severity"
  - "fijar thresholds productivos"

  - "inventar Tipo E"
  - "forzar conflicto A -> E"
  - "resolver conflictos por peso"
  - "crear causalidad informal"
  - "usar LLM"
  - "usar DB/tools/fuentes"

  - "commit"
  - "push"
  - "merge"
  - "crear IMPL-EVIDENCE-N3-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"

current_runtime_reality:
  evidence_rule_registry: "EMPTY"
  absence_rule_registry: "EMPTY"
  resolution_rule_registry: "EMPTY"
  causal_rule_registry: "EMPTY"
  materiality_rule_registry: "EMPTY"
  n3_runtime_behavior: "to_n3() returns [] when no evidence rules"
  n4_runtime_behavior: "to_n4() returns [] when no evidence rules"
  conflict_runtime_behavior: >
    fact contradictions grouped by entity/metric/period are currently emitted
    as primary_type=A, OPEN, governance_escalation=false.
  end_to_end_effect:
    - "real pipeline has no productive evidence[] N3"
    - "Reasoning Engine therefore emits no substantive hypotheses/recommendations"
    - "Type E only survives if already present upstream/synthetic; E2E does not fabricate it"

contractual_constraints:
  - "no N3 without N2"
  - "N3 requires identifiable applied_rule"
  - "N3 language is non-causal unless causal rule explicitly approved"
  - "no informal probability in EB"
  - "materiality at N3 derives/preserves from supporting facts; no free evaluation"
  - "Type E cannot be softened or omitted"
  - "conflict classification requires classification_criterion"
  - "severity/impact occur after conflict typing"
  - "RESOLVED requires new/sufficient evidence plus applied_resolution_rule_id"
  - "weight_assessment alone never resolves"
  - "G8 remains pending for calibrated confidence/materiality parameters"

audit_questions:

  D1_n3_rule_interface:
    question: >
      ¿Qué forma física mínima debe tener una evidence_rule para producir N3
      sin inventar semántica ni causalidad?

  D2_n3_rule_categories:
    question: >
      ¿Qué clases de relaciones N3 no causales están suficientemente definidas
      por contrato para implementación determinística?
    candidate_categories:
      - "CONTRADICTION"
      - "CO_OCCURRENCE"
      - "TREND"
      - "DEVIATION"
      - "DETERIORATION"
      - "CONSISTENCY_RELATION"
    rule: >
      Clasificar como CONTRACTUAL, PHYSICAL_UNKNOWN o REQUIRES_G8; no aprobar
      categorías por mera conveniencia.

  D3_rule_input_shape:
    question: >
      ¿Qué campos de facts N2 puede leer una evidence_rule y qué campos debe
      devolver obligatoriamente?

  D4_support_requirements:
    question: >
      ¿Cuál es el mínimo determinístico de supporting_fact_ids y lineage para
      emitir una Evidence N3 válida?

  D5_applied_rule_identity:
    question: >
      ¿Cómo versionar e identificar applied_rule sin convertir código interno
      accidental en norma institucional?

  D6_materiality_n3:
    question: >
      ¿Puede N3 simplemente propagar/derivar MATERIALITY_NOT_ASSESSED y MAT_*
      ya evaluados sin G8, o alguna parte requiere calibración G8?

  D7_confidence_n3:
    question: >
      ¿N3 necesita confidence propia o solo soporte/confianza de facts N2 según
      contrato vigente?

  D8_causal_boundary:
    question: >
      ¿Qué evidencia N3 puede existir sin causal rules y qué debe permanecer
      prohibido hasta aprobación explícita?

  D9_conflict_classifier_interface:
    question: >
      ¿Qué forma física mínima debe tener la tipificación A-E para reemplazar
      el default Tipo A por clasificación determinística basada en criterio?

  D10_type_a:
    question: "¿Cuál es el criterio físico exacto para Tipo A?"

  D11_type_b:
    question: "¿Cuál es el criterio físico exacto para Tipo B?"

  D12_type_c:
    question: "¿Cuál es el criterio físico exacto para Tipo C?"

  D13_type_d:
    question: "¿Cuál es el criterio físico exacto para Tipo D?"

  D14_type_e:
    question: >
      ¿Cuál es el criterio físico exacto para Tipo E y qué señales contractuales
      obligan governance_escalation=true sin depender de juicio libre?

  D15_secondary_types:
    question: >
      ¿Cuándo un conflicto puede tener secondary_types y cómo se determina
      determinísticamente sin ranking ficticio?

  D16_severity:
    question: >
      ¿Severity de conflictos está suficientemente definida para implementación
      o requiere G8/política adicional?

  D17_resolution:
    question: >
      ¿Qué parte de resolution_status puede implementarse ahora y qué requiere
      resolution_rules futuras?

  D18_n4_dependency:
    question: >
      ¿Qué mínimo N3 debe existir antes de que N4 pueda implementarse de forma
      útil, sin abrir todavía IMPL-N4?

  D19_productive_readiness:
    question: >
      ¿Qué evidencia productiva real puede generarse hoy desde los facts N2
      actuales sin datos adicionales, reglas de negocio específicas o G8?

  D20_runtime_readiness:
    question: >
      Emitir GO/NO-GO para IMPL-EVIDENCE-N3-001 y separar explícitamente:
      a) reglas implementables ya;
      b) decisiones G2;
      c) decisiones G8;
      d) gaps de datos/tooling.

mandatory_n3_rule_matrix:
  columns:
    - "rule_category"
    - "contract authority"
    - "required fact inputs"
    - "output semantic"
    - "causal: YES|NO"
    - "requires threshold: YES|NO"
    - "requires G8: YES|NO"
    - "physical readiness"
    - "classification"
    - "notes"

mandatory_conflict_matrix:
  rows:
    - "TYPE_A"
    - "TYPE_B"
    - "TYPE_C"
    - "TYPE_D"
    - "TYPE_E"
  columns:
    - "type"
    - "contractual meaning"
    - "required signals"
    - "classification_criterion"
    - "governance_escalation"
    - "severity dependency"
    - "requires G8"
    - "physical readiness"
    - "notes"

mandatory_gate_matrix:
  columns:
    - "decision/gap"
    - "blocks IMPL-EVIDENCE-N3-001"
    - "requires G2"
    - "requires G8"
    - "requires source/tool change"
    - "owner"
    - "recommended next action"

classification_rules:
  CONTRACTUAL: >
    Definido suficientemente por contratos vigentes para implementación sin
    nueva decisión humana.
  PHYSICAL_UNKNOWN: >
    Semántica requerida pero realización física insuficiente.
  REQUIRES_G2: >
    Necesita decisión arquitectónica/contractual humana.
  REQUIRES_G8: >
    Necesita calibración/política reservada al gate G8.
  DATA_GAP: >
    Regla conceptualmente posible pero facts/source actuales no traen señales
    suficientes.
  BLOCKER: >
    Impide implementación segura.

audit_constraints:
  - "no diseñar rules productivas durante auditoría"
  - "no usar thresholds arbitrarios"
  - "no asignar Tipo E por intuición"
  - "no convertir contradicción simple en Tipo E"
  - "no usar materiality como severity"
  - "no usar confidence como clasificación de conflicto"
  - "no crear causalidad"
  - "no resolver conflictos"
  - "no modificar G8"
  - "no fabricar evidence para desbloquear RE"

required_report_sections:
  - "1. Executive result"
  - "2. Contracts/runtime inspected"
  - "3. Why N3 is empty today"
  - "4. D1-D20 findings"
  - "5. N3 rule readiness matrix"
  - "6. Conflict A-E readiness matrix"
  - "7. Type E exact blocker analysis"
  - "8. Materiality/confidence/G8 boundary"
  - "9. Causal boundary"
  - "10. Resolution boundary"
  - "11. Data/source gaps"
  - "12. Productive N3 feasibility"
  - "13. G2 decisions required"
  - "14. G8 decisions required"
  - "15. Blockers"
  - "16. GO/NO-GO for IMPL-EVIDENCE-N3-001"
  - "17. STOP"

acceptance_criteria:
  - "D1-D20 auditados"
  - "N3 rule matrix completa"
  - "conflict A-E matrix completa"
  - "G2/G8 separados explícitamente"
  - "causalidad prohibida preservada"
  - "materiality/confidence no recalibradas"
  - "Tipo E no inventado"
  - "explicación exacta de por qué runtime actual produce Tipo A"
  - "explicación exacta de por qué N3 está vacío"
  - "ningún contrato modificado"
  - "ningún runtime modificado"
  - "sin tests/fixtures nuevos"
  - "git diff --check limpio"
  - "reporte obligatorio creado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer Evidence Builder runtime/tests"
  - "leer E2E runtime/tests/report"
  - "clasificar D1-D20"
  - "crear matrices obligatorias"
  - "crear docs/dev-loop/reports/ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"
  - "ejecutar tests existentes solo para comprobar realidad"
  - "ejecutar git diff --check"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar Evidence Builder"
  - "crear evidence rules"
  - "crear conflict classifier"
  - "crear thresholds"
  - "calibrar G8"
  - "modificar otros runtimes"
  - "crear IMPL-EVIDENCE-N3-001"
  - "commit"
  - "push"
  - "merge"
  - "autoaprobar G2/G8"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la auditoría separa de forma completa qué N3/conflict
  behavior es implementable hoy y qué requiere G2, G8 o datos adicionales.
  BLOCKED o STOPPED si el análisis exige inventar reglas o calibraciones.

implementation_followup_rule: >
  IMPL-EVIDENCE-N3-001 no puede crearse desde esta tarea. HUMAN_APPROVER debe
  revisar primero las decisiones G2/G8 y el veredicto de readiness.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001.md"