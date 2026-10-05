task_id: "G4-PREP-IGF-ACUMULADO-INCOMPLETO-PARIDAD-063-R1"

title: "Preparar PR de paridad de identidades IGF Diario acumulado 063-R1"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Preparar el Pull Request de FIX-IGF-ACUMULADO-INCOMPLETO-PARIDAD-063-R1
  hacia main. No modificar producto ni tests. El merge queda reservado
  exclusivamente al HUMAN_APPROVER.

main_reference_sha: "59e88276159b5da089c39e50e9b53da64b416577"

branch: "fix/igf-acumulado-incompleto-paridad-063-r1"

product_sha: "c399a44acb323affede41bb91acd2f34ac05d64c"

validated_source_sha: "2ec8fcbe58002cd904d2b4635d26a80ec9ad2265"

target_branch: "main"

validated_scope:
  - "Tehuacán/Tehuacan usa equivalencia de planta para Venta."
  - "GTM Queretaro/Querétaro/Queretaro usa equivalencia válida para Precio."
  - "No hay hardcode de plantas o importes."
  - "No se insertan datos."
  - "No existe fallback a Forecast."
  - "Endpoint sigue siendo GET /api/dashboard/igf-diario-acumulado."
  - "Sigue existiendo una sola request HTTP."
  - "Endpoint devuelve missing y missing_components."
  - "Frontend muestra causa de acumulado incompleto."
  - "063 null != 0 permanece intacto."
  - "061 hg = y permanece intacto."
  - "062 gastos manuales permanece intacto."
  - "M3/T3 permanece intacto."

validated_evidence:
  tehuacan: >
    La venta del acumulado se resuelve usando plantsEquivalent sobre
    nombre/canon/provinciaPlantCode/clave, eliminando la discrepancia
    Tehuacán vs Tehuacan.
  queretaro: >
    La resolución de precio acepta la familia equivalente
    GTM Queretaro / GTM Querétaro / Queretaro / Querétaro,
    manteniendo preferencia por el código exacto cuando tiene precio válido.
  san_luis: >
    Fixture conserva Margen 8.20 cuando días futuros tienen margen null;
    la semántica antigua produciría aproximadamente 0.91.
  morelos: >
    Usa la misma ponderación general, sin hardcode de valor.
  limitation: >
    No hubo consulta a producción porque DATABASE_URL no estaba disponible
    en el entorno de implementación. La validación productiva debe realizarse
    después del deploy.

validated_tests:
  - "063-R1 PASS 6/6."
  - "Regresiones 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054-R3 y 033 PASS."
  - "62/62 pruebas PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

pr_contract:
  base: "main"
  head: "fix/igf-acumulado-incompleto-paridad-063-r1"
  title: "FIX 063-R1: paridad de identidades en IGF Diario acumulado"
  merge_executor: "HUMAN_APPROVER_ONLY"
  preferred_merge: "Squash and merge"

production_validation_required_after_deploy:
  cut: "usar el corte seleccionado en producción"
  checks:
    - "Tehuacan ya no aparece incompleto si su Excel tiene H/Y."
    - "GTM Queretaro ya no aparece incompleto si su Excel tiene H/Y."
    - "San Luis Margen coincide con H TOTAL MES del Excel del mismo corte."
    - "Morelos Margen coincide con H TOTAL MES del Excel del mismo corte."
    - "HG de todas las plantas coincide con Y TOTAL MES."
    - "Zona Provincia vuelve a construirse."
    - "Forecast permanece intacto."
    - "Una sola request HTTP se conserva."

in_scope:
  - "Verificar origin/main exacto."
  - "Verificar rama ahead 2 / behind 0."
  - "Verificar product SHA y source SHA."
  - "Crear reporte G4-PREP."
  - "Crear PR hacia main."
  - "STOP antes del merge."

out_of_scope:
  - "Modificar código de producto."
  - "Modificar tests."
  - "Modificar DB."
  - "Modificar datos productivos."
  - "Merge a main."
  - "Deploy."
  - "Abrir siguiente tarea."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

acceptance_criteria:
  - "origin/main sigue exactamente en 59e88276159b5da089c39e50e9b53da64b416577."
  - "No existen cambios nuevos de producto ni tests."
  - "PR base main / head fix/igf-acumulado-incompleto-paridad-063-r1."
  - "PR queda abierto y mergeable."
  - "No se ejecuta merge."
  - "No se ejecuta deploy."
  - "Reporte registra número y URL del PR."
  - "status final DONE_PENDING_REVIEW."

result_report_path: "docs/dev-loop/reports/G4-PREP-IGF-ACUMULADO-INCOMPLETO-PARIDAD-063-R1.md"
