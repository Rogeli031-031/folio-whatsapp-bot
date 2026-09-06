# AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
live_db_authorized: false
selects_executed: 0
writes_executed: 0
ddl_executed: 0
product_changed: false
tests_changed: false
contracts_changed: false
rentability_b_first_bad_boundary: "B_UPLOAD_DAY"
secondary_boundaries:
  - "B_EFFECTIVE_PROY_SOURCE"
  - "B_MTD_VS_FORECAST"
reconciliation_9484618: "NOT_PROVEN_WITHOUT_LIVE_DB"
recommended_next_fix: "FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001"
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
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ACTIONABLE-DRIVERS-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
  - "El FIX propuesto no está autorizado."
  - "Probes LIVE read-only redactados; no ejecutados. Cerrar $9,484,618 exacto requiere esas dos llamadas mini."
```

## 1. Executive summary

Agosto A coincide porque ambos lados usan **venta real de mes cerrado**. Septiembre B diverge porque **no reciben el mismo `upload_day`** al construir el mini IGF, que es la fuente de `util_oper_importe` / `resultado_final_importe`.

Dashboard ARR (`ArrClient.ensureMonthLoaded`) resuelve corte como IGF: query `upload_day` o `fetchArrLastUploadDay` del mes, y llama `GET /api/dashboard/igf-forecast?include_mini=true&upload_day=…`. El mini proyecta el resto del mes (PROM + días restantes) y puede overlayar `arr.pronostico_mini_snapshot` de **ese** `corte_day`.

Director IA snapshot **no resuelve** last-upload. `assembleRentabilidadDeterioroSnapshot` → `loadKpiForMonth` pasa `upload_day: null`. `loadIgfForecastMiniPayloadForDirectorIa` construye el mismo `computeIgfForecastMiniPayload` con corte vacío.

Con `fechaCorte=""`:

- `buildPronosticoVentaDescMaps` pone `corteDt = último día del mes` pero `isCorteEnMes = false` y `enableLookback = false`.
- `lastClosedDay = 30` (septiembre) y `countRemainingDowInMonth` arranca en día 31 → **0 días por comprar**.
- PROY = solo TOTAL de días con venta observada = **MTD**, no forecast de mes abierto.

Eso no es una fórmula nueva. Es el mismo helper PROY con **otro corte**.

Corporativos B LIVE coinciden ($2,561,700) porque en el mini se escalan con `bIgf` (`compromiso_lines.venta_ton`), no con `bRes` (PROY). El resultado final de Director IA solo propaga el `util_oper` que sale de un `bRes` colapsado:

`-7,003,653 - 2,561,700 = -9,565,353`

`RENTABILITY_B_FIRST_BAD_BOUNDARY = B_UPLOAD_DAY`.

La identidad `$9,484,618 = Δutil_oper = Δresultado_final` (si corporativos coinciden) está demostrada. El desglose exacto `ΔbRes × (C+D−H−F) × 1000` **no** se cierra sin leer el `ventaTon` del mini sin corte: `NOT_PROVEN_WITHOUT_LIVE_DB`.

Delta Ingreso no participa en estos KPIs. No se recomienda tocarlo.

## 2. Dashboard ARR physical chain

```
UI /arr?empresa=Acapulco
  ArrClient.resolveUploadDayForMonth          frontend-dashboard/app/arr/ArrClient.tsx:2216
    1) searchParams.upload_day si year/month coinciden
    2) cache lastUploadByYm
    3) fetchArrLastUploadDay(year, month)     arr.upload_log ORDER BY uploaded_at DESC
  ArrClient.ensureMonthLoaded                 ArrClient.tsx:2412
    GET /api/dashboard/igf-forecast
      year, month, include_mini=true
      upload_day si se resolvió
  server.js GET igf-forecast                  server.js:12050
    buildIgfForecastPayload(client, y, m, { upload_day })
      resolveIgfGlobalVersion → latest GLOBAL (sin version_as_of_corte)
      compromiso_lines
      isIgfMesCerradoPorCorte(y, m, upload_day)
        agosto + corte en sept o calendario < mes actual → CERRADO
          venta = getVentaRealTonProvinciaByPlant
        septiembre + corte dentro del mes → ABIERTO
          venta/com_desc = loadProyVentaDescByPlantForIgf(..., upload_day)
      overlays folios/presupuesto
      recalcularUtilYResultado(row)           → forecastRow.util_oper_* / resultado_final_*
    computeIgfForecastMiniPayload(..., upload_day)
      bRes = PROY (abierto) o real (cerrado)
      bIgf = compromiso_lines.venta_ton
      scale = bIgf / bRes
      ingreso = (margen + comDesc − hgKg) * bRes * 1000
      operativos = (gasto/bancos/prov escalados + impuesto) * bRes * 1000
      corporativos = corp_kg_escalados * bRes * 1000
                   ≡ corp_kg_raw * bIgf * 1000
      utilOperImporte = ingreso − operativos
      resultadoFinalImporte = utilOperImporte − corporativos
  ArrClient.computeRowValues                  ArrClient.tsx:381
    venta / operativos / corporativos / gasto / rentabilidad ← MINI
    margen / HG / descuento / impuestos      ← forecastRow
  Resumen mes B
    metricB → exclusiones/sim/nuevos → metricBResumen
    rentabilidadMostradaB
      si hay ajuste forecast local → Σ ingreso clientes − gasto
      si no → mini.resultadoFinalImporte  (rentabilidadResumenPorMes)
