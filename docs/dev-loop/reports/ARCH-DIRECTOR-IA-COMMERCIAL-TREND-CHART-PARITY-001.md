# Reporte — ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001

```yaml
task_id: "ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READINESS_ONLY"
implementation: false
determination: "READY_WITH_LIMITS"
selected_architecture: "B_shared_backend_engine"
selected_architecture_letter: "B"
selected_first_slice: "B_series_slope_plus_movers"
selected_first_slice_letter: "B"
new_intent: "commercial_trend"
intent_required: true
phrasebook: false
destination: "chat legado (askDirectorIa + conversation_state + planner + loader) + GET /api/arr/venta-serie delegando al mismo helper; NO Motor N1–N5; NO IES; NO Reasoning Engine; NO HTTP interno"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
expected_impl_effect: "0.0 pp unless module matrix policy independently changes"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001.md"
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
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-daily-executive-brief.js"
  - "lib/dicf-acciones.js"
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/lib/arr-categoria.ts"
  - "server.js GET /api/arr/venta-serie (~L14989–15419)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**READY_WITH_LIMITS.**

Arquitectura **B**: extraer el motor de `GET /api/arr/venta-serie` + OLS `linearTrend` a helper(s) reutilizable(s) en `lib/`. El endpoint del dashboard y el chat legado **llaman el mismo motor**.

First slice **B**: serie diaria + pendiente OLS + top-6 movers. **Sin** comentarios del gráfico.

La gráfica **ya calcula** el objeto. El chat no lo alcanza. No hay que inventar otra matemática.

**NEXT_TASK** (no autorizada, no ejecutada): `IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001`.

---

## Ejecución

- Rama: `architecture/director-ia-commercial-trend-chart-parity-001` (≠ `main`).
- HEAD: `5c0e936a Merge branch 'audit/director-ia-production-conversation-gap-009'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, commit, push, merge.

---

## Separación de verdad: backend vs frontend

### Verdad del backend (`GET /api/arr/venta-serie`, `server.js` ~L14989–15419)

| Pieza | Semántica física |
|-------|------------------|
| Authz | `dashboardBlockGAFinancialKpis` + `dashboardBlockGVForbidden` |
| Planta | Query `empresa`. Alias contra `public.plantas` + `arr.provincia_plants` + `DISTINCT plant_code` de `arr.ventas_diarias_cliente`. Match por acentos normalizados e `includes` si alias ≥ 5 chars. **No** es el matcher de desviación diaria. |
| Ancla temporal | `MAX(fecha)` / `MIN(fecha)` en `arr.ventas_diarias_cliente` para esos `plant_code`. **No** es «hoy» CDMX. |
| 1M | `end − 29` → ventana **30 días** inclusive (`fecha >= start AND fecha <= end`) |
| 3M | `end − 89` → ventana **90 días** inclusive |
| Otros tokens | `1d`, `5d`, `ytd`, `1a`, `5a`, `todo` existen. La UI los ofrece. First slice **no** los necesita. |
| Periodo previo | Misma duración, inmediatamente anterior: `prevEnd = start−1`, `prevStart = prevEnd−(spanDays−1)` |
| Canal | Query `casa\|comisionista\|ambos`. Default HTTP si omitido: `ambos`. |
| Filtro canal | `LOWER(TRIM(COALESCE(cat.canal, v.canal, 'Casa'))) LIKE '%comisionista%'` → COMISIONISTA; else CASA. Override mensual: `arr.cliente_categoria_mes` (year/month/`cliente_norm`). |
| Serie venta | `ROUND(SUM(v.kg)/1000, 3)` → `venta_ton` |
| Serie descuento | `ROUND(SUM(d.monto), 2)` → `descuento_mxn` desde `arr.descuentos_diarios_cliente`. Join de canal **sin** `v.canal` (`COALESCE(cat.canal, 'Casa')`). |
| Días vacíos | Se **omiten**. Un día entra solo si `venta_ton !== 0 \|\| descuento_mxn !== 0`. **No** se rellena con cero. |
| `ambos` | Suma CASA+COMISIONISTA **en el mismo punto** (`byFecha`). **No** son dos series. **No** sirve para «compárame». |
| Movers | Por `TRIM(v.cliente_norm)`. `delta_ton = actual − previo` (3 decimales). Descarta `\|delta\| < 0.001`. Orden `\|delta_ton\|` desc. **Top 6**. Tipos: `nuevo` / `perdido` / `disminucion` / `aumento`. |
| Comentarios | `arr.cliente_comentarios`, 2 más recientes, `lower(trim(cliente_nombre))`. **Join por nombre.** Si fallan: `[]`, la serie sigue. |
| Payload | `points[]`, `clientes_top[]`, `fecha_desde/hasta`, `fecha_prev_*`, `range`, `canal`. **No** calcula OLS. **No** expone totales ni pendiente. |

