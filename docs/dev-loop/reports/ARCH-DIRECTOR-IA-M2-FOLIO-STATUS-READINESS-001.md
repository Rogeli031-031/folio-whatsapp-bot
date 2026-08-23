# Reporte — ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "SAFE_SELECT_ONLY_PATH"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md"
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
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3 de esta auditoría: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

**Existe path SELECT-only e in-process seguro** para el primer slice de M2 (estatus/etapa). Conclusión **A**.

La mutación **no** está en los helpers de lectura. Está en handlers HTTP que, **después** de un SELECT, llaman `maybeAdvanceFolioToComprobaciones` (`UPDATE` + `insertHistorial`).

| Superficie | ¿SELECT-only? | ¿Usar en Director IA? |
|---|---|---|
| `getFolioById` | Sí | **Sí** (folio por id) |
| `getFolioByNumero` | Sí | **Sí** (folio por `numero_folio`) |
| `getManyFoliosStatus` | Sí | **Sí** (varios `numero_folio`) |
| SQL del GET kanban (L5374–5407) | Sí | **Sí, extraído**; nunca el handler |
| `GET /api/dashboard/kanban` | No (muta) | **Excluido** |
| `GET /api/folios/:id` | No (muta) | **Excluido** |
| `maybeAdvanceFolioToComprobaciones` | No (`UPDATE`) | **Excluido** |

Después del IMPL: **M2 sigue PARTIAL**. Porcentaje global **sigue 8.5 / 20 = 42.5%** (el slice no cambia la etiqueta).

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m2-folio-status-readiness-001` (≠ `main`).
- HEAD: `bd6066e3 Merge branch 'architecture/director-ia-executive-value-prioritization-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T13:55:52-06:00`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin writes. Sin HTTP a rutas mutantes. Sin commit/push/merge.

---

## 1. Slice y estado M2

Ficha M2: propósito = flujo operativo por etapas. Hoy = PARCIAL (solo comentarios). Este slice cubre **consulta de estatus/etapa y listado por planta/etapa**. No cubre historial, docs, cheque/póliza, presupuestos ni CRUD.

| Momento | Estado M2 | % M0–M20 |
|---|---|---|
| Ahora | PARTIAL (comentarios) | 8.5 / 20 = 42.5% |
| Tras el slice | **PARTIAL** (comentarios + estatus/etapa) | **42.5%** (0.0 pp) |
| COMPLETE | No en este slice | +2.5 solo si un día se cierra el propósito entero |

No se reinterpreta COMPLETE.

---

## 2. Folio individual (SELECT-only)

### `getFolioById` (`server.js` 2869–2888)

```sql
SELECT f.id, f.numero_folio, f.folio_codigo, f.planta_id, …, f.estatus, …
FROM public.folios f
LEFT JOIN public.plantas p ON p.id = f.planta_id
WHERE f.id = $1
```

Sin INSERT/UPDATE/DELETE. Sin historial. Sin `maybeAdvance`. Not found → `null`.

### `getFolioByNumero` (`server.js` 2851–2867)

Igual, `WHERE f.numero_folio = $1`. SELECT-only. Not found → `null`.

Identificador: el chat suele nombrar `numero_folio` / `folio_codigo`, no el id interno. `getFolioById` solo cubre id numérico. El IMPL debe resolver en este orden fail-closed: id numérico → `getFolioById`; texto → `getFolioByNumero` y, si hace falta, `numero_folio OR folio_codigo` (hay un SELECT puntual en L4491, con `LIMIT 1` — **no** usarlo a ciegas si hay ambigüedad: 0 filas = not found; >1 = no inventar, pedir desambiguación).

---

## 3. Varios folios / listado

### `getManyFoliosStatus` (`server.js` 2909–2928)

`WHERE f.numero_folio = ANY($1::text[])`. SELECT-only. Devuelve `{ numero, folio }` en el mismo orden; inexistente → `folio: null`. **No** filtra por planta (eso lo aplica el caller). **No** lista el tablero: solo busca números dados.

### Listado por planta / etapa (sin GET /kanban)

El SELECT del handler kanban (L5374–5407) es solo lectura sobre `public.folios` + `plantas` + `proyectos` + subqueries de archivos. La mutación es un `for` **después** (L5410–5423).

