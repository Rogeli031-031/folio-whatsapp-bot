# SPRINT1-DIRECTOR-IA-PROM-CUTOFF-RUNTIME-PARITY-001

task_id: SPRINT1-DIRECTOR-IA-PROM-CUTOFF-RUNTIME-PARITY-001
outcome: DONE_PENDING_REVIEW
DASHBOARD_BEHAVIOR_CHANGED: NO

Desvío de loop: la ejecución ocurrió sobre rama `main` (el protocolo pide ≠ `main`). No se creó rama, no git add/commit/push/merge/deploy.

## A. Causa raíz

La fórmula PROM ya era la misma. La divergencia era de **identidad de corrida** y de **continuidad**:

1. Director IA podía afirmar FORECAST sin ligar planta + year/month + upload_day → corte_day + PROM de esa clave.
2. Sin cutoff, CEL aún podía pintar ARR/adapter como FORECAST_PROJECTION (sustituto silencioso).
3. Tras «¿Cómo vamos?», `conversation_state` no guardaba la identidad de la corrida. El follow-up «¿Qué fecha de corte usaste?» caía en UNKNOWN o heredaba plant_diagnosis sin metadata.
4. El panel Director IA reenviaba `history` (role/content) pero **no** `conversation_state`, así que el eco de corrida no llegaba al siguiente POST.

No había que cambiar `computeIgfForecastMiniPayload` ni `loadProyVentaDescByPlantForIgf`.

## B. Identidad de corrida

Se propaga `forecast_run` en `context_meta` y `conversation_state`:

| Campo | Origen |
|---|---|
| `plant_code` | `assembled.plant.plant_code` |
| `year` / `month` | periodo del parity / assembled |
| `upload_day` | body o cutoff resuelto |
| `effective_cutoff_date` | precedencia de cutoff |
| `corte_day` | `getPronosticoCorteYmdStr(year, month, cutoff)` **solo si hay cutoff** |
| `cutoff_origin` | ver C |

Sin cutoff: `corte_day = null`. No se llama a `getPronosticoCorteYmdStr` con fecha vacía (eso inventaría fin de mes).

## C. Precedencia efectiva

Sin cambio de semántica respecto a plant-aware:

1. Cutoff explícito en la pregunta (`YYYY-MM-DD` / `DD/MM/YYYY`) → `EXPLICIT_QUESTION`
2. `upload_day` / `cutoff_date` en el body → `REQUEST_UPLOAD_DAY`
3. Last-upload de **esa** planta → `PLANT_LAST_UPLOAD`
4. Nada → `UNAVAILABLE`

`cutoff_source` interno se conserva; `cutoff_origin` es el enum contractual.

Mini solo corre si `resolvedCutoff` es truthy:

```
loadIgfForecastMiniPayload(pool, { year, month, plantName, upload_day: resolvedCutoff })
→ loadProyVentaDescByPlantForIgf → computeIgfForecastMiniPayload
```

## D. Archivos modificados

- `lib/director-ia-chat.js` — identidad, `forecast_run`, handler `cutoff_explain`
- `lib/director-ia-conversation-state.js` — sanitizar/ecoar `forecast_run`
- `lib/director-ia-conversational-executive-layer.js` — PROM UNAVAILABLE sin cutoff; etiqueta «Forecast al corte del …»
- `frontend-dashboard/modules/director-ia/lib/chat-request.js` (+ `.d.ts`)
- `frontend-dashboard/modules/director-ia/lib/api.ts`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx`
- `test/director-ia-prom-cutoff-runtime-parity.test.js` (nuevo)
- `test/director-ia-sprint1-core-conversational-recovery.test.js` (fixtures: cutoff en pack)
- `test/director-ia-authoritative-kpi-parity.test.js` (fixtures: cutoff en pack)
- `test/director-ia-conversational-executive-status.test.js` (locator/expectativa sin ARR)
- `test/director-ia-mini-payload-export.test.js` (fixture: cutoff en pack)
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-PROM-CUTOFF-RUNTIME-PARITY-001.md` (este archivo)

