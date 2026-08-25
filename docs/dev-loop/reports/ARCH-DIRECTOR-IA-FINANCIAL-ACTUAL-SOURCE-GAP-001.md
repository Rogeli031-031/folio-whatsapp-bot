# Reporte — ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001

```yaml
task_id: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001"
outcome: "DONE_PENDING_REVIEW"
mode: "ARCHITECTURE_GAP_READINESS_ONLY"
implementation: false
sql_execution: false
schema: false
erp_connector: false
upload: false
contract_changes: false
plaud_runtime: false
previous_state: "STOPPED — owner unknown"
human_decision: "FINANZAS + Excel mensual oficial + flujo de upload existente"
readiness: "READY_WITH_LIMITS"
preferred_strategy_selected: "A — consume already-loaded Finanzas Excel in igf.compromiso_lines"
rejected_strategies: ["C", "D"]
b_status: "NOT a new source — governance of identification is next ARCH, not a second uploader"
source_owner: "FINANZAS"
official_artifact: "Excel mensual de cierre"
physical_uploader: "VBA modIgfUpload → igf.versions + igf.compromiso_lines"
open_vs_closed_physical_flag: false
financial_actual_support: "UNSUPPORTED"
financial_actual_support_reason: "Finanzas variables are stored but untyped; no PHYSICAL finalization flag"
conversation_readiness: "CONVERSATION_BASE_READY_WITH_LIMITS"
g2: "REQUIRED for next architecture — not authorized here"
g3: "REQUIRED for next architecture — not authorized here"
g8: "N/A"
authz_followup_needed: true
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This readiness task does not measure modules. 0.0 pp."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-GAP-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "vba/"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "vba/ModIgfBuildInsertCompromiso.bas"
  - "vba/ModArrForecastUpload.bas"
  - "server.js (buildIgfForecastPayload, isIgfMesCerradoPorCorte, recalcularUtilYResultado, PATCH)"
  - "lib/dashboard-arr-forecast.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-month-close-result.js"
  - "lib/usuario-permisos.js"
  - "igf-handler.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "Authz de P&L real: no heredar acceso_igf_forecast_kpis. Decisión posterior."
  - "52.5% no cambia (0.0 pp)."
```

## PREVIOUS_STATE

**STOPPED — owner unknown.**

No se diseñó source imaginaria. Se pidió una decisión humana.

---

## HUMAN_DECISION

| Campo | Valor humano |
|-------|----------------|
| Source owner | **FINANZAS** |
| Artefacto oficial | Excel mensual de cierre entregado por Finanzas |
| Proceso | El archivo se carga al sistema/BD con el flujo de Excel ya existente |
| Significado | El archivo contiene las últimas variables financieras reales/finales del mes |
| Venta comercial | Carga diaria ARR. El último día calendario (p. ej. 31 de julio) ya trae todas las ventas del mes |
| Regla de negocio | Variables finales de Finanzas + venta completa hasta el último día → el periodo ya no es forecast intra-mes; el sistema suma el mes |

Esta reanudación **no** salta a `igf.compromiso_lines = ACTUAL_FINANCIAL`. Primero se auditó el flujo físico.

---

## Respuesta inequívoca

**READY_WITH_LIMITS.**

Ya no está STOPPED por dueño desconocido.

**CORRECTED_SOURCE_STRATEGY: A** — consumir la fuente **ya cargada** por Finanzas (Excel → `igf.versions` + `igf.compromiso_lines`). No inventar ERP ni un segundo uploader.

**FINANCIAL_ACTUAL_SUPPORT: UNSUPPORTED.**

Las variables de Finanzas **sí se persisten**. No hay flag físico que distinga `OPEN_FORECAST` de `CLOSED_ACTUAL`. Latest version ≠ actual. Calendario solo ≠ actual. Último día de venta solo ≠ actual.

`month_close_result.financial.actual` **sigue** `UNSUPPORTED_METRIC` / `NOT_FINAL` hasta la siguiente arquitectura.

---

## PHYSICAL_AUDIT

### Ejecución

- Rama: `architecture/director-ia-financial-actual-source-gap-001` (≠ `main`).
- HEAD: `0f79baa4`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Resume de la misma tarea; solo se cambió `status`.
- Inspección: VBA, `sql/`, `server.js`, `lib/director-ia-igf-arr.js`, loaders IGF, dashboard, frontend, endpoints, docs. Sin código, SQL, schema, VBA ni contratos modificados.

### 1. Qué Excel / macro / uploader recibe el archivo

