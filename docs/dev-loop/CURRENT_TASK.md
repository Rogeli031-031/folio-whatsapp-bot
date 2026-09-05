task_id: AUDIT-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ACTIONABLE-DRIVERS-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-05T16:42:56-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - READ_ONLY AUDIT ONLY; NO IMPLEMENTATION; NO LIVE_DB"
implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ACTIONABLE-DRIVERS-001.md

# 1. PRECONDICIÓN

Antes de ejecutar esta auditoría debe verificarse que:

FIX-DIRECTOR-IA-CLIENTES-POR-MES-TARGET-PROY-PARITY-001

esté CLOSED en HEAD.

La capacidad Delta Ingreso / Clientes por mes fue aceptada en validación LIVE con:

- mismo conjunto ejecutivo de clientes prioritarios;
- diferencias residuales menores de corte/magnitud;
- sin bloqueo para continuar.

NO reabrir esa familia de fixes salvo que esta auditoría descubra evidencia nueva directamente relevante.

Si existe todavía como DRAFT no autorizado:

AUDIT-DIRECTOR-IA-DELTA-INGRESO-DRIVER-DECOMPOSITION-001

este task lo REEMPLAZA.

No deben existir dos tareas vigentes.

# 2. NORTH STAR DE NEGOCIO

Director IA debe ayudar a incrementar mes con mes:

- rentabilidad operativa;
- rentabilidad final;

y evitar retrocesos.

La pregunta ejecutiva principal que Director IA debe llegar a responder es:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

La respuesta futura no debe limitarse a listar clientes.

Debe ser capaz de recorrer, cuando los datos lo permitan:

RENTABILIDAD
→ cambio vs periodo anterior
→ Delta Ingreso
→ Delta Gastos
→ principales contribuyentes
→ drivers económicos
→ controlabilidad
→ contexto operativo
→ acciones / compromisos existentes

sin inventar causalidad.

# 3. EVIDENCIA LIVE ACTUAL

Pregunta:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

Resultado actual:

No se pudo determinar una intención clara con las reglas actuales.
Indica si quieres el diagnóstico de la planta actual, un cliente concreto u otro tema.
No asumo el hilo ni consulto Action Register a ciegas.

Por tanto existe como mínimo una frontera de ROUTING / CAPABILITY.

NO asumir que ésa es la única frontera.

La auditoría debe determinar también si, aunque el planner reconociera la pregunta, existen físicamente los datos y contratos suficientes para contestarla correctamente.

# 4. OBJETIVO ÚNICO

Determinar físicamente qué necesita Director IA para contestar de manera trazable:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

La auditoría debe demostrar:

1. cuál es la definición física de rentabilidad operativa;
2. cuál es la definición física de rentabilidad final;
3. qué periodo A y B utiliza cada una;
4. cómo se explica matemáticamente su cambio;
5. cuánto corresponde a ingreso;
6. cuánto corresponde a gastos;
7. qué clientes explican principalmente el lado ingreso;
8. qué gastos/categorías explican principalmente el lado gastos;
9. qué drivers económicos pueden aislarse;
10. qué drivers son accionables;
11. qué contexto operativo existe;
12. qué afirmaciones NO pueden hacerse con la evidencia disponible.

NO implementar.

# 5. PRINCIPIO DE RESPUESTA FUTURA

La respuesta ejecutiva futura debe poder organizarse conceptualmente en cinco niveles.

## NIVEL A — RESULTADO

Ejemplo conceptual:

La rentabilidad forecast de septiembre está X por debajo / encima de agosto.

Separar:

- rentabilidad operativa;
- rentabilidad final;

si físicamente son KPIs distintos.

No intercambiarlas.

## NIVEL B — PUENTE ECONÓMICO

Explicar qué bloques económicos deterioran/mejoran el resultado.

Ejemplo conceptual:

Rentabilidad periodo anterior
+/- cambio de ingresos
-/+ cambio de gastos
= rentabilidad periodo forecast

NO asumir esta ecuación como contrato hasta verificarla físicamente en código/datos.

Debe probarse.

## NIVEL C — CONTRIBUYENTES

En ingreso:

- clientes con mayor Delta Ingreso negativo;
- clientes con mayor mejora positiva si sirve para contexto.

En gastos:

- categorías;
- conceptos;
- centros;
- cuentas;
- partidas;

según lo que realmente exista físicamente.

## NIVEL D — DRIVERS

Ejemplos posibles:

- menor volumen / kg;
- mayor descuento;
- cambio de margen de planta;
- HG;
- aumento de gasto específico.

Solo si el driver participa realmente en la fórmula o bridge.

## NIVEL E — ACCIÓN / CONTEXTO

Separar:

- potencialmente accionable;
- influenciable;
- planta/global;
- externo/no controlable;
- desconocido.

Después enriquecer con:

- comentarios;
- compromisos;
- acciones;

sin presentarlos automáticamente como causas demostradas.

# 6. CONTRATO SEMÁNTICO CRÍTICO

La auditoría debe separar explícitamente:

## 6.1 HECHO

Ejemplo:

El cliente compró menos kg.

Debe derivar directamente de evidencia.

## 6.2 DRIVER ECONÓMICO

Ejemplo:

La reducción de kg ejerce presión negativa sobre Delta Ingreso.

Debe ser demostrable matemáticamente.

## 6.3 CONTEXTO OPERATIVO

Ejemplo:

Comentario registrado:
“FALLO LA LUZ Y LA BOMBA...”

Es información registrada por operación.

## 6.4 CAUSA

Ejemplo:

“La venta cayó por la falla de la bomba.”

NO puede afirmarse automáticamente solo porque exista el comentario.

Debe existir evidencia contractual suficiente para atribuir causalidad.

Regla:

HECHO ≠ DRIVER ≠ CONTEXTO ≠ CAUSA.

# 7. RENTABILIDAD OPERATIVA

Localizar físicamente:

- nombre del KPI;
- fuente;
- endpoint;
- handler;
- helper;
- SQL/query;
- tablas;
- columnas;
- unidad;
- periodo;
- forecast vs actual;
- version;
- financial_state;
- formula;
- rounding;
- null handling.

Responder:

¿qué significa exactamente “rentabilidad operativa” en Director IA / Dashboard?

No aceptar definiciones de negocio no trazadas a código.

# 8. RENTABILIDAD FINAL

Repetir el tracing completo para rentabilidad final.

Determinar:

- si es un KPI realmente distinto;
- qué conceptos adicionales incluye;
- qué gastos/ingresos intervienen;
- si existe forecast;
- si existe cierre real;
- si usa la misma versión IGF.

No asumir que:

rentabilidad final = rentabilidad operativa - X

sin probarlo.

# 9. PERIODO Y COMPARACIÓN

Para una pregunta sin mes explícito como:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

auditar cuál debería ser la semántica correcta.

Posibles opciones a investigar:

- mes actual forecast vs mes anterior real;
- último forecast disponible vs mes cerrado anterior;
- latest version vs previous period;
- current selected dashboard period.

No decidir arbitrariamente.

Determinar qué puede inferirse de:

- planta seleccionada;
- fecha actual;
- conversación;
- estado del Dashboard;
- latest IGF version.

Debe existir comportamiento fail-closed si el periodo no puede resolverse de forma segura.

# 10. PUENTE DE RENTABILIDAD

Buscar físicamente si ya existe un bridge/variance/decomposition que explique:

cambio de rentabilidad
=
cambio por ingresos
+
cambio por gastos
+
otros componentes

Buscar términos y helpers relacionados con:

- rentabilidad;
- utilidad;
- operating profit;
- final profit;
- delta ingreso;
- delta gastos;
- variance;
- bridge;
- waterfall;
- contribution;
- forecast;
- financial diagnosis.

Si ya existe:
documentarlo.

Si no existe:
decirlo.

NO crear fórmula nueva.

# 11. DELTA INGRESO

Usar como source-of-truth la capacidad ejecutiva ya construida:

Clientes por mes
→ computeClientesDescuentoMes
→ ingresoClienteMarginal
→ Delta Ingreso

con el target PROY efectivo del mes abierto.

Auditar cómo puede integrarse al diagnóstico de rentabilidad sin duplicar fórmula.

No reimplementar.

# 12. CONTRIBUYENTES DE INGRESO

Determinar si hoy puede obtenerse:

- total Delta Ingreso;
- clientes negativos;
- clientes positivos;
- Top N negativos;
- participación de cada cliente sobre el deterioro;
- suma Top N.

