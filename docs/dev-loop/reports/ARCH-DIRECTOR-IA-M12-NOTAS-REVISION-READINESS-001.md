# Reporte — ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "READY"
module: "M12 — Action Register"
slice: "notas de revisión read-only (qué se escribió, quién, cuándo, en qué revisión); no ítem; no Plaud; no binarios; no CRUD"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
  - "scripts/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004.md"
  - "server.js ensureActionRegisterTables / GET-POST notes / assertDashboardPlantaAccessForActionRegister (lectura)"
  - "lib/action-register-board.js, director-ia-context.js, director-ia-action-register.js (lectura)"
  - "lib/director-ia-planner.js, tools, capabilities, chat (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A. El slice profundiza PARTIAL; no redefine COMPLETE."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "Esta tarea no cambia M12 ni 50.0%."
  - "Un IMPL futuro seguiría PARTIAL y 10.0/20 = 50.0%."
```

## Resumen ejecutivo

**READY.** Existe un path SELECT-only, in-process, autorizado y semánticamente separable para que Director IA consulte **notas reales de revisiones** del Action Register: texto (`body`), autor almacenado (`author_name`), instante (`created_at`) y revisión (`revision_id` + `revision_date`).

La fuente es `arr.action_register_revision_notes` con FK **solo** a `arr.action_register_revisions`. **No** hay `item_id`. No se puede atribuir una nota a un ítem.

**Última revisión** es física e inequívoca: `UNIQUE(planta_id, revision_date)` + `ORDER BY revision_date DESC, id DESC LIMIT 1` (misma ordenación que `GET /api/action-register/revisions`). No hay columna `activa`. Si la pregunta no trae fecha, `revision_id` ni trigger de «última», el IMPL **clarifica**; no elige por casualidad.

**Path recomendado: A — loader específico** `loadActionRegisterRevisionNotesForChat`. **No** `includeNotes=true` en el context always-on: contaminaría el board, cargaría todas las notas de todas las revisiones y no hay summarizer que las consuma.

Un IMPL futuro deja M12 en **PARTIAL** y el global en **10.0 / 20 = 50.0%** (0.0 pp). COMPLETE sigue exigiendo evidencias/CRUD.

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m12-notas-revision-readiness-001` (≠ `main`).
- HEAD: `d4c61a63`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, matriz, código, commit, push, merge.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004` |
| Módulo | M12 — Action Register |
| Estado actual | **PARTIAL** |
| Global | **10.0 / 20 = 50.0%** |
| Tras IMPL futuro | PARTIAL; **50.0%**; **0.0 pp** |

Hoy Director IA ya consulta tablero/responsables/vencidas/temas. `includeNotes: false` en `lib/director-ia-context.js` L93. Ningún summarizer de `lib/director-ia-action-register.js` lee `board.notes`.

---

## Definición canónica M12

Ficha vigente: propósito «Tablero de temas, ítems, revisiones, **notas** y evidencias por planta.» Cobertura PARTIAL. Hueco explícito: notas de revisión y attachments/binarios.

Este slice **solo profundiza PARTIAL**. No completa evidencias ni CRUD. No toca contratos.

Nombre de producto en API: «comentario del día» (`GET/POST /api/action-register/revisions/:id/notes`). Tabla canónica: `arr.action_register_revision_notes`. Misma fila; el chat debe llamarla **nota de revisión**, no comentario de folio ni de ítem.

---

## Source `revision_notes`

Schema físico (`server.js` `ensureActionRegisterTables`):

```text
arr.action_register_revision_notes
  id SERIAL PRIMARY KEY
  revision_id INT NOT NULL REFERENCES arr.action_register_revisions(id) ON DELETE CASCADE
  body TEXT NOT NULL
  author_name TEXT NOT NULL DEFAULT ''
  created_by_usuario_id INT NULL REFERENCES public.usuarios(id)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()

