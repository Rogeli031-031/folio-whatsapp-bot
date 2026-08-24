# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001
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
  client_profile longitudinal: perfil read-only por cliente_key, meses
  calendario alineados, kg/mes, descuento/kg/mes, comments/DICF por clave
  canónica, handoff desde commercial_trend y limitación explícita de ingreso
  mensual actual no disponible.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  name: "client_profile"
  source_strategy: "B — reusable longitudinal client read model"
  routing_strategy: "B — canonical client_profile parent"

identity:
  canonical_key: "cliente_key"

  invariants:
    - "no join por cliente_nombre"
    - "no fuzzy"
    - "no silent merge of homonyms"
    - "same plant authz"

period_semantics:
  default: >
    Mes calendario actual en America/Mexico_City + 2 meses calendario previos.

  current_month: "PARTIAL"
  previous_months: "COMPLETE"

  invariant: >
    Perfil 3M calendario != commercial_trend 90 trailing days.

monthly_sales:
  metric: "kg"
  calculation: "SUM(kg)"
  grain: "cliente_key + month"

monthly_discount:
  calculation: "SUM(monto) / SUM(kg)"
  grain: "cliente_key + month"

  prohibited:
    - "AVG de ratios"
    - "average-of-averages"

monthly_income:
  status: "UNSUPPORTED_METRIC as actual"

  existing_related_value: >
    Existe valor DICF derivado de fórmula/forecast, pero no representa ingreso
    mensual actual reconocido.

  invariant: >
    Director IA no sustituye ni etiqueta ese valor como ingreso actual.

  behavior: >
    Ante “¿Cuánto ingreso generó?”, responde con limitation explícita.

profile_pack:
  includes:
    - "cliente_key"
    - "display_name"
    - "plant"
    - "aligned months"
    - "PARTIAL/COMPLETE markers"
    - "kg/month"
    - "discount/kg/month"
    - "comments by cliente_key"
    - "DICF by cliente_key"
    - "client-linked DICF actions if available"
    - "limitations"
    - "provenance"

  invariant: >
    Los meses se alinean antes de entregar evidencia a GPT.

comments:
  join: "cliente_key only"
  truth_boundary: "comentario = declaración/contexto registrado; no causa probada"

DICF:
  join: "cliente_key only"
  truth_boundary: "acción registrada != resultado demostrado"

action_register_boundary:
  finding: "General Action Register no tiene cliente_key."
  invariant: >
    No existe join inventado de Action Register hacia cliente.

commercial_trend_handoff:
  canonical_sequence:
    - "¿Cómo vamos en CASA los últimos 3 meses?"
    - "¿Quién está moviendo la caída?"
    - "Háblame del primero."
    - "¿Qué sabemos de él?"

  behavior:
    - "commercial_trend identifies mover"
    - "active_entity resolves canonical cliente_key"
    - "client_profile becomes effective"
    - "fresh profile requery"
    - "trend evidence is not reused as client evidence"

profile_followups:
  examples:
    - "¿Cómo ha comprado estos tres meses?"
    - "¿Qué descuento tuvo cada mes?"
    - "¿En qué mes compró más?"
    - "¿En qué mes tuvo más descuento?"
    - "¿Ese mes también compró más?"
    - "¿Qué sabemos de él?"
    - "¿Qué comentarios tenemos?"
    - "¿Tiene acciones?"
    - "¿Qué pasó con esas acciones?"
    - "¿Cuánto ingreso generó?"

  behavior: >
    Conservan cliente_key/planta/periodo y reconsultan las fuentes relevantes.

monthly_trend_semantics:
  allowed:
    - "month-over-month delta"
    - "first vs last over aligned monthly buckets"
    - "simple up/down"

  invariant: >
    No reutiliza OLS de commercial_trend porque el grano es mensual.

correlation_boundary:
  allowed:
    - "descuento subió y volumen también"
    - "ambos coinciden temporalmente"

  prohibited:
    - "descuento causó mayor volumen"
    - "comentario demuestra causa"
    - "acción demuestra resultado"

partial_data:
  supports:
    - "missing month"
    - "missing discount"
    - "missing comments"
    - "missing DICF"
    - "missing client actions"
    - "actual income unsupported"

  invariant: "missing != zero"

conversation_state:
  stores:
    - "active_entity cliente_key"
    - "plant"
    - "active_period_months"
    - "optional channel context"
    - "parent_intent client_profile"

  evidence_policy: "fresh requery"

reasoning_boundary:
  runtime:
    - "cliente_key"
    - "plant"
    - "period"
    - "monthly alignment"
    - "kg math"
    - "discount math"
    - "comments/DICF retrieval"
    - "income unsupported flag"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT:
    - "executive synthesis"
    - "what stands out"
    - "correlation wording with caveats"
    - "what remains unexplained"
    - "follow-up"

preserved:
  - "commercial_trend"
  - "daily_executive_brief"
  - "daily sales"
  - "daily discount"
  - "daily cross-metric"
  - "action-person"
  - "topic return"
  - "IGF reviewable supports"
  - "persistent memory"

deferred:
  - "actual monthly client income source"
  - "Taller Mayor by unit"
  - "SEH directory"
  - "personalized greeting"
  - "closed-month IGF semantics"

test_evidence:
  director_ia_suite: "947/947"
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
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001.md"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "contracts"
  - "SQL"
  - "matrix"
  - "actual income implementation"
  - "Taller Mayor"
  - "SEH"
  - "greeting"
  - "closed-month IGF"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "client_profile documented."
  - "cliente_key invariant explicit."
  - "3 calendar month semantics documented."
  - "PARTIAL current month documented."
  - "kg/month documented."
  - "discount SUM(monto)/SUM(kg) documented."
  - "actual income unsupported explicit."
  - "comments/DICF client-keyed."
  - "Action Register boundary explicit."
  - "commercial_trend handoff documented."
  - "profile followups documented."
  - "correlation != causality explicit."
  - "partial-data behavior documented."
  - "947/947 evidence recorded."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001.md