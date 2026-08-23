# Reporte — ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
determination: "SAFE_SELECT_ONLY_PATH"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-HISTORY-001.md"
  - "lib/director-ia-m2-folio-status.js (lectura)"
  - "lib/director-ia-m2-history.js (lectura)"
  - "lib/director-ia-capabilities.js (lectura)"
  - "lib/director-ia-planner.js (lectura)"
  - "lib/director-ia-tools.js (lectura)"
  - "lib/director-ia-chat.js (lectura)"
  - "server.js (lectura: folio_archivos, listFolioArchivos*, media, S3, uploads)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3 de esta auditoría: no. El IMPL propuesto tampoco exige G2/G3."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M2 seguiría PARTIAL. 42.5% no cambiaría."
```

## Resumen ejecutivo

**Existe path SELECT-only e in-process seguro** para un slice **metadata-only** de documentos de M2. Conclusión **READY**.

La fuente es `public.folio_archivos`. Metadata **no** depende inseparablemente de S3: `s3_key` es columna de storage (NOT NULL en schema) y **se omite del SELECT**. `listFolioArchivos` ya lista sin `s3_key`. `listFolioArchivosByFolioId` sí lo selecciona: el loader **debe proyectar** y no copiarlo.

Semántica permitida: «estos son los registros documentales que existen para este folio». **No** contenido, PDF, URL, bucket, `s3_key`, OCR, «falta», «completo».

Authz: reutilizar el modelo de `folio_status` / history. Resolver y autorizar el folio **antes** de consultar archivos.

Después del IMPL: **M2 sigue PARTIAL**. Porcentaje **sigue 8.5 / 20 = 42.5%** (0.0 pp). COMPLETE de la ficha sigue exigiendo kanban HTTP, contenido/S3, cheque/póliza operativa, `kanban_flow` y mutaciones.

NEXT_TASK (no autorizada): `IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m2-documents-readiness-001` (≠ `main`).
- HEAD: `c0b67e9a Merge branch 'architecture/director-ia-m2-next-slice-prioritization-002'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. El implementador no tocó `authorized_by`, `authorized_at` ni `human_authorization`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin matriz. Sin S3. Sin descarga. Sin writes.

---

## Baseline

| Campo | Valor |
|---|---|
| Priorización | ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002; ganador documents (metadata) |
| M2 | PARTIAL (comentarios + `folio_status` + history) |
| M0–M20 | 8.5 / 20 = 42.5% |
| Hipótesis | `folio_documents` → tool → `loadFolioDocumentsMetadataForChat` → resolver/autorizar → SELECT `folio_archivos` → proyección sin `s3_key` |
| Supuesto a **no** heredar | «GET `/media` es seguro como transporte» — lista sin autoavance, pero incluye `s3_key` y es HTTP interno |

---

## Scope metadata only

**Incluye:** filas **registradas** de `public.folio_archivos` de un folio autorizado: `tipo`, `status`, `file_name`, `subido_en`, `id` como `document_id` si se expone, identidad mínima del folio, `source` + `retrieved_at`, conteo del SELECT. `file_size_bytes` y `subido_por` son metadata observada (opcionales).

**Excluye:** `s3_key`, `url`, `sha256`, bucket, URL firmada, path interno, bytes, PDF generado, OCR, resumen de contenido, «falta X», «debería tener», «completo/incompleto», uploads, deletes, `maybeAdvance`, GET `/kanban`, GET `/folios/:id`, GET `/media` como transporte, GET `/cotizacion` / `/documento*` / `/poliza`.

Metadata ≠ contenido. Registro ≠ obligatorio. Ausencia de fila ≠ documento faltante.

---

## Physical source

Definición en `server.js` 2408–2440 (bootstrap; no hay `sql/` de esta tabla):

| Columna | Tipo | Nullable | Clase |
|---|---|---|---|
| `id` | SERIAL PK | no | identificador de fila (seguro como `document_id`) |
| `folio_id` | INT FK → `folios(id)` ON DELETE CASCADE | sí en práctica vía FK | resolución |
| `numero_folio` | VARCHAR(50) | no (schema) | lookup |
| `tipo` | VARCHAR(30) | no | **metadata observada** |
| `s3_key` | TEXT | **no** (schema) | **storage — nunca exponer** |
| `url` | TEXT | sí | **storage/URL — nunca exponer** |
| `file_name` | TEXT | sí | metadata |
| `file_size_bytes` | BIGINT | sí | metadata (tamaño, no contenido) |
| `mime_type` | TEXT | default pdf | metadata menor; no afirmar contenido |
| `sha256` | TEXT | sí | huella de contenido / identidad de storage — **excluir** |
| `status` | VARCHAR(30) | no, default `PENDIENTE` | **metadata observada** |
| `replace_of_id` / `replaced_by_id` | INT | sí | internos de reemplazo; no necesarios |
| `subido_por` / `subido_en` | TEXT / TIMESTAMPTZ | `subido_en` default NOW() | actor/fecha de **registro**, no de lectura S3 |
| `aprobado_*` / `rechazado_*` | TEXT / TIMESTAMPTZ | sí | estado del registro; no «cumplimiento del folio» |
| `monto` | NUMERIC(18,2) | añadido luego | dato del archivo; **no** es financial_status |

