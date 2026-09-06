# AUDIT-DIRECTOR-IA-RENTABILIDAD-LIVE-UPLOAD-DAY-RUNTIME-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-RENTABILIDAD-LIVE-UPLOAD-DAY-RUNTIME-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
live_db_authorized: true
live_db_select: "HUMAN_EXECUTED_LIVE_DB_EVIDENCE"
cursor_selects_executed: 0
human_selects_executed: 3
writes_executed: 0
ddl_executed: 0
product_changed: false
tests_changed: false
deploy_stale: "REJECTED"
b_upload_day_reopened: false
live_rentability_cut_first_bad_boundary: "UPLOAD_DAY_QUERY_RESULT"
resolved_upload_day: null
arr_upload_log_rows: 0
human_database_name: "folios_u2o9"
false_green_frontier: "R-RENT-CUT inyecta upload_log/cut válido; LIVE arr.upload_log = 0 filas → resolver null"
probe_a: "HUMAN_EXECUTED — 0 filas"
probe_b: "HUMAN_EXECUTED — resolved_upload_day = null"
probe_c: "NOT_EXECUTED — innecesario; null ya es el input LIVE"
probe_d: "N/A — no hay YMD resuelto"
probe_e: "N/A_NO_DEMONSTRABLE_DASHBOARD_CUT"
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
  - "Antes de un FIX: decidir fuente canónica de cut cuando arr.upload_log está vacío e igualarla al cut efectivo de IGF Forecast ARR. No diseñado aquí."
```

## 1. Executive summary

El FIX B_UPLOAD_DAY está en el código desplegado (`15d0787`). Producción **no** bypasea `loadKpiForMonth` con `loadRentabilidadKpis`. El wiring productivo **sí** llama `resolveOpenMonthUploadDay` → `resolveUploadDayLikeClientesPorMes` → `loadIgfForecastMiniPayload` → `computeIgfForecastMiniPayload`.

Ese SQL es **idéntico** a `GET /api/arr/last-upload-day`. Si el resolver devolviera un `YYYY-MM-DD` de septiembre, el mini **debería** habilitar lookback y no colapsar a MTD.

LIVE sigue pintando exactamente el MTD pre-FIX:

| | util_oper | resultado_final |
|---|---:|---:|
| Director IA LIVE | −$7,003,653 | −$9,565,353 |
| Dashboard ARR | (esperada $2,480,965) | −$80,735 |
| venta Dashboard | 1,474 ton | |

Eso solo ocurre si el mini de Director IA corre con `fechaCorte` vacío o **fuera** de septiembre. El valor que producción resuelve **no se puede saber sin DB**.

`LIVE_RENTABILITY_CUT_FIRST_BAD_BOUNDARY = UPLOAD_DAY_QUERY_RESULT`

Evidencia humana (pgAdmin, `folios_u2o9`): `arr.upload_log` = **0 filas** → resolver = **null** → snapshot sin cut de septiembre → MTD.

Cursor no ejecutó esas consultas.

## 2. configureDirectorIaChat — inventario

`configureDirectorIaChat` hace merge: `chatDeps = { ...chatDeps, ...injected }`.

### Producción (Render)

| FILE | CALL SITE | DEPS | ORDER | CAN OVERRIDE? |
|---|---|---|---|---|
| `server.js` | 9914 (arranque único) | `pool`, `persistentMemoryStore`, `loadArrLastUploadDay` (plant-aware), `loadIgfForecastMiniPayload` | 1 / único en runtime | No hay segunda llamada de producto |

**No inyecta:** `loadRentabilidadKpis`, `resolveUploadDay`, `now`, `upload_day`, `client`.

### Tests (no corren en Render)

Decenas de `test/director-ia-*.js` + `test/helpers/director-ia-runtime-golden-harness.js`. Pueden inyectar `loadRentabilidadKpis` (R-RENT-SNAPSHOT) o `loadIgfForecastMiniPayload` stub (R-RENT-CUT). **No aplican a LIVE.**

## 3. Bypass `loadRentabilidadKpis`

```149:151:lib/director-ia-rentabilidad-deterioro-snapshot.js
  if (typeof deps.loadRentabilidadKpis === "function") {
    return deps.loadRentabilidadKpis(deps.client || null, plantLabel, year, month);
  }
