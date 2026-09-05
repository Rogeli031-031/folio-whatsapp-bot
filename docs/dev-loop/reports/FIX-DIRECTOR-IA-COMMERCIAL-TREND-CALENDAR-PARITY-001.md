# FIX-DIRECTOR-IA-COMMERCIAL-TREND-CALENDAR-PARITY-001

```yaml
task_id: "FIX-DIRECTOR-IA-COMMERCIAL-TREND-CALENDAR-PARITY-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
tier1_before: "8/8 PASS"
runtime_before: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..004 FAIL; R-MOVEMENT-005 PASS; R-MOVEMENT-006..008 FAIL"
predeploy_before: "FAIL"
tier1_after: "8/8 PASS"
runtime_after: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..008 PASS"
predeploy_after: "PASS"
harness_fail: 0
first_bad_boundary: "PERIOD"
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
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-COMMERCIAL-MOVEMENT-DASHBOARD-PARITY-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
```

## 1. BEFORE (gate endurecido, producto aún no tocado)

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001..007  PASS

R-MOVEMENT-001  FAIL  kg 17118→20790 Δ3672  expected 19980→23652 (trailing 30d)
R-MOVEMENT-002  FAIL  kg 56602→52698 Δ-3904 expected 55473→58828 Δ3355 (sign flip)
R-MOVEMENT-003  FAIL  kg 162839→145354 Δ-17485 expected 168890→150199
R-MOVEMENT-004  FAIL  kg 6419→0 Δ-6419 expected 6370→459 (B=0 / STOPPED)
R-MOVEMENT-005  PASS  (cero verdadero de agosto; protección)
R-MOVEMENT-006  FAIL  STUB_OPENAI_TRANSPORT; sin 3,672 kg / 3.672 t
R-MOVEMENT-007  FAIL  METRIC_PACK pack=clarification
R-MOVEMENT-008  FAIL  ups=4 expected=9 declared=false

