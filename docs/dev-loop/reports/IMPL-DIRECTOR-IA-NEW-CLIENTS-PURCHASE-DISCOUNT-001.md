# IMPL-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001

```yaml
task_id: "IMPL-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
base_main_sha: "91fe8b8b4bea40bb51d5da7299946f6c397620c0"
branch: "implementation/director-ia-new-clients-purchase-discount-001"
g1_human: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-01 (authorized_by / authorized_at / human_authorization intactos)"
files_touched:
  - "lib/director-ia-new-clients.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-tools.js"
  - "test/director-ia-new-clients-purchase-discount.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001.md"
files_not_touched:
  - "lib/dicf.js"
  - "server.js"
  - "docs/director-ia/"
  - "frontend-dashboard/"
  - "sql/"
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-commercial-state.js"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
secrets_check: "none"
```

## 1. Diseño implementado

Capacidad dedicada `historical_new_clients`:

```
semantic detection (isHistoricalNewClientsQuestion)
  → calendar period (parseExplicitPeriod + cues en/de + YYYY-MM + assignYear CDMX)
  → plant resolution (explícita o planta de sesión) + auth M9
  → loader read-only (ventas + descuentos mensuales reales)
  → clasificación determinista Nuevo
  → pack + respuesta determinista (openai_called: false)
```

El LLM no enumera la lista. `COMMERCIAL_STATE_CLIENT_LIMIT` permanece en 20.

## 2. Routing before / after P1–P6

Baseline reproducido antes de editar runtime (coincide con la auditoría):

| ID | BEFORE intent | AFTER intent |
| --- | --- | --- |
| P1 | commercial_trend | historical_new_clients |
| P2 | commercial_state (runtime IGF por «descuento») | historical_new_clients (handler in-process, no IGF) |
| P3 | client_profile (Acapulco como token) | historical_new_clients (Acapulco = planta) |
| P4 | commercial_trend | historical_new_clients |
| P5 | commercial_trend | historical_new_clients |
| P6 | unknown / IGF | historical_new_clients (`los nuevos` + mes) |

Holdouts: «¿Qué clientes son nuevos?» → commercial_trend; Arturo/Y GRUPO MOVE → client_profile; «cómo cambió el descuento» → M9; margen → financial_diagnosis; aumentaron → commercial_trend.

## 3. Semántica calendario

«agosto» sin año el 2026-09-01 CDMX → 2026-08.  
Año explícito y `YYYY-MM` soportados.  
enero → A = diciembre del año anterior.  
No trailing 30d.

## 4. Fórmula Nuevo histórica

DICF vigente (no modificado): `ingreso_anterior <= 0 && ingreso_forecast > 0` con `ingreso = max(0, kg × (margen − |desc/kg|))`.

Cerrado:

```
ingreso_A = max(0, kgA_real × (margenA − |descKgA|))
ingreso_B = max(0, kgB_real × (margenB − |descKgB|))
es_nuevo  = ingreso_A <= 0 && ingreso_B > 0
```

- kg A/B = SUM(kg) de `arr.ventas_diarias_cliente` del mes calendario.
- descKg para **clasificar**: `abs(monto)/kg` si hay fila de descuento; si no, **0** (equivalente DICF).
- margen = `getMargenKgPorPeriodo`; null → fallback 1 (mismo que DICF).
- B cerrado **nunca** usa forecast.

`DICF_SEMANTICS_PRESERVED = YES` (composición). No se usó `kgA=0 && kgB>0` como sustituto.

## 5. Sources

- kg: `arr.ventas_diarias_cliente` + `public.plantas` / `arr.provincia_plants`
- descuento: `arr.descuentos_diarios_cliente` (SUM(monto) mes B)
- margen (solo fórmula): IGF vía `getMargenKgPorPeriodo` (M9, contrato intacto)

No HTTP. No writes.

## 6. Missing vs zero

Ausencia de fila en `arr.descuentos_diarios_cliente` **no demuestra cero**.

- Reportado: `discount_monto = null`, `discount_kg = null`, `discount_status = DATA_NOT_FOUND`
- Clasificación: trata missing como 0 para no divergir de DICF
- Fila con monto 0: `ZERO_OBSERVED`

