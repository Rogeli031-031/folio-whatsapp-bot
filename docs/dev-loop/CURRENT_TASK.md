task_id: "FIX-IGF-DIARIO-SINGLE-CHANNEL-REAL-SALES-074"

title: "Conservar Venta KG cuando existe venta real en un solo canal"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez"

main_reference_sha: "5de98adc664185351afe0c69e29222903ba2b47e"

branch: "fix/igf-diario-single-channel-real-sales-074"

source_audit:
  task: "AUDIT-IGF-DIARIO-SAN-LUIS-0410-RUNTIME-073"

objective: >
  Corregir el contrato de Venta KG para que una venta real válida no sea
  anulada únicamente porque el otro canal Casa/Comisionista no tenga filas
  de venta para la misma planta y fecha.

  Cuando exactamente un canal tenga actividad real válida y el otro canal
  esté ausente, Venta KG debe conservar el canal existente.

  Cuando ambos canales estén ausentes, Venta KG debe permanecer null.

confirmed_production_case:
  plant: "San Luis"
  plant_id: 5
  plant_key: "SANLUIS"
  date: "2026-10-04"

  casa:
    rows: 3
    kg: 1701.0000
    tons: 1.701

  comisionista:
    rows: 0
    value: null

  total_plant_row:
    exists: false

  current_venta_kg: null
  expected_venta_kg_after_074: 1701

  precio: 21.1269958848
  costo_kg: 11.6106
  flete_kg: 1.1107
  hg: -2747.736

root_cause:
  classification: "MIXED"

  data_component: >
    No existe ninguna fila de venta Comisionista para San Luis 04/10/2026.

  contract_component: >
    Venta KG actualmente requiere que Casa y Comisionista sean ambos
    numéricos. Por ello una venta real válida de Casa se anula cuando
    Comisionista está ausente.

new_business_contract:
  real_sales_aggregation:
    - >
      Casa con actividad real válida + Comisionista con actividad real válida
      -> sumar ambos canales.
    - >
      Casa con actividad real válida + Comisionista sin filas
      -> Venta KG = Casa.
    - >
      Casa sin filas + Comisionista con actividad real válida
      -> Venta KG = Comisionista.
    - >
      Casa sin filas + Comisionista sin filas
      -> Venta KG = null.
    - >
      No crear una fila de 0 en DB para representar el canal ausente.
    - >
      El 0 explícito, si llega como valor válido según el contrato existente,
      sigue siendo numérico y debe conservar su semántica.

critical_semantics:
  - >
    "Canal ausente" no significa hacer un null->0 global.
  - >
    El cero se usa únicamente como identidad matemática al agregar dos
    canales cuando el otro canal sí demuestra actividad real válida.
  - >
    Si ambos canales están ausentes, el resultado debe seguir siendo null.
  - >
    No interpretar ausencia de ambos canales como venta total 0.
  - >
    No utilizar la columna total de Provincia Venta Diaria como fallback.

expected_examples:
  both_present:
    casa_kg: 1200
    comisionista_kg: 800
    venta_kg: 2000

  casa_only:
    casa_kg: 1701
    comisionista: null
    venta_kg: 1701

  comisionista_only:
    casa: null
    comisionista_kg: 900
    venta_kg: 900

  both_absent:
    casa: null
    comisionista: null
    venta_kg: null

contract_072_protection:
  - "No cambiar resolveCanalTon salvo que sea estrictamente necesario para compartir semántica; preferir corregir la agregación Venta KG."
  - "Antes del corte: conservar comportamiento 072."
  - "Fecha exacta de corte: conservar real válido -> forecast válido -> null por canal."
  - "Después del corte: forecast continúa prevaleciendo."
  - >
    074 cambia cómo se agregan los canales resueltos; no cambia qué valor
    selecciona 072 para cada canal.

forecast_protection:
  - >
    No asumir que un forecast faltante equivale a cero sin revisar el
    contexto del canal resuelto.
  - >
    Mantener la semántica existente de forecast/null salvo en la agregación
    autorizada de Venta KG.
  - >
    No convertir días futuros sin información en ventas 0.
  - >
    No cambiar cálculo de pronósticos.

known_regression_cases:
  - "San Luis 04/10/2026: Casa 1,701 kg + Comisionista ausente -> 1,701 kg."
  - "San Luis 20/09/2026: patrón Casa-only encontrado por 073; debe evaluarse con la misma regla."
  - "San Luis 27/09/2026: patrón Casa-only encontrado por 073; debe evaluarse con la misma regla."

weekly_expected_effect:
  current_week_total_kg: 128461.74
  additional_real_kg_0410: 1701
  expected_new_week_total_before_display_rounding: 130162.74
  expected_display_week_total_kg: 130163
  note: >
    Este valor es una expectativa derivada de la evidencia de 073.
    La implementación no debe hardcodearlo.

