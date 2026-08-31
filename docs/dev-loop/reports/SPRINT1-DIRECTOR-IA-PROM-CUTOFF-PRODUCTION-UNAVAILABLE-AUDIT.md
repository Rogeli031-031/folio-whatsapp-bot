# SPRINT1-DIRECTOR-IA-PROM-CUTOFF-PRODUCTION-UNAVAILABLE-AUDIT

tipo: AUDITORÍA SOLO LECTURA
outcome: INFORME DE CHAT (no hay G1 para esta auditoría)
DASHBOARD_BEHAVIOR_CHANGED: NO

`CURRENT_TASK.md` permanece en `SPRINT1-DIRECTOR-IA-PROM-CUTOFF-RUNTIME-PARITY-001` / `DONE_PENDING_REVIEW`.
LOOP_PROTOCOL prohíbe pasar de `DONE_PENDING_REVIEW` a una tarea nueva. Este archivo no autoriza implementación.

No se ejecutó SQL. No se cambió código. No git.

## 1. Causa raíz

La política fail-closed **funcionó**. No hubo `forecast_run` porque no hubo cutoff efectivo.

En `/acciones` + «¿Cómo vamos?» + Acapulco:

1. La pregunta no trae `YYYY-MM-DD` / `DD/MM/YYYY`.
2. `/acciones` **no pone `upload_day` en el body** salvo que la URL ya lo traiga. El enlace desde IGF Forecast es `/acciones?t=…&back=1` — **sin `upload_day`**.
3. El único fallback restante es last-upload **plant-aware** en `arr.upload_log` para `(year, month, assembled.plant.plant_code)`.
4. Esa consulta devolvió `upload_day: null` (no hay fila, o el `plant_code`/`year`/`month` no coinciden).
5. Mini no corre. CEL marca FORECAST PROM = UNAVAILABLE. No se persiste una corrida. El follow-up dice la verdad.

Eso **no** prueba que no exista PROM guardado para Acapulco/agosto. `upload_log` no es el registro de PROM.

## 2. Traza exacta (A–C)

```
/acciones (plantaId UI = Acapulco)
  → DirectorIaChatModal.uploadDay = searchParams.upload_day || null
  → buildDirectorIaChatBody: solo añade body.upload_day si hay YMD
  → POST /api/director-ia/chat { planta_id, question: "¿Cómo vamos?", history? }
  → shouldHandleExecutiveStatus → handleExecutiveStatusForChat
  → loadPlantDiagnosisForChat(pool, targetPlantId, …)
       commercial_state: queryPlantCodeSelectOnly (dicf / provincia_plants)
       IGF/ARR: resolvePlantaNombre(planta_id)
                 → public.plantas.nombre
                 → getPlantCodeArrFromPlantaNombre(nombre)
                 → assembled.plant.plant_code   ← este gana
       year/month: resolveYearMonthFromQuestion("¿Cómo vamos?")
                 → currentYearMonthCdmx()  (sin mes en la pregunta)
  → resolveDirectorIaPlantCode(assembled) = assembled.plant.plant_code
  → preResolved: sin cutoff (pregunta + body)
  → loadArrLastUploadDayForDirectorIa(pool, year, month, { plant_code })
       ≡ queryArrLastUploadDayPlantAware
  → si upload_day null → resolvedCutoff null → mini NO se invoca
  → forecast_run.cutoff_origin = UNAVAILABLE
```

SQL exacta (C):

```sql
SELECT plant_code, uploaded_day, uploaded_at, uploaded_by
  FROM arr.upload_log
 WHERE year = $1::int AND month = $2::int
   AND UPPER(TRIM(plant_code)) = UPPER(TRIM($3::text))
 ORDER BY uploaded_at DESC
 LIMIT 1
```

`$1/$2` = year/month de `parseYearMonth(assembled)` (= CDMX actual si la pregunta no nombra mes).
`$3` = `assembled.plant.plant_code` (salida de `getPlantCodeArrFromPlantaNombre`).

`GET /api/arr/last-upload-day` (Dashboard, **global**, sin filtro de planta) **no** se usa en este camino.

## 3. Evidencia de código

