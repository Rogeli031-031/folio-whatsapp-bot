# Reporte — IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001"
outcome: "DONE_PENDING_REVIEW"
module: "M4 — Clasificación de apoyos + COMPARAR"
slice: "query JSON read-only mes_a vs mes_b"
state_after_impl: "PARTIAL (runtime; matriz documental aún NO INTEGRADA hasta sync)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001.md"
  - "lib/director-ia-m4-clasificacion-query.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
  - "test/director-ia-m4-clasificacion-query.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-QUERY-READINESS-001.md"
  - "lib/clasificacion-apoyos-excel.js (buildClasificacionMatrix, PLANTAS_COMPARATIVO)"
  - "server.js GET clasificacion-apoyos / POST clasificacion-comparar* (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none (no se copió priv_clave)"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "La matriz documental no se actualizó. La sync futura debe pasar 9.0/20 = 45.0% a 9.5/20 = 47.5% y M4 a PARTIAL, no COMPLETE."
```

## Resumen ejecutivo

Director IA ya consulta in-process la matriz comparativa M4 (`mes_a` vs `mes_b`) por planta y familia GASTOS / INVERSIONES / TALLER. Fuente: `SELECT public.folios` + `buildClasificacionMatrix`. Sin HTTP interno, sin COMPARAR, sin Excel, sin writes.

**M4 queda PARTIAL en runtime. No COMPLETE.** La matriz documental **no** cambia en este IMPL.

Path:

```text
clasificacion_apoyos_query
  → get_clasificacion_apoyos_query
  → loadClasificacionApoyosForChat
  → SELECT public.folios + buildClasificacionMatrix
  → evidencia
  → respuesta (openai_called false)
```

## Ejecución

- Rama: `implementation/director-ia-m4-clasificacion-query-001` (≠ `main`).
- HEAD de arranque: `5a5e8cd0 Merge branch 'architecture/director-ia-m4-clasificacion-query-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge, sync documental.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `lib/director-ia-m4-clasificacion-query.js` | Loader SELECT-only + evidencia + respuesta |
| `lib/director-ia-capabilities.js` | `clasificacion_apoyos` readable/partial; query permitida; Excel/COMPARAR sigue bloqueado |
| `lib/director-ia-planner.js` | Intent `clasificacion_apoyos_query` (antes de M6) |
| `lib/director-ia-tools.js` | Tool `get_clasificacion_apoyos_query` + executor real |
| `lib/director-ia-chat.js` | Rama in-process antes de OpenAI/M6 |
| `test/director-ia-m4-clasificacion-query.test.js` | Tests focales |
| `scripts/test-director-ia-*.js` | Casos de regresión |
| `docs/dev-loop/CURRENT_TASK.md` | `status` |
| reporte | este archivo |

`server.js` no se tocó.

## Source / `buildClasificacionMatrix`

- SQL: `SELECT f.planta_id, f.categoria, f.importe, f.mes_cargo FROM public.folios f` no CANCELADO, `mes_cargo` A/B, `planta_id = ANY(grupo)`, `solo_zp_ad = false`.
- Helper reutilizado: `buildClasificacionMatrix`.
- No `buildClasificacionApoyosWorkbook`. No `resolvePlantasComparativo` (evita el fallback a 6 plantas).
- Grupo: `PLANTAS_COMPARATIVO.find` — si el id no está, fail-closed.

## mes_a / mes_b

Obligatorios, `YYYY-MM` (mes 01–12), A ≠ B. Sin defaults. Un solo mes o cero meses → 400 / clarificación. Orden = orden de mención (o `opts.mes_a` / `opts.mes_b`).

## Familias

GASTOS, INVERSIONES y TALLER salen en `comparisons[]` separados, más TOTAL. Shape de `buildClasificacionMatrix` preservado.

## Comparison semantics

Permitido: `valor_a`, `valor_b`, `delta = A − B`, «aumentó/disminuyó» factual, `%` solo si `valor_b !== 0`.

Base cero: `percent_change = null`; el texto dice que el porcentaje no es calculable.

Prohibido afirmar: causa, problema, mejora, cumplimiento, desviación presupuestal, responsable, prioridad.

