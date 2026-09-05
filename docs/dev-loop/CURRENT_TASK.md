task_id: AUDIT-DIRECTOR-IA-CLIENTES-POR-MES-RUNTIME-CUT-PARITY-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-05T15:37:32-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - READ_ONLY AUDIT ONLY; NO LIVE_DB"
objective: Localizar físicamente la primera frontera (cut/state/input/export) que hace divergir Delta Ingreso LIVE entre Director IA y Clientes por mes → Exportar Excel, sin rediseñar la fórmula.

in_scope:
  - IGF Forecast ARR
  - Clientes por mes
  - Exportar Excel
  - frontend-dashboard/app/arr/ArrClient.tsx
  - función export
  - React state relacionado
  - lib/dashboard-arr-forecast.js (computeClientesDescuentoMes; solo lectura)
  - lib/ingreso-cliente-marginal.js
  - lib/delta-ingreso-clientes-por-mes.js
  - lib/director-ia-chat.js (ruta delta ingreso Clientes por mes; solo lectura)
  - target/version loaders
  - discount loaders
  - HG/margin loaders
  - null/zero handling
  - sorting/filtering
  - cache/state
  - R-DELTA-PARITY read-only
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENTES-POR-MES-RUNTIME-CUT-PARITY-001.md

out_of_scope:
  - implementación
  - modificar tests
  - cambiar fórmula
  - cambiar ranking
  - cambiar comentarios
  - LIVE_DB
  - frontend visual
  - DB/schema
  - migrations
  - nuevos/reactivados
  - alertas
  - Delta Gastos
  - causalidad
  - commitment evaluation
  - docs/director-ia/
  - contracts
  - merge
  - deploy
  - next task

contracts_in_force:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001.md (CLOSED; no reabre fórmula)
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001.md (CLOSED; no reabre el FIX)
  - contratos vigentes aplicables (obedecer, no reescribir)

allowed_actions:
  - (solo tras G1 humano) tracing físico read-only
  - leer código, tests y reportes CLOSED
  - reportar fronteras H1–H12 y FIRST_BAD_BOUNDARY
  - proponer R-DELTA-CUT-001..010 sin implementarlos
  - redactar sondas/SELECTs mínimos sin ejecutarlos
  - dejar DONE_PENDING_REVIEW o BLOCKED

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - crear, borrar o modificar authorized_by, authorized_at o human_authorization
  - implementar
  - modificar tests
  - cambiar fórmula / ranking / comentarios
  - consultar LIVE_DB
  - ejecutar SELECTs de producción
  - hardcodear valores LIVE en producto
  - modificar docs/director-ia/
  - merge/push a main
  - deploy
  - abrir siguiente tarea

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENTES-POR-MES-RUNTIME-CUT-PARITY-001.md

## Estado

DRAFT. No hay Gate G1. No es ejecutable.

## Precondición

Antes de bajar este DRAFT:

FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001

debe estar CLOSED en HEAD.

Si no está CLOSED:
STOP.

## North Star

Director IA debe priorizar correctamente a los clientes que más deterioran el Delta Ingreso y, por tanto, dónde existe mayor oportunidad de proteger o recuperar rentabilidad.

Para ello:

Director IA
y
IGF Forecast ARR → Clientes por mes → Exportar Excel

deben partir del mismo contrato económico y, cuando se comparan bajo el mismo corte, deben producir:

- mismo universo de clientes;
- mismos inputs económicos;
- mismo Delta Ingreso;
- mismo signo;
- mismo ranking.

La auditoría anterior ya corrigió la divergencia de fórmula/proyección.

Esta tarea NO debe rediseñar nuevamente Delta Ingreso.

## Antecedente CLOSED

AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001

demostró:

FIRST_BAD_BOUNDARY anterior:
FORECAST_PROJECTION / kg B

y que:

Clientes por mes:
computeClientesDescuentoMes
+
ingresoClienteMarginal

era la semántica ejecutiva de negocio.

El FIX:

FIX-DIRECTOR-IA-DELTA-INGRESO-CLIENTES-POR-MES-PARITY-001

implementó esa paridad.

Runtime regression quedó verde.

Sin embargo la validación LIVE posterior muestra que la paridad todavía no es exacta para todos los clientes.

## Evidencia LIVE — Director IA

Pregunta exacta:

`Dame 5 clientes que tengan el mayor impacto negativo en el ingreso para el mes de septiembre, y ponme sus comentarios.`

Planta:
Acapulco

Director IA respondió:

1. SERVICIOS ADMINISTRATIVOS ACAPULCO HOSPITALITY
   -$227,423

2. PUBLICO EN GENERAL
   -$210,363

3. 20 CUMBRES
   -$169,708

4. CARBURACION PALMA SOLA
   -$102,200

5. ASOCIACION DE PROPIETARIOS DE RESIDENCIAS ACAPULCO
   -$96,983

