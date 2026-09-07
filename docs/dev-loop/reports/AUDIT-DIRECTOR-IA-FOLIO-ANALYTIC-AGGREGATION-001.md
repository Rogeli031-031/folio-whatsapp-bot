# AUDIT-DIRECTOR-IA-FOLIO-ANALYTIC-AGGREGATION-001

ROUTING_CLASSIFICATION:
A. MAGIC_WORD_GATE_NO_ANALYTIC_INTENT

ROUTING_FIRST_BAD_BOUNDARY:
`isFolioSearchQuestion`: `if (!/\b(apoyos?|folios?)\b/.test(q)) return false;`. El planner no tiene regla de agregación económica. `expense_analysis` / `investment_analysis` van antes y exigen `gastos`+`folio|categoria|listad` o `inversiones`+`hay|existen|que inversiones`. B/C/D/E/I/J → `unknown` (`no_rule_matched`). K → `client_profile` (`hasNamedClientToken` + periodo explícito; `MAYAN`/`PALACE` capitalizados). `invertimos` ≠ `inversiones`.

ANALYTIC_PARSE_CLASSIFICATION:
A. ANALYTIC_LANGUAGE_LEAKS_INTO_CONCEPT

ANALYTIC_FIRST_BAD_BOUNDARY:
`extractConceptSpan` + `STRUCTURAL_TOKENS`. No retiran frases analíticas/listado (`cuanto hemos gastado`, `suma los montos`, `acumulado por mes`, `cual es el total`, `dame`). Quedan en `concept_query`. `fieldHasQuerySequence` exige esa secuencia completa → 0 hits (North Star A). `de`/`por` residuales no son stopwords globales (correcto para `aceite de motor`).

MEASURE_CLASSIFICATION:
E. CANNOT_DEFEND_SPEND_FROM_CURRENT_SOURCE

MEASURE_SEMANTICS:
`public.folios.importe` + `estatus` son operativos, no contables. Contrato IGF (`DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`): cancelable operacional ≠ materializado contable ≠ ahorro realizado. Prohibido llamar «ya gastado» o «materializado contablemente» a `PAGADO`/`CERRADO`/`COMPROBACIONES`/`EVIDENCIAS`; etiqueta vigente: «ya no cancelable bajo reglas actuales». `PAGADO`/`CERRADO` = etapa visual Depósito y cierre; no dominio cheques. M6/M5/duplicados/IGF excluyen `CANCELADO`. folio_search vigente **no** lo excluye. Lo defendible: `SUM(importe)` del conjunto visible/scoped/matched **excl. CANCELADO**, wording «importe total de folios/apoyos encontrados». No «hemos gastado». No «pagado» salvo filtro explícito a `PAGADO` (sigue siendo operativo). No «materializado». No «gasto realizado».

AGGREGATION_SOURCE_CLASSIFICATION:
A. IN_MEMORY_FULL_SET_EXISTS_BUT_NO_AGGREGATE

AGGREGATION_FIRST_BAD_BOUNDARY:
`loadFolioSearchForChat`: `matched` → `deduped` → `projectRecord`; `count` = tamaño completo; `records` se recorta a `RECORD_LIMIT` 40. No hay `total`. No hay `group_by` `mes_cargo`. La lectura vigente (`queryReviewableSupportFolios` por cada mes del RANGE) ya trae el conjunto completo en memoria. M6 `derivedTotal(allRecords)` es el patrón de suma-antes-del-corte, pero es GASTOS xor INVERSIONES, SQL propio, tokens `YYYY-MM`, excluye TALLER; no es helper de folio_search.

EXISTING_ANALYTIC_HELPER_REUSABLE:
NO

SAFE_ROUTING_STRATEGY:
No relajar el gate `apoyos|folios` de forma abierta. Candidato futuro (otro slice): agregación económica (`cuánto gastamos` / `hemos gastado` / `llevamos` / `suma` / `total` / `acumulado`) + concepto operativo explícito, **después** de expense/investment/IGF/taller/client_profile, y solo si no hay `gastos operativos` / `gastos` KPI / `inversiones` M6 / cliente capitalizado sin `apoyos|folios`. I sin concepto: no folio. J: no secuestrar (campo IGF/ARR `operativos`). K: no secuestrar `client_profile`. N: sigue LIST. B no es YTD.

SAFE_ANALYTIC_PARSE_STRATEGY:
Antes del concepto, retirar frases cerradas de marco analítico/listado —no stopwords globales—: `cuanto hemos gastado`, `cuanto gastamos`, `cuanto llevamos acumulado`, `cuanto llevamos`, `cuanto suman`, `suma los montos`, `cual es el total`, `el total`, `acumulado por mes`, `por mes`, `dame los`, y un `suma`/`total` de marco. No hardcode de remodelacion/isuzu/llantas/mayan/bonos. No añadir `de`/`con`/`por`/`o` a `STRUCTURAL_TOKENS`. Preservar RANGE, ANY (` o ` espacial), morfología, scope, `gas != gasolina`.