Índice visible: `ux_folio_sha` (`folio_id`, `sha256`) where `sha256` not null.

`folios.cotizacion_s3key` / `cotizacion_url` / `cotizacion_archivo_id` son del folio, **no** la fuente de este slice.

**No existe** tabla de «documentos obligatorios por etapa». No hay regla canónica de set esperado.

`tipo` observado en código: `COTIZACION`, `POLIZA`, `FACTURA` y un resto (`ELSE`). No es enum SQL.

`status` observado: `PENDIENTE` (default), `APROBADO`, `RECHAZADO`, `ELIMINADO`, `REEMPLAZADO`.

---

## Helpers

### `listFolioArchivos(client, numeroFolio, limit = 10)` — `server.js` 3656–3666

```sql
SELECT fa.id, fa.tipo, fa.status, fa.file_name, fa.file_size_bytes, fa.subido_por, fa.subido_en, fa.replace_of_id
FROM public.folio_archivos fa
INNER JOIN public.folios f ON f.id = fa.folio_id
WHERE f.numero_folio = $1
ORDER BY fa.subido_en DESC
LIMIT $2
```

- SELECT-only. Sin `s3_key`. Sin filtro de `status` (incluye `ELIMINADO`).
- Side effects: no.
- Shape ya es casi la proyección segura.

### `listFolioArchivosByFolioId(client, folioId, limit = 50)` — `server.js` 3670–3679

```sql
SELECT fa.id, fa.tipo, fa.status, fa.file_name, fa.s3_key, fa.file_size_bytes, fa.subido_por, fa.subido_en, fa.monto
FROM public.folio_archivos fa
WHERE fa.folio_id = $1 AND fa.status NOT IN ('ELIMINADO', 'REEMPLAZADO')
ORDER BY (CASE tipo COTIZACION/POLIZA/FACTURA …), fa.subido_en ASC, fa.id ASC
LIMIT $2
```

- SELECT-only. **Expone `s3_key`.** El loader no puede devolver este shape crudo.
- Filtra `ELIMINADO`/`REEMPLAZADO` (convención dashboard `/media`, no «vigentes/completos»).
- Side effects: no.

Otros helpers (`syncFolioCotizacionRefs`, inserts, UPDATEs de status, `getSignedDownloadUrl`) son **write/S3**. No reutilizar.

**IMPL:** no importar `server.js`. Copiar un SELECT propio **sin** `s3_key`/`url`/`sha256`, después de resolver y autorizar el folio (mismo orden que history).

---

## Safe / unsafe fields

| Campo | ¿Director IA? |
|---|---|
| `folio_id`, `numero_folio` | sí (del folio resuelto) |
| `id` → `document_id` | sí (PK de fila) |
| `tipo`, `status`, `file_name`, `subido_en` | sí, observados |
| `file_size_bytes`, `subido_por` | sí, observados; no son contenido |
| `monto` | opcional observado; no afirmar comprobación/cierre |
| `aprobado_*` / `rechazado_*` | opcional; status del **registro**, no del folio |
| `s3_key`, `url`, `sha256` | **nunca** |
| `mime_type` | no necesario; no afirmar que el PDF es legible |
| `replace_of_id` / `replaced_by_id` | no necesarios |
| bucket, signed URL, path, bytes | **nunca** |

Si un helper trae `s3_key`, **eliminar antes de evidencia**.

---

## Routes / S3 boundary

| Superficie | Qué hace | ¿Fuente Director IA? |
|---|---|---|
| `GET /api/folios/:id/media` | Lista (sin `maybeAdvance`); **devuelve `s3_key`** | No (HTTP + campo inseguro) |
| `GET /api/folios/:id/media/:id/url` | `getSignedDownloadUrl(s3_key)` | No — S3 |
| `DELETE /api/folios/:id/media/:id` | UPDATE/delete | No — write |
| `POST /api/folios/:id/cotizacion` | upload | No — write + S3 |
| `POST /api/folios/:id/poliza` | upload | No — write + S3 |
| `GET /api/folios/:id/cotizacion` | `getBufferFromS3` → PDF | No — contenido |
| `GET …/documento-gastos`, `documento-folio`, `documento-completo`, `poliza/documento` | generan/sirven PDF | No — contenido |
| `GET /api/folios/:id` | detalle + `maybeAdvance` | No |
| `GET /api/dashboard/kanban` | tablero + `maybeAdvance` | No |

