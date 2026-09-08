# AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001

AUDIT_BASE_SHA: 3073bbb70fa38db925be3f337c6012572886e38e

mode: READ_ONLY_PHYSICAL_TRACE
now_used: 2026-09-08
live_db: NO
product_code_changed: NO

## EXECUTIVE_SUMMARY

Director IA no “pierde 1522.76” en computeDicf ni en el LLM como primera causa.

Para `¿Cómo va ARR?` el chat entra a `loadIgfArrAnnexForChat` (mismo executor que `get_arr_snapshot` / `get_igf_snapshot`). Ese anexo pide `computePronosticoProyByPlant` con `fechaCorte: ""`. Sin corte en-mes, `enableLookback=false` y POR COMPRAR = 0. El campo llamado `proy_venta_ton` queda igual al TOTAL mes observado (familia 302). El anexo lo imprime como “venta” bajo el título “proyección o real según corte” y `financial_diagnosis` lo etiqueta `arr.proyeccion_planta`.

El dashboard Pronóstico sí separa:

- TOTAL mes = `venta_sheet.total_mes_sum` (302)
- PROY = `venta_sheet.proy_total_ton` / `proy_venta_ton` (1522.76) con fecha de corte

Esa separación ya existe en `loadDashboardForecastParity` y en el pack ejecutivo (`ACTUAL_TO_DATE` ≠ `FORECAST` ≠ `TARGET_COMMITMENT`), pero **no llega** al path `arr_status` / anexo IGF-ARR / bloques de `financial_diagnosis`.

El IGF ~2000.299 entra al mismo anexo porque `wantArr` también carga `igf.compromiso_lines.venta_ton`. El ingreso híbrido mezcla ARR×margen IGF.

El descuento -4.92 vs Desc. PROY -4.84 nace del mismo corte vacío vs corte de dashboard. Cifras exactas: UNPROVEN_NO_LIVE_DB.

M9 es un root independiente: `COALESCE(kg, 0)` y `margen ?? 0` convierten ausente en 0 **antes** del formatter. `financial_diagnosis` declara “null no es 0” y “prohibido causalidad”, pero el payload M9 ya llegó coercionado.

`¿Cuánto proyectamos vender?` y `¿Cómo vamos a cerrar septiembre?` no matchean planner ni `ARR_SIGNAL_RE`: intent `unknown`, sin tools, sin anexo.

## ROUTE_TRACE

Planner: `lib/director-ia-planner.js`. Chat no está gobernado por el planner (`director-ia-planner.js` L5). El chat decide IGF/ARR con `isPlantFinancialKpiQuestion` (`director-ia-igf-arr.js` L121-127, `director-ia-chat.js` L5937-5946).

### PROBE_A — ¿Cómo va ARR?

ROUTE_INTENT: `arr_status` (`detectDirectorIaIntent` L600-601, evidence `arr_keyword`, conf 0.9)
domains: `["arr"]`
TOOLS (orchestrator): `get_arr_snapshot` → executor `loadIgfArrAnnexForChat`
CHAT REAL: `isArrForecastQuestion=true` → `isPlantFinancialKpiQuestion=true` → `wantFinancialKpi` carga el anexo como contexto focused (`director-ia-chat.js` L5937-5946). No usa `computeDicf` / `get_commercial_state`.
ARR_CONTEXT_FIELDS: `arrCurr.venta_ton`, `arrCurr.desc_kg`, `arrPrev.*`, Δ venta, Δ desc (anexo L551-563)
IGF_CONTEXT_FIELDS: `igf.compromiso_lines.venta_ton`, `margen_kg`, `com_desc_kg`, `hg_kg`, ingreso híbrido (L576-597)
M9_CONTEXT_FIELDS: ninguno en este path

### PROBE_B — ¿Cuánto proyectamos vender?

ROUTE_INTENT: `unknown` / `no_rule_matched`
TOOLS: []
`isArrForecastQuestion=false` (`ARR_SIGNAL_RE` exige `cuanto (vamos a)? vender` o `proyección de venta`, no “proyectamos”)
annex=false
FIELD_PRIORITY_HOY: ninguna métrica ARR/IGF se selecciona por este path.

### PROBE_C — ¿Cómo vamos a cerrar septiembre?

Igual B. `resolveYearMonthFromQuestion` sí ve `septiembre` → 2026-09, pero no hay tool/anexo.

### PROBE_D — ¿Cuál es la proyección de venta?

