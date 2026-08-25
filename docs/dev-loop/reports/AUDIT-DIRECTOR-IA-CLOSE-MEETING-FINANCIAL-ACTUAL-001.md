# Reporte — AUDIT-DIRECTOR-IA-CLOSE-MEETING-FINANCIAL-ACTUAL-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-CLOSE-MEETING-FINANCIAL-ACTUAL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "PHYSICAL_SOURCE_AUDIT_ONLY"
implementation: false
sql_execution: false
plaud_runtime: false
financial_actual_source_exists: "NO"
selected_class: "C"
failure_class: "MISSING_DATA"
failure_class_detail: "MISSING_PHYSICAL_DATA"
reconstruction_defensible: false
igf_remains_forecast: true
igf_closed_month_becomes_actual: false
igf_meta_class: "TARGET_COMMITMENT"
forecast_mensual_class: "DERIVED_MODEL"
arr_class: "ACTUAL commercial only"
conversation_readiness: "CONVERSATION_BASE_READY_WITH_LIMITS"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This audit does not measure modules. 0.0 pp."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLOSE-MEETING-FINANCIAL-ACTUAL-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-002.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "sql/arr_forecast_schema.sql"
  - "sql/012_igf_meta_global.sql"
  - "server.js (buildIgfForecastPayload, recalcularUtilYResultado, isIgfMesCerradoPorCorte)"
  - "lib/director-ia-m9-deltas.js (getMargenKgPorPeriodo)"
  - "lib/dicf.js"
  - "lib/forecast-mensual.js"
  - "lib/director-ia-m6-gastos-inversiones.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
  - "FINANCIAL_ACTUAL_UNSUPPORTED queda confirmado. No cablear IGF cerrado como actual."
```

## Respuesta inequívoca

**FINANCIAL ACTUAL SOURCE EXISTS: NO**

No hay tabla, vista ni loader de **resultado financiero ACTUAL** mensual por planta (utilidad operativa real, resultado final real, margen contable real).

Lo que el producto llama «Util. Oper.» / «Resultado» es un **modelo IGF (FORECAST)** con overlays operativos. Un mes cerrado **cambia la venta a ARR real**; **no** convierte el resto en cierre contable.

| Campo pedido | Source | Grain | Semántica |
|--------------|--------|-------|-----------|
| — | **ninguna** | — | No existe actual financiero |

`FINANCIAL_ACTUAL_UNSUPPORTED` queda confirmado como **`MISSING_PHYSICAL_DATA`**, no como infraestructura sin cablear.

---

## Clasificación A/B/C/D

| Candidato | ¿Aplica? |
|-----------|----------|
| A — tabla/source de ACTUAL financiero | **No.** No hay DDL ni runtime de ER/utilidad/resultado real. |
| B — reconstrucción legítima desde ACTUALES atómicos | **No.** Faltan componentes materiales. La fórmula gobernada mezcla forecast. |
| **C — solo target/forecast/model disfrazados de resultado** | **SÍ. Selección única.** |
| D — no existe fuente física | Consecuencia de C (no hay actual). No se elige D para no ocultar que IGF **parece** un resultado. |

**Seleccionado: C.**

---

## Ejecución

- Rama: `audit/director-ia-close-meeting-financial-actual-001` (≠ `main`).
- HEAD: `ad022da6 Merge branch 'audit/director-ia-plaud-close-meeting-eval-002'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- Búsqueda de repo (nombres + semántica): `util_oper`, `resultado_final`, margen, hg, ingreso, gastos, inversiones, bancos, contabilidad, ER, real/actual/cierre, IGF, ARR, `forecast_mensual`.
- Inspección: `sql/` (13 archivos), `server.js` IGF, `lib/` ARR/IGF/M6/M9/DICF, frontend IGF, docs. Sin SQL de ejecución. Sin Plaud.

No hay rastro de ERP / CONTPAQ / asiento / estado de resultados. `sql/` no crea `igf.versions` / `igf.compromiso_lines` (pregunta pendiente ya en inventario). Su semántica de producto es **Forecast / compromiso**, no actual.

---

## Clases de verdad (preservadas)

| Clase | Source | Hallazgo |
|-------|--------|----------|
| ACTUAL | ARR | Solo comercial: kg y descuento `$`. Insuficiente para utilidad operativa. |
| TARGET_COMMITMENT | `igf_meta.meta_lines` | Incluye `util_oper_*` / `resultado_final_*` como **meta**. No es actual. |
| FORECAST | `igf.compromiso_lines` + `buildIgfForecastPayload` | Proyección / compromiso. Latest version ≠ actual. |
| DERIVED_MODEL | `arr.forecast_mensual` | 14d×DOW. `kg_actual`/`desc_actual` son parciales del mes; `*_forecast` es modelo. |

