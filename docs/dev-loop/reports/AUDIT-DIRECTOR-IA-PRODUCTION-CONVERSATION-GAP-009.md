# Reporte — AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009"
outcome: "DONE_PENDING_REVIEW"
mode: "PRODUCTION_CONVERSATION_AUDIT_ONLY"
north_star_met: false
implementation: false
phrasebook_proposed: false
single_bottleneck: "dashboard_venta_serie_engine_unreachable_from_chat"
failure_class: "MISSING_INFRASTRUCTURE"
chart_parity: "dashboard_has_engine_chat_does_not"
daily_brief_regression: "WORKS_NOW"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-009.md"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-EXECUTIVE-BRIEF-001.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-daily-executive-brief.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-m5-taller-at.js"
  - "lib/director-ia-m11-commercial-dossier.js"
  - "lib/taller-at-excel.js"
  - "lib/seh-equipos.js"
  - "lib/dashboard-auth.js"
  - "server.js (/api/arr/venta-serie, IGF corte)"
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). Esta auditoría no mide módulos."
```

## Resumen ejecutivo

El north star **aún no** se cumple. El brief diario **sí** responde «¿Cómo nos fue ayer?» y conserva el hilo venta/descuento.

Lo que rompe la conversación de producción **después** de ese slice es otra cosa:

El director pregunta **cómo vamos el último mes / 3 meses / CASA / COMISIONISTAS** — la misma lectura que ya ve en la gráfica ARR.

Hecho físico:

- El dashboard **ya tiene** el motor: `GET /api/arr/venta-serie` (`server.js`) + `linearTrend` OLS (`ArrVentaGraficaModal.tsx`).
- Serie diaria, rango 1M/3M, split CASA/COMISIONISTA, top-6 por delta, comentarios al lado.
- Director IA **no** enruta esas preguntas. Planner aislado = `unknown` 0.35 → clarificación, **sin loaders ni GPT**.
- `lib/` no contiene `venta-serie`, `linearTrend` ni `canal_grp`. Los loaders diarios/M9 usan **otra** semántica.

**El dashboard ya tiene la inteligencia. El chat simplemente no la usa.**

Cuello único: `dashboard_venta_serie_engine_unreachable_from_chat`.  
Clase: **MISSING_INFRASTRUCTURE**.

**NEXT_TASK** (no autorizada, no ejecutada): `ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001`.

---

## Ejecución

- Rama: `audit/director-ia-production-conversation-gap-009` (≠ `main`).
- HEAD: `ec421e97 Merge branch 'docs/director-ia-daily-executive-brief-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, commit, push, merge.
- Planner verificado con `detectDirectorIaIntent` / `planDirectorIaQuestion` sobre las preguntas canónicas y hold-outs.

---

## Caso 1 — Tendencia comercial 1M/3M CASA vs COMISIONISTA

### Preguntas (planner aislado)

| Pregunta | Intent | Conf | Early return |
|----------|--------|------|--------------|
| ¿Cómo vamos en el último mes? | `unknown` | 0.35 | Sí: clarificación, 0 loaders, 0 GPT |
| ¿Cómo vamos en los últimos 3 meses? | `unknown` | 0.35 | Igual |
| ¿Cómo vamos en CASA? | `unknown` | 0.35 | Igual |
| ¿Cómo van COMISIONISTAS? | `unknown` | 0.35 | Igual |
| Compárame CASA vs COMISIONISTAS. | `unknown` | 0.35 | Igual |
| ¿Qué tendencia trae CASA? (hold-out) | `unknown` | 0.35 | Igual |
| ¿Venimos subiendo o bajando? (hold-out) | `unknown` | 0.35 | Igual |

`mes`/`mensual` **bloquea** `daily_executive_brief`. Sin `ayer` no hay `daily_sales_deviation`. Sin `cambio`+`venta` no hay `delta_sales`. No existe intent de canal/serie.

**Effective intent = unknown.** Coverage guard: no. Parent: ninguno. Plant: la del request, no usada. Period/channel: no resueltos. GPT: no.

### Fuente real de las gráficas (paridad)

Cadena física:

```text
ArrClient.tsx [Grafica]
  → ArrVentaGraficaModal.tsx
    → fetchArrVentaSerie (frontend-dashboard/lib/api.ts)
      → GET /api/arr/venta-serie (server.js ~L14993)
        → arr.ventas_diarias_cliente
        + arr.cliente_categoria_mes (override de canal)
        + arr.descuentos_diarios_cliente
        + top-6 |Δ ton| vs periodo previo igual
        + arr.cliente_comentarios (2 más recientes por cliente_nombre)
    → linearTrend OLS (solo frontend, ArrVentaGraficaModal.tsx L98–118)
```

| Pieza | Dónde | Semántica |
|-------|-------|-----------|
| Endpoint | `server.js` `GET /api/arr/venta-serie` | Inline; **no** extraído a `lib/` |
| 1M | `end − 29d` → 30 días, anclado a `MAX(fecha)` | No es «mes calendario» |
| 3M | `end − 89d` → 90 días | No es «3 YYYY-MM» |
| Canal | `COALESCE(cat.canal, v.canal, 'Casa')` LIKE `%comisionista%` → COMISIONISTA; else CASA | Query `canal=casa\|comisionista\|ambos` |
| Serie | `{ fecha, venta_ton, descuento_mxn }` | Kg/1000 |
| Tendencia | `linearTrend` OLS índice vs `venta_ton` | **Solo FE.** Backend no calcula slope. «Subió/bajó» en la gráfica = signo de `b`, **no** primer punto vs último |
| Top clientes | JS en el endpoint; `delta_ton`; tipos `nuevo\|perdido\|disminucion\|aumento`; top 6 | Periodo previo de **igual duración** |
| Comentarios | `arr.cliente_comentarios` match `lower(trim(cliente_nombre))` | **Join por nombre.** Chat diario usa `cliente_key`. No copiar el join por nombre |
| Authz | `dashboardBlockGAFinancialKpis` / `dashboardBlockGVForbidden` | Misma familia financiera |

### ¿Chat puede reutilizarlo hoy?

**No sin extraer el handler o HTTP interno (prohibido).**

| Loader chat existente | Qué hace | Qué no cubre |
|------------------------|----------|--------------|
| `loadDailySalesDeviationForChat` | 1 día vs same-weekday 14d | Sin serie 1M/3M; sin split CASA/COMISIONISTA agregado |
| `loadDeltaVentaForChat` (M9) | Mes A vs mes B | Sin serie diaria; sin canal; no rolling 30/90d |
| `commercial_state` | Listas DICF | Otra fuente, no la gráfica |

Misma **tabla**. Motor **distinto**.

### Truth boundary

trend ≠ cause. comment ≠ cause. client delta ≠ cause. Un día anómalo ≠ tendencia. Si se reutiliza la gráfica, «subió/bajó» debe declarar rango + canal + que la dirección viene de la pendiente OLS (o de lo que el ARCH fije), no de un atajo first-vs-last.

### Clasificación

**MISSING_INFRASTRUCTURE.** Datos listos. Motor de dashboard listo. Chat no lo alcanza.

**Answerability:** `MISSING_READ_MODEL` / `ROUTING_GAP` (el read model vive en `server.js`, no en chat).

---

## Caso 2 — Cliente longitudinal (Puebla, 3 meses)

| Campo | Hecho |
|-------|--------|
| Planner | `unknown` 0.35 (`no_rule_matched`) |
| Effective | clarificación; 0 loaders; 0 GPT |
| Fuentes físicas | `arr.dicf_cliente_mes` (`kg_mes_real`, `desc_kg_hist`, `ingreso_forecast`); `buildClienteKey`; DICF/comments por `cliente_key` |
| Chat carga | Nada |
| Ranking «mayor cliente» | No existe query plant-wide `ORDER BY kg_mes_real` |
| 3 meses | Loaders comerciales leen **un** `(year, month)` |
| Descuento/kg/mes | Columna existe; `mapState` del expediente **no la expone** |
| Ingreso/mes | `ingreso_forecast` es forecast de la fila, no ingreso real cerrado |
| Joins | Paths lícitos: `cliente_key`, no nombre |

**Answerability:** `MISSING_READ_MODEL`.  
**Clase:** **MISSING_INFRASTRUCTURE**. Datos parciales de 1 mes; no hay composición longitudinal.

---

## Caso 3 — Taller Mayor por unidad

