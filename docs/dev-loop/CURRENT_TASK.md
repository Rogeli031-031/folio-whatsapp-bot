task_id: AUDIT-DIRECTOR-IA-RENTABILIDAD-LIVE-UPLOAD-DAY-RUNTIME-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-05T20:47:13-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - READ_ONLY AUDIT + MINIMAL LIVE_DB READ-ONLY PROBES; NO IMPLEMENTATION; NO MERGE; NO DEPLOY"
implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: YES

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-LIVE-UPLOAD-DAY-RUNTIME-001.md

objective: Determinar qué upload_day y qué camino físico utiliza realmente el snapshot LIVE de Director IA para septiembre 2026, sin implementar.

in_scope:
  - lectura de configureDirectorIaChat / assembleRentabilidadDeterioroSnapshot / loadKpiForMonth / resolveOpenMonthUploadDay / resolveUploadDayLikeClientesPorMes / loadIgfForecastMiniPayload / computeIgfForecastMiniPayload
  - todos los configureDirectorIaChat del repo
  - posible bypass por deps.loadRentabilidadKpis
  - pérdida de upload_day en dependency injection
  - diferencia entre cut Dashboard y latest arr.upload_log
  - posible estado/cut explícito del frontend (solo lectura)
  - preparación (no ejecución) de probes read-only si hace falta LIVE_DB
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-LIVE-UPLOAD-DAY-RUNTIME-001.md

out_of_scope:
  - reabrir B_UPLOAD_DAY
  - reabrir DEPLOY_STALE
  - implementación
  - tests
  - modificar Delta Ingreso
  - modificar fórmula de rentabilidad
  - crear endpoint debug
  - agregar logging productivo
  - Action Register
  - docs/director-ia/
  - LIVE_DB (salvo Gate separado; este DRAFT no lo autoriza)
  - merge
  - deploy
  - next task

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001.md

allowed_actions:
  - ninguna hasta G1 humano
  - (solo tras G1) lectura física del wiring
  - (solo tras G1) redactar el reporte
  - (solo tras G1) preparar probes read-only sin ejecutarlos si live_db_authorized es NO
  - (solo tras G1) dejar DONE_PENDING_REVIEW o BLOCKED_NEEDS_LIVE_DB

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - crear, borrar o modificar authorized_by, authorized_at o human_authorization
  - implementar o escribir tests mientras status sea DRAFT
  - consultar LIVE_DB
  - reabrir hipótesis DEPLOY_STALE
  - volver a modificar B_UPLOAD_DAY
  - modificar producto, tests o Delta Ingreso
  - merge/push a main
  - deploy
  - abrir siguiente tarea

## Estado

DONE_PENDING_REVIEW.

HUMAN_EXECUTED_LIVE_DB_EVIDENCE: arr.upload_log = 0 filas → resolver null.
LIVE_RENTABILITY_CUT_FIRST_BAD_BOUNDARY = UPLOAD_DAY_QUERY_RESULT.

No implementación.
No FIX.
No next task.

## Precondición

Debe estar CLOSED en HEAD:

FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001

Hecho ya confirmado. No reconsultar:

Render está LIVE en merge

15d07879a086676c6d07d7b7e0018eda87772ba7

Una prueba nueva después de Ctrl+F5 sigue dando exactamente los números MTD.

Por tanto:

DEPLOY_STALE = REJECTED

No investigar deploy stale.

## Evidencia LIVE post-FIX (crítica; no reconsultar producción)

Pregunta:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

Dashboard ARR:

Agosto final:
$1,073,657

Septiembre final:
-$80,735

Delta:
-$1,154,392

Dashboard septiembre venta:
1,474 ton

Director IA POST-DEPLOY (Ctrl+F5):

Agosto final:
$1,073,657

Septiembre final:
-$9,565,353

Septiembre operativa:
-$7,003,653

Delta:
-$10,639,010

La salida es exactamente la misma que antes del FIX.

## North Star

Determinar qué upload_day y qué camino físico utiliza realmente
el snapshot LIVE de Director IA para septiembre 2026.

No implementar.

## Pregunta central

El código actual hace:

mes abierto
→ resolveOpenMonthUploadDay
→ resolveUploadDayLikeClientesPorMes
→ loadIgfForecastMiniPayload
→ computeIgfForecastMiniPayload

¿Por qué LIVE sigue comportándose como upload_day=null?

## Wiring a auditar primero (tras G1; no ahora)

configureDirectorIaChat
→ assembleRentabilidadDeterioroSnapshot
→ loadKpiForMonth
→ resolveOpenMonthUploadDay
→ resolveUploadDayLikeClientesPorMes
→ loadIgfForecastMiniPayload
→ computeIgfForecastMiniPayload

Especialmente:

1. todos los configureDirectorIaChat del repo;
2. posible bypass por deps.loadRentabilidadKpis;
3. pérdida del upload_day en dependency injection;
4. diferencia entre cut Dashboard y latest arr.upload_log;
5. posible estado/cut explícito del frontend.

No volver a modificar B_UPLOAD_DAY.

## Etapa A — Wiring read-only

