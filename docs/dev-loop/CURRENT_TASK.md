# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el ensamblaje multi-fuente de evidencia para plant_diagnosis
  en el chat legado de Director IA, reuniendo en una sola corrida Action Register,
  DICF, bitácora, ARR, IGF y commercial_state, preservando provenance, authz,
  planta, periodos, restricciones parciales y semántica no causal, sin introducir
  M9 ni modificar IES/Reasoning Engine.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"

  global:
    numerator_before: 10.5
    denominator: 20
    percentage_before: 52.5
    numerator_after: 10.5
    percentage_after: 52.5
    gain_pp: 0.0

contract_boundary:
  ies:
    modify: false
    runtime: false

  reasoning_engine:
    modify: false
    runtime: false

  rule: >
    Este slice corrige wiring del chat legado. No introducir loaders en N5,
    no crear runtime IES y no modificar contratos.

readiness_findings:
  planner:
    plant_diagnosis_multi_domain: true
    declared_sources:
      - "action_register"
      - "dicf"
      - "bitacora"
      - "arr"
      - "igf"
      - "commercial_state"

  chat_gap:
    exact_gap: >
      askDirectorIa no tiene una rama específica intent === "plant_diagnosis".
      La pregunta puede caer a OpenAI con contexto dominado por Action Register.

  m9:
    included: false

  commercial_state:
    unsafe_loader: "loadCommercialStateForChat"
    reason: >
      Ejecuta computeDicf, que hace DELETE+INSERT de caché.

    required_strategy: >
      Usar lectura SELECT-only de arr.dicf_cliente_mes o helper equivalente puro,
      siguiendo el patrón ya usado por M11.

architecture:
  required_path: >
    plant_diagnosis
    -> planner
    -> load Action Register
    -> load DICF
    -> load bitácora
    -> load ARR
    -> load IGF
    -> load commercial_state SELECT-only
    -> assemblePlantDiagnosisEvidence
    -> contexto multi-source con provenance
    -> una llamada OpenAI
    -> respuesta

  requirements:
    - "in-process"
    - "read-only"
    - "sin HTTP interno"
    - "sin writes"
    - "sin computeDicf cache writes"
    - "sin M9"
    - "sin IES runtime"
    - "sin Reasoning Engine runtime"

source_blocks:

  action_register:
    preserve:
      - "status"
      - "plant"
      - "period/window"
      - "payload"
      - "source/evidence"
      - "absence/error"

  dicf:
    preserve:
      - "status"
      - "plant"
      - "period/window"
      - "payload"
      - "source/evidence"
      - "absence/error"

  bitacora:
    preserve:
      - "status"
      - "plant"
      - "period/window"
      - "payload"
      - "source/evidence"
      - "absence/error"

  arr:
    preserve:
      - "status"
      - "plant"
      - "period"
      - "payload"
      - "source/evidence"
      - "absence/error"

  igf:
    preserve:
      - "status"
      - "plant"
      - "period"
      - "version"
      - "payload"
      - "source/evidence"
      - "absence/error"

  commercial_state:
    source: "arr.dicf_cliente_mes"
    preserve:
      - "status"
      - "plant"
      - "period"
      - "payload"
      - "source/evidence"
      - "absence/error"

provenance:
  required_sections:
    - "action_register"
    - "dicf"
    - "bitacora"
    - "arr"
    - "igf"
    - "commercial_state"

  forbidden:
    - "fusionar payloads perdiendo origen"
    - "presentar una fuente como si fuera otra"

plant_scope:
  key: "planta_id"

  rules:
    - "todas las fuentes se acotan a la misma planta"
    - "no join por nombre de planta cuando existe planta_id"
    - "cross-planta bloqueado"
    - "una fuente no amplía el scope de otra"

