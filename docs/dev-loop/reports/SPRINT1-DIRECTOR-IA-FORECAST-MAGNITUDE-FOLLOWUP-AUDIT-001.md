# SPRINT1-DIRECTOR-IA-FORECAST-MAGNITUDE-FOLLOWUP-AUDIT-001

tipo: AUDITORÍA SOLO LECTURA
outcome: INFORME (no hay G1 para implementar)
DASHBOARD_BEHAVIOR_CHANGED: NO

```yaml
task_id: SPRINT1-DIRECTOR-IA-FORECAST-MAGNITUDE-FOLLOWUP-AUDIT-001
outcome: AUDIT_ONLY
current_task_untouched: true
current_task_status: DONE_PENDING_REVIEW
current_task_id: SPRINT1-DIRECTOR-IA-AUTHORITATIVE-FORECAST-RUN-PACK-001
loop_gate: "LOOP_PROTOCOL §4 prohíbe pasar de DONE_PENDING_REVIEW a una nueva tarea. Esta auditoría no abre CURRENT_TASK."
files_touched:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-MAGNITUDE-FOLLOWUP-AUDIT-001.md
files_not_touched:
  - código de producto
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/
git: none
sql: none
secrets_check: none
```

No se implementó. No se modificó el pack autoritativo, cutoff, PROM, transporte ni Dashboard.

---

## A. Resumen ejecutivo

Hay **dos defectos distintos**. La corrida autoritativa del Estado Ejecutivo **no está rota**.

**Defectos:**

1. **Routing del follow-up** (causa del fallo observado).
   «¿Cuál es el descuento forecast al corte que estás usando?» **no** entra a CEL.
   `isExecutiveStatusQuestion` la rechaza por contener `descuento` sin «cómo vamos» / `planta` / patrón cutoff-aware.
   El planner queda `unknown`. La continuidad **hereda** `parent_intent=plant_diagnosis` (así etiqueta CEL el Estado Ejecutivo).
   Gana el handler de **diagnóstico de planta**, cuyo prompt **ordena** empezar por MATERIALIDAD COMERCIAL y recarga ARR con `fechaCorte: ""`. De ahí reaparece **1432**.

2. **Exposición de `forecast.descuento` en Magnitudes Clave** (aditivo, no es el routing).
   El authoritative pack **sí** tiene las cuatro magnitudes juntas **antes del LLM**.
   CEL las pone en el payload (`desc_kg`). El compositor de «¿Cómo vamos?» pide **no dump / materialidad**. El LLM omitió el descuento FORECAST y sí pintó stored 0.1137.

El follow-up de corte **sí** funciona porque `isCutoffExplainQuestion` es un handler **aparte**, anterior a `plant_diagnosis`, y lee solo `conversation_state.forecast_run` (identidad, no cifras).

**H8 es la hipótesis correcta:** (a) descuento FORECAST no se imprime en Magnitudes Clave; (b) el follow-up de magnitud está mal enrutado. No es pérdida del pack ni del cutoff.

---

## B. Evidencia de producción

**OBSERVED_IN_PRODUCTION_RESPONSE** (no hardcodear en producto):

| Semántica | Valor observado |
|---|---|
| ACTUAL_TO_DATE venta | 1261 t |
| FORECAST venta | 1491.5 t @ 27/08/2026 |
| FORECAST_STORED venta | 1536.5405 t |
| FORECAST_STORED desc | 0.1137 $/kg |
| FORECAST utilidad | 3 197 215 |
| FORECAST resultado | 831 250 |
| CASA | baja |
| Comisionista | alza |

Follow-up fallido: no dio `forecast.descuento`; materialidad + «arr: Proyección de venta de 1432 toneladas para agosto 2026».

Control: «¿Qué fecha de corte usaste para calcular las 1491.5 toneladas?» → «Usé el corte del 27 de agosto de 2026.» **PASS.**

Evidencia de código (script de lectura, 2026-08-31):

| Pregunta | isExec | need | planner | inherit | handler |
|---|---|---|---|---|---|
| ¿Cómo vamos? | true | EXECUTIVE_STATUS | unknown | n/a | CEL (`shouldCel=true`) |
| ¿Cuál es el descuento forecast al corte que estás usando? | **false** | no_need | unknown | **plant_diagnosis** | **plant_diagnosis** |
| ¿Qué fecha de corte usaste para… 1491.5…? | false | no_need | unknown | — | **cutoff_explain** (`isCutoffExplainQuestion=true`) |

