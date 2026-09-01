# IMPL-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001

```yaml
task_id: "IMPL-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
base_main_sha: "1f7774d7bff5fdd71f4e7b88433dde178f4fef86"
branch: "implementation/director-ia-historical-margin-questions-001"
g1_human: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-01T17:06:10-06:00 (authorized_by / authorized_at / human_authorization intactos)"
files_touched:
  - "lib/director-ia-historical-margin.js"
  - "test/director-ia-historical-margin.test.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-conversation-state.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001.md"
files_not_touched:
  - "lib/director-ia-financial-actual.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-new-clients.js"
  - "lib/director-ia-commercial-trend.js"
  - "lib/director-ia-financial-diagnosis.js"
  - "lib/director-ia-month-close-result.js"
  - "lib/director-ia-client-profile.js"
  - "lib/dicf.js"
  - "server.js"
  - "docs/director-ia/"
  - "sql/"
  - "frontend-dashboard/"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/TASK_TEMPLATE.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001.md"
contracts_modified: []
secrets_check: "none"
```

## 1. Executive summary

Se implementó la capacidad dedicada `historical_margin` (opción B: adapter local) para responder P1–P10 de forma determinista, read-only y fuente-defendible. P1–P4 salen del handler in-process con `openai_called = false`. Closed usa única versión `FINAL` + `margen_kg` almacenado. Open usa latest IGF etiquetado `FORECAST`. Future no consulta. El matcher de planta es único y fail-closed. El síntoma de herencia `commercial_trend` → toneladas + OLS queda cerrado: P1 explícito es standalone `historical_margin`.

## 2. Audit finding addressed

La auditoría `AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001` demostró:

1. Fresh P1–P4 → `unknown` (INTENT_GAP).
2. P1 tras `commercial_trend` → inherit trend → toneladas + OLS (CONVERSATION_INHERITANCE).
3. `getMargenKgPorPeriodo` = latest + ILIKE ponderado: no es contrato FINAL.
4. Matcher ILIKE `%nombre%` es ambiguo.

Esta implementación cierra los cuatro hallazgos sin patch de regex `margenes?` ni prompt-only.

## 3. Architecture implemented

Cadena física:

```
QUESTION
  → isHistoricalMarginQuestion (detector)
  → resolveHistoricalMarginRequest (operation + periods)
  → extractNamedPlant / session plant
  → canViewFinancialActual (auth ANTES de query)
  → loadClosedMonth | loadOpenMonth | futureMonth
  → truth class + stored margen_kg
  → veracity
  → buildHistoricalMarginChatResult
  → chat in-process
```

Operaciones: `single_month`, `compare_months`, `year_max`, `year_min`.

Sin HTTP interno, sin axios, sin `server.js`, sin OpenAI para el valor.

## 4. Detector

`isHistoricalMarginQuestion()` exige la palabra `margen` **y** señal de:

- mes calendario explícito;
- comparación de meses;
- best/max o min/lowest del año;
- año explícito ligado a extrema anual;
- `YYYY-MM`.

Hold-outs (NO): diagnóstico (`cómo va` + planta sin mes), por qué cayó, descuento abril–mayo, tendencia/OLS, venta, clientes nuevos.

No basta la palabra margen.

## 5. Operations

| Operación | Señal |
| --- | --- |
| `single_month` | un mes nombrado o YYYY-MM |
| `compare_months` | exactamente dos meses, orden semántico de la pregunta |
| `year_max` | mejor/mayor/máximo + año/`del año` |
| `year_min` | menor/mínimo/peor + año/`del año` |

## 6. Period resolver

Resolver propio. No reutiliza `resolveRequestedCalendarMonth` de new-clients.

Reloj: `America/Mexico_City` vía `Intl`. Tests fijan `now = 2026-09-01`. Runtime usa `new Date()`.

Con now 2026-09-01 CDMX:

- mayo → 2026-05 closed
- abril y mayo → 2026-04, 2026-05
- mayo 2025 → 2025-05
- septiembre → 2026-09 open
- octubre → 2026-10 future (no 2025-10)

