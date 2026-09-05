# FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001

```yaml
task_id: "FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "REGRESSION_FIRST"
implementation: true
docs_director_ia_changed: false
live_db: false
commit: "BLOCKED — allowed_actions no lista commit; working tree intacto"
tier1_before: "8/8 PASS"
runtime_before: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..008 PASS; R-DELTA-INCOME-001..010 PASS; R-DELTA-PARITY-001..010 PASS; R-DELTA-CUT-001..010 PASS"
rent_before: "R-RENT-SNAPSHOT-001..010 FAIL (pack=clarification)"
predeploy_before: "FAIL"
tier1_after: "8/8 PASS"
runtime_after: "R-RUNTIME-001..007 PASS; R-MOVEMENT-001..008 PASS; R-DELTA-INCOME-001..010 PASS; R-DELTA-PARITY-001..010 PASS; R-DELTA-CUT-001..010 PASS; R-RENT-SNAPSHOT-001..010 PASS"
predeploy_after: "PASS"
http_5xx: 0
harness_fail: 0
routing_first_bad_boundary: "PLANNER"
data_first_bad_boundary: "DELTA_EXPENSE_SOURCE (no reabierto; fail-closed)"
attribution_first_bad_boundary: "DRIVER_ATTRIBUTION_METHOD (no reabierto; fail-closed)"
actionability_first_bad_boundary: "CONTROLABILITY_CONTRACT (no reabierto; fail-closed)"
forecast_source: "computeDeltaIngresoClientesPorMes + computeClientesDescuentoMes + ingresoClienteMarginal"
operativa_source: "util_oper_importe"
final_source: "resultado_final_importe"
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
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ACTIONABLE-DRIVERS-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
  - "Commit no ejecutado: allowed_actions no lo autoriza."
  - "Validación LIVE queda post-deploy. No se consultó producción."
```

## 1. BEFORE (producto intacto)

R-RENT-SNAPSHOT-001..010 se escribieron **antes** del cambio de producto.

Pregunta exacta:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001..007      PASS
R-MOVEMENT-001..008     PASS
R-DELTA-INCOME-001..010 PASS
R-DELTA-PARITY-001..010 PASS
R-DELTA-CUT-001..010    PASS

R-RENT-SNAPSHOT-001  FAIL  METRIC_PACK pack=clarification forbidden
R-RENT-SNAPSHOT-002  FAIL  METRIC_PACK pack=clarification
R-RENT-SNAPSHOT-003  FAIL  METRIC_PACK pack=clarification
R-RENT-SNAPSHOT-004  FAIL  METRIC_PACK pack=clarification
R-RENT-SNAPSHOT-005  FAIL  METRIC_PACK pack=clarification
R-RENT-SNAPSHOT-006  FAIL  METRIC_PACK pack=clarification
R-RENT-SNAPSHOT-007  FAIL  METRIC_PACK pack=clarification
R-RENT-SNAPSHOT-008  FAIL  METRIC_PACK pack=clarification
R-RENT-SNAPSHOT-009  FAIL  METRIC_PACK pack=clarification
R-RENT-SNAPSHOT-010  FAIL  METRIC_PACK pack=clarification

