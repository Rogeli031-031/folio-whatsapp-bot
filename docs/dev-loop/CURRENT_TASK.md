# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-SYNC-001
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
  commercial_trend: motor backend compartido entre dashboard y chat para serie
  diaria, ventana 30/90 días, CASA/COMISIONISTA, pendiente OLS y top-6 movers,
  con paridad matemática y sin comments en este first slice.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  name: "commercial_trend"
  architecture: "B — shared backend engine"
  first_slice: "B — series + OLS + top-6 movers"

single_source_of_truth:
  engine: "lib/commercial-trend-engine.js"

  consumers:
    - "GET /api/arr/venta-serie"
    - "Director IA commercial_trend"

  invariant: >
    Dashboard y Director IA consumen la misma verdad comercial.

  prohibited:
    - "chat-specific SQL"
    - "internal HTTP"
    - "copied OLS only for chat"
    - "parallel trend math"

dashboard_parity:
  endpoint: "GET /api/arr/venta-serie"

  behavior: >
    El endpoint delega al motor compartido y conserva el comportamiento del
    dashboard.

  comments_boundary: >
    Comments permanecen en el wrapper HTTP/dashboard; no forman parte del motor
    canónico del chat en este first slice.

range_semantics:
  one_month:
    days: 30
    meaning: "30 trailing days"

  three_months:
    days: 90
    meaning: "90 trailing days"

  anchor: "MAX(fecha) disponible"

  invariant: >
    No es mes calendario y no se ancla automáticamente a hoy.

channel_semantics:
  COMISIONISTA:
    physical_rule: "LIKE '%comisionista%'"

  CASA:
    physical_rule: "resto de filas"

  aliases:
    - "COMISIONISTA"
    - "COMISIONISTAS"

  unspecified:
    behavior: >
      Se conserva la semántica soportada por el motor; no inventar canal.

OLS:
  x: "índice de puntos filtrados"
  y: "venta_ton"
  n_lt_2: "null"

  direction:
    positive: "UP"
    negative: "DOWN"
    zero: "FLAT"
    insufficient: "INSUFFICIENT_DATA"

  invariant: >
    “Subiendo/bajando” deriva del signo de la pendiente OLS, no de comparar
    primer punto contra último ni de lectura visual.

series:
  grain: "daily"

  preserves:
    - "same date points as dashboard"
    - "same plant scope"
    - "same channel filter"
    - "same missing-day semantics"

top_movers:
  count: 6

  behavior: >
    Usa el mismo delta y selección que el dashboard.

  truth_boundary: >
    Mover/contributor != causa.

comments:
  included_in_chat_first_slice: false

  reason: >
    El join legacy por cliente_nombre no es evidencia canónica para Director IA.

  deferred_rule: >
    Comments solo podrán incorporarse más adelante vía cliente_key/evidencia
    canónica.

intent:
  name: "commercial_trend"

  slots:
    - "range_days"
    - "channel"
    - "plant"

  invariant: >
    No existen intents separados para CASA, COMISIONISTA, 30d o 90d.

conversation_examples:
  canonical:
    - "¿Cómo vamos en CASA los últimos 3 meses?"
    - "¿Y COMISIONISTAS?"
    - "Compáralos."
    - "¿Quién explica más la caída?"
    - "Háblame del primero."

  semantics:
    channel_switch: >
      CASA 90d -> COMISIONISTA conserva rango y hace fresh requery.

    comparison: >
      CASA y COMISIONISTA se consultan para la misma planta/rango y se comparan
      con dos pendientes OLS defendibles.

    mover_question: >
      “Quién explica” se interpreta matemáticamente como mayor contributor/mover,
      no causa demostrada.

    client_handoff: >
      El mover seleccionado puede pasar a resolución canónica de cliente cuando
      es seguro, sin implementar todavía perfil longitudinal 3M.

conversation_state:
  stores:
    - "plant"
    - "active_range_days"
    - "active_channel"
    - "parent_intent commercial_trend"

  invariant: >
    State conserva contexto de routing; la evidencia se reconsulta.

comparison_mode:
  rule: >
    CASA vs COMISIONISTAS requiere dos consultas al mismo motor con el mismo
    rango. No usar “ambos” agregado como sustituto de comparación.

  outputs_if_available:
    - "CASA slope/direction"
    - "COMISIONISTA slope/direction"
    - "totals"
    - "top movers by channel"

reasoning_boundary:
  runtime:
    - "range"
    - "channel"
    - "series"
    - "OLS"
    - "top movers"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT:
    - "executive synthesis"
    - "comparison wording"
    - "what stands out"
    - "what deserves investigation"
    - "follow-ups"

  prohibited:
    - "scripted causal explanation"
    - "mover = cause"
    - "trend = cause"

partial_data:
  handles:
    - "no rows"
    - "insufficient observations"
    - "one channel missing"
    - "source error"

  invariant: "missing != zero unless source semantics explicitly establish zero"

parity_evidence:
  requirement: >
    Para mismo fixture/planta/rango/canal, dashboard/shared engine/Director IA
    producen los mismos:
    - range_start
    - range_end
    - daily dates
    - venta_ton
    - top-6 movers
    - OLS slope
    - observation count

preserved:
  - "daily_executive_brief"
  - "daily_sales_deviation"
  - "daily_discount_deviation"
  - "daily cross-metric followup"
  - "commercial_state"
  - "natural followup"
  - "topic return"
  - "action-person"
  - "IGF reviewable supports"
  - "persistent memory"

deferred:
  - "comments parity via cliente_key"
  - "longitudinal client 3M profile"
  - "Taller Mayor"
  - "SEH directory"
  - "personalized greeting"
  - "closed-month IGF semantics"

test_evidence:
  focal_commercial_trend: "18/18"
  planner: "58/58"
  capabilities: "56/56"
  orchestrator: "28/28"
  director_ia_suite: "933/933"
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
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-SYNC-001.md"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "contracts"
  - "SQL"
  - "matrix changes"
  - "comments implementation"
  - "longitudinal client implementation"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Shared engine documented."
  - "Dashboard/chat parity documented."
  - "30/90 semantics documented."
  - "MAX(fecha) anchor documented."
  - "CASA/COMISIONISTA semantics documented."
  - "OLS semantics documented."
  - "Top-6 movers documented."
  - "Mover != cause explicit."
  - "Comments exclusion documented."
  - "commercial_trend intent/slots documented."
  - "Channel switch documented."
  - "Comparison behavior documented."
  - "Client handoff boundary documented."
  - "933/933 evidence recorded."
  - "No module coverage change."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-010"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-SYNC-001.md