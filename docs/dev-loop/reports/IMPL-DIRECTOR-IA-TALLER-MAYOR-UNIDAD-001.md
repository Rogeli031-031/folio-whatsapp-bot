# Reporte — IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001

```yaml
task_id: "IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
source_strategy: "B — reusable Taller Mayor unit read model"
routing_strategy: "B — canonical taller_mayor parent"
new_intent: "taller_mayor"
phrasebook: false
second_llm_router: false
persistence: false
internal_http: false
unit_identity: "planta_id + canonical public.folios.unidad token"
unit_is_economico: false
unit_is_placa: false
unit_master: false
classification: "matchTallerTipoCol(subcategoria)===mayor"
period: "este mes = current YYYY-MM America/Mexico_City against mes_cargo"
highest_amount: "unit with max SUM(importe); no silent folio pick"
reviewability: "classifyCancellationEligibility on active_folio; no plant-wide hop"
destination: "chat legado (planner + conversation_state + in-process loader); NO Motor N1–N5; NO IES; NO Reasoning Engine; NO persistencia; NO schema; NO SQL de producto"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Taller Mayor unit read model is not module coverage. M5 remains PARTIAL."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001.md"
  - "lib/director-ia-taller-mayor.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-capabilities.js"
  - "test/director-ia-taller-mayor.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
  - "capability matrix rows (no new CAPABILITIES entry; no coverage change)"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**SOURCE B + ROUTING B implementados.**

Hay un read model reutilizable en `lib/director-ia-taller-mayor.js`. Reusa `queryTallerFolios` / `expandTallerRows` / `matchTallerTipoCol` / `unidad-taller` / `classifyCancellationEligibility`. Agrupa por `(planta_id, token canónico)`.

Intent padre: `taller_mayor`. Periodo, unidad y Folio son slots. Requery cada turno.

Si la unidad ganadora tiene N>1 Folios: `active_unit` sí, `active_folio` no. «¿Todavía se puede detener?» con Folio activo **no** salta a IGF reviewable de planta.

**NEXT_TASK** (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001`.

---

## Ejecución

- Rama: `architecture/director-ia-taller-mayor-unidad-001` (≠ `main`).
- HEAD base: `eee0a4db Merge branch 'audit/director-ia-production-conversation-gap-011'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin contratos, schema, SQL de producto, matriz, persistencia, commit, push, merge.

---

## Qué se implementó

| Pieza | Hecho |
|-------|--------|
| Identidad | `(planta_id, canonical token de public.folios.unidad)`. No económico. No placa. No fuzzy. No merge cross-plant. |
| Clasificación | `matchTallerTipoCol` → `mayor`. No por importe ni concepto. CANCELADO fuera (SELECT M5). |
| Periodo | «este mes» = YYYY-MM actual CDMX contra `mes_cargo`. «Mes pasado» no se inventa. |
| Lista | Por unidad: token, planta, periodo, folio_count, SUM(importe), refs, importes, estatus, concepto, subcategoria, reviewability, provenance, limitations. missing ≠ 0. |
| Ranking | Unidad con mayor SUM(importe). Empate → clarificar. |
| State | `parent_intent=taller_mayor`, planta, `active_period_months`, `active_unit` (kind `unit`), `active_folio` (kind `folio`) solo si único/explícito. |
| Reviewability | `classifyCancellationEligibility` del Folio activo. Read-only. |
| Historial | Misma planta + mismo token. Default Taller Mayor + periodo del hilo. Amplía solo si el usuario lo pide. |
| IGF hipotético | Conserva Folio/unidad. Overlay filtrado si hay base física; si no, limitation. No candidatos de planta. No savings. |
| GPT | Sintetiza. No decide identidad, folio, clasificación, importe, estatus, periodo, reviewability ni autorización. |
| Capabilities | `isTallerMayorQuery` deja pasar el padre nuevo. No se añadió fila a la matriz. |

---

## Tests

| Suite | Resultado |
|-------|-----------|
| `test/director-ia-taller-mayor.test.js` | 17/17 |
| planner / capabilities / orchestrator (vía suite) | green |
| `node --test test/director-ia-*.test.js` | **964/964** |
| `git diff --check` | clean |

Regresiones cubiertas: `folio_status`, `taller_at`, IGF reviewable plant-wide, `client_profile`, `commercial_trend`, brief, daily sales/discount, topic return, persistent memory.

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.** No es cobertura de módulo. M5 **sigue PARTIAL**.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001`

STOP.
