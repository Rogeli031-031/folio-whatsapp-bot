# SPRINT1-DIRECTOR-IA-FORECAST-NATURAL-LANGUAGE-PARITY-AUDIT-001

tipo: AUDITORÍA CONTRACTUAL — SOLO LECTURA
outcome: INFORME
AUDIT_ONLY: YES

```yaml
task_id: SPRINT1-DIRECTOR-IA-FORECAST-NATURAL-LANGUAGE-PARITY-AUDIT-001
outcome: AUDIT_ONLY
current_task_untouched: true
current_task_id: SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-ADDITIVE-001
current_task_status: DONE_PENDING_REVIEW
loop_gate: "Esta auditoría no abre CURRENT_TASK ni autoriza implementación."
branch_at_audit: main
branch_note: "Lectura + un archivo de reporte nuevo. Sin implementación. Sin git add/commit/push."
files_touched:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-NATURAL-LANGUAGE-PARITY-AUDIT-001.md
files_not_touched:
  - código de producto
  - tests
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/
  - authoritative forecast run pack
  - PROM / IGF / ARR / Excel
  - Dashboard
  - commercial-trend-engine
git: none
sql: none
secrets_check: none
```

Clasificación de afirmaciones: **PROVEN** | **NOT_PROVEN** | **NOT_APPLICABLE**.

Método: inspección de código + ejecución de solo lectura de las funciones de producción (`node -e` requiriendo módulos existentes). No se usó una sesión de chat de producción ni logs de Puebla. Los números Puebla del prompt son evidencia humana de reproducción, no contrato.

Un resultado de auditoría **no autoriza implementación**.

---

## 1. Executive Summary

Director IA **ya tiene** un camino autoritativo de magnitud Forecast:

`classifyForecastMagnitudeFollowUp` → `handleForecastMagnitudeFollowUpForChat` → `buildAuthoritativeForecastRunPack` → `FORECAST_PROJECTION.<metric>`.

Ese camino **sí** responde frases canónicas como:

«¿Cuál es el descuento forecast al corte que estás usando?»

El fallo observado:

«¿Qué descuento proyectamos para el cierre?»

**no** entra a ese camino. El detector de magnitud devuelve `null`. El planner queda `unknown` / `no_rule_matched` (confianza 0.35). Tras «¿Cómo vamos?», la continuidad hereda `parent_intent = plant_diagnosis`. El handler de diagnóstico de planta carga AR + DICF + bitácora + ARR + IGF + commercial_state y el prompt **ordena** empezar por MATERIALIDAD COMERCIAL. ARR aparece porque ese pack **siempre** incluye `arr.proyeccion_planta`, no porque la pregunta sea ARR. `forecast_run` puede existir en el estado; **nunca se consulta** porque el handler de magnitud no se invoca.

Causa raíz lingüística (PROVEN):

La conjunción de descuento exige

`\bdescuento\b` **y** `\b(forecast|proyectad|al corte|estas usando)\b`.

El token `\bproyectad\b` **no coincide** con `proyectado`, `proyectada` ni `proyectamos` (la frontera de palabra cae dentro del lexema). `cierre` / `cerrar` no forman parte de la conjunción. Por eso «proyectamos para el cierre» no es Forecast para el detector.

No todas las variantes A1–A10 fallan. A1–A4 PASS. A5–A10 FAIL, por dos mecanismos distintos:

- A5, A7, A8, A9, A10: detector `null` → inherit `plant_diagnosis`.
- A6: `isPreCloseQuestion` (`para cerrar`) marca la pregunta como specialized standalone → `pre_meeting_brief`. El detector de magnitud ni siquiera evalúa la conjunción.

No hace falta un motor nuevo, ni phrasebook, ni cambiar Forecast/ARR/IGF/Dashboard. El cambio mínimo posterior es **extender el detector existente** (y, solo si se incluye A6, acotar el gate `para cerrar`).

---

## 2. Scope

Dentro de alcance:

- paridad de lenguaje natural hacia la capacidad Forecast **ya implementada**;
- traza de routing de la frase observada y de A1–A10, B1–B10, C1–C7;
- por qué gana `plant_diagnosis`, MATERIALIDAD y ARR;
- por qué no se usa `forecast_run`;
- recomendación de cambio mínimo y matriz de tests.

Fuera de alcance (no diseñado, no implementado):

- recálculo o rediseño de Forecast / pack / `run_identity` / cutoff;
- IGF / PROM / ARR / Estado Ejecutivo / Commercial Movers / Dashboard;
- phrasebook literal de frases;
- dos mensajes Estado Ejecutivo + Movers;
- saludo personalizado por usuario autenticado;
- modificar `CURRENT_TASK.md`.

---

## 3. Protected Baseline

No se tocó ni se propone tocar en esta auditoría:

| Superficie | Estado |
|---|---|
| Authoritative forecast run pack / fórmulas / `run_identity` | protegida |
| Direct bootstrap (`yearMonthFromCutoffYmd` + mini + pack) | protegida |
| IGF Forecast / IGF stored / PROM | protegida |
| ARR (cálculo, loaders, semántica) | protegida |
| Estado Ejecutivo «¿Cómo vamos?» (campos, nombres, obligatoriedad) | protegida |
| Commercial Movers / commercial-trend-engine / ventanas 30d/90d | protegida |
| Dashboard (endpoints, UI, gráfica, filtros, persistencia) | protegida |
| Continuidad conversacional global | no se propone cambio global |

`DASHBOARD_BEHAVIOR_CHANGED` debe permanecer **NO** en cualquier implementación futura.

---

## 4. Exact Production Reproduction

### 4.1 Evidencia humana (sesión Puebla)

Turno 1: «¿Cómo vamos?» — planta Puebla, corte 2026-08-31.

El prompt de auditoría declara que Director IA respondió magnitudes de una corrida vigente, entre ellas:

- FORECAST_PROJECTION venta ≈ 1161.5 t
- FORECAST_PROJECTION descuento = **−4.53 $/kg**
- FORECAST_STORED venta ≈ 1158.9491 t
- FORECAST_STORED descuento ≈ 4.539 $/kg
- utilidad operativa / resultado final Forecast presentes

Turno 2: «¿Qué descuento proyectamos para el cierre?»

Resultado observado: **no** −4.53 $/kg. En su lugar: MATERIALIDAD COMERCIAL + AR + DICF + commercial_state + bitácora + ARR + IGF, con ARR descuento ≈ −4.54.

Clasificación de esos números y de esa sesión concreta: **NOT_PROVEN** en esta auditoría (no hay log, ni dump de `conversation_state`, ni query a Puebla). Se aceptan como **reproducción humana** que motiva el caso.

### 4.2 Reproducción de routing en código (sin LLM, sin DB)

