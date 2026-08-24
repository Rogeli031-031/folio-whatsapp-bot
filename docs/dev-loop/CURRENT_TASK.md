# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar la capability matrix de Director IA con el slice read-only de
  M5 — Taller por AT — ya integrado en main, cambiando M5 de NO INTEGRADA a
  PARTIAL y recalculando el avance global de 10.0/20 = 50.0% a
  10.5/20 = 52.5%, sin marcar COMPLETE y manteniendo Excel, workbook,
  duplicados y writes fuera.

baseline:
  implementation_task: "IMPL-DIRECTOR-IA-M5-TALLER-AT-001"
  implementation_report: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M5-TALLER-AT-001.md"

  module: "M5 — Taller por AT"
  state_before: "NO INTEGRADA"
  state_after: "PARTIAL"

  global_before:
    numerator: 10.0
    denominator: 20
    percentage: 50.0

  global_after:
    numerator: 10.5
    denominator: 20
    percentage: 52.5

  gain_pp: 2.5

implemented_slice:
  path: >
    taller_at -> get_taller_at ->
    loadTallerAtForChat ->
    SELECT public.folios ->
    evidencia -> respuesta

  supported:
    - "consulta TALLER por unidad"
    - "unidad física public.folios.unidad"
    - "tokens homologados como AT-15 / PT-03"
    - "planta"
    - "periodo YYYY-MM"
    - "folios"
    - "importe"
    - "estatus"
    - "conteo/total si derivables"

  unit_semantics:
    - "no existe at_id"
    - "no existe catálogo AT"
    - "unidad != responsable"
    - "no fuzzy match silencioso"

  period_semantics:
    - "YYYY-MM obligatorio"
    - "sin periodo -> clarificación"
    - "no inventar mes"

  boundaries:
    - "TALLER != GASTOS"
    - "TALLER != INVERSIONES"
    - "M5 detalle por unidad != M4 familia agregada"
    - "TALLER != Action Register"
    - "Excel/workbook fuera"
    - "duplicados fuera"
    - "writes fuera"
    - "HTTP interno fuera"

  authz:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas"
    - "cross-planta bloqueado"
    - "fail-closed"
    - "GA/GV según reglas vigentes"

canonical_rule: >
  M5 queda PARTIAL. La query JSON read-only por unidad no satisface
  el propósito canónico completo si Excel/workbook, duplicados u otras
  capacidades requeridas siguen fuera.

test_evidence:
  focal_m5: "16/16 pass"
  capabilities: "56/56 pass"
  planner: "49/49 pass"
  orchestrator: "26/26 pass"
  director_ia_suite: "673/673 pass"
  git_diff_check: "clean"

documentation_policy:
  must_update:
    - "M5: NO INTEGRADA -> PARTIAL"
    - "Taller por AT read-only disponible"
    - "public.folios.unidad"
    - "no at_id"
    - "YYYY-MM obligatorio"
    - "TALLER separado de GASTOS/INVERSIONES"
    - "M4 boundary"
    - "Action Register boundary"
    - "Excel/workbook fuera"
    - "duplicados fuera"
    - "writes fuera"
    - "authz"
    - "10.0/20 -> 10.5/20"
    - "50.0% -> 52.5%"

  must_preserve:
    - "M5 != COMPLETE"
    - "Excel no integrado"
    - "workbook no integrado"
    - "duplicados no integrados"
    - "writes no integrados"
    - "ningún otro módulo cambia"

  forbidden:
    - "marcar M5 COMPLETE"
    - "contar Excel como integrado"
    - "contar duplicados como integrados"
    - "subir global por encima de 52.5% por esta tarea"
    - "cambiar estado de otros módulos"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/director-ia-m5-taller-at.js"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "test/director-ia-m5-taller-at.test.js"

out_of_scope:
  - "modificar código"
  - "modificar runtime"
  - "modificar tests"
  - "modificar frontend"
  - "modificar SQL/schema"
  - "modificar contratos"
  - "integrar Excel"
  - "integrar workbook"
  - "integrar duplicados"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Implementación M5 verificada físicamente en main."
  - "M5 cambia documentalmente de NO INTEGRADA a PARTIAL."
  - "M5 no se marca COMPLETE."
  - "Taller por unidad queda documentado."
  - "public.folios.unidad queda documentado."
  - "No at_id queda documentado."
  - "YYYY-MM obligatorio queda documentado."
  - "TALLER separado de GASTOS/INVERSIONES queda documentado."
  - "M4 boundary queda documentado."
  - "Action Register boundary queda documentado."
  - "Excel/workbook siguen fuera."
  - "Duplicados siguen fuera."
  - "Writes siguen fuera."
  - "Numerador pasa de 10.0 a 10.5."
  - "Denominador permanece 20."
  - "Porcentaje pasa de 50.0% a 52.5%."
  - "Ningún otro módulo cambia."
  - "No se modifica código/runtime/tests."
  - "Solo los tres archivos autorizados cambian."
  - "git diff --check limpio."

next_task_policy:
  if_success:
    propose_exactly_one: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008"

  rule: >
    Repriorizar globalmente desde 52.5%. No continuar M5 por inercia.

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "implementación verificada"
    - "path físico"
    - "unidad semantics"
    - "period semantics"
    - "Taller semantics"
    - "M4 boundary"
    - "M6 boundary"
    - "Action Register boundary"
    - "Excel boundary"
    - "duplicates boundary"
    - "authz"
    - "tests"
    - "M5 PARTIAL"
    - "10.0/20 -> 10.5/20"
    - "50.0% -> 52.5%"
    - "cambios exactos en matriz"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la matriz refleja M5 PARTIAL y
  10.5/20 = 52.5% sin marcar COMPLETE. STOPPED si contradice el runtime
  físico. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M5-CAPABILITY-MATRIX-SYNC-001.md"