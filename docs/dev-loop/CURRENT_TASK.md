# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-REASONING-PHYSICAL-DECISIONS-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T11:12:15-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar la realizabilidad física del Reasoning Engine v1.0 definido por
  docs/director-ia/05-REASONING-ENGINE.md contra el IES Builder y runtimes
  actualmente existentes. Identificar qué decisiones físicas ya están
  congeladas, qué elementos siguen UNKNOWN y qué decisiones humanas deben
  resolverse antes de autorizar IMPL-REASONING-001, sin implementar runtime N5,
  sin modificar contratos y sin introducir conocimiento N1-N4.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "test/director-ia-ies-builder.test.js (solo lectura)"
  - "fixtures/director-ia/ies/ (solo lectura)"

  - "lib/director-ia-observation-pipeline.js (solo lectura)"
  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "lib/director-ia-eks.js (solo lectura)"
  - "lib/director-ia-op-eb-eks-integration.js (solo lectura)"

out_of_scope:
  - "implementar Reasoning Engine"
  - "crear runtime N5"
  - "crear lib/director-ia-reasoning*.js"
  - "crear tests de implementación RE"
  - "crear fixtures de implementación RE"

  - "modificar docs/director-ia/"
  - "modificar IES Builder"
  - "modificar OP"
  - "modificar EB"
  - "modificar EKS"
  - "modificar server.js"
  - "modificar package.json"

  - "integrar proveedor LLM"
  - "llamar OpenAI u otro proveedor"
  - "crear prompts productivos"
  - "crear tool-calling"
  - "consultar fuentes"
  - "ejecutar SQL"
  - "leer datos productivos"

  - "implementar Reasoning Run persistence"
  - "crear tablas de Reasoning Run"
  - "crear SQL/migraciones"
  - "decidir retention"

  - "implementar Channel Projection"
  - "integrar chat"
  - "integrar voz"
  - "integrar WhatsApp"
  - "integrar dashboard"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar materiality"
  - "recalcular confidence"
  - "crear causalidad N1-N4"
  - "crear hechos/evidencia/diagnósticos nuevos"

  - "commit"
  - "push"
  - "merge"
  - "crear o ejecutar IMPL-REASONING-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"

known_runtime_state:
  observation_pipeline: "IMPLEMENTED"
  evidence_builder: "IMPLEMENTED"
  eks: "IMPLEMENTED + internal runtime integration"
  op_eb_eks_flow: "IMPLEMENTED / tested"
  ies_builder: "IMPLEMENTED OFFICIAL in-memory"
  reasoning_engine: "PENDING"
  reasoning_run_store: "PENDING"
  channel_projection: "PENDING"

reasoning_contract_facts:
  - "Reasoning Engine = Nivel 5"
  - "RE es la única capa donde puede operar LLM analítico para hipótesis"
  - "RE no es fuente de verdad empresarial"
  - "RE no modifica IES, Snapshot ni Bundle"
  - "RE no crea N1-N4"
  - "RE no ejecuta tools"
  - "RE no consulta bases operacionales"
  - "entrada de conocimiento = un IES válido"
  - "parámetros de sesión no alteran el IES"
  - "BUILDING/EXPIRED/SUPERSEDED/INVALID no son consumibles para nuevo razonamiento vigente"
  - "VALIDATED/PARTIAL/CONFLICTED/NO_KNOWLEDGE sí son consumibles"
  - "NO_KNOWLEDGE no autoriza hipótesis sustantivas"
  - "PARTIAL no autoriza completar vacíos"
  - "hipótesis requiere IDs de hechos/evidencias del IES"
  - "al menos un supporting_evidence_id existente"
  - "hypothesis_strength != confidence"
  - "hypothesis_strength != probability"
  - "hypothesis_strength != materiality"
  - "hypothesis_strength != severity"
  - "sin porcentajes ficticios"
  - "hipótesis rivales están permitidas"
  - "sin ranking ficticio"
  - "Recommendation != Next Verification != Decision Option"
  - "ABSTENTION no crea segunda cobertura"
  - "RE no recalcula materiality"
  - "OFFICIAL y ALTERNATIVE no se fusionan silenciosamente"
  - "canonical_reasoning_language vigente = es-MX"
  - "RE produce Reasoning Result"
  - "Reasoning Run es auditoría append-only de inferencia N5 fuera de EKS/IES"
  - "Channel Projection posee presentación; RE posee semántica"

