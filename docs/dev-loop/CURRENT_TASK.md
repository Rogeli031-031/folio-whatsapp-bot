task_id: "FIX-IGF-ACUMULADO-INCOMPLETO-PARIDAD-063-R1"

title: "Corregir plantas incompletas y asegurar paridad real del IGF Diario acumulado"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-05"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-05"

objective: >
  Diagnosticar y corregir el caso productivo donde el nuevo endpoint ligero
  de IGF Diario acumulado reporta incompleto para Tehuacan y GTM Queretaro.
  La corrección debe hacer que Margen y HG del dashboard reproduzcan la
  misma semántica y fuentes del IGF Diario Excel para cada planta y mismo
  corte, sin mezclar Forecast como fallback y sin perder la mejora de
  performance de FIX 063.

base_sha: "59e88276159b5da089c39e50e9b53da64b416577"

branch: "fix/igf-acumulado-incompleto-paridad-063-r1"

production_symptom:
  route: "/igf-forecast"
  cut_observed: "2026-10-05"
  mode: "IGF Diario acumulado"
  message: "IGF Diario acumulado incompleto: Tehuacan, GTM Queretaro"
  consequence: >
    La mini tabla acumulada queda bloqueada por la protección de 059-R1
    porque al menos Margen o HG es null en esas plantas.
  important:
    - >
      La tabla financiera grande que queda debajo no prueba el valor del
      acumulado; puede seguir mostrando valores del Forecast.
    - "No usar esa tabla como evidencia de paridad acumulada."

frozen_contracts:
  - "IGF Diario acumulado sigue siendo el modo default."
  - "Forecast sigue siendo la opción secundaria por botón."
  - "Forecast matemático queda intacto."
  - "Una sola request HTTP para cargar todos los acumulados."
  - "No volver a N requests de gráfica por planta."
  - "062 Operativos/Corporativos manuales queda intacto."
  - "M3/T3 queda intacto."
  - "061 mantiene HG con signo natural de Y: hg = y."
  - "063 mantiene null/vacío distinto de cero."
  - "0 numérico sigue siendo válido."
  - "No hacer fallback silencioso a Forecast."
  - "No mezclar acumulado real con margen/HG de Forecast."
  - "No hardcodear Tehuacan, Queretaro, San Luis, Morelos ni importes."

diagnostic_contract:
  required_before_fix:
    - >
      Para Tehuacan y GTM Queretaro identificar por qué acumulado.margen
      o acumulado.hg termina null.
    - >
      Registrar por planta y por día la cobertura necesaria de:
      VENTA, PRECIO, COSTO, FLETE y HG.
    - >
      Determinar específicamente cuál componente impide producir H
      (Margen) y cuál impide producir Y/HG.
    - >
      Comparar contra la hoja IGF Diario generada por el Excel para
      exactamente la misma planta, mes y corte.
    - >
      Revisar equivalencias de nombre/canon/provinciaPlantCode/plantaId
      antes de asumir ausencia de datos.
  required_evidence:
    - "Tehuacan: margen present/missing, hg present/missing y causa."
    - "GTM Queretaro: margen present/missing, hg present/missing y causa."
    - "San Luis: comparar H TOTAL MES contra acumulado.margen."
    - "Morelos: comparar H TOTAL MES contra acumulado.margen."
  forbidden:
    - "Corregir a base de valores conocidos de capturas."
    - "Insertar datos faltantes en DB."
    - "Inventar costo/flete/HG."
    - "Tomar 5.00 de Forecast como fallback."