Ejecución de las funciones de producción sobre la frase exacta, con `echoedState.parent_intent = plant_diagnosis` y `forecast_run.effective_cutoff_date = 2026-08-31`:

| Paso | Resultado | Clasificación |
|---|---|---|
| Normalización | `que descuento proyectamos para el cierre` | **PROVEN** |
| `classifyForecastMagnitudeFollowUp` | `null` (con y sin run/hilo) | **PROVEN** |
| `detectDirectorIaIntent` | `unknown` / `no_rule_matched` / 0.35 | **PROVEN** |
| `planDirectorIaQuestion` fresco | `unknown` | **PROVEN** |
| `planDirectorIaQuestion` + inherit `plant_diagnosis` | `plant_diagnosis` | **PROVEN** |
| `resolveConversationTurn` (hilo ejecutivo) | `inherit=true`, `inherit_parent_intent=plant_diagnosis` | **PROVEN** |
| `shouldHandleExecutiveStatus` | `false` | **PROVEN** |
| Handler que `askDirectorIa` invocaría | `plant_diagnosis` (`lib/director-ia-chat.js` ~4948) | **PROVEN** el mecanismo; **NOT_PROVEN** el texto LLM de esa sesión |

Que el Turno 1 deje `parent_intent: "plant_diagnosis"` y `forecast_run` es **PROVEN** en `handleExecutiveStatusForChat` (`director-ia-chat.js` ~3193–3200). Que esa sea exactamente la sesión Puebla es **NOT_PROVEN** (no hay log). Es el único flujo canónico de «¿Cómo vamos?».

---

## 5. Current Routing Trace

Pregunta exacta: «¿Qué descuento proyectamos para el cierre?»

### 5.1 Normalización de la pregunta

`normalizeExecutiveText` (CEL ~205–212): NFD, quita acentos, minúsculas, quita `¿?¡!.,;:`.

Resultado: `que descuento proyectamos para el cierre`.

**PROVEN.**

### 5.2 Detectores evaluados (orden real)

Orden en `classifyForecastMagnitudeFollowUp` (CEL ~365–409):

1. vacío → no
2. `isExecutiveStatusQuestion` → **false** (tiene `descuento` sin `planta` y no es cutoff-aware ni plant-level financial con cue «cómo va»). **PROVEN.**
3. `hasExecutiveStatusCue` → **false** (exige `como` + `va|vamos|…`; aquí no hay `como`). **PROVEN.**
4. `isSpecializedStandaloneQuestion` → **false** (A5 no es IGF/ARR keyword, no pre-close, no month-close, no trend, no profile, no brief diario). **PROVEN.**
5. `\b(cliente|ayer)\b` → **false**. **PROVEN.**
6. cutoff-aware «llevamos vendido…» → **false**. **PROVEN.**
7. venta proyectada / «cuál es el forecast» → **false**. **PROVEN.**
8. descuento ∧ `(forecast|proyectad|al corte|estas usando)` → **false**. **PROVEN.**
9. `^y el descuento$` / `^el descuento$` + run + hilo → **false**. **PROVEN.**
10. utilidad operativa / resultado final → **false**. **PROVEN.**

Retorno: `null`. **PROVEN.**

Detectores planner (`detectDirectorIaIntent`, orden específico → general):

- daily sales/discount (`ayer`) → no. **PROVEN.**
- `isPreCloseQuestion` → **false** (A5 no tiene `para cerrar`; `cierre` + `\bde\b` no aplica: no hay palabra `de`). **PROVEN.**
- `isMonthCloseQuestion` → **false** (`cierre` sin `mes`/`planta`/`venta`/`meta`/`forecast`/`proyeccion`). **PROVEN.**
- `\barr\b` / `\bigf\b` → no. **PROVEN.**
- `isArrForecastQuestion` (anexo, no intent planner) → **false**. **PROVEN.**
- `isPlantFinancialKpiQuestion` → **true** (`PLANT_FINANCIAL_KPI_RE` incluye `\bdescuento\b`). **PROVEN.** No crea intent; solo marca KPI/anexo.
- plant_diagnosis literal (`como va la planta`, etc.) → no. **PROVEN.**
- cae en `unknown` / `no_rule_matched`. **PROVEN.**

### 5.3 Planner intent

- Detectado: `unknown`. **PROVEN.**
- Con inherit de hilo ejecutivo: `plant_diagnosis`. **PROVEN** (`planDirectorIaQuestion` ~743–754: inherit solo si `detected.intent === "unknown"`).

### 5.4 Confidence

- Detectado: **0.35**. **PROVEN.**
- Tras inherit: `Math.max(0.35, 0.8) = 0.8` y se limpia `requires_clarification`. **PROVEN** (`planner.js` ~784–788).

### 5.5 parent_intent

Tras Turno 1 «¿Cómo vamos?», CEL escribe `parent_intent: "plant_diagnosis"` y `last_evidence_bundle_type: "plant_diagnosis"`. **PROVEN** (`director-ia-chat.js` ~3196–3198).

Que eso ocurriera en Puebla: **NOT_PROVEN** (sin log). Flujo canónico: **PROVEN**.

### 5.6 Continuidad conversacional

`classifyTurnKind` → `other`. **PROVEN.**

`INHERITABLE_INTENTS` incluye `plant_diagnosis`. **PROVEN.**

`isStandaloneDetected(unknown)` → `false`. **PROVEN** (`conversation-state.js` ~677–678).

`isolatedUnknown` + `validInheritContext` + `!standalone` → `inherit = true`, `inherit_parent_intent = plant_diagnosis`. **PROVEN** (`conversation-state.js` ~880–900, ~957–967).

`askDirectorIa` asigna `planOptions.inheritParentIntent` (no `forceIntent`; `plant_diagnosis` no está en el bloque de force). **PROVEN** (`director-ia-chat.js` ~3638–3640).

### 5.7 Herencia de intent

Sí: `unknown` → `plant_diagnosis`. No es que A5 sea diagnóstico de planta. **PROVEN.**

### 5.8 CEL

`resolveExecutiveNeed` → `{ need_type: null, reason: "no_need" }`. **PROVEN.**

`shouldHandleExecutiveStatus` → `false`. **PROVEN.**

CEL **no** intercepta A5. **PROVEN.**

### 5.9 Detectores Forecast

Único detector de magnitud Forecast en el chat: `classifyForecastMagnitudeFollowUp`. Resultado `null`. **PROVEN.**

No existe un intent planner `forecast_projection` / `forecast_magnitude`. Las frases que funcionan también son `unknown` en el planner; el detector gana **después** del planner (`askDirectorIa` ~3683–3700). **PROVEN.**

### 5.10 Detectores ARR

`isArrForecastQuestion(A5)` → **false**. **PROVEN.**

`/\barr\b/` planner → no. **PROVEN.**