audit_questions:

  D1_runtime_interface:
    question: >
      ¿Cuál debe ser la interfaz física mínima del Reasoning Engine:
      factory pura, servicio con adapter LLM inyectable, función pura o forma
      equivalente, sin convertir proveedor/modelo en contrato?
    classify:
      - CONTRACTUAL
      - PHYSICAL_UNKNOWN
      - RECOMMENDATION

  D2_input_shape:
    question: >
      ¿Qué parte exacta del IES completo consume el RE y qué parámetros de
      sesión deben ser una segunda entrada no epistemológica?
    must_cover:
      - "IES"
      - "analysis_mode"
      - "canonical_reasoning_language"
      - "channel_hint"
      - "maximum_semantic_depth"

  D3_status_gate:
    question: >
      ¿Cómo debe implementarse físicamente el gate de lifecycle IES antes de
      ejecutar cualquier razonamiento?
    must_cover:
      - "VALIDATED"
      - "PARTIAL"
      - "CONFLICTED"
      - "NO_KNOWLEDGE"
      - "BUILDING"
      - "EXPIRED"
      - "SUPERSEDED"
      - "INVALID"

  D4_llm_boundary:
    question: >
      ¿Qué contrato físico debe tener un adapter/model provider para permitir
      inferencia N5 sin permitir tools, DB, fuentes o mutación del IES?
    must_determine:
      - "request shape"
      - "response shape"
      - "provider metadata"
      - "timeout/error behavior"
      - "no tool calls"
      - "no hidden knowledge treated as enterprise truth"

  D5_reasoning_result_shape:
    question: >
      Verificar si 05 define suficientemente la forma física completa de
      Reasoning Result para implementación directa.
    fields:
      - "interpretation"
      - "hypotheses[]"
      - "recommendations[]"
      - "next_verifications[]"
      - "decision_options[]"
      - "abstentions[]"
      - "clarification_requests[]"
      - "reasoning_limits"
      - "references"

  D6_interpretation:
    question: >
      ¿Qué forma estructural mínima debe tomar INTERPRETATION para mantener
      separación LO QUE SÉ / PUEDO INFERIR / NO PUEDO CONCLUIR sin crear
      narrativa que se confunda con N1-N4?

  D7_hypothesis_validation:
    question: >
      ¿Qué validaciones determinísticas deben ejecutarse después del modelo
      para aceptar/rechazar una Hypothesis?
    must_cover:
      - "supporting_fact_ids existentes"
      - "supporting_evidence_ids existentes"
      - "ies_id/version exactos"
      - "validity_scope"
      - "statement_language"
      - "hypothesis_strength enum"
      - "conflicts/limitations citados"

  D8_hypothesis_strength:
    question: >
      ¿El contrato permite calcular WEAK/MODERATE/STRONG determinísticamente,
      delegarlo al modelo sujeto a validación, o falta una decisión física?
    prohibition: >
      No crear score, probability, confidence proxy, materiality proxy ni
      fórmula no autorizada.

  D9_rival_hypotheses:
    question: >
      ¿Qué mecanismo físico permite hipótesis rivales sin inventar ranking ni
      primary candidate cuando no existe base contractual de orden?

  D10_abstention:
    question: >
      ¿Cómo se genera una abstención anclada al IES y cuáles son las condiciones
      determinísticas que deben impedir hipótesis?
    must_cover:
      - "NO_KNOWLEDGE"
      - "falta de supporting_evidence"
      - "limitación bloqueante"
      - "entidad unresolved"
      - "scope incompleto"
      - "conflicto que impida claim"

  D11_recommendation:
    question: >
      Determinar qué soporte/referencias exige una Recommendation y qué impide
      que se convierta en mandato no soportado o hecho.

  D12_next_verification:
    question: >
      Determinar cómo distinguir físicamente una acción epistémica futura de
      una Recommendation de negocio, sin ejecutar la tool desde RE.

  D13_decision_option:
    question: >
      Determinar la estructura y validación mínima de Decision Option y qué
      impide presentarla como decisión tomada.

  D14_clarification_request:
    question: >
      Determinar cuándo RE puede pedir aclaración y qué anclas del IES debe
      citar sin inventar entidades ni alcance.

  D15_materiality_and_conflicts:
    question: >
      Verificar mecanismos físicos para garantizar que RE solo consume
      materiality y conflictos proyectados; no eleva MAT_* ni resuelve conflictos.

  D16_official_alternative:
    question: >
      ¿Cómo debe recibir/razonar sobre OFFICIAL o ALTERNATIVE sin fusión
      silenciosa y conservando provenance?

  D17_reasoning_run:
    question: >
      Auditar si 05 define suficientemente Reasoning Run para una implementación
      in-memory inicial y/o persistencia posterior.
    must_determine:
      - "run_id"
      - "IES anchor"
      - "Reasoning Result"
      - "provider/model metadata"
      - "prompt/template/version metadata si aplica"
      - "timestamps"
      - "append-only semantics"
      - "persistence requirement"
      - "integrity/audit fields"

  D18_determinism_and_replay:
    question: >
      Separar qué partes deben ser determinísticas y qué partes no pueden serlo
      por naturaleza del LLM. Determinar qué necesita fijarse para
      auditabilidad/replay verificable sin prometer repetibilidad absoluta.

  D19_provider_independence:
    question: >
      Determinar la interfaz mínima para que OpenAI u otro proveedor sea
      intercambiable sin cambiar el contrato semántico RE.

  D20_runtime_readiness:
    question: >
      Emitir GO/NO-GO para IMPL-REASONING-001, identificando exactamente qué
      decisiones físicas faltantes requieren G2 u otra autorización.

