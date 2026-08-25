# Reporte — ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001

```yaml
task_id: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "ARCHITECTURE_READINESS_ONLY"
verdict: "READY_WITH_LIMITS"
implementation: false
code_changed: false
sql_changed: false
schema_changed: false
ies_changed: false
source_architecture: "B"
composition_architecture: "B"
intent_routing: "B"
first_slice: "B"
contract_gate: "NO_NEW_G2_G3_REQUIRED_BEFORE_IMPL"
runtime_exposure_financial_actual: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
next_task_proposed: "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
next_task_authorized: false
next_task_executed: false
modules_changed: []
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001.md"
files_not_touched:
  - "lib/"
  - "server.js"
  - "test/"
  - "sql/"
  - "frontend-dashboard/"
  - "vba/"
  - "docs/director-ia/"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "Slice B no autoriza IES, UI histórica, intent nuevo ni pre_meeting."
  - "52.5% no cambia (0.0 pp)."
```

## Resultado

**READY_WITH_LIMITS.**

Director IA debe leer ACTUAL_FINANCIAL con un **loader crudo compartido** de la única versión `FINAL` GLOBAL del YYYY-MM (`igf.versions` + fila `compromiso_lines` persistida). **No** el GET de forecast. `month_close_result` compone esa evidencia con ARR, `igf_meta` e IGF latest (FORECAST). Intent canónico: **sigue siendo `month_close_result`**. Primer slice: **loader + `financial.actual` en month_close**. IES no se toca.

## 1. Source architecture — **B**

| Opción | Veredicto |
|--------|-----------|
| A — reutilizar `GET /api/dashboard/igf-forecast` | **Rechazada.** `buildIgfForecastPayload` pisa venta (ARR/PROY), `com_desc_kg` (PROY abierto), `gasto_kg` (presupuesto+folios), `inversiones_kg` (Folios mes actual), `util_oper_*` / `resultado_final_*` (`recalcularUtilYResultado`), y normaliza signo de `hg_kg`. Eso es RUNTIME_COMPUTED. |
| **B — shared backend RAW FINAL loader** | **Seleccionada.** `SELECT *` de `compromiso_lines` de la versión FINAL. In-process. Sin HTTP interno. Una verdad. |
| C — SQL privado en Director IA | **Rechazada.** Duplica la selección FINAL. |
| D — snapshot/materialización nueva | **Rechazada.** Sobre-arquitectura. La evidencia ya está persistida. |

`loadIgfCommitSnapshot` hoy lee **raw** líneas pero elige `ORDER BY version_number DESC` (latest). **Reutilizar el patrón de lectura de filas, no la función.** Un loader nuevo (p. ej. en `lib/` junto a finalización) selecciona `financial_state = 'FINAL'`.

Prohibido: HTTP interno al GET; pasar por `buildIgfForecastPayload`; usar `resolveIgfGlobalVersion`.

## 2. Composition architecture — **B**

| Opción | Veredicto |
|--------|-----------|
| A — read model monolítico de cierre | **Rechazada.** Mezcla ownership (Finanzas + ARR + meta). |
| **B — loader FINAL + composición superior** | **Seleccionada.** |
| C — loader privado de month_close | **Rechazada.** Impide reuso futuro (pre_meeting). |

**Raw loader:** solo evidencia FINAL FINANCE_PROVIDED + provenance + field origin + códigos de ausencia del loader.

**`month_close_result`:** consume el loader y compone, etiquetado:

- ACTUAL_FINANCIAL (FINAL stored)
- ACTUAL_COMMERCIAL (ARR)
- TARGET_COMMITMENT (`igf_meta`)
- FORECAST (IGF **latest** vía `loadIgfCommitSnapshot` — no cambiar esa semántica)

FORECAST ≠ FINAL. El pack de forecast **sigue** latest. El pack de actual **solo** FINAL.

## 3. Field catalog (stored `compromiso_lines`)

VBA `ModIgfBuildInsertCompromiso` persiste exactamente estos campos desde Excel. GET puede pisarlos **después**. ACTUAL_FINANCIAL usa **stored**, no GET.

