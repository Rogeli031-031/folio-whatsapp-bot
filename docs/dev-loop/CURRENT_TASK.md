# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la capability matrix de Director IA con la implementación
  read-only de M4 ya integrada en main, cambiando M4 de NO INTEGRADA a PARTIAL
  y recalculando el avance global de 9.0/20 = 45.0% a 9.5/20 = 47.5%,
  sin marcar COMPLETE y manteniendo COMPARAR/Excel fuera.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001"
  implementation_report: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001.md"

  module: "M4 — Clasificación de apoyos + COMPARAR"
  state_before: "NO INTEGRADA"
  state_after: "PARTIAL"

  global_before:
    numerator: 9.0
    denominator: 20
    percentage: 45.0

  global_after:
    numerator: 9.5
    denominator: 20
    percentage: 47.5

  gain_pp: 2.5

implemented_slice:
  supported:
    - "query JSON read-only"
    - "comparación mes_a vs mes_b"
    - "GASTOS"
    - "INVERSIONES"
    - "TALLER"
    - "planta autorizada"
    - "valores comparativos y diferencias físicamente soportadas"
    - "evidencia estructurada"

  path: >
    intent M4 query -> tool -> executor ->
    loadClasificacionApoyosForChat ->
    SELECT public.folios + buildClasificacionMatrix ->
    evidencia -> respuesta

  periods:
    - "mes_a obligatorio"
    - "mes_b obligatorio"
    - "YYYY-MM"
    - "mes_a != mes_b"
    - "sin defaults inventados"

  plant_scope:
    - "sin fallback a las 6 plantas"
    - "planta autorizada"
    - "plantas_permitidas"
    - "cross-planta bloqueado"
    - "fail-closed"

  semantics:
    - "GASTOS / INVERSIONES / TALLER permanecen separados"
    - "delta factual no implica causalidad"
    - "aumento no implica problema"
    - "disminución no implica mejora"
    - "no desviación presupuestal sin baseline correspondiente"

still_not_integrated:
  - "COMPARAR"
  - "writes de COMPARAR"
  - "insertFolio"
  - "UPDATE mes_cargo"
  - "Excel"
  - "xlsx"
  - "reconciliación Excel"
  - "propósito completo de M4"

canonical_rule: >
  M4 queda PARTIAL. La query comparativa read-only no satisface el propósito
  canónico completo de Clasificación de apoyos + COMPARAR.

test_evidence:
  focal_m4: "18/18 pass"
  capabilities: "42 pass"
  planner: "39 pass"
  orchestrator: "24 pass"
  director_ia_suite: "575/575 pass"
  git_diff_check: "clean"

documentation_policy:
  must_update:
    - "M4: NO INTEGRADA -> PARTIAL"
    - "query mes_a vs mes_b disponible"
    - "GASTOS / INVERSIONES / TALLER"
    - "source public.folios + buildClasificacionMatrix"
    - "period semantics"
    - "plant scope"
    - "authz"
    - "sin fallback global"
    - "COMPARAR fuera"
    - "Excel fuera"
    - "recalculo 9.0/20 -> 9.5/20"
    - "45.0% -> 47.5%"

  must_preserve:
    - "M4 != COMPLETE"
    - "COMPARAR no integrado"
    - "Excel/xlsx no integrado"
    - "writes no integrados"
    - "ningún otro módulo cambia sin evidencia"

  forbidden:
    - "marcar M4 COMPLETE"
    - "contar COMPARAR como integrado"
    - "contar Excel como integrado"
    - "subir global por encima de 47.5% por esta tarea"
    - "cambiar estados de otros módulos"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-m4-clasificacion-query.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-m4-clasificacion-query.test.js"

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
  - "implementar COMPARAR"
  - "implementar Excel"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Implementación M4 verificada físicamente en main."
  - "M4 cambia documentalmente de NO INTEGRADA a PARTIAL."
  - "M4 no se marca COMPLETE."
  - "Query mes_a vs mes_b queda documentada."
  - "GASTOS/INVERSIONES/TALLER quedan documentados y separados."
  - "YYYY-MM y A != B quedan documentados."
  - "No fallback global queda documentado."
  - "Authz queda documentada."
  - "COMPARAR sigue fuera."
  - "Excel/xlsx sigue fuera."
  - "Numerador pasa de 9.0 a 9.5."
  - "Denominador permanece 20."
  - "Porcentaje pasa de 45.0% a 47.5%."
  - "Ningún otro módulo cambia."
  - "No se modifica código/runtime/tests."
  - "Solo los tres archivos autorizados cambian."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003"

  rule: >
    Volver a priorizar globalmente desde el nuevo baseline 47.5%.
    No continuar M4 por inercia y no asumir M18 como ganador.

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "implementación M4 verificada"
    - "estado antes/después"
    - "query mes_a vs mes_b"
    - "GASTOS / INVERSIONES / TALLER"
    - "source"
    - "period semantics"
    - "plant scope"
    - "authz"
    - "no fallback global"
    - "COMPARAR boundary"
    - "Excel boundary"
    - "tests"
    - "recalculo 9.0/20 -> 9.5/20"
    - "45.0% -> 47.5%"
    - "cambios exactos en matriz"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la matriz refleja M4 PARTIAL y el baseline
  9.5/20 = 47.5% sin marcar COMPLETE. STOPPED si la documentación vigente
  contradice la implementación física. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001.md"