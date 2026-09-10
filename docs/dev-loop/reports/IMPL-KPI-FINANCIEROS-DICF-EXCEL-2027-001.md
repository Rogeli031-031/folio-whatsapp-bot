# IMPL-KPI-FINANCIEROS-DICF-EXCEL-2027-001

```yaml
task_id: "IMPL-KPI-FINANCIEROS-DICF-EXCEL-2027-001"
outcome: "DONE"
mode: "REGRESSION_FIRST"
implementation: true
source_code_changed: true
test_code_changed: true
sql_changed: false
live_db: false
base_main_sha: "9f42c47f342341f3d943564aeee1afe7d71fc99e"
branch: "implementation/kpi-financieros-dicf-excel-2027-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. No siguiente tarea."
```

## Preflight

GET `/api/dashboard/dicf-excel` en `server.js` arma el workbook.

PROM físico: `computePromMesByDow` extraído de `lib/dashboard-arr-forecast.js` (misma receta que el modal Pronóstico).

- ventana: corte−27d → corte (`lookbackStartYmd`/`lookbackEndYmd`); query visual desde lunes ISO
- cutoff: `fechaCorte` / `corteYmdStr` (query `upload_day` o `last_date` DICF)
- días: `arr.pronostico_dias_seleccion` vía `loadPronosticoDiasSeleccionMap`
- weekday: ISO lunes→domingo (`getDay()===0 → 7`)
- inclusión: seleccionado !== false si hay fila; si no, solo fechas in-strict lookback

Canal/subcanal físicos:

- venta: `arr.ventas_diarias_cliente.canal` / `.subcanal`
- descuento: `arr.cliente_categoria_mes.canal` / `.subcanal`

Mapeo defendible: Casa→CASA, *comisionista*→COMISIONISTA, Autotanque/Portátil/Carburación. Subcanal vacío u otro → residual, no se asigna.

Los 6 pares se calculan sin schema nuevo. Residual de planta no se reparte.

---

IMPLEMENTATION_SHA:
PENDING_COMMIT

BASE_MAIN_SHA:
9f42c47f342341f3d943564aeee1afe7d71fc99e

PROM_SOURCE_FUNCTION:
computePromMesByDow (lib/dashboard-arr-forecast.js)

PROM_LOOKBACK_RULE:
enableLookback si corte ∈ mes; start = corte−27d; end = corte; iterate lookbackQueryFromYmd→end; omit null; skip selected===false

PROM_CUTOFF_FIELD:
fechaCorte / ctx.corteYmdStr (upload_day || DICF last_date)

PROM_SELECTED_DAYS_SOURCE:
arr.pronostico_dias_seleccion via loadPronosticoDiasSeleccionMap(year, month, corte_day)

CHANNEL_FIELD:
arr.ventas_diarias_cliente.canal (desc: arr.cliente_categoria_mes.canal)

SUBCHANNEL_FIELD:
arr.ventas_diarias_cliente.subcanal (desc: arr.cliente_categoria_mes.subcanal)

SIX_PAIR_COVERAGE:
CASA|COMISIONISTA × AUTOTANQUE|PORTATIL|CARBURACION. Fuera de eso = residual.

WORKBOOK_BUILDER:
lib/dicf-excel-workbook.js buildDicfClienteForecastWorkbook

NEW_SHEET_BUILDER:
lib/dicf-excel-2027.js assembleDicfExcel2027 / buildSheet2027Aoa

JAN_2027_WEEKDAY_COUNTS:
4 4 4 4 5 5 5 (lun→dom)

FEB_2027_WEEKDAY_COUNTS:
4 4 4 4 4 4 4

SALE_MONTH_FORMULA:
venta_M_P = SUM_d(PROM_v_ton_P[d] * n_d_M)

PCT_MONTH_FORMULA:
total>0 ? venta_P/suma_6 : 0; seis=1.0 o seis=0

DISCOUNT_MONTH_FORMULA:
SUM(PROM_ratio*PROM_v*n) / SUM(PROM_v*n)  MXN/kg

DISCOUNT_TOTAL_FORMULA:
SUM_M(descuento_M*venta_M) / SUM_M(venta_M)

FOUR_EXISTING_SHEETS_UNCHANGED:
YES

OLD_SHEET_PARITY_METHOD:
AOA JSON equality before/after on STABLE_EXCEL fixture (053-056)

PROM_RECONCILIATION:
YES on closed six-pair universe fixture

PROM_RECONCILIATION_TOLERANCE:
0.06

PROM_RESIDUAL:
0,0,0,0,0,0,0 in closed fixture. Production residual (volume outside 6 pairs) documented, not redistributed.

001..070:
PASS (70/70 test/dicf-excel-2027.test.js)

SUITES:
R-DICF-2027 70/70 PASS
dicf-excel previo: no había suite
dashboard-arr-forecast: computePromMesByDow unit PASS
Director IA gate: no ejecutado (fuera de alcance; NO Director IA)
director-ia-prom-cutoff 2 fails preexistentes en HEAD (CEL rentabilidad; mini cutoff) — no introducidos

FILES:
lib/dashboard-arr-forecast.js
lib/dicf-excel-2027.js
lib/dicf-excel-workbook.js
server.js
test/dicf-excel-2027.test.js
docs/dev-loop/CURRENT_TASK.md
docs/dev-loop/reports/IMPL-KPI-FINANCIEROS-DICF-EXCEL-2027-001.md

RISKS:
Si hay venta de planta fuera de los 6 pares, PROM planta ≠ suma de pares. No se reparte. Descuento diario de par requiere kg>0 y monto clasificable.

SERVER_CHANGED:
YES

DASHBOARD_ARR_FORECAST_CHANGED:
YES (extract computePromMesByDow only)

NEW_LIB_ADDED:
YES (dicf-excel-2027.js, dicf-excel-workbook.js)

FRONTEND_CHANGED:
NO

DIRECTOR_IA_CHANGED:
NO

SQL_CHANGED:
NO

SCHEMA_CHANGED:
NO

TOOL_ADDED:
NO

ENDPOINT_ADDED:
NO

LIVE_DB_USED:
NO
