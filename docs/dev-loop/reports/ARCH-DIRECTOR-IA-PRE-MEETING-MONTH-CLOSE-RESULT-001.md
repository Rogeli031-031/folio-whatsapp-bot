# Reporte — ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001

```yaml
task_id: "ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READINESS_ONLY"
correction: true
implementation: false
determination: "READY_WITH_LIMITS"
previous_finding: "canonical monthly sales meta = NO (persistence dismissed as forecast/workbook name)"
new_evidence: "igf_meta / igf_metahg persist; VBA Subir_IGF_META_Global / Subir_IGF_METAHG; HUMAN_APPROVER classifies igf_meta as TARGET/COMMITMENT"
corrected_finding: "igf_meta = TARGET/COMMITMENT of the month (venta + financial objectives). IGF runtime = FORECAST. ARR daily = ACTUAL. forecast_mensual = DERIVED_MODEL. Exact year/month/plant + is_current only. No carry-forward. Missing month = TARGET_MISSING_FOR_PERIOD."
canonical_sales_target: true
canonical_sales_target_source: "igf_meta.meta_lines.venta_ton (TARGET/COMMITMENT; same year/month; GLOBAL version is_current; row matched by empresa)"
canonical_sales_target_unit: "ton (ARR actual is kg; convert explicitly; do not mix)"
igf_meta_class: "TARGET_COMMITMENT"
igf_metahg_class: "TARGET (category/HG block used by Evaluacion; not a substitute for igf_meta.venta_ton)"
igf_forecast_class: "FORECAST"
arr_daily_class: "ACTUAL"
arr_forecast_mensual_class: "DERIVED_MODEL"
financial_actual: false
selected_architecture: "B_month_close_read_model"
selected_architecture_letter: "B"
architecture_changed: false
selected_first_slice: "C_month_close_core"
selected_first_slice_letter: "C"
first_slice_changed: false
canonical_intent: "month_close_result"
intent_changed: false
pre_meeting_meta_gap: "META_MISSING_FOR_PERIOD"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This correction does not change module coverage. 0.0 pp."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_modified: []
next_task_proposed: "IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Corrección (esta revisión)

| | |
|---|---|
| **PREVIOUS_FINDING** | Meta mensual canónica = **NO**. `igf_meta` se clasificó como forecast / nombre de plantilla. |
| **NEW_EVIDENCE** | Persistencia física `igf_meta.*` / `igf_metahg.*`. Macros `Subir_IGF_META_Global` / `Subir_IGF_METAHG`. HUMAN_APPROVER: `igf_meta` es el compromiso gerencial del mes. |
| **CORRECTED_FINDING** | `igf_meta` = **TARGET / COMMITMENT**. No forecast. No actual. No derived. Comparar ACTUAL vs META solo con la versión vigente del **mismo** year/month/planta. Sin carga = `TARGET_MISSING_FOR_PERIOD`. |

Arquitectura **B**, first slice **C** e intent **`month_close_result`** se **mantienen**. Cambia el contenido de `sales.target` / `financial.target`: ahora tienen fuente canónica cuando el periodo está cargado.

---

## Resumen ejecutivo

**READY_WITH_LIMITS.**

`month_close_result` puede alinear, **antes** de GPT:

- `sales.actual` — ARR kg del mes
- `sales.target` — `igf_meta.meta_lines.venta_ton` del mismo YYYY-MM (ton → kg explícito)
- `sales.delta_vs_target` / `sales.attainment_pct` — solo si ambos existen
- `financial.target` — resto de `igf_meta.meta_lines` (margen, util, resultado)
- `financial.forecast` — `igf.compromiso_lines` (IGF runtime)
- `financial.actual` — **UNSUPPORTED** (no hay cierre contable)

Si el mes no tiene `igf_meta` vigente: **no** se usa junio para agosto. Gap `TARGET_MISSING_FOR_PERIOD`.

Director IA **aún no** carga `igf_meta` (inventario: UI only). El IMPL debe leer las tablas; no inventar meta.

**NEXT_TASK** (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001`.

---

## Ejecución

