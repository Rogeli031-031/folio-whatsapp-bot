task_id: "FIX-IGF-GRAFICA-PRODUCCION-COVERAGE-054-R3"

title: "Corregir rentabilidad vacía de gráfica IGF en producción"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-29"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-29"

production_evidence: >
  En producción, GT Puebla y Acapulco cargan correctamente Clientes Nuevos
  y Top 10, pero la gráfica de rentabilidad no muestra ningún punto en $
  ni $/kg. Las cinco semanas muestran — y Cobertura incompleta.
  Esto demuestra que el endpoint responde y los facts comerciales funcionan,
  pero resultado_mxn/resultado_per_kg llegan null.

objective: >
  Hacer que la gráfica productiva obtenga exactamente los mismos inputs financieros
  que el Excel IGF Diario, usando un camino read-only compartido para Compras,
  la misma identidad de planta para PRECIO/gastos y diagnóstico explícito de cobertura.
  Una falla de lectura financiera no puede volver a convertirse silenciosamente en [].

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "f62288cb131ea43866d19c75b0d517b9d3ab1e76"

branch: "fix/igf-grafica-produccion-coverage-054-r3"

in_scope:
  - "lib/compras-dashboard.js"
  - "lib/compras-excel.js solo si hace falta compartir resolver puro"
  - "lib/igf-diario-grafica.js"
  - "server.js"
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx para diagnóstico de cobertura"
  - "tests 054/R1/R2"
  - "nuevo test 054-R3"
  - "docs/dev-loop/reports/FIX-IGF-GRAFICA-PRODUCCION-COVERAGE-054-R3.md"
  - "docs/dev-loop/CURRENT_TASK.md solo status"

out_of_scope:
  - "cambiar fórmulas AF/AE"
  - "cambiar definición de cliente nuevo"
  - "cambiar Top 10"
  - "cambiar forecast 050/R2 salvo regresión"
  - "DB schema"
  - "migrations"
  - "writes desde gráfica"
  - "OpenAI"
  - "PR"
  - "merge"
  - "deploy"

source_of_truth:
  - "El Excel actual es el oráculo."
  - "B/C/F/G/X/AC/AE/AF de gráfica deben coincidir con IGF Diario."
  - "El export individual obtiene Compras mediante comprasDashboard.loadMonth()."
  - "El export usa precio con provinciaPlantCode/canon, no necesariamente nombre humano."
  - "La gráfica debe ser read-only."

mandatory_fix_price_identity:
  - "No llamar loadPrecioDiario usando ciegamente plant.nombre."
  - "La clave preferida debe ser plant.provinciaPlantCode || plant.canon || plant.nombre."
  - "Ejemplo: nombre GT Puebla, provinciaPlantCode Puebla."
  - "Si PRECIO existe bajo Puebla, gráfica GT Puebla debe resolverlo."
  - "Acapulco y demás aliases no deben cambiar."

mandatory_fix_gastos_identity:
  - "Al buscar corporativos/operativos en mini payload comparar contra:"
  - "plant.nombre"
  - "plant.canon"
  - "plant.provinciaPlantCode"
  - "plant.clave cuando corresponda"
  - "Usar plantsEquivalent."
  - "No dejar corp/oper null por una diferencia GT/GTM/nombre humano."

mandatory_fix_compras:
  - "Eliminar la reconstrucción divergente de Compras de la gráfica."
  - "Compartir con comprasDashboard.loadMonth el mismo armado numérico de providers, purchases, HG, tarifas, grid, costo_kg_anterior y carry."
  - "El endpoint de gráfica NO puede ejecutar ensureRequiredProviders ni crear proveedores."
  - "Extraer un core común o crear una variante read-only."
  - "Conceptualmente:"
  - "loadMonth() = core común + ensureRequiredProviders=true"
  - "loadMonthReadOnly() = mismo core numérico + ensureRequiredProviders=false"
  - "Ambos deben producir el mismo grid cuando los proveedores ya existen."
  - "El Excel existente debe conservar exactamente su comportamiento."
  - "El read-only no INSERT/UPDATE/DELETE/DDL."
  - "No convertir proveedor inexistente en costo/flete cero."
  - "No considerar extras sin actividad si loadMonth tampoco los muestra."
  - "Mantener visibleProvidersForPeriod/orderSheetProviders/required providers con la misma semántica numérica."

compras_resolution:
  - "Después de obtener el payload compartido, usar resolveControlComprasDays(payload, corteYmd)."
  - "F = costoKg."
  - "G = fleteKg."
  - "X = hgImporte."
  - "Mantener 049/050/052."
  - "Mantener costo día 1."
  - "Mantener flete."
  - "Mantener HG carry/proyección."
  - "No crear otra fórmula."

critical_query_errors:
  - "Las queries financieras críticas NO deben usar safeQuery para convertir errores SQL en []."
  - "Errores de Compras, HG, tarifas, precio o gastos deben propagarse al endpoint."
  - "El endpoint responde 500 con mensaje genérico seguro."
  - "Registrar servidor con contexto técnico."
  - "Datos genuinamente ausentes siguen siendo null."
  - "Distinguir claramente ausencia real de error de lectura."

