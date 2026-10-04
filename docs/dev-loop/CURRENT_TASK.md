task_id: "FIX-IGF-ACUMULADO-HG-SIGN-061"

title: "Corregir signo HG en IGF Diario acumulado"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-03T22:41:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-03"

g4_authorization: "G4_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-03"

deploy_authorization: "DEPLOY_AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-03"

objective: >
  Corregir exclusivamente el signo de HG usado por el modo IGF Diario acumulado.
  El HG acumulado debe conservar el signo de Y de TOTAL MES, sin invertirlo una
  segunda vez. Forecast debe permanecer exactamente igual. Los cálculos derivados
  de IGF Diario acumulado deben recalcularse naturalmente con el HG corregido.

base_sha: "330d4b115a43eda1010237cdaa1b9d58f84fc4a4"

branch: "fix/igf-acumulado-hg-sign-061"

production_case:
  plant: "GT Puebla"
  corte: "2026-10-03"
  venta_ton_aprox: 1198.48
  margen_acumulado_aprox: 6.29
  hg_actual_mostrado_aprox: 1.12
  hg_esperado_mostrado_aprox: -1.12
  resultado_actual_aprox: -1410529
  resultado_esperado_aprox: 1287771
  note: >
    La gráfica IGF Diario muestra CIERRE PROYECTADO ≈ 1,287,771.
    El cambio de signo del HG explica aproximadamente 2,698,300 pesos
    de diferencia, consistente con el resultado esperado.

in_scope:
  - "lib/igf-diario-puebla.js"
  - "test/igf-forecast-acumulado-hg-compras-tarifa-059.test.js"
  - "Nuevo test específico 061 si conviene."
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-ACUMULADO-HG-SIGN-061.md"

required_change:
  - "En totalMesMarginAndHg, conservar Y con su signo natural."
  - "Cambiar hg: -y por hg: y."
  - "Actualizar el contrato/comentario que actualmente dice HG del forecast = -Y."
  - "Actualizar tests que formalizaron erróneamente el cambio de signo."

must_not_change:
  - "Modo Forecast."
  - "Valores o fórmulas de Forecast."
  - "Cálculo de Margen H."
  - "Venta."
  - "Comisiones y descuentos."
  - "Impuestos."
  - "Operativos."
  - "Corporativos."
  - "Fórmula de INGRESO."
  - "Fórmula de Util. Operación."
  - "Fórmula de Resultado Final."
  - "Excel IGF Diario."
  - "DB/schema/data."
  - "Compras."
  - "Tarifa día 1."
  - "Identidades de plantas."

calculation_contract:
  - "IGF Diario acumulado toma Margen desde H TOTAL MES dinámico."
  - "IGF Diario acumulado toma HG desde Y TOTAL MES dinámico TAL CUAL, conservando su signo."
  - "No aplicar Math.abs."
  - "No invertir nuevamente el signo."
  - "INGRESO conserva exactamente: (margen + comDesc - hgKg) * venta * 1000."
  - "Los resultados posteriores cambian únicamente como consecuencia del HG corregido."
  - "Zona Provincia se recalcula desde las plantas con el mismo contrato."
  - "Forecast sigue usando sus valores originales sin alteración."

acceptance_criteria:
  - "Forecast antes/después es idéntico."
  - "GT Puebla IGF Diario acumulado muestra HG aproximadamente -1.12 al corte 03/10/2026."
  - "GT Puebla deja de mostrar Resultado Final aproximado -1,410,529."
  - "GT Puebla Resultado Final queda alrededor de 1.28-1.29 millones, consistente con CIERRE PROYECTADO 1,287,771."
  - "No hay cambios de producto fuera del alcance."
  - "Todos los tests 059, 059-R1 y regresiones relevantes pasan."
  - "frontend build PASS."
  - "git diff --check PASS."

validation:
  - "test/igf-forecast-acumulado-hg-compras-tarifa-059.test.js"
  - "test/igf-forecast-acumulado-hg-compras-tarifa-059-r1.test.js"
  - "test específico 061"
  - "regresiones IGF Diario 054-R3"
  - "frontend build"
  - "git diff --check"

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: true
  deploy_authorized: true
  preferred_method: "Squash and merge"
  render_expected_auto_deploy:
    - "folio-dashboard"
    - "folio-whatsapp-bot"

forbidden_actions:
  - "Modificar Forecast."
  - "Cambiar otras fórmulas para acercar artificialmente el resultado a 1,287,771."
  - "Hardcodear Puebla."
  - "Hardcodear 1.12."
  - "Hardcodear 1,287,771."
  - "Cambiar datos de producción."
  - "Modificar DB/schema."
  - "Push directo a main."
  - "Merge ejecutado por implementador."

result_report_path: "docs/dev-loop/reports/FIX-IGF-ACUMULADO-HG-SIGN-061.md"