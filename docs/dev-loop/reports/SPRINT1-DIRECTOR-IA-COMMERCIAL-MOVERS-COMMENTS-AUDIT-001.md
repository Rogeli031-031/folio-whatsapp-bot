# SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-AUDIT-001

tipo: AUDITORÍA CONTRACTUAL — SOLO LECTURA
outcome: INFORME
AUDIT_ONLY: YES

```yaml
task_id: SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-AUDIT-001
outcome: AUDIT_ONLY
current_task_untouched: true
current_task_id: SPRINT1-DIRECTOR-IA-FORECAST-NATURAL-LANGUAGE-PARITY-001
current_task_status: DONE_PENDING_REVIEW
loop_gate: "Esta auditoría no abre CURRENT_TASK ni autoriza implementación."
files_touched:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-AUDIT-001.md
files_not_touched:
  - código de producto
  - tests
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/
  - commercial-trend-engine
  - Forecast / IGF / ARR / Dashboard
git: none
sql: none
secrets_check: none
```

Clasificación: **PROVEN** | **INFERRED** | **NOT_PROVEN**.

Método: lectura de módulos de producción + ejecución de detectores (`node -e`). Sin sesión de chat de producción. Sin SQL.

Un informe terminado **no autoriza implementación**.

---

## 1. Resumen ejecutivo

Los comentarios registrados **ya se enganchan** a los movers de Director IA. No hace falta un motor nuevo ni tocar el Dashboard.

Flujo ya existente:

1. `commercial-trend-engine.selectTopMovers` calcula Top 6 por `|Δ|` (hecho).
2. `enrichMoversWithRegisteredComments` adjunta hasta **2** filas de `arr.cliente_comentarios` por **nombre** + `planta_id` equivalentes.
3. El Estado Ejecutivo verbaliza hasta **2+2 por canal** y, si hay body, escribe `Comentario registrado: «…». El comentario no es la causa.`

El problema de producto no es «no existe la fuente». Es:

- el join es **por nombre**, no por `cliente_key` ni canal;
- **no** se filtra por la ventana 30d/90d del delta;
- la fecha existe en DB y se carga, pero **no se muestra**;
- compactación 2+2 puede ocultar un mover (p. ej. Grupo Move) aunque tenga comentario;
- «¿Por qué cayó Grupo Move?» **no** entra a movers: `unknown` → hereda `plant_diagnosis`.

Opción B (dos mensajes) **no** está soportada por el contrato actual del chat (`answer: string` + un bubble). Exigiría cambio de API/UI. No es necesaria para adjuntar comentarios: la opción A ya está en el pack.

`DASHBOARD_BEHAVIOR_CHANGED` esperado en cualquier implementación posterior: **NO**.

---

## 2. Flujo físico actual

### 2.1 «¿Cómo vamos?» (Estado Ejecutivo)

```
askDirectorIa
  → shouldHandleExecutiveStatus
  → handleExecutiveStatusForChat
  → loadCommercialTrendForChat(..., { channel: "both", range_days: 30, compare: true })
       → loadCommercialTrend (engine) por CASA y COMISIONISTA
       → selectTopMovers (Top 6, sin comentarios)
       → enrichMoversWithRegisteredComments (nombre + planta)
  → buildExecutiveStatusPack
       → COMMERCIAL_MOVERS (payload completo Top 6 + verbal 2+2)
       → formatOneMoverLine (hecho + comentario + «no es la causa»)
  → GPT redacta un solo `answer`
```

**PROVEN** (`director-ia-chat.js` ~3055–3063; CEL `collectChannelMovers` / `formatCommercialMoversSummary` / `formatOneMoverLine`).

### 2.2 Pregunta directa de movers + comentarios

```
isCommercialMoversQuestion → isCommercialTrendQuestion
  → planner commercial_trend
  → loadCommercialTrendForChat (misma enriquecienda)
  → buildCommercialTrendPrompt (lista Top 6 + formatRegisteredComments)
  → un solo answer
```

**PROVEN.**

### 2.3 Lo que no ocurre

El engine **no** lee comentarios. El Dashboard **no** alimenta el chat. Forecast/ARR/IGF **no** participan. **PROVEN.**

---

## 3. Fuente real de Commercial Movers

| Hecho | Evidencia | Clasificación |
|---|---|---|
| Motor | `lib/commercial-trend-engine.js` `selectTopMovers` | **PROVEN** |
| Ranking | todos los clientes cur∪prev; `delta = actual − previo`; descarta `|Δ|<0.001`; sort `\|Δ\|`; `slice(0, 6)` | **PROVEN** |
| Tipos | `nuevo` (prev≤0, actual>0); `perdido` (prev>0, actual≤0); `disminucion` (Δ<0); `aumento` | **PROVEN** |
| Ventana Estado Ejecutivo | `range_days: 30` trailing, ancla `MAX(fecha)` | **PROVEN** |
| Canales | CASA y COMISIONISTA en llamadas **separadas** | **PROVEN** |
| Identidad del mover | `cliente` = nombre string del engine (no `cliente_id`) | **PROVEN** |
| Keys derivadas | `attachMoverKeys` → `buildClienteKey(planta, grupo DICF, canal, "", nombre)` | **PROVEN** (no se usan para el join de comentarios) |
| Compactación verbal | `EXECUTIVE_MOVERS_PER_SIGN = 2` negativos + 2 positivos **por canal** | **PROVEN** |
| Top 6 interno | `engine_top_n_unchanged: true`; el payload guarda los 6 | **PROVEN** |

No modificar el engine ni el Top 6. El comentario es **post-proceso**.

---

## 4. Fuente real de comentarios

