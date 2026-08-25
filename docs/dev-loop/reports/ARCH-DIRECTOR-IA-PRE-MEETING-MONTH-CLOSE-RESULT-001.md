# Reporte — ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001

```yaml
task_id: "ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READINESS_ONLY"
implementation: false
determination: "READY_WITH_LIMITS"
canonical_sales_target: false
canonical_sales_target_declaration: "NO existe meta mensual canónica de venta por planta en las fuentes actuales."
monthly_sales_actual_source: "arr.ventas_diarias_cliente SUM(kg) por plant_code + mes calendario"
channel_mix_source: "arr.ventas_diarias_cliente.canal (+ arr.cliente_categoria_mes mismo mes)"
monthly_discount_source: "SUM(arr.descuentos_diarios_cliente.monto) / SUM(arr.ventas_diarias_cliente.kg) mismo mes/planta"
new_lost_source: "actual kg MoM from monthly buckets; DICF lists are forecast-income classes, not closed-month actual"
financial_actual: false
igf_class: "FORECAST"
arr_forecast_mensual_class: "DERIVED_MODEL"
igf_meta_class: "FORECAST (workbook META Global; not sales target)"
selected_architecture: "B_month_close_read_model"
selected_architecture_letter: "B"
selected_first_slice: "C_month_close_core"
selected_first_slice_letter: "C"
canonical_intent: "month_close_result"
intent_required: true
igf_overloaded: false
commercial_trend_overloaded: false
pre_meeting_overloaded: false
pre_meeting_handoff: true
persistence: false
internal_http: false
plaud_runtime: false
plaud_as_truth: false
new_sql: false
new_schema: false
target_creation: false
accounting_source_creation: false
new_thresholds: false
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This readiness is not module coverage. 52.5% unchanged. 0.0 pp."
destination: "chat legado (planner + conversation_state + in-process orchestrator); NO Motor N1–N5; NO IES; NO Reasoning Engine"
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
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-CLOSE-MEETING-EVAL-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-MEETING-READ-MODEL-001.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "sql/arr_forecast_schema.sql"
  - "sql/012_igf_meta_global.sql"
  - "lib/dicf.js"
  - "lib/dicf-acciones.js"
  - "lib/director-ia-client-profile.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-commercial-state.js"
  - "lib/director-ia-commercial-trend.js"
  - "lib/director-ia-pre-meeting.js"
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-planner.js"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
  - "G2/G3/G8 de esta ARCH: N/A. El IMPL no edita docs/director-ia/."
  - "No crear meta. No tratar IGF ni forecast_mensual como meta."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.**

Existe un objeto mensual de cierre **defendible** con venta actual, mix CASA/COMISIONISTA, descuento/kg = `SUM(monto)/SUM(kg)`, movers y new/lost por kg, acciones y huecos. **No** existe meta mensual canónica de venta. **No** existe resultado financiero actual de cierre. IGF es **FORECAST**. ARR `forecast_mensual` es **DERIVED_MODEL**.

Arquitectura **B**: read model estructurado `month_close_result`. No persistir. No sobrecargar IGF ni `commercial_trend` ni el pack abierto de `pre_meeting_brief`.

First slice **C — month-close core**: ventas + canales + descuento + clientes + IGF etiquetado como proyección (si hay versión) + acciones + information gaps. Meta y financial actual **omitidos** (no existen). Limitation explícita en ambos.

**NEXT_TASK** (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001`.

---

## Ejecución

