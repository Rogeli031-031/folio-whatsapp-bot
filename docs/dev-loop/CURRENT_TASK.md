task_id: FIX-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-ROUTE-TO-CALENDAR-COMPARE-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"
authorized_at: "2026-09-08T18:01:06-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN. Corregir únicamente el routing y ranking de 'mayor pérdida de venta' histórica entre clientes usando calendar_compare existente. NO SQL nuevo. NO LIVE_DB. NO merge. NO deploy."

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 0a42123768829df7543888d0f84a0b084cf8645f
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-ROUTE-TO-CALENDAR-COMPARE-001.md

## North Star

Planta: Acapulco.

Pregunta exacta:

que cliente tiene la perdida mayor de venta entre mayo vs junio?

## Problema demostrado

Hoy:

planner/routing
→ client_profile
→ perfil de un cliente
→ posible ZERO_OBSERVED

Debe:

planner/routing
→ commercial_trend
→ calendar_compare
→ universo completo de clientes
→ ranking determinista de pérdida

## Periodos

A = mayo 2026
2026-05-01..2026-05-31

B = junio 2026
2026-06-01..2026-06-30

No trailing 30d.
No agosto-septiembre.
No M9.
No MTD.

## Fuente física existente

Reutilizar:

lib/director-ia-commercial-trend.js
calendar_compare
defaultQueryCalendarClientKg
buildCalendarMovers

Fuente:

arr.ventas_diarias_cliente

NO SQL nuevo.

## Decisión semántica humana

delta_kg = kg_b - kg_a

Para:

- mayor pérdida de venta
- perdió más venta
- mayor caída de venta
- cliente con mayor pérdida

candidatos:

delta_kg < 0

Incluye:

1. DISMINUYÓ
   kg_a > 0
   kg_b > 0
   kg_b < kg_a

2. DEJÓ DE COMPRAR
   kg_a > 0
   kg_b == 0

No incluye:

- AUMENTÓ
- NUEVO
- SIN_CAMBIO

Ganador:

el delta_kg MÁS NEGATIVO.

NO usar abs(delta_kg).

Ejemplo obligatorio:

Cliente A:
mayo 20,000
junio 12,000
delta -8,000

Cliente B:
mayo 15,000
junio 0
delta -15,000

Debe ganar Cliente B.

## Semántica que debe preservarse

"que cliente disminuyó más sus compras entre mayo y junio?"

Debe conservar únicamente:

kg_a > 0
kg_b > 0
delta_kg < 0

No incluir clientes que dejaron de comprar.

"que clientes dejaron de comprar entre mayo y junio?"

Debe conservar bucket perdido.

"que clientes aumentaron entre mayo y junio?"

Debe conservar bucket aumento.

## Routing obligatorio

Estas preguntas deben ir a commercial_trend/calendar_compare:

S1:
que cliente tiene la perdida mayor de venta entre mayo vs junio?

S2:
que cliente perdió más venta entre mayo y junio?

S7:
cual cliente tuvo la mayor perdida de ventas entre mayo y junio?

S8:
quien tuvo la mayor caída de venta entre mayo y junio?

El trigger debe ganar sobre client_profile aunque exista
identidad de cliente heredada en conversation_state.

No exigir cliente_key.

## Ranking

No reutilizar first_mover genérico si usa abs(delta).

Crear o derivar selección determinista:

loss_candidates =
all_calendar_movers.filter(delta_kg < 0)

worst_delta =
MIN(delta_kg)

winner =
cliente(s) con delta_kg == worst_delta

En empate exacto:

NO elegir arbitrariamente.
Reportar el empate de forma determinista.

## Respuesta esperada

Ejemplo:

Mayor pérdida de venta entre mayo 2026 y junio 2026:

CLIENTE X
Mayo: 15,000 kg
Junio: 0 kg
Pérdida: 15,000 kg

Además, dejó de comprar en junio.

O:

CLIENTE Y
Mayo: 20,000 kg
Junio: 12,000 kg
Pérdida: 8,000 kg

Clasificación: disminuyó.

## OpenAI

North Star debe resolverse determinísticamente.

OPENAI_CALLED = NO

No pedir al LLM seleccionar ganador.

## No corregir en este slice

NO tocar la semántica ZERO_OBSERVED de:

lib/director-ia-client-profile.js

Ese bug queda separado.

## No tocar

SQL
schema
dependencies
server.js
Financial Diagnosis
M9
M9 temporal safety
historical_margin
folios
Action Register

Preferir no modificar planner si basta ampliar el detector
semántico que ya consume el planner.

## Pruebas mínimas obligatorias

- BEFORE S1 = client_profile
- AFTER S1 = commercial_trend
- S1 period_kind = calendar_compare
- A = mayo 2026
- B = junio 2026
- S2/S7/S8 reconocidas
- identidad heredada no roba S1
- stopped buyer puede ganar
- decreased buyer puede ganar
- -15000 gana sobre -8000
- +50000 nunca gana como pérdida
- no abs ranking
- output kg_a
- output kg_b
- output pérdida
- indica dejó de comprar cuando corresponda
- indica disminuyó cuando corresponda
- empate no arbitrario
- S3 conserva disminución
- S5 conserva dejaron
- S6 conserva aumentaron
- OpenAI no llamado
- no client_profile change
- no M9 change
- no historical_margin change
- no SQL nuevo
- no LIVE_DB
- focal commercial-trend PASS
- focal planner PASS
- client-profile tests PASS
- Tier1 PASS
- pre-deploy --gate PASS
- NEW FAILURE = 0

## Completion

Si todo pasa:

CURRENT_TASK -> DONE_PENDING_REVIEW

Crear commit de implementación.

Crear reporte append-only:

docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENT-LARGEST-SALES-LOSS-ROUTE-TO-CALENDAR-COMPARE-001.md

STOP.

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente tarea.
