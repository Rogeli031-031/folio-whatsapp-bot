# AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001"
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
first_bad_boundary: "FORECAST_PROJECTION"
secondary_boundaries:
  - "FORMULA"
  - "SOURCE_SELECTION"
  - "RUNTIME_FALSE_GREEN"
next_task_proposed: "FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001"
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
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
  - "Valores exactos kg/desc/margen LIVE de WAL MART y los otros cuatro requieren G1 LIVE_DB READ-ONLY nuevo. Esta auditoría no lo abre."
```

## 0. Alcance ejecutado

G1 vigente: auditoría READ-ONLY. `implementation_authorized: NO`. `live_db_authorized: NO`.

Rama: `audit/director-ia-delta-ingreso-forecast-dashboard-parity-001`.

Hecho: tracing físico de IGF Forecast ARR → Clientes por mes y de Director IA → Delta Ingreso Forecast. Cero SELECT. Cero writes. Cero DDL. Producto y tests no tocados.

Los cinco clientes y los importes LIVE son evidencia de caso, no regla de producto.

---

## 1. Executive summary

Clientes por mes y Director IA **no calculan el mismo Delta Ingreso**. No basta decir que “usan helpers distintos”: el primer valor que diverge es el **kg de septiembre (periodo B)**.

La tabla **Clientes por mes** no llama `computeDeltaIngresoForecast`. Llama dos veces `GET /api/dashboard/arr-clientes-mes` → `computeClientesDescuentoMes`. El ingreso y el delta se calculan **en el browser** (`ingresoClienteMarginal`). Para un mes abierto, el kg B es `kg_real_MTD × (targetKg_planta / Σ kg_real_planta)`. El `targetKg` lo manda el frontend desde **venta_ton IGF × 1000**.

Director IA, tras el FIX de routing, llama `computeDeltaIngresoForecast`. El kg B es `kg_MTD + projectKgToMonthEnd(OLS/DOW) × escala Activo/Latente/Inactivo`. **No usa** `arr.forecast_mensual` ni el target IGF de la tabla.

Eso basta para el cambio de signo de WAL MART: Dashboard escala la cuota MTD al forecast de planta (B > A → +$511,219). IA proyecta el resto del mes con OLS+tope (B < A → −$309,994).

Segunda frontera, misma cadena: la tabla suma **HG** (`kg × |hg_kg|` equivalente). El helper de IA no tiene HG. Amplifica magnitudes (PUBLICO/MOVE/DURANGO/CALZADA) aunque no es el primer input que puede voltear el signo.

R-DELTA-INCOME-001..010 PASS porque el harness **mockea** `computeDeltaIngresoForecast` con filas inventadas. No compara contra Clientes por mes.

Contrato ejecutivo recomendado (no implementado): la semántica de **Clientes por mes** (`computeClientesDescuentoMes` + `ingresoClienteMarginal`), no el OLS de `computeDeltaIngresoForecast`.

---

## 2. Dashboard physical chain

```text
/arr?empresa=Acapulco
  selA = YYYY-08    selB = YYYY-09
        │
        ├─ GET /api/dashboard/igf-forecast?year=&month=&include_mini=1
        │     handler: buildIgfForecastPayload
        │     → igf.versions (GLOBAL, latest version_number)
        │     → igf.compromiso_lines (margen_kg, hg_pct, hg_kg, venta_ton)
        │
        ├─ GET /api/dashboard/arr-clientes-mes?year=&month=&empresa=Acapulco
        │     [agosto, historico=true]
        │     server.js GET /api/dashboard/arr-clientes-mes
        │     → computeClientesDescuentoMes(..., { historico: true })
        │     → arr.ventas_diarias_cliente SUM(kg) mes calendario
        │     → arr.descuentos_diarios_cliente SUM(monto)
        │     → arr.cliente_categoria_mes (metadata)
        │     kg B no aplica; venta = kg_real
        │
        └─ GET /api/dashboard/arr-clientes-mes?year=&month=&empresa=Acapulco
              &target_kg=<ventaTon IGF × 1000>
              [septiembre, historico=false]
              → computeClientesDescuentoMes(..., { historico: false, targetKgOverride })
              kg_proyectado = kg_real × (targetKg / Σ kg_real planta)
        │
        ▼
  ArrClient.tsx filasClientesMesPrimero
    ventaA = clienteVenta(rowA, historico) → kg_real
    ventaB = clienteVenta(rowB, historico) → kg_proyectado
    ingresoA/B = ingresoClienteMarginal(kg, descKg, metrics IGF del mes)
    delta = ingresoB − ingresoA
        │
        ▼ render (puede aplicar sims locales)
  ingresoBMesBConSim − ingresoA