```

**De dónde sale el −$80,735 (si no hay SIMULAR / exclusiones / plan):**  
`mini.rows[Acapulco].resultadoFinalImporte` de `computeIgfForecastMiniPayload` con el `upload_day` de last-upload de septiembre.

La grilla LIVE es internamente coherente con esa fórmula (venta 1,474 + operativos 9,945,756 + corporativos 2,561,700 → resultado −80,735). No hace falta React sim para explicarla.

**HG$ visible (12.57) no es `hg_kg`.** Es `abs(hg_kg / hg_pct)` (`resumenMesMetrics`). Con HG%=12 → `hg_kg ≈ ±1.51`.

## 3. Director IA physical chain

```
pregunta exacta
  detectDirectorIaIntent
    isRentabilidadDeterioroSnapshotQuestion
    → financial_diagnosis + evidence rentabilidad_deterioro_snapshot
  askDirectorIa branch                        lib/director-ia-chat.js:5376
    assembleRentabilidadDeterioroSnapshot     lib/director-ia-rentabilidad-deterioro-snapshot.js:272
      resolveRentabilidadSnapshotMonths(now)
        standalone: A = mes previo, B = mes de now
        golden/producción sept 2026 → A=2026-08, B=2026-09
      loadDeltaTopN  → computeDeltaIngresoClientesPorMes   (presión comercial; NO es el KPI)
      loadKpiForMonth(A) y loadKpiForMonth(B)              :126
        production: chatDeps.loadRentabilidadKpis AUSENTE
        → loadIgfForecastMiniPayload(pool, { year, month, upload_day: deps.upload_day || null })
        chat NO inyecta upload_day ni loadArrLastUploadDay aquí
  server.js loadIgfForecastMiniPayloadForDirectorIa        :9921
    buildIgfForecastPayload(client, y, m, undefined)       # sin upload_day
    computeIgfForecastMiniPayload(client, igf, y, m, null)
  readIgfForecastMiniAuthoritative            lib/director-ia-dashboard-forecast-adapter.js:98
    util_oper_importe ← mini.utilOperImporte
    resultado_final_importe ← mini.resultadoFinalImporte
  formatter                                   snapshot.js:153
    no llama recalcularUtilYResultado
    no lee compromiso_lines.resultado_final_importe stored
