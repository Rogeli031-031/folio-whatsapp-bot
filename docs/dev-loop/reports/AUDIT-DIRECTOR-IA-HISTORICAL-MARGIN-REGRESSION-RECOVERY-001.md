# AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-REGRESSION-RECOVERY-001

```yaml
task_id: AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-REGRESSION-RECOVERY-001
mode: AUDIT_ONLY
outcome: DONE_PENDING_REVIEW
branch: audit/director-ia-historical-margin-regression-recovery-001
current_main_sha: 50fb33e5a4e6cf57ddd53cb6001e87e25c7193da
behavior_baseline_sha: 1f7774d7bff5fdd71f4e7b88433dde178f4fef86
implementation_authorized: NO
rollback_authorized: NO
merge_authorized: NO
deploy_authorized: NO
docs_director_ia_changed: NO
runtime_changed: NO
tests_changed: NO
live_db: NOT_PROVEN
may_live_db_reason: NOT_PROVEN
stack_live: NOT_PROVEN
suite_current: 1440 pass / 0 fail
suite_baseline: 1411 pass / 0 fail
suite_green_but_regression_not_covered: YES
open_month_forecast: HUMAN_PRODUCTION_PASS
forecast_labeling: PASS
historical_margin_short_followups: FUNCTIONAL
august_final_source: DATA_NOT_FOUND
august_data_not_found_reason: NOT_PROVEN_WITHOUT_LIVE_DB
descuento_abril_result: NOT_PROVEN_FROM_SCREENSHOT
explicit_metric_switch_from_historical_margin: PROVEN
state_dependent_margin_routing: PROVEN
regression_count: 4
```

## 1. Executive summary

`historical_margin` **no rompió Director IA de forma global**. Varias capacidades protegidas siguen respondiendo en first-turn y también **después** de un parent `historical_margin` cuando el detector produce un intent distinto de `unknown`.

Lo que sí se rompió es **estado-dependiente**:

1. Una pregunta **unknown** (incluido `¿Cómo vamos?` / `como vamos?`) queda capturada por `historical_margin` si el parent inheritable es margen. En sesión fresca, la misma pregunta recupera Estado Ejecutivo.
2. `cuanto fue la venta con su descuento por mes de febrero a abril?` no tiene ruta first-turn propia en baseline ni en current. Tras `historical_margin` se hereda margen, se interpreta como `compare_months` (febrero y abril, **sin marzo**) y el fail-closed **sin `status`** se mapea a **HTTP 500**.
3. `¿Cuál fue el margen en abril?` es `historical_margin` standalone en fresh / commercial_trend / executive, pero **después de `client_profile`** (y si el frontend conserva ese parent tras `delta_discount`) `askDirectorIa` fuerza `client_profile`. El copy observado de ingreso/DICF sale del prompt de perfil + OpenAI, no del builder de margen.
4. `¿Cómo quedamos contra la meta?` **sí rutea** a `month_close_result` en fresh, tras ejecutivo y tras margen. El error `(codes || []).map is not a function` es un **bug de contrato de tipo preexistente** (`e241729e`, 2026-08-24): `resolvePlantCodes` devuelve un objeto, no un array. **No** está en el diff de `historical_margin`.
5. Tras parent `historical_margin`, `descuento de agosto?` (detect `unknown`) hereda margen y responde DATA_NOT_FOUND de **margen** agosto. No hubo HTTP 500. Categoría `EXPLICIT_METRIC_SWITCH_FROM_HISTORICAL_MARGIN`.
6. Follow-ups cortos de **margen** (`margen de septiembre?` / `margen de agosto?`) sí llegan a `historical_margin` standalone. Septiembre abierto = FORECAST etiquetado (humano PASS). Agosto cerrado = DATA_NOT_FOUND; la causa física FINAL = `NOT_PROVEN_WITHOUT_LIVE_DB`.

**No** clasificar `FIRST_TURN_EXECUTIVE_STATUS_REGRESSION`. El control humano de page-refresh y el probe de sesión vacía coinciden: `CONTROL_FRESH_SESSION_EXECUTIVE_STATUS = PASS`.

**No** concluir que `historical_margin` está roto globalmente. `STATE_DEPENDENT_MARGIN_ROUTING = PROVEN`.

**Sí** clasificar `POST_ERROR_STATE_CONTAMINATION` y, además, `HISTORICAL_MARGIN_PARENT_STEAL` sin necesidad de HTTP 500: basta `conversation_state` de margen **o** `reconstructFromUserHistory` sobre los turns de usuario (el frontend conserva history aunque el HTTP falle).

El baseline `1f7774d7` es referencia de conducta. **No** es autorización de rollback.

## 2. G1 / base / baseline

| Campo | Valor físico |
|---|---|
| branch | `audit/director-ia-historical-margin-regression-recovery-001` |
| HEAD al auditar | `50fb33e5` = `origin/main` |
| baseline conducta | `1f7774d7` (worktree detached temporal) |
| status G1 | `AUTHORIZED_BY_HUMAN` presente; `authorized_by` / `authorized_at` intactos |
| implementation / merge / deploy / rollback | `NO` |
| max_attempts | `1` |
| runtime editado | NO |

Worktree baseline: `C:\Users\SUBDIRECCION\AppData\Local\Temp\hm-baseline-wt` (eliminado al cerrar). Probes solo en `%TEMP%`, no commiteados.

## 3. Human production evidence

Planta observada: Acapulco. SHA integrado: `50fb33e5`. Cifras numéricas de packs **no** se usan como contrato.

### 3.1 Secuencia original (crítica)

| Turn | Pregunta | Resultado humano | Clasificación de auditoría |
|---|---|---|---|
| T1 | `cual es el margen de mayo?` | copy DATA_NOT_FOUND de margen histórico FINAL | NEW_CAPABILITY / EXPECTED_CHANGE. Causa live mayo = `MAY_LIVE_DB_REASON = NOT_PROVEN` |
| T2 | `margen en mayo?` | equivalente historical_margin | EXPECTED_CHANGE |
| T3 | `cuanto fue la venta con su descuento por mes de febrero a abril?` | HTTP 500 | REGRESSION de routing + segundo bug de status |
| T4 | `como vamos?` | `No pude resolver un periodo de margen histórico. No invento el mes.` | REGRESSION crítica, estado-dependiente |
| Refresh | page reload + `como vamos?` | Estado Ejecutivo de Acapulco (pack normal) | CONTROL_FRESH_SESSION_EXECUTIVE_STATUS = PASS |

