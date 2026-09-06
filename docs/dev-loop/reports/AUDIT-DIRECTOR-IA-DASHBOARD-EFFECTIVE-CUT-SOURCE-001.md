# AUDIT-DIRECTOR-IA-DASHBOARD-EFFECTIVE-CUT-SOURCE-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-DASHBOARD-EFFECTIVE-CUT-SOURCE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
live_db_authorized: false
browser_runtime: "HUMAN_EXECUTED_BROWSER_RUNTIME_EVIDENCE"
writes_executed: 0
ddl_executed: 0
product_changed: false
tests_changed: false
deploy_stale_reopened: false
b_upload_day_reopened: false
dashboard_effective_cut_source: "FRONTEND_EFFECTIVE_CUT_STATE"
dashboard_effective_cut_value: "2026-09-05"
last_upload_fallback_when_null: "omit_param / undefined / null"
excel_upload_or_proyeccion_hasta: "EXCEL_ONLY / REJECTED_FOR_NORMAL_VIEW"
arr_ui_version_as_of_corte: "NEVER_SENT / REJECTED_AS_CUT_EXPLANATION"
igf_ui_version_as_of_corte: "REJECTED_NOT_IN_LIVE_REQUEST"
first_source_divergence: "FRONTEND_EFFECTIVE_CUT_STATE_VS_ARR_UPLOAD_LOG"
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none — no Authorization, Bearer, cookies, or other sensitive headers recorded"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-LIVE-UPLOAD-DAY-RUNTIME-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task. No FIX."
  - "Recomendación posterior (no es tarea abierta): el FIX deberá eliminar la divergencia de fuente de cut entre el snapshot de rentabilidad de Director IA y el effective cut de IGF Forecast ARR. No diseñado aquí."
