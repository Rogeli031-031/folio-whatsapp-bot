# AUDIT-DIRECTOR-IA-DELTA-INGRESO-NEGATIVE-IMPACT-COMMENTS-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-DELTA-INGRESO-NEGATIVE-IMPACT-COMMENTS-001"
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
first_bad_boundary: "PLANNER"
secondary_boundaries:
  - "ROUTING"
  - "SOURCE_NOT_EXPOSED"
  - "PERIOD_RESOLUTION"
  - "COMMENT_SOURCE"
next_task_proposed: "FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001"
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
  - "Si se quieren valores LIVE de Top 5 / MAX(fecha) / fila BAYAM, hace falta un G1 LIVE_DB READ-ONLY nuevo. Esta auditoría no lo abre."
```

## 0. Alcance ejecutado

G1 vigente: auditoría READ-ONLY. `implementation_authorized: NO`. `live_db_authorized: NO`.

Rama: `audit/director-ia-delta-ingreso-negative-impact-comments-001`.

Hecho: tracing físico de Dashboard (Forecast + DICF + modal histórico), planner/capability/tool/chat, tres lecturas de comentarios, Golden/Runtime. Cero SELECT. Cero writes. Cero DDL. Producto y tests no tocados.

BAYAM RESIDENCES y la pregunta LIVE son evidencia de caso, no regla de producto.

---

## 1. Executive summary

Director IA no falla porque el dato no exista. El Dashboard ya calcula Delta Ingreso por cliente en MXN y ya ordena el impacto negativo.

La pregunta LIVE (`Dame 5 clientes que tengan el mayor impacto negativo en el ingreso para el mes de septiembre, y ponme sus comentarios.`) entra al planner como `commercial_trend` (cue de comentarios + clientes → movers de kg), no como `delta_income` ni como lista DICF/`commercial_state`.

`delta_income` sí existe (capability `delta_ingreso` + tool `get_delta_income` + `loadDeltaIngresoForChat`), pero solo se dispara con `cambio|delta|variacion` + `ingreso`, y ejecuta el modal histórico M9 (kg reales de dos YYYY-MM, corte 80/20). Declara explícitamente `not: delta_ingreso_forecast`.

La superficie visual pedida es IGF Forecast ARR → **Delta Ingreso Cliente Forecast** (`computeDicf`) o el botón **Delta Ingreso Forecast** (`computeDeltaIngresoForecast`). Ambas ya tienen `delta_ingreso = ingreso_B − ingreso_A` y lista `disminuyeron` ordenada de más negativo a menos negativo. Top 5 es un recorte de esa lista; no hace falta una fórmula de negocio nueva.

Los comentarios de gráfica y Director IA leen `arr.cliente_comentarios` por **nombre**. El modal DICF lee la misma tabla por **`cliente_key` DICF**. Por eso BAYAM puede verse en gráfica/DIA y “Aún no hay comentarios” en el modal. No es otra tabla; es otro predicado de identidad.

Golden/Runtime: no hay casos para estas preguntas.

---

## 2. North Star map

```text
Rentabilidad forecast (concepto de negocio; NO implementada aquí)
  = Rentabilidad mes anterior + Delta Ingreso − Delta Gastos

Delta Ingreso cliente (sí existe físicamente)
  = Ingreso B − Ingreso A
  Ingreso = kg × (margen_IGF $/kg − |desc $/kg|)

Cliente canónico
  = cliente_norm (ARR) / cliente_nombre (comentarios)
  ≠ cliente_key DICF (planta|grupo|canal|subcanal|nombre)

Variables en la cadena
  kg A/B, desc $/kg, margen planta-mes (IGF latest version)
  clasificación: dejaron / disminuyeron / aumentaron / nuevos
  HG: no entra a la fórmula

Comentario / acción
  comentario libre: arr.cliente_comentarios (no es causa)
  acción: arr.dicf_acciones (otra entidad; no es el comentario de gráfica)
