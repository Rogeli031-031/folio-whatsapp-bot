# Reporte — IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001.md"
  - "lib/director-ia-m2-documents-metadata.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "test/director-ia-m2-documents-metadata.test.js"
  - "test/director-ia-m2-folio-status.test.js"
  - "test/director-ia-m2-history.test.js"
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
  - "lib/director-ia-m2-folio-status.js"
  - "lib/director-ia-m2-history.js"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001.md"
  - "docs/director-ia/ (solo lectura; no modificado)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "test/director-ia-m2-history.test.js no estaba en writable; se ajustó solo la aserción get_folio_documents ejecutable (el e2e de «faltan» sigue SOURCE_NOT_INTEGRATED) para que la suite Director IA requerida pasara."
next_task_proposed: "DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
  - "La capability matrix documental no se modifica en esta tarea."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M2 sigue PARTIAL. El porcentaje global sigue 42.5%."
```

## Resumen ejecutivo

Quedó integrado el slice **metadata documental read-only** de M2 para Director IA.

Path único in-process:

`intent folio_documents` → `tool get_folio_documents` → `executor loadFolioDocumentsMetadataForChat` → resolver y autorizar folio → `SELECT` de `public.folio_archivos` → **SAFE PROJECTION** → evidencia → respuesta.

Director IA ahora puede listar los **registros documentales existentes** de un folio por **id** o por **`numero_folio`**.

Semántica permitida: *«Estos son los registros documentales que existen para este folio.»*

Cero filas: *«no hay registros documentales encontrados»*. **No** *«faltan documentos»*.

**s3_key nunca se expone.** No S3. No HTTP interno. No writes. No PDF. No descarga. No OCR.

Las preguntas de faltantes / PDF / contenido **siguen bloqueadas** (`SOURCE_NOT_INTEGRATED`).

**M2 sigue PARTIAL.** El porcentaje global **sigue 42.5%** (8.5/20). Este slice no marca COMPLETE. Efecto porcentual: **0.0 pp**.

## Autorización y gates

- Rama: `implementation/director-ia-m2-documents-metadata-001` (≠ `main`).
- HEAD de arranque: `995680a8 Merge branch 'architecture/director-ia-m2-documents-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. El implementador no tocó `authorized_by`, `authorized_at` ni `human_authorization`.
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
| Readiness | ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001, SAFE_SELECT_ONLY_PATH |

## Source `public.folio_archivos`

Loader SELECT-only en `lib/director-ia-m2-documents-metadata.js` (no importa `server.js`):

| Superficie | Equivalente | Mutación |
|---|---|---|
| `listDocumentsMetadataForFolio` | `SELECT fa.id, fa.folio_id, fa.numero_folio, fa.tipo, fa.status, fa.file_name, fa.subido_en FROM public.folio_archivos fa` con `folio_id = $1 OR numero_folio = $2` | no |
| Resolución de folio | `getFolioById` / `getFolioByNumero` de `folio_status` | no |
| Authz | `assertFolioStatusAccess`, `folioVisibleToAuth`, `folioInPlantScope` | no |

Orden: `subido_en ASC`, desempate por `id`. Límite 50 + `truncated`.

`server.js` no se tocó. No se reutilizó `listFolioArchivosByFolioId` (ese helper puede devolver `s3_key`). No se usó GET `/media` ni signed URL.

## Safe projection

`projectDocument` asigna **solo** campos de allowlist. No copia el objeto crudo.

| Incluido | Origen |
|---|---|
| `document_id` | `folio_archivos.id` |
| `tipo` | observado |
| `status` | observado |
| `file_name` | observado |
| `subido_en` | observado |
| `source` | `public.folio_archivos` |

Identidad mínima del folio en el payload (no en cada documento): `folio_id`, `numero_folio`, `planta_id`, `planta_nombre`.

## s3_key exclusion

**Nunca se selecciona ni se proyecta:**

- `s3_key`
- `url` / signed URL
- `bucket`
- raw path
- `sha256`
- bytes / `file_size_bytes`
- contenido

Aunque un row inyectado traiga `s3_key` / URL / `sha256`, la evidencia y la respuesta **no** los contienen.

El SELECT del loader **omite** `fa.s3_key`, `fa.url` y `fa.sha256`.

## Metadata por id / por `numero_folio`

| Caso | Lookup | Resultado |
|---|---|---|
| Metadata por id | `folio 123` | registros del folio resuelto |
| Metadata por número | `F-YYYYMM-NNN` | registros vía `numero_folio` |
| Folio autorizado + 0 filas | lista vacía observada | **no** 404 y **no** «faltan documentos» |
| Folio inexistente | — | **404**, sin consultar metadata |

## Authz y scope de planta

Orden obligatorio:

1. resolver folio;
2. verificar autorización/planta;
3. **solo entonces** consultar `public.folio_archivos`.

Reutiliza el modelo seguro de `folio_status` / history:

- JWT/contexto: `req.dashboardAuth`.
- Rol: GV **403** (no resuelve folio ni consulta metadata).
- GA **permitido** solo si la planta está en `plantas_permitidas`.
- GG/GA/AD + `plantas_permitidas`: fail-closed (planta no autorizada → 403, sin resolver folio ni metadata).
- Folio de otra planta / fuera de equivalentes → **403**, sin consultar metadata.
- Folio inexistente / no visible → **404**, sin consultar metadata.

