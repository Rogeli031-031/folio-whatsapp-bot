# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente el gap transversal de plant_diagnosis para determinar
  si Director IA puede ejecutar y ensamblar en una misma corrida evidencia de
  Action Register, DICF, bitácora, ARR, IGF y commercial_state, preservando
  provenance, authz, planta, periodos, ausencia/error y semántica no causal,
  sin reabrir IES ni Reasoning Engine y sin introducir M9 por inercia.

baseline:
  prioritization_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009"
  prioritization_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009.md"

  transversal_capability: "plant_diagnosis evidence assembly"

  global:
    numerator: 10.5
    denominator: 20
    percentage: 52.5
    expected_gain_pp: 0.0

known_gap:
  planner: >
    plant_diagnosis ya declara múltiples dominios/fuentes: Action Register,
    DICF, bitácora, ARR, IGF y commercial_state.

  runtime: >
    El chat legado no ejecuta ese plan multi-source y puede terminar respondiendo
    principalmente desde Action Register.

  contract_implication: >
    El gap parece de wiring/runtime/context assembly, no de contrato IES/RE.

primary_question: >
  ¿Existe un path in-process, read-only, autorizado y conforme al contrato
  vigente para que plant_diagnosis ejecute y ensamble AR + DICF + bitácora +
  ARR + IGF + commercial_state en una sola corrida, preserve provenance por
  fuente y entregue una respuesta de planta sin inventar causalidad ni mezclar
  periodos o scopes?

source_scope:
  required_sources:
    - "action_register"
    - "dicf"
    - "bitacora"
    - "arr"
    - "igf"
    - "commercial_state"

  explicitly_not_included:
    - "M9 deltas"

  rule: >
    No incorporar M9 por similitud con financial_diagnosis. Solo incluirlo si la
    readiness demuestra que plant_diagnosis canónico realmente lo requiere,
    cosa que hoy no se asume.

