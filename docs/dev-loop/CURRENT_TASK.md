task_id: FIX-DIRECTOR-IA-FOLIO-SEARCH-FRAME-MORPHOLOGY-001

task_type: FIX
mode: REGRESSION_FIRST

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-07T11:03:41-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - IMPLEMENT FOLIO SEARCH FRAME + CONTROLLED TOKEN MORPHOLOGY; NO SQL; NO PERIOD CHANGES; NO MERGE; NO DEPLOY; NO LIVE_DB"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 4ff25f14a60a82a56f7d41e4c0fdf24ad4b584c6

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-SEARCH-FRAME-MORPHOLOGY-001.md

objective: Corregir falsos negativos de búsqueda natural de folios/apoyos separando el marco relacional del concepto y sustituyendo el substring matcher por matching secuencial de tokens con variantes singular/plural controladas.

## North Star LIVE

Planta:
Acapulco

Pregunta:

qué apoyos de julio fueron de llantas?

Estado actual:

period_month = 2026-07
concept_query = "fueron de llantas"
resultado = vacío

Además existe un folio real cuyo texto físico contiene:

LLANTA

Por tanto hay DOS boundaries independientes.

## Boundary 1 — FRAME

Actual:

"qué apoyos de julio fueron de llantas?"
→ "fueron de llantas"

Esperado:

→ "llantas"

Implementar un recorte de marco RELACIONAL únicamente al inicio del span conceptual.

Frames auditados:

fueron de
son de
eran de
relacionados con
relacionadas con
relacionado con
relacionada con

No convertir "de" ni "con" en stopwords globales.

No borrar preposiciones internas.

Ejemplo obligatorio:

"qué apoyos de agosto fueron de aceite de motor?"
→ concept_query = "aceite de motor"

NO:

"aceite motor"

## Boundary 2 — MORPHOLOGY

Matcher actual:

concepto.includes(needle) || sub.includes(needle)

Debe sustituirse para folio_search por matching de TOKENS EN SECUENCIA.

Mantener campos:

row.concepto
row.subcategoria

No ampliar fuente.

### Regla fundamental

NO generar stems destructivos.

NO hacer:

token termina en s
→ quitar s

En su lugar comparar DOS TOKENS COMPLETOS.

tokenEquivalent(a, b) es verdadero solo si:

1. exact normalized token equality; o
2. forman un par singular/plural controlado.

### Variantes controladas

Vocal + s:

llanta ↔ llantas

Requerir singular suficientemente largo.
No permitir bases triviales.

Consonante + es:

motor ↔ motores

Requerir singular suficientemente largo.

z ↔ ces:

luz ↔ luces

La comparación debe ser bidireccional.

No es requisito resolver toda la morfología española.

Priorizar precisión.

## Seguridad

La implementación NO debe contener excepciones de producto como:

if token === "llantas"

ni catálogo de conceptos.

Las palabras de los casos de prueba pueden aparecer en TESTS,
pero no como branching empresarial en product code.

### gas

"gas" debe hacer match con token GAS.

"gas" NO debe hacer match con:

GASTO
GASOLINA
GA

El cambio de substring → token sequence es obligatorio para este guardrail.

### parabrisas

No mutilar PARABRISAS mediante strip-final-s.

### multiword

"aceite de motor"

debe hacer match como SECUENCIA CONTIGUA de tokens equivalentes dentro de:

"COMPRA DE ACEITE DE MOTOR PARA UNIDAD"

Debe preservar y comparar "de".

No convertir indiscriminadamente a bag-of-words.

"aceite de motor"

NO debe considerarse equivalente simplemente a:

"motor aceite"

## Token sequence

El concept_query normalizado debe convertirse a tokens.

El texto de cada campo físico debe convertirse a tokens.

Buscar si la secuencia completa del query aparece dentro del campo,
en el mismo orden y de forma contigua,
usando tokenEquivalent por posición.

Puede haber tokens adicionales antes/después en la fila.

Ejemplo:

query tokens:
[llantas]

row:
[compra, de, llanta, para, utilitario]

→ MATCH por variante controlada.

Ejemplo:

query:
[aceite, de, motor]

row:
[compra, aceite, de, motores, para, unidad]

→ MATCH.

## Periodo congelado

NO modificar:

MONTHS_ES
extractPeriodMonth
resolución del año
mes_cargo
conversation-state de periodo

La auditoría demostró:

CURRENT TURN EXPLICIT MONTH WINS LOCALLY = YES

Los tests existentes de periodo deben continuar pasando.

## Scope congelado

NO modificar semántica:

folios
→ ALL_PUBLIC_FOLIOS

apoyos
→ SUPPORT_FAMILIES

apoyos/folios
→ ALL_PUBLIC_FOLIOS

SUPPORT_FAMILIES permanece:

GASTOS + INVERSIONES + TALLER

## Fuente congelada

NO SQL nuevo.

NO copiar SQL.

