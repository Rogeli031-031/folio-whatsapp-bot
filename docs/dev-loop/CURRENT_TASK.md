task_id: AUDIT-DIRECTOR-IA-DELTA-INGRESO-NEGATIVE-IMPACT-COMMENTS-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-05T12:41:18-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - READ_ONLY AUDIT ONLY; NO LIVE_DB"
objective: Localizar físicamente cómo se calcula y expone el Delta Ingreso por cliente en IGF Forecast ARR / Delta Ingreso Forecast, y por qué Director IA no puede responder hoy cuáles son los clientes con mayor impacto negativo del mes junto con sus comentarios.

in_scope:
  - frontend IGF Forecast ARR relacionado con Delta Ingreso / Clientes por mes
  - lib/delta-ingreso-forecast.js
  - helpers/loaders/endpoints relacionados
  - server.js solo tracing
  - planner/capabilities de delta_income
  - director-ia-chat
  - tool orchestrator
  - loaders de comentarios de cliente
  - DICF solo si participa físicamente
  - Action Register solo si participa físicamente
  - tests existentes relacionados, solo lectura
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-NEGATIVE-IMPACT-COMMENTS-001.md

out_of_scope:
  - implementación
  - modificar tests
  - LIVE_DB
  - DB/schema/migrations
  - frontend changes
  - nuevos vs reactivados
  - movement calendar parity ya CLOSED
  - margen histórico
  - terminology margen cliente
  - dirty continuity `como vamos?`
  - creación de alertas
  - envío de notificaciones
  - cálculo nuevo de rentabilidad forecast
  - modificación de contratos congelados
  - merge
  - deploy
  - next task

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - contratos vigentes aplicables (obedecer, no reescribir)

allowed_actions:
  - (solo tras G1 humano) trazar en solo lectura las cadenas Dashboard y Director IA
  - escribir el reporte de auditoría
  - proponer Runtime regressions futuras sin implementarlas
  - si el código no alcanza: marcar NOT_PROVEN_WITHOUT_LIVE_DB y dejar SELECT read-only mínimo, sin ejecutarlos
  - dejar DONE_PENDING_REVIEW o BLOCKED

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - crear, borrar o modificar authorized_by, authorized_at o human_authorization
  - implementar producto
  - modificar tests
  - consultar LIVE_DB
  - hardcodear clientes o importes como regla
  - inventar causalidad o convertir comentarios en causas
  - modificar docs/director-ia/
  - merge/push a main
  - deploy
  - abrir siguiente tarea

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-NEGATIVE-IMPACT-COMMENTS-001.md

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

## Estado

DRAFT. No hay Gate G1. No es ejecutable.

## North Star de negocio

El objetivo ejecutivo principal de Director IA es ayudar a incrementar mes con mes:

- rentabilidad operativa;
- rentabilidad final;

y evitar retrocesos.

La lectura ejecutiva utilizada por negocio parte de:

Ingreso del mes anterior por cliente
vs
Ingreso proyectado / forecast del mes actual por cliente

La diferencia por cliente es:

Delta Ingreso cliente

Conceptualmente, para la lectura ejecutiva:

Rentabilidad forecast
=
Rentabilidad mes anterior
+ Delta Ingreso
- Delta Gastos

Esta tarea NO debe implementar ni reinterpretar esa fórmula.

Debe localizar físicamente qué datos existentes la soportan y cómo Director IA puede llegar posteriormente a los clientes que más deterioran la rentabilidad forecast.

## Pregunta LIVE que falla

Planta: Acapulco.

Pregunta exacta:

`Dame 5 clientes que tengan el mayor impacto negativo en el ingreso para el mes de septiembre, y ponme sus comentarios.`

Respuesta actual de Director IA:

`No puedo proporcionar información sobre los cinco clientes con mayor impacto negativo en el ingreso para el mes de septiembre, ya que no tengo acceso a los datos necesarios para realizar esa evaluación...`

Sin embargo, el Dashboard sí expone información por cliente en:

IGF Forecast ARR
→ Delta Ingreso / Delta Ingreso Forecast
→ Clientes por mes

Por tanto el audit debe determinar si el problema está en:

- capability/planner;
- routing;
- tool coverage;
- loader inexistente;
- fuente no expuesta a Director IA;
- periodo;
- ranking;
- comentarios;
- combinación de las anteriores.

No asumir.

## Evidencia adicional — BAYAM RESIDENCES

Existe otro síntoma relacionado.

En la gráfica / seguimiento del cliente BAYAM RESIDENCES aparece un comentario:

`EL DÍA LUNES 31 DE AGOSTO COMPRARÁ 3,000LTS TODO EN BASE A OCUPACION DEL CONDOMINIO`

Pero en otra superficie de Delta Ingreso Cliente Forecast aparece:

`Aún no hay comentarios.`

Director IA sí llegó a recuperar ese comentario en una respuesta previa.

Por tanto:

NO asumir que “comentarios” es una única fuente.

Auditar físicamente:

- qué fuente usa la gráfica;
- qué fuente usa el modal Delta Ingreso Cliente Forecast;
- qué fuente usa Director IA;
- por qué pueden divergir;
- cuál es la semántica de cada comentario.

## Pregunta de negocio objetivo futura

Después de un FIX posterior, Director IA debería poder resolver conceptualmente:

`Dame los 5 clientes que tienen mayor impacto negativo en el Delta Ingreso de septiembre y ponme sus comentarios.`

La respuesta debería poder distinguir:

- ranking;
- Delta Ingreso por cliente;
- suma del impacto de los Top 5;
- comentario disponible;
- fecha del comentario;
- fuente del comentario;
- ausencia real de comentario.

No implementar todavía.

## Definición que debe verificarse físicamente

NO asumir que ésta es la fórmula exacta del código.

El audit debe probar o rechazar si actualmente:

Delta Ingreso cliente
=
Ingreso proyectado mes actual
-
Ingreso mes anterior

Determinar:

1. qué representa `Ingreso A`;
2. qué representa `Ingreso B`;
3. qué periodo usa cada uno;
4. si B es FORECAST, ACTUAL, mezcla o snapshot;
5. qué versión/corte utiliza;
6. qué unidad monetaria utiliza;
7. si el cálculo es por cliente canónico;
8. si agrupa por canal/categoría/planta;
9. dónde se calcula Delta Ingreso;
10. dónde se ordena.

## Ranking negativo

Determinar físicamente cómo debe obtenerse:

Top 5 mayor impacto negativo

La hipótesis de negocio a verificar es:

- filtrar `delta_ingreso < 0`;
- ordenar de más negativo a menos negativo;
- tomar 5.

Ejemplo conceptual:

-250,000
-180,000
-120,000
-90,000
-50,000

No usar valor absoluto para cambiar el signo.

No mezclar clientes positivos.

No implementar todavía.

## Cadena obligatoria — Dashboard

Trazar completamente:

IGF Forecast ARR
→ Delta Ingreso
→ Clientes por mes / cliente
→ frontend
→ endpoint
→ handler
→ helper
→ loader
→ query
→ tabla(s)
→ columnas
→ cálculo
→ periodo
→ versión/snapshot
→ agrupación
→ Delta Ingreso final
→ sorting/ranking

Identificar archivo y función en cada frontera.

## Cadena obligatoria — Director IA

Trazar:

pregunta
→ planner
→ intent
→ capability
→ routing
→ tool/orchestrator
→ loader
→ query
→ metric pack
→ comments enrichment
→ response

Responder:

¿Por qué la pregunta actual termina en “no tengo acceso”?

Localizar FIRST_BAD_BOUNDARY.

No aceptar como conclusión:

`Director IA todavía no lo soporta`

sin ubicar físicamente la primera frontera que impide llegar a los datos.

## Comentarios — trazabilidad obligatoria

Auditar todas las rutas relevantes de comentarios que puedan aplicar a clientes comerciales.

Para cada ruta determinar:

COMMENT_SOURCE
COMMENT_TABLE
CLIENT_IDENTITY_KEY
DATE_FIELD
PLANT_SCOPE
PERIOD_SCOPE
AUTHOR/OWNER si existe
COMMENT_TYPE si existe

