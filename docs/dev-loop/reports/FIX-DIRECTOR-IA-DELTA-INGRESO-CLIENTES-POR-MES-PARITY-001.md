# FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001

```yaml
task_id: "FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001"
outcome: "DONE_PENDING_REVIEW"
mode: "FIX"
implementation: true
docs_director_ia_changed: false
live_db: false
tier1_before: "8/8 PASS"
runtime_before: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..008 PASS; R-DELTA-INCOME-001..009 PASS; R-DELTA-INCOME-010 FAIL; R-DELTA-PARITY-001 PASS; R-DELTA-PARITY-002..010 FAIL (001 kg A coincidía)"
predeploy_before: "FAIL"
tier1_after: "8/8 PASS"
runtime_after: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..008 PASS; R-DELTA-INCOME-001..010 PASS; R-DELTA-PARITY-001..010 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
first_bad_boundary: "FORECAST_PROJECTION"
forecast_source: "computeDeltaIngresoClientesPorMes + computeClientesDescuentoMes + ingresoClienteMarginal"
hardcoded_live_clients: false
golden_tier1_expectations_changed: false
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
  - "Validación exacta LIVE contra Clientes por mes después del deploy. No se consultó producción."
```

## 1. BEFORE (gate endurecido, producto aún no tocado)

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001..007  PASS
R-MOVEMENT-001..008  PASS

R-DELTA-INCOME-001..009  PASS  (routing/comments/Top N estructural; mock OLS)
R-DELTA-INCOME-010  FAIL  expected Clientes por mes source; source=computeDeltaIngresoForecast

R-DELTA-PARITY-001  PASS  kg A idéntico (mes real; no era la frontera)
R-DELTA-PARITY-002  FAIL  kg B SCALE_UP got=60000 expected_cpm=100000 ols=60000
R-DELTA-PARITY-003  FAIL  ingreso A NEG_DEEP got=350000 expected=358000
R-DELTA-PARITY-004  FAIL  ingreso B NEG_DEEP got=70000 expected=143200
R-DELTA-PARITY-005  FAIL  delta NEG_DEEP got=-280000 expected=-214800
R-DELTA-PARITY-006  FAIL  SCALE_UP got=-140000 cpm=+143200 ols=-140000
R-DELTA-PARITY-007  FAIL  HG: ingresoA=350000 expected=358000 noHg=350000
R-DELTA-PARITY-008  FAIL  desc persistido vs ingreso OLS
R-DELTA-PARITY-009  FAIL  kgB=60000 expected=100000 (no usó target IGF 200 t)
R-DELTA-PARITY-010  FAIL  ranking OLS incluye SCALE_UP; CPM no

HTTP 5xx = 0
HARNESS FAILURE = 0
PRE-DEPLOY GATE = FAIL
```

Mínimo rojo exigido (002, 004, 005, 006, 007, 009, 010): reproducido. Los nuevos casos no quedaron verdes con producto OLS.

## 2. FIRST_BAD_BOUNDARY reproducido

**FORECAST_PROJECTION / kg B**

Fixture sintético (no clientes LIVE):

| | Clientes por mes | OLS `computeDeltaIngresoForecast` |
|---|---|---|
| SCALE_UP kg B | 100000 = 40000 × (200000 / 80000) | 60000 |
| SCALE_UP Δ | **+143200** | **−140000** |
| Top 5 | NEG_DEEP, NEG_MID, NEG_TINY, NEG_LOW, NEG_SMALL | NEG_DEEP, NEG_MID, **SCALE_UP**, NEG_TINY, NEG_LOW |

R-DELTA-PARITY-002 midió exactamente `got=60000 expected_cpm=100000 ols=60000` antes del FIX.

## 3. Arquitectura source-of-truth final

```text
pregunta septiembre
  → planner delta_income + forecast
  → A=2026-08  B=2026-09
  → computeDeltaIngresoClientesPorMes
       → loadIgfPlantMetrics (latest GLOBAL version_number DESC; no inventa FINAL)
       → targetKg = venta_ton IGF × 1000   (targetKgDesdeIgfVentaTon)
       → computeClientesDescuentoMes A historico
       → computeClientesDescuentoMes B + targetKgOverride
       → ingresoClienteMarginal(kg, desc persistido, margen, HG)
       → Delta = B − A
  → filter Δ<0 → sort → Top N
  → comments (después; no alteran kg/ingreso/delta/ranking)
  → respuesta
