# Reporte — ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "SAFE_SELECT_ONLY_PATH"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "sql/"
  - "scripts/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M2-HISTORY-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3 de esta auditoría: N/A. El IMPL propuesto tampoco exige G2/G3."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

**Existe path SELECT-only e in-process seguro** para el slice history de M2. Conclusión **READY**.

La fuente es `public.folio_historial`. Los helpers `getHistorialByFolioId` y `getHistorial` son **solo SELECT**. El call graph de `GET /api/folios/:id/timeline` se verificó: **no** llama `maybeAdvanceFolioToComprobaciones`. Aun así Director IA **no** debe usar ese GET (ni HTTP interno): debe copiar/extraer el SELECT, como `folio_status`.

Campos observados por evento: `estatus` (nullable), `comentario` (nullable), `actor_telefono` (nullable), `actor_rol` (nullable), `creado_en`. **No** hay columnas `estatus_anterior`, `estatus_nuevo`, `event_type` ni `etapa`. `folios.estatus_anterior` es del folio actual, **no** del evento.

Después del IMPL: **M2 sigue PARTIAL**. Porcentaje **sigue 8.5 / 20 = 42.5%** (0.0 pp). Verificado contra la ficha: COMPLETE exige el propósito entero (tablero/docs/cheque/póliza/mutaciones fuera). History solo profundiza PARCIAL.

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M2-HISTORY-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m2-history-readiness-001` (≠ `main`).
- HEAD: `9dd31d83 Merge branch 'architecture/director-ia-m2-next-slice-prioritization-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. El implementador no tocó `authorized_by`, `authorized_at` ni `human_authorization`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin matriz. Sin writes. Sin HTTP a rutas mutantes.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001; ganador history |
| M2 | PARTIAL (comentarios + `folio_status`) |
| M0–M20 | 8.5 / 20 = 42.5% |
| Hipótesis a verificar | `folio_history` → tool → executor → `loadFolioHistoryForChat` → authz/resolución → helpers SELECT → evidencia |
| Supuesto a **no** heredar | «GET /timeline es seguro» — re-verificado en call graph |

---

## Definición exacta del slice

**Incluye:** eventos **registrados** en `public.folio_historial` de un folio autorizado: qué dice el evento (`comentario` / `estatus` si no null), quién si está en `actor_*`, cuándo (`creado_en`), orden cronológico, identidad mínima del folio, `source` + `retrieved_at`. Etapa **solo** como derivado de `estatus` observado del evento vía `estatusToEtapaVisual`, declarada como derivada; no si `estatus` es null/vacío.

**Excluye:** inventar eventos; reconstruir huecos; actor null → «sistema»; antigüedad → retraso; cualquier evento → cambio de estatus; documents/PDF; cheque/póliza/presupuesto; kanban_flow; writes; autoavance; GET `/kanban`; GET `/folios/:id`; `maybeAdvance`; `dedupeHistorialByStage` (oculta filas).

History ≠ estatus actual. History ≠ comentarios de `public.comentarios`. History ≠ Action Register.

---

## `public.folio_historial` (schema físico)

Definición en `server.js` 2265–2275 (bootstrap; no hay `sql/` de esta tabla):

| Columna | Tipo | Nullable | Notas |
|---|---|---|---|
| `id` | SERIAL PK | no | Los helpers actuales **no** lo seleccionan |
| `folio_id` | INT | **sí** | Sin FK. Filas viejas pueden ser null |
| `numero_folio` | VARCHAR(50) | sí | Lookup alterno |
| `folio_codigo` | VARCHAR(50) | sí | |
| `estatus` | VARCHAR(100) | sí | Snapshot **del evento**, no par anterior/nuevo |
| `comentario` | TEXT | sí | Incluye notas y `Comentario: …` |
| `actor_telefono` | VARCHAR(50) | sí | `insertHistorial` fuerza null si falta |
| `actor_rol` | VARCHAR(100) | sí | Puede ser `"Dashboard"` u otro texto; no hay enum «sistema» |
| `creado_en` | TIMESTAMPTZ | default NOW() | Timestamp del **insert** del evento |