```

`askDirectorIa` pasa `loadRentabilidadKpis: chatDeps.loadRentabilidadKpis`.

En producción esa clave **no existe** → `undefined` → `typeof !== "function"` → **no hay bypass**.

H4 = **REJECTED** para runtime LIVE.

## 4. Deps reales: askDirectorIa → assemble → loadKpiForMonth

| dep | askDirectorIa pasa | valor productivo | tipo |
|---|---|---|---|
| `question` | sí | pregunta | string |
| `now` | `chatDeps.now` | **undefined** → assemble usa `new Date()` | undefined |
| `pool` | `chatDeps.pool` | Pool de `server.js` | injected |
| `client` | no | undefined | undefined |
| `upload_day` | **no** (ignora `req.body.upload_day`) | undefined | undefined |
| `loadRentabilidadKpis` | `chatDeps.loadRentabilidadKpis` | undefined | undefined |
| `loadIgfForecastMiniPayload` | `chatDeps.loadIgfForecastMiniPayload` | función server.js | function / injected |
| `resolveUploadDay` | no | undefined | undefined |
| `loadArrLastUploadDay` | no (existe en chatDeps pero **no se pasa ni se lee** en el snapshot) | n/a | injected-but-unused |
| `loadDeltaTopN` | sí | wrapper Delta Ingreso | function |

El panel `DirectorIaChatPanel` **sí** manda `upload_day` (prop o URL) en el POST. El snapshot **no lo consume**.

## 5. Rama de `resolveOpenMonthUploadDay`

```136:147:lib/director-ia-rentabilidad-deterioro-snapshot.js
  if (typeof deps.resolveUploadDay === "function") { ... }
  return resolveUploadDayLikeClientesPorMes(deps.client || deps.pool, year, month, {
    upload_day: deps.upload_day || null,
  });
```

Producción: **no** hay `resolveUploadDay`. Usa `resolveUploadDayLikeClientesPorMes(pool, year, month, { upload_day: null })`.

Mes cerrado (agosto, `now` = calendario servidor): `uploadDay` forzado `null`. Correcto.

Mes abierto (septiembre 2026): resuelve last-upload del mes.

`pg.Pool` tiene `.query`. El early-return `!client.query` **no** aplica.

## 6. SQL: resolver vs GET last-upload-day

| | `resolveUploadDayLikeClientesPorMes` | `GET /api/arr/last-upload-day` |
|---|---|---|
| SQL | `SELECT plant_code, uploaded_day, uploaded_at, uploaded_by FROM arr.upload_log WHERE year=$1 AND month=$2 ORDER BY uploaded_at DESC LIMIT 1` | **idéntico** |
| year/month | args | querystring |
| plant filter | **ninguno** | **ninguno** |
| `uploaded_day` | string o `toISOString().slice(0,10)` | **igual** |
| `uploaded_day` parse | `parseUploadDayYmd` | recorte 10 chars |
| `uploaded_at` | solo orden | se devuelve, no filtra |

`loadArrLastUploadDay` inyectado es **otra** semántica (plant-aware). El snapshot **no la usa**.

Si `arr.upload_log` septiembre tiene fila con `uploaded_day` válido de septiembre, Director IA y Dashboard ARR (sin URL) deben obtener **la misma fecha**.

## 7. Dashboard ARR — cut explícito

Cadena:

```
ArrClient.resolveUploadDayForMonth
  1) searchParams.upload_day si year/month coinciden
  2) cache lastUploadByYmRef
  3) fetchArrLastUploadDay → GET /api/arr/last-upload-day
ArrClient.ensureMonthLoaded
  GET /api/dashboard/igf-forecast?include_mini=1&upload_day=…
