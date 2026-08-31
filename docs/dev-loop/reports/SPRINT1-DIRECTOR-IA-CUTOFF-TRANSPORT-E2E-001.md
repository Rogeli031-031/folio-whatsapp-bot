# SPRINT1-DIRECTOR-IA-CUTOFF-TRANSPORT-E2E-001

task_id: SPRINT1-DIRECTOR-IA-CUTOFF-TRANSPORT-E2E-001
outcome: DONE_PENDING_REVIEW
DASHBOARD_BEHAVIOR_CHANGED: NO

## A. Request real que producía el fallo

La conversación de producción no sale del Dashboard IGF/ARR. Sale de **`/acciones`**.

1. URL: `/acciones` (query típica: token / planta). **No hay `upload_day`.**
2. `DirectorIaChatModal` → `DirectorIaChatPanel`.
3. El panel solo leía `window.location.search.get("upload_day")` → `null`.
4. `api.ts` omitía `upload_day` del body si era nulo.
5. `POST /api/director-ia/chat` → `handlePostChat` → `askDirectorIa(req, …)` conserva `req.body` intacto, pero el campo no existe.
6. `handleExecutiveStatusForChat` resolvía `resolvedCutoff = null`.
7. `loadArrLastUploadDay` solo corría si `parseYearMonth(assembled)` funcionaba; aun así, **el mini se invocaba con `upload_day: null`**.
8. `computeIgfForecastMiniPayload(..., uploadDay=null)` usa `fechaCorte=""` → `getPronosticoCorteYmdStr` → **último día del mes**.
9. Ese mini quedaba AVAILABLE y gobernaba CEL / prompt.

Nombre y formato correctos cuando sí viaja: `upload_day` = `YYYY-MM-DD` en el body JSON.

## B. Punto exacto donde se perdía o ignoraba `upload_day`

Pérdida primaria (frontend): **nunca existió en la URL de Acciones**, y el panel no tenía otra fuente (ni prop del padre).

Pérdida decisiva (backend): **`handleExecutiveStatusForChat` llamaba `loadIgfForecastMiniPayload` con `upload_day: null`**. El loader no se saltaba; el motor Dashboard interpretaba corte vacío como fin de mes. El cutoff seleccionado en el selector del Dashboard nunca llegó a esa llamada.

Los tests anteriores inyectaban `upload_day` en `req.body` o un `forecastParity` ya armado. Nunca probaron Acciones → body sin campo → mini(null).

## C. Effective cutoff antes y después

| Caso | Antes | Después |
| --- | --- | --- |
| Body `upload_day` A | A (si llegaba) | A; `cutoff_source=req.body.upload_day` |
| Body `upload_day` B | B (si llegaba) | B |
| Acciones / body sin campo + last-upload | mini(null) → fin de mes | last-upload; `cutoff_source=arr.upload_log` |
| Sin campo y sin last-upload | mini(null) → fin de mes tratado como AVAILABLE | cutoff `null`; mini **no** se invoca; `fallback_used=true` |

`context_meta` ahora expone (sin prompt ni PII): `requested_upload_day`, `effective_cutoff_date`, `cutoff_source`, `authoritative_mini_available`, `authoritative_source`, `fallback_used`, `mini_loader_invoked`.

## D. Por qué aparecía 1307

No es otra fórmula. Es el **forecast del mini al último día del mes** (corte vacío). Ese payload AVAILABLE gobernaba `FORECAST_PROJECTION`. 1307 / −0.12 es el síntoma de esa corrida de fin de mes, no una constante de negocio y no se hardcodeó.

## E. Por qué aparecían 1723201 / −642764

Misma row del mini de fin de mes: `utilOperImporte` / `resultadoFinalImporte`. CEL las lee de `forecastParity.mini`, no de IGF stored. Stored 1536.54 / 0.1137 seguía en el pack como `FORECAST_STORED` (versión GLOBAL), por eso coexistían ambas familias de cifras.