| Pieza | Evidencia |
|-------|-----------|
| Macro de carga IGF | `modIgfUpload` (proyecto `IGF_Postgres_Upload`). **El módulo completo no está en este repo.** |
| Fragmento en repo | `vba/ModIgfBuildInsertCompromiso.bas` — `BuildInsertCompromiso` |
| Hoja | `"IGF Forecast"` / Compromiso (`IGF_SHEET_COMPROMISO`). Encabezados filas 6–7, datos fila 9+ |
| HTTP insert IGF | **No existe.** No hay `POST` que inserte `igf.compromiso_lines`. |
| HTTP que sí toca IGF | `GET /api/dashboard/igf-forecast` (overlay en memoria). `PATCH /api/dashboard/igf-forecast` (HG + recálculo; **escribe** util/resultado). |
| META (otro flujo) | `Subir_IGF_META_Global` → `igf_meta.*` = **TARGET_COMMITMENT**. No es este cierre. |
| ARR comercial | `Subir_ARR_Forecast` / `POST /api/arr/load` → `arr.ventas_diarias_cliente`. Distinto del Excel de Finanzas. |

### 2. Qué tablas escribe

| Destino | Quién escribe |
|---------|----------------|
| `igf.versions` | VBA `modIgfUpload` (fuera del fragmento). Columnas usadas en runtime: `id`, `plant_code='GLOBAL'`, `year`, `month`, `version_number`, `is_current`, `created_at` (ALTER en `server.js`). **Sin** `is_final`, `source_owner`, `kind`. |
| `igf.compromiso_lines` | `INSERT` del fragmento VBA: todas las columnas financieras de la hoja. |
| DDL create | **No está en `sql/`.** Pregunta pendiente del inventario. |

Un solo pipeline sirve forecast intra-mes **y** (según el humano) el Excel de cierre. Misma tabla. Mismo INSERT.

### 3–4. Variables: de dónde salen vs qué se recalcula

Clasificación **física**, no por nombre. Una fila almacenada es **payload de Excel**. Si esa versión es el cierre de Finanzas, el humano dice que son finales. El sistema **no lo etiqueta**.

| Variable | Persistida por VBA | GET dashboard (`buildIgfForecastPayload`) | Clase física defendible |
|----------|--------------------|-------------------------------------------|-------------------------|
| `venta_ton` almacenada | Celda Excel | Se **pisa**: mes abierto = PROY; mes «cerrado» por corte = ARR `SUM(kg)/1000` | Almacenada: **UNKNOWN** (Finanzas o forecast). GET cerrado: **ACTUAL_FROM_ARR**. GET abierto: **FORECAST / DERIVED_MODEL**. |
| `com_desc_kg` | Celda Excel | Mes abierto: se pisa con PROY. Mes cerrado: **se deja la celda** (no ARR descuento) | Abierto: **FORECAST**. Cerrado: **UNKNOWN** (última hoja). |
| `margen_kg` | Celda Excel | No se sustituye | **UNKNOWN** por versión (Finanzas final **o** forecast). |
| `gasto_kg` almacenada | Celda Excel | GET **recalcula** presupuesto+folios+depósito y **pisa** `gasto_kg` | GET: **DERIVED_MODEL** operativo. Stored: **UNKNOWN**. |
| `impuesto_kg` | Celda Excel | No se sustituye | **UNKNOWN** por versión. |
| `hg_pct` / `hg_kg` | Celda Excel | Signo normalizado; PATCH puede **reescribir** | **UNKNOWN**; además mutable. |
| `bancos_planta_kg` | Celda Excel | No se sustituye | **UNKNOWN** por versión. |
| `provision_planta_kg` | Celda Excel | No se sustituye | **UNKNOWN** por versión. |
| `util_oper_*` almacenada | Celda Excel | Copiada a `util_oper_*_igf`; luego **recalculada** | Stored: **UNKNOWN**. GET displayed: **DERIVED_MODEL**. |
| `gtos_apoyos_corp_kg` | Celda Excel | No sale de folios | **UNKNOWN** por versión. |
| `bancos_corp_kg` | Celda Excel | No se sustituye | **UNKNOWN** por versión. |
| `otros_programas_kg` | Celda Excel | No se sustituye | **UNKNOWN** por versión. |
| `inversiones_kg` | Celda Excel | Live Folios **solo mes actual**; mes pasado = stored | Actual mes: **operacional ≠ contable**. Mes pasado: **UNKNOWN**. |
| `resultado_final_*` | Celda Excel | Shadow `*_igf` + recálculo | Stored: **UNKNOWN**. GET displayed: **DERIVED_MODEL**. |
| `igf_meta.*` | Otro upload | No es este flujo | **TARGET_COMMITMENT**. |
| ARR `ventas_diarias_*` | Carga diaria | Suma de mes si corte > último día | **ACTUAL comercial / ACTUAL_FROM_ARR**. |
| `arr.forecast_mensual` | Modelo | — | **DERIVED_MODEL**. |

