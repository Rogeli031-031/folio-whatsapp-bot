task_id: AUDIT-DIRECTOR-IA-FOLIO-SUPPORTS-CONCEPT-MONTH-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-07T08:42:57-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - READ_ONLY FOLIO SUPPORTS CONCEPT MONTH AUDIT; NO IMPLEMENTATION; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: d66f37e1e02d515526e612db7754de6dcd55cc13

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-SUPPORTS-CONCEPT-MONTH-001.md

objective: Determinar físicamente el FIRST_BAD_BOUNDARY de la consulta natural "que apoyos/folios tenemos para septiembre de llantas?" y comprobar si, además del reconocimiento del intent, existen o faltan extracción de mes/concepto, capacidad de listado, tool/executor y filtros físicos sobre Folios.

## Evidencia LIVE

Planta:
Acapulco

Pregunta:
que apoyos/folios tenemos para septiembre de llantas?

Respuesta:
No se pudo determinar una intención clara con las reglas actuales Indica si quieres el diagnóstico de la planta actual, un cliente concreto u otro tema. No asumo el hilo ni consulto Action Register a ciegas.

## Hipótesis inicial

PLANNER_LEXICAL_MISS

Es solo hipótesis.

NO cerrar diagnóstico sin trazar físicamente toda la cadena.

## Traza obligatoria

QUESTION
→ normalization
→ planner intent
→ structured filters
→ capability/domain
→ tool plan
→ executor
→ loader/helper
→ physical Folios source
→ plant filter
→ month filter
→ concept/text filter
→ response

Marcar cada frontera:

PASS
FAIL
MISSING
AMBIGUOUS
NOT_REACHED

## Sondas obligatorias

Probar read-only:

A. qué folios tenemos de llantas?
B. qué folios tenemos en septiembre?
C. qué folios tenemos en septiembre de llantas?
D. qué apoyos tenemos de llantas?
E. qué apoyos tenemos en septiembre?
F. qué apoyos/folios tenemos para septiembre de llantas?
G. muéstrame los folios de llantas de septiembre
H. qué gastos de llantas tenemos en septiembre?

Para cada una registrar:

normalized question
intent
confidence
clarification
domains
tool plan si existe

## Preguntas que debe resolver la auditoría

1. ¿folio_status sirve solo para un folio individual o también para listados?
2. ¿Existe una capacidad SEARCH/LIST FOLIOS BY FILTERS?
3. ¿"apoyos" y "folios" convergen en la misma capacidad?
4. ¿Existe hoy extracción estructurada de:
   - planta
   - mes
   - concepto libre?
5. ¿Existe tool/executor con esos filtros?
6. ¿Existe loader reutilizable de Folios sin SQL nuevo?
7. ¿Qué campo físico puede contener "llantas"?
8. ¿Qué campo de fecha debería representar "septiembre"?
9. ¿Qué datos se pueden devolver físicamente:
   - folio
   - concepto/descripción
   - importe
   - fecha
   - estatus
   - proveedor?
10. ¿La palabra "apoyos" está siendo confundida con igf_reviewable_supports o clasificacion_apoyos?

## Importante

NO asumir que el FIX es una regex.

NO asumir que basta con reconocer "folio".

La pregunta requiere potencialmente:

LISTADO + PLANTA + MES + CONCEPTO LIBRE.

Si el planner empieza a reconocerla pero no existe ejecución física de esos filtros, documentar el siguiente boundary también.

## Clasificación principal

Elegir exactamente una:

A. PLANNER_PATTERN_MISSING
B. FILTER_EXTRACTION_MISSING
C. LIST_SEARCH_INTENT_MISSING
D. TOOL_EXECUTOR_MISSING
E. EXISTING_LOADER_NOT_CONNECTED
F. SOURCE_FILTER_SEMANTICS_UNDEFINED
G. MULTIPLE_BOUNDARIES

Además indicar:

FIRST_BAD_BOUNDARY: ...

y, si aplica:

NEXT_BAD_BOUNDARY: ...

## Archivos mínimos a inspeccionar

- lib/director-ia-planner.js
- lib/director-ia-capabilities.js
- lib/director-ia-tools.js
- lib/director-ia-tool-orchestrator.js
- lib/director-ia-chat.js
- loaders/helpers existentes de Folios
- server.js solo lectura para localizar fuente
- tests existentes de planner/folios

## Prohibido

NO implementación.
NO regex nueva.
NO tests permanentes.
NO SQL nuevo.
NO DB/schema.
NO LIVE_DB.
NO frontend.
NO Action Register como sustituto.
NO merge.
NO push main.
NO deploy.
NO next task.

## Reporte obligatorio

El reporte debe comenzar:

CLASIFICACIÓN: ...

FIRST_BAD_BOUNDARY: ...

NEXT_BAD_BOUNDARY: ... o NONE

PLANNER ACTUAL: ...

LIST/SEARCH FOLIOS CAPABILITY: YES/NO/PARTIAL

FUENTE FÍSICA: ...

FILTRO PLANTA: YES/NO

FILTRO MES: YES/NO/AMBIGUOUS

FILTRO CONCEPTO LIBRE: YES/NO/PARTIAL

CAMPO FÍSICO PARA "LLANTAS": ...

SEMÁNTICA TEMPORAL DE "SEPTIEMBRE": ...

FIX MÍNIMO RECOMENDADO: ...

ARCHIVOS QUE TOCARÍA: ...

TESTS QUE ESCRIBIRÍA: ...

Después:

CURRENT_TASK → DONE_PENDING_REVIEW

STOP.

NO implementación.
NO merge.
NO deploy.
NO next task.