Filtro por etapa **ya existe** fuera del GET: `buildDashboardWhere` (`lib/director-ia-m3-plantas-kpis-proyectos.js` 222–237) acepta `filters.etapas` y las traduce con `etapaVisualToEstatusTecnicos` (`server.js` 5258+). M3 ya lo usa para KPIs. El slice puede listar/filtrar por etapa **sin** llamar `/kanban`.

El IMPL debe extraer un SELECT **delgado** (id, códigos, planta, estatus, categoría, importe, creado_en). No necesita `tiene_cotizacion` ni `monto_comprobado` (docs/cheque fuera de alcance).

Límite: el kanban no pagina. El loader debe tope fail-closed (p. ej. N filas + `truncated`), no volcar el tablero entero al chat.

---

## 4. Rutas mutantes — call graph

`maybeAdvanceFolioToComprobaciones` (`server.js` 3517–3544):

- Si estatus es `PAGADO` o `CERRADO` y `getMontoComprobadoFolio` cubre el importe:
  - `UPDATE public.folios SET estatus = COMPROBACIONES`
  - `insertHistorial(...)`
- Eso **cambia** el estatus que se devolvería.

Llamadores verificados:

| Sitio | Ruta | Efecto |
|---|---|---|
| L5417 | `GET /api/dashboard/kanban` | Auto-avanza filas PAGADO/CERRADO antes de armar el tablero |
| L12672 | `GET /api/folios/:id` | Auto-avanza el folio pedido |
| L14706 / L14725 | POST factura (write) | Fuera de este slice |

**Excluidas como fuente Director IA:** `GET /kanban`, `GET /folios/:id`, y la función `maybeAdvance*` misma.

`GET /api/folios/:id/timeline` (L12510) usa `getFolioById` + `getHistorialByFolioId` **sin** `maybeAdvance`. Aun así **fuera de este slice** (timeline).

---

## 5. Semántica etapa / estatus

| Término | Qué es | Dónde |
|---|---|---|
| **estatus** | Columna observada `public.folios.estatus` | Canónico almacenado |
| **etapa visual** | Derivado: `estatusToEtapaVisual(estatus)` | No hay columna `etapa` |
| **estado** | Lenguaje natural; no es campo | Mapear a estatus u etapa, no inventar un tercero |
| **columna Kanban** | `ETAPA_VISUAL` + `ETAPAS_VISUAL_ORDER` | Presentación; «no cambian estados en DB» (comentario L5197) |
| **label** | `getEtapaVisibleLabel` → `ETAPA_VISIBLE[ev].label` | Derivado de etapa |

Reglas del mapper (L5224–5236): `PAGADO`/`CERRADO` → `DEPOSITO_CIERRE`; `CANCELACION_SOLICITADA` → `APROB_DIRECTOR_ZP`; estatus vacío → **default** `PENDIENTE_APROB_PLANTA`. El IMPL debe devolver `estatus` observado (puede ser null/vacío) y `etapa` derivada **declarando** ese default; no afirmar «está en aprobación planta» si `estatus` era vacío sin decir que es el default del dashboard.

Filtro por etapa: etapa visual → lista de estatus técnicos (`etapaVisualToEstatusTecnicos`). No filtrar por el string de label («Carro de compra») sin normalizar.

M2 ≠ M12 (AR). M2 ≠ M3 (KPIs no listan el tablero). Aging/«trabado» no se afirma como causa.

---

## 6. Authz y planta

| Control | Evidencia | Regla del slice |
|---|---|---|
| JWT | `dashboardAuthMiddleware` en ambas rutas | Exigir auth de chat |
| GV | `dashboardBlockGVForbidden` (kanban); `dashboardBlockGVFoliosMiddleware` (folios) | **403** |
| GA | Kanban/folios **no** bloquean GA (a diferencia de KPIs M3) | Permitir lectura si planta permitida |
| `plantas_permitidas` | GG/GA: 403 si `folio.planta_id` no está; `buildDashboardWhere` usa `planta_id = ANY(...)` o `= -1` si lista vacía | Fail-closed; **no** ampliar |
| Equivalentes | `getPlantaIdsEquivalentesForPendientes` en filtros de planta | Mismo criterio dashboard |
| `solo_zp_ad` | GET `:id` → 404 si no `authCanVerFoliosSoloZpAd`; WHERE de kanban los excluye | No ampliar privados |
| Folios creados AD | Ocultos a no ZP/AD (GET `:id` y `buildDashboardWhere`) | Preservar |
| Otra planta | 403, no 404 vacío inventado | Fail-closed |
| Not found | `null` / 404 | Error explícito; no empty success |

