task_id: FIX-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001

task_type: FIX
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-07T11:55:30-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - IMPLEMENT FOLIO SEARCH PERIOD RANGE; NO SQL; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: a73cf044ff356f078318979c30a3260d9a75b4b7

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001.md

objective: Implementar rangos mensuales naturales en folio_search conservando exactamente la búsqueda SINGLE vigente, retirando el span temporal completo antes de extraer concepto y reutilizando la fuente mensual existente N veces sin SQL nuevo.

## North Star LIVE

Pregunta:

que apoyos de enero a agosto fueron de IMPRESORA?

Actual incorrecto:

period_month = 2026-01
concept_query = "a fueron de impresora"

Esperado:

period_mode = RANGE
period_start = 2026-01
period_end = 2026-08
concept_query = impresora

Scope:

SUPPORT_FAMILIES

## Contratos congelados

NO reabrir:

- frame relacional
- token sequence
- singular/plural controlado
- gas guardrail
- ALL_PUBLIC_FOLIOS
- SUPPORT_FAMILIES
- queryReviewableSupportFolios SQL
- fuente public.folios

NO SQL nuevo.
NO BETWEEN.
NO dependencia nueva.

## Modelo temporal

SINGLE conserva compatibilidad actual:

period_mode = SINGLE
period_month = YYYY-MM
period_start = null
period_end = null

RANGE:

period_mode = RANGE
period_month = null
period_start = YYYY-MM
period_end = YYYY-MM

Se acepta shape equivalente solo si mantiene compatibilidad observable y tests.

## Detección RANGE

Reconocer genéricamente:

de enero a agosto
desde enero hasta agosto
enero-agosto
julio a agosto
diciembre 2025 a febrero 2026

No hardcodear año 2026.

Los nombres de meses ya pertenecen a la gramática temporal existente.

## Año

Sin año:

enero a agosto
→ ambos extremos usan deps.now.year

Un año explícito aplicable al rango:

enero a agosto de 2026
→ 2026-01 .. 2026-08

Dos años explícitos:

diciembre 2025 a febrero 2026
→ 2025-12 .. 2026-02

No adivinar rollover.

## Rango invertido

agosto a julio del mismo año:

FAIL-CLOSED

No intercambiar extremos.

No interpretar como julio del año siguiente.

Respuesta segura:

el rango inicial es posterior al final; solicita corregirlo.

## Cap

Máximo 12 meses inclusivos.

Si el rango supera 12 meses:

FAIL-CLOSED.

No truncar silenciosamente.

## Concept extraction

PRIMERO identificar y retirar el span temporal completo.

DESPUÉS aplicar el pipeline vigente de concepto:

STRUCTURAL
→ relational frame
→ token matching

North Star:

"que apoyos de enero a agosto fueron de IMPRESORA?"

después de retirar span:

"que apoyos fueron de impresora"

→ concept_query = impresora

NO añadir "a" globalmente a STRUCTURAL_TOKENS.

## Fetch RANGE

Reutilizar exactamente:

queryReviewableSupportFolios

una vez por cada YYYY-MM del rango.

Mismo client.

Orden cronológico.

NO SQL nuevo.
NO copiar SQL.
NO modificar WHERE a BETWEEN.

## Partial failure

Si cualquier mes produce SOURCE_ERROR:

FAIL-CLOSED TODO EL RANGO.

No devolver resultados parciales como si fueran completos.

Puede indicar qué mes falló si existe evidencia física,
pero no debe listar un resultado parcial como respuesta final válida.

## Merge

Fusionar filas de todos los meses.

Deduplicar por identidad estable de folio.

Preferencia:

folio id físico si existe.

Si el helper actual usa id/folio_id, preservar ese contrato.

No deduplicar únicamente por concepto.

## Filtering order

Después de cargar el rango:

permission visibility
→ scope
→ concept matching
→ merge/dedup final según arquitectura más segura demostrada

No cambiar autorización.

## Count / limit

RECORD_LIMIT = 40 GLOBAL.

count:
cantidad total de matches deduplicados antes del truncado.

truncated:
count > 40

records:
máximo 40.

NO 40 por mes.

## Orden

Respuesta RANGE debe ser determinística.

Orden cronológico por mes_cargo.

Dentro del mismo mes preservar orden estable de la fuente
salvo que exista contrato previo distinto.

## Response

SINGLE conserva wording actual.

RANGE debe declarar:

mes_cargo 2026-01 a 2026-08

y concepto si existe.

Ejemplo:

Filtros: mes_cargo 2026-01 a 2026-08, concepto impresora.

Nunca debe mostrar solo 2026-01 para un RANGE.

## Sin concepto

"qué apoyos de enero a agosto?"

es válido.

Debe listar el scope completo del rango:

SUPPORT_FAMILIES

subject to global RECORD_LIMIT.