Soporta enero–diciembre, `setiembre`, `YYYY-MM`, `de 2025`, `del año`, `año 2025`.

Candidatos anuales: año actual = meses `1..(today.month-1)`; año pasado = 1..12; año futuro = ninguno.

## 7. Closed source FINAL

Adapter local (opción B). No modifica `director-ia-financial-actual.js`.

```
igf.versions WHERE plant_code='GLOBAL' AND year/month
```

Todas las versiones del periodo; filtrar `financial_state === FINAL`:

- 0 versions → DATA_NOT_FOUND / NO_VERSION
- versions > 0 y 0 FINAL → DATA_NOT_FOUND / NOT_FINAL
- exactamente 1 FINAL → `igf.compromiso_lines` + matcher único
- >1 FINAL → SOURCE_ERROR / VERSION_AMBIGUOUS

Valor = `row.margen_kg` almacenado. No se recalcula, no se pondera, no se deriva de `venta_ton`. No `getMargenKgPorPeriodo`. No latest-as-FINAL.

## 8. Open FORECAST

Mes calendario actual: latest `ORDER BY version_number DESC LIMIT 1` + matcher único + `margen_kg` stored.

`truth_class = FORECAST`. `presented_as_closed_actual = false`. `forecast_used = true`.

Copy: «Margen forecast de septiembre 2026: X.XX $/kg. Septiembre está abierto; no lo presento como cierre real.»

No entra a year_max / year_min.

## 9. Future protection

P10 con now 2026-09-01: octubre = 2026-10 future.

No query. `facts_consulted = false`. `sources = []`. DATA_NOT_FOUND.

Copy: «Octubre de 2026 es un periodo futuro. Esta capacidad no presenta un margen histórico para ese periodo.»

## 10. Plant resolution

Matcher dedicado `findUniquePlantRow`:

1. empresa exacta == plant_code normalizado
2. empresa exacta == planta_nombre normalizado
3. equivalencia exacta tras retirar prefijo GT/GTM, solo si queda **una** candidata

Normalización: trim, case, diacríticos, espacios repetidos.

Fixture ACAPULCO + GTM ACAPULCO + ACAPULCO DIAMANTE → `plant_match_ambiguous = true`, fail-closed.

Sin includes, substring, ILIKE `%nombre%`, fuzzy, first-row, LLM.

Planta nombrada (p. ej. Acapulco) se resuelve contra `public.plantas` (nombre/clave exactos, LIMIT 2 exige unicidad) **antes** de auth y query.

## 11. Authorization

No se ampliaron accesos. Closed y open usan `canViewFinancialActual` (contrato ACTUAL_FINANCIAL).

Diferencia documentada: el anexo IGF podría ser más permisivo para forecast; esta capacidad **no** elige la variante más permisiva. Open FORECAST queda tan restrictivo como closed ACTUAL_FINANCIAL.

GA / GV / GG named-denied: SOURCE_RESTRICTED. Query IGF no se ejecuta si el permiso del target falla.

Named plant: resolver → permiso del target → luego query. No cross-plant.

## 12. Veracity mapping

| Condición | Código |
| --- | --- |
| auth denied | SOURCE_RESTRICTED |
| 0 versions / no FINAL / no plant row / margin null / future | DATA_NOT_FOUND |
| DB throw / >1 FINAL / plant ambiguous | SOURCE_ERROR |
| ranking anual con válidos + exclusiones por error o cobertura incompleta | SOURCE_PARTIAL |
| fuente completa para la operación | SOURCE_AVAILABLE |

Catch de query → SOURCE_ERROR, no null silencioso. Un mes que tira no tumba el ranking anual: ese mes queda `error` y puede producir SOURCE_PARTIAL.

## 13. Single-month builder

Closed válido: `Mayo 2026: X.XX $/kg.` + `Fuente: cierre financiero FINAL.`

Open válido: forecast + «no lo presento como cierre real».

Missing closed: `No hay un margen histórico FINAL defendible para mayo 2026.`