daily_expected_effect:
  date: "2026-10-04"
  venta_kg: 1701
  price: 21.1269958848
  expected_income_formula: "venta_kg * precio"
  expected_income_approx: 35937.02
  note: "Usar precisión real del sistema; no hardcodear importe."

downstream_effect:
  - "Ingreso Generado debe aparecer naturalmente."
  - "Gastos dependientes de venta deben seguir sus reglas existentes."
  - "Margen Neto debe recalcularse naturalmente si depende de esos valores."
  - "Resultado $/kg debe recalcularse naturalmente."
  - "Resultado Importe debe recalcularse naturalmente."
  - "Semana debe incorporar 1,701 kg mediante el agregador existente."
  - "No parchear RESUMEN."

scope_protection:
  - "No cambiar datos productivos."
  - "No INSERT/UPDATE/DELETE."
  - "No DB schema."
  - "No modificar Provincia Venta Diaria."
  - "No cambiar upload_day."
  - "No cambiar fecha de corte."
  - "No cambiar 072."
  - "No cambiar forecast."
  - "No cambiar Precio."
  - "No cambiar Compras."
  - "No cambiar Costo/Flete."
  - "No cambiar HG."
  - "No cambiar DESCUENTOS."
  - "No cambiar gráfica salvo efecto natural de datos corregidos."
  - "No hardcodear San Luis."
  - "No hardcodear domingos."
  - "No hardcodear fechas."

implementation_requirement:
  - >
    Localizar todos los lugares donde Venta KG o equivalentes se construyen
    a partir de Casa y Comisionista.
  - >
    Evitar corregir solamente Excel si semanal/materializePlantMonth usa
    otra implementación.
  - >
    Centralizar la semántica si actualmente está duplicada y puede hacerse
    con cambio mínimo y seguro.
  - >
    Excel individual, materialización mensual, semanal y Todas deben compartir
    la misma semántica de agregación.

acceptance_matrix:
  - "Casa numérico + Comisionista numérico -> suma."
  - "Casa numérico + Comisionista null/ausente -> Casa."
  - "Casa null/ausente + Comisionista numérico -> Comisionista."
  - "Casa null + Comisionista null -> null."
  - "Casa 0 explícito + Comisionista numérico -> suma válida."
  - "Casa numérico + Comisionista 0 explícito -> suma válida."
  - "Casa 0 explícito + Comisionista 0 explícito -> 0 si ambos son valores explícitos válidos."
  - "No filas en ambos canales -> null, no 0."

tests_required:
  - "Fixture exacto San Luis 04/10/2026 -> 1,701 kg."
  - "Casa-only."
  - "Comisionista-only."
  - "Ambos canales."
  - "Ambos ausentes."
  - "0/null."
  - "0/numérico."
  - "numérico/0."
  - "0/0 explícitos."
  - "Fecha antes del corte."
  - "Fecha exacta de corte preservando 072."
  - "Fecha después del corte preservando 072."
  - "Domingo no recibe lógica especial."
  - "20/09 y 27/09 o fixtures equivalentes Casa-only."
  - "IGF Diario individual."
  - "materializePlantMonth."
  - "IGF Diario semanal."
  - "Todas."
  - "Ingreso derivado naturalmente."
  - "Semana incorpora el canal único."
  - "069-R1 conserva semana cuando ambos canales realmente están ausentes."
  - "072 conserva precedencia de corte."
  - "070/070-R1 sin regresión."
  - "node --check server.js PASS."
  - "git diff --check PASS."

report:
  path: "docs/dev-loop/reports/FIX-IGF-DIARIO-SINGLE-CHANNEL-REAL-SALES-074.md"

  must_include:
    - "Evidencia 073."
    - "Contrato anterior."
    - "Contrato nuevo."
    - "Por qué null no se convierte globalmente en 0."
    - "Semántica de un canal presente."
    - "Semántica de ambos ausentes."
    - "San Luis 04/10 = 1,701 kg."
    - "20/09 y 27/09."
    - "Impacto semanal."
    - "Protección 072."
    - "Protección 069-R1."
    - "Todos los puntos de código que agregaban Casa + Comisionista."
    - "Pruebas."
    - "SHA producto."
    - "SHA final."

stop_conditions:
  - "Si origin/main != 5de98adc664185351afe0c69e29222903ba2b47e, STOP."
  - "Si la auditoría de código demuestra que ausencia de un canal tiene otra semántica contractual documentada, STOP."
  - "Si el fix requiere modificar datos productivos, STOP."
  - "Si requiere cambiar fecha de corte/upload_day, STOP."
  - "Si requiere cambiar forecast, STOP."
  - "Si requiere DB schema, STOP."
  - "Si requiere usar total planta como fallback, STOP."
  - "Si aparecen múltiples agregaciones con contratos incompatibles que no pueden unificarse con seguridad, STOP y reportar."
  - "No PR en fase de implementación."
  - "No merge."
  - "No deploy."

completion:
  status: "DONE_PENDING_REVIEW"
  commit: true
  push_branch_only: true
  merge: false
  deploy: false