Planner: `unknown` / domains `[]` / tools `[]`
`isArrForecastQuestion=true` (`proyección de venta`)
CHAT REAL: `wantFinancialKpi` → mismo anexo que A.
FIELD_PRIORITY_HOY: el único `venta_ton` del anexo (`loadArrProyForPlant`), no `forecast.venta_ton` del adapter.

### PROBE_E — ¿Por qué cayó el ingreso?

ROUTE_INTENT: `financial_diagnosis` (`caida_ingreso_financiera`, planner L631-636)
domains: `arr`, `igf`, `delta_venta`, `delta_descuento`, `delta_ingreso`
TOOLS: `get_arr_snapshot`, `get_igf_snapshot`, `get_delta_sales`, `get_delta_discount`, `get_delta_income`
CHAT REAL: in-process `loadFinancialDiagnosisForChat` (`director-ia-chat.js` L5491-5557), no el anexo focused.
ARR block: otra vez `loadArrProyForPlant` (`loadIgfArrSourceBlocksForChat` L741-743)
IGF block: `loadIgfCommitSnapshot` → composition
M9: tres familias; `DATA_NOT_FOUND` se preserva en el mapper; si `ok=true`, kg/margen ausentes ya son 0.
Availability flags al modelo: `status`, `absence`, `limitations` (`null_no_es_cero`, `no_causalidad`), `alignment.status`. El addendum prohíbe causalidad (L21-29). El anexo ARR **no** corre aquí.

## ARR_DATA_FLOW

```
pregunta con \barr\b o ARR_SIGNAL
  → chat wantFinancialKpi OR tool get_arr_snapshot
  → loadIgfArrAnnexForChat / loadIgfArrSourceBlocksForChat
  → loadArrProyForPlant(client, year, month, plantCode)
       fechaCorte: ""                          [igf-arr.js L389-397]
  → computePronosticoProyByPlant(..., { fechaCorte: "" })
  → buildPronosticoVentaDescMaps(..., "")
       corteDtInput = null
       corteDt = último día del mes            [dashboard-arr-forecast.js L3375-3381]
       isCorteEnMes = false
       enableLookback = false
  → porComprar = 0
  → proy_venta_ton = Σ totalMesVenta           (= TOTAL mes observado si no hay días futuros en el mapa)
  → anexo: "ARR — VENTA / DESCUENTO (proyección o real según corte)"
```

Path que SÍ separa (no usado por arr_status):

```
executive_status
  → resolveDirectorIaEffectiveCutoff
  → loadDashboardForecastParity(upload_day)
       forecast.venta_ton ← proy_venta_ton (+ snapshot overlay)
       actual_to_date.venta_ton ← venta_sheet.total_mes_sum
  → buildAuthoritativeForecastRunPack
       FORECAST ≠ ACTUAL_TO_DATE ≠ TARGET_COMMITMENT
```

`computeDicf` / `commercial_state`: no se invocan para A. `wantCommercial` es false (`igf-arr.js` L471-474).

## DASHBOARD_DATA_FLOW

Pronóstico (IGF Forecast / hoja Pronostico) — `frontend-dashboard/components/IgfForecastClient.tsx`:

| UI | campo físico |
|---|---|
| TOTAL mes (por día de semana) | `pronosticoSheetDisplay.total_mes_sum` ← `venta_sheet.total_mes_sum` (`dashboard-arr-forecast.js` L3634, UI L2010) |
| PROY | `proy_total_ton` / `proy_venta_ton` (UI L2028-2035, L2084-2090) |
| Desc. PROY | `pronosticoDetail.proy_desc_kg` (UI L2092-2094) |

Tabla ARR (`ArrClient.tsx` L410-411):

- `ventaTon` = `miniRow.ventaTon` (pronóstico PROY del mini), **no** TOTAL mes.
- `comDescKg` = `forecastRow.com_desc_kg` (IGF stored), luego `descuentoSigned = -abs(...)` (L451-452).

No asumir que el “Venta” de ArrClient es 302.

## SEMANTIC_MATRIX

