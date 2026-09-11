# AUDIT-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-PARITY-001

```yaml
task_id: AUDIT-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-PARITY-001
outcome: DONE
mode: READ_ONLY
implementation: false
code_changes: false
commits: true
push: false
merge: false
schema_changes: false
docs_director_ia_changed: false
origin_main: "ec3b7178e38c5bb1b273055d56d9cd442ddcf917"
head: "0e8cdd5a8fdb539b59fa2ba56635573dd592f90e"
branch: audit/director-ia-month-close-financial-variables-parity-001
secrets_check: "none"
live_db: false
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/README.md
  - docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
files_touched:
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-PARITY-001.md
files_not_touched:
  - lib/director-ia-month-close-result.js
  - lib/director-ia-financial-actual.js
  - lib/director-ia-chat.js
  - lib/director-ia-planner.js
  - lib/director-ia-igf-arr.js
  - server.js
  - frontend-dashboard/
  - docs/director-ia/
next_task_proposed: "IMPL-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-COMPOSITION-001"
next_task_authorized: false
next_task_executed: false
human_decision_needed:
  - "G5: aceptar o rechazar esta auditoría."
  - "Si se acepta: autorizar un slice de composición (no SQL, no tool, no endpoint, no frontend) que presente la vista financiera de agosto con etiqueta inequívoca FINAL vs NOT_FINAL. No merge. No push main. No deploy."
```

## Pregunta central (resumen)

`¿Cómo cerramos agosto?` ya entra a `month_close_result` y carga ACTUAL comercial (1504.39 t). No muestra las variables de la fila Agosto 2026 del dashboard porque esa fila **no es ACTUAL_FINANCIAL FINAL**: es un híbrido IGF latest + mini runtime (`computeIgfForecastMiniPayload`) + toneladas ARR por categoría. `month_close` no invoca el mini; `financial.actual` exige `financial_state=FINAL`; el composer solo imprime venta/status y deja que GPT parafrasee gaps genéricos.

Eso puede ser correcto: una fila visible no prueba cierre financiero definitivo.

NO se reabrió el FIX de `resolvePlantCodes`.

---

## AUDIT_RESULT

C1_INTENT: month_close_result

C1_ROUTE: planner `isMonthCloseQuestion` (closeCue `cerramos` + monthCue `agosto` / `como cerr`) → `lib/director-ia-chat.js` rama `month_close_result` → `loadMonthCloseResultForChat` → `assembleMonthClosePack` → `buildMonthClosePrompt` / `formatMonthCloseContext` → GPT (`SYSTEM_ADDENDUM`) → `buildMonthCloseChatResult`

C1_SOURCE: pack mixto. ACTUAL comercial = `arr.ventas_diarias_cliente`. TARGET = `igf_meta.meta_lines` (`is_current`; LIVE: TARGET_MISSING_FOR_PERIOD). FORECAST = `igf.compromiso_lines` vía `loadIgfCommitSnapshot` (latest GLOBAL, sin filtrar FINAL). ACTUAL_FINANCIAL = `loadFinancialActualEvidence` solo si `igf.versions.financial_state='FINAL'`. No mini. No MINI_FORECAST_PROY de septiembre.

DASHBOARD_COMPONENT: `frontend-dashboard/app/arr/ArrClient.tsx` — tabla resumen de dos meses (thead Venta / Margen / Descuento / Operativos / Corporativos / Gasto / HG / HG$ / Impuestos / CASA / COMISIONISTA / Rentabilidad). Coincide columna a columna con la evidencia humana. No es `IgfForecastClient`.

DASHBOARD_FETCH: `ensureMonthLoaded` → `fetchIgfForecast(token, { year, month, include_mini: true, upload_day? })`. CASA/COMISIONISTA: `ensureClientesLoaded` → `fetchArrClientesMes`. Periodos: `fetchIgfVersiones`.

DASHBOARD_ENDPOINT: `GET /api/dashboard/igf-forecast?year=&month=&include_mini=1` (`frontend-dashboard/lib/api.ts`). CASA/COMISIONISTA: `GET /api/dashboard/arr-clientes-mes`.