ARR **no gana** el intent. ARR entra como **dominio del pack** de `plant_diagnosis`. **PROVEN.**

### 5.11 Detectores plant financial KPI

`isPlantFinancialKpiQuestion(A5)` → **true** por la palabra `descuento`. **PROVEN.**

Ese flag, en el chat legado (`askDirectorIa` ~5208–5245), desviaría a `igf_arr_focused`. El handler que gana aquí es el **dedicado** `plant_diagnosis` (~4948), que **no** usa ese flag; usa `buildPlantDiagnosisPrompt`. **PROVEN.**

### 5.12 plant_diagnosis

Handler final si hay inherit. **PROVEN** el cableado. **NOT_PROVEN** el texto exacto de la sesión Puebla.

### 5.13 Handler finalmente seleccionado

`plant_diagnosis` → `loadPlantDiagnosisForChat` / `assemblePlantDiagnosisEvidence` → `buildPlantDiagnosisPrompt` → OpenAI. **PROVEN.**

### 5.14 Fuentes que termina cargando

`INTENT_DOMAIN_MAP.plant_diagnosis` = `action_register`, `dicf`, `bitacora`, `arr`, `igf`, `commercial_state`. **PROVEN.**

`listedSources()` = AR + DICF + bitácora + `arr.proyeccion_planta` + IGF + CS. **PROVEN** (`plant-diagnosis.js` ~1413–1414).

### 5.15 Por qué aparece MATERIALIDAD COMERCIAL

El user prompt de `buildPlantDiagnosisPrompt` incluye literalmente:

«Si hay MATERIALIDAD COMERCIAL, señala primero los clientes…»

**PROVEN** (`plant-diagnosis.js` ~1405). El contexto formatea un bloque `MATERIALIDAD COMERCIAL (kg homogéneos…)` cuando `commercial_materiality.enabled`. **PROVEN** (~1281–1283).

No es un detector de materialidad sobre A5. Es instrucción fija del pack de planta.

### 5.16 Por qué aparece ARR

1. El pack de planta **siempre** mapea `arrRaw` → bloque ARR con `desc_kg`. **PROVEN** (~508, ~1347–1353, ~1383).
2. El compose de fuentes del chat legado, si se usara, añade `arr.forecast` cuando la pregunta tiene `\bdescuento|venta|arr\b`. **PROVEN** (`director-ia-chat.js` ~2616–2617). En el handler dedicado no es necesario: ARR ya está en el pack.
3. `isArrForecastQuestion(A5)` es false. ARR no es el intent. **PROVEN.**

El −4.54 observado: **NOT_PROVEN** como número (sin payload). La **familia** (ARR `desc_kg`, no `FORECAST_PROJECTION.descuento`) es **PROVEN**.

### 5.17 Por qué NO se utiliza forecast_run aunque exista

`forecast_run` solo se lee para magnitudes dentro de `handleForecastMagnitudeFollowUpForChat` (~3267–3270). Esa función **solo** se llama si `classifyForecastMagnitudeFollowUp` es truthy (~3692–3700).

Con detector `null`, el router nunca entra. El estado puede conservar la corrida: `conversationStateForIntent` **preserva** `incoming.forecast_run` si el handler de planta no lo pisa (~2736–2739). `handleExecutiveStatusForChat` sí la escribe. El handler de planta no la usa para responder.

**PROVEN.**

`has_authoritative_run` + `executive_hilo` solo relajan «y el descuento» / utilidad / resultado. **No** crean match para `proyectamos` + `cierre`. **PROVEN.**

---

## 6. Root Cause

### RC-1 — Conjunción de descuento demasiado estrecha y token `proyectad` inerte

**PROVEN.**

```390:395:lib/director-ia-conversational-executive-layer.js
  if (/\bdescuento\b/.test(q) && /\b(forecast|proyectad|al corte|estas usando)\b/.test(q)) {
    return { kind: "descuento" };
  }
  if ((/^y el descuento$/.test(q) || /^el descuento$/.test(q)) && hasRun && executiveHilo) {
    return { kind: "descuento" };
  }
```

Ejecución del alternativo `\bproyectad\b`:

| Lexema | `\bproyectad\b` | `\bproyectad` (sin `\b` final) |
|---|---|---|
| proyectad | true | true |
| proyectado | **false** | true |
| proyectada | **false** | true |
| proyectamos | **false** | **false** |
| proyeccion | **false** | **false** |

`proyectad` como palabra completa no aparece en español natural. El stem con **ambas** fronteras de palabra no cubre adjetivo ni 1ª persona plural.

A5 tiene `descuento` y `proyectamos` + `cierre`. No tiene `forecast`, ni `al corte`, ni `estas usando`, ni el literal `y el descuento`. → `null`.

### RC-2 — El planner no tiene intent Forecast de magnitud

**PROVEN.** Las frases que SÍ funcionan (A1–A4) también detectan `unknown`. Las salva el detector **posterior**, no el planner. Si el detector falla, el hilo hereda `plant_diagnosis`.

### RC-3 — Inherit de `unknown` hacia `plant_diagnosis`

**PROVEN** el mecanismo. Es la razón por la que A5, en hilo de «¿Cómo vamos?», no aclara ni hace bootstrap: el inherit impide `unknown` sin continuidad (~3711).

### RC-4 (colisión distinta, A6) — `para cerrar` es pre-cierre

**PROVEN.** `isPreCloseQuestion` retorna true ante `\bpara cerrar\b` (`executive-cycle-composer.js` ~142). Eso:

- marca `isSpecializedStandaloneQuestion` = true → el detector de magnitud retorna `null` **antes** de la conjunción;
- el planner emite `pre_meeting_brief` / `pre_close_compose` / 0.9;
- `standalone=true` → **no** hereda `plant_diagnosis`.

A6 no es el caso Puebla observado. Es un segundo hueco si se pide paridad de «cerrar el mes».

No hay una sola «falta de regex» como explicación completa: hay **un detector inerte para proyect\* / cierre** y **un gate specialized** que roba A6 (y C3, ver §18).

---

## 7. Why forecast_run Was Not Used

| Afirmación | Clasificación |
|---|---|
| Tras «¿Cómo vamos?», el estado puede llevar `forecast_run` + `forecast_magnitudes` ligados a `run_identity` | **PROVEN** el código de escritura; **NOT_PROVEN** el dump Puebla |
| `handleForecastMagnitudeFollowUpForChat` reutiliza `sanitized.forecast_run` | **PROVEN** |
| Esa función no se llama si el detector es `null` | **PROVEN** |
| `has_authoritative_run` no amplía la conjunción `proyectamos`/`cierre` | **PROVEN** |
| El pack se recalcula o se omite por identidad incompatible | **NOT_APPLICABLE** (nunca se llegó al pack) |
| `forecast_run` se borra al heredar plant_diagnosis | **PROVEN** que **no** se borra por omisión de `opts.forecast_run` |

