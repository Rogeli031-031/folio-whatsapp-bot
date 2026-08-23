# Reporte — ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001"
outcome: "DONE_PENDING_REVIEW"
winner: "history"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001.md"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-FOLIO-STATUS-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M2-FOLIO-STATUS-001.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M2-FOLIO-STATUS-SYNC-001.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
```

## Resumen ejecutivo

**Ganador: history** (historial/timeline read-only de un folio).

Tras `folio_status`, el hueco ejecutivo diario es **quién/cuándo cambió el estatus**, no el tablero HTTP, no el PDF y no el carro semanal.

Existe path SELECT-only físico: `getHistorialByFolioId` / `getHistorial` sobre `public.folio_historial`. `GET /api/folios/:id/timeline` **no** llama `maybeAdvanceFolioToComprobaciones`. El IMPL debe extraer el helper, no usar GET `/folios/:id` ni GET `/kanban`.

Después de ese slice: **M2 sigue PARTIAL**. Porcentaje **sigue 8.5 / 20 = 42.5%** (0.0 pp). No se agrupan slices. No se otorga COMPLETE.

NEXT_TASK (no autorizada): `ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001`.

---

## Ejecución

- Rama: `architecture/director-ia-m2-next-slice-prioritization-001` (≠ `main`).
- HEAD de partida: `f56db111 Merge branch 'docs/director-ia-m2-folio-status-sync-001'`.
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
| Ya integrado | comentarios; folio por id; por `numero_folio`; varios; listado planta; filtro etapa; estatus observado; etapa derivada |
| Path seguro vigente | `folio_status` → `get_folio_status` → `loadFolioStatusForChat` → SELECT-only |
| Merge `folio_status` | `e5bd3a05` |

---

## Definición canónica M2

Ficha vigente (`DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`):

- **Propósito empresarial:** flujo operativo de folios por etapas (aprobación, carro, cheque, depósito, comprobaciones, evidencias).
- **COMPLETE** no es «un slice más». Exige cubrir ese propósito (tablero/estatus + historial + datos operativos de lectura). Un slice no lo cierra.
- **Hoy PARCIAL:** comentarios + `folio_status`. Fuera: kanban HTTP, historial, documentos, cheque/póliza/presupuesto, mutaciones.

Invariantes: M2 ≠ Action Register; M2 ≠ KPIs M3; estatus actual ≠ historial; metadata ≠ contenido; antigüedad ≠ retraso; cheque ≠ póliza ≠ presupuesto.

---

## Gaps restantes (inventario)

| Gap | ¿Es el propósito COMPLETE? | ¿Ya hay hechos en `folio_status`? |
|---|---|---|
| Quién/cuándo se movió el folio | Parte del flujo | No. Solo estatus/etapa actuales |
| Antigüedad **en la etapa actual** | Parte del flujo | No. `creado_en` es edad del folio (M3), no tiempo en etapa |
| Tablero HTTP kanban | Presentación + side effect | Listado/filtro etapa ya existe **sin** GET `/kanban` |
| Metadata de documentos | M2/M15 solapados | No |
| Contenido PDF / URL S3 | M15 | No |
| Número de cheque | Dato operativo | No |
| Póliza (archivo) | Dato operativo / M15 | No |
| Presupuesto semanal / carro | **M18** | No (y no es el mismo módulo) |
| Crear/editar/aprobar/cancelar / autoavance | Escritura (C) | Prohibido |

---

## History

| Dimensión | Hallazgo físico |
|---|---|
| Valor ejecutivo | **Alto.** Tras saber la etapa, la pregunta diaria es quién movió / cuándo / último evento. ARCH-EXECUTIVE-VALUE ya lo situó como slice 2. |
| Frecuencia | Diaria–semanal |
| Fuente | `public.folio_historial` (`id`, `folio_id`, `numero_folio`, `folio_codigo`, `estatus`, `comentario`, `actor_telefono`, `actor_rol`, `creado_en`) |
| SELECT-only | **Sí.** `getHistorialByFolioId` (`server.js` 2892–2906) y `getHistorial` (3854–3868): solo `SELECT`. |
| Side effects | El **helper** no muta. `insertHistorial` es escritura de **otros** flujos. `GET /timeline` (12510–12538) usa `getFolioById` + `getHistorialByFolioId` **sin** `maybeAdvance`. `GET /folios/:id` **sí** muta — **excluido**. |
| Semántica | Cada fila es un evento observado. `estatus` del evento puede ser null. Comentarios de usuario se mezclan (`Comentario: …`). Actor puede ser null. `dedupeHistorialByStage` colapsa etapas en la UI: **no** copiarlo sin declararlo (oculta eventos). No afirmar «aprobó» si `actor_rol` está vacío. No afirmar causa. |
| Authz | Misma familia que folios: JWT; `dashboardBlockGVFoliosMiddleware`; GG/GA `plantas_permitidas`; `solo_zp_ad` → 404. Reutilizable `assertFolioStatusAccess`. |
| Scope planta | Vía folio padre (`planta_id` + equivalentes). Historial no tiene `planta_id` propio. Fail-closed cross-planta. |
| Helpers | `getHistorialByFolioId` (por id), `getHistorial` (por `numero_folio`). Preferir ambos si hay filas viejas con `folio_id` null (columna no NOT NULL). |
| Planner | Intent `folio_history` (0.92). |
| Tool | `get_folio_history` `declared_not_integrated`, `executor: null`. |
| Executor | No existe. Chat corta con `UNSUPPORTED_RULES.folio_historial` → `SOURCE_NOT_INTEGRATED`. |
| Delta | Extraer SELECT; authz M2; rama chat; quitar **solo** la regla historial; tests. Sin S3. Sin contrato nuevo. |
| Testabilidad | Alta (pool fake / inyección). |
| Dependencia externa | Ninguna. |
| Riesgo semántico | Medio (nulls, comentarios vs cambio de etapa, dedupe UI). Controlable si se reportan eventos crudos + `truncated`. |
| Estado M2 después | **PARTIAL** |
| Impacto % | **0.0 pp** (sigue 42.5%) |

---

## Documents

| Dimensión | Hallazgo físico |
|---|---|
| Valor ejecutivo | Medio. «¿Falta la cotización/factura?» es ocasional y a menudo inferencia. |
| Frecuencia | Ocasional |
| Fuente metadata | `public.folio_archivos` (`tipo`, `status`, `file_name`, `file_size_bytes`, `subido_*`, `monto`, `s3_key`) |
| Fuente binaria | S3 (`s3_key` + `getSignedDownloadUrl`); `GET /documento-*` genera PDF |
| SELECT-only metadata | **Sí.** `listFolioArchivos` / `listFolioArchivosByFolioId`. `GET /media` (12417–12447) lista sin `maybeAdvance`. |
| No SELECT-only | URL firmada (S3); DELETE media; POST cotización/póliza; generación PDF |
| Semántica | Metadata ≠ contenido. «Le faltan documentos» exige un set esperado no almacenado como regla canónica. |
| Authz | Igual familia folios + `acceso_ver_imprimir_folios` en superficies de impresión. |
| Planner/tool | `folio_documents` / `get_folio_documents` `executor: null`. `UNSUPPORTED_RULES.documentos`. |
| Delta | Metadata: medio. Contenido/S3/PDF: alto, cruce M15. |
| Dependencia | S3 si se entrega URL o bytes |
| Riesgo semántico | Alto si se afirma «faltan» o se resume un PDF no leído |
| Estado M2 después | PARTIAL |
| Impacto % | 0.0 pp |

No es un solo slice. Metadata y binario no se agrupan para forzar COMPLETE.

---

## Financial status

| Superficie | Fuente real | ¿Un slice? |
|---|---|---|
| Cheque | Columna `public.folios.numero_cheque`; etapa visual `CHEQUE_GENERADO` ya derivable en `folio_status` | Dato fino; no explica el flujo |
| Póliza | `folio_archivos.tipo = 'POLIZA'` (+ POST upload) | Es **documento**, no «estatus financiero» |
| Presupuesto | `public.presupuestos_semanales` + `presupuesto_folios` (**M18**). Ligar **UPDATE** estatus a `SELECCIONADO_SEMANA` | Módulo distinto; no es M2 |
| `GET /api/folios/:id/finanzas` | Stub: `status: "PENDIENTE_INTEGRACION"`; solo `monto_mxn` = `importe` | **No es fuente** |

| Dimensión | Hallazgo |
|---|---|
| Valor ejecutivo | Medio-bajo como paquete. El director ya ve etapa cheque/depósito vía `folio_status`. |
| ¿Coherente? | **No.** Cheque ≠ póliza ≠ presupuesto. Fusionarlos sería agrupar para cerrar M2. |
| SELECT-only | Cheque: sí (columna). Póliza: metadata sí / upload no. Presupuesto: lectura de tablas sí; el carro escribe. Finanzas GET: stub. |
| Planner/tools | `folio_financial_status` + `budget_status` (dos tools). Reglas `cheques`, `polizas`, `presupuestos`. |
| Estado M2 después | PARTIAL |
| Impacto % | 0.0 pp |

---

## Kanban flow

| Dimensión | Hallazgo físico |
|---|---|
| Valor ejecutivo | Alto **en abstracto** («qué está atorado»). Tras `folio_status`, el listado por etapa **ya existe**. |
| Qué ya cubre `folio_status` | Folios en una etapa; conteos del conjunto consultado |
| Antigüedad factual | `folios.creado_en` = edad del folio (M3 `avg_aging` / `oldest`). **No** es tiempo en la etapa actual. `folios.updated_at` no es «entró a esta etapa». |
| Tiempo en etapa | Requiere el **último evento** de `folio_historial` cuyo `estatus` mapea a la etapa actual. Sin history, no hay hecho. |
| Movimientos | Son filas de historial, no del GET kanban |
| «Retrasado / atorado» | Inferencia. No hay regla canónica (G8). Ausencia de movimiento ≠ bloqueo. |
| Handler mutante | `GET /kanban` (5410–5423) llama `maybeAdvance`. **Excluido.** |
| Planner/tool | No hay intent `kanban_flow`. El listado ya entra por `folio_status`. |
| Delta | Si se inventa umbral de atraso: alto (semántica nueva). Si es «días desde último evento de estatus»: **depende de history**. |
| Riesgo semántico | **Alto** si se dice atorado/retrasado. Medio si solo se reportan días desde un timestamp de historial. |
| Estado M2 después | PARTIAL |
| Impacto % | 0.0 pp |

Kanban flow **no gana ahora**: su parte valiosa y factual es un derivado de history. Hacerlo primero reintroduce GET kanban o inventa retraso.

---

## Otros candidatos

Ninguno con mayor valor ejecutivo:

- `creado_por` / `prioridad` / `mes_cargo` ya pueden enriquecer `folio_status`; no son un slice nuevo.
- Comentarios ya integrados.
- Writes / autoavance prohibidos.

---

## Ranking comparativo

| rank | candidate | executive_value | source_ready | read_only | authz_ready | planner_tool_ready | implementation_delta | semantic_risk | external_dependency | state_after_slice | percentage_effect | decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | history | alto | sí (`folio_historial` + helpers SELECT) | sí (helper; no GET `:id`) | sí (mismo que M2) | intent+tool; executor null | bajo–medio | medio (controlable) | ninguna | PARTIAL | 0.0 pp | **GANADOR** |
| 2 | kanban_flow | alto solo si se afirma atasco | parcial: listado ya existe; tiempo-en-etapa **no** sin historial | sí solo si se extrae SELECT; GET `/kanban` **no** | sí | no (se solapa con `folio_status`) | medio–alto (regla de atraso) | alto (retraso/bloqueo) | ninguna | PARTIAL | 0.0 pp | pierde: depende de history; listado ya cubierto |
| 3 | documents (solo metadata) | medio | sí (`folio_archivos` SELECT) | metadata sí; PDF/S3 no | sí + imprimir | intent+tool; executor null | medio | alto («faltan») | S3 si hay URL | PARTIAL | 0.0 pp | pierde: menor frecuencia; no explica el flujo |
| 4 | financial_status | medio-bajo / fragmentado | cheque columna sí; póliza=docs; presupuesto=M18; GET finanzas=stub | mixto | sí | dos tools distintas | alto si se agrupa | alto (mezclar conceptos) | M18 / S3 póliza | PARTIAL | 0.0 pp | pierde: no es un slice coherente |

No se eligió history por «ser el siguiente de la ficha». Se eligió porque es el único que **añade hechos diarios** que `folio_status` no da, con fuente SELECT-only lista, y porque kanban_flow factual **requiere** esa fuente.

---

## Ganador

**history**

### Por qué gana

1. Complemento directo de `folio_status`: dónde está ≠ cómo llegó / quién / cuándo.
2. Frecuencia diaria. Valor ejecutivo de «qué está pasando» en el flujo.
3. Fuente y helpers SELECT-only verificados. Timeline GET no autoavanza.
4. Authz y scope reutilizables. Sin S3. Sin M18. Sin contrato nuevo.
5. Habilita después un kanban_flow **factual** (días desde último evento), sin inventar «atorado».

### Por qué pierden los demás

- **kanban_flow:** el listado por etapa ya está. «Atorado» no es un hecho. El tiempo en etapa vive en historial.
- **documents:** metadata útil pero ocasional; contenido = M15/S3; «faltan» es inferencia.
- **financial_status:** tres capacidades distintas + un stub HTTP. Presupuesto es M18.

### Estado y porcentaje después del ganador

| | Ahora | Tras history (si se implementa después) |
|---|---|---|
| M2 | PARTIAL | **PARTIAL** |
| M0–M20 | 42.5% | **42.5%** (0.0 pp) |

COMPLETE sigue exigiendo más que historial. No se suma +2.5.

---

## Riesgos (para el readiness, no para implementar ahora)

- Usar `GET /api/folios/:id` o `GET /kanban` (autoavance).
- Copiar `dedupeHistorialByStage` y ocultar eventos.
- Afirmar aprobación/bloqueo si `actor_*` es null o el comentario no es un cambio de estatus.
- Buscar solo por `folio_id` y perder filas históricas con `folio_id` null.
- Convertir «sin eventos» en empty success inventado.

---

## Gates

- G1: vigente, no alterado.
- G2/G3/G8: N/A (auditoría; no se editó `docs/director-ia/`).
- G5: pendiente humano.

## NEXT_TASK propuesta (no autorizada)

`ARCH-DIRECTOR-IA-M2-HISTORY-READINESS-001`

Debe auditar el path SELECT-only de `folio_historial`, semántica de eventos vs comentarios, authz y exclusiones mutantes. **No** implementar. **No** autorizar desde este reporte.

## Acciones no realizadas

- No se implementó history ni ningún otro slice.
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
On branch architecture/director-ia-m2-next-slice-prioritization-001
Changes not staged for commit:
  modified:   docs/dev-loop/CURRENT_TASK.md

Untracked files:
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001.md
```

Solo los dos archivos autorizados.

## STOP
