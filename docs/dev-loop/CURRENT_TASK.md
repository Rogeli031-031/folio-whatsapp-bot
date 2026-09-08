task_id: FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-TEMPORAL-SAFETY-GATE-001

task_type: FIX
mode: REGRESSION_FIRST

status: AUTHORIZED

authorized_by: "Human Approver"
authorized_at: "2026-09-08T16:11:23-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN - FINANCIAL DIAGNOSIS M9 TEMPORAL SAFETY GATE ONLY; NO M9 QUERY CHANGE; NO FORECAST POR CLIENTE; NO NET DELTA; NO SQL; NO LIVE_DB; NO POST-GENERATION VALIDATOR; NO MERGE; NO DEPLOY"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: a39f6b1bfd02ce2ce5c78b86cb79e30e10c830f5
result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-M9-TEMPORAL-SAFETY-GATE-001.md

## Problema probado

M9 Delta Venta compara por año/mes:

SUM(arr.ventas_diarias_cliente.kg)

sin:

- cutoff parity
- upload_day
- same-day comparison
- forecast

En mes abierto, periodo B es OBSERVED_MTD por los datos disponibles.

La auditoría probó:

M9_CUTOFF_PARITY_EXISTS=NO
M9_USES_UPLOAD_DAY=NO

buildAlignment.status=comparable significa únicamente
overlap de etiquetas YYYY-MM.

NO significa paridad temporal de ventanas.

Caso LIVE Acapulco:

IGF 2026-09 = 1506.3507 ton
ARR forecast 2026-09 = 1469.36 ton

M9 2026-08 -> 2026-09:

mas = 3194.1 kg
disminuyeron = 1059160.26 kg
dejaron = 113087.4 kg

Aritmética bruta:

3194.1 - 1059160.26 - 113087.4
= -1169053.56 kg

Ese número sería SUM(deltaKg) observado del universo M9.

NO es forecast.
NO es IGF-ARR gap.
NO es delta neto forecast de planta.

## North Star

Pregunta:

¿Por qué cayó el ingreso?

Financial Diagnosis NO debe usar como explicación financiera
los buckets de M9 cuando el par es:

mes cerrado completo
vs
mes actual abierto OBSERVED_MTD

sin paridad de corte.

## Regla temporal requerida

Crear una evaluación temporal LOCAL de Financial Diagnosis.

NO modificar el SQL ni los loaders M9.

Debe distinguir:

PERIOD_LABEL_ALIGNMENT

de

TEMPORAL_WINDOW_ALIGNMENT.

Cuando:

- M9 periodo B corresponde al mes calendario actual
- y M9 no posee cutoff parity

debe producir semántica equivalente a:

M9_CURRENT_PERIOD_MODE=OBSERVED_MTD
M9_CUTOFF_PARITY=NO
M9_TEMPORAL_COMPARABILITY=UNSAFE
M9_FINANCIAL_DIAGNOSIS_USAGE=CONTEXT_ONLY

## Gate determinista requerido

Cuando:

M9_TEMPORAL_COMPARABILITY=UNSAFE

los valores numéricos detallados de buckets M9 NO deben
exponerse al LLM como evidencia para coincidencias,
tensiones, drivers o explicación financiera.

El contexto puede declarar:

M9 periodo 2026-08 -> 2026-09
current side = OBSERVED_MTD
cutoff parity = NO
uso financiero comparativo = UNSAFE

pero NO entregar como evidencia analítica:

1059160.26
113087.4
3194.1
5906844.35

para que el LLM los use contra IGF/ARR.

No destruir el payload interno.
No modificar la fuente.
Solo gatear su exposición al contexto/prompt de
financial_diagnosis cuando sea temporalmente inseguro.

## Alineación

Preservar buildAlignment() físicamente sin cambio.

Pero corregir la semántica del prompt:

alignment.status=comparable
=
PERIOD_LABEL_ALIGNMENT=comparable

NO
=
TEMPORAL_WINDOW_ALIGNMENT=comparable.

Si temporal safety = UNSAFE:

FORBIDDEN:
- decir "todos los bloques son temporalmente comparables"
- comparar magnitudes M9 con IGF/ARR
- usar M9 como tensión contra IGF/ARR
- usar M9 para explicar caída del ingreso
- causalidad

REQUIRED:
- explicar brevemente que M9 compara el mes previo con
  observación MTD del mes abierto sin paridad de corte
- por eso M9 no se usa para explicar el resultado financiero
  de cierre/proyección.

## IGF / ARR

No modificar.

Preservar:

observed_venta_ton != projected_venta_ton != IGF commitment.

1469.36 debe seguir siendo PROJECTED, nunca observed.

## No tocar

lib/director-ia-m9-deltas.js
lib/director-ia-igf-arr.js
lib/director-ia-dashboard-forecast-adapter.js
server.js
planner
routing
SQL
schema
dependencies
commercial_state
DICF

No modificar buildAlignment().

No crear:

M9 net delta nuevo
forecast por cliente
same-day M9
nuevo SQL
post-generation validator
OpenAI retry

## Producto permitido

lib/director-ia-financial-diagnosis.js

Puede añadirse helper local determinista exclusivamente para:

- detectar mes actual
- clasificar M9 OBSERVED_MTD
- calcular temporal safety
- controlar qué M9 se expone al contexto/prompt

Debe permitir fecha inyectable en tests.
No depender de reloj real en fixtures.

## Preservar

M9 gross bucket labels
M9_PLANT_NET_DELTA_STATUS=NOT_AVAILABLE
pretruncate counts
null != zero
SOURCE_PARTIAL
CAUSAL_EVIDENCE=NONE
IGF/ARR semantics
authorization gates

## Regresiones mínimas

001 current M9 period B -> OBSERVED_MTD
002 current M9 cutoff parity -> NO
003 current M9 temporal comparability -> UNSAFE
004 label alignment can remain comparable
005 comparable label != temporal comparable
006 unsafe M9 bucket numbers withheld from LLM context
007 1059160.26 not exposed in unsafe prompt context
008 113087.4 not exposed in unsafe prompt context
009 3194.1 not exposed in unsafe prompt context
010 M9 delta ingreso bucket total not exposed unsafe
011 internal M9 payload unchanged
012 historical closed pair not automatically called MTD
013 date injectable
014 no wall-clock-dependent fixture
015 ARR projected preserved
016 ARR observed preserved
017 1469.36 cannot be labeled observed when projected field
018 IGF commitment distinct
019 no IGF-ARR=M9 equivalence
020 buildAlignment unchanged
021 no M9 SQL change
022 no M9 loader change
023 no same-day implementation
024 no client forecast
025 no net delta reconstruction
026 gross labels intact
027 pretruncate intact
028 SOURCE_PARTIAL intact
029 null != zero intact
030 CAUSAL_EVIDENCE NONE intact
031 no causal use of unsafe M9
032 no tension using unsafe M9 numbers
033 prompt explicitly explains temporal limitation
034 context explicitly explains temporal limitation
035 no post-generation validator
036 no OpenAI retry
037 no planner
038 no routing
039 no server
040 no schema
041 no dependencies
042 FD tests pass
043 prompt-status tests pass
044 gross-bucket tests pass
045 M9 tests pass
046 ARR Root1 tests pass
047 ARR tests pass
048 Tier1 pass
049 pre-deploy gate PASS
050 NEW FAILURE=0

## LIVE expected

Para Acapulco, septiembre abierto:

NO:

"Delta Venta disminuyeron 1059160.26 kg"
como evidencia para explicar ingreso.

NO:

"puede estar relacionado"

NO:

"todos los bloques son comparables"
en sentido temporal.

Esperado equivalente:

"IGF y ARR corresponden a septiembre.
M9 compara agosto contra observación MTD de septiembre
sin paridad de corte, por lo que no uso ese bloque para
explicar el resultado financiero del mes."

Después puede mostrar hechos IGF/ARR defendibles,
sin atribuir causalidad.

## Completion

Si PASS:

CURRENT_TASK -> DONE_PENDING_REVIEW
commit en rama FIX
STOP

No merge.
No push main.
No deploy.
No LIVE_DB.
No siguiente tarea.
