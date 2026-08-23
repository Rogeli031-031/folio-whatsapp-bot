# Reporte — DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001.md"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001.md"
  - "lib/director-ia-m2-documents-metadata.js (lectura)"
  - "lib/director-ia-m2-folio-status.js (lectura)"
  - "lib/director-ia-chat.js (lectura)"
  - "lib/director-ia-tools.js (lectura)"
  - "lib/director-ia-planner.js (lectura)"
  - "lib/director-ia-capabilities.js (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2 = N/A (sync de inventario M2; no se redefinió arquitectura)."
  - "G3/G8 = N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M2 sigue PARTIAL. El porcentaje global sigue 42.5%."
```

## Resumen ejecutivo

La matriz documental quedó sincronizada con el slice `folio_documents` metadata-only ya integrado en `main`.

**M2 sigue PARTIAL.** Solo se documentó una profundización adicional (comentarios + `folio_status` + `folio_history` + metadata documental).

**El porcentaje global no cambia: 8.5 / 20 = 42.5%.** No se sumó nada. No se marcó COMPLETE.

Metadata quedó documentada **sin ampliar semántica** hacia contenido, S3, PDF, descarga, OCR, documentos faltantes ni cumplimiento.

## Baseline

| Campo | Valor |
|---|---|
| IMPL | IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001 |
| Merge en main | `243d7e916926d762f045a7dd30fd2d6108da1d08` |
| Estado matriz M2 antes | PARTIAL (comentarios + `folio_status` + `folio_history`) |
| Estado matriz M2 después | PARTIAL (comentarios + `folio_status` + `folio_history` + `folio_documents` metadata-only) |
| M0–M20 antes | 8.5 / 20 = 42.5% |
| M0–M20 después | 8.5 / 20 = 42.5% |
| Efecto | 0.0 pp |

Fórmula vigente: COMPLETE=1.0, PARCIAL=0.5, INDIRECTA=0.5, NOT_STARTED/NO INTEGRADA=0.0. M2 ya valía 0.5 y sigue valiendo 0.5.

## Slice integrado (path físico verificado)

- Rama de trabajo: `docs/director-ia-m2-documents-metadata-sync-001` (≠ `main`).
- `243d7e91` es ancestro de HEAD y está en `origin/main` (`Merge branch 'implementation/director-ia-m2-documents-metadata-001'`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin código, tests, runtime, commit, push, merge ni siguiente tarea.

Path físico verificado en main:

```text
intent folio_documents
  → get_folio_documents (available_on_demand, readOnly)
  → loadFolioDocumentsMetadataForChat
  → resolver folio (getFolioById / getFolioByNumero)
  → autorización (assertFolioStatusAccess / folioVisibleToAuth / folioInPlantScope)
  → SELECT public.folio_archivos (listDocumentsMetadataForFolio)
  → projectDocument (SAFE PROJECTION)
  → evidencia
  → buildFolioDocumentsMetadataChatResult
