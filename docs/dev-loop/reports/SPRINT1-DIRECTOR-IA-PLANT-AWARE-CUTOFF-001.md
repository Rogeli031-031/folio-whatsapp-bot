# SPRINT1-DIRECTOR-IA-PLANT-AWARE-CUTOFF-001

task_id: SPRINT1-DIRECTOR-IA-PLANT-AWARE-CUTOFF-001
outcome: DONE_PENDING_REVIEW
DASHBOARD_BEHAVIOR_CHANGED: NO

## A. Causa raíz confirmada

El fallback de last-upload era **GLOBAL** por `(year, month)`:

```sql
SELECT ... FROM arr.upload_log
 WHERE year = $1 AND month = $2
 ORDER BY uploaded_at DESC
 LIMIT 1
```

Una carga posterior de otra planta (p. ej. Puebla) fijaba `uploaded_day` para Acapulco.

`GET /api/arr/last-upload-day` (Dashboard) **no se modificó**. Sigue global: es endpoint de negocio.

## B. Resolución plant_code

No se inventó mapping.

```
planta_id
  → public.plantas.nombre (loadIgfArrSourceBlocksForChat)
  → getPlantCodeArrFromPlantaNombre
       JOIN arr.provincia_plants
       ON plant_code = nombre OR plant_code = clave
  → assembled.plant.plant_code
  → arr.upload_log.plant_code  (mismo código ARR de la carga)
```

Director IA usa **solo** `assembled.plant.plant_code` ya resuelto. Sin código → no hay last-upload (ni global).

## C. Precedencia final

1. Cutoff explícito en la pregunta si es inequívoco: `YYYY-MM-DD` o `DD/MM/YYYY`.
2. `upload_day` / `cutoff_date` en el body del chat.
3. Last-upload **misma planta + year + month**.
4. Si no hay ninguno: `effective_cutoff_date = null` (UNAVAILABLE). Mini **no** se invoca. No se usa fin de mes.

## D. Query/fuente plant-aware

`queryArrLastUploadDayPlantAware` (`lib/director-ia-chat.js`), inyectada en `configureDirectorIaChat`:

```sql
SELECT plant_code, uploaded_day, uploaded_at, uploaded_by
  FROM arr.upload_log
 WHERE year = $1::int AND month = $2::int
   AND UPPER(TRIM(plant_code)) = UPPER(TRIM($3::text))
 ORDER BY uploaded_at DESC
 LIMIT 1
```

`$3` = `assembled.plant.plant_code`.

## E. Sin carga de la planta

`upload_day: null`. `mini_loader_invoked = false`. Prompt: `effective_cutoff_date=UNAVAILABLE`. Sin 31/08 inventado.

## F. Archivos modificados

- `lib/director-ia-chat.js` (precedencia, plant_code, query plant-aware, stamp del cutoff)
- `server.js` (solo la inyección `loadArrLastUploadDay` de Director IA)
- `lib/director-ia-conversational-executive-layer.js` (mismo `cutoff_date` en util/resultado; `effective_cutoff_date` en pack/prompt)
- `test/director-ia-plant-aware-cutoff.test.js` (nuevo)
- `test/director-ia-cutoff-transport-e2e.test.js` (`cutoff_source` → `arr.upload_log.plant`)
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-PLANT-AWARE-CUTOFF-001.md` (este archivo)

No tocados: `computeIgfForecastMiniPayload`, fórmulas, selector, IGF/ARR endpoints de negocio, Excel, SQL, `docs/director-ia/`.

## G. Tests focales

14/14 `test/director-ia-plant-aware-cutoff.test.js`

1. Aislamiento Acapulco A vs Puebla B (uploaded_at posterior): PASS
2. Cutoff explícito C gana: PASS
3. Ausencia → UNAVAILABLE, mini no corre: PASS
4. E2E «¿Cómo vamos?» mismo cutoff en mini/CEL/prompt: PASS

## H. Golden Set

16/16 `test/director-ia-sprint1-core-conversational-recovery.test.js`

## I. Suite completa

1217/1217 `node --test test/director-ia-*.test.js`

## J. DASHBOARD_BEHAVIOR_CHANGED

NO.

## K. Limitaciones

- «¿Cómo íbamos al 27 de agosto?» **sin año ni ISO/DMY** no se parsea. Quedó fuera: no se añadió parser de mes en texto.
- Si `upload_log.plant_code` no coincide (case-insensitive) con `assembled.plant.plant_code`, el fallback queda UNAVAILABLE. Fail-closed; no se aliasa.
- El selector del Dashboard sigue sin viajar a `/acciones`. Last-upload plant-aware no es el corte manual 27/08 salvo que esa sea la última carga **de esa planta**.
- Validación post-deploy (Acapulco + misma fecha en Dashboard) es humana.
- Ejecución sobre rama `main` (LOOP pide rama ≠ `main`). Sin commit / push / merge / deploy / SQL.

## Contratos

Consultados: Constitución, contratos vía índice, LOOP_PROTOCOL, CURRENT_TASK.
Modificados: ninguno (sin G2/G3).

## next_task_proposed

Ninguna. Un DONE no autoriza la siguiente.

## secrets_check

OK. Sin secretos.

## human_decision_needed

Revisión G1→CLOSED o REJECTED. Sin G4.
