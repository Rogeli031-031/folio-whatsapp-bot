# AUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS_WITH_FINDINGS"
mode: "AUDIT / EVALUATION"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
docs_director_ia_changes: false
critical: 0
major: 3
minor: 4
observation: 3
impl_tests: "29/29 pass (not accepted as sole evidence)"
auditor_independent_probes: "constructed and executed via node -e + askDirectorIa harness"
full_regression: "1130/0/0"
production_manual_validation: "NOT_YET_TESTABLE"
local_manual_equivalent: "AVAILABLE_VIA_ASKDIRECTORIA_HARNESS"
manual_chat_validation: "PENDING"
next_task_proposed: "FIX-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Executive verdict

**PASS_WITH_FINDINGS.**

El first slice C existe físicamente y resuelve las dos causas raíz del AUDIT E2E para los enunciados canónicos:

- «¿Cómo vamos?» + UI Acapulco → `EXECUTIVE_STATUS` + ancla UI + composer (no `unknown`).
- «¿Cómo va Acapulco?» → pack determinístico + contrato de composición (no `señala primero MATERIALIDAD`).

No es phrase patch de igualdad (`text === "como vamos"`). No hay CRITICAL. AUTHZ fail-closed se reproduce. Specialized modes no se rompen. Steering/Plaud/Council/live no se fingen.

Hay **3 MAJOR** que impiden PASS limpio:

1. La need layer **no queda por encima del planner** cuando otro intent gana: «cómo vamos hoy» → `daily_executive_brief`, CEL no intercepta.
2. Planta explícita **sin catálogo** se resuelve en silencio a la planta UI.
3. CEL `require` el composer PRE_CLOSE **untracked** (`director-ia-executive-cycle-composer.js`), que no pertenece al slice C.

`MANUAL_CHAT_VALIDATION = PENDING`.  
`PRODUCTION_MANUAL_VALIDATION = NOT_YET_TESTABLE`.

## 2. Scope

Auditado: IMPL CEL slice C vs AUDIT E2E + ARCH CEL. Working tree real, sin restore. No se reinterpretó la prueba de Render como FAIL ni PASS del slice.

## 3. Independence method

- Lectura física de `lib/director-ia-conversational-executive-layer.js` y wiring en `lib/director-ia-chat.js`.
- Probes `node -e` (preguntas **no** copiadas del archivo de tests IMPL).
- `askDirectorIa` con loaders inyectados (harness existente; no se creó infraestructura).
- Reejecución de suites (IMPL_TESTS + FULL_REGRESSION) **después** de los probes, no como única evidencia.
- El reporte IMPL no se tomó como prueba.

## 4. Semantic need audit

**PARTIAL → PASS del caso canónico; MAJOR en el intercept.**

`resolveExecutiveNeed` usa cues de progreso/situación + exclusiones (especializado, AR, steering, needs posteriores). Normaliza acentos y `?`. No hay `if (text === "como vamos")`.

Probes independientes:

| Utterance | need | planner | CEL intercepta |
|-----------|------|---------|----------------|
| como vamos? | EXECUTIVE_STATUS | unknown | **sí** |
| como andamos | EXECUTIVE_STATUS | unknown | sí |
| que esta pasando | EXECUTIVE_STATUS | unknown | sí |
| como se ve Acapulco | EXECUTIVE_STATUS | unknown | sí |
| como va todo | EXECUTIVE_STATUS | plant_diagnosis | sí |
| **como vamos hoy** | EXECUTIVE_STATUS | **daily_executive_brief** | **no** |
| **como andamos hoy** | EXECUTIVE_STATUS | **daily_executive_brief** | **no** |
| vamos / estamos / vamos a ver / andamos bien | EXECUTIVE_STATUS | unknown | sí (falso positivo) |

Causa: `hasExecutiveStatusCue` pone `vamos|estamos|andamos` en **ambos** lados del AND. Intercept CEL solo si `intent === unknown || plant_diagnosis`. ARCH pedía need **antes** del planner; IMPL dejó el planner como veto.

## 5. UI anchor audit

**PASS** para el caso obligatorio.

`¿Cómo vamos?` + UI Acapulco + catálogo → `scope_source=ui_plant_anchor`, `planta_id=1`. Periodo/módulo UI no se usan como ancla.

## 6. Explicit plant override

**PASS** con catálogo; **MAJOR** sin catálogo.

Con catálogo: «¿Cómo va Puebla?» + UI Acapulco → `explicit_plant` id=2.  
Sin catálogo: misma frase → `ui_plant_anchor` Acapulco (carga evidencia de la UI). Si `public.plantas` falla o el pool no consulta, Puebla se trata como Acapulco.

## 7. AUTHZ

**PASS.**

GA `plantas_permitidas:[1]` + Puebla → `NOT_AUTHORIZED` / 403 `SOURCE_RESTRICTED` **antes** de loaders. Ancla ≠ permiso. Sin leak en el probe.

