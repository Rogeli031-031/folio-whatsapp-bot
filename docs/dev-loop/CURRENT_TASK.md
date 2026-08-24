# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M11-COMMERCIAL-DOSSIER-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M11-COMMERCIAL-DOSSIER-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación/capability matrix de Director IA con el
  expediente comercial factual de M11 ya integrado en main, documentando la
  nueva capacidad de reunir estado comercial, comentarios, acciones DICF,
  historial y resultado_cierre por cliente, manteniendo M11 en PARTIAL y el
  baseline global en 10.0/20 = 50.0%.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001"
  implementation_report: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001.md"

  module: "M11 — DICF"
  state_before: "PARTIAL"
  state_after: "PARTIAL"

  global_before:
    numerator: 10.0
    denominator: 20
    percentage: 50.0

  global_after:
    numerator: 10.0
    denominator: 20
    percentage: 50.0

  gain_pp: 0.0

implemented_slice:
  path: >
    expediente_comercial -> get_commercial_dossier ->
    loadCommercialDossierForChat ->
    autorizar planta ->
    resolver cliente único ->
    estado comercial SELECT-only ->
    comentarios ->
    acciones DICF ->
    historial/cierre por acción ->
    recorte determinista ->
    evidencia con procedencia separada ->
    respuesta

  commercial_state_source: "arr.dicf_cliente_mes"
  action_source: "arr.dicf_acciones"

  identity:
    runtime_key:
      - "planta_id"
      - "cliente_key"

    rules:
      - "cliente debe resolverse de forma única"
      - "ambigüedad -> clarificación"
      - "no selección silenciosa"
      - "no join por nombre libre"

  select_only:
    - "no loadCommercialStateForChat si ejecuta computeDicf"
    - "no computeDicf"
    - "sin write/cache"
    - "sin HTTP interno"

  comments:
    - "solo cliente_key válido"
    - "cliente_key null no se une"
    - "no heurística por nombre"

  actions:
    - "planta_id + cliente_key"

  history_close:
    relation: "por action id"

context_policy:
  clients: 1
  comments: 8
  chars_per_comment: 500
  actions: 8
  history_events: 8
  truncation: "explícito"

provenance:
  sections:
    - "commercial_state"
    - "comments"
    - "dicf_actions"
    - "action_history"
    - "close_result"

semantic_boundaries:
  - "estado comercial != causa"
  - "comentario != motivo probado"
  - "comentario != diagnóstico"
  - "acción != solución"
  - "acción cerrada != exitosa"
  - "resultado_cierre != impacto causal"
  - "responsable de acción != responsable de desempeño"
  - "cronología != causalidad"
  - "correlación != causalidad"

authz:
  model: "DICF / commercial state vigente"

  rules:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas"
    - "cross-planta bloqueado"
    - "fail-closed"
    - "GA/GV según dominio vigente"
    - "autorización antes de consultar expediente"

routing_preserved:
  - "commercial_state"
  - "dicf_focused"
  - "client_analysis"
  - "Action Register"
  - "listas comerciales"

boundaries:
  excluded:
    - "bitácora dentro del expediente"
    - "Plaud"
    - "M2"
    - "PDF/S3"
    - "joins heurísticos"
    - "writes"
    - "cache writes"
    - "HTTP interno"
    - "inferencias causales"

test_evidence:
  focal_m11: "19/19 pass"
  capabilities: "50/50 pass"
  planner: "46/46 pass"
  orchestrator: "26/26 pass"
  director_ia_suite: "644/644 pass"
  git_diff_check: "clean"

documentation_policy:
  must_update:
    - "M11 permanece PARTIAL"
    - "expediente comercial factual disponible"
    - "path físico"
    - "arr.dicf_cliente_mes"
    - "arr.dicf_acciones"
    - "planta_id + cliente_key"
    - "cliente único"
    - "ambigüedad -> clarificación"
    - "comentarios null-key excluidos"
    - "historial/cierre por acción"
    - "límites 1/8/500/8/8"
    - "provenance separada"
    - "authz"
    - "routing preservado"
    - "no computeDicf/write-cache"
    - "fronteras semánticas"
    - "10.0/20 = 50.0% sin cambio"

  must_preserve:
    - "M11 = PARTIAL"
    - "M11 != COMPLETE"
    - "10.0/20"
    - "50.0%"
    - "ningún otro módulo cambia"

  forbidden:
    - "marcar M11 COMPLETE"
    - "sumar 0.5 nuevamente"
    - "subir porcentaje"
    - "documentar causalidad"
    - "documentar joins por nombre"
    - "documentar comentarios null-key como unidos"
    - "cambiar otro módulo"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M11-COMMERCIAL-DOSSIER-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-m11-commercial-dossier.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-m11-commercial-dossier.test.js"

out_of_scope:
  - "modificar código"
  - "modificar runtime"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL/schema"
  - "modificar contratos"
  - "integrar Plaud"
  - "integrar M2"
  - "integrar bitácora"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Implementación M11 dossier verificada físicamente en main."
  - "M11 permanece PARTIAL."
  - "M11 no se marca COMPLETE."
  - "Expediente comercial queda documentado."
  - "Cliente único queda documentado."
  - "Ambigüedad/clarificación queda documentada."
  - "SELECT-only queda documentado."
  - "No computeDicf/write-cache queda documentado."
  - "cliente_key derivado queda documentado."
  - "Comentarios null-key quedan excluidos."
  - "No join por nombre queda documentado."
  - "Historial/cierre por acción queda documentado."
  - "Límites 1/8/500/8/8 quedan documentados."
  - "Provenance separada queda documentada."
  - "Fronteras semánticas quedan documentadas."
  - "Routing preservado queda documentado."
  - "Authz queda documentada."
  - "10.0/20 permanece."
  - "50.0% permanece."
  - "Ningún otro módulo cambia."
  - "No código/runtime/tests."
  - "Solo los tres archivos autorizados cambian."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006"

  rule: >
    Volver a priorizar globalmente desde 50.0%. No continuar M11 por inercia y
    no asumir que M7 gana por haber quedado segundo.

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M11-COMMERCIAL-DOSSIER-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "implementación verificada"
    - "path físico"
    - "client resolution"
    - "identity/join"
    - "commercial state source"
    - "comments"
    - "dicf actions"
    - "history/close"
    - "context limits"
    - "provenance"
    - "authz"
    - "routing"
    - "semantic boundaries"
    - "SELECT-only"
    - "no computeDicf/cache write"
    - "tests"
    - "M11 PARTIAL"
    - "10.0/20 = 50.0%"
    - "cambios exactos en matriz"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la matriz documenta correctamente el expediente
  comercial manteniendo M11 PARTIAL y 10.0/20 = 50.0%. STOPPED si contradice
  el runtime físico. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M11-COMMERCIAL-DOSSIER-SYNC-001.md"