mandatory_audit:

  planner:
    inspect:
      - "intent plant_diagnosis"
      - "domains declarados"
      - "evidence plan"
      - "clarification"
      - "confidence"
      - "routing priority"

    determine:
      - "qué fuentes exige realmente"
      - "qué fuentes son opcionales"
      - "qué periodo/scope pide cada una"
      - "qué evidencia espera"

  chat_runtime:
    inspect:
      - "askDirectorIa"
      - "early returns"
      - "focused modes"
      - "plant_diagnosis branch"
      - "Action Register context"
      - "DICF context"
      - "bitácora context"
      - "ARR annex"
      - "IGF annex"
      - "commercial_state loader"
      - "OpenAI call"

    determine:
      - "dónde se corta el ensamblaje"
      - "por qué termina dominando Action Register"
      - "qué cambio mínimo de wiring sería necesario"

  action_register:
    verify:
      - "fuente física"
      - "planta"
      - "periodo/snapshot si aplica"
      - "acciones"
      - "responsables"
      - "vencidas"
      - "notas de revisión si entran o no"
      - "authz"
      - "provenance"

  dicf:
    verify:
      - "fuente física"
      - "planta"
      - "periodo"
      - "acciones/comentarios si aplica"
      - "authz"
      - "provenance"

  bitacora:
    verify:
      - "fuente física"
      - "planta"
      - "periodo"
      - "campos"
      - "authz"
      - "provenance"

  arr:
    verify:
      - "fuente física"
      - "planta"
      - "periodo"
      - "shape"
      - "null semantics"
      - "authz"
      - "provenance"

  igf:
    verify:
      - "fuente física"
      - "planta"
      - "periodo"
      - "versión"
      - "snapshot/composición si aplica"
      - "null semantics"
      - "authz"
      - "provenance"

  commercial_state:
    verify:
      - "fuente física"
      - "planta"
      - "periodo"
      - "estado comercial"
      - "si el loader actual escribe caché"
      - "path SELECT-only disponible"
      - "authz"
      - "provenance"

  plant_key:
    required:
      - "planta_id como clave común"
      - "verificar que cada fuente puede acotarse por planta"
      - "no hacer joins por nombre de planta si existe planta_id"
      - "no combinar fuentes de plantas distintas"

  temporal_alignment:
    determine:
      - "periodo de AR"
      - "periodo DICF"
      - "periodo bitácora"
      - "periodo ARR"
      - "periodo IGF"
      - "periodo commercial_state"

    rules:
      - "no alinear silenciosamente"
      - "no tratar snapshots de cortes distintos como mismo periodo"
      - "si las fuentes tienen ventanas distintas, hacerlo visible"
      - "clarificar cuando la pregunta exige un corte común imposible"

  authz:
    determine:
      - "authz Action Register"
      - "authz DICF"
      - "authz bitácora"
      - "authz ARR"
      - "authz IGF"
      - "authz commercial_state"
      - "intersección más restrictiva"
      - "GA/GV"
      - "plantas_permitidas"
      - "cross-planta"
      - "fail-closed"

    rule: >
      El ensamblaje debe usar el scope más restrictivo de todas las fuentes
      requeridas. Nunca relajar authz para completar diagnóstico.

  provenance:
    required_sections:
      - "action_register"
      - "dicf"
      - "bitacora"
      - "arr"
      - "igf"
      - "commercial_state"

    each_must_preserve:
      - "source"
      - "plant"
      - "period/window"
      - "status/availability"
      - "payload"
      - "absence/error"

    rule: >
      No fusionar hechos de varias fuentes en un único bloque que pierda origen.

  absence_and_error:
    distinguish:
      - "null"
      - "0"
      - "DATA_NOT_FOUND"
      - "ABSENCE_CONFIRMED si aplica"
      - "SOURCE_*"
      - "TOOL_ERROR"
      - "unauthorized"

    rules:
      - "ausencia != cero"
      - "error != ausencia"
      - "unauthorized != missing"
      - "una fuente no sustituye otra"
      - "partial success debe ser explícito"

  reasoning_semantics:
    allowed:
      - "señalar riesgos observables"
      - "señalar coincidencias"
      - "señalar tensiones"
      - "mostrar acciones/responsables registrados"
      - "mostrar indicadores y estados por fuente"
      - "formular hipótesis solo si el contrato vigente lo permite y etiquetadas"

    forbidden:
      - "correlación -> causalidad"
      - "AR explica IGF automáticamente"
      - "comentario DICF prueba causa"
      - "un KPI determina responsable"
      - "fuente faltante = situación normal"

  plant_diagnosis_scope:
    determine:
      - "qué significa 'cómo va la planta'"
      - "qué significa 'qué riesgos hay'"
      - "qué evidencia entra"
      - "qué evidencia queda fuera"
      - "si notas M12 entran o no"
      - "si M9 queda fuera definitivamente"

    rule: >
      Mantener plant_diagnosis como diagnóstico ejecutivo de planta, no convertirlo
      en un mega-dump de todos los módulos.

  context_policy:
    required:
      - "bloques separados"
      - "límites por fuente"
      - "orden determinista"
      - "prioridad de evidencia"
      - "payloads acotados"
      - "limitations visibles"

    rule: >
      La readiness debe definir límites defendibles para evitar un contexto enorme.

  contract_check:
    inspect:
      - "04-IES-STANDARD.md"
      - "05-REASONING-ENGINE.md"
      - "contratos relevantes"

    determine:
      - "si multi-source plant diagnosis ya está permitido"
      - "si basta wiring/runtime"
      - "si requiere G2"
      - "si requiere G3"

    rule: >
      No modificar contratos. Si requiere reabrirlos, STOPPED.

architecture_hypothesis:
  preferred_path: >
    plant_diagnosis
    -> planner multi-domain
    -> loaders AR + DICF + bitácora + ARR + IGF + commercial_state
    -> assemblePlantDiagnosisEvidence
    -> provenance separada
    -> contexto multi-source
    -> una llamada OpenAI
    -> respuesta

  requirements:
    - "in-process"
    - "read-only"
    - "sin HTTP interno"
    - "sin writes"
    - "sin IES runtime"
    - "sin Reasoning Engine runtime"
    - "sin M9 salvo evidencia canónica"

