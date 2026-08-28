# FIX-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001

```yaml
task_id: "FIX-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
implementation: true
schema_changes: false
sql_changes: false
matrix_changes: false
actual_financial_in_pre_close: false
council_runtime: false
live_copilot_runtime: false
focal_tests: "37/37 pass, 0 fail, 0 skipped"
director_ia_suite: "1065/1065 pass, 0 fail, 0 skipped"
git_diff_check: "clean"
next_task_proposed: "REAUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Summary

FIX quirúrgico de los tres MAJOR de AUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.

No se rediseñó PRE_CLOSE. No se cambiaron truth classes, fuentes, authz ni el pack del composer. `cycle_mode` sigue siendo PRE_CLOSE first slice.

Dependencia mínima documentada: una línea en `isPreCloseQuestion` (vive en el archivo del composer) para el cue `pre-cierre`. El cuerpo de `composeExecutiveCycle` no se tocó.

## 2. Files changed

| Archivo | Por qué |
|---|---|
| `lib/director-ia-planner.js` | MAJOR 1: PRE_CLOSE antes de daily brief |
| `lib/director-ia-chat.js` | MAJOR 2: `forcePortfolio` en inherit PORTFOLIO |
| `lib/director-ia-executive-cycle-composer.js` | MAJOR 3: matcher `pre-cierre` / `precierre` (solo `isPreCloseQuestion`) |
| `test/director-ia-pre-close-steering.test.js` | Focales de cierre de los 3 MAJOR |
| `docs/dev-loop/CURRENT_TASK.md` | IN_PROGRESS → DONE_PENDING_REVIEW |
| `docs/dev-loop/reports/FIX-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md` | Este reporte |

No tocados: tools, capabilities, conversation-state, SQL, matriz, reportes IMPL/AUDIT/ARCH, `docs/director-ia/`.

## 3. MAJOR 1 root cause

`isPreCloseQuestion("¿Qué debo resolver en la junta de hoy?")` ya era `true` (`resolver` + `junta`). `isDailyExecutiveBriefQuestion` también era `true` (`hoy` + `deb`). El planner evaluaba daily **antes** que PRE_CLOSE, así que el intent quedaba `daily_executive_brief` y el chat nunca entraba al composer.

## 4. MAJOR 1 fix

En `detectDirectorIaIntent`, `isPreCloseQuestion` se evalúa **después** de venta/descuento diarios y **antes** de `isDailyExecutiveBriefQuestion`.

No se convirtió toda mención de `junta` en PRE_CLOSE. Daily canónico (`¿Cómo nos fue ayer?`) sigue daily. `¿Cómo va IGF?` sigue `igf_status`. `¿Cómo vamos este mes?` sigue `unknown`.

## 5. MAJOR 2 root cause

El estado ya persistía `portfolio_scope=PORTFOLIO`. El composer rederiva el alcance solo de la pregunta. `"qué me preocupa más"` no tiene cues de zona, así que caía a ONE_PLANT de `requestPlantaId`. El test previo mockeaba el composer y no veía el colapso.

## 6. MAJOR 2 fix

Chat pasa `forcePortfolio` cuando:

- inherit `parent_intent=pre_meeting_brief`
- `cycle_mode=PRE_CLOSE`
- `portfolio_scope=PORTFOLIO`

El composer ya tenía `opts.forcePortfolio` (catálogo autorizado, no raw evidence). Una planta nombrada sin cue de portafolio sigue ganando ONE_PLANT. GG sigue filtrando `ASSIGNED_PLANTS`.

No se persistieron valores CURRENT/TARGET/FORECAST.

## 7. MAJOR 3 root cause

`isPreCloseQuestion` solo tomaba `pre-cierre` si además había `\bde\b`. `"Dame un pre-cierre ejecutivo."` / `"pre-cierre"` iban a `pre_meeting_compose` (brief clásico sin CURRENT/TARGET de primer orden).

## 8. MAJOR 3 fix

Tras los guards de cierre FINAL e IGF, `pre-cierre` / `precierre` son PRE_CLOSE.

`"Prepárame para la junta"` (sin cierre / pre-cierre) sigue `pre_meeting_compose`. `"Prepárame para la junta de cierre."` sigue excluida por `\bde cierre\b` y permanece brief clásico / no month_close.

## 9. State semantics

Sin cambios de schema. Se sigue persistiendo solo:

- `cycle_mode`
- `portfolio_scope`
- `active_period_months`
- `parent_intent=pre_meeting_brief`

`meeting_pack_not_persisted=true`. Evidence requery. `forcePortfolio` es flag de turno, no store.

## 10. Routing regression proof

| Pregunta | Intent / evidence |
|---|---|
| ¿Qué debo resolver en la junta de hoy? | `pre_meeting_brief` / `pre_close_compose` (no daily) |
| pre-cierre | PRE_CLOSE |
| junta de pre-cierre | PRE_CLOSE |
| prepárame para el pre-cierre | PRE_CLOSE |
| Prepárame para la junta | `pre_meeting_compose` |
| ¿Cómo va IGF? | `igf_status` |
| ¿Cómo nos fue ayer? | `daily_executive_brief` |
| ¿Cómo vamos este mes? | `unknown` |
| Prepárame para la junta de Puebla | PRE_CLOSE ONE_PLANT |
| ¿Cómo cerramos contra la meta? | `month_close_result` |

## 11. Portfolio continuity proof

Turno 1 zona → `PORTFOLIO` `[1,2,3]`. Turno 2 `"qué me preocupa más"` → `forcePortfolio=true`, `PORTFOLIO` `[1,2,3]`, sin `Secreta`. Cambio de ARR entre turnos se refleja en requery (900 t).

## 12. Authz regression proof

GG assigned `[1]`: zona y follow-up solo planta 1. No Acapulco / Secreta. ZP/AD sin cambio de reglas. Authz no se reescribió.

## 13. Tests

| Suite | pass | fail | skipped |
|---|---|---|---|
| `test/director-ia-pre-close-steering.test.js` | **37** | **0** | **0** |
| daily + planner/routing (`director-ia-daily-executive-brief`) | incluido abajo | 0 | 0 |
| conversation-state / topic-return | incluido abajo | 0 | 0 |
| `director-ia-pre-meeting` | incluido abajo | 0 | 0 |
| `director-ia-month-close-result` | incluido abajo | 0 | 0 |
| `director-ia-financial-actual` | incluido abajo | 0 | 0 |
| IGF (`director-ia-m7-igf-composition`) | incluido abajo | 0 | 0 |
| Bloque routing/state/pre_meeting/close/IGF (134 tests) | **134** | **0** | **0** |
| `test/director-ia-*.test.js` | **1065** | **0** | **0** |

Focales nuevos cubren los 10 casos pedidos del FIX.

## 14. Findings closure table

| FINDING | SEVERITY | FIX | TEST | STATUS |
|---|---|---|---|---|
| planner steals "qué debo resolver en la junta de hoy" | MAJOR | planner: PRE_CLOSE antes de daily | `qué debo resolver en la junta de hoy es PRE_CLOSE y no daily` | CLOSED |
| portfolio follow-up collapses to plant | MAJOR | chat `forcePortfolio` en inherit PORTFOLIO | `follow-up de zona conserva PRE_CLOSE portfolio…`; `GG follow-up…`; `forcePortfolio conserva…` | CLOSED |
| "pre-cierre" goes to classic brief | MAJOR | `isPreCloseQuestion` acepta pre-cierre | `pre-cierre y junta de pre-cierre entran al composer PRE_CLOSE` | CLOSED |

## 15. Remaining limitations

Los MINOR/OBSERVATION del AUDIT no se tocaron: cutoff live, current vacío como `OK`, matchers duplicados capabilities vs composer, FP `junta de gerencia` / `cierre de inventario`, residual GPT de opción C, latest IGF sin filtro `financial_state`.

## 16. Baseline

- Before: 10.5 / 20 = 52.5%
- After: 10.5 / 20 = 52.5%
- Delta: 0.0 pp

Matriz no modificada.

## 17. Exactly one NEXT_TASK

`REAUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001`

No autorizada. No ejecutada.