NO cambiar queryReviewableSupportFolios.

NO IGF-reviewable filters.

NO DB/schema.

## Regression first

Antes del cambio demostrar rojo para el caso real mediante fixture:

question:
"qué apoyos de julio fueron de llantas?"

period:
2026-07

physical row concept:
"AT-36 (4) LLANTA 11R22.5 LINEAL"

Debe fallar ANTES por:

- frame over-capture
- singular/plural

Después debe pasar.

## Tests obligatorios

R-FOLIO-LANG-001
North Star natural falla antes y pasa después.

R-FOLIO-LANG-002
extrae "llantas", no "fueron de llantas".

R-FOLIO-LANG-003
julio sigue siendo 2026-07.

R-FOLIO-LANG-004
llantas ↔ LLANTA.

R-FOLIO-LANG-005
llanta ↔ LLANTAS.

R-FOLIO-LANG-006
bombas ↔ BOMBA.

R-FOLIO-LANG-007
bomba ↔ BOMBAS.

R-FOLIO-LANG-008
motores ↔ MOTOR.

R-FOLIO-LANG-009
motor ↔ MOTORES.

R-FOLIO-LANG-010
luces ↔ LUZ.

R-FOLIO-LANG-011
luz ↔ LUCES.

R-FOLIO-LANG-012
gas ↔ GAS.

R-FOLIO-LANG-013
gas NO match GASTO.

R-FOLIO-LANG-014
gas NO match GASOLINA.

R-FOLIO-LANG-015
gas NO se transforma a ga.

R-FOLIO-LANG-016
parabrisas no se mutila.

R-FOLIO-LANG-017
"aceite de motor" preservado.

R-FOLIO-LANG-018
"aceite de motor" hace match en secuencia.

R-FOLIO-LANG-019
"motor aceite" NO equivale a "aceite de motor".

R-FOLIO-LANG-020
"filtros de aire" preservado.

R-FOLIO-LANG-021
filtros ↔ FILTRO dentro de frase.

R-FOLIO-LANG-022
"bomba de agua" preservado.

R-FOLIO-LANG-023
frame "fueron de".

R-FOLIO-LANG-024
frame "son de".

R-FOLIO-LANG-025
frame "eran de".

R-FOLIO-LANG-026
frame "relacionados con".

R-FOLIO-LANG-027
frame "relacionadas con".

R-FOLIO-LANG-028
"folios de llantas de julio" sigue extrayendo llantas.

R-FOLIO-LANG-029
turno septiembre → julio explícito conserva 2026-07.

R-FOLIO-LANG-030
turno septiembre → agosto explícito conserva 2026-08.

R-FOLIO-LANG-031
folios conserva ALL_PUBLIC_FOLIOS.

R-FOLIO-LANG-032
apoyos conserva SUPPORT_FAMILIES.

R-FOLIO-LANG-033
apoyos/folios conserva ALL_PUBLIC_FOLIOS.

R-FOLIO-LANG-034
no Action Register fallback.

R-FOLIO-LANG-035
no SQL nuevo/copied.

R-FOLIO-LANG-036
no dependencia nueva.

R-FOLIO-LANG-037
no cambio a queryReviewableSupportFolios.

R-FOLIO-LANG-038
no vocabulario de negocio usado como branching productivo.

## Product files permitidos

Preferentemente:

lib/director-ia-folio-search.js

Tests correspondientes.

Solo tocar planner/chat/capabilities/tools si una regresión demuestra que es estrictamente necesario.

No ampliar alcance preventivamente.

## Suites obligatorias

- nueva suite R-FOLIO-LANG
- suite R-FOLIO-TRUTH completa
- planner
- capabilities
- tool orchestrator
- M2
- M4
- M5
- M6
- IGF
- continuity
- Tier 1
- pre-deploy --gate

Si existe fallo preexistente:

probar contra base_main_sha.

NEW FAILURE debe ser 0.

## STOP CONDITIONS

STOP si requiere:

- SQL
- schema
- LIVE_DB
- nueva dependencia
- cambio de periodo
- cambio de scope
- cambio de fuente
- concept catalog
- stemming global
- frontend
- server.js product behavior no previsto

## Reporte

Crear:

docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-SEARCH-FRAME-MORPHOLOGY-001.md

Debe comenzar:

IMPLEMENTATION_SHA:
BEFORE:
AFTER:
FRAME_STRATEGY:
TOKEN_STRATEGY:
MORPHOLOGY_STRATEGY:
NORTH_STAR:
PERIOD_UNCHANGED:
SCOPE_UNCHANGED:
SQL_NEW:
DEPENDENCY_NEW:
001..038:
SUITES:
FILES:
RISKS:

## Completion

Después de implementación y pruebas:

CURRENT_TASK → DONE_PENDING_REVIEW

Commit únicamente en esta rama.

STOP.

NO merge.
NO push main.
NO deploy.
NO LIVE_DB.
NO next task.
