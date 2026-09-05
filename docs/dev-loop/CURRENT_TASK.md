task_id: FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-05T12:59:25-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05"
objective: Hacer que Director IA responda el mayor impacto negativo de ingreso forecast del mes explícito (Top N + comentarios) reutilizando el helper Forecast de periodo solicitado, no kg ni M9 ni computeDicf anclado a MAX(fecha).

in_scope:
  - lib/director-ia-planner.js (solo detector/routing de impacto negativo / delta ingreso + periodo)
  - lib/director-ia-commercial-trend.js (solo para que comentarios no secuestre el dominio a kg)
  - lib/director-ia-chat.js (solo ruta delta income forecast)
  - lib/director-ia-tools.js / capabilities solo si el intent/tool forecast debe declararse sin reinterpretar contratos
  - lib/delta-ingreso-forecast.js (reutilizar computeDeltaIngresoForecast; no tercera fórmula)
  - lib/dicf.js solo si puede resolverse el mismo periodo solicitado sin MAX(fecha) indebido
  - lib/cliente-comentarios.js (join de comentarios; no causalidad)
  - test/fixtures/director-ia-golden-cases.js (R-DELTA-INCOME-001..010; no debilitar TIER 1 / R-RUNTIME / R-MOVEMENT)
  - test/helpers/director-ia-runtime-golden-harness.js
  - tests determinísticos físicamente afectados
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001.md

out_of_scope:
  - nueva fórmula de rentabilidad
  - Delta Gastos
  - alertas automáticas
  - notificaciones
  - nuevos vs reactivados
  - cumplimiento automático de compromisos
  - causal inference
  - HG si no está en fuente
  - DB/schema/migrations
  - frontend
  - docs/director-ia/
  - contratos congelados
  - LIVE_DB
  - merge
  - deploy
  - next task
  - planner → computeDicf como atajo si el periodo explícito queda anclado a MAX(fecha)

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-NEGATIVE-IMPACT-COMMENTS-001.md (evidencia CLOSED; no reabre la auditoría)
  - contratos vigentes aplicables (obedecer, no reescribir)

allowed_actions:
  - (solo tras G1 humano) endurecer primero PRE-DEPLOY Runtime Gate R-DELTA-INCOME-001..010
  - BEFORE: TIER 1 / R-RUNTIME / R-MOVEMENT PASS y R-DELTA-INCOME rojo; STOP si no reproduce
  - reutilizar computeDeltaIngresoForecast si representa Forecast + periodoB explícito
  - reutilizar computeDicf solo si el mismo periodo solicitado es defendible sin MAX(fecha) incorrecto
  - join de comentarios por identidad compatible con la gráfica (nombre), no repetir el fallo cliente_key
  - respuesta determinista/grounded; no parchear solo prosa
  - reporte y commit en rama de tarea
  - dejar DONE_PENDING_REVIEW

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - crear, borrar o modificar authorized_by, authorized_at o human_authorization
  - implementar antes de G1
  - implementar producto antes del Runtime Gate y BEFORE rojo
  - convertir planner → computeDicf si septiembre queda anclado a MAX(fecha)=agosto
  - usar commercial_trend / kg como sustituto de Delta Ingreso MXN
  - usar M9 histórico como respuesta de forecast de septiembre
  - convertir comentario en causa
  - hardcodear BAYAM u otros clientes LIVE
  - consultar LIVE_DB
  - modificar docs/director-ia/
  - merge/push a main
  - deploy
  - abrir siguiente tarea

max_attempts: 1

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001.md

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

## Estado

DRAFT. No hay Gate G1. No es ejecutable.

## North Star

Director IA debe ayudar a aumentar mes con mes la rentabilidad operativa y final.

La prioridad ejecutiva es detectar qué clientes deterioran más el Delta Ingreso del periodo forecast para poder enfocar seguimiento y acción.

Conceptualmente:

Rentabilidad Forecast
=
Rentabilidad mes anterior
+ Delta Ingreso
- Delta Gastos

Esta tarea NO implementa una nueva fórmula de rentabilidad.

Trabaja únicamente sobre el Delta Ingreso por cliente que ya existe físicamente.

## Pregunta objetivo

`Dame 5 clientes que tengan el mayor impacto negativo en el ingreso para el mes de septiembre, y ponme sus comentarios.`

Debe responder usando Delta Ingreso en MXN.

NO usar movimiento de kg como sustituto.

## Auditoría CLOSED de origen

Usar como evidencia:

AUDIT-DIRECTOR-IA-DELTA-INGRESO-NEGATIVE-IMPACT-COMMENTS-001

Hallazgos:

FIRST_BAD_BOUNDARY:
PLANNER

