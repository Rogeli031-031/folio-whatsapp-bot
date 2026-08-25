# Auditoría — AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS_WITH_FINDINGS"
mode: "AUDIT"
implementation: false
code_changed: false
impl_working_tree_preserved: true
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
next_task_proposed: "FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Executive verdict

**PASS_WITH_FINDINGS.**

El loader crudo y la composición de `month_close_result` respetan, en lo esencial, ARCH B + G3 v1.0 + AUTHZ DECISION: una FINAL GLOBAL por YYYY-MM, 17 campos stored, fail closed, VIEW ZP/AD/GG, sin HTTP, sin intent nuevo, sin pre_meeting/IES, sin overwrite ARR.

No es **PASS**: el pack tiene `financial.actual.fields`, pero `formatMonthCloseContext` **no serializa** esos FINANCE_PROVIDED ni la provenance de versión hacia GPT. El modelo recibe solo `SUPPORTED` + clase. Eso no relabela forecast como actual en código; sí deja el canal ejecutivo incompleto.

No es **FAIL**: no hay leak AUTHZ a roles deny, no hay SUPERSEDED-as-actual, no hay latest/LIMIT 1, no hay reconciliación silenciosa, no hay intent `financial_actual`.

Nada se corrigió.

## 2. Scope

Sujeto: working tree de `IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001` (sin commit). Rama `implementation/director-ia-financial-actual-read-model-001` ≠ `main`. HEAD `4651e302`.

Inspección física: `lib/director-ia-financial-actual.js`, `lib/director-ia-month-close-result.js` (loader compose, routing, prompt), `lib/director-ia-capabilities.js`, `lib/director-ia-tools.js`, `test/director-ia-financial-actual.test.js`, `findIgfRowForPlant`, `dashboard-es-zp.js`, chat state, pre_meeting, IES, RE, planner. Contratos: G3 v1.0, ARCH read-model, DECISION AUTHZ. Probes de routing in-process (sin editar tests).

El auditor no usó `git restore`.

## 3. Files changed

| Archivo | Clasificación |
|---------|---------------|
| `lib/director-ia-financial-actual.js` | **AUTHORIZED** |
| `lib/director-ia-month-close-result.js` | **AUTHORIZED** |
| `test/director-ia-financial-actual.test.js` | **AUTHORIZED** |
| `lib/director-ia-capabilities.js` | **JUSTIFIED_SUPPORTING_CHANGE** (cues `isMonthCloseQuery`) |
| `lib/director-ia-tools.js` | **JUSTIFIED_SUPPORTING_CHANGE** (limitación del tool) |
| `docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001.md` | **JUSTIFIED_SUPPORTING_CHANGE** |
| `docs/dev-loop/CURRENT_TASK.md` | vigente AUDIT |

No tocados: schema `018`/`019`, FINALIZE/SUPERSEDE, VBA, UI, IES, `04`, `05`, Constitución, EKE, Index, matriz, pre_meeting P&L, planner (sin intent nuevo), chat.js, conversation-state.js, `server.js`. **Sin scope creep de producto.**

## 4. FINAL-selection audit

SQL real (`loadFinancialActualEvidence`):

```
SELECT id, version_number, financial_state, finalized_at, finalized_by, created_at
  FROM igf.versions
 WHERE plant_code = 'GLOBAL' AND year = $1::int AND month = $2::int
```

Luego `finals = rows.filter(state === 'FINAL')`. Sin `ORDER BY version_number`, sin `LIMIT 1`, sin `MAX`, sin `is_current`, sin `created_at`, sin mes transcurrido, sin ARR.

| Caso | Código | Evidencia |
|------|--------|-----------|
| A v5 FINAL + v6 FORECAST latest | v5 | filtro FINAL; test cubre version_number 1 vs 9 |
| B v5 SUPERSEDED + v6 FINAL | v6 | solo `=== "FINAL"`; **sin test explícito del par** |
| C solo FORECAST | `NOT_FINAL` | test |
| D 0 versions | `MISSING_FOR_PERIOD` | test |
| E >1 FINAL | `AMBIGUOUS` fail closed | test; no LIMIT 1 |

## 5. Stored-vs-computed audit

El loader no llama GET, axios, fetch, `buildIgfForecastPayload`, `recalcularUtilYResultado`, ni overlays ARR/PROY/folios/HG/inversiones.

`SELECT *` de `compromiso_lines` + allowlist `extractFinanceProvided`. Campos GET-only quedan fuera del objeto.

| Campo | Origen loader |
|-------|----------------|
| venta_ton … resultado_final_importe (17) | **STORED_RAW** |

