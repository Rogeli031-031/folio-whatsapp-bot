task_id: FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001

task_type: FIX
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-05T20:07:15-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - IMPLEMENTATION ONLY; NO MERGE; NO DEPLOY; NO LIVE_DB"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001.md

objective: Hacer que el snapshot de rentabilidad use, en periodo B abierto, el mismo upload_day efectivo que IGF Forecast ARR antes de computeIgfForecastMiniPayload, sin nueva fórmula y sin tocar Delta Ingreso.

in_scope:
  - resolver canónico de último corte mensual (loadArrLastUploadDay / resolveUploadDayLikeClientesPorMes o equivalente ya usado)
  - loadKpiForMonth(B) / cableado mínimo del snapshot para pasar upload_day al mini
  - R-RENT-CUT-001..010 (solo tras G1; ANTES de producto; sin mockear loadRentabilidadKpis)
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-UPLOAD-DAY-MINI-PARITY-001.md

out_of_scope:
  - nueva fórmula de rentabilidad
  - computeDeltaIngresoClientesPorMes
  - computeClientesDescuentoMes
  - ingresoClienteMarginal
  - resolveUploadDayLikeClientesPorMes (salvo extracción mecánica que preserve comportamiento)
  - effective PROY target (salvo reutilizar el existente)
  - Delta Gastos
  - bridge rentabilidad
  - driver attribution
  - Shapley
  - OAT
  - controlability
  - comments
  - Action Register
  - last purchase
  - commitments
  - alerts
  - DB/schema
  - migrations
  - frontend
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
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001.md

allowed_actions:
  - (solo tras G1 humano) regression-first: crear R-RENT-CUT-001..010 ANTES de producto
  - (solo tras G1 y BEFORE rojo) cablear upload_day canónico en loadKpiForMonth(B) / mini
  - ejecutar TIER1 / RUNTIME / MOVEMENT / DELTA-* / R-RENT-SNAPSHOT / PRE-DEPLOY --gate
  - redactar el reporte en result_report_path
  - dejar DONE_PENDING_REVIEW, STOPPED o BLOCKED

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - crear, borrar o modificar authorized_by, authorized_at o human_authorization
  - implementar o escribir tests mientras status sea DRAFT
  - mockear loadRentabilidadKpis con constantes en R-RENT-CUT
  - crear un tercer resolver SQL de upload_day si existe el canónico
  - hardcodear planta, mes, importes o upload_day en producto
  - modificar Delta Ingreso salvo extracción mecánica que preserve tests verdes
  - consultar LIVE_DB
  - modificar docs/director-ia/
  - merge/push a main
  - deploy
  - abrir siguiente tarea

## Estado

DONE_PENDING_REVIEW.

B_UPLOAD_DAY eliminado en loadKpiForMonth(B) vía resolveUploadDayLikeClientesPorMes.
R-RENT-CUT-001..010 PASS. PRE-DEPLOY --gate PASS.
Commit bloqueado por allowed_actions.
No merge. No deploy. No next task.

## Precondición

CLOSED e integrada por humano:

AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001

Hallazgo contractual:

RENTABILITY_B_FIRST_BAD_BOUNDARY = B_UPLOAD_DAY

No reabrir búsqueda general de rentabilidad.

## Evidencia LIVE (crítica; no reconsultar producción)

Planta:
Acapulco

Periodo:
Agosto 2026 real vs Septiembre 2026 forecast.

Dashboard ARR:

A resultado_final:
$1,073,657

B resultado_final:
-$80,735

Delta:
-$1,154,392

Director IA antes del FIX:

A resultado_final:
$1,073,657

B resultado_final:
-$9,565,353

Delta:
-$10,639,010

Diferencia B:
$9,484,618

Auditoría demostró:

- A cerrado coincide.
- B abierto diverge.
- Dashboard y Director IA usan el mismo computeIgfForecastMiniPayload.
- Dashboard B abierto: resolve upload_day → forecast completo.
- Director IA B abierto: upload_day=null → fechaCorte="" → isCorteEnMes=false → enableLookback=false → sin remaining-day forecast → MTD.
- corporativos B coinciden.
- resultado_final solo propaga util_oper incorrecto.
- Delta Ingreso clientes NO participa.

## North Star

Hacer que el snapshot de rentabilidad de Director IA utilice para el periodo B abierto
el mismo corte efectivo que IGF Forecast ARR antes de llamar:

computeIgfForecastMiniPayload

Sin crear otra fórmula y sin modificar Delta Ingreso.

## Source of truth

Reutilizar el resolver físico ya existente de último corte mensual.

Preferencia:

loadArrLastUploadDay
/ resolveUploadDayLikeClientesPorMes

o el helper canónico equivalente ya utilizado realmente.

NO duplicar SQL ni crear un tercer resolver si puede reutilizarse el existente.

## Semántica

Para periodo cerrado:

mantener comportamiento actual.

Para periodo abierto:

resolver upload_day correspondiente al año/mes B.

Pasar ese corte al mismo:

computeIgfForecastMiniPayload

que utiliza la arquitectura existente.

No cambiar fórmula de rentabilidad.

## Regression-first

Crear un pack nuevo que NO mockee loadRentabilidadKpis con constantes.

Nombre propuesto:

R-RENT-CUT-001..010

Debe probar la frontera física real.

### R-RENT-CUT-001

A cerrado permanece real independientemente de upload_day B.

