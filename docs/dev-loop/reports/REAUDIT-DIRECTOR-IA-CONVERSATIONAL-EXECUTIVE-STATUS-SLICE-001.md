# REAUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001

```yaml
task_id: "REAUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS"
mode: "REAUDIT / EVALUATION"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
docs_director_ia_changes: false
m1_reproduced: false
m2_reproduced: false
m3_validated: true
f_cue_reproduced: false
f_dicf_reproduced: false
f_per_reproduced: false
f_left: "DEFERRED_CONFIRMED"
new_critical: 0
new_major: 0
new_minor: 0
new_observation: 3
fix_tests: "40/40 (not sole evidence)"
reaudit_independent_probes: "executed"
full_regression: "1141/0/0"
local_e2e_harness_validation: "PASS"
manual_chat_validation: "PENDING"
production_manual_validation: "NOT_YET_TESTABLE"
cel_ship_dependency: "PRE_CLOSE_SHARED_COMPOSER"
isolated_cel_ship: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
next_task_proposed: "ARCH-DIRECTOR-IA-ACCUMULATED-SHIP-READINESS-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Executive verdict

**PASS.**

Los 3 MAJOR del AUDIT no se reproducen. F-CUE, F-DICF y F-PER no se reproducen. F-LEFT-001 permanece **DEFERRED_CONFIRMED** (path legacy `plant_diagnosis`, no CEL). M3 validado: dependencia PRE_CLOSE declarada; no es defecto runtime.

Probes independientes (no los tests del FIX) confirman need layer sobre planner para estado+hoy, fail-closed de planta explícita y composer determinístico.

Hallazgos nuevos: 0 CRITICAL, 0 MAJOR, 0 MINOR. 3 OBSERVATION (no material para reabrir el FIX).

`MANUAL_CHAT_VALIDATION = PENDING`.
`PRODUCTION_MANUAL_VALIDATION = NOT_YET_TESTABLE`.
Render pre-CEL no se usó como PASS ni FAIL.

## 2. Independence method

- Lectura física de `lib/director-ia-conversational-executive-layer.js` y wiring en `lib/director-ia-chat.js`.
- Probes `node -e` con enunciados **no** copiados de las listas del archivo de tests FIX.
- Harness `askDirectorIa` existente (inyección). No se creó infraestructura.
- Suites FIX reejecutadas **después**, etiquetadas FIX_TESTS, no como única prueba.

## 3. M1 — status vs daily

**Reproduced: NO. FINAL = CLOSED_CONFIRMED.**

| Utterance (probe propio) | need | planner | CEL handle |
|--------------------------|------|---------|------------|
| Como vamos? | EXECUTIVE_STATUS | unknown | sí |
| Como vamos hoy? | EXECUTIVE_STATUS | daily_executive_brief | **sí** |
| Como estamos hoy? | EXECUTIVE_STATUS | daily_executive_brief | sí |
| como anda la planta ahora | EXECUTIVE_STATUS | unknown | sí |
| que situacion hay | EXECUTIVE_STATUS | unknown | sí |
| Dame el resumen diario | specialized | unknown | no |
| Dame el brief de hoy | specialized | unknown | no |
| Cual es el reporte diario? | specialized | unknown | no |
| Necesito el panorama de ayer | specialized | unknown | no |
| Cuentame que paso ayer | specialized | daily_executive_brief | no |

No hay `if (text === ...)`. Need gana al planner daily cuando el marco es estado de planta. Brief inequívoco con `hoy`+`resumen` llega a daily en harness (`Dame el resumen de hoy`).

## 4. M2 — explicit plant

**Reproduced: NO. FINAL = CLOSED_CONFIRMED.**

| Caso | Resultado |
|------|-----------|
| E underspecified + UI Acapulco | `ui_plant_anchor` id=1 |
| A catálogo válido + Puebla | `explicit_plant` id=2 |
| B sin catálogo + Puebla | `ASK_CLARIFICATION` unresolved; no id=1 |
| C GA plantas=[1] + Puebla | `NOT_AUTHORIZED` 403 |
| D Veracruz fuera de catálogo | clarificación; no Acapulco |

Harness: sin catálogo no carga evidencia; GA 403. Sin leak.

## 5. M3 — ship dependency

**Validated: YES. FINAL = CLOSED_CONFIRMED.**

Físico: `require("./director-ia-executive-cycle-composer")` para `isPreCloseQuestion`. CEL no redefine esa función. Composer no duplicado. Constantes: `CEL_SHIP_DEPENDENCY=PRE_CLOSE_SHARED_COMPOSER`, `ISOLATED_CEL_SHIP=false`. PRE_CLOSE suite 0 fail. Dependencia reconocida; no es falla runtime.

## 6. MINOR revalidation

**F-CUE-001 NOT_REPRODUCED.** `vamos`, `estamos`, `vamos a ver`, `vamos con Puebla`, `estamos revisando acciones`, `vamos a la junta` → `no_need`. Estado real (`Cómo vamos/estamos/va la planta/estamos hoy`) → EXECUTIVE_STATUS.

**F-DICF-001 NOT_REPRODUCED.** Variantes originales y «no se hizo nada» / «nadie actuó» → «No encontré una acción DICF asociada.»

**F-PER-001 NOT_REPRODUCED.** Labels de negocio: `2026-07`, `2026-08`, `2026-06`, `2026-08-23`, `2026-07-01→2026-07-31`. Ausentes: `snapshot`, `bitacora_window`, `action_dates`, `materialized_cache`. `COMPARE_WITH_LABELS`, `fuse=false`.

**F-LEFT-001 DEFERRED_CONFIRMED.** `buildPlantDiagnosisPrompt` sigue pidiendo «señala primero los clientes». Chat lo usa solo en el path `plant_diagnosis` (~L4449) cuando CEL **no** intercepta. Prompt CEL: `PACK EJECUTIVO`, sin ese dump. Corregirlo ampliaría plant_diagnosis. No CLOSED.

## 7. Semantic need

Need determinista sobre planner para `unknown|plant_diagnosis|daily_executive_brief`. Planner sigue execution. No mega-intent. No LLM-only. No phrase equality.

## 8. UI anchor / explicit / AUTHZ

UI ancla solo underspecified. Explícita prevalece. AUTHZ después del scope. Ancla ≠ permiso.

## 9. Executive composer / source dump

Pack tipado + contrato + GPT wording. No `SOURCE_DUMP_WITH_PROMPT` en path CEL. Periodos en el pack **antes** del wording.

## 10. commercial_trend / channels / periods / missing

Trend CONDITIONAL, truth `OLS_CASA_COMISIONISTA`, no actual/forecast/target. CASA PARTIAL; PORTÁTIL/CARBURACIÓN NOT_AVAILABLE independientes. Missing ARR `venta_ton: null` → UNAVAILABLE, no 0.

## 11. Greeting / specialized / future / No-Orphan

Hola + Acapulco: contextual, sin OpenAI, sin lista STALE. Junta / pre-cierre / cierre julio / IGF: specialized, no CEL. Steering store IMPLEMENTED; chat PENDING; POST_CAPTURE_READ PENDING; Plaud PENDING_INTEGRATION; Council PENDING; live PENDING. Ledger intacto.

## 12. LOCAL_E2E_HARNESS_VALIDATION

**PASS** (harness existente; no es MANUAL_CHAT).

| Pregunta | Resultado |
|----------|-----------|
| Como vamos? | CEL / ui_plant_anchor / id 1 |
| Como vamos hoy? | CEL (planner daily) / no mode daily |
| Como va Puebla? | CEL / explicit / id 2 loaded |
| Dame el resumen de hoy | daily_executive_brief, no composer |
| Hola | saludo Acapulco, sin evidencia |
| Puebla sin catálogo | clarificación unresolved |
| GA + Puebla | 403 |

## 13. Production / manual

`PRODUCTION_MANUAL_VALIDATION = NOT_YET_TESTABLE` (CEL fuera de origin/main). Observación Render pre-CEL no usada.
`MANUAL_CHAT_VALIDATION = PENDING`.

## 14. Findings table

| ID | ORIGINAL_SEVERITY | FIX_STATUS | REAUDIT_REPRODUCED | EVIDENCE | FINAL_STATUS |
|----|-------------------|------------|--------------------|----------|--------------|
| M1 / F-INT-001 | MAJOR | CLOSED | NO | need+harness cómo vamos hoy → CEL | CLOSED_CONFIRMED |
| M2 / F-SCOPE-001 | MAJOR | CLOSED | NO | empty catalog → clarify, no UI | CLOSED_CONFIRMED |
| M3 / F-WT-001 | MAJOR | CLOSED | N/A (validated) | require+constantes+PRE_CLOSE green | CLOSED_CONFIRMED |
| F-CUE-001 | MINOR | CLOSED | NO | cues sueltos = no_need | CLOSED_CONFIRMED |
| F-DICF-001 | MINOR | CLOSED | NO | guard reescribe variantes auditadas | CLOSED_CONFIRMED |
| F-PER-001 | MINOR | CLOSED | NO | kind tokens ausentes del pack | CLOSED_CONFIRMED |
| F-LEFT-001 | MINOR | DEFERRED | N/A (out of CEL) | leftover solo plant_diagnosis | DEFERRED_CONFIRMED |

### OBSERVATION (no reabren el FIX)

1. Nombres de producto daily sin `hoy/ayer` (`resumen diario`, `brief de hoy`) no los secuestra CEL, pero el detector daily legado puede dejarlos en `unknown`. Preexistente.
2. «Cómo va Puebla o Veracruz?» con Puebla en catálogo resuelve Puebla (primer match), no Acapulco UI. No es el defecto M2.
3. Guard DICF no cubre «no hubo seguimiento» / «Nadie hizo nada» / «no se actuó». Las variantes del AUDIT sí.

## 15. Regression

| Suite | pass | fail | skipped |
|-------|------|------|---------|
| FIX_TESTS (CEL focales) | 40 | 0 | 0 |
| REAUDIT_INDEPENDENT_PROBES | executed | 0 required fails | 0 |
| plant_diagnosis / trend / PRE_CLOSE / daily / month_close / AF / Steering / continuity | pass | 0 | 0 |
| **FULL_REGRESSION Director IA** | **1141** | **0** | **0** |

## 16. Matrix

**10.5 / 20 = 52.5%**. Delta **0.0 pp**. Sin promoción.

## 17. Exactly one NEXT_TASK

`ARCH-DIRECTOR-IA-ACCUMULATED-SHIP-READINESS-001`

Única tarea: inventariar el working tree acumulado (PRE_CLOSE + Steering + CEL + docs G2) con `CEL_SHIP_DEPENDENCY=PRE_CLOSE_SHARED_COMPOSER`, sin huérfanos, para habilitar después prueba humana. No deploy. No autorizada. No ejecutada. No nuevo feature conversacional.
