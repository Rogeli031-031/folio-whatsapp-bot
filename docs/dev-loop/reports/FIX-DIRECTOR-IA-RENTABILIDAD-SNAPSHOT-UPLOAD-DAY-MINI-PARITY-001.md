# FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001

```yaml
task_id: "FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST"
implementation: true
docs_director_ia_changed: false
live_db: false
commit: "COMMIT_BLOCKED_BY_ALLOWED_ACTIONS"
rentability_b_first_bad_boundary: "B_UPLOAD_DAY"
resolver_reused: "resolveUploadDayLikeClientesPorMes"
tier1_before: "8/8 PASS"
runtime_before: "R-RUNTIME / R-MOVEMENT / R-DELTA-INCOME / R-DELTA-PARITY / R-DELTA-CUT / R-RENT-SNAPSHOT = 55/55 PASS"
rent_cut_before: "001/002/003/009/010 PASS; 004–008 FAIL (B_UPLOAD_DAY reproducido)"
predeploy_before: "FAIL (nuevo pack rojo en propagación/forecast)"
tier1_after: "8/8 PASS"
runtime_after: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..008 PASS; R-DELTA-INCOME-001..010 PASS; R-DELTA-PARITY-001..010 PASS; R-DELTA-CUT-001..010 PASS; R-RENT-SNAPSHOT-001..010 PASS; R-RENT-CUT-001..010 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
hardcoded_live: false
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
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
  - "Commit no ejecutado: allowed_actions no lista commit."
  - "Validación LIVE queda post-deploy. No se consultó producción."
```

## 1. BEFORE

Producto intacto. Pack R-RENT-CUT creado primero.

```text
TIER 1                         8/8 PASS
R-RUNTIME / R-MOVEMENT
R-DELTA-INCOME / R-DELTA-PARITY
R-DELTA-CUT / R-RENT-SNAPSHOT  55/55 PASS
HTTP 5xx                       0
HARNESS FAILURE                0

R-RENT-CUT-001  PASS   A cerrado real
R-RENT-CUT-002  PASS   mini(null) = MTD
R-RENT-CUT-003  PASS   resolver last-upload
R-RENT-CUT-004  FAIL   B upload_day not propagated to mini got=null
R-RENT-CUT-005  FAIL   B ventaTon=400 expected=800 upload=null
R-RENT-CUT-006  FAIL   B util_oper=1060000 expected=3420000 (MTD)
R-RENT-CUT-007  FAIL   B resultado_final=60000 expected=2420000 (MTD)
R-RENT-CUT-008  FAIL   delta A→B=-4720000 expected=-2360000
R-RENT-CUT-009  PASS   corporativos inalterados
R-RENT-CUT-010  PASS   Delta Ingreso independiente
```

B_UPLOAD_DAY reproducido. El pack no quedó 10/10 verde antes del cambio.

R-RENT-SNAPSHOT permaneció PASS: mockea `loadRentabilidadKpis` y no ve esta frontera.

## 2. FIRST_BAD_BOUNDARY

```
loadKpiForMonth(B)
  → upload_day: deps.upload_day || null
  → computeIgfForecastMiniPayload / loadIgfForecastMiniPayload
  → fechaCorte=""
  → isCorteEnMes=false
  → enableLookback=false
  → sin días restantes
  → B = MTD
  → util_oper incorrecto
  → resultado_final incorrecto
```

Mismo helper que Dashboard ARR. Distinto corte.

## 3. IMPLEMENTACIÓN

Resolver reutilizado: `resolveUploadDayLikeClientesPorMes`
(`lib/igf-effective-proy-target.js`).

Es el mismo SQL mes-nivel que `GET /api/arr/last-upload-day` y
`ArrClient.resolveUploadDayForMonth`. No se creó otro `SELECT MAX(...)`.

No se usó `loadArrLastUploadDay` plant-aware: esa semántica diverge del
Dashboard ARR (last-upload del mes, no por planta).

Cambio esencial en `loadKpiForMonth`:

- mes cerrado (calendario, misma rama sin corte que `isIgfMesCerradoPorCorte`):
  `upload_day = null` → sigue real. Agosto no se proyecta.
- mes B abierto: resolver canónico → pasar `upload_day` al mini existente.
- DI mínima: `deps.resolveUploadDay` para tests.

No se modificó fórmula de rentabilidad, `recalcularUtilYResultado`,
corporativos, operativos, resultado_final, ni Delta Ingreso.

## 4. AFTER

Fixture Dashboard (determinístico, no LIVE):