```

**No participa** en esta tabla: `computeDicf`, `computeDeltaIngresoForecast`, `POST /api/dashboard/delta-ingreso-forecast-datos`.

Esos endpoints existen (modal DICF / botón home) y son **otras** superficies.

---

## 3. Director IA physical chain

```text
pregunta LIVE
  → isDeltaIngresoForecastQuestion (planner)
  → intent delta_income / evidence delta_ingreso_forecast
  → askDirectorIa rama forecast
  → resolveCalendarCompareMonths("septiembre", now)
       A = mes anterior (2026-08)   B = 2026-09
  → loadDeltaIngresoForecastNegativeTopN
  → computeDeltaIngresoForecast(client, plantCode, yA, mA, yB, mB, getMargenKgPorPeriodo, plantaNombre)
  → rows: ingresoA = kgA × (margenA − |descKgA|)
          ingresoB = kgBProj × (margenB − |descKgBProj|)
          delta = ingresoB − ingresoA
  → filter delta < 0, sort más negativo → menos, Top N
  → comments por nombre (después del cálculo; no altera delta)
  → respuesta determinista: solo delta MXN + comentarios
```

`computeDeltaIngresoForecast` **no recibe `now`**. El corte de septiembre abierto usa `new Date()` interno (`isCurrentMonthB`, `maxFechaStr = todayStr`).

`configureDirectorIaChat` en `server.js` **no inyecta** `getPlantCodeArrFromPlantaNombre`. El chat usa `planta.nombre` como `plant_code`. En Acapulco suele coincidir; no explica el signo de WAL MART.

---

## 4. Helper comparison

| | **Clientes por mes** | **computeDeltaIngresoForecast** | **computeDicf** | **computeClientesDescuentoMes** (backend solo) |
|---|---|---|---|---|
| **INPUT PERIOD** | `selA`/`selB` UI, un GET por mes | `yearA/monthA/yearB/monthB` explícitos | Anclado a `MAX(fecha)` | year/month de un GET |
| **KG SOURCE** | `arr.ventas_diarias_cliente` mes calendario | Misma tabla | Misma tabla, ventana DICF | Misma tabla |
| **KG B ABIERTO** | `kg_mtd × (targetIGF o forecast_mensual / Σ planta)` | `kg_mtd + OLS DOW × escala estado`, cap `min(last7, last14/2)` | OLS + otra cap, 60d | Produce `kgProy`; no ingreso |
| **DISCOUNT SOURCE** | `SUM(monto)/SUM(kg)` del mes (MTD si abierto) | A: mes A; B: proyecta monto con tasa diaria histórica | `desc_kg_hist` de ventana | Solo `descKg`; no ingreso |
| **MARGIN SOURCE** | `igf.compromiso_lines.margen_kg` vía GET igf-forecast (fila empresa) | `getMargenKgPorPeriodo`: GLOBAL `ORDER BY version_number DESC LIMIT 1`, promedio ponderado `venta_ton` | Igual que Forecast | No |
| **VERSION RULE** | `resolveIgfGlobalVersion` + `upload_day` opcional | Latest GLOBAL por year/month; sin `upload_day` | Latest GLOBAL | No |
| **FORECAST METHOD** | Prorrateo al target de **planta** | Proyección **por cliente** (DOW + recencia) | Proyección por cliente | Prorrateo (sin ingreso) |
| **OVERRIDES** | `target_kg` query (IGF). Sims desc/venta **solo React** | Ninguno | Ninguno | `targetKgOverride` |
| **CLIENT GROUPING** | `cliente_norm` + planta; canales sumados | `cliente_norm`; canal/subcanal metadata | `cliente_norm` | `planta\|cliente` |
| **CLAMPING** | `ingresoClienteMarginal`: `kg<=0` → null; `Math.round` | Ingreso **sin** `max(0,…)`. Kg extra `max(0,proj)` | `Math.max(0, ingreso)` | kg 2 decimales |
| **CACHE** | Memoria frontend `clientesByKey` | Puede persistir `arr.delta_ingreso_forecast_cliente` (no leído por la tabla ni por el chat Top N) | `arr.dicf_cliente_mes` | No |
| **OUTPUT** | Ingreso MXN + delta en UI | `{ rows: ingresoA, ingresoB, deltaIngreso, kgA, kgB }` | DICF rows | kg, descKg, kgProy |
| **FÓRMULA INGRESO** | `kg×(margen−\|desc\|) + (hg×kg×hg$)/100` ≡ `kg×(margen−\|desc\|) + kg×\|hg_kg\|` | `kg×(margen−\|desc\|)` **sin HG** | `kg×(margen−\|desc\|)` + clamp 0 | No |

---

## 5. Five-client matrix

Importes Dashboard e IA Delta: evidencia humana del CURRENT_TASK. kg/desc/margen/ingreso A·B de IA: **no observables en la prosa del chat** (el pack tiene `ingreso_a`/`ingreso_b`/`kg_a`/`kg_b` pero no se consultó LIVE).

| CLIENT | Dashboard source | IA source | Dash A | IA A | Dash B | IA B | Dash Δ | IA Δ | Dash sign | IA sign | FIRST_BAD_BOUNDARY |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PUBLICO EN GENERAL | `ingresoClienteMarginal` sobre `computeClientesDescuentoMes` | `computeDeltaIngresoForecast` | $724,462 | NOT_PROVEN_WITHOUT_LIVE_DB | $502,898 | NOT_PROVEN_WITHOUT_LIVE_DB | −$221,564 | −$536,735 | − | − | FORECAST_PROJECTION (+ FORMULA HG) |
| GRUPO MOVE EMPRESARIAL | idem | idem | $738,246 | NOT_PROVEN_WITHOUT_LIVE_DB | $639,172 | NOT_PROVEN_WITHOUT_LIVE_DB | −$99,074 | −$430,513 | − | − | FORECAST_PROJECTION (+ FORMULA HG) |
| NUEVA WAL MART DE MEXICO | idem | idem | $519,948 | NOT_PROVEN_WITHOUT_LIVE_DB | $1,031,167 | NOT_PROVEN_WITHOUT_LIVE_DB | **+$511,219** | **−$309,994** | **+** | **−** | **FORECAST_PROJECTION (kg B)** |
| 21 DURANGO | idem | idem | $349,130 | NOT_PROVEN_WITHOUT_LIVE_DB | $312,082 | NOT_PROVEN_WITHOUT_LIVE_DB | −$37,048 | −$237,353 | − | − | FORECAST_PROJECTION (+ FORMULA HG) |
| 62 CALZADA | idem | idem | $314,117 | NOT_PROVEN_WITHOUT_LIVE_DB | $278,389 | NOT_PROVEN_WITHOUT_LIVE_DB | −$35,728 | −$213,806 | − | − | FORECAST_PROJECTION (+ FORMULA HG) |

Aritmética Dashboard observada (cierra): `502,898 − 724,462 = −221,564`; `1,031,167 − 519,948 = +511,219`.

---

## 6. WAL MART deep trace

Dashboard (código):

1. Agosto histórico → `kg_real` = SUM kg 2026-08-01..31, `cliente_norm` = NUEVA WAL MART DE MEXICO, `plant_code` Acapulco.
2. `ingresoA = round(kgA × (margenAgo − |descAgo|) + kgA × |hg_kg_ago|)`.
3. Septiembre abierto → `kg_real` = SUM kg 2026-09-01..ayer (o fin de datos del mes).
4. `target_kg` = `ventaTon` IGF septiembre Acapulco × 1000 (request query, no DB de descuentos).
5. `kg_proyectado = kg_real × (target_kg / Σ kg_real de la planta)`.
6. `ingresoB = round(kg_proy × (margenSep − |descSep_mtd|) + kg_proy × |hg_kg_sep|)`.
7. Delta = B − A = **+$511,219** ⇒ en esta superficie **B > A**.

Director IA (código):

1. Agosto: misma idea de mes calendario (`firstA`..`endMesA`) → `kgA`.
2. `ingresoA = kgA × (margenA − |descKgA|)` **sin HG**.
3. Septiembre: `kgBReal` = SUM 2026-09-01..`today` (reloj del server, no MAX(fecha) de ventas).
4. `extraKg = projectKgToMonthEnd` (promedio DOW con half-life 3 semanas, tope `min(last7, last14/2)`).
5. `kgBProj = kgBReal + extraKg × {Activo:1, Latente:0.35, Inactivo:0.2}`.
6. `ingresoB = kgBProj × (margenB − |descKgBProj|)`.
7. Delta observado **−$309,994** ⇒ en esta superficie **B < A**.

**Punto exacto del cambio de signo**

No es el ranking. No es el planner. No es el mes etiquetado.

Archivo + función de la **primera transformación** que puede invertir el signo:

- Dashboard kg B: `lib/dashboard-arr-forecast.js` `computeClientesDescuentoMes` L1708–1721 (`factor = targetKg / sumReal`; `kgProy = kg * factor`), alimentado por `targetKgDesdeIgfTon` en `ArrClient.tsx` L501–510.
- IA kg B: `lib/delta-ingreso-forecast.js` `computeDeltaIngresoForecast` L289–295 + `projectKgToMonthEnd` L80–114.

Mismo input de ventas MTD. Distinta función de kg B. Dashboard reparte el **forecast de planta**. IA extrapola el **ritmo del cliente**. Si el target IGF de Acapulco es alto respecto al OLS topeado, WAL MART (cuota MTD × factor) queda por encima de agosto; el OLS queda por debajo.

HG (`ingresoClienteMarginal` L547) cambia el **nivel** de A y B. No es el primer input que cambia el signo: con el mismo kg, HG añade `kg×|hg_kg|` a ambos meses; el flip +511k / −310k exige kg B distintos.

Valores exactos `kgA/kgB/desc/margen` de WAL MART: **NOT_PROVEN_WITHOUT_LIVE_DB** (SELECT A–C).

---

## 7. PUBLICO / MOVE deep trace

Ambos conservan signo negativo en las dos superficies, pero IA es ~2.4× (PUBLICO) y ~4.3× (MOVE) más negativo.

Causa física esperable (misma frontera):

1. **kg B más bajo en IA** (OLS+escala vs prorrateo a target IGF). Dashboard B aún está por debajo de A, pero no tanto.
2. **Sin término HG** en IA: si HG de septiembre es material, Dashboard B sube y el deterioro se atenúa.
3. Descuento B: Dashboard aplica `descKg` MTD al kg proyectado (el monto de descuento **no** se proyecta). IA proyecta monto de descuento con tasa diaria. Puede empeorar `margen − |desc|` en IA.

No se atribuye a grouping distinto: ambas agrupan por `cliente_norm` a nivel planta.

No se atribuye a periodo A distinto: ambas usan mes calendario agosto.

Exactitud de la descomposición A vs B vs HG vs desc: **NOT_PROVEN_WITHOUT_LIVE_DB**.

---

## 8. 21 DURANGO / 62 CALZADA

Mismo patrón que PUBLICO/MOVE: signo alineado, magnitud IA ~6× peor.

No hay evidencia de otra frontera (identidad, canal, override) que sea exclusiva de estos dos. Misma `FORECAST_PROJECTION` + `FORMULA` (HG).

No se asume identidad con PUBLICO/MOVE más allá de que el código no tiene rama especial por cliente.

---

## 9. Forecast semantics

**Clientes por mes / septiembre abierto**

`Ingreso septiembre` = ingreso sobre **kg_proyectado**, no sobre kg MTD crudo.

`kg_proyectado` = participación del cliente en las ventas **ya ocurridas** del mes, escalada al **target de planta**:

- preferido: `target_kg` = `venta_ton` de IGF Forecast (compromiso / mini) × 1000;
- fallback backend: `arr.forecast_mensual.kg_forecast`.

No es OLS. No es ritmo por día de semana. No es “días operativos” explícitos. El factor es el mismo para todos los clientes de la planta.

**Director IA / septiembre abierto**

`Ingreso septiembre` = ingreso sobre `kgBReal + extra OLS`.

`extra` = suma de promedios DOW ponderados por recencia hasta el último día de mes, recortada por `min(suma 7d, mitad de 14d)`, luego × 1 / 0.35 / 0.2 según estado.

No lee `arr.forecast_mensual`. No lee `venta_ton` IGF.

---

## 10. Discount / override analysis

**Backend Clientes por mes:** `descKg = |SUM(monto)| / SUM(kg)` del mes pedido. En septiembre abierto el denominador es MTD, no el kg proyectado. El ingreso UI usa ese `descKg` × `kg_proyectado`.

**IA:** desc A = mes A completo. Desc B = proyecta monto (`descBReal + descRate × extraKg × scale`) / `kgBProj`.

**Overrides UI** (`clientesDescForecastSim`, `clientesVentaForecastSim`, exclusiones): estado React. **No** viajan en `fetchArrClientesMes`. No los ve `computeDeltaIngresoForecast`.

Pueden cambiar el Delta **pintado** sin cambiar IA. No se sabe si la captura humana incluía sims. H6 = NOT_PROVEN para los importes observados; el código prueba que **pueden** divergir.

`target_kg` **sí** es un override de request: no es un descuento editable, es el techo de kg de planta tomado de IGF.

---

## 11. Margin / version analysis

**Clientes por mes:** margen (y HG) del GET `igf-forecast` del **mismo mes** que la columna. Versión GLOBAL resuelta por el payload IGF (`upload_day` / corte posible). `margenKg` de la fila empresa en `compromiso_lines`.

**IA:** `getMargenKgPorPeriodo` (`lib/director-ia-m9-deltas.js` L299–317):

```sql
SELECT id FROM igf.versions
 WHERE plant_code = 'GLOBAL' AND year = $1 AND month = $2
 ORDER BY version_number DESC LIMIT 1;