```

Esta auditoría no reinterpreta la fórmula de rentabilidad. Solo localiza el soporte de Delta Ingreso → ranking → comentario.

---

## 3. Physical source map — Delta Ingreso

Hay **tres** cálculos, no uno.

| Superficie | UI | HTTP | Helper | Persistencia opcional |
|---|---|---|---|---|
| Delta Ingreso (histórico) | `DeltaIngresoModal.tsx` / dashboard «Delta Ingreso» | `POST /api/dashboard/delta-ingreso-datos` | `getDeltaIngresoDatosInternal` → `getDeltaIngresoClientes` (`lib/director-ia-m9-deltas.js`) | ninguna |
| Delta Ingreso Forecast | `page.tsx` botón «Delta Ingreso Forecast» | `POST /api/dashboard/delta-ingreso-forecast-datos` | `computeDeltaIngresoForecast` (`lib/delta-ingreso-forecast.js`) | `arr.delta_ingreso_forecast_cliente` (cache; no rompe si falla) |
| Delta Ingreso Cliente Forecast (DICF) | `page.tsx` / `DeltaIngresoClienteForecastModal.tsx` | `POST /api/dashboard/dicf-datos` | `computeDicf` (`lib/dicf.js`) | `arr.dicf_cliente_mes` |

Fuentes comunes de magnitud:

| Insumo | Tabla | Agregación |
|---|---|---|
| kg | `arr.ventas_diarias_cliente` | `SUM(kg)` por `cliente_norm` (+ canal/subcanal en series) |
| descuento MXN | `arr.descuentos_diarios_cliente` | `SUM(monto)` → `$/kg = |monto|/kg` |
| margen | `igf.versions` (`plant_code='GLOBAL'`, `ORDER BY version_number DESC LIMIT 1`) + `igf.compromiso_lines` | promedio ponderado `margen_kg` por `empresa` |
| categoría | `arr.cliente_categoria_mes` | canal/subcanal del mes B |

Director IA:

| Intent | Loader | Helper real |
|---|---|---|
| `delta_income` | `loadDeltaIngresoForChat` | M9 histórico. `not: delta_ingreso_forecast` |
| `commercial_state` | `loadCommercialStateForChat` | **`computeDicf`** (misma lista que el botón Cliente Forecast) |
| `commercial_trend` | `loadCommercialTrendForChat` | kg trailing/calendario. **No es ingreso.** |
| `client_analysis` + comentarios | contexto anexo | `arr.cliente_comentarios` sin ranking de ingreso |

---

## 4. Fórmula física actual

### 4.1 Hipótesis de negocio

`Delta = Ingreso proyectado mes actual − Ingreso mes anterior`

**Parcialmente PROVEN** en Forecast/DICF. **REJECTED** como descripción de M9 (M9 no proyecta).

### 4.2 `computeDeltaIngresoForecast`

```text
ingresoA = kgA * (margenA − |descKgA|)
  kgA     = SUM(kg) mes calendario A (1..último día)
  descKgA = |SUM(monto A)| / kgA
  margenA = getMargenKgPorPeriodo(planta, yearA, monthA)

ingresoB = kgBProj * (margenB − |descKgBProj|)
  si B es mes calendario actual y hay actividad:
    kgBProj = kgBReal + projectKgToMonthEnd(...) * scale(estado)
  si no:
    kgBProj = kgBReal  (MTD o mes cerrado)