Ninguno RUNTIME_COMPUTED / UNKNOWN en el loader.

## 6. Field catalog / provenance

`field_origin[key] = FINANCE_PROVIDED` para los 17. Pack SUPPORTED incluye: `truth_class=ACTUAL_FINANCIAL`, `source_owner=FINANZAS`, year, month, version_id, version_number, `FINAL`, finalized_at/by, empresa, plant, `source_persistence`. `created_at_role=upload_timestamp`. El prompt **no** presenta `created_at` como as-of.

## 7. Plant mapping audit

Versión GLOBAL. Línea vía `findIgfRowForPlant` (canónico IGF). Sin fila → `LINE_NOT_FOUND_FOR_PLANT`. No primera línea, no TOTALES (el matcher las salta).

El matcher usa igualdad y **includes** (score 5000/4000). ARCH lo autorizó como reuso; no es un join fuzzy nuevo. Riesgo residual de nombres solapados (p. ej. San Luis). Test Puebla vs Morelos existe en month_close; **no** hay test loader Puebla vs Querétaro.

## 8. Authz audit

`canViewFinancialActual` **antes** de cualquier `client.query` (L99 vs L110). Unauthorized no ejecuta SQL (test GG/GV queries=0).

| Actor | Resultado físico |
|-------|------------------|
| ZP + aliases `isDirectorZPForDashboard` (antes del role string) | ALL_PLANTS |
| AD | ALL_PLANTS (ignora `plantas_permitidas`) |
| GG + assigned | allow + SQL |
| GG + otra / lista vacía | UNAUTHORIZED; empty ≠ all plants |
| GA, GV, CF_CDMX, CDMX, GO, SG, SEH, ZC, `""`, null | deny |

Fallback JWT unknown→GG es de emisión, no de este loader. GG sin asignadas = deny.

GG authorized sí hace `SELECT *` de todas las empresas de esa FINAL y filtra en JS. No es actor deny. Grano GLOBAL. **OBSERVATION**, no leak de respuesta.

## 9. Failure semantics

Códigos distintos: UNAUTHORIZED, MISSING, NOT_FINAL, AMBIGUOUS, SOURCE_UNAVAILABLE, LINE_NOT_FOUND. Compose no pone 0 ni copia forecast. UNAUTHORIZED ≠ MISSING (test). Year/month inválido → SOURCE_UNAVAILABLE (forma débil; MINOR).

## 10. month_close composition

`composeFinancialActual` solo acepta loader `SUPPORTED`. Target = `igf_meta`. Forecast = `loadIgfCommitSnapshot` (latest, no FINAL). Tres objetos separados. Sin fallback actual←forecast/target.

## 11. Partial-data

Tests: actual+target missing; actual+forecast missing; NOT_FINAL conserva forecast etiquetado FORECAST; MISSING no inventa fields/cero; venta ARR sigue 10.

## 12. ARR reconciliation

`Number(venta_ton stored)` vs `toTon(SUM(kg))` = `kg/1000`. Ton vs ton. `!==` exacto. Sin tolerancia. Gap conserva `finance_venta_ton` + `arr_venta_ton` + clases; `overwrite: false`. Iguales → OK.

## 13. Routing audit

Probe real (no solo reporte IMPL):

| Pregunta | Intent |
|----------|--------|
| utilidad operativa real de julio | `month_close_result` |
| resultado final real / cierre financiero julio / realmente contra la meta / diferencia forecast y cierre | `month_close_result` (tests) |
| cómo va IGF / proyectamos cerrar IGF este mes | `igf_status` |
| utilidad **real** de julio (sin operativa) | **unknown** |
| cómo vamos financieramente | **unknown** |
| cómo vamos este mes | **unknown** |

Sin intent `financial_actual`. Planner no se tocó.

## 14. Historical month

`parseCloseMonth` + `resolveCloseMonth`: “utilidad operativa real de julio” → 2026-07 (probe, now 2026-08). Independiente de UI/`upload_day`. **Sin test focal** de ese YYYY-MM en el loader+pregunta.

Mes corriente + “cómo cerramos este mes” → August PARTIAL; si hay FINAL, el loader la devolvería. Sin política nueva; semántica no documentada en tests. **OBSERVATION.**

## 15. Conversation-state

State: planta, `active_period_months`, parent_intent, gap. `month_close_not_persisted: true`. Sin fields/version FINAL. Requery en cada load. Hilo no lleva P&L.