```

**Sí puede** enviar un cut distinto del latest mensual:

- `?upload_day=YYYY-MM-DD` en `/arr`
- si last-upload falla, omite `upload_day` → mini MTD (no es el caso si ven 1,474)

`ArrClient` **no** manda `version_as_of_corte`. Eso es de `IgfForecastClient` (localStorage), no del KPI ARR.

`proyeccion_hasta` aparece en otros fetches, no en `ensureMonthLoaded`.

El −$80,735 **puede** depender de un cut de URL distinto al latest log. **No se puede afirmar** que el usuario LIVE lo usó.

## 8. Propagación Director IA

| hop | qué pasa | marca |
|---|---|---|
| `resolveOpenMonthUploadDay` → YMD o null | valor **desconocido** en LIVE | UNKNOWN_RUNTIME_VALUE |
| `loadKpiForMonth` → `opts.upload_day` | pasa el valor resuelto (o null si cerrado) | PRESERVED (si hay valor) |
| `loadIgfForecastMiniPayloadForDirectorIa` `uploadDay = opts.upload_day \|\| null` | string truthy se conserva; null se queda | PRESERVED |
| `buildOpts.upload_day` | solo si truthy | PRESERVED |
| `buildIgfForecastPayload(..., buildOpts)` | usa `opts.upload_day` para `isMesHistorico` y versión | PRESERVED; **no** setea `version_as_of_corte` |
| `computeIgfForecastMiniPayload(..., uploadDay)` | `fechaCorteStr = (uploadDay\|\|"").slice(0,10)` | PRESERVED |

No hay hop que **dropee** un YMD válido. Si LIVE es MTD, el valor que llegó al mini es `null` o un día **fuera** de septiembre.

## 9. `buildIgfForecastPayload`: Dashboard vs Director IA

| option | Dashboard ARR (`ArrClient`) | Director IA loader |
|---|---|---|
| `upload_day` | si `resolveUploadDayForMonth` devolvió fecha | si el resolver del snapshot devolvió fecha |
| `version_as_of_corte` | **no** (ArrClient) | **no** |

No falta un tercer parámetro en la ruta ARR vs snapshot para explicar MTD vs 1,474. `version_as_of_corte` cambiaría **versión IGF** (coeficientes), no el colapso lookback. Los importes LIVE son el MTD **exacto** previo; eso es `bRes` MTD, no otra versión.

## 10. Mini interno

```
uploadDay → fechaCorteStr → isMesHistorico → proyByPlant → bRes → scale
→ ingreso=(C+D−H)*bRes*1000
→ operativos
→ corporativos = f(bIgf)  (independiente de bRes)
→ utilOperImporte = ingreso − operativos
→ resultadoFinalImporte = util − corporativos
```

`isIgfMesCerradoPorCorte(2026, 9, "2026-09-DD")` = false (corte no posterior al 30). `bRes` = PROY.

`fechaCorte` en mes → `isCorteEnMes=true` → `enableLookback=true` → remaining days. **Una fecha válida de septiembre debe generar forecast**, no MTD.

`fechaCorte=""` o día de otro mes → `isCorteEnMes=false` → lookback off → MTD.

Overlay `arr.pronostico_mini_snapshot` se busca por `corte_day`. Sin cut, `getPronosticoCorteYmdStr` usa **último día del mes** (2026-09-30), no el last-upload. Un snapshot guardado en el corte real del Dashboard **no** se aplica si Director IA consulta 09-30 o `""`.

## 11. Por qué R-RENT-CUT es verde y LIVE no

No es solo “fixture diferente”. Frontera **específica** no representada:

1. **`arr.upload_log` real de septiembre 2026.** El harness inventa una fila `2026-09-12`. Producción puede no tener fila, tener `uploaded_day` null, o un día fuera de septiembre.
2. **El mini del pack es un stub** (`computeRentCutMiniPayload`): mapea null→MTD y YMD→forecast con fórmulas locales. **No** llama `computeIgfForecastMiniPayload`, **no** lee `pronostico_mini_snapshot`, **no** corre lookback real.
3. **Wiring de request `upload_day`.** El chat puede mandarlo; el snapshot lo ignora. R-RENT-CUT no cubre URL/body cut.
4. R-RENT-SNAPSHOT mockea `loadRentabilidadKpis` y no ve esta frontera (ya documentado; no es este fallo LIVE).

Si el log LIVE devolviera un YMD de septiembre y el mini real siguiera en MTD, sería otra frontera. Eso **tampoco** se puede saber sin el probe.

## 12. Hipótesis

| ID | Veredicto | Base |
|---|---|---|
| H1 resolver → null | NOT_PROVEN_WITHOUT_LIVE_DB | SQL puede devolver 0 filas o day inválido |
| H2 fecha válida ≠ Dashboard | NOT_PROVEN_WITHOUT_LIVE_DB | SQL es el mismo; URL Dashboard puede diferir |
| H3 Dashboard cut explícito/local | NOT_PROVEN (capacidad PROVEN) | URL `upload_day` existe; uso LIVE desconocido |
| H4 bypass `loadRentabilidadKpis` | **REJECTED** | no inyectado en `server.js` |
| H5 otra `configureDirectorIaChat` | **REJECTED** | una sola llamada de producto |
| H6 loader pierde upload_day | **REJECTED** si el valor es YMD truthy; PRESERVED | `(opts.upload_day)\|\|null` |
| H7 mini recibe YMD sep y produce MTD | NOT_PROVEN_WITHOUT_LIVE_DB | código: YMD en mes → lookback; hace falta el valor real |
| H8 fixture ≠ upload_log LIVE | **PROVEN** (false-green) | stub + log inventado |
| H9 corte/input, no fórmula | **PROVEN** | mismos −$7,003,653 / −$9,565,353 que MTD pre-FIX |
| H10 Delta Ingreso independiente | **PROVEN** | Top N sigue `computeDeltaIngresoClientesPorMes`; KPI del mini |

## 13. First bad boundary

No se elige una etiqueta física única. El código deja **dos** causas vivas que producen el mismo MTD LIVE:

- `UPLOAD_DAY_QUERY_RESULT` (null o día fuera de septiembre)
- `DASHBOARD_EXPLICIT_CUT` (ARR con URL ≠ last-upload)

H6 de pérdida en DI queda REJECTED. H4/H5 REJECTED.

`LIVE_RENTABILITY_CUT_FIRST_BAD_BOUNDARY = NOT_PROVEN_WITHOUT_LIVE_DB`

## 14. Probes LIVE_DB (preparados; NO ejecutados)

Helpers **prohibidos** (escriben):

- `buildIgfForecastPayload` / `resolveIgfGlobalVersion` → `ALTER TABLE igf.versions ADD COLUMN IF NOT EXISTS created_at`
- `loadIgfForecastMiniPayloadForDirectorIa` (llama lo anterior)
- `savePronosticoMiniSnapshot` → INSERT/UPDATE

Helpers **read-only** permitidos:

- `resolveUploadDayLikeClientesPorMes` (solo SELECT `arr.upload_log`)
- `computeIgfForecastMiniPayload` **si** el `igf` se arma con SELECT de `igf.versions` + `igf.compromiso_lines` (sin `resolveIgfGlobalVersion`)
- `loadProyVentaDescByPlantForIgf` / `loadPronosticoMiniSnapshot` / `computePronosticoProyByPlant` (SELECT)

Una sola ejecución, `BEGIN` + `ROLLBACK` o sesión sin writes. Redactar `uploaded_by` si es PII.

### A — upload_log septiembre 2026

```sql
SELECT plant_code, uploaded_day, uploaded_at
  FROM arr.upload_log
 WHERE year = 2026 AND month = 9
 ORDER BY uploaded_at DESC
 LIMIT 20;
