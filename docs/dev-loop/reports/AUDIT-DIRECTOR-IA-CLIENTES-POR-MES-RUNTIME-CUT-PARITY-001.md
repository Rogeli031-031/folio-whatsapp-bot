# AUDIT-DIRECTOR-IA-CLIENTES-POR-MES-RUNTIME-CUT-PARITY-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-CLIENTES-POR-MES-RUNTIME-CUT-PARITY-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT"
implementation: false
docs_director_ia_changed: false
live_db: false
live_db_authorized: false
selects_executed: 0
writes_executed: 0
ddl_executed: 0
product_changed: false
tests_changed: false
contracts_changed: false
first_bad_boundary: "TARGET_VERSION_SELECTION"
secondary_boundaries:
  - "EXPORT_REACT_STATE"
  - "INPUT_DATASET"
next_task_proposed: "FIX-DIRECTOR-IA-CLIENTES-POR-MES-TARGET-PROY-PARITY-001"
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
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
  - "Los importes LIVE exactos de kg/target/PROY vs compromiso requieren sonda JS read-only (no ejecutada). No se consultó producción."
```

## 0. Executive summary

Ambas rutas ya usan `computeClientesDescuentoMes` + `lib/ingreso-cliente-marginal.js`. No hay que reescribir la fórmula.

Exportar Excel no reconsulta el dataset de clientes: serializa el workspace React (`wsBase`/`wsPlan`) ya transformado. Puede incorporar simulaciones locales. Director IA no las ve.

La divergencia LIVE no es esa simulación como causa primaria. Los tres MATCH tienen ingreso septiembre $0. Los DIFF tienen volumen en B. La razón `Δ_excel − Δ_ia` / ingreso B Excel es ~2.23% en PUBLICO y PALMA. Eso es escala de ingreso B (kg B o unit B), no rounding.

La primera frontera física es el `targetKg` / `venta_ton` del mes abierto:

- Clientes por mes / Excel: `mini.ventaTon ?? forecastRow.venta_ton`, y en mes abierto el payload IGF **sobrescribe** `venta_ton` con PROY (`loadProyVentaDescByPlantForIgf`, corte `upload_day` / last-upload).
- Director IA: `defaultLoadIgfPlantMetrics` lee `igf.compromiso_lines.venta_ton` crudo de `igf.versions` GLOBAL `ORDER BY version_number DESC LIMIT 1`. No aplica PROY. No usa `upload_day`. `server.js` no inyecta `loadIgfPlantMetrics`.

Misma regla de `version_number` “latest”. Distinta expresión de `venta_ton`. Eso cambia `targetKgOverride` → factor → `kgProy` → ingreso B solo si kg B > 0.

GRUPO MOVE no se excluye. Si su ingreso B escala igual, su delta deja de ser más negativo que ASOCIACION (−96,983) y cae del Top 5. El delta IA de MOVE es `NOT_PROVEN_WITHOUT_LIVE_DB`.

R-DELTA-PARITY-001..010 están verdes porque mockean el mismo `targetKg`. No comparan PROY vs compromiso ni React state.

## 1. Export Excel physical chain

```
IGF Forecast ARR (/arr?empresa=Acapulco)
  → ArrClient.ensureMonthLoaded
       fetchArrLastUploadDay(year, month)            # arr.upload_log ORDER BY uploaded_at DESC LIMIT 1
       fetchIgfForecast({ year, month, include_mini: true, upload_day? })
  → ArrClient.ensureClientesLoaded
       targetKg = targetKgDesdeIgfTon(data, empresa, hist)
                = targetKgDesdeIgfVentaTon(computeRowValues.ventaTon)
                ventaTon = miniRow?.ventaTon ?? forecastRow?.venta_ton
       GET /api/dashboard/arr-clientes-mes?year&month&empresa&target_kg
  → server.js arr-clientes-mes
       historico = reloj calendario (year/month < now)
       computeClientesDescuentoMes(..., { historico, targetKgOverride })
  → React: clientesByKey[empresa|periodo|tg:rounded]
  → filasClientesMesPrimero / filasClientesSoloMesSegundo
       clienteVenta + ingresoClienteMarginal(kg, desc, metA/metB)
  → handleExportExcel
       buildExportOptsFromSlice(wsBase)  → hoja ARR
       buildExportOptsFromSlice(wsPlan)  → hoja ARR Plan
       (+ META/DICF/evidencias: otras peticiones; no son la tabla de ingreso)
  → downloadArrDashboardExcelDual → downloadArrDashboardExcelInternal
  → arr-export-excel.ts escribe venta/desc numéricos y
       ingreso = ROUND(kg*(margen-|desc|) + (HG%*kg*HG$)/100, 0)