### R-RENT-CUT-002

B abierto con upload_day=null reproduce MTD incorrecto BEFORE.

### R-RENT-CUT-003

Resolver last-upload mensual produce fecha de corte esperada.

### R-RENT-CUT-004

El upload_day resuelto llega a computeIgfForecastMiniPayload.

### R-RENT-CUT-005

B venta forecast coincide con Dashboard fixture.

### R-RENT-CUT-006

B util_oper_importe coincide con Dashboard fixture.

### R-RENT-CUT-007

B resultado_final_importe coincide con Dashboard fixture.

### R-RENT-CUT-008

Delta A→B coincide con Dashboard fixture.

### R-RENT-CUT-009

Corporativos no cambian por este FIX.

### R-RENT-CUT-010

Delta Ingreso path permanece independiente y no se modifica.

## BEFORE

Antes de producto ejecutar:

TIER 1
R-RUNTIME
R-MOVEMENT
R-DELTA-INCOME
R-DELTA-PARITY
R-DELTA-CUT
R-RENT-SNAPSHOT

Todos los existentes deben permanecer PASS.

R-RENT-CUT nuevo debe demostrar el defecto.

Como mínimo BEFORE deben fallar los casos relacionados con:

- upload_day propagation;
- B forecast;
- util_oper B;
- resultado_final B;
- delta A/B.

Si el nuevo pack queda completamente verde antes del cambio:
STOP.

No aceptar un fixture que vuelva a mockear el KPI final.

## FIRST_BAD_BOUNDARY

Reproducir:

snapshot
→ loadKpiForMonth(B)
→ computeIgfForecastMiniPayload
→ upload_day=null
→ fechaCorte=""
→ isCorteEnMes=false
→ enableLookback=false
→ no remaining-day forecast
→ MTD
→ util_oper incorrecto
→ resultado_final incorrecto

Documentarlo en BEFORE.

## Implementación mínima

Cambiar solo la ruta necesaria para que:

loadKpiForMonth(B)

resuelva un upload_day canónico y lo suministre al mini.

No transformar este cambio en comportamiento global si otros consumidores requieren semántica distinta.

Preferir dependency injection/helper reutilizable si la arquitectura actual ya lo soporta.

## No duplicación

No escribir otra función que:

SELECT MAX(upload_day...)

si ya existe resolver canónico.

Una sola semántica de corte.

## Closed month

No alterar agosto cerrado.

Un periodo cerrado debe seguir usando real.

R-RENT-CUT-001 debe protegerlo.

## Open month

Septiembre abierto debe usar:

observado hasta corte
+
proyección correspondiente a días faltantes

según la lógica existente del mini.

No implementar nueva proyección.

## Corporativos

No modificar cálculo.

Auditoría demostró que corporativos B ya coinciden.

## Operativos

No modificar fórmula.

Si se corrigen como consecuencia de utilizar el bRes forecast correcto:
documentarlo.

No parchear el número.

## Rentabilidad final

No modificar fórmula.

Debe corregirse como consecuencia de util_oper correcto.

## Delta Ingreso

PROHIBIDO modificar sin evidencia nueva:

computeDeltaIngresoClientesPorMes
computeClientesDescuentoMes
ingresoClienteMarginal
resolveUploadDayLikeClientesPorMes
effective PROY target

salvo una extracción mecánica de helper común que preserve exactamente su comportamiento.

Si se extrae helper común:
todos los tests Delta deben permanecer verdes.

## No hardcode

No hardcodear:

2026-09
Acapulco
-$80,735
1,474
upload_day específico

en producto.

Solo fixtures pueden usar números determinísticos.

## False-green prevention

R-RENT-SNAPSHOT actual mockea loadRentabilidadKpis.

No eliminarlo.

El nuevo R-RENT-CUT debe ir una capa abajo y demostrar la integración:

resolver corte
→ mini
→ util_oper
→ resultado_final

Expected y actual no pueden usar el mismo mock/función de manera circular.

## LIVE_DB

NO.

Todo regression-first debe ejecutarse con fixtures determinísticos.

Validación LIVE después del deploy humano.

## AFTER

Obligatorio:

TIER 1 PASS
R-RUNTIME PASS
R-MOVEMENT PASS
R-DELTA-INCOME PASS
R-DELTA-PARITY PASS
R-DELTA-CUT PASS
R-RENT-SNAPSHOT PASS
R-RENT-CUT-001..010 PASS

HTTP 5xx = 0
HARNESS FAILURE = 0

PRE-DEPLOY --gate PASS

Ejecutar suites relacionadas con:

IGF mini
forecast
upload_day
period
profitability
financial_diagnosis
Delta Ingreso
planner
runtime

## Validación esperada post-deploy

La pregunta:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

debe seguir routeando al snapshot.

Para el mismo cut LIVE, el KPI B de Director IA debe coincidir con
IGF Forecast ARR.

La validación debe comparar como mínimo:

A final
B final
Delta final
A operativa
B operativa
Delta operativa

No aceptar únicamente "más cercano".

## Completion

DONE_PENDING_REVIEW.

B_UPLOAD_DAY eliminado. R-RENT-CUT 001..010 PASS. Suites anteriores PASS.
PRE-DEPLOY PASS. COMMIT_BLOCKED_BY_ALLOWED_ACTIONS.

No merge.
No deploy.
No next task.

STOP.