```

### B — resolución de corte (misma función que el snapshot)

```js
const { resolveUploadDayLikeClientesPorMes } = require("./lib/igf-effective-proy-target");
const resolved = await resolveUploadDayLikeClientesPorMes(client, 2026, 9);
```

### C / D / E — mini Acapulco

```sql
SELECT id, version_number
  FROM igf.versions
 WHERE plant_code = 'GLOBAL' AND year = 2026 AND month = 9
 ORDER BY version_number DESC
 LIMIT 1;
-- compromiso_lines de ese id → igf.rows / version_id
```

Luego **solo**:

```js
computeIgfForecastMiniPayload(client, igf, 2026, 9, null)           // C
computeIgfForecastMiniPayload(client, igf, 2026, 9, resolved)      // D
computeIgfForecastMiniPayload(client, igf, 2026, 9, dashCut)       // E si URL/cut ≠ resolved
```

Capturar Acapulco: `ventaTon`, `utilOperImporte`, `resultadoFinalImporte`.

Complemento overlay (SELECT, no write):

```sql
SELECT corte_day, plant_code, proy_venta_ton
  FROM arr.pronostico_mini_snapshot
 WHERE year = 2026 AND month = 9 AND plant_code IN ('Acapulco')
 ORDER BY corte_day;
```

Comparar C vs control LIVE (−$7,003,653 / −$9,565,353). Comparar D/E vs Dashboard (1,474 / −$80,735).

## 15. Gate LIVE_DB — intento de ejecución

G1 adicional vigente: `live_db_authorized: YES`, `implementation_authorized: NO`.

Inspección de conexión (sin leer secretos):

| Comprobación | Resultado |
|---|---|
| `process` / shell `DATABASE_URL` | unset |
| User env `DATABASE_URL` | unset |
| Machine env `DATABASE_URL` | unset |
| `.env` en el repo | ausente |
| `.env` en Desktop / perfil | ausente |
| `psql` | absent |
| `gh` | absent |
| Render CLI | absent |

`HAS_DB_ENV = false`.
`LIVE_DB_SELECT = NOT_EXECUTED`.
`writes_executed = 0`.
`ddl_executed = 0`.

No se llamó `buildIgfForecastPayload` (ALTER). No se llamó el loader de Director IA. No se inventó `resolved_upload_day`.

### Probe A — arr.upload_log

`NOT_EXECUTED_NO_DATABASE_URL`

`latest_row = UNKNOWN`

### Probe B — resolveUploadDayLikeClientesPorMes(2026, 9)

`NOT_EXECUTED_NO_DATABASE_URL`

`resolved_upload_day = UNKNOWN` (no inventado)

### Probe C — mini upload_day=null

`NOT_EXECUTED_NO_DATABASE_URL`

Aunque hubiera URL, el loader productivo pasa por `buildIgfForecastPayload` → ALTER. La vía segura es SELECT de `igf.versions`/`compromiso_lines` + `computeIgfForecastMiniPayload` aislado. No se ejecutó.

### Probe D — mini resolved

`NOT_EXECUTED_NO_DATABASE_URL` (depende de B)

### Probe E — Dashboard candidate cut

`N/A`

La auditoría de código demostró que `/arr?upload_day=` **puede** existir. No hay un YMD explícito demostrado en la sesión LIVE del usuario. No se inventó fecha.

## 16. Matriz final

| PATH | UPLOAD_DAY | VENTA_TON | UTIL_OPER | RESULTADO_FINAL | MATCH DASHBOARD? |
|---|---|---|---|---|---|
| ARR latest log | UNKNOWN | n/a | n/a | n/a | UNKNOWN |
| Resolver Director IA | UNKNOWN | n/a | n/a | n/a | UNKNOWN |
| Mini null | null | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | UNKNOWN |
| Mini resolved | UNKNOWN | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | UNKNOWN |
| Dashboard candidate cut | N/A | N/A | N/A | N/A | N/A |
| Snapshot LIVE observado | UNKNOWN_RUNTIME | (no capturado) | −7,003,653 | −9,565,353 | NO (control humano) |
| Dashboard ARR observado | UNKNOWN_RUNTIME | 1,474 | (esperada 2,480,965) | −80,735 | control humano |

## 17. Hipótesis tras el gate LIVE_DB

El gate autorizó SELECT. **No hubo canal**. No se cierra H1/H2/H3/H7 con filas inventadas.

| ID | Tras gate | Motivo |
|---|---|---|
| H1 | NOT_PROVEN_WITHOUT_LIVE_DB | Probe B no ejecutado |
| H2 | NOT_PROVEN_WITHOUT_LIVE_DB | Probe B/D no ejecutado |
| H3 | NOT_PROVEN (capacidad PROVEN; uso LIVE no demostrado) | E = N/A sin YMD candidato |
| H7 | NOT_PROVEN_WITHOUT_LIVE_DB | Probe D no ejecutado |
| H8 | PROVEN | sin cambio (fixture ≠ runtime) |
| H9 | PROVEN | sin cambio (MTD exacto = corte/input) |
| H4/H5/H6 | REJECTED | código; sin cambio |

Sección 17 quedó superada por evidencia humana (sección 19).

## 18. Intento Cursor (histórico)

**BLOCKED** en su momento: Cursor no tenía `DATABASE_URL`. Cero SELECT del implementador.

## 19. HUMAN-EXECUTED LIVE_DB EVIDENCE

`HUMAN_EXECUTED_LIVE_DB_EVIDENCE`

Cursor **no** ejecutó estas consultas. Human Approver las corrió en pgAdmin, solo SELECT, sin INSERT/UPDATE/DELETE/ALTER/CREATE/DROP/TRUNCATE.

Base:

`current_database() = folios_u2o9`

### Query 1 — censo

```sql
SELECT
    current_database() AS database_name,
    COUNT(*) AS total_upload_log_rows,
    MIN(uploaded_at) AS first_uploaded_at,
    MAX(uploaded_at) AS last_uploaded_at