| Pieza | Archivo |
|---|---|
| Modal `/acciones` lee URL, no selector IGF | `frontend-dashboard/app/acciones/page.tsx` ~1678 |
| Enlace IGF → acciones **sin** `upload_day` | `IgfForecastClient.tsx` ~864 |
| Body omite `upload_day` si no hay YMD | `chat-request.js` `buildDirectorIaChatBody` |
| `plant_code` IGF/ARR | `lib/director-ia-igf-arr.js` `loadIgfArrSourceBlocksForChat` |
| Resolución código ARR | `server.js` `getPlantCodeArrFromPlantaNombre` |
| Código que llega al last-upload | `director-ia-chat.js` `resolveDirectorIaPlantCode` |
| Inyección | `server.js` `loadArrLastUploadDayForDirectorIa` |
| Query plant-aware | `director-ia-chat.js` `queryArrLastUploadDayPlantAware` |
| Escritura `upload_log` | `server.js` POST ARR load: `plant_code` del body de carga |
| PROM persistido | `arr.pronostico_dias_seleccion` / `arr.pronostico_mini_snapshot` vía `POST /pronostico-dias` |
| Fail-closed CEL | `director-ia-conversational-executive-layer.js` `unavailable_no_cutoff` |

## 4. Semántica de cada fecha

| Fecha | Qué es | Qué no es |
|---|---|---|
| `uploaded_day` / last-upload ARR | Día calendario de **ingesta** del archivo ARR (`getForecastBusinessTodayYmd`, TZ negocio) | No es «último PROM guardado» |
| `upload_day` (request / IGF) | Fecha de carga que el Dashboard usa como `fechaCorte` | No existe en `/acciones` salvo querystring |
| `corte_day` | `getPronosticoCorteYmdStr(year, month, fechaCorte)`: si la fecha está en el mes, es esa fecha; si no, **último día del mes** (solo motor Dashboard, no fallback conversacional) | No se inventa en Director IA si cutoff es null |
| `effective_cutoff_date` | Cutoff resuelto por precedencia Director IA | Null en este incidente |
| PROM `updated_at` | Cuándo se guardó selección/snapshot | Independiente de `upload_log` |

Mezclar (I): **sí se está mezclando** «última carga ARR de esa planta» con «último estado PROM». Son hechos distintos. Puede haber PROM a un `corte_day` sin fila `upload_log` de Acapulco ese día, y viceversa. El GET global de Dashboard puede mostrar el `uploaded_day` de **otra** planta.

## D. Condiciones last-upload Director IA

**AVAILABLE:** hay `plant_code` + year/month finitos + cliente SQL + una fila + `uploaded_day` parseable YMD.

**UNAVAILABLE (`upload_day: null`, `ok: true`):**
- `plant_code` vacío;
- year/month no finitos;
- pool/client sin `query`;
- cero filas para esa tripleta;
- `uploaded_day` no parseable;
- o no se llama la función (`parseYearMonth` null, o ya había cutoff en preResolved).

**Error:** el `query` lanza. El `catch` de `handleExecutiveStatusForChat` deja `lastUpload = null` → se trata como UNAVAILABLE. No hay código de error distinto hacia el usuario.

## E–F. Canonicalización

`getPlantCodeArrFromPlantaNombre`: alias (Acapulco **no** está en `ALIAS_PLANTA_NOMBRE`) → JOIN `public.plantas` ↔ `arr.provincia_plants` por `nombre` o `clave` (UPPER/TRIM) → si falla, `provincia_plants` contra el **raw** → si falla, **devuelve el nombre crudo**.

`queryPlantCodeSelectOnly` (commercial_state) es **otra** ruta: primero `arr.dicf_cliente_mes`, luego `provincia_plants`, luego `nombre\|\|clave`. Luego IGF/ARR **pisa** `plant.plant_code`.

`upload_log.plant_code` se escribe tal cual el `plant_code` del POST de carga ARR (`VARCHAR(20)`). La igualdad last-upload es `UPPER(TRIM(...))` — cubre mayúsculas y espacios, **no** alias `E3` vs `Acapulco` vs `GT Acapulco`.

Mismatch posible y suficiente para UNAVAILABLE:
- log = clave (`E3`), assembled = `Acapulco`;
- log = otra etiqueta;
- **no hay ninguna carga ARR de esa planta en el YYYY-MM** (muy plausible si el selector IGF usó last-upload **global** de Puebla u otra).

## G. SELECT mínima (NO ejecutada)

```sql
-- last-upload ARR vs códigos
SELECT plant_code, year, month, uploaded_day, uploaded_at, uploaded_by
  FROM arr.upload_log
 WHERE year = 2026 AND month = 8
   AND (
     UPPER(TRIM(plant_code)) IN ('ACAPULCO', 'E3')
     OR UPPER(TRIM(plant_code)) LIKE '%ACAPULCO%'
   )
 ORDER BY uploaded_at DESC;

-- qué devolvería el GET global del Dashboard (otra planta puede ganar)
SELECT plant_code, uploaded_day, uploaded_at
  FROM arr.upload_log
 WHERE year = 2026 AND month = 8
 ORDER BY uploaded_at DESC
 LIMIT 5;

-- resolución de código
SELECT p.id, p.nombre, p.clave, ap.plant_code
  FROM public.plantas p
  LEFT JOIN arr.provincia_plants ap
    ON UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.nombre))
    OR (p.clave IS NOT NULL AND TRIM(p.clave) <> ''
        AND UPPER(TRIM(ap.plant_code)) = UPPER(TRIM(p.clave)))
 WHERE UPPER(TRIM(p.nombre)) = 'ACAPULCO' OR UPPER(TRIM(p.clave)) = 'E3';
```

