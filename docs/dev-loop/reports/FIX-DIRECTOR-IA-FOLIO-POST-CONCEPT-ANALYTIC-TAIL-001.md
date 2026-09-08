# FIX-DIRECTOR-IA-FOLIO-POST-CONCEPT-ANALYTIC-TAIL-001

IMPLEMENTATION_SHA: (set after commit)

BEFORE: `d4291bc0` / HEAD de producto idéntico. `POST_PERIOD_DE_TO_TEXT_END` usa `END=text.length`. CASE A → `liquidaciones suma los montos en un acumulado por mes` AGGREGATE SUM GROUP_BY=NONE cumulative=NO. CASE H → `liquidaciones dame el monto por mes y acumulado` AGGREGATE SUM GROUP_BY=NONE cumulative=NO. CASE C, North Star y ESTAN ya pasaban.

AFTER: `shrinkPostConceptAnalyticTail` recorta un sufijo analítico cerrado solo si el span llega a EOF y el candidato es íntegramente una cola autorizada. CASE A/H → `liquidaciones` AGGREGATE SUM MONTH cumulative=YES.

FIRST_DIVERGENCE_FIXED: YES. `locateConceptSpan` / `boundConceptSpan` ya no traga la cola post-`de`.

POST_PERIOD_END_MODEL: el `de` post-periodo sigue abriendo el concept start. El END deja de ser `text.length` incondicional: si el resto hasta EOF es una cola cerrada, END queda antes de esa cola.

ANALYTIC_TAIL_GRAMMAR: frases cerradas, longest-first: `suma los/el monto(s) en un acumulado por mes`, `dame el monto por mes y (el) acumulado`, `suma los/el monto(s) por mes`, `acumulado por mes`, `suma los/el monto(s)`, `por mes`. Singular/plural solo `monto|montos` en esas frases.

TAIL_MUST_REACH_EOF: YES. Si queda texto después del span, no recorta. `por mes servicios` y `suma los montos sa` no son sufijo completo.

PROTECTED_BUSINESS_DATA: YES. POR MES SERVICIOS, SUMA LOS MONTOS SA, IMPORTE TOTAL SEGUROS, TOTAL PLAY intactos.

CASE_A: liquidaciones | RANGE 2026-01..2026-08 | AGGREGATE SUM MONTH cumulative=YES

CASE_C: liquidaciones | AGGREGATE SUM GROUP_BY=NONE cumulative=NO

CASE_D: liquidaciones | AGGREGATE SUM MONTH cumulative=NO

CASE_E: igual D

CASE_F: liquidaciones | AGGREGATE SUM MONTH cumulative=YES

CASE_G: liquidaciones | AGGREGATE SUM GROUP_BY=NONE cumulative=NO

CASE_H: liquidaciones | AGGREGATE SUM MONTH cumulative=YES

NORTH_STAR: PASS. remodelacion de taller | SUPPORT_FAMILIES | RANGE 2026-01..2026-08 | AGGREGATE SUM MONTH cumulative=YES

ESTAN_REGRESSION: PASS. llantas estan en septiembre → llantas / 2026-09. fueron de ESTAN / SERVICIOS ESTAN se conservan.

PROTECTED_SPAN_REGRESSION: PASS. RENTA DEL MES, CURSO. No `STRUCTURAL_TOKENS.pop()`.

NULL_MODEL: Option B intacta. 0=KNOWN. null/blank/nonfinite=UNKNOWN. UNKNOWN no suma. CANCELADO fuera. PAGADO null=UNKNOWN.

FULL_SET: AGGREGATE sobre elegibles antes del cap. LIST cap 40.

MONTHLY: mes_cargo. Mes vacío complete zero. Mes null incomplete.

CUMULATIVE: running solo conocidos. `por mes y (el) acumulado` en control dispara cumulative=YES. Motor de running no rediseñado.

001..059: PASS

SUITES:
- R-FOLIO-TAIL PASS (001..059 + extras de gramática cerrada)
- R-FOLIO-ESTAN PASS
- R-FOLIO-LOCATOR PASS
- R-FOLIO-COMP PASS
- R-FOLIO-RANGE PASS
- R-FOLIO-LANG PASS
- R-FOLIO-TRUTH PASS
- planner 61/61 PASS
- capabilities 57/57 PASS
- orchestrator 27/28; 1 preexistente en `d4291bc0` (`commercial_state`). planner/orchestrator/capabilities/tools no tocados. NEW FAILURE = 0
- M2/M4/M5/M6/IGF/continuity 178/178 PASS
- TIER 1 8/8 PASS
- PRE-DEPLOY `--gate` PASS
- HTTP 5xx = 0
- HARNESS = 0
- `git diff --check` limpio

FILES:
- `lib/director-ia-folio-search.js`
- `test/director-ia-folio-search-post-concept-analytic-tail.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- este reporte

RISKS:
- Colas no listadas (`en un acumulado por mes` sin `suma`) no se recortan.
- Un concepto cuyo texto entero sea exactamente una cola autorizada quedaría vacío (no auditado en LIVE).

PLANNER_CHANGED: NO
ROUTING_CHANGED: NO
SQL_NEW: NO
DEPENDENCY_NEW: NO

```yaml
task_id: "FIX-DIRECTOR-IA-FOLIO-POST-CONCEPT-ANALYTIC-TAIL-001"
outcome: "DONE"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
sql_new: false
dependency_new: false
planner_changed: false
routing_changed: false
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
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-POST-CONCEPT-ANALYTIC-TAIL-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
```