coverage_diagnostics:
  response_field: "coverage_summary"
  shape:
    total_points: "number"
    numeric_points: "number"
    complete_points: "number"
    missing_by_component:
      VENTA: "number"
      PRECIO: "number"
      COSTO: "number"
      FLETE: "number"
      HG: "number"
      C&D: "number"
      CORPORATIVO: "number"
      OPERATIVO: "number"
    first_missing_date: "object opcional"
  rules:
    - "No exponer información sensible."
    - "Cuenta cuántas fechas faltan por componente."
    - "Provincia puede incluir missing_by_plant agregado."
    - "Esto es diagnóstico funcional, no DEBUG secreto."

ui_empty_state:
  - "Si numeric_points > 0, dibujar gráfica normalmente."
  - "Si numeric_points == 0, no dejar solo un espacio vacío."
  - "Mostrar mensaje visible:"
  - "Sin rentabilidad calculable para este periodo."
  - "Debajo: componentes faltantes ordenados por frecuencia."
  - "Ejemplo: Falta HG: 30 días · FLETE: 30 días."
  - "Clientes Nuevos y Top 10 deben seguir visibles."
  - "No inventar rentabilidad."

production_shape_contract:
  - "Crear fixture con shape de comprasDashboard.loadMonth real."
  - "Debe incluir providers existentes, purchases, HG, tarifa, precio, corp/oper y C&D."
  - "Acapulco-shaped fixture debe producir AF/AE numéricos."
  - "Puebla-shaped fixture debe probar alias GT Puebla -> Puebla para PRECIO."
  - "No basta con llamar computePlantDay directamente."

parity_contract:
  - "Para cada fecha probada:"
  - "B gráfica = B Excel"
  - "C gráfica = C Excel"
  - "F gráfica = F Excel"
  - "G gráfica = G Excel"
  - "X gráfica = X Excel"
  - "AC gráfica = AC Excel"
  - "AE gráfica = AE Excel"
  - "AF gráfica = AF Excel"

missing_contract:
  - "Si X/HG realmente está vacío en Excel y por ello AE/AF quedan vacíos, gráfica también queda vacía."
  - "Pero coverage_summary debe decir HG."
  - "Si Excel sí tiene X, la gráfica no puede perderlo por un loader distinto."
  - "Mismo criterio para PRECIO/COSTO/FLETE/C&D/corp/oper."

range_contract:
  - "1M debe quedar corregido primero y probado con septiembre."
  - "3M/YTD/1A/5A/Todo no deben hacer query por día."
  - "Reutilizar/cachear payloads por planta+mes."
  - "No introducir multiplicación innecesaria de consultas."
  - "Reportar query count antes/después."

security:
  - "Mantener gate global de Todas antes de lecturas multi-planta."
  - "Mantener assertPlantaPermitidaDashboard individual."
  - "No debilitar R2."
  - "No writes."

acceptance_criteria:
  - "GT Puebla con precio guardado como Puebla obtiene C numérico."
  - "Acapulco obtiene precio usando su identidad normal."
  - "Compras read-only produce mismo F/G/X que loadMonth del Excel."
  - "Puebla y Acapulco con datos financieros completos producen puntos visibles."
  - "resultado_mxn no es null cuando AF Excel es numérico."
  - "resultado_per_kg no es null cuando AE Excel es numérico."
  - "Semanas muestran valores cuando Excel semanal los tiene."
  - "$ y $/kg dibujan series."
  - "Tendencia reaparece cuando existen >=2 reales completos."
  - "Cliente Nuevo/Top 10 siguen iguales."
  - "Si un componente realmente falta, UI explica cuál."
  - "Una query financiera que lanza error NO devuelve HTTP 200 con gráfica vacía."
  - "No XLSX runtime."
  - "No DB writes."
  - "Excel actual no cambia."

validation:
  - "Puebla alias de precio."
  - "Acapulco."
  - "Compras read-only vs loadMonth."
  - "F/G/X reales."
  - "F/G/X proyectados."
  - "Día 1 052."
  - "Corp/oper alias."
  - "C&D."
  - "AF/AE diario."
  - "AF/AE semanal."
  - "endpoint individual."
  - "endpoint Todas."
  - "coverage_summary."
  - "empty-state frontend."
  - "query error => fail explícito."
  - "no INSERT/UPDATE/DELETE/CREATE/ALTER/DROP en camino gráfica."
  - "054/R1/R2 regresión."
  - "053A/R1/R2."
  - "053BC."
  - "050/052."
  - "git diff --check."

allowed_actions:
  - "crear rama R3 desde base_sha"
  - "refactorizar loader de Compras a core compartido"
  - "crear variante read-only"
  - "corregir aliases precio/gastos"
  - "agregar coverage_summary"
  - "agregar mensaje frontend de cobertura"
  - "agregar tests"
  - "crear reporte"
  - "commit"
  - "push solo rama R3"

forbidden_actions:
  - "rellenar faltantes con cero"
  - "tratar null como cero"
  - "ocultar error SQL como []"
  - "llamar ensureRequiredProviders desde gráfica"
  - "hacer writes para que la gráfica funcione"
  - "generar/parsing XLSX en runtime"
  - "git add ."
  - "tocar frontend-dashboard/.next"
  - "PR"
  - "merge"
  - "deploy"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-GRAFICA-PRODUCCION-COVERAGE-054-R3.md"