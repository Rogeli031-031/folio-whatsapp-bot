# SPRINT1-DIRECTOR-IA-FORECAST-DIRECT-BOOTSTRAP-001

task_id: SPRINT1-DIRECTOR-IA-FORECAST-DIRECT-BOOTSTRAP-001
outcome: DONE
DASHBOARD_BEHAVIOR_CHANGED: NO

```yaml
task_id: SPRINT1-DIRECTOR-IA-FORECAST-DIRECT-BOOTSTRAP-001
outcome: DONE
files_touched:
  - lib/director-ia-chat.js
  - test/director-ia-forecast-direct-bootstrap.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-DIRECT-BOOTSTRAP-001.md
files_not_touched:
  - lib/director-ia-authoritative-forecast-run-pack.js
  - lib/director-ia-conversational-executive-layer.js
  - server.js computeIgfForecastMiniPayload
  - loadProyVentaDescByPlantForIgf
  - lib/dashboard-arr-forecast.js
  - PROM / selector / persistencia PROM
  - IGF Forecast UI / IgfForecastClient
  - transporte upload_day (igf-to-acciones-href, chat-request)
  - Excel / schema / datos
  - frontend-dashboard Dashboard
  - docs/director-ia/
contracts_consulted:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-FORECAST-DIRECT-BOOTSTRAP-AUDIT-001.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "Ejecución en rama main (desvío ya documentado en sprints previos; sin push/merge)."
next_task_proposed: ""
secrets_check: none
human_decision_needed: []
```

## A. Causa raíz

El primer turno de una pregunta directa FORECAST ya entraba al handler y el body ya traía `upload_day` (transporte IGF). Sin `forecast_run`, year/month solo se tomaban de `body.year`/`body.month` (el chat no los envía). El mini no corría. El pack quedaba UNAVAILABLE.

## B. Bootstrap implementado

Si no hay `forecast_run` y year/month siguen vacíos, pero ya hay cutoff YMD (pregunta o `request upload_day`), se completan year/month con los componentes de calendario de ese YMD (`2026-08-27` → 2026 / 8) y se ejecuta la ruta autoritativa existente.

No se rediseñó el Estado Ejecutivo. No hay ARR, stored, last-upload global ni fin de mes inventado.

## C. Identidad derivada

```
planta: body.planta_nombre / catálogo
cutoff: EXPLICIT_QUESTION || REQUEST_UPLOAD_DAY
year/month: body → forecast_run → periodo nombrado → calendario del cutoff YMD
```

`yearMonthFromCutoffYmd` no acepta prosa ni fechas inválidas.

## D. Precedencia

1. `forecast_run` vigente y compatible → re-ejecutar (igual que antes).
2. Sin run: request con planta + cutoff YMD → bootstrap year/month → pack.
3. Sin identidad suficiente → UNAVAILABLE.

Precedencia de cutoff protegida (pregunta → body upload_day → no inventar).

## E. Ruta authoritative pack

```
loadIgfForecastMiniPayload
  → computeIgfForecastMiniPayload
  → buildAuthoritativeForecastRunPack
  → respuesta directa de la magnitud
```

El archivo del pack no se modificó.

## F. Archivos modificados

| Archivo | Cambio |
|---|---|
| `lib/director-ia-chat.js` | `yearMonthFromCutoffYmd` + uso en el handler de magnitud |
| `test/director-ia-forecast-direct-bootstrap.test.js` | Tests 1–15 contractuales |
| `docs/dev-loop/CURRENT_TASK.md` | `status` |
| este reporte | Cierre |

## G. Pruebas focales

`node --test test/director-ia-forecast-direct-bootstrap.test.js` → 12/12.

## H. Golden Set

Q1–Q3 siguen CEL. Q3 no se convierte en bootstrap. Incluido en la suite completa.

## I. Suite completa

```
node --test test/director-ia-*.test.js
ℹ tests 1283
ℹ pass 1283
ℹ fail 0
```

## J. Prueba primer turno

Chat nuevo, sin `conversation_state`, `upload_day=2026-08-27`, planta Acapulco:

- descuento / venta / utilidad / resultado responden el pack.
- mini se invoca con year=2026, month=8, upload_day=2026-08-27.
- `openai_called=false`, `used_plant_diagnosis=false`.

## K. Prueba continuidad existente

«¿Cómo vamos?» → Estado Ejecutivo → follow-up de descuento conserva la misma `run_key` y −0.11 $/kg al 27 de agosto.

## L. Aislamiento corte A/B

Primer turno `2026-08-27` vs `2026-08-12` → magnitudes y `run_key` distintas.

## M. Aislamiento planta A/B

Acapulco vs Zihuatanejo, mismo `upload_day` → cada planta su row del mini. A no contamina B.

## N. Evidencia de no ARR/stored fallback

Sin `upload_day`: UNAVAILABLE, mini no corre, no 1432, no stored 0.1137. Con identidad: respuesta del pack, no MATERIALIDAD, no Estado Ejecutivo completo.

## O. DASHBOARD_BEHAVIOR_CHANGED

NO.

## P. Riesgos residuales

- Year/month del YMD asumen que el corte pertenece a su mes calendario (igual que IGF/PROM).
- Anáforas cortas («¿Y el descuento?») siguen exigiendo hilo + run.
- Sin `upload_day` en un chat abierto fuera de IGF, UNAVAILABLE se conserva.
- Rama `main` sin push/merge.

Un DONE no autoriza otra tarea.