## F. Ruta corregida completa

```
URL / context (upload_day o vacío)
→ DirectorIaChatModal.uploadDay (Acciones reenvía searchParams si existe)
→ DirectorIaChatPanel (prop o helper de search)
→ chat-request.buildDirectorIaChatBody
→ api.ts POST /api/director-ia/chat
→ server handlePostChat
→ askDirectorIa (req.body intacto)
→ resolvedCutoff = body.upload_day | last-upload | null
→ loadIgfForecastMiniPayload SOLO si resolvedCutoff
→ computeIgfForecastMiniPayload(upload_day efectivo)
→ readIgfForecastMiniAuthoritative
→ forecastParity.mini
→ buildExecutiveStatusPack / prompt
```

Si hay `upload_day` en URL o prop, se preserva. Si no, solo last-upload autorizado. **No se inventa fin de mes como corte conversacional.**

Corte A y corte B deliberadamente distintos producen prompts con A/B y valores A/B. Decoy ARR/stored no gobierna el forecast si el mini está AVAILABLE.

## G. Archivos modificados

- `frontend-dashboard/modules/director-ia/lib/chat-request.js` (nuevo helper CJS testeable)
- `frontend-dashboard/modules/director-ia/lib/chat-request.d.ts`
- `frontend-dashboard/modules/director-ia/lib/api.ts`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatModal.tsx`
- `frontend-dashboard/app/acciones/page.tsx` (solo pasa `upload_day` de la query al modal; no toca UI de negocio)
- `lib/director-ia-chat.js` (precedencia de corte; no llama mini sin cutoff; `context_meta`)
- `test/director-ia-cutoff-transport-e2e.test.js` (nuevo)
- `test/director-ia-authoritative-kpi-parity.test.js` (Q1–Q3 ahora envían `upload_day`; esos tests ocultaban el bug)
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CUTOFF-TRANSPORT-E2E-001.md` (este archivo)

No tocados: `computeIgfForecastMiniPayload`, `recalcularUtilYResultado`, `lib/dashboard-arr-forecast.js`, endpoints Dashboard, selector Fecha de carga, Excel, SQL, `docs/director-ia/`.

## H. Test request-boundary

3/3 (`test/director-ia-cutoff-transport-e2e.test.js`, describe «1 request boundary»).

## I. Test chat-E2E

3/3 HTTP/chat + decoy; 2/2 absence.

## J. Golden Set

16/16 `test/director-ia-sprint1-core-conversational-recovery.test.js`.
2/2 en este archivo (Q1–Q4 routing + cambio cutoff A → B).

## K. Suite completa

1203/1203 `node --test test/director-ia-*.test.js`.

## L. DASHBOARD_BEHAVIOR_CHANGED

NO.

## M. Limitaciones restantes

- Abrir el chat desde `/acciones` **sigue sin el corte del selector del Dashboard**, porque esa página no tiene el selector (protegido). Sin `upload_day` en la URL, el backend usa last-upload, no la fecha que el usuario dejó en IGF Forecast.
- Para alinear Acciones con el corte visto en Dashboard, la URL o el padre deben transportar `upload_day`. Esta tarea no cablea el selector.
- Tendencias CASA/Comisionista (ventana trailing) quedan fuera de alcance.
- Verificación en producción post-deploy sigue pendiente (humano).
- Ejecución sobre rama `main` (LOOP pide rama ≠ `main`). Sin commit / push / merge / deploy / SQL.

## Contratos

Consultados: Constitución, contratos Director IA vía índice, LOOP_PROTOCOL, CURRENT_TASK.
Modificados: ninguno (sin G2/G3).

## Desvíos

Rama `main`. Un DONE no autoriza la siguiente.

## next_task_proposed

Ninguna. Un DONE no autoriza la siguiente.

## secrets_check

OK. Sin secretos. `context_meta` no registra prompts ni PII.

## human_decision_needed

Revisión G1→CLOSED o REJECTED. Sin G4 (push/merge).