Tabla: `arr.cliente_comentarios`.

Columnas reales usadas o existentes (`lib/cliente-comentarios.js` `ensureClienteComentariosTable` / `mapRow`):

| Campo | En tabla | En loader de movers | En verbalización CEL |
|---|---|---|---|
| `id` | sí | no se devuelve | no |
| `planta_id` | sí NOT NULL | filtro `ANY(plantaIds equivalentes)` | no |
| `cliente_key` | sí NULL | **no se usa** | no |
| `cliente_nombre` | sí NOT NULL | join `lower(trim(...))` | no (el nombre sale del mover) |
| `canal` / `subcanal` | sí | **no se filtran** | no |
| `body` | sí NOT NULL | sí | sí |
| `author_name` | sí | sí | **no se muestra** |
| `created_by_usuario_id` | sí | **no se carga** | no |
| `created_at` | TIMESTAMPTZ | sí, recortado a `YYYY-MM-DD` | **no se muestra** |
| `is_active` | sí | `true` | — |

Loaders distintos (no fusionar):

| Función | Join | Límite | Uso |
|---|---|---|---|
| `loadRecentCommentsByClienteNombres` | nombre + planta | 2/cliente | movers + gráfica venta-serie |
| `listClienteComentarios` | key **o** nombre (+ canal opcional) | 1–200 | API dashboard |
| `loadClienteComentariosForDirectorIa` | solo planta | 80 recientes de **toda** la planta | anexo legado del chat |
| `qComments` (perfil / daily / M11) | `cliente_key` NOT NULL | propio | expediente / perfil |

**PROVEN.** El path de movers **no** usa el join por `cliente_key` del perfil/M11.

`public.comentarios` (folios) es **otra** fuente. No entra a movers. **PROVEN.**

---

## 5. Identidad comentario ↔ cliente

Path movers / venta-serie:

```
lower(trim(mover.cliente)) === lower(trim(arr.cliente_comentarios.cliente_nombre))
AND planta_id IN getPlantaIdsEquivalentes(canonical)
AND is_active
```

**PROVEN** (`loadRecentCommentsByClienteNombres`; espejo en `server.js` ~15120–15156).

No hay `cliente_id` numérico en esta tabla. **PROVEN.**

`cliente_key` existe y `attachMoverKeys` la deriva, pero el enrich **ignora** esas keys. **PROVEN.**

Canal del mover (CASA vs COMISIONISTA) **no** restringe el comentario. Homónimo en otro canal de la misma planta puede mezclarse. **PROVEN** la ausencia de filtro; **INFERRED** que ocurre en datos reales (sin query).

Nombre inexacto (espacios distintos se normalizan; «GRUPO MOVE» vs «Grupo Move» coincide; «GRUPO MOVE EMPRESARIAL» vs «GRUPO MOVE» **no**). **PROVEN** la igualdad exacta post-`lower(trim)`.

---

## 6. Semántica temporal

### «Últimos 2 comentarios»

`ROW_NUMBER() PARTITION BY lower(trim(cliente_nombre)) ORDER BY created_at DESC, id DESC` y `rn <= 2`.

Significa: los **2 más recientes activos de ese nombre en esas plantas**. No «2 de la ventana del delta». No «2 por canal». **PROVEN.** Comentario en `cliente-comentarios.js` ~248–249: *«No filtra por periodo del delta.»*

### Timestamp

`created_at TIMESTAMPTZ NOT NULL DEFAULT now()` es fecha/hora real. **PROVEN.**

El loader de movers la recorta a **día** ISO (`slice(0, 10)`). Hora y zona se pierden en el objeto adjunto. **PROVEN.**

Ni `formatOneMoverLine` ni `formatRegisteredComments` imprimen fecha ni autor. **PROVEN.**

### Ventanas 30d / 90d (solo documentar; no implementar)

El delta es trailing N días vs N días previos. El comentario es «último registrado del cliente», posiblemente **fuera** de ambas ventanas o **después** del ancla.

Comportamiento posterior correcto (contrato, no código):

- 30d y 90d deben **seguir usando el mismo join**; no recálculo.
- Mostrar `created_at` (día) y declarar que **no está acotado a la ventana**.
- No filtrar en silencio por ventana: un vacío no significa «nadie comentó en 30d» si se ocultó un comentario de hace 60 días.
- Si más adelante se filtra, debe ser flag explícito (`in_window` / `out_of_window`), no drop silencioso.

---

## 7. Riesgos de contaminación

| Riesgo | ¿Posible hoy? | Clasificación |
|---|---|---|
| Homónimo otra planta | Mitigado: `planta_id` + equivalentes | **PROVEN** el filtro; equivalentes **pueden** unir plantas alias |
| Homónimo otro canal | Sí: sin filtro `canal` | **PROVEN** |
| Nombre colisiona dos clientes | Sí: partition solo por nombre | **PROVEN** |
| Comentario antiguo vs delta actual | Sí: sin filtro de ventana | **PROVEN** |
| Comentario posterior al periodo | Sí: se toma lo más reciente aunque sea de hoy y el delta sea 30d atrás | **PROVEN** el criterio `ORDER BY created_at DESC` |
| `cliente_key` null | El path por nombre **sí** los incluye | **PROVEN** |
| Comentario `is_active=false` | Excluido | **PROVEN** |
| Body vacío | `body TEXT NOT NULL`; verbal filtra `body` trim vacío | **PROVEN** |
| Fallo SQL | enrich catch → `registered_comments: []`; serie/movers siguen | **PROVEN** |

Caso observado «Dejó de comprar» + «COMPRA DIARIAMENTE»:

No es contradicción lógica automática. Son **dos tiempos**. El test de movers ya usa ese par y exige la frase de no-causa. **PROVEN** en tests; **NOT_PROVEN** que sea el mismo cliente/planta de producción.

---

## 8. Riesgo comentario ≠ causa

Separación ya escrita en runtime:

| Capa | Texto | Clasificación |
|---|---|---|
| Addendum commercial_trend | «Comentarios adjuntos son declaraciones… no causas» | **PROVEN** |
| CEL `formatOneMoverLine` | hecho; luego `Comentario registrado`; luego `El comentario no es la causa.` | **PROVEN** |
| Prompt Estado Ejecutivo | «Comentario registrado no es causa: no lo pongas entre paréntesis como si explicara el delta» | **PROVEN** |
| Tests movers | no reconciliar comentario contradictorio con el delta | **PROVEN** |

El LLM **puede** omitir o suavizar esa separación. Eso es **INFERRED** (no hay log de producción). El pack determinista ya la impone.

Prohibido en una implementación futura: «cayó porque [comentario]».

---

## 9. Comportamiento de preguntas directas

Ejecución de detectores de producción:

| Pregunta | movers | trend | profile | planner | Con inherit «¿Cómo vamos?» |
|---|---|---|---|---|---|
| ¿Qué clientes tienen tendencia negativa en ventas y qué comentarios tienen? | true | true | true* | **commercial_trend** | commercial_trend (no planta) |
| ¿Qué comentarios tienen los clientes que disminuyeron? | true | true | false | **commercial_trend** | igual |
| ¿Qué comentarios tienen los clientes que dejaron de comprar? | true | true | false | **commercial_trend** | igual |
| ¿Por qué cayó Grupo Move? | false | false | false | **unknown** | **plant_diagnosis** |

\*Q1 también dispara `isClientProfileQuestion` (`comentari` + palabra `clientes`). El planner evalúa `commercial_trend` **antes**. **PROVEN.**

CEL: las tres primeras son `specialized_standalone` (no Estado Ejecutivo). La cuarta es `CAUSE_EXPLANATION` / `later_slice` (`implemented: false`). **PROVEN.**

«¿Por qué cayó Grupo Move?» no usa `cliente_comentarios` como prueba de causa **porque no entra al handler de comentarios**. Cae a diagnóstico de planta (AR/DICF/bitácora/ARR). **PROVEN** el routing; **NOT_PROVEN** el texto LLM.

Semántica deseada (no hardcodear copy):

```
HECHO: delta/tipo del motor para ese cliente (si está en top_movers o se puede resolver).
DECLARACIÓN: comentario(s) registrados, con fecha si se muestra.
CAUSA: no se afirma desde el comentario. Sin otra evidencia autorizada → no hay causa.
```

Eso **ya** está en el prompt de `commercial_trend` para listas. **No** está cableado para la pregunta causal nominada. **PROVEN.**

Forecast routing no interviene (`classifyForecastMagnitudeFollowUp` = null). **PROVEN.**

---

## 10. Viabilidad de una respuesta vs dos mensajes

### A) Comentarios en el mismo bloque

Ya implementado en pack + prompt. El LLM emite **un** `answer`. Riesgo: omitir IGF/Forecast si el modelo alarga movers. El prompt vigente **ordena** no omitir IGF stored por dejar espacio a COMMERCIAL_MOVERS. **PROVEN.**

### B) Dos mensajes (Estado Ejecutivo + detalle comercial)

Contrato HTTP/UI actual:

- Backend: un objeto `{ ok, answer: string, sources, context_meta }` (`buildExecutiveStatusChatResult`, `buildCommercialTrendChatResult`).
- Frontend: `DirectorIaChatResponse.answer: string`; el panel hace `content: res.answer` **una** vez (`DirectorIaChatPanel.tsx` ~97–99).

No hay `answers[]`, `message_2` ni segundo POST. **PROVEN.**

Dos burbujas exigirían cambio de contrato + UI. Eso **sí** toca Dashboard/chat shell. Fuera de esta auditoría como implementación. No es necesario para mostrar comentarios.

Prioridad: **A**, compactada, con fecha si se autoriza un micro-cambio. **B** = `OUT_OF_SCOPE_FOLLOWUP`.

---

## 11. Cambio mínimo recomendado

La adición de comentarios al bloque **ya está hecha**. Una implementación futura solo debería cerrar huecos **si** el humano los autoriza:

1. **Mostrar `created_at` (día)** ya cargado en `formatOneMoverLine` / `formatRegisteredComments`. Cierra la falsa contradicción temporal. No toca engine ni Dashboard.
2. **No** ampliar la verbal 2+2. Si Grupo Move no está en la proyección, la pregunta directa `commercial_trend` (Top 6) es el sitio correcto, no hinchar «¿Cómo vamos?».
3. **No** cambiar el join a `cliente_key` en el primer corte: las keys de movers son **derivadas**, muchos comentarios tienen key null; el Dashboard usa el mismo join por nombre. Cambiar solo Director IA es posible; cambiar venta-serie sería Dashboard.
4. **No** filtrar por ventana 30/90 en silencio.
5. **No** dos mensajes.
6. **No** rediseñar «¿Por qué cayó X?» aquí. Si se autoriza después: handler local hecho (delta) + declaración + no-causa; **no** `plant_diagnosis` ni comentario-como-causa.
7. Corregir el flag mentiroso `provenance.comments_included: false` (los comentarios **sí** se adjuntan). Cosmético; no bloquea.

Preferencia: REUTILIZAR el enrich y el copy de no-causa. No phrasebook. No nuevo pack.

---

## 12. Archivos que requeriría una implementación posterior

