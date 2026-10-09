task_id: "G4-PREP-FIX-IGF-DIARIO-DESCUENTOS-SIGN-SEMANTICS-070-R1"

title: "Preparar integración de FIX 070-R1"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-09"

main_reference_sha: "bccdf84e5f19fec65c282eff5eb7eec6d6132241"

branch: "fix/igf-diario-descuentos-sign-semantics-070-r1"

product_sha: "702eb1b75c86948f336b1e78927aa8741a080bcc"

implementation_final_sha: "50fbe14fdb649f68cea6c8ef98d6e713fb249eda"

objective: >
  Auditar FIX 070-R1 y preparar su Pull Request hacia main.
  Verificar que la única modificación funcional sea la corrección de
  semántica Subió/Bajó de DESCUENTOS basada en magnitud absoluta.
  No modificar producto ni tests.
  No merge.
  No deploy.

expected_behavior:
  direction_formula: "ABS(actual) - ABS(anterior)"

  increase:
    condition: "ABS(actual) > ABS(anterior)"
    wording: "Subió su comisión"
    delta_color: "red"

  decrease:
    condition: "ABS(actual) < ABS(anterior)"
    wording: "Bajó su comisión"
    delta_color: "green"

  unchanged:
    condition: "ABS(actual) == ABS(anterior)"
    behavior: "No listar cliente"

  displayed_delta:
    formula: "ABS(ABS(actual) - ABS(anterior))"
    decimals: 3
    signed: false

  original_values:
    preserve_sign: true

acceptance_example:
  client: "ARTURO ANDRADE SANCHEZ"
  previous: -4.630
  current: -4.352
  direction: "Bajó"
  delta: "$0.278/kg"
  delta_color: "green"
  expected_text: >
    ARTURO ANDRADE SANCHEZ — Bajó su comisión respecto a su última compra
    de -$4.630/kg a -$4.352/kg = $0.278/kg

verified_scope:
  - "Fuente de datos sin cambios."
  - "SUM(monto) / SUM(kg) sin cambios."
  - "Compra anterior sin cambios."
  - "AK sin cambios estructurales adicionales."
  - "Auxiliares sin cambios."
  - "RESUMEN SEMANAL sin cambios."
  - "RESUMEN Excel sin cambios."
  - "Gráfica sin cambios."
  - "DB sin cambios."

in_scope:
  - "git fetch origin."
  - "Verificar origin/main exacto."
  - "Verificar ancestry."
  - "Verificar ahead/behind."
  - "Verificar product SHA."
  - "Verificar implementation final SHA."
  - "Auditar product_sha..implementation_final_sha."
  - "Auditar origin/main...HEAD."
  - "Confirmar semántica ABS."
  - "Confirmar rich text."
  - "Confirmar delta sin signo."
  - "Confirmar preservación del signo original."
  - "Confirmar pruebas."
  - "Crear reporte G4."
  - "Actualizar CURRENT_TASK."
  - "Commit documental G4."
  - "Push a rama 070-R1."
  - "Crear PR."
  - "Verificar PR."
  - "STOP."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar fuente de descuentos."
  - "Modificar compra anterior."
  - "Modificar SUM(monto)/SUM(kg)."
  - "Modificar AK."
  - "Modificar auxiliares."
  - "Modificar RESUMEN SEMANAL."
  - "Modificar lógica Todas."
  - "Modificar RESUMEN Excel."
  - "Modificar gráfica."
  - "Modificar DB."
  - "Rebase."
  - "Merge."
  - "Deploy."
  - "Auto-merge."

required_g4_checks:
  - >
    Confirmar que 702eb1b75c86948f336b1e78927aa8741a080bcc
    pertenece a la rama.
  - >
    Confirmar que 50fbe14fdb649f68cea6c8ef98d6e713fb249eda
    es el cierre reportado.
  - >
    Auditar exactamente:
    702eb1b75c86948f336b1e78927aa8741a080bcc
    ..
    50fbe14fdb649f68cea6c8ef98d6e713fb249eda
  - >
    Después del SHA producto no debe existir ningún cambio funcional
    ni de tests.
  - >
    Confirmar que el diff funcional contra main se limita a la semántica
    de signo/magnitud de DESCUENTOS y sus pruebas.
  - "Confirmar -3 -> -4 = Subió $1.000 rojo."
  - "Confirmar -4 -> -3 = Bajó $1.000 verde."
  - "Confirmar -4.630 -> -4.352 = Bajó $0.278 verde."
  - "Confirmar -4.352 -> -4.630 = Subió $0.278 rojo."
  - "Confirmar +3 -> +4 = Subió."
  - "Confirmar +4 -> +3 = Bajó."
  - "Confirmar -3 -> +4 = Subió."
  - "Confirmar +4 -> -3 = Bajó."
  - "Confirmar -3 -> +3 = no listar."
  - "Confirmar que delta final no contiene + ni -."
  - "Confirmar que anterior/actual sí conservan su signo."
  - "Confirmar que solo delta final tiene color."

tests_expected:
  - "22 pruebas PASS."
  - "070-R1 PASS."
  - "070 PASS."
  - "069-R2 PASS."
  - "node --check server.js PASS."
  - "git diff --check PASS."

pr_contract:
  base: "main"
  head: "fix/igf-diario-descuentos-sign-semantics-070-r1"
  title: "FIX 070-R1: corregir signo de subida y bajada de comisión"
  preferred_merge: "Squash and merge"
  merge_executor: "HUMAN_APPROVER_ONLY"

merge_contract:
  merge_authorized: false
  deploy_authorized: false
  auto_merge: false

report:
  path: "docs/dev-loop/reports/G4-PREP-FIX-IGF-DIARIO-DESCUENTOS-SIGN-SEMANTICS-070-R1.md"

stop_conditions:
  - "Si origin/main != bccdf84e5f19fec65c282eff5eb7eec6d6132241, STOP."
  - "Si product SHA no pertenece a la rama, STOP."
  - "Si final SHA no corresponde al cierre reportado, STOP."
  - "Si después del product SHA hay cambios funcionales o tests, STOP."
  - "Si aparecen cambios funcionales fuera de la semántica 070-R1, STOP."
  - "Si RESUMEN SEMANAL fue modificado, STOP."
  - "Si lógica Todas fue modificada, STOP."
  - "Si AK/auxiliares fueron modificados fuera de lo necesario, STOP."
  - "Si PR no es mergeable o tiene conflictos, STOP."
  - "No rebase."
  - "No merge."
  - "No deploy."

completion:
  status: "DONE_PENDING_REVIEW"
  merge: false
  deploy: false