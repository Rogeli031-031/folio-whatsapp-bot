# Reporte — IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001

```yaml
task_id: "IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
architecture: "B_shared_executive_cycle_composer"
first_slice: "B_multi_plant_pre_close"
decision_needed: "C_structured_gaps_plus_gpt_wording"
implementation: true
schema_changes: false
sql_changes: false
matrix_changes: false
actual_financial_in_pre_close: false
commitment_store: false
scenario_store: false
what_if: false
council_runtime: false
live_copilot_runtime: false
focal_tests: "30/30"
director_ia_suite: "1058/0/0"
git_diff_check: "clean"
next_task_proposed: "AUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "lib/director-ia-executive-cycle-composer.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-tools.js"
  - "test/director-ia-pre-close-steering.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "sql/"
  - "schema"
  - "server.js"
  - "frontend-dashboard/"
  - "vba/"
  - "lib/director-ia-financial-actual.js"
contracts_modified: []
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## 1. Architecture B implementation

Se implementó un **composer compartido** en `lib/director-ia-executive-cycle-composer.js`.

- Superficie de chat: sigue siendo `pre_meeting_brief` (sin intent `pre_close` nuevo).
- `cycle_mode=PRE_CLOSE` solo.
- `month_close_result` permanece separado (sello / FINAL).
- El brief clásico de junta (`loadPreMeetingBriefForChat`) se conserva para pre-cierre genérico.
- Slots futuros: `commitment_ref`, `scenario_ref`, `lesson_ref` = `null`. `council_runtime=false`. `live_copilot_runtime=false`. `future_chain=TARGET>FORECAST>COMMITMENT>FINAL>LESSON>ACTION`.

No se rediseñó el ARCH. No store. No what-if. No Consejo runtime.

## 2. Portfolio behavior

Portafolio **planta a planta**. Sin total financiero regional.

| Actor | Alcance |
|---|---|
| ZP / aliases | ALL_PLANTS ∩ catálogo `arr.provincia_plants` (o lista inyectada) |
| AD | ALL_PLANTS (igual) |
| GG | solo `plantas_permitidas` ∩ catálogo |
| Resto / GA / GV | deny |

Una planta no autorizada no se consulta ni aparece en ids, counts ni texto. Fallo de una sección/planta no tumba el pack.

Scope:

- Zona / plantas / para cerrar / peor vs meta / resolver en junta → `PORTFOLIO`
- “junta de Puebla” → `ONE_PLANT` si el nombre está en el catálogo autorizado

## 3. Source composition

| Sección | Fuente reusada | Clase |
|---|---|---|
| current | ARR mensual (`queryMonthlySales` / `aggregateSales`) + mix + desc + lost/movers | `ACTUAL_COMMERCIAL` |
| target | `igf_meta` (`listMetaVersions` / `pickCurrentMetaVersion`) YYYY-MM exacto | `TARGET_COMMITMENT` |
| base_forecast | IGF latest (`loadIgfCommitSnapshot`) stored | `FORECAST` / role `BASE_FORECAST` |
| actions | Action Register (`defaultLoadActions`) | `ACTION` |
| reviewable | `loadIgfReviewableSupportsForChat` | `REVIEWABLE` |
| trend (opcional) | `loadCommercialTrendForChat` | señal DOWN |

Sin HTTP interno. Sin SQL duplicado innecesario. Sin `loadFinancialActual`.

## 4. Truth boundaries

- current ≠ forecast ≠ target
- BASE_FORECAST nunca se etiqueta ACTUAL / FINAL / COMMITMENT / SCENARIO
- IGF `created_at_role=upload_timestamp`
- Pack **sin** `financial.actual`, `proposed_intervention`, `human_commitment`, `closing_scenario`, `what_if_result`, `regional_total`
- Action Register ≠ commitment history
- reviewable ≠ ahorro ≠ cancelación aprobada

## 5. Authz

Intersección por planta. GG no ve el resto de la zona. ZP/AD no filtran por `plantas_permitidas` de AD (contrato ARCH: AD = ALL_PLANTS). Cero plantas autorizadas → abort 403.

## 6. Risk signals implemented

| Código | Condición (no causa) |
|---|---|
| `FORECAST_BELOW_TARGET` | IGF `venta_ton` < `igf_meta.venta_ton` |
| `FORECAST_RESULT_NEGATIVE` | IGF `resultado_final_importe` < 0 |
| `COMMERCIAL_DETERIORATION` | trend `ols.direction=DOWN` |
| `LOST_HIGH_VOLUME_CLIENT` | kg prior > 0 y kg to-date = 0 |
| `OVERDUE_ACTION` | AR overdue > 0 |
| `REMAINING_FORECAST_DEPENDENCE` | FORECAST venta > actual to-date |

## 7. Risk signals rejected

| Candidata | Motivo |
|---|---|
| Canal mal clasificado (Acapulco) | Sin detector físico. Limitation `CHANNEL_DATA_QUALITY_UNSUPPORTED`. |
| Finance vs ARR | Requiere `ACTUAL_FINANCIAL` FINAL. Fuera de PRE_CLOSE. |
| What-if / escenario | Fuera de slice. `WHAT_IF_UNSUPPORTED`. |

## 8. Gaps

Tipados: `TARGET_MISSING_FOR_PERIOD`, `FORECAST_MISSING_FOR_PERIOD`, `SOURCE_UNAVAILABLE`, `ARR_VS_IGF_VENTA` (ambos números; no ganador). Gap ≠ causa. Pack: `ACTUAL_FINANCIAL_EXCLUDED_PRE_CLOSE`, `COMMITMENT_HISTORY_MISSING`, `SCENARIO_HISTORY_NOT_DEFENSIBLE`.

## 9. Decision-needed (C)

Kinds cerrados derivados de risks/gaps: `VOLUME_DEFENDABLE`, `FORECAST_NEGATIVE`, `TARGET_ABSENT`, `ACTION_OWNER`, `RECONCILE_DISCREPANCY`, `EXPENSE_STILL_OPEN`.

GPT solo redacta esas semillas. El system addendum prohíbe inventar intervención, compromiso, escenario o what-if.

## 10. Partial failure

`safeLoad` por planta/sección. Forecast error en una planta deja las demás. Missing ≠ 0.

## 11. Routing

Planner: `isPreCloseQuestion` **antes** de `month_close`. Intent `pre_meeting_brief` + evidence `pre_close_compose`.

Entra PRE_CLOSE: Zona Provincia, para cerrar agosto, plantas preocupan, resolver en junta, peor contra la meta, junta de Puebla.

Se preserva: IGF (`igf_status`), `cómo cerramos contra la meta` → `month_close_result`, pre-cierre clásico → brief antiguo.

## 12. State / requery

Se persiste `cycle_mode=PRE_CLOSE`, `portfolio_scope`, `period`, `parent_intent=pre_meeting_brief`. No raw pack. Evidence requery. `cycle_mode` no entra a `previous_frame` (allowlist de topic return).

Follow-ups: client → profile; action → AR; target hereda PRE_CLOSE; WHY sin evidencia no inventa causa; what-if / commitment history → unsupported.

## 13. Council compatibility

Identidad planta + YYYY-MM + truth_class + provenance + `future_chain` reservados. No se afirma runtime de Consejo.

## 14. Known limitations

1. Sin historial de commitment/scenario.
2. Sin what-if de conducción.
3. Sin P&L zonal.
4. Sin ACTUAL_FINANCIAL.
5. Sin detector de canal.
6. IGF latest ≠ as-of de negocio.
7. Portafolio GG puede ser subconjunto de la zona.
8. Brief no se persiste como verdad.
9. Membresía zona: `arr.provincia_plants`; si falta → `ZONE_MEMBERSHIP_UNAVAILABLE` (no se asume que todo IGF es Provincia).

## 15. Tests

| Suite | Resultado |
|---|---|
| `test/director-ia-pre-close-steering.test.js` | **30/30** |
| `test/director-ia-*.test.js` | **1058/0/0** |
| pre_meeting / month_close / financial_actual | pass (regresión) |

Focales cubren ZP/AD/GG, leak, one-plant, clases de verdad, no ACTUAL_FINANCIAL, no commitment/scenario, risks, missing target, overdue, partial failure, decision_needed, routing, state/requery, IGF/month_close/pre_meeting regression vía suite.

## 16. git diff --check

Limpio.

## 17. Matrix

**10.5 / 20 = 52.5%**. Delta **0.0 pp**.

## 18. NEXT_TASK

**`AUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001`**

No autorizada. No ejecutada.

STOP. No commit. No push. No merge.
