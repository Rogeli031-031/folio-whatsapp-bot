# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar el ensamblaje multi-fuente de evidencia para financial_diagnosis
  en el chat legado de Director IA, ejecutando y reuniendo en una sola corrida
  IGF, ARR y deltas M9, preservando provenance, periodos, authz, ausencia/error
  y semántica no causal, sin modificar IES, Reasoning Engine ni contratos.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-READINESS-001.md"

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
    runtime_ies: false

  reasoning_engine:
    modify: false
    execute_from_this_slice: false

  rule: >
    Este slice entrega evidencia multi-fuente al chat legado/OpenAI conforme a
    contratos vigentes. No introducir loaders dentro de N5 ni simular runtime IES.

readiness_findings:
  planner:
    financial_diagnosis_multi_domain: true
    expected_domains:
      - "IGF"
      - "ARR"
      - "M9 deltas"

  orchestrator:
    current_state: "declarative"
    runtime_execution: false

  chat_gap:
    location: "askDirectorIa"
    behavior:
      - "early-return por delta_*"
      - "OpenAI puede recibir solo annex IGF/ARR"
      - "M9 no entra al contexto conjunto"

architecture:
  required_path: >
    financial_diagnosis
    -> planner
    -> load/execute IGF
    -> load/execute ARR
    -> load/execute M9 deltas
    -> assembleFinancialDiagnosisEvidence
    -> contexto multi-source con provenance
    -> una llamada OpenAI
    -> respuesta

  requirements:
    - "in-process"
    - "read-only"
    - "sin HTTP interno"
    - "sin writes"
    - "sin IES runtime"
    - "sin Reasoning Engine runtime"
    - "sin contrato nuevo"

source_blocks:
  igf:
    preserve:
      - "planta"
      - "periodo"
      - "versión"
      - "snapshot"
      - "composition si ya disponible"
      - "null semantics"
      - "source/provenance"

  arr:
    preserve:
      - "planta"
      - "periodo"
      - "payload ARR"
      - "null semantics"
      - "source/provenance"

  m9:
    preserve:
      - "delta_venta"
      - "delta_descuento"
      - "delta_ingreso"
      - "periodo_a"
      - "periodo_b"
      - "planta"
      - "source/provenance"

provenance:
  required_sections:
    - "igf"
    - "arr"
    - "m9"

  each_source_must_include:
    - "status"
    - "plant"
    - "period"
    - "payload"
    - "source/evidence"
    - "absence/error state"

  forbidden:
    - "fusionar payloads perdiendo procedencia"
    - "copiar dato de una fuente como si proviniera de otra"

period_alignment:
  rules:
    - "no alinear silenciosamente"
    - "IGF y ARR deben declarar su periodo real"
    - "M9 debe declarar period_a y period_b"
    - "si no son comparables, incluir limitación explícita"
    - "clarificar si la pregunta exige comparación que no puede alinearse"

  forbidden:
    - "tratar meses distintos como mismo corte"
    - "inventar periodo faltante"

authz:
  rule: >
    Para cada fuente se conserva su authz vigente. El diagnóstico usa la
    intersección más restrictiva; nunca relaja authz para completar evidencia.

  required:
    - "JWT/contexto"
    - "planta_id"
    - "plantas_permitidas"
    - "GA/GV según cada fuente"
    - "cross-planta bloqueado"
    - "fail-closed"

  special:
    - "GA aborta si una fuente requerida lo bloquea"
    - "GV puede limitar M9 según regla vigente"

absence_error_semantics:
  distinguish:
    - "null"
    - "0"
    - "DATA_NOT_FOUND"
    - "ABSENCE_CONFIRMED si aplica"
    - "SOURCE_*"
    - "TOOL_ERROR"

  invariants:
    - "null != 0"
    - "ausencia != cero"
    - "error != ausencia"
    - "source unavailable != resultado neutral"
    - "una fuente no reemplaza a otra"

partial_failure_policy:
  rules:
    - "preservar resultados de fuentes OK"
    - "marcar fuente missing/error explícitamente"
    - "no ocultar partial success"
    - "no fabricar evidencia faltante"

  authz_failure:
    rule: >
      Una falla de autorización no se trata como simple ausencia; aplicar
      fail-closed según el scope requerido.

reasoning_semantics:
  allowed:
    - "señalar coincidencias entre fuentes"
    - "señalar tensiones entre fuentes"
    - "comparar hechos temporalmente alineados"
    - "formular hipótesis solo etiquetadas y soportadas por evidencia"
    - "citar procedencia por observación"

  forbidden:
    - "correlación = causalidad"
    - "IGF causó ARR"
    - "delta prueba causa"
    - "una fuente subsana falta de otra"
    - "convertir ausencia en cero"

