# AUDIT-DIRECTOR-IA-DIAGNOSIS-EVIDENCE-COVERAGE-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-DIAGNOSIS-EVIDENCE-COVERAGE-001"
outcome: "DONE"
mode: "AUDIT"
implementation: false
code_changes: false
test_changes: false
docs_director_ia_changes: false
reference_main: "eb03e794"
diagnosis_commit: "e467b9d4"
production_case: "Acapulco 2026-09"
live_db_probe: "NOT_EXECUTED_NO_DB_URL"
next_task_proposed: "IMPL-DIRECTOR-IA-DIAGNOSIS-INDEPENDENT-SIGNALS-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: >
  Revisar este informe. Autorizar o no el slice mínimo propuesto.
  No autoriza CAUSE_EXPLANATION, PRIORITY, saludo ni Taller.
```

## 1. Resultado

**DONE_PENDING_REVIEW. No se implementó nada.**

La respuesta productiva de Acapulco 2026-09 (solo `OBSERVATION: TARGET_MISSING_FOR_PERIOD`) **no se debe a un corte/early-return** cuando falta meta.

`TARGET_MISSING_FOR_PERIOD` **no aborta** `composeExecutiveCycle` ni `deriveRisksAndGaps` ni `projectFindingsFromCyclePack`. Es un gap que DIAGNOSIS proyecta como OBSERVATION. Si no hay más hallazgos, **queda como único renglón** y parece “el diagnóstico”.

Sonda in-memory (2026-09, planta 2 / Acapulco):

| Caso | target | ARR | forecast | overdue | DIAGNOSIS |
|------|--------|-----|----------|---------|-----------|
| Vacío (réplica de producción) | missing | filas `[]` | missing | 0 | solo `OBSERVATION:TARGET_MISSING_FOR_PERIOD` |
| Señales sin meta | missing | lost + drop kg | resultado < 0 | 2 | OBSERVATION + DEVIATION + RISK coexisten con el hueco |

Conclusión física: **falta de meta ≠ ausencia de diagnóstico**. El vacío productivo significa que **las otras señales no estaban en el plant block** (o estaban como gaps no proyectados), no que el target las haya apagado.

Este entorno **no tiene `.env` ni URL de base**. No se ejecutó SELECT a producción. No se inventaron filas de Acapulco.

## 2. Recorrido físico

```
pregunta DIAGNOSIS
  → CEL resolveExecutiveNeed (DIAGNOSIS_OBSERVATION_RISK, implemented)
  → chat shouldHandleDiagnosisObservationRisk (solo planner unknown|plant_diagnosis)
  → handleExecutiveDiagnosisForChat
  → composeExecutiveCycle (cycle_mode=PRE_CLOSE, periodo = mes abierto CDMX)
      loadTarget        → igf_meta.versions year+month exactos
      queryMonthlySales → arr.ventas_diarias_cliente (mes abierto + mes previo)
      classifyClients   → lost / new / ±movers  (month_close helper)
      loadCurrentSection→ solo copia lost[0..2] y top_negative_movers[0..2]
      loadIgfCommitSnapshot → igf.versions + compromiso_lines
      defaultLoadActions    → Action Register
      loadCommercialTrend   → 90d OLS (si skipTrend no está)
      deriveRisksAndGaps
  → projectFindingsFromCyclePack
  → formatDiagnosisAnswer