parity_contract:
  source_of_truth: "La semántica del IGF Diario Excel generado por el mismo código y mismo corte."
  margen:
    excel: "TOTAL MES columna H"
    dashboard: "acumulado.margen"
    formula_semantics: >
      Promedio ponderado por B únicamente en filas donde B y H son
      numéricos.
  hg:
    excel: "TOTAL MES columna Y"
    dashboard: "acumulado.hg"
    formula_semantics: >
      Promedio ponderado por B únicamente en filas donde B y Y son
      numéricos, preservando el signo de Y.
  dynamic_total:
    - "No asumir H48/Y48."
    - "Encontrar TOTAL MES dinámicamente."
  same_inputs:
    - "Mismo year/month."
    - "Mismo upload_day/corte."
    - "Misma planta resuelta."
    - "Misma lógica de venta/proyección."
    - "Misma lógica de precio."
    - "Misma lógica de costo."
    - "Misma lógica de flete."
    - "Misma lógica de HG."

likely_risk_areas_to_audit:
  - >
    loadIgfDiarioAcumulado usa nombre/canon/provinciaPlantCode/plantaId;
    confirmar que Tehuacan y GTM Queretaro reciben la identidad correcta
    en ventas, precio y Compras.
  - >
    loadSalesRows filtra por public.plantas/provincia_plants; confirmar que
    el nombre usado realmente produce las ventas de la hoja Excel.
  - >
    loadPrecioDiario recibe precioPlantKey; confirmar equivalencias para
    GTM Queretaro/Queretaro y Tehuacan.
  - >
    loadComprasDayMap usa plantaId; confirmar que corresponde a la misma
    planta que usa CONTROL DE COMPRAS del Excel.
  - >
    resolveControlComprasDays y los fallbacks de COSTO/FLETE deben mantener
    exactamente la cobertura usada por IGF Diario.
  - >
    Confirmar que HG importe se toma de la misma columna/fuente de CONTROL
    DE COMPRAS que alimenta X/Y del Excel.
  - >
    Confirmar que el corte no elimina por error el último valor válido
    necesario para H/Y.

endpoint_contract:
  path: "GET /api/dashboard/igf-diario-acumulado"
  required_response_extension:
    description: >
      Añadir diagnóstico mínimo de cobertura suficiente para explicar
      una planta incompleta sin devolver toda la gráfica.
    acceptable_shape_example:
      plant_code: "Tehuacan"
      empresa: "Tehuacan"
      margen: null
      hg: -1.10
      missing:
        - "MARGEN"
      missing_components:
        margen:
          - "FLETE"
        hg: []
  rules:
    - "El shape exacto puede variar si existe una solución más limpia."
    - "No devolver comentarios/clientes/insights."
    - "No volver el endpoint pesado."
    - "No exponer datos de plantas fuera del alcance del usuario."
    - "Read-only."

frontend_contract:
  incomplete_message:
    current: "IGF Diario acumulado incompleto: Tehuacan, GTM Queretaro"
    expected_example: >
      IGF Diario acumulado incompleto:
      Tehuacan — falta MARGEN (FLETE);
      GTM Queretaro — falta HG
  rules:
    - "Mostrar el componente real si backend lo conoce."
    - "No decir que falta FLETE/HG si no hay evidencia."
    - "Mantener la protección: si una planta necesaria está incompleta, no mezclar Forecast."
    - >
      Una vez corregida la causa real y todas las plantas tengan Margen/HG,
      la mini tabla acumulada debe aparecer normalmente.

performance_contract:
  required:
    - "1 request HTTP para todos los acumulados."
    - "No usar fetchIgfDiarioGrafica para llenar la mini tabla."
    - "No introducir Promise.all de requests por planta."
    - "No cargar C&D si no se requiere para H/Y."
    - "No cargar clientes nuevos."
    - "No cargar comentarios/insights."
    - "No cargar month_close."
    - "No generar Excel dentro del endpoint."
  improvement_allowed:
    - >
      Si varias consultas por planta pueden agruparse en menos queries sin
      alterar semántica, puede optimizarse dentro del endpoint ligero.
  forbidden:
    - "Sacrificar paridad financiera por velocidad."

