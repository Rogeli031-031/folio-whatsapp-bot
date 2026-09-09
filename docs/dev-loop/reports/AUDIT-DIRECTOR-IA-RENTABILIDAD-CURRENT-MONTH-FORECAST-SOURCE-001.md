# AUDIT-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001"
outcome: "DONE"
mode: "READ_ONLY"
implementation: false
source_code_changed: false
test_code_changed: false
sql_changed: false
live_db: false
base_main_sha: "2b67affe4ac3d95639a7809ac839e28a9ecce16a"
head_sha_at_start: "b43c07634254fc30bbf94ed4f3ad8df7fd68120c"
branch: "audit/director-ia-rentabilidad-current-month-forecast-source-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "FIX-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. No implementación en esta tarea. El FIX propuesto no está autorizado. Decidir si S1–S3/S4 de mes abierto deben leer computeIgfForecastMiniPayload (universo B) en vez de igf.compromiso_lines stored (universo A). Confirmar que S5 sigue en IGF original y S6 en FINAL si existe."
```

## Hallazgo

Director IA y el dashboard IGF Forecast **no leen el mismo universo** para Acapulco / septiembre 2026.

| Universo | Qué es | Dónde vive | Qué usa hoy |
|---|---|---|---|
| A | IGF / compromiso original | `igf.versions` + `igf.compromiso_lines` stored | Director IA `igf_status` → `loadIgfCommitSnapshot` |
| B | Forecast vigente mes abierto (PROY + P&L mini) | Cálculo en memoria: `computeIgfForecastMiniPayload` + PROY Pronóstico | Dashboard mini-tabla (Ingreso / Operativos / Util / Resultado) |
| C | FINAL / cierre real histórico | `igf.versions.financial_state = FINAL` + month-close | No lo usa `igf_status`. Existe en `lib/igf-financial-final.js` / `lib/director-ia-month-close-result.js` |

Los números LIVE coinciden con esa separación:

- Director: `1506.4` / `3373573` / `955783` = fila stored de compromiso (A).
- Dashboard post-botón: `1466.01` / `2921806` / `360106` = fila mini (B).

FIRST_DIVERGENCE: `loadIgfCommitSnapshot` lee `compromiso_lines.venta_ton` / `util_oper_importe` / `resultado_final_importe` **sin overlay PROY y sin `computeIgfForecastMiniPayload`**. El dashboard pinta `mini.ventaTon` / `mini.utilOperImporte` / `mini.resultadoFinalImporte`.

## Tres universos

### A — IGF / compromiso original

- Tablas: `igf.versions` (`plant_code='GLOBAL'`, `year`, `month`, `version_number`) + `igf.compromiso_lines`.
- Selección de versión: `ORDER BY version_number DESC LIMIT 1`. **No** filtra `financial_state`. **No** usa `upload_day`.
- Persistido: sí. No se recalcula en el chat.
- Campos financieros stored (allowlist `IGF_COMPOSITION_CATALOG`): `venta_ton`, `margen_kg`, `com_desc_kg`, `util_oper_importe`, `resultado_final_importe`, etc. Roles `stored_importe` / `stored_subtotal` / `stored_total` — «no recalculado».
- `buildIgfForecastPayload` guarda copias `*_igf` (`util_oper_importe_igf`, `resultado_final_importe_igf`) **antes** de overlay folios/PROY.

### B — Forecast vigente recalculado (mes abierto)

- Venta visual: `proy_venta_ton` de `loadProyVentaDescByPlantForIgf` → `computePronosticoProyByPlant` (ARR diario + lookback + POR COMPRAR), overlay opcional `arr.pronostico_mini_snapshot`.
- **No** es `arr.forecast_mensual.kg_forecast`. El botón sí escribe esa tabla, pero la venta 1466.01 **no sale de ahí**.
- P&L visual: `computeIgfForecastMiniPayload` en `server.js`. Combina:
  - venta / Com. y Desc. = PROY (`bRes`, `proy_desc_kg`);
  - margen / impuestos / HG = fila IGF raw;
  - gasto/bancos/prov/corp/inversiones = raw IGF **escalados** `scale = bIgf / bRes`;
  - luego fórmulas de importe (abajo).
- Persistencia del P&L mini: **no**. Se calcula en el GET. Snapshot PROY sí puede persistirse en `arr.pronostico_mini_snapshot` (Excel / `POST /api/dashboard/pronostico-dias`), no por el botón ARR.
- Versión IGF de base: la misma v2 (latest). El recálculo **no crea** versión nueva; solo cambia la proyección.

### C — FINAL histórico

- `lib/igf-financial-final.js`: `FORECAST` / `FINAL` / `SUPERSEDED` en `igf.versions.financial_state`.
- Month-close: `loadFinancialActualEvidence` exige FINAL para `ACTUAL_FINANCIAL`.
- Mini mes cerrado (`isIgfMesCerradoPorCorte`): venta = `getVentaRealTonProvinciaByPlant`, no PROY.
- `igf_status` **no** consulta `financial_state`.

## Trace del botón

```
UI "Recalcular venta forecast (ARR)"
  frontend-dashboard/components/IgfForecastClient.tsx
  handleRecalcForecastProvincia
    → postForecastProvincia
      POST /api/arr/forecast-provincia
        forecastMensual.calcularForecastMensual(client, plant, year, month, null)
          DELETE+INSERT arr.forecast_mensual
    → fetchIgfForecast({ year, month, include_mini: true, upload_day? })
      GET /api/dashboard/igf-forecast?include_mini=1
        buildIgfForecastPayload
        computeIgfForecastMiniPayload
    → setIgfForecast + setIgfMini
    → fila Acapulco en tabla mini