Conclusión: la corrida no se usó por **no entrar al handler**, no por incompatibilidad de identidad ni por fallback a stored.

---

## 8. Why plant_diagnosis Won

No porque A5 coincida con las reglas literales de diagnóstico (`como va la planta`, etc.). Esas reglas **no** disparan. **PROVEN.**

Gana por esta cadena:

1. Detector de magnitud = `null` (RC-1).
2. Planner = `unknown` (RC-2).
3. Hilo = `parent_intent` inheritable `plant_diagnosis` (RC-3).
4. `inheritParentIntent` sustituye el intent.
5. `askDirectorIa` despacha `if (directorIaPlan.intent === "plant_diagnosis")`.

Principio contractual del prompt:

`EXPLICIT CURRENT-TURN INTENT > GENERIC INHERITED INTENT`

El turno actual **sí** tiene evidencia semántica (descuento + proyectamos + cierre), pero **ningún detector la eleva a intent explícito**. La herencia genérica gana por vacío, no por conflicto de dos intents Forecast vs planta.

No se requiere un cambio global de continuidad si el detector eleva A5 a magnitud. **PROVEN** que A1–A4 ya conviven con el mismo inherit: el detector gana **después** y corto-circuita.

---

## 9. Why MATERIALIDAD COMERCIAL Appeared

**PROVEN:** es copy fijo del prompt de `plant_diagnosis`, más un bloque de evidencia `commercial_materiality` en el contexto ensamblado.

No hay detector «esta pregunta es materialidad». Cualquier inherit a `plant_diagnosis` puede producir ese encabezado si el pack trae materialidad enabled.

---

## 10. Why ARR Appeared

**PROVEN:**

- `plant_diagnosis` declara dominio `arr`.
- `assemblePlantDiagnosisEvidence` carga ARR y `formatArrPayload` imprime `desc_kg=…` con la leyenda «ARR proyección/corte de planta».
- A5 contiene `descuento` → en el compose legado también se etiquetaría `arr.forecast`.

**PROVEN que no:**

- `isArrForecastQuestion(A5)` es false.
- El planner no eligió `arr_status`.
- Nadie eligió ARR por proximidad numérica a −4.53.

ARR ≈ −4.54 y FORECAST_PROJECTION −4.53 **no son intercambiables**. El código no compara esos números para elegir fuente. El modelo ve ARR en el pack de planta y puede citarlo. **PROVEN** la presencia en el pack; **NOT_PROVEN** que el LLM de esa sesión copiara exactamente −4.54.

---

## 11. Existing Authoritative Path That Must Be Reused

**Camino A — forecast_run vigente**

```
classifyForecastMagnitudeFollowUp(kind)
  → handleForecastMagnitudeFollowUpForChat
    → previousRun = echoed.forecast_run
    → loadIgfForecastMiniPayload(year, month, plant, upload_day)
    → buildAuthoritativeForecastRunPack
    → formatForecastMagnitudeFollowUpAnswer(kind, pack)
```

- `openai_called: false`. **PROVEN.**
- `used_arr_legacy: false`, `used_forecast_stored: false`, `used_materialidad: false`. **PROVEN** (`director-ia-chat.js` ~3409–3412).
- Si la identidad no cambia, reutiliza `previousRun`. **PROVEN** (~3361–3362).
- Respuesta de descuento: `El descuento forecast al corte del {fecha} es {f.descuento} $/kg.` **PROVEN** (CEL ~423–425). Lee `pack.forecast.descuento` = FORECAST_PROJECTION, no stored, no ARR.

**No reimplementar.** Cualquier corrección lingüística debe terminar aquí.

---

## 12. Existing Direct Bootstrap Path That Must Be Reused

**Camino B — sin forecast_run, con identidad en request**

En el mismo handler (~3291–3296): si faltan year/month pero hay cutoff YMD, `yearMonthFromCutoffYmd` los deriva. Luego mini + pack.

**PROVEN.** Ya cubierto por tests de bootstrap en `test/director-ia-forecast-magnitude-followup.test.js`.

**Camino C — identidad insuficiente**

El mismo handler / `formatForecastMagnitudeFollowUpAnswer` responde UNAVAILABLE y declara que no sustituye ARR ni IGF almacenado. **PROVEN** (CEL ~417–418).

A5 **nunca llega** a B ni a C: el detector impide entrar. En chat fresco sin inherit, A5 sería `unknown` + aclaración (~3711), no UNAVAILABLE del pack. **PROVEN.**

---

## 13. Semantic Equivalence Matrix

Contexto de inspección: hilo ejecutivo (`parent_intent=plant_diagnosis`, `has_authoritative_run=true`), salvo que se indique.

| ID | Frase | Detector magnitud | Planner detectado | Ruta actual (hilo) | Resultado actual | Resultado semánticamente correcto | Colisión | Veredicto |
|---|---|---|---|---|---|---|---|---|
| A1 | ¿Cuál es el descuento forecast al corte que estás usando? | descuento (`forecast`+`al corte`+`estas usando`) | unknown | magnitude follow-up | FORECAST_PROJECTION.descuento | igual | ARR_SIGNAL `descuento forecast` **no** crea intent | **PASS** |
| A2 | ¿Cuál es el descuento forecast al corte? | descuento | unknown | magnitude follow-up | FORECAST_PROJECTION.descuento | igual | igual | **PASS** |
| A3 | ¿Cuál es el descuento forecast al corte proyectado? | descuento (gana `forecast`/`al corte`, **no** `proyectad`) | unknown | magnitude follow-up | FORECAST_PROJECTION.descuento | igual | igual | **PASS** |
| A4 | ¿Qué descuento forecast tenemos? | descuento (`forecast`) | unknown | magnitude follow-up | FORECAST_PROJECTION.descuento | igual | igual | **PASS** |
| A5 | ¿Qué descuento proyectamos para el cierre? | **null** | unknown | inherit plant_diagnosis | MATERIALIDAD + pack planta + ARR | FORECAST_PROJECTION.descuento | inherit | **FAIL** |
| A6 | ¿Qué descuento proyectamos para cerrar el mes? | **null** (specialized) | pre_meeting_brief | pre_meeting_brief | brief pre-cierre | FORECAST_PROJECTION.descuento | `para cerrar` | **FAIL** |
| A7 | ¿Con qué descuento vamos a cerrar? | **null** | unknown | inherit plant_diagnosis | pack planta | FORECAST_PROJECTION.descuento | inherit | **FAIL** |
| A8 | ¿Cuál es el descuento proyectado? | **null** (`\bproyectad\b` no pega) | unknown | inherit plant_diagnosis | pack planta | FORECAST_PROJECTION.descuento | inherit | **FAIL** |
| A9 | ¿En cuánto vamos a cerrar de descuento? | **null** | unknown | inherit plant_diagnosis | pack planta | FORECAST_PROJECTION.descuento | inherit | **FAIL** |
| A10 | ¿Qué descuento tenemos proyectado al cierre? | **null** (`proyectado` inerte; `al cierre` ≠ `al corte`) | unknown | inherit plant_diagnosis | pack planta | FORECAST_PROJECTION.descuento | inherit | **FAIL** |