---

## 7. Planner / tools / capabilities / chat

| Pieza | Estado |
|---|---|
| Intent `folio_status` | Existe (planner ~L191–196, confianza 0.92) |
| Tool `get_folio_status` | Declarada; `executor: null`; `requiredInputs`: `planta_id`, `folio_id` |
| Capability `folios` / `kanban` | `coverage: none`, `canRead: false` |
| `UNSUPPORTED_RULES.kanban` | Misma regex que el intent de etapa/estatus |
| Chat | `detectUnsupportedDirectorIaDomain` corre **antes** del planner (chat L2459–2464) → `SOURCE_NOT_INTEGRATED` |
| `matchesAllowedReadableIntent` | Comentarios de folio **excluyen** etapa/estatus (no abre el hueco) |
| Rama in-process | No hay `if (intent === "folio_status")` (sí hay M3/M9/duplicados) |
| Tests | Afirman `get_folio_status` no ejecutable y `SOURCE_NOT_INTEGRATED` (`test/director-ia-duplicados.test.js`, `eks`, `ies`, `reasoning-engine`) |

Delta de wiring: recortar `UNSUPPORTED_RULES.kanban` solo para este slice (historial/docs/cheques siguen bloqueados); `canRead` de `folios`/`kanban` a parcial de estatus; executor + rama chat **después** de que el unsupported deje pasar; no tocar `folio_history` / `folio_documents`.

---

## 8. Tabla de evidencia

| surface | helper_or_route | source | method | select_only | side_effects | authz | plant_scope | status_semantics | stage_semantics | existing_intent | existing_tool | executor | missing_delta | testability | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Folio por id | `getFolioById` | `public.folios` | fn | sí | no | caller | `planta_id` en fila | `f.estatus` | derivada | `folio_status` | `get_folio_status` | null | loader+authz+chat | alta | bajo | L2869 |
| Folio por número | `getFolioByNumero` | `public.folios` | fn | sí | no | caller | igual | igual | derivada | igual | igual | null | resolver id vs número | alta | medio (ambigüedad) | L2851 |
| Varios números | `getManyFoliosStatus` | `public.folios` | fn | sí | no | caller | no en SQL | igual | derivada | igual | igual | null | filtrar planta en caller | alta | bajo | L2909 |
| Listado planta/etapa | SQL kanban extraíble + `buildDashboardWhere` | `public.folios` | SELECT | sí | no en SQL | JWT+GV+WHERE | `plantas` + equivalentes | `f.estatus` | filtro vía `etapaVisualToEstatusTecnicos` | igual | igual | null | extraer SELECT delgado + tope | alta | medio (volumen) | L5374; M3 L222 |
| GET kanban | `/api/dashboard/kanban` | folios + advance | GET | no | **UPDATE** | GV | WHERE | post-mutación | columnas visuales | — | — | — | **no usar** | — | **alto** | L5410–5423 |
| GET folio | `/api/folios/:id` | folio + advance | GET | no | **UPDATE** | GV folios | 403 cruzado | post-mutación | label | — | — | — | **no usar** | — | **alto** | L12672 |
| Advance | `maybeAdvanceFolioToComprobaciones` | folios + historial | UPDATE | no | sí | — | — | cambia a COMPROBACIONES | cambia columna | — | — | — | **no llamar** | — | **alto** | L3517–3544 |

---

## 9. Tabla de gaps