T3 y T4 **no** tienen exactamente la misma causa: T3 entra a `compare_months`; T4 entra a `single_month`/`operation=null` (sin mes). Comparten el **routing inherit** hacia `historical_margin`.

### 3.2 HUMAN_PRODUCTION_PASS (addendum)

Verificado físicamente (detect/plan) antes de clasificar. No se copian cifras.

| Pregunta | Detected / plan CURRENT | Handler esperado | HUMAN |
|---|---|---|---|
| `¿Cómo va la tendencia de CASA los últimos 30 días?` | `commercial_trend` standalone | commercial_trend | PASS |
| `¿Qué clientes nuevos entraron en agosto?` | `historical_new_clients` standalone | historical_new_clients | PASS |
| `¿Qué sabemos de TORTILLERIA ERICK?` | `client_profile` standalone | client_profile | PASS |
| kg/descuento Erick enero a la fecha | `client_profile` standalone | client_profile longitudinal | PASS |
| `¿Cómo cambió el descuento de abril a mayo?` | `delta_discount` standalone | delta_discount | PASS |

Esas mismas frases, **después** de parent `historical_margin`, siguen standalone (H4, H6, H7, H8, H9). No son unknown.

### 3.3 Nuevos síntomas (addendum)

| ID | Observación | Hallazgo |
|---|---|---|
| META | Tras pack `¿Cómo vamos?`, `¿Cómo quedamos contra la meta?` → `(codes \|\| []).map is not a function` | Routing correcto a `month_close_result`. Crash en loader. PREEXISTING_BUG / tarea futura aparte. No es HM. |
| MARGIN_AFTER_ERICK | Tras perfil Erick + longitudinal + delta descuento, `¿Cuál fue el margen en abril?` → copy de ingreso/DICF de cliente | REGRESSION de invariante HM: `forceIntent=client_profile`. STATE_DEPENDENT. |

## 4. Diff surface (`1f7774d7` → `50fb33e5`)

```
93404936 feat(director-ia): answer historical margin questions
9afacbec fix(director-ia): preserve historical margin source errors
1db7e005 test(director-ia): protect margin after executive status
e7e9b901 docs(director-ia): close historical margin implementation
50fb33e5 Merge branch 'implementation/director-ia-historical-margin-questions-001'
```

`git diff --stat` de routing:

| Archivo | Cambio |
|---|---|
| `lib/director-ia-conversation-state.js` | **+1**: `"historical_margin"` en `INHERITABLE_INTENTS` |
| `lib/director-ia-planner.js` | +7: detector `isHistoricalMarginQuestion` |
| `lib/director-ia-chat.js` | +34: handler in-process |
| `lib/director-ia-historical-margin.js` | +1120: módulo nuevo |

**Sin diff** en: `month-close-result.js`, `executive-cycle-composer.js`, `client-profile.js`, `commercial-trend-engine.js`, frontend chat, CEL `CEL_OVERRIDABLE_PLANNER_INTENTS`.

Asimetría del test `1db7e005`: cubre `¿Cómo vamos?` parent → margen explícito. **No** cubre `historical_margin` parent → `¿Cómo vamos?`. Esas direcciones no son equivalentes.

## 5. PASS 1 — Arqueología / baseline

### 5.1 INHERITABLE_INTENTS

Baseline: 12 intents, **sin** `historical_margin`.  
Current: los mismos 12 + `historical_margin`.

La condición ejecutada **no** es «historical_margin es inheritable» como explicación final. La condición es:

```
detected.intent === "unknown"
→ isStandaloneDetected === false
→ validInheritContext (parent ∈ INHERITABLE_INTENTS && bundleOk && !topicConflict)
→ inherit = true
→ planDirectorIaQuestion({ inheritParentIntent }) sustituye unknown
→ shouldHandleExecutiveStatus no cede si plannerIntent ∉ {unknown, plant_diagnosis, daily_executive_brief}
```

En baseline, `cual es el margen de mayo?` detecta `unknown` (no existe el detector). `reconstructFromUserHistory` **no** fija parent (unknown no es standalone inheritable). Por eso, en baseline, T3/T4 **después** de preguntas de margen **no** heredan margen.

### 5.2 FIRST_DIVERGENCE canónico (R-EXEC / R-VENTA)

| Campo | Valor |
|---|---|
| FIRST_DIVERGENCE_FUNCTION | `resolveConversationTurn` (rama `isolatedUnknown` + `validInheritContext`) |
| FIRST_DIVERGENCE_CONDITION | `parent_intent === "historical_margin"` y `detected.intent === "unknown"` |
| BASELINE_VALUE | parent no puede ser `historical_margin`; `como vamos?` → CEL true |
| CURRENT_VALUE | inherit `historical_margin`; CEL false; handler HM |
| INTRODUCED_BY_COMMIT | `93404936` |

## 6. BASELINE vs CURRENT route traces

Campos: detect, kind, standalone, inherit, plan, CEL.

### 6.1 First-turn Golden (ambos SHA idénticos salvo que HM no existe en baseline)

| ID | Pregunta | Detect / plan | CEL | Notas |
|---|---|---|---|---|
| G1 | ¿Cómo vamos? | unknown / unknown | **true** EXECUTIVE_STATUS | First-turn intacto |
| G2 | ¿Cómo cerramos? | month_close_result | false | |
| G3 | ¿Cómo quedamos contra la meta? | month_close_result | false | Routing OK; loader puede crashear (sec. 8b) |
| G4 | tendencia CASA 30d | commercial_trend | false | HUMAN_PRODUCTION_PASS |
| G5 | ¿Cómo van los comisionistas? | commercial_trend | false | |
| G6 | clientes nuevos agosto | historical_new_clients | false | HUMAN_PRODUCTION_PASS |
| G7 | ¿Qué sabemos de TORTILLERIA ERICK? | client_profile | false | HUMAN_PRODUCTION_PASS |
| G8 | kg/descuento Erick enero–fecha | client_profile | false | HUMAN_PRODUCTION_PASS |
| G9 | ¿Y GRUPO MOVE? | unknown, kind=entity_intro | false | CONTEXT_REQUIRED / EXPECTED_BEHAVIOR. No es first-turn. Contrato: parent client. Sigue en Golden Set. No abrir leading-Y. |
| G10 | ¿Y Arturo? | unknown, kind=entity_intro | false | CONTEXT_REQUIRED / EXPECTED_BEHAVIOR. No es first-turn. Contrato: parent de persona/AR o cliente según fixture. Sigue en Golden Set. No abrir leading-Y. |
| G11 | descuento abril a mayo | delta_discount | false | HUMAN_PRODUCTION_PASS |
| G12 | ¿Cómo va el margen de la planta? | financial_diagnosis | false (need EXECUTIVE_STATUS pero planner no overridable) | |