- Rama: `implementation/director-ia-pre-meeting-month-close-result-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- Corrección de readiness. Sin código, tests, SQL, schema, VBA, contratos, matriz, commit, push, merge.

---

## Cuatro verdades (no mezclar)

| Clase | Fuente | Qué es |
|-------|--------|--------|
| **ACTUAL** | `arr.ventas_diarias_cliente` / descuentos diarios | Resultado físico observado del mes |
| **TARGET / COMMITMENT** | `igf_meta.versions` + `igf_meta.meta_lines` | Meta/compromiso gerencial firmado del mes. Decisión de negocio del HUMAN_APPROVER. |
| **FORECAST** | `igf.versions` + `igf.compromiso_lines` | IGF forecast/runtime vigente. Independiente de `igf_meta` (`sql/012`: «independiente de igf.compromiso_lines»). |
| **DERIVED_MODEL** | `arr.forecast_mensual`, proyección 14d×DOW, overlay UI | Modelo calculado. Prohibido como meta. |

`igf_metahg` es **TARGET** de bloque por categoría (Evaluación: columna META = `kilos` / comisión). **No** sustituye `igf_meta.venta_ton`. **No** es solo «meta HG». First slice C usa `igf_meta` para venta/financiero objetivo.

Prohibido: forecast como meta; mes anterior como meta; Plaud; hardcode; carry-forward.

---

## A. IGF META Global — físico

Schema: `sql/012_igf_meta_global.sql`. Lectura: `lib/igf-meta-excel.js`. Endpoints: `GET /api/dashboard/igf-meta-versions`, `GET /api/dashboard/igf-meta-excel`. Director IA: **sin loader**.

### Grain y claves

| Campo | Significado físico |
|-------|-------------------|
| `versions.plant_code` | En lectura actual: **`GLOBAL`**. Un libro mensual, no una fila por planta. |
| `versions.year` + `month` | Periodo del compromiso. |
| `versions.version_number` | Entero. VBA: `MAX(version_number)+1` por plant_code/year/month. |
| `versions.is_current` | Versión vigente **de ese** GLOBAL+year+month. Las anteriores quedan `false`. **No** significa «meta para cualquier mes futuro». |
| `meta_lines.empresa` | Nombre de planta/empresa en la fila (Puebla, Morelos, …). `UNIQUE(version_id, empresa)` → **una línea por empresa** por versión. |
| `line_key` | `META_GLOBAL\|YYYYMM\|empresa` (VBA confirmada). |

`listMetaVersions` filtra `plant_code='GLOBAL' AND year AND month`. `pickIgfMetaVersionNumber` elige `is_current` dentro de **esa** lista; el fallback a `max(version_number)` es del **mismo** mes, no de otro mes.

### Mapping empresa → planta

Reusar el patrón de `findIgfRowForPlant` (`lib/director-ia-igf-arr.js`): normalizar, excluir `TOTAL`, match exacto / contains / strip `GTM`/`GT`. Fail closed si no hay match ≥ umbral. **No** inventar una segunda función de matching si se puede extraer/reusar.

### Columnas = objetivos (TARGET), no resultados

Misma forma que la plantilla Compromiso; **clase distinta**.

| Columna | Objetivo de compromiso | Unidad |
|---------|------------------------|--------|
| `venta_ton` | **Venta objetivo** | ton |
| `margen_kg` | Margen objetivo | $/kg |
| `com_desc_kg` | Comisión/descuento objetivo | $/kg |
| `gasto_kg` | Gasto objetivo | $/kg |
| `impuesto_kg` | Impuesto objetivo | $/kg |
| `hg_pct` / `hg_kg` | HG objetivo | % / $/kg |
| `bancos_planta_kg` / `provision_planta_kg` | Cargos planta objetivo | $/kg |
| `util_oper_kg` / `util_oper_importe` | Utilidad operativa **objetivo** | $/kg / MXN |
| `gtos_apoyos_corp_kg` / `bancos_corp_kg` / `otros_programas_kg` / `inversiones_kg` | Cargos corp. objetivo | $/kg |
| `resultado_final_kg` / `resultado_final_importe` | Resultado **esperado/comprometido** | $/kg / MXN |

**No** son actual. **No** son IGF forecast.

### Cómo leer (sin duplicar)

1. Resolver YYYY-MM pedido (no el mes abierto de `pre_meeting`).
2. `schemaMetaExists`.
3. Versión: `is_current = true` para `GLOBAL` + year + month. Si no hay fila → `TARGET_MISSING_FOR_PERIOD`.
4. `SELECT * FROM igf_meta.meta_lines WHERE version_id = ?`.
5. Una fila: `findIgfRowForPlant` (o equivalente extraído).
6. Provenance: version_id, version_number, year, month, empresa.

Reusar `loadMetaLinesForVersion` / `listMetaVersions` si el IMPL puede llamarlos in-process. **No** HTTP interno. **No** nueva tabla.

---

## B. IGF METAHG — físico (no first-slice sales.target)

Schema: `sql/013_igf_metahg.sql`. Lectura: `lib/igf-metahg.js` (`year+month+is_current`). Plantas: puebla, tehuacan, acapulco, queretaro, san luis, morelos.

| Campo | Uso físico |
|-------|------------|
| `categoria` | PIPAS CASA, PORTÁTIL, ESTACIONES, PIPAS COMISIONISTA, PREDIEROS, recuperaciones, compras, VTA. AÑO ANTERIOR, TOTAL |
| `kilos` | Evaluación: columna **META** de venta por rubro / TOTAL (`META!C`) vs ARR RESULTADO |
| `comision` | Evaluación: META de comisión (`META!D` total) |
| `prom` / `total` / `pct` / `kilos_h` | Bloque METAHG; `kilos_h` ≠ meta general de venta |
| `is_total_row` | Fila TOTAL |

Clase: TARGET de mix/categoría. **No** reemplaza `igf_meta.venta_ton`. Fuera del first slice C salvo handoff posterior.

---

## C. Versionado y staleness

```
(plant_code, year, month, version_number) UNIQUE
is_current = versión canónica de ESE plant_code + ESE year + ESE month
```

**Regla obligatoria (candidata → norma del IMPL):**

Para ACTUAL vs META de YYYY-MM:

- solo `igf_meta` con `year/month` **exactos**
- solo la versión `is_current` (o la pedida si se nombra versión)
- solo la fila `empresa` de la planta autorizada

**Prohibido:** última meta de otro mes; carry-forward; forecast; mes anterior; Plaud; hardcode.

Si agosto no tiene carga y junio sí: agosto = **`TARGET_MISSING_FOR_PERIOD`**. No comparar agosto contra junio.

El HUMAN_APPROVER indicó ~2 meses sin subir META/METAHG. Eso es hecho operativo: los meses recientes **pueden** estar missing. No se ejecutó SQL. El runtime debe **detectar** ausencia, no asumir frescura.

---

## D–E. `month_close_result` (reevaluado; B/C/intent sin cambio)

Arquitectura **B** se mantiene: hace falta un read model que separe clases **antes** de GPT. A seguiría mezclar. C persistido no hace falta. D sobrecargaría el pack abierto.

First slice **C** se mantiene y ahora **puede llenar target** cuando existe carga:

```
identity: plant, month, COMPLETE|PARTIAL, generated_at
sales.actual_kg            ACTUAL (SUM kg)
sales.target_ton           TARGET igf_meta.venta_ton (same period)
sales.target_kg            derived display = target_ton * 1000 (label as unit convert, not a new truth)
sales.delta_vs_target      only if actual + target
sales.attainment_pct       only if actual + target and target > 0
channels / discount        ACTUAL
clients                    ACTUAL kg new/lost/movers
financial.target           igf_meta lines (util, resultado, margen) — TARGET
financial.forecast         igf.compromiso_lines — FORECAST
financial.actual           UNSUPPORTED
actions / information_gaps including TARGET_MISSING_FOR_PERIOD
```

Unidades: ARR = kg; meta venta = ton. El delta se hace en **una** unidad declarada.

---

## F. Preguntas reales

| Pregunta | ¿Físicamente? | Limitation |
|----------|---------------|------------|
| ¿Cómo cerramos contra la meta? | Sí, si hay `igf_meta` del mes + actual ARR | Sin carga: `TARGET_MISSING_FOR_PERIOD` |
| ¿Cuánto nos faltó? | Sí (`actual − target`) | Idem; no usar otra mes |
| ¿Qué % de la meta? | Sí si target > 0 | Idem |
| Vendimos más, ¿contra la meta? | Sí: MoM actual **y** vs target del mismo mes | «Más» ≠ «llegamos»; son dos comparaciones |

«Ganamos menos» como utilidad **real**: sigue **UNSUPPORTED**. Se puede decir: actual de venta vs target de venta; `financial.target` vs `financial.forecast`; no «cerramos en $X reales».

---

## G. Pre-meeting

Sí: `pre_meeting_brief` debe poder marcar **`META_MISSING_FOR_PERIOD`** cuando el mes de la junta (abierto o el de cierre pedido) no tenga `igf_meta` `is_current`.

No implementar en esta tarea. No rellenar con mes anterior. No es un gap de «no existe el esquema»; es **ausencia de carga de ese periodo**.

---

## Lectores existentes (IMPL)

| Pieza | Reusar | No |
|-------|--------|----|
| Versiones / líneas META | `listMetaVersions`, `loadMetaLinesForVersion` | HTTP a `/api/dashboard/igf-meta-*` |
| Match planta | `findIgfRowForPlant` | Matching por nombre libre |
| METAHG | `loadMetahgForEmpresa` (fuera de first slice) | Mezclar `kilos` como `sales.target` |
| IGF forecast | `loadIgfCommitSnapshot` | Llamarlo meta |
| Venta actual | `queryMonthlySales` (suma planta) | `forecast_mensual.kg_actual` |

Authz: una planta, fail closed, mismos bloqueos financieros GA/GV que IGF.

---

## G2 / G3 / G8

| Gate | |
|------|
| G2 | **N/A** — chat legado; no Motor N1–N5 |
| G3 | **N/A** — no se edita `docs/director-ia/` |
| G8 | **N/A** — sin umbrales nuevos |

---

## Límites (READY_WITH_LIMITS, no BLOCKED)

1. Sin `igf_meta` del mes → target omitido + `TARGET_MISSING_FOR_PERIOD`.
2. Sin financial actual.
3. Director IA aún no lee `igf_meta` (el IMPL lo añade).
4. Unidades ton vs kg deben declararse.
5. METAHG no es `sales.target` del first slice.
6. Recargas ARR pueden cambiar actual; `COMPLETE` ≠ inmutable.

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.** Esta corrección no sube porcentaje.

---

## NEXT_TASK

`IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001`

First slice C, arquitectura B, intent `month_close_result`. `igf_meta` = TARGET/COMMITMENT. Exact period. No carry-forward. No llamar forecast a meta. No autorizar ni ejecutar aquí.

STOP.
