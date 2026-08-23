# Reporte — DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "server.js"
  - "lib/"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario M2; no se redefinió arquitectura)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M2 sigue PARTIAL. El porcentaje global sigue 42.5%."
```

## Resumen ejecutivo

La matriz documental quedó sincronizada con el slice `folio_status` ya integrado en `main`.

**M2 sigue PARTIAL.** Solo se profundizó la cobertura funcional (comentarios + estatus/etapa read-only).

**El porcentaje global no cambia: 8.5 / 20 = 42.5%.** No se sumó +2.5 pp. No se marcó COMPLETE.

## Baseline 42.5%

| Campo | Valor |
|---|---|
| IMPL | IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001 |
| Merge en main | `e5bd3a05822dc81a79e5036b692dcf9a5b125e0c` |
| Estado matriz M2 antes | PARTIAL (solo comentarios) |
| Estado matriz M2 después | PARTIAL (comentarios + `folio_status`) |
| M0–M20 antes | 8.5 / 20 = 42.5% |
| M0–M20 después | 8.5 / 20 = 42.5% |
| Efecto | 0.0 pp |

Fórmula vigente: COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED/NO INTEGRADA=0.0. M2 ya valía 0.5 y sigue valiendo 0.5.

## Implementación verificada

- Rama de trabajo: `docs/director-ia-m2-folio-status-sync-001` (≠ `main`).
- `e5bd3a05` es ancestro de HEAD (`Merge branch 'implementation/director-ia-m2-folio-status-001'`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23T15:02:00-06:00`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, runtime, commit, push, merge ni siguiente tarea.

Path físico verificado:

```text
intent folio_status
  → get_folio_status (available_on_demand, readOnly)
  → loadFolioStatusForChat
  → getFolioById / getFolioByNumero / getManyFoliosStatus / listFoliosByPlanta
  → evidencia (estatus observado, etapa derivada)
  → buildFolioStatusChatResult
```

| Pieza | Evidencia |
|---|---|
| Intent | `lib/director-ia-planner.js` (`folio_status`; listado por planta/etapa) |
| Tool | `lib/director-ia-tools.js` `get_folio_status` executor `loadFolioStatusForChat` |
| Chat | `lib/director-ia-chat.js` `intent === "folio_status"` antes de OpenAI |
| Helper | `lib/director-ia-m2-folio-status.js` SELECT-only |
| Mapper | `estatusToEtapaVisual` / `etapaVisualToEstatusTecnicos` |
| History/docs | `get_folio_history` / `get_folio_documents` siguen `declared_not_integrated` |

## Cobertura M2 antes / después

| | Antes | Después |
|---|---|---|
| Estado | PARTIAL | **PARTIAL** |
| Sí consulta | Comentarios de folio | Comentarios + estatus/etapa read-only |
| Folio por id | No | Sí |
| Folio por `numero_folio` | No | Sí |
| Varios folios | No | Sí |
| Listado por planta | No | Sí |
| Filtro por etapa | No | Sí |
| COMPLETE | No | **No** |

## Estado PARTIAL

M2 **no** es COMPLETE. El propósito empresarial («flujo operativo por etapas» incluyendo historial, documentos, cheque/póliza y tablero HTTP) sigue incompleto. Este sync solo documenta el primer slice read-only.

## Folio id / numero_folio / listado planta / filtro etapa

Documentado en la ficha M2 y en Parte 3 (fuente Folios / Kanban):

- por id (`getFolioById`);
- por `numero_folio` (`getFolioByNumero`);
- varios (`getManyFoliosStatus` o varios ids);
- listado por planta autorizada (`listFoliosByPlanta`, `ventana: "0"`);
- filtro/listado por etapa (`etapaVisualToEstatusTecnicos`).

## Estatus vs etapa

- `estatus` = dato observado en `public.folios.estatus` (puede ser null).
- `etapa` = valor derivado con `estatusToEtapaVisual`.
- **No existe columna DB `etapa`.**
- Estatus vacío → etapa default del tablero declarada (`etapa_defaulted`); no se afirma como dato almacenado.
- No se inventa estatus. No se inventa etapa.

## Authz y scope planta

Documentado:

- JWT/contexto (`req.dashboardAuth`);
- rol;
- `planta_id`;
- `plantas_permitidas` (GG/GA/AD fail-closed);
- GV = 403;
- GA solo en planta autorizada;
- folio cross-planta = 403;
- not found = 404;
- fail-closed.