### 6.2 CONTROL_FRESH_SESSION_EXECUTIVE_STATUS

`como vamos?` sin `conversation_state` y sin history:

- detect `unknown`, inherit false, plan `unknown`, CEL **true**
- Humano tras refresh: PASS (Estado Ejecutivo)
- `FIRST_TURN_EXECUTIVE_STATUS_REGRESSION` = **NO**

## 7. Venta + descuento — arqueología (A1–A7)

Pregunta exacta: `cuanto fue la venta con su descuento por mes de febrero a abril?`

| Caso | Detect | Inherit | Plan | HTTP esperado | Clasificación |
|---|---|---|---|---|---|
| A1 BASELINE first-turn | unknown | false | unknown | 200 clarification | PREEXISTING_GAP |
| A2 CURRENT first-turn | unknown | false | unknown | 200 clarification | PREEXISTING_GAP (igual) |
| A3 CURRENT after HM success state | unknown | **true** HM | historical_margin | compare_months → 500 si fail-closed sin status | REGRESSION |
| A4 CURRENT after HM DATA_NOT_FOUND | igual A3 si state **o** history reconstruye HM | historical_margin | igual | REGRESSION |
| A5 SOURCE_ERROR stub | no se forzó live SOURCE_ERROR con auth AD; T4 sin periodo es 404 period-error. SOURCE_ERROR vs DATA_NOT_FOUND del módulo permanece en tests | — | NOT_PROVEN live |
| A6 CURRENT after ¿Cómo vamos? | unknown | true **plant_diagnosis** | plant_diagnosis | CEL no (plan no overridable para esta frase); anexo IGF probable | PREEXISTING path, no HM |
| A7 BASELINE contexto comparable (history de «margen de mayo») | unknown | **false** (margen no inheritable) | unknown | clarification | demuestra que T1→T3 **no** existía en baseline |

Semántica física:

| Término | Hallazgo |
|---|---|
| `isHistoricalMarginQuestion` | **false** |
| `isPlantFinancialKpiQuestion` | **true** (regex `descuento`) |
| `shouldAttachIgfArrAnnex` | **true** |
| Parser HM | `compare_months`, periodos **2026-02 y 2026-04** (`two_named_months`). **No** expande marzo |
| Parser client_profile `parseExplicitPeriod` | **2026-02, 2026-03, 2026-04** inclusive |
| VENTA | no es ingreso; no es margen; no hay intent `venta_descuento` en Director IA |
| DESCUENTO | KPI de planta / ARR / perfil; no es margen FINAL |
| Fuente si heredaba plant_diagnosis | anexo IGF/ARR + OpenAI (ruta preexistente, no serie mensual defendible feb–abr) |

**No** diseñar capacidad nueva. La ruta anterior defendible, si el humano la vio contestada, es **inherit de plant_diagnosis / pack ejecutivo + anexo**, no un loader de venta mensual. First-turn nunca tuvo handler propio en `1f7774d7`.

## 8. HTTP 500 trace

```
frontend DirectorIaChatPanel.consultar
  → fetchDirectorIaChat → apiFetch POST /api/director-ia/chat
  → handlePostChat
  → askDirectorIa → resolveConversationTurn → plan inherit historical_margin
  → loadHistoricalMarginForChat
  → resolveHistoricalMarginRequest → compare_months (feb, abr)
  → buildCompare / ok:false code DATA_NOT_FOUND  (status omitido)
  → buildHistoricalMarginChatResult.status = payload.status  (undefined)
  → handlePostChat: status = result.status || (result.ok ? 200 : 500)  → 500
  → apiFetch: if (!res.ok) throw Error(err.error || "HTTP 500")
```

Preguntas obligatorias:

1. ¿Falla first-turn CURRENT? **No**. Unknown clarify, `ok:true` / 200.
2. ¿Solo después de HM? **Sí** para el 500 de esta frase (o cualquier inherit HM que dispare compare_months fail-closed sin status).
3. ¿Funcionaba en BASELINE first-turn? **No** como capacidad propia. Tras plant_diagnosis, inherit diagnosis.
4. Intent/ruta previa defendible: `plant_diagnosis` + anexo IGF/ARR + OpenAI.
5. ¿Parser histórico feb–abr inclusivo? **No** en HM. **Sí** en `parseExplicitPeriod` de client_profile (otra capacidad).
6–7. Venta ≠ ingreso; descuento ≠ margen; fuente del annex = IGF/ARR, no `igf.versions` FINAL.
8. El 500 **no** es solo routing. Hay **segundo bug**: compare_months fail-closed no pone `status`; `handlePostChat` default 500. T1 single_month DATA_NOT_FOUND **sí** pone `status: 404`.
9. Excepción concreta del 500 de T3: **no hay throw** en el loader cuando el periodo se resuelve. Es mapeo HTTP. `STACK_LIVE = NOT_PROVEN`.
10. Captura: `handlePostChat` ya envía JSON; el frontend trata todo `!res.ok` como throw y **no** aplica `conversation_state` del body.
11. `STACK_LIVE = NOT_PROVEN`.
12–15. Ver sección 9.

El 500 de **meta** es **otra** excepción: `TypeError: (codes || []).map is not a function` en `loadMonthCloseResultForChat` (y la misma línea en executive-cycle-composer). Esa sí es throw, capturada en el `try/catch` de month_close (`director-ia-chat.js` ~4301) → HTTP 500 con `e.message`.

## 9. Post-error conversation_state + frontend

Archivo: `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx`.

| Hecho | Evidencia |
|---|---|
| State inicial | `useState(null)` |
| Reset | `useEffect` solo si cambia `plantaId`; remount (refresh) lo anula |
| Request | envía `conversation_state: conversationState` + `history` (messages + user actual) |
| User se pinta **antes** del fetch | `setMessages` incluye el user aunque falle |
| `apiFetch` | `if (!res.ok) throw` — descarta el JSON (incluido `conversation_state` del 404/500) |
| catch / `!res.ok` | `setError`; **no** `setConversationState` |
| Éxito | solo entonces `setConversationState(nextState)` |
| History tras fallo | **se conserva** (user turn queda) |
| Refresh | messages=[] y state=null |

Dos vectores, ambos suficientes para T4:

