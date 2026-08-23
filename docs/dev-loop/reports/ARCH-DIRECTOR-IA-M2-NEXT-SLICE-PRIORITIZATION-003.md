# Reporte — ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003"
outcome: "DONE_PENDING_REVIEW"
winner: "EXIT_M2"
winner_meaning: "conservar M2 PARTIAL con la profundidad actual; no implementar otro slice M2 ahora; regresar a priorización global entre módulos"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-HISTORY-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-HISTORY-SYNC-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-DOCUMENTS-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-DOCUMENTS-METADATA-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-DOCUMENTS-METADATA-SYNC-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005.md"
  - "lib/director-ia-m2-folio-status.js (lectura)"
  - "lib/director-ia-m2-history.js (lectura)"
  - "lib/director-ia-m2-documents-metadata.js (lectura)"
  - "lib/director-ia-tools.js (lectura)"
  - "server.js (lectura: maybeAdvance, kanban, finanzas, numero_cheque, presupuestos)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "M2 sigue PARTIAL. El porcentaje global sigue 42.5%."
  - "EXIT_M2 no significa COMPLETE. No se reinterpreta el propósito canónico."
```

## Resumen ejecutivo

**Ganador: EXIT_M2.**

Tras comentarios + `folio_status` + history + documents metadata, las preguntas ejecutivas **diarias** de M2 ya tienen hechos: etapa/estatus, listado por planta/etapa, conteos, historial observado y registros documentales existentes.

Los huecos restantes **no** son un slice incremental seguro:

- `kanban_flow` residual = tiempo en etapa / «atorado» → **no es un hecho** (002 ya lo demostró; history no lo habilita).
- `financial_status` **no es una capacidad**: cheque ≠ póliza ≠ presupuesto. Presupuesto es **M18**. `GET /finanzas` sigue stub.
- Documents restante = PDF / S3 / faltantes / cumplimiento → frontera **M15** / storage; no hay set esperado canónico.
- Otros huecos (`numero_cheque`, `prioridad`, writes) son dato fino, enriquecimiento o clase C.

Seguir invirtiendo en M2 ahora produce **0.0 pp**, reinterpreta COMPLETE o cruza módulos. El costo de oportunidad es reabrir la priorización **global** (p. ej. un PARTIAL de otro módulo NOT_STARTED).

**M2 sigue PARTIAL.** **42.5% no cambia.** Esta tarea no implementa nada.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m2-next-slice-prioritization-003` (≠ `main`).
- HEAD de partida: `d09cc069 Merge branch 'docs/director-ia-m2-documents-metadata-sync-001'`.
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
| Ya integrado | comentarios; `folio_status` (id, `numero_folio`, varios, listado planta, filtro/listado etapa, `counts_by_etapa`); history read-only; documents metadata-only |
| Path status | `folio_status` → `get_folio_status` → `loadFolioStatusForChat` |
| Path history | `folio_history` → `get_folio_history` → `loadFolioHistoryForChat` |
| Path documents | `folio_documents` → `get_folio_documents` → `loadFolioDocumentsMetadataForChat` |
| Merges | status `e5bd3a05`; history `368394f7`; documents metadata `243d7e91` |

Esta tarea **no cambia** estado ni porcentaje.

---

## Definición canónica M2

Ficha vigente (`DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`):

- **Propósito empresarial:** flujo operativo de folios por etapas (aprobación, carro, cheque, depósito, comprobaciones, evidencias).
- **COMPLETE** no es «un slice más». Sigue exigiendo kanban HTTP, contenido PDF/S3, documentos faltantes, cheque/póliza operativa, `kanban_flow` inferencial y mutaciones. **No se reinterpreta.**
- **Hoy PARCIAL:** comentarios + `folio_status` + `folio_history` + `folio_documents` metadata-only.

Invariantes: timestamp de evento ≠ entrada a etapa; antigüedad ≠ retraso ≠ atorado; no inventar SLA / `event_type` / transición; metadata ≠ contenido; cheque ≠ póliza ≠ presupuesto; M18 ≠ M2; stub ≠ integración; GET `/kanban` y GET `/folios/:id` mutan.

---

## Cobertura actual

