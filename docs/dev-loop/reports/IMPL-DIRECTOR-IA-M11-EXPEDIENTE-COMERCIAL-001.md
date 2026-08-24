# Reporte — IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001"
outcome: "DONE_PENDING_REVIEW"
module: "M11 — DICF"
slice: "expediente comercial factual SELECT-only (estado, comentarios con clave, acciones, historial, cierre)"
m11_state_after_impl: "PARTIAL"
global_percentage: "10.0 / 20 = 50.0% (sin cambio)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001.md"
  - "lib/director-ia-m11-commercial-dossier.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
  - "test/director-ia-m11-commercial-dossier.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-commercial-state.js"
  - "lib/dicf.js"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (lectura)"
  - "lib/dicf-acciones.js buildClienteKey / injectAccionesAbiertas (lectura)"
  - "lib/director-ia-commercial-state.js / lib/dicf.js (lectura; no reutilizados para write)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-M11-COMMERCIAL-DOSSIER-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M11 sigue PARTIAL. 10.0/20 = 50.0% no cambia."
  - "La sync documental solo registra profundidad dentro de PARTIAL; no suma porcentaje."
```

## Resumen ejecutivo

Director IA consulta un **expediente comercial factual** por **un solo cliente** con loader dedicado `loadCommercialDossierForChat`. Path:

```text
expediente_comercial
  → get_commercial_dossier
  → loadCommercialDossierForChat
  → autorizar planta
  → resolver cliente único
  → estado comercial SELECT-only (arr.dicf_cliente_mes)
  → comentarios enlazables (cliente_key coincidente)
  → acciones DICF
  → historial / resultado_cierre por acción
  → recorte 1 / 8 / 500 / 8 / 8
  → evidencia separada
  → respuesta
```

Intent nuevo: `expediente_comercial`. **No** se reutilizó `client_analysis` (arrastra bitácora).

SELECT-only real: no se llama `loadCommercialStateForChat` ni `computeDicf`. Lectura de caché materializada `arr.dicf_cliente_mes`. `cliente_key` comercial se **deriva** con `buildClienteKey` + grupos de `injectAccionesAbiertas`. Comentarios con `cliente_key` null **no se unen**. Sin join por nombre. Sin causalidad.

M11 permanece **PARTIAL**. Global **10.0 / 20 = 50.0%** (0.0 pp).

NEXT_TASK (no autorizada): `DOCS-DIRECTOR-IA-M11-COMMERCIAL-DOSSIER-SYNC-001`.

---

## Metadata / ejecución

- Rama: `implementation/director-ia-m11-expediente-comercial-001` (≠ `main`).
- HEAD base: `97fc8092 Merge branch 'architecture/director-ia-m11-expediente-comercial-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. En `CURRENT_TASK.md` solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin matriz, frontend, SQL, schema, contratos, commit, push, merge.

---

## Path físico

```text
expediente_comercial
  → get_commercial_dossier
  → loadCommercialDossierForChat
  → requirePlantaId + assertCommercialDossierAccess   (ANTES de datos)
  → SELECT public.plantas / plant_code / arr.comercial_entidad
  → SELECT arr.dicf_cliente_mes (último year/month del plant_code)
  → resolveUniqueClient
  → SELECT arr.cliente_comentarios WHERE cliente_key = ANY(keys)
  → SELECT arr.dicf_acciones WHERE planta_id + cliente_key
  → SELECT arr.dicf_accion_historial WHERE accion_id
  → recorte + evidencia
  → buildCommercialDossierAnswer
```

Chat: early-return in-process cuando `intent === expediente_comercial`. `openai_called: false`. Bloque `commercial_dossier` separado.

---

## Resolución cliente

El expediente **solo** se construye con **un** cliente.

| Caso | Resultado |
|---|---|
| Hint / entidad única + una fila de estado | unique; keys derivadas de canal/subcanal/estado |
| >1 entidad o >1 fila de estado (canal distinto) | `ambiguous_client` — clarificar; no selecciona |
| >1 `cliente_key` DICF para el mismo nombre | `ambiguous_client` |
| Sin hint y 0 entidades | `missing_client` |
| 0 filas de estado | unique si hay exactamente una `cliente_key` en acciones, o keys derivadas de nombre |

No hay selección silenciosa.

---

## Authz

`assertCommercialDossierAccess` = intersección commercial_state / DICF vigente:

- JWT / contexto / rol obligatorios (fail-closed).
- **GA 403** (regla commercial_state: “GA no tiene acceso a KPIs financieros.”).
- ZP / AD globales.
- Resto: `plantas_permitidas`.
- Cross-planta 403.
- `planta_id` obligatorio.

**Orden:** `requirePlantaId` → `assertCommercialDossierAccess` → recién entonces SELECT de expediente. Tests: GA no toca datos.

---

## Commercial state / SELECT-only

Fuente: `arr.dicf_cliente_mes` (último `year`/`month` del `plant_code`). Columnas leídas: `estado`, periodo, `last_date`, kg/ingreso, `es_nuevo`. **No** se inventa categoría de lista (dejaron/disminuyeron).

**No** se usa `loadCommercialStateForChat`. **No** se llama `computeDicf` (ese path hace DELETE+INSERT de caché).

Sin fila de estado ≠ cliente inactivo.

---

## cliente_key derivado

`arr.dicf_cliente_mes` **no persiste** `cliente_key`.

`deriveClienteKeys` usa `buildClienteKey(planta canónica, grupo, canal, subcanal, nombre)` de `lib/dicf-acciones.js`, con el mismo set de grupos que `injectAccionesAbiertas`:

- `"Dejaron de comprar"`, `"Disminuyeron"`, `"Aumentaron"`, `"Nuevo"`
- más `estado` de caché (Activo / Latente / Inactivo) si existe