No añade toneladas, OLS, CASA, comisionista, DICF, Bitácora, Action Register.

## 14. Compare builder

Orden semántico de la pregunta: abril = A, mayo = B. `deltaRaw = B - A` **antes** de formatear.

Display: `Variación mayo − abril: +Z.ZZ $/kg`.

Si A/B no comparten semántica FINAL homogénea (p. ej. closed vs open FORECAST): se informan valores etiquetados y **no** se fabrica delta histórico.

Test: A=7.114, B=7.115 → `delta_raw = 7.115 - 7.114`.

## 15. Annual ranking

Array de evidence months. INCLUDE solo: closed + unique FINAL + unique plant + finite margin (0 incluido; negativo stored finito incluido).

EXCLUDE: open, future, missing, not final, ambiguous FINAL, ambiguous plant, source error, null margin. La razón se conserva en el mes excluido.

Ranking: `Math.max` / `Math.min` sobre raw. Ties: igualdad raw exacta; se reportan todos.

Copy parcial: «Entre los N meses cerrados con evidencia FINAL disponible…». No afirma «de todo el año» si `coverage_complete = false`.

0 válidos → no ranking, DATA_NOT_FOUND.

## 16. Tie semantics

Empate por raw, no por 2 decimales. 7.114 vs 7.115 no empatan aunque el display pueda verse cercano. Varios raw iguales → todos los winners.

## 17. Continuity

`historical_margin` se añadió a `INHERITABLE_INTENTS`.

- Turno 1 margen abril → `historical_margin`
- Turno 2 «¿Y en mayo?» → inherit `historical_margin`, `single_month` mayo, misma planta; se vuelve a consultar mayo.

P1 explícito («¿Cuál fue el margen en mayo?») es **standalone** aunque el parent sea `commercial_trend`. No hereda OLS ni pack de toneladas.

`commercial_trend` + «¿Y en mayo?» (sin palabra margen y sin parent `historical_margin`) **no** se convierte en `historical_margin`.

No se heredan valores financieros raw. No write memory.

El loader de chat usa `rawQuestion` (no el texto expandido) para no contaminar el periodo del follow-up.

## 18. Source traceability

Closed/open válidos: `igf.versions`, `igf.compromiso_lines`. No `arr.*`. No `getMargenKgPorPeriodo`.

Future: `sources = []`.

Cada evidence month puede exponer: `version_id`, `version_number`, `financial_state` cuando aplica, `truth_class`, `period_kind`.

Sin secretos.

## 19. P1–P10 matrix before/after

Referencia temporal de tests: 2026-09-01 America/Mexico_City.

| ID | BEFORE (auditoría) | AFTER |
| --- | --- | --- |
| P1 ¿Cuál fue el margen en mayo? | unknown (fresh); commercial_trend inherit si parent trend | historical_margin / single_month / closed 2026-05 |
| P2 abril y mayo | unknown | historical_margin / compare_months 2026-04, 2026-05 |
| P3 mejor del año | unknown | historical_margin / year_max (ene–ago) |
| P4 menor del año | unknown | historical_margin / year_min (ene–ago) |
| P5 mayo 2025 | n/a | single_month 2025-05 |
| P6 mayo 2026 Acapulco | n/a / client_profile risk | single_month 2026-05 + planta Acapulco |
| P7 mejor 2026 Acapulco | n/a | year_max + Acapulco |
| P8 menor 2026 Acapulco | n/a | year_min + Acapulco |
| P9 septiembre | n/a | open_current_month + FORECAST |
| P10 octubre | n/a / rollover 2025-10 risk | future + DATA_NOT_FOUND + no query |

## 20. Golden G1–G12 regressions