Follow-up “contra la meta” hereda. “por qué” (`kind=why`) hereda; addendum: gap ≠ causa. “y el forecast” es unknown; puede heredar por `isolatedUnknown` si el parent es month_close. **Sin test.**

## 16. pre_meeting / IES

pre_meeting solo importa `isMonthCloseQuestion` (exclusión). Sin `loadFinancialActual`. IES/RE: cero referencias. Legacy only.

## 17. Security / query

`year`/`month`/`version_id` parametrizados (`$1::int`). Sin concatenar empresa. Authz antes de SQL. Sin HTTP interno.

## 18. Test coverage matrix

| INVARIANT | TEST EXISTS | PASS | GAP |
|-----------|-------------|------|-----|
| exact FINAL | sí | sí | |
| latest FORECAST ignored | sí | sí | |
| SUPERSEDED ignored (sin FINAL) | sí | sí | |
| SUPERSEDED + nueva FINAL | no | — | GAP |
| NOT_FINAL | sí | sí | |
| MISSING | sí | sí | |
| AMBIGUOUS / no LIMIT 1 | sí | sí | |
| source failure | sí | sí | |
| ZP | sí | sí | |
| ZP aliases (subconjunto) | sí | sí | faltan DIRZP/DZP/DIR-ZP/DIRECTORZP explícitos |
| AD | sí | sí | |
| GG assigned / denied | sí | sí | |
| rest denied | sí | sí | |
| cross-plant loader Puebla/Qro | no | — | solo matcher month_close Puebla/Morelos |
| 17 raw + no GET fields | sí | sí | |
| provenance | sí | sí | |
| clases actual/target/forecast | sí | sí | |
| partial target / forecast | sí | sí | |
| NOT_FINAL no fallback | sí | sí | |
| MISSING no zero | sí | sí | |
| ARR equal / conflict / both | sí | sí | |
| routing profit/result/vs meta/vs forecast | sí | sí | |
| routing IGF unchanged | sí | sí | |
| historical YYYY-MM pregunta→loader | parcial | — | resolve existe; no e2e pregunta |
| open-month “vamos financieramente” | no | — | probe: unknown |
| prompt serializa fields | no | — | **defecto de canal** |
| pre_meeting unchanged | source | sí | |
| no IES | source | sí | |
| LINE_NOT_FOUND | no | — | |

## 19. Regression

Sin colisión IGF abierto (probes). month_close comercial default (`UNSUPPORTED` si no hay loader result) se conserva. pre_meeting/IES/planner/chat/state no ganan P&L. Finalización física no reabierta. Suite IMPL reportó 1051/0; esta AUDIT no reejecuta la suite completa (no modifica tests).

## 20. Findings by severity

### MAJOR

1. **Prompt/context no transporta FINANCE_PROVIDED.** `formatMonthCloseContext` emite `financial.actual=SUPPORTED class=ACTUAL_FINANCIAL` y no version_id, finalized_*, ni los 17 stored. GPT no puede citar “la FINAL registra utilidad X” con evidencia. Riesgo de usar ARR (`sales.actual_ton`) o inventar. No es relabel en código.

### MINOR

2. “utilidad real de julio” (sin “operativa”) no entra a month_close.  
3. Tests: par SUPERSEDED+FINAL; cross-plant loader; YYYY-MM e2e; LINE_NOT_FOUND; aliases ZP restantes; “y el forecast”.  
4. Year/month inválido → `SOURCE_UNAVAILABLE`.  
5. `context_meta.month_close` no incluye `financial.actual`.

### OBSERVATION

6. `findIgfRowForPlant` por inclusión (canónico ARCH).  
7. GG lee todas las líneas de la FINAL GLOBAL y filtra.  
8. Mes actual + FINAL si la pregunta es month_close “este mes”: se devolvería FINAL; no hay test.  
9. Addendum aún dice “first slice C”.  
10. “cómo vamos financieramente” → unknown (no afirma actual; tampoco forecast).

### CRITICAL

Ninguno.

## 21. Blocking / non-blocking

**No bloquea** la semántica del loader ni AUTHZ.  
**Sí justifica FIX** del canal GPT + huecos de routing/tests listados. No DOCS sync todavía.

## 22. Final verdict

**PASS_WITH_FINDINGS.**

## 23. Recommendation

Un FIX: serializar en el contexto de month_close los fields FINANCE_PROVIDED + provenance FINAL (sin GET). Cubrir routing “utilidad real + mes” y los tests de la matriz con GAP. No reabrir schema/AUTHZ/IES.

## 24. NEXT_TASK

`FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001`

No autorizada. No ejecutada.

STOP.
