task_id: FIX-DIRECTOR-IA-COMMERCIAL-TREND-CALENDAR-PARITY-001

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-05T11:45:01-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05"
objective: En commercial_trend, meses calendario explícitos (p. ej. agosto comparado con julio) deben usar 2026-07-01..31 vs 2026-08-01..31, con unidades, delta, clasificación y recorte de lista coherentes; no trailing 30d.

in_scope:
- lib/director-ia-commercial-trend.js (resolución de periodo, prompt/builder de movers, unidades, recorte)
- lib/commercial-trend-engine.js solo si la ventana/clasificación/agregación de movers debe aceptar meses calendario sin romper trailing
- lib/director-ia-planner.js solo si el detector de meses explícitos ya existente debe reutilizarse sin reinterpretar intents
- lib/director-ia-chat.js solo la ruta commercial_trend / commercial_movers (presentación/transporte, no prosa parcheada)
- helper canónico de meses calendario de IGF Forecast ARR «Clientes por mes» (p. ej. computeClientesDescuentoMes / límites firstDay–lastDay) solo si es físicamente reutilizable sin coupling inapropiado
- test/fixtures/director-ia-golden-cases.js (familia R-MOVEMENT; no debilitar TIER 1 ni R-RUNTIME-001..007)
- test/helpers/director-ia-runtime-golden-harness.js
- test/helpers/director-ia-golden-harness.js solo si la observabilidad del Runtime Gate lo exige
- tests determinísticos de commercial_trend / movers físicamente afectados
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-COMMERCIAL-TREND-CALENDAR-PARITY-001.md

out_of_scope:
- nuevos vs reactivados
- definición histórica de cliente nuevo
- margen de cliente
- historical_margin
- Action Register
- DICF / commercial_state como motor de estas listas
- DB/schema/migrations
- LIVE_DB
- frontend / IGF Forecast ARR UI
- docs/director-ia/
- contratos congelados
- convertir trailing 30d en calendario siempre
- parchear prosa LLM para esconder números incorrectos
- hardcodear 20 CUMBRES, NUEVA WAL MART, GRUPO MOVE, CARBURADORA MASTER o sus kg LIVE como reglas de producto
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
- docs/dev-loop/reports/AUDIT-DIRECTOR-IA-COMMERCIAL-MOVEMENT-DASHBOARD-PARITY-001.md (evidencia CLOSED; no reabre la auditoría)

allowed_actions:
- (solo tras G1) crear rama fix/director-ia-commercial-trend-calendar-parity-001
- primero endurecer PRE-DEPLOY Runtime Gate (R-MOVEMENT-001..008) con fixtures determinísticos
- ejecutar BEFORE de TIER 1 y PRE-DEPLOY Runtime Gate
- STOP si R-MOVEMENT no queda FAIL o si TIER 1 / R-RUNTIME-001..007 se debilitan
- después del BEFORE rojo, cambio mínimo en la frontera PERIOD (meses explícitos → calendario completo)
- en el mismo slice: UNITS, DELTA/clasificación y LIST COMPLETENESS según las reglas de esta tarea
- tests determinísticos de observabilidad, no para acomodar el producto
- commit en la rama de tarea
- reporte final
- dejar DONE_PENDING_REVIEW

forbidden_actions:
- escribir AUTHORIZED_BY_HUMAN
- poner status AUTHORIZED
- crear, borrar o modificar authorized_by, authorized_at o human_authorization
- implementar antes de G1
- implementar producto antes de endurecer el Runtime Gate y registrar BEFORE rojo
- cambiar la semántica de «últimos 30 días» / «últimas 4 semanas» / trailing
- clasificar STOPPED si kg_B > 0
- etiquetar toneladas como kg
- afirmar lista completa si solo se transportó Top 6
- parchear prosa final para acomodar números incorrectos
- hardcodear clientes o kg LIVE de evidencia como solución
- consultar LIVE_DB
- modificar docs/director-ia/
- merge/push a main
- deploy
- abrir siguiente tarea

