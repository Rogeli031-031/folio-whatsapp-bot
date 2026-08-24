# CURRENT_TASK

```yaml
task_id: "AUDIT-DIRECTOR-IA-PERSISTENT-MEMORY-EKE-GATE-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo AUDIT-DIRECTOR-IA-PERSISTENT-MEMORY-EKE-GATE-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: APPROVED
  G8_calibration_materiality_signature: N/A

objective: >
  Resolver exclusivamente la tensión contractual detectada durante
  ARCH-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-READINESS-001:
  determinar si el first slice pending_work_items_only, como memoria operativa
  persistente del chat legado y fuera de EKS/IES/N5, está permitido por EKE §15
  y por los contratos congelados aplicables.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

prior_readiness:
  task: "ARCH-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-READINESS-001"
  determination: "READY_WITH_LIMITS"
  selected_first_slice: "pending_work_items_only"

proposed_memory_semantics:
  purpose: >
    Persistir trabajo pendiente para poder retomar una investigación entre
    conversaciones.

  example: >
    Puebla / Arturo / expediente_comercial /
    falta conocer motivo documentado de abandono / active

  crucial_boundary: >
    Lo persistido representa contexto de trabajo pendiente, NO evidencia actual
    de negocio y NO una conclusión factual sobre el cliente.

  truth_rule: >
    Al recuperarse, toda afirmación empresarial mutable requiere authz actual,
    resolución actual de entidad y requery de fuentes actuales.

proposed_storage_boundary:
  owner: "chat legado operativo"
  schema: "arr"
  EKS: false
  IES: false
  reasoning_engine_N5: false
  evidence_store: false
  conversation_transcript_store: false

audit_scope:

  mandatory_documents:
    - "DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
    - "03-EXECUTIVE-KNOWLEDGE-STORE.md"
    - "04-IES-STANDARD.md"
    - "05-REASONING-ENGINE.md"
    - "DIRECTOR_IA_CONSTITUTION.md"
    - "DIRECTOR_IA_ARCHITECTURE_INDEX.md"

  mandatory_focus:
    - "EKE §15 exact wording and context"
    - "ownership boundaries"
    - "persistence boundaries"
    - "EKS admissible contents"
    - "IES/N5 boundaries"
    - "legacy chat runtime boundaries"
    - "whether operational conversational state is forbidden"
    - "whether a new operational store requires contract change"

central_question: >
  ¿Los contratos vigentes permiten que el chat legado persista únicamente
  pending work items para continuidad cross-session, fuera del EKS/IES/N5,
  siempre que esa memoria no sea tratada como evidencia ni verdad empresarial?

required_determination:
  choose_exactly_one:
    - "ALLOWED"
    - "NOT_ALLOWED"
    - "REQUIRES_CONTRACT_CHANGE"

decision_rules:

  ALLOWED: >
    Los contratos no prohíben este store operativo y el first slice puede
    implementarse sin modificar contratos congelados.

  NOT_ALLOWED: >
    Existe una prohibición contractual explícita aplicable al first slice
    propuesto.

  REQUIRES_CONTRACT_CHANGE: >
    El first slice necesita una capacidad o boundary que los contratos vigentes
    reservan, excluyen o no permiten sin modificación contractual.

evidence_requirements:

  required:
    - "citar archivo"
    - "citar sección"
    - "transcribir solo el fragmento mínimo relevante"
    - "explicar aplicación al pending_work_items_only"
    - "distinguir texto contractual de interpretación"

  prohibited:
    - "resolver por intuición"
    - "resolver porque el feature es conveniente"
    - "resolver solo desde el reporte previo"
    - "reinterpretar memoria como evidencia para hacerla encajar"
    - "inventar excepción no escrita"

EKE_section_15:

  mandatory:
    - "leer §15 completo en contexto"
    - "identificar sujeto de cada prohibición"
    - "identificar qué storage/runtime regula"
    - "determinar si regula EKE/EKS únicamente o todo Director IA"
    - "determinar si pending work item cae materialmente dentro de esa categoría"

  rule: >
    No usar una frase aislada de §15 sin revisar definiciones y alcance.

boundary_tests:

  test_1:
    item: "pending information gap"
    question: >
      ¿Es contexto operativo de conversación, conocimiento ejecutivo,
      evidencia, Observation, IES o Reasoning Run?

  test_2:
    item: "entity_key + planta_id"
    question: >
      ¿Guardar identificadores para reanudar trabajo viola alguna boundary?

  test_3:
    item: "summary del pendiente"
    question: >
      ¿Puede persistirse una descripción mínima del trabajo sin convertirla
      en hecho empresarial?

  test_4:
    item: "status active/resolved"
    question: >
      ¿El status describe el work item o pretende describir el estado real
      del negocio?

  test_5:
    item: "revalidation"
    question: >
      ¿Requery obligatorio mantiene la separación memory != evidence exigida
      por los contratos?

anti_scope:
  - "no rediseñar EKE"
  - "no modificar EKE"
  - "no modificar EKS"
  - "no modificar Constitution"
  - "no modificar IES"
  - "no modificar Reasoning Engine"
  - "no diseñar tabla"
  - "no escribir SQL"
  - "no implementar memoria"
  - "no cambiar matriz"
  - "no reabrir readiness completa"

if_allowed:
  conclusion:
    - "G5 = APPROVED"
    - "G2/G3 permanecen N/A"
    - "first slice readiness puede continuar a implementación"

  next_task:
    propose_exactly_one: "IMPL-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-001"

if_not_allowed:
  conclusion:
    - "G5 = REJECTED"

  next_task:
    propose_exactly_one: "ARCH-DIRECTOR-IA-PERSISTENT-MEMORY-CONTRACT-001"

if_requires_contract_change:
  conclusion:
    - "G5 = REJECTED_FOR_CURRENT_IMPL"

  next_task:
    propose_exactly_one: "ARCH-DIRECTOR-IA-PERSISTENT-MEMORY-CONTRACT-001"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PERSISTENT-MEMORY-EKE-GATE-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code"
  - "SQL"
  - "schema"
  - "table creation"
  - "runtime changes"
  - "tests"
  - "matrix"
  - "contract modifications"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "EKE §15 leído completo y en contexto."
  - "Contratos relacionados revisados."
  - "Sujeto y alcance de la restricción identificados."
  - "pending_work_items_only evaluado contra boundaries reales."
  - "Memory != evidence evaluado contractualmente."
  - "Exactamente ALLOWED / NOT_ALLOWED / REQUIRES_CONTRACT_CHANGE."
  - "G5 determinado."
  - "G2/G3 confirmados o corregidos si la evidencia contractual lo exige."
  - "Sin cambios contractuales."
  - "Sin implementación."
  - "52.5% preservado."
  - "Solo CURRENT_TASK y reporte modificados."
  - "git diff --check limpio."

expected_terminal_state: >
  DONE_PENDING_REVIEW si la determinación contractual puede emitirse.
  BLOCKED solo si falta evidencia contractual física para resolverla.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PERSISTENT-MEMORY-EKE-GATE-001.md