| | ventaTon | util_oper | resultado_final |
|---|---:|---:|---:|
| A cerrado | 1200 | 5,780,000 | 4,780,000 |
| B MTD (null) | 400 | 1,060,000 | 60,000 |
| B forecast | 800 | 3,420,000 | 2,420,000 |
| Delta A→B | | | −2,360,000 |

Corporativos = 1,000,000 en A, MTD y forecast (escalan con `bIgf`, no `bRes`).

```text
TIER 1                         8/8 PASS
R-RUNTIME-001..007             PASS
R-MOVEMENT-001..008            PASS
R-DELTA-INCOME-001..010        PASS
R-DELTA-PARITY-001..010        PASS
R-DELTA-CUT-001..010           PASS
R-RENT-SNAPSHOT-001..010       PASS
R-RENT-CUT-001..010            PASS
HTTP 5xx                       0
HARNESS FAILURE                0
PRE-DEPLOY --gate              PASS
```

`test/director-ia-rent-cut.test.js`: 7/7 PASS.

## 5. Por qué no afecta A cerrado

`isCalendarMonthClosed` usa `now` del snapshot. Agosto < septiembre → cerrado.
No se resuelve ni se pasa `upload_day` de B. El mini sigue venta real.

R-RENT-CUT-001: A con o sin `upload_day` de B = mismos `util_oper` / `resultado_final`.

## 6. Por qué no afecta Delta Ingreso

No se editó:

- `computeDeltaIngresoClientesPorMes`
- `computeClientesDescuentoMes`
- `ingresoClienteMarginal`
- `resolveUploadDayLikeClientesPorMes` (solo se **llama**)
- effective PROY target

R-DELTA-INCOME / R-DELTA-PARITY / R-DELTA-CUT permanecieron PASS.
R-RENT-CUT-010 exige `source_helper=computeDeltaIngresoClientesPorMes`.

## 7. False-green

R-RENT-SNAPSHOT mockea `loadRentabilidadKpis` con constantes. Seguiría verde
si alguien vuelve a pasar `upload_day=null` en B abierto.

R-RENT-CUT baja una capa: resolver → `loadIgfForecastMiniPayload` →
`util_oper_importe` / `resultado_final_importe`. Expected = mini con corte
resuelto. Actual = lo que `loadKpiForMonth` pasa al mini. Si B abierto
recibe `null`, 004–008 fallan.

## 8. Suites relacionadas

PASS: IGF mini export, period-start, financial_diagnosis, Delta Ingreso
parity/cut, cutoff E2E (salvo Q3 CEL), forecast magnitude (salvo Q3 CEL).

Fallo preexistente idéntico (demostrado con snapshot de `HEAD` sin este FIX):

```text
¿Cómo va el descuento de Acapulco este mes?
false !== true
```

Mismo assertion en `director-ia-cutoff-transport-e2e.test.js` sobre el
snapshot de `origin/main`/HEAD. No es regresión de este FIX. No se tocó
planner/CEL.

## 9. Archivos

Modificados:

- `lib/director-ia-rentabilidad-deterioro-snapshot.js`
  - `isCalendarMonthClosed` (nueva, local)
  - `resolveOpenMonthUploadDay` (nueva; reutiliza resolver canónico)
  - `loadKpiForMonth` (propaga corte solo en mes abierto)
- `test/fixtures/director-ia-golden-cases.js` — R-RENT-CUT-001..010
- `test/helpers/director-ia-runtime-golden-harness.js` — eval + deps sin mock KPI
- `docs/dev-loop/CURRENT_TASK.md` — solo `status`

Creados:

- `test/fixtures/director-ia-rent-cut.js`
- `test/director-ia-rent-cut.test.js`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001.md`

No tocados: `docs/director-ia/`, Delta Ingreso helpers, frontend, DB,
`server.js` (el mini sigue único), chat (ya inyectaba `pool` + `now`).

## 10. git

```text
git diff --check     (sin output; OK)
rama                 fix/director-ia-rentabilidad-snapshot-upload-day-mini-parity-001
COMMIT_BLOCKED_BY_ALLOWED_ACTIONS
```

`git status --short` al cierre:

```text
 M docs/dev-loop/CURRENT_TASK.md
 M lib/director-ia-rentabilidad-deterioro-snapshot.js
 M test/fixtures/director-ia-golden-cases.js
 M test/helpers/director-ia-runtime-golden-harness.js
?? docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001.md
?? test/director-ia-rent-cut.test.js
?? test/fixtures/director-ia-rent-cut.js
```

## 11. STOP

DONE_PENDING_REVIEW.

B_UPLOAD_DAY eliminado en la ruta del snapshot.
No merge. No push main. No deploy. No LIVE_DB. No next task.