Secundarios:
- forecast source/routing;
- explicit month resolution;
- comments identity;
- no Runtime coverage.

La auditoría demostró:

- el Dashboard ya calcula Delta Ingreso;
- `computeDeltaIngresoForecast` representa una ruta Forecast;
- `computeDicf` contiene información ejecutiva similar, pero está anclada a `MAX(fecha)`;
- `get_delta_income` actual usa M9 histórico y NO representa el forecast solicitado;
- `commercial_trend` representa kg y NO es la fuente correcta;
- comentarios están en `arr.cliente_comentarios`;
- gráfica consulta comentarios por nombre;
- modal DICF por `cliente_key`;
- comentario no demuestra causalidad.

## Regla semántica principal

Preguntas con:

`delta ingreso`
`impacto negativo en ingreso`
`clientes que más afectan el ingreso`
`clientes que más deterioran el ingreso`
`mayor impacto negativo`

más un periodo/mes

deben resolver a Delta Ingreso, NO a `commercial_trend`.

Agregar `comentarios` no debe cambiar el dominio primario hacia movimientos de kg.

## Fuente correcta

NO asumir automáticamente que `computeDicf` es la fuente primaria.

Antes de implementar, determinar cuál helper existente representa exactamente:

Delta Ingreso Forecast
+
periodo explícitamente solicitado.

Regla:

si el usuario pregunta `septiembre`, el cálculo debe corresponder a septiembre.

No aceptar:

`MAX(fecha)=agosto`
→ responder agosto
→ etiquetar septiembre.

Preferencia:

reutilizar `computeDeltaIngresoForecast` si es la superficie física que ya representa Forecast para un `periodoB` explícito.

`computeDicf` puede reutilizarse solamente si se le puede suministrar o resolver de forma defendible el mismo periodo solicitado sin depender incorrectamente de `MAX(fecha)`.

No crear una tercera fórmula paralela.

## Fórmula

No reinventar.

Mantener la fórmula física existente de la fuente seleccionada.

La auditoría encontró conceptualmente:

Ingreso = kg × (margen IGF − |descuento/kg|)
Delta Ingreso = Ingreso B − Ingreso A

Pero el FIX debe reutilizar el helper actual, no reimplementar esta aritmética en Director IA.

Unidad:
MXN.

## Ranking

Para:

`5 clientes con mayor impacto negativo`

usar filas con:

delta_ingreso < 0

orden:

más negativo → menos negativo

y:

Top N = N pedido por el usuario.

Ejemplo conceptual:

-250000
-180000
-120000
-90000
-50000

No ordenar por valor absoluto mezclando signos.

No incluir positivos.

## Top N

Resolver números naturales solicitados:

`5 clientes`
`10 clientes`
etc.

Si no se indica N, usar una política existente defendible y declarar el alcance.

La respuesta debe declarar:

- total de clientes negativos encontrados, si está disponible;
- Top N mostrado;
- impacto combinado del Top N.

## Impacto agregado

Para las filas mostradas:

impacto_top_n =
SUM(delta_ingreso)

Debe conservar signo negativo.

No presentarlo como rentabilidad final.

Puede decir:

`Estos 5 clientes acumulan un Delta Ingreso de -$X`

No decir:

`La rentabilidad caerá -$X`

salvo que exista evidencia adicional.

## Periodo explícito

`septiembre`
→ resolver septiembre del año correspondiente según las reglas de periodo ya existentes.

Debe distinguir:

A = periodo base
B = periodo forecast solicitado.

La respuesta debe expresar qué está comparando.

Ejemplo:

`Agosto 2026 real vs septiembre 2026 forecast`

solo si ésa es físicamente la semántica de la fuente.

No inventar CLOSED/FINAL.

## Comentarios

Enriquecer cada cliente mostrado con comentarios de:

arr.cliente_comentarios

Debe usar una unión compatible con la identidad disponible en la fuente Delta Ingreso.

La auditoría demostró que `cliente_key` DICF puede no coincidir con la forma en que se guardó el comentario.

No repetir esa falla.

Prioridad de identidad:

1. identidad canónica existente, si puede probarse;
2. nombre normalizado dentro de la misma planta, si ésa es la unión física ya usada por la gráfica;
3. DATA_NOT_FOUND si no puede resolverse inequívocamente.

No realizar fuzzy match peligroso.

## Comentario más reciente

Si hay varios comentarios:

devolver el más reciente por fecha.

Idealmente incluir:

- fecha;
- texto.

Si no existe comentario:

`Sin comentario registrado`

o contrato equivalente de ausencia.

Nunca inventar texto.

## Comentario ≠ causa

Prohibido transformar automáticamente:

`comentario: baja ocupación`

en:

`La causa de la caída fue baja ocupación`