Top 5 acumulado:
-$806,677

Clientes negativos declarados:
297

Fuente declarada:
Clientes por mes
(computeClientesDescuentoMes + ingresoClienteMarginal)

## Evidencia humana — Exportar Excel

Misma planta:
Acapulco

Comparación:
Agosto 2026 vs Septiembre 2026

Excel ordenado por Delta Ingreso ascendente:

1. SERVICIOS ADMINISTRATIVOS ACAPULCO HOSPITALITY
   Ingreso agosto: $227,423
   Ingreso septiembre: $0
   Delta: -$227,423

2. PUBLICO EN GENERAL
   Ingreso agosto: $724,462
   Ingreso septiembre: $502,898
   Delta: -$221,564

3. 20 CUMBRES
   Ingreso agosto: $169,708
   Ingreso septiembre: $0
   Delta: -$169,708

4. CARBURACION PALMA SOLA
   Ingreso agosto: $122,325
   Ingreso septiembre: $19,686
   Delta: -$102,639

5. GRUPO MOVE EMPRESARIAL
   Ingreso agosto: $738,246
   Ingreso septiembre: $639,172
   Delta: -$99,074

6. ASOCIACION DE PROPIETARIOS DE RESIDENCIAS ACAPULCO
   Ingreso agosto: $96,983
   Ingreso septiembre: $0
   Delta: -$96,983

Top 5 correcto de ese Excel:

-$820,408

## Comparación directa

SERVICIOS ADMINISTRATIVOS:
Excel -227423
IA    -227423
MATCH

PUBLICO EN GENERAL:
Excel -221564
IA    -210363
DIFF = 11201

20 CUMBRES:
Excel -169708
IA    -169708
MATCH

CARBURACION PALMA SOLA:
Excel -102639
IA    -102200
DIFF = 439

GRUPO MOVE:
Excel -99074
IA no aparece en Top 5

ASOCIACION:
Excel -96983
IA    -96983
MATCH
pero Excel la posiciona #6.

Director IA:
Top5 sum = -806677

Excel:
Top5 sum = -820408

DIFF:
13731

## Objetivo único

Localizar físicamente la primera frontera que explica por qué:

la misma semántica canónica
computeClientesDescuentoMes + ingresoClienteMarginal

produce paridad exacta para algunos clientes y divergencia para otros entre:

A) Clientes por mes / Exportar Excel

y

B) Director IA LIVE.

No aceptar como explicación:

“cambiaron los datos”

sin localizar qué dato, request, corte, versión, estado o transformación puede hacerlo.

## Preguntas obligatorias

### Q1 — PUBLICO EN GENERAL

¿Por qué Excel produce:

-221564

y Director IA:

-210363?

Localizar cuál input difiere primero:

- kg A;
- kg B;
- descuento A;
- descuento B;
- margen;
- HG;
- ingreso A;
- ingreso B.

### Q2 — CARBURACION PALMA SOLA

¿Por qué:

Excel -102639

vs

IA -102200?

Determinar si los $439 provienen de:

- kg;
- descuento;
- margen;
- HG;
- rounding;
- version/cut.

No clasificar como rounding sin demostrarlo.

### Q3 — GRUPO MOVE

¿Por qué:

Excel -99074

debería ocupar #5

pero Director IA coloca:

ASOCIACION -96983

como #5?

Determinar cuál Delta calculó realmente Director IA para GRUPO MOVE antes del filtro/ranking.

Si el valor no es observable sin LIVE_DB:
localizar la frontera y marcar NOT_PROVEN_WITHOUT_LIVE_DB.

### Q4 — universo de negativos

Director IA declaró:

297 clientes negativos.

Determinar si el Excel/export actual contiene un número distinto bajo exactamente el mismo criterio:

delta_ingreso < 0.

No confiar en conteo visual/manual.

Identificar:

- cantidad total de filas;
- cantidad delta < 0;
- cantidad delta = 0;
- cantidad delta > 0;
- filas blank/null;
- duplicados de identidad si existen.

Si el export no está disponible físicamente en repo:
usar la evidencia humana como referencia, no inventar conteos.

### Q5 — snapshot/cut

¿Dashboard/export e IA están utilizando realmente el mismo snapshot temporal?

Auditar:

- timestamp del request;
- DB query time;
- MTD cut;
- NOW;
- MAX(fecha);
- request period;
- version selection;
- upload_day;
- cache;
- frontend state;
- persisted state;
- local React state.

## Hipótesis obligatorias

Clasificar cada una:

PROVEN
REJECTED
NOT_PROVEN
NOT_PROVEN_WITHOUT_LIVE_DB

### H1 — Request-time cut

El Excel y Director IA recalculan en momentos diferentes y existen nuevas ventas/datos entre ambos requests.

