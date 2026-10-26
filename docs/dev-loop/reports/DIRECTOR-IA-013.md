# DIRECTOR-IA-013

STATUS: DONE_PENDING_REVIEW
BASE_SHA: 677c201806bedc2dd08b1dcf85ce4e6b95e82474
BRANCH: feature/director-ia-igf-diario-compras-hg-013
PRODUCT_SHA: 8c32d217ebc43583021156cf64b27a3cf5c4ebc1
FINAL_SHA: el commit de evidencia que agrega este reporte en feature/director-ia-igf-diario-compras-hg-013

ACTUAL_SOURCE: IGF Diario acumulado, para year > 2026 o (year == 2026 y month >= 10), cuando la pregunta no pide forecast.
FORECAST_SOURCE: IGF Forecast, cuando la pregunta trae forecast, pronóstico, proyectado, proyección, estimado, esperamos, ARR o cierre esperado. También para periodo anterior a 2026-10 se conserva la fuente histórica / Forecast existente.
OCTOBER_CUTOFF: 2026-10
CUTOFF_TRANSPORT: hoy, ayer, esta semana, semana pasada, este mes, al corte, hasta hoy y acumulado se anclan a cutoff_ymd o upload_day. Si el chat no trae corte, se usa la fecha local de México.

MARGIN_PARITY: el periodo usa weightedByVenta sobre margenOf (precio - costo_kg - flete_kg).
MARGIN_DAILY: un día sin venta o sin precio/costo/flete responde sin cifra. No se inventa 0.
MARGIN_OVERRIDE: cambiar precio, costo o flete del día cambia el margen que responde el chat.
MARGIN_WEEKLY_WEIGHTED: la semana domingo-corte se pondera por venta. No es promedio simple.

OPERATIVOS_PARITY: presupuesto_nomina_gastos + presupuesto_imss_sua + extraordinarios + provisiones_planta. Fixture Puebla: 1611265 + 390000.03 + 234595.16 + 237858.60 = 2473718.79, vía applyExpenses.
OPERATIVOS_BREAKDOWN: la respuesta nombra nómina/gastos, IMSS/SUA, extraordinarios y provisiones.
OPERATIVOS_DAILY_DISTRIBUTION: la semana suma buildExpenseDailySchedule + sumAssignedForWeek. No divide el mensual entre los días.
CORPORATIVOS_PARITY: gasto_corporativo + inversiones, redondeo vigente de applyExpenses.
RESULT_PARITY: ingreso, utilidad operativa y resultado final salen de applyIgfDiarioAcumuladoMini.

HG_FINANCIAL: IGF Diario acumulado, MXN/kg.
HG_PHYSICAL: arr.compras_hg, kg.
HG_UNIT_DISAMBIGUATION: "HG en kilos" no responde MXN/kg. "HG $/kg" no responde como kilos físicos. "HG" solo, con ambas fuentes en el snapshot, etiqueta las dos.

PURCHASE_DOMAIN_CLARIFICATION: "¿Te refieres a compras de gas LP o a compras en general?"
GAS_LP_PURCHASES: CONTROL DE COMPRAS.
CLIENT_PURCHASES_PRESERVED: una pregunta de cliente no la responde este módulo. Sigue el enrutador anterior. El atajo del chat no intercepta un hilo ya abierto.
CONVERSATION_CONTEXT: purchase_domain GAS_LP o CLIENT_PURCHASES se hereda en el seguimiento si no hay señal explícita del otro dominio.

EFFECTIVE_PURCHASE_VALUES: effective_kg y effective_importe usan el Excel cuando existe y, si no, la captura. No se suman.
NOTA_CARGO: kg físico 0. El importe sí entra al consolidado.
INVOICES: conteo de compras sin factura. No se muestra storage_key ni URL privada.
CAPTURED_VS_EXCEL: la respuesta separa CAPTURADO / FACTURA y EXCEL — USADO PARA CALCULO.

COMPARISONS: actual contra forecast, y semana contra la semana anterior, con delta.
DIAGNOSIS: cadena aritmética margen, ingreso, operativos, utilidad operativa, corporativos y resultado final. Sin causa externa.
COST_MARGIN_BRIDGE: precio, costo, flete y margen, etiquetado como aproximación y simulación.
EXECUTIVE_SUMMARY: venta, margen, compras de gas LP, costo, HG físico, HG financiero, resultado, fuentes y corte.
SOURCE_AUDIT: nombre legible de la fuente y el corte. Sin códigos internos.

INTERNAL_CODES_HIDDEN: el panel oculta RESULT_WITH_EVIDENCE, INSUFFICIENT_EVIDENCE, DATA_NOT_FOUND, SOURCE_RESTRICTED y CLARIFICATION_REQUIRED. Las respuestas nuevas no los emiten. El helper de la tarea 006 conserva su prefijo porque sus pruebas lo exigen.

NLU_FAMILIES: 23
NLU_UTTERANCE_COUNT: 1801
FINANCIAL_ACTUAL_GENERIC y FINANCIAL_FORECAST están parametrizados sobre venta, margen, comisiones y descuentos, impuestos, HG financiero, ingreso, operativos, corporativos, gasto total, utilidad operativa, resultado final e inversiones. 12 métricas por 40 formas.

TESTS: test/director-ia-igf-diario-compras-hg-013.test.js, 41/41.
REGRESSIONS: 578 pruebas de las suites director-ia pedidas. 544 pasan. 34 fallan igual con el atajo de 013 apagado: son anteriores a este cambio. Incluyen subtopic de rentabilidad, golden de cutoff, ranking con query nulo y Taller "otros estados". No existe archivo director-ia-planner ni director-ia-tool-orchestrator. No se modificó R4 ni R5. No se ejecutó 016.
TYPECHECK: npx tsc --noEmit, exit 0.
BUILD: npm run build, exit 0. El symlink de standalone/node_modules falló con EPERM. prepare-standalone sí copió static y public.
DIFF_CHECK: git diff --check sin errores de espacio.

FILES_TOUCHED:
- lib/director-ia-013-semantic.js
- lib/director-ia-chat.js
- frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx
- test/director-ia-igf-diario-compras-hg-013.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/authorizations/G1-DIRECTOR-IA-013.json
- docs/dev-loop/reports/DIRECTOR-IA-013.md

Límite: una cifra de octubre sin igf_snapshot no se inventa y no sustituye en silencio al Forecast. Esa pregunta sigue el chat anterior. La paridad numérica queda demostrada contra los helpers productivos y el snapshot de prueba. No se abrió la pestaña viva del Dashboard: haría falta sesión y base de datos. Si el acumulado viene marcado incompleto, la respuesta es: "No tengo información suficiente del IGF Diario acumulado para ese periodo."

NO DB WRITES PRODUCTIVOS
NO MIGRATION
NO PR
NO MERGE
NO DEPLOY
