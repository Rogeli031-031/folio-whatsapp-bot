task_id: AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-05T14:49:42-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-05 - READ_ONLY AUDIT ONLY; NO LIVE_DB"
objective: Localizar la primera frontera física donde Clientes por mes y Director IA dejan de compartir periodo/kg/forecast/descuento/margen/agrupación y por qué WAL MART pasa de +$511,219 a -$309,994.

in_scope:
  - IGF Forecast ARR Clientes por mes (solo tracing)
  - frontend tracing read-only
  - endpoint / helper / loader / SQL de Delta Ingreso
  - lib/delta-ingreso-forecast.js (computeDeltaIngresoForecast)
  - lib/dicf.js (computeDicf) solo si participa
  - computeClientesDescuentoMes solo si participa
  - Director IA planner/routing solo tracing
  - Director IA delta-income forecast path
  - margin / discount / forecast loaders
  - client identity/grouping
  - R-DELTA-INCOME-001..010 solo lectura (false-green)
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001.md

out_of_scope:
  - implementación
  - modificar tests
  - comentarios como feature
  - alertas
  - nuevos/reactivados
  - movement calendar fix
  - fórmula de rentabilidad
  - Delta Gastos
  - HG
  - DB/schema
  - migrations
  - frontend changes
  - docs/director-ia/
  - contratos congelados
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
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001.md (evidencia CLOSED; no reabre el FIX)
  - contratos vigentes aplicables (obedecer, no reescribir)

allowed_actions:
  - (solo tras G1 humano) trazar en solo lectura ambas cadenas
  - escribir el reporte de auditoría
  - proponer R-DELTA-PARITY-001..010 sin implementarlas
  - si el código no alcanza: NOT_PROVEN_WITHOUT_LIVE_DB y SELECTs read-only mínimos, sin ejecutarlos
  - dejar DONE_PENDING_REVIEW o BLOCKED

forbidden_actions:
  - escribir AUTHORIZED_BY_HUMAN
  - poner status AUTHORIZED
  - crear, borrar o modificar authorized_by, authorized_at o human_authorization
  - implementar producto
  - modificar tests
  - consultar LIVE_DB
  - hardcodear clientes o importes como regla
  - aceptar “usan helpers diferentes” sin el primer input/transformación
  - asumir Dashboard o computeDeltaIngresoForecast correcto porque Runtime PASS
  - modificar docs/director-ia/
  - merge/push a main
  - deploy
  - abrir siguiente tarea

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DELTA-INGRESO-FORECAST-DASHBOARD-PARITY-001.md

## Estado

DRAFT. No hay Gate G1. No es ejecutable.

## North Star de negocio

Director IA debe ayudar a aumentar mes con mes:

- rentabilidad operativa;
- rentabilidad final;

y evitar retrocesos.

La prioridad ejecutiva es detectar correctamente qué clientes deterioran más el Delta Ingreso del periodo forecast.

Para esta capacidad, el Delta Ingreso utilizado por Director IA debe tener paridad con el Delta Ingreso mostrado en:

IGF Forecast ARR
→ Clientes por mes
→ Delta Ingreso

salvo que exista una razón contractual explícita, físicamente demostrada, para mostrar una métrica distinta.

No asumir que una de las dos superficies es correcta.
Probarlo.

## Contexto

El FIX anterior:

FIX-DIRECTOR-IA-DELTA-INGRESO-FORECAST-NEGATIVE-TOPN-COMMENTS-001

corrigió:

- planner;
- routing;
- forecast intent;
- explicit month;
- Top N;
- comments enrichment.

La pregunta LIVE ya entra correctamente a Delta Ingreso Forecast en MXN.

Pero producción demuestra que los montos NO tienen paridad con el Dashboard.

Por tanto:

NO reabrir PLANNER salvo tracing.
NO asumir que el problema sigue siendo routing.
La frontera crítica ahora está aguas abajo.

## Pregunta LIVE

Planta:

Acapulco

Pregunta:

`Dame 5 clientes que tengan el mayor impacto negativo en el ingreso para el mes de septiembre, y ponme sus comentarios.`

Respuesta Director IA:

`Delta Ingreso Forecast (MXN) de Acapulco: Agosto 2026 real vs septiembre 2026 forecast.`

Director IA reportó:

1. PUBLICO EN GENERAL: -$536,735
2. GRUPO MOVE EMPRESARIAL: -$430,513
3. NUEVA WAL MART DE MEXICO: -$309,994
4. 21 DURANGO: -$237,353
5. 62 CALZADA: -$213,806

Top 5 acumulado:

-$1,728,401

## Evidencia humana Dashboard

Misma planta:

Acapulco

Comparación:

Agosto 2026
vs
Septiembre 2026

Superficie:

IGF Forecast ARR
→ Clientes por mes