Chat (`loadIgfCommitSnapshot`): `ORDER BY version_number DESC LIMIT 1` + `SELECT *`. **Sin** corte, **sin** overlay ARR, **sin** recálculo. Lee el payload crudo. Tampoco prueba que sea cierre.

### 5. Cómo ARR sustituye `venta_ton`

Solo en `buildIgfForecastPayload` / mini, si `isIgfMesCerradoPorCorte`:

`getVentaRealTonProvinciaByPlant` = `SUM(arr.ventas_diarias_cliente.kg)/1000` del 1 al último día del mes.

No pisa `margen_kg` ni el resto. No pisa `com_desc_kg` en mes cerrado.

### 6. Qué ocurre con venta del último día del mes

**Código ≠ regla humana.**

`isIgfMesCerradoPorCorte`: corte **dentro** del mes, **incluido el último día** (31/07) → mes **abierto** → venta/desc = **PROY**.

Corte **después** del último día (p. ej. 02/08 viendo julio) → «cerrado» → **solo** `venta_ton` = ARR.

Cargar el 31 **no** convierte el GET en actual. El sistema **no** «suma el mes» para IGF el último día; sigue proyectando.

La regla humana (último día + variables finales = ya no forecast) **no está almacenada ni implementada** como finalización.

### 7. Estado / version / finalización explícito

| Mecanismo | ¿Finalización de cierre? |
|-----------|---------------------------|
| `version_number` | Secuencia de uploads del mes. Latest ≠ close. |
| `is_current` | WhatsApp (`igf-handler`) = versión GLOBAL vigente. **No** es `FINAL` de un YYYY-MM. |
| `created_at` | Timestamp de fila. No es aprobación. |
| `version_as_of_corte` | As-of de lectura dashboard (`created_at` ≤ corte). Forecast histórico, no sello de cierre. |
| `is_final` / `source=FINANZAS` / `kind` | **No existen.** |

**Finalización = procedimiento humano, no flag físico.**

### 8. ¿OPEN_FORECAST vs CLOSED_ACTUAL?

**No.** No hay forma físicamente defendible.

El GET tiene un proxy de **calendario de corte** que solo cambia venta. Eso no es `CLOSED_ACTUAL`.

---

## Pregunta crítica (probada)

Cuando el mes llega al último día y están todas las ventas ARR:

**Físicamente, solo `venta_ton` del GET (y solo si el corte ya es *posterior* al mes) pasa a ARR real.**

Las demás variables **no** se reemplazan por un actual distinto. Quedan la **última hoja subida**.

Si esa hoja **fue** el Excel de cierre de Finanzas, esas celdas **son** los números de Finanzas — pero el sistema **no puede probarlo**.

Si la última hoja fue un forecast intra-mes, esas celdas **siguen siendo forecast**.

`util_oper` / `resultado_final` **mostrados** por GET **no** son el Excel: se recalculan con Folios/presupuesto.

Por tanto: **no** se reclasifica `igf.compromiso_lines` entero como `ACTUAL_FINANCIAL`.

---

## FINALIZATION_SEMANTICS

`FINANCIAL_ACTUAL_FINAL` **no** se puede afirmar hoy.

Condiciones que el sistema **sí** puede observar (ninguna basta sola):

- Existe `igf.versions` GLOBAL para ese YYYY-MM
- Existe ARR con `MAX(fecha)` ≥ último día del mes (venta comercial completa)
- Corte de lectura > último día (solo cambia overlay de venta en dashboard)

Condiciones que el humano pide y el sistema **no** almacena:

- «Esta versión es el Excel de cierre de Finanzas»
- source_owner = FINANZAS
- approved / final

**Prohibido inventar:** fecha calendario = actual; último día de venta = actual; latest version = actual.

Candidato futuro (siguiente ARCH, no schema aquí): identificar la versión de cierre **sin** crear una fuente nueva. Hasta entonces: `NOT_FINAL`.

---

## CORRECTED_SOURCE_STRATEGY (A/B/C/D)

