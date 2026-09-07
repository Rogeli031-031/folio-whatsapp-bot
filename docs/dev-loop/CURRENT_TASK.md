task_id: FIX-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-07T12:28:04-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - IMPLEMENT FOLIO COMPOSITIONAL QUERY GRAMMAR; NO SQL; NO RANGE CHANGES; NO MORPHOLOGY CHANGES; NO MERGE; NO DEPLOY; NO LIVE_DB"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 517f746e6488574b8df937986e6f9c849861b563

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001.md

objective: Corregir composición lingüística de folio_search separando frases cerradas de scope/sujeto, conectores residuales de frontera y alternativas conceptuales ANY, sin modificar rango, morfología, fuentes ni SQL.

## LIVE failures

### A — concepto alternativo

Pregunta:

que folios fueron de bonos o bono para agosto?

Actual:

period_month = 2026-08
concept_query = "bonos o bono"
0 resultados

Esperado:

scope = ALL_PUBLIC_FOLIOS
period_month = 2026-08
concept_mode = ANY
concept_alternatives = ["bonos", "bono"]

No relajar morfología global para resolver bono/bonos.

### B — boundary connector residual

Pregunta:

que folios son de agosto de bonos?

Actual:

concept_query = "de bonos"

Esperado:

concept_query = "bonos"

### C — scope phrase contaminando concepto

Pregunta:

que apoyos o inversiones de enero a agosto fueron de MAYAN PALACE?

Actual:

scope = SUPPORT_FAMILIES
concept_query = "o inversiones fueron de mayan palace"

Esperado:

scope = SUPPORT_FAMILIES
period_mode = RANGE
period_start = 2026-01
period_end = 2026-08
concept_mode = SINGLE
concept_query = "mayan palace"

## Contratos congelados

NO modificar:

- SINGLE month
- RANGE parser
- range cap
- monthly fetch
- partial fail-closed
- token sequence
- controlled morphology
- gas guardrail
- queryReviewableSupportFolios
- SQL
- authorization

Scope vigente:

folios
→ ALL_PUBLIC_FOLIOS

apoyos
→ SUPPORT_FAMILIES

apoyos/folios
→ ALL_PUBLIC_FOLIOS

SUPPORT_FAMILIES:
GASTOS + INVERSIONES + TALLER

## 1. Scope / subject phrases

Reconocer únicamente frases cerradas inequívocas del sujeto:

apoyos o inversiones
apoyos o folios
folios o apoyos

Estas frases deben retirarse del texto que luego alimenta concept extraction.

NO hacer:

"inversiones" como stopword global

NO introducir category facet.

NO nuevo intent de inversiones.

La resolución de scope debe permanecer coherente:

apoyos o inversiones
→ SUPPORT_FAMILIES

apoyos o folios
→ ALL_PUBLIC_FOLIOS

folios o apoyos
→ ALL_PUBLIC_FOLIOS

La palabra concreta "inversiones" puede aparecer en la gramática cerrada
de scope porque forma parte del contrato auditado.

No usar nombres de conceptos de negocio.

## 2. Boundary connector post-frame

Pipeline conceptual:

retirar scope phrase
→ retirar periodo/range
→ STRUCTURAL
→ relational frame
→ boundary connector residual
→ concepto

Después del relational frame se permite recortar UNA sola preposición
residual al inicio:

de
con

solo si está en frontera inicial.

Ejemplo:

son de agosto de bonos
→ de bonos
→ bonos

Pero:

aceite de motor
→ aceite de motor

NO eliminar "de" medial.

NO agregar "de" o "con" a STRUCTURAL_TOKENS.

## 3. Concept modes

Mantener compatibilidad SINGLE.

SINGLE:

concept_mode = SINGLE
concept_query = string | null
concept_alternatives = []

ANY:

concept_mode = ANY
concept_query = null
concept_alternatives = [phrase1, phrase2, ...]

Se acepta shape equivalente solo si conserva compatibilidad observable.

## 4. Disjunction ANY

Reconocer únicamente operador espacial:

" o "

entre DOS O MÁS frases conceptuales no vacías.

Ejemplo:

bonos o bono
→ ["bonos", "bono"]

bonos o vales
→ ["bonos", "vales"]

Cada alternativa conserva:

- token sequence
- morphology existente

Matching ANY:

una fila coincide si cualquiera de las frases completas coincide.

NO bag-of-words.

NO parser booleano general.

NO AND/NOT.

## 5. O-RING guardrail

"O-RING"

NO debe dividirse por el operador conceptual.

El parser ANY NO puede usar simplemente:

\b o \b

Debe requerir el operador espacial auditado.

El tokenizador existente puede seguir procesando el texto posteriormente.

Casos:

O-RING
→ SINGLE

SELLO O-RING
→ SINGLE

No generar alternativa vacía.

## 6. Multiword alternatives

Pregunta:

que folios de agosto fueron de aceite de motor o filtros de aire?

Debe producir conceptualmente:

ANY:
- aceite de motor
- filtros de aire

Cada alternativa se compara como secuencia contigua completa.

NO:

[aceite, motor, filtros, aire] como bolsa.

## 7. Response semantics

SINGLE:
conservar wording existente.