```

Determinación (no asumida):

| Pregunta | Respuesta física |
|---|---|
| ¿Carga persistidos raw? | No para el KPI. Lee mini **recalculado**. |
| ¿Llama `recalcularUtilYResultado`? | No. El mini usa `ingreso − operativos`. |
| ¿Raw compromiso venta? | `bIgf` sí (escala de gastos). `bRes` no. |
| ¿PROY efectivo de ARR? | Llama el mismo helper, con corte **vacío**. |
| ¿MTD? | Efecto de corte vacío: PROY = TOTAL observado, 0 días restantes. |
| ¿Forecast mes abierto? | No. Sin lookback PROM. |
| ¿Reutiliza mini IGF? | Sí. Misma función que Dashboard. |
| ¿Mezcla fuentes? | KPI = mini. Top clientes = otra cadena (CDM + PROY con last-upload). |
| ¿Ignora overlays de snapshot? | Overlay de `corte_day=último día del mes`, no el del last-upload. |
| ¿Otra version IGF? | Mismo `ORDER BY version_number DESC` si no hay `version_as_of_corte`. |

## 4. A real parity

`isIgfMesCerradoPorCorte(2026, 8, "")` usa calendario: agosto < septiembre 2026 → **cerrado**.

En cerrado, `computeIgfForecastMiniPayload` toma venta de `getVentaRealTonProvinciaByPlant`, no de PROY. El `upload_day` deja de elegir `bRes`.

Dashboard A y Director IA A leen el mismo mini de agosto cerrado → `resultado_final = 1,073,657`.

La bifurcación física **solo se enciende en mes abierto**: se necesita `fechaCorte` dentro del mes para `isCorteEnMes=true`, lookback PROM y días restantes.

## 5. Matriz septiembre B

Valores Dashboard = captura LIVE. Valores Director IA KPI = solo los dos importes reportados (el formatter no imprime venta/margen/gastos). Sources = código.

| FIELD | DASHBOARD VALUE / SOURCE | DIRECTOR IA VALUE / SOURCE | SAME? | FIRST DIVERGENCE? |
|---|---|---|---|---|
| `upload_day` / corte | last-upload del mes o query (`resolveUploadDayForMonth`) | `null` → `fechaCorte=""` → corte visual 2026-09-30 y `isCorteEnMes=false` | NO | **SÍ — primera** |
| IGF `version` | latest GLOBAL `igf.versions` | latest GLOBAL (mismo query) | probable | no |
| `financial_state` | no gobierna el mini | no se lee | n/a | no |
| `bRes` venta forecast | PROY con corte in-month + snapshot de ese corte. UI: **1,474** (`mini.ventaTon`) | PROY con corte vacío = MTD. Valor exacto LIVE **no leído** | NO (semántica) | consecuencia inmediata |
| `bIgf` venta compromiso | `compromiso_lines.venta_ton` latest | igual | probable | no |
| `venta_ton` mostrado | 1,474 mini | no emitido | — | — |
| margen | 7.12 `forecastRow.margen_kg` | mini usa `rawIgfRow.margen_kg` / `igfRow` (misma versión) | probable | no |
| descuento UI | −0.20 (`−abs(com_desc)`) | mini `D = proy_desc_kg` del **mismo** PROY vacío (puede divergir) | NOT_PROVEN_WITHOUT_LIVE_DB | no primero |
| operativos | 9,945,756 mini | no emitido; fórmula usa `bIgf` + `impuesto*bRes` | probable distinto en el término impuesto | no primero |
| corporativos | 2,561,700 mini | 2,561,700 (identidad util−resultado) | SÍ | no |
| gasto | 12,507,456 = op+corp | no emitido | — | no |
| HG % | 12.00 = `hg_pct*100` | no emitido | — | no |
| HG$ UI | 12.57 = `abs(hg_kg/hg_pct)` | mini usa `hg_kg` de `igf.rows` | display ≠ input | no |
| impuestos | 0.93 `forecastRow.impuesto_kg` | mismo campo en escala `* bRes` | input $/kg probable igual | no |
| casa | 900.63 ARR clientes | no entra al KPI mini | n/a | no |
| comisionista | 572.90 ARR clientes | no entra al KPI mini | n/a | no |
| `util_oper_importe` | implícito 2,480,965 (`−80,735 + 2,561,700`) | **−7,003,653** mini | NO | derivado |
| `resultado_final_importe` | **−80,735** mini | **−9,565,353** mini | NO | derivado |

Casa + comisionista = 1,473.53 ≈ 1,474. Son columnas de clientes ARR, no inputs del mini. No construyen `util_oper` del snapshot.

## 6–7. Financial state B

Ningún lado selecciona `FORECAST` vs `FINAL` para este KPI. El mini no filtra `financial_state`. Usa la versión GLOBAL de mayor `version_number` del mes.

Abierto/cerrado lo decide `isIgfMesCerradoPorCorte`, no el enum de versión.

## 8. PROY / raw

`B_EFFECTIVE_PROY_SOURCE` (Director IA B):

`loadProyVentaDescByPlantForIgf(client, 2026, 9, "")`  
→ snapshot `corte_day=2026-09-30` (casi seguro vacío)  
→ `computePronosticoProyByPlant({ fechaCorte: "" })`  
→ **MTD, sin PROM restante**

Dashboard B:

`loadProyVentaDescByPlantForIgf(client, 2026, 9, lastUploadYmd)`  
→ snapshot de ese corte  
→ PROM + días restantes  
→ venta UI 1,474

Raw `compromiso_lines.venta_ton` (`bIgf`) sí entra en la **escala de gastos**. Por eso corporativos pueden coincidir con venta PROY distinta.

No se reutiliza como conclusión el slice de Delta Ingreso: esa cadena ya resuelve last-upload vía `resolveUploadDayLikeClientesPorMes`. Esta no.

## 9. MTD vs forecast (H1)

No se asumió. Se demostró el mecanismo:

1. Dashboard venta = `mini.ventaTon` con corte in-month = forecast PROY (LIVE 1,474).
2. Director IA venta = `mini.ventaTon` = `bRes` del mismo helper con `fechaCorte=""`.
3. Función que elige: `computeIgfForecastMiniPayload` → `loadProyVentaDescByPlantForIgf` → `buildPronosticoVentaDescMaps` (`isCorteEnMes` exige `fechaCorte` parseable **dentro** del mes).
4. Financial state: no interviene.
5. Evidencia de MTD: `enableLookback=false` + remaining days = 0 + TOTAL = días 1..último con data observada.

H1 queda **PROVEN** en el sentido: ingreso/venta B colapsan a observado-del-mes; corporativos (y la mayor parte de operativos) siguen anclados a `bIgf` de compromiso (gastos de mes IGF, no MTD).

No es un loader MTD explícito. Es PROY mal cortado.

## 10. `recalcularUtilYResultado`

```12319:12352:server.js
function recalcularUtilYResultado(row) {
  // util_oper_kg = margen + comDesc + deposito − presupuesto − folios − impuesto − hg − bancos − provision
  // util_oper_importe = ventaKg > 0 ? util_oper_kg * ventaKg : 0
  // resultado_final_kg = util_oper_kg − gtosCorp − bancosCorp − otros − inversiones
  // resultado_final_importe = ventaKg > 0 ? resultado_final_kg * ventaKg : 0
}
```

- Dashboard tabla IGF: sí, sobre `forecastRow` (folios/presupuesto overlay).
- Columna RENTABILIDAD ARR: **no**. Prefiere mini.
- Director IA snapshot: **no**.
- Mini: fórmula distinta (`ingreso − operativos`), misma identidad `resultado = util − corporativos`.

La diferencia nace **ANTES** de ambas fórmulas: en `bRes` / `upload_day`.  
No DENTRO de `recalcularUtilYResultado`.  
No DESPUÉS (el formatter solo pinta lo que el mini ya calculó).

## 11. Version

`resolveIgfGlobalVersion`: `plant_code='GLOBAL' AND year AND month ORDER BY version_number DESC LIMIT 1`.

`version_as_of_corte` solo si el GET manda ese flag + `upload_day`. ArrClient no lo manda. Director IA tampoco.

IDs LIVE: `NOT_PROVEN_WITHOUT_LIVE_DB`. No es la primera frontera: la misma versión con distinto corte ya cambia `bRes`.

## 12. upload_day

Participa en rentabilidad B: elige corte PROY, snapshot `corte_day` y (si se pidiera) versión as-of.

| Lado | Resolver |
|---|---|
| Dashboard | `ArrClient.resolveUploadDayForMonth` |
| Delta Ingreso (otra cadena) | `resolveUploadDayLikeClientesPorMes` |
| Snapshot rentabilidad | **ninguno** → `null` |

H5 **PROVEN**.

## 13. React / simulación (H14)

`rentabilidadMostradaB` puede usar estado local (`clientesExcluirVentaForecast`, `*Sim`, `nuevosClientesPlan`, ruta ARR Plan).

La captura LIVE encaja con mini persistido (venta = casa+comi ≈ 1,474; corp y operativos de mini; resultado = util − corp). No se necesita simulación para producir −80,735.

H14 **REJECTED** como explicación necesaria. Un workspace con SIMULAR activo **podría** cambiar la cifra; no hay evidencia de que esta captura lo tenga.

## 14. Reconciliación $9,484,618

Identidad LIVE (corporativos iguales):

```
Δresultado_final = (−80,735) − (−9,565,353) = 9,484,618
Δutil_oper       = 2,480,965 − (−7,003,653) = 9,484,618
```

H12: `resultado_final` solo propaga `util_oper` cuando corp coincide. **PROVEN**.

Desglose a un input:

```
ingreso     = (C + D − H) * bRes * 1000
operativos  = (gastos_planta_raw * bIgf) + F * bRes * 1000
util        = ingreso − operativos
Δutil       = (C + D − H − F) * ΔbRes * 1000
            + términos si C,D,H,F o bIgf también cambian
