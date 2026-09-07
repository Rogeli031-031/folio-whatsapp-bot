task_id: AUDIT-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-07T12:19:53-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - READ_ONLY FOLIO COMPOSITIONAL QUERY GRAMMAR AUDIT; NO IMPLEMENTATION; NO SQL; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 5184e98665b7a6993043fd0e7e518f558c7bc917

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001.md

objective: Determinar el cambio lingüístico mínimo para que folio_search separe operadores conceptuales, conectores gramaticales y frases de alcance sin contaminar concept_query, preservando todos los contratos LIVE ya validados.

## Contratos LIVE congelados

NO reabrir:

- SINGLE month
- RANGE month
- enero→agosto
- multi-month fetch
- fail-closed parcial
- frame ya vigente
- token sequence
- morfología controlada
- gas != gasolina
- ALL_PUBLIC_FOLIOS
- SUPPORT_FAMILIES
- public.folios
- queryReviewableSupportFolios
- SQL

Estos ya funcionan.

## Evidencia LIVE — problema 1: disyunción conceptual

Pregunta:

que folios fueron de bonos o bono para agosto?

Actual:

period_month = 2026-08
concept_query = "bonos o bono"
0 resultados

El matcher vigente interpreta los tokens:

[bonos, o, bono]

como una única secuencia contigua.

Auditar si el lenguaje natural requiere representar:

bonos OR bono

como alternativas conceptuales.

NO asumir aún el shape.

Evaluar como posible contrato:

concept_mode = SINGLE | ANY
concept_query = string | null
concept_alternatives = [phrase...]

o equivalente mínimo compatible.

## Evidencia LIVE — problema 2: conector residual

Pregunta:

que folios son de agosto de bonos?

Actual:

period_month = 2026-08
concept_query = "de bonos"

Traza esperada físicamente:

quitar agosto
→ "que folios son de de bonos"
→ STRUCTURAL
→ "son de de bonos"
→ stripRelationalFrame
→ "de bonos"

Determinar la frontera exacta.

No resolver poniendo "de" como stopword global.

Guardrail obligatorio:

aceite de motor

debe conservar el "de" interno.

## Evidencia LIVE — problema 3: frase de alcance contamina concepto

Pregunta:

que apoyos o inversiones de enero a agosto fueron de MAYAN PALACE?

Actual:

period_mode = RANGE
period_start = 2026-01
period_end = 2026-08
scope = SUPPORT_FAMILIES
concept_query = "o inversiones fueron de mayan palace"

0 resultados.

Bajo el contrato vigente:

"apoyos"
→ SUPPORT_FAMILIES
→ GASTOS + INVERSIONES + TALLER

Por tanto "o inversiones" NO debe convertirse silenciosamente en parte
del concepto buscado.

Auditar si debe clasificarse como:

- frase redundante de scope que se retira antes del concepto; o
- facet de categoría; o
- otra representación.

NO reabrir el significado congelado de SUPPORT_FAMILIES.

No ampliar todavía standalone "inversiones" a un nuevo intent.
Solo documentar colisiones con rutas existentes si las hay.

## Evidencia visual humana

Existe en el Excel mostrado por el usuario una fila:

F-202605-029
MAY 2026
INVERSIONES
Concepto contiene:
MAYAN PALACE PUERTA 4
Importe:
29000
Estatus:
PAGADO

Esto demuestra el objetivo humano de búsqueda.

NO usar esta evidencia como prueba automática de que la misma fila está
en public.folios.

NO LIVE_DB.

## Preguntas obligatorias

A.
que folios fueron de bonos o bono para agosto?

B.
que folios son de agosto de bonos?

C.
que folios de agosto fueron de bonos?

D.
que folios de agosto fueron de bono?

E.
que folios de agosto fueron de bonos o vales?

F.
que folios de agosto fueron de aceite de motor o filtros de aire?

G.
que apoyos o inversiones de enero a agosto fueron de MAYAN PALACE?

H.
que apoyos de enero a agosto fueron de MAYAN PALACE?

I.
que apoyos/folios de enero a agosto fueron de MAYAN PALACE?

J.
que apoyos de enero a agosto fueron de gas?

K.
que apoyos de enero a agosto fueron de O-RING?

L.
que apoyos de enero a agosto fueron de SELLO O-RING?

M.
que apoyos o folios de enero a agosto fueron de impresora?

## Operador "o"

Auditar cuándo el token español:

o

debe significar disyunción conceptual.

No convertir cualquier letra/palabra "o" en operador sin contexto.

Guardrail:

O-RING

no debe romperse en una disyunción vacía.

SELLO O-RING

no debe interpretarse accidentalmente como:

SELLO OR RING

si la forma física conserva el guion.

Determinar la regla mínima.

No implementar parser booleano general.

Solo determinar si una disyunción ANY de alternativas conceptuales es suficiente.

## Morfología

NO ampliar automáticamente las reglas solo para:

bono ↔ bonos

La regla vigente de vocal+s usa longitud mínima auditada.

Determinar si:

"bonos o bono"

