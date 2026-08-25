# Reporte — IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001

```yaml
task_id: "IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
architecture: "B — structured month-close read model"
first_slice: "C — month-close core"
canonical_intent: "month_close_result"
phrasebook: false
plaud_runtime: false
internal_http: false
snapshot_persisted: false
destination: "chat legado (askDirectorIa + planner + tools + conversation_state); NO Motor N1–N5; NO IES; NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g5: "pending HUMAN_APPROVER"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "First slice C compone loaders existentes; no COMPLETE. 0.0 pp."
sql_execution: "out_of_scope / not used"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001.md"
  - "lib/director-ia-month-close-result.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-pre-meeting.js"
  - "lib/director-ia-igf-arr.js"
  - "test/director-ia-month-close-result.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
  - "contracts"
  - "matrix"
  - "Plaud"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-SYNC-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**Arquitectura B + first slice C implementados.** `month_close_result` es el read model mensual ejecutivo de **una planta** y **un mes calendario CDMX**. Compone loaders existentes. No rediseña.

Cuatro clases permanecen separadas:

| Clase | Fuente | Rol |
|-------|--------|-----|
| ACTUAL | `arr.ventas_diarias_cliente` / descuentos diarios | venta, mix CASA/COMISIONISTA, descuento/kg ponderado, new/lost/movers |
| TARGET_COMMITMENT | `igf_meta.versions` + `igf_meta.meta_lines` | compromiso gerencial del mes (`venta_ton`) |
| FORECAST | `igf.compromiso_lines` | proyección; nunca cumplimiento real |
| DERIVED_MODEL | no usado | no se usa como meta ni actual |

`igf_meta` = TARGET / COMMITMENT. No es forecast. No es actual. No es derived.

Si falta target exacto (`year` + `month` + `is_current=true` + empresa de la planta autorizada): `TARGET_MISSING_FOR_PERIOD`. Sin carry-forward, sin última meta de otro mes, sin forecast como meta, sin mes anterior, sin Plaud, sin hardcode.

`financial.actual` = `UNSUPPORTED_METRIC`. Se puede etiquetar TARGET vs FORECAST como proyección. No se afirma cumplimiento financiero real.

GPT recibe el read model estructurado y sintetiza destacados, tensiones, qué necesita explicación y limitations. No inventa target, actual financiero ni causa.

State = routing only (planta, mes, parent_intent, entidad activa solo para handoff). Evidence = requery.

**NEXT_TASK** (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-pre-meeting-month-close-result-001` (≠ `main`).
- HEAD base: `9de12e2b Merge branch 'implementation/director-ia-pre-meeting-month-close-result-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin contratos, schema, SQL, matriz, commit, push, merge.

---

## Confirmaciones

| Requisito | Estado |
|-----------|--------|
| Arquitectura B | Sí. Structured month-close read model. |
| First slice C | month-close core: venta + target + mix + descuento + clientes + financial target/forecast + acciones + gaps. |
| Intent canónico | `month_close_result`. Nuevo. No sobrecarga IGF, commercial_trend, plant_diagnosis ni pre_meeting_brief. |
| Una planta | `assertClientProfileAccess`. Fail closed. Mapping empresa no salta authz. |
| Mes calendario CDMX | Default = último COMPLETE. Mes actual nombrado = PARTIAL. No 30/90 trailing. |
| Target exacto YYYY-MM | `listMetaVersions` del mes pedido. Solo `is_current=true`. |
| TARGET_MISSING_FOR_PERIOD | Sin current / sin fila / error de fuente. No leak de otro mes. |
| Target = 0 | No divide. Limitation `target_zero_no_attainment`. |
| Venta actual | `SUM(kg)` / 1000. Mes calendario. |
| Mix | `classifyCanalGrp` existente (`%comisionista%` → COMISIONISTA, resto CASA). |
| Descuento | `SUM(monto)/SUM(kg)`. No average-of-averages. |
| Clientes | mes pedido vs mes calendario previo. new / lost / top movers. `cliente_key`. No fuzzy. No join por nombre. mover ≠ causa. |
| financial.actual | `UNSUPPORTED_METRIC`. Gap `FINANCIAL_ACTUAL_UNSUPPORTED`. |
| Partial data | IGF/actions/target missing no tumban venta/descuento. |
| Pre-meeting handoff | “¿Y cómo cerramos el mes?” → `month_close_result` + requery. No reusa el mes abierto del brief. |
| Follow-ups | meta / CASA / descuento / clientes perdidos heredan. “Háblame del cliente X” → `client_profile` si hay entidad. |
| No phrasebook | Frases canónicas no están en `lib/`. |
| Read-only | `writes=false`. Tool `readOnly`. No schema, no upload, no Plaud. |
| 52.5% | 10.5 / 20. 0.0 pp. |
| `git diff --check` | se reporta al cierre. |

---

## Mecanismo

1. `isMonthCloseQuestion` (cierre / meta / porcentaje+cumplir). Daily, trend, profile, Taller Mayor, reviewable y cues de preparación ganan. “cómo quedó” solo no es month-close standalone (protege cross-metric diario a descuento).
2. Planner: `month_close_result` **después** de `client_profile` y **antes** de `pre_meeting_brief`.
3. `loadMonthCloseResultForChat`: authz → mes → ARR mensual + mes previo → `igf_meta` del YYYY-MM exacto → IGF forecast del mismo mes → acciones existentes. Isolation por `safeLoad`.
4. `INHERITABLE_INTENTS` + `isMonthCloseFollowUp`. Handoff `pre_meeting_brief` → `month_close_result`. Handoff a `client_profile` solo con entidad activa (no “Háblame del primero” en el mismo turno).
5. Chat in-process: una llamada OpenAI. State sin pack. `reuse_inherited_month` solo si el parent ya era `month_close_result`.
6. Tool `get_month_close_result` read-only, dominio `arr`.
7. `isPreMeetingFollowUp` cede si `isMonthCloseQuestion`.

---

## Tests

| Suite | Resultado |
|-------|-----------|
| Focal `test/director-ia-month-close-result.test.js` | **27/27** |
| `node --test test/director-ia-*.test.js` | **1005/1005** |
| `node scripts/test-director-ia-planner.js` | **58/58** |
| `node scripts/test-director-ia-capabilities.js` | **56/56** |
| `node scripts/test-director-ia-tool-orchestrator.js` | **28/28** |
| `git diff --check` | se ejecuta al cierre |

Focales cubren: target YYYY-MM exacto, `is_current`, target missing, no prior-month leakage, target zero, actual mensual, CASA/COMISIONISTA, descuento ponderado, new/lost/movers, truth separation, `financial.actual` unsupported, partial data, pre-meeting handoff, follow-up de meta, follow-up de canal, client handoff.

Regresiones cubiertas por la suite: daily brief, daily sales, daily discount, commercial trend, client profile, IGF reviewable, Taller Mayor, pre-meeting, topic return, persistent memory.

---

## Límites (no reabiertos)

- `financial.actual` permanece unsupported. No se creó fuente.
- `igf_metahg` no sustituye `igf_meta.venta_ton` en first slice C.
- Plaud / matrix / schema / upload de meta: fuera de scope.
- Inventario `docs/director-ia/` no se toca (sync documental es la NEXT_TASK).

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`DOCS-DIRECTOR-IA-PRE-MEETING-MONTH-CLOSE-RESULT-SYNC-001`

STOP.