| Campo | Clasificación | Evidencia |
|-------|---------------|-----------|
| `venta_ton` | **FINANCE_PROVIDED** | VBA. GET cerrado → ARR; abierto → PROY. |
| `margen_kg` | **FINANCE_PROVIDED** | VBA. GET no pisa. |
| `com_desc_kg` | **FINANCE_PROVIDED** | VBA. GET abierto → PROY. Cerrado: stored. |
| `gasto_kg` | **FINANCE_PROVIDED** | VBA. GET = presupuesto+folios. |
| `impuesto_kg` | **FINANCE_PROVIDED** | VBA. GET no pisa. |
| `hg_pct` | **FINANCE_PROVIDED** | VBA. PATCH solo FORECAST; FINAL congelado. |
| `hg_kg` | **FINANCE_PROVIDED** | VBA stored. GET puede invertir signo para display = RUNTIME_COMPUTED. El loader **no** aplica esa normalización. |
| `bancos_planta_kg` | **FINANCE_PROVIDED** | VBA. GET no pisa. |
| `provision_planta_kg` | **FINANCE_PROVIDED** | VBA. GET no pisa. |
| `util_oper_kg` | **FINANCE_PROVIDED** | VBA stored. GET recalcula; shadow `*_igf`. |
| `util_oper_importe` | **FINANCE_PROVIDED** | Igual. |
| `gtos_apoyos_corp_kg` | **FINANCE_PROVIDED** | VBA. GET no overlay Folios. |
| `bancos_corp_kg` | **FINANCE_PROVIDED** | VBA. GET no pisa. |
| `otros_programas_kg` | **FINANCE_PROVIDED** | VBA. GET no pisa. |
| `inversiones_kg` | **FINANCE_PROVIDED** | VBA stored. GET mes actual → Folios. |
| `resultado_final_kg` | **FINANCE_PROVIDED** | VBA stored. GET recalcula. |
| `resultado_final_importe` | **FINANCE_PROVIDED** | Igual. |

Ninguno de la lista es AMBIGUOUS como stored. GET-only (`presupuesto_kg`, `folios_*`, `deposito_cierre_kg`) = **NOT_FINANCE_PROVIDED** (no están en el INSERT VBA).

`FINAL` **no** convierte un recálculo en FINANCE_PROVIDED. El loader **no** llama `recalcularUtilYResultado`.

## 4. FINAL selection

Para exact `year` + `month` (`America/Mexico_City` solo como calendario pedido; no “mes visible”):

```
igf.versions
  plant_code = 'GLOBAL'
  year = $y
  month = $m
  financial_state = 'FINAL'
```

| Filas FINAL | Otras versiones | Código |
|-------------|-----------------|--------|
| 0 | 0 | `FINANCIAL_ACTUAL_MISSING_FOR_PERIOD` |
| 0 | ≥1 | `FINANCIAL_ACTUAL_NOT_FINAL` |
| 1 | * | OK (authoritative) |
| ≥2 | * | `FINANCIAL_ACTUAL_VERSION_AMBIGUOUS` (fail closed; el unique debería impedir esto) |

Prohibido: latest, `MAX(version_number)`, `is_current`, mes transcurrido, ARR complete, `version_as_of_corte`.

SUPERSEDED no es default. Comparación FORECAST vs FINAL = composición explícita, no este loader.

## 5. Plant / empresa mapping

Reusar `findIgfRowForPlant` (patrón canónico existente). Authz sobre `planta_id` **antes** de devolver la línea.

- Sin fila `empresa` para la planta: fail closed de esa planta (`FINANCIAL_ACTUAL_LINE_NOT_FOUND_FOR_PLANT`). No TOTALES. No otra empresa.
- No inventar join fuzzy nuevo.

## 6. Authz (backend)

**No** heredar `acceso_igf_forecast_kpis`.

| Actor | VIEW ACTUAL_FINANCIAL |
|-------|------------------------|
| ZP (+ aliases dashboard existentes) | ALL_PLANTS |
| AD | ALL_PLANTS |
| GG | ASSIGNED_PLANTS (`plantas_permitidas`) |
| GA, GV, CF_CDMX, CDMX, ZC, GO, SG, SEH, resto | DENY |
| USUARIOS | no es rol; deny |

Fail closed. Sin token / sin `planta_id` / GG fuera de lista → `FINANCIAL_ACTUAL_UNAUTHORIZED` ≠ missing. No frontend-only. No privilegio por conversation state.

## 7. Reconciliation

ARR = ACTUAL_COMMERCIAL. `venta_ton` stored FINAL = FINANCE_PROVIDED.

No hay tolerancia gobernada en el repo. **No se inventa.** Comparar toneladas (ARR `SUM(kg)/1000` vs stored `venta_ton`) con la misma coerción numérica que month_close. Distintos → `FINANCIAL_ACTUAL_RECONCILIATION_GAP`. Conservar ambos. GPT no elige.

El **loader crudo no compara ARR**. El gap pertenece a la **composición**.

## 8. Failure codes

| Código | Capa |
|--------|------|
| `FINANCIAL_ACTUAL_UNAUTHORIZED` | loader (antes de SQL de negocio) |
| `FINANCIAL_ACTUAL_MISSING_FOR_PERIOD` | loader |
| `FINANCIAL_ACTUAL_NOT_FINAL` | loader |
| `FINANCIAL_ACTUAL_VERSION_AMBIGUOUS` | loader |
| `FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE` | loader (error técnico) |
| `FINANCIAL_ACTUAL_LINE_NOT_FOUND_FOR_PLANT` | loader (FINAL existe; no hay fila empresa) |
| `FINANCIAL_ACTUAL_RECONCILIATION_GAP` | composición |

