# FIX-DIRECTOR-IA-CLIENTES-POR-MES-TARGET-PROY-PARITY-001

```yaml
task_id: "FIX-DIRECTOR-IA-CLIENTES-POR-MES-TARGET-PROY-PARITY-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST"
implementation: true
docs_director_ia_changed: false
live_db: false
tier1_before: "8/8 PASS"
runtime_before: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..008 PASS; R-DELTA-INCOME-001..010 PASS; R-DELTA-PARITY-001..010 PASS"
cut_before: "R-DELTA-CUT-001..007 FAIL; R-DELTA-CUT-008 PASS; R-DELTA-CUT-009 PASS; R-DELTA-CUT-010 FAIL"
predeploy_before: "FAIL"
tier1_after: "8/8 PASS"
runtime_after: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..008 PASS; R-DELTA-INCOME-001..010 PASS; R-DELTA-PARITY-001..010 PASS; R-DELTA-CUT-001..010 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
first_bad_boundary: "TARGET_PROY_SOURCE"
forecast_source: "computeDeltaIngresoClientesPorMes + resolveEffectiveIgfTarget (PROY/overlay) + computeClientesDescuentoMes + ingresoClienteMarginal"
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
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENTES-POR-MES-RUNTIME-CUT-PARITY-001.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
  - "Validación exacta LIVE: Excel fresco + pregunta LIVE inmediatamente después. No se consultó producción."
```

## 1. BEFORE (gate endurecido, producto aún no tocado)

R-DELTA-CUT-001..010 se escribieron **antes** del cambio de producto. Con el producto actual (target B = `compromiso_lines.venta_ton` crudo):

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001..007     PASS
R-MOVEMENT-001..008    PASS
R-DELTA-INCOME-001..010 PASS
R-DELTA-PARITY-001..010 PASS

R-DELTA-CUT-001  FAIL  TARGET_PROY_SOURCE ventaTon=250 expected_proy=200 targetKg=250000 expected=200000
R-DELTA-CUT-002  FAIL  upload_day overlay
R-DELTA-CUT-003  FAIL  raw compromiso rejection
R-DELTA-CUT-004  FAIL  kg B parity
R-DELTA-CUT-005  FAIL  ingreso B parity
R-DELTA-CUT-006  FAIL  Delta/sign parity
R-DELTA-CUT-007  FAIL  ranking boundary
R-DELTA-CUT-008  PASS  A real/cerrado ya no se reproyectaba
R-DELTA-CUT-009  PASS  sin React sim / localStorage
R-DELTA-CUT-010  FAIL  snapshot Top N / count / sum (universo derivado del target crudo)