Si solo se muestra la fecha (cambio mínimo real):

- `lib/director-ia-conversational-executive-layer.js` (`formatOneMoverLine`)
- `lib/director-ia-commercial-trend.js` (`formatRegisteredComments`) — opcional, misma semántica
- `test/director-ia-commercial-movers-additive.test.js`

Si se atiende Q4 (alcance **distinto**, no autorizado):

- detector/routing en CEL o `commercial-trend` **sin** tocar planner global
- tests de no-causa + no inherit planta

**No** se espera tocar:

- `lib/commercial-trend-engine.js`
- pack Forecast / IGF / ARR
- `server.js` venta-serie (Dashboard)
- gráfica
- `CURRENT_TASK` de Forecast NL parity

---

## 13. Matriz de tests propuesta

Usar fixtures; no hardcodear Puebla ni Grupo Move como contrato universal.

| ID | Caso | Esperado |
|---|---|---|
| M1 | mover + 2 comentarios | ambos bodies; etiqueta «registrado»; no «porque» |
| M2 | mover + 0 comentarios | «Sin comentario reciente.» |
| M3 | mover + 1 comentario | un body |
| M4 | body vacío/whitespace | se omite; no inventa |
| M5 | perdido + «COMPRA DIARIAMENTE» | ambos visibles; no reconciliar |
| M6 | verbal 2+2 | 7º mover del Top 6 no entra al Estado Ejecutivo; sí en payload motor |
| M7 | nombre distinto | no adjunta |
| M8 | otra planta | no adjunta |
| M9 | `skipComments` / loader fail | movers intactos; comments [] |
| M10 | Q lista + comentarios | `commercial_trend`, no `plant_diagnosis` |
| M11 | «¿Por qué cayó X?» | hoy: inherit planta (**regresión de routing actual**); futuro: no causa desde comentario |
| M12 | «¿Cómo vamos?» | IGF stored + Forecast + 7 magnitudes + movers + riesgos intactos |
| M13 | follow-up Forecast descuento | no se reinterpreta como movers |
| R-30/90 | mismo cliente, ventanas distintas | mismo join; delta puede cambiar; comentario puede ser el mismo |

---

## 14. Regresiones que deben protegerse

- Situación, Magnitudes (actual, Forecast venta/descuento, IGF stored venta/descuento, utilidad, resultado)
- Tendencias CASA / COMISIONISTA
- COMMERCIAL_MOVERS compactados; Top 6 del motor
- Riesgos, Ejecución, Próxima decisión
- Forecast NL parity / `forecast_run`
- PROM, IGF, ARR, Dashboard, gráfica, 1M/3M
- commercial-trend-engine
- DICF / AR / Bitácora no sustituyen Δ
- Golden Set / suite Director IA

---

## 15. PROVEN / INFERRED / NOT_PROVEN

| Afirmación | Clase |
|---|---|
| Comentarios ya se adjuntan a movers en chat y Estado Ejecutivo | **PROVEN** |
| Join por `lower(trim(nombre))` + planta equivalente | **PROVEN** |
| Últimos 2 = `created_at DESC` sin ventana | **PROVEN** |
| `created_at` existe; no se verbaliza | **PROVEN** |
| `author_name` se carga; no se verbaliza | **PROVEN** |
| Top 6 ≠ verbal 2+2 | **PROVEN** |
| Comentario ≠ causa en prompts/tests | **PROVEN** |
| Q listas → `commercial_trend` | **PROVEN** |
| Q causal nominada → `unknown` / inherit `plant_diagnosis` | **PROVEN** |
| Un `answer` string; UI un bubble | **PROVEN** |
| Homónimo de canal ocurre en producción | **NOT_PROVEN** (sí el hueco de código) |
| El LLM de producción omite comentarios o IGF | **NOT_PROVEN** |
| Grupo Move / «COMPRA DIARIAMENTE» es un par real de una planta | **NOT_PROVEN** (sí el fixture de test) |

---

## 16. DASHBOARD_BEHAVIOR_CHANGED esperado

```
DASHBOARD_BEHAVIOR_CHANGED = NO
```

Cualquier implementación posterior debe dejar intactos endpoints, UI, gráfica, 1M/3M y el SQL de venta-serie. El chat ya reutiliza `loadRecentCommentsByClienteNombres` (misma semántica que la gráfica). No hace falta cambiar el Dashboard para mostrar comentarios en Director IA.

---

## Confirmaciones

```
CURRENT_TASK_CHANGED = NO
PRODUCTION_CODE_CHANGED = NO
COMMERCIAL_TREND_ENGINE_CHANGED = NO
FORECAST_CHANGED = NO
ARR_CHANGED = NO
IGF_CHANGED = NO
DASHBOARD_BEHAVIOR_CHANGED = NO
AUDIT_ONLY = YES
```

---

## 17. STOP (pase 1)

El pase 1 queda como inventario. El pase profundo está abajo. Sigue sin implementación.

---

# DEEP AUDIT / HUMAN REVIEW PASS

Fecha: 2026-09-01. Solo lectura. `CURRENT_TASK` no tocado.

Pregunta que este pase debe cerrar: **si los comentarios ya están en el bloque, ¿por qué no se vieron en «¿Cómo vamos?» real?**

---

## A. Traza física end-to-end