DASHBOARD_HANDLER: `server.js` `app.get("/api/dashboard/igf-forecast")` → `buildIgfForecastPayload` + `computeIgfForecastMiniPayload`. Clientes: `app.get("/api/dashboard/arr-clientes-mes")` → `dashboardArrForecast.computeClientesDescuentoMes`.

DASHBOARD_ROW_BUILDER: `computeRowValues` + `resumenMesMetrics` + `rentabilidadResumenPorMes` en `ArrClient.tsx`. Fila histórica = híbrido: mini (`ventaTon`, `operativos`, `corporativos`, `gasto`, `resultadoFinalImporte`) + fila IGF (`margen_kg`, `com_desc_kg`, `hg_pct`, `hg_kg`, `impuesto_kg`) + clientes ARR (`kg_real` por categoría).

DASHBOARD_SOURCE: combinación. Mes cerrado (`isIgfMesCerradoPorCorte` / `mesHistorico`): venta mini = `getVentaRealTonProvinciaByPlant` sobre `arr.ventas_diarias_cliente`. Tasas e importes P&L = latest `igf.versions` GLOBAL (`ORDER BY version_number DESC LIMIT 1`, **sin** `financial_state`) + `igf.compromiso_lines`, reescalados en `computeIgfForecastMiniPayload`. CASA/COMISIONISTA = Σ `kg_real` de `/arr-clientes-mes`.

DASHBOARD_PERIOD_RULE: selector YYYY-MM del workspace ARR. Agosto 2026 = `2026-08`. Reloj de histórico = mes < mes calendario del browser (`mesHistorico`). Mini usa corte `upload_day` opcional; ArrClient no manda `version_as_of_corte`.

DASHBOARD_VERSION_RULE: `resolveIgfGlobalVersion`: `igf.versions` `plant_code='GLOBAL'` + year/month, `ORDER BY version_number DESC LIMIT 1`. No filtra FINAL. No lee `financial_state`.

MONTH_CLOSE_VERSION_RULE: forecast = misma regla latest (`loadIgfCommitSnapshot`). actual = única versión `financial_state='FINAL'` GLOBAL del YYYY-MM (`loadFinancialActualEvidence`). target = `pickCurrentMetaVersion` (`is_current`). No son el mismo contrato de versión para P&L.

FINANCIAL_STATE_SOURCE: `igf.versions.financial_state`

FINANCIAL_STATE_SCOPE: GLOBAL (`plant_code='GLOBAL'`), no por planta.

FINANCIAL_STATE_FOR_DASHBOARD_ROW: UNKNOWN_FROM_CODE_ONLY — el dashboard no selecciona ni exige `financial_state`. El estado concreto de agosto no se demostró (sin LIVE_DB).

DASHBOARD_REQUIRES_FINAL: NO

MONTH_CLOSE_REQUIRES_FINAL: YES para exponer `financial.actual.fields` como ACTUAL_FINANCIAL. Si hay versions y ninguna FINAL → `FINANCIAL_ACTUAL_NOT_FINAL` (LIVE de C1). Correcto contractualmente.

FIELD_MATRIX:

VENTA_SOURCE: mini histórico `getVentaRealTonProvinciaByPlant` → `arr.ventas_diarias_cliente` (fallback fila IGF `venta_ton`). month_close ACTUAL = misma tabla vía `queryMonthlySales`.

VENTA_FIELD: UI `m.ventaTon` ← `miniRow.ventaTon` (`bRes`). Backend mini `ventaTon`. month_close `sales.actual_ton`.

VENTA_SEMANTIC: ACTUAL comercial en toneladas para mes cerrado. 1504.39 t es ACTUAL, no prueba FORECAST. Coincidencia LIVE FORECAST=1504.39 no es contrato: `loadIgfCommitSnapshot` lee `venta_ton` stored sin overwrite de real. UNKNOWN_FROM_CODE_ONLY si el stored de agosto vale 1504.39.

MARGEN_SOURCE: fila IGF latest `buildIgfForecastPayload.rows[].margen_kg` (`igf.compromiso_lines`). No es el intent `historical_margin`.