## Plant scope / no fallback global

| Caso | Resultado |
|---|---|
| `planta_id` ausente | 400 |
| id fuera de `PLANTAS_COMPARATIVO` (p. ej. 7) | 400 `plant_not_in_comparativo`; **no** consulta las 6 |
| grupo incompleto vs `plantas_permitidas` | 403; no recorta en silencio |
| ZP sin lista | grupo canónico completo (p. ej. Acapulco 1,11,12) |
| Cross-planta | 403 |

## Authz

JWT/contexto; `requirePlantaId`; `assertFolioStatusAccess` (GV 403; GG/GA/AD + `plantas_permitidas`); intersección de grupo; privados excluidos (sin `priv_clave` de chat); fail-closed.

## Planner / tools / chat

- Intent específico `clasificacion_apoyos_query`. No reusa `expense_analysis` / `investment_analysis` / `taller_at`.
- Tool `get_clasificacion_apoyos_query`, `readOnly`, executor `loadClasificacionApoyosForChat`.
- `UNSUPPORTED_RULES` ya no corta la query; Excel / reconciliar / agregar-rechazar-inspeccionar siguen `SOURCE_NOT_INTEGRATED`.
- Chat: rama in-process **antes** de M6 y de OpenAI.

## COMPARAR / Excel / side effects

No `insertFolio`, no `UPDATE mes_cargo`, no POSTs COMPARAR, no workbook, no xlsx, no HTTP interno, no writes. `server.js` intacto.

## Tests

| Suite | Resultado |
|---|---|
| `node --test test/director-ia-m4-clasificacion-query.test.js` | **18/18** |
| `node scripts/test-director-ia-capabilities.js` | **42/42** |
| `node scripts/test-director-ia-planner.js` | **39/39** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **24/24** |
| `node --test test/director-ia-*.test.js` | **575/575** |
| `git diff --check` | limpio |

Focales: A vs B; ausente/inválido/iguales; tres familias; delta +/−; base cero; nulls; GA/GV/cross-planta; no fallback; intent/tool/chat; no COMPARAR/Excel/HTTP/writes.

## Estado M4 / porcentaje

| | Este IMPL | Futura sync documental |
|---|---|---|
| Runtime M4 | **PARTIAL** | documentar PARTIAL |
| Matriz `docs/director-ia/` | **sin cambio** (sigue NO INTEGRADA en papel) | NO INTEGRADA → PARTIAL |
| Global | **9.0 / 20 = 45.0%** (sin sync) | **9.5 / 20 = 47.5%** |
| COMPLETE | **no** | **no** (exige COMPARAR/Excel) |

## Gates

G2/G3/G8: N/A. G1 de esta tarea: heredado. G1 de la sync: humano, aparte.

## Acciones no realizadas

- No se tocó `docs/director-ia/**` ni la capability matrix documental.
- No frontend, SQL, migrations, schema, contratos HTTP.
- No COMPARAR, Excel, writes, commit, push, merge.
- No se autorizó ni ejecutó NEXT_TASK.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch implementation/director-ia-m4-clasificacion-query-001
 M docs/dev-loop/CURRENT_TASK.md
 M lib/director-ia-capabilities.js
 M lib/director-ia-chat.js
 M lib/director-ia-planner.js
 M lib/director-ia-tools.js
 M scripts/test-director-ia-capabilities.js
 M scripts/test-director-ia-planner.js
 M scripts/test-director-ia-tool-orchestrator.js
?? lib/director-ia-m4-clasificacion-query.js
?? test/director-ia-m4-clasificacion-query.test.js
?? docs/dev-loop/reports/IMPL-DIRECTOR-IA-M4-CLASIFICACION-QUERY-001.md
```

Solo archivos autorizados. `server.js` y `docs/director-ia/` no cambiaron.

## NEXT_TASK (no autorizada)

`DOCS-DIRECTOR-IA-M4-CAPABILITY-MATRIX-SYNC-001`

Debe documentar M4 PARTIAL y recalcular 9.0/20 → 9.5/20 = 47.5%. No marcar COMPLETE.

## STOP
