# Reporte — IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001

```yaml
task_id: "IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001"
outcome: "DONE_PENDING_REVIEW"
module: "M18 — Presupuestos semanales"
slice: "query JSON read-only del carro semanal"
m18_state_after_impl: "PARTIAL (código); matriz documental aún NO INTEGRADA hasta sync"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001.md"
  - "lib/director-ia-m18-presupuesto-semanal.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
  - "test/director-ia-m18-presupuesto-semanal.test.js"
  - "test/director-ia-duplicados.test.js"
  - "test/director-ia-m2-history.test.js"
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
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-READINESS-001.md"
  - "server.js getPresupuestoResumen / getCurrentWeekMexico (lectura)"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "Se actualizaron test/director-ia-duplicados.test.js y test/director-ia-m2-history.test.js (no listados en writable) porque afirmaban que M18 seguía SOURCE_NOT_INTEGRATED; sin eso la suite requerida fallaba."
next_task_proposed: "DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001 (propuesta; no autoriza G1 ni encadena)"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8: N/A."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "Esta tarea no cambia la matriz documental ni el 47.5% publicado."
  - "La sync futura debe llevar M18 NO INTEGRADA → PARTIAL y 9.5/20 → 10.0/20 = 50.0%."
```

## Resumen ejecutivo

Director IA consulta in-process el **carro presupuestal semanal** de una planta: asignado, seleccionado, disponible, folios (`folio_id` incluido) y urgentes. Path:

```text
budget_status
  → get_budget_status
  → loadPresupuestoSemanalForChat
  → SELECT presupuestos_semanales + presupuesto_folios
  → computeResumen (mismas fórmulas que getPresupuestoResumen)
  → evidencia / respuesta
```

**Semana no inventada.** `getCurrentWeekMexico()` solo si «esta semana», «semana actual», «mi presupuesto» o pregunta #17 (`presupuesto semanal`). Si no hay fecha ni trigger: clarificar.

**No se filtra solo ABIERTO.** Un carro `EN_PROCESO_CHEQUE` / `CERRADO` sigue consultable.

Fórmulas físicas preservadas. **No** `presupuesto_asignacion_detalle`. **No** cheques, Twilio, WhatsApp, HTTP interno ni writes.

M18 en código = **PARTIAL**. **No COMPLETE.** Matriz documental **no** cambia en esta tarea. Futura sync: **10.0 / 20 = 50.0%**.

Tests: focal 24/24; capabilities 46; planner 40; orchestrator 24; suite **599/599**.

NEXT_TASK (no autorizada): `DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-m18-presupuesto-semanal-001` (≠ `main`).
- HEAD: `345526c1 Merge branch 'architecture/director-ia-m18-presupuesto-semanal-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-23`. Solo se cambió `status`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge, matriz, contratos, frontend, SQL.

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `lib/director-ia-m18-presupuesto-semanal.js` | Loader + fórmulas + semana + chat result |
| `lib/director-ia-capabilities.js` | `presupuestos` readable/partial; query permitida; writes bloqueados |
| `lib/director-ia-tools.js` | `get_budget_status` on-demand + executor |
| `lib/director-ia-planner.js` | `mi presupuesto` → `budget_status` |
| `lib/director-ia-chat.js` | Rama in-process `budget_status` |
| `test/director-ia-m18-presupuesto-semanal.test.js` | Tests focales |
| scripts de capabilities/planner/orchestrator | Query permitida; tool ejecutable |
| `test/director-ia-m2-history.test.js` | Cheque sigue bloqueado; query M18 ya no |
| `test/director-ia-duplicados.test.js` | Boundary de no-integrado pasa a Taller AT |

`server.js` **no** se tocó. El SELECT se extrajo al lib (equivalente a `getPresupuestoResumen`).

---

## getPresupuestoResumen / fórmulas

| Campo | Fórmula física (igual que `server.js` ~2953) |
|---|---|
| asignado | `Number(presupuestos_semanales.monto_asignado) \|\| 0` |
| seleccionado | `SUM(presupuesto_folios.importe)` (`Number(importe) \|\| 0`) |
| disponible | `Math.max(0, asignado - seleccionado)` |
| urgentes | `prioridad` coincide `/urgente/i` |
| semana | `semana_inicio` + `semana_fin` |

Lookup: `WHERE planta_id AND semana_inicio AND semana_fin` — **sin** `estatus = ABIERTO`.

---

## Semana