No inventar concepto.

## Tests obligatorios

R-FOLIO-RANGE-001
North Star falla antes y pasa después.

R-FOLIO-RANGE-002
North Star period_mode=RANGE.

R-FOLIO-RANGE-003
period_start=2026-01 con deps.now 2026.

R-FOLIO-RANGE-004
period_end=2026-08.

R-FOLIO-RANGE-005
concept_query=impresora.

R-FOLIO-RANGE-006
no concept "a fueron de impresora".

R-FOLIO-RANGE-007
"de enero a agosto".

R-FOLIO-RANGE-008
"desde enero hasta agosto".

R-FOLIO-RANGE-009
"enero-agosto".

R-FOLIO-RANGE-010
"julio a agosto".

R-FOLIO-RANGE-011
"agosto a agosto" válido un mes RANGE o normalización SINGLE documentada.

R-FOLIO-RANGE-012
"diciembre 2025 a febrero 2026".

R-FOLIO-RANGE-013
multi-year produce 2025-12..2026-02.

R-FOLIO-RANGE-014
agosto→julio fail-closed.

R-FOLIO-RANGE-015
no rollover inventado.

R-FOLIO-RANGE-016
rango >12 meses fail-closed.

R-FOLIO-RANGE-017
llama fuente una vez por mes.

R-FOLIO-RANGE-018
enero-agosto = 8 llamadas.

R-FOLIO-RANGE-019
orden de llamadas cronológico.

R-FOLIO-RANGE-020
misma queryReviewableSupportFolios.

R-FOLIO-RANGE-021
SQL nuevo NO.

R-FOLIO-RANGE-022
SQL copiado NO.

R-FOLIO-RANGE-023
partial failure fail-closed.

R-FOLIO-RANGE-024
no respuesta parcial silenciosa.

R-FOLIO-RANGE-025
dedup por folio id.

R-FOLIO-RANGE-026
count global antes de truncate.

R-FOLIO-RANGE-027
RECORD_LIMIT global 40.

R-FOLIO-RANGE-028
response declara start/end.

R-FOLIO-RANGE-029
sin concepto lista rango.

R-FOLIO-RANGE-030
SINGLE julio llantas no cambia.

R-FOLIO-RANGE-031
SINGLE agosto aceite no cambia.

R-FOLIO-RANGE-032
SINGLE julio gas no cambia.

R-FOLIO-RANGE-033
frame vigente no cambia.

R-FOLIO-RANGE-034
morphology vigente no cambia.

R-FOLIO-RANGE-035
gas != gasolina sigue pasando.

R-FOLIO-RANGE-036
folios -> ALL_PUBLIC_FOLIOS.

R-FOLIO-RANGE-037
apoyos -> SUPPORT_FAMILIES.

R-FOLIO-RANGE-038
apoyos/folios -> ALL_PUBLIC_FOLIOS.

R-FOLIO-RANGE-039
no Action Register fallback.

R-FOLIO-RANGE-040
no dependencia nueva.

## Product files permitidos

Preferentemente:

lib/director-ia-folio-search.js

Tests nuevos correspondientes.

Solo tocar otros product files si una regresión demuestra necesidad estricta.

No ampliar scope preventivamente.

## Suites obligatorias

- R-FOLIO-RANGE
- R-FOLIO-LANG
- R-FOLIO-TRUTH
- planner
- capabilities
- tool orchestrator
- M2/M4/M5/M6/IGF
- continuity
- Tier 1
- pre-deploy --gate

Si existe un fallo preexistente:

demostrarlo contra base_main_sha.

NEW FAILURE = 0.

## STOP CONDITIONS

STOP si requiere:

- SQL nuevo
- SQL BETWEEN
- DB/schema
- LIVE_DB
- nueva dependencia
- cambio de scope
- cambio de source
- cambio de autorización
- frontend
- server.js product behavior no previsto
- reabrir morphology/frame innecesariamente

## Reporte

Crear:

docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001.md

Debe comenzar:

IMPLEMENTATION_SHA:
BEFORE:
AFTER:

PERIOD_MODEL:
RANGE_PARSER:
CONCEPT_STRATEGY:
FETCH_STRATEGY:
DEDUP_STRATEGY:
PARTIAL_FAILURE:
GLOBAL_LIMIT:

NORTH_STAR:

SINGLE_UNCHANGED:
FRAME_UNCHANGED:
MORPHOLOGY_UNCHANGED:
SCOPE_UNCHANGED:

SQL_NEW:
DEPENDENCY_NEW:

001..040:
SUITES:
FILES:
RISKS:

## Completion

CURRENT_TASK → DONE_PENDING_REVIEW

Commit únicamente en rama FIX.

STOP.

NO merge.
NO push main.
NO deploy.
NO LIVE_DB.
NO next task.