| ID | Resultado |
| --- | --- |
| G1 ¿Cómo vamos? | no es historical_margin |
| G2 ¿Cómo cerramos? | month_close_result |
| G3 ¿Cómo quedamos contra la meta? | month_close_result |
| G4 tendencia CASA 30 días | commercial_trend |
| G5 comisionistas | no es historical_margin (ruta existente) |
| G6 clientes nuevos agosto | historical_new_clients |
| G7 TORTILLERIA ERICK | client_profile |
| G8 kg + descuento por mes ERICK | client_profile |
| G9 ¿Y GRUPO MOVE? | no es historical_margin (leading-Y) |
| G10 ¿Y Arturo? | no es historical_margin |
| G11 descuento abril a mayo | delta_discount |
| G12 ¿Cómo va el margen de la planta? | financial_diagnosis |

Hold-outs C1–C5 cubiertos en detector.

## 21. Baseline tests

Antes del primer runtime edit:

`node --test test/director-ia-*.test.js` → **1411 pass / 0 fail**.

## 22. New tests

`test/director-ia-historical-margin.test.js` — 27 tests en bloques A–H:

- A detector/period (P1–P10, C1–C5, CDMX, setiembre/YYYY-MM)
- B source adapter (FINAL único, 0 versions, no FINAL, 2 FINAL, no plant, ambiguous, null/0/NaN/Infinity, throw, open, future no query)
- C calculation (delta raw, semantic mismatch)
- D builder (closed/open/missing copy)
- E planner/tool registry
- F askDirectorIa P1–P4 in-process
- G continuity (P1 vs trend inherit, ¿Y en mayo?, trend + ¿Y en mayo?)
- H golden G1–G12, auth, annual ranking/ties/0/negativo/SOURCE_PARTIAL, matcher, scan de helper/HTTP

## 23. Full suite

Después de implementar:

`node --test test/director-ia-historical-margin.test.js` → 27 pass / 0 fail.

`node --test test/director-ia-*.test.js` → **1438 pass / 0 fail**.

pass (1438) > baseline (1411).

`git diff --check` limpio.

## 24. Files changed

NEW:

- `lib/director-ia-historical-margin.js`
- `test/director-ia-historical-margin.test.js`
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001.md`

MODIFIED (autorizados):

- `lib/director-ia-planner.js` — intent `historical_margin` antes de new-clients / commercial_trend
- `lib/director-ia-chat.js` — handler in-process + `rawQuestion`
- `lib/director-ia-capabilities.js` — domain `historical_margin`
- `lib/director-ia-tools.js` — tool `get_historical_margin`
- `lib/director-ia-conversation-state.js` — inherit mínimo
- `docs/dev-loop/CURRENT_TASK.md` — AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW (G1 intacto)

MAYBE no tocado: `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` (contrato director-ia; no hay G2/G3 de docs).

## 25. Risks

- Matcher GT/GTM solo aplica si la equivalencia produce **una** fila; plantas homónimas reales quedan fail-closed (correcto, no silent pick).
- Open FORECAST usa la misma frontera de auth que ACTUAL_FINANCIAL (más restrictivo que un posible camino IGF annex).
- Márgenes negativos stored finitos participan en ranking (fidelidad FINANCE_PROVIDED; no hay prohibición contractual de anularlos).
- Follow-up «¿Y en mayo?» sin parent `historical_margin` no se convierte en esta capacidad.

## 26. OUT_OF_SCOPE

No merge a main. No deploy. No siguiente tarea. No `server.js`. No schema/migrations. No writes DB. No DICF. No IGF/ARR dashboard. No `getMargenKgPorPeriodo`. No financial-actual compartido. No commercial_trend formula. No OLS. No historical_new_clients behavior. No Action Register / Folios / Taller / voice / WhatsApp / Render. No hardcode de Acapulco/mayo/2026 en runtime.

## 27. Exact final state

```
HISTORICAL_MARGIN_IMPLEMENTED = YES
SINGLE_MONTH = YES
COMPARE_MONTHS = YES
YEAR_MAX = YES
YEAR_MIN = YES

P1_ROUTE_AFTER = historical_margin / single_month / closed
P2_ROUTE_AFTER = historical_margin / compare_months
P3_ROUTE_AFTER = historical_margin / year_max
P4_ROUTE_AFTER = historical_margin / year_min