INDEX idx_ar_notes_revision (revision_id, created_at)
```

| Campo | Semántica física |
|---|---|
| `id` | Identidad de la nota |
| `revision_id` | Única FK. **No hay item_id ni tipo** |
| `body` | Texto. Write API recorta a 2000; el CHECK no está en DDL (filas más largas posibles) |
| `author_name` | Texto almacenado; `''` es válido. **Vacío ≠ sistema** |
| `created_by_usuario_id` | Nullable. No sustituye `author_name` |
| `created_at` | NOT NULL DEFAULT now(). Siempre hay timestamp |

SELECT de producto (`GET .../notes`) y board: `id, revision_id, body, author_name, created_at, created_by_usuario_id`, más `attachments_count` (COUNT, no binario).

Orden de notas: `created_at ASC, id ASC`.

**SELECT-only** en lectura. INSERT/UPDATE/DELETE existen en `server.js` y quedan **fuera**.

---

## Revision semantics

Una **revisión** es una fila de `arr.action_register_revisions`:

```text
id SERIAL PK
planta_id INT NOT NULL
revision_date DATE NOT NULL
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
created_by_usuario_id INT NULL
UNIQUE(planta_id, revision_date)
```

Es la columna del tablero (una fecha de revisión por planta). Los **ítems** se cuelgan vía `arr.action_register_entries(revision_id, item_id)`. Las **notas** no pasan por entries.

| Identificación | Regla física |
|---|---|
| Explícita por id | `id = $revision_id AND planta_id = $planta_id` |
| Explícita por fecha | `planta_id = $1 AND revision_date = $2::date` (YYYY-MM-DD o DD/MM/AAAA). Match **exacto**. No “la más cercana” (eso lo hace el inject DICF de ítems; **prohibido** para notas) |
| Última | `WHERE planta_id = $1 ORDER BY revision_date DESC, id DESC LIMIT 1` |
| Activa | **No existe** columna ni flag |

`revision_date` (fecha de la revisión) **≠** `note.created_at` (cuándo se escribió la nota). El contrato de respuesta debe exponer ambos. No sustituir uno por el otro.

Varias notas pertenecen a la misma revisión: sí. No inferir revisión desde una nota suelta: la nota ya trae `revision_id`.

---

## Latest revision

Inequívoca por `UNIQUE(planta_id, revision_date)`. El API de producto lista `ORDER BY revision_date DESC`. Tie-breaker defensivo: `id DESC`.

Triggers que autorizan «última» sin fecha:

- «última revisión» / «revisión más reciente»

Sin fecha, sin `revision_id` y sin esos triggers: **clarificar**. No default silencioso. «Comentarios del día» en UI es la revisión *seleccionada*, no un default de chat.

0 revisiones en la planta: `DATA_NOT_FOUND`. No inventar.

---

## Notes semantics / author / timestamp

| Invariante | Hecho |
|---|---|
| Revision note ≠ action item | Sin `item_id` |
| ≠ status transition | `body` es texto; no hay campo de estatus |
| ≠ M2 history | Tabla distinta (`public.folio_historial`) |
| ≠ folio comment | `loadFolioComentariosForDirectorIa` / otra tabla |
| ≠ Plaud | Bitácora `arr.director_ia_bitacora`; chat ya prohíbe convertir Plaud en acciones |
| Texto ≠ acuerdo formal | No hay flag «acuerdo». Citar `body`; no titular «se acordó que…» salvo que el texto lo diga |
| Autor null/vacío ≠ sistema | `author_name` puede ser `''`; `created_by_usuario_id` puede ser null. No inventar |
| Timestamp | `created_at` siempre presente |

El POST de producto llena `author_name` por mejor esfuerzo desde `usuarios`. El IMPL **lee el valor almacenado**; no resuelve de nuevo el usuario para “corregir” el autor.

---

## Context limit (determinista)

Notas pueden ser largas (TEXT; write máx. 2000, DDL sin techo). No deben entrar al context always-on.

| Límite | Valor | Motivo |
|---|---|---|
| Revisiones por respuesta | **1** | No mezclar fechas |
| Notas por revisión | **8** | Comentarios del día; overflow = `notes_omitted` |
| Orden | `created_at ASC, id ASC` | GET de producto |
| Caracteres por `body` | **500**; `truncated=true` + `original_length` | Extracto, no resumen inventado |
| Presupuesto total de bodies | **4000** | No desplazar otra evidencia si se combina |
| 0 notas | lista vacía + revisión identificada | Distinto de revisión inexistente |

El summarizer (si existe) recibe extractos ya recortados, no el board completo. No reescribir el texto.

---

## Authz / plant scope

Gate físico de AR (el que ya usa Director IA context, `server.js` ~7953 y `configureDirectorIaContext`):

`assertDashboardPlantaAccessForActionRegister`

- JWT / `dashboardAuthMiddleware`
- Roles **ZP / AD / CF_CDMX**: acceso global (sin lista)
- Resto: `plantas_permitidas` contiene `planta_id`
- Fail-closed: sin auth o sin `planta_id` → 400/403
- Cross-planta: `revisions.planta_id` debe coincidir con la planta pedida; si no, 403 / not found
- **GA / GV:** el gate de AR **no** los bloquea por rol; solo por `plantas_permitidas`. **No** reutilizar `assertFolioStatusAccess` (ese sí 403 a GV y cambia la semántica de AR)

El JOIN `notes ⋈ revisions` es el scope de planta. No hay notas huérfanas válidas (`revision_id` NOT NULL + CASCADE).

---

## Planner / tools

| Pieza | Estado hoy |
|---|---|
| Intents AR | `action_status`, `overdue_actions`, `responsible_lookup` |
| Intent notas | **No existe** |
| Tool | `get_action_register_context` → `buildDirectorIaContextPayload`; limitation: «notas excluidas» |
| Executor de notas | **No existe** |
| Chat routing | `buildFocusedNarrativeContext` / DICF / bitácora / MC. **No existe** `buildFocusedActionRegisterContext` |
| `includeNotes` | false en context |
| Summarizers | no leen `board.notes` |

«Qué se acordó» / «notas de la revisión» **no** encajan en overdue ni en «cómo va el tema». Reutilizar `action_status` mezclaría minuta con ítems.

**Hace falta intent específico `revision_notes`** + tool on-demand `get_action_register_revision_notes` + executor `loadActionRegisterRevisionNotesForChat`.

Preguntas nuevas: minuta / texto / autor / fecha de una revisión.

Siguen fuera: CRUD, adjuntos, «nota de la acción X», Plaud, history M2, comentarios de folio, export evidencias.

---

## Summarizer boundary

`includeNotes=true` (opción B) es **inseguro**:

- Carga **todas** las notas de **todas** las revisiones
- Sin recorte
- El board mezcla `cells` (ítems) y `notes`
- Los summarizers de ítems no las usan; si se vuelcan al narrativo, hay riesgo de atribuir texto a un responsable/acción

**Opción A (recomendada):** loader dedicado, bloque `revision_notes` separado, on-demand. Context always-on **sigue** con `includeNotes: false`.

---

## Boundaries

| Frontera | Separación física |
|---|---|
| M2 history | `public.folio_historial` / `loadFolioHistoryForChat` |
| Comentarios folio/cliente | `loadFolioComentariosForDirectorIa` / `loadClienteComentariosForDirectorIa` |
| Plaud / bitácora | `arr.director_ia_bitacora`; no grabaciones ni transcripciones |
| Binarios | `arr.action_register_revision_note_attachments` (s3_key / data / url) **fuera**. COUNT opcional; no fetch |
| Ítems / entries | otra tabla; no join nota→ítem |

---

## Evidence table

| surface | helper_or_query | physical_source | select_only | side_effects | revision_relation | author_semantics | timestamp_semantics | authz | plant_scope | context_limit | reusable | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Board notes | `buildActionRegisterBoardPayload` includeNotes | `revision_notes` ⋈ `revisions` | sí | no | `revision_id` | `author_name \|\| ''` | `created_at` | AR planta | `rv.planta_id` | **ninguno** (todas) | SELECT sí; recorte no | alto si se voltea el flag | `action-register-board.js` 171–204 |
| GET notes | `GET /revisions/:id/notes` | misma tabla | sí | no | path `:id` | `author_name` | `created_at` | `assertDashboard…` | via revisión | no (chat no HTTP) | forma SELECT | HTTP interno prohibido | `server.js` 8014–8048 |
| POST/PATCH/DELETE notes | CRUD | misma | no | **writes** | `revision_id` | se escribe | now() | AR | via revisión | n/a | no | C | `server.js` 8050+ |
| Context DIA | `buildDirectorIaContextPayload` | board **sin** notes | sí | no | n/a | n/a | n/a | `assertPlantaAccess` AR | query `planta_id` | top-N ítems | no para notas | — | `director-ia-context.js` 93 |
| Summarizers AR | `summarize*` | `board.cells` | n/a | no | no | n/a | due_date ítem | n/a | n/a | top 10 | no | atribución si se mezcla | `director-ia-action-register.js` |
| Note attachments | S3/bytea | `revision_note_attachments` | no (binario) | I/O | via `note_id` | n/a | n/a | AR | via nota | n/a | no | S3 | `server.js` 7868–7879 |
| Plaud | bitácora | `director_ia_bitacora` | sí | no | ninguna | n/a | sesión | AR/DIA | planta | 10 | no | mezcla | `director-ia-bitacora.js` |

---

## Gap table

| gap_id | missing_capability | required_for_slice | reusable_component | proposed_change | architecture_change | contract_change | authz_change | complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|
| G1 | loader de notas | sí | SELECT de GET notes / board | `loadActionRegisterRevisionNotesForChat` | no | no | no (reusar AR) | media | no |
| G2 | resolver revisión | sí | `ORDER BY revision_date DESC` + UNIQUE | id / fecha exacta / última / clarificar | no | no | no | baja | no |
| G3 | recorte | sí | ninguno | 1 rev / 8 notes / 500 chars / truncated | no | no | no | baja | no |
| G4 | intent `revision_notes` | sí | planner | intent + regex minuta/notas | no | no | no | baja | no |
| G5 | tool + executor | sí | patrón M18 on-demand | tool nueva; no voltear includeNotes | no | no | no | media | no |
| G6 | bloque chat / evidencia | sí | `build*ChatResult` | bloque separado; no narrative de ítems | no | no | no | media | no |
| G7 | summarizer de notas | no (extracto basta) | — | no inventar resumen | no | no | no | — | no |
| G8 | includeNotes en context | no | flag existente | **dejar false** | no | no | no | — | no |

Ningún gap bloquea READY. G2/G3 de arquitectura: **N/A**.

---

## Implementation hypothesis

```text
pregunta minuta / notas de revisión / qué se escribió
  → intent revision_notes
       (si no hay fecha ni «última»: clarificar)
  → tool get_action_register_revision_notes
  → executor loadActionRegisterRevisionNotesForChat
       → JWT; assertDashboardPlantaAccessForActionRegister
       → planta_id; fail-closed; no cross-planta
       → resolver revisión (id | fecha exacta | última física)
       → SELECT notes WHERE revision_id; JOIN revisions.planta_id
       → recorte 8 / 500 / 4000; truncated flag
       → no attachments; no Plaud; no M2; no folio comments
       → no item_id; author_name tal cual ('' permitido)
  → evidencia (revision_id, revision_date, note_id, body, author, created_at, planta_id, source)
  → respuesta; openai_called false
