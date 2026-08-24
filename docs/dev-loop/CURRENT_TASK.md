# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación/capability matrix con la composición IGF de M7
  ya integrada en main, documentando el bloque observado de compromiso_lines,
  sus unidades, signos, nulls y fronteras semánticas, sin ampliar la capacidad
  a causalidad, tendencias o nuevos deltas.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001"
  implementation_report: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001.md"

  module: "M7 — IGF"
  state_before: "PARTIAL"
  state_after: "PARTIAL"

  global_before: "10.0 / 20 = 50.0%"
  global_after: "10.0 / 20 = 50.0%"
  gain_pp: 0.0

implemented_path: >
  igf_status / financial_diagnosis ->
  get_igf_snapshot ->
  loadIgfCommitSnapshot ->
  extractIgfComposition ->
  bloque acotado ->
  evidencia ->
  respuesta

must_document:
  source:
    - "igf.compromiso_lines"
    - "una fila: planta + versión + mes"

  units:
    - "*_kg = $/kg, no kilogramos"
    - "ton, $/kg, %, MXN son unidades distintas"
    - "no mezclar ni sumar unidades incompatibles"

  nulls:
    - "null != 0"
    - "null se preserva"

  signs:
    - "signo físico preservado"
    - "hg_kg no se invierte"

  formula:
    - "recalcularUtilYResultado es referencia semántica de fórmula"
    - "no se ejecuta desde este slice"
    - "gasto_kg no participa en esa fórmula"
    - "snapshot no hace overlay de folios"

  order:
    - "ORDER_DELTAS es presentación"
    - "ORDER_DELTAS no es fórmula"

  semantics:
    - "composición != causalidad"
    - "magnitud != importancia operacional"
    - "línea != responsable"
    - "snapshot != tendencia"
    - "signo != juicio empresarial"

  m9_boundary:
    - "M9 conserva los deltas temporales"
    - "M7 composition no crea deltas nuevos"

  runtime:
    - "read-only"
    - "in-process"
    - "sin HTTP interno"
    - "sin writes"

  authz:
    - "preservar authz IGF vigente"
    - "GA 403 según regla vigente"
    - "GV según regla vigente"
    - "cross-planta bloqueado"
    - "fail-closed"

test_evidence:
  focal: "13/13 pass"
  capabilities: "52/52 pass"
  planner: "46/46 pass"
  orchestrator: "26/26 pass"
  suite: "657/657 pass"
  git_diff_check: "clean"

state_policy:
  - "M7 permanece PARTIAL"
  - "M7 != COMPLETE"
  - "no sumar 0.5 nuevamente"
  - "10.0/20 = 50.0%"
  - "ningún otro módulo cambia"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/**"
    - "test/**"
    - "scripts/**"

out_of_scope:
  - "código"
  - "runtime"
  - "tests"
  - "frontend"
  - "SQL/schema"
  - "contratos"
  - "recalcular producto"
  - "overlay de folios"
  - "deltas nuevos"
  - "causalidad"
  - "commit"
  - "push"
  - "merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Implementación M7 verificada físicamente."
  - "Composición IGF documentada."
  - "Unidades documentadas correctamente."
  - "Null semantics documentada."
  - "Signos documentados."
  - "hg_kg no invertido."
  - "gasto_kg fuera de fórmula."
  - "ORDER_DELTAS documentado solo como presentación."
  - "No ejecución de recalcularUtilYResultado documentada."
  - "No overlay documentado."
  - "Composición separada de causalidad."
  - "M9 preservado como dominio de deltas."
  - "M7 permanece PARTIAL."
  - "M7 no COMPLETE."
  - "10.0/20 = 50.0%."
  - "Ningún otro módulo cambia."
  - "Solo tres archivos autorizados modificados."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007"
  rule: >
    Repriorizar globalmente desde 50.0%. No asumir M5 por haber sido segundo
    en la priorización anterior.

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001.md"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la matriz queda fiel al runtime integrado.
  STOPPED si existe contradicción física.
  BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001.md"