P5_PERIOD = 2025-05
P6_PLANT = Acapulco
P7_OPERATION = year_max
P8_OPERATION = year_min
P9_TRUTH_CLASS = FORECAST
P10_BEHAVIOR = future DATA_NOT_FOUND no query

CLOSED_SOURCE = igf.versions + igf.compromiso_lines
CLOSED_FINAL_REQUIRED = YES
CLOSED_MARGIN_FIELD = margen_kg stored

OPEN_SOURCE = igf.versions latest + igf.compromiso_lines
OPEN_TRUTH_CLASS = FORECAST
OPEN_PRESENTED_AS_CLOSED = false
OPEN_LABEL = forecast / mes abierto; no cierre real

FUTURE_QUERY_EXECUTED = NO
FUTURE_BEHAVIOR = DATA_NOT_FOUND sin consultar; no rollover a año anterior

PLANT_MATCH = exact normalized + unique GT/GTM prefix
PLANT_MATCH_STRATEGY = exact normalized + unique GT/GTM prefix
PLANT_AMBIGUITY_FAIL_CLOSED = YES
FUZZY_PLANT_MATCH = NO

AUTH_PRESERVED = YES (canViewFinancialActual; open no más permisivo)

ZERO_MARGIN_VALID = YES
NULL_MARGIN_MISSING = YES

DATA_NOT_FOUND_DISTINCT = YES
SOURCE_ERROR_DISTINCT = YES
SOURCE_PARTIAL_SUPPORTED = YES

DELTA_FROM_RAW = YES
DELTA_DETERMINISTIC = YES
RANKING_FROM_RAW = YES
RANKING_DETERMINISTIC = YES
TIES_FROM_RAW = YES
TIES_DETERMINISTIC = YES
OPEN_EXCLUDED_FROM_RANKING = YES

LLM_USED_FOR_SINGLE_VALUE = NO
LLM_USED_FOR_VALUE = NO
LLM_USED_FOR_COMPARISON = NO
LLM_USED_FOR_RANKING = NO

CONTINUITY_MARGIN_FOLLOWUP = YES
COMMERCIAL_TREND_INHERITANCE_BUG_FIXED = YES

HOW_ARE_WE_REGRESSION = PASS
MONTH_CLOSE_REGRESSION = PASS
COMMERCIAL_TREND_REGRESSION = PASS
HISTORICAL_NEW_CLIENTS_REGRESSION = PASS
CLIENT_PROFILE_REGRESSION = PASS
COMPOUND_CLIENT_REGRESSION = PASS
LEADING_Y_REGRESSION = PASS
DELTA_DISCOUNT_REGRESSION = PASS
CURRENT_MARGIN_DIAGNOSIS_REGRESSION = PASS

BASELINE_TESTS = 1411 pass / 0 fail
FINAL_TESTS = 1438 pass / 0 fail
TESTS = 1438 pass / 0 fail
GIT_DIFF_CHECK = CLEAN

SERVER_CHANGED = NO
DB_SCHEMA_CHANGED = NO
DICF_CHANGED = NO
IGF_DASHBOARD_CHANGED = NO
FINANCIAL_ACTUAL_SHARED_CHANGED = NO
LEGACY_MARGIN_HELPER_CHANGED = NO

