task_id: AUDIT-DIRECTOR-IA-DASHBOARD-EFFECTIVE-CUT-SOURCE-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-05T21:07:24-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - READ_ONLY AUDIT ONLY; NO IMPLEMENTATION; NO LIVE_DB; NO MERGE; NO DEPLOY"
implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DASHBOARD-EFFECTIVE-CUT-SOURCE-001.md

objective: Determinar de dónde obtiene IGF Forecast ARR el cut efectivo de septiembre 2026 cuando arr.upload_log LIVE está vacío, sin implementar.

in_scope:
  - frontend ARR/IGF Forecast
  - ArrClient.resolveUploadDayForMonth
  - upload_day
  - proyeccion_hasta
  - estado React relacionado con fecha/corte
  - query params relacionados con forecast
  - /api/arr/last-upload-day
  - /api/dashboard/igf-forecast
  - /api/dashboard/igf-forecast-mini
  - exportación Excel solo para comparar semántica de cut
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DASHBOARD-EFFECTIVE-CUT-SOURCE-001.md

out_of_scope:
  - implementación
  - tests
  - modificar arr.upload_log
  - crear tablas
  - insertar filas
  - migrations
  - modificar Director IA
  - modificar fórmula de rentabilidad
  - modificar Delta Ingreso
  - Action Register
  - docs/director-ia/
  - LIVE_DB
  - merge
  - deploy
  - next task

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-LIVE-UPLOAD-DAY-RUNTIME-001.md

allowed_actions:
  - ninguna hasta G1 humano
  - tras G1: inspección read-only de código
  - tras G1: redactar reporte
  - tras G1: preparar instrucciones de browser runtime evidence si fueran necesarias
  - tras G1: DONE_PENDING_REVIEW o BLOCKED

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - implementación
  - escribir tests
  - consultar LIVE_DB
  - crear/modificar DB/schema
  - insertar datos en arr.upload_log
  - merge/push main
  - deploy
  - abrir siguiente tarea

## Hechos ya demostrados

Producción:
arr.upload_log = 0 filas.

Por tanto:
resolveUploadDayLikeClientesPorMes(2026, 9) = null.

Director IA:
upload_day = null
→ septiembre se comporta como MTD.

LIVE_RENTABILITY_CUT_FIRST_BAD_BOUNDARY =
UPLOAD_DAY_QUERY_RESULT.

Valores observados:

Director IA septiembre:
resultado_final = -9,565,353
util_oper = -7,003,653

IGF Forecast ARR septiembre:
venta ≈ 1,474 ton
resultado_final ≈ -80,735

No reabrir DEPLOY_STALE.
No reabrir wiring del snapshot salvo evidencia nueva.

## Pregunta central

Si arr.upload_log está vacío:

¿de dónde obtiene IGF Forecast ARR el cut efectivo con el que calcula septiembre forecast?

## Trazabilidad obligatoria

Auditar físicamente:

ArrClient
→ inicialización de fecha/corte
→ resolveUploadDayForMonth
→ respuesta null de /api/arr/last-upload-day
→ fallback
→ estado React
→ upload_day
→ proyeccion_hasta
→ URL/query
→ /api/dashboard/igf-forecast
→ /api/dashboard/igf-forecast-mini
→ computeIgfForecastMiniPayload

Determinar todos los posibles orígenes de cut:

- último upload
- fecha actual
- último día con datos
- proyeccion_hasta
- query string
- selector UI
- estado persistido
- fecha derivada de ARR
- otro

## Version selection

Determinar si version_as_of_corte participa o no en los valores observados.

## Entregable

DASHBOARD_EFFECTIVE_CUT_SOURCE =
<fuente física demostrada | NOT_PROVEN>

DASHBOARD_EFFECTIVE_CUT_VALUE =
<YYYY-MM-DD | RUNTIME_REQUIRED>

Construir tabla:

SOURCE
| VALUE
| FALLBACK CONDITION
| REACHES IGF REQUEST?
| PROVEN?

Y cadena física:

source
→ frontend state
→ request
→ server uploadDay
→ mini

## Browser runtime

Si código permite varias rutas posibles y no puede determinar cuál ocurrió LIVE:

BLOCKED_NEEDS_BROWSER_RUNTIME_EVIDENCE

Preparar exactamente qué request mirar en DevTools Network:

- endpoint
- query string
- upload_day
- proyeccion_hasta
- version_as_of_corte

No pedir credenciales.
No LIVE_DB.

## Prohibiciones

No implementar.
No tests.
No crear tablas.
No poblar arr.upload_log.
No modificar DB.
No FIX.
No merge.
No deploy.
No next task.

## Completion

DRAFT.

Esperar G1 humano.

STOP.
