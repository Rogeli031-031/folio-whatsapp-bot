# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-SYNC-001
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
  retorno de tema intra-sesión: precedencia de standalone intent y exactamente
  un previous_frame efímero, sin topic stack, sin memoria persistente para
  navegación y siempre con revalidación y requery.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  name: "intra_session_topic_return"
  strategy: "B — standalone precedence + exactly one previous_frame"

implemented_flow: >
  conversación actual
    → nuevo standalone intent
    → current frame mínimo pasa a previous_frame
    → nuevo tema se vuelve current
    → retorno autocontenido: standalone intent gana
    → retorno implícito: previous_frame compatible
    → revalidación
    → requery
    → HILO + evidencia fresca
    → GPT

standalone_precedence:
  rule: >
    Un standalone intent válido no se descarta por lenguaje de navegación como
    “volvamos” o “retomemos”.

  canonical_example:
    text: "Volvamos a la venta de ayer."
    planner: "daily_sales_deviation 0.92"
    behavior: "daily_sales_deviation executes"

previous_frame:
  count: 1
  persistence: "ephemeral / intra-session only"

  contains_only:
    - "parent_intent"
    - "active_entity reference/key"
    - "active_date"
    - "last_evidence_bundle_type"
    - "pending_information_gap"
    - "plant scope reference"

  never_contains:
    - "raw evidence"
    - "DB rows"
    - "assistant answers"
    - "raw transcript"
    - "user prose as business fact"
    - "authz snapshot"

  invariant: >
    Cada switch standalone reemplaza previous_frame. No existe topic stack.

self_contained_return:
  examples:
    - "Volvamos a la venta de ayer."
    - "Retomemos la acción de Julio Pérez."

  rule: >
    Si el turno actual contiene contexto suficiente, no depende del frame previo.

implicit_return:
  examples:
    - "Volvamos a Arturo."
    - "Retomemos la acción."
    - "Volvamos a Puebla."

  rule: >
    Puede restaurar previous_frame solo si es compatible y suficiente.
    Sin frame seguro, clarifica.

restore_semantics:
  mandatory:
    - "current authz"
    - "current plant scope"
    - "entity revalidation"
    - "date revalidation"
    - "fresh requery"
    - "current evidence wins"

  invariant: >
    Restaurar contexto no significa restaurar hechos.

entity_safety:
  rules:
    - "entity reference may be restored"
    - "entity facts are not restored"
    - "entity is re-resolved/revalidated"
    - "ambiguity clarifies"
    - "plant incompatibility invalidates"

date_safety:
  rules:
    - "current explicit date wording wins"
    - "ayer preserves America/Mexico_City semantics"
    - "date is not persistent cross-session"

action_safety:
  rules:
    - "Action Register is requeried"
    - "0/1/N semantics preserved"
    - "no silent action pick"
    - "no invented reason for delay"

natural_followup:
  strategy: "B"
  preserved: true

  rule: >
    Después de restaurar un tema, un follow-up natural unknown puede heredar el
    estado restaurado y llegar a GPT con evidencia fresca.

persistent_memory_boundary:
  pending_work_items_only: "cross-session pending work"
  previous_frame: "intra-session navigation"

  invariant: >
    Persistent memory is not used for topic navigation.

history_boundary:
  rule: >
    History puede aportar señal conversacional, pero no constituye evidencia ni
    truth store empresarial.

reasoning_boundary:
  runtime:
    - "standalone precedence"
    - "frame capture"
    - "frame restore"
    - "scope"
    - "identity"
    - "date"
    - "authz"
    - "requery"
    - "provenance"

  GPT:
    - "interpretation"
    - "synthesis"
    - "explanation"
    - "follow-up"
    - "information-gap wording"

known_limit:
  rule: >
    Solo existe un previous_frame. Un retorno que requiera recuperar de forma
    implícita un tema más antiguo no se resuelve silenciosamente.

  behavior: "clarify rather than guess"

document_examples:
  - >
    venta ayer → descuento/kg → “Volvamos a la venta de ayer” → venta fresca
  - >
    Puebla → Arturo → venta ayer → “Volvamos a Arturo” → revalidar + requery
  - >
    acción Julio → Puebla → “Retomemos la acción” → AR fresco
  - >
    Puebla → presupuesto → “Volvamos a Puebla” → plant evidence fresco

preserved:
  - "daily_sales_deviation"
  - "daily_discount_deviation"
  - "action-person routing"
  - "natural follow-up inheritance"
  - "structured conversation state"
  - "pending_work_items_only"
  - "plant_diagnosis"
  - "financial_diagnosis"
  - "M9"

not_implemented:
  - "topic stack"
  - "more than one previous frame"
  - "persistent topic memory"
  - "semantic conversational memory"
  - "raw history as evidence"

test_evidence:
  focal_topic_return: "19/19"
  director_ia_suite: "854/854"
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
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-SYNC-001.md"

out_of_scope:
  - "code"
  - "tests"
  - "runtime"
  - "contracts"
  - "SQL"
  - "schema"
  - "matrix changes"
  - "topic stack"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Standalone precedence documented."
  - "Exactly one previous_frame documented."
  - "No topic stack explicit."
  - "Frame fields and prohibitions documented."
  - "Self-contained vs implicit return documented."
  - "Revalidation/requery documented."
  - "Entity/date/action safety documented."
  - "Persistent memory boundary documented."
  - "Natural follow-up after return documented."
  - "One-frame limitation explicit."
  - "854/854 evidence recorded."
  - "No module coverage change."
  - "52.5% preserved."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-007"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-INTRA-SESSION-TOPIC-RETURN-SYNC-001.md