IMPLEMENTATION_AUTHORIZED = YES
MERGE_AUTHORIZED = NO
DEPLOY_AUTHORIZED = NO
```

## Human review — CHANGES_REQUIRED (veracity builder)

Revisión humana sobre el mismo `task_id`. No reabre arquitectura. No autoriza merge ni deploy.

**Causa:** `buildHistoricalMarginAnswer` delegaba `single_month` a `buildSingleAnswer(payload.evidence)` antes de respetar `SOURCE_ERROR`. `buildSingleAnswer` trataba todo `status !== valid` como ausencia → copy de `DATA_NOT_FOUND` («No hay un margen histórico FINAL defendible…») para `VERSION_AMBIGUOUS`, `PLANT_AMBIGUOUS` y `SOURCE_UNAVAILABLE`.

**Corrección (solo frontera payload → respuesta):**

1. `SOURCE_RESTRICTED` → mensaje de permiso.
2. `SOURCE_ERROR` → mensaje de imposibilidad de validar/consultar la fuente, diferenciado por `VERSION_AMBIGUOUS` / `PLANT_AMBIGUOUS` / `SOURCE_UNAVAILABLE`.
3. `DATA_NOT_FOUND` (incl. no FINAL) conserva «No hay un margen histórico FINAL defendible…».
4. `SOURCE_PARTIAL` conserva respuesta parcial; un periodo `error` en compare ya no se etiqueta como missing.
5. No se imprimen errores SQL ni secretos.

Self-review: 0 caminos `SOURCE_ERROR` → wording de `DATA_NOT_FOUND`.

Tests nuevos: respuesta final (no solo payload) para 2 FINAL, plant ambiguous, query throw, open source error, y no FINAL → DATA_NOT_FOUND.

Focal: 28 pass / 0 fail.
Suite: 1439 pass / 0 fail.
`git diff --check` limpio.

```
HUMAN_REVIEW_CHANGES_REQUIRED = YES
SOURCE_ERROR_ANSWER_DISTINCT = YES
DATA_NOT_FOUND_WORDING_PRESERVED_FOR_MISSING = YES
SOURCE_ERROR_NOT_PRESENTED_AS_MISSING = YES
VERSION_AMBIGUOUS_COPY = YES
PLANT_AMBIGUOUS_COPY = YES
SOURCE_UNAVAILABLE_COPY = YES
SQL_NOT_EXPOSED = YES
CONTEXT_META_VERACITY_SOURCE_ERROR = YES
LIMITATION_CODE_SOURCE_ERROR = YES
OPENAI_CALLED = false
ROUTING_UNCHANGED = YES
PERIOD_RESOLVER_UNCHANGED = YES
FINAL_SEMANTICS_UNCHANGED = YES
FORECAST_SEMANTICS_UNCHANGED = YES
AUTH_UNCHANGED = YES
PLANT_MATCHER_UNCHANGED = YES
RANKING_UNCHANGED = YES
DELTA_UNCHANGED = YES
CONTINUITY_UNCHANGED = YES
SHARED_FILES_UNCHANGED = YES
SERVER_CHANGED = NO
FOCAL_TESTS = 28 pass / 0 fail
FINAL_TESTS = 1439 pass / 0 fail
GIT_DIFF_CHECK = CLEAN
IMPLEMENTATION_AUTHORIZED = YES
MERGE_AUTHORIZED = NO
DEPLOY_AUTHORIZED = NO
```

## Human review — executive parent contamination

Última revisión humana sobre el mismo `task_id`. SOURCE_ERROR previa: APROBADA.

Evidencia de producción: turno 1 `¿Cómo vamos?` (CEL `executive_status` → `conversation_state.parent_intent = plant_diagnosis`) y turno 2 `¿Cuál fue el margen en abril?` llegó a hablar de margen pero arrastró MATERIALIDAD COMERCIAL de julio, clientes, DICF, Action Register, ARR, IGF, SOURCE_RESTRICTED y period mismatch.

Se agregó regresión E2E (`askDirectorIa` + echoed state físico + loader inyectado). El test pasó **sin cambio de runtime**: detector standalone `historical_margin`, `inherit = false`, handler in-process, `rawQuestion` del turno 2, respuesta Abril 2026 FINAL, sin rastros del pack ejecutivo.

```
HOW_ARE_WE_TO_MARGIN_REGRESSION = PASS
EXECUTIVE_PARENT_CONTAMINATION = BLOCKED
OPENAI_CALLED = false
RUNTIME_CHANGED = NO
FOCAL_TESTS = 29 pass / 0 fail
FINAL_TESTS = 1440 pass / 0 fail
GIT_DIFF_CHECK = CLEAN
IMPLEMENTATION_AUTHORIZED = YES
MERGE_AUTHORIZED = NO
DEPLOY_AUTHORIZED = NO
```