deltaIngreso = ingresoB − ingresoA
```

Unidad: MXN (`fmtMxn`, `currency: MXN`). kg internos; UI de toneladas solo en strings `kgAStr`.

Identidad: `cliente_norm`. Una fila por cliente (canales se sobreescriben con `cliente_categoria_mes` del mes B).

### 4.3 `computeDicf` (superficie que el ejecutivo abre como «Cliente Forecast»)

```text
ingreso_anterior = max(0, kg_mes_anterior * (margenAnterior − |desc_kg_anterior|))
ingreso_forecast = max(0, kg_mes_forecast * (margen − |desc_kg_hist|))
delta_ingreso    = ingreso_forecast − ingreso_anterior
```

- A = mes calendario **previo al mes de `MAX(fecha)`**.
- B kg = real del mes de `MAX(fecha)` hasta corte + proyección a `endMes` si `lastDate < fin de mes`.
- `desc_kg_hist` = descuento de la **ventana** (`dicf_config.window_days` o default), no necesariamente el $/kg solo de B.
- `Math.max(0, …)` recorta ingresos negativos. El helper Forecast **no** recorta.

No son el mismo helper. Son fórmulas hermanas, no idénticas.

### 4.4 M9 `getDeltaIngresoClientes` (tool `get_delta_income`)

```text
ingresoA = kgA * (margenA − |descKgA|)
ingresoB = kgB * (margenB − |descKgB|)
delta    = ingresoB − ingresoA
```

kg A y B son **reales de mes calendario**, sin proyección. Corte **top 20%** de cada cubeta (`Math.ceil(n * 0.2)`).

---

## 5. Semántica de periodo / versión — «septiembre»

| Superficie | Qué es B | Qué es A | Versión margen |
|---|---|---|---|
| DICF Cliente Forecast | Mes de `MAX(arr.ventas_diarias_cliente.fecha)` para la planta. Si ese max ya es septiembre: septiembre MTD + forecast a cierre. Si el max sigue en agosto: **agosto**, no septiembre. | Mes calendario anterior a ese mes | `igf.versions` GLOBAL latest `version_number` del year/month (puede ser FORECAST, no exige FINAL) |
| Delta Ingreso Forecast | `periodoB` explícito del UI (`YYYY-MM`). Si B = mes actual del server: mezcla real+proyección. Si B cerrado: real. | `periodoA` explícito | igual |
| M9 / `delta_income` | Segundo YYYY-MM (pregunta o default: los dos periodos con datos más recientes). Siempre actual de mes. «septiembre» **no se parsea** (`parseYyyyMmList` solo `\d{4}-\d{2}`) | El otro YYYY-MM | igual |
| commercial_trend (ruta LIVE) | trailing 30d o meses calendario si la pregunta los nombra | ventana previa / mes A | no aplica (kg) |

**septiembre no está cerrado por el código.** En 2026-09-05 es mes abierto. DICF/Forecast lo tratan como forecast-a-cierre **solo si** el mes ancla es el mes actual y `lastDate < fin de mes`.

`MAX(fecha)` Acapulco y la `version_id` IGF de 2026-09: **NOT_PROVEN_WITHOUT_LIVE_DB**.

---

## 6. Ranking semantics

### DICF / Forecast helper

Cubetas (no mezclan positivos):

| Cubeta | Filtro | Orden |
|---|---|---|
| disminuyeron | A>0 AND B>0 AND delta<0 | `delta` ascendente (más negativo primero) |
| dejaron | A>0 AND B<=0 | por ingreso A desc |
| aumentaron | A>0 AND B>0 AND delta>0 | delta desc |
| nuevos | kgA<=0 AND kgB>0 | por kg/ingreso B |

DICF **no recorta Top 5**: entrega la cubeta completa. `commercial_state` sí recorta a **20** (`COMMERCIAL_STATE_CLIENT_LIMIT`).

Top 5 de impacto negativo, según la hipótesis de negocio (`delta < 0`, sin valor absoluto, sin positivos):

- se obtiene filtrando filas ya calculadas y `slice(0, 5)`;
- **no** requiere fórmula nueva;
- hay que decidir (FIX posterior) si el Top 5 une `disminuyeron` + `dejaron` o solo `disminuyeron`. Hoy el dashboard las separa.

M9 no es Top 5: es top 20% de cada cubeta.

---

## 7. Director IA routing map

Pregunta LIVE normalizada ≈  
`dame 5 clientes que tengan el mayor impacto negativo en el ingreso para el mes de septiembre, y ponme sus comentarios.`

Ejecutado en proceso (sin LIVE_DB):

| Pregunta | `detectDirectorIaIntent` / `planDirectorIaQuestion` |
|---|---|
| LIVE (con comentarios) | **`commercial_trend`** 0.9 · domains `["arr"]` |
| Misma sin «comentarios» | `client_profile` 0.88 |
| «Delta Ingreso negativo … y sus comentarios» | `client_analysis` (cliente_comentarios) |
| `como cambio el ingreso` | `delta_income` 0.85 · `["delta_ingreso"]` |
| `que clientes disminuyeron` | `commercial_trend` |

Por qué la LIVE cae en `commercial_trend`:

1. `isCommercialMoversQuestion`: `comentarios` + `clientes` + sin cliente nombrado → `commentsOnSet` = true.
2. El bloque temprano `client_analysis` (comentarios+clientes) se **salta** porque `isCommercialTrendQuestion` ya es true.
3. Más abajo, `isCommercialTrendQuestion` gana. `delta_income` nunca se evalúa.
4. `delta_income` exigiría `\b(cambio|cambi|vario|variacion|delta)\b` **y** `\bingreso\b`. «impacto negativo» no basta.

Cadena LIVE:

```text
pregunta
→ detectDirectorIaIntent = commercial_trend
→ askDirectorIa rama commercial_trend
→ loadCommercialTrendForChat
→ motor kg (trailing o calendario)
→ top movers kg + comments by nombre
→ OpenAI con pack de tendencia, no de ingreso
```

«No tengo acceso a los datos necesarios para [el impacto negativo en el ingreso]» es coherente con ese pack: **no transporta `delta_ingreso` MXN**. No es ausencia física en ARR/IGF.

Capability `delta_ingreso`: `coverage: partial`, `on_demand`, «no forecast».  
Tool `get_delta_income`: executor `loadDeltaIngresoForChat`. **Existe y está cableada.** No se invoca para esta pregunta.

`get_commercial_state` **sí** llama `computeDicf`. El planner no lo elige aquí (`isCommercialStateListQuestion` pide disminuyeron/aumentaron/dejaron/nuevos).

---

## 8. FIRST_BAD_BOUNDARY

**PLANNER**

Primera frontera que impide llegar a los datos ya calculados: la pregunta LIVE no se clasifica como ingreso forecast/DICF; se clasifica como `commercial_trend`.

Secundarias (si el planner se corrigiera):

| Orden | Frontera | Hecho |
|---|---|---|
| 2 | ROUTING / SOURCE_NOT_EXPOSED | `delta_income` → M9, no `computeDicf` / `computeDeltaIngresoForecast` |
| 3 | PERIOD_RESOLUTION | «septiembre» no es YYYY-MM; M9 ignoraría el mes nombrado y usaría los dos últimos con datos |
| 4 | COMMENT_SOURCE | join de comentarios por `cliente_key` ≠ join por nombre |

No se acepta «Director IA no lo soporta» como cierre: soporta *otro* Delta Ingreso (M9) y *otra* lista (commercial_state/DICF), y el Dashboard ya tiene el ranking.

---

## 9. Comments source map

| COMMENT_SOURCE | TABLE | CLIENT_IDENTITY_KEY | DATE_FIELD | PLANT_SCOPE | PERIOD_SCOPE | AUTHOR | TYPE |
|---|---|---|---|---|---|---|---|
| Gráfica venta-serie / Top 6 | `arr.cliente_comentarios` | `lower(trim(cliente_nombre))` | `created_at` | `planta_id` equivalentes | ninguno (2 más recientes) | `author_name` | nota libre |
| Modal Cliente Forecast | `arr.cliente_comentarios` | **`cliente_key` DICF** si `postDicfAccionesClienteKey` responde; si no, nombre+canal+subcanal | `created_at` | `planta_id` | ninguno | `author_name` | nota libre |
| Director IA annex | `arr.cliente_comentarios` | ninguno (últimos 80 de planta) | `created_at` | `planta_id` | ninguno | `author_name` | nota libre |
| Director IA commercial_trend / client_profile (nombre) | `arr.cliente_comentarios` | `lower(trim(cliente_nombre))` | `created_at` | `planta_id` | ninguno | `author_name` | nota libre |
| Director IA client_profile (key) | `arr.cliente_comentarios` | `cliente_key` | `created_at` | `planta_id` | ninguno | `author_name` | nota libre |
| Folios | `public.comentarios` | `folio_id` | `creado_en` | via `folios.planta_id` | n/a | `actor_rol` | comentario de folio |
| Action Register / notas de revisión | tablas AR | revisión/ítem | — | planta | — | — | **no** es el comentario de gráfica |
| DICF acciones | `arr.dicf_acciones` | `cliente_key` | hitos | planta | — | — | acción, no comentario libre |
| IGF / evidencias del día | notas de revisión ARR | revisión | — | — | — | — | otra semántica |

`cliente_key` = `buildClienteKey(plantaId, grupoTipo, canal, subcanal, clienteNombre)` → `planta|grupo|canal|subcanal|nombre`.

Gráfica y modal **sí pueden ser la misma tabla** y aun así divergir. No se mezclan con folios ni AR solo porque hay texto.

---

## 10. Matriz BAYAM

Evidencia humana (no ejecutada en LIVE_DB): gráfica visible; modal «Aún no hay comentarios»; Director IA recuperó el texto.

| Surface | Source | Client key | Comment found | Date | Text | Why visible/not visible |
|---|---|---|---|---|---|---|
| Gráfica `ArrVentaGraficaModal` | `GET` venta-serie → SQL `arr.cliente_comentarios` por `lower(cliente_nombre)` | nombre `bayam residences` | probable YES si el body está bajo ese nombre | `created_at` (UI muestra fecha) | texto humano citado | Predicado por **nombre**. Caption UI dice «Delta Ingreso Cliente Forecast · 2 más recientes» pero **no** usa `cliente_key`. |
| Modal Cliente Forecast `ClienteComentariosPanel` | `GET /api/dashboard/cliente-comentarios` | primero `cliente_key` DICF (`planta\|Disminuyeron\|canal\|subcanal\|BAYAM…`) | empty → «Aún no hay comentarios.» | — | — | Si existe `cliente_key`, **ignora el nombre**. Comentario guardado con key null u otra key ≠ no aparece. `canUse` false oculta el panel entero (otro síntoma). |
| Director IA (ruta LIVE = commercial_trend) | `loadRecentCommentsByClienteNombres` | nombre | probable YES | `created_at` | mismo body | Misma semántica que la gráfica. |
| Director IA annex | últimos 80 de planta | no filtra cliente | YES si está entre los 80 | `created_at` | body | Visible en prompt genérico; no es ranking. |

Fila exacta (key almacenada, canal, `planta_id`, `is_active`): **NOT_PROVEN_WITHOUT_LIVE_DB**.  
Mecanismo de divergencia: **PROVEN en código** (misma tabla, predicado distinto).

No se afirma causa comercial a partir del comentario.

---

## 11. Driver availability matrix

| VARIABLE | SOURCE | PERIOD | AVAILABLE_PER_CLIENT | USED_IN_DELTA_FORMULA | CAN_EXPLAIN_DELTA |
|---|---|---|---|---|---|
| margen | `igf.compromiso_lines` via latest `igf.versions` GLOBAL | year/month A y B | NO (planta/empresa, no cliente) | YES | NO como causa; es insumo. Negocio lo trata como externo |
| descuento | `arr.descuentos_diarios_cliente` | mes A; B o ventana hist | YES | YES (`$/kg`) | evidencia de magnitud, no causa |
| kg/venta | `arr.ventas_diarias_cliente` | mes A; B real+proy | YES | YES | evidencia de magnitud, no causa |
| disminuyó | cubeta `disminuyeron` | mismo corte | YES (clasificación) | N/A (es el resultado) | tautológico |
| dejó de comprar | cubeta `dejaron` | mismo corte | YES | N/A | tautológico; ≠ kg trailing |
| HG | `arr.hg_diario` existe en el sistema | diario planta | NO en esta cadena | NO | NO |
| comentarios | `arr.cliente_comentarios` | sin periodo del delta | YES si hay match de identidad | NO | NO (declaración, no causa) |
| compromisos / acciones | `arr.dicf_acciones` | acción | YES si hay key | NO | NO automático |

Controlabilidad (solo documentación; no implementar): descuento, volumen y seguimiento *podrían* etiquetarse controlables en un FIX; margen es el candidato no controlable; comentario/HG = desconocido salvo evidencia aparte.

---

## 12. H1–H10

| ID | Hipótesis | Disposition |
|---|---|---|
| H1 | El Delta Ingreso ya está calculado en un helper reutilizable | **PROVEN** — `computeDicf` y `computeDeltaIngresoForecast`. M9 es un tercer helper (histórico). |
| H2 | Director IA no tiene tool/loader para esa fuente | **REJECTED** como «no hay tool de ingreso»; **PROVEN** como «no hay tool del forecast». `get_delta_income` = M9. `get_commercial_state` = `computeDicf` pero no se usa aquí. |
| H3 | Planner conoce `delta_income` pero la ejecución no está conectada | **PARTIAL** — intent existe y está conectado a M9. No conecta forecast. La LIVE ni siquiera llega al intent. |
| H4 | El ranking Top 5 puede obtenerse sin nueva fórmula | **PROVEN** — `disminuyeron` ya ordenado; `slice(0,5)`. |
| H5 | Septiembre usa forecast y no venta real cerrada | **PROVEN condicional** — si el ancla es mes abierto y `lastDate < fin de mes`, B es mezcla real+proyección. Si DICF ancla a `MAX(fecha)` de agosto, «septiembre» ni se calcula. Exactitud LIVE: **NOT_PROVEN_WITHOUT_LIVE_DB**. |
| H6 | Comentarios del modal y de la gráfica vienen de fuentes diferentes | **REJECTED** (tabla distinta). **PROVEN** (predicado distinto sobre `arr.cliente_comentarios`). |
| H7 | Director IA ya accede a al menos una fuente de comentarios | **PROVEN** — annex, commercial_trend by name, client_profile. |
| H8 | Se puede unir Delta Ingreso + comentarios con identidad canónica existente | **PROVEN por nombre** (`cliente_norm` ≈ `cliente_nombre`). **PARTIAL por `cliente_key`** (falla el modal). |
| H9 | Hay variables para explicar parte del deterioro (kg, desc, HG, margen) | **PROVEN** kg, desc, margen como *insumos*. **REJECTED** HG en esta cadena. Correlación ≠ causa. |
| H10 | «No tengo acceso» es cobertura/routing, no ausencia del dato | **PROVEN**. |

---

## 13. Golden / Runtime gap

No hay en `test/fixtures/director-ia-golden-cases.js` ni Runtime harness cobertura para:

- `Dame los clientes con mayor Delta Ingreso negativo de septiembre.`
- `Dame los 5 clientes con mayor Delta Ingreso negativo y sus comentarios.`
- la pregunta LIVE.

Tests existentes (`test/director-ia-m9-deltas.test.js`) cubren `¿Cómo cambió el ingreso?` → `delta_income` + M9.  
No verifican forecast, Top 5, signo MXN de septiembre, ni join de comentarios.

| | Intent hoy | Tool si ese intent ganara | Source | Qué verifica el test | Qué NO verifica |
|---|---|---|---|---|---|
| LIVE + comentarios | `commercial_trend` | trend kg | ARR kg | nada de ingreso | ranking MXN, periodo sept, comments+delta |
| sin comentarios | `client_profile` | profile | ARR cliente | n/a | ingreso planta |
| wording «Delta Ingreso»+comentarios | `client_analysis` | comentarios | `arr.cliente_comentarios` | n/a | ranking |
| `cómo cambió el ingreso` | `delta_income` | `get_delta_income` | M9 histórico 80/20 | intent/loader M9 | forecast, Top 5, sept |

---

## 14. Regresiones futuras (NO implementadas)

| ID | Objetivo |
|---|---|
| R-DELTA-INCOME-001 | Pregunta de mayor impacto negativo → pack de ingreso forecast/DICF, no `commercial_trend` kg |
| R-DELTA-INCOME-002 | «septiembre» / mes nombrado → mes calendario de forecast, no trailing ni default M9 |
| R-DELTA-INCOME-003 | MXN y signo: `delta = B − A`; no etiquetar toneladas como pesos |
| R-DELTA-INCOME-004 | Orden Top 5 = más negativo → menos negativo; sin positivos |
| R-DELTA-INCOME-005 | Comentarios enrich por identidad declarada; fecha + fuente |
| R-DELTA-INCOME-006 | Sin comentario → ausencia explícita, no inventar |
| R-DELTA-INCOME-007 | Comentario no se verbaliza como causa del delta |
| R-DELTA-INCOME-008 | Paridad de identidad Delta Ingreso ↔ comentarios (nombre vs `cliente_key`) |
| R-DELTA-INCOME-009 | Suma del impacto de los Top 5 |
| R-DELTA-INCOME-010 | Insumos visibles donde existan: kg A/B, desc, margen; HG solo si entra a la cadena |

---

## 15. SELECTs mínimos (no ejecutados)

Requieren G1 LIVE_DB READ-ONLY nuevo.

```sql
-- 1) Ancla de mes DICF (¿septiembre o aún agosto?)
SELECT MAX(v.fecha) AS max_fecha
  FROM arr.ventas_diarias_cliente v
 WHERE UPPER(TRIM(v.plant_code)) IN ('ACAPULCO', /* clave provincia E3 si aplica */)
    OR UPPER(TRIM(v.plant_code)) = UPPER('Acapulco');
