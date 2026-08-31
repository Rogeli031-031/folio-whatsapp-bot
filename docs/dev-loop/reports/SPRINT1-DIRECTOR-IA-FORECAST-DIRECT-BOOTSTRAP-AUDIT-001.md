# SPRINT1-DIRECTOR-IA-FORECAST-DIRECT-BOOTSTRAP-AUDIT-001

tipo: AUDITORÍA SOLO LECTURA
outcome: INFORME
DASHBOARD_BEHAVIOR_CHANGED: NO

```yaml
task_id: SPRINT1-DIRECTOR-IA-FORECAST-DIRECT-BOOTSTRAP-AUDIT-001
outcome: AUDIT_ONLY
current_task_untouched: true
current_task_status: DONE_PENDING_REVIEW
current_task_id: SPRINT1-DIRECTOR-IA-FORECAST-MAGNITUDE-FOLLOWUP-001
loop_gate: "Esta auditoría no abre CURRENT_TASK ni autoriza implementación."
files_touched:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-DIRECT-BOOTSTRAP-AUDIT-001.md
files_not_touched:
  - código de producto
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/
  - lib/director-ia-authoritative-forecast-run-pack.js
  - computeIgfForecastMiniPayload
  - PROM / selector / persistencia PROM
  - IGF Forecast UI
  - transporte upload_day
git: none
sql: none
secrets_check: none
```

No se implementó. No se modificó Estado Ejecutivo, pack, fórmula, PROM, transporte ni Dashboard.

---

## Pregunta central

Cuando el chat es **nuevo** (sin `forecast_run`) y la primera pregunta es

«¿Cuál es el descuento forecast al corte que estás usando?»

pero el request ya trae identidad IGF (planta + `upload_day=2026-08-27`),

¿Director IA podría construir el authoritative pack y responder la magnitud **sin** «¿Cómo vamos?»?

**Respuesta de auditoría:** sí, el pack es reutilizable con esa identidad. Hoy **no lo hace**. La UNAVAILABLE de producción no es fail-closed por falta de cutoff: el cutoff del request **sí está**. Falta ensamblar year/month para invocar el mini. Es un **hueco de bootstrap**, no un fallo del Estado Ejecutivo ni del pack.

La secuencia A (cómo vamos → follow-up) queda protegida y no se rediseña.

---

## A. Routing actual (primer turno)

Pregunta: «¿Cuál es el descuento forecast al corte que estás usando?»

1. `isExecutiveStatusQuestion` = **false** (tiene `descuento`, no cue «cómo vamos» / planta-mes). No entra a CEL. Correcto: no es Estado Ejecutivo.
2. Planner = `unknown`.
3. `isCutoffExplainQuestion` = **false** (pregunta por descuento, no por la fecha).
4. `classifyForecastMagnitudeFollowUp` = `{ kind: "descuento" }` **sin** exigir `forecast_run`. Las formas fuertes (`forecast` / `al corte` / `estás usando`) no dependen del hilo.
5. Entra a `handleForecastMagnitudeFollowUpForChat`.
6. **No** cae a `plant_diagnosis` / MATERIALIDAD / ARR. El fail-closed de magnitud gana antes del inherit.

Esto es distinto del defecto ya cerrado: el primer turno **sí** entra al handler de magnitud. No reaparece 1432.

---

## B. Dónde exige forecast_run / eco previo

El detector **no** exige `forecast_run` para esta frase.

El handler **sí** queda atado al hilo para **year/month**:

```
year  = body.year  || forecast_run.year
month = body.month || forecast_run.month
cutoff = pregunta explícita || body.upload_day || forecast_run.effective_cutoff_date
mini   = loadMini && pool && cutoff && year && month && plantLabel
```

El frontend del chat **no envía** `body.year` ni `body.month` (`buildDirectorIaChatBody` solo pone `planta_id`, `question`, `planta_nombre`, `upload_day`, `history`, `conversation_state`).

En primer turno:

- `forecast_run` = null
- `body.year` / `body.month` = ausentes
- `year` y `month` quedan vacíos
- aunque `cutoff` exista, **no se llama** `loadIgfForecastMiniPayload`
- `buildAuthoritativeForecastRunPack({ upload_day, miniPayload: null })` → `UNAVAILABLE` (`unavailable_no_forecast` si hay cutoff sin row; o no hay cifras)