ANY:
la respuesta debe declarar de manera veraz las alternativas.

Ejemplo aceptable:

concepto cualquiera de: bonos | bono

No debe imprimir:

concepto null

ni fingir que la búsqueda fue una sola frase.

## 8. Sin concepto

No romper búsquedas de rango sin concepto.

concept_mode puede permanecer SINGLE con concept_query=null.

No crear ANY vacío.

## Tests obligatorios

R-FOLIO-COMP-001
"bonos o bono" falla antes y pasa después.

R-FOLIO-COMP-002
concept_mode ANY.

R-FOLIO-COMP-003
alternatives ["bonos","bono"].

R-FOLIO-COMP-004
bonos hace match independientemente.

R-FOLIO-COMP-005
bono hace match independientemente.

R-FOLIO-COMP-006
no requiere que aparezca "o" en la fila.

R-FOLIO-COMP-007
"bonos o vales" ANY.

R-FOLIO-COMP-008
"aceite de motor o filtros de aire" conserva dos frases completas.

R-FOLIO-COMP-009
ANY no es bag-of-words.

R-FOLIO-COMP-010
O-RING permanece SINGLE.

R-FOLIO-COMP-011
SELLO O-RING permanece SINGLE.

R-FOLIO-COMP-012
no alternativa vacía por O-RING.

R-FOLIO-COMP-013
"son de agosto de bonos" → bonos.

R-FOLIO-COMP-014
"de agosto fueron de bonos" → bonos.

R-FOLIO-COMP-015
"aceite de motor" conserva de medial.

R-FOLIO-COMP-016
"relacionados con agosto con bonos" no elimina conectores internos indiscriminadamente.

R-FOLIO-COMP-017
apoyos o inversiones → SUPPORT_FAMILIES.

R-FOLIO-COMP-018
apoyos o inversiones no contamina concepto.

R-FOLIO-COMP-019
MAYAN PALACE → concept_query "mayan palace".

R-FOLIO-COMP-020
MAYAN PALACE mantiene RANGE 2026-01..2026-08.

R-FOLIO-COMP-021
apoyos o folios → ALL_PUBLIC_FOLIOS.

R-FOLIO-COMP-022
folios o apoyos → ALL_PUBLIC_FOLIOS.

R-FOLIO-COMP-023
apoyos/folios → ALL_PUBLIC_FOLIOS sin cambio.

R-FOLIO-COMP-024
inversiones NO se añade a STRUCTURAL_TOKENS global.

R-FOLIO-COMP-025
"o" NO se añade a STRUCTURAL_TOKENS global.

R-FOLIO-COMP-026
"de" NO se añade a STRUCTURAL_TOKENS global.

R-FOLIO-COMP-027
range anterior impresora sigue funcionando.

R-FOLIO-COMP-028
single julio llantas sigue funcionando.

R-FOLIO-COMP-029
motor/motores morphology sigue funcionando.

R-FOLIO-COMP-030
gas != gasolina sigue funcionando.

R-FOLIO-COMP-031
partial range fail-closed sigue funcionando.

R-FOLIO-COMP-032
range cap sigue 12.

R-FOLIO-COMP-033
queryReviewableSupportFolios sin cambios.

R-FOLIO-COMP-034
SQL nuevo NO.

R-FOLIO-COMP-035
SQL copiado NO.

R-FOLIO-COMP-036
dependencia nueva NO.

R-FOLIO-COMP-037
no intent nuevo standalone inversiones.

R-FOLIO-COMP-038
response ANY declara alternativas.

R-FOLIO-COMP-039
response SINGLE permanece compatible.

R-FOLIO-COMP-040
no Action Register fallback.

## Regression first

Demostrar rojo antes del product change para:

A.
que folios fueron de bonos o bono para agosto?

B.
que folios son de agosto de bonos?

C.
que apoyos o inversiones de enero a agosto fueron de MAYAN PALACE?

Con fixtures físicos.

No LIVE_DB.

## Product files permitidos

Preferentemente:

lib/director-ia-folio-search.js

Tests nuevos.

Solo tocar planner/chat/tools si una regresión demuestra necesidad estricta.

No ampliar alcance preventivamente.

## Suites

- R-FOLIO-COMP
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

Si existe fallo preexistente:

probarlo contra base_main_sha.

NEW FAILURE = 0.

## STOP CONDITIONS

STOP si requiere:

- SQL
- schema
- LIVE_DB
- nueva dependencia
- cambio de RANGE
- cambio de morphology
- cambio de SUPPORT_FAMILIES
- category facet nuevo
- intent nuevo de inversiones
- parser booleano general
- frontend
- server.js product behavior no previsto

## Reporte

Crear:

docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-SEARCH-COMPOSITIONAL-QUERY-GRAMMAR-001.md

Debe comenzar:

IMPLEMENTATION_SHA:
BEFORE:
AFTER:

SCOPE_PHRASE_STRATEGY:
BOUNDARY_STRATEGY:
CONCEPT_MODEL:
ANY_STRATEGY:

O_RING:
ACEITE_DE_MOTOR:
MAYAN_PALACE:

RANGE_UNCHANGED:
MORPHOLOGY_UNCHANGED:
SCOPE_CONTRACT_UNCHANGED:

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