MARGEN_FIELD: UI `m.margenKg` ← `forecastRow.margen_kg`. Catalog IGF `margen_kg`.

MARGEN_SEMANTIC: MXN/kg stored de la latest versión IGF del mes. No FINAL-gated. No es descuento cliente.

DESCUENTO_SOURCE: dashboard = `forecastRow.com_desc_kg` (stored IGF; en mes cerrado `buildIgfForecastPayload` **no** sustituye desc por PROY). month_close = `arr.descuentos_diarios_cliente` `SUM(monto)/SUM(kg)`.

DESCUENTO_FIELD: UI `m.descuentoSigned` = `-Math.abs(com_desc_kg)`. month_close `discount.per_kg`.

DESCUENTO_SEMANTIC: dashboard = Com. y Desc. IGF $/kg, signo forzado negativo. month_close = descuento ARR agregado planta. Universo = mes calendario. No son el mismo campo. -0.22 es el IGF visible; paridad ARR UNKNOWN_FROM_CODE_ONLY.

OPERATIVOS_SOURCE: `computeIgfForecastMiniPayload` runtime.

OPERATIVOS_FIELD: UI `m.operativos` ← `miniRow.operativos`. Fórmula: `Math.round((gasto_kg*scale + bancos_planta_kg*scale + provision_planta_kg*scale + impuesto_kg) * bRes * 1000)`. Semántica: gasto operativo importe (no rentabilidad operativa).

CORPORATIVOS_SOURCE: mismo mini.

CORPORATIVOS_FIELD: UI `m.corporativos` ← `miniRow.corporativos` = `Math.round((gtos_apoyos_corp_kg + bancos_corp_kg + otros_programas_kg + inversiones_kg) * scale * bRes * 1000)`.

GASTO_SOURCE: mismo mini.

GASTO_FIELD: UI `m.gastoImporte` ← `miniRow.gasto`.

GASTO_FORMULA_PROVABLE: YES — `gasto = operativos + corporativos` está escrito en `computeIgfForecastMiniPayload` (`server.js`). El control 9,664,071 + 2,378,296 = 12,042,367 es ese contrato, no un accidente de agosto.

HG_SOURCE: fila IGF `hg_pct`.

HG_FIELD: UI `m.hgDisplay` = `hg_pct * 100`. Catalog `hg_pct`.

HG_UNIT: display = puntos de % (12.87). stored `hg_pct` = fracción.

HG_SEMANTIC: porcentaje HG de la fila IGF latest. No es HG$. No es `hg_kg`.

HG_DOLLAR_SOURCE: derivado en `resumenMesMetrics` desde `hg_kg` y `hg_pct` de la fila IGF.

HG_DOLLAR_FIELD: UI `m.hgDinero` = `|hg_kg / hg_pct|` si `hg_pct !== 0`. No es el `hg_kg` crudo (catalog: HG $/kg de la línea IGF).

HG_DOLLAR_UNIT: MXN/kg (UI lo pinta como dinero).

HG_DOLLAR_SEMANTIC: precio unitario implícito HG = |HG$/kg stored / HG fracción|. Defendible como dato de la misma fila, no como ACTUAL_FINANCIAL.

IMPUESTOS_SOURCE: `forecastRow.impuesto_kg` con fallback `miniRow.impuestos` (ambos salen de `impuesto_kg` stored).

IMPUESTOS_FIELD: UI `m.impuestoKg`. Catalog `impuesto_kg`. Mini `impuestos`.

IMPUESTOS_UNIT: MXN/kg (0.90).

CASA_SOURCE: `toneladasCategoriaDesdeClientes` sobre `fetchArrClientesMes` → `computeClientesDescuentoMes`. Histórico = `kg_real`.

CASA_FIELD: UI `catTon.casa`. month_close `channels.casa_kg` / `casa_ton` desde `aggregateSales` + `classifyCanalGrp`.

CASA_UNIT: toneladas (UI redondeo 2 dec; kg/1000).

COMISIONISTA_SOURCE: misma lista; `categoriaEsComisionista` → COMISIONISTA, else CASA.

COMISIONISTA_FIELD: UI `catTon.comisionista`. month_close `channels.comisionista_kg` / `comisionista_ton`.