san_luis_contract:
  fixture_reference:
    cut: "2026-10-03"
    observed_excel_total_h: "aprox 8.20"
  required:
    - >
      Mantener la corrección de 063: días con H null no diluyen Margen.
    - >
      Test de regresión debe seguir demostrando 8.20 en fixture y ~0.91
      con la semántica antigua.
    - >
      Para producción usar el valor dinámico correspondiente al corte
      actual; no exigir 8.20 si los datos del mismo corte cambiaron.
    - >
      La aceptación es igualdad con H TOTAL MES del Excel del mismo corte.

morelos_contract:
  required:
    - "Aplicar exactamente la misma regla que a las demás plantas."
    - "No hardcodear el valor esperado."
    - "Comparar contra H TOTAL MES del Excel del mismo corte."

tests_required:
  - >
    Caso Tehuacan con identidad/cobertura equivalente a producción que
    reproduzca el null antes del fix y produzca Margen/HG correctos después.
  - >
    Caso GTM Queretaro/Queretaro que pruebe la equivalencia de nombre usada
    en las fuentes que resulte ser la causa real.
  - "No crear un fixture falso si la causa resulta distinta; probar la causa real."
  - "Mensaje frontend identifica campo/componente faltante."
  - "No fallback a Forecast cuando falta acumulado."
  - "San Luis null-vs-zero 063 sigue PASS."
  - "HG signo 061 sigue PASS."
  - "Una request HTTP sigue PASS."
  - "062 gastos manuales sigue PASS."
  - "0 manual sigue válido."
  - "M3/T3 no cambia."
  - "Endpoint sigue read-only."
  - "Permisos siguen restringiendo plantas."

production_acceptance:
  primary_cut: "2026-10-05"
  required:
    - "No aparece Tehuacan como incompleto si su Excel produce H/Y numéricos."
    - "No aparece GTM Queretaro como incompleto si su Excel produce H/Y numéricos."
    - "Las seis plantas muestran acumulado cuando sus Excel tienen H/Y."
    - "Margen de cada planta coincide con TOTAL MES H del Excel del mismo corte."
    - "HG de cada planta coincide con TOTAL MES Y del Excel del mismo corte."
    - "San Luis ya no muestra la dilución causada por null -> 0."
    - "Zona Provincia se reconstruye desde las seis plantas."
    - "Forecast sigue intacto."
    - "Performance de una sola request se conserva."

regression_validation:
  - "063-R1 PASS."
  - "063 PASS."
  - "062 PASS."
  - "061 PASS."
  - "059-R1 PASS."
  - "059 PASS."
  - "053A/053A-R1/053A-R2/054-R3 relevantes PASS."
  - "frontend npm run build PASS."
  - "node --check server.js PASS."
  - "git diff --check limpio."

recommended_files:
  - "lib/igf-diario-grafica.js"
  - "lib/igf-diario-puebla.js solo si la causa real lo requiere"
  - "lib/dashboard-arr-forecast.js solo si la equivalencia compartida lo requiere"
  - "lib/compras-dashboard.js o lib/compras-excel.js solo si evidencia demuestra la causa"
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "test/igf-acumulado-incompleto-paridad-063-r1.test.js"
  - "tests 063/062/061/059-R1"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-ACUMULADO-INCOMPLETO-PARIDAD-063-R1.md"

out_of_scope:
  - "Cambiar Forecast."
  - "Cambiar fórmulas financieras no relacionadas."
  - "Cambiar Operativos/Corporativos."
  - "Cambiar M3/T3."
  - "Modificar DB/schema."
  - "Insertar/corregir datos de producción."
  - "Cambiar Action Register."
  - "Cambiar permisos."
  - "Eliminar la protección de acumulado incompleto."
  - "Mostrar valores parciales mezclados con Forecast."
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
  - "DB writes"
  - "hardcodes por planta"
  - "fallback a Forecast"
  - "autoautorizar G4"
  - "abrir automáticamente siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-ACUMULADO-INCOMPLETO-PARIDAD-063-R1.md"