unauthorized ≠ missing. not_final ≠ forecast. missing ≠ 0.

## 9. Provenance (obligatorio en el pack del loader)

`truth_class=ACTUAL_FINANCIAL`, `source_owner=FINANZAS`, year, month, `version_id`, `version_number`, `financial_state=FINAL`, `finalized_at`, `finalized_by`, empresa, plant identity, field origin por campo, persistencia `igf.versions`+`igf.compromiso_lines`.

Opcional: `created_at` (upload ≠ as-of de negocio), `superseded_by` N/A en FINAL vigente.

## 10. Intent / routing — **B**

| Opción | Veredicto |
|--------|-----------|
| A — intent `financial_actual` nuevo | **Rechazada** en el first slice. Duplica cierre ejecutivo. |
| **B — `month_close_result` canónico consume actual** | **Seleccionada.** |
| C — reusar intent IGF | **Rechazada.** IGF = latest FORECAST / composición. Cambiaría truth semantics. |

Preguntas:

- «¿Cuál fue la utilidad operativa real de julio?» → month_close + `util_oper_*` stored FINAL
- «¿Cuál fue el resultado final real?» → `resultado_final_*` stored FINAL
- «¿Cómo quedamos realmente contra la meta?» → actual vs `igf_meta`
- «¿Qué diferencia hubo entre forecast y cierre?» → FINAL vs latest FORECAST, etiquetado

Mes abierto / sin FINAL: forecast path intacto; `financial.actual` = NOT_FINAL / unsupported. No caer a forecast.

Follow-up «¿por qué?»: variance ≠ cause. Sin evidencia causal aparte, no inferir.

## 11. First implementation slice — **B**

| Opción | Veredicto |
|--------|-----------|
| A — solo loader | Sin valor ejecutivo en chat. |
| **B — loader + month_close `financial.actual`** | **Seleccionada.** |
| C — B + pre_meeting | Amplía demasiado. |
| D — todo (UI histórica, intent nuevo) | Fuera. |

Slice B: loader + authz + field origin + fallos + month_close consume y reconcilia ARR. Sin selector histórico. Sin IES. Sin pre_meeting P&L.

## 12. IES

**No integrar.** Solo runtime legado Director IA. No se afirma pipeline constitucional.

## 13. Contract gate

| Fuente | ¿Bloquea IMPL slice B? |
|--------|------------------------|
| G3 v1.0 | No. Ya define clase, orígenes, fallos, reconciliación, no IES. |
| Index 1.10 | No. Runtime PENDING es exactamente lo que el IMPL abre. |
| EKE §7 | No. Cinco clases ya separadas. |
| Capacidades | No. Inventario NOT_YET_SUPPORTED; sync documental **después** del IMPL. |
| DECISION AUTHZ | No. VIEW/FINALIZE ya RESOLVED. |

G3 §15 pedía decisión AUTHZ **antes de exponer**. Esa decisión existe. **No se requiere G2/G3 nuevo antes del IMPL** del slice B.

Post-IMPL: un DOCS de inventario (Capabilities: first-slice supported; IES sigue PENDING). No es gate de este ARCH.

## 14. Read model shape (loader)

```
identity: plant, empresa, year, month
finalization: version_id, version_number, FINAL, finalized_at, finalized_by
finance_provided: map campo → { value, origin: FINANCE_PROVIDED }
limitations / status codes
```

No incluye ARR, meta, forecast, GET overlays.

## 15. Limits (por eso READY_WITH_LIMITS, no READY)

- Frontend histórico MISSING; el loader usa YYYY-MM explícito.
- GET latest operativo no cambia.
- Fin de mes puede ser PROY ≠ FINAL.
- `findIgfRowForPlant` es el matcher existente (contains); no se rediseña.
- Sin tolerancia ARR vs venta Finanzas.
- Deadlock FINALIZE vs SUPERSEDE (preexistente).
- IES / RE / pre_meeting / UI / VBA fuera.
- 018/019 pueden faltar en un entorno si `ensureSchema` falló (SOURCE_UNAVAILABLE).

## 16. Tests futuros (no escritos)

Loader: FINAL exacto; NOT_FINAL; MISSING; AMBIGUOUS; ZP/AD; GG assigned/deny; resto deny; stored ≠ GET; field origin; no `recalcularUtilYResultado`.

Composición: venta igual / GAP; actual vs target; actual vs forecast; target missing partial.

Routing: cierre real → month_close; mes abierto → forecast; WHY ≠ causa.

Regresión: IGF, ARR, month_close, pre_meeting, suite Director IA.

## 17. Percentage

10.5 / 20 = **52.5%**. Delta **0.0 pp.** Matriz no cambia. Este ARCH no crea capability runtime.

## 18. Exactly one NEXT_TASK

`IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001`

Implementar slice B únicamente. No autorizada. No ejecutada.

STOP.