### PUBLICO EN GENERAL

Ingreso agosto:
$724,462

Ingreso septiembre:
$502,898

Delta Ingreso Dashboard:

-$221,564

Director IA:

-$536,735

### GRUPO MOVE EMPRESARIAL

Ingreso agosto:
$738,246

Ingreso septiembre:
$639,172

Delta Ingreso Dashboard:

-$99,074

Director IA:

-$430,513

### NUEVA WAL MART DE MEXICO

Ingreso agosto:
$519,948

Ingreso septiembre:
$1,031,167

Delta Ingreso Dashboard:

+$511,219

Director IA:

-$309,994

Esto es una divergencia crítica de SIGNO.

En Dashboard:

positivo

En Director IA:

negativo

Por tanto WAL MART no debería pertenecer al conjunto negativo si la superficie Dashboard representa el contrato ejecutivo.

### 21 DURANGO

Ingreso agosto:
$349,130

Ingreso septiembre:
$312,082

Delta Ingreso Dashboard:

-$37,048

Director IA:

-$237,353

### 62 CALZADA

Ingreso agosto:
$314,117

Ingreso septiembre:
$278,389

Delta Ingreso Dashboard:

-$35,728

Director IA:

-$213,806

## Aritmética Dashboard observada

La pantalla cumple:

delta_ingreso
=
ingreso_septiembre
-
ingreso_agosto

Ejemplo GRUPO MOVE:

639,172
-
738,246
=
-99,074

Ejemplo WAL MART:

1,031,167
-
519,948
=
+511,219

El audit debe comprobar dónde se originan los valores A y B.

No asumir que la captura prueba el contrato interno.

## Objetivo único

Localizar físicamente la primera frontera donde:

IGF Forecast ARR → Clientes por mes

y

Director IA → Delta Ingreso Forecast

dejan de usar los mismos:

- periodo;
- cliente;
- kg;
- descuento;
- margen;
- forecast;
- versión;
- agrupación;
- ingreso A;
- ingreso B;
- Delta Ingreso.

No aceptar como conclusión:

`usan helpers diferentes`

sin explicar exactamente qué input o transformación genera la divergencia.

## Pregunta principal

¿Por qué, para el mismo Acapulco y agosto→septiembre 2026:

Dashboard:
WAL MART = +$511,219

pero:

Director IA:
WAL MART = -$309,994?

El audit NO puede cerrarse correctamente sin localizar la primera frontera capaz de explicar este cambio de signo, o marcar:

NOT_PROVEN_WITHOUT_LIVE_DB

con los SELECTs exactos necesarios.

## Cadena física obligatoria — Dashboard

Trazar completamente:

IGF Forecast ARR
→ Clientes por mes
→ frontend
→ endpoint
→ handler
→ helper
→ loader
→ SQL/query
→ tablas
→ cliente identity
→ periodo A
→ periodo B
→ kg A/B
→ descuento A/B
→ margen
→ ingreso A/B
→ Delta Ingreso
→ sorting/filter
→ rendering

Identificar:

archivo
función
query
tabla
columnas
unidad
transformación

en cada frontera.

No asumir que la superficie usa `computeDicf`.
Demostrarlo físicamente.

## Cadena física obligatoria — Director IA

Trazar:

pregunta
→ planner
→ intent
→ period resolution
→ delta income forecast route
→ helper seleccionado
→ query
→ tablas
→ cliente identity
→ kg A/B
→ descuento A/B
→ margen
→ forecast/projection
→ ingreso A/B
→ delta
→ negatives filter
→ ranking
→ Top N
→ comments enrichment
→ response

Identificar exactamente:

qué objeto llega al ranking.

## Comparación helper vs helper

Determinar físicamente si las cadenas usan:

- computeDeltaIngresoForecast;
- computeDicf;
- computeClientesDescuentoMes;
- otro helper;
- combinación.

Para cada helper relevante documentar:

INPUT PERIOD
SOURCE TABLE
KG SOURCE
DISCOUNT SOURCE
MARGIN SOURCE
FORECAST METHOD
CLAMPING
ROUNDING
CLIENT GROUPING
OUTPUT UNIT
DELTA FORMULA

## Matriz obligatoria por cliente

Construir:

CLIENT
| Dashboard source
| Director IA source
| Dashboard A
| IA A
| Dashboard B
| IA B
| Dashboard Delta
| IA Delta
| Dashboard Sign
| IA Sign
| FIRST_BAD_BOUNDARY

para:

PUBLICO EN GENERAL
GRUPO MOVE EMPRESARIAL
NUEVA WAL MART DE MEXICO
21 DURANGO
62 CALZADA

Si A/B internos de Director IA no son visibles actualmente, localizar cómo obtenerlos sin modificar producto.

## FIRST_BAD_BOUNDARY

Debe ser una frontera física específica.

