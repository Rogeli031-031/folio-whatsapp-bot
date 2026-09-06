task_id: AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-05T19:56:48-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - READ_ONLY AUDIT ONLY; NO IMPLEMENTATION; NO LIVE_DB"
implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001.md

objective: Localizar el primer input físico divergente entre Dashboard ARR y Director IA para la rentabilidad de septiembre B (forecast), dado que agosto A coincide exactamente y la diferencia en B es $9,484,618.

in_scope:
  - traza read-only Dashboard ARR (ArrClient / IGF Forecast / PROY / mini / recalcularUtilYResultado / render RENTABILIDAD)
  - traza read-only Director IA (rentabilidad_deterioro_snapshot / loader mini IGF / periodo A / periodo B)
  - comparación input-por-input de septiembre B
  - hipótesis H1–H14 (PROVEN / REJECTED / NOT_PROVEN)
  - reconciliación de $9,484,618
  - probes read-only mínimos redactados, no ejecutados
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-SNAPSHOT-DASHBOARD-PARITY-001.md

out_of_scope:
  - implementación
  - tests nuevos
  - LIVE_DB
  - Delta Ingreso (no modificar ni recomendar cambios salvo evidencia física de que participa en ESTE defecto)
  - computeDeltaIngresoClientesPorMes
  - computeClientesDescuentoMes
  - ingresoClienteMarginal
  - effective PROY target (salvo evidencia física de que participa en ESTE defecto)
  - Delta Gastos
  - driver attribution
  - controlabilidad
  - comments
  - Action Register
  - frontend changes
  - DB/schema
  - migrations
  - docs/director-ia/
  - merge
  - deploy
  - next task

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ACTIONABLE-DRIVERS-001.md

allowed_actions:
  - (solo tras G1 humano) traza read-only de código y fixtures
  - (solo tras G1 humano) redactar probes LIVE read-only; no ejecutarlos
  - (solo tras G1 humano) escribir el reporte en result_report_path
  - dejar DONE_PENDING_REVIEW, STOPPED o BLOCKED

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - crear, borrar o modificar authorized_by, authorized_at o human_authorization
  - implementar
  - escribir tests
  - consultar LIVE_DB
  - asumir MTD vs forecast sin demostrarlo o rechazarlo
  - modificar Delta Ingreso
  - modificar docs/director-ia/
  - merge/push a main
  - deploy
  - abrir siguiente tarea

## Estado

DRAFT. No hay Gate G1. No es ejecutable.

No implementar.
No escribir tests.
No LIVE_DB.

## North Star

Localizar físicamente por qué Director IA y el Dashboard ARR producen distinta
rentabilidad para el periodo B abierto/forecast, mientras el periodo A real
coincide exactamente.

NO implementar.

## Evidencia LIVE (crítica; no reconsultar producción en esta tarea)

Planta:
Acapulco

Comparación:
Agosto 2026 real vs Septiembre 2026 forecast

DASHBOARD ARR

Agosto:
resultado_final = 1,073,657

Septiembre:
resultado_final = -80,735

Delta:
-1,154,392

Campos visibles septiembre:

venta = 1,474
margen = 7.12
descuento = -0.20
operativos = 9,945,756
corporativos = 2,561,700
gasto = 12,507,456
HG = 12.00
HG$ = 12.57
impuestos = 0.93
casa = 900.63
comisionista = 572.90
rentabilidad = -80,735

DIRECTOR IA

Agosto:
resultado_final_importe = 1,073,657

Septiembre:
resultado_final_importe = -9,565,353

Delta:
-10,639,010

util_oper_importe septiembre:
-7,003,653

Diferencia Dashboard vs Director IA en B:
9,484,618 MXN

Observación importante:

Director IA:

-7,003,653 - 2,561,700 = -9,565,353

Por tanto corporativos B coincide físicamente con Dashboard.

La divergencia parece estar antes de resultado_final_importe,
en la construcción de util_oper_importe B.

NO asumir root cause todavía.

NO asumir MTD vs forecast.
Demostrarlo o rechazarlo.

## Pregunta fundamental

¿Por qué:

A real Dashboard = A real Director IA

pero:

B forecast Dashboard != B forecast Director IA?

Quiero localizar el primer input divergente entre Dashboard ARR
y Director IA para septiembre B.

Especial atención a:

effective PROY
venta forecast
upload_day
version
financial_state
recalcularUtilYResultado
raw stored fields
MTD vs forecast