Buscar especialmente:

- comentarios de gráfica;
- comentarios del modal Delta Ingreso;
- comentarios del cliente;
- Action Register solo si físicamente participa en esta lectura;
- DICF solo si físicamente participa;
- cualquier tabla/campo usado hoy por Director IA.

No mezclar fuentes solo porque contienen texto.

## BAYAM — matriz obligatoria

Construir:

Surface | Source | Client key | Comment found | Date | Text | Why visible/not visible

como mínimo para:

- gráfica;
- Delta Ingreso Cliente Forecast;
- Director IA.

La divergencia:

gráfica = comentario visible
modal = “Aún no hay comentarios”

debe terminar con una explicación física o:

NOT_PROVEN_WITHOUT_LIVE_DB

No adivinar.

## Drivers del Delta Ingreso

Negocio identifica como variables relevantes:

- margen;
- descuento;
- compra/venta/volumen;
- cliente disminuyó;
- cliente dejó de comprar;
- HG.

El audit debe determinar cuáles de estas variables existen físicamente en la cadena de Delta Ingreso y cuáles NO.

Para cada una:

VARIABLE
SOURCE
PERIOD
AVAILABLE_PER_CLIENT: YES/NO
USED_IN_DELTA_FORMULA: YES/NO
CAN_EXPLAIN_DELTA: YES/NO

Especial cuidado:

El margen puede ser una variable externa/fuera del control comercial.

No convertir correlación en causalidad.

Un comentario tampoco demuestra automáticamente causa.

## Controlabilidad

No implementar clasificación todavía, pero documentar si físicamente sería posible distinguir en un FIX posterior:

- factor posiblemente controlable:
  - descuento;
  - pérdida/disminución de volumen;
  - seguimiento comercial;
  - compromiso incumplido;

- factor no controlable o externo:
  - margen, según regla de negocio;

- desconocido:
  - no existe evidencia.

No inventar causa.

## Alertas

No implementar alertas.

Solo determinar si los datos existentes permitirían posteriormente crear:

ALERTA:
cliente con Delta Ingreso negativo material

con:

- cliente;
- Delta Ingreso;
- ranking;
- venta/kg anterior;
- venta/kg forecast/actual;
- descuento;
- HG;
- comentario más reciente;
- compromiso;
- responsable/acción, si existe físicamente.

## Periodo septiembre

Determinar exactamente qué significa actualmente:

`septiembre`

en Delta Ingreso Forecast.

No asumir mes cerrado.

Debe quedar claro si septiembre representa:

- mes actual parcial;
- forecast del cierre;
- última versión forecast;
- actual a fecha;
- mezcla actual + forecast;
- otra definición.

Identificar la fuente/versionado.

## FIRST_BAD_BOUNDARY

Debe declararse una frontera concreta.

Ejemplos válidos:

PLANNER
CAPABILITY_COVERAGE
ROUTING
TOOL_MISSING
SOURCE_NOT_EXPOSED
PERIOD_RESOLUTION
DELTA_CALCULATION
COMMENT_SOURCE
CLIENT_IDENTITY
RANKING

Puede haber más de una causa, pero debe identificarse cuál ocurre primero para la pregunta objetivo.

## Hipótesis obligatorias

Marcar cada una como:

PROVEN
REJECTED
NOT_PROVEN

H1 — El Delta Ingreso ya está calculado en un helper reutilizable.

H2 — Director IA no tiene actualmente tool/loader para esa fuente.

H3 — Planner conoce `delta_income` pero la ejecución física no está conectada.

H4 — El ranking Top 5 puede obtenerse sin nueva fórmula de negocio.

H5 — Septiembre usa forecast y no venta real cerrada.

H6 — Los comentarios del modal y de la gráfica vienen de fuentes diferentes.

H7 — Director IA ya tiene acceso a al menos una de las fuentes de comentarios.

H8 — Es posible unir Delta Ingreso + comentarios mediante una identidad canónica existente.

H9 — Existen variables suficientes para explicar al menos parte del deterioro: kg/venta, descuento, HG y/o margen.

H10 — El actual “no tengo acceso” es un problema de cobertura/routing y no ausencia física del dato.