COMISIONISTA_UNIT: toneladas.

CASA_PLUS_COMISIONISTA_EQUALS_VENTA_CONTRACT: NO como igualdad code-enforced entre columnas. Partición binaria exhaustiva de **la lista de clientes** (no-comi = CASA). VENTA de la tabla = agregado planta `ventas_diarias_cliente`. En agosto 832.74+671.65=1504.39 reconcilia aritméticamente; no hay assert en el row builder. Otros canales no existen en esta UI: todo no-comisionista cae en CASA.

RENTAB_UI_FIELD: columna «Rentab.» / «Rentabilidad» → `rentabUi` (`rentabilidadMostradaA/B`)

RENTAB_BACKEND_FIELD: `rentabilidadImporte` ← `miniRow.resultadoFinalImporte` ?? `forecastRow.resultado_final_importe`. Fallback ARR `rentabilidadArrDesdeFilas` = Σ ingreso clientes − Gasto solo si IGF es null.

RENTAB_SOURCE: para Acapulco (está en `miniLabels`) el mini siempre emite `resultadoFinalImporte` → se usa el mini, no el fallback ARR.

RENTAB_FORMULA: `resultadoFinalImporte = utilOperImporte - corporativos` en `computeIgfForecastMiniPayload`.

RENTAB_SEMANTIC: **Resultado final (importe) del mini IGF**, runtime, sobre venta real del mes cerrado. No es rentabilidad operativa. No es ACTUAL_FINANCIAL stored. No es FINAL.

RENTAB_IS_OPERATING_PROFIT: NO

RENTAB_IS_FINAL_RESULT: YES — del mini runtime (`resultadoFinalImporte`). NO del stored `resultado_final_importe` FINAL.

OPERATING_PROFIT_SOURCE: mini `utilOperImporte`; también stored `igf.compromiso_lines.util_oper_importe` (FINANCE_PROVIDED / catalog). La UI de esta tabla **no** muestra operativa.

OPERATING_PROFIT_FIELD: `utilOperImporte` / `util_oper_importe`

OPERATING_PROFIT_STORED_OR_DERIVED: DERIVED en la fila dashboard (mini). STORED en `compromiso_lines` (otra semántica; puede diferir).

OPERATING_PROFIT_FORMULA: mini: `utilOperImporte = ingreso - operativos`, con `ingreso = Math.round((margen_kg + comDesc - hg_kg) * bRes * 1000)`. Identidad: `utilOperImporte = resultadoFinalImporte + corporativos`.

OPERATING_PROFIT_FORMULA_PROVABLE: YES para esta fuente histórica — el mismo `computeIgfForecastMiniPayload` corre el branch `isMesHistorico` (venta real) y **después** aplica esas fórmulas. No se reutilizó el texto del mini de septiembre; se leyó el código que construye la fila de agosto.

FINAL_RESULT_SOURCE: mini `resultadoFinalImporte` (dashboard RENTAB); stored `resultado_final_importe` si FINAL / latest commit.

FINAL_RESULT_FIELD: `resultadoFinalImporte` / `resultado_final_importe`

FINAL_RESULT_STORED_OR_DERIVED: DERIVED en dashboard. STORED en compromiso.

FINAL_RESULT_FORMULA: mini: `resultadoFinalImporte = utilOperImporte - corporativos`

FINAL_RESULT_FORMULA_PROVABLE: YES en el mini histórico. NO se demostró que el stored FINAL de Finanzas use la misma identidad (sin LIVE_DB / sin relectura de una fila FINAL).

AUGUST_CANDIDATE_OPERATING_PROFIT_3451953_PROVABLE: YES — identidad del mismo row builder (`resultadoFinal + corporativos`) aplicada a los enteros ya `Math.round` que la UI muestra (1,073,657 y 2,378,296). Es el `utilOperImporte` que esa función habría emitido junto a esos dos campos. No se relanzó LIVE_DB. No es el `util_oper_importe` stored FINAL. No debe llamarse cierre definitivo.