HTTP 5xx               0
HARNESS FAILURE        0
PRE-DEPLOY --gate      FAIL
```

Mínimo rojo exigido (001, 002, 003, 004, 005, 006, 007, 010): reproducido. Los nuevos casos **no** quedaron verdes con el producto actual. Se procedió.

R-DELTA-PARITY permaneció verde porque mockea el **mismo** `targetKg` en ambas rutas; no observa PROY vs compromiso.

## 2. FIRST_BAD_BOUNDARY reproducido

**TARGET_PROY_SOURCE**

No es “otra versión”. Fixture sintético (nombres DEEP_ONE / RANK_SHIFT / SIGN_FLIP / ZERO_KEEP; no clientes LIVE):

| | Compromiso crudo | PROY efectivo |
|---|---|---|
| latest `version_number` | 8 | 8 (la misma) |
| `venta_ton` | 250 | 200 |
| `targetKg` | 250000 | 200000 |
| RANK_SHIFT kg B | 50000 | 40000 |
| RANK_SHIFT ingreso B | 358000 | 286400 |
| RANK_SHIFT Δ | −143200 | −214800 |
| SIGN_FLIP Δ | **+35800** | **−35800** |

Cadena física demostrada en `test/fixtures/delta-ingreso-target-proy-cut.js`:

```text
raw target 250 t
≠ effective PROY 200 t
→ targetKg 250000 ≠ 200000
→ factor distinto
→ kg B distinto (RANK_SHIFT 50000 vs 40000)
→ ingreso B distinto (358000 vs 286400)
→ Delta distinto (−143200 vs −214800)
→ ranking distinto
```

Top 5 raw (compromiso): DEEP_ONE, DEEP_TWO, DEEP_THREE, ZERO_KEEP, MID_STABLE.  
Top 5 PROY: DEEP_ONE, DEEP_TWO, DEEP_THREE, **RANK_SHIFT**, ZERO_KEEP.

Con target crudo, RANK_SHIFT cae bajo el corte. Con PROY, ocupa la 4ª posición. No se hardcodeó MOVE / ASOCIACION / importes LIVE.

`upload_day=2026-09-02` cambia el overlay a 180 t / 180000 kg. Esa semántica es la de Clientes por mes, no una regla nueva.

## 3. Explicación física PROY vs compromiso

Ambas rutas ya compartían fórmula:

`computeClientesDescuentoMes` + `ingresoClienteMarginal`

y la misma latest version (`ORDER BY version_number DESC LIMIT 1`).

La divergencia era **qué `venta_ton` se convierte en `targetKg` del mes abierto B**:

- **Clientes por mes / Excel / IGF Forecast:** overlay PROY (`loadProyVentaDescByPlantForIgf` = snapshot mini + `computePronosticoProyByPlant`) con `upload_day` (día explícito si coincide year/month; si no, último `arr.upload_log` del mes `ORDER BY uploaded_at DESC LIMIT 1`, no plant-aware).
- **Director IA (antes):** `defaultLoadIgfPlantMetrics` → `igf.compromiso_lines.venta_ton` crudo de esa latest.

Misma versión ≠ mismo target efectivo.

Periodos del caso: A = agosto 2026 real/cerrado; B = septiembre 2026 abierto/forecast. El cambio de target B no reproyecta A (R-DELTA-CUT-008).

## 4. Helper canónico extraído / reutilizado

La resolución física estaba en `server.js` (`loadProyVentaDescByPlantForIgf`) y en last-upload de `GET /api/arr/last-upload-day` / ArrClient.

Se extrajo el mínimo helper reutilizable **sin segunda fórmula**:

`lib/igf-effective-proy-target.js`

| Función | Qué reutiliza |
|---|---|
| `loadProyVentaDescByPlantForIgf` | Cuerpo canónico previo de `server.js`: snapshot + `computePronosticoProyByPlant` |
| `resolveUploadDayLikeClientesPorMes` | Misma semántica que ArrClient + last-upload-day |
| `resolveEffectiveIgfTarget` | PROY → `targetKgDesdeIgfVentaTon`; inyectable para harness |

`server.js` queda como wrapper del mismo helper. IGF Forecast / mini / tabla no cambian de motor.

`defaultLoadIgfPlantMetrics` **sigue** devolviendo compromiso crudo (margen / HG / version). No se globalizó el overlay. Solo `computeDeltaIngresoClientesPorMes` aplica PROY en B abierto (`!histB`).

No HTTP interno. No se tocó `computeClientesDescuentoMes`, `ingresoClienteMarginal`, HG, descuento, identidad, filtro negativos, sort, Top N ni comentarios.

## 5. Semántica `upload_day`

Conservada exactamente:

1. Si `upload_day` / `cutoff_date` es `YYYY-MM-DD` y coincide year/month del periodo B → ese día.
2. Si no → `SELECT ... FROM arr.upload_log WHERE year=$1 AND month=$2 ORDER BY uploaded_at DESC LIMIT 1`.
3. Ese YMD entra a `getPronosticoCorteYmdStr` + overlay snapshot / `computePronosticoProyByPlant`.

No se inventaron reglas por día ni last-upload plant-aware.

`lib/director-ia-chat.js` reenvía `req.body.upload_day` / `cutoff_date` a `computeDeltaIngresoClientesPorMes`. No lee localStorage ni estado React.

## 6. Protección A real

`resolveEffectiveIgfTarget` solo corre cuando `!histB`. A (agosto cerrado) sigue `computeClientesDescuentoMes({ historico: true })` sin `targetKgOverride`. R-DELTA-CUT-008 PASS antes y después.

## 7. AFTER

```text
TIER 1                 8/8 PASS
R-RUNTIME-001..007     PASS
R-MOVEMENT-001..008    PASS
R-DELTA-INCOME-001..010 PASS
R-DELTA-PARITY-001..010 PASS
R-DELTA-CUT-001..010   PASS
HTTP 5xx               0
HARNESS FAILURE        0
PRE-DEPLOY --gate      PASS
```

R-DELTA-PARITY no se debilitó.

## 8. R-DELTA-CUT-001..010

| ID | Qué protege | AFTER |
|---|---|---|
| 001 | source = PROY efectivo, no compromiso 250 t | PASS |
| 002 | overlay `upload_day` (180 t vs 200 t) | PASS |
| 003 | rechazo explícito de `venta_ton` crudo cuando PROY difiere | PASS |
| 004 | kg B = CDM con el mismo `targetKg` PROY | PASS |
| 005 | ingreso B vía `ingresoClienteMarginal` compartido | PASS |
| 006 | signo/Delta (SIGN_FLIP +35800 raw → −35800 PROY) | PASS |
| 007 | ranking: RANK_SHIFT entra al Top 5 solo con PROY | PASS |
| 008 | kg A idéntico al cambiar target B | PASS |
| 009 | backend determinístico; sin React sim | PASS |
| 010 | una sola ejecución: universo, negativos, sort, Top N, suma | PASS |

R-DELTA-CUT-010 deriva count/sum del mismo snapshot. No se hardcodearon 297/298.

## 9. Suites relacionadas

PASS (377 tests / 371 pass en el lote; 6 fail preexistentes documentados abajo):

- Delta Ingreso / Clientes por mes: `director-ia-delta-ingreso-clientes-por-mes-parity.test.js`, `director-ia-delta-ingreso-target-proy-cut.test.js`
- Golden / runtime harness
- ARR input factory
- IGF Forecast run-pack (contrato, igualdad mini, no contaminación, fail-closed, runtime chat)
- IGF composition M7, IGF reviewable supports, IGF FINAL (`igf-financial-final.test.js`)
- cutoff-aware tests obligatorios + E2E (no Golden Set Q1–Q3)
- cutoff-transport request boundary / HTTP / absence
- plant-aware cutoff resolución / aislamiento / E2E
- PROM cutoff contrato / identidad / pack / runtime / explain
- upload_day year/month bootstrap + primer turno forecast
- period-start semantics
- historical_margin (detector, adapter, builder, chat, closed-month FORECAST etiquetado)
- commercial_trend (planner, OLS, calendar_compare, chat)
- client_profile (identidad, descuento persistido, comments, routing)
- M9 historical Delta Ingreso
- daily_discount
- new-clients purchase/discount
- action-person routing

Los 6 FAIL del lote son el mismo Golden Set preexistente:

`¿Cómo va el descuento de Acapulco este mes?` → se espera CEL y no entra.

Ya documentado en `FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001`. No se tocó planner ni CEL. Fuera de alcance. No se “arregló”.

Contratos PROM/run-pack que exigen `async function loadProyVentaDescByPlantForIgf` en `server.js` y lo prohíben en chat/pack: siguen PASS (wrapper fino).

## 10. Archivos

Modificados:

- `lib/delta-ingreso-clientes-por-mes.js` (target B abierto = PROY efectivo)
- `lib/director-ia-chat.js` (inyecta `upload_day` / `loadEffectiveIgfTarget`; payload `target_source`)
- `server.js` (`loadProyVentaDescByPlantForIgf` → helper canónico)
- `test/fixtures/director-ia-golden-cases.js`
- `test/helpers/director-ia-runtime-golden-harness.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status` AUTHORIZED→IN_PROGRESS→DONE_PENDING_REVIEW; G1 intacto)

Nuevos:

- `lib/igf-effective-proy-target.js`
- `test/fixtures/delta-ingreso-target-proy-cut.js`
- `test/director-ia-delta-ingreso-target-proy-cut.test.js`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENTES-POR-MES-TARGET-PROY-PARITY-001.md`

No tocados: `docs/director-ia/`, `computeClientesDescuentoMes`, `ingresoClienteMarginal`, `computeDeltaIngresoForecast` OLS, ranking/comments, React/localStorage, DB/migrations, LIVE_DB, merge, deploy.

## 11. LIVE

`live_db_authorized: NO`. Cero consultas a producción.

Los importes del corte observado (PUBLICO −221564 vs −210363, MOVE, PALMA, Top5 −820408 vs −806677, 297/298) **no** se usaron como fixtures. La validación exacta es POST-DEPLOY: Excel fresco + pregunta LIVE inmediata.

## 12. SHA

- Rama: `fix/director-ia-clientes-por-mes-target-proy-parity-001`
- HEAD (base integrada, sin commit de esta implementación): `39cee2bcbcd0e2464950d46926a2e69ea8572c93`
- implementation SHA: no creado. `allowed_actions` no lista commit; LOOP §8.10 lo prohíbe. Working tree sucio con el FIX.
- stamp/docs SHA: no aplica (mismo motivo).
