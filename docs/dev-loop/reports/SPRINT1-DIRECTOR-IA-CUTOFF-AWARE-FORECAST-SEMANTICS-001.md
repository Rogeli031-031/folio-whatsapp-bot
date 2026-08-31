# SPRINT1-DIRECTOR-IA-CUTOFF-AWARE-FORECAST-SEMANTICS-001

task_id: SPRINT1-DIRECTOR-IA-CUTOFF-AWARE-FORECAST-SEMANTICS-001
outcome: DONE
DASHBOARD_BEHAVIOR_CHANGED: NO

## A. Origen real del cutoff

UI «Fecha de carga (corte)» → `upload_day` (query IGF/ARR).

Si el usuario no elige fecha, el Dashboard usa `GET /api/arr/last-upload-day` (`arr.upload_log.uploaded_day` del YYYY-MM).

Ese `upload_day` entra a `buildIgfForecastPayload` / `computeIgfForecastMiniPayload` / `buildPronosticoVentaDescMaps`.

`getPronosticoCorteYmdStr(year, month, fechaCorte)`: si `fechaCorte` está vacío o no es del mes, usa **el último día del mes**.

## B. Por qué Director IA producía 1307 frente al forecast del Dashboard

Director IA no recibía `upload_day`. El chat no lo enviaba. El adaptador usaba `fechaCorte = ""` → corte = último día del mes (p. ej. 31/08), snapshot y PROY distintos a corte 27/08.

`loadIgfForecastMiniPayload` existía pero se llamaba sin `upload_day`. El mini de otro corte no es 1488.

No era otra fórmula: era otro corte.

## C. Fuente de Venta ACTUAL_TO_DATE

`dashboard-arr-forecast.getPronosticoPlantDetail` → `venta_sheet.total_mes_sum` (TOTAL mes de días cerrados hasta el corte). No es `getVentaRealTonProvinciaByPlant` (mes calendario completo, sin corte).

## D. Fuente de Descuento ACTUAL_TO_DATE

UNAVAILABLE. El Dashboard no exporta una cifra lista de descuento acumulado al corte. No se estima desde forecast ni se toma de IGF stored.

Mismo `cutoff_date` que la venta acumulada.

## E. Fuente de Venta FORECAST_PROJECTION

`computeIgfForecastMiniPayload` (`mini.rows[].ventaTon`) con el mismo `upload_day`. Gobierna sobre ARR/`computePronosticoProyByPlant`.

## F. Fuente de Descuento FORECAST_PROJECTION

La misma corrida mini (`comDesc` → signo Dashboard −|x|), mismo `upload_day` / `cutoff_date`.

## G. Semántica física del antiguo «IGF almacenado»

No es TARGET/COMMITMENT.

- Tabla: `igf.compromiso_lines`
- Versión: `igf.versions` GLOBAL del YYYY-MM, `ORDER BY version_number DESC LIMIT 1`
- Campo venta: `venta_ton`
- Campo desc: `com_desc_kg`
- Contrato: FORECAST stored (`compromiso_lines`) ≠ `TARGET_COMMITMENT` (`igf_meta`) ≠ COMMITMENT de steering.

1536.54 es un valor stored de esa fila, no meta.

## H. Fuente/versionado de Venta Meta/Compromiso

UNAVAILABLE. `igf_meta` no se carga en CEL. No se infiere.

## I. Fuente/versionado de Descuento Meta/Compromiso

UNAVAILABLE. Mismo artefacto (`igf_meta`) que la venta meta; al no estar cargado, no se empareja un descuento de otra versión.

FORECAST_STORED venta y descuento sí comparten `version_id` del snapshot IGF.

## J. Precedencia final

1. `upload_day` del body (selector / URL) o, si falta, última carga `arr.upload_log`.
2. No se inventa último día del mes ni la fecha de hoy como corte seleccionado.
3. Mini AVAILABLE gobierna forecast venta/desc/util/resultado.
4. ACTUAL_TO_DATE ≠ FORECAST_PROJECTION ≠ FORECAST_STORED ≠ TARGET_OR_COMMITMENT.

## K. Archivos modificados

- `lib/director-ia-dashboard-forecast-adapter.js`
- `lib/director-ia-conversational-executive-layer.js`
- `lib/director-ia-chat.js`
- `server.js` (inyección `loadArrLastUploadDay`; misma consulta que `GET /api/arr/last-upload-day`)
- `frontend-dashboard/modules/director-ia/lib/api.ts`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx`
- `test/director-ia-cutoff-aware-forecast-semantics.test.js`
- `test/director-ia-sprint1-core-conversational-recovery.test.js` (selectores)
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- este reporte

No tocados: fórmulas/endpoints/UI selector del Dashboard, `computeIgfForecastMiniPayload` body, SQL schema.

## L–P

L. Tests focales 7/7 (`test/director-ia-cutoff-aware-forecast-semantics.test.js`)
M. Golden Set 8/8 (Q1–Q8) + 16/16 Sprint 1 existente
N. Suite 1190/1190
O. DASHBOARD_BEHAVIOR_CHANGED = NO
P. Limitaciones: descuento ACTUAL_TO_DATE UNAVAILABLE; TARGET UNAVAILABLE hasta cargar `igf_meta`; si el chat no manda `upload_day` y no hay last-upload, el corte queda sin resolver (no se usa último día del mes como seleccionado); GPT redacta, pack/prompt fijan la verdad; rama `main` (desvío LOOP).

## Contratos

Consultados: Constitución, Index, EXECUTIVE-STEERING (TARGET ≠ FORECAST stored), LOOP, CURRENT_TASK.
Modificados: ninguno.

## next_task_proposed

Ninguna.

## secrets_check

OK.

## human_decision_needed

CLOSED o REJECTED. Sin G4. Aceptación de producción posterior con el mismo cutoff del Dashboard.