puede resolverse de forma segura mediante alternativas,
sin relajar morfología global.

No hardcode de bono.

## Boundary connectors

Evaluar si después de:

1. periodo/rango
2. STRUCTURAL
3. relational frame

debe existir un recorte adicional SOLO de conectores de frontera.

Ejemplo:

"son de agosto de bonos"
→ bonos

pero:

"aceite de motor"
→ aceite de motor

No eliminar "de" medial.

## Scope phrase

Auditar específicamente:

apoyos o inversiones

apoyos o folios

folios o apoyos

No permitir que:

o inversiones
o folios
o apoyos

entren al concept matcher cuando forman parte inequívoca del sujeto/scope.

Pero tampoco convertir nombres de categoría en stopwords globales.

## Existing helpers

Buscar en repo:

- concept alternatives
- OR parsing
- search facets
- category parsing
- scope parsing
- token-expression parsing

Si existe helper reutilizable:
documentarlo y probar compatibilidad.

Si no:

EXISTING_COMPOSITION_HELPER_REUSABLE = NO

## Clasificaciones obligatorias

DISJUNCTION_CLASSIFICATION:

A. MISSING_CONCEPT_ALTERNATIVE_MODEL
B. MORPHOLOGY_ONLY
C. BOTH
D. OTHER

BOUNDARY_CONNECTOR_CLASSIFICATION:

A. POST_FRAME_BOUNDARY_CONNECTOR_LEAK
B. STRUCTURAL_MODEL_INCOMPLETE
C. OTHER

SCOPE_PHRASE_CLASSIFICATION:

A. REDUNDANT_SCOPE_PHRASE_LEAK
B. CATEGORY_FACET_REQUIRED
C. BOTH
D. OTHER

## Estrategias a comparar

Para alternativas:

1. substring/token actual
2. ANY de frases completas
3. bag-of-words
4. parser booleano general

Preferir mínimo cambio seguro.

Para scope:

1. borrar "inversiones" globalmente
2. reconocer frase de scope antes del concepto
3. category filter
4. otra infraestructura existente

No implementar.

## Invariantes

RANGE sigue funcionando.

North Star anterior debe permanecer:

que apoyos de enero a agosto fueron de IMPRESORA?

→ concept_query impresora
→ RANGE 2026-01..2026-08

Julio llantas sigue funcionando.

Gas sigue sin encontrar gasolina.

"aceite de motor" sigue siendo secuencia.

## Desired semantic outcomes a evaluar

A:

period = 2026-08
scope = ALL_PUBLIC_FOLIOS
concept alternatives conceptualmente:
bonos | bono

B:

period = 2026-08
scope = ALL_PUBLIC_FOLIOS
concept = bonos

G:

period = RANGE 2026-01..2026-08
scope = SUPPORT_FAMILIES
concept = mayan palace

El término "inversiones" NO debe quedar dentro del concepto bajo ese
scope congelado.

I:

apoyos/folios
→ ALL_PUBLIC_FOLIOS

M:

apoyos o folios
debe determinarse si equivale de forma segura a ALL_PUBLIC_FOLIOS,
coherente con la regla vigente cuando aparece "folios".

## Reporte obligatorio

Crear:

docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001.md

Debe comenzar exactamente:

DISJUNCTION_CLASSIFICATION:
DISJUNCTION_FIRST_BAD_BOUNDARY:

BOUNDARY_CONNECTOR_CLASSIFICATION:
BOUNDARY_FIRST_BAD_BOUNDARY:

SCOPE_PHRASE_CLASSIFICATION:
SCOPE_FIRST_BAD_BOUNDARY:

EXISTING_COMPOSITION_HELPER_REUSABLE:
YES / NO

SAFE_DISJUNCTION_STRATEGY:
...

SAFE_BOUNDARY_STRATEGY:
...

SAFE_SCOPE_PHRASE_STRATEGY:
...

BONOS_OR_BONO_EXPECTED:
...

DE_BONOS_EXPECTED:
...

MAYAN_PALACE_EXPECTED:
...

O_RING_SAFE:
YES / NO

ACEITE_DE_MOTOR_SAFE:
YES / NO

RANGE_UNCHANGED:
YES / NO

MORPHOLOGY_UNCHANGED:
YES / NO

SCOPE_CONTRACT_UNCHANGED:
YES / NO

ONE_FIX_CAN_HANDLE_COMPOSITION:
YES / NO

FIX CONTRACT:
...

FILES FUTUROS:
...

A-M MATRIX:
...

## Prohibido

NO implementación.
NO SQL.
NO DB/schema.
NO LIVE_DB.
NO frontend.
NO dependencia nueva.
NO parser booleano general.
NO "o" como stopword global.
NO "de" como stopword global.
NO "inversiones" como stopword global.
NO hardcode de BONO.
NO hardcode de MAYAN PALACE.
NO cambio de range.
NO cambio de morphology.
NO cambio de source.
NO merge.
NO deploy.
NO next task.

## Completion

CURRENT_TASK → DONE_PENDING_REVIEW

STOP.
