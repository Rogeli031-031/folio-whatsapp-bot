# AUDIT-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-LIVE-PARITY-001

```yaml
task_id: AUDIT-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-LIVE-PARITY-001
outcome: DONE
mode: READ_ONLY
implementation: false
code_changes: false
commits: true
push: false
merge: false
schema_changes: false
docs_director_ia_changed: false
live_db: false
base_main_sha: "3be41f59a88c417394431987fb3c4faa7b312bb9"
head_at_start: "5a19c211bcc13959133fa5a83a42e7cd2aba7f93"
branch: audit/director-ia-month-close-historical-mini-live-parity-001
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/README.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
files_touched:
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-LIVE-PARITY-001.md
files_not_touched:
  - lib/director-ia-month-close-result.js
  - lib/director-ia-chat.js
  - lib/director-ia-dashboard-forecast-adapter.js
  - lib/director-ia-planner.js
  - lib/director-ia-executive-cycle-composer.js
  - server.js
  - frontend-dashboard/
  - docs/director-ia/
  - sql/
  - test/
next_task_proposed: "FIX-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-CLIENT-WRAPPER-001"
next_task_authorized: false
next_task_executed: false
human_decision_needed:
  - "G5: aceptar o rechazar esta auditoría."
  - "Si se acepta: autorizar un slice que alinee el primer argumento del wrapper (Pool vs Client ya adquirido) o que el wrapper distinga Pool de Client. No tocar composer A/B/C. No tocar C4 / MINI_FORECAST_PROY septiembre. No SQL. No tool. No endpoint. No frontend. No LIVE_DB. No merge. No push main."
```

## Pregunta central

Por qué ArrClient construye la fila financiera visible de Agosto 2026 y `month_close_result` termina en `financial.presentation.state = DATA_MISSING` para el mismo periodo.

## FIRST_PARITY_GAP

`WRAPPER_CONNECT_HEURISTIC_THROWS_ON_CHECKED_OUT_CLIENT`

`loadMonthCloseResultForChat` ya tiene un `pg.Client` de `acquire()` / `pool.connect()` y se lo pasa al wrapper:

```
opts.loadIgfForecastMiniPayload(db, { year, month, plantName, plantCode })
```

El wrapper `loadIgfForecastMiniPayloadForDirectorIa` trata cualquier objeto con `.connect` como Pool:

```
if (poolOrClient && typeof poolOrClient.connect === "function") {
  client = await poolOrClient.connect();
}
```

`pg.Pool.prototype.connect` y `pg.Client.prototype.connect` existen ambos. Un Client ya conectado, al volver a llamar `.connect()`, lanza:

`Client has already been connected. You cannot reuse a client.`

Fuente física: `node_modules/pg/lib/client.js` `_connect` (si `_connecting || _connected`).

El `catch` de month_close traga el error y pone `historical_mini = null`. El composer fail-close pinta `DATA_MISSING` / "Datos financieros no disponibles."

ArrClient nunca usa este wrapper: `GET /api/dashboard/igf-forecast` hace `pool.connect()` y llama `computeIgfForecastMiniPayload(client, ...)` sobre ese client. No re-conecta.

C5 (`¿Qué rentabilidad tenemos?`) usa el mismo wrapper con `chatDeps.pool`. Por eso septiembre funciona.

## Evidencia de sonda (sin LIVE_DB)

Fixture idéntico Agosto 2026 / Acapulco:

| Sonda | Primer argumento | Resultado |
|---|---|---|
| S1 dashboard-style | client ya adquirido, directo a shape/compute (sin heurística `.connect`) | fila Acapulco → `VISIBLE_NOT_FINAL` |
| S2 month-close-style | Client checked-out → wrapper `.connect()` | throw → `historical_mini = null` → `DATA_MISSING` |
| Control C5-style | Pool `.connect()` | fila → `VISIBLE_NOT_FINAL` |

`pg.Client` real con `_connected = true` reproduce el throw. No se abrió LIVE_DB.

## Hipótesis descartadas como FIRST_PARITY_GAP

