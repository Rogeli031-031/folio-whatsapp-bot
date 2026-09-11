# AUDIT-DIRECTOR-IA-HISTORICAL-MONTH-CLOSE-CODES-TYPEERROR-001

```yaml
task_id: AUDIT-DIRECTOR-IA-HISTORICAL-MONTH-CLOSE-CODES-TYPEERROR-001
outcome: DONE
mode: READ_ONLY
implementation: false
code_changes: false
commits: true
push: false
merge: false
schema_changes: false
docs_director_ia_changed: false
origin_main: "3cba82240905eff97dd7d87cab09535f801de4ba"
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
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-HISTORICAL-MONTH-CLOSE-CODES-TYPEERROR-001.md
files_not_touched:
  - lib/director-ia-month-close-result.js
  - lib/commercial-trend-engine.js
  - lib/director-ia-chat.js
  - lib/director-ia-planner.js
  - lib/director-ia-executive-cycle-composer.js
  - server.js
  - frontend-dashboard/
  - docs/director-ia/
next_task_proposed: "FIX-DIRECTOR-IA-MONTH-CLOSE-RESOLVE-PLANT-CODES-SHAPE-001"
next_task_authorized: false
next_task_executed: false
human_decision_needed:
  - "G5: aceptar o rechazar esta auditoría."
  - "Si se acepta: autorizar un FIX que consuma uniqueCodes del contrato de resolvePlantCodes. No merge. No push main. No deploy."
```

## AUDIT_RESULT

C1_INTENT: month_close_result
C1_ROUTE: detectDirectorIaIntent → isMonthCloseQuestion (closeCue+monthCue / `como cerr`) → plan.intent=month_close_result → director-ia-chat.js month_close_result in-process → loadMonthCloseResultForChat
C1_TOOL_OR_LOADER: loadMonthCloseResultForChat (tool id get_month_close_result, executor igual)
C1_SOURCE: no llega a fuente histórica; TypeError en resolución de plant codes

TYPEERROR_FILE: lib/director-ia-month-close-result.js
TYPEERROR_FUNCTION: loadMonthCloseResultForChat
TYPEERROR_LINE_OR_SIGNATURE: L851-855; throw en L855 `codesUpper = (codes || []).map((c) => String(c).toUpperCase())`

CODES_PRODUCER: lib/commercial-trend-engine.js `resolvePlantCodes(client, empresa)`
CODES_CONSUMER: lib/director-ia-month-close-result.js `loadMonthCloseResultForChat` (default `opts.resolvePlantCodes || resolvePlantCodes`). Chat no inyecta `resolvePlantCodes` ni `plantCodesUpper` (lib/director-ia-chat.js L5159-5179)
CODES_EXPECTED_TYPE: el consumidor trata `codes` como `Array` (implícito por `.map`)
CODES_ACTUAL_TYPE: object
CODES_ACTUAL_SHAPE: `{ not_found: boolean, uniqueCodes: string[], plantCode: string, matchedMeta: object[] }`
CODES_ACTUAL_EXAMPLE: `{ not_found: false, uniqueCodes: ["E3","ACA"], plantCode: "E3", matchedMeta: [{ prov_name: "Acapulco", ap_plant_code: "E3", clave: "E3" }] }`

WHY_OR_EMPTY_ARRAY_GUARD_FAILS: `codes || []` solo sustituye null/undefined/0/"" /false. Un object truthy se queda. `typeof codes === "object"` y `Array.isArray(codes) === false`, por eso no tiene `.map`.

FIRST_DIVERGENCE: L854-855 de `loadMonthCloseResultForChat`. El productor nunca devolvió array. Los consumidores correctos (`director-ia-client-profile.js` L1374-1383, `director-ia-commercial-trend.js` L838-848) leen `codes.uniqueCodes`. month_close no.

HISTORICAL_SOURCE: si se superara codes, el pack mezclaría ARR `arr.ventas_diarias_cliente` (ACTUAL comercial), `igf_meta.meta_lines` (TARGET_COMMITMENT), `igf.compromiso_lines` vía `loadIgfCommitSnapshot` (FORECAST / latest version), y `loadFinancialActualEvidence` (ACTUAL_FINANCIAL solo FINAL). C1 LIVE no llega ahí.
HISTORICAL_STATE_FIELD: `igf.versions.financial_state` solo para financial.actual. El snapshot forecast de month_close no filtra FINAL.
HISTORICAL_PERIOD_RULE: `resolveCloseMonth` + `parseCloseMonth`: nombre de mes explícito; año = año CDMX de `now` salvo mes > mes actual → año-1. now=2026-09-10 + "agosto" → 2026-08, `periodStatus=COMPLETE`.
HISTORICAL_VERSION_RULE: target = `pickCurrentMetaVersion` (`is_current`). forecast = `ORDER BY version_number DESC LIMIT 1` del YYYY-MM GLOBAL. actual = única fila `financial_state='FINAL'` GLOBAL del YYYY-MM.