`isArrForecastQuestion(Q2)=true` (`descuento\s+forecast`).
`isPlantFinancialKpiQuestion(Q2)=true` (`\bdescuento\b`).
Esos flags **no** entran a CEL; alimentan anexos del chat legado / plant_diagnosis.

`sanitizeForecastRun` **descarta** venta/descuento/util/resultado si se intentaran colar.

---

## C. Baseline protegido

La sección de Estado Ejecutivo citada por el humano es **PROTEGIDA**.

Una implementación futura **no** debe reescribirla, quitar magnitudes, cambiar semánticas ni alterar su routing.

Debe **conservar**:

- Venta Actual 1261 t (ACTUAL_TO_DATE)
- Forecast 1491.5 t al 27/08/2026
- IGF almacenado 1536.5405 t
- IGF descuento almacenado 0.1137 $/kg
- Utilidad operativa Forecast 3 197 215
- Resultado final Forecast 831 250
- CASA ↓ / Comisionista ↑

Si se añade algo, solo de forma **aditiva**: «Descuento (Forecast): X $/kg» cuando AVAILABLE.

FORECAST.descuento ≠ FORECAST_STORED.descuento.

---

## D. Traza completa

### Turno 1 — Estado Ejecutivo (PASS)

```
POST /chat { question: "¿Cómo vamos?", upload_day?, conversation_state? }
  lib/director-ia-chat.js askDirectorIa ~3470
  → resolveExecutiveNeed → EXECUTIVE_STATUS
    lib/director-ia-conversational-executive-layer.js ~350–388, 321–347
  → shouldHandleExecutiveStatus true (~1497)
  → handleExecutiveStatusForChat ~2969–3230
       loadPlantDiagnosisForChat (IGF/ARR/materialidad para el pack CEL, no como respuesta)
       resolveDirectorIaEffectiveCutoff ~242
       loadIgfForecastMiniPayload + buildAuthoritativeForecastRunPack
         lib/director-ia-authoritative-forecast-run-pack.js
       buildExecutiveStatusPack / Prompt
       conversationStateForIntent parent_intent="plant_diagnosis", forecast_run=identidad
       LLM
```

| Campo | ¿Existe? |
|---|---|
| run_identity / effective_cutoff_date | SÍ (pack + context_meta + forecast_run) |
| forecast.venta / descuento / util / resultado | SÍ en pack **antes del LLM** |
| conversation_state persiste | identidad de corrida; **NO** las cuatro magnitudes |
| Frontend | `DirectorIaChatPanel` ecoa `conversation_state` (`chat-request.js`) |

`forecast.descuento` en respuesta: **omitido por el LLM** (H6). No DROPPED en adapter/CEL.

### Turno 2 — «descuento forecast» (FAIL)

```
POST /chat { question: Q2, conversation_state: { parent_intent: plant_diagnosis, forecast_run: {…identidad…} } }
  isExecutiveStatusQuestion FALSE  CEL 337–344  (descuento sin planta / sin cue «cómo» / sin cutoff-aware)
  resolveExecutiveNeed → no_need
  shouldHandleExecutiveStatus FALSE
  isCutoffExplainQuestion FALSE  chat.js 289–308
  resolveConversationTurn inherit=true inherit_parent_intent=plant_diagnosis
    conversation-state.js ~697–899
  planDirectorIaQuestion(unknown + inherit) → intent=plant_diagnosis
    planner.js 734–750
  handle plant_diagnosis  chat.js 4741+
    loadPlantDiagnosisForChat
    buildPlantDiagnosisPrompt  plant-diagnosis.js 1393–1410
      «Si hay MATERIALIDAD COMERCIAL, señala primero los clientes…»
      BLOQUE arr: loadArrProyForPlant → computePronosticoProyByPlant(fechaCorte:"")
        igf-arr.js 389–397
```

| Campo | ¿Existe? |
|---|---|
| forecast_run en request | SÍ (eco) |
| cuatro magnitudes en state | **NO** |
| pack autoritativo en este turno | **NOT_LOADED** |
| intent ganador | **plant_diagnosis** |
| por qué materialidad | instrucción fija del prompt de planta |
| ARR 1432 | `loadArrProyForPlant` / `fechaCorte: ""` (otra identidad PROM/fin de mes) |

### Turno 3 — fecha de corte (PASS)

```
isCutoffExplainQuestion TRUE  («que fecha de corte usaste» / «que fecha usaste»)
handleCutoffExplainForChat  chat.js 3233+
  sanitizeForecastRun(echoedState.forecast_run)
  responde fecha en español
```