SELECT SUM(margen_kg * COALESCE(venta_ton,0)) / NULLIF(SUM(COALESCE(venta_ton,0)),0)
  FROM igf.compromiso_lines
 WHERE version_id = $1 AND (empresa ILIKE $2 OR empresa ILIKE $3);
```

No pasa `upload_day`. Null → `?? 0` en Forecast (DICF usaría 1).

Puede haber H4 (versión distinta o promedio ponderado vs celda UI). **No** explica por sí solo el flip de WAL MART si ambos márgenes son ~$/kg positivos del mismo orden. H4 = NOT_PROVEN_WITHOUT_LIVE_DB.

---

## 12. Cache / snapshot analysis

| Superficie | Cache |
|---|---|
| Clientes por mes | `clientesByKey` / `dataByKey` en memoria. Key incluye `tg:<targetKg>`. Recarga al cambiar IGF ton. |
| IA chat | Sin leer `arr.delta_ingreso_forecast_cliente`. Recalcula el helper. |
| `computeDeltaIngresoForecast` dashboard POST | Puede escribir cache; la tabla ARR no la lee. |
| Reloj | Tabla: `historico` con `Date()` del server. IA: `Date()` dentro del helper para corte B. |

H10 (snapshot persistente como causa del flip): **REJECTED** para la tabla vs chat. Ambos son live-compute. El `target_kg` en el query **sí** es estado de request derivado de IGF en ese momento.

---

## 13. H1–H12

| ID | Hipótesis | Disposition |
|---|---|---|
| H1 | Misma tabla, distinto helper | **PROVEN** (ambas leen `arr.ventas_diarias_cliente`; transforman B distinto) |
| H2 | Periodo distinto (límites agosto/septiembre) | **REJECTED** como primera causa: A es mes calendario; B abierto corta a “hoy”. El flip no nace de etiquetar otro mes. |
| H3 | Forecast distinto | **PROVEN** — es H3 = FORECAST_PROJECTION (kg B) |
| H4 | Margen / versión distinto | **NOT_PROVEN_WITHOUT_LIVE_DB** |
| H5 | Descuento distinto | **PROVEN** como segunda transformación (MTD rate×kg_proy vs proyección de monto). No es la primera del signo. |
| H6 | Override/UI | **NOT_PROVEN** para los importes capturados; **PROVEN** que sims no llegan a IA |
| H7 | KG distinto | **PROVEN** — kg B es el primer valor numérico que las cadenas construyen distinto |
| H8 | Client aggregation | **REJECTED** como causa del flip: ambas `cliente_norm`+planta |
| H9 | Clamp `max(0,ingreso)` | **REJECTED** para tabla vs Forecast (Forecast no clampea; tabla null si kg≤0 o falta HG). DICF sí clampea, y **no** es esta tabla |
| H10 | Version / snapshot persistente | **REJECTED** como cache de tabla vs chat. Versión IGF: ver H4 |
| H11 | Inversión de signo / A↔B | **REJECTED**: ambas hacen `B − A` |
| H12 | Source-of-truth mismatch | **PROVEN**: Clientes por mes ≠ `computeDeltaIngresoForecast` |

---

## 14. FIRST_BAD_BOUNDARY por cliente

Todos: **FORECAST_PROJECTION** (construcción de kg B).

WAL MART: esa frontera es **suficiente** para el cambio de signo.

Los otros cuatro: misma frontera; FORMULA (HG ausente en IA) es secundaria de magnitud.

---

## 15. Root cause(s)

1. **Primaria — FORECAST_PROJECTION.** Director IA responde la pregunta ejecutiva de Clientes por mes con `computeDeltaIngresoForecast` (OLS por cliente). La tabla usa `computeClientesDescuentoMes` + target IGF de planta. Primer valor divergente: **kg septiembre**.
2. **Secundaria — FORMULA.** `ingresoClienteMarginal` añade HG; el helper de IA no.
3. **Terciaria — DISCOUNT B.** Tasa MTD × kg_proy vs proyección de monto.
4. **Cuaternaria — SOURCE_SELECTION / RUNTIME_FALSE_GREEN.** El FIX anterior conectó el planner al helper Forecast. Runtime validó ese helper, no la tabla.

No es PLANNER. El routing del FIX funciona.

---

## 16. Runtime false-green

R-DELTA-INCOME-001..010 (`test/fixtures/director-ia-golden-cases.js`, harness `deltaIncomeForecastDeps`):

| Qué fixturean | `computeDeltaIngresoForecast` **stub** con `forecastNegativeRows` (CLIENTE_N1..N7, POS). Periodo A/B solo se formatea. Comentarios por mapa. |
|---|---|
| Inputs controlados | Pregunta, `now=2026-09-01`, pack `delta_income_forecast`, deltas hardcoded |
| Qué no comparan | `computeClientesDescuentoMes`, `ingresoClienteMarginal`, HG, `target_kg`, IGF `venta_ton`, SQL real, WAL MART, signos LIVE |
| Por qué PASS | El producto ahora emite el pack que el gate espera. El mock **es** la fuente. |
| R-010 | Exige `source_helper=computeDeltaIngresoForecast` y prohíbe M9. **Certifica la fuente que diverge de la tabla.** |

El gate validó consistencia interna del path Forecast, no paridad con Clientes por mes.

Tests no modificados.

---

## 17. Future R-DELTA-PARITY-001..010 (no implementados)

- **R-DELTA-PARITY-001** — mismo fixture: ingreso A Dashboard (`ingresoClienteMarginal` + kg_real A) vs IA `ingreso_a`.
- **R-DELTA-PARITY-002** — ingreso B: kg_proyectado (factor planta) vs `kgB` OLS.
- **R-DELTA-PARITY-003** — `delta = B − A` idéntico en ambas rutas.
- **R-DELTA-PARITY-004** — signo: un cliente con factor planta B>A no puede salir negativo en IA.
- **R-DELTA-PARITY-005** — kg B: `kg_mtd * targetKg/sumReal` vs helper.
- **R-DELTA-PARITY-006** — `descKg` MTD aplicado a kg_proy vs desc proyectado.
- **R-DELTA-PARITY-007** — margen/HG/version_id de IGF del mes vs `getMargenKgPorPeriodo`.
- **R-DELTA-PARITY-008** — un `cliente_norm` + planta = una fila en ambas.
- **R-DELTA-PARITY-009** — sims locales no deben ser la fuente de IA; `target_kg` IGF sí, si gobierna la tabla.
- **R-DELTA-PARITY-010** — Top N solo después de paridad de deltas (no mock de Forecast aislado).

---

## 18. Source-of-truth recommendation

Para la pregunta “impacto negativo en el ingreso del mes” alineada a IGF Forecast ARR → **Clientes por mes**, el contrato ejecutivo debe ser:

**`computeClientesDescuentoMes` + `ingresoClienteMarginal`**  
(kg A real, kg B = prorrateo al target IGF/`target_kg`, desc MTD, margen+HG del IGF del mes).

Razones (no comodidad):

- Es lo que la pantalla ejecutiva **realmente** muestra y lo que negocio comparó.
- Incorpora el forecast de planta que negocio edita/ve en IGF (`venta_ton` → `target_kg`).
- Acepta periodo explícito (un GET por mes).
- Evita una segunda fórmula (OLS) que el dashboard de esa tabla no usa.
- Los overrides de descuento **locales** no deben gobernar IA hasta que se persistan; el `target_kg` IGF sí es parte de esa superficie.

`computeDeltaIngresoForecast` sigue siendo válido para el **botón** “Delta Ingreso Forecast” / modal de otra semántica. No debe presentarse como Clientes por mes.

`computeDicf` no alimenta la tabla; no debe usarse como atajo (MAX(fecha), clamp).

---

## 19. LIVE_DB SELECTs (no ejecutar)

Requiere G1 LIVE_DB READ-ONLY aparte.

### SELECT A — ventas (Acapulco, cinco clientes, ago+sep 2026)

```sql
SELECT v.fecha, v.cliente_norm, v.canal, COALESCE(v.subcanal,'') AS subcanal, v.kg, v.plant_code
  FROM arr.ventas_diarias_cliente v
 WHERE v.plant_code = 'Acapulco'
   AND v.fecha >= DATE '2026-08-01' AND v.fecha <= DATE '2026-09-30'
   AND lower(trim(v.cliente_norm)) IN (
         'publico en general',
         'grupo move empresarial',
         'nueva wal mart de mexico',
         '21 durango',
         '62 calzada'
       )
 ORDER BY v.cliente_norm, v.fecha
 LIMIT 5000;
