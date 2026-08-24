# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente un slice read-only de M7 — IGF — para que Director IA
  pueda exponer al reasoning la composición real de igf.compromiso_lines ya
  cargada por loadIgfCommitSnapshot pero actualmente omitida del annex/context,
  preservando unidades, signos, orden y semántica física, sin convertir
  composición matemática o contable en causalidad empresarial.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006.md"

  module: "M7 — IGF"
  current_state: "PARTIAL"

  current_behavior:
    - "IGF ya se consulta on-demand"
    - "loadIgfCommitSnapshot usa SELECT *"
    - "el row completo incluye compromiso_lines"
    - "annex/context actual solo imprime subconjunto"
    - "M9 ya cubre deltas comerciales por periodo"

  global_percentage:
    current: 50.0
    numerator: 10.0
    denominator: 20

  expected_effect_of_future_slice:
    state: "PARTIAL"
    gain_pp: 0.0
    percentage: 50.0

primary_question: >
  ¿Existe un path read-only, in-process y semánticamente seguro para que
  Director IA incorpore igf.compromiso_lines al contexto de razonamiento,
  permitiendo explicar la composición observable de compromiso/utilidad/
  resultado sin afirmar causalidad no soportada?

known_baseline:
  loader: "loadIgfCommitSnapshot"
  source: "igf.compromiso_lines"

  related_logic:
    - "ORDER_DELTAS"
    - "recalcularUtilYResultado"

  current_gap: >
    compromiso_lines ya está disponible en el snapshot físico, pero el
    annex/context de Director IA no la expone de forma completa.

mandatory_audit:

  canonical_definition:
    required:
      - "leer ficha M7 vigente"
      - "confirmar estado PARTIAL"
      - "confirmar que este slice profundiza PARTIAL"
      - "confirmar 0.0 pp"

  physical_shape:
    inspect:
      - "loadIgfCommitSnapshot"
      - "SELECT *"
      - "igf.compromiso_lines"
      - "shape real de compromiso_lines"
      - "keys/códigos"
      - "labels"
      - "valores"
      - "nulls"
      - "tipos numéricos"
      - "orden"

    determine:
      - "qué campos son observados"
      - "qué campos son derivados"
      - "si hay arrays/objetos"
      - "si hay líneas opcionales"
      - "si hay duplicados"

  order_semantics:
    inspect:
      - "ORDER_DELTAS"
      - "orden usado en UI"
      - "orden usado en cálculos"

    determine:
      - "si ORDER_DELTAS es semántico o solo visual"
      - "si debe preservarse en Director IA"
      - "si hay líneas fuera de ORDER_DELTAS"

  formula_semantics:
    inspect:
      - "recalcularUtilYResultado"
      - "fórmulas"
      - "qué líneas suman/restan"
      - "signos"
      - "unidades"
      - "redondeos"
      - "tratamiento de null"

    determine:
      - "qué total puede recomponerse"
      - "qué subtotal existe"
      - "qué relación matemática es verificable"
      - "qué NO debe reinterpretarse"

  units_and_signs:
    required:
      - "identificar unidad por línea"
      - "distinguir pesos/kg/ton/%/otras"
      - "preservar signos"
      - "no comparar magnitudes incompatibles"
      - "no sumar unidades distintas"

  composition_semantics:
    allowed:
      - "esta línea aporta X al cálculo"
      - "esta línea entra con signo positivo/negativo"
      - "estas son las líneas de mayor magnitud dentro de la misma unidad"
      - "este resultado se compone matemáticamente de estas partidas si la fórmula lo soporta"

    forbidden:
      - "esta línea causó la caída"
      - "esta línea explica el negocio"
      - "este concepto es el responsable"
      - "esto ocurrió por culpa de"
      - "la línea más grande es el principal problema"

    rule: >
      Composición matemática/contable != causalidad operacional.

  comparison_semantics:
    determine:
      - "si compromiso_lines es snapshot de un periodo"
      - "si existen líneas comparables entre periodos"
      - "qué necesita M9"
      - "qué no debe duplicarse"

    rule: >
      No crear nuevos deltas temporales si la fuente del slice es solo snapshot.
      No duplicar M9 sin evidencia.

  annex_context:
    inspect:
      - "annex actual IGF"
      - "context builder"
      - "summarizers"
      - "qué campos ya imprime"
      - "qué campos omite"

    determine:
      - "bloque mínimo de composición"
      - "cómo no inflar contexto"
      - "cómo mantener provenance"

  planner_tools:
    inspect:
      - "igf_status"
      - "financial_diagnosis"
      - "tools IGF"
      - "executor"
      - "chat routing"

    determine:
      - "si se reutiliza intent existente"
      - "si hace falta sub-intent composition"
      - "qué preguntas nuevas habilitar"
      - "qué consultas deben seguir en M9/M6"

  authz:
    determine:
      - "JWT/contexto"
      - "rol"
      - "planta_id"
      - "plantas_permitidas"
      - "GA/GV"
      - "cross-planta"
      - "fail-closed"
      - "authz actual IGF"

  context_policy:
    required:
      - "máximo de líneas"
      - "orden"
      - "recorte determinista"
      - "null handling"
      - "precision/redondeo"
      - "provenance"

    rule: >
      No cargar una estructura ilimitada si compromiso_lines puede crecer.