MONTH_CLOSE_FINANCIAL_FIELDS_AVAILABLE: `sales.actual_ton/kg` (ARR); `channels.casa_*` / `comisionista_*` (ARR); `discount.per_kg` (ARR, otra fórmula); `financial.forecast` + `composition` (stored latest: `margen_kg`, `com_desc_kg`, `impuesto_kg`, `hg_pct`, `hg_kg`, `gasto_kg`, `util_oper_*`, `resultado_final_*`, corporativos por kg, etc.); `financial.actual.status` (LIVE: FINANCIAL_ACTUAL_NOT_FINAL, **sin fields**); `information_gaps`; `limitations`.

MONTH_CLOSE_FINANCIAL_FIELDS_MISSING: no se carga `computeIgfForecastMiniPayload` → faltan los importes exactos de dashboard `operativos`, `corporativos`, `gasto`, `ingreso`, `utilOperImporte`, `resultadoFinalImporte`. `financial.actual.fields` vacíos por NOT_FINAL. Composer no imprime `forecast.composition` ni HG$/CASA t UI.

FIRST_PARITY_GAP: PAYLOAD — `month_close_result` nunca llama `computeIgfForecastMiniPayload`, que es la fuente física de OPERATIVOS / CORPORATIVOS / GASTO / RENTAB de la fila. Secundario (composer): `formatMonthCloseContext` solo emite `sales.*`, channels kg, discount ARR, `financial.actual.status` y `financial.forecast.venta_ton`; aunque `composition` viaja en el pack, GPT no la ve.

CURRENT_MINI_USED_FOR_AUGUST: NO. C1 no entra a `selectIgfStatusSourceMode`. El mini de la fila agosto es el de `2026-08` con venta real, no `MINI_FORECAST_PROY` de septiembre.

MATERIAL_MOVEMENT_GAP_SOURCE: `deriveGaps` → `material_movement_unexplained` si existe `top_negative_movers` con `delta_kg!=0` y `!has_comment`. Statement interno: «Hay movimiento material de cliente sin evidencia explicativa…». La frase LIVE no está hardcodeada; GPT la parafrasea. Si agosto tuvo ese mover: UNKNOWN_FROM_CODE_ONLY.

SOURCE_UNAVAILABLE_GAP_SOURCE: `deriveGaps` si alguna `limitation` contiene `unavailable` o `source_`. Incluye `actions_unavailable`. Statement: «Una fuente no estuvo disponible…». Puede dispararse sin caída de ARR/IGF. Frase LIVE = paráfrasis GPT.

ACTIONS_UNAVAILABLE_SOURCE: `assembleMonthClosePack` `limitations.push("actions_unavailable")` si `input.actions` no `ok`. GPT ve `limitations=`. Evidencia LIVE de fallo real de Action Register: UNKNOWN_FROM_CODE_ONLY.

COMPOSER_ADDS_UNSUPPORTED_GAPS: YES — las tres frases no son evidencia literal del pack; GPT sintetiza `SYSTEM_ADDENDUM` («qué necesita explicación y limitations»). Además `source_unavailable` se enciende por substring sobre `actions_unavailable` (gap genérico). `material_movement_unexplained` sí está gated a movers sin comentario; la formulación visible sigue siendo genérica.

C1_RESULT: intent correcto `month_close_result`; periodo 2026-08 COMPLETE; ACTUAL 1504.39; TARGET missing; FORECAST latest (venta stored); FINANCIAL_ACTUAL_NOT_FINAL. No mini septiembre. No presenta P&L de la fila.

C2_RESULT: `Dame el cierre financiero de agosto.` → `isIgfStatusFinancialSnapshot` false → `isMonthCloseQuestion` true (`cierre`+`agosto` / `cierre financiero`) → misma ruta C1. No mini.

C3_RESULT: `¿Cuál fue la rentabilidad operativa y el resultado final de agosto?` → planner **antes** de month_close: `isIgfStatusFinancialSnapshotQuestion` (rentabilidad) → `igf_status`. `resolveYearMonthFromQuestion` = 2026-08. `selectIgfStatusSourceMode` = `NEVER_CURRENT_MINI` / `PAST_MONTH`. Composer: `buildIgfStatusSnapshotChatResult` sobre stored `util_oper_importe` / `resultado_final_importe` latest, etiqueta «IGF vigente», **sin** gate FINAL y **sin** mini histórico de la fila. No es C1. No es septiembre mini.