```

**¿Qué objeto usa Exportar Excel para construir las columnas de clientes?**

| Pregunta | Respuesta |
|---|---|
| A) respuesta backend original | No. No se serializa el JSON crudo de `/arr-clientes-mes`. |
| B) dataset transformado en frontend | Sí. `clienteVenta`, identity `trim`, `ingresoClienteMarginal`, métricas de `computeRowValues`. |
| C) React state | Sí. `wsBase` / `wsPlan` (`dataByKey`, `clientesByKey`, sims). |
| D) simulaciones/overrides locales | Sí, si el mapa no está vacío. `ventaBMesBConSimMap`, `clientesDescForecastSim` pisan `ventaB`/`descB`. Las fórmulas de Excel recalculan ingreso. |
| E) nueva petición backend de clientes | No. META/DICF/evidencias sí; la tabla Delta Ingreso no. |

Archivo + función + objeto + campos:

- `frontend-dashboard/app/arr/ArrClient.tsx` → `handleExportExcel` → `buildExportOptsFromSlice(slice)`
- Objeto: `ArrExportOptions.filasClientesMesPrimero` / `filasClientesSoloMesSegundo`
- Campos que entran a Excel: `cliente`, `ventaA`, `ventaB` (posible sim), `descA`, `descB` (posible sim)
- Ingreso/delta **no** se copian como número precomputado: `frontend-dashboard/lib/arr-export-excel.ts` los recalcula con fórmula sobre esas celdas y sobre `$C$` margen / `$H$` HG display / `$I$` HG dinero del resumen (`mA`/`mB` = `resumenMesMetrics(computeRowValues(...))`, y `mB` de export puede llevar overlays de sim/plan).

Respuesta inequívoca: **B + C**, y **D si hay sim**. No A. No E para el delta de clientes.

## 2. Director IA physical chain

```
pregunta «5 clientes … impacto negativo … septiembre»
  → planner → loadDeltaIngresoForecastNegativeTopN
  → resolveCalendarCompareMonths(question, now)     # A=ago 2026, B=sep 2026
  → now = chatDeps.now || new Date()                # server.js no inyecta now
  → computeDeltaIngresoClientesPorMes
       loadMetrics = chatDeps.loadIgfPlantMetrics
                     || defaultLoadIgfPlantMetrics
                     # configureDirectorIaChat NO inyecta loadIgfPlantMetrics
       defaultLoadIgfPlantMetrics:
         SELECT id, version_number, financial_state
           FROM igf.versions
          WHERE plant_code='GLOBAL' AND year=$1 AND month=$2
          ORDER BY version_number DESC LIMIT 1
         SELECT empresa, venta_ton, margen_kg, hg_pct, hg_kg, com_desc_kg
           FROM igf.compromiso_lines WHERE version_id=$1
         targetKg = targetKgDesdeIgfVentaTon(venta_ton crudo)
       packA = computeClientesDescuentoMes(..., { historico: mesHistorico(A, now) })
       packB = computeClientesDescuentoMes(..., {
                  historico: mesHistorico(B, now),
                  targetKgOverride: !histB && targetKgB
                })
       kgB = histB ? kg : kgProy
       ingreso* = ingresoClienteMarginal(...) ; null → 0
  → rows_all → filter deltaIngreso < 0 → sort asc → Top N → comments
