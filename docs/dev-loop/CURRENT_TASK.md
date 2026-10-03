task_id: "FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059"

title: "Selector IGF Forecast con acumulado IGF Diario y fallback tarifa día 1"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-02"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-02"

base_sha: "c907696506594860e286db432cb07cbf3f3f5c72"

branch: "fix/igf-forecast-acumulado-hg-compras-tarifa-059"

objective: >
  Agregar dos modos de cálculo en la tabla superior IGF Forecast:
  Forecast actual e IGF Diario acumulado. En modo IGF Diario acumulado,
  usar el Margen total acumulado del IGF Diario y el HG total acumulado
  con signo negativo. Corregir además la TARIFA consolidada del día 1
  en CONTROL DE COMPRAS para que herede el último valor válido anterior
  cuando todavía no existe compra del mes.

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

in_scope:
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "lib/dashboard-arr-forecast.js"
  - "lib/compras-dashboard.js"
  - "lib/compras-excel.js"
  - "lib/igf-diario-puebla.js"
  - "tests relacionados con IGF Forecast, IGF Diario y Compras"
  - "docs/dev-loop/reports/FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059.md"
  - "docs/dev-loop/CURRENT_TASK.md solo status durante ejecución"

out_of_scope:
  - "DB schema"
  - "DDL"
  - "Director IA"
  - "ARR cálculo de ventas"
  - "Action Register"
  - "permisos"
  - "usuarios"
  - "merge a main"
  - "deploy"

forecast_modes:
  - "Agregar dos botones visibles: Forecast e IGF Diario acumulado."
  - "Forecast conserva exactamente el cálculo actual."
  - "IGF Diario acumulado cambia las variables Margen y HG usadas por la tabla superior."
  - "El botón existente que abre la gráfica IGF Diario permanece separado."
  - "No eliminar ni cambiar la función actual del botón IGFDiario/gráfica."

igf_diario_margin:
  - "No fijar literalmente H48."
  - "Localizar dinámicamente la fila TOTAL MES de cada hoja IGF Diario."
  - "Margen = columna H de la fila TOTAL MES."
  - "Debe conservar la misma ponderación por Venta KG usada por el Excel."
  - "Ejemplo observado en octubre: H48 = 8.99, pero la fila debe resolverse dinámicamente."

igf_diario_hg:
  - "No fijar literalmente Y48."
  - "Localizar dinámicamente la fila TOTAL MES."
  - "HG = valor de columna Y multiplicado por -1."
  - "Ejemplo observado: Y48 = 0.61 -> HG mostrado/calculado = -0.61."

recalculation:
  - "Al seleccionar IGF Diario acumulado recalcular la tabla superior usando los nuevos Margen y HG."
  - "Recalcular INGRESO."
  - "Recalcular OPERATIVOS, CORPORATIVOS y GASTO cuando dependan de las variables modificadas."
  - "Recalcular Util. Operación - Importe."
  - "Recalcular Resultado Final - Importe."
  - "Zona Provincia debe recalcularse a partir de las plantas y no copiar valores viejos."
  - "Al volver a Forecast deben restaurarse exactamente los valores actuales del Forecast."
  - "No persistir el modo como modificación del IGF cargado."
  - "No escribir Margen/HG acumulados en la DB."

ui:
  - "Los dos botones deben quedar visibles cerca del encabezado de IGF Forecast."
  - "Debe quedar visualmente claro cuál modo está activo."
  - "Etiquetas sugeridas: Forecast e IGF Diario acumulado."
  - "El cambio debe ser inmediato y no requerir recargar la página."
  - "El selector Planta debe seguir funcionando en ambos modos."
  - "Todas debe seguir funcionando en ambos modos."

