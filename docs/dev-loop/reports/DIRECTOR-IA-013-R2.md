# DIRECTOR-IA-013-R2

STATUS: DONE_PENDING_REVIEW
BASE_SHA: 677c201806bedc2dd08b1dcf85ce4e6b95e82474
PREVIOUS_HEAD: e79f29b0364a3a75995e516f821a598284b1e60a
NEW_PRODUCT_SHA: 0c2b782eed5884d00ce05110e9b8400b348c615f
NEW_FINAL_SHA: el commit de evidencia que agrega este reporte en feature/director-ia-igf-diario-compras-hg-013

El producto queda en dos commits: 63d762d4644bb54029fcd40e4a2f6b7d0c8779c1 y el ajuste de redacción 0c2b782eed5884d00ce05110e9b8400b348c615f.

ACUMULADO_LOADER: loadIgfDiarioAcumuladoPlantView llama loadIgfDiarioAcumulado, buildPronosticoProjectionContext, listMonth, applyExpenses y applyFinancialsToMiniRow. server.js no se tocó: la prueba 050 lo prohíbe. El endpoint sigue con su mismo pegado.
ACUMULADO_DIRECT_PARITY: el mes y el corte usan esa vista. No se vuelve a sumar una rebanada de días hasta el corte.
PROJECTION_PARITY: la proyección vigente cambia margen, venta y C&D frente a projection null. El chat iguala la versión con proyección.
CUTOFF_PARITY: el corte se reenvía como corteYmd y uploadDay del loader. La cifra del mes es la del acumulado con esa proyección, no un recorte manual.
CD_PARITY: el C&D sale del financials que arma el loader cuando recibe la proyección. El chat no calcula otra serie.
MARGIN_PARITY: margenKg de esa vista. Los overrides siguen dentro de loadIgfDiarioAcumulado.
OPERATIVOS_PARITY: la vista final del helper, después del desglose. Fixture de prueba: 2,473,718.79.
CORPORATIVOS_PARITY: gasto corporativo más inversiones, en la misma vista.
RESULT_PARITY: resultadoFinalImporte de applyFinancialsToMiniRow, la mini de octubre que pinta la pantalla. No es applyExpenses aislado.

FORECAST_LIVE_LOADER: loadIgfForecastMiniPayload, findMiniRowForPlant y readIgfForecastMiniAuthoritative. No hay fórmula nueva. El servidor ya inyecta ese loader. Si no está configurado, la respuesta dice que no se consultó. Si se consultó y no hay fila, dice sin cifra.
FORECAST_MARGIN: mini.margen. Prueba: 6.92, fuente IGF Forecast.
FORECAST_OPERATIVOS: mini.operativos. No reutiliza el margen.
FORECAST_RESULT: mini.resultadoFinalImporte.
ACTUAL_VS_FORECAST: cada lado usa la misma métrica. Margen 7.52 contra 6.92. Operativos y resultado final usan sus propios campos.

DISCREPANCY_SHARED_HELPER: compras.mapPurchase, que ya llama currentPurchaseDiscrepant. No se modificó compras-dashboard.js.
KG_EQUAL_AMOUNT_DIFFERENT: 18750 kg y 189281.25 contra Excel 188240.625 queda discrepante.
ROUNDING_EQUIVALENCE: 188240.63 contra 188240.625 no queda discrepante.
KG_DIFFERENT: kilos distintos con el mismo importe queda discrepante.
EXCEL_ONLY: no queda discrepante.

DAY_RANGE_PRESERVED: sí. El parser de día y rango no se redujo.
PROVIDER_FILTER_PRESERVED: sí.
HG_PERIOD_PRESERVED: sí.
PURCHASE_CLARIFICATION_PRESERVED: sí.
NLU_1800_PRESERVED: 1800 frases, 23 familias, cero sufijos "caso N".

ENDPOINT_E2E: askDirectorIa sin igf_snapshot. No se abrió la pestaña viva ni una base productiva.
NO_CLIENT_SNAPSHOT: body.igf_snapshot queda undefined.

AUTH: canAccessPlant y el bloqueo de GA se mantienen. Forecast y acumulado pasan por isFinancialRoute.
QUERY_BOUNDS: un margen no carga Forecast. Un forecast no carga el acumulado ni compras. Una discrepancia no carga el IGF.
NO_WRITES: el diff de R2 no tiene INSERT, UPDATE ni DELETE. listMonth sigue pudiendo asegurar su tabla; ese CREATE ya vivía en el desglose, no en este diff.

R2_BASE_PASS: 591
R2_BASE_FAIL: 33
R2_HEAD_PASS: 594
R2_HEAD_FAIL: 30
NEW_FAILURES: 0
El mismo comando corrió en e79f29b0 y en el producto. 624 pruebas en ambos. Los 30 fallos de HEAD ya fallaban en la base. Tres pruebas de tamaño del modal fallan solo en el worktree detached de la base.

Límite: loadIgfDiarioAcumulado no devuelve financial_days. El mes no se reconstruye por días. Un periodo parcial sin serie diaria dice sin cifra en el margen y no sustituye el total del mes. La distribución de gastos del periodo se sigue usando cuando existe.

IGF_REGRESSIONS: igf-acumulado, margen, desglose, gastos, forecast y los dos de contrato 066, junto con R4, R4-R1, R4-R2 y R5: 113/113.
COMPRAS_REGRESSIONS: incluidas en esas 113. No se modificó el importador.
TYPECHECK: npx tsc --noEmit, exit 0.
BUILD: npm run build, exit 0.
DIFF_CHECK: git diff --check sin errores de espacio. CURRENT_TASK.md avisa LF a CRLF.

FILES_TOUCHED:
- lib/director-ia-013-acumulado.js
- lib/director-ia-013-snapshot.js
- lib/director-ia-013-semantic.js
- lib/director-ia-chat.js
- test/director-ia-013-live-parity-r2.test.js
- test/director-ia-013-server-source-routing-r1.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/authorizations/G1-DIRECTOR-IA-013-R2.json
- docs/dev-loop/reports/DIRECTOR-IA-013-R2.md

NO DB WRITES PRODUCTIVOS
NO MIGRATION
NO PR
NO MERGE
NO DEPLOY
