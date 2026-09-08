# AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARISON-500-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARISON-500-001"
outcome: "DONE"
mode: "READ_ONLY"
implementation: false
source_code_changed: false
test_code_changed: false
sql_changed: false
live_db: false
base_main_sha: "c78dd860ad7b7cebefc0e130c2b6c643fc111c61"
branch: "audit/director-ia-historical-margin-comparison-500-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "FIX-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARE-HTTP-STATUS-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy. No implementación en esta tarea."
```

## Hallazgo

El HTTP 500 de «cambio en el margen entre mayo y junio» **no es un throw**.
No es OpenAI. No es parser. No es financial_diagnosis.

Es el mismo intent `historical_margin` que el caso de un mes.
La primera divergencia es `resolveHistoricalMarginRequest`: dos meses nombrados → `compare_months`.

`compare_months` ya existe. Carga mayo y junio con el mismo loader IGF.
Si **ningún** mes es FINAL válido, el payload sale `ok:false`, `veracity=DATA_NOT_FOUND`, **sin `status`**.
`handlePostChat` hace `result.status || (result.ok ? 200 : 500)` → **500**.

El mes único con NOT_FINAL + FORECAST vigente (el caso Acapulco mayo ≈ 7.35) sale `ok:true`, `status:200`.
`buildCompareAnswer` **no** reutiliza `forecast_context`. Por eso mayo FORECAST no salva la comparación.

Reproducido sin LIVE_DB con fixture Acapulco-like (mayo FORECAST 7.35, junio ausente o FORECAST).

---

AUDIT_RESULT:

QUESTION_SINGLE_MAY_ROUTE:
POST /api/director-ia/chat → handlePostChat → askDirectorIa → plan intent=historical_margin → loadHistoricalMarginForChat → operation=single_month → buildHistoricalMarginChatResult → HTTP status del payload (200 si FORECAST usable)

QUESTION_SINGLE_JUNE_ROUTE:
igual que mayo; operation=single_month sobre junio; status 200/404/500 según loadPeriod (404 si NO_VERSION; 200 si NOT_FINAL+FORECAST usable)

QUESTION_COMPARE_ROUTE:
mismo POST/handler/planner/intent; resolveHistoricalMarginRequest → operation=compare_months → loadPeriod(mayo)+loadPeriod(junio) → buildCompareAnswer → payload sin status si ambos no-FINAL → handlePostChat L6208 sintetiza HTTP 500

SINGLE_MAY_INTENT:
historical_margin

SINGLE_JUNE_INTENT:
historical_margin

COMPARE_INTENT:
historical_margin

SINGLE_MAY_PERIOD_OBJECT:
{ operation: "single_month", period_source: "named_month", periods: [{ year: 2026, month: 5, kind: "closed_month" }] }
No hay period / period_a / period_b / range.

SINGLE_JUNE_PERIOD_OBJECT:
{ operation: "single_month", period_source: "named_month", periods: [{ year: 2026, month: 6, kind: "closed_month" }] }

COMPARE_PERIOD_OBJECT:
{ operation: "compare_months", period_source: "two_named_months", periods: [{ year: 2026, month: 5, kind: "closed_month" }, { year: 2026, month: 6, kind: "closed_month" }] }
Año implícito = año CDMX de `now`. No hay RANGE inclusivo. No hay period_a/period_b.

SINGLE_PERIOD_MARGIN_SUPPORTED:
YES

TWO_PERIOD_MARGIN_SUPPORTED:
YES

MARGIN_DELTA_SUPPORTED:
PARTIAL
(solo si ambos son closed_month + status=valid + truth_class=ACTUAL_FINANCIAL; no hay delta FORECAST↔FORECAST ni mixto)

MAY_MARGIN_SOURCE:
igf.versions + igf.compromiso_lines (queryVersions / queryLatestVersion / queryLines; CLOSED_SOURCES)

JUNE_MARGIN_SOURCE:
la misma

COMPARE_MARGIN_SOURCE:
la misma, dos loadPeriod

FIRST_DIVERGENCE:
lib/director-ia-historical-margin.js resolveHistoricalMarginRequest L205-216
mentions.length >= 2 → compare_months
vs mentions.length === 1 → single_month
Planner/routing aún idénticos.

FIRST_THROW_SITE:
NONE
El 500 reproducido no es excepción.

ERROR_TYPE:
HTTP_STATUS_SYNTHESIS
ok:false + status ausente + veracity DATA_NOT_FOUND mapeado a 500

ERROR_MESSAGE:
NONE (no throw)
El body JSON sí trae compare_answer:
"Mayo 2026: sin margen FINAL defendible.
Junio 2026: sin margen FINAL defendible.
No calculo variación: los periodos no comparten semántica histórica FINAL homogénea."
NOT_PROVEN el texto exacto que vio el cliente en Render (no logs).

HTTP_500_CATCH_SITE:
lib/director-ia-chat.js handlePostChat L6208
`const status = result.status || (result.ok ? 200 : 500);`
El catch L6210-6212 NO se dispara en el probe.

OPENAI_CALLED_BEFORE_FAILURE:
NO

DB_CALLED_BEFORE_FAILURE:
YES
(compare llama queryVersions mayo y junio; si mayo es NOT_FINAL también queryLatestVersion+queryLines.
LIVE_DB de producción = NOT_PROVEN; el probe inyecta stubs.)

MAY_DATA_REQUIRED:
YES (para responder el mes; para el 500 no: el 500 ocurre aunque mayo tenga FORECAST usable)

JUNE_DATA_REQUIRED:
YES para delta comparable; NO para provocar el 500 (junio ausente o FORECAST-only ambos dan 500)

JUNE_ABSENCE_COLLAPSES_TO_ZERO:
NO
margin_kg permanece null; delta_raw=null; no se hace Number(null).

PARSER_BUG:
NO

ROUTING_BUG:
NO

PERIOD_MODEL_BUG:
NO

LOADER_BUG:
NO
(loadPeriod/args válidos; misma fuente que el mes único)

NULL_HANDLING_BUG:
NO

FORMATTER_BUG:
NO
(el compare_answer es string válido; no tira.
Limitación: no usa forecast_context, a diferencia de buildSingleAnswer.)

HTTP_ERROR_HANDLING_BUG:
YES

DATA_BUG:
NOT_PROVEN
(producción mayo es FORECAST no FINAL; junio no se inspeccionó. El 500 no requiere dato corrupto.)

CAN_FIX_WITHOUT_NEW_SQL:
YES

RECOMMENDED_NEXT_SLICE:
FIX-DIRECTOR-IA-HISTORICAL-MARGIN-COMPARE-HTTP-STATUS-001
Poner `status` en el return de compare_months (200/404 como single_month; DATA_NOT_FOUND no es 500).
Opcional: mostrar forecast_context en compare sin calcular delta FINAL.
No SQL. No LIVE_DB. No tocar temporal safety de financial_diagnosis.

FILES_INSPECTED:
- lib/director-ia-historical-margin.js
- lib/director-ia-chat.js (historical_margin branch; handlePostChat)
- lib/director-ia-planner.js (isHistoricalMarginQuestion gate)
- test/director-ia-historical-margin.test.js
- server.js (POST /api/director-ia/chat → handlePostChat)

TESTS_RUN:
- test/director-ia-historical-margin.test.js 35/35 PASS (existente; no cubre S3 HTTP 500)
- probe read-only fuera del repo: S1–S5 planner + load stubs (mayo FORECAST 7.35; junio missing/FORECAST/FINAL/null)

RISKS:
- El cliente ve HTTP 500 aunque el body ya tenga respuesta determinista.
- Un FIX que calcule delta entre dos FORECAST como si fueran FINAL violaría FORECAST != FINAL.
- LIVE junio (¿NO_VERSION vs FORECAST vs FINAL?) no está probado.

STOP.

---

## Traza física

```
POST /api/director-ia/chat
  server.js → directorIaChat.handlePostChat
    askDirectorIa
      planDirectorIaQuestion
        isHistoricalMarginQuestion → true (tiene "margen" + mes nombrado)
        intent = historical_margin   // S1, S2, S3, S4, S5
      loadHistoricalMarginForChat
        resolveHistoricalMarginRequest(question, now)
        loadPeriod × N
        buildSingleAnswer | buildCompareAnswer
      buildHistoricalMarginChatResult   // openai_called: false
    HTTP = result.status || (result.ok ? 200 : 500)
