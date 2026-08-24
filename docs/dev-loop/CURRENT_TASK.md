# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación de Director IA con el ensamblaje multi-fuente
  ya integrado para plant_diagnosis en el chat legado, documentando que una
  sola corrida reúne Action Register, DICF, bitácora, ARR, IGF y
  commercial_state con provenance separada, restricciones parciales por fuente,
  periodos visibles, partial failures explícitos y una sola llamada OpenAI,
  sin modificar estados de módulos ni 10.5/20 = 52.5%.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001"
  implementation_report: >
    docs/dev-loop/reports/IMPL-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md

  transversal_capability: "plant_diagnosis evidence assembly"

  global_before:
    numerator: 10.5
    denominator: 20
    percentage: 52.5

  global_after:
    numerator: 10.5
    denominator: 20
    percentage: 52.5

  gain_pp: 0.0

implemented_path: >
  plant_diagnosis
  -> Action Register + DICF + bitácora + ARR + IGF + commercial_state
  -> assemblePlantDiagnosisEvidence
  -> provenance separada
  -> contexto multi-source
  -> una llamada OpenAI
  -> respuesta

must_document:

  source_pack:
    included:
      - "action_register"
      - "dicf"
      - "bitacora"
      - "arr"
      - "igf"
      - "commercial_state"

    excluded:
      - "M9"

  openai:
    - "una sola llamada final"
    - "no una llamada por fuente"

  commercial_state:
    - "SELECT-only sobre arr.dicf_cliente_mes"
    - "no loadCommercialStateForChat si ejecuta computeDicf"
    - "no computeDicf"
    - "no cache writes"

  provenance:
    sections:
      - "action_register"
      - "dicf"
      - "bitacora"
      - "arr"
      - "igf"
      - "commercial_state"

    each_preserves:
      - "status"
      - "plant"
      - "period/window"
      - "payload"
      - "source/evidence"
      - "absence/error"

  plant_scope:
    - "planta_id común"
    - "cross-planta bloqueado"
    - "una fuente no amplía scope"

  period_semantics:
    - "cada fuente conserva su corte real"
    - "period mismatch visible"
    - "sin alineación silenciosa"

  authz:
    - "authz propia por fuente"
    - "intersección restrictiva"
    - "GA conserva AR/DICF/bitácora"
    - "GA marca IGF/ARR/commercial_state como SOURCE_RESTRICTED cuando aplica"
    - "SOURCE_RESTRICTED no aborta todo el pack"
    - "unauthorized != missing"
    - "fail-closed"

  partial_failure:
    - "assembly_status explícito"
    - "fuentes OK se conservan"
    - "restricciones/missing/error visibles"
    - "diagnóstico parcial no se presenta como completo"

  absence_error:
    distinguish:
      - "null"
      - "0"
      - "DATA_NOT_FOUND"
      - "ABSENCE_CONFIRMED si aplica"
      - "SOURCE_RESTRICTED"
      - "SOURCE_*"
      - "TOOL_ERROR"
      - "unauthorized"

    rules:
      - "null != 0"
      - "absence != 0"
      - "error != absence"
      - "SOURCE_RESTRICTED != missing"

  semantics:
    allowed:
      - "riesgos observables"
      - "acciones registradas"
      - "responsables registrados"
      - "coincidencias"
      - "tensiones"
      - "limitaciones"

    forbidden:
      - "correlación = causalidad"
      - "AR causó IGF"
      - "comentario DICF prueba causa"
      - "KPI identifica responsable"

  boundaries:
    - "financial_diagnosis preservado"
    - "M9 fuera"
    - "sin IES runtime"
    - "sin Reasoning Engine runtime"
    - "sin cambios 04-IES-STANDARD.md"
    - "sin cambios 05-REASONING-ENGINE.md"
    - "sin contrato nuevo"
    - "sin HTTP interno"
    - "sin writes"

test_evidence:
  focal: "21 pass"
  director_ia_suite: "715 pass"
  capabilities: "pass"
  planner: "pass"
  orchestrator: "pass"
  git_diff_check: "clean"

state_policy:
  - "ningún módulo cambia de estado"
  - "no sumar 0.5"
  - "10.5/20 = 52.5% permanece"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-plant-diagnosis.js"
    - "lib/director-ia-chat.js"
    - "test/director-ia-plant-diagnosis.test.js"

out_of_scope:
  - "modificar código"
  - "modificar runtime"
  - "modificar tests"
  - "modificar contratos"
  - "modificar 04-IES-STANDARD.md"
  - "modificar 05-REASONING-ENGINE.md"
  - "implementar IES runtime"
  - "implementar Reasoning Engine runtime"
  - "integrar M9"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Path multi-source de plant_diagnosis documentado."
  - "Seis fuentes documentadas en una sola corrida."
  - "M9 documentado como fuera."
  - "Una llamada OpenAI documentada."
  - "commercial_state SELECT-only documentado."
  - "No computeDicf/cache write documentado."
  - "Provenance de seis fuentes documentada."
  - "planta_id común documentado."
  - "Period mismatch documentado."
  - "GA partial restrictions documentadas."
  - "SOURCE_RESTRICTED documentado."
  - "Partial failure / assembly_status documentado."
  - "No causalidad documentada."
  - "financial_diagnosis preservado."
  - "IES/RE sin cambios."
  - "Ningún módulo cambia."
  - "10.5/20 = 52.5% permanece."
  - "Solo tres archivos autorizados cambian."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010"

  rule: >
    Repriorizar globalmente desde 52.5%. No continuar plant_diagnosis por
    inercia y no asumir M10 por haber quedado segundo.

report_requirements:
  path: >
    docs/dev-loop/reports/DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001.md

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "runtime path"
    - "six-source pack"
    - "commercial_state SELECT-only"
    - "provenance"
    - "plant scope"
    - "period semantics"
    - "authz"
    - "GA partial restrictions"
    - "SOURCE_RESTRICTED"
    - "partial failure"
    - "assembly_status"
    - "OpenAI call count"
    - "M9 boundary"
    - "financial_diagnosis preservation"
    - "semantic boundaries"
    - "IES boundary"
    - "Reasoning Engine boundary"
    - "tests"
    - "10.5/20 = 52.5%"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la documentación refleja fielmente el runtime
  multi-source de plant_diagnosis y mantiene 52.5%. STOPPED si contradice
  implementación física. BLOCKED si falta gate.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-PLANT-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001.md