### Verdad derivada solo en frontend (`ArrVentaGraficaModal.tsx`)

| Pieza | Semántica |
|-------|-----------|
| Default UI | `range=1m`, `canal=casa`. La UI **nunca** pide `ambos`. |
| `linearTrend` | OLS en L98–118. `x = i` (índice 0..n−1 de los puntos **ya filtrados**). `y = venta_ton`. `n < 2` → `null`. Sin outlier trim. Ceros de venta se conservan si el día sobrevivió (descuento ≠ 0). |
| Pendiente `b` | Toneladas **por paso de observación**, no por día calendario si hay huecos. |
| Dirección | El gráfico **no escribe** «subiendo/bajando». Solo dibuja la recta verde. El signo de `b` es la matemática de esa recta. |
| Display | `toLocaleString` 2 decimales. Los datos siguen en 3. |
| Comparación | **No existe.** Un canal a la vez. |
| Totales de rango | **No se muestran.** |
| Helper `categoriaEsComisionista` | **No** lo usa esta gráfica. Es otra regla (acentos + `startsWith`/`includes`). Paridad = SQL `LIKE '%comisionista%'`, no ese helper. |

### Qué debe vivir en el motor compartido

1. Resolución de `plant_code` **idéntica** a `venta-serie` (no reusar `queryDailySalesRows`).
2. Ventana 30/90 (y tokens de rango del endpoint).
3. Filtro de canal SQL.
4. Agregación de `points` + omisión de días nulos.
5. Top-6 movers + ventana previa.
6. OLS `linearTrend` **idéntico** (misma `x`, `y`, `n`, `denom`).

El endpoint debe **devolver** `trend: { a, b, n }` para que el frontend deje de ser autoridad de la pendiente.

Comentarios por nombre: **no** entran al helper que consume el chat. Pueden quedarse en el wrapper HTTP del dashboard.

---

## Arquitectura A/B/C/D — una sola

| | Viable | Por qué |
|---|--------|---------|
| **A** chat reimplementa | No | Segunda SQL + segundo OLS. Deriva. Viola SST. |
| **B** shared engine en `lib/` | **Sí** | El handler ya es JS inline extraíble. Mismo patrón que M9 / desviación diaria. Endpoint y chat delegan. |
| **C** HTTP interno a `/api/arr/venta-serie` | No | Helper reuse **es** viable. HTTP interno está prohibido si lo es. Authz/cookies/self-call frágiles. |
| **D** copiar `linearTrend` al chat | No | Pendiente sin serie, rango, canal ni movers. El FE seguiría siendo otra autoridad. |

**Seleccionado: B.**

Límite de B: extraer también el matcher de planta del endpoint. Si el chat usa el matcher diario (`prov_name` exacto), las series pueden no coincidir.

---

## Rangos — definición exacta (paridad con gráfica)

«Último mes» **no** es mes calendario.

«Últimos 3 meses» **no** son 3 `YYYY-MM`.

| Frase de producto | Token gráfica | Ventana física |
|-------------------|---------------|----------------|
| último mes / 1M | `1m` | 30 días calendario trailing: `[MAX(fecha)−29, MAX(fecha)]` inclusive |
| últimos 3 meses / 3M | `3m` | 90 días: `[MAX(fecha)−89, MAX(fecha)]` inclusive |

- **¿Incluye hoy?** Incluye el **último día con venta en tabla**, no necesariamente el día civil CDMX.
- **¿Hoy parcial?** Si `MAX(fecha)` es hoy, ese día entra como está. La gráfica no lo marca «abierto».
- **Rango explícito** (`del 1 de junio al 31 de agosto`, «últimos 30 días» como fechas libres): el motor **no** lo soporta. First slice **no** inventa ventanas custom. Precedencia: si el usuario da un rango que no es token de gráfica → limitación / clarificación, no otra matemática.

Director IA debe **declarar** `fecha_desde`–`fecha_hasta` y que es trailing 30/90 anclado a `MAX(fecha)`.

---

## Canal

| Slot | Normalización física |
|------|----------------------|
| `casa` | `NOT LIKE '%comisionista%'` sobre `COALESCE(cat.canal, v.canal, 'Casa')` |
| `comisionista` | `LIKE '%comisionista%'` |
| `COMISIONISTAS` | Alias de usuario → slot `comisionista`. El plural no es un tercer canal. |
| null / otro / vacío | Cae a **CASA** |
| `ambos` (API) | Serie **sumada**. No usar para comparar. |

CASA y COMISIONISTA son partición binaria y mutuamente excluyente.

Canal no soportado (p. ej. un subcanal suelto): **no** mapear en silencio.