```

Agregar `SUM(kg)` por cliente y mes para A vs MTD B.

### SELECT B — IGF margen/HG/venta_ton (GLOBAL, ago+sep 2026, Acapulco)

```sql
SELECT v.id AS version_id, v.version_number, v.financial_state, v.year, v.month,
       l.empresa, l.margen_kg, l.hg_pct, l.hg_kg, l.venta_ton
  FROM igf.versions v
  JOIN igf.compromiso_lines l ON l.version_id = v.id
 WHERE v.plant_code = 'GLOBAL'
   AND v.year = 2026 AND v.month IN (8, 9)
   AND (l.empresa ILIKE '%Acapulco%')
 ORDER BY v.month, v.version_number DESC, l.empresa
 LIMIT 50;
```

La fila `ORDER BY version_number DESC` por mes es la que usa `getMargenKgPorPeriodo`.

### SELECT C — descuentos (mismos clientes/periodo)

```sql
SELECT d.fecha, d.cliente_norm, d.monto, d.plant_code
  FROM arr.descuentos_diarios_cliente d
 WHERE d.plant_code = 'Acapulco'
   AND d.fecha >= DATE '2026-08-01' AND d.fecha <= DATE '2026-09-30'
   AND lower(trim(d.cliente_norm)) IN (
         'publico en general',
         'grupo move empresarial',
         'nueva wal mart de mexico',
         '21 durango',
         '62 calzada'
       )
 ORDER BY d.cliente_norm, d.fecha
 LIMIT 5000;
