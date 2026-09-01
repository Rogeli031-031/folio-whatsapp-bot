# CURRENT_TASK

task_id: IMPL-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"

authorized_at: "2026-09-01T17:06:10-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver autorizó implementar historical_margin después de aprobar y cerrar AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001."

task_type: IMPLEMENTATION

branch: implementation/director-ia-historical-margin-questions-001

base_main_sha: 1f7774d7bff5fdd71f4e7b88433dde178f4fef86

implementation_authorized: YES

merge_authorized: NO

deploy_authorized: NO

max_attempts: 1

## Objective

Implementar una capacidad read-only, determinista y fuente-defendible:

historical_margin

para responder correctamente:

P1:
¿Cuál fue el margen en mayo?

P2:
¿Cuál fue el margen de abril y el de mayo?

P3:
¿Cuál es el mejor margen del año?

P4:
¿Cuál fue el menor margen del año?

La capacidad debe soportar además año explícito, planta explícita,
mes abierto, periodo futuro y continuidad conversacional controlada.

No resolver mediante prompt-only patch.

No permitir que el LLM calcule el valor, delta, máximo o mínimo.

## Approved architecture

Pipeline objetivo:

semantic detection
→ operation resolution
→ calendar period resolution
→ plant resolution
→ authorization
→ source adapter
→ deterministic calculation
→ deterministic evidence/result
→ deterministic response builder

Operations:

- single_month
- compare_months
- year_max
- year_min

## Fundamental truth contract

MARGEN significa:

MARGEN $/kg

No significa:

- descuento/kg
- venta
- toneladas
- OLS
- commercial_trend
- ingreso
- utilidad
- resultado final
- Delta Ingreso
- DICF

## Closed calendar month

Un mes cerrado SOLO puede presentarse como margen histórico real
si existe evidencia financiera FINAL defendible.

Contrato:

- igf.versions
- plant_code = GLOBAL
- year/month solicitados
- exactamente una versión financial_state = FINAL
- igf.compromiso_lines de esa versión
- una fila de planta resuelta de forma única
- usar el margen_kg ALMACENADO de esa fila

NO usar:

- latest como sustituto de FINAL
- getMargenKgPorPeriodo legacy
- promedio ILIKE de varias empresas
- forecast como cierre
- fallback 0
- fallback 1
- margen de otro mes
- margen de otra planta

margen_kg = 0 es un valor numérico válido si está realmente almacenado
en una fuente FINAL válida.

null / undefined / NaN / nonfinite no son 0.

## Open current month

Para el mes calendario actualmente abierto:

- NO llamarlo cierre;
- NO llamarlo "margen que fue";
- puede responderse únicamente con el latest IGF almacenado
  si existe fuente defendible;
- etiquetar inequívocamente como FORECAST;
- usar margen_kg almacenado de la fila única de planta;
- incluir version_id/version_number cuando corresponda en metadata;
- no mezclarlo con FINAL;
- no usarlo en rankings históricos anuales.

Ejemplo semántico:

Margen forecast de septiembre 2026: X.XX $/kg.
Septiembre está abierto; no lo presento como cierre real.

## Future calendar month

Un mes posterior al mes calendario actual:

- no se presenta como histórico;
- no inventar forecast;
- no retroceder automáticamente al año anterior;
- no convertir octubre 2026 en octubre 2025;
- DATA_NOT_FOUND/fail-closed para esta capacidad.

## Plant matching

La auditoría demostró que el ILIKE legacy es ambiguo.

historical_margin NO debe usar:

empresa ILIKE '%nombre%'

ni una suma/promedio de todas las coincidencias.

La fila debe resolverse de forma única y defendible.

Implementar matcher dedicado y fail-closed.

Preferencias admitidas:

1. igualdad normalizada exacta contra plant_code o planta_nombre;
2. equivalencia exacta después de normalización controlada de prefijos
   físicos conocidos GT/GTM, únicamente si es única;
3. una sola fila candidata.

Si hay 0:
DATA_NOT_FOUND.

Si hay >1 candidatos defendibles:
SOURCE_ERROR o SOURCE_PARTIAL explícito
con plant_match_ambiguous = true.

No elegir arbitrariamente la primera.

No fuzzy.

No substring amplio.

No LLM.

## Plant resolution / authorization

- usar planta actual como anchor;
- reconocer planta explícita conocida;
- revalidar autorización sobre la planta explícita;
- no cross-plant;
- no ampliar permisos actuales.