HARNESS FAILURE = 0
PRE-DEPLOY GATE = FAIL
```

TIER 1 y R-RUNTIME-001..007 no se debilitaron. R-MOVEMENT reprodujo los defectos de la auditoría (PERIOD, unidades, clasificación, recorte).

## 2. FIRST_BAD_BOUNDARY definitivo

**PERIOD**

Ambas superficies leen `arr.ventas_diarias_cliente`. Verificado en código, no re-auditoría LIVE:

- Dashboard / Clientes por mes: `computeClientesDescuentoMes` (`lib/dashboard-arr-forecast.js`) usa `firstDay` = `YYYY-MM-01` y `lastDay` = último día del mes; `SUM(v.kg)` en kg.
- Director IA `commercial_trend` trailing: `queryFechaBounds` ancla a `MAX(fecha)`; `resolveRangeWindow` `1m` = max−29 días vs 30 días previos; `queryClientTons` hace `ROUND(SUM(kg)/1000, 3) AS venta_ton`.
- `namesCalendarMonth` solo reconocía `este mes` / `mes actual`. Julio/agosto explícitos caían al default trailing.

Secundarios (mismo slice): UNIT_LABEL, CLASSIFICATION, LIST_COMPLETENESS.

## 3. Causa raíz

`agosto comparado con julio` no resolvía meses calendario. El planner no clasificaba la pregunta desnuda como `commercial_trend` (clarificación). Las preguntas de movers sí entraban, pero `resolveCommercialTrendSlots` dejaba `period_kind=trailing` `range_days=30` anclado a `MAX(fecha)`.

Eso recortaba el 1 de agosto (y el 1–2 de julio) fuera de la ventana actual/previa. Un remanente de 459 kg el día 1 de agosto desaparecía → B=0 → `selectTopMovers` `previo>0 && actual<=0` → perdido. WAL-equivalente cambiaba de signo. La agregación `/1000` más prosa LLM etiquetaba toneladas como kg. `selectTopMovers` recortaba Top 6 y el chat lo presentaba como la lista.

## 4. Cambio mínimo

No se convirtió `commercial_trend` global a calendario. No se tocó el motor trailing (`lib/commercial-trend-engine.js`).

Nuevo `period_kind=calendar_compare` cuando hay mes(es) nombrado(s) y la pregunta no es rango trailing (`último mes`, `30 días`, `90 días`, `últimas 4 semanas`, `estos meses`).

Ejemplo: `agosto comparado con julio` + now 2026-09 → A `2026-07-01..31`, B `2026-08-01..31`. Un solo mes nombrado → ese mes vs el mes calendario anterior.

Agregación: `SUM(kg)` por `cliente_norm`, mismos límites first/last que el dashboard. Clasificación y delta en kg. Respuesta determinista; OpenAI no se llama en este path.

## 5. Funciones modificadas

`lib/director-ia-commercial-trend.js`

- `namesCommercialRange` — también `últimas 4 semanas` (no se las come el calendario)
- `isCommercialTrendQuestion` — dos meses nombrados + `compar` → `commercial_trend`
- `resolveCommercialTrendSlots` — rama `calendar_compare`
- `calendarMonthBounds` / `extractNamedMonths` / `resolveCalendarCompareMonths` / `prevCalendarMonth`
- `classifyPurchaseDelta`
- `loadCalendarCompare` / `defaultQueryCalendarClientKg` / `buildCalendarMovers` / `buildCalendarCompareAnswer`
- `loadCommercialTrendForChat` — despacha calendario antes del motor trailing
- `buildCommercialTrendChatResult` — transporta `period_kind`, `calendar_movers`, `month_a/b`, `list_*`

`lib/director-ia-chat.js`

- pasa `now` y `queryCommercialTrendCalendarKg`
- `calendar_compare` + `deterministic_answer` → `openai_called: false`

No tocadas: `selectTopMovers`, OLS, DICF, `commercial_state`, historical_margin, frontend, DB.

## 6. Regla calendar vs trailing

| Pregunta | period_kind |
|---|---|
| `agosto comparado con julio` | calendar_compare (1..31 vs 1..31) |
| `¿Qué clientes aumentaron/disminuyeron/dejaron de comprar agosto comparado con julio?` | calendar_compare |
| `últimos 30 días` / `último mes` / `últimas 4 semanas` | trailing 30d |
| `últimos 3 meses` / `90 días` | trailing 90d |
| `este mes` / `mes actual` | calendar_month (ruta previa de totales de planta; no movers) |

## 7. Unidades

Fuente: kg. Path calendario no divide entre 1000. Respuesta: `toLocaleString("es-MX")` + ` kg` (p. ej. `3,672 kg`). Prohibido `3.672 kg` para un valor interno en toneladas.

El detector del harness `looksLikeTonLabeledAsKg` se corrigió para marcar solo `3.672 kg` (punto decimal + kg), no `3,672 kg` (miles es-MX). La expectativa sigue siendo: aceptable `3,672 kg` o `3.672 t`; no se relajó `expected_delta_kg`.

Trailing 30d sigue en `venta_ton`.

## 8. Clasificación (mismo corte A/B)

- AUMENTÓ: `kg_B > kg_A`
- DISMINUYÓ: `kg_A > 0 AND kg_B > 0 AND kg_B < kg_A`
- DEJÓ DE COMPRAR: `kg_A > 0 AND kg_B = 0`

`delta_kg = kg_B - kg_A`. Un cliente con 459 kg en B no es STOPPED.

No se redefinió “cliente nuevo” ni reactivados.

## 9. Top N / completitud

Path calendario no usa Top 6. Devuelve la clase pedida completa (`list_truncated=false`, `list_scope=full_class`, `list_total`). Si en el futuro se recortara, el builder declara Top N de total. Trailing Top 6 no se cambió.

## 10. AFTER

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001..007  PASS
R-MOVEMENT-001..008  PASS

HARNESS FAILURE = 0
PRE-DEPLOY --gate = PASS
--gate exit 0
HTTP 5xx = 0
```

## 11. Suites relacionadas

Todas PASS:

- `test/director-ia-commercial-trend.test.js` (22)
- `test/director-ia-commercial-movers-additive.test.js`
- `test/director-ia-conversational-continuity.test.js` (planner + routing)
- `test/director-ia-period-start-semantics.test.js`
- `test/director-ia-real-input-arr.test.js`
- `test/director-ia-channel-projection.test.js`
- `test/director-ia-golden-regression.test.js`
- `test/director-ia-intra-session-topic-return.test.js`
- `test/director-ia-natural-followup.test.js`
- `test/director-ia-m11-commercial-dossier.test.js` (tool expediente; no hijack de listas)
- `test/director-ia-conversational-executive-status.test.js`

`npm run test:director-ia:golden` y `npm run test:director-ia:predeploy -- --gate` PASS.

## 12. Fuera de alcance (confirmado)

Nuevos vs reactivados, definición histórica de cliente nuevo, margen de cliente, historical_margin, Action Register, DICF, frontend, DB/schema, LIVE_DB, contratos congelados. Sin hardcode de 20 CUMBRES / WAL MART / GRUPO MOVE / CARBURADORA MASTER.

## 13. Archivos

Tocados:

- `lib/director-ia-commercial-trend.js`
- `lib/director-ia-chat.js`
- `test/director-ia-commercial-trend.test.js`
- `test/fixtures/director-ia-golden-cases.js`
- `test/helpers/director-ia-runtime-golden-harness.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-COMMERCIAL-TREND-CALENDAR-PARITY-001.md`

No tocados: `docs/director-ia/`, `lib/commercial-trend-engine.js`, `lib/director-ia-planner.js`, frontend, DB, LIVE_DB, merge/deploy.

## 14. Commit / status

implementation SHA: pendiente del commit de esta rama.

No push. No merge. No deploy. No next task.