Índices visibles en repo: solo PK. No hay índice documentado en `sql/`.

**No existen** columnas: `event_type`, `estatus_anterior`, `estatus_nuevo`, `etapa`, `planta_id`, `user_id`.

`public.folios.estatus_anterior` (L2291) es estado **actual** del folio. **Prohibido** usarlo como previous_status de un evento.

---

## Helpers

### `getHistorialByFolioId(client, folioId, limit = 80)` — `server.js` 2892–2906

```sql
SELECT estatus, comentario, actor_telefono, actor_rol, creado_en
FROM (
  SELECT … FROM public.folio_historial
  WHERE folio_id = $1
  ORDER BY creado_en DESC
  LIMIT $2
) sub
ORDER BY creado_en ASC
```

- SELECT-only. Sin JOIN. Sin authz. Sin planta.
- Orden canónico de salida: **ASC** (más antiguo primero), últimos `limit` por DESC interno.
- Ausencia: `[]`.
- **No** selecciona `id` / `folio_id` / `numero_folio`.
- **Pierde** filas con `folio_id` null.

### `getHistorial(client, numeroFolio, limit = 80)` — `server.js` 3854–3868

Igual, `WHERE numero_folio = $1`. SELECT-only. Retorna `r.rows` (vacío = `[]`). Cubre filas sin `folio_id` si tienen número.

### Equivalentes

`insertHistorial` (3490–3497) es **INSERT**. No usar. `dedupeHistorialByStage` (3922+) **no** es fuente: colapsa etapas.

El IMPL debe **copiar** el SELECT a un lib (como M2 status), añadiendo `id` al SELECT. Tras resolver el folio: `WHERE folio_id = $1 OR numero_folio = $2` para no perder filas. No importar `server.js`.

---

## GET /timeline — call graph verificado

`GET /api/folios/:id/timeline` (`server.js` 12510–12538):

```text
dashboardAuthMiddleware
  → dashboardBlockGVFoliosMiddleware
  → pool.connect
  → getFolioById          (SELECT-only)
  → 404 si no hay folio
  → 404 si solo_zp_ad sin permiso
  → 403 si GG/GA y planta fuera de plantas_permitidas (match exacto; sin equivalentes)
  → getHistorialByFolioId (SELECT-only)
  → dedupeHistorialByStage
  → map estatus_visible / etapa_icon
  → res.json
```

**No** aparece `maybeAdvanceFolioToComprobaciones`. **No** hay UPDATE/INSERT/DELETE en este handler.

Aun así: **no** es fuente Director IA. Motivos: HTTP interno prohibido; `dedupe` oculta eventos; no aplica equivalentes ni ocultación AD-creado (más laxo que `folio_status`). Preferir in-process + authz M2.

---

## Rutas mutantes excluidas

| Superficie | Efecto | ¿Usar? |
|---|---|---|
| `GET /api/dashboard/kanban` L5410–5423 | `maybeAdvance` + UPDATE + `insertHistorial` | **No** |
| `GET /api/folios/:id` L12655–12672 | `maybeAdvance` antes de responder | **No** |
| `maybeAdvanceFolioToComprobaciones` L3517–3544 | UPDATE estatus + INSERT historial (`actor_telefono` null) | **No** |

History **no** necesita atravesarlas. Resolución = helpers SELECT de folio (ya en `lib/director-ia-m2-folio-status.js`).

---

## Resolución de folio (reutilizar `folio_status`)

Reutilizar, no duplicar:

| Necesidad | Pieza M2 existente |
|---|---|
| id / `numero_folio` / ambiguos | `parseFolioRefs`, `getFolioById`, `getFolioByNumero` |
| JWT / GV / `plantas_permitidas` | `assertFolioStatusAccess` (GV 403; GA solo planta autorizada) |
| `solo_zp_ad` / creado AD | `folioVisibleToAuth` → 404 |
| Cross-planta / equivalentes | `folioInPlantScope` → 403 |
| Not found | 404; no empty history de éxito |
| Planta ausente | `requirePlantaId` 400 |