```

In-process. Sin HTTP interno a `/api/action-register/*`. Sin writes. Sin contrato nuevo.

### Por qué A y no B

B (`includeNotes=true`) no resuelve recorte, on-demand ni separación de ítems. A reutiliza el SELECT ya escrito y no toca el context always-on.

---

## Tests a diseñar (si IMPL se autoriza)

- notas por `revision_id` + `planta_id`
- última = `revision_date DESC, id DESC`
- fecha exacta; fecha inexistente → not found (no “cercana”)
- sin fecha ni «última» → clarificar
- múltiples notas; orden `created_at ASC, id ASC`
- 0 notas en revisión existente
- revisión inexistente
- `author_name` vacío (no «sistema»)
- `created_at` presente
- body largo / `truncated` + `notes_omitted`
- planta autorizada / no autorizada / cross-planta / `plantas_permitidas`
- ZP/AD/CF_CDMX global; GA/GV solo por lista (gate AR, no folio)
- intent `revision_notes` vs `action_status` / overdue / bitácora
- tool/executor / wiring chat
- nota no atribuida a ítem
- no M2 history; no folio comments; no Plaud; no binaries
- no HTTP interno; sin writes

---

## Gates

| Gate | Valor |
|---|---|
| G1 | AUTHORIZED (esta tarea) |
| G2 | **N/A** (no cambia arquitectura) |
| G3 | **N/A** (no contrato nuevo) |
| G8 | **N/A** |
| G5 | pendiente humano |

---

## State after future slice / percentage

| | Esta tarea | Tras IMPL futuro |
|---|---|---|
| M12 | PARTIAL | **PARTIAL** |
| Global | **50.0%** | **50.0%** (0.0 pp) |

---

## Risks (IMPL)

- Voltear `includeNotes` en context always-on
- Atribuir nota a un ítem / responsable
- Usar inject DICF «revisión más cercana» para notas
- Default silencioso de «última»
- Inventar autor o «acuerdo formal»
- Mezclar Plaud / history M2 / comentarios
- Fetch S3/bytea
- CRUD o HTTP interno
- Cambiar authz AR por `assertFolioStatusAccess`

---

## NEXT_TASK propuesta (no autorizada)

`IMPL-DIRECTOR-IA-M12-NOTAS-REVISION-001`

---

## Acciones no realizadas

- No se implementó nada. No código, tests, runtime, matriz, contratos.
- No commit / push / merge.
- No se cambió 50.0%.
- No se autorizó ni ejecutó la NEXT_TASK.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m12-notas-revision-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M12-NOTAS-REVISION-READINESS-001.md
```

Solo los dos archivos autorizados.

## STOP