```

Inputs que IA entrega a `computeClientesDescuentoMes` para septiembre abierto:

- `historico: false` (reloj; 2026-09-05)
- `targetKgOverride` = `compromiso_lines.venta_ton × 1000` (redondeo a 0.01)
- sin `upload_day`
- sin overlay PROY/mini

## 3. Boundary comparison matrix

| BOUNDARY | EXPORT / DASHBOARD | DIRECTOR IA | SAME / DIFFERENT / UNKNOWN | EVIDENCE |
|---|---|---|---|---|
| plant | `empresa` → mejor `provincia_plants` | `planta.nombre` / `getPlantCodeArrFromPlantaNombre` | SAME (Acapulco) | ambas resuelven provincia |
| period A / B | selectores `selA`/`selB` (humano: 2026-08 vs 2026-09) | `resolveCalendarCompareMonths` | SAME en este caso | evidencia humana + código |
| request timestamp | `new Date()` en `arr-clientes-mes` y `mesHistorico` UI | `chatDeps.now \|\| new Date()` | SAME semántica; instante UNKNOWN | no hay log del par de requests |
| kg A dataset | CDM `kg` mes cerrado | CDM `kg` mes cerrado | SAME loader | `dashboard-arr-forecast.js` |
| kg B MTD | CDM `kg` 2026-09-01..30 (datos existentes) | igual | SAME loader; cut implícito = filas en DB | SQL no usa `fechaHastaNote` |
| targetKg | PROY/mini `ventaTon` × 1000 | compromiso `venta_ton` × 1000 | **DIFFERENT** | `computeRowValues` vs `defaultLoadIgfPlantMetrics` |
| sum MTD | Σ kg real planta en CDM | igual si mismo request-time | SAME fórmula; valor UNKNOWN | LIVE no leído |
| factor | `targetKg / sumReal` | igual fórmula, otro target | **DIFFERENT** si target ≠ | CDM L1714–1721 |
| discount A/B persistido | `descKg = \|monto\|/kg` CDM | igual | SAME loader | H4 |
| discount B export | puede ser `clientesDescForecastSim` | nunca | **DIFFERENT si sim ≠ {}** | H5 |
| HG A/B | `forecastRow.hg_pct/hg_kg` de payload IGF (compromiso; no overlay) | `metricsFromIgfLine` sobre compromiso latest | SAME expresión si misma version | H6 |
| margin A/B | `forecastRow.margen_kg` | `compromiso_lines.margen_kg` | SAME expresión si misma version | H7 |
| version_id / version_number | `resolveIgfGlobalVersion` latest; ArrClient **no** manda `version_as_of_corte` | latest `version_number DESC` | SAME regla | `server.js` 11531–11536 vs `delta-ingreso-clientes-por-mes.js` 67–72 |
| financial_state | no filtra FINAL | no filtra FINAL | SAME | ambos toman latest |
| upload_day | sí, para IGF/PROY (`resolveUploadDayForMonth`) | no en el loader de target | **DIFFERENT** | H3 |
| client identity | `cliente.trim()` | `UPPER(trim collapse spaces)` | SAME para estos nombres | H8 |
| null handling | `ingreso null → 0` en delta UI | `moneyOrZero` | SAME | H9 |
| rounding | Excel `ROUND(...,0)` = `Math.round` del helper | `Math.round(raw)` | SAME; no explica $11,201 ni $439 | H10 |
| cache/state | `dataByKey`, `clientesByKey` keyed by tg; Plan localStorage | compute fresco | **DIFFERENT capability** | H11 |
| input rowset CDM | mismas queries | mismas queries | SAME shape; kgProy DIFFERENT por target | H12 |
| output ranking | Excel humano ordena delta | `delta < 0` sort asc Top N | SAME criterio; distinto valor MOVE | §7 |

## 4. PUBLICO deep trace

Evidencia humana (referencia, no producto):

| | Excel | IA | |
|---|---|---|---|
| Ingreso A | 724,462 | NOT_PROVEN_WITHOUT_LIVE_DB | MATCH de clientes B=0 implica que métricas A + helper A coinciden en esos casos |
| Ingreso B | 502,898 | si A igual: 724,462 − 210,363 = 514,099 | |
| Delta | −221,564 | −210,363 | DIFF 11,201 |

| Variable | ¿Puede divergir por código? | Valor LIVE |
|---|---|---|
| kg A | no (CDM real, mes cerrado) | NOT_PROVEN_WITHOUT_LIVE_DB |
| kg B MTD | solo si request-time distinto | NOT_PROVEN_WITHOUT_LIVE_DB |
| targetKg | **sí — PROY vs compromiso** | NOT_PROVEN_WITHOUT_LIVE_DB |
| sum MTD | misma fórmula | NOT_PROVEN_WITHOUT_LIVE_DB |
| factor | sí, via targetKg | NOT_PROVEN_WITHOUT_LIVE_DB |
| kg B proyectado | **sí — primera variable que cambia el ingreso B** | NOT_PROVEN_WITHOUT_LIVE_DB |
| discount A/B persistido | no (mismo CDM) | NOT_PROVEN_WITHOUT_LIVE_DB |
| discount B React | sí, solo export | NOT_PROVEN que existiera |
| margin A/B | no si misma version | NOT_PROVEN_WITHOUT_LIVE_DB |
| HG A/B | no si misma version; helper exige HG o ingreso=null→0 | NOT_PROVEN_WITHOUT_LIVE_DB |
| income A | producto de kgA/desc/margen/HG | Excel 724,462; IA no publicado |
| income B | producto de kgB/desc/margen/HG | primera diferencia observable |

11,201 / 502,898 ≈ 0.02227. Si A es el mismo, B_IA / B_Excel ≈ 1.0223. Eso es escala de B, no un descuento puntual ni un `Math.round`.

Primera variable que **puede** explicar PUBLICO: **kg B proyectado vía `targetKg` distinto**. Valores exactos: `NOT_PROVEN_WITHOUT_LIVE_DB`.

## 5. PALMA deep trace

| | Excel | IA |
|---|---|---|
| Ingreso A | 122,325 | NOT_PROVEN_WITHOUT_LIVE_DB |
| Ingreso B | 19,686 | si A igual: 122,325 − 102,200 = 20,125 |
| Delta | −102,639 | −102,200 |
| DIFF | 439 | |

439 / 19,686 ≈ 0.02230. Misma razón que PUBLICO.

H10 REJECTED: `Math.round` / Excel `ROUND` de un ingreso cambia ≤ $0.50. `kgProy` redondea a 0.01 kg. $439 ≈ 60 kg × ~$7/kg: es kg (o unit) real, no ruido de precisión.

Misma frontera: **kg B / targetKg**. No rounding.

## 6. MOVE deep trace

Excel: −99,074 (A 738,246 / B 639,172) → #5.

IA Top 5: ASOCIACION −96,983. MOVE no aparece.

Cadena IA:

```
row CDM → ingresoClienteMarginal → deltaIngreso
  → filter delta < 0
  → sort asc
  → slice(0, 5)