SAFE_MEASURE_STRATEGY:
Medida por defecto = `ALL_MATCHED_FOLIO_AMOUNT` excl. `CANCELADO`, etiqueta «importe total de folios/apoyos encontrados». Authz idéntica a folio_search (planta, `solo_zp_ad`, scope). Nunca wording «gastado» / «pagado» / «materializado» / «gasto realizado». `PAGADO` no es el único estado válido del conjunto. Si el usuario pide «pagados», filtro `estatus=PAGADO` y wording «importe de folios en estatus PAGADO (operativo)».

SAFE_AGGREGATION_STRATEGY:
Reusar el conjunto interno de folio_search **antes** del slice 40. `analysis_mode=LIST|AGGREGATE`. LIST sigue cap 40. AGGREGATE calcula `SUM` sobre todos los matches. `group_by=MONTH` usa `mes_cargo` (no `creado_en`). «por mes» = subtotal mensual. «acumulado por mes» = subtotal + acumulado_hasta_mes + TOTAL PERIODO = último acumulado. Sin SQL nuevo.

MISSING_PERIOD_BEHAVIOR:
Aclarar. Fail-closed vigente: «Indica el mes (mes_cargo). No invento el periodo.» No existe contrato folio YTD. «llevamos acumulado» ≠ YTD.

MONTHLY_GROUPING_FIELD:
mes_cargo

MONTH_ZERO_FILL:
YES

CUMULATIVE_SEMANTICS:
«por mes» = subtotales. «acumulado por mes» = subtotal + running total por `mes_cargo` ordenado. «acumulado» + RANGE sin «por mes» = TOTAL PERIODO. Sin periodo = aclaración, no YTD.

CANCELLED_BEHAVIOR:
Excluir `CANCELADO` en AGGREGATE (M6/M5/IGF/duplicados). No hay evidencia para incluirlo en «importe encontrado» de una pregunta de gasto. LIST vigente no se reabre en este contrato.

RECORD_LIMIT_AFFECTS_AGGREGATE:
NO

SQL_CHANGE_REQUIRED:
NO

NORTH_STAR_A_EXPECTED:
intent `folio_search`; scope SUPPORT_FAMILIES; RANGE 2026-01..2026-08; concept SINGLE `remodelacion de taller`; `analysis_mode=AGGREGATE`; `aggregation=SUM`; `group_by=MONTH`; `cumulative=YES`; meses zero-fill; TOTAL = último acumulado; medida = importe total excl. CANCELADO (no «gastado»); suma sobre el conjunto completo, no los primeros 40.

NORTH_STAR_B_EXPECTED:
Hoy `unknown` (sin `apoyos|folios`). No YTD. Resultado correcto ahora: aclaración de intención/periodo. Si un slice futuro de routing lo admite: concept `mantenimiento de isuzu`; `aggregation=SUM`; period MISSING → fail-closed de periodo; no client_profile; no taller_mayor (exige taller+mayor); no IGF.

A-N MATRIX:

| Caso | Intent actual | Parse actual | Esperado a auditar |
|---|---|---|---|
| A | folio_search | RANGE SUPPORT; concept=`cuanto hemos gastado remodelacion de taller suma montos acumulado por` | AGGREGATE SUM MONTH cumulative; concept=`remodelacion de taller`; no «gastado» |
| B | unknown | concept=`cuanto llevamos acumulado mantenimiento de isuzu`; period null | aclaración; no YTD; no folio hasta slice de routing |
| C | unknown | RANGE; concept=`cuanto gastamos llantas` | no secuestrar sin gate; si routing futuro: SUM TOTAL RANGE concept=`llantas` |
| D | unknown | RANGE; concept=`cuanto gastamos llantas por` | si routing futuro: group_by MONTH (subtotales, no running salvo «acumulado») |
| E | unknown | RANGE; concept=`cuanto llevamos acumulado llantas` | si routing futuro: TOTAL PERIODO RANGE; no YTD |
| F | folio_search | concept=`suma de impresoras` | AGGREGATE SUM; concept=`impresoras` |
| G | folio_search | concept=`es total de de mayan palace` | AGGREGATE SUM; concept=`mayan palace` |
| H | folio_search | SINGLE 2026-07; concept=`cuanto gastamos de gas` | AGGREGATE SUM; concept=`gas`; gas≠gasolina |
| I | unknown | period 2026-09; concept=`cuanto gastamos` | NO folio analytics (sin concepto) |
| J | unknown | concept=`cuanto gastamos gastos operativos` | NO folio; no expense_analysis; no secuestrar IGF/`operativos` |
| K | client_profile | n/a folio | NO secuestrar; `invertimos`≠M6; MAYAN capitalizado = cliente |
| L | folio_search | concept=`cuanto suman de bonos` | AGGREGATE SUM SINGLE; concept=`bonos` |
| M | folio_search | ANY `["cuanto suman de bonos","bono"]` | AGGREGATE ANY `bonos`\|`bono` |
| N | folio_search | concept=`dame de bonos` | LIST (no AGGREGATE); concept=`bonos` |