La respuesta fija es:

«No tengo una corrida de forecast autoritativa vigente para esa magnitud. No sustituyo con ARR ni con IGF almacenado.»

Eso es fail-closed **correcto cuando no hay identidad**. Hoy se dispara también cuando el request **sí** tiene `upload_day` + planta.

El eco `forecast_magnitudes` no es la causa: nunca es fuente de verdad. Tras «¿Cómo vamos?» el handler re-ejecuta el pack porque year/month/cutoff viven en `forecast_run`.

---

## C. ¿`upload_day` sigue en el primer mensaje desde IGF?

**Sí**, si el chat se abrió por el transporte vigente.

Cadena (no se propone tocarla):

```
IGF Forecast
  → buildIgfForecastAccionesHref({ token, upload_day: D })
  → /acciones?t=…&back=1&upload_day=D
  → Acciones: uploadDay={searchParams.get("upload_day")}
  → DirectorIaChatModal → DirectorIaChatPanel
  → fetchDirectorIaChat(..., { upload_day, planta_nombre, search, conversation_state: null })
  → buildDirectorIaChatBody
  → POST /api/director-ia/chat  body.upload_day = D
```

`resolveDirectorIaEffectiveCutoff` clasifica ese body como `req.body.upload_day` → `REQUEST_UPLOAD_DAY`.

El handler de magnitud **ya lee** `parseCutoffYmd(body.upload_day)`. El transporte no está roto. El primer turno **recibe** D.

Si alguien abre el chat **sin** query `upload_day` (Acciones directo, sin IGF), el body omite el campo. Ahí UNAVAILABLE sí es contractual.

---

## D. Identidad de planta / year / month en ese punto

| Campo | ¿Disponible en el primer POST desde IGF? | Origen |
|---|---|---|
| `planta_id` | Sí | Acciones / modal |
| `planta_nombre` | Sí | Acciones → `body.planta_nombre` |
| `plant_code` | Resoluble | catálogo por `planta_id` (`clave`) |
| `upload_day` | Sí (YYYY-MM-DD) | URL IGF → body |
| `conversation_state` | null | chat nuevo; panel resetea al cambiar planta |
| `body.year` / `body.month` | **No** | `chat-request.js` no los envía |
| `forecast_run` | **No** | no hubo Estado Ejecutivo |

Year/month **son derivables** del propio `upload_day` (`2026-08-27` → 2026 / 8). El handler actual no lo hace.

«¿Cómo vamos?» sí obtiene year/month porque carga `plant_diagnosis` y usa `parseYearMonth(assembled)` / `forecastParity.period`. El follow-up, por contrato, **no** debe pasar por diagnóstico.

---

## E. ¿El pack se puede construir sin Estado Ejecutivo?

**Sí.** `buildAuthoritativeForecastRunPack` no depende de CEL ni de `forecast_run`. Entrada:

- `plant_code`, `plant_label`, `year`, `month`, `upload_day`
- `miniPayload` de `loadIgfForecastMiniPayload`
- `cutoff_origin`

Eso es exactamente lo que ya hace el handler **después** de «¿Cómo vamos?». El primer turno solo no llega a invocar el mini.

No hace falta Estado Ejecutivo, LLM, materialidad ni adapter.

---

## F. ¿Reutilizaría el mismo PROM/corte?

**Sí**, si se llama la misma cadena ya cableada:

```
loadIgfForecastMiniPayload
  → buildIgfForecastPayload(..., { upload_day })
  → computeIgfForecastMiniPayload(client, igf, year, month, uploadDay)
  → buildAuthoritativeForecastRunPack({ miniPayload, upload_day })
```

`computeIgfForecastMiniPayload` no se copia. El pack no se redefine. PROM / selector / persistencia no se tocan. El corte es el `upload_day` transportado (`REQUEST_UPLOAD_DAY`), no last-upload global ni fin de mes.

---

## G. Por qué funciona después de «¿Cómo vamos?» y falla como primer turno

**Después de «¿Cómo vamos?»**

