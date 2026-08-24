# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la documentación de Director IA con el ensamblaje multi-fuente
  ya integrado para financial_diagnosis en el chat legado, documentando que
  una sola corrida reúne IGF + ARR + M9 con provenance separada, authz
  restrictiva, periodos reales, partial failures explícitos y una sola llamada
  OpenAI, sin modificar estados de módulos ni el baseline 10.5/20 = 52.5%.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001"
  implementation_report: >
    docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-001.md

  transversal_capability: "financial_diagnosis evidence assembly"

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
  financial_diagnosis
  -> planner
  -> IGF + ARR + M9
  -> assembleFinancialDiagnosisEvidence
  -> provenance separada
  -> contexto multi-source
  -> una llamada OpenAI
  -> respuesta

must_document:

  planner_runtime_alignment:
    - "financial_diagnosis ya declaraba multi-domain"
    - "runtime ahora ejecuta IGF + ARR + M9 juntos"
    - "se cerró gap de wiring legado"

  openai:
    - "una sola llamada final"
    - "openai_call_count = 1"
    - "GA puede abortar antes de llamar"

  provenance:
    sections:
      - "igf"
      - "arr"
      - "m9"

    each_preserves:
      - "status"
      - "plant"
      - "period"
      - "payload"
      - "source/evidence"
      - "absence/error"

    rules:
      - "no fusionar procedencia"
      - "una fuente no se presenta como otra"

  period_semantics:
    - "IGF conserva periodo real"
    - "ARR conserva periodo real"
    - "M9 conserva period_a / period_b"
    - "mismatch temporal queda visible"
    - "no alineación silenciosa"

  authz:
    - "se conserva authz por fuente"
    - "se aplica alcance más restrictivo"
    - "GA aborta según reglas vigentes"
    - "GV limita M9 según regla vigente"
    - "cross-planta bloqueado"
    - "fail-closed"

  absence_error:
    distinguish:
      - "null"
      - "0"
      - "DATA_NOT_FOUND"
      - "ABSENCE_CONFIRMED si aplica"
      - "SOURCE_*"
      - "TOOL_ERROR"

    rules:
      - "null != 0"
      - "ausencia != 0"
      - "error != ausencia"
      - "una fuente no sustituye otra"

  partial_failure:
    - "fuentes OK se conservan"
    - "missing/error se marca explícitamente"
    - "diagnóstico parcial no se presenta como completo"
    - "una falla de authz no se degrada a missing"

  semantics:
    allowed:
      - "coincidencias"
      - "tensiones"
      - "comparación de evidencia temporalmente alineada"
      - "limitaciones explícitas"

    forbidden:
      - "correlación = causalidad"
      - "IGF causó ARR"
      - "delta demuestra causa"
      - "fuente faltante = resultado neutral"

  boundaries:
    - "sin IES runtime"
    - "sin Reasoning Engine runtime"
    - "sin cambios 04-IES-STANDARD.md"
    - "sin cambios 05-REASONING-ENGINE.md"
    - "sin contrato nuevo"
    - "sin HTTP interno"
    - "sin writes"

  routing_preserved:
    - "igf_status"
    - "arr_status"
    - "delta_sales"
    - "delta_discount"
    - "delta_income"
    - "M6"
    - "M11"
    - "M12"
    - "M18"

test_evidence:
  focal: "21/21 pass"
  suite: "694/694 pass"
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
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-financial-diagnosis.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-context.js"
    - "lib/director-ia-igf-arr.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-financial-diagnosis.test.js"

out_of_scope:
  - "modificar código"
  - "modificar runtime"
  - "modificar tests"
  - "modificar contratos"
  - "modificar 04-IES-STANDARD.md"
  - "modificar 05-REASONING-ENGINE.md"
  - "implementar IES runtime"
  - "implementar Reasoning Engine runtime"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Path multi-source documentado."
  - "IGF + ARR + M9 documentados en una sola corrida."
  - "Una llamada OpenAI documentada."
  - "Provenance separada documentada."
  - "Period mismatch documentado."
  - "Authz restrictiva documentada."
  - "Absence/error/null/0 diferenciados."
  - "Partial failure documentado."
  - "No causalidad documentada."
  - "Routing preservado documentado."
  - "IES/RE sin cambios documentado."
  - "Ningún módulo cambia."
  - "10.5/20 = 52.5% permanece."
  - "No código/runtime/tests."
  - "Solo tres archivos autorizados cambian."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009"

  rule: >
    Repriorizar globalmente desde 52.5%, considerando módulos y oportunidades
    transversales. No continuar financial_diagnosis por inercia y no asumir M10.

report_requirements:
  path: >
    docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001.md

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "runtime path"
    - "planner/runtime alignment"
    - "IGF block"
    - "ARR block"
    - "M9 block"
    - "provenance"
    - "period semantics"
    - "authz"
    - "absence/error"
    - "partial failure"
    - "OpenAI call count"
    - "routing preservation"
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
  multi-source y mantiene 52.5%. STOPPED si contradice la implementación física.
  BLOCKED si falta gate.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-EVIDENCE-ASSEMBLY-SYNC-001.md