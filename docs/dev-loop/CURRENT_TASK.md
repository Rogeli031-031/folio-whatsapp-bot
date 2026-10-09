task_id: "FIX-IGF-DIARIO-DESCUENTOS-SIGN-SEMANTICS-070-R1"

title: "Corregir semántica Subió/Bajó para comisiones negativas"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-09"

main_reference_sha: "bccdf84e5f19fec65c282eff5eb7eec6d6132241"

branch: "fix/igf-diario-descuentos-sign-semantics-070-r1"

objective: >
  Corregir exclusivamente la interpretación Subió/Bajó de la columna
  DESCUENTOS de IGF Diario. La comisión/descuento puede almacenarse como
  valor negativo; el sentido comercial debe determinarse por la magnitud
  absoluta del cargo y no por la comparación algebraica de los valores
  firmados.

business_semantics:
  principle: >
    Una comisión de mayor magnitud representa una comisión mayor,
    aunque numéricamente sea más negativa.

  comparison:
    previous_magnitude: "ABS(previous_commission_per_kg)"
    current_magnitude: "ABS(current_commission_per_kg)"
    magnitude_delta: "ABS(current_commission_per_kg) - ABS(previous_commission_per_kg)"

  rules:
    - >
      Si ABS(actual) > ABS(anterior):
      la comisión SUBIÓ.
    - >
      Si ABS(actual) < ABS(anterior):
      la comisión BAJÓ.
    - >
      Si ABS(actual) == ABS(anterior):
      no existe cambio de magnitud y no se genera comentario.

display_contract:
  - "Conservar los valores anterior y actual con su signo real."
  - "El importe del cambio mostrado al final debe ser la diferencia ABSOLUTA entre magnitudes."
  - "No mostrar + o - delante del delta final."
  - "Subió = delta final rojo."
  - "Bajó = delta final verde."
  - "Solo colorear el delta final."
  - "Mantener 3 decimales."

examples:
  case_1:
    previous: -3.000
    current: -4.000
    expected_direction: "Subió"
    expected_delta: "$1.000/kg"
    expected_color: "red"

  case_2:
    previous: -2.500
    current: -2.000
    expected_direction: "Bajó"
    expected_delta: "$0.500/kg"
    expected_color: "green"

  case_3_arturo:
    previous: -4.630
    current: -4.352
    expected_direction: "Bajó"
    expected_delta: "$0.278/kg"
    expected_color: "green"
    expected_text: >
      ARTURO ANDRADE SANCHEZ — Bajó su comisión respecto a su última compra
      de -$4.630/kg a -$4.352/kg = $0.278/kg

  case_4_positive:
    previous: 3.000
    current: 4.000
    expected_direction: "Subió"
    expected_delta: "$1.000/kg"
    expected_color: "red"

  case_5_positive_decrease:
    previous: 4.000
    current: 3.000
    expected_direction: "Bajó"
    expected_delta: "$1.000/kg"
    expected_color: "green"

important_sign_transition:
  - >
    Si existieran transiciones entre signo positivo y negativo,
    la clasificación sigue siendo por magnitud absoluta.
  - >
    Ejemplo: -3.000 -> +4.000 = Subió $1.000/kg.
  - >
    Ejemplo: +4.000 -> -3.000 = Bajó $1.000/kg.
  - >
    Los valores anterior y actual conservan sus signos reales en el texto.

unchanged_contract:
  - "Fuente de datos permanece sin cambios."
  - "Descuento/comisión $/kg permanece SUM(monto) / SUM(kg)."
  - "Compra anterior permanece como compra real inmediatamente anterior del mismo cliente."
  - "Puede cruzar semana y mes."
  - "Sin compra anterior no listar."
  - "Sin cambio de magnitud no listar."
  - "Múltiples clientes permanecen uno por línea."
  - "AK DESCUENTOS permanece en la misma posición."
  - "No modificar auxiliares AL/AM."
  - "No modificar COMENTARIO DEL DIA."
  - "No modificar VENTAS."
  - "No modificar RESUMEN SEMANAL."
  - "No modificar RESUMEN Excel."
  - "No modificar gráfica semanal."
  - "No modificar lógica de Todas."
  - "No modificar DB schema."

required_tests:
  - "-3.000 -> -4.000 = Subió $1.000/kg rojo."
  - "-4.000 -> -3.000 = Bajó $1.000/kg verde."
  - "-2.500 -> -2.000 = Bajó $0.500/kg verde."
  - "-4.630 -> -4.352 = Bajó $0.278/kg verde."
  - "-4.352 -> -4.630 = Subió $0.278/kg rojo."
  - "3.000 -> 4.000 = Subió $1.000/kg rojo."
  - "4.000 -> 3.000 = Bajó $1.000/kg verde."
  - "-3.000 -> +4.000 = Subió $1.000/kg rojo."
  - "+4.000 -> -3.000 = Bajó $1.000/kg verde."
  - "-3.000 -> +3.000 = sin cambio de magnitud, no listar."
  - "Delta mostrado nunca lleva + ni -."
  - "Valores anterior/actual sí conservan su signo real."
  - "Solo delta usa rich text de color."
  - "Serialización/reapertura XLSX conserva rich text."
  - "Regresiones 070 PASS."
  - "Regresiones 069-R2 PASS."
  - "git diff --check PASS."

report:
  path: "docs/dev-loop/reports/FIX-IGF-DIARIO-DESCUENTOS-SIGN-SEMANTICS-070-R1.md"

stop_conditions:
  - "Si origin/main != bccdf84e5f19fec65c282eff5eb7eec6d6132241, STOP."
  - "Si la corrección requiere cambiar la fuente de descuentos, STOP."
  - "Si requiere cambiar el cálculo SUM(monto)/SUM(kg), STOP."
  - "Si requiere modificar RESUMEN SEMANAL o lógica Todas, STOP."
  - "Si requiere DB schema, STOP."
  - "No merge."
  - "No deploy."

completion:
  status: "DONE_PENDING_REVIEW"
  commit: true
  push_branch_only: true
  merge: false
  deploy: false