1. Wiring de la dep: existe y apunta al wrapper correcto.
2. Periodo: C1/C2 resuelven 2026-08 y esa pareja se pasa al loader.
3. Shape: el wrapper devuelve el objeto plano de `computeIgfForecastMiniPayload` (`ok, year, month, upload_day, rows, zona`). Month close lee `mini.rows` / `mini.year` / `mini.month`.
4. Planta: `findMiniRowForPlant` compara `empresa` y `plant_code` del mini (`Acapulco` / `Acapulco`) contra `planta_nombre` + `plant_code` (p. ej. Acapulco + E3). Score 100 por nombre. E3 solo no matchea; no hace falta. ACA matchea por substring de "Acapulco" (score 50).
5. Gate de valor: `0` es finito; `hasDefendableHistoricalMini` acepta ceros. No produce DATA_MISSING.
6. Cutoff / `upload_day`: month_close no lo manda. ArrClient sí (URL o `fetchArrLastUploadDay`). Sin `upload_day` el compute igual emite 6 filas; `isIgfMesCerradoPorCorte` cae al reloj (agosto 2026 en septiembre = cerrado). Cambia números, no la existencia de fila. S1 sin `upload_day` sigue `VISIBLE_NOT_FINAL`.
7. Composer A/B/C: fail-close correcto cuando `historical_mini` es null.
8. C4 / MINI_FORECAST_PROY: intacto.

## AUDIT_RESULT

C1_INTENT: month_close_result
C1_ROUTE: isMonthCloseQuestion → planner month_close_result → loadMonthCloseResultForChat
C2_INTENT: month_close_result
C2_ROUTE: isMonthCloseQuestion (cierre financiero + agosto) → planner month_close_result → loadMonthCloseResultForChat
C3_ROUTE: same historical month_close_result path; resolveCloseMonth → 2026-07
C4_CURRENT_MONTH_ROUTE: igf_status → selectIgfStatusSourceMode MINI_FORECAST_PROY → current month (septiembre). NO TOCADO.

DASHBOARD_PATH: ArrClient.ensureMonthLoaded → resolveUploadDayForMonth → fetchIgfForecast(year, month, include_mini, upload_day?) → GET /api/dashboard/igf-forecast → pool.connect() → buildIgfForecastPayload(client) → computeIgfForecastMiniPayload(client, igf, year, month, uploadDay) → payload.mini.rows → fila Acapulco
MONTH_CLOSE_PATH: isMonthCloseQuestion → loadMonthCloseResultForChat → acquire() Client → loadIgfForecastMiniPayload(db, {year,month,plantName,plantCode}) → loadIgfForecastMiniPayloadForDirectorIa → [THROW Client.connect] → catch historical_mini=null → composeFinancialPresentation → DATA_MISSING

CHAT_DEP_NAME: loadIgfForecastMiniPayload
CHAT_DEP_INJECTION_POINT: server.js configureDirectorIaChat({ loadIgfForecastMiniPayload: loadIgfForecastMiniPayloadForDirectorIa })
CHAT_DEP_RUNTIME_TARGET: loadIgfForecastMiniPayloadForDirectorIa → buildIgfForecastPayload + computeIgfForecastMiniPayload
CHAT_DEP_PRESENT: YES
CHAT_DEP_OPTIONAL_OR_REQUIRED: OPTIONAL_AT_MONTH_CLOSE_CALLSITE (typeof === "function"); INJECTED_AT_RUNTIME

DASHBOARD_MINI_CALL_ARGS: GET query { year, month, include_mini: "1", upload_day? }; compute(client_from_pool.connect, igf, year, month, uploadDay)
MONTH_CLOSE_MINI_CALL_ARGS: loadIgfForecastMiniPayload(db_already_acquired_client, { year, month, plantName, plantCode }) — no upload_day

ARG_YEAR_PARITY: YES (2026)
ARG_MONTH_PARITY: YES (8)
ARG_PLANT_PARITY: N/A_FOR_COMPUTE (compute always emits 6 labels; plant filter is findMiniRowForPlant after return)
ARG_CUTOFF_PARITY: NO (dashboard may send upload_day; month_close never does)
ARG_VERSION_PARITY: YES (both default latest GLOBAL version; neither path sets version_as_of_corte in these calls)