| Pregunta ejecutiva | ¿Hecho disponible? | Fuente |
|---|---|---|
| ¿En qué etapa/estatus está? | Sí | `folios.estatus` + `estatusToEtapaVisual` |
| ¿Qué folios hay en cada etapa? | Sí | `listFoliosByPlanta` |
| ¿Cómo está distribuido el flujo? | Sí (conteos del conjunto consultado) | `counts_by_etapa` |
| ¿Cuál fue el último movimiento? | Sí (eventos observados) | `folio_historial` |
| ¿Quién/cuándo se registró un evento? | Sí si el actor existe; null ≠ sistema | history |
| ¿Qué registros documentales tiene? | Sí (metadata) | `folio_archivos` proyectado |
| ¿Qué dicen los comentarios del folio? | Sí | `comentarios` |
| ¿Cuánto lleva en la etapa? | **No como hecho fiel** | ver kanban_flow |
| ¿Está atorado / incumple SLA? | **No** | inferencia |
| ¿Qué documentos le faltan? | **No** | no hay set esperado |
| ¿Tiene cheque (número) / póliza operativa / presupuesto? | Etapa cheque/depósito sí; el resto no | ver financial |
| ¿Puedo leer el PDF / bajarlo? | **No** | M15 / S3 |

Las capacidades que motivaron entrar a M2 (estatus, tablero por etapa, movimiento, evidencia registrada) **ya están**.

---

## Huecos restantes

### 1. `kanban_flow`

Valor incremental **después** del listado por etapa: solo «tiempo en etapa» / flujo inferido. El listado y `counts_by_etapa` **ya existen**.

| Hallazgo físico | Evidencia |
|---|---|
| GET `/kanban` sigue mutando | `server.js` ~5417 llama `maybeAdvanceFolioToComprobaciones` (UPDATE + `insertHistorial`) |
| GET `/folios/:id` sigue mutando | `server.js` ~12672 |
| History no da entrada a etapa | No hay `event_type`, `estatus_anterior`, `estatus_nuevo` ni etapa almacenada |
| Timestamp ≠ entrada | `creado_en` del evento es edad del evento |
| Antigüedad de folio ≠ dwell | `folios.creado_en` / aging M3 |

**No** se usa GET `/kanban`. **No** se llama `maybeAdvance`. **No** se convierte history en SLA/retraso/atorado.

**Decisión:** no es el siguiente movimiento. El delta fiel es nulo.

### 2. `financial_status`

No se agrupan.

| Superficie | Dominio real | ¿M2? | ¿Slice ahora? |
|---|---|---|---|
| Etapa cheque / depósito | Flujo de etapas | Cubierto por `folio_status` | no |
| `numero_cheque` | Columna `public.folios` (SELECT-only; no está en el SELECT de Director IA) | M2, dato fino | no gana |
| Póliza | Archivo (`folio_archivos.tipo = POLIZA`) o PDF generado | Metadata ya listable; contenido = **M15** | no |
| Presupuesto / carro | `presupuestos_semanales` + `presupuesto_folios` | **M18** | no absorber |
| `GET /api/folios/:id/finanzas` | `{ status: "PENDIENTE_INTEGRACION", monto_mxn: importe }` (`server.js` 12624–12646) | Stub | **no cuenta** |

Cheque ≠ póliza ≠ presupuesto. El director ya ve la etapa. El número de cheque no explica el flujo. Writes (PATCH `numero_cheque`, POST póliza, ligar carro) están prohibidos.

**Decisión:** no es una capacidad y no es el siguiente movimiento.

### 3. Documents remaining

| Capa | ¿Implementar ahora? | Por qué |
|---|---|---|
| PDF / contenido | No | No hay SELECT de bytes; exige S3 o generación |
| S3 / signed URL | No | Frontera M15/storage; `s3_key` nunca se expone |
| Faltantes | No | No existe set esperado canónico |
| Cumplimiento | No | Inferencia; no hay regla G8 |

Metadata **ya está**. El resto no se asume obligatorio. Cruzar a M15/S3 ahora es costo alto y 0.0 pp en M2.

**Decisión:** no es el siguiente movimiento.

### 4. Otros huecos canónicos

