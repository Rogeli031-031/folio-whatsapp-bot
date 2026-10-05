task_id: "FIX-IGF-ACUMULADO-DEFAULT-PERF-MARGEN-063"

title: "IGF Diario acumulado default, carga rápida y paridad Margen/HG con Excel"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Corregir y optimizar la tabla superior de IGF Forecast para que
  IGF Diario acumulado sea el modo inicial, cargue mediante una única
  solicitud ligera para todas las plantas visibles y Margen/HG acumulados
  reproduzcan exactamente la semántica de TOTAL MES del Excel, ignorando
  celdas vacías y conservando ceros numéricos válidos.

base_sha: "abf146ec62f7cfc791cd67eb2da523a46ed43743"

branch: "fix/igf-acumulado-default-perf-margen-063"

problem_statement:
  default_mode:
    current: "La pantalla inicia en Forecast."
    expected: "La pantalla debe iniciar en IGF Diario acumulado."
  performance:
    current: >
      El frontend ejecuta una llamada independiente a
      /api/dashboard/igf-diario-grafica por cada planta para obtener
      únicamente margen/hg acumulados.
    impact: >
      Cada llamada reconstruye información mucho más amplia de la necesaria:
      gráfica, ventas/descuentos de clientes, Compras, precio, proyección,
      panel de clientes nuevos, cierre mensual y otros datos.
    expected: >
      La tabla acumulada debe obtener todos los acumulados requeridos con
      una sola solicitud HTTP ligera.
  margin_bug:
    current_code: >
      finiteMetric convierte null en 0 porque Number(null) === 0.
    impact: >
      Días futuros donde H o Y están vacíos entran incorrectamente como cero
      en el promedio ponderado del acumulado.
    excel_contract: >
      TOTAL MES en Excel pondera H/Y únicamente sobre filas donde la métrica
      y B son numéricas. Una celda vacía no participa ni en numerador ni
      denominador.
    observed_case: >
      San Luis octubre 2026 muestra Margen acumulado ~0.91 en dashboard,
      mientras IGF Diario Excel TOTAL MES H muestra 8.20.

frozen_contracts:
  - "Forecast queda funcional y matemáticamente intacto."
  - "062 gastos manuales OPERATIVOS/CORPORATIVOS queda intacto."
  - "M3/T3 queda intacto."
  - "061: HG conserva el signo natural de Y; NO volver a invertirlo."
  - "Venta queda intacta."
  - "Comisiones/Descuentos queda intacto."
  - "Impuestos queda intacto."
  - "Compras queda intacto."
  - "Tarifa día 1 queda intacta."
  - "Excel generado queda intacto salvo que la corrección compartida de null sea necesaria para paridad de acumulado."
  - "No hardcodear San Luis, Morelos ni ninguna planta."

default_mode_contract:
  file: "frontend-dashboard/components/IgfForecastClient.tsx"
  current: 'useState<"forecast" | "igf_diario">("forecast")'
  expected: 'useState<"forecast" | "igf_diario">("igf_diario")'
  rules:
    - "Al abrir /igf-forecast, IGF Diario acumulado es la vista inicial."
    - "Forecast sigue disponible mediante su botón."
    - "Cambiar a Forecast no debe disparar cálculos acumulados innecesarios."
    - "Volver a acumulado debe usar datos ya cargados cuando el key de periodo/corte no cambió."

null_semantics_contract:
  target: "lib/igf-diario-puebla.js totalMesMarginAndHg / finiteMetric"
  required_semantics:
    - "null => null"
    - "undefined => null"
    - '"" => null'
    - '"   " => null si se considera vacío'
    - "0 => 0"
    - '"0" => 0 si la función admite strings numéricos'
    - "número finito => mismo número"
    - "NaN/Infinity/no numérico => null"
  forbidden:
    - "Number(null) participando como cero."
    - "Math.abs para Margen o HG."
    - "Cambiar hg: y a hg: -y."
  weighted_contract:
    formula: "sum(metric * ventaKg) / sum(ventaKg)"
    inclusion_rule: >
      Cada métrica usa solamente filas donde ventaKg y esa métrica
      sean valores numéricos válidos.
    zero_rule: >
      Un cero numérico real SÍ participa como cero. Un vacío NO participa.