```

El POST ARR **no** es la fuente de 1466.01 / 2921806 / 360106. El refresh GET + mini sí lo es.

## Trace de la tabla visual

La tabla que muestra Ingreso / Operativos / Corporativos / Gasto / Util. Operación / Resultado Final es el **mini-resumen**, no la tabla larga IGF.

- Fetch: `fetchIgfForecast` (`include_mini: true`) o fallback `fetchIgfForecastMini`.
- Endpoint: `GET /api/dashboard/igf-forecast` (`payload.mini`) o `GET /api/dashboard/igf-forecast-mini`.
- Source: `computeIgfForecastMiniPayload` (en memoria).
- La tabla larga (`igfForecast.rows`) **toma Venta y Com. y Desc. del mini** (`miniRow?.ventaTon ?? row.venta_ton`).

Nombres físicos Acapulco (mini):

| Visual | Campo | Origen |
|---|---|---|
| Venta 1466.01 | `ventaTon` | `proy.proy_venta_ton` (`bRes`) |
| Margen 7.12 | `margen` | raw `margen_kg` (C) |
| Com. y Desc. -0.16 | `comDesc` | `proy.proy_desc_kg` (D) |
| Impuestos 0.93 | `impuestos` | raw `impuesto_kg` (F) |
| HG -1.81 | `hgKg` | forecast-row `hg_kg` (H) |
| Ingreso 12,860,573 | `ingreso` | `Math.round((C+D-H)*bRes*1000)` |
| Operativos 9,938,767 | `operativos` | `Math.round((E+I+J+F)*bRes*1000)` |
| Corporativos 2,561,700 | `corporativos` | `Math.round((M+N+O+P)*bRes*1000)` |
| Gasto 12,500,467 | `gasto` | `operativos + corporativos` |
| Util. Operación 2,921,806 | `utilOperImporte` | `ingreso - operativos` |
| Resultado Final 360,106 | `resultadoFinalImporte` | `utilOperImporte - corporativos` |

Aritmética visual: `12860573 - 9938767 = 2921806`; `2921806 - 2561700 = 360106`; `9938767 + 2561700 = 12500467`. Coincide con el código. Eso **no** prueba la tabla larga (`recalcularUtilYResultado` es otra fórmula: util $/kg × ventaKg).

## Trace Director IA

```
¿Qué rentabilidad tenemos?
  isIgfStatusFinancialSnapshotQuestion → intent igf_status
  CEL no pisa (igf_status ∉ CEL_OVERRIDABLE)
  askDirectorIa handler igf_status
    loadIgfArrSourceBlocksForChat
      resolveYearMonthFromQuestion → 2026-09 (CDMX)
      loadIgfCommitSnapshot
        SELECT latest igf.versions GLOBAL
        SELECT * igf.compromiso_lines
        findIgfRowForPlant(Acapulco)
        extractIgfComposition (stored)
    buildIgfStatusSnapshotChatResult
      tool metadata: get_igf_snapshot
      source: igf.compromiso_lines