## Runtime / Golden gap

Auditar si actualmente existe cobertura para preguntas como:

`Dame los clientes con mayor Delta Ingreso negativo de septiembre.`

y:

`Dame los 5 clientes con mayor Delta Ingreso negativo y sus comentarios.`

Determinar:

- intent esperado;
- fixture;
- tool esperado;
- source esperado;
- qué verifica el test;
- qué NO verifica.

Si no existe cobertura, declararlo.

## Regresiones futuras a proponer

NO implementarlas en esta auditoría.

Proponer como mínimo:

R-DELTA-INCOME-001
Top negative ranking.

R-DELTA-INCOME-002
Correct month / forecast period.

R-DELTA-INCOME-003
Correct monetary values and sign.

R-DELTA-INCOME-004
Top 5 ordering.

R-DELTA-INCOME-005
Comments enrichment.

R-DELTA-INCOME-006
No comment → explicit DATA_NOT_FOUND / equivalent, not invented.

R-DELTA-INCOME-007
Comment does not become causal explanation automatically.

R-DELTA-INCOME-008
Client identity parity Delta Ingreso ↔ comments.

R-DELTA-INCOME-009
Aggregate Top 5 negative impact.

R-DELTA-INCOME-010
Driver evidence: sales/kg, discount, HG, margin where physically available.

## LIVE_DB

live_db_authorized: NO

No consultar producción.

Si el código no permite demostrar:

- el valor exacto;
- el ranking exacto;
- la versión forecast;
- o la divergencia de comentarios;

marcar:

NOT_PROVEN_WITHOUT_LIVE_DB

y entregar SELECT read-only mínimo necesario:

- tabla;
- columnas;
- planta;
- cliente si aplica;
- año/mes;
- version_id si aplica;
- ORDER BY;
- LIMIT.

No abrir LIVE_DB automáticamente.

Requiere nuevo G1 humano específico.

## In scope

- frontend IGF Forecast ARR relacionado con Delta Ingreso / Clientes por mes
- lib/delta-ingreso-forecast.js
- helpers/loaders/endpoints relacionados
- server.js solo tracing
- planner/capabilities de delta_income
- director-ia-chat
- tool orchestrator
- loaders de comentarios de cliente
- DICF solo si participa físicamente
- Action Register solo si participa físicamente
- tests existentes relacionados, solo lectura
- docs/dev-loop/CURRENT_TASK.md
- reporte de auditoría

## Out of scope

- implementación
- modificar tests
- LIVE_DB
- DB/schema/migrations
- frontend changes
- nuevos vs reactivados
- movement calendar parity ya CLOSED
- margen histórico
- terminology margen cliente
- dirty continuity `como vamos?`
- creación de alertas
- envío de notificaciones
- cálculo nuevo de rentabilidad forecast
- modificación de contratos congelados
- merge
- deploy
- next task

## Prohibiciones

No hardcodear clientes.
No hardcodear importes.
No asumir que screenshot = contrato de código.
No inventar causalidad.
No convertir comentarios en causas.
No consultar LIVE_DB.
No modificar producto.
No modificar tests.
No merge.
No deploy.
No next task.

## Entregables obligatorios

1. Executive summary máximo 15 líneas.
2. North Star map: Rentabilidad → Delta Ingreso → cliente → variables → comentario/acción.
3. Physical source map de Delta Ingreso.
4. Fórmula física actual.
5. Period/version semantics.
6. Ranking semantics.
7. Director IA source/routing map.
8. FIRST_BAD_BOUNDARY.
9. Comments source map.
10. BAYAM divergence matrix.
11. Driver availability matrix.
12. Hypothesis disposition H1–H10.
13. Golden/Runtime gap.
14. Future Runtime regressions.
15. Si hace falta LIVE_DB: SELECTs mínimos.
16. Recommended next FIX slice.
17. Git branch/commit/status.

## Completion

DONE_PENDING_REVIEW
si el código permite localizar las fronteras y diseñar el FIX.

BLOCKED
si una frontera crítica solo puede resolverse con LIVE_DB.

No implementación.
No next task.

STOP.
