# Reporte — ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002"
outcome: "DONE_PENDING_REVIEW"
winner: "documents"
winner_scope: "metadata DB only; no contenido; no S3; no faltantes inferidos"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-HISTORY-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001.md"
  - "lib/director-ia-m2-folio-status.js (lectura)"
  - "lib/director-ia-m2-history.js (lectura)"
  - "lib/director-ia-tools.js (lectura)"
  - "server.js (lectura: kanban, media, finanzas, folio_archivos, maybeAdvance)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M2 sigue PARTIAL. El porcentaje global sigue 42.5%."
```

## Resumen ejecutivo

**Ganador: documents**, acotado a **metadata DB** de `public.folio_archivos`.

Tras `folio_status` + history, el listado/distribución por etapa **ya está**. History **no** habilita un «tiempo en etapa» fiel: no hay `event_type`, ni `estatus_anterior`/`estatus_nuevo`, ni etapa almacenada en el evento. Un timestamp de evento no es entrada a etapa. Por eso `kanban_flow` **no gana**.

`financial_status` **no es una capacidad**: cheque ≠ póliza ≠ presupuesto. Póliza es documento. Presupuesto es **M18**. `GET /api/folios/:id/finanzas` es stub (`PENDIENTE_INTEGRACION`).

El hueco ejecutivo incremental defendible es: **qué archivos están registrados** en el folio (tipo/status/nombre/fecha), sin leer PDF, sin S3 y sin afirmar «faltan».

Después de ese slice (si se implementa luego): **M2 sigue PARTIAL**. Porcentaje **sigue 8.5 / 20 = 42.5%** (0.0 pp). No se otorga COMPLETE.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m2-next-slice-prioritization-002` (≠ `main`).
- HEAD de partida: `3a46c94c Merge branch 'docs/director-ia-m2-history-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. El implementador no tocó `authorized_by`, `authorized_at` ni `human_authorization`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación. Sin matriz. Sin código. Sin commit/push/merge.

---

## Baseline

| Campo | Valor |
|---|---|
| Módulo | M2 — Kanban / Folios |
| Estado | PARTIAL |
| M0–M20 | 8.5 / 20 = **42.5%** |
| Ya integrado | comentarios; `folio_status` (id, `numero_folio`, varios, listado planta, filtro/listado etapa, estatus observado, etapa derivada, `counts_by_etapa`); history read-only sin dedupe |
| Path status | `folio_status` → `get_folio_status` → `loadFolioStatusForChat` |
| Path history | `folio_history` → `get_folio_history` → `loadFolioHistoryForChat` → SELECT `public.folio_historial` |
| Merge history | `368394f7` |

Esta tarea **no cambia** estado ni porcentaje. El efecto futuro del ganador se calcula, no se otorga.

---

## Definición canónica M2

Ficha vigente (`DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`):

- **Propósito empresarial:** flujo operativo de folios por etapas (aprobación, carro, cheque, depósito, comprobaciones, evidencias).
- **COMPLETE** no es «un slice más». Sigue exigiendo más que status + history (kanban HTTP, documentos, cheque/póliza, `kanban_flow` inferencial, mutaciones). Un slice no lo cierra.
- **Hoy PARCIAL:** comentarios + `folio_status` + `folio_history`.

Invariantes: M2 ≠ Action Register (M12); M2 ≠ KPIs M3; estatus actual ≠ historial; metadata ≠ contenido; antigüedad ≠ retraso; tiempo en etapa ≠ retraso; cheque ≠ póliza ≠ presupuesto; M18 ≠ M2.

---

## Cobertura actual status + history

| Pregunta | ¿Ya hay hecho? | Fuente |
|---|---|---|
| ¿En qué etapa está? | Sí | `folios.estatus` + `estatusToEtapaVisual` |
| ¿Qué folios hay en cada etapa? | Sí | `listFoliosByPlanta` + filtro etapa |
| ¿Cómo está distribuido el flujo? | Parcial (conteos del conjunto consultado) | `counts_by_etapa` |
| ¿Quién/cuándo se registró un evento? | Sí | `folio_historial` (actor/estatus/comentario/`creado_en`) |
| ¿Cuánto lleva en la etapa actual? | **No como hecho fiel** | ver kanban_flow |
| ¿Qué archivos tiene el folio? | No | `folio_archivos` |
| ¿Tiene cheque / póliza / presupuesto? | Etapa cheque/depósito sí; número/póliza/carro no | ver financial |

---

## Candidatos

### 1. `kanban_flow`

Preguntas de la tarea: distribución, folios por etapa, «más tiempo en etapa», qué se puede afirmar sin convertir antigüedad en retraso.

| Dimensión | Hallazgo físico |
|---|---|
| Valor ejecutivo | Alto **solo si** existiera tiempo en etapa fiel. El listado/distribución ya se consulta hoy. |
| Frecuencia | Diaria para el listado — **ya cubierto**. |
| Qué ya cubre `folio_status` | Folios en una etapa; `counts_by_etapa`; SELECT-only; no GET `/kanban`. |
| Handler mutante | `GET /api/dashboard/kanban` (`server.js` 5368–5423) llama `maybeAdvanceFolioToComprobaciones` (UPDATE + `insertHistorial`). **Excluido.** |
| `GET /api/folios/:id` | También llama `maybeAdvance` (L12672). **Excluido.** |
| Helper SELECT equivalente | El listado seguro **ya está** en `listFoliosByPlanta`. No hay helper de «tiempo en etapa». |
| Tiempo en etapa con history | History da `creado_en` + `estatus` por **evento**. No hay `event_type`, `estatus_anterior`, `estatus_nuevo` ni `etapa` almacenada. |
| ¿Se puede calcular fielmente? | **No.** Opciones físicas y por qué fallan: (a) `now − creado_en` del último evento = edad del último evento, no entrada a etapa; (b) último evento cuyo `estatus` mapea a la etapa actual = se **resetea** si hay otro evento con el mismo estatus (p. ej. comentario); (c) primer evento de una racha mapeable = reconstruye transiciones que el schema no soporta. |
| Antigüedad de folio | `folios.creado_en` / aging M3. **No** es tiempo en etapa. |
| Retraso / atorado / SLA / prioridad | Inferencia. No hay regla canónica (G8). Ausencia de movimiento ≠ bloqueo. |
| Planner/tool | No hay intent `kanban_flow`. El listado entra por `folio_status`. |
| Authz / planta | Reutilizable. |
| Redundancia | Alta con `folio_status` (listado) y con history (timestamps). Baja con M12. Media con M3 aging si se confunde edad de folio. |
| Estado M2 después | PARTIAL |
| Impacto % | **0.0 pp** |

**Decisión:** pierde. History cambió el argumento de 001 («el tiempo en etapa vive en historial») por uno más estricto: history existe y **aun así** el tiempo en etapa no es un hecho. Un slice que lo afirmara reinterpretaría el contrato de eventos.

### 2. `documents`

Preguntas: metadatos asociados; DB vs S3/M15; ¿slice útil sin leer el PDF?

| Capa | Fuente | ¿Slice útil? |
|---|---|---|
| Metadata DB | `public.folio_archivos`: `id`, `folio_id`, `tipo`, `status`, `file_name`, `file_size_bytes`, `subido_por`, `subido_en`, `monto`, `aprobado_*`, `rechazado_*` | **Sí**, listar lo **registrado** |
| Almacenamiento / contenido | bytes en S3 (`s3_key`); `url`; generación PDF (`/documento*`) | **No** en este slice |
| S3 / M15 | `GET /media/:id/url` firma URL; uploads; DELETE | **No** integrar |
| «Documentos faltantes» | No hay set esperado canónico en tabla | **No afirmar** |

| Dimensión | Hallazgo físico |
|---|---|
| Valor ejecutivo | Alto incremental **después** de status+history: en evidencias/comprobaciones la pregunta diaria pasa a «qué archivos están registrados». Parte 7 de la matriz ya lo marca Media-Alta (valor 4) **después** de historial. |
| Frecuencia | Diaria–semanal en etapas de evidencia/cierre; ocasional en etapas tempranas. |
| SELECT-only | **Sí.** `listFolioArchivos` (L3656, por `numero_folio`, **sin** `s3_key`). `listFolioArchivosByFolioId` (L3670, por id; **sí selecciona `s3_key`** — no copiar esa columna a evidencia de chat). |
| HTTP | `GET /api/folios/:id/media` (L12417) lista **sin** `maybeAdvance`. Aun así Director IA **no** debe usarlo como transporte interno. |
| No SELECT-only | URL firmada; DELETE media; POST cotización/póliza; generación PDF; `maybeAdvance` en uploads. |
| Semántica | Metadata ≠ contenido. Existencia de fila ≠ PDF accesible. `status` observado (`PENDIENTE`/`APROBADO`/…). `tipo` observado (`COTIZACION`/`POLIZA`/`FACTURA` y otros). **No** «le faltan». |
| Authz | Misma familia folios (JWT, rol, `plantas_permitidas`, GV 403, GA en planta, cross-planta 403, 404). Superficies de impresión usan `acceso_ver_imprimir_folios` — el readiness debe fijar si aplica a metadata. |
| Scope planta | Vía folio padre. Fail-closed. |
| Planner/tool | Intent `folio_documents`; tool `get_folio_documents` `declared_not_integrated`, `executor: null`. |
| Dependencia | Ninguna si solo metadata. S3 **si** se entrega URL o bytes. |
| Redundancia | Baja con status/history (un comentario «evidencia cargada» no es inventario). Baja con M3/M12. Póliza como `tipo` no es financial_status. |
| Riesgo | Alto si se afirma «faltan», se resume un PDF no leído o se filtra `s3_key`. Controlable si el slice es inventario observado. |
| Estado M2 después | **PARTIAL** |
| Impacto % | **0.0 pp** |

No es un solo slice con contenido. Metadata y binario **no** se agrupan.

### 3. `financial_status`

Preguntas: qué es M2; cheque; póliza; presupuesto; ¿una capacidad?; ¿M18?; ¿stub?

| Superficie | Dominio real | Fuente | ¿M2? |
|---|---|---|---|
| Etapa cheque / depósito | Flujo de etapas | Ya en `folio_status` (`CHEQUE_GENERADO`, `DEPOSITO_CIERRE`) | Cubierto |
| `numero_cheque` | Dato fino de folio | `public.folios.numero_cheque` (columna; SELECT-only) | M2, **no** un paquete |
| Póliza | Archivo | `folio_archivos.tipo = 'POLIZA'` | **documents**, no «estatus financiero» |
| Presupuesto / carro | Carro semanal | `public.presupuestos_semanales` + `presupuesto_folios` | **M18** |
| `GET /api/folios/:id/finanzas` | Stub | `{ status: "PENDIENTE_INTEGRACION", monto_mxn: importe }` (L12624–12646) | **No es fuente** |

| Dimensión | Hallazgo |
|---|---|
| Valor ejecutivo | Medio-bajo como paquete. El director ya ve la etapa cheque/depósito. El número de cheque no explica el flujo. |
| ¿Una capacidad? | **No.** Agruparlos reinterpretaría módulos. |
| SELECT-only | Cheque: sí. Póliza metadata: sí (es documents). Presupuesto lectura: tablas M18; el carro escribe. Finanzas GET: stub. |
| Planner/tools | `folio_financial_status` y `get_budget_status` son **dos** tools. Reglas `cheques`, `polizas`, `presupuestos`. |
| Writes | PATCH `numero_cheque`; POST póliza; ligar presupuesto a `SELECCIONADO_SEMANA`. Prohibidos. |
| Estado M2 después | PARTIAL |
| Impacto % | 0.0 pp |

### 4. Otros huecos de la ficha

Ninguno supera a documents-metadata:

| Hueco | Por qué no es el slice |
|---|---|
| `prioridad` / `mes_cargo` / `creado_por` | Enriquecen `folio_status`; no son un dominio nuevo. |
| Kanban HTTP | Presentación + `maybeAdvance`. Excluido. |
| Writes / autoavance | Clase C. Prohibido. |
| Carro / presupuesto | M18. |
| Tiempo en etapa como «atorado» | Inferencia G8. |

---

## Tabla comparativa (obligatoria)

| candidate | canonical_gap | executive_value | physical_source | select_only | in_process_possible | authz_fit | plant_scope | dependencies | inference_risk | incremental_coverage | state_after_slice | percentage_effect | recommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| documents (metadata) | inventario de `folio_archivos`; no contenido | alto incremental post history | `public.folio_archivos` + `listFolioArchivos*` | sí (metadata) | sí (copiar SELECT; no GET `/media`) | sí (familia M2; imprimir a auditar) | vía folio | ninguna si no S3 | medio si solo lista; alto si «faltan» | alta (status/history no listan archivos) | PARTIAL | 0.0 pp | **GANADOR** |
| kanban_flow | tablero + tiempo en etapa | alto solo si el tiempo fuera fiel | listado ya en `folios`; dwell **no** fiel en `folio_historial` | listado sí; dwell no es SELECT de un hecho | listado ya existe; dwell sería derivación | sí | sí | status+history | **alto** (etapa/retraso) | baja (listado cubierto; dwell no fiel) | PARTIAL | 0.0 pp | pierde |
| financial_status | cheque+póliza+presupuesto | medio-bajo / fragmentado | columna + `folio_archivos` + M18 + stub | mixto | mixto | sí | sí | M18 / S3 póliza | alto si se agrupa | baja (etapa ya visible) | PARTIAL | 0.0 pp | pierde |
| other (número cheque solo) | dato fino | bajo | `folios.numero_cheque` | sí | sí | sí | sí | ninguna | bajo | baja | PARTIAL | 0.0 pp | no gana |
| writes / kanban HTTP | mutación | n/a | handlers mutantes | no | no | n/a | n/a | maybeAdvance | n/a | n/a | — | — | fuera |

---

## Scoring (0–5; no sustituye la decisión)

Puntajes de valor (más = mejor):

| dimensión | documents metadata | kanban_flow | financial_status |
|---|---|---|---|
| executive_value | 4 | 3 | 2 |
| incremental_value_after_status_history | 4 | 1 | 2 |
| read_only_safety | 5 | 5 (solo si no GET `/kanban`) | 3 |
| physical_source_clarity | 4 | 2 | 1 |
| authz_fit | 4 | 5 | 4 |
| plant_scope_fit | 5 | 5 | 4 |
| implementation_reuse | 4 | 4 | 2 |
| semantic_clarity | 3 | 1 | 1 |
| testability | 5 | 3 | 2 |

Penalizaciones (más = peor):

| penalización | documents metadata | kanban_flow | financial_status |
|---|---|---|---|
| write_dependency | 0 | 5 si se usa GET `/kanban`; 0 si no | 2 |
| external_storage_dependency | 1 (si se omite S3); 5 si URL/PDF | 0 | 3 (póliza) |
| cross_module_dependency | 3 (linde M15) | 0 | 5 (M18) |
| inference_risk | 2 (lista) / 5 («faltan») | 5 | 4 |
| contract_ambiguity | 3 | 4 | 5 |
| duplication_of_existing_capability | 1 | 5 | 3 |

El score favorece documents **porque** kanban_flow duplica el listado y su único delta (tiempo en etapa) no es un hecho. No se eligió documents «por default» ni por orden de ficha.

---

## Ganador

**documents** (metadata DB only)

### Por qué gana

1. Es el hueco canónico restante que **añade hechos** que status + history no dan: filas observadas de `folio_archivos`.
2. Valor diario en evidencias/comprobaciones: «qué está registrado», no «cómo se movió».
3. Fuente y helpers SELECT-only verificados. `GET /media` no autoavanza, pero el path debe ser in-process.
4. Authz y planta reutilizan el modelo M2. Sin writes. Sin stub.
5. Se puede acotar sin reinterpretar COMPLETE: listar lo existente; no contenido; no S3; no «faltan».

### Fuente física probable

`public.folio_archivos` vía SELECT equivalente a `listFolioArchivos` / `listFolioArchivosByFolioId` **sin** exponer `s3_key`/`url`. Resolver y autorizar el folio **antes**, igual que history.

### Qué falta auditar antes de implementar (readiness)

- Conjunto real de `tipo` y `status` (incluir o excluir `ELIMINADO`/`REEMPLAZADO`/`RECHAZADO`).
- Prohibición expresa de «faltan» / set esperado.
- Frontera M15: metadata vs bytes vs URL firmada.
- Si `acceso_ver_imprimir_folios` aplica a metadata de chat.
- No copiar `s3_key` al payload de chat.
- Póliza como `tipo` de archivo, no como `financial_status`.
- No usar GET `/media`, `/documento*`, `/kanban`, `/folios/:id`.

### Por qué pierden los demás

- **kanban_flow:** el listado ya está. El tiempo en etapa **no** es fiel aunque exista history. GET `/kanban` muta. «Atorado» no es un hecho.
- **financial_status:** tres dominios distintos + stub. Presupuesto es M18. Póliza es documents. Etapa cheque ya se ve.
- **other:** `numero_cheque` es dato fino; writes están prohibidos.

### Riesgos (para el readiness, no para implementar ahora)

- Afirmar documentos faltantes.
- Entregar URL/S3 o resumir PDF no leído.
- Tratar póliza como estatus financiero.
- Usar GET `/folios/:id` o `/kanban` (autoavance).
- Convertir `s3_key` en secreto de evidencia.

### Estado M2 posterior y efecto porcentual

| | Ahora | Tras documents-metadata (si se implementa después) |
|---|---|---|
| M2 | PARTIAL | **PARTIAL** |
| M0–M20 | 42.5% (8.5/20) | **42.5%** (0.0 pp) |

COMPLETE sigue exigiendo más que metadata de archivos. No se suma +2.5.

---

## Gates

- G1: vigente, no alterado.
- G2/G3/G8: N/A (auditoría; no se editó `docs/director-ia/`).
- G5: pendiente humano.

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001`

Debe auditar el path SELECT-only de `folio_archivos`, semántica metadata vs contenido, exclusión S3/M15, authz y la prohibición de «faltan». **No** implementar. **No** autorizar desde este reporte.

## Acciones no realizadas

- No se implementó documents ni ningún otro slice.
- No se modificó código, tests, matriz ni contratos.
- No commit / push / merge.
- No se autorizó ni ejecutó NEXT_TASK.
- No se cambió 42.5%. No se marcó M2 COMPLETE.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m2-next-slice-prioritization-002
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002.md
```

Solo los dos archivos autorizados.

## STOP