```

`computeDeltaIngresoForecast` (OLS) **no** se convierte globalmente. Sigue en `server.js` POST delta-ingreso-forecast-datos / modal. Esta ruta ejecutiva es específica de Clientes por mes.

No hay HTTP interno. No hay tercera fórmula.

## 4. Helper extraído/reutilizado

| Pieza | Dónde |
|---|---|
| `ingresoClienteMarginal` | `lib/ingreso-cliente-marginal.js` — canónico |
| UI | `ArrClient.tsx` importa el mismo helper (sin cambio visual de fórmula) |
| kg B | `computeClientesDescuentoMes` existente (`targetKgOverride`) |
| target kg | `targetKgDesdeIgfVentaTon` extraído de `targetKgDesdeIgfTon` |
| HG | `metricsFromIgfLine`: `hgDisplay = hg_pct×100`, `hgDinero = \|hg_kg/hg_pct\|` |

## 5. Regla exacta kg B

Reutiliza el cálculo físico de `computeClientesDescuentoMes`:

`kgProy = round(kg_real_MTD × (targetKgPlanta / Σ MTD planta) × 100) / 100`

más el ajuste de residuo al mayor `kgProy` que ya existía. No se reimplementó la aritmética en el chat.

## 6. Paridades

- **HG:** entra al ingreso A/B. Fixture: retirar HG cambia SCALE_UP A de 572800 a 560000.
- **Descuento:** `descKg` persistido `SUM(monto)/SUM(kg)` de CDM. Simulación React (`$3/kg`) no se lee.
- **Version/target:** latest `igf.versions` GLOBAL `ORDER BY version_number DESC`. Fixture FORECAST v8 venta_ton=200; decoy FINAL v2 venta_ton=80 no gobierna.
- **Periodo:** `septiembre` → A agosto 2026 / B septiembre 2026. No MAX(fecha). No M9.

## 7. R-DELTA-INCOME false-green

R-DELTA-INCOME-001..009 se conservaron (routing, periodo, MXN, Top N estructural, comments, agregado). No se debilitaron.

R-DELTA-INCOME-010 ya **no** certifica `computeDeltaIngresoForecast`. Exige fuente Clientes por mes (`computeDeltaIngresoClientesPorMes` / `computeClientesDescuentoMes`) y prohíbe OLS.

## 8. AFTER

```text
TIER 1                 8/8 PASS
R-RUNTIME-001..007     PASS
R-MOVEMENT-001..008    PASS
R-DELTA-INCOME-001..010 PASS
R-DELTA-PARITY-001..010 PASS
HTTP 5xx               0
HARNESS FAILURE        0
PRE-DEPLOY --gate      PASS
```

## 9. Suites relacionadas

PASS: parity unit (`test/director-ia-delta-ingreso-clientes-por-mes-parity.test.js`), M9, commercial_trend, historical_margin, client_profile, M7 IGF composition, period-start, action-person routing, new-clients, ARR input factory, golden/runtime harness.

`test/director-ia-authoritative-kpi-parity.test.js` Q3 (`¿Cómo va el descuento de Acapulco este mes?` → CEL) falla en aislamiento sobre planner/`shouldHandleExecutiveStatus`. No se tocó planner ni CEL. Fuera de alcance de esta tarea (descuento ejecutivo, no Delta Ingreso). No se “arregló” para no encadenar trabajo.

## 10. Archivos

Modificados:

- `lib/director-ia-chat.js`
- `frontend-dashboard/app/arr/ArrClient.tsx`
- `frontend-dashboard/next.config.js`
- `test/fixtures/director-ia-golden-cases.js`
- `test/helpers/director-ia-runtime-golden-harness.js`
- `docs/dev-loop/CURRENT_TASK.md`

Nuevos:

- `lib/ingreso-cliente-marginal.js`
- `lib/ingreso-cliente-marginal.d.ts`
- `lib/delta-ingreso-clientes-por-mes.js`
- `test/fixtures/delta-ingreso-clientes-por-mes-parity.js`
- `test/director-ia-delta-ingreso-clientes-por-mes-parity.test.js`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001.md`

No tocados: `docs/director-ia/`, `computeDeltaIngresoForecast` global, DB/migrations, LIVE_DB, merge, deploy.

## 11. LIVE

`live_db_authorized: NO`. Cero consultas a producción. Los importes humanos (PUBLICO, MOVE, WAL MART, DURANGO, CALZADA) no se hardcodearon.