No recarga ARR. No entra a plant_diagnosis.

---

## E. Routing del follow-up

**Intent/router que ganó:** `plant_diagnosis` (heredado), no CEL, no cutoff_explain, no daily_discount.

**Por qué no CEL** (`isExecutiveStatusQuestion` 337–344):

```
si pregunta tiene «descuento»
  y no tiene «planta»
  y no es plant-level financial (requiere cue «cómo va/vamos»)
  y no es cutoff-aware magnitude
→ return false
```

`isCutoffAwareMagnitudeQuestion` (310–318) no incluye «descuento forecast al corte». Solo: llevamos vendido / vendido al corte / acumulado al corte / forecast **con** el corte / corte actual / meta+venta / descuento **acumulado**+forecast.

**Por qué materialidad:** `buildPlantDiagnosisPrompt` L1405: si hay MATERIALIDAD COMERCIAL, **señala primero** esos clientes. Inevitable en este handler.

---

## F. conversation_state

Tras el Estado Ejecutivo, `sanitizeForecastRun` / `buildConversationState` conservan:

- `parent_intent` = **plant_diagnosis** (etiqueta heredable)
- `planta_id`
- `last_evidence_bundle_type` = plant_diagnosis
- `forecast_run`: plant_code, year, month, upload_day, effective_cutoff_date, corte_day, cutoff_origin

**No conservan:** venta, descuento, utilidad, resultado, ACTUAL, stored, TARGET.

El siguiente POST reenvía ese objeto. El hilo al modelo solo imprime cutoff (`formatConversationHiloForModel` ~1207–1209), no cifras.

---

## G. Authoritative pack

**PROVEN_BY_CODE.** Si el turno 1 tuvo cutoff y mini AVAILABLE, el pack tiene las cuatro magnitudes juntas (`forecast.venta/descuento/utilidad_operativa/resultado_final`). CEL copia `desc_kg` en el item `forecast_venta_desc` (~921–935). Summary: «venta Xt; desc Y $/kg».

El follow-up **no vuelve a construir** ese pack.

---

## H. forecast.descuento

| Frontera (turno 1) | Estado |
|---|---|
| mini.rows[].comDesc | PRESENT (si mini corrió; la venta 1491.5 lo implica) |
| pack.forecast.descuento | PRESENT (signo UI) |
| CEL payload desc_kg | PRESENT |
| Prompt | PRESENT si `!= null` |
| Respuesta Magnitudes Clave | **AUSENTE** (LLM / OPTIONAL / «no dump») |

Punto de pérdida de **visibilidad:** compositor + LLM. No el pack.

Turno 2: **NOT_LOADED**.

---

## I. Origen de ARR 1432

**PROVEN_BY_CODE** la ruta; **OBSERVED** el 1432; valor exacto en BD **NOT_PROVEN** (no SQL).

```
loadPlantDiagnosisForChat
  → loadIgfArrSourceBlocksForChat
  → loadArrProyForPlant  lib/director-ia-igf-arr.js:389
  → computePronosticoProyByPlant(fechaCorte: "")
  → getPronosticoCorteYmdStr vacío = último día del mes / PROM default
```

Es el fallback ARR **SUPERSEDIDO** como FORECAST. No es `computeIgfForecastMiniPayload` a 27/08 (1491.5).

El LLM redacta `venta_ton=1432` como «Proyección de venta de 1432 toneladas». Esa frase **no** está hardcodeada; el número sí sale de ese bloque.

Auditoría PROM previa: 1432 compatible con PROM distinto/default, no con 1503/1491.5 a 27/08.

---

## J. Causa raíz

**Causa raíz del follow-up fallido (exacta):**

1. CEL **excluye** preguntas de «descuento» que no traen cue de estado ejecutivo / planta / patrón cutoff-aware.
2. El Estado Ejecutivo se etiqueta `parent_intent=plant_diagnosis`.
3. El follow-up `unknown` **hereda** ese intent.
4. `plant_diagnosis` recarga materialidad + ARR `fechaCorte:""` y **no** el authoritative pack.
5. `conversation_state` no guarda las cuatro magnitudes; el único follow-up de corrida implementado es **cutoff/fecha**.

H1, H2, H3, H4, H6, H7: **PROVEN**.
H5: el pack llega al prompt del turno 1; el follow-up no lo usa.
H8: **PROVEN** (dos problemas).

---

## K. Propuesta mínima futura (NO implementar)

**No** otro adapter. **No** reabrir pack / cutoff / PROM / transporte.