salvo que exista una clasificación/atribución explícita y defendible.

Presentar como:

`Comentario registrado: ...`

## Drivers

Cuando estén físicamente disponibles en el objeto reutilizado, pueden enriquecer la respuesta:

- kg A/B;
- descuento A/B;
- margen de planta;
- clasificación disminuyó/dejó;
- otros drivers existentes.

NO son obligatorios para cerrar este slice salvo lo requerido por Runtime.

HG queda fuera si la cadena no lo provee.

No implementar causal inference.

## Regression-first obligatorio

ANTES de modificar producto, ampliar PRE-DEPLOY Runtime Gate.

Crear:

R-DELTA-INCOME-001..010

### R-DELTA-INCOME-001 — routing

Pregunta:

`Dame 5 clientes que tengan el mayor impacto negativo en el ingreso para septiembre.`

Expected:

delta_income_forecast / metric pack equivalente

NO:

commercial_trend
client_profile

Debe observar Runtime completo.

### R-DELTA-INCOME-002 — explicit period

Pregunta sobre septiembre.

Expected:
B = septiembre solicitado.

NO:
periodo silenciosamente anclado a MAX(fecha) de agosto.

### R-DELTA-INCOME-003 — MXN / sign

Fixture determinístico con Delta Ingreso negativo.

Comprobar:

- unidad MXN;
- signo;
- valor.

No aceptar kg como métrica primaria.

### R-DELTA-INCOME-004 — Top 5 ordering

Fixture con más de 5 clientes negativos.

Expected:
exactamente los cinco más negativos y orden correcto.

### R-DELTA-INCOME-005 — comments enrichment

Cliente del Top N con comentario.

Expected:
comentario correcto + fecha.

### R-DELTA-INCOME-006 — missing comment

Cliente sin comentario.

Expected:
ausencia explícita.

No inventar.

### R-DELTA-INCOME-007 — no causal hallucination

Comentario disponible.

Expected:
puede mostrar comentario.

Prohibido:
convertirlo automáticamente en causa demostrada.

### R-DELTA-INCOME-008 — identity parity

Delta Ingreso usa una identidad;
comentario está asociado mediante la ruta compatible.

Debe reproducir conceptualmente el fallo BAYAM:
nombre puede encontrar comentario aunque un cliente_key incompatible no lo haga.

No hardcodear BAYAM en producto.

### R-DELTA-INCOME-009 — aggregate Top N

Comprobar suma de los cinco delta_ingreso mostrados.

### R-DELTA-INCOME-010 — forecast vs historical source

Pregunta de forecast de septiembre.

Expected:
ruta forecast.

Prohibido:
M9 histórico de dos meses reales.

## BEFORE obligatorio

Antes de tocar producto:

TIER 1 existente:
PASS

R-RUNTIME existente:
PASS

R-MOVEMENT existente:
PASS

R-DELTA-INCOME nuevos:
deben reproducir los defectos actuales.

Como mínimo deben estar rojos:

001 routing
002 period
004 Top N
005 comments
010 forecast source

PRE-DEPLOY:
FAIL

Si no reproduce el problema:
STOP.

No implementar.

## AFTER objetivo

TIER 1:
PASS

R-RUNTIME:
PASS

R-MOVEMENT:
PASS

R-DELTA-INCOME-001..010:
PASS

HTTP 5xx:
0

PRE-DEPLOY:
PASS

## Product change

Corregir la primera frontera causal:

PLANNER / routing

pero no detenerse allí si la ruta seleccionada todavía apunta a M9 histórico o periodo incorrecto.

La cadena final debe ser:

pregunta
→ delta income forecast intent
→ periodo explícito
→ helper forecast existente
→ negativos
→ ranking
→ Top N
→ comments enrichment
→ respuesta determinista/grounded

No parchear únicamente prompt final.

## Protecciones

No romper:

commercial_trend
calendar movement
historical delta income
client_profile
historical_margin
DICF existente
IGF Forecast ARR frontend

## Out of scope

- nueva fórmula de rentabilidad;
- Delta Gastos;
- alertas automáticas;
- notificaciones;
- nuevos vs reactivados;
- cumplimiento automático de compromisos;
- causal inference;
- HG si no está en fuente;
- DB/schema/migrations;
- frontend;
- contracts;
- LIVE_DB;
- merge;
- deploy;
- next task.

## LIVE_DB

live_db_authorized: NO

No hace falta para el regression-first ni para implementar reutilizando helpers existentes.

Validación exacta de producción se hará después del deploy.

No consultar producción durante la tarea.

## Completion

DRAFT.

Esperar G1 humano.

No implementar.
No tests todavía.
No merge.
No deploy.

STOP.