Auditar si:

SUM(delta cliente)

reconcilia exactamente con el componente de ingreso utilizado por la rentabilidad de planta.

Esta reconciliación es CRÍTICA.

Puede existir un Delta Ingreso por clientes que no reconcilie 1:1 con el KPI general.

Si no reconcilia:
localizar por qué.

No ocultar residuales.

# 13. DRIVERS DEL DELTA INGRESO POR CLIENTE

Para un cliente:

Ingreso A = f(inputs A)
Ingreso B = f(inputs B)

Auditar los inputs reales:

- kg;
- descuento/kg;
- margen de planta;
- HG;
- otros si existen.

Determinar para cada variable:

AVAILABLE
CAN_QUANTIFY_CONTRIBUTION
REQUIRES_ATTRIBUTION_METHOD
NOT_AVAILABLE

# 14. INTERACCIONES Y ADITIVIDAD

Esta sección es obligatoria.

Cuando cambian simultáneamente:

- kg;
- descuento;
- margen;
- HG;

pueden existir términos de interacción.

La auditoría debe determinar si una descomposición tipo:

efecto volumen
+
efecto descuento
+
efecto margen
+
efecto HG

puede sumar exactamente al Delta.

Analizar:

- secuencial bridge;
- one-factor-at-a-time;
- residual/interactions;
- Shapley decomposition;
- cualquier método ya existente en repo.

NO implementar ninguno.

Para cada opción documentar:

- exact additivity;
- order dependence;
- interpretability;
- computational cost;
- reproducibility;
- suitability for executive explanation.

El siguiente FIX no debe elegir un método arbitrario.

# 15. DRIVER VOLUMEN / KG

Determinar físicamente si puede afirmarse:

- kg A;
- kg B;
- delta kg;
- contribución monetaria atribuible al cambio de kg.

No basta con decir:

“bajó venta”.

Debe distinguir:

venta/kg
vs
Delta Ingreso MXN.

# 16. DRIVER DESCUENTO

Recordatorio semántico:

DESCUENTO/KG es métrica de cliente.

MARGEN es métrica de planta.

Nunca llamar:

“margen del cliente”

al descuento/kg.

Auditar:

- descuento A;
- descuento B;
- unidad;
- signo;
- source;
- contribución posible en MXN.

# 17. DRIVER MARGEN

Margen es plant-level.

Auditar:

- margen A;
- margen B;
- version;
- period;
- financial state;
- si el mismo margen aplica a todos los clientes;
- cómo afecta cada cliente.

La respuesta futura debe poder decir conceptualmente:

“Parte del deterioro está asociada a margen de planta”

y NO:

“este cliente tiene mal margen”

salvo que exista una métrica realmente client-level distinta.

# 18. DRIVER HG

Localizar físicamente qué representa HG.

Documentar:

- definición;
- source;
- unidad;
- signo;
- periodo;
- nivel de agregación;
- fórmula;
- controlabilidad.

No asumir que HG es controlable o no controlable.

Determinarlo.

# 19. DELTA GASTOS

Esta auditoría SÍ incluye Delta Gastos.

La pregunta habla de rentabilidad completa.

Localizar físicamente:

- módulo;
- endpoint;
- helper;
- tablas;
- forecast;
- actual;
- period;
- category;
- concept;
- plant scope;
- unit MXN;
- sign convention.

Determinar si existe hoy:

Delta Gastos = gasto B - gasto A

o una semántica distinta.

No asumir.

# 20. CONTRIBUYENTES DE GASTOS

Determinar el nivel de detalle físicamente disponible:

- cuenta;
- concepto;
- categoría;
- centro de costo;
- proveedor;
- proyecto;
- gasto operativo;
- gasto extraordinario;
- inversión;
- otro.

Responder:

¿Director IA puede decir cuáles son los 5 gastos que más deterioran rentabilidad?

Si no:
explicar frontera.

# 21. RECONCILIACIÓN DE GASTOS

Auditar si:

SUM(delta gastos detallados)

reconcilia con el componente de gastos usado en rentabilidad.

Identificar:

- exclusiones;
- inversiones;
- reclasificaciones;
- gastos no operativos;
- rounding;
- forecast;
- partidas sin detalle.

No asumir reconciliación.