- Rama: `architecture/director-ia-pre-meeting-month-close-result-001` (≠ `main`).
- HEAD: `56df6262 Merge branch 'audit/director-ia-plaud-close-meeting-eval-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, SQL, schema, contratos, Plaud, matriz, commit, push, merge.

---

## 1. Meta de venta — búsqueda repo-wide

Se buscó en `lib/`, `sql/`, `server.js`, `frontend-dashboard/`, `config`, queries y nombres: `meta_venta`, `metas`, `objetivo`, `target`, `presupuesto`, `forecast`, `ARR`, `IGF`.

| Candidato | Qué es | ¿Meta de venta? |
|-----------|--------|-----------------|
| `meta_venta` / `objetivo_venta` / `kg_meta` | **No hay** tabla, columna ni loader | No |
| `cumple_meta_mensual` | Mejora Continua: `evidencias_mes > 0` | No. Meta de evidencias, no de kg |
| `arr.forecast_mensual` | Salida de `calcular_forecast_mensual` (DOW × días) | **FORECAST / DERIVED_MODEL**. Prohibido usarlo como meta |
| `igf.compromiso_lines.venta_ton` | Compromiso/forecast IGF de la versión del mes | **FORECAST**. Prohibido usarlo como meta |
| `igf_meta.meta_lines` | Workbook «IGF META Global» (`Subir_IGF_META_Global`) | Mismo tipo de snapshot financiero. El nombre META es de plantilla Excel, **no** objetivo de venta |
| `igf_metahg` | Hoja METAHG | Categorías financieras, no meta kg |
| `presupuesto_kg` (línea IGF) | Partida $/kg del compromiso | No es meta de toneladas |
| `venta-proyeccion-mes` / ARR lookback | Regla 14d × DOW | **DERIVED_MODEL** |
| `vtaAnioAnterior` (export Evaluación) | Venta año anterior | No es meta |
| Números dichos en Plaud | Evaluación only | Prohibido como runtime truth |
| Hardcode | — | Prohibido |

**Declaración:** **NO** existe una meta mensual canónica de venta por planta.

No hay grain, periodo, version ni owner de meta, porque la fuente no existe.

Política: el read model **dice** que no hay meta canónica en las fuentes actuales. **No** inventa delta vs meta. **No** usa forecast, mes anterior, Plaud ni hardcode como meta.

---

## 2. Venta mensual real (ACTUAL)

| Campo | Valor |
|-------|--------|
| Fuente física | `arr.ventas_diarias_cliente` |
| Agregación | `SUM(kg)` |
| Scope | `plant_code` de la planta autorizada |
| Periodo | mes calendario (`fecha` ∈ [YYYY-MM-01, último día]) |
| Unidad | kg; ton = kg/1000 solo para display |
| Canal | columna `canal` (`Casa` / `Comisionista`); overlay `arr.cliente_categoria_mes` del **mismo** year/month |
| ¿Ya existe loader? | Sí, a grano cliente: `queryMonthlySales` en `lib/director-ia-client-profile.js`. El mes-cierre suma esas filas a planta |
| No usar como canónico | `arr.venta_toneladas_diarias_provincia` (ton **enteras** redondeadas, sin canal) |
| No usar como canónico | `arr.forecast_mensual.kg_actual` (snapshot del job de forecast) |

**Clase:** `ACTUAL`.

Cierre / inmutabilidad: **no hay** marcador `closed`/`final` en las tablas diarias. Un mes anterior al mes CDMX se etiqueta `COMPLETE` (mismo criterio que `client_profile`). `COMPLETE` ≠ cierre contable. Las recargas de ARR pueden alterar historia. Eso se declara como limitation, no se oculta.

---

## 3. Channel mix (mismo mes)

| Canal | Fuente | Share |
|-------|--------|--------|
| CASA | `SUM(kg)` donde canal canónico = Casa | CASA / total |
| COMISIONISTA | `SUM(kg)` donde canal = Comisionista | COMISIONISTA / total |
| Total | suma de ambos | 100% si total > 0 |

Mismo mes, misma planta, misma fuente que la venta actual. Comparación vs mes previo **válida** si ambos meses tienen filas. `commercial_trend` 30/90 **no** es este grano.

---

## 4. Descuento mensual

Fórmula obligatoria:

`discount_per_kg = SUM(monto) / SUM(kg)` del mismo mes/planta.

- Monto: `arr.descuentos_diarios_cliente`
- Kg: `arr.ventas_diarias_cliente`
- **No** average-of-averages. **No** promedio de ratios diarios de `arr.descuento_por_kilo_diario_provincia`
- `arr.descuentos_diarios_cliente` **no** trae canal en el schema. Split por canal: join `arr.cliente_categoria_mes` (year/month/cliente_norm) del **mismo** mes
- Si `SUM(kg) <= 0`: no hay ratio; limitation, no cero inventado

`client_profile` ya implementa esta fórmula a grano cliente/mes. El mes-cierre la aplica a planta (y opcionalmente por canal).

**Clase:** `ACTUAL` (ratio derivado de dos actuals). No es forecast.

`arr.forecast_mensual.desc_kg_forecast` = **FORECAST/DERIVED**. No mezclar.

---

## 5. Clientes — DICF y `cliente_key`

### Definiciones DICF (`lib/dicf.js`)

```
es_dejaron = ingreso_anterior > 0 && ingreso_forecast <= 0 && kg_mes_real <= 0
es_nuevo   = ingreso_anterior <= 0 && ingreso_forecast > 0
```

`ingreso_*` = `kg * (margen_IGF − |descuento|)`. Es **ingreso de modelo**, no ingreso actual. `client_profile` ya marca `income_actual_unsupported`.

`computeDicf` se ancla a `MAX(fecha)` de ventas. **No** acepta un YYYY-MM de cierre pedido. Escribe `arr.dicf_cliente_mes` (y guarda `es_dejaron` en la columna `es_recuperable` — trampa de nombre).

`loadCommercialStateForChat` llama `computeDicf` (puede escribir cache). `plant_diagnosis` lee `arr.dicf_cliente_mes` SELECT-only.

### `cliente_key`

```
buildClienteKey(plantaId, grupoTipo, canal, subcanal, clienteNombre)
= plantaId|grupo|canal|subcanal|nombre   (normalizado NFD/lower/spaces)
```

DICF lista por `cliente_norm`. Comments/acciones se unen por `cliente_key`, no por nombre. Mover ≠ causa. Comentario ≠ causa.

### First slice

Listas **defendibles de cierre** = new/lost/movers por **kg actual** mes vs mes previo, mismas buckets que la venta:

- new: kg previo ≤ 0 y kg mes > 0
- lost: kg previo > 0 y kg mes ≤ 0
- movers: mayor |Δ kg| mes vs previo

Si existe fila `dicf_cliente_mes` del YYYY-MM pedido, puede **anexarse** como clase DICF (forecast-income), etiquetada aparte. **No** sustituye las listas de kg actual. **No** llamar `computeDicf` como si fuera el mes cerrado pedido.

---

## 6. Financiero — no mezclar clases

| Objeto | Fuente | Clase |
|--------|--------|--------|
| Venta kg mes | `arr.ventas_diarias_cliente` | **ACTUAL** |
| Mix / descuento/kg | mismas tablas diarias | **ACTUAL** / ratio de actuals |
| Meta kg | no existe | — |
| `igf.compromiso_lines` (`venta_ton`, `margen_kg`, `util_oper_*`, `resultado_final_*`, `com_desc_kg`) | versión GLOBAL year/month, `ORDER BY version_number DESC` | **FORECAST** (compromiso/snapshot). COMPOSICIÓN ≠ CAUSALIDAD. No es cierre real |
| `getMargenKgPorPeriodo` | promedio ponderado de `margen_kg` IGF | **FORECAST** |
| M9 deltas de margen | dos snapshots IGF | **FORECAST vs FORECAST** |
| ARR proyección / `forecast_mensual` | motor 14d × DOW | **DERIVED_MODEL** |
| `igf_meta` / `igf_metahg` | workbooks META/METAHG | **FORECAST**; no meta de venta |
| Overlay dashboard / `recalcularUtilYResultado` | UI IGF | **DERIVED_MODEL**; chat IGF no lo ejecuta |
| Utilidad operativa / resultado final **contable** | no hay fuente | **ausente** |

`loadIgfCommitSnapshot(year, month)` **sí** puede leer un mes histórico si hay versión. Eso no convierte IGF en actual.

First slice: IGF entra **separado**, label `FORECAST` / «proyección IGF, no cierre real». Si no hay versión: sección ausente + gap. **Nunca** «utilidad real» ni «cerramos en $X».

---

## 7. Semántica de mes

| Caso | Regla |
|------|--------|
| Timezone | America/Mexico_City |
| First slice | **una** planta + **un** mes calendario |
| Default «cierre» / «mes pasado» | último mes `COMPLETE` = mes CDMX − 1 |
| Mes explícito | «mayo 2026», «junio» |
| Mes abierto CDMX | `PARTIAL`. No reutilizar semántica de cerrado |
| Marcador físico closed/final | **No existe** |
| ¿Basta la fecha? | Sí para `COMPLETE` vs `PARTIAL`. No para inmutabilidad |

`pre_meeting_brief.meeting_period` hoy es el mes **abierto**. Ese grano **no** se reutiliza en silencio para este objeto.

---

## 8. Arquitectura A/B/C/D — una sola

| Opción | Veredicto |
|--------|-----------|
| **A** prompt-compose | Rechazada. GPT reconciliaría ayer + 90d + IGF abierto. Es el fallo auditado |
| **B** structured month-close read model | **Elegida.** Alinea planta/mes/clases (actual/forecast/gap) **antes** de GPT. Read-only. Reusa loaders/SQL ya existentes. Sin persistencia |
| **C** persisted snapshot | Rechazada. No hay close marker; recargas invalidarían el snapshot; no es requisito |
| **D** solo extender pre_meeting | Rechazada. El pack es ayer+90d+IGF abierto. Mezclaría granos |

---

## 9. Intent — uno

| Candidato | Veredicto |
|-----------|-----------|
| **`month_close_result`** | **Canónico.** Mes + planta + cierre |
| `monthly_result` | Ambiguo (MTD / 90d / proyección) |
| `close_result` | Choca con `resultado_cierre` de acciones |

No sobrecargar `igf_status` (composición FORECAST) ni `commercial_trend` (30/90 trailing).

Slots: `plant`, `month` (YYYY-MM), `closed_or_open` (`COMPLETE`/`PARTIAL`).

`month_close_result` es inheritable. Standalone (IGF, CASA 90d, cliente nombrado, acciones vencidas) gana.

---

## 10. First slice A/B/C/D — uno

| Opción | Veredicto |
|--------|-----------|
| A sales only | Cubre venta/mix/descuento. Omite clientes/acciones/huecos (4/4 juntas) |
| B sales + clients | Mejor. Omite IGF-proyección y pendientes |
| **C month-close core** | **Elegida.** A+B + target **solo si** existiera (no existe → limitation) + financial **actual** solo si existiera (no existe) + IGF como **FORECAST aparte** + acciones + gaps |
| D everything | Taller, M6, cartera, CRM, suministro, equilibrio: no hay capability o no es este objeto |

C **no obliga** campos de meta ni de utilidad real.

### Read model first slice

```
identity: plant, month, COMPLETE|PARTIAL, generated_at
sales.actual_kg          ACTUAL
sales.target             ABSENT + limitation
sales.delta_vs_target    omitted
sales.vs_prior_month     ACTUAL if prior exists
channels.casa_kg / comisionista_kg / shares    ACTUAL
discount.per_kg          ACTUAL ratio
clients.new/lost/movers  ACTUAL kg MoM
clients.dicf_classes     optional, labeled FORECAST-income
financial.actual         ABSENT + limitation
financial.igf_projection FORECAST if version exists
actions                  open/closed/overdue; resultado if recorded
information_gaps         no target; no financial actual; movement without comments; IGF without causal driver; overdue without result
```

Partial-data: devolver lo que cargó + limitation por sección. Fail closed por planta.

---

## 11. «Vendimos más pero ganamos menos»

Responder **solo** si hay piezas defendibles:

| Pieza | ¿Defendible? |
|-------|----------------|
| Volumen mes vs previo | Sí, ACTUAL |
| Mix | Sí, ACTUAL kg |
| Descuento/kg | Sí, ratio ACTUAL |
| «Ganamos menos» como utilidad real | **No** |
| IGF util/margen/resultado mes vs previo | Solo como **FORECAST vs FORECAST** |

Salida segura: «estas magnitudes **co-ocurren**». Si hay IGF: «la proyección IGF de margen/utilidad se movió así». Hueco: no hay actual financiero.

Prohibido: causa, «el comisionista erosionó margen» sin margen-por-canal (no existe), turismo/autoridad/huachicol de Plaud, mover = causa.

---

## 12. Pre-meeting handoff

| Turno | Destino |
|-------|---------|
| Prepárame para la junta / pre-cierre | `pre_meeting_brief` (pack abierto; no cambia) |
| ¿Cómo cerró el mes? / cierre de junio / contra la meta / mix del mes / clientes del mes | **`month_close_result`** (requery) |
| Contra la meta | misma intent; texto: no hay meta canónica |
| Háblame del cliente X | `client_profile` |
| CASA 90 días | `commercial_trend` |
| Acciones vencidas | `action_status` |
| IGF composición / apoyos | `igf_status` / `igf_reviewable_supports` |

`pre_meeting_brief` **no absorbe** el objeto mensual. Handoff, no overload.

Authz: una planta autorizada, fail closed, sin cross-plant. Mismo patrón que `pre_meeting` / `client_profile`.

---

## 13. Plaud

Solo evidencia de evaluación (AUDIT-001). Prohibido: meta, causa o número de transcripción como verdad de runtime. Sin API, ingest ni storage.

---

## 14. G2 / G3 / G8

Consultados: Constitución, EKE, 04 IES, 05 RE.

| Gate | Determinación | Por qué |
|------|---------------|---------|
| G2 | **N/A** | No se cambia Motor N1–N5, IES ni RE. Es compose de chat legado, igual que `pre_meeting_brief` |
| G3 | **N/A** | Esta tarea y el IMPL propuesto **no** editan `docs/director-ia/` |
| G8 | **N/A** | Sin umbrales nuevos, sin calibrar `k`/`wi`/materiality. Se reusan rankings y gaps existentes |

Un sync de inventario, si el humano lo quiere, es **otra** tarea DOCS. No se abre aquí.

---

## 15. Límites que no bloquean

1. No hay meta canónica → limitation, no vs-meta.
2. No hay financial actual → IGF aparte, FORECAST.
3. DICF ≠ new/lost de kg cerrado; first slice usa kg actual.
4. Sin marcador de cierre inmutable.
5. IGF histórico solo si hay `igf.versions` de ese mes.
6. Cartera, suministro, equilibrio, meta siguiente: fuera de slice.

Ninguno impide un objeto mensual **parcial y honesto**. Por eso **READY_WITH_LIMITS**, no `STOPPED` ni `BLOCKED`.

---

## 16. Porcentaje

Antes: 10.5 / 20 = 52.5%  
Después: 10.5 / 20 = 52.5%  
**0.0 pp.** No es cobertura de módulo.

---

## NEXT_TASK

`IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001`

Implementar first slice **C** con arquitectura **B** e intent `month_close_result`. No crear meta. No llamar actual al IGF. No Plaud. No autorizar ni ejecutar aquí.

STOP.
