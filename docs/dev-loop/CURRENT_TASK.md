task_id: FIX-IGF-DIARIO-COMDESC-LAST-REAL-FALLBACK-078-R2

title: "Fallback de última tasa real para resultado diario con venta real"

status: DONE_PENDING_REVIEW
phase: IMPLEMENTATION

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez"

base_sha: "d3a63cb96c4483a3caa3c85db5f5e6ee0fd4030c"
product_sha: "eb03de9206508da33b7fcf3fc55d665508bdd37f"

branch: "fix/igf-diario-comdesc-last-real-fallback-078-r2"

source_evidence:
  audit_078:
    classification: BUSINESS_DECISION_REQUIRED
    documentation_sha: "628ec08f1f0682c249b824fb6a36233c0ec97896"

  audit_078_r1:
    outcome: B
    documentation_sha: "9463ea26c28d7ea883bf909760e8ee1abf4c8be8"

business_decision:
  rule: >
    Cuando un día REAL tiene Venta KG > 0 pero no tiene una tasa real
    de comisión/descuento, usar como fallback la última tasa REAL
    anterior válida de la planta.

precedence:
  real_day:
    - "1. tasa real/capturada válida del propio día"
    - "2. última tasa real anterior válida"
    - "3. null si no existe antecedente válido"

  projected_day:
    - "Mantener resolveComisionCd/forecast vigente sin cambios."

lookback_contract:
  primary: >
    Buscar primero la última tasa real válida anterior dentro del mismo
    mes calendario.

  secondary: >
    Si no existe ninguna tasa real anterior válida dentro del mes,
    permitir la última tasa real válida del mes calendario inmediatamente
    anterior.

  limit: >
    No buscar más atrás que el mes inmediatamente anterior.

zero_semantics:
  - "0 capturado explícitamente es una tasa real válida."
  - "Una tasa 0 anterior válida puede ser fallback."
  - "Ausencia/null no equivale a 0."

critical_case:
  plant: "San Luis"
  date: "2026-10-04"
  venta_kg: 1701
  own_real_rate: null
  expected_fallback_source_date: "2026-10-03"
  expected_fallback_rate: -4.33
  observed_source: LAST_REAL_FALLBACK
  observed_sobrante_con_hg_kg: 10.021022975903595
  observed_resultado_kg: 5.691022975903596
  observed_resultado_mxn: 9680.430082012017

expected_behavior:
  - "04/10 deja de tener com_desc_kg null."
  - "04/10 obtiene com_desc_kg = -4.33 mediante fallback real."
  - "resultado_kg se calcula con la fórmula diaria existente."
  - "resultado_mxn se calcula con la fórmula diaria existente."
  - "No crear fórmula especial para domingo."
  - "077 debe incorporar naturalmente esos 1,701 kg a la cobertura."

protections:
  - "No modificar arr.pronostico_dias_seleccion."
  - "No reabrir 13/09 ni 20/09."
  - "No modificar computePromMesByDow."
  - "No modificar weekdayPromAt."
  - "No cambiar forecast de días proyectados."
  - "No sustituir una tasa real existente."
  - "No convertir null a 0."
  - "No usar tasa futura."
  - "No usar 05/10 para calcular 04/10."
  - "No hardcode San Luis."
  - "No hardcode domingo."
  - "No hardcode -4.33."
  - "No cambiar Venta KG."
  - "No cambiar cutoff."
  - "No DB writes."
  - "No migrations."

interaction_077:
  rule: >
    No modificar la matemática de cobertura de 077. Al resolver
    correctamente el dato diario, la cobertura semanal debe aumentar
    de forma natural.

tests_required:
  - "Tasa propia real prevalece."
  - "Venta real + tasa ausente usa última tasa real anterior."
  - "Fallback nunca usa una fecha futura."
  - "Busca primero dentro del mismo mes."
  - "Día 1 puede usar última tasa válida del mes anterior."
  - "No busca más atrás del mes anterior."
  - "0 propio es válido."
  - "0 anterior es fallback válido."
  - "Sin antecedente válido queda null."
  - "Día proyectado conserva forecast vigente."
  - "arr.pronostico_dias_seleccion permanece intacto."
  - "San Luis 04/10 usa 03/10 como fuente."
  - "resultado_kg diario se recupera."
  - "resultado_mxn diario se recupera."
  - "077 aumenta cobertura automáticamente."
  - "Todas/Provincia conserva paridad."
  - "Excel/backend/UI conservan la misma tasa y resultado."

report:
  path: "docs/dev-loop/reports/FIX-IGF-DIARIO-COMDESC-LAST-REAL-FALLBACK-078-R2.md"

completion:
  status: DONE_PENDING_REVIEW
  tests: "110/110"
  todas: PASS
  commit_product: true
  commit_documentation: true
  push_branch_only: true
  create_pr: false
  merge: false
  deploy: false
