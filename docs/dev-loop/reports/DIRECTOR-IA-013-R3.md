# DIRECTOR-IA-013-R3

STATUS: DONE_PENDING_REVIEW
BASE_SHA: 677c201806bedc2dd08b1dcf85ce4e6b95e82474
PREVIOUS_HEAD: fe20da86a1717ae15c4659e084bf94d95361a8ec
NEW_PRODUCT_SHA: 80e8368bb0115ebaba8750d89f308585340bfc8a
NEW_FINAL_SHA: el commit de evidencia que agrega este reporte en feature/director-ia-igf-diario-compras-hg-013

STRICT_READ_ONLY: el camino de Chat Director IA 013 no ejecuta CREATE, ALTER, DROP, INSERT, UPDATE, DELETE ni TRUNCATE. listMonth de la pantalla sigue asegurando su tabla. El chat usa listMonthReadOnly.
DESGLOSE_READ_ONLY: listMonthReadOnly solo corre SELECT_MONTH_SQL. Si la relación no existe (42P01), devuelve null y no crea la tabla.
DDL_EXECUTED: 0 en el espía de las preguntas de margen, forecast, compras y HG.
WRITE_EXECUTED: 0. Una columna updated_at dentro de un SELECT no cuenta como escritura.

MONTH_MARGIN_SOURCE: loadIgfDiarioAcumulado, vía loadIgfDiarioAcumuladoPlantView. No llama loadMarginDetail.
DAY_MARGIN_SOURCE: loadMarginDetail. El día usa margenOf de esa fila: precio − costo − flete.
WEEK_MARGIN_SOURCE: los financial_days del mismo loadMarginDetail, ponderados con weightedByVenta. effective_days no trae ventaKg; el loader los devuelve solo con includeFinancialDays.
RANGE_MARGIN_SOURCE: la misma serie, filtrada al rango y ponderada por venta. No es el total del mes.
LAST7_MARGIN_SOURCE: ventana móvil sobre esos mismos financial_days.
MONTH_MARGIN_PARITY: "margen de octubre" sigue en 7.52 con proyección vigente y no cae a 4.10.
DAY_MARGIN_PARITY: el chat iguala el margen_bruto del día que devuelve loadMarginDetail.
WEEK_MARGIN_PARITY: domingo a corte, ponderado. No es el promedio simple.
RANGE_MARGIN_PARITY: del 5 al 12 inclusive, ponderado por venta.
LAST7_MARGIN_PARITY: igual a la ponderación de esa ventana.
PROJECTION_PARITY: día, semana y rango reciben la misma proyección vigente de buildPronosticoProjectionContext. El mes también. No se pasa projection null cuando hay proyección.
CUTOFF_PARITY: uploadDay y corteYmd son el mismo corte. Un rango que pasa del corte se corta en ese día. Un día posterior al corte no se responde como acumulado.
MANUAL_OVERRIDE_PARITY: el precio manual del día 10 entra por SELECT de arr.igf_diario_margen_manual y loadMarginDetail lo refleja en el chat.
AUTO_RESTORE_PARITY: sin fila manual, el chat vuelve al precio automático.
EMPTY_DAY: un componente ausente responde sin cifra. No imprime 0, null ni NaN.
COST_MARGIN_PARTIAL: "precio costo flete y margen del 10" usa la fila de ese día.
HG_FINANCIAL_PARTIAL: los días del detalle no incluyen HG. La semana no reutiliza el HG del mes y dice que no está en el detalle diario.

FORECAST_R2_PRESERVED: loadIgfForecastMiniPayload. "margen proyectado" sigue en 6.92 y no carga el detalle de margen.
ACTUAL_FORECAST_PRESERVED: 7.52 contra 6.92.
DISCREPANCY_R4_PRESERVED: mapPurchase. 18,750 kg con importe distinto queda discrepante. No se tocó compras-dashboard.js.
NLU_1800_PRESERVED: no se editó el corpus ni periodOf. La suite R1 de lenguaje natural pasó.
ENDPOINT_E2E: askDirectorIa en proceso, sin body.igf_snapshot. No se abrió la pestaña viva ni una base productiva.
QUERY_TRACE: el cliente espía las SQL ejecutadas. WRITE_OR_DDL_COUNT = 0 en mes, día, semana, rango, forecast, compras y HG.
AUTH: GG fuera de planta responde 403. GA en ruta financiera responde 403. No se confía en planta_nombre.

R3_BASE_PASS: 591
R3_BASE_FAIL: 33
R3_HEAD_PASS: 594
R3_HEAD_FAIL: 30
NEW_FAILURES: 0
624 pruebas con el mismo comando. Las 30 de HEAD ya fallaban en fe20da86. Tres pruebas de tamaño del modal fallan solo en el worktree detached de la base, sin el enlace del frontend.

IGF_REGRESSIONS: acumulado, margen, desglose, gastos, forecast, contrato 066 y la vertical de precios: 119/119 junto con compras.
COMPRAS_REGRESSIONS: R4, R4-R1, R4-R2 y R5 dentro de esas 119. Esos archivos no se modificaron.
TYPECHECK: node frontend-dashboard/node_modules/typescript/bin/tsc --noEmit -p frontend-dashboard, exit 0. npx tsc sin el binario local resolvió el paquete equivocado y no se usó como evidencia.
BUILD: npm run build, exit 0. El symlink de standalone falló con EPERM; prepare-standalone sí copió static y public. .next y tsconfig.tsbuildinfo se restauraron y no entran al commit.
DIFF_CHECK: git diff --check sin errores. CURRENT_TASK.md avisa LF a CRLF.

FILES_TOUCHED:
- lib/igf-diario-gastos-desglose.js
- lib/igf-diario-grafica.js
- lib/director-ia-013-acumulado.js
- lib/director-ia-013-snapshot.js
- lib/director-ia-013-semantic.js
- test/director-ia-013-readonly-margin-detail-r3.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/authorizations/G1-DIRECTOR-IA-013-R3.json
- docs/dev-loop/reports/DIRECTOR-IA-013-R3.md

NO DB WRITES
NO DDL
NO MIGRATION
NO PR
NO MERGE
NO DEPLOY
