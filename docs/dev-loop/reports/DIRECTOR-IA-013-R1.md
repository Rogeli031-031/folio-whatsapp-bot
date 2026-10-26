# DIRECTOR-IA-013-R1

STATUS: DONE_PENDING_REVIEW
BASE_SHA: 677c201806bedc2dd08b1dcf85ce4e6b95e82474
PREVIOUS_HEAD: 9a6c9d36eff8ca3bb2a2ca12b6a0b7ad81564de2
NEW_PRODUCT_SHA: 6c0c84f45d2f13cdee681da8a7e58b8dd7f52f4b
NEW_FINAL_SHA: el commit de evidencia que agrega este reporte en feature/director-ia-igf-diario-compras-hg-013

SERVER_SNAPSHOT: loadDirectorIa013Snapshot, solo lectura, después de clasificar.
CLIENT_SNAPSHOT_REQUIRED: no. askDirectorIa no lee req.body.igf_snapshot. El panel y el body builder no lo envían. La inyección de prueba entra por configureDirectorIaChat / deps.

ACTUAL_SERVER_SOURCE: IGF Diario acumulado. materializePlantMonth y loadSalesRows, compras.loadMonthReadOnly y resolveControlComprasDays para costo y flete del margen, SELECT de arr.igf_diario_margen_manual, desglose y distribución del mes, applyExpenses / buildExpenseDailySchedule. No se llama listMonth, getSchedule, overridesForPlant vía ensure, ni listMonthOverrides. La lectura de compras de ese mes arma el costo y el flete del margen; no es la respuesta de compras.
FORECAST_SERVER_SOURCE: no hay consulta viva a IGF Forecast. La cifra entra por forecast013 o por el loader de prueba. Si falta, la respuesta dice sin cifra.
PURCHASE_SERVER_SOURCE: arr.compras, arr.compras_proveedores, arr.compras_effective y arr.compras_documentos, acotados por planta y fechas. effective_kg = COALESCE(excel_kg, kg). effective_importe = COALESCE(excel_importe, importe).
HG_SERVER_SOURCE: arr.compras_hg, kg, acotado por planta y rango. El HG financiero sale del IGF Diario.

EXPLICIT_DAY: "10 de octubre", "20/10/2026", "2026-10-20", "el día 20" y "el 20" son DAY. No se expanden al mes.
EXPLICIT_RANGE: "del 1 al 15 de octubre", "del 5 al 12", "entre el 3 y el 10 de octubre" y "del 2026-10-05 al 2026-10-12" son RANGE. from > to se rechaza. El año omitido sale del corte. El mes compartido aplica a ambos días.
LAST_WEEK_SEMANTICS: "semana pasada" es el domingo-sábado anterior. "últimos 7 días" es la ventana móvil. "última semana" es la última semana calendario con datos. No se mezclan.

PROVIDER_FILTER: PEMEX exacto no incluye Tepeji ni Tuxpan. TOMZA TEPEJI / TEPEJI y TOMZA TUXPAN / TUXPAN usan el alias canónico. Nota de Cargo no se atribuye a un proveedor.
PROVIDER_RANKING: el más barato y quien surtió más kilos usan las filas del proveedor. El costo es importe efectivo / kg físico.

ACTUAL_FORECAST_METRIC_PARITY: el selector usa la misma métrica en ambos lados. Operativos compara operativosImporte con forecast.operativos. Resultado final compara resultadoFinalImporte con forecast.resultado_final. No reutiliza margenKg para otra métrica. El lado forecast queda sin cifra si no se inyectó.
HG_BOTH_PERIOD: HG financiero y HG físico del mismo from-to. "HG de esta semana" no suma el mes.
DIAGNOSIS_PERIOD_SCOPE: día, semana y rango usan los componentes de la distribución diaria. Si no hay distribución productiva, responde "No tengo la distribución diaria productiva para ese periodo."
BREAKDOWN_PERIOD_SCOPE: el desglose de operativos del periodo nombra nómina, IMSS, extraordinarios y provisiones de ese periodo.

PURCHASE_CLARIFICATION_AFTER_OTHER_THREAD: "compras" ambiguo pregunta siempre "¿Te refieres a compras de gas LP o a compras en general?" aunque el hilo anterior sea margen, HG o gasto. "su última compra" y la búsqueda de cliente no entran a esa pregunta.
FOLLOWUP_CONTEXT: purchase_domain GAS_LP o CLIENT_PURCHASES se hereda. "ahora las compras de clientes" cambia a CLIENT_PURCHASES. CLIENT_PURCHASES no recibe respuesta 013; sigue el enrutador anterior.