Auditar todas las llamadas y configuraciones de:

configureDirectorIaChat

Determinar si en runtime se inyecta:

loadRentabilidadKpis
loadIgfForecastMiniPayload
resolveUploadDay
pool
client
now
upload_day

Especialmente verificar el early return:

if (typeof deps.loadRentabilidadKpis === "function")

en loadKpiForMonth.

Determinar si alguna dependencia inyectada hace bypass de:

resolveOpenMonthUploadDay.

Buscar todas las llamadas a configureDirectorIaChat en repo.

No asumir que server.js tiene una sola.

## Etapa B — Cut source

Comparar físicamente:

Dashboard:
ArrClient.resolveUploadDayForMonth
GET /api/arr/last-upload-day
request upload_day enviado a /api/dashboard/igf-forecast-mini

vs

Director IA:
resolveUploadDayLikeClientesPorMes

Determinar si realmente utilizan el mismo valor en runtime.

No conformarse con que usen SQL parecido.

## Etapa C — Dashboard local state

Determinar si el Dashboard puede usar:

- upload_day explícito;
- proyeccion_hasta;
- estado React;
- corte seleccionado;
- valor persistido en URL/state;

que no necesariamente sea el último arr.upload_log mensual.

Responder:

¿el $-80,735 mostrado en Dashboard depende de un cut explícito distinto
al que Director IA resuelve automáticamente?

## Etapa D — LIVE probes

NO ejecutar mientras:

live_db_authorized: NO

Preparar únicamente probes mínimos read-only para un Gate LIVE_DB separado.

Los probes deberán poder demostrar:

1. Valor devuelto por:

resolveUploadDayLikeClientesPorMes(pool, 2026, 9)

2. Últimas filas relevantes de:

arr.upload_log

para septiembre 2026:

plant_code
uploaded_day
uploaded_at

Sin datos personales innecesarios.

3. Mini Acapulco con:

upload_day = null

capturando:

ventaTon
utilOperImporte
resultadoFinalImporte

4. Mini Acapulco con:

upload_day = resolvedUploadDay

capturando:

ventaTon
utilOperImporte
resultadoFinalImporte

5. Si existe un cut distinto usado por Dashboard,
mini con ese cut.

## Valores de control

Null/MTD observado LIVE:

util_oper:
-$7,003,653

resultado_final:
-$9,565,353

Dashboard:

venta:
1,474 ton

resultado_final:
-$80,735

Operativa Dashboard esperada según la misma relación con corporativos:

$2,480,965

No hardcodear estos valores en producto.

Solo son control de auditoría.

## Matriz obligatoria

Construir:

PATH
| UPLOAD_DAY
| VENTA_TON
| UTIL_OPER
| RESULTADO_FINAL
| MATCH DASHBOARD?

Como mínimo:

Dashboard request
Director resolver
Mini null
Mini resolved
Snapshot LIVE

## Hipótesis

H1
resolveUploadDayLikeClientesPorMes devuelve null en producción.

H2
Devuelve una fecha válida pero distinta al Dashboard.

H3
Dashboard usa un upload_day explícito/local distinto al latest mensual.

H4
loadKpiForMonth está siendo bypassed por loadRentabilidadKpis.

H5
Otra configureDirectorIaChat sobrescribe deps.

H6
loadIgfForecastMiniPayload recibe upload_day correcto pero lo pierde.

H7
computeIgfForecastMiniPayload recibe upload_day correcto pero produce MTD.

H8
El FIX funciona con fixture pero el fixture no representa arr.upload_log LIVE.

H9
El problema está en resolución de corte, no en fórmula financiera.

H10
Delta Ingreso sigue siendo independiente y no debe tocarse.

Clasificar:

PROVEN
REJECTED
NOT_PROVEN
NOT_PROVEN_WITHOUT_LIVE_DB

## First bad boundary

Entregar exactamente uno:

LIVE_RENTABILITY_CUT_FIRST_BAD_BOUNDARY

Posibles resultados:

RUNTIME_DEPENDENCY_BYPASS
UPLOAD_DAY_QUERY_RESULT
DASHBOARD_EXPLICIT_CUT
UPLOAD_DAY_PROPAGATION
MINI_CUT_INTERPRETATION
OTHER_PROVEN_BOUNDARY

No elegir por intuición.

## False green

Explicar por qué R-RENT-CUT pasa pero producción falla.

Determinar qué elemento de runtime no está representado en fixture:

- arr.upload_log real;
- dependency wiring;
- dashboard explicit cut;
- otro.

## Prohibiciones

No implementar.
No modificar tests.
No modificar Delta Ingreso.
No modificar fórmula de rentabilidad.
No crear endpoint debug.
No agregar logging productivo.
No consultar LIVE_DB sin Gate separado.
No Action Register.
No merge.
No deploy.
No reabrir B_UPLOAD_DAY.
No reabrir DEPLOY_STALE.

## Completion

DONE_PENDING_REVIEW.

H1 PROVEN. First bad boundary = UPLOAD_DAY_QUERY_RESULT.
No implementación. No merge. No deploy. No next task.

STOP.