---

## IGF: mes cerrado ≠ actual

`isIgfMesCerradoPorCorte` (`server.js`): corte **después** del último día del mes → «mes cerrado → **venta real**».

Eso es explícito y **acotado a venta** (y, en mes abierto, a PROY de venta/desc).

`buildIgfForecastPayload` en mes histórico:

1. Lee **latest** `igf.versions` GLOBAL + `igf.compromiso_lines`.
2. Sustituye `venta_ton` con `getVentaRealTonProvinciaByPlant` (ARR).
3. **No** sustituye `margen_kg`, `impuesto_kg`, `hg_kg`, `bancos_*`, `provision_*`, `gtos_apoyos_corp_kg`, `otros_programas_kg` por un actual.
4. Overlay en memoria: presupuesto **aprobado**, cubos de Folios, `deposito_cierre` = PAGADO+CERRADO+COMPROBACIONES+EVIDENCIAS.
5. `inversiones_kg` live **solo mes actual**; mes pasado deja el valor **almacenado en IGF**.
6. Recalcula `util_oper_*` / `resultado_final_*` con `recalcularUtilYResultado`.

`getMargenKgPorPeriodo` lee `margen_kg` de **la misma** `igf.compromiso_lines`. No es margen contable.

**No hay evidencia** de que latest version post-cierre se reclasifique a actual. El GET se sigue llamando IGF Forecast. El chat **no** usa `isIgfMesCerradoPorCorte`.

---

## ARR: ¿basta para lo financiero?

Tablas físicas (`sql/arr_forecast_schema.sql`):

| Tabla | Semántica |
|-------|-----------|
| `ventas_diarias_cliente` | ACTUAL kg |
| `descuentos_diarios_cliente` (+ desglose) | ACTUAL `$` descuento (≤ 0) |
| `hg_diario` | `%HG` diario. **Nadie lo lee** en `lib/` para util/resultado. No es P&L. |
| `forecast_mensual` | DERIVED: actual parcial + proyectado + forecast |
| provincia ton / desc kg | Agregados comerciales |

**Venta + descuento NO bastan** para afirmar utilidad operativa ni resultado final. Faltan margen de contribución real, impuesto, HG `$`, bancos, provisión, corporativos, inversiones contables.

DICF `ingreso_forecast` = `kg_forecast × (margen_IGF − \|descuento\|)`. Forecast. Ya marcado `UNSUPPORTED_METRIC` en `client_profile`.

---

## GASTOS / INVERSIONES (Folios)

Fuente: `public.folios`. Grain: planta + `mes_cargo`. Categoría UI `GASTOS` / `INVERSIONES`. `importe`. Estatus operativo (PENDIENTE_APROB_ZP, carro, PAGADO, CERRADO, …).

| Pregunta | Hallazgo |
|----------|----------|
| ¿Son actual financiero? | **No.** Son apoyos/folios operativos. |
| ¿Por planta / mes? | Sí (`planta_id`, `mes_cargo`). |
| ¿Pagado / aprobado / ejercido / causado? | Estatus de flujo. PAGADO ≠ causado contable. Aprobado ≠ ejercido. |
| ¿Mapean exactamente a IGF? | **No.** IGF `gasto_kg` = presupuesto_aprobado + ZP + carro + depósito/cierre (mezcla). `gtos_apoyos_corp_kg` **no** sale de folios de planta. Inversiones live solo mes abierto. |

Prohibido: folio `importe` = gasto contable; pagado = causado; reviewable = ahorro; forecast = actual.

Presupuesto: `presupuesto_asignacion_detalle.monto_aprobado`. Si el periodo no tiene filas, el GET IGF **cae a un periodo default**. Ni siquiera garantiza el mes pedido.

---

## Reconstrucción (candidato B) — no defendible

Fórmula gobernada (`recalcularUtilYResultado`):

`util_oper_kg = margen + com_desc + deposito_cierre − presupuesto − folios_ZP − folios_carro − impuesto − hg − bancos_planta − provision`

`resultado_final_kg = util_oper − gtos_corp − bancos_corp − otros − inversiones`