| # | Frontera | Qué ocurre | Estado del comentario | Cita |
|---|---|---|---|---|
| 1 | DB | `arr.cliente_comentarios` (`body`, `author_name`, `created_at` TIMESTAMPTZ, `cliente_nombre`, `planta_id`, `cliente_key` NULL, `canal`, `is_active`) | **presente** en origen si hay fila activa | `lib/cliente-comentarios.js` `ensureClienteComentariosTable` ~12–24 |
| 2 | Loader | `loadRecentCommentsByClienteNombres`: `ROW_NUMBER() PARTITION BY lower(trim(cliente_nombre)) ORDER BY created_at DESC, id DESC` `rn <= 2`; `planta_id = ANY($1)`; `is_active`; igualdad de nombre | **ausente** si no hay match; **transformado** a `{body, author_name, created_at: YYYY-MM-DD}` (sin hora, sin id, sin key, sin canal) | `lib/cliente-comentarios.js` ~252–298 |
| 3 | Enrich | `enrichMoversWithRegisteredComments` llama al loader con nombres del Top 6; `skipComments` o sin `query` o catch → `[]` | **descartado** en fail-closed; **presente** si Map hit | `lib/director-ia-commercial-trend.js` ~264–288 |
| 4 | Trend payload | `top_movers[].registered_comments`; `provenance.comments_included` sigue `false` (flag falso) | **presente** en objeto; flag **no** refleja | ~693–749 |
| 5 | Estado Ejecutivo | `handleExecutiveStatusForChat` → `loadCommercialTrendForChat(..., range_days: 30, channel: both)` **sin** `skipComments` | enrich **sí** corre si el pool tiene `query` | `lib/director-ia-chat.js` ~3055–3063 |
| 6 | Pack | `collectChannelMovers` copia `registered_comments`; `formatCommercialMoversSummary` + `formatOneMoverLine` | **presente** en `summary` y en líneas del pack **solo para verbal 2+2**; Top 6 completo queda en `payload` | CEL ~893–947, ~1326–1348 |
| 7 | Prompt | `formatPackForPrompt` imprime `formatOneMoverLine` por cada verbal; `buildExecutiveStatusPrompt` añade «No hagas dump» | Si enrich halló body: **presente** en userContent. Test: `«POR FALTA DE PIPAS»` / `«COMPRA DIARIAMENTE»` | CEL ~1605–1619, ~1638–1657; `test/director-ia-commercial-movers-additive.test.js` ~285–292 |
| 8 | Regla verbal | IGF stored: **«No las omitas»**. Comentario: **no** hay «incluye Comentario registrado; no lo omitas». Sí: «incluye el bloque»; «comentario no es causa»; «no lo pongas entre paréntesis como si explicara el delta» | Bloque movers **obligatorio**. Cláusula de comentario **opcional** para el LLM | CEL ~1541–1546, ~1569, ~1656 |
| 9 | Guard | `applyExecutiveLanguageGuard` no borra «Comentario registrado» | **no descartado** post-LLM | CEL ~1661–1673 |
| 10 | Respuesta | `openaiDirectorIaChat` → un `answer` string; `max_tokens: 1000` | **opcional** en el texto final | `director-ia-chat.js` ~2478–2503, ~3207 |

**PROVEN:** el comentario puede estar en el **prompt** y no en la **respuesta**. Eso no es pérdida en loader.

**PROVEN:** si el loader no hace match, el prompt dice `Sin comentario reciente.` y el LLM no tiene «falta de pipas» que copiar.

**NOT_PROVEN** cuál de las dos ocurrió en la sesión de producción (no hay dump del prompt ni query a DB).

---

## B. Casos observados (fixtures vs producción)

El repo **sí** tiene fixtures de:

- `TORTILLERIA ERICK` + `POR FALTA DE PIPAS`
- `GRUPO MOVE EMPRESARIAL` + `COMPRA DIARIAMENTE`

en `test/director-ia-commercial-movers-additive.test.js` (~120–135, ~285–292). Con esos fixtures, **entran al pack y al prompt**. **PROVEN.**

El repo **no** tiene filas reales de:

- VENTA PUBLICO EN GENERAL, 62 CALZADA, METEPEC VENTA PUBLICO GENERAL, JOSSELIN LOPEZ AQUINO, SERVICIOS ENERGETICOS ROMEGAS, 61 CUMBRE, CARBURADORA MASTER.

Ni `created_at` de producción. **NOT_PROVEN** para esos nombres (existencia, match, fecha, canal).

| Cliente (observación humana) | Top 6 | Verbal 2+2 | ¿Se consulta? | ¿Se encuentra? | ¿Prompt? | ¿Obligatorio en answer? |
|---|---|---|---|---|---|---|
| TORTILLERIA ERICK | solo si `|Δ|` entra al Top 6 de **su canal** | solo si está entre los 2 negativos (o 2 positivos) de ese canal, **en orden de aparición del Top 6** | sí, si está en Top 6 | solo si `lower(trim(nombre))` exacto | sí, si verbal + match | **no** |
| GRUPO MOVE EMPRESARIAL | igual | igual; −33.87 t es material → **INFERRED** alto chance de Top 6; verbal **INFERRED** si es de los 2 `|Δ|` negativos del canal | igual | igual | igual | **no** |
| 62 CALZADA / VENTA PUBLICO… | **NOT_PROVEN** | 4 negativos en una planta caben como **2 CASA + 2 COMI** (verbal). Más de 2 negativos **por canal** implica que el LLM **no** respetó 2+2 o mezcló canales. **PROVEN** el tope; **NOT_PROVEN** el layout real | si Top 6 | NOT_PROVEN | NOT_PROVEN | no |
| Puebla (Metepec / Josselin / Romegas) | NOT_PROVEN | NOT_PROVEN | NOT_PROVEN | NOT_PROVEN | NOT_PROVEN | no |