FINAL_SUPPORTED: sí en contrato del loader (`FINANCIAL_ACTUAL_CODES.SUPPORTED` + `truth_class=ACTUAL_FINANCIAL`). Sin LIVE_DB no se afirma que agosto Acapulco tenga FINAL.
FORECAST_SUPPORTED: sí (`truth_class=FORECAST` vía commit snapshot latest). No es MINI_FORECAST_PROY.
NOT_FINAL_SUPPORTED: sí (`FINANCIAL_ACTUAL_NOT_FINAL` si hay versions y ninguna FINAL).
DATA_NOT_FOUND_SUPPORTED: parcial. Hay `MISSING_FOR_PERIOD` / limitations `sales_actual_unavailable`. El TypeError aborta antes y chat lo reporta como 500 (`month_close_result load error`).

CURRENT_MINI_BLOCKED_FOR_AUGUST: YES. C1 no entra a `selectIgfStatusSourceMode`. month_close no llama mini PROY. Si C1 fuera igf_status, el selector daría `NEVER_CURRENT_MINI` / `PAST_MONTH` 2026-08.
SEPTEMBER_MINI_USED: NO para C1/C2/C3/C4. YES para C5 (`MINI_FORECAST_PROY` / `CURRENT_OPEN_MONTH_CURRENT_STATE` 2026-09).
SOURCE_SELECTION_REGRESSION: NO. 22e7e22d no tocó month_close ni `resolvePlantCodes`. Solo adelantó `isIgfStatusFinancialSnapshotQuestion` en el planner y cableó mini para igf_status del mes abierto.

C1_REPRODUCED: YES. TypeError `(codes || []).map is not a function`. now=2026-09-10. planta stub Acapulco. `resolvePlantCodes` stub = contrato real del engine.
C2_REPRODUCED: NO. Intent `igf_status` (`igf_financial_snapshot`). No entra al `.map` de month_close. Source `NEVER_CURRENT_MINI`.
C3_REPRODUCED: NO. Intent `igf_status`. Source `NEVER_CURRENT_MINI`. Test existente S7 PASS (no usa mini de septiembre).
C4_REPRODUCED: YES. Misma ruta que C1. closeMonth 2026-07 COMPLETE. Mismo TypeError.
C5_CURRENT_MONTH_STILL_PASS: YES. Intent `igf_status`. Source `MINI_FORECAST_PROY`. Suite `test/director-ia-rentabilidad-current-month-forecast-source.test.js` 61/61 PASS.

PREEXISTED_BEFORE_22E7E22D: YES. `(codes || []).map` nació en `e241729e` (month_close) / `77592e61` (composer). 22e7e22d no toca esas líneas.
INTRODUCED_BY_22E7E22D: NO
EXPOSED_BY_22E7E22D: NO para C1. "¿Cómo cerramos agosto?" ya era `month_close_result` antes del FIX. El FIX no abrió esta ruta; C2/C3 ya eran `igf_status`.

CAN_FIX_WITHOUT_NEW_SQL: YES
CAN_FIX_WITHOUT_NEW_TOOL: YES
CAN_FIX_WITHOUT_SERVER_CHANGE: YES
CAN_FIX_WITHOUT_FRONTEND_CHANGE: YES

CORRECT_CONTRACT_FOR_CODES: object `{ not_found: boolean, uniqueCodes: Array<string>, plantCode: string, matchedMeta?: Array }`. La lista usable es `uniqueCodes`. `not_found === true` o `uniqueCodes.length === 0` ⇒ sin códigos ARR (limitation / DATA_NOT_FOUND), no TypeError.
RECOMMENDED_NORMALIZATION_POINT: inmediatamente después de `await resolveCodes(...)` en `loadMonthCloseResultForChat` (L854). Hermano latent: `loadOnePlantBlock` en `lib/director-ia-executive-cycle-composer.js` L723-724. C1 no usa el composer (`isFinalCloseCue` excluye pre_close).
RECOMMENDED_MINIMAL_FIX_SURFACE: alinear month_close (y opcionalmente composer) al consumo de client-profile/commercial-trend: `const list = (resolved && resolved.uniqueCodes) || []`. Prohibido `Array.isArray(codes) ? codes : []`: eso vaciaría `uniqueCodes` y fingiría planta sin códigos.

ROUTING_BUG: NO (C1). C2 es `isMonthCloseQuestion=true` pero el planner gana con igf_status por `resultado final`; no es el crash.
SOURCE_BUG: NO (el crash es anterior a FINAL/FORECAST)
DATA_BUG: NO
TYPE_SHAPE_BUG: YES
PRESENTATION_BUG: NO

FILES_INSPECTED:
- lib/director-ia-month-close-result.js
- lib/commercial-trend-engine.js
- lib/director-ia-chat.js
- lib/director-ia-planner.js
- lib/director-ia-executive-cycle-composer.js
- lib/director-ia-client-profile.js
- lib/director-ia-commercial-trend.js
- lib/director-ia-financial-actual.js
- lib/director-ia-igf-arr.js
- lib/director-ia-tools.js
- lib/director-ia-historical-margin.js
- test/director-ia-month-close-result.test.js
- test/director-ia-rentabilidad-current-month-forecast-source.test.js