CEL resuelve cutoff (body `upload_day` = 2026-08-27), carga el mini con year/month del ensamblado, construye el pack, responde Estado Ejecutivo (1261 / 1491.5 / −0.11 / 3,197,215 / 831,250) y deja `forecast_run` + eco con year=2026, month=8, cutoff=2026-08-27.

El follow-up re-ejecuta el mini con **esa** identidad. Responde −0.11 $/kg al 27 de agosto. Correcto.

**Primer turno**

El detector entra igual. No hay `forecast_run`. El body trae `upload_day` y planta, **no** year/month. El mini no corre. El pack queda UNAVAILABLE. Misma frase, mismo transporte, respuesta fail-closed.

No es que «estás usando» exija un turno previo. Es que year/month hoy solo se heredan del hilo o de un body que el chat no manda.

---

## H. Causa (combinación)

| Hipótesis | ¿Es la causa? |
|---|---|
| Routing a plant_diagnosis / ARR | No. El primer turno ya no toma esa ruta. |
| conversation_state vacío | Condición, no defecto. Chat nuevo es correcto. |
| Exigir `forecast_run` en el detector | No para esta frase. |
| `upload_day` no propagado | No. El transporte IGF → body funciona. |
| Identidad incompleta en el handler | **Sí.** Cutoff presente; year/month no resueltos → mini no corre. |
| Pack / PROM / fórmula | No. |

**Causa raíz:** hueco de bootstrap en `handleForecastMagnitudeFollowUpForChat`: trata «sin `forecast_run`» como «sin periodo», aunque el request ya tenga cutoff `REQUEST_UPLOAD_DAY` y planta.

La UNAVAILABLE es el wording correcto de fail-closed; está **mal aplicada** cuando la identidad del request ya alcanza para la misma corrida que «¿Cómo vamos?».

---

## I. Preguntas directas equivalentes

El detector ya clasifica, **sin** hilo previo:

| Pregunta | kind |
|---|---|
| «¿Cuál es el descuento forecast al corte que estás usando?» | descuento |
| «¿Cuál es el descuento forecast?» | descuento |
| «¿Cuál es el forecast de venta al corte?» | venta (`cual es el forecast`) |
| «¿Cuál era la venta proyectada?» | venta |
| «¿Cuál es la utilidad operativa forecast?» | utilidad |
| «¿Cuál es el resultado final forecast?» | resultado |

La misma semántica de bootstrap debe valer para las cuatro magnitudes de **una** `run_identity`. No relajar «descuento» genérico ni «cómo va el descuento de Acapulco» (Q3 Golden Set sigue CEL).

Anáforas cortas («¿Y el descuento?») **sí** exigen hilo ejecutivo + run. Eso no es este hallazgo.

---

## J. Fail-closed (obligatorio, no relajar)

UNAVAILABLE si **no** hay, en este orden protegido:

1. cutoff explícito válido en la pregunta
2. `request upload_day`
3. (opcional, solo si hay periodo autorizable) plant-last-upload
4. si no: UNAVAILABLE

Prohibido: ARR 1432, IGF stored, stored descuento, PROM/fin de mes inventado, otra planta, otro corte, last-upload global.

El test 17 actual (primer turno **sin** `upload_day` ni run) debe **seguir** UNAVAILABLE.

Plant-last-upload en el follow-up **hoy no se consulta**. No hace falta para el caso IGF (ya hay `upload_day`). No se recomienda inventar year/month CDMX solo para ir a last-upload. Eso ampliaría el alcance y puede cruzar de mes.

---

## K. Propuesta mínima (NO implementada)

La propuesta conceptual se **confirma**, con un refinamiento:

```
si forecast_run vigente (misma planta, periodo compatible):
    re-ejecutar pack con esa identidad
else si el request resuelve cutoff por precedencia 1 o 2
     y hay planta (id / nombre / catálogo)
     y year/month resolubles:
        construir authoritative pack
        responder la magnitud
else:
    UNAVAILABLE
```

**Year/month resolubles (mínimo, sin plant_diagnosis):**

1. `body.year` / `body.month` si vinieran
2. periodo nombrado en la pregunta si es coherente
3. **componentes de calendario del cutoff YMD ya resuelto** (`2026-08-27` → 2026 / 8)

