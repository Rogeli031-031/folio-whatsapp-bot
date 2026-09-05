task_id: AUDIT-DIRECTOR-IA-COMMERCIAL-MOVEMENT-DASHBOARD-PARITY-001

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-05T11:30:30-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - READ_ONLY AUDIT ONLY"
objective: Localizar físicamente la primera divergencia entre IGF Forecast ARR «Clientes por mes» y las respuestas de Director IA de movimiento comercial (aumentaron / disminuyeron / dejaron de comprar) para Acapulco, julio 2026 vs agosto 2026.

in_scope:
- lectura de la cadena dashboard IGF Forecast ARR «Clientes por mes» (UI → endpoint → helper → query/fuente → unidades → periodos)
- lectura de la cadena Director IA de movimiento comercial (planner → commercial_state/commercial_trend → loader/tool → query/fuente → unidades → periodos)
- frontend-dashboard/app/arr/ArrClient.tsx y helpers/export ARR relacionados con «Clientes por mes»
- endpoints/helpers ARR en server.js u otros loaders existentes de kg por cliente/mes
- lib/director-ia-planner.js
- lib/director-ia-chat.js (ruta commercial_trend / commercial_state / commercial_movers)
- lib/director-ia-commercial-trend.js
- lib/commercial-trend-engine.js
- lib/director-ia-commercial-state.js
- lib/delta-ingreso-forecast.js y loaders/tools de movers existentes
- test/fixtures/director-ia-golden-cases.js (solo lectura: G-MOVEMENT-UP/DOWN/STOPPED)
- test/helpers/director-ia-golden-harness.js (solo lectura)
- test/director-ia-commercial-movers-additive.test.js (solo lectura)
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/AUDIT-DIRECTOR-IA-COMMERCIAL-MOVEMENT-DASHBOARD-PARITY-001.md

out_of_scope:
- implementación o corrección de producto
- modificar tests / Golden / Runtime
- hardcodear 20 CUMBRES, NUEVA WAL MART, GRUPO MOVE, CARBURADORA MASTER o sus kg como solución
- DB/schema/migrations
- LIVE_DB (salvo nuevo G1 específico si el humano lo declara imprescindible)
- frontend de corrección
- docs/director-ia/
- contratos congelados
- continuidad margen-cliente → `como vamos?`
- merge a main
- deploy
- siguiente tarea

contracts_in_force:
- AGENTS.md
- docs/dev-loop/LOOP_PROTOCOL.md
- docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
- docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
- docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
- contratos vigentes aplicables (obedecer, no reescribir)

allowed_actions:
- (solo tras G1) crear rama audit/director-ia-commercial-movement-dashboard-parity-001
- auditoría READ-ONLY de ambas cadenas físicas
- comparar, para cada cliente de evidencia, dónde aparecen por primera vez valores distintos
- revisar cobertura actual de G-MOVEMENT-UP-001 / DOWN-001 / STOPPED-001 y por qué pudieron PASS sin detectar la divergencia
- proponer Runtime cases futuros de paridad semántica y numérica (no implementarlos)
- reporte final
- dejar DONE_PENDING_REVIEW

forbidden_actions:
- escribir AUTHORIZED_BY_HUMAN
- poner status AUTHORIZED
- crear, borrar o modificar authorized_by, authorized_at o human_authorization
- implementar o corregir producto
- modificar tests
- consultar LIVE_DB sin G1 específico nuevo
- hardcodear clientes o kg de evidencia como solución
- modificar docs/director-ia/
- merge/push a main
- deploy
- abrir siguiente tarea

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-COMMERCIAL-MOVEMENT-DASHBOARD-PARITY-001.md

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

## Estado

Auditoría READ-ONLY completa. Pendiente revisión humana. No merge. No deploy. No next task.

## Evidencia humana (LIVE; fija el caso de negocio, no es regla de producto)

Planta: Acapulco. Comparación: julio 2026 vs agosto 2026.

IGF Forecast ARR → «Clientes por mes» vs Director IA (movimiento comercial).

### 20 CUMBRES

Dashboard: julio 19,980 kg; agosto 23,652 kg; delta +3,672 kg  
Director IA: 17.118 → 20.790; delta +3.672 etiquetado como kg

### NUEVA WAL MART DE MEXICO

Dashboard: julio 55,473 kg; agosto 58,828 kg; delta +3,354 kg → AUMENTÓ  
Director IA: 56.602 → 52.698; delta -3.904 → DISMINUYÓ

### GRUPO MOVE EMPRESARIAL

Dashboard: julio 168,890 kg; agosto 150,199 kg; delta -18,691 kg  
Director IA: 160.149 → 145.076; delta -15.073

### CARBURADORA MASTER

Dashboard: julio 6,370 kg; agosto 459 kg; delta -5,911 kg → DISMINUYÓ, no dejó de comprar  
Director IA: 5.803 → 0; delta -5.803 → «Dejó de comprar»

Estos nombres e importes sirven solo como evidencia/fixture del caso. No se incrustan en producto.

## Objetivo de auditoría (tras G1; READ-ONLY)

Localizar la primera divergencia física entre los valores de «Clientes por mes» y las respuestas de Director IA para aumentaron / disminuyeron / dejaron de comprar.

Preguntas obligatorias:

1. Cadena física del dashboard: UI → endpoint → helper → query/fuente → unidades → periodos.
2. Cadena física de Director IA: planner → commercial_state/commercial_trend → loader/tool → query/fuente → unidades → periodos.
3. Para cada uno de los cuatro clientes: dónde aparecen por primera vez valores distintos.
4. Verificar si Director IA usa otra tabla, otro snapshot, otro corte, otro concepto (ingreso vs kg), toneladas en lugar de kg, forecast en lugar de real, otra comparación de meses, o una combinación.
5. Qué fuente representa hoy el contrato de negocio de «Clientes por mes» para kg julio, kg agosto y delta venta.
6. Por qué CARBURADORA MASTER termina con agosto=0 en Director IA si el dashboard muestra 459 kg.
7. Por qué NUEVA WAL MART cambia de signo (dashboard = aumentó; Director IA = disminuyó).
8. Qué cubren hoy los Golden/Runtime de movement-up / movement-down / movement-stopped y por qué pudieron PASS sin detectar esta divergencia de valores.
9. Proponer qué nuevos Runtime cases deben fijar paridad semántica y numérica **antes** de implementar cualquier corrección.

No implementar. No modificar tests. No hardcodear estos clientes como solución.

## Relación con otras tareas

`IMPL-DIRECTOR-IA-CLOSED-MONTH-MARGIN-FORECAST-CONTEXT-001` está CLOSED. Esta auditoría no la reabre.

No corrige `margen de ERICK → como vamos?`.

No convierte forecast en actual. No redefine movimiento comercial.

## Completion

DONE_PENDING_REVIEW.

NO implementar.
NO LIVE_DB.
NO merge.
NO deploy.
NO next task.

STOP.