authz:
  rule: >
    Cada fuente conserva su authz. El ensamblaje aplica la intersección más
    restrictiva sin abortar innecesariamente fuentes que sí son permitidas.

  special_ga:
    rule: >
      GA puede ver AR/DICF/bitácora. IGF/ARR/commercial_state deben quedar
      SOURCE_RESTRICTED si sus reglas vigentes lo impiden. No abortar todo el pack
      solo porque esas fuentes estén restringidas.

  required:
    - "JWT/contexto"
    - "planta_id"
    - "plantas_permitidas"
    - "cross-planta"
    - "fail-closed"
    - "unauthorized != missing"

period_semantics:
  rules:
    - "cada fuente conserva su periodo/window real"
    - "no alinear silenciosamente"
    - "mismatch temporal visible"
    - "si pregunta exige corte común imposible, clarificar o limitar"

absence_error_semantics:
  distinguish:
    - "null"
    - "0"
    - "DATA_NOT_FOUND"
    - "ABSENCE_CONFIRMED si aplica"
    - "SOURCE_RESTRICTED"
    - "SOURCE_*"
    - "TOOL_ERROR"
    - "unauthorized"

  invariants:
    - "null != 0"
    - "absence != 0"
    - "error != absence"
    - "SOURCE_RESTRICTED != missing"
    - "una fuente no sustituye otra"

partial_failure_policy:
  rules:
    - "conservar fuentes OK"
    - "mostrar SOURCE_RESTRICTED por fuente"
    - "mostrar missing/error explícitamente"
    - "no presentar diagnóstico parcial como completo"
    - "no fabricar datos faltantes"

reasoning_semantics:
  allowed:
    - "señalar riesgos observables"
    - "señalar acciones y responsables registrados"
    - "señalar coincidencias y tensiones"
    - "mostrar indicadores y estados por fuente"
    - "formular hipótesis solo etiquetadas si contrato vigente lo permite"

  forbidden:
    - "correlación = causalidad"
    - "AR causó IGF"
    - "comentario DICF prueba causa"
    - "KPI identifica responsable"
    - "fuente restringida = sin problemas"

chat_runtime:
  required:
    - "crear rama específica plant_diagnosis"
    - "no caer al dump general de Action Register"
    - "cargar seis fuentes"
    - "ensamblar evidencia"
    - "una sola llamada OpenAI"
    - "preservar otros intents"

routing_preservation:
  must_preserve:
    - "financial_diagnosis"
    - "igf_status"
    - "arr_status"
    - "commercial_state"
    - "dicf_focused"
    - "bitacora_lookup"
    - "Action Register"
    - "M5"
    - "M6"
    - "M11"
    - "M12"
    - "M18"

  m9:
    rule: "No incluir M9 en plant_diagnosis."

implementation_hint:
  helper_preferred: "assemblePlantDiagnosisEvidence"

  commercial_state_reader:
    preferred: "SELECT-only helper sobre arr.dicf_cliente_mes"

  rule: >
    Reutilizar helpers existentes cuando sean read-only. No reutilizar
    loadCommercialStateForChat si implica computeDicf/cache writes.

context_policy:
  required:
    - "seis bloques separados"
    - "orden determinista"
    - "payloads acotados"
    - "limitations visibles"
    - "no mega-dump"

  preferred_priority_order:
    - "risks/actions"
    - "commercial state"
    - "operational notes"
    - "ARR"
    - "IGF"

  rule: >
    El orden puede ajustarse a helpers reales, pero debe quedar determinista y
    no eliminar provenance.

response_contract:
  must_allow:
    - "estado general de planta"
    - "riesgos observables"
    - "acciones registradas"
    - "responsables registrados"
    - "estado comercial"
    - "bitácora"
    - "ARR"
    - "IGF"
    - "restricciones/ausencias"
    - "period mismatch"

  must_not_claim_without_evidence:
    - "causa confirmada"
    - "responsable causal"
    - "impacto causal"
    - "normalidad por fuente restringida"
    - "ausencia de riesgo porque una fuente falta"