mandatory_result_source_matrix:
  required_columns:
    - "Reasoning Result field/object"
    - "contract authority"
    - "source from IES"
    - "LLM generated allowed: YES|NO|CONDITIONAL"
    - "deterministic validation"
    - "physical readiness"
    - "classification"
    - "notes"

mandatory_gate_matrix:
  required_columns:
    - "condition"
    - "may_reason: YES|NO|LIMITED"
    - "may_emit_hypothesis: YES|NO"
    - "must_abstain: YES|NO"
    - "contract_reference"
    - "notes"

mandatory_runtime_gap_matrix:
  required_columns:
    - "gap_id"
    - "description"
    - "blocks_impl_reasoning_001: YES|NO"
    - "requires_G2: YES|NO"
    - "requires_provider_decision: YES|NO"
    - "requires_G8: YES|NO"
    - "authority_owner"
    - "recommended_resolution"

classification_rules:
  CONTRACTUAL: >
    Definido por 05 o contratos superiores. Implementación debe obedecerlo.
  PHYSICAL_UNKNOWN: >
    Resultado requerido pero sin realización física suficiente.
  RECOMMENDATION: >
    Propuesta técnica no vinculante; no queda aprobada por aparecer en reporte.
  BLOCKER: >
    Impide implementar sin decisión humana/contractual adicional.

audit_constraints:
  - "no implementar LLM"
  - "no crear prompts productivos"
  - "no simular proveedor como decisión final"
  - "no inferir estructura faltante por conveniencia"
  - "no convertir interpretación en hechos N1-N4"
  - "no generar hipótesis durante la auditoría"
  - "no inventar hypothesis_strength"
  - "no inventar probabilities"
  - "no inventar causalidad empresarial"
  - "no reabrir coverage"
  - "no recalcular materiality"
  - "no resolver conflictos"
  - "no ejecutar next_verification"
  - "no transformar recommendations en acciones automáticas"
  - "no diseñar Channel Projection"
  - "no modificar 05"

required_report_sections:
  - "1. Executive result"
  - "2. Contracts/runtime inspected"
  - "3. Current physical reality"
  - "4. D1-D20 findings"
  - "5. Reasoning Result source matrix"
  - "6. Lifecycle/abstention gate matrix"
  - "7. LLM/provider boundary"
  - "8. Deterministic post-validation"
  - "9. Hypothesis strength/rivals readiness"
  - "10. Recommendation/verification/decision-option separation"
  - "11. Reasoning Run readiness"
  - "12. Replay/auditability analysis"
  - "13. Physical unknowns"
  - "14. Recommendations requiring approval"
  - "15. Blockers"
  - "16. Gate assessment"
  - "17. GO/NO-GO for IMPL-REASONING-001"
  - "18. STOP"

acceptance_criteria:
  - "D1-D20 auditados"
  - "matriz Reasoning Result completa"
  - "matriz lifecycle/abstention completa"
  - "matriz runtime gaps completa"
  - "frontera IES -> RE identificada"
  - "frontera LLM/provider identificada"
  - "validaciones post-model identificadas"
  - "Reasoning Run readiness auditado"
  - "NO_KNOWLEDGE/abstention auditado"
  - "PARTIAL/CONFLICTED auditados"
  - "materiality/conflicts preservados"
  - "ningún contrato modificado"
  - "ningún runtime modificado"
  - "sin integración LLM"
  - "sin prompts productivos"
  - "sin G8"
  - "ninguna recomendación autoaprobada"
  - "git diff --check sin errores"
  - "reporte obligatorio creado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer runtimes/tests/fixtures declarados in_scope"
  - "comparar 05 con IES Builder real"
  - "clasificar D1-D20"
  - "crear matrices obligatorias"
  - "crear docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-001.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"
  - "ejecutar tests existentes solo si ayudan a verificar realidad"
  - "ejecutar git diff --check"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "crear runtime RE"
  - "crear adapter LLM"
  - "crear prompts"
  - "crear tests RE"
  - "crear fixtures RE"
  - "modificar IES Builder"
  - "modificar OP/EB/EKS"
  - "modificar server.js"
  - "modificar package.json"
  - "crear SQL/migraciones"
  - "integrar proveedor LLM"
  - "usar tools productivas"
  - "leer datos productivos"
  - "implementar Channel Projection"
  - "calibrar G8"
  - "autoaprobar decisiones"
  - "autoaprobar gates"
  - "crear IMPL-REASONING-001"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la auditoría puede determinar de forma completa la
  frontera física IES -> Reasoning Engine y separar contratos, unknowns,
  recomendaciones y blockers sin modificar contratos.
  BLOCKED o STOPPED si continuar exige G2 u otra decisión humana no autorizada.

implementation_followup_rule: >
  IMPL-REASONING-001 no puede crearse desde esta tarea. HUMAN_APPROVER debe
  revisar primero el reporte y aprobar cualquier decisión física pendiente.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-REASONING-PHYSICAL-DECISIONS-001.md"
```