NATURAL_NLU: sí. Sin sufijo "caso N".
NLU_FAMILIES: 23
NLU_UTTERANCE_COUNT: 1800
CASE_SUFFIX_COUNT: 0
Cada utterance trae domain, metric, truth, source, unit, time_scope y dimension. Las 12 métricas financieras siguen en actual y forecast, 40 frases cada una.

ENDPOINT_E2E: askDirectorIa, Acapulco, corte 2026-10-26, sin igf_snapshot. Margen de octubre usa IGF Diario acumulado. HG en kilos usa arr.compras_hg. Compras de gas LP de la semana usan CONTROL DE COMPRAS. No se levantó un servidor HTTP ni se abrió la pestaña viva del Dashboard.
NO_CLIENT_SNAPSHOT_E2E: body.igf_snapshot === undefined y la respuesta sale igual.

AUTH_GUARD: canAccessPlant. planta_id autorizado en servidor. Planta distinta: 403. GA en ruta financiera: 403 "GA no tiene acceso a KPIs financieros."
QUERY_BOUNDS: compras y HG filtran planta y rango. El margen no carga la respuesta de compras. HG en kilos no carga forecast ni gastos. Compras de un proveedor no cargan el IGF financiero.
NO_WRITES: el diff de producto 013-R1 no ejecuta INSERT, UPDATE ni DELETE.

BASE_REGRESSION_PASS: 550
BASE_REGRESSION_FAIL: 33
HEAD_REGRESSION_PASS: 594
HEAD_REGRESSION_FAIL: 30
NEW_FAILURES: 0
El mismo comando corrió en 677c2018 (583 pruebas) y en el commit de producto (624 pruebas). Las 41 de más son el archivo 013, que no existía en la base. Los 30 fallos de HEAD ya fallaban en la base. Tres pruebas de tamaño del modal fallan solo en el worktree detached de la base y pasan en esta rama; no se reclaman como corrección. R-GROSS, R-PRECOUNT, R-TEMP y R-PROMPT que exigían git diff vacío de director-ia-chat.js pasan en el árbol limpio.

PLANNER_TESTS: no hay archivos director-ia-planner*. lib/director-ia-planner.js existe. Lo ejecutan director-ia-golden* y test/director-ia-rentabilidad-executive-routing.test.js. 001–008 y 055 pasan. 037 y 058 fallan en la base y en HEAD.
TOOL_ORCHESTRATOR_TESTS: no hay archivos director-ia-tool-orchestrator*. lib/director-ia-tool-orchestrator.js existe. buildDirectorIaToolPlan corre dentro de director-ia-rentabilidad-executive-routing.test.js.

013_TESTS: test/director-ia-igf-diario-compras-hg-013.test.js 41/41 dentro de la regresión limpia. test/director-ia-013-server-source-routing-r1.test.js 7/7, casos A-Z, después del commit de producto.
COMPRAS_REGRESSIONS: 088, 088-R1 y 088-R2, 24/24. R4, R4-R1, R4-R2 y R5, 31/31. No se modificó esa lógica.
TYPECHECK: npx tsc --noEmit, exit 0.
BUILD: npm run build, exit 0. prepare-standalone copió static y public.
DIFF_CHECK: git diff --check sin errores de espacio. CURRENT_TASK.md avisa conversión LF a CRLF.

FILES_TOUCHED:
- lib/director-ia-013-semantic.js
- lib/director-ia-013-corpus.js
- lib/director-ia-013-snapshot.js
- lib/director-ia-chat.js
- test/director-ia-igf-diario-compras-hg-013.test.js
- test/director-ia-013-server-source-routing-r1.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/authorizations/G1-DIRECTOR-IA-013-R1.json
- docs/dev-loop/reports/DIRECTOR-IA-013-R1.md

Límite: la paridad numérica del margen usa los helpers productivos con datos de prueba. No se abrió la pestaña viva ni una base productiva. Un forecast sin cifra inyectada no se inventa.

NO DB WRITES PRODUCTIVOS
NO MIGRATION
NO PR
NO MERGE
NO DEPLOY
