# FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001

```yaml
task_id: "FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
tier1_before: "8/8 PASS"
runtime_before: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..008 PASS; R-DELTA-INCOME-001..010 FAIL"
predeploy_before: "FAIL"
tier1_after: "8/8 PASS"
runtime_after: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..008 PASS; R-DELTA-INCOME-001..010 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
first_bad_boundary: "PLANNER"
forecast_source: "computeDeltaIngresoForecast"
hardcoded_live_clients: false
golden_tier1_expectations_changed: false
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-NEGATIVE-IMPACT-COMMENTS-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task. Validación LIVE de valores después del deploy."
```

## 1. BEFORE (gate endurecido, producto aún no tocado)

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001..007  PASS
R-MOVEMENT-001..008  PASS

R-DELTA-INCOME-001  FAIL  METRIC_PACK pack=clarification (expected delta_income_forecast)
R-DELTA-INCOME-002  FAIL  METRIC_PACK pack=clarification
R-DELTA-INCOME-003  FAIL  METRIC_PACK pack=clarification
R-DELTA-INCOME-004  FAIL  METRIC_PACK pack=clarification
R-DELTA-INCOME-005  FAIL  METRIC_PACK pack=commercial_trend forbidden
R-DELTA-INCOME-006  FAIL  METRIC_PACK pack=commercial_trend forbidden
R-DELTA-INCOME-007  FAIL  METRIC_PACK pack=commercial_trend forbidden
R-DELTA-INCOME-008  FAIL  METRIC_PACK pack=commercial_trend forbidden
R-DELTA-INCOME-009  FAIL  METRIC_PACK pack=clarification
R-DELTA-INCOME-010  FAIL  METRIC_PACK pack=clarification

HTTP 5xx = 0
HARNESS FAILURE = 0
PRE-DEPLOY GATE = FAIL
```

Mínimo rojo exigido (001, 002, 004, 005, 010): reproducido de forma natural. No se relajaron expectations.

## 2. FIRST_BAD_BOUNDARY confirmado

**PLANNER**

Runtime completo (pregunta → planner → routing → pack), no solo intent:

- Sin `comentarios`: `impacto negativo en el ingreso` + mes no coincidía con `delta_income` (exige `cambio|delta|variacion` + `ingreso`) ni con movers. Caía a `conversation_clarification`.
- Con `comentarios`: `isCommercialMoversQuestion.commentsOnSet` (`comentarios` + `clientes` / `tienen`) secuestraba a `commercial_trend` (kg). El detector de comentarios de cliente en planner se saltaba porque `isCommercialTrendQuestion` ya era true.

Secundarios: forecast source (M9 histórico no aplica; `computeDicf` ancla `MAX(fecha)`), periodo explícito, comments identity, ausencia de Runtime coverage previo.

## 3. Fuente forecast seleccionada

**`computeDeltaIngresoForecast`** (`lib/delta-ingreso-forecast.js`)

Justificación física:

- El caller suministra `yearA, monthA, yearB, monthB`. El helper construye `periodoA`/`periodoB` con esos argumentos. No ancla B a `MAX(fecha)`.
- El endpoint dashboard `POST /api/dashboard/delta-ingreso-forecast-datos` ya usa esa firma con `periodoA`/`periodoB` YYYY-MM.
- `computeDicf` no se reutilizó: sigue anclado a `MAX(fecha)`. Si el máximo es agosto, etiquetar septiembre sería el defecto prohibido.
- `get_delta_income` / M9 (`loadDeltaIngresoForChat`) compara dos meses reales y declara `not: delta_ingreso_forecast`. Se conservó para `cómo cambió el ingreso`.
- No se creó una tercera fórmula. El chat solo rankea/recorta/enriquece el objeto del helper.

## 4. Semántica A/B

Para `septiembre` + NOW `2026-09-01T12:00:00-06:00`:

- Periodo A = `2026-08` real (agosto 2026)
- Periodo B = `2026-09` forecast (septiembre 2026)

Resolución: `resolveCalendarCompareMonths` — un mes nombrado = ese mes como B, mes calendario anterior como A.

La respuesta lo declara: `Agosto 2026 real vs septiembre 2026 forecast`. No inventa FINAL/CLOSED. No convierte septiembre abierto en cierre real.

El helper, si B es el mes actual, proyecta a cierre; si no, usa el mes completo. Eso es semántica de la fuente, no una etiqueta nueva.

## 5. Routing nuevo

Cadena:

pregunta
→ `isDeltaIngresoForecastQuestion` (impacto negativo / deterioran / afectan / delta ingreso + periodo)
→ intent `delta_income` con evidence `delta_ingreso_forecast`
→ chat rama forecast (antes de M9)
→ `computeDeltaIngresoForecast(yearA, monthA, yearB, monthB)`
→ `delta_ingreso < 0`, más negativo → menos negativo
→ Top N pedido
→ comentarios por nombre normalizado + planta
→ pack `delta_income_forecast` + respuesta determinista (`openai_called: false`)

Protecciones de secuestro:

- `isCommercialMoversQuestion`: `ingreso` + (`impacto` | `deterior` | `delta ingreso`) no es movers. `comentarios` no cambia el dominio.
- Planner comentarios-de-cliente: no dispara si es forecast.
- `cómo cambió el ingreso` sigue M9 `delta_income` / mode `delta_income`.

## 6. Ranking / Top N / impacto agregado

- Filtro: `delta_ingreso < 0`
- Orden: más negativo → menos negativo (no valor absoluto; no positivos)
- Top N = número pedido (`5 clientes`); si hay menos, devuelve los existentes y lo declara
- Declara `list_total_negative`, `top_n` mostrado, `list_truncated`
- `impacto_top_n = SUM(delta_ingreso)` de las filas mostradas, signo conservado
- Copy permitida: `Estos 5 clientes acumulan un Delta Ingreso de -$X`
- Prohibida: `La rentabilidad caerá -$X`

Fixture: N1..N5 = -250000, -180000, -120000, -90000, -50000. Agregado **-690000**. CLIENTE_POS (+80000) no entra.

## 7. Comments identity / ausencia / no causalidad

Fuente: `arr.cliente_comentarios` vía `loadRecentCommentsByClienteNombres` (misma unión que la gráfica: `lower(trim(cliente_nombre))` + planta).

No se usa `cliente_key` DICF como única vía. No fuzzy. No hardcode BAYAM.

Más reciente: `ORDER BY created_at DESC` del loader; se toma el primero. Se muestra fecha + texto.

Ausencia: `Sin comentario registrado` + `comment_missing: true`. No inventa.

No causalidad: `Comentario registrado (fecha): "..."`. R-DELTA-INCOME-007 falla si la prosa convierte el comentario en causa (`la caída ocurrió/fue`, `disminuyó porque`).

## 8. Funciones modificadas

`lib/director-ia-planner.js`

- `isDeltaIngresoForecastQuestion` / `isHistoricalDeltaIngresoQuestion`
- `detectDirectorIaIntent`: forecast antes de `commercial_trend`; comentarios-de-cliente no secuestran forecast

`lib/director-ia-commercial-trend.js`

- `isCommercialMoversQuestion`: exclusión ingreso+impacto/deterior/delta ingreso

`lib/director-ia-chat.js`

- `loadDeltaIngresoForecastNegativeTopN`
- `buildDeltaIngresoForecastAnswer` / `buildDeltaIngresoForecastChatResult`
- rama `delta_income` → forecast vs M9

No tocadas: `computeDeltaIngresoForecast` (reutilizado), `computeDicf`, M9 loaders, frontend, DB, contratos.

## 9. AFTER

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001..007  PASS
R-MOVEMENT-001..008  PASS
R-DELTA-INCOME-001..010  PASS

HTTP 5xx = 0
HARNESS FAILURE = 0
PRE-DEPLOY --gate = PASS
--gate exit 0
```