Para closed ACTUAL_FINANCIAL:
mantener como mínimo la semántica de autorización existente
de financial actual.

Para open FORECAST:
no otorgar permisos más amplios que el camino IGF financiero existente.

Si la reutilización exacta de auth implica acoplamiento inseguro:
preferir el comportamiento más restrictivo y documentarlo.

No modificar esquema de permisos.

## Period resolver

Debe ser propio de historical_margin.

No copiar a ciegas el resolver de historical_new_clients porque ese resolver
puede mover un mes nominal posterior al mes actual hacia el año anterior.

Con fecha CDMX 2026-09-01:

mayo
→ 2026-05

abril y mayo
→ 2026-04 + 2026-05

mayo 2025
→ 2025-05

septiembre
→ 2026-09 OPEN

octubre
→ 2026-10 FUTURE

"del año"
→ año calendario actual

"de 2025"
→ 2025

Soportar enero/diciembre y cambio de año.

## P1 single_month

Pregunta:

¿Cuál fue el margen en mayo?

Resultado futuro esperado:

Mayo 2026: X.XX $/kg.

Debe indicar que proviene de cierre FINAL cuando corresponda.

No toneladas.
No OLS.
No comparación forzada contra abril.
No forecast.
No OpenAI.

## P2 compare_months

Pregunta:

¿Cuál fue el margen de abril y el de mayo?

Resultado futuro esperado:

Abril 2026: X.XX $/kg
Mayo 2026: Y.YY $/kg
Variación mayo − abril: ±Z.ZZ $/kg

Reglas:

- ambos periodos deben ser comparables;
- para dos meses cerrados: ambos FINAL;
- misma planta;
- misma magnitud;
- delta desde valores raw;
- redondear solo display;
- no calcular delta desde números ya formateados.

Si las dos fuentes tienen distintas truth classes
(p. ej. closed actual vs open forecast):
NO presentar el delta como comparación histórica homogénea.

Fail closed o respuesta parcial explícita.

## P3 / P4 annual ranking

Preguntas:

¿Cuál es el mejor margen del año?
¿Cuál fue el menor margen del año?

Ranking determinista.

Para current year:

solo meses calendario cerrados anteriores al current month.

A 2026-09-01:
enero–agosto son candidatos;
septiembre open no participa;
octubre–diciembre future no participan.

Para un año pasado:
enero–diciembre son candidatos.

Por cada candidato:

- unique FINAL
- unique plant row
- margen_kg finite
- 0 es valor válido
- missing no es 0
- source error no es 0

Ranking:

- usar raw margin;
- max/min determinista;
- tie sobre raw values, no sobre valores redondeados;
- reportar todos los meses empatados.

Si faltan algunos meses:

puede responder sobre los meses FINAL válidos,
PERO debe declarar cobertura y exclusiones.

No afirmar "de todo el año" si la cobertura es parcial.

Si existe source error en meses excluidos:
veracity global debe reflejar SOURCE_PARTIAL.

Si no hay meses válidos:
DATA_NOT_FOUND o SOURCE_ERROR según causa.

## Veracity mapping

Distinguir físicamente:

SOURCE_AVAILABLE
SOURCE_PARTIAL
SOURCE_RESTRICTED
SOURCE_ERROR
DATA_NOT_FOUND

Ejemplos:

0 versions
→ DATA_NOT_FOUND

versions pero no FINAL para closed
→ DATA_NOT_FOUND / cierre FINAL no disponible

>1 FINAL
→ SOURCE_ERROR / VERSION_AMBIGUOUS

FINAL sin fila de planta
→ DATA_NOT_FOUND

multiple plant candidates
→ SOURCE_ERROR o SOURCE_PARTIAL explícito

DB/query error
→ SOURCE_ERROR

margen_kg null/nonfinite
→ DATA_NOT_FOUND

margen_kg = 0
→ valor válido

future
→ DATA_NOT_FOUND sin consultar como histórico

## Deterministic builder

P1-P4 no requieren OpenAI.

openai_called = false

El builder debe producir la respuesta final.

LLM no decide:

- valor
- periodo
- delta
- máximo
- mínimo
- empate
- source class
- plant
- closed/open/future

## Routing

Crear intent dedicado:

historical_margin

y dominio:

historical_margin

Debe ganar para preguntas explícitamente históricas de margen
con periodo o extrema anual.

NO debe robar:

C1:
¿Cómo va el margen de la planta?
→ conservar financial_diagnosis / ruta actual.

C2:
¿Cómo cambió el descuento de abril a mayo?
→ delta_discount.