## 8. Executive composer

**PASS** como arquitectura B.

Existe pack tipado + jerarquía condicional + una llamada GPT. El prompt ordena priorizar significado, no fuentes. `included_slots` omite UNAVAILABLE/NOT_APPLICABLE.

Límite: GPT sigue siendo last-mile. `formatPackForPrompt` aún lista items UNAVAILABLE (p.ej. TARGET). `context_meta.mode` permanece `plant_diagnosis` (continuidad).

## 9. Source-dump check

**PASS** en el path CEL.

Prompt CEL: no «señala primero los clientes», no `BLOQUE action_register`, no título MATERIALIDAD como UX. Hay `PACK EJECUTIVO`.

Leftover: `buildPlantDiagnosisPrompt` **sigue** pidiendo materialidad-first para callers no-CEL. No es el path «cómo va Acapulco» tras CEL.

## 10. commercial trend

**PASS** (CONDITIONAL, semántica no ampliada).

Se carga con `channel: both`, `range_days: 30`, compare. Truth: `OLS_CASA_COMISIONISTA` / trailing. No es actual, forecast ni target. Si abort/empty → NOT_AUTHORIZED/UNAVAILABLE; el pack de estado no aborta. Motor intacto (CASA vs comisionista).

## 11. Channels

**PASS.**

Registry: CASA PARTIAL; PORTÁTIL NOT_AVAILABLE; CARBURACIÓN NOT_AVAILABLE. Prompt prohíbe inventar. No hay código que pliegue Portátil/Carburación como canales independientes.

## 12. Period governance

**PASS** con MINOR de etiquetas.

`collectPeriodLabels` + `evaluatePeriodComposition` corren **antes** del wording. Probe: 2026-07 (CS) vs 2026-08 (ARR/IGF) vs trailing trend → `COMPARE_WITH_LABELS`, `fuse=false`, nota natural. ARR=FORECAST_PROJECTION; IGF=FORECAST_STORED.

MINOR: etiquetas `snapshot` y `bitacora_window` (kind, no calendario) también disparan «periodos distintos».

## 13. DICF truth

**PASS** para la frase auditada; MINOR en variantes.

Contrato + guard reemplazan «No se han tomado medidas.» Probe: esa frase → «No encontré una acción DICF asociada.»  
«No se tomaron medidas ni hay seguimiento.» **no** se reescribe.

## 14. Client materiality

**PASS.**

Slot DRIVERS: cache «dejaron»/«disminuyeron» por kg del periodo de esa categoría; niega «mayores clientes actuales» y causa. CEL no usa «clientes que concentran kg observados».

## 15. Missing/null

**PASS.**

ARR `venta_ton: null` → UNAVAILABLE, payload null, no 0. IGF restricted → NOT_AUTHORIZED. No hay missing→forecast.

## 16. Greeting

**PASS.**

«Hola» + Acapulco → `Hola. Estoy en Acapulco. ¿Qué quieres revisar?` Early return, `openai_called` ausente, sin lista AR/DICF/bitácoras. Sin planta: `Hola. ¿Qué quieres revisar?`

## 17. Specialized modes

**PASS.**

| Pregunta | Planner | CEL |
|----------|---------|-----|
| Prepárame para el pre-cierre | pre_meeting_brief / PRE_CLOSE | specialized, no intercepta |
| Prepárame para la junta | pre_meeting_brief | specialized |
| Cómo cerramos julio | month_close_result | specialized |
| Cómo va IGF | igf_status | specialized |
| cómo vamos en casa | commercial_trend | specialized |
| cómo va mantenimiento | action_status | no EXECUTIVE_STATUS |

ACTUAL_FINANCIAL: demand NOT_APPLICABLE en EXECUTIVE_STATUS.

## 18. Steering boundary

**PASS.** Store físico no leído. «qué decidimos en la junta» → frontera PENDING. PRE_CLOSE/junta de preparación no se finge como Steering.

## 19. Plaud/Council/live

**PASS.** Ledger: Plaud PENDING_INTEGRATION; Council PENDING; live PENDING. Demand NOT_APPLICABLE. Path Plaud→…→CEL preservado en texto, no implementado.

## 20. No-Orphan

**PASS.** Ledger conserva commercial_trend, ACTUAL_FINANCIAL, PRE_CLOSE, Steering, POST_CAPTURE_READ, Plaud, Council, live. POST_CAPTURE_READ no ejecutado.

## 21. Working-tree dependency risk

**MAJOR.**

CEL hace `require("./director-ia-executive-cycle-composer")` (`isPreCloseQuestion`). Ese archivo **no está en HEAD/origin/main**; es el bloque PRE_CLOSE untracked. Un extract/ship solo del slice C no carga. El planner sucio también depende de ese módulo; HEAD no.

Riesgo de ship del árbol sucio: mezclaría PRE_CLOSE + Steering + G2 docs + CEL.

