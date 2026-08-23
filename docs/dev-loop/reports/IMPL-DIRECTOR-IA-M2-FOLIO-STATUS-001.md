# Reporte — IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"
  - "lib/director-ia-m2-folio-status.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "test/director-ia-m2-folio-status.test.js"
  - "test/director-ia-duplicados.test.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "package-lock.json"
  - "capability matrix documental"
  - "lib/director-ia-real-cycle.js"
  - "lib/director-ia-duplicados.js"
  - "lib/director-ia-m3-plantas-kpis-proyectos.js (solo require de helpers SELECT)"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md"
  - "docs/director-ia/ (solo lectura; no modificado)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "test/director-ia-duplicados.test.js no estaba en writable; se ajustaron solo 2 aserciones del slice (kanban ya no bloquea etapa; get_folio_status ejecutable) para que la suite Director IA requerida pasara."
next_task_proposed: "DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
  - "La capability matrix documental no se modifica en esta tarea."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M2 sigue PARTIAL. El porcentaje global sigue 42.5%."
```

## Resumen ejecutivo

Quedó integrado el **primer slice read-only** de M2 (estatus/etapa de folios) para Director IA.

Path único in-process:

`intent folio_status` → `tool get_folio_status` → `executor loadFolioStatusForChat` → helper SELECT-only → evidencia → respuesta.

Director IA ahora puede:

- consultar un folio por **id**;
- consultar un folio por **`numero_folio`**;
- consultar varios folios;
- listar folios por planta;
- filtrar/listar por etapa visual (mapper existente).

**M2 sigue PARTIAL.** El porcentaje global **sigue 42.5%** (8.5/20). Este slice no marca COMPLETE. Efecto porcentual: **0.0 pp**.

No hay autoavance. No hay writes. No hay HTTP interno.

## Autorización y gates

- Rama: `implementation/director-ia-m2-folio-status-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T14:44:00-06:00`. El implementador no tocó `authorized_by`, `authorized_at` ni `human_authorization`.
- G2/G3/G8: `N/A`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge ni siguiente tarea.

## Baseline

| Campo | Valor |
|---|---|
| Módulo | M2 — Kanban / Folios |
| Estado antes | PARTIAL |
| Estado después de este slice | PARTIAL |
| M0–M20 | 42.5% (8.5/20) |
| Efecto de este slice | 0.0 pp |
| Readiness | ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001, conclusión A (SELECT-only seguro) |

## Arquitectura implementada

Helper/loader SELECT-only en `lib/director-ia-m2-folio-status.js` (no importa `server.js`):

| Superficie | Equivalente verificado | Mutación |
|---|---|---|
| `getFolioById` | SQL `SELECT` de `public.folios` por `id` | no |
| `getFolioByNumero` | SQL `SELECT` por `numero_folio` | no |
| `getManyFoliosStatus` | SQL `SELECT` `numero_folio = ANY(...)` | no |
| `listFoliosByPlanta` | `buildDashboardWhere` + `ventana: "0"` + `etapaVisualToEstatusTecnicos` | no |
| `estatusToEtapaVisual` | misma semántica que `server.js` | n/a (derivación) |

## Folio por id / por número / varios / listado / etapa

| Caso | Lookup | Resultado |
|---|---|---|
| Folio por id | `folio 123` | `mode: single`, `estatus` observado, `etapa` derivada |
| Folio por número | `F-YYYYMM-NNN` | `mode: single` vía `numero_folio` |
| Varios | varios ids o varios `F-...` | `mode: many` |
| Listado planta | sin refs de folio | `mode: list` |
| Filtro etapa | p. ej. «folios en evidencias» | `etapa_filter` + mapper técnico |

## Estatus vs etapa

- `estatus` = columna observada `public.folios.estatus`. Puede ser `null`.
- `etapa` = valor derivado con `estatusToEtapaVisual`. **No existe columna DB `etapa`.**
- Estatus vacío → etapa default del tablero (`PENDIENTE_APROB_PLANTA`) declarada con `etapa_defaulted: true`. No se afirma como dato almacenado.
- Estatus desconocido se observa tal cual; la etapa sigue el mapper existente (no se inventa otro estatus).
- No se inventa estatus. No se inventa etapa.

## Rutas mutantes excluidas

**No** se usaron como fuente:

- `GET /api/dashboard/kanban`
- `GET /api/folios/:id`

**No** se llamó `maybeAdvanceFolioToComprobaciones`.

**No** se importó `server.js` ni un handler mutante.

El módulo M2 no contiene `INSERT`/`UPDATE`/`DELETE`, `fetch`, `axios`, ni esas rutas.

## Authz y scope de planta

- JWT/contexto: `req.dashboardAuth`.
- Rol: GV **403** («no tiene acceso al dashboard de folios»).
- GA **permitido** si la planta está en `plantas_permitidas` (a diferencia de KPIs M3).
- GG/GA/AD + `plantas_permitidas`: fail-closed (planta no autorizada → 403, sin consultar folio).
- Folio de otra planta / fuera de equivalentes → **403**, no empty success.
- Folio inexistente / no visible (`solo_zp_ad`, creado por AD) → **404**, no empty success.
- Equivalentes de planta: `getPlantaIdsEquivalentesForPendientes` (M3).
- Ningún folio cross-planta.

## Planner

- Intent `folio_status` conservado (etapa/estatus de folio).
- Añadido listado: tablero/kanban/listar/folios en etapa (sin robar `dashboard_kpis`, historial, docs, cheque, presupuesto, duplicados).
- `folio_history` y `folio_documents` siguen existiendo como intents no integrados.

## Tools / executor

| Tool | Status | Executor |
|---|---|---|
| `get_folio_status` | `available_on_demand` | `loadFolioStatusForChat` |
| `get_folio_history` | `declared_not_integrated` | `null` |
| `get_folio_documents` | `declared_not_integrated` | `null` |

- `readOnly: true`
- `requiredInputs`: `["planta_id", "question"]`
- `sourceFiles`: `lib/director-ia-m2-folio-status.js`
- Registry `validateDirectorIaToolRegistry` ok.

## Chat wiring

En `askDirectorIa`, **antes** de OpenAI y junto a M3/M9/duplicados:

`if (directorIaPlan.intent === "folio_status")` → `loadFolioStatusForChat` → `buildFolioStatusChatResult`.

- `openai_called: false`
- No cae a Action Register.
- No usa M3 (KPIs/proyectos) como sustituto.
- No cae a IGF/ARR.

## Unsupported-domain gate

Se eliminó **solo** `UNSUPPORTED_RULES.kanban`.

`SOURCE_NOT_INTEGRATED` **deja de cortar** las preguntas cubiertas por `folio_status` (etapa/estatus/listado).

Siguen bloqueados: historial, documentos, cheques, pólizas, presupuestos, inversiones, gastos, clasificación, usuarios admin, taller AT.

## Evidencia estructurada

Si hay payload ok: `folio_id`, `numero_folio`, `estatus`, `etapa`, `etapa_label`, `etapa_defaulted`, `planta_id`, `planta_nombre`, `source` (`public.folios.estatus`), `retrieved_at`, `semantic_class` (`folio_status_stage`).

## No side effects

| Invariante | Estado |
|---|---|
| No autoavance | Sí |
| No `maybeAdvanceFolioToComprobaciones` | Sí |
| No writes (INSERT/UPDATE/DELETE) | Sí |
| No HTTP interno | Sí |
| No GET `/kanban` ni GET `/folios/:id` | Sí |
| No cycle constitucional | Sí |
| No fallback Action Register | Sí |
| No fallback M3 | Sí |

## Tests

Focales en `test/director-ia-m2-folio-status.test.js`: id, número, varios, listado planta, filtro etapa, estatus observado, etapa derivada, not found, planta no autorizada, cross-planta, GA, GV, null/unknown, tool executor, planner, chat wiring, no `SOURCE_NOT_INTEGRATED` en el slice, history/docs siguen fuera, no AR, no M3, no autoavance, no writes, no HTTP interno.

## Resultados completos

| Comando | Resultado |
|---|---|
| `node --test test/director-ia-m2-folio-status.test.js` | **28/28 pass**, 0 fail |
| `node scripts/test-director-ia-capabilities.js` | **27/27 pass** |
| `node scripts/test-director-ia-planner.js` | **32/32 pass** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **24/24 pass** |
| `node --test test/director-ia-*.test.js` | **487/487 pass**, 0 fail |
| `git diff --check` | limpio (exit 0) |

## Estado M2 y porcentaje

- **M2 sigue PARTIAL.**
- **Porcentaje global sigue 42.5%** (8.5/20).
- No se marca COMPLETE.
- No se sincronizó la matriz documental.

## Acciones no realizadas

- No se habilitó `folio_history`, `folio_documents`, timeline, PDFs, cheques, pólizas, presupuestos.
- No edición, aprobación, cancelación, creación ni autoavance.
- No se modificó `docs/director-ia/**`, matriz, frontend, SQL, migrations, schema, contratos.
- No se tocó `server.js`.
- No commit, push, merge ni NEXT_TASK ejecutada.

## Gates

- G1: autorizado por humano; intacto.
- G2/G3/G8: N/A.
- G4/G5: no ejecutados.

## secrets_check

`none`. No se guardaron secretos, tokens ni credenciales.

## git diff --check

Limpio.

## git status

Al cierre (archivos de esta tarea):

```
 M docs/dev-loop/CURRENT_TASK.md
 M lib/director-ia-capabilities.js
 M lib/director-ia-chat.js
 M lib/director-ia-planner.js
 M lib/director-ia-tools.js
 M scripts/test-director-ia-capabilities.js
 M scripts/test-director-ia-planner.js
 M scripts/test-director-ia-tool-orchestrator.js
 M test/director-ia-duplicados.test.js
?? lib/director-ia-m2-folio-status.js
?? test/director-ia-m2-folio-status.test.js
?? docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md
```

Pueden existir otros cambios locales ajenos a esta tarea; no se tocaron.

## NEXT_TASK

Propuesta (máximo una), **no autorizada**, **no ejecutada**:

`DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001`

Solo debe reflejar ampliación interna de M2 **dentro de PARTIAL**. No debe marcar M2 COMPLETE ni cambiar el 42.5%.

Este reporte no es G1 ni G5.