No se afirma que fallen todas. A1–A4 PASS por la palabra `forecast` (y/o `al corte` / `estas usando`).

A8 se había podido malinterpretar como PASS por el stem `proyectad`. La ejecución demuestra **FAIL**. **PROVEN.**

Chat fresco (sin hilo, sin run): A1–A4 siguen PASS (el detector no exige run salvo «y el descuento»). A5/A7–A10 → `unknown` + aclaración, no bootstrap. A6 → `pre_meeting_brief`. **PROVEN.**

---

## 14. Negative / Decoy Matrix

Routing **actual**. No cambiar en esta auditoría.

| ID | Frase | Detector magnitud | Planner / ruta actual | Notas |
|---|---|---|---|---|
| B1 | ¿Qué descuento tiene el cliente X? | null (`cliente`) | unknown → inherit plant_diagnosis si hay hilo | Gate `cliente` ya bloquea Forecast. **PROVEN.** |
| B2 | ¿Qué clientes tienen mayor descuento? | null | unknown → inherit plant_diagnosis | No es Forecast. **PROVEN.** |
| B3 | ¿Cómo estuvo el descuento diario? | null | unknown → inherit plant_diagnosis | Sin `ayer`; no daily. **PROVEN.** |
| B4 | Muéstrame el ARR. | null (specialized IGF/ARR word) | `arr_status` standalone | Conservar. **PROVEN.** |
| B5 | ¿Cuál es el descuento ARR? | null (specialized + no conjunción forecast-only… tiene `arr`) | `arr_status` | Conservar. **PROVEN.** |
| B6 | ¿Cuál es el descuento almacenado en IGF? | null (specialized `\bigf\b`) | `igf_status` | FORECAST_STORED / IGF. Conservar. **PROVEN.** |
| B7 | ¿Qué acción tenemos para bajar el descuento del cliente X? | null (`cliente` + specialized) | `client_profile` standalone | Conservar. **PROVEN.** |
| B8 | ¿Qué descuento dimos ayer? | null (`ayer`) | `daily_discount_deviation` | Conservar. **PROVEN.** |
| B9 | ¿Qué descuento tiene CASA? | null | unknown → inherit plant_diagnosis | No es commercial_trend (falta tendencia+ventana). **PROVEN.** |
| B10 | ¿Por qué aumentó el descuento? | null | unknown → inherit plant_diagnosis; CEL need=`CAUSE_EXPLANATION` / `later_slice` | No hay handler de causa implementado. **PROVEN.** |

Una extensión futura **no** debe usar «descuento» solo ni «cierre» solo. Los decoys B1/B7/B8 ya están protegidos por `cliente`/`ayer`. B4–B6 por keyword IGF/ARR **antes** de la conjunción (specialized). B5 debe seguir siendo ARR, no FORECAST_PROJECTION.

---

## 15. Conversation Continuity Analysis

Turno 1 «¿Cómo vamos?» → CEL Estado Ejecutivo → `parent_intent=plant_diagnosis` + `forecast_run`. **PROVEN.**

Turno 2 A5:

- kind `other` (no plant_switch, no topic_return, no pronoun).
- No es follow-up tipado (daily/trend/month-close).
- `unknown` + inherit.

La intención explícita del turno 2 **no se materializa** como intent. La herencia genérica no «vence» a Forecast: Forecast **no llegó a existir** como clasificación.

Corrección local suficiente:

1. Hacer que A5 (y equivalentes) clasifiquen magnitud **antes** de que el inherit despache planta — el orden actual **ya** evalúa el detector después del planner. Solo falta que el detector deje de devolver `null`.
2. **No** hace falta relajar o endurecer `INHERITABLE_INTENTS` ni `isolatedUnknown`.

A6 es la excepción: el planner **sí** materializa un intent explícito (`pre_meeting_brief`) con confianza 0.9. Ahí el inherit no interviene. Hace falta acotar `para cerrar` o evaluar magnitud **antes** del gate specialized. Eso **sí** es un segundo micro-cambio, no un rediseño de continuidad.

---

## 16. FORECAST_PROJECTION vs FORECAST_STORED Analysis

En el pack autoritativo coexisten proyección y stored. El handler de magnitud lee `pack.forecast.*` (proyección). **PROVEN.**

«proyectamos» / «proyectado» es evidencia prospectiva. La frase observada debe resolver FORECAST_PROJECTION.descuento, no `FORECAST_STORED.descuento` (en Puebla, signos y magnitudes distintos según el relato humano).

B6 («almacenado en IGF») ya va a `igf_status` por `\bigf\b`. **PROVEN.** No fusionar familias.

El detector actual **no** tiene rama stored. El riesgo de stored no es el fallo de A5; el fallo es plant_diagnosis/ARR. **PROVEN.**

---

## 17. FORECAST_PROJECTION vs ARR Analysis

| Señal | A5 | A1–A4 |
|---|---|---|
| `isArrForecastQuestion` | false | **true** (`descuento forecast` ∈ `ARR_SIGNAL_RE`) |
| Intent planner ARR | no | no (`/\barr\b/` ausente) |
| Fuente que responde hoy | ARR vía pack planta (A5) | FORECAST_PROJECTION vía detector |

**PROVEN.**

Riesgo de colisión futura: si alguien enruta por `isArrForecastQuestion` en vez del detector de magnitud, **A1–A4 se romperían** (hoy se salvan por el orden en `askDirectorIa`). No cambiar `ARR_SIGNAL_RE` en la corrección mínima.

Nunca elegir fuente por cercanía −4.53 vs −4.54.

---

## 18. Venta Natural-Language Analysis

Detector actual de venta (CEL ~382–388): literales

`venta proyectada` | `cual era/es la venta proyectada` | `cual es/era el forecast` | `y el forecast`.

| ID | Frase | Detector | Ruta hilo | ¿Misma raíz que A5? | Veredicto vs FORECAST_PROJECTION.venta |
|---|---|---|---|---|---|
| C1 | ¿Cuánto proyectamos vender al cierre? | null | inherit plant_diagnosis | **Sí** (proyectamos+cierre; no hay literal) | **FAIL** |
| C2 | ¿Con cuántas toneladas vamos a cerrar? | null | inherit plant_diagnosis | **Sí** (cierre/cerrar sin literal venta/forecast) | **FAIL** (si se considera inequívoco) |
| C3 | ¿Cuál es la venta proyectada al cierre? | null | **month_close_result** standalone | **No** — el literal **sí** matchearía, pero `isSpecializedStandaloneQuestion` gana porque `isMonthCloseQuestion`: `cierre` ∧ `venta` | **FAIL** por colisión month-close |