| Vector | ¿Aplica a T1/T2 404? | ¿Aplica si T1 fue 200? |
|---|---|---|
| V1 último `conversation_state` exitoso | No (404 no se aplica) | Sí |
| V2 `reconstructFromUserHistory` | **Sí**: T1/T2 detectan `historical_margin` standalone inheritable → `parent_intent=historical_margin` | Sí |

Probe:

| Control | incoming parent | inherit | plan | CEL | Resultado |
|---|---|---|---|---|---|
| FRESH_SESSION | null | false | unknown | true | Estado Ejecutivo |
| HM_STATE_NO_HIST | historical_margin | true | historical_margin | false | period error si loader |
| NO_STATE_HIST_T123 | reconstructed HM | true | historical_margin | false | igual |
| NO_STATE_HIST_FAILED_ONLY | reconstructed HM | true | historical_margin | false | igual (sin assistant) |
| HM + HTTP500 + como vamos | HM por V1 o V2 | true | historical_margin | false | copy T4 |
| PAGE_REFRESH | null | false | unknown | true | PASS humano |

`POST_ERROR_STATE_CONTAMINATION` = **PROVEN** (V2 seguro en la secuencia 404; V1 si hubo 200 previo).  
El HTTP 500 **no** es requisito del atrapamiento. El refresh limpia **ambos** vectores.

`delta_discount` **no** escribe `conversation_state` en `context_meta`. El frontend **conserva** el parent `client_profile` previo. Eso encadena el síntoma C.

## 10. Golden first-turn matrix

Ver 6.1. First-turn G1–G8, G11, G12 **no** se degradan por el módulo HM. G9/G10 son **CONTEXT_REQUIRED / EXPECTED_BEHAVIOR**: preguntas contextuales del Golden Set; no se clasifican como PREEXISTING_GAP por no resolver first-turn. No se abre trabajo leading-Y.

## 11. historical_margin → protected capabilities (H1–H11)

Parent realista: `historical_margin` (tras «¿Cuál fue el margen en mayo?»).

| ID | Pregunta | Detected | Inherit | Plan | CEL | CLASS |
|---|---|---|---|---|---|---|
| H1 | ¿Cómo vamos? / como vamos? | unknown | **true HM** | historical_margin | false | **REGRESSION** |
| H2 | ¿Cómo cerramos? | month_close_result | false | month_close_result | false | PROTECTED_AND_STILL_WORKING (routing). Loader: PREEXISTING_BUG aparte |
| H3 | ¿Cómo quedamos contra la meta? | month_close_result | false | month_close_result | false | igual H2 |
| H4 | tendencia CASA 30d | commercial_trend | false | commercial_trend | false | PROTECTED_AND_STILL_WORKING |
| H5 | comisionistas | commercial_trend | false | commercial_trend | false | PROTECTED_AND_STILL_WORKING |
| H6 | clientes nuevos agosto | historical_new_clients | false | historical_new_clients | false | PROTECTED_AND_STILL_WORKING |
| H7 | TORTILLERIA ERICK | client_profile | false | client_profile | false | PROTECTED_AND_STILL_WORKING |
| H8 | kg/descuento Erick | client_profile | false | client_profile | false | PROTECTED_AND_STILL_WORKING |
| H9 | descuento abril–mayo | delta_discount | false | delta_discount | false | PROTECTED_AND_STILL_WORKING |
| H10 | ¿Cómo va el margen de la planta? | financial_diagnosis | false | financial_diagnosis | false | PROTECTED_AND_STILL_WORKING (no es HM) |
| H11 | venta+descuento feb–abr | unknown | **true HM** | historical_margin | false | **REGRESSION** |

## 12. INHERITABLE_INTENT_TRANSITION_MATRIX

Parent FROM = `historical_margin`. Preguntas de fixtures ya aceptados.

| FROM | QUESTION | DETECTED | KIND | STANDALONE | INHERIT | INHERIT_PARENT | PLANNER | HANDLER | BASELINE | CURRENT | CLASSIFICATION |
|---|---|---|---|---|---|---|---|---|---|---|---|
| historical_margin | ¿Cómo vamos? | unknown | other | false | true | historical_margin | historical_margin | HM loader | CEL executive | HM period-error | **REGRESSION** |
| historical_margin | venta+descuento feb–abr | unknown | other | false | true | historical_margin | historical_margin | HM compare | unknown clarify | HM + 500 | **REGRESSION** |
| historical_margin | dame el diagnóstico de la planta | plant_diagnosis | other | true | false | — | plant_diagnosis | CEL (overridable) | igual | igual | EXPECTED_CHANGE / still working |
| historical_margin | ábreme el expediente comercial | expediente_comercial | other | true | false | — | expediente_comercial | expediente | igual | igual | PROTECTED_AND_STILL_WORKING |
| historical_margin | cómo estuvo la venta ayer? | daily_sales_deviation | other | true | false | — | daily_sales_deviation | daily sales | igual | igual | PROTECTED_AND_STILL_WORKING |
| historical_margin | cómo estuvo el descuento ayer? | daily_discount_deviation | other | true | false | — | daily_discount_deviation | daily discount | igual | igual | PROTECTED_AND_STILL_WORKING |
| historical_margin | ¿Cómo nos fue ayer? | daily_executive_brief | other | true | false | — | daily_executive_brief | daily brief | igual | igual | PROTECTED_AND_STILL_WORKING |
| historical_margin | «dame el brief ejecutivo de hoy» (no canónico) | unknown | other | false | true | historical_margin | historical_margin | HM | unknown/inherit other | HM steal | STATE_DEPENDENT / unknown-inherit (no inventar brief) |
| historical_margin | tendencia CASA 30d | commercial_trend | other | true | false | — | commercial_trend | trend | igual | igual | PROTECTED_AND_STILL_WORKING |
| historical_margin | ¿Qué sabemos de TORTILLERIA ERICK? | client_profile | other | true | false | — | client_profile | profile | igual | igual | PROTECTED_AND_STILL_WORKING |
| historical_margin | Taller Mayor canónico Puebla | taller_mayor | other | true | false | — | taller_mayor | taller | igual | igual | PROTECTED_AND_STILL_WORKING |
| historical_margin | ¿Cómo va Taller? | action_status | other | true | false | — | action_status | AR | igual | igual | PROTECTED_AND_STILL_WORKING |
| historical_margin | ¿Qué podemos recortar de apoyos? | igf_reviewable_supports | other | true | false | — | igf_reviewable_supports | IGF supports | igual | igual | PROTECTED_AND_STILL_WORKING |
| historical_margin | Prepárame para la junta de cierre. | pre_meeting_brief | other | true | false | — | pre_meeting_brief | pre-meeting | igual | igual | PROTECTED_AND_STILL_WORKING |
| historical_margin | ¿Cómo cerramos? / contra la meta? | month_close_result | other | true | false | — | month_close_result | month_close | igual | igual | routing OK; loader PREEXISTING_BUG aparte |

