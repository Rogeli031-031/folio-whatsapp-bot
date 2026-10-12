task_id: FIX-IGF-DIARIO-EXCEL-COMDESC-FALLBACK-PARITY-080
status: DONE_PENDING_REVIEW
phase: IMPLEMENTATION

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez"

base_sha: "f9ca41b8194f8c7598054735283800b277873f26"
branch: "fix/igf-diario-excel-comdesc-fallback-parity-080"
product_sha: "d7081e522beb27f307b7dfcfa2c9e39bd3e774b8"

problem:
  surface: "Excel IGF Diario {planta}"
  fixture: "San Luis 04/10/2026"
  observed:
    dashboard:
      com_desc_kg: -4.33
      resultado_kg: 5.69
      resultado_mxn: 9680.43
    excel:
      com_desc_kg: null
      resultado_kg: null
      resultado_mxn: null

goal: >
  Hacer que el Excel detallado consuma la misma resolución financiera
  ya implementada por 078-R2 que utiliza el Dashboard.

contract:
  - "Misma planta + fecha + cutoff => Dashboard y Excel deben resolver los mismos valores."
  - "078-R2 sigue siendo la fuente de verdad para LAST_REAL_FALLBACK."
  - "No duplicar una segunda implementación del fallback dentro del Excel."
  - "Un real propio prevalece."
  - "Cero explícito sigue siendo válido."
  - "Projected conserva forecast."
  - "Sin fuente válida conserva null."

protections:
  - "No modificar semántica de 078-R2."
  - "No modificar PROM/pronostico_dias_seleccion."
  - "No modificar cutoff."
  - "No null->0."
  - "No hardcode San Luis."
  - "No hardcode 04/10."
  - "No modificar valores fuente."
  - "No modificar DB."
  - "No migrations."
  - "Preservar FIX 079 domingo-sábado."

expected_fixture:
  plant: "San Luis"
  date: "2026-10-04"
  com_desc_kg: -4.33
  resultado_kg_display: 5.69
  resultado_mxn_display: 9680.43
  source: "LAST_REAL_FALLBACK"
  source_date: "2026-10-03"

completion:
  status: DONE_PENDING_REVIEW
  push_branch_only: true
  create_pr: false
  merge: false
  deploy: false

tests: "106/108 en las suites pedidas. Los 2 fallos están en forecast-excel-plant-compras-024 y leen una ventana fija de server.js, archivo no modificado."
result_report_path: docs/dev-loop/reports/FIX-IGF-DIARIO-EXCEL-COMDESC-FALLBACK-PARITY-080.md