# 22. CLASIFICACIÓN DE CONTROLABILIDAD

Auditar si puede construirse de forma respaldada una clasificación como:

DIRECTAMENTE_ACCIONABLE
INFLUENCIABLE
PLANT_LEVEL
EXTERNO_NO_CONTROLABLE
UNKNOWN

No implementarla.

Para cada driver evaluar evidencia.

Ejemplos conceptuales, NO reglas definitivas:

kg de cliente:
posiblemente influenciable comercialmente.

descuento cliente:
posiblemente directamente accionable con autorización.

margen de planta:
plant-level / fuera del control comercial directo.

gasto discrecional:
potencialmente accionable.

gasto contractual:
puede no ser inmediatamente accionable.

HG:
pendiente de definición física.

No codificar clasificación con intuición.

# 23. PRIORIZACIÓN EJECUTIVA

Auditar si los datos permiten construir en el futuro una prioridad basada en:

1. impacto MXN;
2. controlabilidad;
3. reversibilidad;
4. tiempo para actuar;
5. evidencia disponible;
6. riesgo comercial.

NO diseñar score arbitrario.

Determinar cuáles de estas dimensiones tienen fuente física real.

# 24. COMENTARIOS

Fuente conocida a auditar:

arr.cliente_comentarios

Determinar:

- lookup;
- identity;
- fecha;
- latest comment;
- plant scope.

La respuesta debe etiquetar:

Comentario registrado:

y no:

Causa:

# 25. CASO 20 CUMBRES

Referencia conceptual:

Comentario:

FALLO LA LUZ Y LA BOMBA ES POR ESO QUE DISMINUYÓ SU VENTA

Auditar el tratamiento correcto.

Si datos muestran:

kg B < kg A

se puede afirmar:

HECHO:
menor volumen.

Si el comentario existe:

CONTEXTO:
la operación registró falla de luz/bomba.

No concluir automáticamente:

CAUSA PROBADA:
la bomba causó X pesos de deterioro.

# 26. CASO GRUPO MOVE

Comentario:

COMPRA DIARIAMENTE

Este caso debe demostrar que un comentario puede ser poco explicativo.

No forzar una narrativa causal.

La respuesta futura debe poder decir:

Comentario registrado, pero no explica por sí mismo el deterioro.

# 27. ÚLTIMA COMPRA

Mapear físicamente si existe fuente para:

- última fecha de compra;
- kg de esa transacción;
- total mensual.

Separar:

LAST_TRANSACTION
vs
MONTH_TOTAL.

No implementar.

# 28. COMPROMISOS

Localizar si existe una estructura física para:

cliente
→ compromiso
→ fecha
→ cantidad
→ unidad
→ responsable.

Determinar si está en:

- comentarios;
- Action Register;
- dicf_acciones;
- otra tabla.

No inferir compromiso desde cualquier comentario libre.

# 29. CUMPLIMIENTO DE COMPROMISOS

NO implementar.

Solo determinar si técnicamente podría compararse:

promesa
vs
compra real posterior.

Identificar requisitos:

- identity;
- quantity unit;
- date;
- tolerance;
- transaction evidence.

Caso BAYAM puede usarse como referencia conceptual, no hardcode.

# 30. ACCIONES

Auditar físicamente:

cliente
→ acción abierta
→ responsable
→ fecha compromiso
→ status

Determinar si existe relación canónica.

No consultar Action Register a ciegas.

Si solo existe texto sin cliente_key:
decirlo.

# 31. IDENTIDAD

Crear matriz:

SOURCE
| IDENTITY KEY
| PLANT
| CLIENT NAME
| CANAL
| GRUPO
| SUBCANAL
| CLIENT_KEY
| SAFE JOIN?

Como mínimo:

- Clientes por mes;
- cliente comentarios;
- dicf_acciones;
- Action Register;
- transaction history;
- Delta Ingreso;
- gastos si aplican.

No fuzzy matching.

# 32. PLANNER / ROUTING

Trazar la pregunta exacta:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

Recorrer:

question
→ planner
→ rules
→ intent candidates
→ evidence request
→ pack/router
→ clarification/unknown.

Determinar FIRST_BAD_BOUNDARY para routing.

Investigar intents existentes:

- financial_diagnosis;
- plant_diagnosis;
- delta_income;
- expense_analysis;
- investment_analysis;
- other relevant intents.