ONE_FIX_CAN_HANDLE_ANALYTICS:
NO

FIX CONTRACT:
Un primer FIX solo sobre rutas que **ya** son `folio_search` (A, F, G, H, L, M, N): (1) retirar frases cerradas de marco analítico/listado antes del concepto; (2) `analysis_mode` LIST vs AGGREGATE por cues (`cuánto`/`suma`/`total`/`acumulado`/`gastamos` vs `dame`/`qué folios`); (3) SUM/group/cumulative en memoria sobre el conjunto completo excl. CANCELADO; wording «importe total…», nunca «gastado». No planner. No SQL. No RANGE. No morphology. No ANY. No scope. No YTD. No M6/IGF. Routing natural (B/C/D/E) y colisión K son otro G1.

FILES FUTUROS:
- `lib/director-ia-folio-search.js`
- `test/director-ia-folio-search-analytic-aggregation.test.js`
- no planner en el primer FIX
- no IGF SQL
- no M6 SQL
- no LIVE_DB

## Evidencia física

HEAD / base: `4eb775c3d73a30b6d09b7830c5b42a1990cf6b34`
rama: `audit/director-ia-folio-analytic-aggregation-001`
now: `2026-09-07T12:00:00-06:00`
LIVE_DB: no
Product code: no modificado

### Routing

Planner: `expense_analysis` (L503–510) → `investment_analysis` (L528–534) → `taller_mayor` → `taller_at` → `isFolioSearchQuestion` (L545). Sin cues `cuánto`/`gastado`/`acumulado`.
B: `isFolioSearchQuestion=false`; `unknown` + «No se pudo determinar una intención clara con las reglas actuales».
J: `gastos` solo no abre M6; `financial_diagnosis` ambiguo exige `como van` / `de la planta` / `kpi` / `rentabilidad`. `operativos` es campo IGF/ARR (`director-ia-profitability-subtopic.js`), no folio.
K: `isClientProfileQuestion` L699–700: periodo explícito + `hasNamedClientToken` (token medial `[A-Z…]` ≥3).
INV control: `que inversiones hay en agosto?` → `investment_analysis`. EXP control: `gastos de folios de 2026-09` → `expense_analysis`.

### Parse

A concept observado: `cuanto hemos gastado remodelacion de taller suma montos acumulado por`.
M ANY contaminado: `["cuanto suman de bonos","bono"]`.
GAS_FOLIO control: concept=`gas` (secuencia vigente intacta).

### Medida / estados

`ESTADOS` M2: GENERADO … PAGADO, CERRADO, COMPROBACIONES, EVIDENCIAS, CANCELACION_SOLICITADA, CANCELADO.
IGF `classifyCancellationEligibility`: CANCELADO excluded; PAGADO/CERRADO/COMPROBACIONES/EVIDENCIAS not_cancellable; resto reviewable.
`queryReviewableSupportFolios`: SELECT sin filtro de estatus (incluye CANCELADO).
M6: `estatus <> CANCELADO` + `derivedTotal(allRecords)` + wording «Total»; «No afirmo desviación, causa ni comparación.»
Presupuesto: «Seleccionado ≠ pagado».

### Agregación

`RECORD_LIMIT=40`. `truncated` + `count` completo ya existen. No `total`. Periodo folio_search = `mes_cargo`. Sin mes → `period_code=missing_period`. Cap 12 / fail-closed parcial / ANY / morph / scope: no reabrir.

```yaml
task_id: "AUDIT-DIRECTOR-IA-FOLIO-ANALYTIC-AGGREGATION-001"
outcome: "DONE"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
sql_new: false
range_reopened: false
morphology_reopened: false
any_reopened: false
scope_contract_changed: false
next_task_proposed: "FIX-DIRECTOR-IA-FOLIO-SEARCH-ANALYTIC-PARSE-AGGREGATE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md
  - lib/director-ia-folio-search.js
  - lib/director-ia-planner.js
  - lib/director-ia-m6-gastos-inversiones.js
  - lib/director-ia-igf-reviewable-supports.js
  - lib/director-ia-m2-folio-status.js
  - lib/director-ia-client-profile.js
  - lib/director-ia-profitability-subtopic.js
  - lib/director-ia-chat.js
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No implementación. No SQL. No merge. No deploy. No next task."
```