`delta_discount` **no** está en `INHERITABLE_INTENTS`. Tras un delta exitoso el frontend puede **seguir** enviando el parent anterior.

## 13. historical_margin own-continuity (M1–M6)

| ID | Transición | Resultado | CLASS |
|---|---|---|---|
| M1 | HM → ¿Y en mayo? | inherit HM, resolve mayo | NEW_CAPABILITY / must keep |
| M2 | commercial_trend → ¿Cuál fue el margen en mayo? | standalone HM | EXPECTED_CHANGE / protected |
| M3 | ¿Cómo vamos? / plant_diagnosis → ¿Cuál fue el margen en abril? | standalone HM (test `1db7e005`) | EXPECTED_CHANGE / protected |
| M4 | SOURCE_ERROR ≠ DATA_NOT_FOUND | `9afacbec` + tests | EXPECTED_CHANGE |
| M5 | mes abierto FORECAST labeled | módulo HM | EXPECTED_CHANGE |
| M6 | mes futuro fail-closed | módulo HM | EXPECTED_CHANGE |
| C1 | client_profile → ¿Cuál fue el margen en abril? | detect HM, **standalone false**, forceIntent `client_profile` | **REGRESSION** de invariante HM |
| C2 | client_profile longitudinal → misma pregunta | igual C1 | **REGRESSION** |
| C3 | parent efectivo client_profile tras delta_discount | igual C1 | **REGRESSION** STATE_DEPENDENT |
| C4 | commercial_trend → margen abril | standalone HM | PROTECTED |
| C5 | executive → margen abril | standalone HM | PROTECTED |

No recomendar «quitar `historical_margin` de `INHERITABLE_INTENTS`»: eso rompe M1. La recuperación debe distinguir follow-up de margen (`¿Y en mayo?`) vs unknown ejecutivo / venta / otras capacidades.

### 13.1 Cadena física del copy «ingreso actual del cliente»

1. parent `client_profile` + `active_entities` Erick.
2. `isHistoricalMarginQuestion("¿Cuál fue el margen en abril?")` = true; detect `historical_margin` 0.94.
3. `classifyTurnKind` = `other`.
4. `parseExplicitPeriod` → 2026-04 (`en abril`).
5. `isClientProfileQuestion(..., {hasActiveClient:true})` = true (meses explícitos + cliente activo).
6. `isClientProfileFollowUp` = true.
7. `profileFollowUp` = true → `standalone` false aunque detect no sea unknown.
8. inherit `client_profile`.
9. `askDirectorIa` **forceIntent = client_profile** (líneas 3647–3648), pisa el detect HM.
10. Handler real: `client_profile` + OpenAI.
11. Builder del copy: prompt de `lib/director-ia-client-profile.js` («Ingreso mensual actual del cliente NO está disponible…» / DICF vacía en esta ruta). El modelo verbaliza esa limitación como si fuera margen de abril.

`FIRST_DIVERGENCE_FUNCTION` (C1): `isClientProfileQuestion` (explicitPeriod + hasActiveClient) → `profileFollowUp` → `forceIntent` en `askDirectorIa`.  
`FIRST_BAD_COMMIT`: `93404936` (HM debía ganar y no se excluyó de profileFollowUp/forceIntent). El swallow de **unknown** con mes+cliente activo **ya existía** en baseline; ahora además pisa un detect `historical_margin`.

## 14. First divergence per regression

| ID | FIRST_DIVERGENCE_FUNCTION | FIRST_DIVERGENCE_CONDITION | BASELINE | CURRENT |
|---|---|---|---|---|
| R-EXEC | `resolveConversationTurn` isolatedUnknown + inherit; luego `shouldHandleExecutiveStatus` | parent HM && detect unknown && plannerIntent=`historical_margin` | CEL true | CEL false, HM loader, period-error |
| R-VENTA | misma rama inherit; luego `resolveHistoricalMarginRequest` + `handlePostChat` status | parent HM && unknown && mentions≥2 | unknown clarify / o plant_diagnosis si ese era el parent | compare_months + HTTP 500 |
| R-HM-PROFILE | `isClientProfileFollowUp` + `forceIntent` | parent client_profile && pregunta HM explícita | no existía HM; inherit profile de unknown | detect HM pero handler profile |
| R-METRIC-SWITCH | `resolveConversationTurn` isolatedUnknown + inherit; `resolveHistoricalMarginRequest` extrae el mes **sin** exigir `margen` | parent HM && detect unknown && pregunta nombra descuento/venta/ingreso/utilidad + mes | first-turn unknown; no hay parent HM | inherit HM; loader single_month de **margen** |

## 15. First bad commit per regression

| ID | FIRST_BAD_COMMIT | Demostración |
|---|---|---|
| R-EXEC | `93404936` | único commit que añade HM a `INHERITABLE_INTENTS`. `1db7e005` no cubre la dirección inversa. `9afacbec` / `e7e9b901` / `50fb33e5` no cambian inherit. |
| R-VENTA (routing) | `93404936` | igual. |
| R-VENTA (HTTP 500 mapping) | `93404936` (compare_months sin `status`) | no existe en baseline. Segundo bug, misma feature. |
| R-HM-PROFILE | `93404936` | forceIntent client_profile es preexistente; el fallo **nuevo** es no ceder ante detect HM. |
| R-METRIC-SWITCH | `93404936` | HM entra a INHERITABLE; el resolver de periodo acepta «agosto» sin la palabra margen. `1db7e005` no cubre switch de métrica. |
| META codes.map | `e241729e` (2026-08-24) | **antes** de HM. `git blame` L855. Diff HM = vacío. **No** FIRST_BAD de esta feature. |

## 16. Classifications (una por caso)

### PROTECTED_AND_STILL_WORKING

G1 first-turn / refresh; G2 routing; G4–G8; G11; G12; H2–H10 routing; fixtures inheritable con detect ≠ unknown; M1–M3/M4–M6; HUMAN_PRODUCTION_PASS del addendum.

### REGRESSED (`REGRESSION_COUNT = 4`; `FIRST_BAD_COMMIT = 93404936` para las 4)