Ejemplos válidos:

PERIOD_RESOLUTION
FORECAST_PROJECTION
KG_SOURCE
DISCOUNT_SOURCE
MARGIN_VERSION
CLIENT_AGGREGATION
SOURCE_SELECTION
OVERRIDE_APPLICATION
CACHE_CUT
FORMULA
CLAMPING
ROUNDING

No aceptar:

`HELPER_DIFFERENCE`

sin más precisión.

Debe decir:

qué valor entra;
qué valor sale;
dónde cambia;
por qué.

## Hipótesis obligatorias

Marcar:

PROVEN
REJECTED
NOT_PROVEN
NOT_PROVEN_WITHOUT_LIVE_DB

### H1 — Misma tabla, distinto helper

Dashboard y Director IA parten de las mismas tablas pero transforman distinto.

### H2 — Periodo distinto

Agosto/septiembre no representan exactamente los mismos límites o corte.

### H3 — Forecast distinto

La proyección de septiembre usa una metodología distinta entre ambas superficies.

### H4 — Margen distinto

Dashboard y Director IA usan distinta versión / valor de margen IGF.

### H5 — Descuento distinto

El descuento de septiembre que entra al ingreso difiere entre superficies.

### H6 — Override/UI

Los valores editables de descuento o forecast en el Dashboard aplican overrides que `computeDeltaIngresoForecast` no incorpora.

### H7 — KG distinto

Los kg forecast de septiembre son diferentes antes de calcular ingreso.

### H8 — Client aggregation

El mismo nombre agrupa filas/canales/subcanales de forma distinta.

### H9 — Clamp

Uno de los helpers aplica:

max(0, ingreso)

u otro clamp y el otro no.

### H10 — Version / snapshot

Usan diferente `version_id`, snapshot, cache o momento de cálculo.

### H11 — Sign error

Existe una inversión de signo o A/B.

### H12 — Source-of-truth mismatch

`computeDeltaIngresoForecast` no representa la misma métrica ejecutiva que “Clientes por mes”.

## WAL MART — tracing especial

Este caso es prioridad máxima.

Dashboard:

A = $519,948
B = $1,031,167
Delta = +$511,219

Director IA:

Delta = -$309,994

Determinar:

1. cuál es IA A;
2. cuál es IA B;
3. qué kg A/B usa;
4. qué descuento A/B usa;
5. qué margen usa;
6. cuál de esos inputs diverge primero;
7. si el cambio de signo ocurre antes o dentro de la fórmula de ingreso.

No cerrar con:

`diferente forecast`

sin demostrar el valor específico que cambia.

## PUBLICO / MOVE — tracing especial

Determinar por qué la magnitud negativa en Director IA es aproximadamente mucho mayor que Dashboard.

Buscar:

- A incorrecto;
- B incorrecto;
- forecast incompleto;
- descuento;
- margen;
- corte del mes;
- agrupación;
- proyección;
- override.

## 21 DURANGO / 62 CALZADA

Determinar por qué IA amplifica considerablemente el deterioro.

No asumir misma causa que PUBLICO/MOVE sin probarlo.

## Forecast de septiembre

Auditar exactamente qué significa:

`Ingreso septiembre`

en la superficie Dashboard.

Determinar si usa:

- venta real MTD;
- forecast a cierre;
- ritmo diario;
- días calendario;
- días operativos;
- promedio histórico;
- override manual;
- descuento capturado;
- margen latest;
- otra lógica.

Luego comparar contra la ruta de Director IA.

## Descuento editable

La UI muestra campos editables de descuento septiembre.

Determinar:

- si son solo presentación;
- si modifican estado frontend;
- si se mandan al backend;
- si afectan el forecast;
- si se persisten;
- si `computeDeltaIngresoForecast` recibe esos valores;
- si Director IA puede verlos.

No modificar frontend.

## Margin/version

Para cada superficie determinar:

- tabla IGF;
- scope GLOBAL/planta;
- year/month;
- version_id;
- version_number;
- financial_state;
- latest rule;
- fallback.

No asumir que el mismo `7.12` llega a ambas rutas.

## Cache / estado

Determinar si alguna superficie usa:

- cache en memoria;
- snapshot previo;
- object state;
- frontend state;
- request body con valores que no están en DB;
- `MAX(fecha)`;
- `NOW`;
- request-specific period.

## Ranking

No auditar todavía si el Top 5 de Dashboard real es exactamente el mostrado por IA hasta primero cerrar paridad de valores.

El ranking solo puede considerarse válido si los Delta Ingreso base son válidos.

## Comentarios

Los comentarios NO son el foco de esta auditoría.

Solo confirmar que el enrichment ocurre después del cálculo y no altera:

- ingreso;
- delta;
- ranking.

No reabrir BAYAM salvo que comments afecten accidentalmente routing/data path.