```

No hay filtro por nombre, canal, ni “solo B=0”. Identity `normCliente` no elimina «GRUPO MOVE EMPRESARIAL».

Disposición:

| Opción | |
|---|---|
| A) IA calcula otro Delta | **PROVEN como única explicación compatible con el ranking** |
| B) IA excluye MOVE antes de ranking | REJECTED (no hay exclusión) |
| C) identity/grouping falla | REJECTED para este nombre |
| D) dataset sin la fila | NOT_PROVEN_WITHOUT_LIVE_DB; el loader no la omite |
| E) cut/version otro ingreso | **PROVEN en código** (mismo H2: target B) |
| F) filter/null lo elimina | REJECTED salvo delta ≥ 0 |

Predicción **no LIVE** (solo consistencia del 2.23%):  
B_IA ≈ 639,172 × 1.0223 ≈ 653,400 → Δ ≈ −84,846 > −96,983 → #6. Encaja. Valor exacto: `NOT_PROVEN_WITHOUT_LIVE_DB`.

El ranking IA no está “mal”: ordena el delta que recibió. El valor que llega es otro.

## 7. Negative universe analysis

IA: `list_total_negative = rows.filter(deltaIngreso < 0).length` = 297 (evidencia humana). Universo = unión de keys A∪B tras `normCliente`. `null` ingreso → 0. Ceros no entran. Positivos no entran.

Excel: no hay workbook en el repo. **No se inventa** el conteo Excel.

| Métrica | Excel | IA |
|---|---|---|
| total filas | NOT_PROVEN (sin artifact) | NOT_PROVEN_WITHOUT_LIVE_DB (`rows_all.length`) |
| delta < 0 | NOT_PROVEN | 297 (declarado LIVE) |
| delta = 0 | NOT_PROVEN | NOT_PROVEN_WITHOUT_LIVE_DB |
| delta > 0 | NOT_PROVEN | NOT_PROVEN_WITHOUT_LIVE_DB |
| null/blank | fórmulas Excel evitan blank (IFERROR→0) | moneyOrZero |
| solo en A | filas con ventaB null/0 | key solo en mapA, kgB=0 |
| solo en B | `filasClientesSoloMesSegundo` | key solo en mapB |

Criterio `delta < 0`: el mismo en ambas. El conteo puede diferir si el rowset o los deltas B divergen (H2).

## 8. React / export analysis

1. Editar descuento B escribe `clientesDescForecastSim[cliente]` en el slice (`wsBase` o `wsPlan`).
2. Sí altera ingreso/delta **visible** (`ingresoBMesBConSim` / `descBConSim`).
3. Export **usa ese state**: `buildExportOptsFromSlice` pisa `descB`/`ventaB`; Excel recalcula ingreso.
4. Persistencia: **solo ARR Plan** (`localStorage` `planPersistKey`). `wsBase` (hoja ARR) es sesión; se resetea con token/`upload_day`.
5. Director IA **no** lee React ni localStorage.
6. El Excel observado **pudo** contener sims. No está demostrado. Un sim por cliente no produce la misma razón ~2.23% en PUBLICO y PALMA. `EXPORT_REACT_STATE` es frontera real de capacidad, no la causa primaria LIVE.

Paridad exacta contra “cualquier estado local del browser” es imposible sin un contrato extra. No se diseña aquí.

## 9. Target / version analysis

No se acepta “ambos usan latest” como equivalencia.

| Campo | Export / Clientes por mes | Director IA |
|---|---|---|
| year/month | selectores UI | meses de la pregunta + `now` |
| plant | empresa ARR | planta chat |
| version select | `WHERE plant_code='GLOBAL' AND year AND month ORDER BY version_number DESC LIMIT 1` | **la misma** |
| `version_as_of_corte` | ArrClient no lo envía | no existe en el loader |
| `financial_state` | no filtra | no filtra |
| `upload_day` | last-upload o query; entra a PROY | **ausente** |
| `venta_ton` efectiva | mes abierto: **PROY** (`loadProyVentaDescByPlantForIgf` / mini `ventaTon` = `bRes`). Mes cerrado: venta real. | **siempre** `compromiso_lines.venta_ton` almacenado |
| `targetKg` | `Math.round(ventaTon_efectiva * 1000 * 100) / 100` si mes no histórico | igual fórmula sobre `venta_ton` crudo |

`buildIgfForecastPayload` (comentario en `server.js`): *«Mes abierto: Venta y Com. y Desc. = PROY del Pronóstico»*.

IA nunca pasa por esa overlay para el target.

## 10. Discount analysis

Persistido: `SUM(arr.descuentos_diarios_cliente.monto)` / `SUM(kg)` en el mismo CDM. Misma fuente.

`com_desc_kg` IGF no es el descuento por cliente.

React sim es otra fuente, solo export (sección 8).

H4 REJECTED como causa independiente de PUBLICO/PALMA/MOVE.

## 11. Margin / HG analysis

UI: `margenKg` / `hgPct` / `hgKg` del `forecastRow` (compromiso de la version latest). `resumenMesMetrics`: `hgDisplay = hgPct*100`, `hgDinero = |hgKg/hgPct|`.

IA: `metricsFromIgfLine` = la misma aritmética sobre `compromiso_lines`.

El helper **exige** HG; si falta, ingreso = null → 0. Si IA omitiera HG, PUBLICO sería −724,462, no −210,363. REJECTED.

Una version distinta podría cambiar margen/HG B. ArrClient no usa `version_as_of_corte`. Clientes B=0 MATCH en ingreso A ⇒ margen/HG A no divergen en esos casos.

## 12. Identity / null analysis

CDM agrupa `cliente_norm`. UI key = `trim`. IA key = `UPPER` + espacios colapsados. Los seis nombres humanos coinciden.

`kg <= 0` → ingreso null → 0. Explica MATCH de SERVICIOS, 20 CUMBRES, ASOCIACION (B=0) y por qué el target no los mueve.

H8 REJECTED. H9 no explica 11,201 / 439 / MOVE.

## 13. Cache / request-time analysis

UI: cache IGF por `YYYY-MM`; clientes por `empresa|periodo|tg:rounded`. CDM MTD = mes calendario completo; el corte real es “qué filas hay en `arr.ventas_diarias_cliente`”. `fechaHastaNote` no recorta el SUM.

IA: sin memo del helper. `now` fresco.

Dos requests minutos después **pueden** cambiar MTD. Si el target es el mismo y el mix es proporcional, `kgProy` no cambia (`kg_i/sum * target`). Un target distinto sí cambia todos los B>0 a la vez. H1 no es necesario para explicar el patrón. H11 no es la primera frontera.

## 14. H1–H12

| ID | Disposición | Nota |
|---|---|---|
| H1 Request-time cut | NOT_PROVEN | Posible; el patrón uniforme de B no lo requiere. |
| H2 Target/version IGF | **PROVEN** | Misma latest version; distinta `venta_ton` (PROY vs compromiso). |
| H3 upload_day / version cut | **PROVEN** | UI usa upload_day para PROY; IA target no. Version_as_of_corte no está en ArrClient. |
| H4 Descuento persisted | REJECTED | Mismo CDM. |
| H5 React simulation | **PROVEN** (mecanismo) | Export serializa React/sims. **NOT_PROVEN** que este Excel tuviera sims. No es FIRST_BAD_BOUNDARY. |
| H6 HG | REJECTED | Misma fuente compromiso; omitir HG no reproduce −210,363. |
| H7 Margin | REJECTED | Misma fuente si misma version. |
| H8 Identity | REJECTED | |
| H9 Null/blank | NOT_PROVEN | No explica DIFF ni el Top 5. Conteo Excel ausente. |
| H10 Rounding | **REJECTED** | $11,201 y $439 no caben en ROUND a entero. |
| H11 Cache | NOT_PROVEN | Cache UI existe; no sustituye H2. |
| H12 Different dataset before helper | **PROVEN** | Mismo shape CDM; `targetKgOverride` distinto ⇒ `kgProy` distinto. |

## 15. FIRST_BAD_BOUNDARY

**TARGET_VERSION_SELECTION**

Campo físico: `targetKg` / `venta_ton` del mes B abierto.

- Export: PROY (`mini.ventaTon` / `forecastRow.venta_ton` ya overlay).
- IA: `igf.compromiso_lines.venta_ton` de latest GLOBAL.

No es “runtime mismatch”. No es “different data”.

`EXPORT_REACT_STATE` es frontera secundaria (capacidad). `INPUT_DATASET` es el síntoma (kgProy) de ese target.

## 16. Root cause

Director IA, tras el FIX de fórmula, sigue resolviendo el objetivo de kg del mes abierto desde el **compromiso almacenado**. Clientes por mes / Excel resuelven ese objetivo desde el **PROY IGF** (mini / overlay de `buildIgfForecastPayload`), opcionalmente cortado por `upload_day`.

Eso escala `kgProy` de todos los clientes con MTD > 0. Los de kg B = 0 quedan idénticos. PUBLICO y PALMA divergen en proporción a su ingreso B. MOVE puede bajar del Top 5 sin que el sort esté roto.

No se recomienda otra reimplementación de `ingresoClienteMarginal` ni del ranking.

## 17. R-DELTA-PARITY limitation

Fixture: `test/fixtures/delta-ingreso-clientes-por-mes-parity.js`.  
Harness: `deltaParityDeps()` inyecta **el mismo** `targetKg: TARGET_KG_B` y un CDM mock con `kgProy` ya fijado.

Por eso 001..010 detectan la frontera anterior (OLS vs factor planta + HG) y siguen verdes.

No cubren:

- PROY vs `compromiso_lines.venta_ton`
- `upload_day` / last-upload
- loaders reales de ventas/desc
- React `clientesDescForecastSim` / export
- request-time MTD
- universo 297 vs Excel
- clientes LIVE

R-DELTA-PARITY-009 dice “misma venta objetivo IGF latest” y compara contra el `venta_ton` del fixture, no contra PROY.

## 18. R-DELTA-CUT-001..010 proposed

No implementados. Nombres sintéticos. Un solo snapshot inyectado a **ambas** rutas (CDM real o fake compartido + **dos** resolutores de `venta_ton`: PROY vs compromiso).

| ID | Qué debe fallar hoy / proteger mañana |
|---|---|
| R-DELTA-CUT-001 | Mismo rowset CDM (kg, descKg, cliente) en ambas rutas. |
| R-DELTA-CUT-002 | `targetKg` IA = `targetKgDesdeIgfVentaTon(ventaTon_PROY)`, no `venta_ton` crudo si el dashboard usa PROY. |
| R-DELTA-CUT-003 | descKg persistido idéntico; sim React ausente en IA. |
| R-DELTA-CUT-004 | margen/HG de la misma version; no otra. |
| R-DELTA-CUT-005 | mismo `rows.length` y mismas keys. |
| R-DELTA-CUT-006 | kg=0 → ingreso 0; null no inventa. |
| R-DELTA-CUT-007 | cliente sintético B>0: mismo delta (equivalente PUBLICO). |
| R-DELTA-CUT-008 | cliente sintético B pequeño: mismo delta (equivalente PALMA). |
| R-DELTA-CUT-009 | cliente sintético entre #5 y #6: el ranking sigue al delta, no al nombre. |
| R-DELTA-CUT-010 | Top N + `list_total_negative` desde el mismo snapshot. |

## 19. LIVE_DB probes (no ejecutadas)

SQL solo no reproduce PROY. Sonda JS read-only sobre helpers existentes:

```js
// NO EJECUTAR en esta tarea.
// client = pool.connect() producción (requiere G1 LIVE_DB nuevo).
const { computeDeltaIngresoClientesPorMes, defaultLoadIgfPlantMetrics } =
  require("./lib/delta-ingreso-clientes-por-mes");