DASHBOARD_CUTOFF_SOURCE: ArrClient.resolveUploadDayForMonth → URL upload_day if same YM, else fetchArrLastUploadDay cache
DASHBOARD_CUTOFF_VALUE_RULE: YYYY-MM-DD of last ARR upload for that YM, or undefined (no invented LIVE value)
MONTH_CLOSE_CUTOFF_SOURCE: none; wrapper uploadDay = opts.upload_day || null
MONTH_CLOSE_PASSES_UPLOAD_DAY: NO
UPLOAD_DAY_REQUIRED_FOR_HISTORICAL_MINI: NO
UPLOAD_DAY_ABSENCE_EFFECT: compute still returns 6 rows with finite fields (zeros count). isIgfMesCerradoPorCorte("") uses clock. Does not by itself yield DATA_MISSING.

RESOLVED_CLOSE_PERIOD: 2026-08 (C1/C2, now=2026-09-11)
MINI_REQUESTED_PERIOD: 2026-08 (passed as year/month)
MINI_RETURNED_PERIOD: UNREACHABLE_ON_LIVE_PATH (wrapper throws before compute). If compute ran, return echoes year/month args.
PERIOD_PARITY: REQUEST_YES; RETURN_UNREACHABLE_BECAUSE_FIRST_GAP

DASHBOARD_MINI_SHAPE: compute return attached as payload.mini = { ok, year, month, upload_day, rows, zona }
DIRECTOR_WRAPPER_RETURN_SHAPE: same flat object (not { payload }, not { mini })
MONTH_CLOSE_EXPECTED_SHAPE: mini.rows + mini.year + mini.month
SHAPE_PARITY: YES
SHAPE_FIRST_DIVERGENCE: NONE

MINI_ROW_PLANT_FIELDS: empresa (label, e.g. "Acapulco"), plant_code (map label→plant, e.g. "Acapulco" not E3)
MONTH_CLOSE_PLANT_NAME: plant.planta_nombre from plantas.nombre (LIVE header "Acapulco")
MONTH_CLOSE_PLANT_CODE: plant.plant_code from plantas.clave (typically E3; ACA not required)
FIND_MINI_ROW_MATCH_RULE: normalize(label/code) vs row.empresa and row.plant_code; exact=100, substring=50; keep best if score>=50
PLANT_MATCH_POSSIBLE: YES (Acapulco exact 100). E3-only would fail. ACA-only matches via substring of "Acapulco".
PLANT_MATCH_FIRST_DIVERGENCE: NONE_ON_LIVE_ACAPULCO_NAME

VISIBLE_NOT_FINAL_REQUIRED_FIELDS: any finite of operativos | corporativos | gasto | utilOperImporte | resultadoFinalImporte; period of historical_mini must match
VISIBLE_NOT_FINAL_GATE_FUNCTION: historicalMiniPeriodMatches && hasDefendableHistoricalMini

ERROR_SWALLOW_POINT: lib/director-ia-month-close-result.js loadMonthCloseResultForChat catch around loadIgfForecastMiniPayload → historical_mini = null
ERROR_TYPE_VISIBLE_TO_CALLER: NONE (error discarded as _e)
DATA_MISSING_CAUSED_BY_SWALLOW_POSSIBLE: YES — this is the LIVE symptom

DASHBOARD_VS_MONTH_CLOSE_PARITY_TABLE:

| FIELD | DASHBOARD | MONTH_CLOSE | PARITY |
|---|---|---|---|
| year | 2026 | 2026 | YES |
| month | 8 | 8 | YES |
| upload_day | resolveUploadDayForMonth / query | not passed | NO |
| plant identifier | UI empresa label after mini.rows | planta_nombre + plant_code into findMiniRowForPlant | YES if nombre=Acapulco |
| version rule | latest GLOBAL unless version_as_of_corte | latest GLOBAL | YES |
| compute function | computeIgfForecastMiniPayload | same, via wrapper | YES if wrapper reaches it |
| first DB handle | Pool.connect then use Client | pass already-acquired Client into wrapper that calls .connect again | NO — FIRST GAP |
| return shape | {ok,year,month,upload_day,rows,zona} | reads rows/year/month | YES |
| row matcher | ArrClient by empresa label | findMiniRowForPlant | YES for Acapulco |
| required financial fields | UI paints finite numbers including 0 | hasDefendableHistoricalMini (0 ok) | YES |