HTTP 5xx            0
HARNESS FAILURE     0
PRE-DEPLOY --gate   FAIL
```

001 no quedó verde con el producto actual. Se procedió.

002 y 005 no eran alcanzables por la pregunta exacta (caían en clarification). 008/009/010 no podían proteger fail-closed porque el runtime no entregaba snapshot.

## 2. FIRST_BAD_BOUNDARY confirmado en Runtime

Reproducción física, producto aún sin cambio de routing:

```text
pregunta exacta
→ detectDirectorIaIntent
→ intent=unknown
→ evidence=[{ value: "no_rule_matched" }]
→ requires_clarification=true
→ askDirectorIa → buildUnknownClarificationResult
→ mode=conversation_clarification
```

`ROUTING_FIRST_BAD_BOUNDARY = PLANNER`.

Regla que faltaba: no existía un predicado que exigiera `\brentabilidad\b` **y** (`\bdeterioro\b` o `\bprovocando\b`).

`isCauseQuestion` (CEL) solo acepta `^(por que|porque|y eso por que|a que se debe)` y `CAUSE_EXPLANATION` sigue `implemented: false`. Esta pregunta no entra por ahí.

Las reglas `financial_diagnosis` existentes (`caida_ingreso_financiera`, `diagnostico_financiero`) no cubren “deterioro de la rentabilidad”.

## 3. Routing elegido y por qué

Se reutiliza el intent `financial_diagnosis` con evidencia `rentabilidad_deterioro_snapshot` y `domain_override: ["igf", "delta_ingreso"]`.

No se creó un intent gigante nuevo.

El handler histórico de `financial_diagnosis` **no** puede gobernar este slice:

- carga M9 + OpenAI (`loadFinancialDiagnosisForChat`);
- no usa `computeDeltaIngresoClientesPorMes`;
- no puede garantizar fail-closed de gastos / atribución / controlabilidad.

Por eso el chat ramifica **antes** de `loadFinancialDiagnosisForChat` / OpenAI y entrega un snapshot determinístico.

La regla es estrecha: exige `rentabilidad` + (`deterioro` o `provocando`). No secuestra:

- `como va la rentabilidad` (sigue `unknown` en planner; CEL EXECUTIVE_STATUS);
- `por qué cayó el ingreso` (sigue `financial_diagnosis` clásico);
- preguntas de descuento / clientes / Delta Ingreso Forecast.

## 4. Fuentes y semántica

| Pieza | Fuente física | Nota |
|---|---|---|
| Rentabilidad final (KPI principal de “rentabilidad”) | `resultado_final_importe` | No se crea fórmula. |
| Rentabilidad operativa (contexto) | `util_oper_importe` | No se crea fórmula. Lectura vía `loadRentabilidadKpis` o mini IGF existente (`readIgfForecastMiniAuthoritative`). |
| Periodo standalone | calendario de `now` | A = mes anterior; B = mes actual. Semántica canónica `calendarMonthBounds` / mes previo. No `MAX(fecha)`. Golden `NOW_ISO` → A=`2026-08` real, B=`2026-09` forecast. Si no hay `now` usable: clarification grounded. |
| Delta Ingreso | **solo** `computeDeltaIngresoClientesPorMes` | effective PROY → `computeClientesDescuentoMes` → `ingresoClienteMarginal`. Prohibido OLS `computeDeltaIngresoForecast`. |
| Top clientes | mismos negativos del loader existente | `delta < 0`, más negativo → menos negativo, Top 5 default. |
| Hechos kg / descuento | kg A/B y descuento/kg A/B si vienen en la misma salida | “volumen bajó” / “descuento aumentó” = HECHO. No contribución monetaria. |
| Comentarios | enrichment existente | `Comentario registrado: "..."`. Nunca `Causa:`. |
| Margen | planta, solo si ya viene en el payload | No se llama “margen del cliente”. No se atribuye MXN de cliente al margen. |
| HG | no tocado | No se descompone ni se clasifica como accionable. |
| Action Register | no consultado | Fuera de slice. |

## 5. Fail-closed

- **Gastos:** no se consultan gastos/presupuesto/cheques/M6/M4. La respuesta declara que todavía no existe un Delta Gastos reconciliado con esa rentabilidad.
- **Atribución:** no hay “-$X causados por volumen”.
- **Actionability:** no se usan `DIRECTAMENTE_ACCIONABLE` / `CONTROLABLE` / `NO_CONTROLABLE`. Sí se sugiere revisar primero variables comerciales observadas.
- **Bridge:** no se afirma `Delta rentabilidad = Delta Ingreso − Delta Gastos` ni variante.

La respuesta separa A resultado, B presión comercial, C límites.

## 6. AFTER

```text
TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001..007      PASS
R-MOVEMENT-001..008     PASS
R-DELTA-INCOME-001..010 PASS
R-DELTA-PARITY-001..010 PASS
R-DELTA-CUT-001..010    PASS
R-RENT-SNAPSHOT-001..010 PASS

HTTP 5xx            0
HARNESS FAILURE     0
PRE-DEPLOY --gate   PASS
```

R-RENT-SNAPSHOT cubre exactamente:

1. exact routing
2. standalone period
3. operativa vs final
4. rentabilidad genérica → final
5. Top clientes = source-of-truth Delta Ingreso
6. fact vs attribution
7. comments context not cause
8. Delta Gastos fail-closed
9. actionability fail-closed
10. no fake bridge

## 7. Suites relacionadas

Ejecutadas con `node --test` (planner, financial_diagnosis, IGF, profitability/actual, period, Delta Ingreso, comments/client_profile, continuity, fail-closed/M6/M9, commercial_trend, historical_margin, plant_diagnosis, CEL sprint1):

- financial_diagnosis, continuity, CEL executive status, M7 IGF, period-start, M9, Delta Ingreso parity/cut, client_profile, commercial_trend, historical_margin, plant_diagnosis, authoritative forecast pack, financial actual, M6: **PASS**
- `test/director-ia-sprint1-core-conversational-recovery.test.js` Q3 (`¿Cómo va el descuento de Acapulco este mes?` → planner `client_profile`): **FAIL preexistente**. Esta pregunta no contiene `rentabilidad`+`deterioro`/`provocando`. No es regresión de este slice. No se “arregló” el CEL Golden Set.

## 8. Archivos

Modificados:

- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- `lib/director-ia-planner.js`
- `lib/director-ia-chat.js`
- `test/fixtures/director-ia-golden-cases.js`
- `test/helpers/director-ia-runtime-golden-harness.js`

Nuevos:

- `lib/director-ia-rentabilidad-deterioro-snapshot.js`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001.md`

No tocados: `docs/director-ia/`, frontend, DB/schema/migrations, Action Register, Delta Gastos, bridge, Shapley/OAT, controlability contract.

## 9. Commit

`allowed_actions` no incluye commit. No se creó SHA. Working tree permanece con cambios locales.

## 10. STOP

DONE_PENDING_REVIEW.

No merge. No deploy. No next task. No LIVE_DB.
