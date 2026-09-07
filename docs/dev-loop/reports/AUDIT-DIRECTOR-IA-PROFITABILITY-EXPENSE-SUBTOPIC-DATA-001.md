# AUDIT-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
tests_written: false
product_changed: false
classification: "B. DATA_ALREADY_LOADED_BUT_DROPPED"
first_bad_boundary: "readIgfForecastMiniAuthoritative no copia mini.rows[].corporativos/operativos/gasto aunque el loader ya los trajo"
corporate_source: "computeIgfForecastMiniPayload → rows[].corporativos"
operational_source: "computeIgfForecastMiniPayload → rows[].operativos"
total_expense_source: "computeIgfForecastMiniPayload → rows[].gasto"
ab_available: true
dashboard_uses: true
delta_gastos_created: false
formula_invented: false
next_task_proposed: "FIX-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-CONNECT-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-ACTIVE-SUBTOPIC-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task. No implementación."
```

## 0. G1

Rama: `audit/director-ia-profitability-expense-subtopic-data-001` ≠ `main`.

Solo se cambió `AUTHORIZED` → `IN_PROGRESS`. Campos humanos intactos. `implementation_authorized: NO`. Sin LIVE_DB. Sin producto. Sin tests nuevos. Sin commit.

Continuidad T1→T4 ya funciona. Esta auditoría no la reabre.

Pregunta: ¿ya existen físicamente gasto corporativo/operativo A y B, y solo falta conectarlos a T4?

## 1. Clasificación y FIRST_BAD_BOUNDARY

**CLASIFICACIÓN: B. DATA_ALREADY_LOADED_BUT_DROPPED**

**FIRST_BAD_BOUNDARY:** `readIgfForecastMiniAuthoritative` (`lib/director-ia-dashboard-forecast-adapter.js`).

T1 ya llama `loadIgfForecastMiniPayload` → `computeIgfForecastMiniPayload`. Esa función **ya escribe** `operativos`, `corporativos` y `gasto` en `mini.rows[]`. El adapter localiza la fila de planta y solo copia:

- `ventaTon` → `venta_ton`
- `comDesc` → `desc_kg`
- `utilOperImporte` → `util_oper_importe`
- `resultadoFinalImporte` → `resultado_final_importe`

No copia `row.corporativos`, `row.operativos` ni `row.gasto`.

A partir de ahí el dato deja de existir en la ruta de rentabilidad.

No es A: el snapshot armado no contiene esos campos.
No es C: esta ruta **sí carga** el mismo mini que el dashboard; no extrae esas columnas.
No es D: no hace falta una fórmula nueva; el importe ya está calculado.
No es E: la fuente se localizó.
No es F: la estática basta.

## 2. ¿Dónde vive físicamente gasto corporativo?

Nombre físico del importe: `corporativos` (camelCase en el mini).

Composición ya existente en `computeIgfForecastMiniPayload` (`server.js`):

```
M = gtos_apoyos_corp_kg * scale
N = bancos_corp_kg * scale
O = otros_programas_kg * scale
P = inversiones_kg * scale
corporativos = round((M + N + O + P) * bRes * 1000)
```

Líneas IGF almacenadas (no son el importe final; son componentes $/kg):

- `gtos_apoyos_corp_kg`
- `bancos_corp_kg`
- `otros_programas_kg`
- `inversiones_kg`

El Excel del dashboard ya documenta la misma suma: `SUM(M:P)*B*1000` en `lib/dashboard-arr-forecast.js`.

Director IA consume ese mini vía `loadIgfForecastMiniPayloadForDirectorIa` (`server.js` → `configureDirectorIaChat`).

## 3. ¿Dónde vive físicamente gasto operativo?

Nombre físico del importe: `operativos`.

Misma función:

```
E = gasto_kg * scale
I = bancos_planta_kg * scale
J = provision_planta_kg * scale
F = impuesto_kg
operativos = round((E + I + J + F) * bRes * 1000)
```

`gasto_kg` **no** es gasto total ni gasto operativo importe. Es un componente $/kg de operativos.

## 4. ¿Existe gasto total físico?

Sí. En el mismo mini:

```
gasto = operativos + corporativos
```

ArrClient lo pinta como `gastoImporte` desde `miniRow.gasto`.

No existe un módulo `Delta Gastos`. El comparativo A/B del dashboard es `cellDeltaMoney(A, B)` sobre esos tres campos.

## 5. ¿Están disponibles A/B?

Sí, en la fuente. T1 ya carga el mini **dos veces** (`loadKpiForMonth` para mes A y mes B). Cada payload mensual trae `corporativos` / `operativos` / `gasto` de esa planta.

El dashboard IGF Forecast ARR ya compara A/B:

- `frontend-dashboard/app/arr/ArrClient.tsx` `computeRowValues` lee `miniRow.operativos|corporativos|gasto`
- fila COMPARACION: `cellDeltaMoney(metricA.corporativos, metricB.corporativos)` (y análogo operativos/gasto)

No se consultó LIVE_DB. La disponibilidad A/B es estructural: un mini por mes.

## 6. Distinción de conceptos (no mezclar)

| Concepto | Campo físico | Qué no es |
|---|---|---|
| Gasto operativo (importe) | `mini.rows[].operativos` | no es `util_oper_importe` |
| Gasto corporativo (importe) | `mini.rows[].corporativos` | no es `resultado_final_importe` |
| Gasto total (importe) | `mini.rows[].gasto` | no es `gasto_kg` |
| Rentabilidad operativa | `util_oper_importe` / `utilOperImporte` | no es gasto |
| Rentabilidad final | `resultado_final_importe` / `resultadoFinalImporte` | no es gasto |

Identidad **ya existente** dentro de `computeIgfForecastMiniPayload` (consecuencia, no fuente nueva):

```
utilOperImporte = ingreso - operativos
resultadoFinalImporte = utilOperImporte - corporativos
```

`frontend-dashboard/lib/igf-kpi-ui.ts` `computeIgfMiniResumenRows` usa la identidad inversa para otra vista. **No** es la fuente que debe conectar Director IA. El contrato de paridad con ARR es el campo ya materializado del mini.

Esta auditoría **no** propone implementar `util_operativa - resultado_final` como atajo.

## 7. Traza CORPORATIVOS

```
gtos_apoyos_corp_kg + bancos_corp_kg + otros_programas_kg + inversiones_kg
  AVAILABLE