const { computeClientesDescuentoMes } = require("./lib/dashboard-arr-forecast");
const { ingresoClienteMarginal, targetKgDesdeIgfVentaTon } =
  require("./lib/ingreso-cliente-marginal");

const now = new Date(); // o el now del request IA
const names = [
  "PUBLICO EN GENERAL",
  "CARBURACION PALMA SOLA",
  "GRUPO MOVE EMPRESARIAL",
];

// A) lo que IA usa hoy
const metB_ia = await defaultLoadIgfPlantMetrics(client, "Acapulco", 2026, 9);
// B) lo que Clientes por mes usa: mismo PROY que IGF
//    reutilizar buildIgfForecastPayload + computeIgfForecastMiniPayload
//    con el mismo upload_day que ArrClient.resolveUploadDayForMonth
const metB_ui = {
  ventaTon: /* mini.ventaTon || igfRow.venta_ton overlay */,
  targetKg: targetKgDesdeIgfVentaTon(/* ese ventaTon */),
  margenKg: /* igfRow.margen_kg */,
  ...metricsFromIgfLine(/* igfRow */),
};

const packA = await computeClientesDescuentoMes(client, 2026, 8, "Acapulco", { historico: true, now });
const packB_ia = await computeClientesDescuentoMes(client, 2026, 9, "Acapulco", {
  historico: false,
  targetKgOverride: metB_ia.targetKg,
});
const packB_ui = await computeClientesDescuentoMes(client, 2026, 9, "Acapulco", {
  historico: false,
  targetKgOverride: metB_ui.targetKg,
});

