# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-ACTION-PERSON-ROUTING-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo DOCS-DIRECTOR-IA-ACTION-PERSON-ROUTING-SYNC-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación de Director IA con el runtime ya integrado de
  consultas Action Register por responsable/acción, documentando la estrategia C,
  la precedencia AR sobre resume genérico de memoria, la resolución 0/1/N de
  acciones y los límites de verdad respecto a responsabilidad, culpa y motivo
  de retraso.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  strategy: "C — strengthen existing AR intents"
  canonical_parent_intent: "action_status"

implemented_path: >
  pregunta natural sobre acción/responsable
    → planner
    → action_status
    → resolución física de responsable
    → Action Register board
    → 0 / 1 / N acciones
    → status / fecha / vencimiento / historial-resultado si existe
    → limitations + provenance
    → HILO
    → GPT

routing:
  document:
    - "accion singular y acciones plural cubiertas"
    - "acción + responsable puede rutear a action_status"
    - "action_status es inheritable"
    - "consulta empresarial AR específica gana sobre resume genérico de memoria"
    - "persistent memory permanece activa para casos reales de resume"

memory_precedence:
  example_AR: "¿Qué pasó con la acción de Julio Pérez?"
  expected_AR: "Action Register"

  example_memory: "¿Qué pasó con Arturo?"
  expected_memory: >
    Persistent memory puede participar cuando no existe un intent empresarial
    más específico.

  principle: >
    Business intent específico > generic memory resume.

responsible_resolution:
  rules:
    - "responsable se resuelve físicamente dentro del board/scope actual"
    - "sin fuzzy silencioso"
    - "ambigüedad -> clarificación"
    - "responsable registrado de acción != responsable del problema"
    - "responsable registrado != culpable"

action_selection:
  zero:
    behavior: "informar ausencia de acciones asociadas en el scope consultado"

  one:
    behavior: "puede cargarse directamente"

  many:
    behavior: >
      listar/acotar/clarificar; nunca seleccionar una acción silenciosamente.

  invariant: "0 / 1 / N seguro"

action_evidence:
  document_if_physical:
    - "action_id"
    - "título/tema"
    - "status"
    - "responsable"
    - "fecha compromiso"
    - "vencida sí/no"
    - "última actualización"
    - "historial"
    - "resultado_cierre"
    - "provenance"

  rule: >
    Historial/resultado solo si existen físicamente.

truth_boundaries:
  facts_allowed:
    - "acción abierta/cerrada si lo registra la fuente"
    - "fecha de compromiso"
    - "acción vencida si se deriva físicamente"
    - "responsable registrado"
    - "existe/no existe actualización registrada"
    - "existe/no existe resultado de cierre"

  prohibited_without_evidence:
    - "Julio no la cerró porque no dio seguimiento"
    - "Julio incumplió"
    - "Julio causó el atraso"
    - "Julio causó el problema"
    - "la acción falló"
    - "la acción no funcionó"

  principle: >
    Vencimiento/estado son evidencia del registro. Motivo del retraso requiere
    evidencia adicional.

information_gap:
  canonical_followup: "¿Por qué no la cerró?"

  expected_behavior: >
    Si no existe explicación registrada, GPT recibe status, fecha, vencimiento,
    responsable, actualización disponible y limitation explícita para poder
    decir naturalmente que no conoce el motivo y qué información falta.

  safe_language:
    - "no encuentro una explicación registrada del retraso"
    - "falta una actualización de la acción"
    - "falta saber si existe un bloqueo"
    - "falta resultado/fecha actualizada si corresponde"

  person_boundary: >
    El responsable puede mencionarse como fuente de actualización únicamente
    porque está físicamente ligado a la acción.

conversation:
  parent_intent: "action_status"

  canonical_flow:
    - "¿Qué pasó con la acción de Julio Pérez?"
    - "¿Está vencida?"
    - "¿Por qué no la cerró?"
    - "¿Lo sabemos?"
    - "¿Qué información falta?"
    - "¿Qué necesitas de Julio?"

  runtime_behavior:
    - "natural follow-up strategy B preservada"
    - "requery por turno"
    - "fresh AR evidence"
    - "GPT formula respuesta"
    - "sin blame"

anti_phrasebook:
  document:
    - "sin intent nuevo"
    - "sin hardcode de Julio"
    - "sin hardcode de 'qué pasó con la acción de'"
    - "sin lista de responsables"
    - "sin phrasebook nuevo"

  principle: >
    La solución aprovecha la semántica de Action Register existente y la
    resolución física del responsable.

preserved:
  - "responsible_lookup"
  - "overdue_actions"
  - "Action Register actual"
  - "natural follow-up inheritance"
  - "persistent conversational memory"
  - "daily_sales_deviation"
  - "plant_diagnosis"
  - "financial_diagnosis"
  - "M5"
  - "M6"
  - "M11"
  - "M12"
  - "M18"

deferred:
  - "daily discount/kg"
  - "SQL 017 environment activation"
  - "person performance scoring"
  - "client-level economic tradeoff"
  - "before-action-after effectiveness/causality"

test_evidence:
  focal_action_person: "19/19"
  planner: "57/57"
  capabilities: "56/56"
  orchestrator: "27/27"
  director_ia_suite: "814/814"
  git_diff_check: "clean"

historical_test_note:
  issue: "multiple-actions case returned action_id=0 instead of null"
  status: "CORRECTED"
  current_evidence: "814/814"
  pending: "none"

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
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-ACTION-PERSON-ROUTING-SYNC-001.md"

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
  - "daily discount"
  - "percentage changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Strategy C documented."
  - "action_status canonical parent documented."
  - "accion/acciones routing documented."
  - "AR > generic memory resume documented."
  - "responsible resolution documented."
  - "0/1/N action behavior documented."
  - "no silent action selection documented."
  - "responsible != culprit documented."
  - "delay reason not invented documented."
  - "natural followups documented."
  - "historical action_id=0 failure marked corrected."
  - "814/814 current evidence recorded."
  - "no module changes."
  - "52.5% preserved."
  - "only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-ACTION-PERSON-ROUTING-SYNC-001.md