C3:
¿Cómo va la tendencia de CASA los últimos 30 días?
→ commercial_trend.

C4:
¿Qué clientes nuevos entraron en agosto?
→ historical_new_clients.

C5:
¿Cuál fue la venta de mayo?
→ no convertir en margen.

No corregir en esta tarea el regex legacy `margenes?`
si historical_margin funciona sin tocarlo.

No hacer prompt-only patch de IGF annex.

## Human observed bug to eliminate

Fresh turn:

¿Cuál fue el margen en mayo?

ANTES:
unknown clarification.

Después de commercial_trend:
podía heredar commercial_trend y responder toneladas + OLS.

DESPUÉS:

la pregunta explícita de margen histórico debe ganar sobre herencia
de commercial_trend.

Nunca debe heredar commercial_trend si el nuevo mensaje
contiene una consulta histórica de margen reconocible.

## Continuity

Debe soportarse:

Turno 1:
¿Cuál fue el margen en abril?

Turno 2:
¿Y en mayo?

Turno 2 debe conservar:

- historical_margin
- planta autorizada

pero resolver el nuevo periodo mayo.

No reutilizar abril como periodo activo cuando mayo está explícito.

No convertir follow-up de otra capacidad en historical_margin
si no existe parent historical_margin.

## Golden executive regressions

Proteger expresamente:

¿Cómo vamos?

¿Cómo cerramos?

¿Cómo quedamos contra la meta?

¿Cómo va la tendencia de CASA los últimos 30 días?

¿Cómo van los comisionistas?

¿Qué clientes nuevos entraron en agosto?

¿Qué sabemos de TORTILLERIA ERICK?

Dame los kg comprados y el descuento por cada mes de TORTILLERIA ERICK desde enero a la fecha.

¿Y GRUPO MOVE?

¿Y Arturo?

¿Cómo cambió el descuento de abril a mayo?

No cambiar sus intents ni su semántica aprobada.

## Required implementation files

Se permite crear:

lib/director-ia-historical-margin.js

test/director-ia-historical-margin.test.js

docs/dev-loop/reports/IMPL-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001.md

Se permite modificar únicamente si es necesario:

lib/director-ia-planner.js
lib/director-ia-chat.js
lib/director-ia-capabilities.js
lib/director-ia-tools.js
lib/director-ia-conversation-state.js
docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md
docs/dev-loop/CURRENT_TASK.md

## Shared files read-only unless a blocker is physically proven

lib/director-ia-financial-actual.js
lib/director-ia-igf-arr.js
lib/director-ia-m9-deltas.js
lib/director-ia-new-clients.js
lib/director-ia-commercial-trend.js
lib/director-ia-financial-diagnosis.js
lib/director-ia-month-close-result.js
lib/director-ia-client-profile.js
lib/dicf.js
server.js

No modificar estos archivos por conveniencia.

Si crees que uno DEBE modificarse:
STOP antes de hacerlo y documenta el blocker.

## Source adapter preference

Reusar constantes/helpers existentes cuando sea seguro.

No es obligatorio reutilizar loadFinancialActualEvidence si su matcher actual
impide demostrar unicidad.

Opciones aceptables:

A. reutilizar loadFinancialActualEvidence con un matcher estricto
si se preserva la clasificación de ambigüedad;

o

B. adapter read-only local de historical_margin que replique el contrato
FINAL sin modificar el loader compartido.

En ambos casos:

- una sola conexión;
- SELECT-only;
- no HTTP interno;
- no schema change;
- no side effects.

## Required tests

Como mínimo cubrir:

P1 fresh turn
P1 after commercial_trend parent
P2
P3
P4
P5 mayo 2025
P6 mayo 2026 Acapulco
P7 mejor 2026 Acapulco
P8 menor 2026 Acapulco
P9 septiembre open
P10 octubre future

Además:

- month implicit year
- explicit year
- Jan/Dec rollover
- current year annual candidates
- past year annual candidates
- 0 versions
- no FINAL
- >1 FINAL
- no plant row
- ambiguous plant row
- DB source error
- margen null
- margen NaN/nonfinite
- margen 0 valid
- open forecast value
- open forecast label
- open not used in annual ranking
- future no query
- compare raw delta
- compare semantic mismatch
- annual missing month
- annual source error / SOURCE_PARTIAL
- annual ties raw
- annual 0 participates
- full source traceability
- auth current plant
- auth named plant
- unauthorized named plant
- no cross-plant
- deterministic answer
- openai_called false
- source metadata
- tool registry valid
- capability readable
- continuity historical_margin → "¿Y en mayo?"
- no inheritance from commercial_trend for explicit margin question

