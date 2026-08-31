# SPRINT1-DIRECTOR-IA-PROM-STATE-PARITY-AUDIT-001

task_id: SPRINT1-DIRECTOR-IA-PROM-STATE-PARITY-AUDIT-001
outcome: DONE_PENDING_REVIEW
DASHBOARD_BEHAVIOR_CHANGED: NO
tipo: AUDITORÍA READ-ONLY

## Respuestas 1–20

1. La selección PROM se guarda en `arr.pronostico_dias_seleccion`. El PROY derivado se guarda además en `arr.pronostico_mini_snapshot`.
2. Días: `plant_code, year, month, corte_day, fecha, selected, updated_at`. Snapshot: `year, month, corte_day, plant_code, proy_venta_ton, proy_desc_kg, updated_at`.
3. Sí: por `plant_code`.
4. Sí: por `year` + `month`.
5. Sí: por `corte_day` (derivado de `upload_day` / Fecha de carga). Otro corte = otro estado (o default).
6. No hay version_number. Último `updated_at` / UPSERT. PK = la clave de arriba.
7. Sí. «Guardar y actualizar mini-resumen» → `POST /api/dashboard/pronostico-dias` hace UPSERT de cada día.
8. Sí. En la misma transacción recalcula `computePronosticoProyByPlant` y persiste `pronostico_mini_snapshot` (todas las plantas de ese corte).
9. IGF Forecast GET (`include_mini`) → `computeIgfForecastMiniPayload` → `loadProyVentaDescByPlantForIgf` → snapshot overlay + compute que lee `pronostico_dias_seleccion`. La UI pinta `mini.rows[].ventaTon`.
10. `computeIgfForecastMiniPayload` **no** recibe el setup PROM por parámetros. Solo `uploadDay`. Recupera persistido vía `loadProyVentaDescByPlantForIgf`.
11. Sí: compute interno lee `pronostico_dias_seleccion` por `(year, month, corte_day)`. Si hay snapshot de ese corte, **la venta del snapshot pisa** el compute.
12. Sí. Sin fila para un día: se incluye si está en la ventana lookback estricta (`inStrict`). Equivale a «todos los días del lookback de 28 d».
13. Cuando no hay fila en `pronostico_dias_seleccion` para `(planta, year, month, corte_day, fecha)`. También si `corte_day` no coincide con el corte guardado (otro `upload_day` → mapa vacío → default).
14. Sí. Si Director IA resuelve otro `corte_day` (cutoff nulo → fin de mes; last-upload de otra planta; sin `upload_day` 27/08), lee otro mapa o el default, no el PROM guardado a 27/08.
15. El mini de Director IA se **recalcula al vuelo** (`computeIgfForecastMiniPayload`). No lee un `mini.rows[]` guardado. La venta puede salir del **snapshot persistido** (overlay).
16. Sí, en dos sentidos: (a) snapshot de un `corte_day` distinto al de la tabla; (b) overlay: si existe snapshot, manda sobre el compute vivo. Excel ARR también reescribe snapshot. El modal sin Guardar no persiste; la tabla IGF no ve toggles locales.
17. Identificador de paridad: `(plant_code, year, month, corte_day)` en `pronostico_dias_seleccion` **y** la fila de `pronostico_mini_snapshot` con la misma clave, más el mismo `upload_day` que produce ese `corte_day`.
18. 1432 es compatible con un PROM **distinto o default** (u otro `corte_day`), no con el setup manual que produjo 1503.29 / 1491.50 a 27/08. No se afirma el valor exacto sin leer BD.
19. Paridad mínima: misma planta + mismo YYYY-MM + mismo `upload_day`→`corte_day` + mismo estado PROM persistido (días + snapshot) para esa clave.
20. Sí: Director IA ya llama la misma `loadProyVentaDescByPlantForIgf`. No hace falta cambiar Dashboard si el cutoff efectivo es el de la tabla. Sin ese cutoff, no hay paridad PROM.

## A. Dónde vive el estado PROM

Dos artefactos, no uno:

| Artefacto | Tabla | Qué guarda |
|---|---|---|
| Selección de días | `arr.pronostico_dias_seleccion` | `selected` por día del lookback |
| PROY derivado | `arr.pronostico_mini_snapshot` | `proy_venta_ton` / `proy_desc_kg` |

PK días: `(plant_code, year, month, corte_day, fecha)`.
PK snapshot: `(year, month, corte_day, plant_code)`.

`corte_day` = `getPronosticoCorteYmdStr(year, month, upload_day)`. Si `upload_day` vacío o fuera del mes → **último día del mes**.

No hay JSON de setup en el request de chat ni en CEL.

## B. Cómo se persiste

```
UI toggle (solo React) → no escribe BD
→ «Guardar y actualizar mini-resumen»
→ postPronosticoDias
→ POST /api/dashboard/pronostico-dias
   body: year, month, plant_code, upload_day?, days[{fecha, selected}]
→ BEGIN
   UPSERT pronostico_dias_seleccion (corte_day resuelto)
   computePronosticoProyByPlant(fechaCorte=upload_day)
   savePronosticoMiniSnapshot (todas las plantas, ese corte_day)
→ COMMIT
→ GET igf-forecast?include_mini=1 (refresco UI)
```

Otra escritura de snapshot: descarga Excel ARR (`savePronosticoMiniSnapshot` con el corte del Excel).

## C. Cómo se recupera

`loadPronosticoDiasSeleccionMap(year, month, corte_day)`:

```sql
SELECT plant_code, fecha, selected
  FROM arr.pronostico_dias_seleccion
 WHERE year=$1 AND month=$2 AND corte_day=$3
```

Por planta: `selAll.get(plant_code)`. Día sin fila → `inStrict` (incluido si está en lookback 28 d).

Snapshot:

```sql
SELECT ... FROM arr.pronostico_mini_snapshot
 WHERE year=$1 AND month=$2 AND corte_day=$3
```

El modal GET `/pronostico-detalle` usa la misma selección para `days[].selected`.

## D. Cómo lo consume IGF Forecast

```
GET /igf-forecast?upload_day=2026-08-27&include_mini=1
→ computeIgfForecastMiniPayload(..., uploadDay)
→ loadProyVentaDescByPlantForIgf(year, month, uploadDay)
   1. corteYmd = getPronosticoCorteYmdStr(...)
   2. snap = loadPronosticoMiniSnapshot(..., corteYmd)
   3. computed = computePronosticoProyByPlant(..., fechaCorte)  // lee días
   4. si snap tiene venta: pisa computed
→ ventaTon = bRes de ese mapa
→ setIgfMini(data.mini) → tabla
```

Tras Guardar, el cliente vuelve a pedir el GET. La tabla muestra el PROY del setup **ya persistido**.

Toggles sin Guardar solo cambian el modal (`recomputeVentaSheetFromDays`). No la tabla IGF ni Director IA.

## E. Cómo lo consume Director IA

```
effective_cutoff_date
→ loadIgfForecastMiniPayload
→ computeIgfForecastMiniPayload(..., uploadDay=effective_cutoff)
→ loadProyVentaDescByPlantForIgf  (LA MISMA)
→ mini.rows[]
→ readIgfForecastMiniAuthoritative
→ CEL → prompt
```

No recibe `days[]`. No tiene ID de setup PROM. Solo el cutoff.

Si `effective_cutoff_date` es el `upload_day` de la tabla, recupera el mismo `(corte_day)` y por tanto los mismos días + el mismo snapshot.

Si el cutoff falta o es otro, `corte_day` cambia: otro mapa, o default, u otro snapshot.

## F. Punto exacto de divergencia

**No** está dentro de una fórmula distinta. IGF Forecast y Director IA comparten `loadProyVentaDescByPlantForIgf`.

La divergencia es **antes**: el `upload_day` que define `corte_day`.

```
IGF tabla:     upload_day del selector (p. ej. 2026-08-27)
               → corte_day 2026-08-27
               → días + snapshot de ESA clave

Director IA:   body.upload_day | last-upload planta | null
               → si no es 2026-08-27, otra clave PROM
               → si null: getPronosticoCorteYmdStr("") = fin de mes
```