| Opción | Veredicto |
|--------|-----------|
| **A — consumir la fuente ya cargada** | **Seleccionada.** Finanzas + Excel + VBA ya escriben `igf.compromiso_lines`. No hay ERP aparte. No inventar tabla nueva. |
| B — nuevo upload gobernado | **No.** El flujo ya es el artefacto. Gobernar *identificación* de la versión de cierre es la **siguiente** ARCH, no un segundo source. |
| C | **Rechazada.** ARR+Folios no reconstruyen P&L. |
| D | **Rechazada.** Latest IGF ≠ actual automático. El Excel ARR que llama «cierre real» a IGF histórico sigue siendo copia, no flag. |

Clases que se mantienen:

| Clase | Source |
|-------|--------|
| ACTUAL comercial | ARR diaria |
| TARGET_COMMITMENT | `igf_meta` |
| FORECAST | IGF de mes abierto / versiones no finales |
| DERIVED_MODEL | `forecast_mensual`; overlay GET (gasto, util mostrada) |
| ACTUAL financiero | Payload Finanzas **si** la versión se identifica como cierre. Hoy: **untyped / UNSUPPORTED** |

---

## MONTH_CLOSE_RESULT / PRE_MEETING

Hoy:

- `financial.actual` = **UNSUPPORTED** (sin finalización física)
- `financial.target` = `igf_meta`
- `financial.forecast` = IGF no final / mes abierto

Futuro (solo periodos con cierre **identificado**):

- `financial.actual` = columnas **almacenadas** de esa versión Finanzas (no el util GET recalculado, salvo contrato explícito)
- venta comercial = ARR; si discrepa de `venta_ton` Excel → `FINANCIAL_ACTUAL_RECONCILIATION_GAP`
- no pisar ARR

`pre_meeting`:

- mes abierto: TARGET vs FORECAST
- mes cerrado/final **solo si** hay identificación de cierre: TARGET vs ACTUAL; FORECAST histórico opcional vía versiones anteriores / `version_as_of_corte`
- latest ≠ actual automático

---

## Códigos justificados

| Código | ¿Conservar? |
|--------|-------------|
| `FINANCIAL_ACTUAL_MISSING_FOR_PERIOD` | Sí. No hay `igf.versions` de ese YYYY-MM. |
| `FINANCIAL_ACTUAL_NOT_FINAL` | Sí. Estado por defecto mientras no haya sello físico. |
| `FINANCIAL_ACTUAL_VERSION_AMBIGUOUS` | Sí. Varias versiones; latest no es close. |
| `FINANCIAL_ACTUAL_RECONCILIATION_GAP` | Sí. Excel `venta_ton` vs ARR. |
| `FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE` | Débil. La fuente es local. Se puede omitir o reservar a error de BD. |

Missing **nunca** cae a forecast.

---

## AUTHZ

`acceso_igf_forecast_kpis` cubre IGF **forecast**. GA = false; GV = true.

P&L/resultado **real** es más sensible. **No heredar** ese permiso.

Hace falta **decisión posterior de autorización**. Esta tarea no la inventa. Fail closed; misma planta; sin cross-plant.

---

## G2 / G3 / G8

| Gate | Determinación |
|------|----------------|
| G2 | **REQUIRED** en la siguiente ARCH: nueva **clase de evidencia** `ACTUAL_FINANCIAL` sobre filas ya existentes. Constitución VII: nueva fuente (aquí: nueva clase, mismo artefacto) debe declarar observaciones → IES. |
| G3 | **REQUIRED** en la siguiente ARCH: contrato de lectura (qué versión es cierre; stored vs overlay; no-fallback). **No** se modifica `docs/director-ia/` aquí. |
| G8 | **N/A.** |

EKE / `04` / `05`: hoy el alcance actual financiero sigue `NO_CONOZCO` / no final. RE no hipotetiza utilidad real.

---

## Plaud (sin cambio de clase hoy)

A4, M1, Q1: el «cuánto» real sigue unsupported. M3 sigue sin actual por canal. Q3: movimiento ≠ efecto. WHY puede faltar aun con actual futuro.

Readiness conversacional: se reafirma `CONVERSATION_BASE_READY_WITH_LIMITS`.

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.**

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-SOURCE-001`

Diseñar (no implementar) el **contrato de lectura** de la fuente **ya cargada**:

- cómo identificar la versión de cierre Finanzas vs forecast intra-mes **sin** inventar ERP ni segundo upload
- cuándo `financial.actual` puede ser SUPPORTED
- stored Finanzas vs overlay GET vs ARR
- `NOT_FINAL` / ambiguous / reconciliation
- authz como decisión humana posterior

No autorizar. No ejecutar.

STOP.