| Hueco | Por qué no gana |
|---|---|
| `numero_cheque` | SELECT-only posible; valor ejecutivo bajo; etapa cheque ya visible |
| `prioridad` / `mes_cargo` / `creado_por` | Enriquecen status; no son dominio nuevo |
| Importe / categoría | Ya en la card de `folio_status` |
| Kanban HTTP | Presentación + `maybeAdvance`. Excluido |
| Writes / autoavance | Clase C |
| «Por qué está detenido» (#10) | Comentarios ya existen; causa no es un hecho |
| Carro | M18 |

Ningún hueco restante añade un hecho diario comparable a status, history o metadata.

---

## EXIT_M2

**Significado:** no implementar otro slice M2 ahora. Conservar PARTIAL con la profundidad actual. Volver a priorización **global** entre módulos. **No** marca COMPLETE. **No** cambia 42.5%.

### ¿Las capacidades ejecutivas principales ya están cubiertas?

**Sí, para el uso diario de dirección sobre el flujo:**

1. Dónde está el folio (estatus/etapa).
2. Qué hay en cada etapa de la planta (listado + conteos).
3. Qué se registró (history).
4. Qué archivos están registrados (metadata).
5. Qué se comentó.

Lo que falta para COMPLETE canónico (tablero HTTP mutante, PDF/S3, faltantes, cheque/póliza operativa, dwell inferencial, writes) **no** es «el siguiente slice seguro». Es o inferencia, o otro módulo, o clase C.

### Rendimiento marginal vs costo de oportunidad

| Inversión | Efecto % | Hecho nuevo | Riesgo |
|---|---|---|---|
| Otro slice M2 (cualquiera de los de arriba) | **0.0 pp** (sigue PARTIAL) | nulo o dato fino o cruce de módulo | alto si se afirma dwell/faltantes/S3 |
| EXIT + priorización global | **0.0 pp ahora**; abre candidatos NOT_STARTED (p. ej. M6 query como PARTIAL **+2.5** si un humano lo acepta; 005 ya descartó COMPLETE fácil) | preguntas de **otro** dominio | el de esa priorización, no de forzar M2 |

005 (`ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005`) dejó un plateau: no hay COMPLETE de un slice. Eso **no** obliga a seguir en M2. Obliga a elegir el siguiente PARTIAL **entre módulos**, no a agotar M2.

Pregunta clave: ¿otro módulo produce más valor ahora? **Sí, en expectativa.** Un slice M2 más no cierra preguntas diarias nuevas con fidelidad. Un módulo NOT_STARTED (M6/M4/M5 lectura) sí abre un dominio que hoy es `SOURCE_NOT_INTEGRATED` y, si es PARTIAL honesto, puede sumar +2.5 pp. Eso lo decidirá la priorización global; esta tarea solo sale de M2.

No se elige EXIT por deseo de «terminar» ni por facilidad. Se elige porque el **rendimiento marginal de M2 cayó por debajo** del costo de oportunidad.

---

## Tabla comparativa

| candidate | remaining_gap | executive_value | incremental_value | physical_source | select_only | dependencies | inference_risk | state_effect | percentage_effect | recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| kanban_flow | dwell / flujo inferido | alto solo si dwell fuera fiel | **baja** (listado ya cubierto) | listado en `folios`; dwell **no** fiel en history | listado sí; dwell no es un hecho | status+history | **alto** | PARTIAL | 0.0 pp | pierde |
| financial_status | cheque+póliza+presupuesto | medio-bajo / fragmentado | baja (etapa cheque ya visible) | columna + `folio_archivos` + M18 + stub | mixto | M18 / M15 | alto si se agrupa | PARTIAL | 0.0 pp | pierde |
| documents remaining | PDF/S3/faltantes/cumplimiento | medio (contenido) | baja vs metadata ya integrada | S3 / handlers `/media` | no (bytes/URL) | **M15 / S3** | alto («faltan») | PARTIAL | 0.0 pp | pierde |
| other (`numero_cheque`) | dato fino | bajo | baja | `folios.numero_cheque` | sí | ninguna | bajo | PARTIAL | 0.0 pp | no gana |
| writes / kanban HTTP | mutación | n/a | n/a | handlers mutantes | no | `maybeAdvance` | n/a | — | — | fuera |
| **EXIT_M2** | no profundizar M2 ahora | **alto como movimiento** (libera inversión) | n/a (no es slice) | n/a | n/a | priorización global | bajo (no afirma hechos nuevos de M2) | **PARTIAL sin cambio** | **0.0 pp** | **GANADOR** |

---

## Scoring (0–5; ayuda; no decide solo)

Puntajes de valor (más = mejor para **hacer ese movimiento ahora**):

| dimensión | kanban_flow | financial_status | documents remaining | numero_cheque | EXIT_M2 |
|---|---|---|---|---|---|
| executive_value | 2 | 2 | 3 | 1 | 4 |
| daily_frequency | 2 (ya cubierto) | 2 | 2 | 1 | 5 (libera ciclo) |
| incremental_value | 1 | 2 | 1 | 1 | 4 |
| source_clarity | 2 | 1 | 2 | 5 | 5 |
| read_only_safety | 5 si no GET `/kanban` | 3 | 1 | 5 | 5 |
| semantic_fidelity | 1 | 1 | 1 | 4 | 5 |
| authz_fit | 5 | 4 | 3 | 5 | 5 |
| implementation_reuse | 4 | 2 | 1 | 5 | n/a |
| testability | 3 | 2 | 2 | 5 | 5 (solo docs) |

Penalizaciones (más = peor):

| penalización | kanban_flow | financial_status | documents remaining | numero_cheque | EXIT_M2 |
|---|---|---|---|---|---|
| inference_risk | 5 | 4 | 5 | 1 | 0 |
| write_dependency | 5 si GET `/kanban` | 2 | 2 | 0 | 0 |
| external_dependency | 0 | 3 | 5 (S3) | 0 | 0 |
| cross_module_dependency | 0 | 5 (M18) | 5 (M15) | 0 | 1 (global) |
| contract_ambiguity | 4 | 5 | 4 | 1 | 1 |
| duplication | 5 | 3 | 3 | 2 | 0 |

El score favorece EXIT porque **ningún slice M2 restante** combina valor incremental alto con fidelidad semántica. El score no «elige solo»: la regla de no completar M2 por deseo y el 0.0 pp lo confirman.

---

## Costo de oportunidad

Profundizar M2 ahora:

- no abre un dominio nuevo;
- no cambia 42.5%;
- arrastra riesgo de inferencia (dwell/faltantes) o de cruce (M15/M18);
- retrasa cualquier PARTIAL de módulo NOT_STARTED.

Salir de M2 ahora:

- conserva las ganancias ya obtenidas;
- no finge COMPLETE;
- permite comparar M4/M5/M6/M10/M14/M15/M18 (y profundización de otros PARTIAL) **entre sí**, no contra el hábito de «seguir en el módulo abierto».

---

## Ganador

**EXIT_M2**

### Por qué gana

1. Las preguntas ejecutivas principales de M2 ya tienen hechos SELECT-only.
2. El único delta de `kanban_flow` no es fiel. 002 sigue vigente; documents metadata no lo cambió.
3. `financial_status` no es una capacidad; presupuesto es M18; finanzas HTTP es stub.
4. Documents restante es M15/S3/faltantes, no un slice M2 seguro.
5. Otro slice M2 = 0.0 pp. No se elige por facilidad ni por cerrar la ficha.
6. COMPLETE canónico **sigue incompleto**; EXIT no lo reinterpreta. Solo detiene la inversión **ahora**.

### Por qué no gana un slice M2

- **kanban_flow:** listado cubierto; dwell no es hecho; GET `/kanban` muta.
- **financial_status:** tres dominios + stub + M18.
- **documents remaining:** S3/PDF/faltantes; metadata ya integrada.
- **numero_cheque / otros:** dato fino.

### Riesgos de EXIT (para el humano, no para implementar)

- Confundir EXIT con COMPLETE. **No lo es.**
- Dejar de auditar M2 para siempre. Un humano puede reabrir un slice más adelante.
- La priorización global puede otra vez no hallar COMPLETE (005). Eso no invalida salir de M2: el residual valioso está fuera.

### Estado M2 y efecto porcentual

| | Ahora | Tras esta tarea |
|---|---|---|
| M2 | PARTIAL | **PARTIAL** |
| M0–M20 | 42.5% (8.5/20) | **42.5%** (0.0 pp) |

---

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001`

Debe priorizar el siguiente módulo **fuera del hábito de profundizar M2**, con M2 ya en PARTIAL (status + history + documents metadata). No asumir `kanban_flow` ni financial status. No marcar M2 COMPLETE. No cambiar 42.5% en esa propuesta.

Este reporte no es G5. No autoriza ni ejecuta esa tarea.

---

## Acciones no realizadas

- No se implementó ningún slice.
- No se modificó código, tests, runtime, matriz ni contratos.
- No commit / push / merge.
- No se autorizó ni ejecutó NEXT_TASK.
- No se cambió 42.5%. No se marcó M2 COMPLETE.

## Gates

- G1: vigente, no alterado.
- G2/G3/G8: N/A (auditoría; no se editó `docs/director-ia/`).
- G5: pendiente humano.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch architecture/director-ia-m2-next-slice-prioritization-003
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003.md
```

Solo los dos archivos autorizados.

## STOP