Comentarios vistos «previamente» (gráfica o chat anterior) **no prueban** que el loader del Estado Ejecutivo los haya encontrado en ese turno. Misma query que venta-serie **si** `plantaIds` no está vacío. **PROVEN** la query; **NOT_PROVEN** el `planta_id` de aquella sesión.

---

## C. Compactación 2+2

Orden físico **PROVEN**:

1. `selectTopMovers` → Top 6 por `|Δ|` (**sin** comentarios).
2. `enrichMoversWithRegisteredComments` sobre esos 6.
3. `collectChannelMovers` (los 6 enriquecidos).
4. `projectChannelMoversVerbal`: `filter(neg).slice(0,2)` + `filter(pos).slice(0,2)` **después** del enrich.

Respuestas:

1. Selección verbal **después** de enriquecer. **PROVEN.**
2. Sí: un Top 6 con comentario puede **no** entrar a las 4 líneas verbales. Su comentario **no** se imprime en `formatPackForPrompt` (solo verbal). Queda en `payload` (el LLM tiene instrucción de **no** imprimir los 12). **PROVEN.**
3. Prioridad = orden del Top 6 (= `|Δ|`), no «tiene comentario». **PROVEN.**
4. Enrich no reordena ni cambia `delta_ton`. **PROVEN.**
5. El comentario **no debe** cambiar materialidad. Hoy **no** la cambia. Conservar.

---

## D. Temporalidad

Ventana W del Estado Ejecutivo = trailing 30d (`range_days: 30`). **PROVEN.**
Comentario no se compara con W. **PROVEN.**

Semántica recomendada (no copy, no implementar):

| Relación `created_at` (D) vs W | Etiqueta epistemológica | ¿Causa? |
|---|---|---|
| D ∈ W | «Comentario registrado durante la ventana» | no |
| D anterior a W | «Último comentario registrado; fuera de la ventana (anterior)» | no |
| D posterior a W | «Comentario registrado después de la ventana» | no |
| D null/vacío | «Fecha no disponible» | no |

Mostrar día ya cargado (`YYYY-MM-DD`) basta para no mentir. Filtrar por W en silencio: **no**.

1M/3M: misma semántica; no hace falta implementar selectores ahora.

---

## E. Identidad

| Pieza | Identificador | Uso en movers+comentarios |
|---|---|---|
| Engine | `cliente` string | identidad del Δ |
| `attachMoverKeys` | `cliente_key` **derivada** `planta\|grupo DICF\|canal\|subcanal\|nombre` (`normalizeKeyPart`: lower, NFD, sin acentos, espacios colapsados) | **no** se usa para join de comentarios |
| Comentarios | `cliente_key` nullable; `cliente_nombre`; `canal`/`subcanal` | join solo `lower(trim(nombre))` — **sin** quitar acentos |
| Alias comercial | módulo entidades | **no** entra al enrich |

Asimetría **PROVEN:** keys quitan acentos; el join de comentarios **no**. «JOSE» vs «JOSÉ» no matchea comentarios; sí podría matchear una key.

¿Migrar a identificador estable **sin** cambiar esquema ni Dashboard?

- Join por `cliente_key` **solo** donde el comentario ya tiene key: **PROVEN POSSIBLE** como *complemento*.
- Sustituir el join por nombre para **todos** los comentarios: **PROVEN NOT POSSIBLE** como reemplazo completo — `cliente_key` es NULL permitido; M11/perfil **excluyen** null-key; el Dashboard/venta-serie usa nombre. Un replace-only perdería declaraciones.
- `cliente_id` estable: **no existe** en esta tabla. **PROVEN.**
- Canal en el join: columnas existen; `listClienteComentarios` puede filtrarlas; el bulk **no**. Añadir canal al loader de chat **sin** tocar venta-serie: **PROVEN POSSIBLE** y no es Dashboard. Homónimo CASA/COMI se reduce. Comentarios con `canal=''` podrían dejar de pegar.

Recomendación: **no** migrar DB. Primer corte: nombre+planta (como ahora) + **mostrar fecha**. Canal/key = LATER.

---

## F. Comentarios múltiples

Orden: `created_at DESC, id DESC`. Null `created_at` no aplica (NOT NULL). Body vacío: tabla NOT NULL; verbal filtra trim. 5/20/100 → solo 2. Repetidos: se listan si son dos filas.

Estado Ejecutivo: **1 último comentario** es suficiente (presupuesto verbal; IGF no debe ceder espacio). El segundo solo aporta si el primero es fuera de ventana y se quiere contrastar — LATER. Hoy el loader pide 2; el prompt no obliga ni uno.

---

## G. Comentario ≠ causa — rutas de riesgo

| Sitio | ¿Puede afirmar causa desde comentario? | Riesgo |
|---|---|---|
| Prompt EE | Prohíbe paréntesis causal; **no** prohíbe «cayó porque [body]» en prosa libre | **HIGH RISK** (LLM free-form) |
| `formatOneMoverLine` | Hecho + «Comentario registrado» + «El comentario no es la causa» | bajo si el modelo copia |
| commercial_trend addendum | «Comments != causa»; «no reconcilies» | bajo en listas |
| plant_diagnosis (inherit Q causal) | Pack AR/DICF/ARR/materialidad; **no** es el enrich de movers; el modelo puede narrar causa | **HIGH RISK** |
| client_profile («qué sabemos / hay comentario») | Comentarios por **key**; addendum «declaración no causa» | medio si el modelo resume |
| `CAUSE_EXPLANATION` CEL | `implemented: false` → no hay handler; cae al planner | **HIGH RISK** vía inherit |

No hay template que concatene `porque ${body}`. El riesgo es **síntesis LLM** + **inherit planta**, no un string causal en código. **PROVEN** la ausencia de template; **HIGH RISK** la omisión de veda explícita «no escribas porque + comentario».