max_attempts: 1

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-COMMERCIAL-TREND-CALENDAR-PARITY-001.md

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

## Estado

DRAFT. No hay Gate G1. No es ejecutable.

## Relación con la auditoría CLOSED

`AUDIT-DIRECTOR-IA-COMMERCIAL-MOVEMENT-DASHBOARD-PARITY-001` está CLOSED e integrada. Esta tarea no la reabre. Usa su FIRST_BAD_BOUNDARY:

- principal: PERIOD
- secundarios: UNIT_LABEL, CLASSIFICATION, LIST_COMPLETENESS

No corrige nuevos vs reactivados. No toca margen de cliente ni historical_margin.

## Evidencia humana (fija el caso de negocio; no es regla de producto)

Pregunta tipo `agosto comparado con julio`. Planta de evidencia: Acapulco. No hardcodear en producto.

### 20 CUMBRES

Dashboard: 19,980 → 23,652 kg = +3,672 kg

### NUEVA WAL MART DE MEXICO

Dashboard: 55,473 → 58,828 kg → AUMENTÓ  
Director IA (antes): 56.602 → 52.698, DISMINUYÓ

### GRUPO MOVE EMPRESARIAL

Dashboard: 168,890 → 150,199 kg = −18,691 kg

### CARBURADORA MASTER

Dashboard: 6,370 → 459 kg → DISMINUYÓ, no «dejó de comprar»

Estos nombres e importes sirven solo como evidencia/fixture. No se incrustan en producto.

## Objetivo de producto (después del BEFORE)

Preguntas con meses calendario explícitos (p. ej. `agosto comparado con julio`) en la familia `commercial_trend`:

Periodo A = 2026-07-01..2026-07-31  
Periodo B = 2026-08-01..2026-08-31  

No ventanas trailing 30d ancladas a `MAX(fecha)`.

Reutilizar, si es físicamente apropiado, la misma resolución de meses calendario que IGF Forecast ARR → Clientes por mes. No duplicar lógica de calendario si ya existe una función canónica.

### 1. PERIOD

Meses explícitos (`julio`, `agosto`, etc.) → meses calendario completos.

No cambiar preguntas que pidan de verdad:
- últimos 30 días
- últimas 4 semanas
- trailing period

La corrección es: explicit calendar month names → calendar month boundaries.  
No: `commercial_trend` siempre calendario.

### 2. UNITS

`arr.ventas_diarias_cliente` entrega kg.

Si internamente `kg / 1000 = toneladas`, la salida se etiqueta `t`.  
Si se responde en kg: no dividir por 1000.

Nunca: `3.672` etiquetado como `3.672 kg` cuando significa `3.672 t = 3,672 kg`.

Aceptable: `3,672 kg` o `3.672 t`, según el contrato de presentación que elija el FIX (uno solo, consistente).

### 3. DELTA / clasificación

Comparación de compra:

- `delta_kg = kg_B - kg_A`
- AUMENTÓ: `delta_kg > 0`
- DISMINUYÓ: `kg_A > 0` AND `kg_B > 0` AND `delta_kg < 0`
- DEJÓ DE COMPRAR: `kg_A > 0` AND `kg_B = 0`

No clasificar STOPPED a quien tenga `kg_B > 0`.

### 4. LIST COMPLETENESS

Auditar el Top 6 actual.

Para `¿Qué clientes aumentaron/disminuyeron/dejaron de comprar...?` sin `principales` / `top` / `más relevantes`:

- devolver lista completa si la arquitectura lo permite razonablemente; o
- declarar explícitamente Top N / recorte y total encontrado.

No afirmar «Estos son los clientes» si solo se transportó Top 6.

## Orden de ejecución (obligatorio)

### Paso 1 — Endurecer Runtime Gate (antes de producto)