`s3_key` NOT NULL en schema solo prueba que el archivo **fue almacenado**. Leer metadata **no** requiere S3.

---

## Folio resolution y authz

Mismo modelo que history/`folio_status` (no la superficie `/media` más laxa):

1. `requirePlantaId` + `assertFolioStatusAccess` (GV **403**; GG/GA/AD + `plantas_permitidas` fail-closed).
2. Resolver por id o `numero_folio` (`getFolioById` / `getFolioByNumero`).
3. `folioVisibleToAuth` → 404; `folioInPlantScope` → 403.
4. **Solo entonces** SELECT `folio_archivos`.

JWT/`req.dashboardAuth`. GA solo en planta autorizada. Cross-planta 403. Folio inexistente 404. Folio autorizado + 0 filas = lista vacía observada, **no** 404 y **no** «faltan documentos».

`acceso_ver_imprimir_folios` aplica a impresión/PDF. **No** es requisito de este slice (no se imprime ni se descarga).

---

## Semantics

| Hecho | Significado |
|---|---|
| `tipo` | etiqueta observada (`COTIZACION` / `POLIZA` / `FACTURA` / otro). No es «documento obligatorio». |
| `status` | estado del **registro** (`PENDIENTE`, `APROBADO`, …). No es cumplimiento global del folio. |
| `file_name` | nombre almacenado. No es el contenido. |
| `subido_en` | timestamp del INSERT/registro. No es «leído/verificado». |
| 0 filas | no hay registros. **No** «le falta la cotización». |
| `s3_key` presente en DB | hay storage. Director IA **no lo ve**. |

No hay regla física/canónica de set esperado. Inventarla exigiría G8/contrato. **Prohibido.**

---

## Planner / tools / chat

| Pieza | Estado hoy |
|---|---|
| Intent `folio_documents` | Existe (documentos + falt/adjunt/folio/cotización/factura) |
| Capability `documentos` | `canRead: false`, `coverage: none` |
| Tool `get_folio_documents` | `declared_not_integrated`, `executor: null` |
| Executor | No existe |
| `UNSUPPORTED_RULES.documentos` | documentos + falt/adjunt/media/cotización/factura |
| Chat | `detectUnsupported` **antes** del planner; **no** hay rama `folio_documents` |

El intent es **más amplio** que metadata-only: incluye «qué documentos le faltan».

**Guardrail mínimo sin contrato nuevo:**

1. **No** quitar la cláusula `falt` de `UNSUPPORTED_RULES.documentos`. Esa pregunta sigue `SOURCE_NOT_INTEGRATED`.
2. Añadir `matchesAllowedReadableIntent` solo para listar/asociados/tiene documentos **sin** `falt`.
3. Habilitar capability parcial + tool + rama chat que **solo** lista registros.
4. La respuesta debe negar explícitamente faltantes, URLs y contenido.
5. Preguntas de póliza/cheque siguen en rules `polizas`/`cheques` (no mezclar con este slice).

G2/G3: **no**. Es wiring runtime, igual que history.

---

## Evidence table

| surface | helper_or_route | physical_source | select_only | side_effects | authz | plant_scope | safe_fields | unsafe_fields | external_dependency | reusable | risk | evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lista por número | `listFolioArchivos` | `folio_archivos` ⋈ `folios` | sí | no | caller | vía folio | id, tipo, status, file_name, size, subido_* | `replace_of_id` (interno) | no | sí (copiar SELECT) | bajo | L3656 |
| Lista por id | `listFolioArchivosByFolioId` | `folio_archivos` | sí | no | caller | vía folio | tipo, status, file_name, size, subido_*, monto | **`s3_key`** | no (si se omite) | sí con proyección | medio si se copia crudo | L3670 |
| Lista HTTP | `GET /media` | mismo helper | sí | no autoavance | folios | sí | — | **`s3_key` en JSON** | no | no (HTTP) | alto | L12417 |
| URL firmada | `GET /media/:id/url` | `s3_key` | n/a | S3 | folios | sí | ninguno | URL, `s3_key` | S3 | no | alto | L12449 |
| PDF cotización | `GET /cotizacion` | S3 buffer | no | S3 | folios | sí | ninguno | bytes | S3 | no | alto | L12753 |
| Upload/delete | POST/DELETE media/cotización/póliza | INSERT/UPDATE | no | write + S3 + a veces `maybeAdvance` | folios | sí | ninguno | mutación | S3 | no | alto | L12482, 14108, 14600 |
| PDFs generados | `documento-*` / póliza | generación | no | I/O | + imprimir | sí | ninguno | contenido | sí | no | alto | L12862+ |