mandatory_failure_matrix:
  cases:
    - "todas las fuentes OK"
    - "AR missing"
    - "DICF missing"
    - "bitácora missing"
    - "ARR missing"
    - "IGF missing"
    - "commercial_state missing"
    - "una fuente TOOL_ERROR"
    - "una fuente unauthorized"
    - "period mismatch"
    - "todas sin datos"

  for_each:
    determine:
      - "responder"
      - "limitar"
      - "clarificar"
      - "abortar"
      - "qué provenance permanece"

tests_to_design_if_ready:
  - "plant_diagnosis carga seis fuentes"
  - "una sola llamada OpenAI"
  - "no early-return Action Register"
  - "provenance separada por seis fuentes"
  - "misma planta"
  - "cross-planta bloqueado"
  - "periodos visibles"
  - "period mismatch visible"
  - "AR missing"
  - "DICF missing"
  - "bitácora missing"
  - "ARR missing"
  - "IGF missing"
  - "commercial_state missing"
  - "tool error"
  - "unauthorized"
  - "partial success"
  - "null != 0"
  - "absence != 0"
  - "sin causalidad"
  - "M9 no incluido"
  - "financial_diagnosis preservado"
  - "otros intents preservados"
  - "sin HTTP interno"
  - "sin writes"
  - "contratos sin cambios"

decision_rules:

  ready:
    all:
      - "planner ya soporta multi-domain"
      - "gap runtime localizado"
      - "seis fuentes ejecutables/read-only o con path seguro"
      - "planta_id común"
      - "provenance preservable"
      - "authz compatible bajo intersección restrictiva"
      - "period mismatch representable"
      - "partial failure model defendible"
      - "contrato vigente permite evidencia multi-source"
      - "sin necesidad de G2/G3"
      - "tests determinísticos"

    outcome: "DONE_PENDING_REVIEW"
    next_task: "IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001"

  stopped:
    when:
      - "requiere modificar IES/RE"
      - "alguna fuente no puede ser read-only"
      - "provenance no puede preservarse"
      - "authz incompatible"
      - "planta_id no puede alinear fuentes"
      - "contexto no puede acotarse"

    outcome: "STOPPED"
    next_task: null

state_and_percentage:
  current_task:
    state_change: false
    percentage_change: false

  future_impl:
    numerator: 10.5
    denominator: 20
    percentage: 52.5
    gain_pp: 0.0

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"

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
  - "reabrir IES/RE"
  - "modificar tests"
  - "modificar frontend"
  - "modificar SQL"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Gap runtime localizado."
  - "Planner plant_diagnosis multi-domain verificado."
  - "Seis fuentes auditadas."
  - "planta_id común verificado."
  - "Authz por fuente auditada."
  - "Intersección restrictiva definida."
  - "Semántica temporal definida."
  - "Provenance de seis fuentes definida."
  - "Absence/error semantics definidas."
  - "Failure matrix completada."
  - "M9 boundary definida."
  - "Conformidad IES/RE verificada."
  - "G2/G3 determinados."
  - "52.5% no cambia."
  - "Solo CURRENT_TASK y reporte cambian."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "physical runtime gap"
    - "planner"
    - "chat runtime"
    - "Action Register evidence"
    - "DICF evidence"
    - "bitácora evidence"
    - "ARR evidence"
    - "IGF evidence"
    - "commercial_state evidence"
    - "plant key"
    - "period alignment"
    - "authz intersection"
    - "provenance"
    - "absence/error"
    - "failure matrix"
    - "reasoning semantics"
    - "M9 boundary"
    - "context policy"
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
  DONE_PENDING_REVIEW si el gap puede resolverse como wiring/runtime conforme a
  contratos vigentes. STOPPED si requiere reabrir arquitectura o no puede
  preservar authz/provenance. BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"