excel_parity_contract:
  margin:
    excel_source: "TOTAL MES columna H"
    dashboard_source: "acumulado.margen"
    required: "Misma ponderación y misma cobertura de filas."
  hg:
    excel_source: "TOTAL MES columna Y"
    dashboard_source: "acumulado.hg"
    required: >
      Misma ponderación y cobertura de filas, conservando el signo de Y
      conforme a FIX 061.
  dynamic_total:
    - "No asumir H48/Y48 de forma rígida."
    - "TOTAL MES puede cambiar de fila según calendario/mes."
    - "La paridad es semántica, no por fila fija."

performance_contract:
  frontend:
    current: "N llamadas fetchIgfDiarioGrafica, una por planta."
    required: >
      Una sola solicitud HTTP para obtener acumulado Margen/HG de todas
      las plantas visibles del periodo.
    forbidden:
      - "Promise.all de una llamada de gráfica por cada planta para llenar la tabla superior."
  backend:
    recommendation: >
      Crear un endpoint especializado para acumulados de la tabla,
      por ejemplo GET /api/dashboard/igf-diario-acumulado,
      o una variante equivalente claramente separada.
    required:
      - "Debe devolver acumulado por planta en una sola respuesta."
      - "Debe respetar year, month, upload_day y version_as_of_corte."
      - "Debe respetar alcance/permisos de plantas."
      - "Debe usar dashboardAuthMiddleware y bloqueos financieros existentes."
      - "No debe construir datos de gráfica que la tabla no utiliza."
      - "No debe construir panel de clientes nuevos."
      - "No debe cargar comentarios/insights para esta respuesta."
      - "No debe calcular C&D si no es necesario para Margen/HG."
      - "No debe calcular gastos Corporativos/Operativos para obtener Margen/HG."
      - "No debe generar Excel."
      - "No debe escribir en DB."
      - "Debe ser read-only."
  reuse:
    - >
      Reutilizar las mismas funciones de resolución de Venta, Precio,
      COSTO, FLETE y HG que sean necesarias para mantener paridad con IGF Diario.
    - >
      No duplicar una segunda lógica financiera incompatible con
      lib/igf-diario-puebla.js.
  cache:
    - >
      Frontend puede reutilizar la respuesta mientras no cambien
      year/month/upload_day/version_as_of_corte.
    - "No usar cache que permita mezclar cortes o meses."

suggested_response_contract:
  endpoint: "GET /api/dashboard/igf-diario-acumulado"
  example:
    ok: true
    year: 2026
    month: 10
    corte_ymd: "2026-10-03"
    rows:
      - plant_code: "San Luis"
        empresa: "GTM San Luis"
        margen: 8.20
        hg: -5.29
  notes:
    - "Los nombres exactos pueden seguir contratos existentes."
    - "No retornar información de gráfica innecesaria."

frontend_contract:
  - "IGF Diario acumulado es default."
  - "La tabla no espera seis respuestas independientes."
  - "Una respuesta llena acumuladoByPlant para todas las plantas."
  - "Gastos manuales 062 siguen aplicándose después sobre Operativos/Corporativos."
  - "Zona Provincia sigue calculándose desde las filas efectivas."
  - "Forecast usa igfMini original y no usa los acumulados."
  - "Errores de la llamada acumulada deben mostrarse sin romper Forecast."

san_luis_acceptance:
  period:
    year: 2026
    month: 10
    corte: "2026-10-03"
  expected:
    - >
      Margen acumulado de San Luis debe coincidir con TOTAL MES H del
      Excel; la evidencia visual actual muestra aproximadamente 8.20.
    - >
      No aceptar ~0.91 producido por diluir días vacíos como cero.
    - "No hardcodear 8.20 en producto."
  explanation_fixture:
    - >
      Un fixture con pocos días numéricos y muchos días proyectados con
      margen null debe demostrar que los null no amplían el denominador.

morelos_acceptance:
  - >
    Revisar Morelos bajo la misma regla porque el 0.47 visible puede tener
    el mismo patrón de dilución.
  - "El valor correcto debe salir de los datos, no de un hardcode."

hg_acceptance:
  - >
    Agregar fixture donde días con HG null no diluyan Y.
  - >
    Un HG numérico 0 sí debe participar.
  - >
    Mantener regresión 061 de signo natural.