S1_DASHBOARD_STYLE_RESULT: VISIBLE_NOT_FINAL (row Acapulco found; upload_day null)
S2_MONTH_CLOSE_STYLE_RESULT: DATA_MISSING (wrapper .connect on checked-out Client throws; swallow → historical_mini null)
REPRODUCED_WITHOUT_LIVE_DB: YES

FIRST_PARITY_GAP: WRAPPER_CONNECT_HEURISTIC_THROWS_ON_CHECKED_OUT_CLIENT

WIRING_BUG: NO
ARGUMENT_BUG: YES
CUTOFF_BUG: NO
PERIOD_BUG: NO
SHAPE_BUG: NO
PLANT_MATCH_BUG: NO
VALUE_GATE_BUG: NO
ERROR_SWALLOW_BUG: YES
DATA_BUG: NO
COMPOSER_BUG: NO
CURRENT_MONTH_SOURCE_BUG: NO

CAN_FIX_WITHOUT_NEW_SQL: YES
CAN_FIX_WITHOUT_NEW_TOOL: YES
CAN_FIX_WITHOUT_NEW_ENDPOINT: YES
CAN_FIX_WITHOUT_SERVER_CHANGE: YES (call-site can pass pool like C5). Fixing the wrapper heuristic itself would touch server.js.
CAN_FIX_WITHOUT_FRONTEND_CHANGE: YES

FILES_INSPECTED:
- frontend-dashboard/app/arr/ArrClient.tsx (resolveUploadDayForMonth, ensureMonthLoaded, fetchIgfForecast)
- frontend-dashboard/lib/api.ts (fetchIgfForecast)
- server.js (configureDirectorIaChat wrapper, buildIgfForecastPayload, computeIgfForecastMiniPayload, GET /igf-forecast, isIgfMesCerradoPorCorte)
- lib/director-ia-month-close-result.js (acquire, load mini, swallow, composeFinancialPresentation, hasDefendableHistoricalMini, isMonthCloseQuestion, resolveCloseMonth)
- lib/director-ia-chat.js (configureDirectorIaChat, month_close_result handoff, C5 buildIgfStatusMiniForecastChatResult)
- lib/director-ia-dashboard-forecast-adapter.js (findMiniRowForPlant)
- lib/director-ia-planner.js (C1–C4 routing)
- node_modules/pg/lib/client.js (_connect already-connected guard)
- test/director-ia-month-close-financial-variables-composition.test.js (fixture Acapulco/E3; mocked loader → VISIBLE_NOT_FINAL)

TESTS_RUN:
- sonda temporal S1/S2/C5-control + routing C1–C4 + pg.Client reconnect (deleted after run; not committed)
- no LIVE_DB
- no product test file added

RISKS:
- A later slice that only adds upload_day will not fix LIVE DATA_MISSING while the Client.connect throw remains.
- A later slice that only logs the swallow without changing the first argument will not produce the row.
- Passing pool like C5 (second checkout while month_close holds db) is already the working C5 pattern.
- Do not retarget C4 or composer.

RECOMMENDED_NEXT_SLICE: FIX-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-CLIENT-WRAPPER-001 — make month_close invoke the wrapper with a Pool (C5) or make the wrapper accept an already-acquired Client. Keep composer A/B/C and C4 untouched. Optional follow-up: stop swallowing the real error into historical_mini=null.

## Preserved

- C1/C2 remain month_close_result.
- C3 julio remains the same historical path (same first-arg defect would apply).
- C4 remains igf_status / MINI_FORECAST_PROY / current month.
- Composer A/B/C not modified.
- No product, SQL, schema, tool, endpoint, frontend, server, LIVE_DB, deploy, merge, or push main.
