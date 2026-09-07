task_id: AUDIT-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-07T11:41:28-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - READ_ONLY FOLIO SEARCH PERIOD RANGE AUDIT; NO IMPLEMENTATION; NO SQL; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 4dc15ac1d9870efeb1796a45a3135e699c1ec5d5

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-SEARCH-PERIOD-RANGE-001.md

objective: Determinar el cambio mínimo y veraz para que folio_search entienda rangos temporales naturales como "de enero a agosto", conserve correctamente el concepto buscado y consulte todos los meses del rango sin SQL nuevo.

## LIVE ya validado

NO reabrir:

- folio_search intent
- ALL_PUBLIC_FOLIOS
- SUPPORT_FAMILIES
- frame relacional
- token sequence
- singular/plural controlado
- gas guardrail
- SQL/source
- búsqueda de un solo mes

PASS real:

"qué apoyos de julio fueron de llantas?"
→ 2026-07
→ llantas
→ encontró LLANTA real.

PASS real:

"qué apoyos de julio fueron de gas?"
→ encontró GAS
→ no confundió GASOLINA.

## Nuevo North Star

"que apoyos de enero a agosto fueron de IMPRESORA?"

LIVE actual:

period_month = 2026-01
concept_query = "a fueron de impresora"

resultado vacío.

## Hipótesis física

Boundary 1:

SINGLE_MONTH_PERIOD_MODEL

extractPeriodMonth devuelve un solo YYYY-MM y toma el primer mes encontrado.

Boundary 2:

RANGE_CONNECTOR_LEAKS_INTO_CONCEPT

al retirar enero/agosto queda:

"a fueron de impresora"

y stripRelationalFrame ya no puede retirar "fueron de".

Boundary 3 potencial:

SINGLE_MONTH_SOURCE_INVOCATION

loadFolioSearchForChat consulta queryReviewableSupportFolios una sola vez con shaped.period_month.

Demostrar cada frontera.

## NO arreglar con

- añadir "a" globalmente a STRUCTURAL_TOKENS
- regex de IMPRESORA
- catálogo de conceptos
- SQL nuevo
- BETWEEN nuevo
- cambiar queryReviewableSupportFolios sin necesidad demostrada
- consultar LIVE_DB

El token "a" puede formar parte de otras expresiones y no debe eliminarse globalmente para simular un rango.

## Representación a evaluar

Determinar si el contrato futuro debe ser:

period_mode: SINGLE | RANGE

period_start: YYYY-MM
period_end: YYYY-MM

o una forma equivalente mínima.

Para SINGLE debe conservarse compatibilidad con period_month actual.

No implementar todavía.

## Estrategias de lectura a comparar

A. cambiar SQL a BETWEEN
B. reutilizar queryReviewableSupportFolios una vez por mes
C. helper existente de rango en repo
D. otra estrategia existente

Preferencia arquitectónica si es viable:

reusar lectura mensual existente N veces,
sin SQL nuevo ni duplicado.

Pero debe auditarse antes.

## Casos obligatorios

A.
apoyos de enero a agosto de impresora

B.
apoyos de enero a agosto fueron de impresora

C.
folios de enero a agosto de llantas

D.
folios desde enero hasta agosto de llantas

E.
folios enero-agosto de llantas

F.
folios de julio a agosto de isuzu

G.
folios de agosto a agosto de isuzu

H.
folios de diciembre 2025 a febrero 2026 de llantas

I.
folios de agosto a julio de llantas

Debe definir fail-closed o interpretación inequívoca para rango invertido.

J.
folios de enero a agosto

Sin concepto:
determinar si lista todo el scope del rango o requiere concepto.

## Año

Sin año explícito:

enero a agosto
→ usar año de deps.now para ambos extremos.

Con año explícito único:

enero a agosto de 2026
→ ambos 2026.

Con años por extremo:

diciembre 2025 a febrero 2026
→ respetar ambos.

No hardcode 2026.

## Concept extraction

Después de reconocer primero el span temporal completo:

"de enero a agosto"

o:

"desde enero hasta agosto"

ese span debe retirarse como unidad ANTES de extraer el concepto.

Entonces:

"que apoyos de enero a agosto fueron de IMPRESORA?"

debe terminar en:

concept_query = impresora

No resolverlo eliminando "a" globalmente.

## Fetch semantics

Determinar:

- cuántas llamadas mensuales máximas son seguras;
- orden cronológico;
- deduplicación si fuera necesaria;
- record limit global vs mensual;
- count correcto;
- truncated correcto;
- qué ocurre si un mes falla;
- si debe fail-closed todo el rango ante SOURCE_ERROR parcial.

No inventar respuesta parcial silenciosa.

## Response semantics

Para RANGE la respuesta debe declarar el rango real consultado.

Ejemplo conceptual:

Filtros: mes_cargo 2026-01 a 2026-08, concepto impresora.

No debe decir solamente:

mes_cargo 2026-01.

## Guardrails SINGLE

Todos deben permanecer iguales:

"julio fueron de llantas"
→ 2026-07

"agosto fueron de aceite"
→ 2026-08

"julio fueron de gas"
→ 2026-07

## Scope

Congelado:

folios → ALL_PUBLIC_FOLIOS
apoyos → SUPPORT_FAMILIES
apoyos/folios → ALL_PUBLIC_FOLIOS

## Auditoría física

Revisar:

lib/director-ia-folio-search.js
queryReviewableSupportFolios
helpers existentes de rango/periodo en repo
tests de folio_search
package.json solo si hace falta verificar dependencia existente

NO modificar product code.

## Reporte obligatorio

Comenzar exactamente:

RANGE_CLASSIFICATION:
RANGE_FIRST_BAD_BOUNDARY:

CONCEPT_RANGE_CLASSIFICATION:
CONCEPT_FIRST_BAD_BOUNDARY:

SOURCE_RANGE_CLASSIFICATION:
SOURCE_FIRST_BAD_BOUNDARY:

EXISTING_RANGE_HELPER_REUSABLE:
YES / NO

SAFE_PERIOD_MODEL:
...

SAFE_CONCEPT_STRATEGY:
...

SAFE_FETCH_STRATEGY:
...

SQL_CHANGE_REQUIRED:
YES / NO

MULTI_YEAR_SUPPORTED_SAFELY:
YES / NO

INVERTED_RANGE_BEHAVIOR:
...

PARTIAL_MONTH_FAILURE_BEHAVIOR:
...

GLOBAL_LIMIT_SEMANTICS:
...

A-J MATRIX:
...

NORTH_STAR_EXPECTED:
period_start = ...
period_end = ...
concept_query = ...

ONE_FIX_CAN_HANDLE_RANGE:
YES / NO

FIX CONTRACT:
...

FILES FUTUROS:
...

## Completion

CURRENT_TASK → DONE_PENDING_REVIEW

STOP.

NO implementación.
NO SQL.
NO LIVE_DB.
NO merge.
NO deploy.
NO next task.