| Componente | Fuente | Planta | Mes | Semántica | Clase |
|------------|--------|--------|-----|-----------|-------|
| venta_ton (cerrado) | ARR provincia | sí | sí | kg reales | ACTUAL comercial |
| venta_ton (abierto) | Pronóstico / `forecast_mensual` | sí | sí | PROY | DERIVED / FORECAST |
| com_desc_kg (abierto) | mismo PROY | sí | sí | desc proyectado | DERIVED |
| com_desc_kg (cerrado) | fila IGF | sí | sí | tasa guardada | FORECAST |
| margen_kg | `igf.compromiso_lines` | sí | sí | tasa subida | FORECAST |
| impuesto_kg | IGF | sí | sí | tasa subida | FORECAST |
| hg_kg | IGF (PATCH posible) | sí | sí | tasa subida | FORECAST |
| bancos_planta_kg | IGF | sí | sí | tasa subida | FORECAST |
| provision_planta_kg | IGF | sí | sí | tasa subida | FORECAST |
| presupuesto_kg | `monto_aprobado` (posible **otro** periodo) | sí | **no siempre** | aprobado | TARGET / approved |
| folios_ZP / carro | `public.folios` pipeline | sí | `mes_cargo` | importe operativo no pagado | operacional ≠ contable |
| deposito_cierre_kg | Folios PAGADO+CERRADO+COMPROBACIONES+EVIDENCIAS | sí | `mes_cargo` | importe de folio | operacional ≠ causado |
| gtos_apoyos_corp_kg | IGF subido | corp | mes IGF | no folios planta | FORECAST |
| bancos_corp_kg | IGF | corp | mes IGF | tasa | FORECAST |
| otros_programas_kg | IGF | corp | mes IGF | tasa | FORECAST |
| inversiones_kg | Folios INVERSIONES (solo mes **actual**) o IGF guardado | sí | mixto | importe folio / forecast | operacional o FORECAST |

Componentes materiales **sin** ACTUAL: margen, impuesto, HG `$`, bancos, provisión, corporativos, otros, inversiones contables.

**B no es defendible.** Inventar la resta ARR−folios **sería un modelo contable nuevo**. No se inventó.

---

## Impacto

### `month_close_result`

`financial.actual = UNSUPPORTED_METRIC` es **correcto**. No hay nada que cablear. Prohibido promover IGF cerrado a actual.

### `pre_meeting_brief`

IGF del mes abierto sigue siendo FORECAST. No hay actual de cierre que añadir.

### Preguntas reales Plaud (EVAL-002)

| ID | Pregunta | Si existiera actual | Hoy |
|----|----------|---------------------|-----|
| A4 | ¿Sacrificamos volumen por rentabilidad? | Parte factual (util/margen real vs venta) | Sigue PARTIAL. FORECAST ≠ sacrificio real. |
| M1 | Vendimos más, ¿por qué cayó la rentabilidad? | El «cuánto» real; el **porqué** sigue siendo gap | GAP. Volumen ACTUAL; rentabilidad no. |
| M3 | ¿Qué canal erosiona margen? | Haría falta actual **por canal** (tampoco existe) | PARTIAL. Mix kg ≠ margen. |
| Q1 | ¿Vender más y perder dinero? | El resultado real | GAP. Misma frontera. |
| Q3 | ¿Qué efecto tuvieron descuentos? | Movimiento del ratio sí; **efecto** sobre margen real no | PARTIAL. movimiento ≠ efecto. |

Ninguna de las 5 se vuelve ANTICIPATED. M3 ni siquiera con un P&L de planta.

---

## Failure class

**`MISSING_DATA`** / **`MISSING_PHYSICAL_DATA`**.

No es `MISSING_INFRASTRUCTURE` (no hay source sin cablear).

Reconstruir exigiría **`NEW_ACCOUNTING_MODEL`**. Eso está fuera de alcance y no se propone como implementación.

---

## G2 / G3 / G8

| Gate | Determinación |
|------|----------------|
| G2 | **N/A.** No hay source actual que conectar. Crear uno o una fórmula nueva **sí** sería cambio arquitectónico; esta tarea no lo hace. |
| G3 | **N/A.** No hay contrato nuevo. Un actual financiero futuro requeriría contrato + G3 humano. |
| G8 | **N/A.** No hay calibración/firma. Materialidad de un ER no existe. |

Constitución / IES / RE: no se reinterpretaron. El chat legado no es N1–N5. Cablear IGF como actual violaría la separación de clases ya aprobada.

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.**

Readiness: se **reafirma** `CONVERSATION_BASE_READY_WITH_LIMITS`.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001`

Diseñar (no implementar) el gap: cómo Director IA debe **seguir** tratando `financial.actual` como unsupported; qué lenguaje seguro usar frente a IGF cerrado; qué **no** construir (no fórmula nueva, no relabel). Sin Plaud runtime.

STOP.