1. **R-EXEC** — `¿Cómo vamos?` tras parent/history HM.  
2. **R-VENTA** — venta+descuento tras parent/history HM (routing + 500).  
3. **R-HM-PROFILE** — margen explícito tras `client_profile` (forceIntent).  
4. **R-METRIC-SWITCH** — `descuento de agosto?` (y la misma ruta para descuento/venta/ingreso/utilidad + mes) tras parent HM: detect unknown → inherit HM → loader responde **margen**. Sin HTTP 500.

### PREEXISTING_GAPS

- First-turn venta+descuento sin capacidad propia.
- Unknown no canónico tras cualquier inheritable (diseño previo; ahora dañino si el parent es HM).
- First-turn `descuento de agosto?` / `venta de abril?` / `ingreso de abril?` / `utilidad de abril?` = `unknown` en **ambos** SHA (no había detector mensual de esas frases). El GAP first-turn **no** autoriza sustituir la métrica por margen.

### PREEXISTING_BUG (aparte; no es regresión HM)

- `month_close_result` `(codes || []).map` (`e241729e`). Tarea futura separada. No mezclar con REGRESSION_COUNT.

### CONTEXT_REQUIRED / EXPECTED_BEHAVIOR

- G9 `¿Y GRUPO MOVE?` y G10 `¿Y Arturo?`: preguntas contextuales por contrato. Permanecen en el Golden Set con parent adecuado. **No** son PREEXISTING_GAP por no funcionar first-turn. No abrir leading-Y.

### NEW_CAPABILITY / EXPECTED_CHANGE

T1/T2 historical_margin; M1 follow-up `¿Y en mayo?`; M2/M3; SOURCE_ERROR vs DATA_NOT_FOUND; FORECAST abierto / futuro fail-closed.

### STATE_DEPENDENT_FAILURES

| Pregunta | Fresh | Parent HM | Parent client_profile | Parent plant_diagnosis | Post-error (history HM) |
|---|---|---|---|---|---|
| como vamos? | PASS CEL | FAIL HM | n/a (CEL si inherit diagnosis) | PASS CEL (plan plant_diagnosis overridable) | FAIL HM |
| venta+descuento feb–abr | GAP clarify | FAIL HM/500 | inherit profile | inherit diagnosis + annex | FAIL HM/500 |
| ¿Cuál fue el margen en abril? | PASS HM | inherit HM (legítimo si follow-up) | FAIL profile | PASS HM | inherit HM |
| ¿Cómo quedamos contra la meta? | routing PASS / loader puede 500 | routing PASS / mismo loader | routing PASS | routing PASS | routing PASS |
| margen de septiembre? | PASS HM FORECAST | PASS HM standalone | n/a (no probado humano) | inherit diagnosis | PASS HM |
| margen de agosto? | HM DATA_NOT_FOUND (razón live NOT_PROVEN) | igual standalone | n/a | inherit diagnosis | igual |
| descuento de agosto? | GAP unknown clarify | **FAIL** copy de margen agosto | posible profile si hay cliente | inherit diagnosis | **FAIL** margen |
| ¿Cuál fue el margen en abril? vs `margen de abril?` | ambas PASS HM | ambas PASS HM | larga forma FAIL profile; corta no humana | PASS HM | PASS HM |

### NOT_PROVEN

- `LIVE_DB = NOT_PROVEN`.
- `MAY_LIVE_DB_REASON = NOT_PROVEN`. Causa física del DATA_NOT_FOUND de mayo cerrado: no probada. No asumir NO_VERSION / NOT_FINAL / NO_PLANT_ROW / NULL_MARGIN.
- `AUGUST_DATA_NOT_FOUND_REASON = NOT_PROVEN_WITHOUT_LIVE_DB`. Causa física del DATA_NOT_FOUND de agosto cerrado: no probada. No asumir NO_VERSION / NOT_FINAL / NO_PLANT_ROW / NULL_MARGIN.
- Stack live de producción (solo reproducción de tipo / mapeo status).
- Que la venta feb–abr hubiera tenido un handler dedicado distinto de diagnosis+annex.
- Que `month_close` crashe en **todas** las plantas (requiere `db` + `planta_nombre` + `resolvePlantCodes` default).

## 17. LIVE_DB

`DATABASE_URL` unset. `.env` ausente en el workspace.

`LIVE_DB = NOT_PROVEN`

`MAY_LIVE_DB_REASON = NOT_PROVEN`

`AUGUST_DATA_NOT_FOUND_REASON = NOT_PROVEN_WITHOUT_LIVE_DB`

Routing, inherit, CEL, parsers y el TypeError de `codes` **no** requieren DB.

## 18. Test results

| Suite | Comando | Resultado |
|---|---|---|
| CURRENT `50fb33e5` | `node --test test/director-ia-*.test.js` | **1440 pass / 0 fail** (367 suites) |
| BASELINE `1f7774d7` | igual en worktree (node_modules junction) | **1411 pass / 0 fail** (359 suites). No existe `test/director-ia-historical-margin.test.js` |

`SUITE_GREEN_BUT_REGRESSION_NOT_COVERED = YES`

## 19. Missing regression-test inventory (no añadir tests ahora)

1. historical_margin parent → `¿Cómo vamos?` / `como vamos?` → CEL executive, no HM.
2. historical_margin parent → venta+descuento feb–abr → **no** HM; no 500.
3. History-only (sin echoed state) de T1/T2 404 → `como vamos?` no hereda HM, o hereda y CEL gana.
4. HTTP !ok no debe dejar el chat atrapado: state y/o history.
5. client_profile parent → `¿Cuál fue el margen en abril?` → historical_margin standalone (simétrico a `1db7e005`).
6. Tras `delta_discount` sin conversation_state outgoing, margen explícito no debe seguir forzado a profile.
7. compare_months fail-closed debe llevar `status` 404 (DATA_NOT_FOUND) no 500.
8. `resolvePlantCodes` objeto vs `(codes || []).map` en month_close (preexistente; no mezclar con HM).
9. No quitar inherit de `¿Y en mayo?` (M1) al cubrir 1–5.
10. historical_margin parent → `descuento de agosto?` / `descuento de abril?` / `venta de abril?` → **no** HM; no copy de margen.
11. `margen de septiembre?` / `margen de agosto?` siguen HM (FORECAST vs FINAL).

## 20. Recovery invariants (contrato, no código)

Evidencia a favor / refinamiento:

**RECOVERY_INVARIANT_1** — Una pregunta standalone de otra capacidad no puede quedar capturada por `historical_margin` solo porque un detector genérico produjo `unknown`. **Validado:** H1 y H11. G1 first-turn no basta.