## Rutas mutantes excluidas

Documentado expresamente:

- **no** se usa `GET /api/dashboard/kanban`;
- **no** se usa `GET /api/folios/:id`;
- **no** se llama `maybeAdvanceFolioToComprobaciones`;
- **no** hay autoavance;
- **no** hay writes;
- **no** hay HTTP interno.

Verificado en `lib/director-ia-m2-folio-status.js`: cero coincidencias de `INSERT`/`UPDATE`/`DELETE`, `fetch(`, `axios`, `/api/dashboard/kanban`, `/api/folios`.

## Capacidades aún no integradas

Siguen NO integradas:

- `folio_history` / timeline;
- `folio_documents` / PDFs;
- cheques;
- pólizas;
- presupuestos;
- crear / editar / aprobar / cancelar;
- cualquier mutación;
- tablero HTTP kanban.

Preguntas #11, #12 y #13 de Parte 4 permanecen NO INTEGRADA.

## Tests verificados

Reportados en IMPL y **reconfirmados** en esta rama (solo lectura; tests no modificados):

| Evidencia | Resultado |
|---|---|
| `node --test test/director-ia-m2-folio-status.test.js` | **28/28** |
| `node scripts/test-director-ia-capabilities.js` | **27/27** |
| `node scripts/test-director-ia-planner.js` | **32/32** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **24/24** |
| `node --test test/director-ia-*.test.js` | **487/487** |
| `git diff --check` en IMPL (reporte) | limpio |
| `git diff --check` en este DOCS | limpio |

## Cambios exactos en matriz

Solo `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`:

1. Ficha **M2**: sigue **PARCIAL**; se documenta el slice `folio_status` (id, número, varios, listado, etapa, estatus vs etapa, authz, rutas mutantes excluidas). Observaciones + merge `e5bd3a05`. Scoring **sin cambio** 42.5%.
2. Parte 3 fuente **Folios**: NO INTEGRADA → **PARCIAL** (SELECT-only; no GET `:id`).
3. Parte 3 fuente **Kanban**: NO INTEGRADA → **PARCIAL** (listado/filtro por etapa derivada; GET `/kanban` explícitamente excluido).
4. Parte 4 #9: No/NO INTEGRADA → Sí/**PARCIAL** (estatus + etapa derivada).
5. Parte 9 §1, §3, §5, §6, §7 y apéndice: se añade el slice; M2 permanece en PARCIAL; kanban HTTP/timeline/cheque/póliza siguen no integrados.

No se reescribió la ficha de M0–M1 ni M3–M20. No se tocó `DIRECTOR_IA_ARCHITECTURE_INDEX.md`. Historial/documentos/cheques/pólizas/presupuestos siguen NO INTEGRADA.

## Porcentaje antes/después

| ID | Etiqueta | Puntos antes | Puntos después |
|---|---|---|---|
| M2 | PARCIAL → PARCIAL (cobertura más profunda) | 0.5 | 0.5 |
| M0–M20 resto | sin cambio | 8.0 | 8.0 |
| **Total** | | **8.5** | **8.5** |

**Antes: 8.5/20 = 42.5%.**  
**Después: 8.5/20 = 42.5%.**

No se sumó +2.5. COMPLETE de M2 no se reinterpretó.

## Acciones no realizadas

- No se modificó código, tests, scripts, runtime, frontend ni SQL.
- No se marcó M2 COMPLETE.
- No se cambió el porcentaje.
- No se documentaron history/docs/cheque/póliza/presupuesto/writes como integrados.
- No commit / push / merge.
- No NEXT_TASK ejecutada ni autorizada.

## Gates

- G1: vigente, no alterado.
- G2/G3/G8: N/A (sync de inventario; el humano listó la matriz como writable).
- G5: pendiente humano.

## secrets_check

none

## git diff --check

limpio (exit 0, sin output)

## git status

Al cierre (sin commit):

```text
On branch docs/director-ia-m2-folio-status-sync-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

Untracked files:
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001.md
```

Solo archivos autorizados en `in_scope.writable`.

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001`

Debe decidir el próximo slice de M2 por valor ejecutivo. No asumir automáticamente history o documents.

Este reporte no es G5. No autoriza ni ejecuta esa tarea.

## STOP