| METRIC | PHYSICAL_SOURCE | FIELD | SEMANTIC_MEANING | DIRECTOR_IA_LABEL | DASHBOARD_LABEL | CAN_BE_NULL | ABSENCE_HANDLING |
|---|---|---|---|---|---|---|---|
| ARR observed sale to date | `getPronosticoPlantDetail.venta_sheet` | `total_mes_sum` | ACTUAL_TO_DATE / TOTAL mes cerrado hasta corte | no se expone en anexo; se **emite** como `venta_ton` cuando lookback=off | TOTAL mes | yes (adapter) | adapter: `classifyActualToDateKind`; anexo: se imprime o “—” vía `fmtNum` |
| ARR projected month sale | `computePronosticoProyByPlant` / snapshot `arr.pronostico_mini_snapshot` | `proy_venta_ton` / `proy_total_ton` | FORECAST_PROJECTION = TOTAL + POR COMPRAR | `arrCurr.venta_ton` bajo “proyección o real”; source `arr.proyeccion_planta` | PROY / PROY venta | yes | adapter lo separa; anexo lo colapsa con el observed si `fechaCorte=""` |
| previous-month sale | mismo `loadArrProyForPlant` mes-1 | `arrPrev.venta_ton` | mes cerrado: con corte vacío = Σ mes (actual). No es IGF | “venta” mes previo + Δ | Agosto en tabla ARR/histórico | yes | `fmtNum` → “—” si null; si hay número se resta |
| ARR observed discount | no exportado como cifra lista | adapter `actual_to_date.desc_kg=null` | UNAVAILABLE | no hay campo observed-desc | (no hay TOTAL desc al corte en UI) | yes | `desc_availability: UNAVAILABLE` (adapter L292-294) |
| ARR projected discount | `proy_desc_kg` (con corte + lookback) | `proy_desc_kg` | FORECAST desc $/kg | `arrCurr.desc_kg` (sin `dashboardDescSigned`) | Desc. PROY | yes; empty-corte puede ser 0 si ton=0 (L3851) | 0 si `proyVentaTon<=0` (colapsa ausencia de proyección a 0) |
| IGF commitment/forecast | `igf.compromiso_lines` | `venta_ton` | TARGET / compromiso IGF | “Compromiso venta IGF”; también entra a ingreso híbrido | ArrClient fallback `forecastRow.venta_ton` | yes | “Sin versión / sin fila”; `fmtNum` → “—” |
| M9 Delta Venta | `arr.ventas_diarias_cliente` FULL JOIN | `delta_kg` = COALESCE(b)-COALESCE(a) | period compare kg | `delta_venta` block | modal delta-venta | SQL never null | **ausente = 0** (L176-179, L186-188) |
| M9 Delta Descuento | descuentos + kg | `deltaRatio`; kg=0 → ratio 0 | period compare $/kg | `delta_descuento` | modal delta-descuento | coerced | source_coercion L745 |
| M9 Delta Ingreso | kg × (margen − \|desc\|) | `deltaIngreso`; `margen ?? 0` | period compare MXN | `delta_ingreso` | modal delta-ingreso | coerced | L330-331, L762 |

## Hallazgos (archivo / función / rango / I/O / label)

### ARR_SALES_FIRST_DIVERGENCE

`lib/director-ia-igf-arr.js` `loadArrProyForPlant` L389-397.

input: `fechaCorte: ""`
output: `{ venta_ton: proy_venta_ton, desc_kg: proy_desc_kg }`
semantic label: proyección (nombre de función + source `arr.proyeccion_planta`)

Mecanismo inmediato: `dashboard-arr-forecast.js` `buildPronosticoVentaDescMaps` L3375-3381 (`enableLookback=false`) y `computePronosticoProyByPlant` L3788-3797 (POR COMPRAR vacío → PROY = TOTAL).

No es `computeDicf`.

### ARR_PROJECTION_FIELD_EXISTS

YES. `proy_venta_ton` / `proy_total_ton` / snapshot `arr.pronostico_mini_snapshot.proy_venta_ton`. Adapter: `forecast.venta_ton` (`truth_semantics: FORECAST_PROJECTION`, adapter L241-285).

### ARR_PROJECTION_REACHES_DIRECTOR_IA

PARTIAL. Existe en `loadDashboardForecastParity` + `buildAuthoritativeForecastRunPack` (path `executive_status`, `director-ia-chat.js` L3436-3496). **No** en `get_arr_snapshot`, anexo IGF-ARR, ni bloque ARR de `financial_diagnosis`.

### OBSERVED_302_FIELD

Dashboard: `venta_sheet.total_mes_sum` (TOTAL mes).
Director IA (path ARR): el mismo total se **reescribe** como `proy_venta_ton` → `arrCurr.venta_ton` cuando el corte está vacío.
Clase: OBSERVED_TO_DATE / CURRENT_TOTAL, mal etiquetada como FORECAST.
Valor exacto 302.00: UNPROVEN_NO_LIVE_DB (campo sí).

### PROJECTED_1522_FIELD