Orden fail-closed: authz planta → resolver folio → visibilidad → scope → **entonces** SELECT historial. Nunca historial por número sin folio autorizado (filtración).

Un folio por pregunta (igual que `mode: single`). Varios folios de history: fuera o 400 de ambigüedad.

---

## Semántica

| Hecho | Tipo | Regla |
|---|---|---|
| `creado_en` | observado | Momento del INSERT del evento, no «duración en etapa» |
| `estatus` del evento | observado | Puede ser null (p. ej. por-recuperar). Null ≠ cambio de estatus |
| `comentario` | observado | Puede ser creación, nota, `Comentario: …`, texto de autoavance |
| `actor_telefono` / `actor_rol` | observado | Null se reporta null. **No** «sistema» |
| `etapa` del evento | derivado | Solo si `estatus` no vacío, vía `estatusToEtapaVisual`. Default de estatus vacío **no** afirmarlo como etapa histórica de negocio |
| previous/new status | **no columna** | Opcional: estatus del evento **previo con estatus no null**. Derivado de secuencia. Si no hay previo, no inventar |
| `event_type` | **no columna** | No inventar taxonomía contractual. Se puede etiquetar `comentario_usuario` si el texto empieza `Comentario:`; el resto no es «transición» salvo `estatus` no null |
| Antigüedad / retraso / bloqueo / causa | prohibido | |
| `folios.estatus` actual | otro slice | Puede anclarse como contexto, no como evento |

`maybeAdvance` escribe historial con `actor_telefono` null y `actor_rol` «Dashboard». Si esa fila existe, se muestra como está; no se afirma que un humano avanzó.

---

## Authz y scope planta

| Control | Evidencia | Regla del slice |
|---|---|---|
| JWT | `req.dashboardAuth` | Exigir |
| GV | `assertFolioStatusAccess` / middleware folios | **403** |
| GA | Folios permiten GA si planta en lista | Igual que `folio_status` |
| `plantas_permitidas` | GG/GA/AD fail-closed | 403 sin consultar historial |
| Equivalentes | M3 / `folioInPlantScope` | Más estricto que GET /timeline |
| Cross-planta | 403 | No empty success |
| Not found / no visible | 404 | No empty success |
| Folio ok + 0 eventos | lista vacía observada | No inventar; no 404 de folio |

Helpers de historial **no** aplican authz. El loader debe envolver.

---

## Planner / tools / capabilities / chat

| Pieza | Estado |
|---|---|
| Intent `folio_history` | Existe (planner ~206–210, 0.92): «último movimiento» / «historial»+folio |
| «quién movió/aprobó/avanzó» | Solo en `UNSUPPORTED_RULES.folio_historial`, **no** en el regex del planner |
| Capability `folio_historial` | `canRead: false`, `coverage: none` |
| Tool `get_folio_history` | `declared_not_integrated`, `executor: null` |
| Chat | **No** hay rama `folio_history`. Corta Fase 1 → `SOURCE_NOT_INTEGRATED` |
| Documents / cheque / póliza / presupuesto | Siguen bloqueados |

IMPL: quitar **solo** `UNSUPPORTED_RULES.folio_historial`; extender planner con el patrón `quien movio|aprobo|avanzo|cambio`; `canRead` parcial; executor `loadFolioHistoryForChat`; rama en `askDirectorIa`. No tocar documents/financial.

---

## Tabla de evidencia

