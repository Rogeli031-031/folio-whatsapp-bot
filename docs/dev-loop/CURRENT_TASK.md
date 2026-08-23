# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la capability matrix de Director IA para reflejar la implementación
  read-only de M6 — GASTOS / INVERSIONES — ya integrada en main, cambiando M6
  de NO INTEGRADA a PARTIAL y recalculando el avance global de 8.5/20 = 42.5%
  a 9.0/20 = 45.0%, sin marcar COMPLETE y preservando Export/XLSX fuera.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-M6-GASTOS-INVERSIONES-001"
  module: "M6 — GASTOS / INVERSIONES"

  state_before: "NO INTEGRADA"
  state_after: "PARTIAL"

  global_before:
    numerator: 8.5
    denominator: 20
    percentage: 42.5

  global_after:
    numerator: 9.0
    denominator: 20
    percentage: 45.0

  gain_pp: 2.5

implemented_slice:
  supported:
    - "GASTOS de folios por planta"
    - "INVERSIONES de folios por planta"
    - "periodo YYYY-MM"
    - "partida/concepto"
    - "importe cuando existe"
    - "estatus cuando existe"
    - "conteos/totales derivados del conjunto"
    - "evidencia estructurada"

  path: >
    expense_analysis / investment_analysis -> tool ->
    loadGastosInversionesForChat(category) ->
    SELECT public.folios + expandCategoriaRows ->
    evidencia -> respuesta

  semantics:
    - "GASTOS ≠ INVERSIONES"
    - "M6 ≠ IGF"
    - "YYYY-MM obligatorio"
    - "no inventar periodo"
    - "0 filas = respuesta válida"
    - "no inferir desviación sin baseline"
    - "no inferir causa por importe"

  authz:
    - "JWT/contexto preservado"
    - "rol preservado"
    - "planta_id preservado"
    - "plantas_permitidas preservado"
    - "GV = 403"
    - "GA permitido dentro de planta autorizada"
    - "cross-planta = 403"
    - "fail-closed"

still_not_integrated:
  - "Export"
  - "Excel"
  - "xlsx"
  - "generación de archivo"
  - "writes"
  - "forecast"
  - "comparaciones no soportadas"

canonical_rule: >
  M6 sigue siendo PARTIAL porque el propósito canónico incluye Export.
  La consulta estructurada read-only no satisface COMPLETE.

test_evidence:
  focal_m6: "24/24 pass"
  capabilities: "green"
  planner: "green"
  orchestrator: "green"
  director_ia_suite: "557/557 pass"
  git_diff_check: "clean"

documentation_policy:
  must_update:
    - "estado M6: NO INTEGRADA -> PARTIAL"
    - "cobertura query read-only"
    - "GASTOS"
    - "INVERSIONES"
    - "periodo YYYY-MM"
    - "source public.folios + expandCategoriaRows"
    - "separación de IGF"
    - "authz"
    - "limitaciones"
    - "recalculo global 9.0/20 = 45.0%"

  must_preserve:
    - "M6 no COMPLETE"
    - "Export no integrado"
    - "Excel/xlsx no integrado"
    - "IGF separado"
    - "no writes"

  forbidden:
    - "marcar COMPLETE"
    - "contar Export como integrado"
    - "mezclar M6 con IGF"
    - "subir más de 45.0%"
    - "cambiar estados de otros módulos sin evidencia"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-m6-gastos-inversiones.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-m6-gastos-inversiones.test.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"

out_of_scope:
  - "modificar código"
  - "modificar runtime"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "modificar schema"
  - "crear migration"
  - "modificar contratos"
  - "marcar M6 COMPLETE"
  - "integrar Export"
  - "integrar Excel"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se verificó físicamente la implementación M6 en main."
  - "M6 cambió documentalmente de NO INTEGRADA a PARTIAL."
  - "Se documentó GASTOS."
  - "Se documentó INVERSIONES."
  - "Se documentó YYYY-MM obligatorio."
  - "Se documentó separación M6/IGF."
  - "Se documentó authz."
  - "Export sigue fuera."
  - "Excel/xlsx sigue fuera."
  - "M6 no se marca COMPLETE."
  - "Numerador pasa de 8.5 a 9.0."
  - "Denominador sigue 20."
  - "Porcentaje pasa de 42.5% a 45.0%."
  - "Ningún otro módulo cambia de etiqueta sin evidencia."
  - "No se modificó código."
  - "No se modificaron tests."
  - "Solo CURRENT_TASK, reporte y capability matrix fueron modificados."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002"

  rule: >
    La siguiente tarea debe volver a priorizar globalmente por valor ejecutivo
    desde el nuevo baseline 45.0%. No asumir M4 ni ningún módulo específico.

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "implementación M6 verificada"
    - "estado antes/después"
    - "GASTOS"
    - "INVERSIONES"
    - "source"
    - "period semantics"
    - "IGF boundary"
    - "authz"
    - "Export boundary"
    - "tests"
    - "recalculo 8.5/20 -> 9.0/20"
    - "42.5% -> 45.0%"
    - "cambios exactos en matriz"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la matriz refleja M6 PARTIAL y el nuevo baseline
  9.0/20 = 45.0% sin marcar COMPLETE. STOPPED si la documentación vigente
  impide reflejar la implementación sin reinterpretación. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001.md"