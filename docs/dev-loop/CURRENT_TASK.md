task_id: FIX-DIRECTOR-IA-CLIENT-MARGIN-SEMANTIC-ROUTING-001

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-02T21:22:25-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-02"
objective: Endurecer el Runtime Gate y, solo después del BEFORE rojo, enrutar semánticamente margen de planta (IGF) vs margen con cliente explícito (descuento/kg histórico ARR), sin tocar la continuidad historical_margin → como vamos?.

in_scope:
- test/fixtures/director-ia-golden-cases.js
- test/helpers/director-ia-runtime-golden-harness.js
- test/helpers/director-ia-golden-harness.js solo si la observabilidad del Runtime Gate lo exige
- código productivo de Director IA estrictamente causal al enrutado semántico margen-planta vs margen-cliente (planner/chat/metric-pack)
- tests determinísticos existentes de historical-margin, client-profile, planner y Runtime Gate
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENT-MARGIN-SEMANTIC-ROUTING-001.md

out_of_scope:
- continuidad `historical_margin` / aclaración de cliente → `como vamos?`
- cualquier caso nuevo o fix cuyo único objetivo sea esa secuencia
- DB/schema/migrations
- LIVE_DB
- frontend / IGF Forecast ARR UI
- Action Register
- Folios
- docs/director-ia/
- nuevos contratos
- merge a main
- deploy
- siguiente tarea
- hardcode de ERICK, agosto, 0.93 o 7.32 en producto

contracts_in_force:
- AGENTS.md
- docs/dev-loop/LOOP_PROTOCOL.md
- docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
- docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
- contratos vigentes aplicables de Director IA (obedecer, no reescribir)

allowed_actions:
- (solo tras G1) crear rama fix/director-ia-client-margin-semantic-routing-001 desde origin/main limpio
- primero endurecer Runtime Gate (R-RUNTIME-001 + protección planta)
- ejecutar BEFORE de TIER 1 y PRE-DEPLOY Runtime Gate
- STOP si el BEFORE no queda rojo en R-RUNTIME-001 o si la protección de planta no permanece PASS
- después del BEFORE rojo, cambio mínimo en la frontera causal de routing/metric-pack
- tests determinísticos necesarios para observabilidad, no para acomodar el producto
- commit en la rama de tarea
- reporte final
- dejar DONE_PENDING_REVIEW

forbidden_actions:
- escribir AUTHORIZED_BY_HUMAN
- poner status AUTHORIZED
- crear, borrar o modificar authorized_by, authorized_at o human_authorization
- implementar antes de G1
- implementar el fix de producto antes de endurecer el Runtime Gate y registrar BEFORE rojo
- corregir `como vamos?` después de un turno de margen/cliente
- cambiar Golden/Runtime expectations para obtener PASS artificial (el endurecimiento de R-RUNTIME-001 y el alta de la protección de planta sí están in_scope; no debilitar R-RUNTIME-002..004 ni TIER 1)
- hardcodear ERICK, agosto, 0.93 o 7.32 en producto
- hacer que mocks seleccionen artificialmente la ruta esperada
- inventar margen IGF de cliente
- consultar LIVE_DB
- merge/push a main
- deploy
- abrir siguiente tarea

max_attempts: 1

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENT-MARGIN-SEMANTIC-ROUTING-001.md

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

## Estado

DRAFT. No hay Gate G1. No es ejecutable.

## Contrato de negocio confirmado (evidencia humana, dashboard IGF Forecast ARR / Acapulco)

No son reglas de producto hardcodeadas. Son el criterio semántico que el Runtime Gate debe exigir y que el FIX debe implementar de forma general.

1. `margen` sin cliente, referido a planta/mes:
   corresponde a `margen_kg` de IGF de planta (`historical_margin`).
   Evidencia de tablero: agosto ≈ 7.32 $/kg (fila MARGEN de la tabla mensual de planta).
   Pregunta de protección: `¿Cuál es el margen de agosto?`

2. `margen` con cliente explícito:
   en el lenguaje operativo del usuario corresponde al descuento/kg histórico del cliente mostrado en “Clientes por mes”, calculado desde ARR (`descuento/kg = SUM(monto)/SUM(kg)`).
   Evidencia de tablero: TORTILLERIA ERICK enero ≈ 0.93 $/kg (columna DESCUENTO ENERO; no existe columna MARGEN de cliente).
   Pregunta de R-RUNTIME-001: `Dame el margen histórico de TORTILLERIA ERICK de enero a agosto.`

ERICK, agosto, 0.93 y 7.32 sirven solo como evidencia/fixture. No se incrustan en producto.

## Relación con la tarea CLOSED

`FIX-DIRECTOR-IA-RUNTIME-METRIC-PACK-ROUTING-001` (CLOSED) dejó R-RUNTIME-001 en:

- la entidad de cliente participa;
- no se convierte silenciosamente en compare_months de planta;
- el pack de descuento estaba **prohibido**;
- no se exigía devolver descuento/kg histórico de cliente.

Esa expectativa queda **superada** por la evidencia de negocio. No se reabre aquella tarea. Esta es una tarea nueva.

El producto actual (anclar cliente + rechazar margen FINAL de planta + `parent_intent=historical_margin`) es el BEFORE esperado de R-RUNTIME-001 **después** de endurecer el gate.

## Orden de ejecución (obligatorio)

