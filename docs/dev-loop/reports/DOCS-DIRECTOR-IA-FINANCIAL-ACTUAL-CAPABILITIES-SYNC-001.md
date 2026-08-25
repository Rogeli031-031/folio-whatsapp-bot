# Reporte — DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-CAPABILITIES-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-CAPABILITIES-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
mode: "G2_CAPABILITIES_SOURCES_SYNC_ONLY"
implementation: false
runtime_changes: false
schema_changes: false
sql_execution: false
test_changes: false
authz_changes: false
g3_modified: false
index_modified: false
eke_modified: false
matrix_changed: false
g2_documental_sync: "G2_DOCUMENTAL_SYNC_COMPLETE"
authz: "AUTHZ_DECISION_REQUIRED"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This docs task does not measure modules. 0.0 pp."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-CAPABILITIES-SYNC-001.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "lib/"
  - "test/"
  - "sql/"
contracts_modified:
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "AUTHZ_DECISION_REQUIRED sigue bloqueando exposición runtime de P&L actual."
  - "52.5% no cambia (0.0 pp)."
```

## Resultado

`DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` inventaría ACTUAL_FINANCIAL como fuente física + contrato G3 v1.0. **No** afirma capability runtime.

**G2_DOCUMENTAL_SYNC_COMPLETE.**

## Ejecución

- Rama: `docs/director-ia-financial-actual-capabilities-sync-001` (≠ `main`).
- HEAD: `d4f84a39 Merge branch 'docs/director-ia-financial-actual-eke-sync-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-25`. Solo se cambió `status` en CURRENT_TASK.

## Distinción aplicada

SOURCE EXISTS ≠ CAPABILITY EXISTS. CONTRACT EXISTS ≠ RUNTIME EXISTS.

| Hecho | Estado |
|-------|--------|
| Owner | FINANZAS |
| Persistencia | `igf.versions` + `igf.compromiso_lines` |
| Contrato | `FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md` v1.0 |
| Evidence semantics | DEFINED |
| Finalización física | PENDING |
| Director IA runtime | PENDING / NOT_YET_SUPPORTED |
| IES | PENDING |
| AUTHZ | AUTHZ_DECISION_REQUIRED |

## Sync mínimo

| Sitio | Cambio |
|-------|--------|
| `month_close_result` (Parte 1) | Cinco clases. ACTUAL_FINANCIAL = FINANCE_PROVIDED FINAL; runtime NOT_YET_SUPPORTED. `financial.actual` sigue `UNSUPPORTED_METRIC`. Gaps: `FINANCIAL_ACTUAL_UNSUPPORTED` + `FINANCIAL_ACTUAL_RECONCILIATION_GAP` reservado. AUTHZ_DECISION_REQUIRED. |
| Fuente ARR / IGF | ARR = ACTUAL_COMMERCIAL. IGF latest/`is_current` ≠ FINAL. Persistencia compartida ≠ capability. |
| Fuente: Resultado mensual de cierre | Mismas cinco clases. Runtime de P&L **no** afirmado. |
| Fuente: ACTUAL_FINANCIAL (semántica; no capability) | Bloque de inventario. Fuente/contrato sí; loader/tool/intent/`is_final`/IES/AUTHZ resuelto **no**. |
| Scoring / no integrados / §7 | 52.5% intacto. Runtime de actual financiero sigue diferido. Fila §7: falta marker/loader/intent/AUTHZ/IES. |
| Parte 2 / Parte 5 | **Sin cambio.** |

## Clases conservadas

ACTUAL_COMMERCIAL = ARR. TARGET_COMMITMENT = `igf_meta`. FORECAST = IGF. ACTUAL_FINANCIAL = FINANCE_PROVIDED de versión FINAL autoritaria. DERIVED_MODEL = modelos derivados.

FINANCE_PROVIDED ≠ RUNTIME_COMPUTED. FINAL no convierte cálculo runtime en dato de Finanzas. `is_current` ≠ FINAL. latest ≠ FINAL. mes cerrado ≠ FINAL. ARR completo ≠ FINAL. missing ≠ 0 ≠ forecast ≠ target.

## No afirmado

- capability runtime `financial_actual`
- query P&L actual
- `is_final` / marker FINAL físico / workflow de finalización
- loader / tool / planner intent
- consumo IES
- AUTHZ resuelto
- herencia de `acceso_igf_forecast_kpis`

## No hecho

Index, EKE, G3, Constitución, `04`, `05`, matriz, código, tests, SQL, schema, VBA, runtime, permisos, commit, push, merge.

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.**

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`DECISION-DIRECTOR-IA-FINANCIAL-ACTUAL-AUTHZ-001`

STOP.