**RECOVERY_INVARIANT_2** — `historical_margin` solo hereda follow-ups semánticamente de margen (`¿Y en mayo?`, mes nombrado **sin** otra métrica). Un mes + descuento/venta/ingreso/utilidad **no** es follow-up de margen. **Validado** M1 vs R-METRIC-SWITCH.

**RECOVERY_INVARIANT_3** — `¿Y en mayo?` tras HM debe seguir. **Validado** M1. Prohibido “sacar HM de INHERITABLE” sin reemplazo para M1.

**RECOVERY_INVARIANT_4** — `¿Cómo vamos?` recupera Estado Ejecutivo aunque el parent sea HM. **Validado** como regresión. Fresh ya pasa.

**RECOVERY_INVARIANT_5** — Un HTTP error no deja el chat atrapado en el intent anterior. **Refinado:** el 404/500 no aplica state, pero **history** rehidrata HM. Hay que cubrir V1 y V2.

**RECOVERY_INVARIANT_6** — Venta+descuento recupera la ruta/semántica **anterior si el baseline la demuestra**. Baseline first-turn = GAP. Ruta defendible = no heredar HM; si había parent diagnosis, annex IGF. **No** hardcodear feb+mar+abr como contrato HM. **No** crear capacidad nueva en la recuperación de esta regresión.

**RECOVERY_INVARIANT_7** — Ninguna corrección futura degrada capacidades demostradas (tabla PROTECTED + HUMAN_PRODUCTION_PASS + M1–M6).

**RECOVERY_INVARIANT_8** — No restaurar bugs del baseline solo por equivalencia textual (p. ej. unknown inherit de diagnosis no es semántica de venta mensual).

**RECOVERY_INVARIANT_9** — Fail-closed y autorización permanecen. No fallback latest. No recalcular margen. SOURCE_ERROR ≠ DATA_NOT_FOUND. Mes abierto FORECAST. Futuro fail-closed.

**RECOVERY_INVARIANT_10** (addendum) — Margen histórico **explícito** gana a `client_profile` / forceIntent, igual que ya gana a executive y commercial_trend.

**RECOVERY_INVARIANT_11** (addendum) — `month_close_result` permanece la ruta de «contra la meta». El TypeError de `codes` es **otro** frente, preexistente; no “arreglarlo” fingiendo que HM lo introdujo, y no dejarlo fuera del inventario.

**RECOVERY_INVARIANT_METRIC_SWITCH** — Una pregunta que nombra explícitamente una métrica distinta (descuento / venta / ingreso / utilidad / etc.) no puede heredar `historical_margin` ni cambiar en silencio la métrica a margen. Si esa métrica no está soportada: fail-closed o clarification de **esa** métrica. Nunca sustituirla por margen.

## 21. Minimal future implementation boundaries

Permitido en una **futura** tarea G1 (esta no implementa):

- Ajustar inherit/unknown vs CEL para parent HM (sin sacar M1).
- Excluir detect `historical_margin` de `profileFollowUp` / `forceIntent=client_profile`.
- Poner `status` en fail-closed compare_months / no mapear DATA_NOT_FOUND a 500.
- Política frontend de error: no reenviar parent muerto **o** no reconstruir parent HM desde turns 404 sin confirmación (contrato, no parche ahora).
- Bloquear inherit HM cuando la pregunta nombra otra métrica (descuento/venta/ingreso/utilidad) aunque detect sea unknown. Clarification/fail-closed de esa métrica, nunca margen.

Fuera de esa recuperación mínima:

- Quitar historical_margin.
- Rollback a `1f7774d7`.
- Inventar venta mensual feb–mar–abr.
- Schema / DB / deploy / voice.
- “Arreglar todo month_close” salvo como tarea aparte.

## 22. OUT_OF_SCOPE findings

Anotados, no tocados: cliente de mayor venta, rentabilidad como capacidad nueva, movers completos, folios Taller, AT-03, depósitos, tanques, baterías, voz, deploy.

`month_close` TypeError: **in-scope como hallazgo de esta auditoría**, **out-of-scope como implementación**.

## 23. PASS 2 / PASS 3 / PASS 4 — cierre de pasadas

- PASS 1: baseline worktree + diff + traces. Hecho.
- PASS 2: Golden + H1–H11 + INHERITABLE matrix + fixtures. Hecho.
- PASS 3: HTTP 500 T3, TypeError meta, frontend V1/V2, refresh. Hecho.
- PASS 4: commits, asimetría `1db7e005`, invariantes, grupos. Hecho.

## 24. Month-close matrix (addendum B)

| Caso | incoming parent | detected | standalone | inherit | planner | handler | outgoing esperado | result |
|---|---|---|---|---|---|---|---|---|
| fresh → contra la meta | null | month_close_result | true | false | month_close_result | month_close loader | month_close | routing OK; loader puede TypeError |
| ¿Cómo vamos? → contra la meta | plant_diagnosis | month_close_result | true | false | month_close_result | month_close | month_close | igual; **no** depende del pack ejecutivo |
| historical_margin → contra la meta | historical_margin | month_close_result | true | false | month_close_result | month_close | month_close | **no** robado por HM |
| post-error → contra la meta | HM reconstructed | month_close_result | true | false | month_close_result | month_close | month_close | igual |

`codes` real: objeto `{ not_found, uniqueCodes, plantCode, matchedMeta }` de `resolvePlantCodes`.  
Quién construye: `lib/commercial-trend-engine.js`.  
Quién asume array: `lib/director-ia-month-close-result.js:855` y `lib/director-ia-executive-cycle-composer.js:724`.  
Repro sin DB: `( { uniqueCodes: ["ACA"] } || [] ).map(...)` → `TypeError: (codes || []).map is not a function`.  
`STACK_LIVE = NOT_PROVEN`. `FIRST_BAD_COMMIT = e241729e`. Clasificación: **PREEXISTING_BUG** / separate future task. ¿Depende de HM? **No**. No entra en REGRESSION_COUNT.

## 25. Recuperación — tres más uno

No concluir «historical_margin rompió todo».

1. **PROTECTED_AND_STILL_WORKING** — ver §16.
2. **REGRESSED** — R-EXEC, R-VENTA, R-HM-PROFILE, R-METRIC-SWITCH. `REGRESSION_COUNT = 4`. `FIRST_BAD_COMMIT = 93404936` para las 4.
3. **PREEXISTING_GAPS** — first-turn venta+descuento; unknown no canónico; first-turn descuento/venta/ingreso/utilidad cortos. **No** incluye G9/G10. **No** incluye causa live mayo/agosto.
4. **CONTEXT_REQUIRED / EXPECTED_BEHAVIOR** — G9/G10 con parent adecuado (Golden Set).
5. **PREEXISTING_BUG** — META `codes.map` (`e241729e`); tarea futura aparte.
6. **NOT_PROVEN** — `LIVE_DB`; `MAY_LIVE_DB_REASON`; `AUGUST_DATA_NOT_FOUND_REASON`.
7. **STATE_DEPENDENT_FAILURES** — misma pregunta PASS/FAIL según parent/history/refresh (§16 y §26–§27).

