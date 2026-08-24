# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-SYNC-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

mode:
  type: "DOCUMENTATION_SYNC_ONLY"
  implementation: false
  code_changes: false
  test_changes: false
  contract_changes: false
  sql_execution: false

objective: >
  Sincronizar la documentación de Director IA con el runtime ya integrado de
  cross-metric follow-up diario: dentro de un contexto diario válido, la fecha
  puede heredarse mientras la métrica cambia según el turno actual, con requery
  del pack objetivo y sin phrasebook ni reutilización de evidencia.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  name: "daily_cross_metric_followup"
  strategy: "B — contextual metric switch post-planner"

implemented_principle: >
  CONSERVAR FECHA != CONSERVAR MÉTRICA.

implemented_flow: >
  parent daily metric
    + active_date válida
    + planner isolated = unknown
    + turno nombra inequívocamente la otra métrica diaria
    → switch effective intent
    → conservar/revalidar active_date
    → requery target pack
    → actualizar bundle type
    → reemplazar pending gap
    → HILO + evidencia fresca
    → GPT

supported_metrics:
  sales:
    intent: "daily_sales_deviation"

  discount:
    intent: "daily_discount_deviation"

sales_to_discount:
  canonical_sequence:
    - "¿Cómo estuvo la venta ayer?"
    - "¿Y el descuento?"

  documented_result:
    - "turno 1 = daily_sales_deviation"
    - "turno 2 = daily_discount_deviation"
    - "same active_date"
    - "fresh discount pack"

discount_to_sales:
  canonical_sequence:
    - "¿Por qué subió el descuento/kg ayer?"
    - "¿Y la venta?"

  documented_result:
    - "turno 1 = daily_discount_deviation"
    - "turno 2 = daily_sales_deviation"
    - "same active_date"
    - "fresh sales pack"

date_inheritance:
  allowed_only_when:
    - "parent_intent actual es daily_sales_deviation o daily_discount_deviation"
    - "active_date existe y sigue válida"
    - "turno no trae una fecha explícita incompatible"
    - "turno no pide un periodo mensual"

  invariant: >
    La fecha heredada viene del contexto diario. No se inventa “ayer”.

  explicit_date_precedence: >
    Si el turno actual contiene una fecha explícita válida, esa fecha prevalece.

no_date_behavior:
  rule: >
    Sin active_date diaria válida, una frase como “¿Y el descuento?” no inventa
    ayer ni fuerza un pack diario.

same_metric_followup:
  examples:
    - "¿Y eso?"
    - "¿Qué más?"
    - "¿Quién explica más?"
    - "¿Quién lo movió más?"

  behavior: >
    Si el turno no nombra inequívocamente la otra métrica, se preserva strategy B
    y se hereda el parent_intent actual.

metric_recognition:
  rule: >
    La implementación reconoce semántica de métrica usando señales existentes,
    no frases completas.

  anti_phrasebook:
    - "sin hardcode de '¿Y el descuento?'"
    - "sin hardcode de '¿Y la venta?'"
    - "sin lista extensa de sinónimos"
    - "sin intent nuevo"
    - "sin segunda llamada LLM de routing"

monthly_boundary:
  rule: >
    Una señal explícitamente mensual no reutiliza active_date diaria.

  example:
    sequence:
      - "¿Cómo estuvo la venta ayer?"
      - "¿Y el descuento este mes?"
    behavior: "monthly path corresponding to current query"

state_transition:
  before:
    - "parent_intent = source daily metric"
    - "active_date = shared date"
    - "bundle type = source metric"
    - "gap = source pack gap"

  after:
    - "parent_intent = target daily metric"
    - "active_date = inherited/revalidated"
    - "bundle type = target metric"
    - "gap = freshly derived from target pack"

gap_semantics:
  invariant: >
    El gap de venta no se convierte en gap de descuento ni viceversa.

evidence:
  rules:
    - "fresh target loader"
    - "requery"
    - "current authz"
    - "current provenance"
    - "absence/error semantics current"

  invariant: >
    Fecha compartida != evidencia compartida.

previous_frame_boundary:
  use_for_cross_metric_switch: false
  preserved: true

  principle: >
    Cambiar de métrica dentro del mismo contexto diario no es topic return.

persistent_memory_boundary:
  use_for_cross_metric_switch: false
  pending_work_items_only: "preserved"

GPT_boundary:
  runtime:
    - "metric recognition"
    - "date inheritance/revalidation"
    - "effective intent switch"
    - "target pack selection"
    - "requery"
    - "state transition"
    - "gap replacement"
    - "authz/provenance"

  GPT:
    - "interpretación"
    - "síntesis"
    - "explicación"
    - "qué importa"
    - "qué no está explicado"
    - "qué información falta"
    - "follow-up"

  principle: >
    GPT recibe el pack correcto; no se le pide reparar un routing incorrecto.

preserved:
  - "daily_sales_deviation"
  - "daily_discount_deviation"
  - "natural follow-up strategy B"
  - "intra-session previous_frame"
  - "action-person routing"
  - "plant_diagnosis"
  - "financial_diagnosis"
  - "persistent pending memory"
  - "M9 monthly"

not_implemented:
  - "nuevas métricas diarias"
  - "topic stack"
  - "persistent topic memory"
  - "IGF -> Folios executive reasoning"
  - "SQL 017 execution"

test_evidence:
  focal_cross_metric: "17/17"
  director_ia_suite: "871/871"
  planner: "58/58"
  capabilities: "56/56"
  orchestrator: "28/28"
  git_diff_check: "clean"

module_state:
  changed_modules: "none"
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

contracts:
  Constitution: "unchanged"
  EKE: "unchanged"
  IES_04: "unchanged"
  Reasoning_Engine_05: "unchanged"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-SYNC-001.md"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "contracts"
  - "SQL"
  - "matrix changes"
  - "new metrics"
  - "IGF/Folios implementation"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Strategy B documented."
  - "Sales -> discount documented."
  - "Discount -> sales documented."
  - "Date inheritance documented."
  - "No date invention documented."
  - "Same-metric followup documented."
  - "Monthly boundary documented."
  - "State transition documented."
  - "Gap replacement documented."
  - "Previous_frame boundary documented."
  - "Persistent memory boundary documented."
  - "No phrasebook explicit."
  - "871/871 evidence recorded."
  - "No module coverage change."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-EXECUTIVE-CROSS-DOMAIN-IGF-FOLIOS-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-SYNC-001.md