| surface | helper_or_route | physical_source | query_type | select_only | side_effects | authz | plant_scope | observed_fields | derived_fields | ordering | absence_behavior | reusable | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Historial por id | `getHistorialByFolioId` | `folio_historial` | SELECT | sí | no | caller | no | estatus, comentario, actor_*, creado_en | — | ASC últimos 80 | `[]` | sí (copiar + `id` + OR numero) | medio (pierde folio_id null) | L2892 |
| Historial por número | `getHistorial` | `folio_historial` | SELECT | sí | no | caller | no | igual | — | ASC últimos 80 | `[]` | sí | medio (sin folio authz) | L3854 |
| Resolución folio | `getFolioById` / `getFolioByNumero` en lib M2 | `folios` | SELECT | sí | no | loader M2 | equivalentes | id, numero, planta, estatus actual | etapa actual | — | null | **sí** | bajo | m2-folio-status.js |
| GET timeline | `/api/folios/:id/timeline` | folio + historial + dedupe | GET | lectura | **no** advance; **sí** oculta eventos | JWT+GV+planta exacta | sin equivalentes; sin filtro AD | eventos + labels UI | etapa_icon | ASC post-dedupe | `events: []` | **no** (HTTP + dedupe) | medio | L12510 |
| GET kanban | `/api/dashboard/kanban` | folios | GET | no | **UPDATE** | GV | WHERE | post-mutación | — | — | — | **no** | alto | L5410 |
| GET folio | `/api/folios/:id` | folio | GET | no | **UPDATE** | GV | 403 cruzado | post-mutación | — | — | — | **no** | alto | L12672 |
| Advance | `maybeAdvance*` | folios + historial | UPDATE+INSERT | no | sí | — | — | escribe evento | — | — | — | **no** | alto | L3517 |

---

## Tabla de gaps

| gap_id | missing_capability | required_for_history_slice | reusable_component | proposed_change | architecture_change | contract_change | authz_change | complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|
| H1 | Loader in-process | sí | helpers SELECT + authz M2 | `loadFolioHistoryForChat` en lib M2 history | no | no | reusar M2 | medio | no |
| H2 | SELECT con `id` + OR numero | sí | SQL de los dos helpers | copiar SELECT; no mutar schema | no | no | no | bajo | no |
| H3 | Executor | sí | `get_folio_history` | `loadFolioHistoryForChat` | no | no | no | bajo | no |
| H4 | Chat + unsupported | sí | patrón `folio_status` | rama `folio_history`; quitar **solo** regla historial | no | no | no | bajo | no |
| H5 | Planner «quién movió» | sí | UNSUPPORTED regex | añadir al intent `folio_history` | no | no | no | bajo | no |
| H6 | Capability parcial | sí | `folio_historial` | `canRead` history; no docs | no | no | no | bajo | no |
| H7 | No dedupe UI | sí | — | eventos crudos + `truncated` | no | no | no | bajo | no |
| H8 | documents/financial/kanban_flow | no | — | **fuera** | — | — | — | — | no |

Nada bloquea. Semántica clara sin contrato nuevo: observar filas; no afirmar transiciones ni actores ausentes.

---

## Arquitectura propuesta (hipótesis; no se implementa)

```text
pregunta historial / último movimiento / quién movió
  → UNSUPPORTED_RULES.folio_historial ya no corta
  → intent folio_history
  → get_folio_history
  → loadFolioHistoryForChat
       → assertFolioStatusAccess (GV / plantas_permitidas)
       → resolver folio (id | numero_folio) vía helpers M2
       → folioVisibleToAuth / folioInPlantScope
       → SELECT folio_historial WHERE folio_id = $id OR numero_folio = $num
         ORDER … LIMIT N+1
       → NUNCA GET /timeline, /kanban, /folios/:id, maybeAdvance, dedupe
       → eventos crudos; etapa solo si estatus observado
  → evidencia + respuesta; openai_called false
```

In-process. Sin HTTP interno. Sin cycle. Sin migration. **G2 no. G3 no.**

### Archivos probables del IMPL