```

Valores Director:

- `venta_ton` stored → `formatIgfStatusTons` → `1506.4 t`
- `util_oper_importe` stored → `3373573`
- `resultado_final_importe` stored → `955783`

`loadIgfArrSourceBlocksForChat` **sí** carga anexo ARR (`observed_venta_ton` / `projected_venta_ton`) con cutoff, pero `buildIgfStatusSnapshotAnswer` **no lo usa**.

Tool catalog: `get_igf_snapshot.executor = loadIgfArrAnnexForChat` — también termina en `loadIgfCommitSnapshot`. No lee el mini.

## Venta — distinción física

| Semántica | Campo físico | Función |
|---|---|---|
| OBSERVED / TOTAL al corte | `venta_sheet.total_mes_sum` / `totalMesVenta` | días 1..(corte-1) si corte ∈ mes |
| TO_BUY / POR COMPRAR | `por_comprar_sum` / `por_comprar_dow` | PROM lookback × días restantes DOW |
| PROJECTED / PROY mes | `proy_venta_ton` / mini `ventaTon` | `total + por_comprar` por DOW, luego suma |
| COMMITMENT / meta IGF | `igf.compromiso_lines.venta_ton` | stored; Director y `bIgf` |

`OBSERVED + TO_BUY = PROJECTED`: **sí**, en `computePronosticoProyByPlant` / `buildVentaPronosticoSheetLike`:

```
proyVenta[i] = totalMesVenta[i] + porComprarVenta[i]
proyVentaTon = sum(proyVenta)
```

El anexo ARR de Director (`observed_venta_ton` + `projected_venta_ton`) **no** suma `to_buy` (test `doesNotMatch observed_venta_ton +`).

`PROJECTED_DIFFERS_FROM_COMMITMENT`: sí — 1466.01 ≠ 1506.4.

## Cutoff `07/09/2026`

- Label UI: «Fecha de carga (corte)». Estado: `uploadDay`.
- Default: `GET /api/arr/last-upload-day` → `arr.upload_log.uploaded_day` (`ORDER BY uploaded_at DESC LIMIT 1`) del mes. Hint: «Última carga detectada».
- Query: `upload_day` en GET IGF / mini / Pronóstico.
- Semántica Pronóstico (`getPronosticoCorteYmdStr`): si la fecha cae en el mes, **ese día está en curso y no entra al TOTAL**. `lastClosedDay = corteDay - 1`.
- También: mes abierto vs cerrado (`isIgfMesCerradoPorCorte`: corte > último día del mes).
- Checkbox «Versión ≤ corte» (`version_as_of_corte`): otra regla; **no** es el default. Default = latest `version_number`.
- Director `igf_status`: **no** aplica este corte a la fila IGF. ARR annex sí puede resolver cutoff; el answer builder lo ignora.

No es «fecha de versión» ni «último día con datos» por sí solo. Es el corte de carga ARR seleccionado (típicamente last upload).

## Versión `Sep 2026 · v2`

- Campo: `igf.versions.version_number`. UI: `{MES} {year} · v{version_number}`.
- Dashboard: `resolveIgfGlobalVersion` → latest, salvo `version_as_of_corte`.
- Director: misma SQL latest en `loadIgfCommitSnapshot`.
- Ambos usan v2 si v2 es la máxima del mes.
- Una versión puede tener **varios cortes** (`arr.pronostico_mini_snapshot` PK incluye `corte_day`).
- Recálculo ARR **no** altera `version_number`.

## Proyección financiera al cambiar venta

Al pasar venta 1506.4 → 1466.01 **en el mini**:

- `OPERATING_PROFIT_RECALCULATED_WITH_ARR`: YES — `computeIgfForecastMiniPayload` (`utilOperImporte`).
- `FINAL_RESULT_RECALCULATED_WITH_ARR`: YES — misma función (`resultadoFinalImporte`).

También se recalculan Ingreso, Operativos, Corporativos, Gasto. No se persisten en `compromiso_lines`.

La tabla larga usa `recalcularUtilYResultado` (otra fórmula). No es la tabla de los importes LIVE citados.

## Fórmulas

`FORMULA_OPERATING_PROFIT_PROVABLE`: YES — `server.js` `computeIgfForecastMiniPayload`:

`const utilOperImporte = ingreso - operativos;`

`FORMULA_FINAL_RESULT_PROVABLE`: YES:

`const resultadoFinalImporte = utilOperImporte - corporativos;`

Test `test/director-ia-mini-payload-export.test.js` ancla esas líneas.

No afirmar esas fórmulas sobre `compromiso_lines` stored (Director). Allí `formula_role = stored_importe`.

## Reutilización

Ya existe, inyectado en `configureDirectorIaChat`:

```
loadIgfForecastMiniPayload → buildIgfForecastPayload + computeIgfForecastMiniPayload
readIgfForecastMiniAuthoritative → venta_ton / util_oper_importe / resultado_final_importe del mini
```

Lo usan CEL, forecast pack, deterioro. **No** `igf_status`.

- `EXISTING_DIRECTOR_LOADER_CAN_READ_FORECAST`: YES
- `EXISTING_TOOL_CAN_READ_FORECAST`: NO (`get_igf_snapshot` → commit)
- `EXISTING_SOURCE_ALREADY_AVAILABLE_TO_DIRECTOR`: YES como dep; NO cableado a S1
- `CAN_FIX_WITHOUT_NEW_SQL`: YES
- `CAN_FIX_WITHOUT_NEW_TOOL`: YES
- `CAN_FIX_WITHOUT_SERVER_CHANGE`: YES — `server.js` ya exporta el loader; el cambio sería el handler `igf_status` en `lib/director-ia-chat.js`
- `CAN_FIX_WITHOUT_FRONTEND_CHANGE`: YES

## Regla temporal futura (solo evaluación)

- Mes abierto + «tenemos / cómo vamos / utilidad operativa / resultado final» → universo B: **físicamente posible** (loader existente).
- Mes cerrado + «cómo cerramos / tuvimos» → universo C FINAL: **físicamente posible** (`igf-financial-final` + month-close). `igf_status` hoy no lo selecciona. Sin FINAL: `DATA_NOT_FOUND` / `NOT_FINAL`, no sustituir por forecast.
- «presupuesto / compromiso / IGF original» → universo A: **ya es** `loadIgfCommitSnapshot`.

No se redefine FINAL. No se modifican contratos.

## S1–S6 (recomendación, no routing)

| ID | Pregunta | recommended_source | Periodo | Disponibilidad |
|---|---|---|---|---|
| S1 | ¿Qué rentabilidad tenemos? | B mini forecast vigente | mes abierto CDMX | loader sí; tool/igf_status no |
| S2 | ¿Qué utilidad operativa tenemos? | B `utilOperImporte` | mes abierto | igual |
| S3 | ¿Cuál es el resultado final? | B `resultadoFinalImporte` | mes abierto | igual |
| S4 | ¿Qué rentabilidad proyectamos para cerrar septiembre? | B | septiembre nombrado | igual |
| S5 | ¿Cuál era la rentabilidad presupuestada de septiembre? | A commit IGF | septiembre | `loadIgfCommitSnapshot` ya |
| S6 | ¿Cómo cerramos agosto? | C FINAL agosto | agosto cerrado | FINAL existe; `igf_status` no lo usa. Planner hoy manda S6 a `igf_status` (commit latest, no FINAL) |

Planner actual: S1–S6 → `igf_status` (tests 001-006). El gap es **fuente**, no intent.

## AUDIT_RESULT

```
AUDIT_RESULT:

DASHBOARD_RECALCULATE_BUTTON_FILE: frontend-dashboard/components/IgfForecastClient.tsx
DASHBOARD_RECALCULATE_HANDLER: handleRecalcForecastProvincia
DASHBOARD_RECALCULATE_ENDPOINT: POST /api/arr/forecast-provincia

DASHBOARD_TABLE_FETCH_FUNCTION: fetchIgfForecast (include_mini:true); fallback fetchIgfForecastMini
DASHBOARD_TABLE_ENDPOINT: GET /api/dashboard/igf-forecast?include_mini=1 (payload.mini); GET /api/dashboard/igf-forecast-mini
DASHBOARD_TABLE_SOURCE: computeIgfForecastMiniPayload (en memoria; no tabla persistida de P&L)

FORECAST_RECALC_FUNCTION: forecastMensual.calcularForecastMensual
FORECAST_RECALC_SOURCE: arr.ventas_diarias_cliente + arr.descuentos_diarios_cliente (ayer; ignora hoy)
FORECAST_RECALC_PERSISTS: YES
FORECAST_RECALC_PERSISTENCE_TARGET: arr.forecast_mensual
# Nota: esa persistencia NO es la fuente de ventaTon/util/resultado del mini.

FORECAST_CUTOFF_FIELD: upload_day (UI uploadDay; default arr.upload_log.uploaded_day)
FORECAST_CUTOFF_RULE: corte Pronóstico; si ∈ mes, el día de corte no entra al TOTAL (lastClosedDay = corte-1). Cierra el mes solo si corte > último día del mes.
FORECAST_VERSION_FIELD: igf.versions.version_number
FORECAST_VERSION_RULE: latest GLOBAL year/month salvo version_as_of_corte. Recalc ARR no cambia versión.

