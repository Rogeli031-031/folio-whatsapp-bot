# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-DAILY-DEVIATION-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-DAILY-DEVIATION-SYNC-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación de Director IA con el runtime ya integrado de
  daily_sales_deviation, documentando exactamente el first slice
  daily_sales_plus_business_evidence sin modificar código, contratos, runtime
  ni cobertura de módulos.

baseline:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  intent: "daily_sales_deviation"
  first_slice: "daily_sales_plus_business_evidence"

implemented_path: >
  pregunta de venta diaria
    → daily_sales_deviation
    → ayer calendario completo America/Mexico_City
    → venta observada kg
    → referencia same-weekday / ventana 14 días
    → delta kg / delta %
    → contribución por cliente
    → contribución por canal
    → DICF + comments por cliente_key
    → information gaps
    → evidence pack
    → HILO
    → una llamada OpenAI
    → respuesta conversacional

routing:
  document:
    - "daily_sales_deviation gana para preguntas de venta + ayer"
    - "no degrada a financial_diagnosis mensual"
    - "no degrada a delta_sales mensual"
    - "monthly paths permanecen intactos"

date_semantics:
  timezone: "America/Mexico_City"
  target: "ayer calendario completo"

  invariants:
    - "hoy no se trata como día completo"
    - "día sin filas != 0"
    - "target_date queda explícito"
    - "active_date es efímero dentro del hilo"

reference:
  type: "same_weekday_recent_average"
  window_days: 14

  document:
    - "mismo día de semana"
    - "ventana de 14 días"
    - "N observaciones explícito"
    - "referencia siempre declarada al usuario"
    - "día anterior no es default"

daily_detection:
  fields:
    - "target_date"
    - "target_sales_kg"
    - "reference_type"
    - "reference_sales_kg"
    - "reference_observation_count"
    - "deviation_kg"
    - "deviation_pct"

mathematical_decomposition:

  customer:
    documented: true
    key: "cliente_key"
    meaning: >
      contribución matemática del cliente a la diferencia entre el día objetivo
      y la referencia comparable.

  channel:
    documented: true
    meaning: >
      contribución matemática del canal a la diferencia entre el día objetivo
      y la referencia comparable.

  invariant: >
    mathematical contribution != business cause

  required_warning: >
    Cliente/canal que explica matemáticamente parte del delta no queda
    demostrado como causa empresarial del movimiento.

business_evidence:

  sources:
    - "DICF"
    - "commercial comments"

  join:
    key: "cliente_key"
    name_join: false

  semantics:
    - "comment = stored statement, not proven cause"
    - "action = recorded action, not proven cause"
    - "responsible = responsible for action only when physically linked"
    - "responsible != responsible for sales decline"

information_gaps:

  document: >
    El pack identifica contribuidores materiales para los que la evidencia
    disponible no alcanza para explicar empresarialmente el movimiento.

  semantics:
    - "gap != no cause exists"
    - "gap = current pack lacks sufficient explanatory evidence"

  enables_GPT_to_express:
    - "qué sí está observado"
    - "qué parte se localiza matemáticamente"
    - "qué evidencia relacionada existe"
    - "qué sigue sin explicación"
    - "qué información concreta falta"
    - "quién puede aclararla solo cuando existe vínculo físico"

reasoning_boundary:

  deterministic_runtime:
    - "target date"
    - "timezone"
    - "reference"
    - "kg"
    - "delta"
    - "percentage"
    - "customer contribution"
    - "channel contribution"
    - "identity/join"
    - "authz"
    - "provenance"
    - "absence/error semantics"

  GPT:
    - "síntesis"
    - "explicación narrativa"
    - "qué llama la atención"
    - "relación prudente entre evidencias"
    - "qué no está explicado"
    - "qué información falta"
    - "follow-up conversacional"

  principle: >
    El runtime entrega evidencia confiable y matemáticas correctas.
    GPT conserva el razonamiento conversacional.

conversation:

  parent_intent: "daily_sales_deviation"
  active_date: "ephemeral"

  canonical_flow:
    - "¿Por qué bajó la venta ayer?"
    - "¿Contra qué la estás comparando?"
    - "¿Qué clientes explican más?"
    - "¿Y por canal?"
    - "¿Sabemos por qué?"
    - "¿Qué falta investigar?"
    - "¿Quién puede aclararlo?"

  runtime_behavior:
    - "follow-ups heredan el pack defendible"
    - "requery por turno"
    - "una llamada OpenAI por turno"
    - "HILO != evidence"
    - "active_date no se convierte en memoria cross-session"

authz:
  preserve: true
  invariants:
    - "planta actual"
    - "rol actual"
    - "plantas_permitidas"
    - "no cross-plant"
    - "fail-closed"

absence_error_semantics:
  distinguish:
    - "0 real"
    - "null"
    - "día sin filas"
    - "referencia insuficiente"
    - "DATA_NOT_FOUND"
    - "SOURCE_RESTRICTED"
    - "TOOL_ERROR"

daily_discount:
  status: "DEFERRED / NOT IMPLEMENTED"

  readiness_only:
    formula: "SUM(monto) / SUM(kg)"
    average_of_averages: false
    channel_available: false

  warning: >
    No documentar daily discount/kg como capacidad implementada.

preserved:
  - "M9 monthly"
  - "financial_diagnosis"
  - "plant_diagnosis"
  - "structured_conversation_state"
  - "pending_work_items_only"

persistent_memory:
  daily_date_memory: false
  pending_work_items_only: "preserved"

  deployment_note: >
    SQL 017 sigue siendo requisito operativo separado para activar memoria
    persistente en un entorno donde aún no se haya aplicado.

contracts:
  Constitution: "unchanged"
  EKE: "unchanged"
  IES_04: "unchanged"
  Reasoning_Engine_05: "unchanged"

module_matrix:
  changed_modules: "none"
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

test_evidence_from_impl:
  daily_deviation: "16/16"
  continuity: "20/20"
  persistent_memory: "19/19"
  capabilities: "56/56"
  planner: "49/49"
  orchestrator: "27/27"
  director_ia_suite: "777/777"
  git_diff_check: "clean"

deferred_product_gaps:
  - "daily discount/kg"
  - "Julio Pérez / action routing gap"
  - "phrasebook rigidity outside inherited paths"
  - "client-level competition/margin tradeoff"
  - "SQL 017 environment activation where pending"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-DAILY-DEVIATION-SYNC-001.md"

  read_only:
    - "implemented runtime"
    - "tests"
    - "contracts"
    - "sql"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "SQL execution"
  - "schema"
  - "contracts"
  - "new architecture"
  - "daily discount implementation"
  - "percentage changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "daily_sales_deviation documented."
  - "Daily vs monthly boundary explicit."
  - "Yesterday/CDMX documented."
  - "Same-weekday 14-day reference documented."
  - "Customer decomposition documented."
  - "Channel decomposition documented."
  - "Business evidence by cliente_key documented."
  - "Information gaps documented."
  - "Contribution != causality explicit."
  - "Conversational inheritance documented."
  - "Reasoning boundary documented."
  - "Daily discount explicitly deferred."
  - "No module changes."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-003"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-DAILY-DEVIATION-SYNC-001.md