| Archivo | Cambio |
|---|---|
| `lib/director-ia-m2-folio-history.js` (nuevo) o extensión acotada del lib M2 | loader + proyección eventos |
| `lib/director-ia-m2-folio-status.js` | solo **reutilizar** resolución/authz (no reescribir) |
| `lib/director-ia-chat.js` | rama `folio_history` |
| `lib/director-ia-tools.js` | executor |
| `lib/director-ia-capabilities.js` | `folio_historial` parcial; quitar regla historial |
| `lib/director-ia-planner.js` | patrón «quién movió» |
| `test/director-ia-m2-folio-history.test.js` | tests del slice |
| scripts capabilities/planner/orchestrator | solo aserciones de este slice |

`server.js` no es necesario si el lib copia el SELECT.

---

## Contrato de datos (lo que el schema **sí** soporta)

| Campo pedido | ¿Físico? |
|---|---|
| `folio_id` / `numero_folio` | Sí, del folio resuelto (y columnas historial si no null) |
| `event_id` | Sí en tabla (`id`); hay que **añadirlo al SELECT** |
| `timestamp` | Sí: `creado_en` |
| `actor` | Parcial: `actor_telefono`, `actor_rol` (null permitidos) |
| `detail` | Sí: `comentario` |
| `source` | Declarado: `public.folio_historial` |
| `event_type/action` | **No columna** |
| `previous_status` / `new_status` | **No columnas**. `estatus` del evento = observado. Par anterior = derivado opcional de secuencia |
| `previous_stage` / `new_stage` | Solo derivados de estatus observados |

---

## Tests a diseñar (si IMPL)

History por id; por `numero_folio`; orden ASC; múltiples eventos; sin eventos (folio ok + `[]`); folio 404; cross-planta 403; planta no autorizada; `plantas_permitidas`; GA ok; GV 403; actor null se conserva; estatus null ≠ transición; etapa solo con estatus; no dedupe; intent; executor; `SOURCE_NOT_INTEGRATED` solo levantado para history; documents/cheque/póliza/presupuesto siguen bloqueados; no `maybeAdvance`; no writes; no HTTP interno; no fallback AR/M3.

---

## Gates

| Gate | ¿Necesario para IMPL history? |
|---|---|
| G2 | **No.** Mismo patrón que `folio_status`: wiring runtime, no editar `docs/director-ia/` en el IMPL. |
| G3 | **No.** No hay contrato nuevo. |
| G8 | **No.** No se fija umbral de retraso. |

---

## Estado M2 y porcentaje (contra ficha, no por conveniencia)

Ficha: propósito = flujo operativo por etapas. COMPLETE no se declara con un slice. History cubre «timeline / quién-cuándo»; quedan docs, cheque/póliza, kanban HTTP, writes.

| Momento | Estado M2 | M0–M20 |
|---|---|---|
| Ahora | PARTIAL | 8.5 / 20 = 42.5% |
| Tras history | **PARTIAL** | **42.5%** (0.0 pp) |
| COMPLETE | No en este slice | +2.5 solo si un día se cierra el propósito entero |

---

## Riesgos

- Usar GET `/timeline` o GET `:id` «porque no muta tanto».
- Aplicar `dedupeHistorialByStage` y perder eventos.
- Buscar solo por `folio_id` y omitir filas históricas.
- Consultar historial sin resolver folio/planta.
- Tratar `folios.estatus_anterior` como previous del evento.
- Actor null → «sistema» / «Dashboard aprobó».
- Etapa default sobre estatus histórico vacío.
- Afirmar retraso, bloqueo o causa.
- Levantar bloqueos de documents/cheques al quitar la regla historial.

**Dependencias:** `public.folio_historial`, resolución M2, JWT. No S3. No M18.

---

## NEXT_TASK propuesta (no autorizada)

`IMPL-DIRECTOR-IA-M2-HISTORY-001`

Este reporte no es G1 ni G5.

## Acciones no realizadas

- No se implementó history.
- No se modificó código, tests, matriz ni contratos.
- No commit / push / merge.
- No se ejecutó NEXT_TASK.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m2-history-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001.md
```

Solo los dos archivos autorizados.

## STOP