tests_required:
  focal:
    - "plant_diagnosis carga seis fuentes"
    - "una sola llamada OpenAI"
    - "no fallback al dump Action Register"
    - "provenance de seis fuentes"
    - "misma planta"
    - "cross-planta"
    - "period mismatch visible"
    - "AR missing"
    - "DICF missing"
    - "bitácora missing"
    - "ARR missing"
    - "IGF missing"
    - "commercial_state missing"
    - "SOURCE_RESTRICTED"
    - "TOOL_ERROR"
    - "partial success"
    - "null != 0"
    - "absence != 0"
    - "error != absence"
    - "unauthorized != missing"
    - "GA conserva AR/DICF/bitácora"
    - "GA restringe IGF/ARR/CS por bloque"
    - "no abort total GA"
    - "commercial_state SELECT-only"
    - "no computeDicf"
    - "no cache writes"
    - "no M9"
    - "no causalidad"
    - "financial_diagnosis preservado"
    - "otros intents preservados"
    - "sin HTTP interno"
    - "sin writes"
    - "IES sin cambios"
    - "RE sin cambios"

  regression:
    - "capabilities"
    - "planner"
    - "tool orchestrator"
    - "suite Director IA completa"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-context.js"
    - "lib/director-ia-igf-arr.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-plant-diagnosis.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "test/director-ia-plant-diagnosis.test.js"

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
  - "docs/director-ia/**"
  - "capability matrix"
  - "04-IES-STANDARD.md"
  - "05-REASONING-ENGINE.md"
  - "contratos"
  - "IES runtime"
  - "Reasoning Engine runtime"
  - "M9"
  - "server.js"
  - "frontend"
  - "SQL/schema/migrations"
  - "writes"
  - "HTTP interno"
  - "commit"
  - "push"
  - "merge"
  - "sync documental"
  - "NEXT_TASK"

acceptance_criteria:
  - "Existe rama específica plant_diagnosis en chat."
  - "Carga AR + DICF + bitácora + ARR + IGF + commercial_state."
  - "No carga M9."
  - "commercial_state se lee SELECT-only."
  - "No se llama computeDicf."
  - "No cache writes."
  - "Una sola llamada OpenAI."
  - "Provenance por seis fuentes."
  - "planta_id común preservado."
  - "Periodos reales preservados."
  - "Mismatch temporal visible."
  - "GA no aborta pack completo por restricciones parciales."
  - "SOURCE_RESTRICTED visible por fuente."
  - "Unauthorized no se convierte en missing."
  - "Partial failures explícitos."
  - "No causalidad."
  - "financial_diagnosis preservado."
  - "Otros intents preservados."
  - "No HTTP interno."
  - "No writes."
  - "IES/RE sin cambios."
  - "Global permanece 10.5/20 = 52.5%."
  - "Tests focales verdes."
  - "Regresión completa verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-plant-diagnosis.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001"

  rule: >
    La sync posterior documenta capacidad transversal. No cambia estados de
    módulos ni 10.5/20 = 52.5%.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "physical gap closed"
    - "chat path"
    - "planner alignment"
    - "AR evidence"
    - "DICF evidence"
    - "bitácora evidence"
    - "ARR evidence"
    - "IGF evidence"
    - "commercial_state evidence"
    - "provenance"
    - "period semantics"
    - "authz intersection"
    - "GA partial restrictions"
    - "absence/error semantics"
    - "partial failure"
    - "OpenAI call count"
    - "M9 boundary"
    - "routing preservation"
    - "semantic boundaries"
    - "IES boundary"
    - "RE boundary"
    - "tests"
    - "percentage"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si plant_diagnosis queda cableado con seis fuentes,
  provenance, authz parcial y una llamada OpenAI conforme a contratos vigentes.
  STOPPED si no puede preservarse scope/provenance o aparece necesidad de
  modificar IES/RE. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"