| gap_id | missing_capability | required_for_slice | reusable_component | proposed_physical_change | architecture_change | contract_change | authz_change | estimated_complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|
| G1 | Loader in-process | sí | `getFolioById` / `getFolioByNumero` / `getManyFoliosStatus` + SELECT delgado | `lib/director-ia-m2-folio-status.js` | no | no | reusar GV + planta | medio | no |
| G2 | Executor tool | sí | `get_folio_status` | asignar executor | no | no | no | bajo | no |
| G3 | Chat intercept | sí | patrón M3/M9 | rama `folio_status` **y** recorte unsupported kanban | no | no | no | bajo | no |
| G4 | Capability parcial | sí | `folios` / `kanban` | `canRead` estatus/etapa; no historial/docs | no | no | no | bajo | no |
| G5 | Resolver identificador | sí | `getFolioById` + `getFolioByNumero` | fail-closed si ambiguo | no | no | no | bajo | no |
| G6 | Tope de listado | sí | — | `truncated` | no | no | no | bajo | no |
| G7 | Timeline/docs/cheque | no | — | **fuera** | — | — | — | — | no |

---

## 10. Path de implementación (no se ejecuta)

```text
pregunta etapa/estatus/tablero
  → unsupported kanban ya no corta este slice
  → intent folio_status
  → get_folio_status
  → loader
       → GV 403; planta del scope; no privs extra
       → un folio: getFolioById | getFolioByNumero
       → varios números: getManyFoliosStatus + filtro planta
       → listado: SELECT delgado + buildDashboardWhere (+ etapas)
       → NUNCA GET /kanban, GET /folios/:id, maybeAdvance
       → estatus observado + etapa derivada
  → evidencia + respuesta; openai_called false
```

In-process. Sin HTTP interno. Sin cycle. Sin migration. G2 **no**. G3 **no**.

### Archivos probables del IMPL

| Archivo | Cambio |
|---|---|
| `lib/director-ia-m2-folio-status.js` (nuevo) | loader + authz + mapper |
| `lib/director-ia-chat.js` | rama `folio_status` |
| `lib/director-ia-tools.js` | executor |
| `lib/director-ia-capabilities.js` | coverage parcial; recorte unsupported |
| `server.js` | solo si se extraen helpers (contrato HTTP intacto) |
| `test/director-ia-m2-folio-status.test.js` (nuevo) | tests del slice |
| tests EKS/IES/planner que esperan `SOURCE_NOT_INTEGRATED` en `get_folio_status` | actualizar **solo** el caso de este slice |

### Tests mínimos

- `getFolioById` / `getFolioByNumero` no llaman `maybeAdvance` (spy).
- Listado no llama `UPDATE` ni GET HTTP.
- GV 403; cross-planta 403; not found ≠ empty list de éxito.
- `solo_zp_ad` no se amplia.
- Estatus vacío no se afirma como etapa de negocio sin marcar default.
- Etapa filtrada usa `etapaVisualToEstatusTecnicos`.
- `openai_called false`; no IGF; no AR.
- Tests viejos de `SOURCE_NOT_INTEGRATED` para **historial/docs/cheques** siguen verdes.

---

## 11. Riesgos

- Envolver GET mutante «por comodidad».
- Confundir etapa derivada con columna.
- Default de estatus vacío → `PENDIENTE_APROB_PLANTA`.
- Afirmar causa de atasco (hace falta historial).
- Mezclar con M12/M3.
- Listado sin tope.
- `LIMIT 1` en lookup por código si hay colisión.
- Devolver `numero_cheque` / URLs S3 (fuera de slice).

**Dependencias:** `public.folios`, JWT, mapper visual, `buildDashboardWhere`. No S3, Twilio, ARR, Excel.

---

## 12. NEXT_TASK

**`IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001`**

Primer slice únicamente. M2 permanece PARTIAL. % permanece 42.5%.

| Gate | Valor |
|---|---|
| G1 | requerido para el IMPL |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |

---

## Acciones no realizadas

- No código, runtime, frontend, tests, SQL, matriz, contratos.
- No se llamó GET kanban / GET `:id` / `maybeAdvance`.
- No timeline, docs, cheques, pólizas, presupuestos, writes.
- No commit / push / merge.
- No se autorizó ni ejecutó NEXT_TASK.

## secrets_check

none

## git diff --check

limpio (exit 0, sin output)

## git status

```text
On branch architecture/director-ia-m2-folio-status-readiness-001
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md

no changes added to commit (use "git add" and/or "git commit -a")
```

HEAD: `bd6066e3 Merge branch 'architecture/director-ia-executive-value-prioritization-001'`

Solo `CURRENT_TASK.md` y este reporte.

## STOP
