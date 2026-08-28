# REAUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001

```yaml
task_id: "REAUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS"
mode: "AUDIT / EVALUATION"
implementation: false
code_changes: false
test_changes: false
focal_tests: "37/37 pass, 0 fail, 0 skipped"
director_ia_suite: "1065/1065 pass, 0 fail, 0 skipped"
git_diff_check: "clean (solo CURRENT_TASK + este reporte)"
impl_intact: true
audit_intact: true
fix_intact: true
next_task_proposed: "DOCS-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-SYNC-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Executive verdict

**PASS.**

Los tres MAJOR de AUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001 **ya no son reproducibles**. El path físico (planner + chat + composer) coincide con lo que afirma el FIX. No hay regresión material de authz, truth, requery, daily, IGF, month_close ni brief clásico de junta genérica.

No se corrigió código. No se confiaron los reportes como prueba única.

## 2. Scope

Reauditoría focal adversarial, read-only salvo este reporte y `CURRENT_TASK.md`.

Consultado: ARCH, IMPL, AUDIT, FIX, EVAL-003 (tasas históricas no recomputeadas).

Inspección física: `director-ia-planner.js` (orden de reglas), `director-ia-chat.js` (`usePreClose`, `forcePortfolio`), `director-ia-executive-cycle-composer.js` (`isPreCloseQuestion`, pack), conversation-state (solo lectura).

Probes independientes `node` + reejecución de suites. IMPL/AUDIT/FIX intactos.

## 3. Major 1 reproduction

Frase: `"¿Qué debo resolver en la junta de hoy?"`

| Capa | Resultado físico |
|---|---|
| `isPreCloseQuestion` | true |
| `isDailyExecutiveBriefQuestion` | **también true** (`hoy` + `deb`) |
| Planner | `pre_meeting_brief` / **`pre_close_compose`** |
| Chat | `usePreClose` true → `composeExecutiveCycle`. Classic brief **0** llamadas |
| Resultado | `cycle_mode=PRE_CLOSE`, pack de composer |

Orden del planner (líneas 420–429): venta/descuento diarios → **PRE_CLOSE** → daily brief. Daily ya no gana.

Regresión daily: `"¿Cómo nos fue ayer?"` → `daily_executive_brief` / `daily_overview`. Suite daily 100% pass.

**STATUS: CLOSED.** No reproducible.

## 4. Major 2 reproduction

### ZP

Turno 1 `"Prepárame para el cierre de Zona Provincia"`:

- `cycle_mode=PRE_CLOSE`
- `portfolio_scope=PORTFOLIO`
- `active_period_months=["2026-08"]`
- `authorized_plant_ids=[1,2,3]`
- `parent_intent=pre_meeting_brief`
- state sin `plants` / valores CURRENT/TARGET/FORECAST

Turno 2 `"qué me preocupa más"`:

- hereda PRE_CLOSE (`usePreClose` por `cycle_mode` + inherit)
- `forcePortfolio=true` (false en t1, true en t2)
- `PORTFOLIO` `[1,2,3]`
- periodo `2026-08`
- `Secreta` ausente

### AD

Zona → PRE_CLOSE, ids `[1,2,3]`.

### GG `plantas_permitidas=[1]`

t1 y t2: solo `[1]`. `Acapulco` y `Secreta` ausentes en JSON de respuesta/state. `forcePortfolio=true` en follow-up.

### Requery

ARR Puebla cambiado 863→900 t entre turnos. Composer del follow-up con el fixture nuevo: `venta_ton=900`. No hay pack stale en state.

Sin `forcePortfolio`, `"qué me preocupa más"` sigue siendo ONE_PLANT (el composer no cambió). El chat **sí** lo pasa en inherit PORTFOLIO. El defecto original era el path de conversación; ese path ya no colapsa.

**STATUS: CLOSED.** No reproducible en ZP/AD/GG.

## 5. Major 3 reproduction

| Frase | `isPreCloseQuestion` | evidence planner | Chat |
|---|---|---|---|
| pre-cierre | true | `pre_close_compose` | composer 1, classic 0, `cycle_mode=PRE_CLOSE` |
| junta de pre-cierre | true | `pre_close_compose` | (mismo matcher) |
| prepárame para el pre-cierre | true | `pre_close_compose` | (mismo matcher) |
| Prepárame para la junta | false | **`pre_meeting_compose`** | classic 1, composer 0, sin cycle PRE_CLOSE |

No toda `junta` es PRE_CLOSE.

**STATUS: CLOSED.**

## 6. State / requery verification

Persistido: `cycle_mode`, `portfolio_scope`, `active_period_months`, `parent_intent`. `meeting_pack_not_persisted=true`.

No persistido: current/target/forecast/risks/pack.

Follow-up con fixture cambiado refleja 900 t. Si el state guardara evidencia, el follow-up habría quedado en 863. **No ocurrió.**

## 7. Authz regression

Sin cambio de reglas. Probe + tests:

| Actor | Resultado |
|---|---|
| ZP / AD | portafolio autorizado del catálogo |
| GG | solo assigned; follow-up no filtra después de filtrar |
| planta no autorizada | no en ids, counts, texto, GPT blob |

`filterAuthorizedPlants` sigue antes de `loadOnePlantBlock`. Catálogo de zona (id/nombre) antes del filtro: OBSERVATION ya aceptada en AUDIT, no leak de evidencia.

## 8. Routing regression

| Pregunta | Intent / evidence |
|---|---|
| ¿Cómo va IGF? | `igf_status` |
| ¿Cómo vamos este mes? | `unknown` (igual que antes del FIX) |
| ¿Cómo cerramos contra la meta? | `month_close_result` |
| Prepárame para la junta | `pre_meeting_compose` |
| Qué debo llevar preparado para la junta? | `pre_meeting_compose` |
| Necesito el panorama para la reunión | `pre_meeting_compose` |
| Prepárame para el cierre de Zona Provincia | `pre_close_compose` |
| Prepárame para la junta de Puebla | `pre_close_compose` ONE_PLANT |
| ¿Cómo vamos en casa y comisionistas? | `commercial_trend` |
| ¿Cómo nos fue ayer? | `daily_executive_brief` |

Subir PRE_CLOSE sobre daily no robó venta/descuento diarios ni IGF ni month_close.

## 9. Truth-boundary regression

Pack Puebla (probe):

- CURRENT `ACTUAL_COMMERCIAL` 900 ≠ TARGET 1200 ≠ FORECAST 1126
- `financial` undefined
- `commitment_ref` / `scenario_ref` null
- `council_runtime=false`, `live_copilot_runtime=false`
- sin `proposed_intervention` / `human_commitment` / `closing_scenario`
- sin `1177`
- composer no llama `loadFinancialActual`

DECISION_NEEDED del pack: `VOLUME_DEFENDABLE`, `FORECAST_NEGATIVE`, `RECONCILE_DISCREPANCY` (preguntas, no acciones). Prompt addendum intacto.

## 10. EVAL-003 materiality check

Comprobación focal (no se rehizo N=24; tasas históricas intactas).

| Capacidad PRE_CLOSE | Clasificación |
|---|---|
| actual-to-date / target / base forecast / risks / actions / reviewable / gaps / decision-needed | **PRESERVED** (composer no se rediseñó) |
| 1,177 Puebla como compromiso | **PRESERVED** (ausente del pack) |
| +40 Acapulco / +15 Querétaro / +632 mil zona / what-if / canal recién descubierto | **PRESERVED** (siguen fuera; limitations intactas) |

Nada **REGRESSED**. Nada **UNPROVEN** en estas capas: el pack y el prompt se inspeccionaron otra vez.

## 11. Classic pre_meeting preservation

`"Prepárame para la junta"` y `"Qué debo llevar preparado para la junta?"` / `"Necesito el panorama para la reunión"` → `pre_meeting_compose` + loader clásico.

`"Prepárame para la junta de cierre."` sigue excluida de PRE_CLOSE por `\bde cierre\b` (month_close suite).

`"Ármame el briefing de junta"` cae en la cláusula preexistente `junta`+`de` (no es `de la junta`). Eso ya era un FP MINOR del AUDIT original, **no** lo introdujo el FIX de `pre-cierre`. No se reabre como MAJOR.

## 12. Council / final boundary

FIX no creó Council runtime, routing CLOSED_FINAL, commitment history ni scenario history. `cycle_mode !== PRE_CLOSE` sigue abortando. PRE_CLOSE es una etapa.

## 13. Tests

Reejecutado 2026-08-26 (esta reauditoría). Tests **no** modificados.

| Suite | pass | fail | skipped |
|---|---|---|---|
| `test/director-ia-pre-close-steering.test.js` | **37** | **0** | **0** |
| daily + pre_meeting + month_close + financial_actual + IGF + continuity + topic-return | **134** | **0** | **0** |
| `test/director-ia-*.test.js` | **1065** | **0** | **0** |

## 14. Findings closure table

| FINDING | ORIGINAL SEVERITY | REPRODUCTION ATTEMPT | RESULT | STATUS |
|---|---|---|---|---|
| planner steals "qué debo resolver en la junta de hoy" | MAJOR | planner + `askDirectorIa` spy composer vs classic | PRE_CLOSE composer; daily no gana | CLOSED |
| portfolio follow-up collapses to plant | MAJOR | ZP/AD/GG turno 1 zona → turno 2 "qué me preocupa más" | PORTFOLIO conservado; GG solo assigned; requery 900 t | CLOSED |
| "pre-cierre" goes to classic brief | MAJOR | pre-cierre / junta de pre-cierre / prepárame para el pre-cierre | composer PRE_CLOSE; "Prepárame para la junta" clásico | CLOSED |

## 15. New findings

Ningún CRITICAL / MAJOR nuevo.

OBSERVATION (ya en AUDIT, no reabierto): matcher `junta`+`de` sigue pudiendo marcar PRE_CLOSE frases como `"Ármame el briefing de junta"`; cutoff live y current vacío-como-OK siguen fuera de este FIX.

## 16. Final verdict

**PASS**

Los 3 MAJOR están cerrados. El FIX no introdujo defecto material. Las regresiones pedidas se sostienen.

## 17. Exactly one NEXT_TASK

`DOCS-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-SYNC-001`

No autorizada. No ejecutada.