-- columnas: max_fecha
-- planta: Acapulco
-- LIMIT: 1

-- 2) Versión IGF usada por getMargenKgPorPeriodo
SELECT id, version_number, financial_state, year, month
  FROM igf.versions
 WHERE plant_code = 'GLOBAL' AND year = 2026 AND month = 9
 ORDER BY version_number DESC
 LIMIT 1;

-- 3) Cache DICF / Forecast (si el botón ya se corrió)
SELECT cliente_norm, ingreso_a, ingreso_b, delta_ingreso, kg_a, kg_b_proj
  FROM arr.delta_ingreso_forecast_cliente
 WHERE UPPER(TRIM(plant_code)) = UPPER('Acapulco') AND year = 2026 AND month = 9
   AND delta_ingreso < 0
 ORDER BY delta_ingreso ASC
 LIMIT 5;

SELECT cliente_norm, ingreso_forecast, kg_mes_forecast, es_disminuyeron, es_dejaron
  FROM arr.dicf_cliente_mes
 WHERE UPPER(TRIM(plant_code)) = UPPER('Acapulco') AND year = 2026 AND month = 9
 ORDER BY (ingreso_forecast) ASC
 LIMIT 20;

-- 4) Divergencia BAYAM (misma tabla, dos predicados)
SELECT id, planta_id, cliente_key, cliente_nombre, canal, subcanal,
       left(body, 120) AS body_head, created_at, is_active
  FROM arr.cliente_comentarios
 WHERE is_active = true
   AND lower(trim(cliente_nombre)) LIKE '%bayam%'
 ORDER BY created_at DESC
 LIMIT 20;
```

No se ejecutaron.

---

## 16. Recommended next FIX slice

`FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001`

Un slice, sin nueva fórmula:

1. Planner: «impacto negativo» / «delta ingreso negativo» + mes [+ comentarios] → intent que ejecute **`computeDicf`** (o Forecast con mes explícito), no `commercial_trend`.
2. Ranking: `delta < 0`, sort asc, Top N; declarar recorte; sumar Top N.
3. Periodo: mes nombrado = calendario de ese mes; no M9 default; no trailing kg.
4. Comentarios: join por nombre (paridad gráfica) **y** documentar miss por `cliente_key`; ausencia explícita; comentario ≠ causa.
5. Reusar helpers; no hardcodear clientes ni MXN LIVE.
6. Gate Runtime R-DELTA-INCOME-001..010 **después** de G1 de ese FIX; no en esta auditoría.

Fuera de ese slice: rentabilidad forecast completa, alertas, HG, nuevos vs reactivados, unificar `cliente_key` del modal (puede ser FIX aparte de comentarios).

---

## 17. Git

Rama: `audit/director-ia-delta-ingreso-negative-impact-comments-001`  
implementation SHA: pendiente del commit de esta rama.

No push. No merge. No deploy. No next task.