`venta_sheet.proy_total_ton` / `computePronosticoProyByPlant` con `fechaCorte` en-mes / `arr.pronostico_mini_snapshot.proy_venta_ton`.
Valor exacto 1522.76: UNPROVEN_NO_LIVE_DB (campo sí).

### WHY_302_WAS_CALLED_PROJECTION

1. `loadArrProyForPlant` nombra proyección y no pide corte.
2. Sin lookback, `proy_venta_ton === Σ totalMesVenta`.
3. Anexo L551: un solo renglón “venta” bajo “proyección o real según corte”.
4. `formatArrPayload` L498: “ARR proyección/corte de planta”.
5. `ARR_SOURCE = "arr.proyeccion_planta"` (`financial-diagnosis.js` L18).
6. Δ vs mes previo (L558-559) compara 302 contra el mes anterior cargado igual (agosto cerrado ≈ Σ mes ≈ 1176) → “caída ≈874”. No hay gate que impida esa resta.

### DISCOUNT_FIRST_DIVERGENCE

Misma función: `loadArrProyForPlant` L396 (`desc_kg` sin `dashboardDescSigned`) + `fechaCorte: ""`.
Dashboard Desc. PROY: `getPronosticoPlantDetail.proy_desc_kg` con corte (`IgfForecastClient.tsx` L2092-2094).
Adapter sí aplica `dashboardDescSigned` al forecast (L244). El anexo no.

### DISCOUNT_492_SOURCE

`computePronosticoProyByPlant(fechaCorte:"").proy_desc_kg` → `arrCurr.desc_kg` (anexo L553). Exacto -4.92: UNPROVEN_NO_LIVE_DB.

### DISCOUNT_484_SOURCE

`pronosticoDetail.proy_desc_kg` (Desc. PROY, corte de UI). Candidato secundario no usado por esa etiqueta: `ArrClient` `-abs(forecastRow.com_desc_kg)` (IGF). Exacto -4.84: UNPROVEN_NO_LIVE_DB.

### DISCOUNT_DIFFERENCE_CLASS

OBSERVED_VS_PROJECTED (mismo motor, ventana sin lookback vs con corte).
No se demuestra ROUNDING. No se excluye overlay de snapshot (`loadPronosticoMiniSnapshot` solo en adapter L217-238).

### IGF_2000_FIELD

`igf.compromiso_lines.venta_ton` vía `loadIgfCommitSnapshot` (`igf-arr.js` L357-386, L585-591).
Exacto 2000.299: UNPROVEN_NO_LIVE_DB.
Se inyecta en preguntas ARR porque `if (wantIgf || wantArr)` (L567).

### IGF_ARR_SEMANTIC_SEPARATION

AMBIGUOUS (rótulos distintos) / BROKEN en el ingreso: `ventaArr = arrCurr.venta_ton ?? ventaIgf` y `(margen+desc−HG)×ventaArr×1000` (L589-597). `get_arr_snapshot` y `get_igf_snapshot` comparten executor.

### M9_ABSENCE_FIRST_DIVERGENCE

`lib/director-ia-m9-deltas.js` query Delta Venta L176-179: `COALESCE(a.kg, 0)`, `COALESCE(b.kg, 0)`.
JS L186-188: null → 0.
Delta Ingreso: `margenA/B ?? 0` L330-331.
Declarado: `source_coercion` L725, L762.

No es el LLM. No es solo el prompt. El mapper de `financial_diagnosis` **sí** preserva `DATA_NOT_FOUND` cuando `payload.ok!==true` (L255-271). El colapso ocurre cuando la familia viene `ok=true` con ceros coercidos, o cuando el modelo lee buckets vacíos como “sin cambios” (`formatM9Family` L510-513 dice “dejaron/mas/disminuyeron presentes” sin magnitudes).

### M9_ABSENT_COLLAPSES_TO_ZERO

YES en SQL/JS de familias disponibles.
PARTIAL en el bloque `financial_diagnosis` (DATA_NOT_FOUND no se pinta como 0; AVAILABLE sí puede ser 0-coerced).

### CAUSALITY_GATE_PRESENT

PARTIAL.

- YES: `FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM` + “No afirmes causa” (`financial-diagnosis.js` L21-29, L543).
- NO: anexo ARR calcula Δ venta/desc vs mes previo y no prohíbe “cayó”.
- Debilitado: M9 ausente→0 y ARR 302 etiquetado proyección permiten “cayó por X” con métricas no homogéneas.

## ARR_SALES_FIRST_DIVERGENCE