ACAPULCO_FORECAST_SALES_VALUE: 1466.01
ACAPULCO_FORECAST_SALES_FIELD: ventaTon
ACAPULCO_FORECAST_SALES_SOURCE: loadProyVentaDescByPlantForIgf → proy_venta_ton (computePronosticoProyByPlant y/o arr.pronostico_mini_snapshot)

ACAPULCO_OPERATING_PROFIT_VALUE: 2921806
ACAPULCO_OPERATING_PROFIT_FIELD: utilOperImporte
ACAPULCO_OPERATING_PROFIT_SOURCE: computeIgfForecastMiniPayload (ingreso - operativos)

ACAPULCO_FINAL_RESULT_VALUE: 360106
ACAPULCO_FINAL_RESULT_FIELD: resultadoFinalImporte
ACAPULCO_FINAL_RESULT_SOURCE: computeIgfForecastMiniPayload (utilOperImporte - corporativos)

ACAPULCO_INCOME_VALUE: 12860573 (ingreso)
ACAPULCO_OPERATING_EXPENSE_VALUE: 9938767 (operativos)
ACAPULCO_CORPORATE_EXPENSE_VALUE: 2561700 (corporativos)
ACAPULCO_TOTAL_EXPENSE_VALUE: 12500467 (gasto = operativos + corporativos)

CURRENT_DIRECTOR_TOOL: get_igf_snapshot (metadata); loader real loadIgfArrSourceBlocksForChat / loadIgfCommitSnapshot
CURRENT_DIRECTOR_SOURCE: igf.compromiso_lines (stored)
CURRENT_DIRECTOR_VERSION_RULE: latest version_number GLOBAL; no financial_state
CURRENT_DIRECTOR_CUTOFF_RULE: ninguno para IGF; ARR annex resuelve cutoff pero el answer no lo usa

CURRENT_DIRECTOR_SALES_VALUE: 1506.4 (venta_ton stored)
CURRENT_DIRECTOR_OPERATING_PROFIT_VALUE: 3373573 (util_oper_importe stored)
CURRENT_DIRECTOR_FINAL_RESULT_VALUE: 955783 (resultado_final_importe stored)

FIRST_DIVERGENCE: loadIgfCommitSnapshot lee stored compromiso; el dashboard mini usa PROY + computeIgfForecastMiniPayload. Misma v2; distinto universo (A vs B).

DIRECTOR_SOURCE_IS_BUDGET_OR_COMMIT: YES
DASHBOARD_SOURCE_IS_ARR_FORECAST: PARTIAL — venta es PROY Pronóstico (ARR diario/lookback), no arr.forecast_mensual; P&L es mini recalculado

OBSERVED_SALES_FIELD: venta_sheet.total_mes_sum / totalMesVenta
TO_BUY_FIELD: por_comprar_sum / por_comprar_dow
PROJECTED_SALES_FIELD: proy_venta_ton / mini.ventaTon
COMMITMENT_SALES_FIELD: igf.compromiso_lines.venta_ton

OBSERVED_PLUS_TO_BUY_EQUALS_PROJECTED: YES (computePronosticoProyByPlant; por DOW)
PROJECTED_DIFFERS_FROM_COMMITMENT: YES (1466.01 != 1506.4)

OPERATING_PROFIT_RECALCULATED_WITH_ARR: YES (mini; no persistido en compromiso_lines)
FINAL_RESULT_RECALCULATED_WITH_ARR: YES (mini)

FORMULA_OPERATING_PROFIT_PROVABLE: YES (mini: utilOperImporte = ingreso - operativos)
FORMULA_FINAL_RESULT_PROVABLE: YES (mini: resultadoFinalImporte = utilOperImporte - corporativos)