No tocar Delta Ingreso.

## Traza obligatoria Dashboard

Trazar físicamente:

ArrClient / IGF Forecast ARR
→ selección Agosto / Septiembre
→ workspace / PROY
→ effective target
→ venta forecast
→ margen
→ descuento
→ HG
→ operativos
→ corporativos
→ impuestos
→ recalcularUtilYResultado
→ util_oper_importe
→ resultado_final_importe
→ render RENTABILIDAD

Identificar:

archivo
función
inputs
version
PROY/compromiso
upload_day
forecast state
overlays/simulations
rounding

## Traza obligatoria Director IA

Trazar:

pregunta rentabilidad deterioro
→ rentabilidad_deterioro_snapshot
→ loader de mini IGF
→ periodo A
→ periodo B
→ version
→ forecast state
→ util_oper_importe
→ resultado_final_importe

Determinar si Director IA:

A. lee campos almacenados directamente;
B. llama recalcularUtilYResultado;
C. reconstruye el forecast;
D. usa compromiso crudo;
E. usa PROY efectivo;
F. usa MTD actual;
G. mezcla MTD con gastos forecast;
H. utiliza otra versión.

No asumir ninguna.

## FIRST BAD BOUNDARY

Comparar Dashboard vs Director IA input por input para B:

venta_ton
margen
descuento
HG
HG$
operativos
corporativos
impuestos
casa
comisionista
util_oper_importe
resultado_final_importe

Encontrar el PRIMER input divergente.

Nombrar exactamente:

RENTABILITY_B_FIRST_BAD_BOUNDARY

Posibles fronteras a investigar, no asumir:

B_PERIOD_SOURCE
B_FINANCIAL_STATE
B_VERSION_SELECTION
B_EFFECTIVE_PROY_SOURCE
B_UPLOAD_DAY
B_SALES_FORECAST
B_RECALCULATION
B_MTD_VS_FORECAST
B_OVERLAY
B_SIMULATION_STATE

## Hipótesis

Clasificar PROVEN / REJECTED / NOT_PROVEN.

H1
Director IA usa MTD para ingreso/venta B y gastos forecast mensuales.

H2
Director IA no aplica el mismo PROY efectivo que ARR.

H3
Dashboard llama recalcularUtilYResultado y Director IA reutiliza valores raw.

H4
La versión IGF seleccionada es distinta.

H5
El upload_day es distinto.

H6
Margen B diverge.

H7
Descuento B diverge.

H8
HG/HG$ B diverge.

H9
Operativos B divergen.

H10
Corporativos B divergen.

H11
El error nace antes de util_oper_importe.

H12
resultado_final_importe solo propaga correctamente el error de util_oper_importe.

H13
Delta Ingreso clientes es independiente de este defecto y no debe modificarse.

H14
Estado React/simulación local explica la diferencia.

## Reconciliación

Reproducir matemáticamente con fixtures/helpers reales:

Dashboard B:
inputs
→ util_oper
→ resultado_final

Director IA B:
inputs
→ util_oper
→ resultado_final

La diferencia final debe reconciliarse hasta explicar los:

9,484,618 MXN

No basta localizar dos valores distintos.

Debe demostrarse qué input produce la divergencia.

## Protección de Delta Ingreso

NO modificar ni recomendar cambios a:

computeDeltaIngresoClientesPorMes
computeClientesDescuentoMes
ingresoClienteMarginal
effective PROY target

salvo evidencia física directa de que participan en ESTE defecto.

## LIVE_DB

NO.

Si no puede demostrarse el valor exacto sin producción:

NOT_PROVEN_WITHOUT_LIVE_DB

Preparar probes read-only mínimos, pero no ejecutarlos.

## Entregables (solo tras G1)

Executive summary.
Dashboard physical chain.
Director IA physical chain.
A parity explanation.
B input-by-input comparison.
RENTABILITY_B_FIRST_BAD_BOUNDARY.
H1-H14 disposition.
Exact 9,484,618 reconciliation.
Root cause.
Why existing regression suite was false-green.
Minimum future regression cases.
Recommended minimum FIX.
git status.

## Completion

DRAFT.

Esperar G1 humano.

No implementar.
No escribir tests.
No LIVE_DB.
No merge.
No deploy.

Tras G1, el auditor deja DONE_PENDING_REVIEW si el primer punto físico de
divergencia queda demostrado, o BLOCKED si requiere LIVE_DB.

STOP.