```

`bIgf` y corp coincidentes ⇒ el motor del hueco es **`ΔbRes`** (y, si el PROY de desc también colapsó, un ΔD menor).

No se inventa `bRes` de Director IA. Cierre aritmético exacto a 1 MXN: **NOT_PROVEN_WITHOUT_LIVE_DB**.

### Probes read-only (NO ejecutados)

1. `GET /api/arr/last-upload-day?year=2026&month=9` → `U`.
2. `GET /api/dashboard/igf-forecast?year=2026&month=9&include_mini=true&upload_day=U` → fila Acapulco: `ventaTon`, `operativos`, `corporativos`, `utilOperImporte`, `resultadoFinalImporte`. Esperado: resultado ≈ −80,735.
3. Misma URL **sin** `upload_day` → mismos campos. Esperado: `ventaTon` tipo MTD, `utilOperImporte` ≈ −7,003,653, `resultadoFinalImporte` ≈ −9,565,353, `corporativos` ≈ 2,561,700.
4. Δ `resultadoFinalImporte` (2)−(3) debe ser 9,484,618 si esta frontera es completa.

Helpers reales: `computeIgfForecastMiniPayload` + `loadProyVentaDescByPlantForIgf`. No SQL duplicado.

## 15. H1–H14

| ID | Disposición | Nota |
|---|---|---|
| H1 | **PROVEN** | Venta/ingreso B = PROY con corte vacío = MTD; gastos mayormente anclados a `bIgf`. |
| H2 | **PROVEN** | Mismo helper PROY; distinto `upload_day`. |
| H3 | **REJECTED** | Ambos pintan mini calculado; no es raw vs `recalcularUtilYResultado`. |
| H4 | **NOT_PROVEN_WITHOUT_LIVE_DB** | Path de versión idéntico; no es first boundary. |
| H5 | **PROVEN** | Dashboard last-upload; snapshot `null`. |
| H6 | **NOT_PROVEN_WITHOUT_LIVE_DB** | Mini toma margen de la misma línea IGF. |
| H7 | **NOT_PROVEN_WITHOUT_LIVE_DB** | `D` puede moverse con el PROY vacío. |
| H8 | **NOT_PROVEN_WITHOUT_LIVE_DB** | `H` viene de `igf.rows` (sign-flip en payload). |
| H9 | **NOT_PROVEN_WITHOUT_LIVE_DB** | Debe moverse al menos el término `impuesto * ΔbRes`. |
| H10 | **PROVEN** | 2,561,700 en ambos (identidad DIA = Dashboard visible). |
| H11 | **PROVEN** | Error en `bRes` / corte, antes de `util_oper`. |
| H12 | **PROVEN** | `−7,003,653 − 2,561,700 = −9,565,353`. |
| H13 | **PROVEN** | Top clientes usa CDM + `resolveUploadDayLikeClientesPorMes`. KPI no. |
| H14 | **REJECTED** | No necesario; grilla coherente con mini persistido. |

## 16. RENTABILITY_B_FIRST_BAD_BOUNDARY

**`B_UPLOAD_DAY`**

| | |
|---|---|
| Archivo | `lib/director-ia-rentabilidad-deterioro-snapshot.js` `loadKpiForMonth`; `lib/director-ia-chat.js` (assemble sin corte); `server.js` `loadIgfForecastMiniPayloadForDirectorIa` |
| Función | `loadIgfForecastMiniPayload(..., { upload_day: null })` → `computeIgfForecastMiniPayload(..., null)` → `buildPronosticoVentaDescMaps(..., "")` |
| Campo | `upload_day` / `fechaCorte` → `bRes` (`mini.ventaTon`) |
| Dashboard source | `ArrClient.resolveUploadDayForMonth` → last `arr.upload_log` del mes |
| Director IA source | literal `null` |
| Semántica divergente | corte in-month + PROM restante vs último día del mes + 0 restantes = MTD |
| Consecuencia | `util_oper` y `resultado_final` B colapsan (~ −9.57M vs −80,735) mientras corporativos (× `bIgf`) pueden quedar iguales |

Secundario: `B_EFFECTIVE_PROY_SOURCE` (mismo helper, otro corte). `B_MTD_VS_FORECAST` es el efecto, no un loader aparte.

## 17. Root cause

El snapshot de rentabilidad reutiliza el mini IGF canónico del Dashboard **sin el resolver de corte que el Dashboard sí usa**. En mes abierto, corte vacío no es “fin de mes forecast”: desactiva lookback y días por comprar. El KPI B deja de ser la rentabilidad ARR de septiembre.

Agosto no dispara esa rama.

## 18. Por qué R-RENT-SNAPSHOT fue false-green

El harness (`rentSnapshotDeps`) inyecta `loadRentabilidadKpis` con constantes (`final_a=800000`, `final_b=450000`). **Nunca** llama `computeIgfForecastMiniPayload`. **Nunca** compara contra mini del Dashboard. **Nunca** afirma `upload_day`.

001–010 cubren routing, periodo, fail-closed y Delta Ingreso. No cubren paridad numérica Dashboard↔Director IA.

Dependencia compartida/mockeada: `loadRentabilidadKpis` sintético. El source-of-truth (`computeIgfForecastMiniPayload` + last-upload) quedó fuera.

## 19. Future regression pack (NO implementar)

Fixture donde A cerrado coincide y B abierto tiene `last_upload` in-month ≠ corte vacío.

No duplicar la función en expected y actual: expected = `computeIgfForecastMiniPayload(..., lastUpload)`; actual = runtime snapshot **sin** reinyectar el mismo KPI mock.

1. A real parity (`resultado_final` A).
2. B venta parity (`mini.ventaTon`).
3. B operativos parity.
4. B margen parity.
5. B HG (`hg_kg`) parity.
6. B `util_oper` parity.
7. B `resultado_final` parity.
8. Exact delta A→B parity.
9. No raw-vs-PROY: `bRes` ≠ `compromiso.venta_ton` cuando el Dashboard usa PROY.
10. No MTD-vs-forecast: snapshot B ≠ mini llamado con `upload_day=null` si last-upload existe.

## 20. Minimum recommended FIX

**No implementar.**

`FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001`

En `loadKpiForMonth` / el branch de chat: resolver `upload_day` con el helper **ya inyectado** `loadArrLastUploadDay` / `resolveUploadDayLikeClientesPorMes` (misma semántica que ARR). Pasarlo a `loadIgfForecastMiniPayload`.

No tocar:

- `computeDeltaIngresoClientesPorMes`
- `computeClientesDescuentoMes`
- `ingresoClienteMarginal`
- `effective PROY` (salvo usarlo como ya existe)
- Delta Gastos, atribución, controlabilidad, Action Register

## 21. Branch

`audit/director-ia-rentabilidad-snapshot-dashboard-parity-001`

## 22. Commit

`allowed_actions` no lista commit. No hay SHA. Working tree intacto.

## 23. git status --short

```
 M docs/dev-loop/CURRENT_TASK.md
?? docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001.md
```