Añadir familia `R-MOVEMENT` con fixtures determinísticos. No hardcodear clientes LIVE en producto. Los kg del harness son genéricos equivalentes a la evidencia.

**R-MOVEMENT-001** — bases + delta (equivalente conceptual 20 CUMBRES: 19,980 → 23,652). Expected +3,672 kg. Comprobar A, B, delta, signo y unidad. No basta intent.

**R-MOVEMENT-002** — SIGN PARITY (equivalente NUEVA WAL MART: 55,473 → 58,828). Expected AUMENTÓ y +3,355 kg según el fixture exacto coherente. Debe FAIL si una ventana alternativa cambia el signo.

**R-MOVEMENT-003** — disminuyó (equivalente GRUPO MOVE: A > B > 0). Expected DISMINUYÓ. Prohibido STOPPED.

**R-MOVEMENT-004** — partial remaining purchase (equivalente CARBURADORA: 6,370 → 459). Expected DISMINUYÓ. Prohibido DEJÓ DE COMPRAR.

**R-MOVEMENT-005** — stopped (A > 0, B = 0). Expected DEJÓ DE COMPRAR.

**R-MOVEMENT-006** — units. FAIL ante `3.672` etiquetado como kg si internamente es toneladas. PASS `3,672 kg` o `3.672 t`.

**R-MOVEMENT-007** — explicit calendar months. Pregunta `agosto comparado con julio`. Expected `calendar_month` A/B. Prohibido `trailing_30d`.

**R-MOVEMENT-008** — completeness. Si el loader encuentra N y transporta < N, la respuesta debe expresar recorte/Top N. No fingir FULL_LIST.

No debilitar TIER 1 ni R-RUNTIME-001..007.

### Paso 2 — BEFORE

Desde origin/main (tras G1). Rama propuesta:

`fix/director-ia-commercial-trend-calendar-parity-001`

Ejecutar:

`npm run test:director-ia:golden`

y:

`npm run test:director-ia:predeploy -- --gate`

BEFORE esperado **antes** del FIX:

- TIER 1 intacto PASS
- R-RUNTIME-001..007 PASS
- R-MOVEMENT-001..008 reproducen los defectos actuales (FAIL)
- PRE-DEPLOY GATE = FAIL

Si los nuevos casos no quedan rojos, o TIER 1 / 001–007 no permanecen PASS: STOP. No modificar producto.

### Paso 3 — FIX (solo si el BEFORE coincide)

Corregir la primera frontera causal (PERIOD). No parchear prosa final.

En el mismo slice: UNITS, DELTA/clasificación, LIST COMPLETENESS.

Preguntas trailing reales siguen trailing.

## Protección

TIER 1 PASS. R-RUNTIME-001..007 no se debilitan. `últimos 30 días` sigue siendo trailing 30d.

## Objetivo AFTER

TIER 1 PASS  
R-RUNTIME-001..007 PASS  
R-MOVEMENT-001..008 PASS  
HARNESS FAILURE = 0  
PRE-DEPLOY GATE = PASS  

Si solo una parte cabe, no falsear verde.

## Evidencia final

1. diff del Runtime Gate (R-MOVEMENT-001..008);
2. BEFORE rojo de R-MOVEMENT y PASS de TIER 1 / R-RUNTIME-001..007;
3. FIRST_BAD_BOUNDARY de los casos rojos;
4. frontera causal corregida (PERIOD + UNITS + CLASSIFICATION + COMPLETENESS);
5. AFTER TIER 1 / RUNTIME / GATE;
6. confirmación de que trailing 30d no se convirtió en calendario;
7. confirmación de que no se hardcodearon los clientes LIVE;
8. commit SHA;
9. git status --short.

## Completion

DRAFT. Esperar G1 humano.

NO G1.
NO implementar.
NO tests todavía.
NO LIVE_DB.
NO merge.
NO deploy.
NO next task.

STOP.
