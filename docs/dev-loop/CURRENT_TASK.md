# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-DAILY-DISCOUNT-KG-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-DAILY-DISCOUNT-KG-SYNC-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación de Director IA con el runtime ya integrado de
  daily_discount_deviation, documentando el cálculo ponderado diario,
  referencia pooled same-weekday 14d, contribución reconciliada por cliente,
  evidencia comercial relacionada y huecos de información, sin modificar
  código, contratos, M9, schema ni cobertura de módulos.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  intent: "daily_discount_deviation"
  first_slice: "D — ratio + reconciled contribution + business evidence/gaps"

implemented_path: >
  pregunta diaria de descuento/kg
    → daily_discount_deviation
    → ayer America/Mexico_City
    → arr.descuentos_diarios_cliente
    + arr.ventas_diarias_cliente
    → SUM(monto) / SUM(kg)
    → referencia pooled same-weekday / 14 días
    → contribución reconciliada por cliente
    → DICF + comments por cliente_key
    → information gaps
    → HILO
    → GPT

routing:
  document:
    - "daily_discount_deviation gana para preguntas explícitamente diarias"
    - "no degrada a delta_discount mensual"
    - "no degrada a financial_diagnosis mensual"
    - "monthly paths permanecen intactos"

date_semantics:
  timezone: "America/Mexico_City"
  target: "ayer calendario completo"

  invariants:
    - "hoy no se trata como día completo"
    - "día sin filas != ratio 0"
    - "target_date explícito"
    - "active_date efímero"

sources:
  discount:
    table: "arr.descuentos_diarios_cliente"
    fields:
      - "fecha"
      - "plant_code"
      - "cliente_norm"
      - "monto"

  kg:
    table: "arr.ventas_diarias_cliente"
    use: "SUM(kg) al mismo grano cliente/día/planta"

  absent:
    - "canal en descuento"
    - "planta_id en descuento"
    - "cliente_key físico en descuento"

  rule: >
    No prorratear monto por canal y no inventar dimensiones ausentes.

formula:
  plant_target: "SUM(monto_target) / SUM(kg_target)"
  plant_reference: "SUM(monto_ref) / SUM(kg_ref)"

  invariants:
    - "no AVG de ratios"
    - "no average-of-averages"
    - "kg = denominador"
    - "monto = numerador"
    - "kg=0 requiere handling explícito"
    - "null != 0"

reference:
  type: "same_weekday_14d_pooled"

  rules:
    - "mismos días de semana"
    - "ventana 14 días"
    - "solo días completos"
    - "misma planta"
    - "pooled SUM(monto_ref)/SUM(kg_ref)"
    - "N observaciones explícito"
    - "día anterior no es default"
    - "no promedio de ratios diarios"

customer_contribution:
  formula: >
    contrib_i =
      monto_i_target / K_target
      -
      monto_i_ref / K_ref

  where:
    K_target: "kg total planta target"
    K_ref: "kg total planta reference"

  reconciliation:
    rule: >
      SUM(contrib_i) = R_target - R_ref
      dentro de tolerancia numérica.

  truth:
    - "ratio más alto != mayor mover"
    - "mayor mover = contribución matemática al delta del ponderado"
    - "contribución != causa"

mix_effect:
  status: "DEFERRED"
  rule: "No separar mix/rate en este slice."

channel:
  status: "NOT AVAILABLE / NOT IMPLEMENTED"
  rule: >
    No reconstruir ni prorratear canal desde otra fuente.

business_evidence:
  sources:
    - "commercial comments"
    - "DICF actions"

  join:
    key: "cliente_key canónico"
    name_join: false

  semantics:
    - "comment != cause"
    - "action != cause"
    - "responsible != responsible for discount increase"

information_gaps:
  meaning: >
    Clientes materialmente contribuidores para los que el pack actual no
    contiene evidencia suficiente que explique empresarialmente el movimiento.

  allows_GPT_to_express:
    - "qué pasó matemáticamente"
    - "qué clientes movieron el ponderado"
    - "qué evidencia relacionada existe"
    - "qué sigue sin explicación"
    - "qué información hace falta"
    - "quién puede aclarar solo con vínculo físico"

reasoning_boundary:
  deterministic_runtime:
    - "fecha"
    - "timezone"
    - "monto"
    - "kg"
    - "ratio"
    - "reference"
    - "contribution"
    - "reconciliation"
    - "identity/join"
    - "authz"
    - "provenance"
    - "absence/error"

  GPT:
    - "síntesis"
    - "explicación narrativa"
    - "qué destaca"
    - "relación prudente con evidencia"
    - "qué no sabemos"
    - "qué falta saber"
    - "follow-ups"

  principle: >
    Runtime calcula. GPT interpreta.

conversation:
  parent_intent: "daily_discount_deviation"
  active_date: "ephemeral"

  canonical_flow:
    - "¿Por qué subió el descuento/kg ayer?"
    - "¿Contra qué lo estás comparando?"
    - "¿Quién movió más el promedio?"
    - "¿Fue general?"
    - "¿Sabemos por qué?"
    - "¿Qué falta?"
    - "¿Quién puede aclararlo?"

  behavior:
    - "natural follow-up strategy B preservada"
    - "requery cada turno"
    - "HILO + fresh evidence"
    - "GPT invoked"
    - "sin causalidad automática"

M9_boundary:
  status: "UNCHANGED"

  explicit_warning: >
    El comportamiento mensual M9 no se usa como fórmula del path diario.
    No documentar que M9 fue corregido.

preserved:
  - "daily_sales_deviation"
  - "action-person routing"
  - "natural follow-up inheritance"
  - "structured conversation state"
  - "pending_work_items_only"
  - "plant_diagnosis"
  - "financial_diagnosis"
  - "M9 monthly"
  - "M5/M6/M11/M12/M18"

deferred:
  - "mix/rate decomposition"
  - "channel analysis for discount"
  - "client economic tradeoff"
  - "structured competitor offer"
  - "SQL 017 environment activation"
  - "topic stack / return-to-topic"

test_evidence:
  focal_daily_discount: "21/21"
  combined_regression: "72/72"
  planner: "58/58"
  capabilities: "56/56"
  orchestrator: "28/28"
  director_ia_suite: "835/835"
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
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-DAILY-DISCOUNT-KG-SYNC-001.md"

  read_only:
    - "implemented runtime"
    - "tests"
    - "contracts"
    - "sql"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "contracts"
  - "SQL execution"
  - "schema"
  - "M9 changes"
  - "mix/rate"
  - "channel reconstruction"
  - "tradeoff implementation"
  - "percentage changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "daily_discount_deviation documented."
  - "Daily vs monthly boundary explicit."
  - "SUM(monto)/SUM(kg) documented."
  - "Pooled same-weekday 14d documented."
  - "Reconciled customer contribution documented."
  - "Highest ratio != biggest mover documented."
  - "No channel documented."
  - "Business evidence by cliente_key documented."
  - "Information gaps documented."
  - "Contribution != causality explicit."
  - "GPT/runtime boundary documented."
  - "M9 unchanged explicit."
  - "835/835 evidence recorded."
  - "No modules changed."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-006"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-DAILY-DISCOUNT-KG-SYNC-001.md