// Por cada name: kg, kgProy, descKg, ingreso A/B, delta en ambos packs.
// Imprimir también: version_id, version_number, financial_state,
// venta_ton crudo, ventaTon PROY, upload_day, targetKg, sumMTD, factor.
```

SELECT de apoyo (no sustituye la sonda; no ejecutar):

```sql
-- B version latest (lo que IA lee)
SELECT id, version_number, financial_state
  FROM igf.versions
 WHERE plant_code = 'GLOBAL' AND year = 2026 AND month = 9
 ORDER BY version_number DESC
 LIMIT 1;

-- venta_ton / margen / HG crudos (IA)
SELECT empresa, venta_ton, margen_kg, hg_pct, hg_kg, com_desc_kg
  FROM igf.compromiso_lines
 WHERE version_id = $version_id
   AND empresa ILIKE '%Acapulco%';

-- MTD CDM (ambas rutas)
SELECT v.cliente_norm, SUM(v.kg) AS kg
  FROM arr.ventas_diarias_cliente v
 WHERE v.fecha >= DATE '2026-09-01' AND v.fecha <= DATE '2026-09-30'
   AND UPPER(TRIM(v.plant_code)) IN ('ACAPULCO', /* clave planta */)
   AND UPPER(TRIM(v.cliente_norm)) IN (
     'PUBLICO EN GENERAL',
     'CARBURACION PALMA SOLA',
     'GRUPO MOVE EMPRESARIAL'
   )
 GROUP BY v.cliente_norm;
