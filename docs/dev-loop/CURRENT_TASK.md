# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-SYNC-001
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
  daily_executive_brief: petición abierta de panorama diario que compone venta
  diaria + descuento/kg para la misma planta/fecha, con evidencia fresca,
  provenance/limitations separadas y síntesis ejecutiva por GPT.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  name: "daily_executive_brief"
  first_slice: "B — daily sales + daily discount/kg"

canonical_semantics:
  meaning: >
    Solicitud abierta de panorama diario sin exigir que el usuario nombre
    previamente venta o descuento.

  examples_for_documentation:
    - "¿Cómo nos fue ayer?"
    - "¿Qué tal estuvo ayer?"
    - "Dame el resumen de ayer."
    - "¿Qué panorama tuvimos ayer?"

  anti_phrasebook: >
    Las frases son ejemplos de intención, no reglas literales de routing.

implemented_flow: >
  daily overview question
    → daily_executive_brief
    → resolve plant/date
    → fresh daily sales pack
    → fresh daily discount/kg pack
    → compose metric blocks
    → independent provenance + limitations
    → HILO
    → GPT executive synthesis

date_semantics:
  timezone: "America/Mexico_City"

  rules:
    - "ayer = día calendario completo"
    - "fecha explícita gana"
    - "hoy no se trata silenciosamente como cerrado"
    - "0 filas != 0"

metric_blocks:

  sales:
    source: "daily_sales_deviation"
    includes:
      - "target kg"
      - "reference"
      - "delta"
      - "contributors"
      - "business evidence"
      - "gaps"
      - "provenance"

  discount_per_kg:
    source: "daily_discount_deviation"
    includes:
      - "target ratio"
      - "reference"
      - "delta"
      - "contributors"
      - "business evidence"
      - "gaps"
      - "provenance"

  excluded:
    - "daily income"
    - "generic KPI registry"

composition_boundary:
  invariant: >
    Shared plant/date does not merge provenance, limitations or causal claims.

  prohibited:
    - "sales gap becomes discount gap"
    - "discount evidence proves sales cause"
    - "single synthetic causal explanation"

partial_data:
  rules:
    - "sales available + discount unavailable => useful partial brief"
    - "discount available + sales unavailable => useful partial brief"
    - "both unavailable => no invented brief"
    - "missing != zero"

materiality:
  strategy: "relative evidence + GPT synthesis"

  runtime:
    provides:
      - "values"
      - "references"
      - "deltas"
      - "contributors"
      - "evidence"
      - "limitations"

  GPT:
    decides:
      - "what stands out"
      - "whether the picture is mixed"
      - "what deserves attention"
      - "what remains unexplained"

  not_implemented:
    - "hard thresholds"
    - "good/bad day rules"
    - "learned materiality score"

reasoning_boundary:
  runtime:
    - "plant"
    - "date"
    - "metric math"
    - "references"
    - "contributors"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT:
    - "executive synthesis"
    - "salience"
    - "tension between metrics"
    - "follow-up wording"

causality:
  invariant: >
    Movimiento conjunto no implica causalidad.

  safe_example: >
    “La venta subió y también aumentó el descuento/kg; conviene revisar qué
    clientes contribuyeron a ambos movimientos.”

  prohibited:
    - "el descuento provocó la venta"
    - "vendimos más gracias al descuento"

precedence:
  preserve:
    - "explicit sales question -> daily_sales_deviation"
    - "explicit discount question -> daily_discount_deviation"

  rule: >
    daily_executive_brief aplica cuando el usuario pide panorama diario sin
    seleccionar métrica.

conversation_state:
  parent_intent: "daily_executive_brief"

  preserves:
    - "active_date"
    - "plant context"
    - "previous_frame semantics"
    - "topic return"

cross_metric_followup:
  examples:
    - "brief -> ¿Y la venta? -> daily_sales_deviation"
    - "brief -> ¿Y el descuento? -> daily_discount_deviation"

  rule: >
    Same active_date preserved; existing daily cross-metric runtime reused.

open_followups:
  examples:
    - "¿Qué te llama la atención?"
    - "¿Qué más ves?"
    - "¿Qué debería revisar?"
    - "¿Qué sigue sin explicación?"

  behavior: >
    Heredan el brief y llegan a GPT con evidencia vigente.

preserved:
  - "daily_sales_deviation"
  - "daily_discount_deviation"
  - "daily cross-metric followup"
  - "natural followup strategy B"
  - "intra-session topic return"
  - "action-person routing"
  - "IGF reviewable supports"
  - "persistent pending memory"
  - "M9"

deferred:
  - "last month / last 3 months trend analysis"
  - "CASA / COMISIONISTA trend conversation"
  - "daily income"
  - "scheduled morning brief"
  - "personalized greeting"
  - "SEH directory"
  - "Taller Mayor by unit"
  - "closed-month IGF semantics"
  - "longitudinal client profile"

test_evidence:
  focal_daily_executive_brief: "18/18"
  director_ia_suite: "915/915"
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
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-SYNC-001.md"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "contracts"
  - "SQL"
  - "matrix changes"
  - "monthly trend implementation"
  - "CASA/COMISIONISTA implementation"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "daily_executive_brief documented."
  - "First slice B documented."
  - "Open daily overview semantics documented."
  - "No phrasebook explicit."
  - "Sales + discount composition documented."
  - "Separate provenance/limitations documented."
  - "Partial-data behavior documented."
  - "Materiality/GPT boundary documented."
  - "Cross-metric followup documented."
  - "Open followups documented."
  - "Explicit metric precedence documented."
  - "915/915 evidence recorded."
  - "No module coverage change."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-SYNC-001.md