No tocados: `computeIgfForecastMiniPayload`, `loadProyVentaDescByPlantForIgf`, `POST /pronostico-dias`, tablas PROM, selector, Excel, `GET /api/arr/last-upload-day`, `docs/director-ia/`.

## E. Trazabilidad PROM

Director IA no selecciona ni persiste PROM. Consume la ruta autoritativa existente con el `upload_day` resuelto del turno. El motor Dashboard resuelve `corte_day` y lee `pronostico_dias_seleccion` / snapshot de esa clave.

Las cuatro magnitudes del mini (`ventaTon`, `comDesc`, `utilOperImporte`, `resultadoFinalImporte`) se sellan con el mismo `cutoff_date` / `effective_cutoff_date` cuando el mini está AVAILABLE.

Sin cutoff: forecast PROM = UNAVAILABLE. No ARR, no stored, no fin de mes.

## F. Pruebas focales

`test/director-ia-prom-cutoff-runtime-parity.test.js`: **20/20 PASS**

1. Acapulco, corte A + PROM A → forecast A
2. Acapulco, corte B + PROM B → forecast B
3. A ≠ B, sin contaminación
4. Last-upload Puebla no cambia query de Acapulco
5. Cutoff explícito gana sobre request/last-upload
6. Request `upload_day` gana sobre plant-last-upload
7. Ausencia total → UNAVAILABLE, mini no corre
8. Cuatro magnitudes del mismo cutoff
9–10. Follow-up de fecha recupera `forecast_run`
11. El número (p. ej. 1491.50) no adivina fecha
12. Golden Set routing Q1–Q4
13. Cubierto por suite completa

Cifras sintéticas (611.25 / 722.5, etc.). No se usaron 1432 / 1488 / 1503 como lógica.

## G. Golden Set

`test/director-ia-sprint1-core-conversational-recovery.test.js`: **16/16 PASS**

Los fixtures de pack que ya inyectaban mini/adapter como AVAILABLE ahora declaran `cutoff_date` (identidad). Preguntas y routing Q1–Q4 no cambiaron.

## H. Suite completa

`node --test test/director-ia-*.test.js`

**1237/1237 PASS**, fail 0.

## I. Prueba de follow-up sobre cutoff

Turno 1: «¿Cómo vamos?» + `upload_day` A → `conversation_state.forecast_run`.

Turno 2: «¿Qué fecha de corte usaste para calcular esa proyección?» con ese state.

Resultado: `mode=cutoff_explain`, `openai_called=false`, respuesta «Usé el corte del 5 de agosto de 2026.» (fecha del fixture, no hardcode 27/08). No UNKNOWN.

El panel ecoa `context_meta.conversation_state` en el siguiente POST (`buildDirectorIaChatBody`).

## J. Evidencia de no contaminación entre cortes

Mismo Acapulco / agosto: mini A con 611.25 / 101001 / -202002 vs mini B con 722.5 / 303003 / -404004. El prompt del turno B no contiene las cifras A. Pack A no contiene venta B.

## K. DASHBOARD_BEHAVIOR_CHANGED

**NO**

No se modificó fórmula de Pronóstico, selector, marcar/desmarcar PROM, Guardar mini-resumen, tablas PROM, Excel ni IGF Forecast UI.

## L. Riesgos / residuales

1. Rama `main`: desvío de protocolo. Queda en working tree sin commit.
2. Verificación en navegador no ejecutada (sin app Dashboard levantada ni herramienta de browser para ese flujo). El eco de `conversation_state` está cubierto por tests de `chat-request` + `askDirectorIa`.
3. `GET /api/arr/last-upload-day` sigue global (Dashboard). Director IA no lo usa.
4. Si el cliente no reenvía `conversation_state` (cliente viejo / otro surface), el follow-up de corte solo responde si el turno actual trae cutoff en body o pregunta. El panel Director IA sí lo reenvía.
5. «27 de agosto» en prosa sin año sigue sin parsearse como cutoff explícito (contrato previo).
6. Un DONE no autoriza la siguiente tarea.
