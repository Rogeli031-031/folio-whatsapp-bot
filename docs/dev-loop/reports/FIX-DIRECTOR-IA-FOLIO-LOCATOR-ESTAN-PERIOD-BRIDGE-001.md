# FIX-DIRECTOR-IA-FOLIO-LOCATOR-ESTAN-PERIOD-BRIDGE-001

IMPLEMENTATION_SHA: PENDING

BEFORE: `e1d256b4` no tiene `analysis_mode`. `estan` es STRUCTURAL global: `fueron de ESTAN` → `fueron`; `SERVICIOS ESTAN` → `servicios`. `cuanto suman … TOTAL PLAY` no es AGGREGATE. El blocker del locator previo (`623f4dca`) era `llantas estan` porque `estan` no era leftover y el span era inmutable.

AFTER: locator reimplementado desde main + puente acotado `estan en|para <periodo>`. `llantas estan en/para septiembre` → `llantas`. `fueron de ESTAN` / `SERVICIOS ESTAN` se conservan. Sin leftover/stopword global nuevo.

ESTAN_PERIOD_BRIDGE_MODEL: `shrinkEstanPeriodBridge` solo si el span termina en `estan`, el period span empieza de inmediato con `en` o `para`, y entre ambos solo hay espacios. No actúa si el concepto está después del periodo.

ESTAN_GLOBAL_STOPWORD: NO. No está en `CONTROL_LEFTOVER_*`.

ESTAN_BUSINESS_DATA_PRESERVED: YES

LLANTAS_ESTAN_EN: LIST → `llantas` / `2026-09`

LLANTAS_ESTAN_PARA: LIST → `llantas` / `2026-09`

ESTAN_AS_CONCEPT: LIST/AGGREGATE → `estan`

SERVICIOS_ESTAN: LIST → `servicios estan`

LOCATOR_BOUNDARY: leftovers de control (`tenemos`/`hay`/`existen`/`dame`…) en bordes; `estan` solo como puente de periodo.

PROTECTED_SPAN_IMMUTABILITY: YES. No `STRUCTURAL_TOKENS.pop()`.

ANALYTIC_MODEL: frases cerradas en control. No `\btotal\b`/`\bsuma\b` globales.

NULL_MODEL: Option B. UNKNOWN antes de `Number()`. CANCELADO fuera. PAGADO no prueba gasto.

FULL_SET: AGGREGATE sobre deduped antes del cap. LIST cap 40.

MONTHLY: `mes_cargo`. Vacío complete zero. NULL incomplete.

CUMULATIVE: running conocidos; `known_total` = último running.

NORTH_STAR: PASS. `SUPPORT_FAMILIES`; RANGE `2026-01`..`2026-08`; `remodelacion de taller`; AGGREGATE SUM MONTH `cumulative=YES`.

001..052: PASS

SUITES:
- R-FOLIO-ESTAN PASS (001..052)
- R-FOLIO-LOCATOR PASS
- R-FOLIO-COMP 18/18 PASS
- R-FOLIO-RANGE 25/25 PASS
- R-FOLIO-LANG 18/18 PASS
- R-FOLIO-TRUTH 21/21 PASS
- planner 61/61 PASS
- capabilities 57/57 PASS
- orchestrator 27/28; 1 preexistente en `e1d256b4` (`commercial_state`). NEW FAILURE = 0
- M2/M4/M5/M6/IGF/continuity 132/132 PASS
- TIER 1 8/8 PASS
- PRE-DEPLOY `--gate` PASS
- HTTP 5xx = 0
- HARNESS = 0
- `git diff --check` limpio

FILES:
- `lib/director-ia-folio-search.js`
- `test/director-ia-folio-search-locator-estan-period-bridge.test.js`
- `test/director-ia-folio-search-locator-boundary-immutability.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- este reporte

RISKS:
- `estan` + periodo sin `en`/`para` no se recorta.
- Otros puentes no auditados (`estuvo`, `andan`) no están cubiertos.

PLANNER_CHANGED: NO
SQL_NEW: NO
DEPENDENCY_NEW: NO

```yaml
task_id: "FIX-DIRECTOR-IA-FOLIO-LOCATOR-ESTAN-PERIOD-BRIDGE-001"
outcome: "DONE"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
sql_new: false
dependency_new: false
planner_changed: false
estan_global_stopword: false
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
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
```
