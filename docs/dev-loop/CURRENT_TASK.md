# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente el gap transversal de financial_diagnosis para determinar
  si Director IA puede ejecutar y ensamblar en una misma corrida de razonamiento
  evidencia de IGF, ARR y deltas M9, preservando provenance, authz, planta,
  periodos, ausencia/error y semántica no causal, sin reabrir IES ni Reasoning
  Engine y sin modificar contratos.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008.md"

  transversal_capability: "financial_diagnosis evidence assembly"

  global:
    numerator: 10.5
    denominator: 20
    percentage: 52.5
    expected_gain_pp: 0.0

known_gap:
  planner: >
    financial_diagnosis ya declara uso de múltiples dominios/evidencias.

  tool_plan: >
    El plan ya contempla loaders de IGF, ARR y deltas M9.

  runtime: >
    El chat no ensambla esas evidencias en una sola corrida; puede hacer
    early-return por intent o terminar enviando solo anexo IGF al modelo.

  contract_implication: >
    El gap parece ser de wiring/runtime/context assembly, no de contrato IES o
    Reasoning Engine.

primary_question: >
  ¿Existe un path in-process, read-only, autorizado y conforme al contrato
  vigente para que financial_diagnosis ejecute IGF + ARR + M9 en una sola
  corrida, preserve provenance por fuente y entregue un paquete de evidencia
  multi-dominio al reasoning sin inventar causalidad ni ocultar ausencias/errores?

mandatory_audit:

  planner:
    inspect:
      - "intent financial_diagnosis"
      - "dominios declarados"
      - "evidence plan"
      - "clarification"
      - "confidence"
      - "routing priority"

    determine:
      - "qué fuentes exige realmente el planner"
      - "si son obligatorias u opcionales"
      - "qué periodo/planta solicita cada una"
      - "cómo se representa source/evidence"

  tool_orchestrator:
    inspect:
      - "tool plan para financial_diagnosis"
      - "get_igf_snapshot"
      - "ARR loader/tool"
      - "M9 delta tools/loaders"
      - "executor ordering"
      - "failure behavior"
      - "partial success behavior"

    determine:
      - "si puede ejecutar múltiples tools en una corrida"
      - "si hoy corta después de la primera"
      - "si existen dependencias entre tools"
      - "cómo preservar resultados separados"

  chat_runtime:
    inspect:
      - "askDirectorIa"
      - "early returns"
      - "focused modes"
      - "annex IGF"
      - "context builders"
      - "OpenAI call"
      - "source inference"

    determine:
      - "dónde se pierde el ensamblaje multi-dominio"
      - "qué branch impide llegar con IGF+ARR+M9 juntos"
      - "qué cambio mínimo de wiring sería necesario"

  igf_evidence:
    verify:
      - "fuente física"
      - "periodo"
      - "version"
      - "planta"
      - "composition si aplica"
      - "null semantics"
      - "authz"
      - "provenance"

  arr_evidence:
    verify:
      - "fuente física"
      - "periodo"
      - "planta"
      - "shape"
      - "null semantics"
      - "authz"
      - "provenance"

  m9_evidence:
    verify:
      - "delta venta"
      - "delta descuento"
      - "delta ingreso"
      - "periodo comparado"
      - "planta"
      - "shape"
      - "null semantics"
      - "authz"
      - "provenance"

  temporal_alignment:
    determine:
      - "qué periodo representa IGF"
      - "qué periodo representa ARR"
      - "qué dos periodos usa M9"
      - "si son comparables"
      - "qué hacer si no coinciden"

    rules:
      - "no alinear periodos silenciosamente"
      - "no presentar snapshots de meses distintos como mismo corte"
      - "si falta alineación, explicitarla o clarificar"

  plant_scope:
    required:
      - "misma planta autorizada para todas las fuentes"
      - "una fuente no puede ampliar scope de otra"
      - "cross-planta bloqueado"
      - "fail-closed"

  authz:
    determine:
      - "authz IGF"
      - "authz ARR"
      - "authz M9"
      - "intersección segura"
      - "GA/GV"
      - "plantas_permitidas"
      - "qué ocurre si una fuente tiene regla más restrictiva"

    rule: >
      El ensamblaje debe usar el scope más restrictivo requerido; nunca relajar
      authz para completar el diagnóstico.

  provenance:
    required_sections:
      - "igf"
      - "arr"
      - "deltas_m9"

    each_must_keep:
      - "source"
      - "period"
      - "plant"
      - "status/availability"
      - "evidence ids si existen"
      - "error/absence state"

    rule: >
      No fusionar hechos de fuentes distintas en un único objeto que pierda su
      procedencia.

  absence_and_error:
    distinguish:
      - "ABSENCE_CONFIRMED si aplica"
      - "DATA_NOT_FOUND"
      - "SOURCE_*"
      - "TOOL_ERROR"
      - "null"
      - "0"

    rules:
      - "ausencia != cero"
      - "tool error != dato faltante"
      - "source unavailable != resultado neutral"
      - "no completar evidencia faltante con otra fuente"

  reasoning_semantics:
    allowed:
      - "comparar hechos de fuentes alineadas"
      - "señalar coincidencias"
      - "señalar tensiones"
      - "formular hipótesis claramente etiquetadas si contrato vigente lo permite"
      - "decir qué evidencia soporta cada observación"

    forbidden:
      - "correlación -> causalidad"
      - "IGF explica ARR automáticamente"
      - "delta implica causa"
      - "una fuente sustituye a otra"

  contract_check:
    inspect:
      - "04-IES-STANDARD.md"
      - "05-REASONING-ENGINE.md"
      - "contratos vigentes relevantes"

    determine:
      - "si multi-source evidence assembly ya está permitido"
      - "si se requiere G2"
      - "si se requiere G3"
      - "si basta wiring/runtime"

    rule: >
      No modificar contratos. Solo determinar conformidad.