C1 comparte RC-1 (familia lingüística). C3 comparte el **patrón de gate specialized** con A6, no el hueco del stem.

Generalizar venta en el **mismo** detector es justificado para C1 (misma causa). C2 es más ambiguo (toneladas+cerrar sin «proyect-» ni «forecast»): **AMBIGUOUS** semánticamente; no forzar Forecast sin cue prospectiva si se quiere evitar robar month-close/ARR.

C3 requiere una excepción al gate month-close **o** evaluar magnitud antes de specialized. Solo si el alcance futuro incluye C3.

---

## 19. Utilidad Natural-Language Analysis

| ID | Frase | mag + run + hilo | mag sin run | Planner |
|---|---|---|---|---|
| C4 | ¿Con qué utilidad operativa vamos a cerrar? | **utilidad** | null | unknown → inherit |
| C5 | ¿Cuál es la utilidad operativa proyectada? | **utilidad** | **utilidad** (`cual`) | unknown → inherit |

**PROVEN.** Con hilo ejecutivo (el caso crítico), C4 y C5 **ya entran** al Camino A. No comparten el defecto de descuento.

Asimetría **PROVEN:** utilidad/resultado, con `hasRun && executiveHilo`, no exigen `forecast`/`proyectad`/`cierre`. Descuento sí.

No ampliar utilidad en la corrección mínima. No hay defecto demostrado en el hilo «¿Cómo vamos?».

C4 sin run (chat nuevo sin bootstrap identity) no clasifica magnitud: **PROVEN.** Eso es Camino B/C del handler, no de esta familia lingüística.

---

## 20. Resultado Final Natural-Language Analysis

| ID | Frase | mag + run + hilo | mag sin run | `isIgfForecastQuestion` | Specialized |
|---|---|---|---|---|---|
| C6 | ¿Con qué resultado final vamos a cerrar? | **resultado** | null | **true** (`resultado final` ∈ IGF_SIGNAL) | false (no palabra `igf`) |
| C7 | ¿Cuál es el resultado final proyectado? | **resultado** | **resultado** (`cual`) | true | false |

**PROVEN.** Con hilo, C6/C7 PASS el Camino A. Misma asimetría que utilidad.

Riesgo: IGF_SIGNAL es amplio; no usarlo como specialized o se robarían C6/C7. Hoy specialized solo mira `\bigf\b`/`\barr\b`. **PROVEN** que C6 no es specialized.

No ampliar resultado en la corrección mínima.

---

## 21. Collision/Routing Risks

| Riesgo | Estado | Mitigación mínima |
|---|---|---|
| Phrasebook de A1–A10 | a evitar | abstracción magnitud ∧ (prospectivo \| cierre acotado) |
| `descuento` solo → Forecast | el detector actual no lo hace | no relajar a `descuento` desnudo |
| `cierre` solo → Forecast | month-close/pre-close ya lo usan | no crear Forecast por `cierre` sin magnitud |
| `para cerrar` → pre_meeting (A6) | **PROVEN** | acotar: no pre-close si es magnitud única sin junta/pre-cierre |
| `venta` + `cierre` → month_close (C3) | **PROVEN** | no tocar month-close salvo alcance C3 |
| `descuento forecast` → ARR_SIGNAL | true en A1–A4; no crea intent hoy | no rerutear por `isArrForecastQuestion` |
| `PLANT_FINANCIAL_KPI_RE` ∩ `descuento` | true en casi todas las A/B | no usar este flag para elegir Forecast |
| Inherit global más estricto | rompería follow-ups legítimos de planta | no |
| B1/B7/B8 | protegidos por cliente/ayer | conservar gates |
| B4–B6 | specialized IGF/ARR | conservar; evaluar specialized **después** de magnitud Forecast **solo** si la magnitud ya matcheó y no hay palabra arr/igf |
| C2 toneladas+cerrar | ambiguo vs month-close/ARR | no incluir en el primer corte |
| Cambiar `ARR_SIGNAL_RE` / `isPreCloseQuestion` en bloque | alto | no, salvo exclusión local A6 |

---

## 22. Minimum Change Recommendation

Preferencia: **REUTILIZAR > EXTENDER ACOTADAMENTE > CREAR NUEVO**.

### Cambio 1 (cubre el caso Puebla A5 y A7–A10)

Archivo: `lib/director-ia-conversational-executive-layer.js`, función `classifyForecastMagnitudeFollowUp`.

Sustituir la conjunción inerte `\bproyectad\b` por una abstracción de **tres conceptos**, no por lista de frases:

1. **Magnitud:** `\bdescuento\b` (ya existe).
2. **Prospectivo:** `forecast` **o** stem `proyec` / `proyect` **sin** frontera final que mate `proyectado|proyectada|proyectamos|proyeccion`.
3. **Cierre acotado:** `\b(cierre|cerrar|cerremos|cerramos)\b` **solo** en conjunción con (1) y no solo.

Regla propuesta (conceptual, no implementar aquí):

```
descuento
AND NOT (cliente|ayer)
AND NOT specialized IGF/ARR word
AND (
      forecast
   OR proyect/proyec-stem
   OR (cierre|cerrar AND NOT meta/junta/precierre)
)
```

Eso cubre A5 (`proyectamos` + `cierre`), A8 (`proyectado`), A10 (`proyectado` + `cierre`), A7/A9 (`cerrar` + `descuento`).

Conservar gates: `isExecutiveStatusQuestion`, `cliente`, `ayer`, y specialized **cuando la specialized es IGF/ARR/trend/profile/daily**.

No tocar utilidad/resultado (ya funcionan con hilo).

Opcional en el mismo detector, misma causa (C1): ampliar venta más allá de literales `venta proyectada` / `cual es el forecast`, p.ej. `(venta|vender|toneladas)` ∧ mismo prospectivo/cierre, **sin** C2 si se juzga AMBIGUOUS.

### Cambio 2 (solo si A6 entra al mismo corte)

No reescribir `isPreCloseQuestion` en bloque.

Excepción local: si la pregunta ya es magnitud Forecast (descuento ∧ prospectivo/cierre) **y** no hay `junta|pre-cierre|precierre|preocup`, **no** tratarla como specialized/pre-close **dentro del detector de magnitud** (evaluar magnitud antes del return specialized, o excluir ese patrón del specialized check del detector).

No cambiar el planner.

### Qué no hacer

- if (question === frase1 || frase2)
- nuevo pack / nuevo cálculo / nuevo estado persistido
- cambiar inherit global
- usar ARR o stored como fallback
- tocar Dashboard, movers, Estado Ejecutivo, IGF, PROM
- fusionar FORECAST_PROJECTION y FORECAST_STORED