compras_tarifa_day1:
  - "CONTROL DE COMPRAS: la TARIFA consolidada del día 1 no debe quedar vacía solo porque todavía no exista compra."
  - "La columna consolidada TARIFA es la que actualmente corresponde a AJ con tres proveedores."
  - "No codificar AJ como posición fija; resolver usando fleteTarifaCol/fleteConsStart para conservar layouts dinámicos."
  - "Si existe tarifa consolidada válida anterior al primer día del mes, usar el último valor válido."
  - "El histórico puede provenir del mes anterior o de un mes todavía más antiguo."
  - "Si el día 1 tiene dato propio válido, prevalece el dato propio."
  - "No usar cero como sustituto de dato faltante."
  - "No depender de que exista compra el día 2."
  - "No tomar arbitrariamente un valor futuro si existe histórico anterior."
  - "El valor heredado debe permitir que COSTO HG del día 1 pueda calcularse con costo anterior + tarifa anterior cuando corresponda."

tarifa_history:
  - "Agregar una lectura de última tarifa válida anterior al inicio del mes."
  - "Debe respetar planta y proveedores."
  - "La tarifa consolidada histórica debe reflejar el último día histórico válido con compras y tarifas suficientes para calcular flete consolidado."
  - "No insertar ni actualizar registros para resolver el fallback."
  - "Es lectura/cálculo únicamente."

compatibility:
  - "Conservar regla 052 de COSTO KG día 1."
  - "Conservar regla 052 de COSTO HG día 1."
  - "No romper proyección de compras."
  - "No cambiar fórmulas de proveedores individuales salvo lo estrictamente necesario."
  - "No cambiar IGF Diario Provincia."
  - "No cambiar lógica ARR de Venta ni Comisiones/Descuentos."
  - "No cambiar permisos Compras."
  - "No cambiar comprasT."

acceptance_criteria:
  - "Se muestran botones Forecast e IGF Diario acumulado."
  - "Forecast reproduce exactamente los valores actuales."
  - "IGF Diario usa H de TOTAL MES como Margen por planta."
  - "IGF Diario usa -Y de TOTAL MES como HG por planta."
  - "La fila TOTAL MES se detecta dinámicamente; no H48/Y48 hardcode."
  - "La tabla superior recalcula INGRESO, Utilidad de Operación y Resultado Final."
  - "Zona Provincia cambia coherentemente al cambiar de modo."
  - "Volver a Forecast restaura sus cálculos."
  - "El botón/gráfica IGF Diario existente sigue funcionando."
  - "En CONTROL DE COMPRAS, TARIFA consolidada del día 1 hereda el último valor válido anterior si no existe compra."
  - "Con dato propio válido del día 1, el dato propio prevalece."
  - "Sin histórico válido la TARIFA permanece vacía."
  - "Nunca se inventa 0."
  - "No hay cambios de schema."
  - "No hay data mutation."
  - "Tests de regresión PASS."

validation:
  - "crear test específico 059 para selector Forecast / IGF Diario acumulado"
  - "crear test específico 059 para H TOTAL MES dinámico"
  - "crear test específico 059 para HG = -Y TOTAL MES"
  - "crear test específico 059 para TARIFA día 1 con histórico anterior"
  - "crear test sin histórico de tarifa"
  - "crear test con tarifa/dato propio día 1"
  - "regresión test/compras-dia1-costo-fallback-052.test.js"
  - "regresión tests IGF Diario"
  - "regresión tests IGF Forecast"
  - "cd frontend-dashboard && npm run build"
  - "git diff --check"

allowed_actions:
  - "crear rama fix/igf-forecast-acumulado-hg-compras-tarifa-059 desde origin/main"
  - "cambiar status AUTHORIZED -> IN_PROGRESS sin modificar campos de autorización"
  - "modificar únicamente archivos in_scope"
  - "crear tests"
  - "crear reporte"
  - "commit"
  - "push únicamente rama 059"
  - "dejar status DONE_PENDING_REVIEW al terminar"

forbidden_actions:
  - "git add ."
  - "merge a main"
  - "push a main"
  - "crear PR"
  - "deploy"
  - "DDL"
  - "data mutation"
  - "modificar contratos Director IA"
  - "cambiar fórmulas no relacionadas"
  - "inventar H48/Y48 como referencias fijas"
  - "autorizar una siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059.md"