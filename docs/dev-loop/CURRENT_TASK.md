task_id: "G4-PREP-FIX-IGF-DIARIO-SINGLE-CHANNEL-REAL-SALES-074"

title: "Auditar FIX 074 y preparar el Pull Request hacia main"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez"

main_reference_sha: "5de98adc664185351afe0c69e29222903ba2b47e"

branch: "fix/igf-diario-single-channel-real-sales-074"

product_sha: "b3bf21e92aaee5b674ca08463cbdb6f57bb52b15"

implementation_final_sha: "f892b2804d8ecc0d2ca253a4cd0569551bb0a93a"

phase: "G4_PREP"

objective: >
  Auditar FIX 074 y, únicamente después de aprobar G4, crear el Pull
  Request hacia main. No merge. No deploy.

contract_to_audit:
  - "NUM + NUM -> suma"
  - "NUM + AUSENTE -> NUM"
  - "AUSENTE + NUM -> NUM"
  - "AUSENTE + AUSENTE -> null"
  - "0 explícito continúa siendo numérico: 0 + NUM -> NUM"
  - "NUM + 0 -> NUM"
  - "0 + 0 -> 0"

protections:
  - "no null -> 0 global"
  - "no fallback a total planta"
  - "no cambio de forecast"
  - "no cambio de upload_day"
  - "no cambio de corte"
  - "no cambio funcional de 072"
  - "no hardcode San Luis"
  - "no hardcode 04/10"
  - "no hardcode domingo"
  - "no hardcode 1701"

reference_case:
  plant: "San Luis"
  plant_id: 5
  date: "2026-10-04"
  casa_tons: 1.701
  comisionista: "ausente"
  expected_venta_kg: 1701

week_41:
  observed_before_kg: 128461.74
  recovered_kg: 1701
  expected_kg: 130162.74
  expected_display_kg: 130163

g4_must_verify:
  - "base, merge-base y ahead/behind"
  - "product_sha..implementation_final_sha contiene solo documentación"
  - "diff completo origin/main...HEAD"
  - "paridad Excel, backend, materializePlantMonth, semanal y Todas"
  - "null/null permanece null"
  - "cero explícito permanece cero"
  - "072 intacta"
  - "069-R1 intacta"
  - "070 y 070-R1 sin regresión"
  - "suites de regresión"
  - "node --check server.js"
  - "git diff --check"

report:
  path: "docs/dev-loop/reports/G4-PREP-FIX-IGF-DIARIO-SINGLE-CHANNEL-REAL-SALES-074.md"

pull_request_after_audit:
  base: "main"
  head: "fix/igf-diario-single-channel-real-sales-074"
  title: "FIX 074: conservar venta cuando existe un solo canal"
  merge: false
  deploy: false
  auto_merge: false

stop_conditions:
  - "Si origin/main != 5de98adc664185351afe0c69e29222903ba2b47e, STOP."
  - "Si el rango de producto a documentación contiene código funcional o tests, STOP."
  - "No modificar producto durante G4."
  - "No modificar tests durante G4."
  - "No merge."
  - "No deploy."
  - "No auto-merge."