No crear intent nuevo todavía.

Responder:

¿puede reutilizarse un intent existente con contrato ampliado?

o

¿requiere un intent ejecutivo nuevo?

Recomendar, no implementar.

# 33. CONVERSATION CONTINUITY

Auditar también:

Pregunta 1:
¿Cómo va la rentabilidad de septiembre?

Pregunta 2:
¿Qué está provocando el deterioro y sobre qué puedo actuar?

Determinar si el segundo turno puede heredar:

- planta;
- periodo;
- KPI;
- financial state.

No depender obligatoriamente de continuidad para la pregunta standalone.

# 34. EVIDENCE CONTRACT

La respuesta futura debe identificar evidencia por afirmación.

Crear propuesta conceptual de evidence buckets:

PROFITABILITY_EVIDENCE
INCOME_DELTA_EVIDENCE
EXPENSE_DELTA_EVIDENCE
CLIENT_DRIVER_EVIDENCE
COMMENT_CONTEXT
ACTION_EVIDENCE

No modificar IES/RE/EKS/contracts.

Solo mapear compatibilidad.

# 35. CALIDAD / CONFIANZA

Auditar si cada conclusión puede clasificarse:

PROVEN
SUPPORTED
CONTEXT_ONLY
UNKNOWN

Ejemplo:

“Público deteriora $X”
→ PROVEN si source parity.

“El deterioro se relaciona matemáticamente con menor kg”
→ SUPPORTED/PROVEN según decomposition.

“La operación escribió que falló la bomba”
→ CONTEXT_ONLY.

“La falla de la bomba causó exactamente $X”
→ UNKNOWN salvo evidencia adicional.

# 36. FORMATO EJECUTIVO FUTURO

Sin implementar, evaluar si los datos soportarían una respuesta como:

Rentabilidad:
- Operativa: ...
- Final: ...
- Cambio vs agosto: ...

Qué la deteriora:
1. Ingreso: -$...
2. Gastos: -$...
3. Otros/residual: ...

Clientes con mayor presión:
1. Cliente A: -$...
   Driver calculado: ...
   Accionable: ...
   Comentario registrado: ...

Gastos con mayor presión:
1. Concepto A: +$...
   Accionable: ...

Prioridades:
1. ...
2. ...
3. ...

No producir este formato como producto todavía.

Auditar si cada campo es físicamente soportable.

# 37. ADDITIVITY / RECONCILIATION GATE

Antes de recomendar implementación debe responderse:

A. ¿Delta Ingreso detallado reconcilia con rentabilidad?

B. ¿Delta Gastos detallado reconcilia con rentabilidad?

C. ¿Ingreso + gastos explican 100% del cambio?

D. Si existe residual:
qué representa.

E. ¿los drivers por cliente suman al Delta del cliente?

F. ¿los clientes suman al Delta Ingreso total?

Si alguna respuesta es NO:
documentar residual y no ocultarlo.

# 38. HIPÓTESIS OBLIGATORIAS

Clasificar cada una:

PROVEN
REJECTED
NOT_PROVEN
NOT_PROVEN_WITHOUT_LIVE_DB

H1
Existe una definición física inequívoca de rentabilidad operativa.

H2
Existe una definición física inequívoca de rentabilidad final.

H3
El cambio de rentabilidad puede reconciliarse con Delta Ingreso y Delta Gastos.

H4
Delta Ingreso por clientes reconcilia con el componente de ingreso de planta.

H5
Existe Delta Gastos físico utilizable por Director IA.

H6
Delta Gastos puede desglosarse en contribuyentes.

H7
Ya existe un helper de decomposition/bridge de rentabilidad.

H8
Ya existe un helper de decomposition de Delta Ingreso por kg/descuento/margen/HG.

H9
Existe interacción matemática entre los drivers de ingreso.

H10
Puede construirse una atribución aditiva exacta.

H11
La atribución actual, si existe, es independiente del orden.

H12
Volumen puede cuantificarse en MXN como contribution.

H13
Descuento puede cuantificarse en MXN como contribution.

H14
Margen puede cuantificarse en MXN como contribution.

H15
HG puede cuantificarse en MXN como contribution.

H16
Existe suficiente evidencia física para clasificar controlabilidad.