`loadArrProyForPlant` (`lib/director-ia-igf-arr.js` L389-397) → `buildPronosticoVentaDescMaps` L3381.

ARR_PROJECTION_FIELD_EXISTS: YES

ARR_PROJECTION_REACHES_DIRECTOR_IA: PARTIAL

OBSERVED_302_FIELD: `venta_sheet.total_mes_sum` (reemitido como `proy_venta_ton` / `arrCurr.venta_ton`)

PROJECTED_1522_FIELD: `proy_total_ton` / `proy_venta_ton` (con corte) / `arr.pronostico_mini_snapshot.proy_venta_ton`

WHY_302_WAS_CALLED_PROJECTION: corte vacío apaga lookback; un solo campo `venta_ton` se etiqueta proyección.

DISCOUNT_FIRST_DIVERGENCE: `loadArrProyForPlant` L396 (mismo corte vacío)

DISCOUNT_492_SOURCE: `proy_desc_kg` sin corte (UNPROVEN valor)

DISCOUNT_484_SOURCE: `pronosticoDetail.proy_desc_kg` Desc. PROY (UNPROVEN valor)

DISCOUNT_DIFFERENCE_CLASS: OBSERVED_VS_PROJECTED

IGF_2000_FIELD: `igf.compromiso_lines.venta_ton`

IGF_ARR_SEMANTIC_SEPARATION: AMBIGUOUS / BROKEN (ingreso híbrido)

M9_ABSENCE_FIRST_DIVERGENCE: `director-ia-m9-deltas.js` L176-179 / L330-331

M9_ABSENT_COLLAPSES_TO_ZERO: YES

CAUSALITY_GATE_PRESENT: PARTIAL

## REQUIRES_LIVE_DB

NO para localizar roots y campos.
YES solo para atar 302 / 1522.76 / -4.84 / -4.92 / 2000.299 / 1176 a una fila Puebla.

## REQUIRES_SQL_CHANGE

NO para ARR/descuento (el motor con corte ya existe).
UNPROVEN para M9 (el COALESCE está en SQL de la fuente del modal; un FIX de evidencia de chat podría no tocar SQL si se clasifica ausente aguas arriba).

## REQUIRES_PLANNER_CHANGE

YES para B y C (y D en planner: hoy `unknown` aunque el chat sí anexa).
NO para A y E.

## REQUIRES_ROUTING_CHANGE

NO en orchestrator `DOMAIN_TO_TOOLS`.
YES en la señal de chat/planner para B/C (`ARR_SIGNAL_RE` no cubre “proyectamos” / “cerrar septiembre”).

## ROOT_CAUSE_COUNT

3

## RECOMMENDED_TASK_SPLIT

1. FIX-DIRECTOR-IA-ARR-PROJECTION-CUTOFF-LABEL-001 — corte real + exponer `actual_to_date` ≠ `forecast`; dejar de llamar proyección al TOTAL mes; no mezclar IGF `venta_ton` en el renglón ARR. Reutilizar adapter/pack. Incluye desc PROY (mismo root).
2. FIX-DIRECTOR-IA-M9-ABSENT-NOT-ZERO-001 — cliente/margen ausente ≠ 0 observado en evidencia de chat.
3. FIX-DIRECTOR-IA-ARR-PROJECTION-QUESTION-ROUTE-001 — B/C (y planner de D) a `arr_status` / señal ARR, sin mega-fix.

## MINIMAL_SAFE_FIX_BOUNDARY

Root 1: solo `loadArrProyForPlant` / anexo / `mapArrBlock` para pasar cutoff y dos campos etiquetados. No rediseñar `computePronosticoProyByPlant`. No tocar DICF. No reabrir pack ejecutivo salvo consumirlo.
Root 2: solo evidencia M9 hacia Director IA (flags de ausencia). No cambiar la semántica del modal dashboard sin gate.
Root 3: planner/`ARR_SIGNAL_RE` únicamente. No SQL.

## FINAL_RECOMMENDATION

FIX_SPLIT_ROOTS

```yaml
task_id: "AUDIT-DIRECTOR-IA-ARR-PROJECTION-SEMANTICS-001"
outcome: "DONE"
mode: "AUDIT"
implementation: false
docs_director_ia_changed: false
live_db: false
sql_new: false
dependency_new: false
planner_changed: false
routing_changed: false
product_code_changed: false
next_task_proposed: "FIX-DIRECTOR-IA-ARR-PROJECTION-CUTOFF-LABEL-001 (no autorizado)"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No implementación. No merge. No deploy. No next task."
```
