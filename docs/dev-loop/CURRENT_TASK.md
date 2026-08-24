# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar un slice read-only de M7 — IGF — para exponer al reasoning de
  Director IA la composición observada de una fila de igf.compromiso_lines,
  preservando unidades, signos, nulls, orden de presentación y semántica física,
  sin ejecutar recálculos de producto, sin overlay de folios, sin crear deltas
  temporales y sin convertir composición matemática en causalidad empresarial.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001.md"

  module: "M7 — IGF"
  state_before: "PARTIAL"
  state_after: "PARTIAL"

  global:
    numerator_before: 10.0
    denominator: 20
    percentage_before: 50.0
    numerator_after: 10.0
    percentage_after: 50.0
    gain_pp: 0.0

readiness_findings:
  physical_source: "igf.compromiso_lines"

  snapshot:
    loader: "loadIgfCommitSnapshot"
    query: "SELECT *"
    cardinality: >
      Una fila observada para una combinación físicamente resuelta de planta,
      versión y mes.

  current_gap: >
    El snapshot ya contiene compromiso_lines completo, pero el annex/context
    actual solo expone un subconjunto.

  order_deltas:
    role: "presentación UI"
    formula_role: false

  physical_formula:
    source: "recalcularUtilYResultado"

  formula_summary:
    - "suma margen"
    - "suma com_desc"
    - "suma depósito"
    - "resta cargo planta"
    - "luego resta corp"

  important_exclusions:
    - "gasto_kg no participa en la fórmula"
    - "snapshot no ejecuta recalcularUtilYResultado"
    - "snapshot no hace overlay de folios"

unit_semantics:
  rules:
    - "_kg significa $/kg, no kilogramos"
    - "ton != $/kg"
    - "$/kg != %"
    - "% != MXN"
    - "no sumar unidades incompatibles"
    - "no comparar magnitudes incompatibles como si fueran equivalentes"

null_semantics:
  rules:
    - "null != 0"
    - "no rellenar null con cero"
    - "no derivar faltantes"

sign_semantics:
  rules:
    - "preservar signo físico"
    - "no invertir hg_kg"
    - "no reinterpretar signo como juicio de negocio"

architecture:
  preferred_path: >
    igf_status / financial_diagnosis ->
    get_igf_snapshot ->
    loadIgfCommitSnapshot ->
    extractIgfComposition ->
    bloque de composición acotado ->
    evidencia ->
    respuesta

  requirements:
    - "in-process"
    - "read-only"
    - "sin HTTP interno"
    - "sin writes"
    - "sin recálculo de producto"
    - "sin overlay de folios"
    - "sin crear nuevos deltas"

composition_scope:
  included:
    - "line_key"
    - "line_label si existe"
    - "value"
    - "unit"
    - "sign/role físicamente soportado"
    - "order de presentación si aplica"
    - "subtotal/total solo si ya existe físicamente"
    - "source"

  excluded:
    - "causa"
    - "responsable"
    - "problema"
    - "mejora"
    - "prioridad"
    - "impacto causal"
    - "delta temporal nuevo"
    - "forecast inventado"

semantic_invariants:
  - "Composición != causalidad."
  - "Magnitud != importancia operacional."
  - "Signo matemático != juicio empresarial."
  - "Snapshot != tendencia."
  - "Línea != responsable."
  - "ORDER_DELTAS != fórmula."
  - "gasto_kg no entra a recalcularUtilYResultado."
  - "null != 0."
  - "No invertir hg_kg."
  - "No sumar unidades incompatibles."

m9_boundary:
  rules:
    - "M9 sigue siendo dominio de deltas temporales."
    - "Este slice no crea comparación entre periodos."
    - "No reinterpretar snapshot como tendencia."

context_policy:
  required:
    - "bloque acotado"
    - "orden determinista"
    - "límites de líneas derivados del shape real"
    - "preservar nulls"
    - "preservar precisión razonable"
    - "provenance"

planner_tools:
  planner:
    - "preservar igf_status"
    - "preservar financial_diagnosis"
    - "no crear colisión con M9"
    - "habilitar preguntas explícitas de composición"

  tools:
    - "reutilizar get_igf_snapshot si es suficiente"
    - "no crear tool duplicada si no hace falta"
    - "si se agrega helper interno, mantener executor existente"

  chat:
    - "incluir bloque de composición en evidencia/contexto"
    - "no inflar annex innecesariamente"
    - "no cambiar routing de M6/M9"

