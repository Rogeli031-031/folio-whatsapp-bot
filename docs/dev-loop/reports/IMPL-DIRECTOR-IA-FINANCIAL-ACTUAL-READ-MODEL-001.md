# Reporte — IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001

```yaml
task_id: "IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
architecture_source: "ARCH-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
source_architecture: "B"
composition_architecture: "B"
canonical_intent: "month_close_result"
first_slice: "B"
runtime_exposure_financial_actual: "month_close_result only, FINAL periods"
pre_meeting_integration: false
ies_integration: false
historical_ui: false
new_intent: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "lib/director-ia-financial-actual.js"
  - "lib/director-ia-month-close-result.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-tools.js"
  - "test/director-ia-financial-actual.test.js"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "sql/"
  - "frontend-dashboard/"
  - "vba/"
  - "lib/director-ia-pre-meeting.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/igf-financial-final.js"
  - "server.js"
next_task_proposed: "AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "ACTUAL_FINANCIAL queda SUPPORTED solo en month_close_result y solo con versión FINAL."
  - "No hay soporte en pre_meeting ni IES."
  - "52.5% no cambia (0.0 pp)."
```

## Resultado

First slice **B** implementado. Loader crudo compartido + `financial.actual` en `month_close_result` + VIEW AUTHZ + reconciliación ARR. Sin intent nuevo. Sin pre_meeting. Sin IES. Sin HTTP interno.

## Ejecución

- Rama: `implementation/director-ia-financial-actual-read-model-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-25`. En `AUTHORIZED` → `IN_PROGRESS` solo se cambió `status`.
- Sin commit, push, merge.

## Loader

`lib/director-ia-financial-actual.js` lee `igf.versions` + `igf.compromiso_lines` in-process.

Selección: `plant_code='GLOBAL'` + year + month. FINAL se filtra en memoria. Una fila FINAL = SUPPORTED. Cero versions = `FINANCIAL_ACTUAL_MISSING_FOR_PERIOD`. Versions sin FINAL = `FINANCIAL_ACTUAL_NOT_FINAL`. Más de una FINAL = `FINANCIAL_ACTUAL_VERSION_AMBIGUOUS`. Error técnico = `FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE`. Authz fail closed antes de SQL = `FINANCIAL_ACTUAL_UNAUTHORIZED`. Sin fila empresa = `FINANCIAL_ACTUAL_LINE_NOT_FOUND_FOR_PLANT`.

Prohibido en el loader: GET `/api/dashboard/igf-forecast`, `ORDER BY version_number`, `MAX(version_number)`, `is_current`, `recalcularUtilYResultado`.

Plant mapping: `findIgfRowForPlant` existente. Versión sigue GLOBAL.

## Campos crudos

Los 17 stored de VBA, `field_origin=FINANCE_PROVIDED`:

`venta_ton`, `margen_kg`, `com_desc_kg`, `gasto_kg`, `impuesto_kg`, `hg_pct`, `hg_kg`, `bancos_planta_kg`, `provision_planta_kg`, `util_oper_kg`, `util_oper_importe`, `gtos_apoyos_corp_kg`, `bancos_corp_kg`, `otros_programas_kg`, `inversiones_kg`, `resultado_final_kg`, `resultado_final_importe`.

Excluidos: `presupuesto_kg`, `folios_*`, `deposito_cierre_kg`, overlays GET.

## Provenance

`truth_class=ACTUAL_FINANCIAL`, `source_owner=FINANZAS`, year, month, `version_id`, `version_number`, `FINAL`, `finalized_at`, `finalized_by`, empresa, plant, field origin, persistencia `igf.versions`+`igf.compromiso_lines`. `created_at` = upload timestamp (`created_at_role=upload_timestamp`), no as-of de negocio.

## AUTHZ VIEW

Backend, no forecast, no frontend, no conversation:

| Actor | Alcance |
|-------|---------|
| ZP + aliases (`isDirectorZPForDashboard`) | ALL_PLANTS |
| AD | ALL_PLANTS |
| GG | ASSIGNED_PLANTS |
| resto (GA, GV, CF_CDMX, …) | DENY |

Una fuente financiera denegada no tumba el pack comercial: `financial.actual` lleva el código y ARR/target/forecast siguen.

## Composición month_close

`month_close_result` sigue canónico.

- `financial.actual` = loader FINAL
- `financial.target` = `igf_meta` existente
- `financial.forecast` = IGF latest existente (`loadIgfCommitSnapshot`)

NOT_FINAL no copia forecast. Missing no emite 0. Target o forecast ausente: actual se conserva + limitation.

Si no hay resultado de loader (assemble legado): `UNSUPPORTED_METRIC` (comportamiento previo).

## Reconciliación

En composición, no en el loader. `venta_ton` stored vs ARR `actual_ton`. Sin tolerancia. Distintos → `FINANCIAL_ACTUAL_RECONCILIATION_GAP` con ambos valores y ambas clases. Sin overwrite.

## Routing

Sin intent `financial_actual`. Cues semánticos en `isMonthCloseQuestion` / `isMonthCloseQuery`: utilidad operativa / resultado final / cierre financiero + real o mes; forecast vs cierre. Planner no se tocó (ya consume `isMonthCloseQuestion`).

IGF abierto se preserva: `cómo va IGF` y `cómo proyectamos cerrar el IGF este mes` → `igf_status`.

WHY: gap ≠ causa (addendum + gaps existentes).

## Limitations

- Solo month_close. pre_meeting e IES no consumen el loader.
- Sin selector histórico UI; el backend acepta YYYY-MM explícito.
- GET latest IGF no cambia.
- Matcher de planta = `findIgfRowForPlant` canónico.
- Capability de inventario / matriz no se actualiza aquí (52.5% intacto).
- Schema 018/019 ausente → `SOURCE_UNAVAILABLE`.

## Tests

Focales: `test/director-ia-financial-actual.test.js` + `test/director-ia-month-close-result.test.js` — 45 pass.

Suite Director IA + `test/igf-financial-final.test.js`: **1051 pass / 0 fail**.

Cubre loader FINAL/latest ignorado/NOT_FINAL/MISSING/AMBIGUOUS/SUPERSEDED/17 campos/provenance; AUTHZ ZP/aliases/AD/GG/resto; composición y gap ARR; routing de cierre real vs IGF abierto; regresión daily brief, trend, client profile, IGF, Taller Mayor, pre_meeting, month_close comercial, topic return, persistent memory.

## Porcentaje

10.5 / 20 = **52.5%**. Delta **0.0 pp.** Este IMPL no reescribe la matriz.

## NEXT_TASK

`AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001`

No autorizada. No ejecutada.

STOP.