Una modificación de **1 detector** (más tests) basta para el defecto demostrado en Puebla. A6 es el único FAIL que exige un segundo toque.

---

## 23. FILES_READ

| Archivo | Uso |
|---|---|
| `lib/director-ia-conversational-executive-layer.js` | normalización, detector magnitud, CEL, specialized, cutoff-aware |
| `lib/director-ia-chat.js` | orden askDirectorIa, Camino A/B, plant_diagnosis handler, conversationStateForIntent, annex ARR |
| `lib/director-ia-planner.js` | detect/plan, inherit, domain map |
| `lib/director-ia-conversation-state.js` | inherit, standalone, sanitize forecast_run |
| `lib/director-ia-executive-cycle-composer.js` | `isPreCloseQuestion` |
| `lib/director-ia-month-close-result.js` | `isMonthCloseQuestion` |
| `lib/director-ia-igf-arr.js` | ARR/IGF/KPI regex, annex |
| `lib/director-ia-plant-diagnosis.js` | MATERIALIDAD, ARR block, sources |
| `lib/director-ia-authoritative-forecast-run-pack.js` | (referencia de Camino A; no modificado) |
| `test/director-ia-forecast-magnitude-followup.test.js` | cobertura A1 canónica; no cubre A5–A10 |
| `docs/dev-loop/LOOP_PROTOCOL.md` | procedimiento |
| `docs/dev-loop/CURRENT_TASK.md` | **leído; no modificado** (otra tarea, DONE_PENDING_REVIEW) |
| `docs/dev-loop/reports/README.md` | convención de reportes |
| `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-TREND-WINDOW-PARITY-AUDIT-001.md` | formato de auditoría previa |

Inspección runtime: `node -e` requiriendo los módulos anteriores. Sin tests editados. Sin SQL.

---

## 24. MINIMUM_FILES_EXPECTED_TO_CHANGE

Implementación **futura** (no autorizada):

| Prioridad | Archivo | Motivo |
|---|---|---|
| 1 | `lib/director-ia-conversational-executive-layer.js` | extender `classifyForecastMagnitudeFollowUp` |
| 1 | `test/director-ia-forecast-magnitude-followup.test.js` | A5–A10, decoys, proyección vs stored vs ARR, bootstrap, UNAVAILABLE |
| 2 (solo A6) | mismo CEL (gate specialized del detector) o exclusión local en `isPreCloseQuestion` | `para cerrar` |
| 2 (solo C1) | mismo detector, rama venta | misma raíz lingüística |

**No** se espera cambiar:

- `lib/director-ia-authoritative-forecast-run-pack.js`
- `lib/director-ia-planner.js` (no hay intent Forecast que crear)
- `lib/director-ia-conversation-state.js`
- `lib/director-ia-plant-diagnosis.js`
- `lib/director-ia-igf-arr.js`
- `lib/commercial-trend-engine.js`
- Dashboard / UI
- `docs/director-ia/*`
- `docs/dev-loop/CURRENT_TASK.md`

`handleForecastMagnitudeFollowUpForChat` **no** necesita reescritura si el detector empieza a devolver `{ kind: "descuento" }`.

---

## 25. Proposed Regression Matrix

Valores Puebla **no** son asserts universales. Usar fixtures de test existentes (`AUTH.*` en `director-ia-forecast-magnitude-followup.test.js`).

| ID | Pregunta | Contexto | Expected intent/ruta | Expected source | Expected behavior |
|---|---|---|---|---|---|
| T-A1 | ¿Cuál es el descuento forecast al corte que estás usando? | forecast_run compatible | magnitude / descuento | authoritative pack | responde proyección; no ARR; no stored |
| T-A2 | ¿Cuál es el descuento forecast al corte? | run | magnitude / descuento | pack | igual |
| T-A3 | ¿Cuál es el descuento forecast al corte proyectado? | run | magnitude / descuento | pack | igual |
| T-A4 | ¿Qué descuento forecast tenemos? | run | magnitude / descuento | pack | igual |
| T-A5 | ¿Qué descuento proyectamos para el cierre? | run tras «¿Cómo vamos?» | magnitude / descuento | pack | **no** plant_diagnosis; no MATERIALIDAD; no ARR |
| T-A6 | ¿Qué descuento proyectamos para cerrar el mes? | run | magnitude / descuento (si se incluye A6) | pack | **no** pre_meeting_brief |
| T-A7 | ¿Con qué descuento vamos a cerrar? | run | magnitude / descuento | pack | no inherit planta |
| T-A8 | ¿Cuál es el descuento proyectado? | run | magnitude / descuento | pack | no planta |
| T-A9 | ¿En cuánto vamos a cerrar de descuento? | run | magnitude / descuento | pack | no planta |
| T-A10 | ¿Qué descuento tenemos proyectado al cierre? | run | magnitude / descuento | pack | no stored |
| T-B1 | ¿Qué descuento tiene el cliente X? | run | **no** magnitude | — | no Forecast; cliente |
| T-B2 | ¿Qué clientes tienen mayor descuento? | run | no magnitude | — | no Forecast |
| T-B3 | ¿Cómo estuvo el descuento diario? | run | no magnitude | — | no Forecast |
| T-B4 | Muéstrame el ARR. | run | arr_status | ARR | no pack proyección |
| T-B5 | ¿Cuál es el descuento ARR? | run | arr_status | ARR | no FORECAST_PROJECTION |
| T-B6 | ¿Cuál es el descuento almacenado en IGF? | run | igf_status | IGF stored | no proyección |
| T-B7 | ¿Qué acción tenemos para bajar el descuento del cliente X? | run | client_profile / no magnitude | — | no Forecast |
| T-B8 | ¿Qué descuento dimos ayer? | run | daily_discount_deviation | daily | no Forecast |
| T-B9 | ¿Qué descuento tiene CASA? | run | no magnitude | — | no Forecast |
| T-B10 | ¿Por qué aumentó el descuento? | run | no magnitude | — | no Forecast |
| T-C1 | ¿Cuánto proyectamos vender al cierre? | run | magnitude / venta **si** se generaliza | pack | solo si mismo corte de alcance |
| T-C4 | ¿Con qué utilidad operativa vamos a cerrar? | run + hilo | magnitude / utilidad | pack | **regresión: ya PASS** |
| T-C5 | ¿Cuál es la utilidad operativa proyectada? | run | magnitud utilidad | pack | ya PASS |
| T-C6 | ¿Con qué resultado final vamos a cerrar? | run + hilo | magnitud resultado | pack | ya PASS |
| T-C7 | ¿Cuál es el resultado final proyectado? | run | magnitud resultado | pack | ya PASS |
| T-BOOT | T-A5 | sin run; body.planta + upload_day YMD | magnitude / descuento | pack vía bootstrap | year/month derivados del YMD |
| T-UNAV | T-A5 | sin run, sin planta/YMD | UNAVAILABLE o aclaración **hoy**; futuro: UNAVAILABLE del handler si el detector dispara | ninguna | no ARR, no stored, no last-upload global |
| T-PLANT | T-A5 | run planta A; request planta B | no contaminación | — | mismatch anula run (`sanitizeEchoedState`) |
| T-CUTOFF | T-A5 + cutoff explícito distinto | run previo | nueva identidad / pack de ese cutoff | pack | no mezclar cortes |
| T-PERIOD | descuento forecast de {otro mes} | run | periodFromQuestionDiffers | pack del periodo pedido | no mezclar periodos |
| R1–R15 | ¿Cómo vamos? y Estado Ejecutivo completo | — | executive_status | pack ejecutivo | campos existentes intactos |
| R16 | A1 | run | magnitude | pack | follow-up ya funcional |
| R17 | A1/A5 | chat nuevo + upload_day | bootstrap | pack | ya existe para A1 |
| R18 | magnitud sin identidad | — | UNAVAILABLE | — | fail-closed |
| R19 | A5 vs B6 | mismo hilo | proyección vs IGF | pack vs IGF | no fusionar |
| R20 | A5 vs B4/B5 | mismo hilo | proyección vs ARR | pack vs ARR | no fusionar |
| R24 | Golden Set | — | — | — | suite completa existente |