authz:
  model: "IGF vigente"
  required:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas si aplica"
    - "GA 403 según regla vigente"
    - "GV según regla vigente"
    - "cross-planta bloqueado"
    - "fail-closed"

response_policy:
  allowed_examples:
    - "Esta línea entra al cálculo con valor X."
    - "Estas son las partidas observadas en el snapshot."
    - "Dentro de la misma unidad, estas líneas tienen mayor magnitud."
    - "El snapshot contiene estas componentes."

  forbidden_examples:
    - "Esta línea causó la caída."
    - "Este es el principal problema."
    - "Esta partida es responsable del resultado."
    - "Esto empeoró por esta causa."

tests_required:
  focal:
    - "snapshot con compromiso_lines"
    - "snapshot sin compromiso_lines"
    - "una sola fila"
    - "preservar null"
    - "no null -> 0"
    - "unidades"
    - "_kg = $/kg"
    - "ton"
    - "%"
    - "MXN"
    - "no sumar unidades distintas"
    - "signos preservados"
    - "hg_kg no invertido"
    - "ORDER_DELTAS solo presentación"
    - "gasto_kg no entra a fórmula"
    - "formula metadata correcta"
    - "no ejecutar recalcularUtilYResultado"
    - "no overlay de folios"
    - "no causalidad"
    - "no prioridad inferida"
    - "no deltas temporales"
    - "M9 preservado"
    - "M6 preservado"
    - "igf_status preservado"
    - "financial_diagnosis preservado"
    - "authz"
    - "cross-planta"
    - "GA/GV"
    - "sin HTTP interno"
    - "sin writes"

  regression:
    - "capabilities"
    - "planner"
    - "tool orchestrator"
    - "suite Director IA completa"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-igf-arr.js"
    - "lib/director-ia-capabilities.js"
    - "scripts/test-director-ia-capabilities.js"
    - "test/director-ia-m7-igf-composition.test.js"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "test/**"
    - "scripts/**"
    - "sql/**"
    - "package.json"
    - "package-lock.json"

out_of_scope:
  - "modificar docs/director-ia/**"
  - "modificar capability matrix"
  - "modificar frontend"
  - "modificar SQL"
  - "crear migration"
  - "modificar schema"
  - "modificar contrato HTTP"
  - "ejecutar recalcularUtilYResultado"
  - "hacer overlay de folios"
  - "crear deltas M9"
  - "inventar causalidad"
  - "hacer writes"
  - "commit"
  - "push"
  - "merge"
  - "sync documental"
  - "NEXT_TASK"

acceptance_criteria:
  - "Director IA expone composición real de compromiso_lines."
  - "Se trabaja sobre una fila físicamente resuelta."
  - "No se ejecuta recalcularUtilYResultado."
  - "No se hace overlay de folios."
  - "ORDER_DELTAS se trata solo como presentación."
  - "Unidades se preservan."
  - "_kg se documenta/trata como $/kg."
  - "No se mezclan unidades incompatibles."
  - "Null se preserva."
  - "hg_kg no se invierte."
  - "gasto_kg no se presenta como componente de la fórmula si no lo es."
  - "No se crea causalidad."
  - "No se crean deltas temporales."
  - "M9 se preserva."
  - "Authz IGF se preserva."
  - "No HTTP interno."
  - "No writes."
  - "M7 permanece PARTIAL."
  - "10.0/20 = 50.0% permanece."
  - "Tests focales verdes."
  - "Regresión completa verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-m7-igf-composition.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M7-IGF-COMPOSITION-SYNC-001"

  rule: >
    La sync posterior documenta profundización dentro de M7 PARTIAL. No cambia
    10.0/20 = 50.0%.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "compromiso_lines"
    - "snapshot"
    - "ORDER_DELTAS"
    - "recalcularUtilYResultado"
    - "unidades"
    - "signos"
    - "null semantics"
    - "hg_kg"
    - "gasto_kg"
    - "M9 boundary"
    - "authz"
    - "context policy"
    - "composition vs causality"
    - "tests"
    - "M7 state"
    - "percentage"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si composición IGF queda expuesta read-only, in-process y
  semánticamente fiel. STOPPED si aparece contradicción con shape/unidades o
  fórmula física. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001.md"