El punto 3 es el hueco. No cambia el pack. No llama diagnóstico. No toca CEL de «¿Cómo vamos?». No toca transporte ni frontend.

No proponer: nuevo adapter, persistir cifras como verdad, relajar fail-closed, rediseñar Estado Ejecutivo, consultar last-upload global.

---

## L. Regresiones prohibidas

No modificar ni proponer rediseñar:

- Estado Ejecutivo validado (1261 / 1491.5 / −0.11 / 3,197,215 / 831,250 / CASA↓ / Comisionista↑)
- authoritative forecast run pack como productor
- `computeIgfForecastMiniPayload` / `loadProyVentaDescByPlantForIgf`
- PROM, selector, persistencia PROM
- IGF Forecast UI
- Excel
- transporte `upload_day` IGF → Acciones
- precedencia de cutoff
- aislamiento por planta
- FORECAST ≠ FORECAST_STORED ≠ ACTUAL_TO_DATE
- Q3 Golden Set («cómo va el descuento…» → CEL)

---

## M. Tests mínimos para una eventual tarea

1. Primer turno + `upload_day` válido + descuento forecast → descuento del pack (no UNAVAILABLE).
2. Ídem venta forecast.
3. Ídem utilidad operativa.
4. Ídem resultado final.
5. Primer turno **sin** cutoff / sin `upload_day` / sin run → UNAVAILABLE (regresión del test 17).
6. Decoy ARR no gana.
7. Decoy stored / stored descuento no ganan.
8. Tras «¿Cómo vamos?» el follow-up sigue igual que hoy (secuencia A protegida).
9. Pack/prompt del Estado Ejecutivo no cambia de semántica ni pierde magnitudes.
10. Corte A/B no se contaminan.
11. Planta A/B no se contaminan.
12. Golden Set + suite Director IA.

`DASHBOARD_BEHAVIOR_CHANGED = NO`.

---

## ROOT_CAUSE

Hueco de bootstrap: el primer turno de magnitud **sí** entra al handler y el request **sí** trae `upload_day` + planta, pero year/month solo se toman de `forecast_run` o de un body que el chat no envía. El mini no corre. El pack queda UNAVAILABLE. No es fallo del pack, del transporte, ni del Estado Ejecutivo.

## CURRENT_BEHAVIOR

- Tras «¿Cómo vamos?»: follow-up correcto contra la corrida 2026-08-27 (−0.11 $/kg).
- Primer turno, misma pregunta, chat nuevo desde IGF: UNAVAILABLE fail-closed, sin ARR.
- Sin `upload_day` ni run: UNAVAILABLE (correcto).

## REQUEST_IDENTITY_AVAILABLE

**Parcial.** Planta y `upload_day` (REQUEST_UPLOAD_DAY) sí. Year/month no viajan en el body; son derivables del cutoff. `forecast_run` ausente por diseño.

## AUTHORITATIVE_PACK_REUSABLE

**Sí.** Misma cadena `loadIgfForecastMiniPayload` → `computeIgfForecastMiniPayload` → `buildAuthoritativeForecastRunPack`. No hace falta Estado Ejecutivo previo.

## MINIMAL_FIX

Confirmar la propuesta: si hay `forecast_run`, re-ejecutar; else si el request resuelve cutoff (pregunta o `upload_day`) + planta + year/month (incl. derivados del YMD), construir el pack; else UNAVAILABLE. Un solo ajuste en el handler de magnitud. No tocar pack, PROM, CEL de «¿Cómo vamos?», transporte ni Dashboard.

## REGRESSION_RISKS

- Relajar fail-closed sin cutoff real.
- Inventar year/month CDMX o last-upload global.
- Convertir preguntas de magnitud en Estado Ejecutivo.
- Contaminar corte/planta/periodo.
- Romper Q3 / anáforas cortas.

## RECOMMENDED_TESTS

Los 12 de la sección M. Suite completa. Estado Ejecutivo protegido intacto.

## DASHBOARD_BEHAVIOR_CHANGED

NO.

---

Esta auditoría no autoriza implementación ni la siguiente tarea.

STOP.