```

PROY no se obtiene de un SELECT único: sale de `computePronosticoProyByPlant` + snapshot mini + `upload_day`.

## 20. Recommended next FIX

**FIX-DIRECTOR-IA-CLIENTES-POR-MES-TARGET-PROY-PARITY-001**

Solo alinear el loader de `venta_ton`/`targetKg` de `computeDeltaIngresoClientesPorMes` / `defaultLoadIgfPlantMetrics` con la `ventaTon` efectiva de IGF mes abierto (PROY/mini + la misma resolución de `upload_day` que ArrClient).

No tocar `ingresoClienteMarginal`.  
No tocar el ranking.  
No tocar comentarios.  
No “arreglar” React export.

G1 humano aparte. Esta auditoría no lo abre.

## 21. Branch

`audit/director-ia-clientes-por-mes-runtime-cut-parity-001`

## 22. Commit SHA

HEAD al cerrar el tracing: `103c4b7ed79551b8d8adefb94896b64047a7d674`  
(`Merge branch 'fix/director-ia-delta-ingreso-clientes-por-mes-parity-001'`)

`allowed_actions` no lista commit. El reporte queda untracked/unstaged. No se hizo commit.

## 23. git status --short

```
 M docs/dev-loop/CURRENT_TASK.md
?? docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENTES-POR-MES-RUNTIME-CUT-PARITY-001.md
```

(estado esperado al dejar DONE_PENDING_REVIEW; `CURRENT_TASK.md` solo cambió `status`.)