EXISTING_DIRECTOR_LOADER_CAN_READ_FORECAST: YES (loadIgfForecastMiniPayload + readIgfForecastMiniAuthoritative)
EXISTING_TOOL_CAN_READ_FORECAST: NO
EXISTING_SOURCE_ALREADY_AVAILABLE_TO_DIRECTOR: YES as chat dep; NO wired to igf_status

CAN_FIX_WITHOUT_NEW_SQL: YES
CAN_FIX_WITHOUT_NEW_TOOL: YES
CAN_FIX_WITHOUT_SERVER_CHANGE: YES (loader ya inyectado en server.js)
CAN_FIX_WITHOUT_FRONTEND_CHANGE: YES

OPEN_MONTH_FORECAST_RULE_PHYSICALLY_POSSIBLE: YES
CLOSED_MONTH_FINAL_RULE_PHYSICALLY_POSSIBLE: YES
ORIGINAL_IGF_RULE_PHYSICALLY_POSSIBLE: YES

S1_RECOMMENDED_SOURCE: B computeIgfForecastMiniPayload (mes abierto)
S2_RECOMMENDED_SOURCE: B utilOperImporte
S3_RECOMMENDED_SOURCE: B resultadoFinalImporte
S4_RECOMMENDED_SOURCE: B mini (proyección cierre)
S5_RECOMMENDED_SOURCE: A loadIgfCommitSnapshot (IGF original)
S6_RECOMMENDED_SOURCE: C FINAL agosto si existe; si no DATA_NOT_FOUND / NOT_FINAL (no commit latest ni mini abierto)

SOURCE_BUG: YES — igf_status responde A para «tenemos» de mes abierto
VERSION_BUG: NO
CUTOFF_BUG: YES — igf_status ignora upload_day en la fila IGF
TOOL_GAP: YES — get_igf_snapshot no lee el mini
ROUTING_BUG: NO — planner ya es igf_status; el fallo es la fuente del handler
PRESENTATION_BUG: NO
DATA_BUG: NO — ambos universos son internamente consistentes

FILES_INSPECTED:
AGENTS.md
docs/dev-loop/LOOP_PROTOCOL.md
docs/dev-loop/CURRENT_TASK.md
frontend-dashboard/components/IgfForecastClient.tsx
frontend-dashboard/lib/api.ts
server.js (buildIgfForecastPayload, computeIgfForecastMiniPayload, resolveIgfGlobalVersion, GET igf-forecast, POST forecast-provincia, last-upload-day, loadIgfForecastMiniPayload)
lib/forecast-mensual.js
lib/igf-effective-proy-target.js
lib/dashboard-arr-forecast.js
lib/director-ia-igf-arr.js
lib/director-ia-chat.js
lib/director-ia-planner.js
lib/director-ia-tools.js
lib/director-ia-dashboard-forecast-adapter.js
lib/director-ia-authoritative-forecast-run-pack.js
lib/igf-financial-final.js
lib/director-ia-month-close-result.js
lib/director-ia-conversational-executive-layer.js
test/director-ia-mini-payload-export.test.js

TESTS_RUN:
node --test test/director-ia-mini-payload-export.test.js test/director-ia-rentabilidad-executive-routing.test.js
51/51 PASS. No LIVE_DB. No Render.

RISKS:
Sin LIVE_DB no se relee la fila Acapulco 2026-09 v2; los valores LIVE se atribuyen por cadena de campos, no por query. Si el snapshot PROY (arr.pronostico_mini_snapshot) existe para 2026-09-07, overlaya el compute live. El botón ARR puede no cambiar 1466.01 si el PROY/snapshot ya estaba. No confundir util de la tabla larga (recalcularUtilYResultado) con el mini.

RECOMMENDED_NEXT_SLICE:
FIX-DIRECTOR-IA-RENTABILIDAD-CURRENT-MONTH-FORECAST-SOURCE-001 — no autorizado.
Para mes abierto + S1/S2/S3/S4: igf_status debe leer loadIgfForecastMiniPayload + readIgfForecastMiniAuthoritative (mismo mini que el dashboard) con el mismo upload_day que el UI.
Preservar A para S5 / «presupuesto|compromiso|IGF original».
Preservar C para S6 / «cerramos|tuvimos» si hay FINAL.
Sin SQL nuevo, sin tool nueva, sin frontend, sin redefinir FINAL.
```