## H. ¿PROM descubre el último corte por sí mismo?

**Sí.** Ambas tablas tienen `corte_day` en la PK / clave.

- `arr.pronostico_dias_seleccion`: `(plant_code, year, month, corte_day, fecha)` + `updated_at`
- `arr.pronostico_mini_snapshot`: `(year, month, corte_day, plant_code)` + `updated_at`

Se puede listar cortes PROM de Acapulco/agosto **sin fórmula**. Criterio de «último» no está definido en contrato: `MAX(updated_at)` ≠ `MAX(corte_day)`.

Caveat: al Guardar, el snapshot se reescribe **para todas las plantas de ese corte**. `updated_at` del snapshot de Acapulco puede moverse por un guardado hecho desde otra planta en el mismo corte. `pronostico_dias_seleccion` es por planta+corte.

## J. Recuperar último corte PROM (solo lectura, sin fórmula)

```sql
SELECT corte_day, MAX(updated_at) AS last_sel
  FROM arr.pronostico_dias_seleccion
 WHERE year = 2026 AND month = 8
   AND UPPER(TRIM(plant_code)) = UPPER(TRIM(:plant_code_arr))
 GROUP BY corte_day
 ORDER BY last_sel DESC;

SELECT corte_day, proy_venta_ton, proy_desc_kg, updated_at
  FROM arr.pronostico_mini_snapshot
 WHERE year = 2026 AND month = 8
   AND UPPER(TRIM(plant_code)) = UPPER(TRIM(:plant_code_arr))
 ORDER BY updated_at DESC, corte_day DESC;
```

`:plant_code_arr` = el mismo código que `getPlantCodeArrFromPlantaNombre` (y, si hay duda, también clave).

## 5. Propuesta mínima (SIN código)

No implementar ahora. Opciones conceptuales para «¿Cómo vamos?» sin `upload_day`:

| Opción | Efecto |
|---|---|
| A. Mantener UNAVAILABLE | Honesto; IGF Forecast puede seguir mostrando cifra |
| B. Last-upload ARR **de esa planta** (hoy) | Correcto solo si existe fila; no es PROM |
| C. Último `corte_day` PROM persistido planta+mes | Alinea con lo guardado en Pronóstico; hay que elegir `updated_at` vs `corte_day` |
| D. Reusar last-upload **global** del Dashboard | Recupera a menudo el corte de la UI IGF; **rompe** aislamiento por planta |
| E. Transportar `upload_day` de IGF → `/acciones` | No cambia semántica; solo cierra el hueco de URL cuando el usuario viene del Forecast |

La paridad visual con IGF Forecast **no** se logra con B si IGF usó corte global u otro selector. C es la única que habla de «último PROM guardado» sin tocar fórmulas.

## K. Qué debería ocurrir (concepto, no decisión)

Hoy el contrato implementado dice: explícito → body → last-upload de planta → UNAVAILABLE.

El incidente de producción es **ese contrato ejecutado**. No es un bug de fail-closed.

Si el producto quiere que «¿Cómo vamos?» en `/acciones` iguale el mini visible en IGF Forecast, hay que **elegir** una fuente de corte (PROM persistido vs upload ARR vs transporte UI) con Gate humano. No se implementa aquí.

## 6. Riesgos de cambiar el fallback

- Global last-upload: Puebla pisa Acapulco (ya auditado).
- Último PROM por `updated_at` de snapshot: contaminación entre plantas del mismo corte.
- Último PROM por `MAX(corte_day)`: puede no ser el que el usuario guardó si hay un corte posterior default.
- Usar PROM como cutoff y luego llamar `computeIgfForecastMiniPayload` con ese día: **no cambia la fórmula**, pero cambia **qué identidad** se carga.
- Cualquier fallback silencioso vuelve a ocultar UNAVAILABLE.

## 7. DASHBOARD_BEHAVIOR_CHANGED

**NO.** Auditoría de lectura. Dashboard, fórmulas, selector, persistencia PROM y Excel no se tocaron.

## Residuales

- Sin SELECT de producción no se confirma si el miss es «cero filas Acapulco/agosto» o mismatch `E3`/`Acapulco`.
- No se verificó el `plant_code` real de `assembled` en logs de prod.
- Un DONE no autoriza implementar el fallback.