chat_runtime:
  required:
    - "financial_diagnosis no hace early-return por delta_*"
    - "ejecuta las fuentes requeridas en una sola rama"
    - "construye contexto unificado"
    - "hace una sola llamada OpenAI para el diagnóstico"
    - "preserva otros intents y early-returns existentes fuera de financial_diagnosis"

routing_preservation:
  must_preserve:
    - "igf_status"
    - "arr_status"
    - "delta_sales"
    - "delta_discount"
    - "delta_income"
    - "commercial_state"
    - "M6"
    - "M11"
    - "M12"
    - "M18"

  rule: >
    Solo financial_diagnosis cambia a ensamblaje multi-fuente. No convertir
    consultas simples en diagnósticos multi-source.

implementation_hint:
  helper_preferred: "assembleFinancialDiagnosisEvidence"

  rule: >
    Reutilizar loaders/helpers existentes donde sean read-only y seguros.
    No duplicar lógica de negocio innecesariamente.

context_policy:
  required:
    - "bloques separados"
    - "orden determinista"
    - "payloads acotados"
    - "provenance visible"
    - "limitations visibles"
    - "no desbordar contexto con dumps completos"

response_contract:
  must_allow:
    - "resumen financiero conjunto"
    - "evidencia IGF"
    - "evidencia ARR"
    - "evidencia M9"
    - "coincidencias"
    - "tensiones"
    - "limitaciones"
    - "period mismatch"

  must_not_claim_without_evidence:
    - "causa confirmada"
    - "responsable"
    - "impacto causal"
    - "resultado neutral por fuente faltante"

tests_required:
  focal:
    - "financial_diagnosis carga IGF+ARR+M9"
    - "una sola llamada OpenAI"
    - "no early-return delta dentro de financial_diagnosis"
    - "IGF provenance"
    - "ARR provenance"
    - "M9 provenance"
    - "periodos alineados"
    - "periodos desalineados"
    - "IGF missing"
    - "ARR missing"
    - "M9 missing"
    - "M9 tool error"
    - "partial success visible"
    - "null != 0"
    - "absence != 0"
    - "error != absence"
    - "una fuente no reemplaza otra"
    - "authz más restrictiva"
    - "GA"
    - "GV"
    - "cross-planta"
    - "sin causalidad"
    - "igf_status preservado"
    - "arr_status preservado"
    - "delta_* preservados fuera de financial_diagnosis"
    - "M6/M11/M12/M18 preservados"
    - "sin HTTP interno"
    - "sin writes"
    - "IES sin cambios"
    - "Reasoning Engine sin cambios"

  regression:
    - "capabilities"
    - "planner"
    - "tool orchestrator"
    - "suite Director IA completa"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-context.js"
    - "lib/director-ia-igf-arr.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-financial-diagnosis.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "test/director-ia-financial-diagnosis.test.js"

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
  - "financial_diagnosis ejecuta IGF + ARR + M9."
  - "No hay early-return de un delta en esa rama."
  - "Existe evidencia multi-source en una sola corrida."
  - "Provenance IGF/ARR/M9 separada."
  - "Periodos preservados."
  - "Desalineación no se oculta."
  - "Authz más restrictiva preservada."
  - "Partial failures visibles."
  - "Ausencia/error/null/0 separados."
  - "No causalidad."
  - "Una sola llamada OpenAI para financial_diagnosis."
  - "Otros intents preservados."
  - "No HTTP interno."
  - "No writes."
  - "IES sin cambios."
  - "Reasoning Engine sin cambios."
  - "Global permanece 10.5/20 = 52.5%."
  - "Tests focales verdes."
  - "Regresión completa verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-financial-diagnosis.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001"

  rule: >
    La sync posterior documenta capacidad transversal. No cambia estados de
    módulos ni 10.5/20 = 52.5%.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "physical gap closed"
    - "chat path"
    - "planner alignment"
    - "IGF evidence"
    - "ARR evidence"
    - "M9 evidence"
    - "provenance"
    - "period alignment"
    - "authz intersection"
    - "absence/error semantics"
    - "partial failure"
    - "OpenAI call count"
    - "routing preservation"
    - "semantic boundaries"
    - "IES boundary"
    - "Reasoning Engine boundary"
    - "tests"
    - "percentage"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si financial_diagnosis queda cableado con evidencia
  multi-fuente conforme a contratos vigentes. STOPPED si aparece necesidad de
  modificar IES/RE o no puede preservarse authz/provenance. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md"