```

## 0. G1 y alcance

Rama: `audit/director-ia-dashboard-effective-cut-source-001` ≠ `main`.

`CURRENT_TASK.md` verificado antes de inspeccionar:

| Campo | Valor |
|---|---|
| status al arranque de esta ejecución | `IN_PROGRESS` (G1 ya aplicado; solo se había cambiado `AUTHORIZED` → `IN_PROGRESS`) |
| authorized_by | `"Human Approver"` |
| authorized_at | `"2026-09-05T21:07:24-06:00"` |
| human_authorization | presente, READ_ONLY AUDIT ONLY |
| implementation_authorized | NO |
| live_db_authorized | NO |
| merge_authorized | NO |
| deploy_authorized | NO |

No se tocaron campos humanos. Esta auditoría es read-only. No implementación. No tests. No LIVE_DB. No pgAdmin. No FIX.

Hechos ya demostrados (auditoría previa; no reabiertos):

- LIVE `arr.upload_log` = 0 filas → `resolveUploadDayLikeClientesPorMes(2026, 9) = null`.
- Director IA: `upload_day=null` → septiembre MTD (`resultado_final = -9,565,353`, `util_oper = -7,003,653`).
- `LIVE_RENTABILITY_CUT_FIRST_BAD_BOUNDARY = UPLOAD_DAY_QUERY_RESULT`.
- `DEPLOY_STALE` y `B_UPLOAD_DAY` no se reabren.

Valores observados IGF Forecast ARR: venta ≈ 1,474 ton, `resultado_final` ≈ −80,735.

## 1. Frontend entry points

Hay **dos** montajes que piden IGF Forecast / mini. El código no unifica el cut entre ambos.

### 1A. IGF Forecast (página con selector de corte)

| FILE | COMPONENT | INITIAL STATE | CUT-RELATED STATE |
|---|---|---|---|
| `frontend-dashboard/app/igf-forecast/page.tsx` | `IgfForecastPage` → `IgfForecastContent` | sin estado propio | ninguno |
| `frontend-dashboard/components/IgfForecastClient.tsx` | `IgfForecastContent` | `uploadDay` = `localStorage.getItem("Diana")` si coincide `YYYY-MM-DD`; si no `""`. `versionAsOfCorte` = `localStorage.getItem("igf-forecast-version-as-of-corte") === "1"` | `uploadDay`, `uploadDayHint`, `prevUploadDayRef`, `versionAsOfCorte` |

Búsquedas físicas en esta página:

| Nombre | ¿Existe? | Rol |
|---|---|---|
| `upload_day` | sí | query de request + link a `/arr` |
| `proyeccion_hasta` | no en la vista; solo Excel URL | ver §5 |
| `resolveUploadDayForMonth` | no | solo ArrClient |
| `selectedDate` / `cutDate` / `fechaCorte` / `forecastDate` | no como state | `fechaCorte` es server-side |
| `URLSearchParams` / `location.search` | sí, solo token (`parseTokenFromQuery`) | **no lee** `upload_day` de la URL |
| `localStorage` | sí | clave `"Diana"` = corte; `"igf-forecast-version-as-of-corte"` = checkbox |
| `sessionStorage` | no para corte | `sessionStorage` del token en `lib/auth.ts` |

Selector UI: `<input type="date" value={uploadDay} onChange={setUploadDay}>`.

### 1B. ARR (tabla que consume el mismo GET igf-forecast + mini)

| FILE | COMPONENT | INITIAL STATE | CUT-RELATED STATE |
|---|---|---|---|
| `frontend-dashboard/app/arr/page.tsx` | `ArrPage` → `ArrClient` | sin estado propio | ninguno |
| `frontend-dashboard/app/arr/ArrClient.tsx` | `ArrClient` | `uploadDayFromUrl` = `searchParams.get("upload_day")`. `selA`/`selB` vacíos hasta `pickInitialSels` (último y penúltimo periodo IGF) | `uploadDayFromUrl` (derivado, no `useState`). Cache `lastUploadByYmRef`. **No** hay `useState` de corte. **No** hay date picker de corte. `localStorage` de ARR Plan **no** guarda cut |

`pickInitialSels` elige mes A/B. No inventa `upload_day`.

## 2. `resolveUploadDayForMonth(year, month)`

Archivo: `frontend-dashboard/app/arr/ArrClient.tsx` (~2216).

Orden físico:

1. Si `uploadDayFromUrl` es `YYYY-MM-DD` **y** su year/month coinciden con los argumentos → return ese YMD.
2. Si `lastUploadByYmRef[ym]` tiene YMD → return cache.
3. `GET /api/arr/last-upload-day?year=&month=`.
4. Si `upload_day` es YMD → cache y return.
5. Catch o respuesta vacía/null → **`return undefined`**.

Cuando `GET /api/arr/last-upload-day` responde `upload_day = null` (LIVE septiembre):

```
FALLBACK REAL = undefined
```

Clasificación del fallback:

| Candidato | ¿Es el fallback? |
|---|---|
| current date | no |
| last ARR data date | no |
| last day of month | no (el comentario «el backend usa fin de mes como corte» **no** se implementa aquí) |
| `proyeccion_hasta` | no |
| URL/query | solo si ya había `upload_day` en URL **del mismo** year/month; si no, no sustituye el null |
| selected state | no hay state de corte |
| **null** | **sí** (`undefined` → el caller omite el query param) |
| other | no |

`ensureMonthLoaded` (~2428):

```ts
...(uploadDay ? { upload_day: uploadDay } : {})
```

`upload_day=null` **no se manda**. Se omite.

## 3. Estado React / frontend — prioridad

### IGF Forecast (`IgfForecastContent`)

| SOURCE | CONDITION | VALUE | WRITES STATE? | PRIORITY |
|---|---|---|---|---|
| `localStorage["Diana"]` | init + `YYYY-MM-DD` | YMD persistido | sí (`useState` initializer) | 1 al montar |
| `<input type="date">` | `onChange` | YMD o `""` | sí `setUploadDay` | 1 si el usuario edita |
| `StorageEvent` otra pestaña | `key === "Diana"` | YMD o `""` | sí | empate con state vivo |
| persistencia `useEffect` | `uploadDay` YMD | escribe `"Diana"` | no (state → storage) | espejo |
| `fetchArrLastUploadDay(now.year, now.month)` | `uploadDay` vacío al `load()` | YMD de API o nada | sí, **solo si** API trae YMD | 2 |
| hint «se usa la fecha de hoy» | API null y state vacío | **solo texto** | **no** | no es cut |
| URL `upload_day` | — | — | no | **no leída** |
| `localStorage` version | checkbox | `"1"`/`"0"` | `versionAsOfCorte` | no es cut |

Si hay YMD en state, **gana el state** (Diana / picker / storage event). Last-upload **no** se consulta para el request.

Si state vacío y last-upload null: `params = { include_mini: true }` — sin `year`, sin `month`, sin `upload_day`.

### ArrClient

| SOURCE | CONDITION | VALUE | WRITES STATE? | PRIORITY |
|---|---|---|---|---|
| URL `upload_day` | YMD y same year/month | YMD | no (derivado) | 1 |
| `lastUploadByYmRef` | cache de esta sesión | YMD | no (ref) | 2 |
| last-upload API | cache miss | YMD o null | no (solo ref si YMD) | 3 |
| omit | API null y sin URL usable | `undefined` | no | 4 |
| `localStorage` ARR Plan | — | simulaciones, no cut | no cut | n/a |
| `version_as_of_corte` | — | nunca | no | n/a |

## 4. Requests al backend

Construcción en `frontend-dashboard/lib/api.ts`:

- `fetchIgfForecast`: añade `upload_day` **solo si** truthy. Añade `version_as_of_corte=1` **solo si** `params.version_as_of_corte` truthy. Nunca manda `proyeccion_hasta`.
- `fetchIgfForecastMini`: igual.

`upload_day=null` **se omite**. No se serializa `upload_day=` ni `upload_day=null`.

### `/api/dashboard/igf-forecast`

| UI | year | month | upload_day | proyeccion_hasta | version_as_of_corte |
|---|---|---|---|---|---|
| IGF con YMD en state | `resolveIgfYearMonthFromCorte(up)` | idem | YMD | omitido | `1` solo si checkbox true |
| IGF state vacío + last-upload YMD | year/month del YMD resuelto | idem | YMD (y luego `setUploadDay`) | omitido | condicional |
| IGF state vacío + last-upload **null** (LIVE) | **omitido** (server `new Date()`) | **omitido** | **omitido** | omitido | omitido |
| ArrClient con resolve YMD | del `selA`/`selB` | idem | YMD | omitido | **nunca** |
| ArrClient resolve `undefined` (LIVE sin URL) | del periodo | idem | **omitido** | omitido | **nunca** |

`include_mini=1` en ambos caminos principales.

### `/api/dashboard/igf-forecast-mini`

Solo IGF, y **solo si** el GET principal no trajo `data.mini`.

| Condición | year/month | upload_day | version_as_of_corte |
|---|---|---|---|
| `uploadDay` YMD | `igfForecast.year/month` | YMD | condicional checkbox |
| `uploadDay` vacío | `igfForecast.year/month` | **omitido** | omitido |

ArrClient no llama `fetchIgfForecastMini` aparte; usa `include_mini` del GET principal.

## 5. Excel — semántica distinta

`getDashboardExcelDownloadUrl` (`lib/api.ts` ~24): si hay YMD, manda **ambos** `proyeccion_hasta` y `upload_day` (mismo valor). Si no hay YMD, **omite ambos**.

Handler `GET /api/arr/dashboard-excel` (`server.js` ~15258):

```js
const uploadDay =
  ((req.query.upload_day || "").toString().trim().slice(0, 10)) ||
  proyeccionHasta ||
  null;