## 26. Short historical_margin follow-ups (addendum)

Reloj de probe: `2026-09-01T18:00:00-06:00` (septiembre = `open_current_month`).

| Pregunta | isHM | Detect / conf | standalone | inherit after HM | plan | period | HUMAN |
|---|---|---|---|---|---|---|---|
| `margen de septiembre?` | true | historical_margin 0.94 | true | false | historical_margin | 2026-09 open FORECAST | PASS. Copy forecast + «abierto; no lo presento como cierre real». `OPEN_MONTH_FORECAST = HUMAN_PRODUCTION_PASS`. `FORECAST_LABELING = PASS`. Cifra 7.12 no es contrato. |
| `margen de abril?` | true | historical_margin 0.94 | true | false | historical_margin | 2026-04 closed | Routing PROVEN. Respuesta humana de ese turno = `NOT_PROVEN` (captura incompleta). |
| `margen de agosto?` | true | historical_margin 0.94 | true | false | historical_margin | 2026-08 closed | HUMAN: DATA_NOT_FOUND «No hay un margen histórico FINAL defendible para agosto 2026.» `AUGUST_FINAL_SOURCE = DATA_NOT_FOUND`. `AUGUST_DATA_NOT_FOUND_REASON = NOT_PROVEN_WITHOUT_LIVE_DB`. **No** concluir ausencia física. |

`HISTORICAL_MARGIN_SHORT_FOLLOWUPS = FUNCTIONAL` cuando la pregunta **nombra margen**.

Comparación con client_profile → `¿Cuál fue el margen en abril?`:

| Contexto | Pregunta | Detect | Inherit | Handler | CLASS |
|---|---|---|---|---|---|
| fresh / after HM | `margen de abril?` | historical_margin | false | HM | PROTECTED / EXPECTED_CHANGE |
| client_profile + Erick | `¿Cuál fue el margen en abril?` | historical_margin | **true profile** | client_profile + OpenAI | **REGRESSION** R-HM-PROFILE |

`STATE_DEPENDENT_MARGIN_ROUTING = PROVEN`. La misma familia «margen + mes» funciona o se contamina según el parent. HM no está roto globalmente.

## 27. EXPLICIT_METRIC_SWITCH_FROM_HISTORICAL_MARGIN (addendum)

Humano: parent `historical_margin` activo. `descuento de agosto?` → copy de **margen** agosto DATA_NOT_FOUND. **INCORRECTO**. No hubo HTTP 500.

`DESCUENTO_ABRIL_RESULT = NOT_PROVEN_FROM_SCREENSHOT`. El routing de `descuento de abril?` es el mismo que agosto.

### 27.1 Trace físico CURRENT `descuento de agosto?` tras HM

| Campo | Valor |
|---|---|
| 1 detected intent | `unknown` |
| 2 confidence | 0.35 |
| 3 turn kind | `other` |
| 4 parent_intent | `historical_margin` |
| 5 standalone | false (`isStandaloneDetected` exige intent ≠ unknown) |
| 6 isolatedUnknown | true |
| 7 validInheritContext | true (parent ∈ INHERITABLE, bundle HM, no topicConflict) |
| 8 inherit | **true** |
| 9 inherit_parent_intent | `historical_margin` |
| 10 planner intent | `historical_margin` (`inheritParentIntent` sustituye unknown) |
| 11 handler | `loadHistoricalMarginForChat` |
| 12 period resolver | `resolveHistoricalMarginRequest`: `isHistoricalMarginQuestion` = **false** (`namesMargin` exige `\bmargen\b`), pero el resolver **sí** toma `agosto` → `single_month` 2026-08 closed |
| 13 respuesta final | copy DATA_NOT_FOUND de **margen** agosto (humano). Métrica pedida = descuento. |

`isDailyDiscountDeviationQuestion` exige `ayer`. `delta_discount` exige cambio/variación. Por eso first-turn es unknown.

### 27.2 Matriz CURRENT after `historical_margin`

| Pregunta | Detect | isHM | inherit | plan | HM period | First-turn | CLASS |
|---|---|---|---|---|---|---|---|
| descuento de abril? | unknown | false | true | historical_margin | 2026-04 closed | unknown clarify | **REGRESSION** de switch (respuesta humana abril = NOT_PROVEN_FROM_SCREENSHOT; ruta PROVEN) |
| descuento de agosto? | unknown | false | true | historical_margin | 2026-08 closed | unknown clarify | **REGRESSION** (humano INCORRECTO) |
| venta de abril? | unknown | false | true | historical_margin | 2026-04 closed | unknown | **REGRESSION** de switch. Capacidad mensual first-turn = PREEXISTING_GAP |
| venta de agosto? | unknown | false | true | historical_margin | 2026-08 closed | unknown | **REGRESSION** de switch. GAP first-turn |
| ingreso de abril? | unknown | false | true | historical_margin | 2026-04 closed | unknown | **REGRESSION** de switch. GAP first-turn (ingreso actual no soportado en profile) |
| utilidad de abril? | unknown | false | true | historical_margin | 2026-04 closed | unknown | **REGRESSION** de switch. GAP first-turn |

Aunque first-turn sea PREEXISTING_GAP, **no** es aceptable que HM conteste como si el usuario hubiera preguntado margen.

### 27.3 BASELINE `1f7774d7`

| Pregunta | Fresh | After plant_diagnosis |
|---|---|---|
| margen de septiembre? | unknown | inherit plant_diagnosis |
| descuento de agosto? | unknown | inherit plant_diagnosis |
| venta / ingreso / utilidad + mes | unknown | inherit plant_diagnosis |

No existe parent `historical_margin`. First-turn de esas frases ya era GAP. Current introduce un parent que **sustituye la métrica por margen**.

`FIRST_DIVERGENCE_FUNCTION` = `resolveConversationTurn` (isolatedUnknown + inherit) + `resolveHistoricalMarginRequest` (mes sin exigir margen).  
`FIRST_BAD_COMMIT` = `93404936`.

Esto prueba que el problema **no** está limitado al estado post-HTTP 500.