```

No entra financial_diagnosis / igf_status / arr_status.
No llama OpenAI.
No hay validator post-generation.

## Period parser

`findMonthMentions` + `mentions.length >= 2` → compare.
Cubierto: "entre mayo y junio", "de mayo a junio", "mayo contra junio", "mayo y junio".
Año implícito = `cdmxTodayParts(now).year` (2026 con now=2026-09-08).
No existe objeto RANGE. No existe period_a/period_b.

## Single vs compare (mayo FORECAST 7.35)

single_month NOT_FINAL + forecast válido:
- ok=true, status=200, SOURCE_PARTIAL
- texto: «última proyección disponible (FORECAST, vista vigente) … 7.35 $/kg»

compare_months mismo mayo + junio missing o FORECAST:
- ok=false, **status ausente**, DATA_NOT_FOUND
- forecast_context de mayo **se carga** y **no se usa** en el answer
- HTTP 500

compare ambos FINAL:
- ok=true, comparable=true, delta_raw=B−A, HTTP 200

junio margen null (FINAL row):
- status=missing reason=NULL_MARGIN, margin_kg=null, no 0
- si mayo FINAL válido: ok=true SOURCE_PARTIAL HTTP 200

## Contrato de ausencia

null / NOT_FINAL / NO_VERSION / NULL_MARGIN no se convierten en 0 en compare.
`Number(margin)` solo corre si `comparable===true` (ambos valid FINAL).

## Relación con Financial Diagnosis

Ninguna. Intent `historical_margin` in-process.
No se tocó el temporal safety gate.

## Probe (sin LIVE_DB)

now = 2026-09-08 America/Mexico_City implícito vía Date local de fixture.
Auth stub ZP. Planta Acapulco inyectada.

| Caso | HTTP probe | ok | status payload |
| S1 mayo FORECAST 7.35 | 200 | true | 200 |
| S2 junio NO_VERSION | 404 | false | 404 |
| S3/S4/S5 mayo FORECAST + junio missing | 500 | false | undefined |
| S3 ambos FORECAST | 500 | false | undefined |
| S3 ambos FINAL | 200 | true | undefined (ok salva) |
| S3 mayo FINAL + junio null | 200 | true | undefined |
