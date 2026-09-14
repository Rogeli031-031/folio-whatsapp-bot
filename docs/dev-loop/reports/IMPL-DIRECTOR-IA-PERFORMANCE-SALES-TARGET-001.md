# IMPL-DIRECTOR-IA-PERFORMANCE-SALES-TARGET-001

```yaml
task_id: "IMPL-DIRECTOR-IA-PERFORMANCE-SALES-TARGET-001"
outcome: "DONE"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
test_changes: true
sql_changes: false
docs_director_ia_changes: false
new_intent: false
new_target_source: false
phrase_patch: false
focal_tests: "16/16 performance + 22/22 month_close + 55/55 CEL + 23/23 daily brief"
next_task_proposed: null
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Resultado

**DONE_PENDING_REVIEW.**

PERFORMANCE de este slice = **venta real de una planta en un YYYY-MM** vs **`igf_meta.meta_lines.venta_ton`**.

No se implementaron descuento, margen, presupuesto, forecast-como-meta, histórico-como-meta, DIAGNOSIS ni PRIORITY.

`TARGET != FORECAST != BUDGET != HISTORICAL`.

## 2. Estado previo / causa

Auditoría `AUDIT-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-001` (`89a887c9`):

- La única meta física de venta es `igf_meta`.
- `month_close_result` ya calcula `attainment_pct` y `delta_ton` contra esa meta.
- Varias frases explícitas ya llegaban ahí (`meta` + `cumpl` / `contra la meta` / `porcentaje`).
- Huecos: `¿Vamos arriba o abajo de la meta?` (unknown); `¿Superamos la meta de venta?` (CEL, porque `isCutoffAwareMagnitudeQuestion` trata `meta`+`venta` como magnitud y el planner era `unknown`); `¿Cuál es el cumplimiento de venta del mes?` (unknown).
- `¿Estamos cumpliendo?` correctamente no asumía venta.

## 3. Frontera exacta modificada

Propietario: `lib/director-ia-month-close-result.js`.

| Función | Cambio |
|---------|--------|
| `isSalesTargetPerformanceQuestion` | Nueva. Semántica reusable: arriba/abajo + meta; superamos + meta; cumplimiento + venta. Excluye cumpliendo suelto, forecast, presupuesto, mes pasado, descuento/margen. |
| `isMonthCloseQuestion` | Llama a esa función. Planner sigue emitiendo `month_close_result`. |
| `isMonthCloseFollowUp` | Hereda porcentaje/faltante/arriba-abajo/superamos. `¿Por qué?` sigue con `kind=why` existente (sin causa inventada). |
| `assembleMonthClosePack` | Expone `remaining_ton`, `over_target_ton`, `vs_target` derivados de actual vs `venta_ton`. No nueva fuente. |
| `formatMonthCloseContext` | Incluye esos campos en el bloque GPT. |

No se tocó planner intents, tools, SQL, frontend, CEL pack, daily brief.

## 4. Fuentes reutilizadas

| Rol | Fuente | Loader |
|-----|--------|--------|
| TARGET | `igf_meta.meta_lines.venta_ton` | `listMetaVersions` + `loadMetaLinesForVersion` + `pickCurrentMetaVersion` + `pickMetaRowForPlant` |
| ACTUAL venta | `arr.ventas_diarias_cliente` | `queryMonthlySales` / filas del mismo YYYY-MM |
| Executor | ya existía | `loadMonthCloseResultForChat` / `get_month_close_result` |
| Periodo | contrato month_close | YYYY-MM explícito, “este mes”, “mes pasado”, default último mes COMPLETE |
| Planta | `planta_id` autorizado + matcher empresa | no cruce (`findIgfRowForPlant`) |

Forecast (`igf.compromiso_lines`) sigue en el pack como `FORECAST`, no como target.

## 5. Fórmula

Cuando `target_status === OK` y `meta_venta_ton > 0`:

- `attainment_pct = venta_real_ton / meta_venta_ton * 100`
- `variance_ton` (`delta_ton`) = `venta_real_ton - meta_venta_ton`
- `remaining_ton = max(meta - actual, 0)`
- `over_target_ton = max(actual - meta, 0)`
- `vs_target`: `below` / `at` / `above`

Si falta meta: `TARGET_MISSING_FOR_PERIOD`. `attainment_pct`, `delta_ton`, `remaining_ton`, `over_target_ton`, `vs_target` = `null`. No se afirma cumplimiento.

Si meta = 0: `target_zero_no_attainment`. No se divide.

## 6. Diff conceptual

No hay segunda verdad de meta. Se abrió el detector de `month_close_result` a la semántica PERFORMANCE de **venta vs meta** que la auditoría ya identificó como hueco, y se materializaron faltante/exceso que ya se podían derivar de actual y target.

## 7. Pruebas

`node --test test/director-ia-performance-sales-target.test.js` **16/16**

| # | Caso | Resultado |
|---|------|-----------|
| 1 | Venta 10 t < meta 12 t | `vs_target=below`, remaining 2, % = 83.33… |
| 2 | Venta = meta 12 t | `at`, 100%, remaining 0, over 0 |
| 3 | Venta 15 t > meta 12 t | `above`, 125%, over 3 |
| 4 | Porcentaje | `attainment_pct` |
| 5 | Faltante | `remaining_ton` |
| 6 | Exceso | `over_target_ton` |
| 7 | Meta ausente | `TARGET_MISSING_FOR_PERIOD`, sin % |
| 8 | Planta | `findIgfRowForPlant` Puebla ≠ Acapulco 40 t |
| 9 | Periodo | `loadTarget` solo `2026-06`; junio ≠ julio |
| 10 | Forecast 99 t en pack | target sigue 12; clase FORECAST |
| 11 | Presupuesto | no `month_close` |
| 12 | Histórico / mes pasado | no `month_close` |
| 13 | `¿Cómo vamos?` | CEL `EXECUTIVE_STATUS` |
| 14 | Brief diario | `daily_executive_brief` intacto |
| 15 | month_close canónico | `cerramos julio` / `contra la meta` / `% cumplimos` |

8 preguntas explícitas del contrato → `month_close_result`, no CEL.

`¿Estamos cumpliendo?` / `¿Vamos bien?` → `unknown`.

Regresiones: month_close 22/22, CEL 55/55, daily brief 23/23.

## 8. Fixtures

Pack de prueba: Puebla, 2026-06, 10 t ARR (8+2), meta `igf_meta` 12 t, forecast IGF 99 t (no usado como meta). Variantes 12 t y 15 t. `target: null` para gap.

## 9. Evidencia TARGET_MISSING_FOR_PERIOD

`assembleMonthClosePack({ target: null })`: `target_status=TARGET_MISSING_FOR_PERIOD`, `target_ton=null`, `attainment_pct=null`, gap en `information_gaps`. Actual 10 t se conserva. No se infiere meta.

## 10. Forecast / presupuesto / histórico

- Detector PERFORMANCE rechaza `forecast`, `proyecc`, `presupuesto`, `mejor`+`mes pasado`.
- Routing: esas frases no entran a `month_close_result`.
- Pack: `provenance.target=igf_meta.meta_lines`; forecast es otra clase.

## 11. Continuidad

- `¿Qué porcentaje llevamos?` / `¿Cuánto nos falta?` → `isMonthCloseFollowUp`.
- `¿Por qué?` → follow-up `why` existente: el pack explica actual/meta/desviación; el addendum sigue prohibiendo inventar causa.
- Planta/periodo: requery month_close; inherit de mes solo con `reuse_inherited_month` ya existente.

## 12. Archivos

Tocados:

- `lib/director-ia-month-close-result.js`
- `test/director-ia-performance-sales-target.test.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-PERFORMANCE-SALES-TARGET-001.md`
- `docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-001.md` (evidencia)

## 13. Desvíos

Ninguno material. Periodo default = contrato month_close (último mes COMPLETE si no hay YYYY-MM / “este mes”). No se inventó un periodo PERFORMANCE distinto.

## 14. STOP

No otra métrica PERFORMANCE. No DIAGNOSIS. No PRIORITY. No merge. No push a `main`. No deploy.
