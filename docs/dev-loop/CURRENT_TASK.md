task_id: FIX-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-TRUTHFUL-001

task_type: FIX
mode: REGRESSION_FIRST

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-07T09:19:57-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - TRUTHFUL GENERIC FOLIO SEARCH FIX AUTHORIZED; REGRESSION_FIRST; COMMIT ON FIX BRANCH AUTHORIZED; NO LIVE_DB; NO MERGE; NO PUSH MAIN; NO DEPLOY"

implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 093a8700e3bfa72eec4b87fa942e0c8314994a81

result_report_path: docs/dev-loop/reports/FIX-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-TRUTHFUL-001.md

objective: Implementar búsqueda conversacional veraz de folios/apoyos por planta, mes_cargo y concepto libre, distinguiendo explícitamente entre el universo completo de public.folios y las tres familias operativas de apoyos, sin SQL nuevo y sin reutilizar el commit rechazado.

## Antecedentes congelados

La implementación:

7879bfc5a573f3a0ce7f1b1f685fce480215a71c

fue REJECTED.

Motivo:

SOURCE_SCOPE_OVERCLAIM

Hacía:

category = GASTOS

y respondía:

"folios"

como si hubiera consultado todo el universo.

PROHIBIDO reutilizar esa semántica.

## Auditoría posterior

GENERIC_FOLIO_SEARCH_CAN_BE_TRUTHFUL_WITH_EXISTING_LOADERS = YES

Fuente:

public.folios

Campos comunes suficientes:

planta
mes_cargo
COALESCE(descripcion, concepto)

La lectura ancha físicamente existente está en la ruta auditada de
queryReviewableSupportFolios.

Puede reutilizarse como ACCESO A public.folios únicamente si NO se
aplica la semántica/filtro IGF-reviewable.

No presentar esa búsqueda como "IGF reviewable".

## Universo semántico

### FOLIOS

Si la utterance solicita explícitamente:

folio
folios

scope:

ALL_PUBLIC_FOLIOS

Debe consultar el conjunto general de filas de public.folios para la
planta, sujeto solamente a los filtros explícitos de búsqueda
permitidos en este slice.

NO limitar category = GASTOS.

NO limitar a GASTOS + INVERSIONES + TALLER.

### APOYOS

Si la utterance dice "apoyo/apoyos" y NO contiene folio/folios:

scope:

SUPPORT_FAMILIES

Familias operativas auditadas:

GASTOS
INVERSIONES
TALLER

Debe declararse ese alcance en metadata/respuesta.

### APOYOS/FOLIOS

Si aparecen ambos:

scope:

ALL_PUBLIC_FOLIOS

La palabra "folios" solicita el universo más amplio.

Esto evita omitir otras categorías físicas existentes.

## No confundir

clasificacion_apoyos_query
≠ listado operativo de apoyos

igf_reviewable_supports
≠ generic folio search

folio_status
≠ folio_search

Action Register
≠ Folios

## Intent

Crear:

folio_search

o equivalente consistente.

Debe representar:

LIST / SEARCH

no status individual.

## Filter shape

Estructura mínima:

{
  planta_id,
  scope,
  period_month,
  concept_query
}

scope:

ALL_PUBLIC_FOLIOS
o
SUPPORT_FAMILIES

period_month:

YYYY-MM | null

concept_query:

string | null

## Mes

Soportar:

enero ... diciembre
setiembre / septiembre
YYYY-MM
mes + año explícito

Mes sin año:

usar deps.now year.

Año explícito:

gana.

No hardcodear 2026.

Campo físico:

mes_cargo

## Concepto

Extracción genérica.

Ejemplos de TEST:

llantas
uniformes
mantenimiento

NO hardcodearlos en producto.

Texto físico:

COALESCE(descripcion, concepto)

Usar subcategoria únicamente si la fuente ancha auditada la proyecta
y ya forma parte del contrato físico.

No inventar campos.

## Source rule

Preferencia para ALL_PUBLIC_FOLIOS:

reutilizar la consulta/helper existente que ya lee public.folios con:

planta
concepto/descripcion
mes_cargo

sin aplicar filtros de IGF reviewable.

Puede exponerse mediante un wrapper con nombre neutral si es necesario.

NO copiar SQL.

NO crear SELECT nuevo.

NO duplicar query SQL.

Si la única forma técnica exige copiar/modificar SQL:

STOP.

## SUPPORT_FAMILIES

Puede reutilizar la MISMA lectura ancha de public.folios y filtrar
por categoria en memoria:

GASTOS
INVERSIONES
TALLER

si la evidencia física confirma que esas son exactamente las familias
auditadas.

No hacer tres SQL nuevos.

No es obligatorio usar tres loaders si una lectura existente ya cubre
el universo.

## Respuesta veraz

Para ALL_PUBLIC_FOLIOS:

puede decir:

"Encontré N folios..."

porque efectivamente consultó public.folios amplio.

Para SUPPORT_FAMILIES:

debe declarar scope conceptualmente:

"Encontré N apoyos en GASTOS, INVERSIONES y TALLER..."

No puede decir simplemente:

"todos los folios"

