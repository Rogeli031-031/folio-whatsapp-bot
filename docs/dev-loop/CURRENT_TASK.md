task_id: "FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059-R1"

title: "Evitar datos acumulados obsoletos y mezcla Forecast/IGF Diario"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-03"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-03"

prior_task:
  task_id: "FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059"
  sha: "48863b0f29ec983396c64ffb09e3b52805572f36"
  status: "DONE_PENDING_REVIEW"

base_sha: "48863b0f29ec983396c64ffb09e3b52805572f36"

branch: "fix/igf-forecast-acumulado-hg-compras-tarifa-059-r1"

objective: >
  Mantener intacta la implementación 059, formalizar el uso de
  lib/igf-diario-grafica.js y evitar que el modo IGF Diario acumulado
  muestre datos obsoletos o mezcle silenciosamente valores Forecast
  con valores IGF Diario cuando una planta carece de Margen/HG acumulado.

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

in_scope:
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/lib/api.ts solo si requiere ajuste de tipos"
  - "lib/igf-diario-grafica.js"
  - "test/igf-forecast-acumulado-hg-compras-tarifa-059.test.js"
  - "nuevo test 059-R1"
  - "docs/dev-loop/reports/FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059-R1.md"
  - "docs/dev-loop/CURRENT_TASK.md solo status"

out_of_scope:
  - "lib/compras-dashboard.js salvo regresión"
  - "lib/compras-excel.js salvo regresión"
  - "lib/dashboard-arr-forecast.js salvo regresión"
  - "lib/igf-diario-puebla.js salvo regresión"
  - "server.js"
  - "DB schema"
  - "DDL"
  - "data mutation"
  - "Director IA"
  - "ARR"
  - "Action Register"
  - "permisos"
  - "merge"
  - "deploy"

authorized_deviation_from_059:
  - "Se autoriza explícitamente lib/igf-diario-grafica.js como parte de 059-R1."
  - "Se conserva el campo acumulado agregado por 059."
  - "No crear ruta nueva si la respuesta existente de gráfica continúa siendo suficiente."
  - "No exponer margen/hg diario adicional al frontend; acumulado sigue siendo el contrato necesario."

stale_state_contract:
  - "Al comenzar una nueva carga de IGF Diario acumulado, limpiar acumuladoByPlant antes de realizar requests."
  - "Cambiar mes, corte, versionAsOfCorte o cualquier dependencia que dispare una nueva carga no puede dejar visibles acumulados de la carga anterior."
  - "Durante acumuladoLoading no se deben renderizar cifras acumuladas anteriores."
  - "Si la nueva carga falla, los datos anteriores no deben permanecer visibles bajo el modo IGF Diario acumulado."
  - "Cambiar a Forecast debe mostrar inmediatamente el mini Forecast original."

completeness_contract:
  - "IGF Diario acumulado solo se aplica si todas las plantas necesarias tienen Margen y HG válidos."
  - "No usar una fila Forecast como fallback silencioso para una planta sin acumulado."
  - "No construir Zona Provincia mezclando plantas Forecast con plantas IGF Diario."
  - "margen debe ser finite number."
  - "hg debe ser finite number."
  - "null, undefined, NaN o Infinity cuentan como dato faltante."

incomplete_ui:
  - "Si falta acumulado para una o más plantas, mostrar estado explícito: IGF Diario acumulado incompleto."
  - "Indicar las plantas faltantes cuando estén disponibles."
  - "Mientras el modo esté incompleto no mostrar una tabla que parezca ser IGF Diario usando cifras Forecast."
  - "No sustituir silenciosamente por Forecast."
  - "El usuario puede volver al botón Forecast y ver inmediatamente el cálculo original."

loading_ui:
  - "Mientras carga, mostrar Cargando IGF Diario acumulado…"
  - "No mostrar la tabla acumulada hasta que la carga esté completa."
  - "No reutilizar visualmente el resultado del request anterior."

forecast_contract:
  - "Forecast permanece exactamente como quedó antes de 059."
  - "applyIgfDiarioAcumuladoMini no debe mutar igfMini."
  - "Volver a Forecast debe usar el objeto mini original."
  - "No alterar fórmulas Forecast."

igf_diario_contract:
  - "Margen sigue siendo H TOTAL MES ponderado."
  - "HG sigue siendo -Y TOTAL MES ponderado."
  - "No usar H48/Y48 hardcode."
  - "acumulado de lib/igf-diario-grafica.js continúa siendo read-only."
  - "No agregar escrituras en DB."

compras_contract:
  - "La solución TARIFA día 1 implementada en 059 permanece intacta."
  - "No cambiar fallback histórico salvo que una prueba de regresión demuestre un defecto."
  - "Dato propio día 1 prevalece."
  - "Sin histórico permanece vacío."
  - "No usar cero."
  - "No usar día 2."

acceptance_criteria:
  - "lib/igf-diario-grafica.js queda formalmente dentro del alcance."
  - "Al iniciar carga acumulada se elimina el estado acumulado anterior."
  - "Cambio de corte no muestra temporalmente valores del corte anterior."
  - "Cambio de mes no muestra temporalmente valores del mes anterior."
  - "Error de request no conserva valores acumulados anteriores."
  - "Una planta sin Margen/HG no usa Forecast como fallback."
  - "Zona Provincia nunca mezcla Forecast e IGF Diario acumulado."
  - "Modo incompleto muestra mensaje explícito."
  - "Durante loading no se muestra tabla acumulada vieja."
  - "Forecast sigue visible y correcto al volver a ese modo."
  - "059 continúa PASS."
  - "052 continúa PASS."
  - "npm run build PASS."
  - "git diff --check limpio."

validation:
  - "test 059-R1: limpia acumulado antes de nueva carga"
  - "test 059-R1: cambio de corte no reutiliza acumulado anterior"
  - "test 059-R1: request fallido no conserva datos anteriores"
  - "test 059-R1: planta sin margen no usa Forecast"
  - "test 059-R1: planta sin HG no usa Forecast"
  - "test 059-R1: Zona Provincia no mezcla modos"
  - "test 059-R1: regreso a Forecast restaura mini original"
  - "regresión 059"
  - "regresión 052"
  - "regresiones IGF Diario relacionadas"
  - "frontend-dashboard npm run build"
  - "git diff --check"

allowed_actions:
  - "crear rama R1 desde base_sha"
  - "cambiar AUTHORIZED a IN_PROGRESS sin modificar autorización humana"
  - "modificar únicamente archivos in_scope"
  - "crear tests"
  - "crear reporte"
  - "commit"
  - "push únicamente rama 059-R1"
  - "dejar DONE_PENDING_REVIEW al terminar"

forbidden_actions:
  - "git add ."
  - "merge a main"
  - "push a main"
  - "PR"
  - "deploy"
  - "DDL"
  - "data mutation"
  - "modificar contratos Director IA"
  - "crear otra ruta API sin necesidad"
  - "fallback silencioso Forecast dentro de modo IGF Diario"
  - "autorizar siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059-R1.md"