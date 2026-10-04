task_id: "G4-PREP-IGF-DIARIO-GASTOS-MANUALES-062"

title: "Preparar PR para merge humano de gastos manuales IGF Diario"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-03"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-03"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-03"

objective: >
  Preparar el Pull Request de implementation/igf-diario-gastos-manuales-062
  hacia main. No modificar producto ni tests. El merge a main queda
  reservado al HUMAN_APPROVER.

main_reference_sha: "eb6dd697d9a80fcc573dac62d8a59dfecf4bea08"

validated_source_sha: "4b11b6e43e856c96ab482e137553e459c88d980b"

product_sha: "4071cd3dce4ee15ad74d22dfd772bf898b6e5af0"

branch: "implementation/igf-diario-gastos-manuales-062"

target_branch: "main"

validated_evidence:
  - "062 PASS (12)."
  - "059 PASS."
  - "059-R1 PASS."
  - "061 PASS."
  - "053A / 053A-R1 / 053A-R2 / 054-R3 PASS."
  - "51 pruebas relevantes PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."
  - "Forecast no consume overrides."
  - "M3 recibe Corporativos efectivos."
  - "T3 recibe Operativos efectivos."
  - "0 manual es válido."
  - "null restaura automático."

in_scope:
  - "Verificar origin/main exacto."
  - "Verificar rama ahead 2 / behind 0."
  - "Verificar que 4071cd3d es producto y 4b11b6e4 documentación."
  - "Crear reporte G4-PREP."
  - "Crear PR hacia main."
  - "STOP antes de merge."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar DB o datos."
  - "Push directo a main."
  - "Merge a main."
  - "Deploy."
  - "Siguiente tarea."

pr_contract:
  base: "main"
  head: "implementation/igf-diario-gastos-manuales-062"
  title: "IMPL 062: gastos manuales Operativos/Corporativos en IGF Diario"
  merge_executor: "HUMAN_APPROVER_ONLY"
  preferred_merge: "Squash and merge"

acceptance_criteria:
  - "origin/main sigue exactamente en eb6dd697d9a80fcc573dac62d8a59dfecf4bea08."
  - "No hay cambios nuevos de producto ni tests."
  - "PR base main / head implementation/igf-diario-gastos-manuales-062."
  - "PR creado sin merge."
  - "Reporte registra URL y número del PR."
  - "status final DONE_PENDING_REVIEW."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-DIARIO-GASTOS-MANUALES-062.md"