---

## H. «¿Por qué cayó Grupo Move?» — composición mínima con lo existente

Routing hoy: `CAUSE_EXPLANATION` no implementado; planner `unknown`; inherit `plant_diagnosis`. **PROVEN.**

| Parte | ¿Físicamente posible hoy? | Cómo |
|---|---|---|
| HECHO Δ | Sí, si el nombre está en `top_movers` del trend 30d ya cargado | engine + enrich |
| DECLARACIÓN | Sí, por nombre (mismo loader) o por key (perfil) | no fusionar |
| EVIDENCIA DE CAUSA | **No** hay fuente que pruebe causa | fail-closed |
| ACCIÓN DICF | Sí, `arr.dicf_acciones` por `cliente_key` (perfil/M11/daily) | keys **derivadas** pueden no pegar |
| Action Register | **No** tiene `cliente_key` (perfil lo declara unsupported) | no atribuir |
| IES/Reasoning | no usar | — |

Partes armables **sin** runtime nuevo: hecho (si está en movers) + comentario (si match) + frase de no-causa + «sin evidencia de causa» + DICF si key pega. **No** hardcodear −33.87. **No** implementar en este informe.

---

## I. Diez frases — routing actual

| # | Frase | Intent | Handler | Fuentes | Hoy | Inherit | Causal | Mínimo futuro |
|---|---|---|---|---|---|---|---|---|
| 1 | ¿Qué clientes tienen tendencia negativa en ventas? | **unknown** | inherit planta si hilo EE | AR/DICF/bitácora/ARR | no lista engine | **sí** | medio | `negativa` no pega `\bnegativ\b` — mismo hueco que `proyectad` (**PROVEN**) |
| 2 | …y qué comentarios tienen? | commercial_trend | trend | engine + comments nombre | listas + declaración | no | bajo | ninguno de routing |
| 3 | comentarios + disminuyeron | commercial_trend | trend | igual | igual | no | bajo | — |
| 4 | comentarios + dejaron de comprar | commercial_trend | trend | igual | igual | no | bajo | — |
| 5 | ¿Qué pasó con Grupo Move? | unknown | inherit planta | pack planta | no Δ engine | **sí** | alto | named+movimiento → trend/profile, no phrasebook |
| 6 | ¿Por qué cayó Grupo Move? | unknown + CEL causa | inherit planta | pack planta | no declaración acotada | **sí** | **HIGH** | §H |
| 7 | ¿Qué sabemos de la caída de Grupo Move? | client_profile | perfil | key + comments key-only | puede **0** comments si key null | no | medio | no usar como causa |
| 8 | ¿Hay comentario de Grupo Move? | client_profile | perfil | key | puede mentir «no hay» si solo hay nombre | no | bajo | — |
| 9 | ¿Cuándo fue el último comentario…? | client_profile | perfil | `created_at` si key | fecha si hay fila | no | bajo | — |
| 10 | ¿Ese comentario explica la caída? | unknown | inherit planta | pack planta | puede afirmar causa | **sí** | **HIGH** | no; respuesta fail-closed «no demuestra causa» |

Q1 es hallazgo **nuevo** de este pase: sin la palabra «comentarios», `negativa` no activa `negTrend`.

---

## J. Presupuesto verbal — por qué se omitieron

Mecanismos **PROVEN** (código):

1. **PROMPT PRIORITY / OPTIONAL VERBALIZATION / LLM DISCRETION.** IGF stored tiene «No las omitas». El comentario **no**. System: «breve y ejecutivo». User: «No hagas dump», «Selecciona por materialidad». Instrucción de comentario = veda causal, no obligación de copiar el body.
2. **SELECTION LOGIC 2+2.** Comentario de un Top 6 no verbal **no llega** a las líneas del prompt.
3. **MATCH FAIL.** Prompt = `Sin comentario reciente.` Nada que citar.
4. **`max_tokens: 1000`** en completions. Recorta la **cola** de la respuesta. Si Riesgos/Ejecución aparecieron **después** de los movers, no explica quitar la cláusula media «Comentario registrado». Si el texto cortó a mitad de movers: posible. **NOT_PROVEN** el corte de aquella sesión.

Paralelo IGF stored: omisión por **prioridad verbal**, no por ausencia de dato. **PROVEN** el paralelo estructural.

`applyExecutiveLanguageGuard` no borra comentarios. **PROVEN.**

---

## K. Un mensaje vs dos

| Superficie | Contrato |
|---|---|
| `POST /api/director-ia/chat` | `res.json(result)` de `askDirectorIa` | `server.js` ~10001; `handlePostChat` ~5492–5516 |
| Body OK | `{ ok, answer: string, sources, context_meta }` | **PROVEN** |
| Frontend | un `content: res.answer` | `DirectorIaChatPanel.tsx` ~97–99 |
| History | array `{role, content}` un turno assistant | **PROVEN** |
| Persistencia chat | `conversation_state` en meta, no 2 answers | **PROVEN** |
| WhatsApp | módulo director-ia **sin** proyección WhatsApp | **PROVEN** ausencia en `frontend-dashboard/modules/director-ia` |
| Channel Projection | no interviene | **PROVEN** no está en este path |

Dos bubbles = API + frontend + history. **OUT OF SCOPE.**

Alternativa sin contrato nuevo: **un** bubble, dos secciones (`PARTE EJECUTIVA` / `DETALLE COMERCIAL`). Solo evaluación: posible como instrucción de prompt; **choca** con «No hagas dump» y con el precedente IGF. No recomendada como MUST. SHOULD como copy interno **después** de hacer obligatorio el comentario en la línea del mover verbal.

