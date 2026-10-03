task_id: "G4-PREP-IGF-FORECAST-ACUMULADO-059-R1"

title: "Preparar PR para merge humano G4 de 059 + 059-R1"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-03T11:54:45-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-03"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-03"

objective: >
  Preparar el Pull Request de integration/igf-forecast-acumulado-059-r1
  hacia main después de la validación completa de 059 + 059-R1.
  El implementador puede verificar, documentar y crear el PR,
  pero el merge a main será ejecutado exclusivamente por el HUMAN_APPROVER.
  Esta tarea no autoriza deploy automático ni siguiente tarea.

implementation: false

code_changes: false

schema_changes: false

data_mutation: false

main_reference_sha: "c907696506594860e286db432cb07cbf3f3f5c72"

validated_source_sha: "5f74da3945d0fdec0a3f46648dc35e7ae7f3dcca"

product_source_sha: "8a4c49f5b482d78e6157f871afb7bb64adcdb856"

branch: "integration/igf-forecast-acumulado-059-r1"

target_branch: "main"

validated_product_commits:
  - "48863b0f29ec983396c64ffb09e3b52805572f36"
  - "8a4c49f5b482d78e6157f871afb7bb64adcdb856"

validation_commit:
  - "5f74da3945d0fdec0a3f46648dc35e7ae7f3dcca"

validated_evidence:
  - "75 tests PASS, 0 FAIL."
  - "frontend-dashboard npm run build PASS."
  - "git diff --check limpio."
  - "Rama de integración ahead 3 / behind 0 respecto de main."
  - "No existen cambios de producto posteriores a 8a4c49f5b482d78e6157f871afb7bb64adcdb856."
  - "Acapulco producción = public.plantas.id 1, clave ACAPULCO."
  - "public.plantas.id 12 = E10."
  - "No se requiere migración ni modificación de datos."
  - "El null de FLETE del 2026-10-01 en main es cubierto por el fallback histórico implementado en 059."

in_scope:
  - "Leer AGENTS.md."
  - "Leer docs/dev-loop/LOOP_PROTOCOL.md."
  - "Leer docs/dev-loop/CURRENT_TASK.md."
  - "Verificar que origin/main sigue exactamente en main_reference_sha."
  - "Verificar que validated_source_sha sigue siendo ancestro/punta previa de esta rama."
  - "Verificar que main es ancestro de product_source_sha."
  - "Verificar que no existen cambios de producto posteriores a product_source_sha."
  - "Verificar que el único cambio nuevo de esta tarea antes del commit sea CURRENT_TASK.md."
  - "Ejecutar git diff --check."
  - "Crear docs/dev-loop/reports/G4-PREP-IGF-FORECAST-ACUMULADO-059-R1.md."
  - "docs/dev-loop/CURRENT_TASK.md solo transiciones de status permitidas."
  - "Commit únicamente del reporte y CURRENT_TASK.md."
  - "Push únicamente a integration/igf-forecast-acumulado-059-r1."
  - "Crear Pull Request desde integration/igf-forecast-acumulado-059-r1 hacia main."
  - "Reportar número y URL del PR."
  - "STOP antes de cualquier merge."

out_of_scope:
  - "Modificar frontend-dashboard/components/IgfForecastClient.tsx."
  - "Modificar frontend-dashboard/lib/api.ts."
  - "Modificar lib/compras-dashboard.js."
  - "Modificar lib/compras-excel.js."
  - "Modificar lib/dashboard-arr-forecast.js."
  - "Modificar lib/igf-diario-grafica.js."
  - "Modificar lib/igf-diario-puebla.js."
  - "Modificar server.js."
  - "Modificar cualquier test."
  - "Modificar DB/schema/data."
  - "Modificar public.plantas."
  - "Migrar compras."
  - "Editar folio-060-wt."
  - "Editar otros worktrees."
  - "Push a main."
  - "Merge a main."
  - "Deploy."
  - "Autorizar siguiente tarea."

contracts_in_force:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "origin/main en c907696506594860e286db432cb07cbf3f3f5c72"

pr_contract:
  base: "main"
  head: "integration/igf-forecast-acumulado-059-r1"
  title: "FIX 059 + 059-R1: IGF Diario acumulado y tarifa día 1"
  merge_executor: "HUMAN_APPROVER_ONLY"
  deploy_authorized: false

acceptance_criteria:
  - "origin/main continúa exactamente en c907696506594860e286db432cb07cbf3f3f5c72 antes de crear el PR."
  - "No se modifica ningún archivo de producto."
  - "No se modifica ningún test."
  - "El nuevo commit de esta tarea contiene solo CURRENT_TASK.md y el reporte G4-PREP."
  - "La rama continúa basada en los dos commits de producto 059 y 059-R1 ya validados."
  - "git diff --check PASS."
  - "El PR apunta de integration/igf-forecast-acumulado-059-r1 a main."
  - "El PR no se fusiona."
  - "No se ejecuta deploy."
  - "El reporte identifica el SHA final de la rama y el número/URL del PR."
  - "El reporte deja explícito que el siguiente acto es el merge humano G4."

allowed_actions:
  - "Cambiar AUTHORIZED a IN_PROGRESS modificando solo status."
  - "Validaciones read-only."
  - "Crear reporte G4-PREP."
  - "Cambiar status final a DONE_PENDING_REVIEW."
  - "Commit de CURRENT_TASK.md y reporte únicamente."
  - "Push solo a integration/igf-forecast-acumulado-059-r1."
  - "Crear PR hacia main."
  - "Usar gh pr create si gh ya está instalado y autenticado."

forbidden_actions:
  - "Modificar código de producto."
  - "Modificar tests."
  - "git add ."
  - "git push origin main."
  - "git merge."
  - "gh pr merge."
  - "Squash/merge/rebase sobre main."
  - "Deploy."
  - "Writes o DDL."
  - "Cambiar authorized_by."
  - "Cambiar authorized_at."
  - "Cambiar human_authorization."
  - "Cambiar g4_authorization."
  - "Abrir o ejecutar siguiente tarea."

fallback_if_gh_unavailable:
  - "No instalar gh."
  - "No iniciar sesión ni cambiar credenciales."
  - "Documentar el bloqueo."
  - "Entregar la URL manual para abrir el PR."
  - "STOP sin merge."

max_attempts: 1

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-FORECAST-ACUMULADO-059-R1.md"