TESTS_RUN:
- stub READ_ONLY `tmp-audit-month-close-codes-repro.js` (no commiteado; borrado): C1/C4 TypeError; C2/C3/C5 routing+source
- `node --test test/director-ia-month-close-result.test.js` → 27 PASS (inyectan `plantCodesUpper: ["PUE"]` y no ejercitan el producer)
- `node --test test/director-ia-rentabilidad-current-month-forecast-source.test.js` → 61 PASS (C5 mini; S7 agosto NEVER_CURRENT_MINI)

RISKS:
- Tests month_close actuales ocultan el bug al pasar array listo.
- Un `Array.isArray` ciego pierde venta ARR real.
- Composer tiene el mismo shape bug; no es C1.
- Sin LIVE_DB no se afirma FINAL de agosto Acapulco.

RECOMMENDED_NEXT_SLICE: FIX-DIRECTOR-IA-MONTH-CLOSE-RESOLVE-PLANT-CODES-SHAPE-001 — consumir `uniqueCodes`/`not_found` en `loadMonthCloseResultForChat`. No reabrir MINI_FORECAST_PROY. No tocar source selector del mes abierto. Cubrir C1/C4 con stub del contrato object. Revisar composer como follow-up, no como este crash.

## Trace C1 (nombres físicos)

¿Cómo cerramos agosto?
→ `planDirectorIaQuestion` / `detectDirectorIaIntent` (`lib/director-ia-planner.js`)
→ `isIgfStatusFinancialSnapshotQuestion` = false (no rentabilidad / no resultado final / no utilidad operativa)
→ `isPreCloseQuestion` = false (`isFinalCloseCue` / `\bcomo cerramos\b`)
→ `isHistoricalMarginQuestion` = false (no margen)
→ `isMonthCloseQuestion` = true (`lib/director-ia-month-close-result.js` L139-196)
→ intent `month_close_result` evidence `month_close_compose`
→ `director-ia-chat.js` L5159 `loadMonthCloseResultForChat`
→ `resolveCloseMonth` → 2026-08 explicit, `periodStatus=COMPLETE`
→ `resolvePlantCodes` (engine) → object
→ `(codes || []).map` L855 → TypeError
→ chat L5181-5187 status 500

No MINI_FORECAST_PROY. No source selector de igf_status.

## Fronteras `codes`

| FUNCTION | INPUT_SHAPE | OUTPUT_SHAPE | CODES_TYPE | CODES_EXAMPLE |
| --- | --- | --- | --- | --- |
| `resolvePlantCodes` | `(client, empresa:string)` | object | object | `{ not_found:false, uniqueCodes:["E3"], plantCode:"E3" }` |
| `loadMonthCloseResultForChat` L854-855 | object del engine | TypeError | expected array | no llega a `codesUpper` |
| `loadClientProfile` L1374-1383 | mismo object | `string[]` via `.uniqueCodes` | Array<string> | `["E3"]` |
| `loadCalendarCompare` L838-848 | mismo object | `string[]` via `.uniqueCodes` | Array<string> | `["E3"]` |
| `loadOnePlantBlock` L723-724 | mismo object | TypeError latent | expected array | no es C1 |

## Preguntas de control (now=2026-09-10)

| ID | Pregunta | intent | entra month_close `.map` | source si igf_status |
| --- | --- | --- | --- | --- |
| C1 | ¿Cómo cerramos agosto? | month_close_result | YES TypeError | n/a (selector hipotético NEVER_CURRENT_MINI 2026-08) |
| C2 | ¿Cuál fue el resultado final de agosto? | igf_status | NO | NEVER_CURRENT_MINI 2026-08 |
| C3 | ¿Qué rentabilidad tuvimos en agosto? | igf_status | NO | NEVER_CURRENT_MINI 2026-08 |
| C4 | ¿Cómo cerramos julio? | month_close_result | YES TypeError | n/a |
| C5 | ¿Qué rentabilidad tenemos? | igf_status | NO | MINI_FORECAST_PROY 2026-09 |

Misma ruta rota: solo C1 y C4 (`como cerramos` + mes nombrado, sin cue igf_status).

## Causalidad 22e7e22d

`22e7e22d` files: `lib/director-ia-chat.js` (mini PROY igf_status), `lib/director-ia-planner.js` (mover snapshot IGF más arriba), tests/docs. Cero hunks en month-close o `resolvePlantCodes`.

C1 no depende de ese reorder. EXPOSED ≠ INTRODUCED; aquí tampoco EXPOSED por código.

## Invariante temporal

C1 no usa mini de septiembre. C5 sigue PASS por MINI_FORECAST_PROY. No reabrir ese FIX.