architecture_hypothesis:
  preferred_path: >
    financial_diagnosis
    -> planner multi-domain
    -> tool orchestrator ejecuta IGF + ARR + M9
    -> normalizeFinancialDiagnosisEvidence
    -> paquete con provenance separada
    -> Reasoning Engine
    -> respuesta

  requirements:
    - "in-process"
    - "read-only"
    - "sin HTTP interno"
    - "sin writes"
    - "sin contrato nuevo"
    - "sin ocultar partial failure"

evidence_bundle_contract_hypothesis:
  top_level:
    - "plant"
    - "requested_period"
    - "sources"
    - "alignment"
    - "limitations"

  sources:
    igf:
      - "status"
      - "period"
      - "payload"
      - "evidence/source"

    arr:
      - "status"
      - "period"
      - "payload"
      - "evidence/source"

    m9:
      - "status"
      - "period_a"
      - "period_b"
      - "payload"
      - "evidence/source"

  rule: >
    Esto es hipótesis de runtime shape, no contrato arquitectónico nuevo.
    Verificar si puede reutilizar shapes existentes antes de proponer uno nuevo.

mandatory_failure_matrix:
  cases:
    - "IGF ok / ARR ok / M9 ok"
    - "IGF missing / ARR ok / M9 ok"
    - "IGF ok / ARR missing / M9 ok"
    - "IGF ok / ARR ok / M9 error"
    - "una fuente unauthorized"
    - "periodos no alineados"
    - "todas sin datos"
    - "una fuente devuelve nulls"

  for_each:
    determine:
      - "¿se responde?"
      - "¿se limita?"
      - "¿se clarifica?"
      - "¿se aborta?"
      - "qué provenance queda"

tests_to_design_if_ready:
  - "financial_diagnosis ejecuta IGF+ARR+M9"
  - "no early-return con una sola fuente"
  - "provenance separada"
  - "misma planta"
  - "cross-planta bloqueado"
  - "periodos alineados"
  - "periodos desalineados"
  - "IGF ausente"
  - "ARR ausente"
  - "M9 ausente"
  - "tool error"
  - "null != 0"
  - "ausencia != cero"
  - "partial success"
  - "sin causalidad"
  - "IGF composition preservada"
  - "M9 sigue siendo deltas"
  - "ARR no se confunde con M9"
  - "authz restrictiva"
  - "sin HTTP interno"
  - "sin writes"
  - "contratos no modificados"

decision_rules:

  ready:
    all:
      - "planner ya soporta multi-domain"
      - "tools existentes son ejecutables"
      - "runtime gap identificable"
      - "provenance preservable"
      - "authz compatible bajo regla restrictiva"
      - "period alignment resoluble"
      - "partial failure model defendible"
      - "Reasoning Engine vigente acepta evidencia multi-source"
      - "sin necesidad de G2/G3"
      - "tests determinísticos"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001"

  stopped:
    when:
      - "requiere modificar contrato IES/RE"
      - "no puede preservarse provenance"
      - "authz de fuentes es incompatible"
      - "periodos no pueden alinearse"
      - "tool orchestration no soporta multi-source sin cambio arquitectónico"

    outcome: "STOPPED"
    next_task: null

state_and_percentage:
  current_task:
    state_change: false
    percentage_change: false

  future_impl:
    global_numerator: 10.5
    denominator: 20
    percentage: 52.5
    gain_pp: 0.0

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"

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
  - "modificar matriz"
  - "modificar contratos"
  - "reabrir IES"
  - "reabrir Reasoning Engine"
  - "modificar tests"
  - "modificar frontend"
  - "modificar SQL"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Gap runtime localizado físicamente."
  - "Planner multi-domain verificado."
  - "Tool plan multi-source verificado."
  - "IGF/ARR/M9 auditados."
  - "Authz por fuente auditada."
  - "Intersección de authz definida."
  - "Semántica temporal definida."
  - "Provenance multi-source definida."
  - "Absence/error semantics definidas."
  - "Failure matrix completada."
  - "Conformidad IES/Reasoning Engine verificada."
  - "G2/G3 determinados."
  - "No se modificaron contratos."
  - "52.5% no cambia."
  - "Solo CURRENT_TASK y reporte cambian."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "physical runtime gap"
    - "planner"
    - "tool orchestration"
    - "chat runtime"
    - "IGF evidence"
    - "ARR evidence"
    - "M9 evidence"
    - "period alignment"
    - "authz intersection"
    - "provenance"
    - "absence/error semantics"
    - "failure matrix"
    - "reasoning semantics"
    - "contract check"
    - "implementation hypothesis"
    - "tests"
    - "gates"
    - "percentage"
    - "risks"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si el gap puede resolverse solo con wiring/runtime y
  evidencia multi-source conforme al contrato vigente. STOPPED si requiere
  reabrir arquitectura o no puede preservar authz/provenance. BLOCKED si falta
  gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"