### H2 — Target/version IGF

Ambas superficies usan la misma fórmula pero no seleccionan exactamente el mismo target/version.

### H3 — upload_day / version cut

Una ruta aplica una regla de fecha/upload/version que la otra no.

### H4 — Descuento persisted state

El descuento backend utilizado por IA no coincide con el que exporta Clientes por mes.

### H5 — React simulation state

El Excel se genera desde estado React/simulaciones locales que Director IA no puede ver.

Esta hipótesis es PRIORITARIA.

Determinar físicamente si:

Exportar Excel

serializa los valores actuales visibles en el browser

o

hace una nueva consulta backend.

### H6 — HG input

HG difiere entre ambas rutas por fuente, periodo o versión.

### H7 — Margin input

Margen difiere por latest/version/cut.

### H8 — Client identity / aggregation

PUBLICO, PALMA o MOVE agrupan distintas filas físicas.

### H9 — Null/blank semantics

Filas con septiembre blank, null o 0 son tratadas distinto y explican la diferencia en total negativos.

### H10 — Floating point / rounding

Existe diferencia únicamente por precision/rounding.

Debe ser REJECTED para PUBLICO si no puede explicar $11,201.

### H11 — Cache

Frontend/export o Director IA utilizan un cache/snapshot distinto.

### H12 — Different dataset execution

Aunque el helper económico sea común, los loaders entregan datasets diferentes antes de entrar al helper.

## Cadena física — Exportar Excel

Trazar completamente:

IGF Forecast ARR
→ Clientes por mes
→ datos cargados
→ estado React
→ simulaciones/ediciones
→ botón Exportar Excel
→ función export
→ dataset serializado
→ columnas Excel

Responder específicamente:

¿El Excel exporta:

A) resultado backend original;
B) resultado ya transformado en frontend;
C) estado React actual;
D) valores simulados/editados;
E) una nueva consulta?

Identificar:

archivo
función
objeto
campos
transformaciones.

## Cadena física — Director IA

Trazar:

pregunta
→ planner
→ periodo
→ computeDeltaIngresoClientesPorMes
→ target/version
→ loader clientes A/B
→ computeClientesDescuentoMes
→ ingresoClienteMarginal
→ Delta
→ negatives
→ sort
→ Top N
→ comments
→ response

Identificar exactamente:

qué inputs entrega a computeClientesDescuentoMes.

## Comparación física obligatoria

Crear matriz:

BOUNDARY
| EXPORT/DASHBOARD
| DIRECTOR IA
| SAME / DIFFERENT / UNKNOWN
| EVIDENCE

Como mínimo:

plant_id
period A
period B
request timestamp semantics
kg A dataset
kg B MTD dataset
targetKg
sum MTD
projection factor
discount A
discount B
HG A
HG B
margin A
margin B
version_id
version_number
upload_day
client identity
null handling
rounding
cache/state
input row count
output row count

## No reabrir fórmula sin evidencia

El FIX anterior dejó compartido:

lib/ingreso-cliente-marginal.js

y reutilizó:

computeClientesDescuentoMes.

Auditar que efectivamente ambas superficies llaman la misma lógica.

Si sí:

NO recomendar otro cambio de fórmula.

Buscar primero divergencia en INPUTS/CUT/STATE.

## Excel export / simulaciones

Esta sección es crítica.

La UI permite campos editables para descuento septiembre.

Determinar:

- si cambiar un input modifica únicamente React state;
- si actualiza una estructura usada por Exportar Excel;
- si persiste al backend;
- si exportar toma el valor editado;
- si Director IA puede tener acceso a ese mismo valor.

Si Excel puede incorporar simulaciones no persistidas:

dejar explícito que:

“paridad exacta contra cualquier estado local del browser”

no es posible para un chat independiente sin un contrato adicional.

NO diseñar ese contrato todavía.

## Target IGF

Determinar exactamente si ambas rutas resuelven:

venta_ton

desde el mismo:

- month/year;
- plant;
- version_id;
- version_number;
- financial_state;
- selection rule.

No basta que ambas digan “latest”.

## Same-cut reproducibility

Determinar si el código actual permite construir una prueba determinística en la que:

el mismo input dataset
→ Dashboard/export
→ Director IA

produzcan exactamente los mismos clientes y deltas.

Si sí, indicar cómo.

Esto será la base del siguiente regression gate si hace falta.

## Runtime false-green / limitación actual

Auditar:

R-DELTA-PARITY-001..010.

Explicar:

1. por qué ahora sí detectan fórmula/proyección;
2. qué fixture comparten;
3. qué boundary NO cubren;
4. por qué pueden quedar verdes aunque producción diverja por cut/state/version/input dataset;
5. qué nueva regresión hace falta para proteger same-cut parity.

No modificar tests.

## Future regression cases

NO implementarlos.

Proponer como mínimo:

