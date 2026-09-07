# FIX-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001

```yaml
task_id: "FIX-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST"
implementation: true
docs_director_ia_changed: false
live_db: false
live_db_authorized: false
frontend_changed: false
formula_changed: false
delta_gastos_created: false
hardcoded_live: false
first_bad_boundary: "readIgfForecastMiniAuthoritative DROPPED operativos/corporativos/gasto"
exp_subtopic_before: "001/002/003/004/008/009/010/013/014 FAIL; 005/006/007/011/012/015/016/017/018 PASS"
exp_subtopic_after: "001..018 PASS"
tier1_after: "8/8 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
new_failure: 0
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "T4 previo de active-subtopic ahora exige el comparativo físico; el assert de 'no conectado' era incompatible con este FIX."
human_decision_needed:
  - "Revisión humana. No merge. No push main. No deploy. No next task."
```

## 1. BEFORE

Pack `test/director-ia-profitability-expense-subtopic-data.test.js` primero. Sin cambio de producto.

```text
R-EXP-SUBTOPIC-001  FAIL   adapter.operativos=undefined
R-EXP-SUBTOPIC-002  FAIL   adapter.corporativos=undefined
R-EXP-SUBTOPIC-003  FAIL   adapter.gasto=undefined
R-EXP-SUBTOPIC-004  FAIL   loadKpiForMonth no conserva los tres
R-EXP-SUBTOPIC-005  PASS   resultado_final_importe intacto
R-EXP-SUBTOPIC-006  PASS   util_oper_importe ≠ operativos
R-EXP-SUBTOPIC-007  PASS   T3 expense.corporate
R-EXP-SUBTOPIC-008  FAIL   T4 mini calls=0
R-EXP-SUBTOPIC-009  FAIL   sin expense_compare
R-EXP-SUBTOPIC-010  FAIL   sin A/B/B-A
R-EXP-SUBTOPIC-011  PASS
R-EXP-SUBTOPIC-012  PASS
R-EXP-SUBTOPIC-013  FAIL
R-EXP-SUBTOPIC-014  FAIL
R-EXP-SUBTOPIC-015  PASS
R-EXP-SUBTOPIC-016  PASS
R-EXP-SUBTOPIC-017  PASS
R-EXP-SUBTOPIC-018  PASS
```

El mini ya tenía los campos. El adapter los tiraba.

## 2. Cambio mínimo

1. `readIgfForecastMiniAuthoritative` copia `row.operativos`, `row.corporativos`, `row.gasto` sin recalcular.
2. `loadKpiForMonth` los devuelve junto a `util_oper_importe` / `resultado_final_importe`.
3. T4 (`probe_unavailable`) vuelve a llamar `loadKpiForMonth` A/B con `active_period_months`.
4. El composer usa el campo del `active_subtopic`:
   - `expense.corporate` → `corporativos`
   - `expense.operational` → `operativos`
   - `expense` → `gasto`
5. B−A se nombra variación. No Delta Gastos. No importes en `conversation_state`.

`server.js` intacto. Planner intacto. Frontend intacto.

## 3. AFTER T1→T4

```
T1 snapshot
  rentabilidad_final = resultado_final_importe
  rentabilidad_operativa = util_oper_importe  (no operativos)
T2 "y gasto?" → active_subtopic=expense
T3 "y corporativos?" → expense.corporate
T4 "¿cuánto subieron?"
  → reconsulta mini A/B
  → field=corporativos
  → A, B, variación B-A
```

## 4. Pruebas 001–018

```text
R-EXP-SUBTOPIC-001..018  PASS
R-CONV-SUBTOPIC-001..010 PASS
R-CONV-SUBTOPIC-T4       PASS (comparativo físico del fixture rent-cut)
```

009 demuestra que `corporativos` ≠ `util_oper_importe - resultado_final_importe`.  
006 demuestra que T1 sigue usando `util_oper_importe` como rentabilidad operativa.

## 5. Archivos modificados

- `lib/director-ia-dashboard-forecast-adapter.js`
- `lib/director-ia-rentabilidad-deterioro-snapshot.js`
- `lib/director-ia-profitability-subtopic.js`
- `lib/director-ia-chat.js`
- `test/director-ia-profitability-expense-subtopic-data.test.js` (nuevo)
- `test/director-ia-conversational-active-subtopic.test.js` (T4 previo)
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001.md`

## 6. Diff funcional resumido

El adapter deja de descartar tres campos ya materializados. T4 reconsulta el mismo loader de T1 y responde el comparativo del subtopic activo. No hay motor nuevo.

## 7. Evidencia anti Delta Gastos

Ningún archivo añadido o tocado define `computeDeltaGastos`, `delta_gastos` o `deltaGastos` (R-EXP-SUBTOPIC-011). La prosa dice "variación de gasto corporativo/operativo/total".

## 8. Evidencia operativos ≠ util_oper_importe

R-EXP-SUBTOPIC-006: snapshot T1 usa `888000` / `800000` (`utilOperImporte`), no `111000` / `150000` (`operativos`).  
R-EXP-SUBTOPIC-013: T4 operativo usa solo `rows[].operativos`.

## 9. Suites

Related: 108/108 PASS (expense-subtopic, active-subtopic, profitability-followup, continuity, natural-followup, intra-session, rent-cut, rent-chat-cut).

TIER 1 8/8 PASS. PRE-DEPLOY `--gate` PASS. HTTP 5xx = 0. HARNESS = 0. NEW FAILURE = 0.

`git diff --check`: limpio.

## 10. Desviaciones

T4 previo de continuidad ahora afirma el comparativo físico. El texto "todavía no está conectado" era el síntoma de este FIX.