```

Periodo de DIAGNOSIS = **mes abierto** (`cdmxTodayParts` → `2026-09`).  
`month_close_result` usa por defecto el **último mes COMPLETE** (típicamente `2026-08`). No son el mismo corte.

`listMetaVersions` filtra `year=$1 AND month=$2`. Sin carry-forward. Septiembre sin versión GLOBAL ⇒ `TARGET_MISSING_FOR_PERIOD`. Encaja con la evidencia productiva.

`server.js` inyecta `pool` al chat. **No** inyecta `preCloseSkipTrend` ni fixtures. En producción el composer consulta ARR/IGF/AR de verdad.

## 3. Hipótesis de la tarea

| Hipótesis | Veredicto físico |
|-----------|------------------|
| El pack se corta cuando falta target | **FALSA.** No hay `return` tras el gap. La sonda con ARR+AR+IGF y target missing emite lost, movers, overdue y riesgos. |
| Movimiento de clientes existe pero no entra al pack | **PARCIAL.** `classifyClients` sí corre dentro de `loadCurrentSection`. **new** y **top_positive_movers se descartan** ahí. DIAGNOSIS nunca los ve. Lost/negativos sí se copian (máx. 3). |
| Acciones vencidas requieren otra tool | **PARCIAL.** `defaultLoadActions` sí entra al composer. Si `ok:false` / overdue=0, DIAGNOSIS no muestra ni el gap `SOURCE_UNAVAILABLE` de AR. |
| 14d / M9 existen pero no se proyectan | **VERDADERA como desconexión.** Helpers existen; **compose no los llama**. |
| DIAGNOSIS solo consume un subconjunto PRE_CLOSE | **VERDADERA.** No proyecta `FORECAST_MISSING`, `SOURCE_UNAVAILABLE`, `ARR_VS_IGF`, venta to-date sin meta, new/positive, trend salvo `DOWN` como RISK. |
| No hay que inventar riesgo | **VIGENTE.** No se proponen `risk_code` nuevos. |

## 4. Caso Acapulco 2026-09 — qué se demostró y qué no

### Demostrado

- Output productivo: solo `TARGET_MISSING_FOR_PERIOD` (evidencia humana de la tarea).
- Ese output se **reproduce exactamente** si el block tiene: target missing + ARR vacío + forecast missing + overdue 0.
- `FORECAST_MISSING_FOR_PERIOD` **sí llega** a `deriveRisksAndGaps` y al pack; **no llega** a DIAGNOSIS.
- `venta_ton` null (ARR no seen) no genera OBSERVATION.
- Este worktree: `env_file=false`, `db_url_present=false`, `LIVE_PROBE=NOT_EXECUTED_NO_DB_URL`.

### No demostrado (no hay DB aquí)

No se afirma que Acapulco tenga o no, en producción, filas ARR de septiembre, clientes perdidos, IGF septiembre o acciones vencidas. Eso requiere SELECT read-only en el entorno con la base.

Lo que **sí** se afirma: si esas filas hubieran llegado al plant block, DIAGNOSIS **ya las imprimiría** (lost, neg movers, overdue, riesgos tipados independientes del target). El vacío productivo implica que **en ese run no estaban en el block**, o solo estaban como gaps no proyectados.

## 5. Matriz física

`disp` = dato disponible **como runtime/helper**. Instancia Acapulco 2026-09 en DB: `ND` = no demostrado aquí.

| fuente | señal | disp | helper/tool | llega a cycle | llega a risks | llega a DIAGNOSIS | clasificación | observaciones |
|--------|-------|------|-------------|---------------|---------------|-------------------|---------------|---------------|
| igf_meta | meta `venta_ton` 2026-09 | DATA_GAP productivo | `listMetaVersions` / `loadTargetSection` | sí (status missing) | gap, no risk | OBSERVATION `TARGET_MISSING` | DATA_GAP_ONLY / TARGET_DEPENDENT | Exact YYYY-MM. Protagonista indebido del output. |
| igf_meta | meta 2026-08 | helper sí; instancia ND | mismo | no (periodo abierto 09) | no | no | AVAILABLE_NOT_CONSUMED (otro periodo) | month_close sí podría usarla. |
| ARR | kg/t to-date mes abierto | helper sí; instancia ND | `queryMonthlySales` | sí si hay filas | no como risk | no si no hay target (no hay OBS de venta suelta) | AVAILABLE_NOT_CONSUMED | Hecho independiente del target. Hoy se omite. |
| ARR | clientes dejaron de comprar | helper sí; instancia ND | `classifyClients` → `lost_clients` | sí (máx. 3) | `LOST_HIGH_VOLUME_CLIENT` | OBSERVATION + RISK | AVAILABLE_AND_CONSUMED **si hay filas** | No causa. Mid-month: kg=0 puede ser “aún no compra”. |
| ARR | clientes disminuyeron | helper sí; instancia ND | `top_negative_movers` | sí (máx. 3) | no | DEVIATION `CLIENT_KG_VS_PRIOR` | AVAILABLE_AND_CONSUMED **si hay filas** | Vs mes calendario previo (agosto completo vs sept to-date). Contribución ≠ causa. |
| ARR | clientes aumentaron / new | helper sí | `classifyClients`.new / positive | **no** (drop en `loadCurrentSection`) | no | no | AVAILABLE_NOT_CONSUMED | “Qué funciona” no puede mostrarse. |
| ARR | 14d same-weekday | helper sí | `loadDailySalesDeviationForChat` | no | no | no | AVAILABLE_NOT_CONSUMED | Referencia de **día**, no de mes. |
| M9 | delta vs periodo comparable | helper sí | `loadDeltaVentaForChat` et al. | no | no | no | AVAILABLE_NOT_CONSUMED | Periodos que M9 elija ≠ mes abierto forzado. |
| IGF | forecast venta / resultado | helper sí; instancia ND | `loadIgfCommitSnapshot` | sí | `FORECAST_RESULT_NEGATIVE` sin target; `FORECAST_BELOW_TARGET` **con** target; `REMAINING_*` si hay actual | RISK si el risk_code existe en el block | TARGET_DEPENDENT (below target); resto independiente | `FORECAST_MISSING` llega a risks/gaps, **no** a DIAGNOSIS. |
| trend 90d | OLS DOWN | helper sí | `loadCommercialTrendForChat` | sí si no skip | `COMMERCIAL_DETERIORATION` | RISK | AVAILABLE_AND_CONSUMED **si DOWN** | Mover ≠ causa. No es ranking. |
| Action Register | vencidas / abiertas | helper sí; instancia ND | `defaultLoadActions` | sí | `OVERDUE_ACTION` si overdue>0 | OBSERVATION + RISK | AVAILABLE_AND_CONSUMED **si overdue>0** | Dueño de acción ≠ culpable. Si load falla: gap no proyectado. |
| proyectos | EN_CURSO / cierre estimado | helper sí | `loadProyectosForChat` | no | no | no | AVAILABLE_BUT_NOT_CONTRACTED | Derivado ≠ estatus `atrasado`. No riesgo tipado. |
| KPIs / folios | conteo/aging | helper sí | `loadDashboardKpisForChat` / M2 | no | no | no | AVAILABLE_BUT_NOT_CONTRACTED | No es salud de planta. |
| gastos / inv / apoyos | folios / reviewable | reviewable sí en cycle | `loadIgfReviewableSupportsForChat` | reviewable sí | no risk; `decision_needed` | no | AVAILABLE_NOT_CONSUMED | reviewable ≠ ahorro. No DIAGNOSIS. |
| comentarios | texto DICF | helper sí | `cliente_comentarios` | no | no | no | OUT_OF_SCOPE | Declaración ≠ causa. |
| PRE_CLOSE risks | 6 `risk_code` | sí en composer | `deriveRisksAndGaps` | sí | sí | RISK si disparan | AVAILABLE_AND_CONSUMED | No crear más reglas. |
| month_close | attainment / movers agosto | helper sí | `loadMonthCloseResultForChat` | no | no | no | AVAILABLE_NOT_CONSUMED | Otro periodo. No mezclar 08 y 09. |

## 6. Matriz contractual

| señal | necesita target | nivel permitido | evidencia | ¿mostrar en “preocuparme”? | motivo |
|-------|-----------------|-----------------|-----------|----------------------------|--------|
| `TARGET_MISSING_FOR_PERIOD` | n/a (es el hueco) | DATA_GAP | `igf_meta.versions` mes exacto | sí, **secundario** | Informa que no hay meta. No sustituye el diagnóstico. |
| venta to-date kg/t | no | OBSERVATION | ARR mes abierto | sí, si hay filas | Hecho. Sin meta no es DEVIATION vs meta. |
| venta vs `igf_meta.venta_ton` | sí | DEVIATION | ARR + meta mismo YYYY-MM | solo si hay meta | PERFORMANCE. Omitir si falta meta. |
| cliente perdido (kg prior>0, to-date=0) | no | OBSERVATION (+ RISK ya tipado) | ARR + `classifyClients` | sí si hay filas | Hecho/regla existente. No “por qué se fue”. Cuidado mid-month. |
| caída kg vs mes previo | no | DEVIATION | ARR mes abierto vs mes-1 | sí si hay filas | Referencia física comparable. Etiquetar to-date vs mes completo. No riesgo nuevo. |
| cliente que aumentó / new | no | OBSERVATION | mismo helper (hoy drop) | sí para “qué funciona” | Hecho. No prioridad. |
| 14d same-weekday | no | DEVIATION (día) | daily deviation | **no en este slice mínimo** | Otra pregunta / otro periodo (día). |
| M9 delta | no | DEVIATION | M9 | **no en slice mínimo** | Hay que heredar el par de periodos de M9, no mezclar. |
| `FORECAST_BELOW_TARGET` | sí | RISK | IGF + meta | solo si hay ambos | Ya tipado. |
| `FORECAST_RESULT_NEGATIVE` | no | RISK | IGF resultado < 0 | sí si hay forecast | Ya tipado. No es FINAL. |
| `REMAINING_FORECAST_DEPENDENCE` | no (sí actual+forecast) | RISK | IGF vs ARR | sí si ambos | No afirma que el remanente ocurra. |
| `COMMERCIAL_DETERIORATION` | no | RISK | trend 90d DOWN | sí si DOWN | Ya tipado. |
| `OVERDUE_ACTION` | no | OBSERVATION + RISK | Action Register | sí si overdue>0 | Operativo. No causa de venta. |
| `FORECAST_MISSING` / ARR unavailable | no | DATA_GAP | status del pack | sí, como hueco | Hoy se callan. |
| comentario / AR texto | no | OBSERVATION de declaración | DICF / items | no como causa | Nunca causa confirmada. |
| proyecto “atrasado” derivado | no | OBSERVATION derivada, no RISK | `fecha_cierre_estimada` | no todavía | Sin regla tipada. No inventar riesgo. |
| KPI / folio / gasto vs presupuesto | varía | OUT_OF_SCOPE / no comparable | M3/M6 | no | Sin referencia de planta-mes o se vuelve prioridad. |
| “principal problema” | — | prohibido | — | no ranking | Sin materialidad autorizada. |

## 7. Respuestas obligatorias

### 1. ¿Cuál es la causa exacta de la respuesta vacía?

Tres capas, en orden:

1. **Periodo:** DIAGNOSIS evalúa el **mes abierto 2026-09**. No hay `igf_meta` para ese YYYY-MM ⇒ gap `TARGET_MISSING_FOR_PERIOD`.
2. **Proyección:** DIAGNOSIS convierte ese gap en la **única OBSERVATION** y no proyecta otros gaps del pack (`FORECAST_MISSING`, `SOURCE_UNAVAILABLE`). Tampoco observa `venta_ton` sin meta.
3. **Contenido del block en el run productivo:** no dispararon lost, movers negativos, overdue, trend DOWN ni risks IGF. La sonda replica el output vacío **solo** con ARR `[]` + forecast missing + overdue 0. `TARGET_MISSING` **no apagó** esas ramas.

No es un bug de routing: las tres preguntas sí entran a DIAGNOSIS.

### 2. ¿Qué señales reales están desaprovechadas?

Ya en el pack / composer y no se ven (o se ven mal):

- `FORECAST_MISSING_FOR_PERIOD` y `SOURCE_UNAVAILABLE` (DATA_GAP).
- Venta to-date ARR como OBSERVATION sin meta.
- `classifyClients`.new y positive movers (drop en `loadCurrentSection`).
- Reviewable / `decision_needed` (no son DIAGNOSIS; no promover a riesgo).

Fuera del pack, runtime existente, otro contrato/periodo:

- 14d (`director-ia-daily-deviation.js`)
- M9 (`director-ia-m9-deltas.js`)
- month_close del mes COMPLETE (agosto)
- KPIs, proyectos, folios, gastos (M3/M2/M6)

### 3. ¿Qué señales NO deben incorporarse aún?

- Cualquier `risk_code` nuevo (“caída = riesgo”, “sin meta = riesgo principal”).
- Comentario / nota AR / steering como causa.
- 14d o M9 **sin** declarar su periodo/regla (mezclarían 14d o pares M9 con sept abierto).
- Proyectos “atrasados” derivados como RISK.
- KPI/folios/gastos como “problema de planta”.
- Ranking / PRIORITY / recomendaciones / `CAUSE_EXPLANATION`.
- Cruce agosto-meta con septiembre-ARR como si fueran el mismo attainment.

### 4. ¿Cómo debe tratarse `TARGET_MISSING_FOR_PERIOD`?

Como **DATA_GAP secundario**, no como hallazgo protagonista ni como RISK.

- Debe **seguir apareciendo** (falta el compromiso del mes).
- **No** debe vaciar ni impedir OBSERVATION/DEVIATION/RISK independientes.
- **No** habilita `SALES_BELOW_TARGET` ni `FORECAST_BELOW_TARGET` (siguen TARGET_DEPENDENT).
- Texto: hueco de información; `missing != 0`; no “el problema es que no hay meta” salvo que sea el único dato.

### 5. ¿Cuál es el slice mínimo que haría útil `¿Qué debería preocuparme?`?

**IMPL propuesto (no autorizado):** `IMPL-DIRECTOR-IA-DIAGNOSIS-INDEPENDENT-SIGNALS-001`

Solo reutilizar lo que **ya calcula** el composer, sin segundo motor de riesgo:

1. Reetiquetar `TARGET_MISSING_FOR_PERIOD` como **DATA_GAP** (no OBSERVATION protagonista).
2. Proyectar gaps ya derivados: `FORECAST_MISSING_FOR_PERIOD`, `SOURCE_UNAVAILABLE` (ARR/AR) como DATA_GAP.
3. Si `current.venta_ton` existe: OBSERVATION de venta to-date (planta, periodo, kg/t, fuente ARR), **sin** compararla a meta.
4. Dejar de tirar `new` / `top_positive_movers` en `loadCurrentSection` (o copiarlos al block) y emitirlos como OBSERVATION. Lost / neg movers / overdue / risks tipados **ya** se emiten si hay dato.
5. Etiquetar movers sept-to-date vs agosto-completo como comparación **parcial de calendario**, no como mes cerrado.
6. Tests: réplica Acapulco-sin-meta + ARR con lost/drop ⇒ no queda solo el hueco; pregunta causal sigue sin causa; no hay risk_code nuevo.

Fuera de ese mínimo: cablear 14d, M9, KPIs, proyectos, month_close agosto.

## 8. STOP

No implementación. No PRIORITY. No saludo/identidad. No Taller. No merge. No deploy. Un DONE no autoriza la siguiente tarea.