## 22. Production validation status

**PRODUCTION_MANUAL_VALIDATION = NOT_YET_TESTABLE**

```
LOCAL_HEAD = 1ebd81a9bae045d1ee7d4936449b19adc4be47b3
ORIGIN_MAIN = 1ebd81a9bae045d1ee7d4936449b19adc4be47b3
```

CEL solo en working tree. La frase vista en folio-dashboard.onrender.com es el `unknown` del planner en `1ebd81a9`. **No es PASS. No es FAIL del slice.**

## 23. Local E2E status

**AVAILABLE_VIA_ASKDIRECTORIA_HARNESS** (no HTTP local, no DB real).

`askDirectorIa` + `configureDirectorIaChat` (harness existente):

- UI Acapulco + «Como vamos?» → EXECUTIVE_STATUS, composer, ui_plant_anchor, planta 1.
- «Como va Acapulco?» → composer, `prompt_mode=executive_status`.
- «Como va Puebla?» ZP → explicit_plant id 2; GA → 403.
- «Hola» → saludo contextual.
- «Como vamos hoy» → **daily_executive_brief** (sin CEL).
- «vamos a ver» → CEL (falso positivo).

No es chat real contra Postgres. No sustituye MANUAL_CHAT_VALIDATION.

## 24. Independent probes

| Probe | Result |
|-------|--------|
| need + variantes + falsos positivos | pass (hallazgos documentados) |
| scope UI / Puebla / GA / no-catálogo / no-ancla | pass |
| pack periodos / canales / dump markers / DICF / missing | pass |
| askDirectorIa canónico + hoy + vamos a ver | pass |
| skipped: HTTP local / Render / DB live | skipped |

AUDITOR_INDEPENDENT_PROBES: **executed / no skipped-as-green**.

## 25. Regression

| Suite | pass | fail | skipped |
|-------|------|------|---------|
| IMPL CEL focales | 29 | 0 | 0 |
| plant_diagnosis | pass | 0 | 0 |
| continuity / chat | pass | 0 | 0 |
| commercial_trend | pass | 0 | 0 |
| PRE_CLOSE | pass | 0 | 0 |
| month_close_result | pass | 0 | 0 |
| ACTUAL_FINANCIAL | pass | 0 | 0 |
| Steering Capture | pass | 0 | 0 |
| **Director IA full** | **1130** | **0** | **0** |

Los tests IMPL no cubren «cómo vamos hoy» ni el fallback sin catálogo.

## 26. Findings

### CRITICAL (0)

Ninguno.

### MAJOR (3)

**F-INT-001.** Need EXECUTIVE_STATUS no intercepta si el planner ya eligió otro intent. «cómo vamos hoy» / «cómo andamos hoy» → `daily_executive_brief`. Viola «need layer sobre planner» para variantes naturales.

**F-SCOPE-001.** Sin catálogo resoluble, «¿Cómo va Puebla?» + UI Acapulco carga Acapulco. Override explícito no es fail-closed.

**F-WT-001.** CEL depende de `director-ia-executive-cycle-composer.js` (PRE_CLOSE, untracked). El slice C no es aislable del working tree acumulado.

### MINOR (4)

**F-CUE-001.** Intersección `vamos|estamos|andamos` en ambos lados de `hasExecutiveStatusCue` → «vamos», «vamos a ver», «andamos bien» entran a CEL.

**F-DICF-001.** Guard solo de la frase exacta «no se han tomado medidas».

**F-PER-001.** Labels `snapshot` / `bitacora_window` se tratan como periodos distintos.

**F-LEFT-001.** `buildPlantDiagnosisPrompt` leftover sigue materialidad-first fuera de CEL.

### OBSERVATION (3)

- `context_meta.mode` = `plant_diagnosis` en respuestas CEL.
- Ausencia de dump depende en parte del wording GPT.
- Pack imprime slots UNAVAILABLE (TARGET).

## 27. Matrix

Before/after: **10.5 / 20 = 52.5%**. Delta **0.0 pp**. Sin promoción.

## 28. Manual validation status

`MANUAL_CHAT_VALIDATION = PENDING`  
`PRODUCTION_MANUAL_VALIDATION = NOT_YET_TESTABLE`

Aun con este AUDIT, falta: FIX de MAJORs, E2E local/runtime cuando se autorice, ship controlado, prueba en Render.

## 29. Readiness

**READY_FOR_FIX**, no READY_TO_SHIP.

El caso canónico del AUDIT E2E está implementado en working tree. No desplegar. No extraer CEL solo. No tratar tests verdes como UX aprobada.

## 30. Exactly one NEXT_TASK

`FIX-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001`

Corregir F-INT-001, F-SCOPE-001 y F-WT-001 (y MINOR si caben en el mismo fix). No autorizada. No ejecutada. No abrir el siguiente slice conversacional.