C4_RESULT: `¿Qué margen y descuento tuvimos en agosto?` → `isIgfStatusFinancialSnapshot` false (margen sin rentabilidad). `isHistoricalMarginQuestion` true (`margen` + mes) → intent `historical_margin`, no month_close. Si no matcheara, `isDiscountPeriodQuestion` iría a `client_profile` pidiendo cliente. Fuente ≠ fila dashboard.

C5_RESULT: `¿Qué rentabilidad tenemos?` → `igf_status` + `MINI_FORECAST_PROY` / `CURRENT_OPEN_MONTH_CURRENT_STATE` (septiembre 2026). Debe permanecer así. `buildIgfStatusMiniForecastAnswer` ya muestra utilidad operativa y resultado final **proyectados** del mini vigente.

C6_RESULT: `¿Cómo cerramos julio?` → `month_close_result`; `resolveCloseMonth` → 2026-07 COMPLETE. Misma arquitectura que C1. No mini septiembre.

CAN_FIX_WITHOUT_NEW_SQL: YES

CAN_FIX_WITHOUT_NEW_TOOL: YES

CAN_FIX_WITHOUT_SERVER_CHANGE: YES — no hace falta endpoint nuevo. El mini y los loaders ya existen in-process. Un slice futuro cablea composición en `month_close` / chat. No frontend.

CAN_FIX_WITHOUT_FRONTEND_CHANGE: YES

ROUTING_BUG: NO para C1/C2/C6. C3 se desvía a `igf_status` stored. C4 se desvía a `historical_margin`. C5 correcto.

SOURCE_BUG: NO — C1 lee las fuentes que su contrato pide. La fila dashboard es otra fuente.

VERSION_BUG: NO — latest vs FINAL es contrato distinto, no un bug de lectura.

FINANCIAL_STATE_BUG: NO — `FINANCIAL_ACTUAL_NOT_FINAL` con fila visible es coherente (A + F).

PAYLOAD_GAP: YES — mini P&L de la fila no se carga.

COMPOSER_GAP: YES — no presenta composition stored; GPT añade frases genéricas.

PRESENTATION_GAP: YES — no existe shape NOT_FINAL con números etiquetados.

DATA_BUG: NO

RECOMMENDED_FINAL_SHAPE_FINAL:
```
Acapulco — cierre de Agosto 2026
(ACTUAL_FINANCIAL FINAL; version_id/version_number/finalized_at)

Venta: <sales.actual_ton t>   [ACTUAL comercial ARR; reconciliar con finance venta_ton si diverge]
- CASA: <t>
- COMISIONISTA: <t>
Margen: <MXN/kg>
Descuento: <MXN/kg>  [declarar si IGF stored o ARR SUM(monto)/SUM(kg)]
Impuestos: <MXN/kg>
HG: <%>
HG$: <MXN/kg>

Gastos operativos: <MXN>
Gastos corporativos: <MXN>
Gasto total: <MXN>

Rentabilidad operativa: <util_oper_importe MXN>
Resultado final: <resultado_final_importe MXN>
```
Usar fields FINANCE_PROVIDED de la FINAL. No sustituir por mini. No llamar FORECAST «cierre».

RECOMMENDED_FINAL_SHAPE_NOT_FINAL:
```
Acapulco — Agosto 2026
Vista financiera disponible / no final.
Estos números no constituyen cierre financiero definitivo.
(financial_state != FINAL; IGF latest vN + mini histórico venta real)

Venta: … (ACTUAL comercial)
CASA / COMISIONISTA: …
Margen / Descuento / Impuestos / HG / HG$: … (tasas latest IGF; no FINAL)
Gastos operativos / corporativos / Gasto total: … (mini runtime)
Rentabilidad operativa: <utilOperImporte mini>
Resultado final: <resultadoFinalImporte mini = RENTAB UI>
```
Prohibido: «cerramos», «cierre financiero», ACTUAL_FINANCIAL, silencio sobre NOT_FINAL.