Golden regressions:

- ¿Cómo vamos?
- ¿Cómo cerramos?
- ¿Cómo quedamos contra la meta?
- commercial_trend
- historical_new_clients
- client_profile
- compound client query
- leading-Y
- delta_discount
- C1 financial_diagnosis

## Baseline and suite

Antes de editar runtime:

node --test test/director-ia-*.test.js

Esperado por historia actual:
1411 pass / 0 fail.

Si baseline falla:
STOP.
No ocultar baseline rojo.

Después de implementar:

- tests focalizados nuevos
- regresiones relacionadas
- suite completa:
  node --test test/director-ia-*.test.js

Debe terminar:
0 fail

y pass total > baseline.

También:

git diff --check

## Explicit forbidden changes

NO:

- server.js
- DB schema
- migrations
- writes DB
- DICF formula
- IGF dashboard
- ARR dashboard
- getMargenKgPorPeriodo legacy
- financial actual shared contract
- commercial trend formula
- OLS
- historical_new_clients behavior
- Action Register
- Folios
- Taller
- voice
- WhatsApp architecture
- Render
- deploy
- merge main
- next task
- hardcode Acapulco
- hardcode mayo
- hardcode 2026
- fabricate source data
- LLM ranking
- fuzzy plant selection
- `%nombre%` plant matching

## Report required

Crear:

docs/dev-loop/reports/IMPL-DIRECTOR-IA-HISTORICAL-MARGIN-QUESTIONS-001.md

Debe incluir:

- architecture implemented
- routing before/after
- operation resolver
- period resolver
- source contract
- FINAL semantics
- FORECAST semantics
- future protection
- plant matching
- auth
- veracity
- deterministic calculations
- continuity
- source traceability
- golden regressions
- tests
- files changed
- risks
- OUT_OF_SCOPE
- exact final state

## Final required keys

HISTORICAL_MARGIN_IMPLEMENTED =
SINGLE_MONTH =
COMPARE_MONTHS =
YEAR_MAX =
YEAR_MIN =

P1_ROUTE_AFTER =
P2_ROUTE_AFTER =
P3_ROUTE_AFTER =
P4_ROUTE_AFTER =

CLOSED_SOURCE =
CLOSED_FINAL_REQUIRED =
OPEN_SOURCE =
OPEN_LABEL =
FUTURE_BEHAVIOR =

PLANT_MATCH =
PLANT_AMBIGUITY_FAIL_CLOSED =
AUTH_PRESERVED =

DATA_NOT_FOUND_DISTINCT =
SOURCE_ERROR_DISTINCT =
ZERO_MARGIN_VALID =

DELTA_DETERMINISTIC =
RANKING_DETERMINISTIC =
TIES_DETERMINISTIC =
LLM_USED_FOR_VALUE = NO
LLM_USED_FOR_COMPARISON = NO
LLM_USED_FOR_RANKING = NO

CONTINUITY_MARGIN_FOLLOWUP =
COMMERCIAL_TREND_INHERITANCE_BUG_FIXED =

HOW_ARE_WE_REGRESSION =
MONTH_CLOSE_REGRESSION =
COMMERCIAL_TREND_REGRESSION =
HISTORICAL_NEW_CLIENTS_REGRESSION =
CLIENT_PROFILE_REGRESSION =
COMPOUND_CLIENT_REGRESSION =
LEADING_Y_REGRESSION =
DELTA_DISCOUNT_REGRESSION =

SERVER_CHANGED = NO
DB_SCHEMA_CHANGED = NO
DICF_CHANGED = NO
IGF_DASHBOARD_CHANGED = NO

TESTS =
GIT_DIFF_CHECK =

IMPLEMENTATION_AUTHORIZED = YES
MERGE_AUTHORIZED = NO
DEPLOY_AUTHORIZED = NO

## Allowed actions

- inspect source
- edit in-scope implementation files
- create new module/test/report
- run existing and new tests
- SELECT-only probes if DB is already configured
- git diff/log/status
- commit implementation
- push implementation branch

## Completion

At completion:

status: DONE_PENDING_REVIEW

Suggested commit:

feat(director-ia): answer historical margin questions

Push:

origin/implementation/director-ia-historical-margin-questions-001

Then STOP.

NO MERGE.
NO DEPLOY.
NO NEXT TASK.