→ computeIgfForecastMiniPayload (server.js)
  LOADED   rows[].corporativos
→ loadIgfForecastMiniPayloadForDirectorIa
  LOADED   mismo payload
→ readIgfForecastMiniAuthoritative
  DROPPED / NOT_EXPOSED     ← FIRST_BAD_BOUNDARY
→ loadKpiForMonth
  DROPPED   solo util_oper_importe + resultado_final_importe
→ assembleRentabilidadDeterioroSnapshot
  NOT_EXPOSED   solo rentabilidad_final / rentabilidad_operativa
→ conversation_state
  NOT_TRANSPORTED   parent + active_subtopic + A/B months; sin importes
→ resolveProfitabilitySubtopicTurn / buildProfitabilitySubtopicFollowUpAnswer
  NOT_CONNECTED   kind=probe_unavailable hardcodeado
→ T4 "¿cuánto subieron?"
  NOT_CONNECTED   síntoma visible
```

OPERATIVOS: la misma traza, campo `operativos`.
GASTO TOTAL: la misma traza, campo `gasto`.

T4 no vuelve a llamar al mini. Eso es un boundary **posterior**. El primero es el drop en el adapter, sobre un payload que T1 ya había cargado.

## 8. Por qué T4 dice que no está conectado

`lib/director-ia-profitability-subtopic.js`:

- T4 matchea `isMagnitudeProbeCue` → `kind: "probe_unavailable"`
- La prosa declara que no hay comparativo
- No lee mini, snapshot ni adapter
- No afirma cifra (correcto dado el drop)

La continuidad está bien. Falta transporte del campo ya cargado.

## 9. FIX mínimo (propuesta; no implementado)

No crear Delta Gastos. No nueva fórmula. No SQL. No derivar corporativos restando rentabilidades.

Conectar el campo **ya materializado**:

1. `readIgfForecastMiniAuthoritative`: copiar `operativos`, `corporativos`, `gasto` de la misma fila que ya lee.
2. `loadKpiForMonth`: devolver esos tres campos junto a los dos de rentabilidad.
3. `assembleRentabilidadDeterioroSnapshot`: armar A/B/delta con el `kpiDelta` existente (B − A), sin motor nuevo.
4. T4 (y opcionalmente T3): con parent snapshot + `active_subtopic` + `active_period_months`, volver a llamar `loadKpiForMonth` para A y B (misma función que T1) y pasar los importes al composer del subtopic.
5. Responder: corporativos A → B, variación B−A. Sin atribución causal. Sin pesos. Sin reporte A/B/C.

No persistir importes en `conversation_state`. Reconsultar el loader canónico.

## 10. Archivos que tocaría el FIX

- `lib/director-ia-dashboard-forecast-adapter.js`
- `lib/director-ia-rentabilidad-deterioro-snapshot.js`
- `lib/director-ia-profitability-subtopic.js`
- `lib/director-ia-chat.js` (solo el inherit de profitability subtopic; recargar KPI A/B)

No haría falta: planner, frontend, SQL, `computeDeltaGastos`, `docs/director-ia/`.

`server.js` / `computeIgfForecastMiniPayload`: no tocar. La fórmula ya existe.

## 11. Tests que crearía el FIX

Regression-first, cruzando `askDirectorIa`, fixture `director-ia-rent-cut` (ya tiene `EXPECTED_*.corporativos` / `operativos`):

- Adapter expone `corporativos`/`operativos`/`gasto` desde `mini.rows[]`.
- `loadKpiForMonth` A y B los conservan.
- T4 tras T1→T2→T3 responde A, B y delta de `corporativos` con esos expected.
- Fuente declarada = `corporativos` del mini, no `util_oper_importe - resultado_final_importe`.
- T4 sin state no inventa hilo ni cifra.
- Child operativo usa `operativos`, no cruza a corporativos.
- No aparece `computeDeltaGastos` / `delta_gastos`.
- R-CONV-SUBTOPIC-001..010 y TIER 1 / PRE-DEPLOY siguen PASS.

## 12. Qué NO debe hacerse

- Delta Gastos / `computeDeltaGastos` / `delta_gastos`
- Fórmula nueva
- `util_operativa - resultado_final` como fuente
- SQL nuevo, DB, LIVE_DB, hardcodes
- Frontend
- Extraer reusable engine
- Inventar causalidad o pesos sobre la caída de rentabilidad
- Tratar `gasto_kg` como gasto total

## 13. Respuestas 1–10 del CURRENT_TASK

1. Corporativos: `computeIgfForecastMiniPayload` → `rows[].corporativos` (suma M+N+O+P × bRes × 1000).
2. Operativos: mismo loader → `rows[].operativos` (E+I+J+F × bRes × 1000).
3. Gasto total: sí, `rows[].gasto`.
4. A/B: sí; T1 ya pide dos minis; el dashboard ya compara.
5. FIRST_BAD_BOUNDARY: adapter no copia esos campos.
6. Clasificación B.
7. FIX: exponer + conservar + reconsultar en T4.
8. Adapter, snapshot, subtopic, chat.
9. Tests de transporte A/B y anti-derivación.
10. No Delta Gastos, no fórmula, no resta de rentabilidades, no SQL, no frontend.