## Runtime false-green

Auditar:

R-DELTA-INCOME-001..010

Responder:

1. qué helper fixturean;
2. qué inputs usan;
3. qué boundary prueban;
4. por qué pudieron PASS aunque producción no tenga paridad con Dashboard;
5. si el fixture estaba validando solamente consistencia interna de `computeDeltaIngresoForecast` en vez de paridad con la fuente ejecutiva.

Especial atención:

R-DELTA-INCOME-010
forecast vs historical source

Puede estar validando la fuente equivocada.

## Future Runtime parity regressions

NO implementarlas.

Proponer como mínimo:

R-DELTA-PARITY-001
Dashboard source vs Director IA A.

R-DELTA-PARITY-002
Dashboard source vs Director IA B.

R-DELTA-PARITY-003
Delta arithmetic parity.

R-DELTA-PARITY-004
Sign parity.

R-DELTA-PARITY-005
Forecast kg parity.

R-DELTA-PARITY-006
Discount parity.

R-DELTA-PARITY-007
Margin/version parity.

R-DELTA-PARITY-008
Client aggregation parity.

R-DELTA-PARITY-009
Override parity.

R-DELTA-PARITY-010
Top N computed only after source parity.

## Source of truth

El audit debe recomendar cuál componente debe ser el contrato ejecutivo de:

`Delta Ingreso por cliente`

pero NO implementarlo.

La recomendación debe basarse en:

- cuál alimenta realmente “Clientes por mes”;
- cuál coincide con la lectura usada por negocio;
- cuál acepta periodo explícito;
- cuál incorpora forecast/overrides reales;
- cuál evita duplicar fórmula.

No elegir por conveniencia técnica.

## LIVE_DB

live_db_authorized: NO

No consultar producción.

Si código + fixtures no permiten explicar físicamente los importes observados:

marcar:

NOT_PROVEN_WITHOUT_LIVE_DB

y entregar SELECTs mínimos.

Como mínimo, si hacen falta:

### SELECT A — rows de ventas

Para Acapulco y los cinco clientes:

- fecha;
- kg;
- cliente_nombre;
- cliente_norm;
- canal;
- subcanal/grupo si aplica;

agosto/septiembre 2026.

### SELECT B — IGF margin/version

- version_id;
- version_number;
- financial_state;
- year/month;
- empresa/planta;
- margen_kg;

para septiembre.

### SELECT C — discount/forecast inputs

Tabla/campos exactos usados por ambas superficies.

### SELECT D — cache/snapshot

Si existe persistencia/cut relevante.

No ejecutar.

Requiere G1 LIVE_DB separado.

## In scope

- IGF Forecast ARR Clientes por mes
- frontend tracing read-only
- endpoint relacionado
- computeDeltaIngresoForecast
- computeDicf
- computeClientesDescuentoMes si participa
- delta-ingreso-forecast
- Director IA planner/routing solo tracing
- Director IA delta-income forecast path
- margin loader
- discount loaders
- forecast logic
- client identity/grouping
- relevant Runtime fixtures/tests solo lectura
- CURRENT_TASK
- report

## Out of scope

- implementación
- modificar tests
- comentarios como feature
- alertas
- nuevos/reactivados
- movement calendar fix
- rentabilidad formula
- Delta Gastos
- HG
- DB/schema
- migrations
- frontend changes
- contracts
- LIVE_DB
- merge
- deploy
- next task

## Prohibiciones

No hardcodear clientes.
No corregir valores.
No cambiar helper.
No cambiar planner.
No modificar tests.
No LIVE_DB.
No asumir Dashboard correcto sin tracing.
No asumir computeDeltaIngresoForecast correcto porque Runtime PASS.
No inventar source of truth.
No merge.
No deploy.
No next task.

## Entregables

1. Executive summary máximo 15 líneas.
2. Dashboard physical chain.
3. Director IA physical chain.
4. Helper comparison matrix.
5. Five-client evidence matrix.
6. WAL MART deep trace.
7. PUBLICO/MOVE deep trace.
8. 21 DURANGO/62 CALZADA trace.
9. Forecast semantics.
10. Discount/override analysis.
11. Margin/version analysis.
12. Cache/snapshot analysis.
13. H1–H12 disposition.
14. FIRST_BAD_BOUNDARY por cliente.
15. Root cause(s).
16. Runtime false-green explanation.
17. Future R-DELTA-PARITY-001..010.
18. Source-of-truth recommendation.
19. LIVE_DB SELECTs si se requieren.
20. Recommended next FIX slice.
21. Git branch/commit/status.

## Completion

DONE_PENDING_REVIEW

si la causa puede demostrarse físicamente.

BLOCKED

si la diferencia de producción requiere LIVE_DB para cerrar la frontera crítica.

No implementación.
No next task.

STOP.