## 10. Suites relacionadas

Todas PASS (230 tests / 61 suites en el lote):

- `test/director-ia-m9-deltas.test.js` (planner delta_income + M9 no forecast write)
- `test/director-ia-commercial-trend.test.js`
- `test/director-ia-commercial-movers-additive.test.js`
- `test/director-ia-client-profile.test.js` (comments identity / no causa)
- `test/director-ia-m7-igf-composition.test.js`
- `test/director-ia-financial-diagnosis.test.js`
- `test/director-ia-conversational-continuity.test.js`
- `test/director-ia-m11-commercial-dossier.test.js`
- `test/director-ia-eks.test.js`
- `test/director-ia-historical-margin.test.js`
- `test/director-ia-period-start-semantics.test.js`

`npm run test:director-ia:predeploy -- --gate` PASS.

## 11. Fuera de alcance (confirmado)

Nueva fórmula de rentabilidad, Delta Gastos, alertas, notificaciones, nuevos vs reactivados, cumplimiento de compromisos, causal inference, HG, DB/schema/migrations, frontend, LIVE_DB, contratos congelados, merge, deploy, next task. Sin hardcode de clientes ni valores LIVE.

## 12. Archivos

Tocados:

- `lib/director-ia-planner.js`
- `lib/director-ia-commercial-trend.js`
- `lib/director-ia-chat.js`
- `test/fixtures/director-ia-golden-cases.js`
- `test/helpers/director-ia-runtime-golden-harness.js`
- `test/director-ia-m9-deltas.test.js`
- `test/director-ia-commercial-trend.test.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001.md`

No tocados: `docs/director-ia/`, `lib/delta-ingreso-forecast.js` (solo reutilizado), `lib/dicf.js`, `lib/director-ia-m9-deltas.js`, frontend, DB, LIVE_DB, merge/deploy.

## 13. Commit / status

implementation SHA: pendiente de stamp en el commit de esta rama.

No push. No merge. No deploy. No next task.
