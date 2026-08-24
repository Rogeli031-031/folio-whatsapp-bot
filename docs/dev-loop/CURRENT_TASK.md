# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-SYNC-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G5_contract_conformance: APPROVED
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación de Director IA con el first slice ya integrado
  de memoria conversacional persistente pending_work_items_only, documentando
  claramente la separación memory != current evidence, el requery/authz al
  retomar, el lifecycle del pendiente y el requisito operativo de aplicar
  sql/017_director_ia_pending_work_items.sql en cada entorno donde se quiera
  habilitar físicamente esta persistencia.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_capability:
  name: "persistent conversational memory — pending_work_items_only"

  purpose: >
    Permitir que Director IA recuerde entre sesiones qué investigación o brecha
    de información quedó pendiente y pueda retomarla posteriormente.

  product_boundary: >
    La memoria recuerda el TRABAJO PENDIENTE. No constituye evidencia actual
    ni una base paralela de verdad empresarial.

implemented_path: >
  conversación sesión A
    → structured_conversation_state
    → pending_information_gap objetivo
    → persist pending work item
    → arr.director_ia_pending_work_items
    → nueva conversación sesión B
    → detectar intención de retomar
    → recuperar pending work item
    → authz actual
    → planta actual
    → entidad revalidada
    → requery de fuentes actuales
    → structured_conversation_state efímero
    → HILO + evidencia fresca
    → OpenAI
    → respuesta

storage:
  schema: "arr"
  table: "arr.director_ia_pending_work_items"
  migration: "sql/017_director_ia_pending_work_items.sql"

  ownership:
    - "chat legado operativo"
    - "NO EKS"
    - "NO IES"
    - "NO Reasoning Engine/N5"

  persisted:
    - "user/scope"
    - "planta"
    - "entidad"
    - "parent intent"
    - "pending information gap"
    - "work-item status"
    - "timestamps/revalidation metadata"

  not_persisted:
    - "raw history"
    - "conversation transcript"
    - "assistant answers"
    - "user claims as facts"
    - "LLM hypotheses"
    - "evidence payloads"
    - "authorization snapshot"
    - "SOURCE_RESTRICTED as factual data"
    - "system/OpenAI prompts"

truth_boundary:

  memory:
    means: "qué quedó pendiente investigar"

  current_evidence:
    means: "qué es verdad actualmente en las fuentes empresariales"

  invariant: "MEMORY != CURRENT EVIDENCE"

  example_memory: >
    La última vez quedó pendiente conocer el motivo documentado de Arturo.

  forbidden_inference: >
    Arturo sigue sin comprar.

  rule: >
    La segunda afirmación requiere evidencia actual; no puede derivarse
    únicamente del pending work item.

resume_policy:

  mandatory:
    - "authz actual"
    - "planta actual"
    - "entidad revalidada"
    - "requery de fuentes actuales"
    - "SOURCE_RESTRICTED actual prevalece"
    - "current evidence prevalece sobre memory"

  desired_behavior: >
    La última vez dejamos pendiente X. Revisé nuevamente la información
    disponible y ahora...

cross_session_behavior:

  implemented: true

  canonical_scenario:
    day_1:
      - "¿Por qué dejó de comprar Arturo?"
      - "No hay evidencia suficiente."
      - "¿Qué falta?"

    close_session: true

    day_2_new_session:
      - "¿Qué pasó con Arturo?"

    expected:
      - "recuperar pending work item"
      - "revalidar scope"
      - "requery"
      - "responder con evidencia actual"

lifecycle:
  states:
    - "active"
    - "resolved"
    - "superseded"
    - "stale"
    - "dismissed"

  crucial_rule: >
    El status corresponde al WORK ITEM. No describe automáticamente el estado
    del cliente, acción o negocio.

isolation:
  required:
    - "no cross-user leakage"
    - "no cross-plant leakage"
    - "authz actual"
    - "planta actual"
    - "memory does not grant access"

relationship_with_ephemeral_continuity:

  ephemeral:
    purpose: "mantener hilo dentro de la sesión"

  persistent:
    purpose: "retomar pending work item entre sesiones"

  relationship: >
    La memoria persistente puede rehidratar contexto mínimo después de
    revalidación; no sustituye structured_conversation_state ni evidence loaders.

contract_boundary:
  gate: "AUDIT-DIRECTOR-IA-PERSISTENT-MEMORY-EKE-GATE-001"
  determination: "ALLOWED"
  G5: "APPROVED"

  notes:
    - "pending work item no es EKS Bundle"
    - "no es IES"
    - "no es Reasoning Run"
    - "no modifica Motor"
    - "no altera contratos congelados"

deployment_status:

  code_integrated: true
  schema_file_integrated: true

  runtime_requirement: >
    sql/017_director_ia_pending_work_items.sql debe aplicarse mediante el
    procedimiento operativo humano vigente en cada entorno que vaya a utilizar
    memoria persistente.

  rule: >
    No documentar que la persistencia está físicamente habilitada en un entorno
    hasta confirmar que SQL 017 fue aplicado allí.

  important_distinction:
    repository_capability: "IMPLEMENTED"
    environment_activation: "PENDING UNTIL SQL 017 APPLIED"

test_evidence:
  persistent_memory: "19/19 pass"
  conversational_continuity: "20/20 pass"
  director_ia_suite: "761/761 pass"
  git_diff_check: "clean"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"
  explanation: >
    La matriz mide cobertura funcional de módulos. Memoria conversacional no
    añade 0.5 a un módulo de la matriz.

deferred:
  - "full conversation history memory"
  - "conversation summaries"
  - "semantic long-term memory"
  - "persistent preferences"
  - "persistent executive decisions"
  - "validated-conclusion memory"
  - "multiple conversational topics"
  - "cross-session topic stack"
  - "EKS memory"
  - "IES/N5 memory integration"

product_principle_to_preserve: >
  La arquitectura proporciona datos, memoria, permisos, provenance y contexto
  confiables. GPT conserva el razonamiento conversacional. No programar en
  reglas determinísticas aquello que el modelo ya puede razonar, salvo que
  exista una necesidad concreta de seguridad, exactitud, autorización,
  reproducibilidad o cálculo determinístico.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-SYNC-001.md"

  read_only:
    - "implementation already integrated"
    - "sql/017_director_ia_pending_work_items.sql"
    - "tests"
    - "contracts"

out_of_scope:
  - "code"
  - "runtime"
  - "SQL execution"
  - "database mutation"
  - "tests"
  - "contract changes"
  - "EKS"
  - "IES"
  - "Reasoning Engine"
  - "new memory features"
  - "percentage changes"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Cross-session pending-work-item memory documented."
  - "Memory != current evidence explicit."
  - "Day 1 -> Day 2 behavior documented."
  - "Requery documented."
  - "Authz revalidation documented."
  - "Lifecycle documented."
  - "Isolation documented."
  - "No raw history documented."
  - "EKS/IES/N5 boundary documented."
  - "SQL 017 operational requirement explicit."
  - "Repository implemented != environment activated explicit."
  - "52.5% unchanged."
  - "No other module changed."
  - "Only three authorized files changed."
  - "git diff --check clean."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-SYNC-001.md