R-DELTA-CUT-001
same input rowset parity.

R-DELTA-CUT-002
same target/version parity.

R-DELTA-CUT-003
same discount persisted inputs.

R-DELTA-CUT-004
same HG/margin inputs.

R-DELTA-CUT-005
same client universe/count.

R-DELTA-CUT-006
null vs zero handling.

R-DELTA-CUT-007
PUBLICO-like nonzero delta parity.

R-DELTA-CUT-008
PALMA-like small-value parity.

R-DELTA-CUT-009
MOVE-like ranking boundary parity.

R-DELTA-CUT-010
TopN and negative-count parity from a single shared snapshot.

No hardcodear clientes reales en producto.

Fixtures pueden ser equivalentes conceptuales.

## FIRST_BAD_BOUNDARY

La salida debe nombrar una frontera concreta.

Ejemplos válidos:

EXPORT_REACT_STATE
INPUT_DATASET
REQUEST_TIME_CUT
TARGET_VERSION_SELECTION
DISCOUNT_SOURCE
HG_SOURCE
MARGIN_SOURCE
CLIENT_ROWSET
NULL_NORMALIZATION
CACHE_SNAPSHOT

No aceptar:

RUNTIME_DIFFERENCE

sin más detalle.

## LIVE_DB

live_db_authorized: NO

No consultar producción.

Primero agotar tracing físico del código.

Si los importes exactos LIVE no pueden explicarse sin leer producción:

marcar:

NOT_PROVEN_WITHOUT_LIVE_DB

y entregar sondas/SELECTs mínimos exactos.

No ejecutar.

## SELECTs mínimos si hacen falta

Preparar únicamente si son indispensables.

### A — ventas/client rows

Para Acapulco:

PUBLICO EN GENERAL
CARBURACION PALMA SOLA
GRUPO MOVE EMPRESARIAL

agosto/septiembre 2026.

Incluir campos exactos usados por computeClientesDescuentoMes.

### B — target/version

Version y venta_ton efectiva de agosto/septiembre.

### C — descuento

Fuente persistida real para los tres clientes.

### D — margen/HG

Version y valores efectivos usados por ingresoClienteMarginal.

### E — rowset count

Consulta que permita reproducir:

total rows
delta negative
zero
positive

solo si la fórmula puede expresarse sin alterar semántica.

Si requiere helper JS, proponer una sonda read-only en vez de SQL incorrecto.

## In scope

- IGF Forecast ARR
- Clientes por mes
- Exportar Excel
- ArrClient.tsx
- export function
- React state relacionado
- computeClientesDescuentoMes
- ingresoClienteMarginal
- Director IA delta ingreso Clientes por mes path
- target/version loaders
- discount loaders
- HG/margin loaders
- null/zero handling
- sorting/filtering
- cache/state
- R-DELTA-PARITY read-only
- CURRENT_TASK
- report

## Out of scope

- implementación
- modificar tests
- cambiar fórmula
- cambiar ranking
- cambiar comentarios
- LIVE_DB
- frontend visual
- DB/schema
- migrations
- nuevos/reactivados
- alertas
- Delta Gastos
- causalidad
- commitment evaluation
- contracts
- merge
- deploy
- next task

## Prohibiciones

No hardcodear valores LIVE.
No cambiar source-of-truth.
No escribir tests.
No modificar producto.
No consultar LIVE_DB.
No asumir que Excel y Dashboard representan el mismo snapshot sin probarlo.
No asumir que el export contiene solo datos persistidos.
No atribuir diferencia a rounding sin demostrarla.
No merge.
No deploy.
No next task.

## Entregables

1. Executive summary máximo 15 líneas.
2. Export Excel physical chain.
3. Director IA physical chain.
4. Boundary comparison matrix.
5. PUBLICO deep trace.
6. PALMA SOLA deep trace.
7. GRUPO MOVE deep trace.
8. Negative universe/count analysis.
9. React simulation/export analysis.
10. Target/version analysis.
11. Discount analysis.
12. Margin/HG analysis.
13. Client identity/null analysis.
14. Cache/request-time analysis.
15. H1–H12 disposition.
16. FIRST_BAD_BOUNDARY.
17. Root cause(s).
18. R-DELTA-PARITY limitation / false-green explanation.
19. R-DELTA-CUT-001..010 proposed.
20. LIVE_DB probes if required.
21. Recommended next slice.
22. Git branch/commit/status.

## Completion

DRAFT.

Esperar G1 humano.

No implementar.
No tests.
No LIVE_DB.
No merge.
No deploy.

STOP.

DONE_PENDING_REVIEW

si código + evidencia permiten localizar una frontera suficientemente concreta para diseñar el siguiente FIX.

BLOCKED

si solo LIVE_DB puede determinar la frontera crítica.

No implementación.
No next task.

STOP.