permissions_contract:
  - "No ampliar acceso a plantas."
  - "Usuario global puede obtener todas las plantas permitidas."
  - "Usuario restringido recibe solamente plantas dentro de su alcance."
  - "Mantener dashboardBlockGAFinancialKpis."
  - "Mantener dashboardBlockGVForbidden."
  - "No devolver información financiera de plantas no autorizadas."

recommended_files:
  - "lib/igf-diario-puebla.js"
  - "lib/igf-diario-grafica.js"
  - "server.js"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "test/igf-acumulado-default-perf-margen-063.test.js"
  - "tests 059/059-R1/061/062 relevantes"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-ACUMULADO-DEFAULT-PERF-MARGEN-063.md"

mandatory_tests:
  - "finiteMetric/null semantics: null y vacío no son 0."
  - "Cero numérico sigue siendo 0 válido."
  - "totalMesMarginAndHg ignora margen null en numerador y denominador."
  - "totalMesMarginAndHg ignora hg null en numerador y denominador."
  - "Fixture tipo San Luis produce ~8.20 y no ~0.91."
  - "Fixture HG conserva signo según 061."
  - "Default de frontend es igf_diario."
  - "Frontend hace una única solicitud de acumulados para la tabla, no N por planta."
  - "Cambio de corte invalida/reobtiene acumulado."
  - "Cambio de mes invalida/reobtiene acumulado."
  - "Cambiar a Forecast conserva Forecast original."
  - "062 Operativos/Corporativos manuales siguen funcionando."
  - "0 manual de 062 sigue funcionando."
  - "Restaurar automático 062 sigue funcionando."
  - "Endpoint acumulado respeta alcance de planta."
  - "Endpoint acumulado no escribe DB."
  - "No se invocan panel de clientes nuevos/insights para el endpoint ligero."

performance_evidence:
  required:
    - "Documentar número de requests HTTP antes vs después para cargar la tabla."
    - "Antes esperado: una petición por planta."
    - "Después requerido: una sola petición de acumulados."
    - >
      Documentar query_count o instrumentación equivalente del endpoint
      ligero y demostrar que no ejecuta trabajo de gráfica no requerido.
    - >
      No exigir milisegundos absolutos porque dependen de Render/DB,
      pero sí demostrar reducción estructural del trabajo.

regression_validation:
  - "test 059 PASS."
  - "test 059-R1 PASS."
  - "test 061 PASS."
  - "test 062 PASS."
  - "tests IGF Diario relevantes PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

acceptance_criteria:
  - "IGF Diario acumulado abre por default."
  - "Forecast queda como botón alternativo."
  - "Tabla acumulada usa una sola solicitud HTTP para todas las plantas visibles."
  - "No se hacen seis llamadas individuales de gráfica."
  - "San Luis Margen coincide con Excel TOTAL MES H (~8.20 en evidencia actual)."
  - "HG acumulado coincide con Excel TOTAL MES Y y conserva signo 061."
  - "Vacíos no se convierten a cero."
  - "Ceros numéricos reales siguen siendo válidos."
  - "Morelos se recalcula bajo la misma regla sin hardcode."
  - "062 permanece funcional."
  - "No hay cambios en Forecast matemático."
  - "No hay cambios de DB/schema/data."
  - "No hay hardcodes por planta ni por valor."

out_of_scope:
  - "Cambiar fórmulas de Forecast."
  - "Cambiar Operativos/Corporativos de 062."
  - "Cambiar M3/T3."
  - "Cambiar Resultado Final salvo cambios naturales derivados de corregir Margen/HG acumulado."
  - "Cambiar Venta."
  - "Cambiar Comisiones/Descuentos."
  - "Cambiar Impuestos."
  - "Cambiar Compras."
  - "Cambiar tarifas."
  - "Cambiar Action Register."
  - "Cambiar esquema DB."
  - "Crear datos productivos."
  - "Merge a main."
  - "Deploy."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

forbidden_actions:
  - "git push origin main"
  - "merge a main"
  - "deploy"
  - "modificar datos productivos"
  - "autoautorizar G4"
  - "abrir automáticamente una tarea siguiente"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-ACUMULADO-DEFAULT-PERF-MARGEN-063.md"