```

### SELECT D — target forecast planta septiembre

```sql
SELECT plant_code, year, month, kg_forecast
  FROM arr.forecast_mensual
 WHERE plant_code = 'Acapulco' AND year = 2026 AND month = 9
 LIMIT 5;
```

No hay snapshot que la tabla lea. El target efectivo de UI es `venta_ton` IGF (SELECT B) × 1000.

---

## 20. Recommended next FIX

`FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001`

Regression-first: R-DELTA-PARITY-001..010 (sobre todo 002/004/005) **antes** de producto.

Producto: para esta pregunta, calcular Top N con la misma cadena que Clientes por mes (`computeClientesDescuentoMes` + fórmula `ingresoClienteMarginal`, mismo `target_kg` IGF). No parchear prosa. No reabrir planner. No usar `computeDicf`. No inventar tercera aritmética: extraer/reutilizar la de la tabla.

LIVE_DB no es obligatorio para diseñar el FIX; sí para validar −$309,994 vs +$511,219 en producción.

---

## 21. Git

Rama: `audit/director-ia-delta-ingreso-forecast-dashboard-parity-001`

implementation: no. Solo CURRENT_TASK (status) + este reporte.

SHA: pendiente de stamp en el commit de esta rama.

No push. No merge. No deploy. No next task.