H17
Comentarios están disponibles de forma segura después del cálculo.

H18
Comentarios pueden mostrarse sin causal inference.

H19
Última transacción está físicamente disponible.

H20
Compromisos tienen estructura suficiente para evaluación futura.

H21
Acciones tienen relación canónica segura con cliente.

H22
La pregunta exacta falla primero en PLANNER/ROUTING.

H23
financial_diagnosis puede ser reutilizado para esta capacidad.

H24
La pregunta puede resolverse standalone sin contexto heredado.

# 39. RUNTIME / GOLDEN COVERAGE ACTUAL

Auditar read-only cobertura existente para:

- profitability;
- financial diagnosis;
- Delta Ingreso;
- Delta Gastos;
- expense analysis;
- driver decomposition;
- comments;
- causal guardrail;
- controlability;
- continuity.

No modificar tests.

Identificar false-greens potenciales.

# 40. FUTURE REGRESSION PACK PROPUESTO

NO implementar.

Proponer como mínimo:

R-RENT-DRIVER-001
Pregunta exacta routea a diagnóstico de rentabilidad.

R-RENT-DRIVER-002
Periodo A/B correcto.

R-RENT-DRIVER-003
Rentabilidad operativa source-of-truth.

R-RENT-DRIVER-004
Rentabilidad final source-of-truth.

R-RENT-DRIVER-005
Delta Ingreso reconciliado.

R-RENT-DRIVER-006
Delta Gastos reconciliado.

R-RENT-DRIVER-007
Bridge total aditivo.

R-RENT-DRIVER-008
Top clientes negativos.

R-RENT-DRIVER-009
Top gastos negativos.

R-RENT-DRIVER-010
Volume driver contribution.

R-RENT-DRIVER-011
Discount driver contribution.

R-RENT-DRIVER-012
Margin driver contribution.

R-RENT-DRIVER-013
HG driver contribution.

R-RENT-DRIVER-014
Drivers sum to client Delta.

R-RENT-DRIVER-015
Controlability classification grounded.

R-RENT-DRIVER-016
Comment shown as context, not cause.

R-RENT-DRIVER-017
Missing evidence fails closed.

R-RENT-DRIVER-018
Standalone question works.

R-RENT-DRIVER-019
Continuity question works.

R-RENT-DRIVER-020
No blind Action Register query.

# 41. LIVE_DB

live_db_authorized: NO.

NO consultar producción.

Esta tarea debe agotar:

- code tracing;
- existing fixtures;
- helper inspection;
- schema references;
- deterministic local reasoning.

Si una reconciliación numérica real requiere datos de producción:

marcar:

NOT_PROVEN_WITHOUT_LIVE_DB

y preparar sondas mínimas.

NO ejecutar.

# 42. PROBES SI SON NECESARIOS

Preparar únicamente si resultan indispensables.

Separar:

A. profitability KPI inputs
B. Delta Ingreso totals
C. Delta Gastos totals
D. top expense details
E. margin/HG/version
F. client drivers
G. comments/actions

Preferir sondas JS read-only que reutilicen helpers reales cuando SQL duplicaría lógica.

No escribir una fórmula SQL aproximada para “validar” otra fórmula.

# 43. FIRST_BAD_BOUNDARIES

La auditoría puede descubrir más de una frontera.

Debe separar al menos:

ROUTING_FIRST_BAD_BOUNDARY

DATA_FIRST_BAD_BOUNDARY

ATTRIBUTION_FIRST_BAD_BOUNDARY

ACTIONABILITY_FIRST_BAD_BOUNDARY

Ejemplos válidos:

PLANNER
CAPABILITY_COVERAGE
PROFITABILITY_SOURCE
DELTA_EXPENSE_SOURCE
RECONCILIATION
DRIVER_ATTRIBUTION_METHOD
CLIENT_IDENTITY
ACTION_IDENTITY
CONTROLABILITY_CONTRACT

No aceptar:

“falta inteligencia”
“LLM no entiende”
“faltan datos”

sin una frontera física.

# 44. CRITERIO PARA RECOMENDAR SIGUIENTE FIX

Solo recomendar implementación si la auditoría puede responder:

1. cuál es la fuente canónica de rentabilidad;
2. cuál es la fuente canónica de ingreso;
3. cuál es la fuente canónica de gastos;
4. cómo reconciliarlos;
5. qué attribution method se recomienda y por qué;
6. qué puede clasificarse como accionable;
7. qué contexto puede mostrarse;
8. cómo debe routearse la pregunta.

Si esto no queda demostrado:
NO recomendar un megapatch.

Dividir en slices.

# 45. POSIBLES SLICES FUTUROS

La auditoría debe decidir físicamente, no asumir, si conviene separar:

SLICE A
Routing + profitability bridge.

SLICE B
Income driver decomposition.

SLICE C
Expense driver decomposition.

SLICE D
Actionability classification.

SLICE E
Comments/actions enrichment.

Preferir slices pequeños, testeables y reversibles.

NO implementarlos.

# 46. IN SCOPE

- planner read-only
- Director IA routing
- financial_diagnosis
- plant_diagnosis
- profitability KPIs
- IGF
- Delta Ingreso
- Clientes por mes
- computeClientesDescuentoMes
- ingresoClienteMarginal
- effective PROY target
- Delta Gastos / expense sources
- kg
- descuento
- margen
- HG
- client comments
- last transaction loaders
- commitment/action loaders
- client identity
- existing runtime/golden tests read-only
- CURRENT_TASK
- audit report

# 47. OUT OF SCOPE

- implementation
- modifying tests
- new formulas
- alerts
- notifications
- automatic commitment fulfillment
- new/reactivated
- DB/schema
- migrations
- LIVE_DB
- frontend changes
- contracts
- IES changes
- RE changes
- EKS changes
- merge
- deploy
- next task implementation

# 48. PROHIBICIONES

No inventar una fórmula de rentabilidad.

No asumir que Delta Ingreso + Delta Gastos reconcilia sin probarlo.

No llamar descuento “margen del cliente”.

No atribuir comentarios como causas.

No inventar controlabilidad.

No fuzzy matching.

No consultar Action Register a ciegas.

No hardcodear clientes LIVE.

No ocultar residual de reconciliación.

No modificar tests.

No modificar producto.

No LIVE_DB.

No merge.

No deploy.

No next task.

# 49. ENTREGABLES

1. Executive summary ≤15 líneas.

2. Exact-question routing trace.

3. Rentabilidad operativa physical chain.

4. Rentabilidad final physical chain.

5. Period/forecast semantics.

6. Profitability bridge analysis.

7. Delta Ingreso physical chain.

8. Delta Ingreso reconciliation.

9. Delta Gastos physical chain.

10. Delta Gastos reconciliation.

11. Income contributor analysis.

12. Expense contributor analysis.

13. Economic input map.

14. Existing decomposition helper search.

15. Interaction/additivity analysis.

16. Attribution method comparison.

17. Volume driver analysis.

18. Discount driver analysis.

19. Margin driver analysis.

20. HG driver analysis.

21. Controllability evidence matrix.

22. Comments/context chain.

23. 20 CUMBRES semantic example.

24. GRUPO MOVE semantic example.

25. Last transaction chain.

26. Commitments chain.

27. Actions chain.

28. Identity matrix.

29. Evidence-quality classification.

30. Continuity analysis.

31. H1–H24 disposition.

32. Current Runtime/Golden coverage.

33. False-green risks.

34. Proposed R-RENT-DRIVER-001..020.

35. ROUTING_FIRST_BAD_BOUNDARY.

36. DATA_FIRST_BAD_BOUNDARY.

37. ATTRIBUTION_FIRST_BAD_BOUNDARY.

38. ACTIONABILITY_FIRST_BAD_BOUNDARY.

39. Root causes.

40. Reconciliation residuals / unknowns.

41. Recommended future response contract.

42. Recommended implementation slices.

43. Recommended immediate next FIX only.

44. LIVE_DB probes if indispensable.

45. Branch.

46. commit SHA if allowed.

47. git status --short.

# 50. COMPLETION

DONE_PENDING_REVIEW

si puede definirse una arquitectura física segura para responder:

¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

sin inventar causalidad ni fórmulas.

BLOCKED

si no puede reconciliarse rentabilidad/ingreso/gastos o no puede definirse attribution/actionability sin datos adicionales.

Si queda BLOCKED:
indicar exactamente qué evidencia falta.

No implementación.

No next task.

STOP.