```

`upload_day || proyeccion_hasta` es **exclusivo del Excel**.

Los GET de vista `/api/dashboard/igf-forecast` y `-mini` **no** leen `proyeccion_hasta`. No compartir cut con Excel.

## 6. Server handlers

### `GET /api/arr/last-upload-day` (`server.js` ~14890)

- `year`/`month` obligatorios.
- SQL: `arr.upload_log WHERE year=$1 AND month=$2 ORDER BY uploaded_at DESC LIMIT 1`.
- 0 filas → `{ upload_day: null }`.
- No default a hoy. No default a fin de mes. No `version_as_of_corte`.

Idéntico al SQL de `resolveUploadDayLikeClientesPorMes` (Director IA). LIVE septiembre = null. Ya demostrado.

### `GET /api/dashboard/igf-forecast` (`server.js` ~12050)

| Campo | Origen | Default |
|---|---|---|
| year | query | `new Date().getFullYear()` |
| month | query | `new Date().getMonth() + 1` |
| uploadDay | query `upload_day` trim 10 | **null** si ausente/vacío |
| version_as_of_corte | query `1\|true\|yes` | false |
| mini | `include_mini` | `computeIgfForecastMiniPayload(..., uploadDay)` |

Sin `upload_day` no hay default YMD. `version_as_of_corte` sin `upload_day` → 400.

### `GET /api/dashboard/igf-forecast-mini` (`server.js` ~12105)

Misma lectura de `year`/`month`/`uploadDay`/`version_as_of_corte`. Mismos defaults. Mini con el mismo `uploadDay`.

## 7. `version_as_of_corte`

| Superficie | ¿Manda `version_as_of_corte=true`? |
|---|---|
| ArrClient (UI ARR normal) | **nunca** |
| IGF Forecast | **condicional**: checkbox + `localStorage["igf-forecast-version-as-of-corte"]==="1"` **y** hay YMD de corte. Sin YMD el checkbox está disabled |
| Excel | solo si IGF pasa el flag y hay YMD |

En la UI ARR normal: **REJECTED** como explicación del cut / de 1,474 vs MTD.

Aunque IGF lo mande, el flag elige versión IGF (`created_at` ≤ corte). **No** inventa `uploadDay`. No es la fuente del lookback de venta.

Request LIVE IGF Forecast (evidencia humana): `version_as_of_corte` **no aparece** en el query relevante → **REJECTED** como explicación.

## 8. Effective cut

```
DASHBOARD_EFFECTIVE_CUT_SOURCE = FRONTEND_EFFECTIVE_CUT_STATE
DASHBOARD_EFFECTIVE_CUT_VALUE = 2026-09-05
```

El valor efectivo que llega al backend está **PROVEN** por `HUMAN_EXECUTED_BROWSER_RUNTIME_EVIDENCE`.

La auditoría de código ya demostró que el frontend puede obtener o retener ese estado mediante la familia:

- control `input type=date`
- state del frontend (`uploadDay`)
- `localStorage["Diana"]`
- `?upload_day=` cuando aplica (ArrClient; esta captura es la página IGF Forecast)

**No** se afirma que `localStorage["Diana"]` fue el origen inicial de **esta** sesión. Eso no está demostrado.

Lo PROVEN en runtime:

```
control visible = 05/09/2026
→ request upload_day = 2026-09-05
→ backend IGF Forecast
```

Last-upload **no** es la fuente de este YMD (`arr.upload_log` LIVE = 0). El fallback de código cuando last-upload es null es omitir `upload_day`; esa ruta **no** es la que ocurrió en la captura.

`proyeccion_hasta` no aparece en el query relevante de la vista → **REJECTED** para la vista normal.

## 9. Cadena física LIVE (IGF Forecast)

```
FRONTEND_EFFECTIVE_CUT_STATE
  (control visible 05/09/2026; familia código: date input | state | localStorage["Diana"])
  → frontend state uploadDay = 2026-09-05     PROVEN (UI + request; origen inicial de sesión NOT_PROVEN)
  → GET /api/dashboard/igf-forecast
       ?year=2026&month=9&upload_day=2026-09-05&include_mini=1
                                             PROVEN (HUMAN_EXECUTED_BROWSER_RUNTIME_EVIDENCE)
  → server uploadDay = 2026-09-05            PROVEN
  → computeIgfForecastMiniPayload(2026-09-05) PROVEN (mismo helper; lookback de septiembre)
