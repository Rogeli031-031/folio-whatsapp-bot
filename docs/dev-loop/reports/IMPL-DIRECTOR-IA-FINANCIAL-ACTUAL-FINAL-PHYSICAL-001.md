# Reporte — IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001

```yaml
task_id: "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
architecture: "A — fields on igf.versions"
first_slice: "B — schema + backend finalize/supersede + authz + PATCH guards"
runtime_exposure_financial_actual: false
month_close_integration: false
ies_integration: false
historical_ui: false
vba_changes: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Slice B no crea capability ACTUAL_FINANCIAL. 0.0 pp."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "sql/018_igf_financial_final.sql"
  - "lib/igf-financial-final.js"
  - "server.js"
  - "test/igf-financial-final.test.js"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "frontend-dashboard/"
  - "vba/"
  - "lib/director-ia-month-close-result.js"
  - "lib/director-ia-pre-meeting.js"
  - "lib/director-ia-igf-arr.js"
  - "package.json"
next_task_proposed: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-SYNC-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "Slice B no expone ACTUAL_FINANCIAL a Director IA."
  - "52.5% no cambia (0.0 pp)."
```

## Resultado

Slice **B** implementado. `igf.versions` tiene `FORECAST` / `FINAL` / `SUPERSEDED`. FINALIZE y SUPERSEDE son backend, ZP/AD only, transaccionales. PATCH HG sobre FINAL/SUPERSEDED = 409. GET IGF / ARR / month_close / pre_meeting / Director IA no se relabelan como actual.

## Ejecución

- Rama: `implementation/director-ia-financial-actual-final-physical-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-25`. En `AUTHORIZED` → `IN_PROGRESS` solo se cambió `status`.
- Sin commit, push, merge.

## Qué se implementó

### Schema (`sql/018_igf_financial_final.sql`)

Columnas en `igf.versions`: `financial_state` (NOT NULL DEFAULT `FORECAST`), `finalized_at`, `finalized_by`, `superseded_by_version_id`.

Constraints: estados permitidos; FORECAST sin provenance; FINAL con `finalized_at`/`finalized_by`; SUPERSEDED con link ≠ self; FK a `igf.versions(id)`.

Unique parcial: un FINAL GLOBAL por `(year, month)`.

Backfill: DEFAULT `FORECAST`. Cero inferencia histórica. Cero columnas en `compromiso_lines`. Cero `is_final` boolean.

`ensureSchema` aplica la migración de forma defensiva (si `igf.versions` no existe, el DO sale).

### Operaciones (`lib/igf-financial-final.js` + `server.js`)

| Ruta | Quién | Comportamiento |
|------|-------|----------------|
| `POST /api/dashboard/igf-forecast/finalize` | ZP (+ aliases) / AD | FORECAST → FINAL. `finalized_at = now()`, `finalized_by` del JWT. Si ya hay FINAL: 409 `require_supersede`. |
| `POST /api/dashboard/igf-forecast/supersede` | ZP / AD | Nueva FORECAST distinta → FINAL; FINAL previa → SUPERSEDED + link. Atómico. |
| `PATCH /api/dashboard/igf-forecast` | sin cambio de AUTHZ IGF | FORECAST: igual. FINAL/SUPERSEDED: 409. Único UPDATE de `compromiso_lines`. |

`finalized_by` = `usuario:{actor_id}|role:{ZP|AD}`. No se lee del body. Sin `actor_id`: 403.

GG y resto: 403. Reusa `isDirectorZPForDashboard`. No segundo sistema de authz.

No auto-final por fecha, mes transcurrido, ARR, `is_current` ni latest.

### No exposición

GET IGF intacto (PROY/cierre igual). No `ACTUAL_FINANCIAL` en payload. Sin loader, intent, IES, UI histórica, VBA.

## Tests

`test/igf-financial-final.test.js`: 15/15.

Regresión: IGF / ARR / month_close / pre_meeting 104/104. Suite `test/director-ia-*.test.js` **1005/1005**.

`git diff --check` limpio en los archivos del slice.

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.**

## NEXT_TASK (no autorizada, no ejecutada)

`DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-FINAL-PHYSICAL-SYNC-001`

STOP.