RECOMMENDED_FINAL_SHAPE_DATA_MISSING:
```
Acapulco — Agosto 2026
No hay vista financiera defendible para este periodo.
FINANCIAL_ACTUAL_MISSING_FOR_PERIOD | DATA_NOT_FOUND | SOURCE_UNAVAILABLE
No inventar ceros ni derivar operativa/final.
Conservar ACTUAL comercial si existe, etiquetado solo como comercial.
```

FILES_INSPECTED:
- frontend-dashboard/app/arr/ArrClient.tsx
- frontend-dashboard/lib/api.ts
- frontend-dashboard/lib/igf-kpi-ui.ts
- server.js (resolveIgfGlobalVersion, buildIgfForecastPayload, computeIgfForecastMiniPayload, GET igf-forecast, GET arr-clientes-mes)
- lib/dashboard-arr-forecast.js (getVentaRealTonProvinciaByPlant)
- lib/director-ia-month-close-result.js
- lib/director-ia-financial-actual.js
- lib/director-ia-igf-arr.js
- lib/director-ia-planner.js
- lib/director-ia-chat.js (selectIgfStatusSourceMode, composers igf_status / month_close)
- lib/director-ia-historical-margin.js
- docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (month_close_result)

TESTS_RUN: ninguno (READ_ONLY; sin LIVE_DB)

RISKS:
- Igualar RENTAB UI a stored FINAL o a operativa.
- Usar 3,451,953 como cierre (es operativa mini, no FINAL).
- Contaminar agosto con MINI_FORECAST_PROY septiembre (C5 debe seguir mini actual).
- Presentar latest IGF como ACTUAL_FINANCIAL.
- Reabrir resolvePlantCodes.
- Tratar CASA+COMISIONISTA=VENTA o GASTO=suma como verdad de otra fuente (meta/FINAL stored).

RECOMMENDED_NEXT_SLICE: IMPL-DIRECTOR-IA-MONTH-CLOSE-FINANCIAL-VARIABLES-COMPOSITION-001 — un composer month_close que, sin SQL/tool/endpoint/frontend, presente A/B/C. Agosto permanece histórico. C5 permanece MINI_FORECAST_PROY. No auto-FINAL. No reabrir codes.

---

## Trace dashboard (tabla exacta)

```
ArrClient.tsx (tabla resumen)
  → fetchIgfForecast / fetchArrClientesMes
  → GET /api/dashboard/igf-forecast?include_mini=1
  → GET /api/dashboard/arr-clientes-mes
  → buildIgfForecastPayload + computeIgfForecastMiniPayload
  → computeClientesDescuentoMes
  → computeRowValues / resumenMesMetrics / toneladasCategoriaDesdeClientes
  → igf.versions latest GLOBAL + igf.compromiso_lines
    + arr.ventas_diarias_cliente (venta real mes cerrado)
  → financial_state: no leído
```

## Por qué hay fila si month-close dice NOT_FINAL

Clasificación pregunta central 2: **A + B + F** (versión C UNKNOWN_FROM_CODE_ONLY).

A) El dashboard muestra vista no FINAL (latest + mini). Correcto que exista.
B) Source mismatch: mini runtime vs ARR comercial vs stored FINAL-gated.
F) Composer no tiene shape para «números visibles / no finales».
C) Dashboard y forecast month_close leen latest; actual exige FINAL. Si latest ≠ FINAL, versiones distintas. Estado agosto: UNKNOWN_FROM_CODE_ONLY.
D) Periodo C1: ambos 2026-08. No.
E) No es bug de `financial_state`.

## INGRESO (sin columna UI)

Existe en el mini: `ingreso = Math.round((margen_kg + comDesc - hg_kg) * ventaReal_t * 1000)`. Explica operativa (`ingreso - operativos`). No agregar a la respuesta futura salvo que se etiquete como derivado mini / no FINAL.

## Control C5

`selectIgfStatusSourceMode` sin mes nombrado + now septiembre → `MINI_FORECAST_PROY`. No tocar en un slice de cierre de agosto.