architecture_hypothesis:
  preferred_path: >
    igf_status / financial_diagnosis ->
    get_igf_snapshot ->
    loadIgfCommitSnapshot ->
    extractIgfComposition(compromiso_lines) ->
    bloque de composición acotado ->
    evidencia -> respuesta

  requirements:
    - "in-process"
    - "read-only"
    - "sin HTTP interno"
    - "sin writes"
    - "sin contrato nuevo"
    - "sin duplicar M9"

response_contract:
  include_if_physically_supported:
    - "planta_id"
    - "periodo"
    - "line_key"
    - "line_label"
    - "value"
    - "unit"
    - "sign/role"
    - "order"
    - "subtotal/total relacionado"
    - "source"

  forbidden:
    - "causa"
    - "responsable"
    - "problema"
    - "mejora"
    - "prioridad"
    - "impacto causal"
    - "delta temporal inventado"

semantic_invariants:
  - "Composición != causalidad."
  - "Magnitud != importancia operacional."
  - "Signo matemático != juicio empresarial."
  - "Snapshot != tendencia."
  - "Línea != responsable."
  - "No sumar unidades incompatibles."
  - "No inventar línea faltante."
  - "No inventar porcentaje."

mandatory_evidence_table:
  columns:
    - "line_or_surface"
    - "physical_source"
    - "shape"
    - "unit"
    - "sign"
    - "formula_role"
    - "order"
    - "observed_or_derived"
    - "safe_for_reasoning"
    - "risk"
    - "evidence"

mandatory_gap_table:
  columns:
    - "gap_id"
    - "missing_capability"
    - "required_for_slice"
    - "reusable_component"
    - "proposed_change"
    - "architecture_change"
    - "contract_change"
    - "authz_change"
    - "complexity"
    - "blocking"

tests_to_design_if_ready:
  - "snapshot con compromiso_lines"
  - "snapshot sin compromiso_lines"
  - "líneas null"
  - "orden"
  - "signos"
  - "unidades"
  - "líneas positivas"
  - "líneas negativas"
  - "base cero"
  - "no sumar unidades distintas"
  - "recomposición de subtotal si físicamente soportada"
  - "no causalidad"
  - "no responsable"
  - "no prioridad inferida"
  - "intent IGF preservado"
  - "M6 preservado"
  - "M9 preservado"
  - "authz"
  - "cross-planta"
  - "GA/GV"
  - "sin HTTP interno"
  - "sin writes"

decision_rules:

  ready:
    all:
      - "compromiso_lines físicamente disponible"
      - "shape verificable"
      - "unidades/signos verificables"
      - "ORDER_DELTAS entendible"
      - "fórmulas físicamente verificables"
      - "annex/context ampliable sin contrato nuevo"
      - "authz preservable"
      - "contexto acotable"
      - "sin duplicar M9"
      - "tests determinísticos"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-M7-IGF-COMPOSITION-001"

  stopped:
    when:
      - "shape ambiguo"
      - "unidades no identificables"
      - "fórmulas inconsistentes"
      - "compromiso_lines requiere writes"
      - "semántica requiere contrato nuevo"

    outcome: "STOPPED"
    next_task: null

state_and_percentage:
  current_task:
    state_change: false
    percentage_change: false

  if_future_impl_succeeds:
    m7_state: "PARTIAL"
    numerator: 10.0
    denominator: 20
    percentage: 50.0
    gain_pp: 0.0

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001.md"

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
  - "implementar"
  - "modificar código"
  - "modificar runtime"
  - "modificar frontend"
  - "modificar tests"
  - "modificar SQL"
  - "modificar capability matrix"
  - "modificar contratos"
  - "inventar causalidad"
  - "crear deltas M9"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó definición canónica M7."
  - "Se verificó compromiso_lines."
  - "Se verificó shape."
  - "Se verificó ORDER_DELTAS."
  - "Se verificó recalcularUtilYResultado."
  - "Se verificaron unidades."
  - "Se verificaron signos."
  - "Se verificó semántica de fórmula."
  - "Se auditó annex/context."
  - "Se verificó planner/tools."
  - "Se verificó authz."
  - "Se definió política de contexto."
  - "Se separó composición de causalidad."
  - "Se separó M7 de M9."
  - "Se diseñaron tests."
  - "Se determinó G2."
  - "Se determinó G3."
  - "M7 sigue PARTIAL."
  - "50.0% no cambia."
  - "No se implementó."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "definición canónica M7"
    - "compromiso_lines shape"
    - "ORDER_DELTAS"
    - "recalcularUtilYResultado"
    - "units"
    - "signs"
    - "formula semantics"
    - "composition vs causality"
    - "annex/context"
    - "planner/tools"
    - "authz"
    - "context policy"
    - "M9 boundary"
    - "evidence table"
    - "gap table"
    - "implementation hypothesis"
    - "tests"
    - "gates"
    - "state after future slice"
    - "percentage"
    - "risks"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si compromiso_lines puede exponerse al reasoning de forma
  segura y físicamente fiel. STOPPED si shape/unidades/fórmulas son ambiguos.
  BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M7-IGF-COMPOSITION-READINESS-001.md"