Dirección:

```
authoritative forecast run pack
  → conversation/runtime (identidad ± eco de magnitudes)
  → Estado Ejecutivo
  → follow-ups de magnitud de ESA corrida
```

Cambio mínimo de routing:

1. Reconocer follow-ups de magnitud FORECAST (`descuento|venta|utilidad|resultado` + `forecast|proyectad|al corte|estás usando`) como **CEL / handler de pack**, no `plant_diagnosis`.
2. Relajar o especializar `isExecutiveStatusQuestion` 337–344 **solo** para esas frases referenciales (sin abrir «descuento» genérico a client_profile).
3. Con `forecast_run` vigente: **re-ejecutar** `buildAuthoritativeForecastRunPack` con la misma identidad (upload_day del run). No persistir cifras como verdad; la identidad basta.
4. Sin corrida vigente: UNAVAILABLE; no inventar; no ARR.

`isCutoffExplainQuestion` se **queda**.

---

## L. Adición a Magnitudes Clave (SEPARADA)

Si `forecast.descuento` AVAILABLE, **añadir** una línea en summary/prompt:

`Descuento (Forecast): X $/kg`

sin quitar IGF descuento almacenado ni el resto del baseline.

No fusionar $/kg. No cambiar el routing del turno 1 («¿Cómo vamos?»).

---

## M. Tests requeridos (implementación posterior)

1. Baseline Estado Ejecutivo conserva las magnitudes actuales (no assertar 1261/1491.5 como lógica).
2. No desaparecen Actual, Forecast venta, IGF stored, IGF desc stored, util, resultado, CASA/Comi.
3. Se **agrega** forecast.descuento cuando AVAILABLE.
4. Ese descuento es el del mismo pack que venta/util/resultado.
5. «¿Cuál es el descuento forecast?» → forecast.descuento.
6. No responde stored 0.1137 como forecast.
7. No activa materialidad comercial.
8. No reaparece ARR 1432 / `fechaCorte:""` como FORECAST.
9–11. Util / resultado / venta proyectada recuperan la misma corrida.
12. «¿Qué fecha de corte usaste?» sigue en metadata real.
13–14. Corte A→B y planta A→B no contaminan.
15. Sin corrida: no inventar.
16–17. Golden Set y suite Director IA en verde.

Paridad **numérica** pack vs mini.rows[], no prosa LLM.

---

## N. Riesgos

- Relajar «descuento» en CEL puede robar client_profile / daily_discount / DICF. Acotar a forecast/corte/proyectad.
- Seguir heredando `plant_diagnosis` desde CEL es la trampa. Cambiar el label requiere no romper inherit de diagnóstico real.
- Persistir cifras en state puede envejecer; mejor re-correr el pack.
- `isArrForecastQuestion` / `isPlantFinancialKpiQuestion` siguen verdaderos para «descuento forecast»; no deben reabrir anexo ARR.
- Deploy / `context_meta` de la respuesta real: **NOT_PROVEN**.
- 1432 exacto en BD: **NOT_PROVEN**.

Archivos probables de una IMPL posterior (no tocados ahora):

- `lib/director-ia-conversational-executive-layer.js` (reconocer follow-up; línea Descuento Forecast)
- `lib/director-ia-chat.js` (no heredar plant_diagnosis para magnitud; re-correr pack)
- `lib/director-ia-conversation-state.js` solo si se cambia label/inherit
- `test/director-ia-forecast-magnitude-followup.test.js` (nuevo)
- Golden Set si el routing lo exige

**No tocar:** `computeIgfForecastMiniPayload`, PROM, Excel, selector, IGF UI, transporte, fail-closed, pack como productor.

---

## O. DASHBOARD_BEHAVIOR_CHANGED

**NO.**

---

## Hipótesis (cierre)

| Id | Veredicto |
|---|---|
| H1 | PROVEN |
| H2 | PROVEN (identidad sí, magnitudes no) |
| H3 | PROVEN |
| H4 | PROVEN (`plant_diagnosis` + materialidad) |
| H5 | Parcial: llega al prompt del turno 1; el follow-up no lo ve |
| H6 | PROVEN (omisión LLM / OPTIONAL) |
| H7 | PROVEN (ARR `fechaCorte:""`) |
| H8 | PROVEN |

---

STOP. `CURRENT_TASK` permanece `SPRINT1-DIRECTOR-IA-AUTHORITATIVE-FORECAST-RUN-PACK-001` / `DONE_PENDING_REVIEW`. Esta auditoría no autoriza implementación.