**Unspecified** («¿Cómo vamos en el último mes?»): no silenciar a CASA (default de UI) ni usar `ambos` sumado. First slice carga **las dos** series, mismo rango, y declara ambas. Comparación de tendencia = dos pendientes, no un score nuevo.

---

## OLS exacto (la misma matemática)

```
n = points.length
si n < 2 → trend = null
x_i = i                    # índice de observación, NO día juliano
y_i = points[i].venta_ton
b = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
a = (Σy − b·Σx) / n
si |denom| < 1e-12 o no finito → null
```

| Tema | Hecho |
|------|--------|
| Unidades de `b` | ton / paso de observación |
| Mínimo | 2 puntos |
| Días faltantes | Omitidos; **no** x-gap |
| Ceros | Día con venta 0 y descuento > 0 **sí** entra (`y=0`) |
| Outliers | Se quedan |
| first-vs-last | **Prohibido** |
| «Subiendo/bajando» | Signo de `b` del motor compartido. GPT redacta. Runtime no programa «bien/mal». `b=0` o `null` → sin dirección |

---

## Top movers

| Campo | Definición |
|-------|------------|
| Identidad | `TRIM(v.cliente_norm)` — **no** `cliente_key` |
| Delta | `venta_ton_actual − venta_ton_prev` (3 decimales) |
| Referencia | Ventana previa de **igual** número de días |
| Top | 6 por `\|delta_ton\|` desc |
| Canal | El mismo filtro de la serie |
| Tipos | `nuevo` (prev≤0, actual>0); `perdido` (prev>0, actual≤0); `disminucion` (delta<0); `aumento` |

Mover ≠ causa. Contribución ≠ causa.

---

## Comentarios

Fuente física: `arr.cliente_comentarios` (`body`, `author_name`, `created_at`, `planta_id`, `is_active`).

Join de la gráfica: `lower(trim(cliente_nombre))` = `cliente_norm` lowercased. **No** `cliente_key`.

Inventario Director IA (`DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`): comments/DICF **solo** por `cliente_key`. **No** join por nombre.

Por eso first slice **no** extrae comentarios al chat. Comentario ≠ causa. «¿Qué sabemos de él?» / acciones: handoff a paths existentes por `cliente_key` si se puede derivar; si no, limitación explícita. No copiar el join por nombre.

---

## Comparación CASA vs COMISIONISTAS

La UI no compara. El API `ambos` suma. Comparación defendible:

1. Dos invocaciones del **mismo** motor.
2. Mismo `range`, mismos `fecha_desde` / `fecha_hasta` (ancla de planta, no de canal).
3. Dos `b`, dos `n`, dos tops.
4. «Cuál se deteriora más» = comparar `b` (mismas unidades). **No** declarar peor por totales crudos si la pregunta es tendencia.
5. Un canal vacío: responder el otro + limitación.

---

## Intent y estado

**Un** intent: `commercial_trend`.

No crear intents por CASA / COMISIONISTA / 1M / 3M.

`commercial_state` **no** puede representar esto: es listas DICF mensuales (`dejaron` / `aumentaron`), otra matemática.

Slots (contexto, no evidencia):

- `plant` / `planta_id`
- `range` (`1m` \| `3m`)
- `channel` (`casa` \| `comisionista` \| `both`)
- `compare` (bool)
- `active_entities` (mover destacado: `display` = `cliente_norm`; `cliente_key` solo si es derivable)

Requery **cada** turno. El estado no cachea `points` ni slope.

| Turno | Effective | Pack |
|-------|-----------|------|
| ¿Cómo vamos en CASA los últimos 3 meses? | `commercial_trend` range=`3m` channel=`casa` | serie + slope + movers |
| ¿Y COMISIONISTAS? | mismo intent; hereda `3m`; channel=`comisionista` | requery |
| Compáralos. | `compare=true`; ambos canales; mismo rango | dos packs |
| ¿Quién explica la caída? | inherit; exponer movers | requery |
| Háblame del primero. | `active_entities[0]` = top mover | requery; no causa |
| ¿Qué sabemos de él? | handoff expediente/comments por `cliente_key` si existe | no name-join |
| ¿Tiene alguna acción pendiente? | handoff action-person / DICF existente | no name-join |

Colisión con brief diario: `isDailyExecutiveBriefQuestion` **rechaza** `mes`/`mensual`. «¿Cómo nos fue ayer?» sigue en brief. IMPL debe detectar tendencia/rango/canal **después** de los intents diarios y **antes** de `unknown` / `financial_diagnosis` por «caída» suelta.

Hold-outs («¿Qué tendencia trae CASA?», «¿Venimos subiendo o bajando?») son tests semánticos. No phrasebook.

---

## First slice A/B/C/D — uno solo