## 7. Lista completa / fixture 66

`source_count = transport_count = clients.length`. Sin `.slice`.  
Fixture de test: `Cliente Fixture 01` … `66` (no nombres de producción).  
Totales = suma cruda de kg, no suma de toneladas formateadas.  
Límite global 20 no se tocó.

## 8. Actual vs forecast

Mes cerrado: `presented_as_closed_actual = true`, `forecast_used = false`.  
Mes actual abierto: pack `open_current_month`, no carga facts, no afirma compra real, no usa DICF forecast.

## 9. Margen vs descuento

P2/P6 no llegan a `loadIgfArrAnnexForChat`. La respuesta no contiene `COMPARACION MARGEN $/kg`.

## 10. Autorización

`assertM9DeltasAccess`: GA/GV restringidos; GG/AD `plantas_permitidas`.  
Planta nombrada se revalida. Sin cruce.

## 11. Tests

`test/director-ia-new-clients-purchase-discount.test.js` — 20 tests, 25 controles de CURRENT_TASK cubiertos.

Focalizados: movers, trend, M9, IGF composition, client-profile, compound — pass.

Suite: `node --test test/director-ia-*.test.js` → **1404 pass / 0 fail** (baseline 1384 + 20).

`git diff --check` limpio.

## 12. Riesgos

- Margen null usa fallback 1 solo para clasificar; se declara `margen_fallback_used`.
- Canal/subcanal = MAX del mes (no moda estricta).
- «Nuevo» por ingreso, no por kg=0 (un cliente con kg A>0 e ingreso A=0 puede ser Nuevo).

## 13. OUT_OF_SCOPE

No se tocó DICF dashboard, UI, server.js, schema, Aumentaron/Disminuyeron/Dejaron, plant_switch, merge, deploy.

```
IMPLEMENTATION_STATUS = DONE_PENDING_REVIEW
BASE_MAIN_SHA = 91fe8b8b4bea40bb51d5da7299946f6c397620c0
ROUTING_P1 = historical_new_clients
ROUTING_P2 = historical_new_clients
ROUTING_P3 = historical_new_clients
ROUTING_P4 = historical_new_clients
ROUTING_P5 = historical_new_clients
ROUTING_P6 = historical_new_clients
HISTORICAL_NEW_CLIENTS_CAPABILITY = YES
CALENDAR_MONTH_SEMANTICS = YES
PREVIOUS_MONTH_SEMANTICS = YES (enero → diciembre año anterior)
NEW_CLASSIFICATION_FORMULA = ingreso_A <= 0 && ingreso_B > 0; ingreso = max(0, kg_real * (margen - |desc_kg|))
DICF_SEMANTICS_PRESERVED = YES
PURCHASE_USES_REAL_KG = YES
FORECAST_USED_FOR_CLOSED_MONTH = NO
DISCOUNT_USES_REAL_SOURCE = YES
MARGIN_USED_AS_DISCOUNT = NO
MISSING_DISCOUNT_FAIL_CLOSED = YES
ALL_CLIENTS_TRANSPORTED = YES
CONTEXT_LIMIT_20_BYPASSED_LOCALLY = YES
GLOBAL_COMMERCIAL_STATE_LIMIT_CHANGED = NO
DETERMINISTIC_LIST_BUILDER = YES
PLANT_AUTH_PRESERVED = YES
P3_ACAPULCO_NOT_CLIENT_PROFILE = YES
P2_NOT_HIJACKED_BY_IGF = YES
P1_P4_P5_NOT_TRAILING_TREND = YES
CURRENT_MONTH_PROTECTION = YES
HARDCODE_USED = NO
DB_SCHEMA_CHANGED = NO
DICF_FORMULA_CHANGED = NO
SERVER_CHANGED = NO
RENDER_CHANGED = NO
TESTS = 1404 pass / 0 fail
GIT_DIFF_CHECK = CLEAN
IMPLEMENTATION_AUTHORIZED = YES
MERGE_AUTHORIZED = NO
DEPLOY_AUTHORIZED = NO
OUT_OF_SCOPE_FINDINGS = no Aumentaron/Disminuyeron/Dejaron; no UI; no live DB; no dicf.js; no server.js
```