---

## Gap table

| gap_id | missing_capability | required_for_metadata_slice | reusable_component | proposed_change | architecture_change | contract_change | authz_change | complexity | blocking |
|---|---|---|---|---|---|---|---|---|---|
| D1 | Loader SELECT-only | sí | patrón history + `listFolioArchivos` | `lib/director-ia-m2-documents-metadata.js` + proyección | no | no | no (reusa M2) | bajo | no |
| D2 | Authz antes del SELECT | sí | `assertFolioStatusAccess` etc. | mismo orden que history | no | no | no | bajo | no |
| D3 | Proyección sin `s3_key` | sí | omitir columnas | no copiar ByFolioId crudo | no | no | no | bajo | no |
| D4 | Executor / tool | sí | `get_folio_documents` | `loadFolioDocumentsMetadataForChat` | no | no | no | bajo | no |
| D5 | Guardrail «faltan» | sí | `UNSUPPORTED_RULES` `falt` | **conservar** `falt`; permitir solo listar | no | no | no | bajo | no |
| D6 | Rama chat | sí | `askDirectorIa` | rama `folio_documents` | no | no | no | bajo | no |
| D7 | Contenido / S3 / PDF | no | — | **fuera** | — | — | — | — | no |
| D8 | Set esperado / faltantes | no | no existe | **fuera** | sería G3/G8 | sí | — | — | no (no se pide) |

Nada bloquea el slice metadata-only.

---

## Implementation hypothesis (no se implementa)

```text
pregunta listar/tiene documentos (sin «faltan»)
  → UNSUPPORTED_RULES.documentos (falt) no corta
  → intent folio_documents
  → get_folio_documents
  → loadFolioDocumentsMetadataForChat
       → assertFolioStatusAccess
       → resolver folio (id | numero_folio)
       → folioVisibleToAuth / folioInPlantScope
       → SELECT folio_archivos SIN s3_key, url, sha256
       → NUNCA GET /media, /cotizacion, /documento*, S3, maybeAdvance
  → evidencia + respuesta inventario; openai_called false
```

In-process. Sin HTTP interno. Sin cycle. Sin migration. **G2 no. G3 no.**

---

## Tests a diseñar (si IMPL)

Metadata por id; por `numero_folio`; múltiples registros; cero registros ≠ 404 y ≠ «faltan»; `tipo`; `status`; `file_name`; `subido_en`; nulls; **`s3_key` ausente en evidencia y en source del módulo**; folio 404; cross-planta 403; planta no autorizada; `plantas_permitidas`; GA ok; GV 403; intent/tool/executor; `SOURCE_NOT_INTEGRATED` **conservado para «faltan»**; contenido/S3/PDF siguen fuera; financial/póliza-como-estatus siguen fuera; no HTTP interno; sin writes.

---

## Gates

| Gate | ¿Necesario para IMPL metadata? |
|---|---|
| G2 | **No.** Wiring runtime; no editar `docs/director-ia/` en el IMPL. |
| G3 | **No.** No hay contrato nuevo. |
| G8 | **No.** No se fija set esperado ni umbral de «completo». |

---

## Estado M2 y porcentaje

Verificado contra la ficha canónica:

- Propósito COMPLETE: flujo por etapas **más** kanban HTTP, documentos **completos** (contenido), cheque/póliza operativa, `kanban_flow`, mutaciones.
- Este slice solo añade **inventario de filas** de `folio_archivos`.
- **M2 seguiría PARTIAL.**
- **42.5% seguiría igual** (8.5/20; 0.0 pp). PARTIAL ya vale 0.5.

---

## Risks (para el IMPL, no para ejecutar ahora)

- Copiar `listFolioArchivosByFolioId` y filtrar `s3_key` tarde o olvidarlo.
- Usar GET `/media` / `/cotizacion` / `/documento*`.
- Quitar `falt` de `UNSUPPORTED_RULES` y responder «faltan».
- Tratar 0 filas como «incompleto».
- Exponer `url`/`sha256`/`folios.cotizacion_s3key`.
- Mezclar póliza-archivo con `folio_financial_status`.
- Importar `server.js`.

---

## NEXT_TASK propuesta (no autorizada)

`IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001`

Debe implementar solo el path SELECT-only metadata, proyección sin `s3_key`, authz M2 y el guardrail de «faltan». **No** S3. **No** PDF. **No** autorizar desde este reporte.

## Acciones no realizadas

- No se implementó el loader ni el wiring.
- No se accedió a S3 ni se descargó PDF.
- No se modificó código, tests, matriz ni contratos.
- No commit / push / merge.
- No se autorizó ni ejecutó NEXT_TASK.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m2-documents-readiness-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001.md
```

Solo los dos archivos autorizados.

## STOP