| | Cubre las preguntas reales | Riesgo |
|---|----------------------------|--------|
| **A** serie + slope | «cómo vamos / subiendo-bajando». **No** «quién explica». | Corta |
| **B** serie + slope + movers | 1M/3M, CASA, COMISIONISTAS, comparación, «quién mueve». | Comentarios y expediente quedan para handoff |
| **C** paridad full + comments | Copia join por nombre **o** rompe paridad de comments | Viola inventario Director IA |
| **D** framework genérico | Prohibido | Sobre-diseño |

**Seleccionado: B.**

Es la paridad matemática de la gráfica (serie, pendiente, movers) sin importar el anti-patrón de comments. No es un framework.

---

## Partial data

| Caso | Comportamiento |
|------|----------------|
| Serie ok, comments N/A | First slice: irrelevante. Dashboard: comments `[]`. |
| CASA ok, COMISIONISTA vacío | Responder CASA + limitación. |
| `n < 2` | Serie/movers si hay; tendencia ausente declarada. |
| Error de fuente | `SOURCE_ERROR`; no inventar. |
| 0 filas | Vacío ≠ cero. Misma frase de UI: no hay datos de venta diaria para el rango. |
| Día omitido | No afirmar venta 0. |

---

## Parity test (diseño; no se ejecuta aquí)

Mismo fixture, mismo `range`, mismo `canal`, misma resolución de planta:

| Campo | Tolerancia |
|-------|------------|
| `fecha_desde` / `fecha_hasta` | exacto |
| `points[].fecha` | exacto, mismo orden |
| `points[].venta_ton` | exacto a 3 decimales (`round3`) |
| `points[].descuento_mxn` | exacto a 2 decimales |
| `trend.a` / `trend.b` | mismo IEEE que `linearTrend` sobre esos `venta_ton` |
| `clientes_top` (nombre, delta, tipo, prev, actual) | exacto; orden por `\|delta\|` |
| Totales | solo si el motor los expone: `SUM(points.venta_ton)` de esos puntos, no de días omitidos |

El frontend, tras IMPL, debe dibujar la recta con `trend` del motor, no con una copia local.

---

## Runtime vs GPT

Runtime: planta, rango, canal, serie, OLS, movers, authz, provenance, ausencias.

GPT: resumen ejecutivo, qué destaca, wording de comparación, qué investigar, follow-up.

Prohibido: conclusion scripted, causa por correlación, buen/mal hardcode, first-vs-last.

Preservar: `daily_executive_brief`, desviaciones diarias, cross-metric, `commercial_state`, expediente, action-person, topic return, IGF reviewable, memoria persistente.

---

## G2 / G3

| Gate | Determinación |
|------|----------------|
| G2 | **N/A**. Extracción de matemática **ya en producto** a `lib/` + wiring de chat legado. No toca Constitución, EKE, IES, N5 ni `docs/director-ia/`. Misma clase que M9 / brief diario. |
| G3 | **N/A**. No hay contrato nuevo. Sync de inventario = tarea DOCS posterior al IMPL, no esta. |

Mover OLS del FE al payload del motor **no** es reinterpretar un contrato: es dejar de tener dos autoridades. IMPL debe eliminar la autoridad FE, no dejar dos copias.

---

## Límites (READY_WITH_LIMITS)

1. First slice **sin** comments del gráfico.
2. Rangos explícitos de calendario no existen en la gráfica.
3. Tokens `1d/5d/ytd/1a/5a/todo` existen; first slice solo `1m`/`3m`.
4. Identidad del mover = `cliente_norm`. Handoff a comments/acciones exige `cliente_key` derivable.
5. Tendencia = `venta_ton`, no descuento. El descuento viaja en el punto pero no define `b`.
6. Matcher de planta del endpoint ≠ matcher diario. El motor extrae el del gráfico.
7. Destino = chat legado, no pipeline N1–N5.

No soluciona: cliente longitudinal 3M, Taller Mayor, saludo, SEH, IGF mes cerrado, causalidad.

---

## Shared engine boundary (para IMPL)

```
lib/<helper comercial de venta-serie>     ← query + points + movers + OLS
        ↑                         ↑
server.js GET /api/arr/venta-serie    lib/director-ia-* chat loader
        ↑
ArrVentaGraficaModal (consume trend del API)
```

Sin HTTP interno. Sin SQL paralela en chat. Sin copiar `linearTrend` solo al chat.

---

## Porcentaje

10.5 / 20 = 52.5%. **0.0 pp.** Esta readiness no mide módulos.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`IMPL-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001`

Debe extraer el motor B, cablear intent `commercial_trend` (slots range/channel), first slice B, parity test del mismo fixture, y preservar el brief diario. Sin phrasebook. Sin comments-by-name. Sin first-vs-last.

STOP.