---

## 26. Out-of-Scope Findings

### OUT_OF_SCOPE_FOLLOWUP

1. Dividir «¿Cómo vamos?» en dos mensajes (Estado Ejecutivo + Movimientos Comerciales / comentarios). No diseñado.
2. Saludo personalizado por usuario autenticado («Hola Ing. …»). No mezclar con Forecast routing.

### OUT_OF_SCOPE_FINDING

1. A8: el token `proyectad` es **inerte** también para «proyectado». Defecto del detector, no un hallazgo aparte de RC-1.
2. C3: `venta proyectada al cierre` es robada por `month_close_result`. No es el caso Puebla. No corregir de paso.
3. A6: `para cerrar` → pre-cierre. Segundo hueco. No es MATERIALIDAD.
4. B1/B2/B3/B9/B10: en hilo de «¿Cómo vamos?» también heredan `plant_diagnosis` cuando el planner es `unknown`. Defecto de cobertura de esos intents, no de Forecast. No «arreglar» vía detector Forecast.
5. `ARR_SIGNAL_RE` etiqueta A1–A4 como ARR question a nivel anexo. Hoy no rompe porque el detector gana después. Riesgo latente.
6. `PLANT_FINANCIAL_KPI_RE` es un imán de `descuento`; en el chat legado iría a IGF/ARR focused. El caso observado usa el handler dedicado de planta, no ese camino.
7. Rama de trabajo = `main`. Desvío vs LOOP (implementación exigiría rama ≠ main). Esta auditoría solo escribe el reporte.
8. `CURRENT_TASK.md` vigente es otra tarea (`COMMERCIAL-MOVERS`, `DONE_PENDING_REVIEW`) y aparece modificado en el working tree. **No se tocó.**

---

## 27. Explicit Non-Changes

Esta auditoría **no** cambió:

- authoritative forecast pack / engine / fórmulas
- PROM / IGF forecast / IGF stored
- ARR
- forecast_run identity / direct bootstrap
- Estado Ejecutivo
- Commercial Movers / commercial-trend-engine
- conversation state schema
- Dashboard
- CURRENT_TASK
- código de producción
- tests
- contratos `docs/director-ia/`

---

## 28. Final Audit Verdict

La paridad semántica **falla** para la frase observada porque Director IA **no reconoce** la combinación

`descuento` + `proyectamos` + `cierre`

como la magnitud Forecast **ya implementada**. No falla el cálculo. No falla la corrida. No falla el bootstrap. Falla el **reconocimiento lingüístico** y, en consecuencia, gana la **herencia** `plant_diagnosis`.

Demostrado:

1. Qué interpreta: texto normalizado `que descuento proyectamos para el cierre`. **PROVEN.**
2. Qué detector gana: ninguno de magnitud; planner `unknown`. **PROVEN.**
3. Por qué: conjunción exige `forecast|proyectad|al corte|estas usando` y `\bproyectad\b` no pega en español natural. **PROVEN.**
4. Por qué plant_diagnosis: inherit de `unknown` sobre parent del Estado Ejecutivo. **PROVEN** el mecanismo.
5. Por qué MATERIALIDAD: instrucción fija del prompt de planta. **PROVEN.**
6. Por qué ARR: dominio + bloque `desc_kg` del pack de planta. **PROVEN.**
7. Por qué no forecast_run: el handler que lo lee no se llama. **PROVEN.**
8. Extensión mínima: el mismo `classifyForecastMagnitudeFollowUp`, stems prospectivos + cierre acotado, sin phrasebook. **PROVEN** que A1–A4 ya reutilizan ese handler.
9. Reutilizar exactamente `handleForecastMagnitudeFollowUpForChat` + pack existente. **PROVEN.**
10. Decoys: gates `cliente`/`ayer`/`\barr\b`/`\bigf\b` ya evitan B1/B4–B8. No relajar a «descuento» solo. **PROVEN.**
11. Tests: ampliar el archivo de follow-up de magnitud; no hardcodear Puebla; no romper R1–R24.

A1–A4 PASS. A5 y A7–A10 FAIL por RC-1+RC-3. A6 FAIL por RC-4. C4–C7 PASS con hilo. C1 comparte RC-1. C3 es otra colisión.

**STOP.**

Este informe no autoriza implementación. Una implementación futura requiere autorización humana explícita (G1) en `CURRENT_TASK.md`.

---

## Confirmaciones obligatorias

```
AUTHORITATIVE_FORECAST_PACK_CHANGED = NO
FORECAST_ENGINE_CHANGED = NO
FORECAST_FORMULAS_CHANGED = NO
PROM_CHANGED = NO
IGF_FORECAST_CHANGED = NO
IGF_STORED_CHANGED = NO
ARR_CHANGED = NO
FORECAST_RUN_IDENTITY_CHANGED = NO
DIRECT_BOOTSTRAP_CHANGED = NO
EXECUTIVE_STATUS_CHANGED = NO
COMMERCIAL_MOVERS_CHANGED = NO
COMMERCIAL_TREND_ENGINE_CHANGED = NO
CONVERSATION_STATE_CHANGED = NO
DASHBOARD_BEHAVIOR_CHANGED = NO
CURRENT_TASK_CHANGED = NO
PRODUCTION_CODE_CHANGED = NO

AUDIT_ONLY = YES
```
