# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-SYNC-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación con structured_conversation_state ya integrado
  en el chat legado, dejando explícita la continuidad conversacional efímera
  dentro de la sesión y delimitándola de la memoria persistente/cross-session,
  que permanece pendiente.

baseline:
  global: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

implemented_path: >
  turno actual
    → structured_conversation_state
    → parent_intent / planta_id / active_entity / bundle_type / pending_gap
    → requery de evidencia
    → HILO conversacional
    → OpenAI
    → respuesta

must_document:

  conversational_continuity:
    - "structured_conversation_state efímero"
    - "sin DB"
    - "sin persistencia cross-session"
    - "parent_intent"
    - "planta_id desde request autorizado"
    - "máximo una active_entity"
    - "last_evidence_bundle_type"
    - "pending_information_gap"

  followups:
    - "¿Qué te llama la atención?"
    - "¿Por qué?"
    - "¿Y Arturo?"
    - "¿Qué sabemos de él?"
    - "¿Tiene alguna acción?"
    - "¿Qué falta saber?"

  planner_behavior:
    - "follow-up defendible puede heredar parent_intent"
    - "unknown sin estado válido no cae al Action Register"
    - "standalone queries siguen clasificándose normalmente"

  entity:
    - "resolución única dentro de planta actual"
    - "ambigüedad -> clarificación"
    - "sin fuzzy match silencioso"
    - "cambio de planta invalida entidad"

  evidence:
    - "requery cada turno"
    - "authz cada turno"
    - "history != evidence"
    - "assistant prior claim != fact"
    - "user prior claim != DB fact"
    - "SOURCE_RESTRICTED preservado"

  information_gap:
    - "pending gap derivado de evidencia fresca"
    - "persona solo si existe vínculo físico"
    - "no inventar responsable"
    - "puede explicar qué información falta y para qué sirve"

  openai:
    - "recibe HILO conversacional"
    - "no recibe history crudo como evidencia"
    - "el razonamiento permanece en GPT"
    - "la infraestructura conserva contexto y verdad"

  security:
    - "sin cross-plant leakage"
    - "plant switch invalida entidad/gap"
    - "authz revalidada"
    - "history no puede promover claims a hechos"

memory_boundary:

  implemented_now:
    name: "continuidad conversacional efímera"
    scope:
      - "misma conversación/sesión activa"
      - "estado mínimo estructurado"
      - "sin persistencia DB"

  explicitly_pending:
    name: "memoria persistente entre conversaciones"
    examples:
      - "recordar asuntos pendientes al volver otro día"
      - "recordar una brecha de información entre sesiones"
      - "recordar decisiones/conclusiones validadas"
      - "recordar temas en seguimiento"

    rules_for_future_audit:
      - "memoria != evidencia actual"
      - "recordar contexto no significa asumir que sigue vigente"
      - "datos empresariales deben revalidarse"
      - "no guardar cualquier frase automáticamente"
      - "no usar historial completo como memoria"
      - "definir qué merece persistir"
      - "definir vigencia y obsolescencia"
      - "preservar provenance"
      - "preservar authz"

deferred:
  - "cross-session memory"
  - "persistent conversation memory"
  - "long-term memory"
  - "topic stack"
  - "volver a tema anterior"
  - "period continuity"
  - "multiple active entities"
  - "raw history selective injection"
  - "daily deviation engine"
  - "explanation of deviations"
  - "evidence-gap workflow persistence"

test_evidence:
  focal: "20/20 pass"
  director_ia_suite: "742/742 pass"
  capabilities: "56 pass"
  planner: "49 pass"
  orchestrator: "26 pass"
  git_diff_check: "clean"

state_policy:
  - "ningún módulo cambia"
  - "10.5 / 20 = 52.5%"
  - "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-SYNC-001.md"

  read_only:
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-conversation-state.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "test/director-ia-conversational-continuity.test.js"

out_of_scope:
  - "código"
  - "runtime"
  - "tests"
  - "contratos"
  - "DB"
  - "memoria persistente"
  - "cross-session memory"
  - "cambiar porcentaje"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Continuidad conversacional efímera documentada."
  - "Estado mínimo documentado."
  - "Follow-ups documentados."
  - "Requery y authz documentados."
  - "History != evidence documentado."
  - "Pending information gap documentado."
  - "Plant switch seguro documentado."
  - "Memoria efímera != memoria persistente documentado."
  - "Cross-session memory queda explícitamente pendiente."
  - "No se atribuye memoria persistente al runtime actual."
  - "Ningún módulo cambia."
  - "52.5% permanece."
  - "Solo tres archivos autorizados cambian."
  - "git diff --check limpio."

next_task:
  propose_only: "ARCH-DIRECTOR-IA-PERSISTENT-CONVERSATIONAL-MEMORY-READINESS-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-CONVERSATIONAL-CONTINUITY-SYNC-001.md