| Entrada | Resolución |
|---|---|
| `YYYY-MM-DD` o `DD/MM/AAAA` | Semana lunes–domingo que contiene esa fecha (`weekContainingUtcDate`, misma regla UTC que `getCurrentWeekMexico`) |
| Par de fechas | inicio/fin explícitos |
| «esta semana» / «semana actual» / «mi presupuesto» / «presupuesto semanal» | `getCurrentWeekMexico()` |
| Nada de lo anterior | `missing_week` — clarificar. **No** default silencioso |
| Fecha inválida | `invalid_week` |
| Sin fila | `found: false` / `DATA_NOT_FOUND`. No INSERT |

---

## Authz / planta

Reutiliza `assertFolioStatusAccess` + `requirePlantaId`: JWT/contexto, `planta_id` obligatorio, `plantas_permitidas`, GV 403, GA solo en planta autorizada, cross-planta 403, fail-closed.

---

## Planner / tools / chat

- Intent `budget_status` (incluye `mi presupuesto`).
- Tool `get_budget_status`: `available_on_demand`, `executor: loadPresupuestoSemanalForChat`, `readOnly: true`.
- Capability `presupuestos`: `canRead: true`, `canWrite: false`, coverage partial.
- Chat: rama in-process; `openai_called: false`.
- Writes siguen bloqueados: asignar, seleccionar/quitar folios del carro, enviar a cheques, notificar.
- Cheques/pólizas siguen `SOURCE_NOT_INTEGRATED`.

Respuesta: semana, estatus, asignado, seleccionado, disponible, folios/importes/prioridad/urgente. **No** afirma pagado, cheque emitido, aprobado, causa ni desviación.

---

## Boundaries

| Boundary | Confirmado |
|---|---|
| Semana no inventada | sí |
| No filtro solo ABIERTO | sí |
| Fórmulas físicas | sí |
| No `presupuesto_asignacion_detalle` | sí (ni FROM) |
| No cheques | sí |
| No Twilio | sí |
| No WhatsApp | sí |
| No HTTP interno | sí |
| No writes | sí |
| M18 PARTIAL | sí (no COMPLETE) |
| Futura sync = 50.0% | sí |

---

## Tests

| Suite | Resultado |
|---|---|
| `node --test test/director-ia-m18-presupuesto-semanal.test.js` | **24/24** |
| `node scripts/test-director-ia-capabilities.js` | **46/46** |
| `node scripts/test-director-ia-planner.js` | **40/40** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **24/24** |
| `node --test test/director-ia-*.test.js` | **599/599** |
| `git diff --check` | limpio |

---

## Estado M18 / porcentaje

| | Esta tarea | Tras sync documental futura |
|---|---|---|
| Código M18 | query integrada (PARTIAL) | — |
| Matriz `docs/director-ia/` | **sin cambio** (sigue NO INTEGRADA en documento) | **PARTIAL** |
| Global publicado | **9.5 / 20 = 47.5%** | **10.0 / 20 = 50.0%** |

COMPLETE sigue exigiendo writes / cheques / operación bot / WhatsApp.

---

## Acciones no realizadas

- No se modificó `docs/director-ia/**` ni la capability matrix documental.
- No frontend, SQL, migrations, schema, contratos.
- No cheques, Twilio, WhatsApp, writes, HTTP interno.
- No commit / push / merge.
- No se autorizó ni ejecutó la NEXT_TASK.

## Gates

G1 autorizado. G2/G3/G8 N/A.

## secrets_check

none

## git diff --check

limpio (exit 0)

## git status

Al cierre (sin commit):

```text
On branch implementation/director-ia-m18-presupuesto-semanal-001
 M docs/dev-loop/CURRENT_TASK.md
 M lib/director-ia-capabilities.js
 M lib/director-ia-chat.js
 M lib/director-ia-planner.js
 M lib/director-ia-tools.js
 M scripts/test-director-ia-capabilities.js
 M scripts/test-director-ia-planner.js
 M scripts/test-director-ia-tool-orchestrator.js
 M test/director-ia-duplicados.test.js
 M test/director-ia-m2-history.test.js
?? lib/director-ia-m18-presupuesto-semanal.js
?? test/director-ia-m18-presupuesto-semanal.test.js
?? docs/dev-loop/reports/IMPL-DIRECTOR-IA-M18-PRESUPUESTO-SEMANAL-001.md
```

## NEXT_TASK propuesta (no autorizada)

`DOCS-DIRECTOR-IA-M18-CAPABILITY-MATRIX-SYNC-001`

Debe cambiar M18 de NO INTEGRADA a PARTIAL y recalcular 9.5/20 → 10.0/20 = 50.0%. No marcar COMPLETE.

## STOP
