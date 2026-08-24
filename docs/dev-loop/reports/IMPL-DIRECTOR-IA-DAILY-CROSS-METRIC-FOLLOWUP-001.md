# Reporte — IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001

```yaml
task_id: "IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
strategy: "B — contextual metric switch post-planner"
new_intent: false
phrasebook: false
previous_frame_used_for_switch: false
persistent_memory_used: false
destination: "chat legado (askDirectorIa + conversation_state + planner), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Cross-metric daily follow-up is not module coverage."
sql_017: "out_of_scope / not used"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001.md"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-chat.js"
  - "test/director-ia-daily-cross-metric-followup.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**Strategy B implementada.** Conservar fecha ≠ conservar métrica.

Tras un hilo diario con `active_date` válida, si el planner aislado es `unknown` y el turno nombra la **otra** métrica diaria con los tokens ya existentes (`venta`/`ventas`/`vendi*`, `descuento`/`descuentos`), el runtime cambia `inherit_parent_intent` / `forceIntent` al destino, conserva la fecha, hace requery del pack destino y reemplaza el gap.

No hay intent nuevo. No hay phrasebook. Sin `active_date` no se inventa ayer. «¿Y eso?» sigue heredando el parent. `previous_frame` no decide el switch; un standalone con `ayer` sigue capturando el marco (semántica intacta).

**NEXT_TASK** (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-daily-cross-metric-followup-001` (≠ `main`).
- HEAD base: `7bba5c6c Merge branch 'architecture/director-ia-daily-cross-metric-followup-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin contratos, SQL, matriz, commit, push, merge.

---

## Confirmaciones

| Requisito | Estado |
|-----------|--------|
| Strategy B | Sí. Post-planner. Planner aislado sigue exigiendo `ayer`. |
| sales → discount | «¿Cómo estuvo la venta ayer?» → «¿Y el descuento?» = `daily_discount_deviation` |
| discount → sales | «¿Por qué subió el descuento/kg ayer?» → «¿Y la venta?» = `daily_sales_deviation` |
| Date inheritance | Misma `active_date` (2026-08-19 en tests). `hoy` no reusa la fecha vieja. |
| No invented date | Sin hilo diario, «¿Y el descuento?» clarifica. Parent planta no abre pack diario. |
| Fresh target pack | Loader destino se llama; el de origen no se vuelve a cargar en el switch. |
| State transition | `parent_intent` y `last_evidence_bundle_type` = destino. |
| Gap replacement | `invalidate_gap` + `derivePendingInformationGap` del pack fresco. |
| Same metric | «¿Y eso?», «¿Qué más?», «¿Quién explica más?» heredan el parent. |
| previous_frame | Switch contextual conserva incoming. Standalone `ayer` sigue capturando. |
| No phrasebook | Hold-outs y «¿Y el descuento?» / «¿Y la venta?» no están en `lib/`. |
| 52.5% | 10.5 / 20. 0.0 pp. |

---

## Mecanismo

1. `namesDailySalesMetric` / `namesDailyDiscountMetric` extraen la semántica ya usada por `isDaily*` **sin** el gate `ayer`.
2. `resolveConversationTurn`: `unknown` + parent diario + `active_date` válida + métrica **distinta** + no mensual + no weekday → `cross_metric_switch`, `inherit_parent_intent` = destino, misma fecha.
3. Mensual (`mes` / `mensual`) bloquea inherit diario (no fuerza `active_date` de ayer).
4. Weekday de usuario clarifica; no adivina el lunes.
5. `askDirectorIa` ya hacía `forceIntent` del `inherit_parent_intent`: ahora apunta al destino.
6. `keepIncomingPreviousFrame` solo en switch contextual. Standalone «Ahora dime el descuento/kg ayer» sigue estacionando venta.

GPT recibe pack correcto + HILO. No repara routing.

---

## Conversaciones de producto

1. Venta ayer → ¿Y el descuento? → quién lo movió → tenemos explicación. Pack discount; follow-ups heredan discount.
2. Descuento/kg ayer → ¿Y la venta? → quién explica más. Pack sales; misma fecha.
3. Venta ayer → ¿Y eso? → ¿Qué más? Siguen en sales.
4. ¿Y el descuento? sin estado. Clarifica. Cero loaders diarios.
5. Venta ayer → ¿Y el descuento este mes? No abre discount diario.
6. Venta (con prior planta+Arturo) → ¿Y el descuento? conserva previous planta → Volvamos a Arturo restaura planta.

Hold-outs en tests: «¿Qué pasó con el descuento?», «¿Y en descuento cómo quedó?», «¿Qué tal las ventas?», «¿Cómo salió la venta?», «¿Y el descuento por kilo?».

---

## Tests

| Suite | Resultado |
|-------|-----------|
| Focal `test/director-ia-daily-cross-metric-followup.test.js` | **17/17** |
| Topic return | **19/19** |
| Daily sales | pass |
| Daily discount | pass |
| Action-person | pass |
| Natural followup | pass |
| Persistent memory | pass |
| `node scripts/test-director-ia-planner.js` | **58/58** |
| `node scripts/test-director-ia-capabilities.js` | **56/56** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **28/28** |
| `node --test test/director-ia-*.test.js` | **871/871** |
| `git diff --check` | clean |

---

## Límites (READY_WITH_LIMITS, no reabiertos)

- Weekday de usuario no se parsea. Clarifica.
- Path mensual de «descuento este mes» no se construye; solo se impide el switch diario.
- No hay tercera métrica diaria (margen).
- Inventario `docs/director-ia/` no se toca (sync documental es la NEXT_TASK).

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`DOCS-DIRECTOR-IA-DAILY-CROSS-METRIC-FOLLOWUP-SYNC-001`

STOP.