```

| Pieza | Evidencia |
|---|---|
| Intent | `lib/director-ia-planner.js` (`folio_documents`; listar / tiene / registros documentales) |
| Tool | `lib/director-ia-tools.js` `get_folio_documents` executor `loadFolioDocumentsMetadataForChat` |
| Chat | `lib/director-ia-chat.js` `intent === "folio_documents"` **después** de `detectUnsupported` |
| Helper | `lib/director-ia-m2-documents-metadata.js` SELECT-only + allowlist |
| Authz | Reutiliza `folio_status`; metadata **después** de resolver y autorizar |
| Financial | `get_folio_financial_status` / `get_budget_status` siguen `declared_not_integrated` |

## Source

`public.folio_archivos`

SELECT verificado: `id`, `folio_id`, `numero_folio`, `tipo`, `status`, `file_name`, `subido_en`.

El SELECT **omite** `s3_key`, `url` y `sha256`.

## Safe fields

Documentados como metadata observada:

- `document_id` (`folio_archivos.id`)
- `tipo`
- `status`
- `file_name`
- `subido_en`
- identidad mínima segura del folio: `folio_id`, `numero_folio`, `planta_id`, `planta_nombre`

## Unsafe fields / s3_key exclusion

Documentado expresamente que **NUNCA** se expone:

- `s3_key`
- URL
- signed URL
- bucket
- raw path
- `sha256`
- bytes
- contenido

`projectDocument` no copia el objeto crudo. `listFolioArchivosByFolioId` no se usó (puede devolver `s3_key`).

## Zero-row semantics

Documentado:

- semántica permitida: *«Estos son los registros documentales que existen para este folio.»*
- cero filas: *«no hay registros documentales encontrados»*
- **no** *«faltan documentos»*
- cero filas ≠ set esperado, documentación incompleta ni incumplimiento

## Guardrail faltantes

Documentado:

- «¿Qué documentos le faltan?» permanece **NO INTEGRADA** (`SOURCE_NOT_INTEGRATED`)
- PDF / contenido / descarga / OCR / «debería tener» siguen bloqueados
- listar / tiene / registros documentales = metadata soportada

## Authz / plant scope

Documentado:

- resolver folio **antes** del SELECT de metadata;
- autorizar folio **antes** del SELECT de metadata;
- JWT/contexto (`req.dashboardAuth`);
- rol;
- `planta_id`;
- `plantas_permitidas`;
- GV = 403;
- GA solo en planta autorizada;
- cross-planta = 403;
- not found = 404;
- fail-closed.

## Capacidades aún no integradas

Siguen NO integradas:

- contenido PDF;
- S3;
- signed URLs;
- descarga;
- OCR;
- documentos faltantes;
- cumplimiento documental;
- `kanban_flow`;
- financial status;
- writes;
- M15 (contenido/medios).

Pregunta #12 de Parte 4 permanece NO INTEGRADA.

## Tests

Reportados en IMPL y verificados contra ese reporte (esta tarea no reejecuta ni modifica tests):

| Evidencia | Resultado |
|---|---|
| metadata focal | **24/24** |
| capabilities | **33/33** |
| planner | **36/36** |
| orchestrator | **24/24** |
| suite Director IA | **533/533** |
| `git diff --check` en IMPL | limpio |
| `git diff --check` en este DOCS | limpio |

## Estado M2 y porcentaje

- **M2 sigue PARTIAL.**
- **42.5% no cambia** (8.5/20).
- No se marca COMPLETE.
- Metadata documentada sin ampliar a contenido, S3 ni faltantes.

## Cambios exactos en matriz

Solo `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`:

1. Ficha **M2**: sigue **PARCIAL**; se documenta el slice `folio_documents` metadata-only (source, campos seguros, exclusión de `s3_key`, semántica, cero filas, authz, rutas inseguras excluidas). Observaciones + merge `243d7e91`. Scoring **sin cambio** 42.5%.
2. Ficha **M15**: permanece **NO INTEGRADA**; se aclara que la metadata M2 no integra contenido/S3/PDF.
3. Parte 3: nueva fuente **Metadata documental de folio** (PARCIAL, SELECT-only, sin `s3_key`). **Documentos y medios** (M15) sigue NO INTEGRADA.
4. Parte 4 #12: permanece No/NO INTEGRADA (faltantes).
5. Parte 4 preguntas adicionales: se documenta listar/tiene metadata como PARCIAL.
6. Parte 9 §1, §3, §5, §6, §7 y apéndice: se añade el slice metadata; M2 permanece en PARCIAL; contenido/S3/faltantes/`kanban_flow`/financial/writes siguen no integrados.

No se reescribió la ficha de M0–M1 ni M3–M14 ni M16–M20. No se tocó `DIRECTOR_IA_ARCHITECTURE_INDEX.md`.

## Porcentaje antes/después

| ID | Etiqueta | Puntos antes | Puntos después |
|---|---|---|---|
| M2 | PARCIAL → PARCIAL (cobertura más profunda) | 0.5 | 0.5 |
| M0–M20 resto | sin cambio | 8.0 | 8.0 |
| **Total** | | **8.5** | **8.5** |

**Antes: 8.5/20 = 42.5%.**  
**Después: 8.5/20 = 42.5%.**

No se sumó nada. COMPLETE de M2 no se reinterpretó.

## Acciones no realizadas

- No se modificó código, tests, scripts, runtime, frontend ni SQL.
- No se modificaron contratos arquitectónicos (EKE, 02–05, Constitución, índice).
- No se marcó M2 COMPLETE.
- No se cambió el porcentaje.
- No se documentó acceso a PDF, S3, `s3_key`, faltantes ni cumplimiento como integrados.
- No se documentó `kanban_flow`, financial status ni writes como integrados.
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
On branch docs/director-ia-m2-documents-metadata-sync-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md
  modified:   docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md

Untracked files:
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001.md
```

Solo archivos autorizados en `in_scope.writable`.

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003`

Debe priorizar el próximo slice M2 **después** de `folio_status` + history + documents metadata. No asumir `kanban_flow` ni financial status.

Este reporte no es G5. No autoriza ni ejecuta esa tarea.

## STOP
