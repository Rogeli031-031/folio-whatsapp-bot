task_id: "G4-PREP-FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1"

title: "Preparar integración de FIX 069-R1"

status: "DONE_PENDING_REVIEW"

mode: "INTEGRATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-07"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

main_reference_sha: "f50e61356325b13be289beb4e6354b52634f5eee"

branch: "fix/igf-diario-weekly-coverage-resumen-5d-069-r1"

product_sha: "be14171adbe9fd1d55b59a5dee22eea3d1c616c5"

implementation_final_sha: "493e2b6387f1b71006eeaaf89a9a9132b57a9d90"

expected_before_g4:
  ahead: 2
  behind: 0
  merge_base: "f50e61356325b13be289beb4e6354b52634f5eee"

verified_scope:
  san_luis:
    - "Un domingo con venta null no anula la semana."
    - "Venta fixture 04–10 = 143031 kg."
    - "Ponderados usan únicamente días con venta > 0."
    - "Faltante en día con venta positiva permanece como falta real."
    - "Resultado $/kg = Resultado Importe / Venta."

  daily:
    - "Precio/costo/flete/margen pueden existir en día sin venta."
    - "Venta null permanece null."
    - "No global null->0."

  chart_5d:
    - "Semana 04/10–10/10 -> 5D 04/10–08/10."
    - "Semana 27/09–03/10 -> 5D 27/09–01/10."
    - "week_anchor viaja desde la semana seleccionada."
    - "No usa cierre de mes para 5D."

  excel:
    - "Export individual reserva RESUMEN antes de IGF Diario."
    - "RESUMEN usa loadWeeklyPlant."
    - "Tabla Concepto | Semana | Dom–Sáb."
    - "Gráfica PNG embebida con sharp."
    - "summary_metric validada."
    - "Sin dependencia nueva."

validated_tests:
  - "93/93 reportadas PASS."
  - "069-R1 PASS."
  - "069 PASS."
  - "068-R2 PASS."
  - "068-R1 PASS."
  - "068 PASS."
  - "067 PASS."
  - "066-R1 PASS."
  - "066 PASS."
  - "065-R1 PASS."
  - "065 PASS."
  - "064-R1 PASS."
  - "064 PASS."
  - "node --check server.js PASS."
  - "frontend npm run build exit 0."
  - "git diff --check limpio."

production_validation_required:
  san_luis:
    - "Seleccionar San Luis."
    - "Confirmar Semana 41 04/10–10/10."
    - "Confirmar Venta semanal ya no es —."
    - "Confirmar venta aproximada 143031 kg con el fixture observado."
    - "Confirmar domingo conserva venta — pero puede mostrar precio/costo/flete."
    - "Confirmar Resultado semanal ya no desaparece por el domingo."

  all_plants:
    - "Seleccionar Todas."
    - "Confirmar que San Luis deja de estar vacío."
    - "Confirmar que las demás plantas no cambian."

  chart:
    - "Abrir Semana 41 de San Luis."
    - "Abrir gráfica de RESULTADO Importe."
    - "Seleccionar 5D."
    - "Confirmar eje X 04/10–08/10."
    - "Confirmar que NO muestra 27/10–31/10."
    - "Ir a semana anterior y validar 27/09–01/10."

  excel:
    - "Desde la gráfica semanal descargar Excel."
    - "Confirmar hoja #1 RESUMEN."
    - "Confirmar hoja #2 IGF Diario San Luis."
    - "Confirmar título y Semana 41."
    - "Confirmar tabla Semana + Dom–Sáb."
    - "Confirmar valores contra dashboard."
    - "Confirmar gráfica embebida."
    - "Confirmar gráfica corresponde a la métrica seleccionada."
    - "Confirmar resto de hojas del workbook."

  regression:
    - "Forecast no cambia."
    - "ARR no cambia."
    - "Folios 068 no cambia."
    - "Precio 068-R1/R2 no cambia."
    - "Export Todas no cambia."

pr_contract:
  base: "main"
  head: "fix/igf-diario-weekly-coverage-resumen-5d-069-r1"
  title: "FIX 069-R1: cobertura semanal, RESUMEN Excel y 5D por semana"
  preferred_merge: "Squash and merge"
  merge_executor: "HUMAN_APPROVER_ONLY"

in_scope:
  - "Verificar origin/main exacto."
  - "Verificar ahead 2 / behind 0."
  - "Verificar que no exista cambio de producto después de 493e2b6387f1b71006eeaaf89a9a9132b57a9d90."
  - "Crear reporte G4-PREP."
  - "Actualizar CURRENT_TASK."
  - "Crear commit exclusivamente documental."
  - "Push únicamente a la rama 069-R1."
  - "Crear PR."
  - "Verificar mergeable."
  - "STOP."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar fórmulas."
  - "Modificar Excel."
  - "Modificar gráfica."
  - "Modificar DB."
  - "Rebase."
  - "Merge."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

stop_conditions:
  - "Si origin/main != f50e61356325b13be289beb4e6354b52634f5eee, STOP."
  - "Si la rama no está ahead 2 / behind 0 antes del commit G4, STOP."
  - "Si aparece un cambio de producto posterior a 493e2b6387f1b71006eeaaf89a9a9132b57a9d90, STOP."
  - "Si el PR tiene conflictos o no es mergeable, STOP."
  - "No rebase."
  - "No merge."
  - "No deploy."

result_report_path: "docs/dev-loop/reports/G4-PREP-FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1.md"