---

## L. No regresiones

Lista del pedido (1–21) permanece. Cualquier MUST no puede tocar engine, Forecast NL parity, IGF «No las omitas», Dashboard, 1M/3M, ni ampliar 2+2.

---

## M. Matriz de tests futura (diseño)

| ID | Caso | Assert |
|---|---|---|
| A | mover + comment | pack + **prompt** contienen `Comentario registrado: «…»` |
| B | sin comment | `Sin comentario reciente.`; answer no inventa body |
| C | 2 comments | orden `created_at DESC, id DESC` |
| D–F | D vs W | hoy: no hay clase; futuro: etiqueta, no filtro |
| G | created_at vacío en objeto | no inventar fecha (DB NOT NULL) |
| H | homónimo misma planta | hoy se mezclan (**regresión del join actual**) |
| I | misma planta distinta | no cruza `planta_id` |
| J | mismo nombre otro canal | hoy se mezclan |
| K | enrich no cambia `delta_ton` ni orden Top 6 | |
| L | 3º negativo con comment | en payload; **ausente** de líneas verbales del prompt |
| M | Q2–Q4 | `commercial_trend` |
| N | Q8 | `client_profile` (limitación key) |
| O | Q6 | hoy inherit planta; futuro no-causa |
| P | prompt/answer no `porque ${body}` | |
| Q | Forecast NL A5 | magnitude, no movers |
| R | IGF stored en prompt + instrucción «No las omitas» | |
| S | Acapulco/Puebla | `sanitizeEchoedState` plant mismatch |
| T | loader fail | movers intactos; `[]` |

No implementar aquí.

---

## N. Decisión de cambio mínimo

### MUST (si se autoriza implementación de comentarios en EE)

Hacer **obligatoria** la verbalización del comentario **ya presente en la línea verbal** (`formatOneMoverLine`), en el mismo estilo que IGF stored: «si la línea del pack trae Comentario registrado, inclúyela; no la omitas; no la conviertas en porque».

Eso ataca la causa **PROVEN** de omisión legal por el LLM. No toca engine, Dashboard, 2+2, Forecast.

### SHOULD

Mostrar `created_at` (día) ya cargado. Un comentario por mover verbal (el más reciente).

### LATER

Q6/Q10 composición hecho+declaración+no-causa; Q1 stem `negativ`; join canal; key como complemento; 1M/3M etiquetas; flag `comments_included`.

### OUT OF SCOPE

Dos mensajes; IES/Reasoning; voz/saludo; nuevas fuentes; rediseño Dashboard; cambiar Top 6; filtrar comentarios por ventana en silencio; phrasebook.

---

## Respuestas inequívocas

1. **¿Por qué no vimos comentarios?** Porque (a) el LLM **puede omitirlos** — el prompt no los exige, a diferencia de IGF; y/o (b) el loader no matcheó y el prompt solo tenía «Sin comentario reciente»; y/o (c) el cliente no estaba en verbal 2+2. La sesión concreta: **NOT_PROVEN**. El mecanismo (a) es el paralelo **PROVEN** con la omisión previa de IGF stored.
2. **¿En qué punto se omiten?** No en el guard. Típicamente **entre prompt y `answer`** (discreción), o **en el enrich** (match vacío), o **en 2+2** (nunca entra al prompt).
3. **¿Llegan al prompt?** Sí **si** hay match **y** el mover es verbal. Fixture Erick/Move: **PROVEN**. Producción: **NOT_PROVEN**.
4. **¿El LLM puede omitirlos?** **Sí, legalmente** bajo el prompt actual. **PROVEN.**
5. **¿Temporalidad?** Comentario = último registrado; delta = 30d. Sin relación contractual. Fecha existe y no se muestra.
6. **¿Identidad mejor?** Key como *complemento* **PROVEN POSSIBLE**. Replace-only nombre→key **PROVEN NOT POSSIBLE**. Sin cambio de esquema/Dashboard.
7. **«¿Por qué cayó X?»** Hoy: planta. Futuro: hecho+declaración+no hay causa. No IES.
8. **¿Dos mensajes?** No. Contrato `answer: string`. OUT OF SCOPE.
9. **¿Cambio mínimo seguro?** MUST: obligación de copiar la cláusula de comentario de la línea verbal. SHOULD: día. No tocar materialidad.
10. **¿Qué no tocar?** Engine, Forecast, IGF fórmulas, ARR, PROM, Dashboard, gráfica, 1M/3M, DICF/AR/Bitácora, EKS/IES/Reasoning, Channel Projection, compactación 2+2, Top 6.

---

```
AUDIT_STATUS = DEEP_AUDIT_COMPLETE
ROOT_CAUSE = "Comentario llega al pack/prompt cuando hay match y verbal 2+2, pero NO es verbalización obligatoria (a diferencia de IGF stored). El LLM puede omitirlo. Match por nombre y 2+2 pueden excluirlo antes. Sesión de producción: NOT_PROVEN cuál de las tres."
MINIMUM_SAFE_CHANGE = "MUST: instrucción 'no omitas Comentario registrado de la línea verbal; no es causa'. SHOULD: created_at día. No cambiar engine/2+2/Dashboard/Forecast."
DASHBOARD_BEHAVIOR_CHANGED = NO
IMPLEMENTATION_AUTHORIZED = NO
CURRENT_TASK_CHANGED = NO
PRODUCTION_CODE_CHANGED = NO
AUDIT_ONLY = YES
```

---

## 18. STOP

No se implementó. Este informe **no** autoriza implementación. Un DONE de Forecast NL parity **no** abre esta tarea.