### Paso 1 — Endurecer el Runtime Gate (antes de tocar producto)

Actualizar R-RUNTIME-001 para exigir ruta/pack de **descuento histórico de cliente**, no solamente evitar margen de planta.

R-RUNTIME-001 actual (insuficiente):

- `expected_metrics: ["margen"]`
- `forbidden_packs` incluye `descuento`
- `must_return_client_margin` solo comprueba mención de entidad y ausencia de compare de planta

R-RUNTIME-001 requerido:

- la entidad explícita de cliente participa;
- la familia semántica es descuento/kg histórico de cliente (ARR / “Clientes por mes”), no `historical_margin` IGF de planta;
- pack/ruta de descuento histórico de cliente o `client_profile` comercial mensual que exponga esa métrica;
- `forbidden_packs` debe incluir `historical_margin` y packs de planta/CEL (`plant_diagnosis`, `daily_executive_brief`, `materialidad`, `dicf`);
- `forbidden_packs` **no** debe incluir `descuento`;
- no basta anclar el nombre y rechazar;
- no inventar `margen_kg` IGF a nivel cliente;
- no exigir el literal 0.93 en producto; puede usarse en fixture/evidencia si el harness aporta filas ARR.

Agregar protección (chat nuevo, sin cliente):

Pregunta exacta:

`¿Cuál es el margen de agosto?`

Expected:

- ruta/pack `historical_margin` IGF de planta;
- no enrutar a descuento de cliente ni a `client_profile`;
- no exigir el literal 7.32 en producto; puede usarse en fixture/evidencia si el harness aporta IGF FINAL.

Propuesta de id: `R-RUNTIME-005`. Si el harness exige otro id, documentarlo. No reutilizar R-RUNTIME-001..004.

No debilitar R-RUNTIME-002..004 ni los 8 casos TIER 1.

No añadir en esta tarea un caso `HM-cliente → como vamos?`.

### Paso 2 — BEFORE

Desde:

origin/main = 3a47a8fa5910bfeacf9eb740354b41bf64d50131

Rama propuesta (solo tras G1):

fix/director-ia-client-margin-semantic-routing-001

Ejecutar:

npm run test:director-ia:golden

y:

npm run test:director-ia:predeploy -- --gate

BEFORE esperado tras el endurecimiento, **antes** del FIX de producto:

- TIER 1: 8/8 PASS
- R-RUNTIME-001: FAIL (producto actual no entrega pack de descuento histórico de cliente)
- R-RUNTIME-002..004: PASS (no debilitar)
- R-RUNTIME-005 (o el id de protección planta): PASS
- PRE-DEPLOY GATE = FAIL por R-RUNTIME-001

Si R-RUNTIME-001 no queda rojo, o la protección de planta no queda PASS, STOP y reportar. No modificar producto.

### Paso 3 — FIX (solo si el BEFORE del Paso 2 coincide)

Enrutar semánticamente con reglas generales:

- cliente explícito + `margen` → métrica histórica de cliente/descuento (ARR), no `historical_margin` de planta
- planta/mes + `margen` sin cliente → `historical_margin` IGF (`margen_kg`)

No hardcodear cliente, mes ni importe.

No corregir todavía `como vamos?` después de esa conversación. Tras este FIX se volverá a reproducir esa secuencia: la causa (`parent_intent=historical_margin` del Turno 1) puede cambiar al corregirse el intent.

## Hipótesis de entrada (no es orden de parche)

El producto actual trata “margen histórico” como IGF de planta y, con cliente embebido, rechaza en vez de servir descuento/kg de cliente.

Cursor debe verificar físicamente:

INPUT
→ conversation state
→ planner
→ entity/metric/period resolution
→ route selection
→ metric-pack
→ tool/loaders
→ response

y corregir la primera frontera causal incorrecta. No arreglar solo la prosa.

## Protección contra regresión

TIER 1 debe permanecer 8/8 PASS.

R-RUNTIME-002..004 no se debilitan. Si el padre de 002 cambia de pack al corregir 001, re-observar el último turno; el expected de 002 sigue siendo pack/clarificación de descuento, no `historical_margin`.

No aplicar inherit-block en `conversation-state` que rompa el cruce diario venta↔descuento (`ayer` / `forceIntent`).

## Objetivo AFTER

TIER 1
8/8 PASS

RUNTIME
R-RUNTIME-001 PASS (descuento histórico de cliente, no rechazo ni compare de planta)
R-RUNTIME-002 PASS
R-RUNTIME-003 PASS
R-RUNTIME-004 PASS
R-RUNTIME-005 (protección planta) PASS

HARNESS FAILURE = 0
PRE-DEPLOY GATE = PASS

Si solo una parte cabe en alcance, no falsear verde.

## Evidencia final

1. diff del Runtime Gate (R-RUNTIME-001 + protección planta);
2. BEFORE rojo de R-RUNTIME-001 y PASS de la protección planta;
3. FIRST_BAD_BOUNDARY de R-RUNTIME-001 bajo la nueva expectativa;
4. frontera causal corregida;
5. AFTER TIER 1 / RUNTIME / GATE;
6. confirmación de que no se implementó `como vamos?` post-margen-cliente;
7. confirmación de que no se hardcodearon ERICK / agosto / 0.93 / 7.32;
8. commit SHA;
9. git status --short.

## Completion

status: DONE_PENDING_REVIEW

NO merge.
NO deploy.
NO next task.

STOP.
