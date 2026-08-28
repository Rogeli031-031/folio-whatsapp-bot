# FIX-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001

```yaml
task_id: "FIX-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
implementation: true
code_changes: true
test_changes: true
sql_changes: false
docs_director_ia_changes: false
m1: "CLOSED"
m2: "CLOSED"
m3: "CLOSED"
f_cue_001: "CLOSED"
f_dicf_001: "CLOSED"
f_per_001: "CLOSED"
f_left_001: "DEFERRED"
isolated_cel_ship: false
cel_ship_dependency: "PRE_CLOSE_SHARED_COMPOSER"
local_e2e_harness_validation: "EXECUTED"
manual_chat_validation: "PENDING"
production_manual_validation: "NOT_YET_TESTABLE"
focal_tests: "40/40 pass"
full_regression: "1141/0/0"
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
next_task_proposed: "REAUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Executive result

FIX quirúrgico del AUDIT CEL `PASS_WITH_FINDINGS`. Los 3 MAJOR quedan **CLOSED**. De los 4 MINOR: 3 CLOSED, 1 DEFERRED (leftover `buildPlantDiagnosisPrompt` fuera del path CEL).

No se creó arquitectura nueva. CEL no es mega-intent. Planner/tools siguen siendo execution layer. Need layer ahora puede ganar a `daily_executive_brief` cuando la pregunta es estado ejecutivo, no brief diario.

`ISOLATED_CEL_SHIP = NO`. `CEL_SHIP_DEPENDENCY = PRE_CLOSE_SHARED_COMPOSER`. No commit, no deploy.

## 2. M1 before / fix / after

**Before.** `¿Cómo vamos hoy?` → planner `daily_executive_brief` (hoy + como). CEL solo interceptaba `unknown|plant_diagnosis`.

**Fix.** No phrase patch. Cues de estado exigen marco `cómo` + verbo de progreso. Brief inequívoco (`resumen/brief/reporte diario`, «cómo nos fue ayer») es specialized. `shouldHandleExecutiveStatus` acepta planner `daily_executive_brief` solo si el need ya es `EXECUTIVE_STATUS`.

**After.** Familia «cómo vamos/andamos/estamos hoy», «cómo se ve la planta hoy», «cómo está Acapulco» → CEL. «Dame el resumen de hoy» / «cómo nos fue ayer» → daily.

## 3. M2 before / fix / after

**Before.** «¿Cómo va Puebla?» sin catálogo caía a UI Acapulco.

**Fix.** Referencia explícita no resoluble → `ASK_CLARIFICATION`. Nunca UI fallback. Tokens genéricos (`todo`, `hoy`) no son planta. AUTHZ sigue después del scope.

**After.** Catálogo válido → Puebla. Sin catálogo / nombre fuera de catálogo → clarificación, sin cargar evidencia de Acapulco. GA + Puebla → 403.

## 4. M3 physical dependency result

CEL `require("./director-ia-executive-cycle-composer")` para `isPreCloseQuestion`. El módulo sigue untracked (bloque PRE_CLOSE). No se duplicó, no se borró, no se movió, no se hizo commit.

Constantes:

- `CEL_SHIP_DEPENDENCY = "PRE_CLOSE_SHARED_COMPOSER"`
- `ISOLATED_CEL_SHIP = false`

Un extract solo de CEL no carga. El árbol de ship, si algún día se autoriza, incluye el composer compartido.

## 5. Los 4 MINOR

| ID | Reproducido | Decisión | Resultado |
|----|-------------|----------|-----------|
| F-CUE-001 | sí: `vamos`, `estamos`, `vamos a ver`, `andamos bien` → EXECUTIVE_STATUS | quirúrgico; exigir marco `cómo` | **CLOSED** |
| F-DICF-001 | sí: «No se tomaron medidas ni hay seguimiento.» no se reescribía | ampliar guard a variantes de sobreafirmación | **CLOSED** |
| F-PER-001 | sí: labels `snapshot` / `bitacora_window` | no usar kind tokens como periodo | **CLOSED** |
| F-LEFT-001 | sí: `buildPlantDiagnosisPrompt` materialidad-first | fuera del path CEL; cambiarlo ampliaría plant_diagnosis | **DEFERRED** |

## 6. Semantic need behavior

Need determinista por cues + exclusiones. No `text === "¿Cómo vamos hoy?"`. Contrastes de familia, no lista cerrada.

## 7. UI anchor behavior

«¿Cómo vamos?» + UI Acapulco → `ui_plant_anchor` id=1. Underspecified only.

## 8. Explicit plant behavior

Explícita resuelta o fail-closed/clarificación. Precedencia semántica sobre UI.

## 9. AUTHZ

Después del scope. GA `plantas_permitidas:[1]` + Puebla → 403. Sin leak.

## 10. Daily-vs-status boundary

| Familia | Resultado |
|---------|-----------|
| estado de planta (+ hoy) | EXECUTIVE_STATUS / CEL |
| brief/resumen/reporte diario inequívoco | daily_executive_brief |
| PRE_CLOSE / junta / cierre julio / IGF | specialized, no CEL |

## 11. DICF truth boundary

Guard cubre «no se han tomado medidas», «no se tomaron medidas», «no se hizo nada», «nadie actuó». Máximo: «No encontré una acción DICF asociada.»

## 12. Specialized mode regression

Revalidado: junta, pre-cierre, «cómo cerramos julio», IGF, brief diario inequívoco. Suites PRE_CLOSE / month_close / AF / IGF / daily / AR/DICF / Steering pasaron.

## 13. PRE_CLOSE dependency/ship boundary

`CEL_SHIP_DEPENDENCY = PRE_CLOSE_SHARED_COMPOSER`  
`ISOLATED_CEL_SHIP = NO`  
No autoriza empaquetado ni deploy.

## 14. Future integration boundaries

Steering store IMPLEMENTED. Steering chat PENDING. POST_CAPTURE_READ PENDING. Plaud PENDING_INTEGRATION. Council PENDING. live PENDING. Ledger No-Orphan intacto. Nada conectado.

## 15. Local E2E harness validation

`LOCAL_E2E_HARNESS_VALIDATION = EXECUTED` (askDirectorIa, sin infra nueva).

| Pregunta | Planner | Path |
|----------|---------|------|
| Como vamos? | unknown | CEL / ui_plant_anchor / id 1 |
| Como vamos hoy? | daily_executive_brief | CEL / ui_plant_anchor / id 1 |
| Como va Puebla? | plant_diagnosis | CEL / explicit_plant / id 2 |
| Dame el resumen de hoy | daily_executive_brief | daily, no CEL |

No es `MANUAL_CHAT_VALIDATION`.

## 16. Tests

CEL focales **40 pass / 0 fail / 0 skipped** (antes 29). Contrastes M1/M2/M3, cues, DICF, periodos. Continuity/follow-up/memory: catálogo Puebla id=1 para no re-codificar el fallback silencioso.

## 17. Full regression

Director IA `test/director-ia-*.js`: **1141 pass / 0 fail / 0 skipped**.

Relacionadas reejecutadas: planner/chat (vía suites), conversation state, plant diagnosis, commercial trend, PRE_CLOSE, daily, month_close, ACTUAL_FINANCIAL, IGF, ARR (vía plant_diagnosis/IGF), Steering.

## 18. Matrix

Before/after: **10.5 / 20 = 52.5%**. Delta **0.0 pp**. Sin promoción.

## 19. MANUAL_CHAT_VALIDATION status

`PENDING`

## 20. PRODUCTION_MANUAL_VALIDATION status

`NOT_YET_TESTABLE` — CEL sigue solo en working tree. `origin/main` = `1ebd81a9`.

## 21. Exactly one NEXT_TASK

`REAUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001`

No autorizada. No ejecutada.