## Empty result

ALL_PUBLIC_FOLIOS:

"No encontré folios con esos filtros."

solo si realmente se consultó ALL_PUBLIC_FOLIOS.

SUPPORT_FAMILIES:

"No encontré apoyos en GASTOS, INVERSIONES o TALLER con esos filtros."

o equivalente claro.

## North Star exacto

Planta:

Acapulco

Pregunta:

que apoyos/folios tenemos para septiembre de llantas?

Debe resolver:

intent = folio_search

scope = ALL_PUBLIC_FOLIOS

planta_id = contexto UI

period_month = septiembre del año de now

concept_query = llantas

y buscar sin recorte GASTOS_ONLY.

## Regression first

ANTES demostrar rojo.

R-FOLIO-TRUTH-001
North Star actualmente unknown en main.

R-FOLIO-TRUTH-002
North Star clasifica folio_search.

R-FOLIO-TRUTH-003
scope = ALL_PUBLIC_FOLIOS cuando aparece "folios".

R-FOLIO-TRUTH-004
"qué apoyos de llantas..." sin "folios"
→ SUPPORT_FAMILIES.

R-FOLIO-TRUTH-005
apoyos/folios
→ ALL_PUBLIC_FOLIOS.

R-FOLIO-TRUTH-006
ALL_PUBLIC_FOLIOS no fuerza category=GASTOS.

R-FOLIO-TRUTH-007
ALL_PUBLIC_FOLIOS no fuerza solo GASTOS+INVERSIONES+TALLER.

R-FOLIO-TRUTH-008
SUPPORT_FAMILIES = GASTOS+INVERSIONES+TALLER.

R-FOLIO-TRUTH-009
respuesta ALL_PUBLIC_FOLIOS puede decir folios.

R-FOLIO-TRUTH-010
respuesta SUPPORT_FAMILIES declara las tres familias.

R-FOLIO-TRUTH-011
empty ALL_PUBLIC_FOLIOS solo se produce tras consultar scope completo.

R-FOLIO-TRUTH-012
empty SUPPORT_FAMILIES declara scope limitado.

R-FOLIO-TRUTH-013
septiembre usa mes_cargo.

R-FOLIO-TRUTH-014
mes sin año usa deps.now.

R-FOLIO-TRUTH-015
año explícito gana.

R-FOLIO-TRUTH-016
concept_query genérico funciona con llantas.

R-FOLIO-TRUTH-017
otro concepto demuestra que no hay hardcode.

R-FOLIO-TRUTH-018
planta proviene del chat.

R-FOLIO-TRUTH-019
folio_status individual conserva prioridad.

R-FOLIO-TRUTH-020
IGF-reviewable conserva prioridad.

R-FOLIO-TRUTH-021
clasificacion_apoyos conserva prioridad.

R-FOLIO-TRUTH-022
no Action Register.

R-FOLIO-TRUTH-023
no SQL nuevo.

R-FOLIO-TRUTH-024
no copia/duplica SQL existente.

R-FOLIO-TRUTH-025
no reutiliza semántica IGF-reviewable como generic search.

R-FOLIO-TRUTH-026
DYO/COMISIONES/u otra categoría fixture aparece en ALL_PUBLIC_FOLIOS
si satisface los filtros.

R-FOLIO-TRUTH-027
esa misma categoría NO aparece en SUPPORT_FAMILIES.

R-FOLIO-TRUTH-028
H "qué gastos de llantas..." no se fuerza artificialmente al intent
si la prioridad existente corresponde a otra ruta.

## No reutilizar branch rechazado

Implementar desde esta rama nueva derivada de main.

No cherry-pick:

7879bfc5a573f3a0ce7f1b1f685fce480215a71c

El código puede reconstruir ideas correctas únicamente a partir del
contrato actual y la auditoría.

## In scope

- helper nuevo neutral de folio search si hace falta
- planner
- capabilities
- tools/orchestrator
- chat
- helper existente que contiene la lectura ancha SOLO si basta exportar
  una función/query ya existente sin alterar SQL
- tests
- CURRENT_TASK
- reporte

## STOP obligatorio

Si se requiere:

SQL nuevo
cambiar SELECT existente
DB/schema
LIVE_DB
frontend
server.js product behavior
inventar semántica temporal

STOP.

## Prohibido

NO SQL nuevo.
NO copiar SQL.
NO DB/schema.
NO LIVE_DB.
NO frontend.
NO Action Register.
NO hardcode llantas/uniformes/mantenimiento en producto.
NO catálogo fijo.
NO merge.
NO push main.
NO deploy.
NO next task.

## Suites

R-FOLIO-TRUTH-001..028

planner
capabilities
tool orchestrator
M2/M4/M5/M6/IGF/Taller relacionadas
continuity si chat cambia

TIER 1 PASS
PRE-DEPLOY --gate PASS
HTTP 5xx = 0
HARNESS = 0
NEW FAILURE = 0
git diff --check limpio

## Completion

CURRENT_TASK → DONE_PENDING_REVIEW.

Commit solo en rama FIX.

STOP.

NO merge.
NO push main.
NO deploy.
NO next task.