Secundario: overlay de snapshot. Quien pida el corte con snapshot usa esa venta; quien pida un corte sin snapshot usa compute + default de días.

`computeIgfForecastMiniPayload` no se bifurca por consumidor.

## G. Explicación probable de 1432

Cifra observada en producción, no constante de negocio.

Con el mismo 27/08, 1503.29 / 1491.50 salen de **cambiar días PROM y guardar**. Eso prueba que el forecast no es solo cutoff.

1432 no coincide con esos setups ni con 1489 (corte 31/08 observado). Es coherente con:

- PROM default (lookback completo) en un `corte_day` que **no** tiene (o no usa) la selección guardada a 27/08; o
- snapshot / compute de **otro** `corte_day`; o
- request de chat cuyo cutoff efectivo no era 27/08 ( Acciones sin `upload_day`, last-upload global, fin de mes).

Sin SELECT a `pronostico_dias_seleccion` / `pronostico_mini_snapshot` no se puede atar 1432 a una fila concreta. **No se ejecutó SQL.**

## H. Condición mínima de paridad

Misma planta + mismo mes + mismo `upload_day` **y** el mismo `corte_day` resultante **y** las mismas filas persistidas:

`arr.pronostico_dias_seleccion` + `arr.pronostico_mini_snapshot`

para `(plant_code, year, month, corte_day)`.

Cutoff solo **no** basta.

## I. ¿Hace falta modificar código (Director IA)?

Solo si el cutoff efectivo de producción no es el de la tabla, o si se quiere un identificador PROM explícito en el chat. La función de cálculo ya es compartida.

Esta auditoría no implementa nada.

## J. ¿Hace falta modificar Dashboard?

No para paridad de lectura. El persistido ya es la fuente. Cambiar Dashboard no está autorizado y no es requisito si Director IA llega con el mismo `upload_day`.

## K. Riesgos stale / default

- **Default:** sin filas de días para ese `corte_day` → todos los días del lookback. Fácil si el chat usa otro corte.
- **Clave por corte:** PROM de 27/08 no aplica a 31/08.
- **Overlay:** snapshot gana sobre compute. IGF y Director IA, con el mismo corte, ven el mismo overlay (incluido un snapshot viejo).
- **Excel:** reescribe snapshot de ese corte.
- **Sin Guardar:** estado PROM del modal no existe para nadie más.
- **Sin versionado:** no hay id de setup que el chat pueda pedir.

## L. Siguiente acción (no implementada)

Verificar en runtime (humano / logs, sin cambiar Dashboard) que el `effective_cutoff_date` del chat es el `upload_day` de IGF Forecast. Si coincide y el forecast sigue distinto, leer (solo SELECT humano) `pronostico_dias_seleccion` y `pronostico_mini_snapshot` para esa clave. Si no coincide, el hueco es transporte de corte, no otra fórmula.

No se propone implementación aquí.

## Traza física (resumen)

```
Pronóstico UI
  → POST /pronostico-dias
  → arr.pronostico_dias_seleccion + arr.pronostico_mini_snapshot
  → GET /igf-forecast include_mini
  → loadProyVentaDescByPlantForIgf
  → computeIgfForecastMiniPayload
  → mini.rows[]
  → tabla IGF

Director IA
  → effective_cutoff_date
  → computeIgfForecastMiniPayload   (misma)
  → loadProyVentaDescByPlantForIgf  (misma)
  → PROM de ESE corte_day (persistido o default)
  → mini → CEL → prompt
```

## Contratos

Consultados: Constitución, contratos vía índice, LOOP_PROTOCOL, CURRENT_TASK.
Modificados: ninguno.

## Código

Ninguno (salvo `CURRENT_TASK` status y este reporte).
Dashboard no tocado. Sin tests nuevos. Sin git. Sin SQL de escritura.

## Desvíos

Rama `main`. Un DONE no autoriza la siguiente.

## secrets_check

OK.

## human_decision_needed

Revisión G1→CLOSED o REJECTED.