FROM arr.upload_log;
```

| database_name | total_upload_log_rows | first_uploaded_at | last_uploaded_at |
|---|---:|---|---|
| folios_u2o9 | 0 | NULL | NULL |

### Query 2 — últimas 30

```sql
SELECT year, month, plant_code, uploaded_day, uploaded_at
FROM arr.upload_log
ORDER BY uploaded_at DESC
LIMIT 30;
```

0 filas.

### Query 3 — septiembre 2026 (misma semántica que el resolver)

```sql
-- WHERE year = 2026 AND month = 9
```

0 filas.

### Validación contra código

`resolveUploadDayLikeClientesPorMes(client, 2026, 9)` (sin `opts.upload_day`):

```sql
SELECT plant_code, uploaded_day, uploaded_at, uploaded_by
  FROM arr.upload_log
 WHERE year = $1::int AND month = $2::int
 ORDER BY uploaded_at DESC
 LIMIT 1
```

0 filas → `row = null` → `parseUploadDayYmd` no corre → **`resolved_upload_day = null`**.

Ese null entra a `loadKpiForMonth` (septiembre abierto) → `loadIgfForecastMiniPayload({ upload_day: null })` → `fechaCorte=""` → `isCorteEnMes=false` → MTD. Coincide con el snapshot LIVE (−$7,003,653 / −$9,565,353).

## 20. Matriz final (tras evidencia humana)

| PATH | UPLOAD_DAY | VENTA_TON | UTIL_OPER | RESULTADO_FINAL | MATCH DASHBOARD? |
|---|---|---|---|---|---|
| ARR latest log | **null** (0 filas) | n/a | n/a | n/a | NO |
| Resolver Director IA | **null** | n/a | n/a | n/a | NO |
| Mini null | null | no reejecutado | control LIVE −7,003,653 | control LIVE −9,565,353 | NO |
| Mini resolved | N/A (no hay YMD) | N/A | N/A | N/A | N/A |
| Dashboard candidate cut | N/A (YMD no demostrado) | 1,474 (UI) | (esperada 2,480,965) | −80,735 (UI) | control humano |
| Snapshot LIVE observado | null efectivo | (MTD) | −7,003,653 | −9,565,353 | NO |

## 21. Hipótesis cerradas

| ID | Veredicto | Base |
|---|---|---|
| H1 | **PROVEN** | `arr.upload_log` vacío → resolver null |
| H2 | **REJECTED** como causa actual | no hay fecha distinta; el resolver no devuelve YMD |
| H3 | **NOT_PROVEN** | Dashboard puede usar cut explícito; YMD visible no demostrado |
| H4 | **REJECTED** | `loadRentabilidadKpis` no inyectado |
| H5 | **REJECTED** | una sola `configureDirectorIaChat` de producto |
| H6 | **REJECTED** | no hay YMD que perder; el input ya es null |
| H7 | **REJECTED** como primera frontera | no hay evidencia de YMD válido → mini MTD |
| H8 | **PROVEN** | R-RENT-CUT inyecta log/cut válido; LIVE tiene 0 filas + stub mini |
| H9 | **PROVEN** | divergencia en resolución de cut, antes de la fórmula |
| H10 | **PROVEN / INDEPENDENT** | Delta Ingreso no participa en este KPI |

## 22. First bad boundary

```
LIVE_RENTABILITY_CUT_FIRST_BAD_BOUNDARY = UPLOAD_DAY_QUERY_RESULT
```

`arr.upload_log` LIVE = 0 filas → resolver = null → snapshot sin cut de septiembre.

No se usa `DASHBOARD_EXPLICIT_CUT`: el YMD del Dashboard no está demostrado.

## 23. False green

R-RENT-CUT demostró: fixture con fila de `upload_log` → YMD → propagación al loader.

No demostró la condición LIVE: **`arr.upload_log` vacío**. Por eso el pack pudo quedar verde mientras producción resolvía null.

## 24. Nota para trabajo posterior (no es tarea)

Director IA deriva el cut de mes abierto solo de `arr.upload_log`. En LIVE esa tabla está vacía.

Antes de implementar: hay que decidir la fuente canónica de cut cuando `arr.upload_log` no tiene datos, e igualarla al cut efectivo de IGF Forecast ARR.

**No se diseña esa solución aquí. No se abre FIX.**

## 25. STOP

**DONE_PENDING_REVIEW**

No implementación. No tests. No SELECT de Cursor. No merge. No deploy. No next task.