| Campo | Hecho |
|-------|--------|
| Planner | `unknown` 0.35. `isM5TallerAtQuery` exige `\btaller\b` **y** token de unidad (`AT-15`). «Taller Mayor» sin unidad → false |
| Taller Mayor | Derivado de `subcategoria`: `/REPARACION/` + `/MAYOR/` → `tipo = "mayor"` (`lib/taller-at-excel.js` L89–99). **No** es columna |
| SQL M5 | `categoria LIKE '%TALLER%'` — no filtra MAYOR |
| Chat M5 | `projectRecord` **omite** `tipo` y `subcategoria`. «Este mes» sin `YYYY-MM` → `missing_period` |
| Reviewability | Otro intent (`igf_reviewable_supports`); no conectado |
| Folios | `public.folios.unidad`, `importe`, `estatus`, `concepto`, `mes_cargo` **existen** |

**Answerability:** `MISSING_READ_MODEL` + `ROUTING_GAP`.  
**Clase:** **MISSING_INFRASTRUCTURE**. Evidencia folio–unidad física; falta listado plant-wide «Taller Mayor + este mes + por unidad».

---

## Caso 4 — Hola / identidad autenticada

| Campo | Hecho |
|-------|--------|
| Planner | `smalltalk` 0.95 |
| Effective | Early return **antes** del planner de negocio (`askDirectorIa` L2889–2910) |
| GPT | **No** |
| Respuesta | Plantilla: «Hola, soy Director IA para la planta {plant}…» (`buildConversationalAnswer` L2247) |
| JWT | `actor_id`, `role`, `plantas_permitidas`. `actor_nombre` solo en scope SEH / `includeActorProfile` |
| `public.usuarios` | `nombre`, `nombre_persona`, `telefono`, `email`. **Sin** título Ing./Lic./Dr. |
| Chat | No lee nombre. `_user` no alimenta el saludo |

Personalizar «Ing. Zaragoza» **inventaría** el título. Identidad debe ser la autenticada actual, no memoria.

**Answerability:** `PARTIALLY_WORKS` (saluda, no personaliza).  
**Clase:** **MISSING_INFRASTRUCTURE** (wiring) + riesgo **OVERPROGRAMMING** si se hardcodea título.

---

## Caso 5 — Directorio SEH

| Campo | Hecho |
|-------|--------|
| Planner | `responsible_lookup` 0.88 |
| Handler in-process | **No existe** (`responsible_lookup` no aparece en `director-ia-chat.js`) |
| Effective | Path GPT genérico + board AR; keyword `\bseguridad\b` → tema AR, **no** cargo org |
| Follow-up teléfono | `unknown` 0.35 |
| Tablas SEH | `seh_equipos`, `seh_carpetas_legales`, `seh_ultima_edicion` — equipos/docs/editor. **No** responsable+tel+email por planta |
| `public.usuarios` | Tel/email existen; **sin** área SEH; chat no los SELECT |

**Answerability:** `MISSING_PHYSICAL_DATA` (directorio) + `MISSING_READ_MODEL` (teléfono).  
**Clase:** **MISSING_DATA** (organigrama) y **MISSING_INFRASTRUCTURE** (PII no cableada). Authz/privacidad si se expusiera teléfono.

---

## Caso 6 — IGF mayo cerrado

| Campo | Hecho |
|-------|--------|
| Planner | `igf_status` 0.9 (`\bigf\b`) |
| GPT | Anexo IGF si el path financiero dispara; **sí** puede llamar modelo |
| Periodo | `resolveYearMonthFromQuestion` parsea «mayo», **ignora «pasado»** → mayo del año CDMX corriente (L160–181) |
| Versión | `ORDER BY version_number DESC LIMIT 1` (`loadIgfCommitSnapshot` L357–362) |
| Mes cerrado | `isIgfMesCerradoPorCorte` / `version_as_of_corte` viven en `server.js` (dashboard). **Chat no los llama** |
| Snapshots | `igf.versions` + `created_at` **sí** persisten forecast intra-mes. Chat no los lista |

Chat **no** dice «mayo está cerrado». Sirve la última versión como si fuera el forecast vigente. No reconstruye historia desde el actual; **tampoco** la expone.

**Answerability:** `TEMPORAL_SEMANTICS_GAP`.  
**Clase:** **MISSING_INFRASTRUCTURE** (lógica de corte no cableada). Datos históricos listos.

---

## Caso 7 — Regresión daily_executive_brief