## Planner

- Intent `folio_documents` habilitado para metadata soportada: listar documentos, qué documentos tiene, registros documentales.
- `folio_status` se recortó para que «listar documentos…» no caiga al listado de folios (`documentos?` en la exclusión).
- Guardrail de faltantes / PDF / contenido **conservado**.
- `folio_history` y financial surfaces no se ampliaron.

## Tool / executor

| Tool | Status | Executor |
|---|---|---|
| `get_folio_documents` | `available_on_demand` | `loadFolioDocumentsMetadataForChat` |
| `get_folio_financial_status` | `declared_not_integrated` | `null` |
| `get_budget_status` | `declared_not_integrated` | `null` |

- `readOnly: true`
- `requiredInputs`: `["planta_id", "question"]`
- `sourceFiles`: `lib/director-ia-m2-documents-metadata.js`
- Registry `validateDirectorIaToolRegistry` ok.
- Sin parámetros S3.

## Chat wiring

En `askDirectorIa`, **después** de `detectUnsupported` y junto a `folio_history`:

`if (directorIaPlan.intent === "folio_documents")` → `loadFolioDocumentsMetadataForChat` → `buildFolioDocumentsMetadataChatResult`.

- `openai_called: false`
- No fallback a Action Register.
- No fallback a M3.
- No construye URL.
- No accede almacenamiento.
- «faltan documentos» **nunca** llega al executor: `detectUnsupported` corta antes.

## Guardrail faltantes

| Pregunta | Resultado |
|---|---|
| listar documentos del folio | soportada → metadata |
| qué documentos tiene el folio | soportada → metadata |
| registros documentales del folio | soportada → metadata |
| ¿Qué documentos le faltan? | `SOURCE_NOT_INTEGRATED` |
| PDF / contenido / descarga / OCR / debería tener | `SOURCE_NOT_INTEGRATED` |

`UNSUPPORTED_RULES.documentos` conserva `falt` / `deberia` / PDF / contenido.

Cero filas **no** se narra como documentos faltantes ni como documentación incompleta.

## S3 boundary

**No** se usaron como fuente/transporte:

- S3 / `@aws-sdk`
- `getSignedDownloadUrl`
- `getBufferFromS3`
- `GET /api/folios/:id/media`
- `GET /api/folios/:id/media/:id/url`
- `GET /api/folios/:id/cotizacion`
- endpoints `documento-*` / `poliza/documento`
- `listFolioArchivosByFolioId` (puede devolver `s3_key`)

No se integró M15. No se construyó URL. No se leyó PDF. No se hizo OCR.

## No side effects

| Invariante | Estado |
|---|---|
| `s3_key` nunca expuesto | Sí |
| No S3 | Sí |
| No HTTP interno | Sí |
| No writes (INSERT/UPDATE/DELETE) | Sí |
| No PDF / contenido / descarga / OCR | Sí |
| Faltantes siguen bloqueados | Sí |
| No cycle constitucional | Sí |
| No fallback Action Register | Sí |
| No fallback M3 | Sí |
| M2 sigue PARTIAL | Sí |
| 42.5% no cambia | Sí |

## Tests

Focales en `test/director-ia-m2-documents-metadata.test.js`: metadata por id; por `numero_folio`; múltiples docs; cero docs ≠ faltan; `document_id`; tipo; status; `file_name`; `subido_en`; nulls; `s3_key` nunca expuesto; URL nunca expuesta; folio inexistente; cross-planta; planta no autorizada; `plantas_permitidas`; GA; GV; intent; tool/executor; chat wiring; listar soportado; tiene documentos soportado; faltan bloqueado; PDF/contenido bloqueado; no S3; no HTTP interno; sin writes.

## Resultados completos

| Comando | Resultado |
|---|---|
| `node --test test/director-ia-m2-documents-metadata.test.js` | **24/24 pass**, 0 fail |
| `node scripts/test-director-ia-capabilities.js` | **33/33 pass** |
| `node scripts/test-director-ia-planner.js` | **36/36 pass** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **24/24 pass** |
| `node --test test/director-ia-*.test.js` | **533/533 pass**, 0 fail |
| `git diff --check` | limpio (exit 0) |

## Estado M2 y porcentaje

- **M2 sigue PARTIAL.**
- **Porcentaje global sigue 42.5%** (8.5/20).
- No se marca COMPLETE.
- No se sincronizó la matriz documental.
- 42.5% **no cambia**.

## Acciones no realizadas

- No se expuso `s3_key`, URL, bucket, path, `sha256` ni bytes.
- No se accedió a S3 ni se construyó signed URL.
- No se leyó PDF ni contenido. No OCR. No descarga.
- No se afirmó documentos faltantes ni cumplimiento.
- No se habilitó M15, financial status, `kanban_flow` ni writes.
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
 M test/director-ia-m2-folio-status.test.js
 M test/director-ia-m2-history.test.js
?? lib/director-ia-m2-documents-metadata.js
?? test/director-ia-m2-documents-metadata.test.js
?? docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001.md
```

## NEXT_TASK

Propuesta **exactamente una**, no autorizada ni ejecutada:

`DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001`

Solo debe reflejar profundización dentro de PARTIAL. **No** marcar COMPLETE. **No** cambiar 42.5%.
