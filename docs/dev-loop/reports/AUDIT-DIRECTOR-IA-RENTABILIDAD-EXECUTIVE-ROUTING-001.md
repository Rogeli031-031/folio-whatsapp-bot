# AUDIT-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001"
outcome: "DONE"
mode: "READ_ONLY"
implementation: false
source_code_changed: false
test_code_changed: false
sql_changed: false
live_db: false
base_main_sha: "f5f150f28b30f2cdd12b8caacea4be1c51d899dd"
head_sha_at_start: "74ce1fd38fdb913085dee37dfd4ea2e0c54ef1e2"
branch: "audit/director-ia-rentabilidad-executive-routing-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions:
  - "La evidencia LIVE (CASA/COMISIONISTA/OLS/30d/UP) no es el resultado físico de S1 aislada en este HEAD. S1 aislada aborta a clarificación unknown. El shape comercial LIVE coincide con CEL EXECUTIVE_STATUS (S4 / Q2 / ¿Cómo vamos?) o con inherit commercial_trend. No se pudo reproducir LIVE_DB/Render."
deviations_from_current_task: []
next_task_proposed: "FIX-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. No implementación en esta tarea. El FIX propuesto no está autorizado. Decidir si S1 aislada debe ir a get_igf_snapshot (igf_status) y si CEL debe dejar de inyectar TREND 30d cuando la pregunta nombra rentabilidad. Confirmar si la sesión LIVE tenía conversation_state heredado o una variante con «cómo»."
```

## Hallazgo

`¿Qué rentabilidad tenemos?` **no entra** a `commercial_trend` en el planner. `isCommercialTrendQuestion` es false. Ninguna regla del planner consume la palabra `rentabilidad` salvo deterioro (`deterioro`/`provocando`) o gastos ambiguos.

La palabra **sí** la detectan detectores IGF ya existentes:

- `PLANT_FINANCIAL_KPI_RE` / `isPlantFinancialKpiQuestion` → true
- `IGF_SIGNAL_RE` / `isIgfForecastQuestion` → true (S1, S2, S3, S6, S7, S8)
- `shouldAttachIgfArrAnnex` → true
- `resolveDirectorIaChatRouting` (legado) → `promptMode: igf_arr_focused`

Esos detectores **no están en la cadena Fase 2**. `detectDirectorIaIntent` devuelve `unknown` / `no_rule_matched`. `askDirectorIa` aborta en el short-circuit de unknown sin inherit y **nunca llega** al fallback `isPlantFinancialKpiQuestion` → `loadIgfArrAnnexForChat`.

FIRST_DIVERGENCE (S1 aislada):

```
question
→ classifyConversationalIntent = null
→ detectUnsupportedDirectorIaDomain = null
→ detectDirectorIaIntent = unknown (no_rule_matched)   ← AQUÍ
→ resolveExecutiveNeed = no_need
→ shouldHandleExecutiveStatus = false
→ unknown && !inherit → buildUnknownClarificationResult
```

`isCommercialTrendQuestion` se evalúa en planner L579 **antes** de `igf_status`/`financial_diagnosis`, pero **no mata** S1: no hay canal, no hay rango 30/90, no hay cue de tendencia.

## Por qué el shape LIVE es comercial

`commercial_trend` **no gana** S1 aislada.

El shape CASA / COMISIONISTA / toneladas / Pendiente OLS / UP / rango 30 días es el pack CEL `EXECUTIVE_STATUS`:

- `handleExecutiveStatusForChat` carga tendencia con `channel: "both"`, `range_days: 30`, `compare: true` (hardcode).
- `resolveCommercialTrendSlots` default: `range_days = 30`, `channel = "both"` si el intent `commercial_trend` sí corre.
- Jerarquía del pack: SITUATION → MAGNITUDE → **TREND** → …
- El addendum de rentabilidad (`util_oper_importe` / `resultado_final_importe`) es **prompt**, no routing.

S4 (`¿Cómo estamos de rentabilidad?`) **sí** entra a CEL: `como` + `estamos` = `hasExecutiveStatusCue`. Planner sigue `unknown` (overridable). CEL gana y **siempre** inyecta TREND 30d.

Otras rutas que producen el mismo shape:

- `¿Cómo vamos?` / Q2 `¿Cómo va la rentabilidad de Acapulco este mes?` → CEL
- S1 con `inheritParentIntent: commercial_trend` → intent `commercial_trend` (unknown + inherit)

S1 con inherit `plant_diagnosis` va al pack de planta (IGF + commercial_state + ARR + AR + bitácora), **no** OLS 30d.

UI: `DirectorIaChatPanel` inicia `conversation_state = null`. Primer turno aislado de S1 = clarificación, no CASA/OLS.

## Semántica vs código

| Término humano | Qué existe hoy |
|---|---|
| rentabilidad genérica | No hay intent. Detector KPI huérfano. |
| utilidad operativa | `util_oper_importe` (MXN) y `util_oper_kg` ($/kg). Almacenados. |
| resultado final | `resultado_final_importe` / `resultado_final_kg`. Almacenados. |
| margen | `margen_kg` ($/kg). ≠ rentabilidad. |
| venta | `venta_ton` (ton). ≠ rentabilidad. |
| descuento/comisiones | `com_desc_kg` ($/kg). ≠ margen. |
| gasto operativo | **DATA_NOT_FOUND**. `gasto_kg` existe y el runtime dice que **no entra** a la fórmula. |
| ingreso | **DATA_NOT_FOUND** como campo IGF. Hay un “ingreso aprox. cruzado” ARR×IGF en texto del anexo; no es campo. |
| gasto total | **DATA_NOT_FOUND**. |
| gasto corporativo | `gtos_apoyos_corp_kg` ($/kg). No es el único subtract después de utilidad. |

## Periodo / versión IGF (ya existente; no inventado)

Pregunta genérica sin mes nombrado: `resolveYearMonthFromQuestion` + `currentYearMonthCdmx()` → **2026-09** (hoy 2026-09-09).

Versión: `loadIgfCommitSnapshot` toma `igf.versions` `plant_code='GLOBAL'` del year/month, `ORDER BY version_number DESC LIMIT 1`. **No** filtra `financial_state`.

`financial_state` FORECAST/FINAL/SUPERSEDED existe en `lib/igf-financial-final.js`. El loader de chat IGF **no lo consulta**. No hay regla “FINAL si el mes está cerrado” en `get_igf_snapshot`.

CEL, si corre, usa `FORECAST_PROJECTION` del mini IGF (cutoff), no el stored de `compromiso_lines` como forecast autoritativo.

## Fórmulas

Catálogo: `formula_role` es referencia semántica. `extractIgfComposition` **no recalcula**.

`util_oper_kg` = `stored_subtotal`. `resultado_final_kg` = `stored_total`. `gasto_kg` = “no entra a la fórmula de utilidad/resultado”.

UTILIDAD OPERATIVA = INGRESO − GASTO OPERATIVO → **NOT_PROVABLE** (faltan ambos operandos nombrados; utilidad es stored).

RESULTADO FINAL = UTILIDAD OPERATIVA − GASTO CORPORATIVO → **NOT_PROVABLE** (resultado es stored; después de utilidad restan también `bancos_corp_kg`, `otros_programas_kg`, `inversiones_kg`).

## North Star (probe 2026-09-09, sin DB)

Todos: `isCommercialTrendQuestion=false`, `isPlantFinancialKpiQuestion=true`, `shouldAttachIgfArrAnnex=true`, legado `igf_arr_focused`, periodo fallback 2026-09.

S5: `isIgfForecastQuestion=false` porque `IGF_SIGNAL_RE` exige `util(?:idad)?\s+oper\b` y “operativa” no tiene boundary tras `oper`. Sigue siendo KPI por `\butilidad\b`.

---

AUDIT_RESULT:

S1_CURRENT_INTENT:
unknown (evidence=no_rule_matched). Isolated first turn: clarification. NOT commercial_trend.

S1_CURRENT_ROUTE:
askDirectorIa → detectDirectorIaIntent unknown → resolveExecutiveNeed no_need → unknown abort L4120 → buildUnknownClarificationResult. Legacy isPlantFinancialKpiQuestion never reached.

S1_CURRENT_TOOL:
none (unknown plan: domains=[], tools=[])

S1_CURRENT_SOURCE:
none on isolated S1. Detector huérfano would have been igf.compromiso_lines via loadIgfArrAnnexForChat / get_igf_snapshot.

S1_CURRENT_PERIOD:
none emitted (clarification). IGF fallback if the KPI path ran: CDMX current month = 2026-09.

S1_FIRST_DIVERGENCE:
detectDirectorIaIntent returns unknown because no planner rule consumes bare «rentabilidad». The existing detector is isPlantFinancialKpiQuestion / IGF_SIGNAL_RE, unused by Fase 2. commercial_trend is not the winner.

WHY_COMMERCIAL_TREND_WINS:
It does not win isolated S1. isCommercialTrendQuestion is false (no CASA/COMISIONISTA, no 30/90 días, no tendencia/cómo vamos/subiendo). The LIVE CASA/OLS/30d/UP shape is CEL EXECUTIVE_STATUS, which hardcodes loadCommercialTrendForChat({channel:"both", range_days:30}) for status-cued questions (S4, ¿Cómo vamos?, Q2). Alternate: inherit parent_intent=commercial_trend on unknown S1. «rentabilidad» never selects get_commercial_trend; «cómo» / inherit does.

S2_CURRENT_INTENT:
unknown → isolated clarification. Same hole as S1. Acapulco is UI/scope, not a planner intent.

S3_CURRENT_INTENT:
unknown → isolated clarification.

S4_CURRENT_INTENT:
planner unknown; CEL EXECUTIVE_STATUS wins (como+estamos). Route=handleExecutiveStatusForChat. Tools/loaders=loadPlantDiagnosisForChat + loadCommercialTrendForChat(30d,both) + IGF mini. Source mix=plant pack + OLS CASA/COMISIONISTA. Period TREND=trailing 30d; IGF/ARR=mes CDMX/ensamblado. Shape=SITUATION/MAGNITUDE/TREND (CASA/COMISIONISTA/OLS/UP|DOWN). Prompt addendum names util_oper_importe but does not bind routing.

S5_CURRENT_INTENT:
unknown → isolated clarification. isPlantFinancialKpi=true (utilidad). isIgfForecast=false (regex oper\\b vs operativa).

S6_CURRENT_INTENT:
unknown → isolated clarification. isIgfForecast=true (resultado final). No financial_diagnosis (needs caída/diagnóstico/margen+planta).

S7_CURRENT_INTENT:
unknown → isolated clarification. isIgfForecast=true (rentabilidad).

S8_CURRENT_INTENT:
unknown → isolated clarification. isIgfForecast=true (rentabilidad).

EXPECTED_EXECUTIVE_INTENT:
igf_status (or financial_diagnosis snapshot, not deterioro). Not commercial_trend. Not CEL TREND-led EXECUTIVE_STATUS.

EXPECTED_TOOL:
get_igf_snapshot (executor loadIgfArrAnnexForChat)

EXPECTED_SOURCE:
igf.compromiso_lines (IGF_COMPOSITION_SOURCE). Optional CEL mini FORECAST_PROJECTION for open month — already exists; not a new source.

IGF_CURRENT_PERIOD_RULE:
resolveYearMonthFromQuestion(question, currentYearMonthCdmx()). No named month → mes calendario CDMX vigente. Not trailing 30 days. Not MAX(fecha).

IGF_CURRENT_VERSION_RULE:
loadIgfCommitSnapshot: latest version_number for GLOBAL year/month. Not financial_state.

IGF_FINAL_VS_FORECAST_RULE:
NOT USED by chat IGF snapshot. igf-financial-final.js has FORECAST/FINAL/SUPERSEDED; Director IA chat does not read it. CEL open-month magnitudes prefer FORECAST_PROJECTION mini, not FINAL, not ACTUAL_FINANCIAL.

OPERATING_PROFIT_FIELD:
util_oper_importe (headline MXN); util_oper_kg (composition $/kg)

OPERATING_PROFIT_UNIT:
MXN / $/kg

OPERATING_EXPENSE_FIELD:
DATA_NOT_FOUND / n.d. (gasto_kg exists, unit $/kg, formula_role=none; runtime: does not enter utilidad/resultado)

OPERATING_EXPENSE_UNIT:
n.d. (gasto_kg is $/kg if used as “Gasto”, not “gasto operativo”)

INCOME_FIELD:
DATA_NOT_FOUND / n.d. (annex may print “Ingreso aprox. cruzado” ARR×margen/desc/HG; not an IGF column)

INCOME_UNIT:
n.d.

CORPORATE_EXPENSE_FIELD:
gtos_apoyos_corp_kg

CORPORATE_EXPENSE_UNIT:
$/kg

TOTAL_EXPENSE_FIELD:
DATA_NOT_FOUND / n.d.

TOTAL_EXPENSE_UNIT:
n.d.

FINAL_RESULT_FIELD:
resultado_final_importe (headline MXN); resultado_final_kg (composition $/kg)

FINAL_RESULT_UNIT:
MXN / $/kg

SALES_VOLUME_FIELD:
venta_ton

SALES_VOLUME_UNIT:
ton

MARGIN_FIELD:
margen_kg

MARGIN_UNIT:
$/kg

DISCOUNT_FIELD:
com_desc_kg

DISCOUNT_UNIT:
$/kg

TAX_FIELD:
impuesto_kg

TAX_UNIT:
$/kg

HG_FIELD:
hg_kg (also hg_pct, unit %)

HG_UNIT:
$/kg

OPERATING_PROFIT_FORMULA_PROVABLE:
NOT_PROVABLE

FINAL_RESULT_FORMULA_PROVABLE:
NOT_PROVABLE

ALL_REQUIRED_FIELDS_AVAILABLE:
NO (missing named ingreso, gasto operativo, gasto total). Headline utilidad operativa + resultado final + venta/margen/desc/impuesto/HG/gtos corp YES.

EXISTING_TOOL_ALREADY_HAS_REQUIRED_FIELDS:
PARTIAL — get_igf_snapshot already emits stored util_oper_* and resultado_final_* plus composition allowlist. Does not have ingreso or gasto_total.

EXISTING_SOURCE_ALREADY_HAS_REQUIRED_FIELDS:
PARTIAL — igf.compromiso_lines allowlist as above. Do not invent ingreso.

CAN_FIX_WITHOUT_NEW_SQL:
YES

CAN_FIX_WITHOUT_NEW_TOOL:
YES

CAN_FIX_WITHOUT_PLANNER_CHANGE:
YES if (1) CEL stops treating rentabilidad-named questions as EXECUTIVE_STATUS or stops leading with TREND and (2) askDirectorIa consults isPlantFinancialKpiQuestion before the unknown abort. S4 cannot be fixed by planner-only silence: CEL intercepts unknown+status before that abort.

CAN_FIX_WITHOUT_SERVER_CHANGE:
YES

S1_EXPECTED_SHAPE:
Acapulco — IGF vigente de septiembre 2026. Utilidad operativa $X (Ingreso n.d.; Gastos operativos n.d. unless gasto_kg is explicitly shown as «Gasto» stored, not operativo). Resultado final $Y (Gastos corporativos gtos_apoyos_corp_kg; Gasto total n.d.). Variables: venta_ton, margen_kg, com_desc_kg, impuesto_kg, hg_kg. No CASA/OLS/30d. No causalidad.

S5_EXPECTED_SHAPE:
Same plant/period IGF. Lead with util_oper_importe / util_oper_kg. Do not answer from commercial trend. Ingreso/gasto operativo n.d. if not physical.

S6_EXPECTED_SHAPE:
Same plant/period IGF. Lead with resultado_final_importe / resultado_final_kg. Do not equate to utilidad operativa. Gasto total n.d.

ROUTING_BUG:
YES — semantic mismatch: rentabilidad genérica no tiene intent IGF; S4 cae a pack comercial.

PRE_ROUTING_BUG:
YES — CEL shouldHandleExecutiveStatus steals S4; unknown abort blocks legacy igf_arr_focused for S1–S3/S5–S8.

PRECEDENCE_BUG:
YES — planner never consumes rentabilidad; CEL TREND hierarchy precedes IGF focus addendum; unknown gate precedes isPlantFinancialKpiQuestion.

PLANNER_BUG:
YES — no rule for generic rentabilidad / utilidad operativa / resultado final. igf_status only if \\bigf\\b. financial_diagnosis only deterioro/caída/diagnóstico.

TOOL_SELECTION_BUG:
NO on isolated S1 (no tool). YES on S4/CEL (loads commercial trend 30d as primary verbal shape).

SOURCE_BUG:
NO — IGF source exists. Wrong route, not missing table.

DATA_BUG:
NO for headline utilidad/resultado stored. YES/n.d. for ingreso, gasto operativo nombrado, gasto total.

PRESENTATION_BUG:
YES on CEL path — GPT can verbalize TREND CASA/OLS despite rentabilidad addendum.

FIRST_PHYSICAL_FUNCTION_TO_FIX:
detectDirectorIaIntent (lib/director-ia-planner.js) — first drop of rentabilidad. For LIVE commercial shape: handleExecutiveStatusForChat (lib/director-ia-chat.js L3392) hardcoded 30d trend, gated by shouldHandleExecutiveStatus.

MINIMAL_FIX_SURFACE:
Either: map rentabilidad/utilidad operativa/resultado final → igf_status in detectDirectorIaIntent (non-overridable by CEL) and let legacy igf_arr_focused / get_igf_snapshot run; OR CEL exclude those questions from EXECUTIVE_STATUS / TREND lead PLUS askDirectorIa KPI gate before unknown abort. Do not add SQL, tool, or server.js. Do not invent ingreso. Do not treat gasto_kg as gasto operativo.

FILES_INSPECTED:
AGENTS.md
docs/dev-loop/LOOP_PROTOCOL.md
docs/dev-loop/CURRENT_TASK.md
lib/director-ia-planner.js
lib/director-ia-commercial-trend.js
lib/director-ia-igf-arr.js
lib/director-ia-chat.js
lib/director-ia-conversational-executive-layer.js
lib/director-ia-tools.js
lib/director-ia-tool-orchestrator.js
lib/director-ia-client-profile.js
lib/director-ia-capabilities.js
lib/director-ia-plant-diagnosis.js
lib/director-ia-mejora-continua.js
lib/igf-financial-final.js
lib/director-ia-rentabilidad-deterioro-snapshot.js
frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx
test/director-ia-sprint1-core-conversational-recovery.test.js
test/director-ia-conversational-executive-status.test.js

TESTS_RUN:
Ad-hoc node probe (read-only, no DB) of S1–S8 + inherit commercial_trend/plant_diagnosis + Q2/¿Cómo vamos? against planner, CEL, isCommercialTrendQuestion, isPlantFinancialKpiQuestion, resolveDirectorIaChatRouting, resolveYearMonthFromQuestion. No product suite. No LIVE_DB.

RISKS:
Isolated S1 on this HEAD clarifies; LIVE CASA/OLS may be S4/CEL, inherit, or a cómo-variant. Cannot confirm Render. Fixing only planner without CEL still leaves S4 on TREND. Fixing only CEL without the unknown/KPI gate leaves S1 as clarification. Do not reconstruct ingreso. Do not use commercial_state as rentabilidad.

RECOMMENDED_NEXT_SLICE:
FIX-DIRECTOR-IA-RENTABILIDAD-EXECUTIVE-ROUTING-001 — not authorized. Wire generic rentabilidad / utilidad operativa / resultado final to get_igf_snapshot for current CDMX month latest IGF version; stop CEL 30d CASA/OLS from leading those questions. Tests S1–S8. No new SQL/tool/server. No formula rewrite.
