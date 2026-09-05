# AUDIT-DIRECTOR-IA-COMMERCIAL-MOVEMENT-DASHBOARD-PARITY-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-COMMERCIAL-MOVEMENT-DASHBOARD-PARITY-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT"
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
nuevos_vs_reactivados: "NOT_IMPLEMENTED (out of scope)"
hardcoded_clients_as_fix: false
first_bad_boundary: "PERIOD"
secondary_boundaries:
  - "UNIT_LABEL"
  - "CLASSIFICATION"
  - "LIST_TRUNCATION"
next_task_proposed: ""
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
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
  - "Si se quiere atribuir kg diarios a las ventanas trailing, hace falta un G1 LIVE_DB READ-ONLY nuevo. Esta auditoría no lo pide ni lo abre."
```

## 0. Alcance ejecutado

G1 vigente: auditoría READ-ONLY. `implementation_authorized: NO`. `live_db_authorized: NO`.

Rama: `audit/director-ia-commercial-movement-dashboard-parity-001`.

Hecho:

- `status` → `IN_PROGRESS` (solo ese campo de autorización) y al cierre `DONE_PENDING_REVIEW`.
- Tracing físico de ambas cadenas en código.
- Cero SELECT. Cero writes. Cero DDL. Producto/tests/fixtures/contratos no tocados.

Las cifras humanas de los cuatro clientes son evidencia de caso, no regla de producto.

## 1. H1 — Cadena física del dashboard (Clientes por mes)

| Paso | Archivo / símbolo | Transformación |
| --- | --- | --- |
| UI | `frontend-dashboard/app/arr/ArrClient.tsx` sección «Clientes por mes» (~4732) | Columnas `Venta {mesA}`, `Venta {mesB}`, `Delta venta`. Render: `fmtNum(row.ventaA ?? 0, 0)` / `fmtNum(row.ventaB ?? 0, 0)` (`es-MX`, 0 decimales) → `19,980` kg. |
| Carga | `ensureClientesLoaded` → `fetchArrClientesMes` | Un fetch por `(empresa, YYYY-MM)`. |
| HTTP | `frontend-dashboard/lib/api.ts` `fetchArrClientesMes` | `GET /api/dashboard/arr-clientes-mes?year&month&empresa`. |
| Endpoint | `server.js` `GET /api/dashboard/arr-clientes-mes` (~14947) | Resuelve `plant_code` provincia. `historico = year/month < mes calendario actual`. Julio y agosto 2026, con fecha de esta tarea (2026-09-05), son **históricos**. |
| Helper | `lib/dashboard-arr-forecast.js` `computeClientesDescuentoMes` | Mes calendario: `firstDay`–`lastDay` (`2026-07-01`–`31`, `2026-08-01`–`31`). |
| Fuente | `arr.ventas_diarias_cliente` | `SUM(v.kg) AS kg` agrupado por `planta` + `cliente_norm`. **No divide entre 1000.** |
| Unidad UI | `clienteVenta` (~743) | Mes histórico: `row.kg_real` (kg). Mes abierto: `kg_proyectado`. Julio/agosto 2026 → **kg real**. |
| Identidad | mapa `cliente.trim()` | Una fila por nombre. **No** parte por canal. Casa+Comisionista del mismo `cliente_norm` ya vienen sumados en el SQL. |
| Delta | `deltaVenta: (ventaB ?? 0) - ventaA` (~2630) | Resta de kg calendario. La tabla **no** clasifica aumentó/disminuyó/dejó; eso lo deriva el humano de `ventaB`. `ventaB = 459` ⇒ no es “dejó de comprar”. |

Contrato de negocio actual de «Clientes por mes» para kg julio, kg agosto y delta venta:

**`computeClientesDescuentoMes` → `arr.ventas_diarias_cliente` SUM(kg) en el mes calendario, kg reales si el mes ya cerró.**

No es IGF `compromiso_lines`. No es trailing 30d. No es `computeDicf` (ingreso forecast).

## 2. H2 — Cadena física de Director IA (aumentaron / disminuyeron / dejaron de comprar)

| Paso | Archivo / símbolo | Transformación |
| --- | --- | --- |
| Planner | `lib/director-ia-planner.js` ~533 | `isCommercialTrendQuestion` gana **antes** de `commercial_state` (~599). |
| Detector | `lib/director-ia-commercial-trend.js` `isCommercialMoversQuestion` | `¿Qué clientes aumentaron/disminuyeron/dejaron de comprar?` → movers = true → `isCommercialTrendQuestion` = true. Intent: **`commercial_trend`**. |
| Periodo default | `resolveCommercialTrendSlots` (~303) | Sin «último mes/30 días/90 días» y sin «este mes/mes actual»: `period_kind = "trailing"`, `range_days = 30`, `channel = "both"`. **Nombrar julio/agosto no cambia el periodo.** `namesCalendarMonth` solo acepta `este mes` / `mes actual`. |
| Chat | `lib/director-ia-chat.js` ~4511 | `loadCommercialTrendForChat` → OpenAI con `buildCommercialTrendPrompt`. No hay builder determinista de kg calendario. |
| Motor | `lib/commercial-trend-engine.js` `loadCommercialTrend` | Ancla `MAX(fecha)` de `arr.ventas_diarias_cliente`. Ventana actual = 30 días hasta ese MAX. Ventana previa = 30 días inmediatamente anteriores. |
| Query movers | `queryClientTons` (~479) | `ROUND((SUM(v.kg) / 1000.0)::numeric, 3) AS venta_ton` por `TRIM(v.cliente_norm)`, filtrado Casa **o** Comisionista. |
| Clasificación | `selectTopMovers` (~213) | `previo>0 && actual<=0` → `perdido` («Dejó de comprar»). `delta<0` con ambos >0 → `disminucion`. Lista **Top 6** por `\|delta_ton\|`. |
| Prompt | `formatChannelBlock` | Expone `delta_ton`, `prev`, `actual` en **toneladas**. El modelo puede verbalizar «kg». |

Ruta alternativa **no usada** por esas tres preguntas en chat nuevo: `commercial_state` → `dicf.computeDicf` (clasifica por **ingreso forecast**, no por kg calendario; top 20; `kgBStr` es proyección). El planner no llega ahí si `isCommercialMoversQuestion` es verdadero.

## 3. H3 / H4 — Cuatro clientes: cadena y FIRST_BAD_BOUNDARY

Interpretación de los números de Director IA: `17.118`, `20.790`, `3.672` coinciden con `round3(kg/1000)` (`commercial-trend-engine.round3` / SQL `ROUND(..., 3)`). `fmtNum(..., 0)` del dashboard usa `es-MX` con **coma** (`19,980`). El punto decimal de Director IA no es el agrupador de miles de esa UI. Son **toneladas a 3 decimales**, a menudo etiquetadas «kg» por el LLM.

Conversión de evidencia (solo aritmética; no es SELECT):

| Cliente | Dash jul→ago kg | Dash Δ kg | DIA prev→actual | DIA Δ | Δ DIA en kg |
| --- | --- | --- | --- | --- | --- |
| 20 CUMBRES | 19980 → 23652 | +3672 | 17.118 → 20.790 | +3.672 | +3672 |
| NUEVA WAL MART DE MEXICO | 55473 → 58828 | +3354 | 56.602 → 52.698 | −3.904 | −3904 |
| GRUPO MOVE EMPRESARIAL | 168890 → 150199 | −18691 | 160.149 → 145.076 | −15.073 | −15073 |
| CARBURADORA MASTER | 6370 → 459 | −5911 | 5.803 → 0 | −5.803 | −5803 |

### 20 CUMBRES

| Eslabón | Dashboard | Director IA |
| --- | --- | --- |
| source | `arr.ventas_diarias_cliente` mes calendario | misma tabla, ventanas trailing 30d / 30d |
| period | 2026-07-01..31 vs 2026-08-01..31 | `fecha_prev_*` vs `fecha_*` ancladas a `MAX(fecha)` |
| identity | `cliente_norm` planta | `cliente_norm` **por canal** (Casa y Comi por separado) |
| aggregation | `SUM(kg)` mes | `SUM(kg)/1000` en cada ventana |
| unit | kg enteros | t a 3 decimales; label humano «kg» |
| delta | +3672 kg | +3.672 t (= +3672 kg) |
| classification | aumentó (derivado) | `aumento` |

Bases distintas, **delta idéntico**: 19980−17118 = 23652−20790 = **2862 kg** en ambos lados.

Mecanismo físico: si `MAX(fecha)=2026-08-31` y rango `1m` (30 días), `resolveRangeWindow` da actual `2026-08-02..08-31` y previo `2026-07-03..08-01`. El 1 de agosto sale del actual y entra al previo. Eso baja ambas bases y **conserva** el delta calendario si el kg de los días de borde se cancela así. El **+3.672 t = +3672 kg** deja de ser misterio: es el mismo movimiento, medido en otra ventana.

Atribución del 2862 kg a fechas concretas: **NOT_PROVEN_WITHOUT_LIVE_DB**.

**FIRST_BAD_BOUNDARY: PERIOD** (trailing ≠ mes calendario). **UNIT_LABEL** es secundaria (t verbalizadas como kg).

### NUEVA WAL MART DE MEXICO — prioridad signo

| Eslabón | Dashboard | Director IA |
| --- | --- | --- |
| source | igual | igual |
| period | jul/ago calendario | trailing 30/30 |
| identity | un `cliente_norm` | mismo nombre, posible split Casa/Comi |
| aggregation | kg mes | t ventana |
| unit | kg | t / label kg |
| delta | **+3354 kg** | **−3.904 t (−3904 kg)** |
| classification | AUMENTÓ | DISMINUYÓ |

58828 − 52698 = **6130**. Si el actual trailing omite ~6130 kg de agosto temprano (p. ej. 1 ago), `venta_ton_actual` cae a 52.698. El previo trailing **suma** esos kg de agosto temprano y **quita** inicios de julio → 56.602 > 55.473. El signo se invierte **sin cambiar de tabla**.

No es ingreso vs kg. No es forecast vs real (ambos meses están cerrados en el dashboard). No es redondeo a tonelada entera (56.602 no es un entero).

Filas diarias que componen +3354 vs −3904: **NOT_PROVEN_WITHOUT_LIVE_DB**.

**FIRST_BAD_BOUNDARY: PERIOD.** El signo es consecuencia de la ventana, no de otra métrica.

### GRUPO MOVE EMPRESARIAL

Misma frontera. Offsets distintos (8741 kg / 5123 kg): la distribución diaria del cliente no es plana. Dirección igual (cae), magnitud distinta. **PERIOD**. Día a día: **NOT_PROVEN_WITHOUT_LIVE_DB**.

### CARBURADORA MASTER — prioridad 0 y “dejó de comprar”

| Eslabón | Dashboard | Director IA |
| --- | --- | --- |
| source | `SUM(kg)` ago calendario = 459 | `queryClientTons` ventana actual |
| period | ago 1–31 | trailing actual (puede no incluir los días del 459) |
| identity | `cliente_norm` | `cliente_norm` + filtro canal |
| aggregation | 459 kg | `actual <= 0` |
| unit | kg | t |
| delta | −5911 kg, sigue comprando | −5.803 t |
| classification | DISMINUYÓ | **perdido** → «Dejó de comprar» |

Regla exacta (`selectTopMovers`):

```javascript
else if (previo > 0 && actual <= 0) tipo = "perdido";
```

`round3(459/1000) = 0.459`. El umbral de omisión es `0.001`. **459 kg no se redondean a 0.** Si esos 459 kg entraran en la ventana actual, el tipo sería `disminucion`, no `perdido`.

Por tanto agosto=0 significa: **esa kg no está en la agregación actual** (días fuera de ventana, otro canal, u otro `cliente_norm`). El redondeo a 3 decimales **no** es la causa.

Si todo el agosto de ese cliente cayera el 1 ago y `MAX(fecha)=2026-08-31`, la ventana actual `08-02..08-31` da `actual=0` → «Dejó de comprar». Mecanismo demostrado. Fechas reales: **NOT_PROVEN_WITHOUT_LIVE_DB**.

**FIRST_BAD_BOUNDARY: PERIOD → CLASSIFICATION.**

## 4. H4 — Hipótesis explícitas (cerradas / abiertas)

| Hipótesis | Veredicto |
| --- | --- |
| Otra tabla | **Parcialmente falsa.** Ambas leen `arr.ventas_diarias_cliente`. No es IGF `compromiso_lines`. |
| Otro snapshot | No hay snapshot IGF. El “snapshot” de DIA es `MAX(fecha)` + 30 días. |
| Otro corte | **Verdadera. FIRST_BAD_BOUNDARY.** Calendario vs trailing 30/30. |
| Ingreso vs kg | **Falsa** en la ruta default (`commercial_trend`). Verdadera solo si se usara `commercial_state`/`computeDicf` (no es el planner de estas preguntas). |
| t vs kg | **Verdadera en unidad y etiqueta.** Motor: `/1000` + `round3`. Prompt: `delta_ton`. Verbalización observada: «kg». |
| Forecast vs real | **Falsa** para jul/ago 2026 en dashboard (`historico` → `kg_real`). DIA movers no usan `kg_proyectado`. |
| Otra comparación de meses | **Verdadera.** No es julio vs agosto aunque el humano compare esos meses en la UI. |
| Combinación | PERIOD + UNIT_LABEL + Top 6 + clasificación `actual<=0`. |

## 5. H5 — Contrato de negocio de «Clientes por mes»

Fuente vigente:

1. UI IGF Forecast ARR «Clientes por mes»
2. `GET /api/dashboard/arr-clientes-mes`
3. `computeClientesDescuentoMes`
4. `arr.ventas_diarias_cliente` `SUM(kg)` en `[primer día, último día]` del YYYY-MM
5. Mes cerrado → `kg_real` (kg)
6. Delta venta = kg mes B − kg mes A, misma identidad `cliente_norm`

Eso es kg julio, kg agosto y delta venta. Director IA **no** consume este helper para movers (salvo `period_kind=calendar_month`, que **no** se activa con «aumentaron» / «julio» / «agosto»).

## 6. H6 — CARBURADORA MASTER agosto=0

Demostrado en código: `perdido` exige `actual<=0`. 459 kg, si existieran en la ventana, serían 0.459 t ≠ 0.

Causa física: la kg de agosto **no entra** a `queryClientTons` de la ventana actual. La explicación más económica alineada con 20 CUMBRES / WAL MART es PERIOD (días de agosto fuera del trailing). Otras causas posibles (canal, nombre): **NOT_PROVEN_WITHOUT_LIVE_DB**.

## 7. H7 — NUEVA WAL MART cambia de signo

Demostrado: con la misma tabla, cambiar de mes calendario a trailing 30/30 puede mover kg de inicios de agosto al periodo “previo” y sacarlas del “actual”. El dashboard ve +3354 kg jul→ago; el motor puede ver 56.602 → 52.698 t (−3.904).

No hace falta otra tabla ni forecast para el cambio de signo. Filas diarias exactas: **NOT_PROVEN_WITHOUT_LIVE_DB**.

## 8. H8 — Por qué Golden G-MOVEMENT-* PASS

`test/fixtures/director-ia-golden-cases.js`:

- Preguntas: `¿Qué clientes aumentaron/disminuyeron/dejaron de comprar?`
- `expected_intent: commercial_trend`
- `expected_movement` + `expected_tool_or_route: commercial_movers`
- `expected_evidence_behavior: aggregated_no_cliente_key`
- **Cero kg, cero signos, cero paridad con Clientes por mes**

`test/helpers/director-ia-golden-harness.js` (~326–350): PASS si el planner detecta movers y el movement class. `EVIDENCE = NOT_OBSERVABLE` — «TIER1 no ejecuta LIVE_DB ni loader agregado con datos reales».

Runtime (`R-RUNTIME-001`..`007`): margen/descuento. **Ningún caso de movimiento comercial numérico.**

Por eso PASS: solo ruteo. No observan 17.118 vs 19,980 ni el signo de WAL MART.

## 9. H9 — Runtime cases a proponer (no implementar)

Antes de cualquier FIX, endurecer Capa B con fixtures genéricos (no hardcodear estos cuatro nombres ni sus kg LIVE):

1. **R-RUNTIME-MOV-001** — closed month pair, unique client, calendar Δ kg > 0. Pregunta de aumentaron. Expected: signo AUMENTÓ y magnitudes iguales a `computeClientesDescuentoMes` kg_real (o fallo explícito de periodo, no t etiquetadas como kg calendario).
2. **R-RUNTIME-MOV-002** — mismo fixture, calendar Δ < 0 y kg mes B > 0. Expected: DISMINUYÓ, no «dejó de comprar».
3. **R-RUNTIME-MOV-003** — kg mes B pequeño pero > 0 (p. ej. 459 kg = 0.459 t). Expected: no `perdido`; no actual=0.
4. **R-RUNTIME-MOV-004** — cliente cuyo trailing 30/30 voltea el signo vs calendario. Expected: o bien paridad calendario, o bien ventana trailing **nombrada** (fechas) y unidad **toneladas**, nunca presentada como kg de julio/agosto.
5. **R-RUNTIME-MOV-005** — unit: si el motor emite `venta_ton`, la respuesta no puede etiquetar esos decimales como kg.
6. **R-RUNTIME-MOV-006** — lista: un cliente defendible de movimiento calendario no puede desaparecer solo por Top 6.

TIER 1 G-MOVEMENT-* no debe debilitarse (siguen siendo ruteo). Estos Runtime son paridad semántica/numérica.

## 10. Listas: ¿completas o recortadas?

Director IA `commercial_trend`: **Top 6 por \|delta_ton\| y por canal** (`selectTopMovers` → `slice(0, 6)`). No es el censo de Clientes por mes.

`commercial_state` (ruta no default): top 20 (`COMMERCIAL_STATE_CLIENT_LIMIT`).

Dashboard: todos los `cliente_norm` del mes A (+ solo-B debajo).

## 11. kg ↔ toneladas y etiqueta

| Sitio | Operación |
| --- | --- |
| `computeClientesDescuentoMes` | kg; sin `/1000` |
| UI `fmtNum(..., 0)` | kg, `es-MX` |
| `queryClientTons` / `querySalesSeries` | `SUM(kg)/1000` → `venta_ton` |
| `round3` | 3 decimales t |
| Prompt movers | `delta_ton` / `prev` / `actual` |
| Respuesta chat | OpenAI; puede decir «kg» |

`round3` no convierte 0.459 t en 0.

## 12. SELECT READ-ONLY mínimo (no ejecutado; no es G1 LIVE_DB)

Sustituir `$codes` por los `plant_code` provincia de Acapulco. No pegar secretos.

```sql
-- A. Ancla del motor trailing
SELECT to_char(MIN(fecha), 'YYYY-MM-DD') AS min_f,
       to_char(MAX(fecha), 'YYYY-MM-DD') AS max_f
  FROM arr.ventas_diarias_cliente
 WHERE UPPER(TRIM(plant_code)) = ANY($codes::text[]);