```

Cadena B (omitir `upload_day` → MTD) queda **REJECTED** para esta pantalla LIVE.

Cadena C (ArrClient) **no** es la pantalla capturada.

## 10. Comparación con Director IA

```
DASHBOARD:
  FRONTEND_EFFECTIVE_CUT_STATE
  → 2026-09-05
  → mini forecast

DIRECTOR IA:
  arr.upload_log
  → 0 rows
  → null
  → mini MTD
```

**Primera divergencia física de fuentes:** el Dashboard usa `FRONTEND_EFFECTIVE_CUT_STATE` (`2026-09-05`). Director IA usa solo `arr.upload_log` (0 filas → null). El helper mini es el mismo. La divergencia no está en la fórmula.

No se diseña FIX.

## 11. HUMAN_EXECUTED_BROWSER_RUNTIME_EVIDENCE

Ejecutor: Human Approver. Cursor no abrió el navegador. No LIVE_DB.

Pantalla: IGF Forecast.

Fecha visible en el control: `05/09/2026`.

Request LIVE (Chrome DevTools Network):

```
GET /api/dashboard/igf-forecast
year=2026
month=9
upload_day=2026-09-05
include_mini=1
HTTP 200
```

No registrados: Authorization, Bearer, cookies, otros headers sensibles.

No aparece en el query relevante:

- `version_as_of_corte` → **REJECTED** como explicación
- `proyeccion_hasta` → **REJECTED** para la vista normal

La captura demuestra que el Dashboard envía `upload_day=2026-09-05` al backend para septiembre 2026.

La auditoría **ya no** está bloqueada por browser evidence.

## 12. Prohibiciones cumplidas

No se modificó producto. No tests. No DB. No pgAdmin. No tablas. No `arr.upload_log`. No FIX. No Director IA. No merge. No deploy. No next task. No se ejecutó navegador desde Cursor.

Archivos tocados: este reporte y `status` en `CURRENT_TASK.md`.

## 13. Recomendación posterior (no es tarea)

El FIX deberá eliminar la divergencia de fuente de cut entre el snapshot de rentabilidad de Director IA y el effective cut utilizado por IGF Forecast ARR.

No se abre tarea. No se diseña la implementación.