| Turno | Planner aislado | Effective (con estado) | Pack | GPT |
|-------|-----------------|------------------------|------|-----|
| ¿Cómo nos fue ayer? | `daily_executive_brief` 0.9 | brief | sales + discount, misma fecha | Sí |
| ¿Qué te llama la atención? | `unknown` 0.35 | inherit brief | requery fresco | Sí |
| ¿Y la venta? | `unknown` 0.35 | `daily_sales_deviation` (cross-metric B) | misma `active_date` | Sí |
| ¿Y el descuento? | `unknown` 0.35 | `daily_discount_deviation` | misma `active_date`; `previous_frame` = brief | Sí |
| ¿Qué sigue sin explicación? | `unknown` 0.35 | inherit métrica vigente | requery | Sí |

**Answerability:** `WORKS_NOW`. **No** es el cuello. No reabrir.

---

## Phrasebook

Las preguntas de producción son **tests semánticos**. No hay frases «último mes / CASA / COMISIONISTAS / Taller Mayor / SEH» hardcodeadas como switch de producto en `lib/`. Hold-outs («¿Venimos subiendo o bajando?», «¿Qué tendencia trae CASA?») también caen a `unknown`. Cualquier ARCH posterior debe generalizar por periodo + canal, no por frase.

---

## Competencia de cuellos (no se elige el más nuevo)

| Caso | Frecuencia | Valor ejecutivo | Transversalidad | Data readiness | Selección |
|------|------------|-----------------|-----------------|----------------|-----------|
| 1 Tendencia gráfica | Alta (pregunta de director tras el brief) | Alta: es lo que ya miran en pantalla | Alta: rango + canal + slope + movers | **Máxima**: motor dashboard completo | **GANADOR** |
| 2 Longitudinal cliente | Media | Alta | Media (necesita periodo/cliente) | Media: 1 mes en DICF; no 3M compuesto | No |
| 3 Taller Mayor | Media-baja | Operativa | Baja | Alta en folios; falta recorte MAYOR | No |
| 4 Hola | Alta | Baja | Baja | Parcial (nombre; no título) | No (fácil ≠ impacto) |
| 5 SEH | Baja | Media | Baja | **Baja**: no hay directorio | No |
| 6 IGF cerrado | Media | Alta en cierre | Media | Alta en `igf.versions`; semántica no cableada | No (parcialmente responde) |
| 7 Brief | — | — | — | — | Ya funciona |

No se eligió 1M/3M por estar en «diferido». Se eligió porque es el único caso donde **la verdad ya está calculada para el usuario** y el chat la ignora por completo.

---

## Cuello único

**Nombre:** `dashboard_venta_serie_engine_unreachable_from_chat`  
**Clase:** `MISSING_INFRASTRUCTURE`

### Qué casos rompe

Caso 1 entero (1M, 3M, CASA, COMISIONISTAS, comparación, hold-outs de tendencia). Impide el salto conversacional **después** del brief diario. No rompe el brief (caso 7).

### Dónde está físicamente

- UI: `frontend-dashboard/components/ArrVentaGraficaModal.tsx` (`linearTrend` L98–118; rangos 1M/3M).
- API: `server.js` `GET /api/arr/venta-serie` (~L14993–15419).
- Tablas: `arr.ventas_diarias_cliente`, `arr.cliente_categoria_mes`, `arr.descuentos_diarios_cliente`, `arr.cliente_comentarios`.
- Chat: `detectDirectorIaIntent` → `unknown` → `buildUnknownClarificationResult`. Cero referencias a ese motor en `lib/`.

### Qué desbloquea

Hablar del **mismo objeto** que la gráfica: rango 1M/3M, canal CASA/COMISIONISTA, dirección de tendencia (pendiente, no first-vs-last), totales/promedio del rango, clientes que más movieron, comentarios como declaración. Reutilizar el engine (extraído, sin HTTP interno). No inventar otra matemática.

### Qué NO soluciona

Perfil longitudinal 3 meses kg+descuento+ingreso; Taller Mayor por unidad; saludo con nombre/título; directorio SEH; semántica IGF de mes cerrado; causalidad. Tampoco autoriza copiar el join por **nombre** de comentarios del gráfico.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`ARCH-DIRECTOR-IA-COMMERCIAL-TREND-CHART-PARITY-001`

Debe diseñar cómo el chat legado reutiliza el motor de `venta-serie` + la semántica de tendencia de la gráfica, sin phrasebook, sin HTTP interno, sin causalidad y sin join por nombre.

STOP.