-- B. Contrato Clientes por mes (kg calendario)
SELECT TRIM(cliente_norm) AS cliente,
       SUM(kg) AS kg
  FROM arr.ventas_diarias_cliente
 WHERE UPPER(TRIM(plant_code)) = ANY($codes::text[])
   AND fecha >= DATE '2026-07-01' AND fecha <= DATE '2026-07-31'
   AND TRIM(cliente_norm) = ANY($clientes::text[])
 GROUP BY 1;

-- repetir B para 2026-08-01..31

-- C. Diario (atribución de ventanas; NOT_PROVEN hoy)
SELECT fecha::date,
       TRIM(cliente_norm) AS cliente,
       COALESCE(canal, '') AS canal,
       SUM(kg) AS kg
  FROM arr.ventas_diarias_cliente
 WHERE UPPER(TRIM(plant_code)) = ANY($codes::text[])
   AND fecha >= DATE '2026-07-01' AND fecha <= DATE '2026-08-31'
   AND TRIM(cliente_norm) = ANY($clientes::text[])
 GROUP BY 1, 2, 3
 ORDER BY 2, 1, 3;
```

`$clientes` = los cuatro nombres de evidencia. Tras A, recalcular `resolveRangeWindow` (30 días hasta `max_f`) y sumar C dentro de esas fechas.

## 13. Qué no se hizo

No producto. No tests. No LIVE_DB. No «nuevos vs reactivados». No hardcode de clientes como fix. No merge. No deploy. No next task.

## 14. Archivos

Tocados:

- `docs/dev-loop/CURRENT_TASK.md` (solo `status` + narrativa de cierre)
- `docs/dev-loop/reports/AUDIT-DIRECTOR-IA-COMMERCIAL-MOVEMENT-DASHBOARD-PARITY-001.md`

No tocados: `lib/**`, `test/**`, `docs/director-ia/`, `server.js`, frontend de corrección, DB.

## 15. Commit / status

implementation SHA: `eb0375c032ba801fee9f593afaa992793606a286`

Rama: `audit/director-ia-commercial-movement-dashboard-parity-001`. No push. No merge.
