# Reporte — FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001

```yaml
task_id: "FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
audit_source: "AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
redesign: false
ies_integration: false
pre_meeting_integration: false
new_intent: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
files_changed_by_fix:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "lib/director-ia-month-close-result.js"
  - "lib/director-ia-capabilities.js"
  - "test/director-ia-financial-actual.test.js"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001.md"
preserved:
  - "lib/director-ia-financial-actual.js"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001.md"
next_task_proposed: "REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## Summary

FIX quirúrgico del canal GPT y de tres huecos de test/routing. No se rediseñó el loader FINAL ni AUTHZ. ACTUAL_FINANCIAL sigue solo en `month_close_result`.

## Files

| Árbol | Archivos |
|-------|----------|
| FIX | month-close context/routing, capabilities cue, tests FIX, este reporte, CURRENT_TASK |
| IMPL preexistente | loader, tools, month-close compose/authz, IMPL report |
| AUDIT preexistente | reporte AUDIT |

## MAJOR closure — context projection

`formatFinancialActualContext` + `formatMonthCloseContext`:

Cuando `SUPPORTED` + `ACTUAL_FINANCIAL` proyecta bloque:

- truth_class, field_origin=FINANCE_PROVIDED, source_owner=FINANZAS, financial_state=FINAL
- year, month, version_id, version_number, finalized_at/by, empresa, plant
- created_at solo como `role=upload_timestamp`
- los 17 stored; `null` se escribe `null` (no 0)
- si hay gap: Finance venta_ton, ARR venta_ton, `FINANCIAL_ACTUAL_RECONCILIATION_GAP`, instrucción de no elegir ganador

Si NOT_FINAL / MISSING / UNAUTHORIZED / demás: status explícito, **sin** `fields.*`. NOT_FINAL conserva `financial.forecast=FORECAST`.

Target/forecast venta se etiquetan aparte (`TARGET_COMMITMENT` / `FORECAST`). ARR queda `ACTUAL_COMMERCIAL`.

`context_meta.month_close.financial_actual` ahora lleva el pack.

## Routing

`utilidad` + `real` → `month_close_result` (mismo patrón, no phrasebook, no intent nuevo).

Preservado: `cómo va IGF` → `igf_status`; `cómo vamos este mes` no es month_close.

## Tests

| Caso | Evidencia |
|------|-----------|
| Sentinels 987.654 / 7.321 / 123456.78 / -45678.9 | formatMonthCloseContext |
| A/B/C 987.654 vs 555.111 vs 333.222 | mismos valores, clases distintas |
| Gap 7.2 vs 10 | ambos + código |
| NOT_FINAL / MISSING | sin fields de actual |
| SUPERSEDED v5 + FINAL v6 | version_id 6 |
| Puebla vs Querétaro + GG | isolate + UNAUTHORIZED |
| julio vs now agosto | loadFinancialActual `2026-7` |

Focal FIX + month_close: **50 pass / 0 fail**.  
Director IA + finalización: **1056 pass / 0 fail / 0 skipped**.

## Findings closure

| FINDING | SEVERITY | FIX | TEST | STATUS |
|---------|----------|-----|------|--------|
| GPT context missing actual values | MAJOR | `formatFinancialActualContext` | sentinels + A/B/C + gap + failure ctx | **CLOSED** |
| “utilidad real” routing | MINOR | `utilidad` + `real` | pregunta sin “operativa” | **CLOSED** |
| SUPERSEDED+FINAL test gap | MINOR | — | v5 SUPERSEDED / v6 FINAL | **CLOSED** |
| cross-plant test gap | MINOR | — | Puebla/Querétaro + GG | **CLOSED** |
| historical YYYY-MM e2e gap | MINOR | — | julio con now agosto | **CLOSED** |

## Remaining limitations

Matcher canónico por inclusión (ARCH). GG sigue cargando líneas GLOBAL y filtra. Mes actual + FINAL si la pregunta es month_close “este mes”: sin política nueva. IES/pre_meeting/UI no tocados. 52.5% intacto.

## NEXT_TASK

`REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001`

No autorizada. No ejecutada.

STOP.