`arr.dicf_acciones.cliente_key` es NOT NULL y se une por esa clave + `planta_id` (equivalentes canónicos).

---

## Comments

Fuente: `arr.cliente_comentarios`.

Regla: `cliente_key IS NOT NULL AND TRIM(cliente_key) <> '' AND cliente_key = ANY(keys)`. Filtro JS adicional.

- Null / vacío: **no se une**.
- **No** join por nombre.
- **No** heurística / fuzzy.
- 0 comentarios enlazables ≠ nadie comentó jamás.

---

## DICF actions / history / resultado_cierre

Acciones: `arr.dicf_acciones` por `planta_id` equivalente + `cliente_key`.

Historial: `arr.dicf_accion_historial` por `accion_id`. Orden `creado_en ASC, id ASC`. No se une historial directo al cliente.

`resultado_cierre` es columna de la **acción**. Ausencia ≠ fracaso.

0 acciones DICF ≠ no existe seguimiento fuera de DICF.

---

## Context limits / truncation

| Límite | Valor |
|---|---|
| Clientes | 1 |
| Comentarios | 8; overflow = `comments_omitted` |
| Chars comentario | 500; `truncated=true` + `original_length` |
| Acciones | 8; overflow = `actions_omitted` |
| Eventos historial / acción | 8; overflow = `history_omitted` |
| Orden comentarios | `created_at DESC, id DESC` |
| Orden acciones | `created_at DESC, id DESC` |
| Orden historial | `creado_en ASC, id ASC` |

Truncation explícito. No se completa texto recortado.

---

## Source provenance

Evidencia separada (no se mezclan como un solo hecho):

| Sección | Fuente |
|---|---|
| `client_identity` | `planta_id + cliente_key` |
| `commercial_state` | `arr.dicf_cliente_mes` |
| `comments` | `arr.cliente_comentarios` |
| `dicf_actions` | `arr.dicf_acciones` |
| `action_history` | `arr.dicf_accion_historial` |
| `close_result` | columna `resultado_cierre` de la acción |

Respuesta factual: “El estado observado es…”, “Hay un comentario registrado…”, “Existe una acción registrada…”, “El resultado de cierre registrado es…”.

---

## Semantic boundaries

| Invariante | Cómo |
|---|---|
| estado ≠ causa | copy “estado observado”; sin “la causa fue” |
| comentario ≠ motivo / diagnóstico | “comentario registrado” |
| acción ≠ solución | “acción registrada”; cerrada ≠ exitosa |
| resultado_cierre ≠ impacto causal | se cita el texto almacenado |
| responsable de acción ≠ dueño del desempeño | se etiqueta “responsable de la acción” |
| cronología ≠ causalidad | fechas / historial sin “esto provocó” |
| correlación ≠ causalidad | procedencia por componente |

Lenguaje prohibido ausente salvo evidencia física explícita (este slice no la infiere).

---

## Routing preservation

Planner: listas `commercial_state` y bitácora **antes** de `expediente_comercial`; `expediente_comercial` **antes** de `client_analysis`.

Preservado:

- `commercial_state` (“¿Qué clientes dejaron de comprar / aumentaron?”)
- `dicf_focused`
- `client_analysis` / bitácora
- Action Register
- vencidas

No se absorben listas comerciales en el expediente.

---

## SELECT-only evidence / no computeDicf write/cache

- Loader nuevo: solo `SELECT`.
- Source-scan de tests: no `loadCommercialStateForChat(`, no `computeDicf(`, no HTTP interno, no INSERT/DELETE de caché.
- Sin Plaud / PDF / S3 / bitácora dentro del expediente.

---

## Tests

| Suite | Resultado |
|---|---|
| `node --test test/director-ia-m11-commercial-dossier.test.js` | **19/19** |
| `node scripts/test-director-ia-capabilities.js` | **50/50** |
| `node scripts/test-director-ia-planner.js` | **46/46** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **26/26** |
| `node --test test/director-ia-*.test.js` | **644/644** |
| `git diff --check` | limpio (exit 0) |

---

## Estado M11 / porcentaje

| | Valor |
|---|---|
| M11 | **PARTIAL** (antes y después) |
| Global | **10.0 / 20 = 50.0%** |
| pp | **0.0** |

M11 ≠ COMPLETE.

---

## Acciones no realizadas

- No matriz / contratos / frontend / SQL / schema / `server.js`.
- No `loadCommercialStateForChat` / `computeDicf` / cache writes / HTTP interno.
- No Plaud, bitácora en el expediente, PDF/S3.
- No join por nombre de comentarios.
- No commit / push / merge.
- No se autorizó ni ejecutó la NEXT_TASK.

## Gates

| Gate | Valor |
|---|---|
| G1 | AUTHORIZED (esta tarea) |
| G2 | N/A |
| G3 | N/A |
| G8 | N/A |
| G5 | pendiente humano |

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch implementation/director-ia-m11-expediente-comercial-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   lib/director-ia-capabilities.js
  modified:   lib/director-ia-chat.js
  modified:   lib/director-ia-planner.js
  modified:   lib/director-ia-tools.js
  modified:   scripts/test-director-ia-capabilities.js
  modified:   scripts/test-director-ia-planner.js
  modified:   scripts/test-director-ia-tool-orchestrator.js

Untracked files:
  docs/dev-loop/reports/IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001.md
  lib/director-ia-m11-commercial-dossier.js
  test/director-ia-m11-commercial-dossier.test.js
```

Solo archivos autorizados.

## NEXT_TASK

`DOCS-DIRECTOR-IA-M11-COMMERCIAL-DOSSIER-SYNC-001` (propuesta; no autoriza G1 ni encadena). Documenta profundidad dentro de M11 PARTIAL. No modifica 50.0%.

## STOP
