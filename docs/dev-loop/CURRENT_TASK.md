task_id: AUDIT-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-COVERAGE-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-07T09:14:08-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - READ_ONLY GENERIC FOLIO SEARCH COVERAGE AUDIT; NO IMPLEMENTATION; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: c6000ce599222330ab4839ea0a50d3ec74bb2466

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-COVERAGE-001.md

objective: Determinar físicamente qué universo de Folios debe consultar una búsqueda genérica de "folios/apoyos" para no sobreafirmar cobertura, y si puede implementarse reutilizando loaders existentes sin SQL nuevo.

## Antecedente

La implementación:

7879bfc5a573f3a0ce7f1b1f685fce480215a71c

fue REJECTED.

Motivo:

SOURCE_SCOPE_OVERCLAIM.

Su ruta ejecutaba:

loadFolioSearchForChat
→ loadGastosInversionesForChat(..., { category: "GASTOS" })

pero respondía al usuario genéricamente:

"folios"
"No se encontraron folios"

sin aclarar que solo había consultado GASTOS.

No reutilizar esa solución como verdad.

## North Star

Pregunta real:

"que apoyos/folios tenemos para septiembre de llantas?"

Director IA debe poder responder únicamente si ha consultado el universo físico suficiente para afirmar que encontró los folios/apoyos pertinentes.

No puede consultar solo GASTOS y presentarlo como todos los Folios.

## Pregunta central

¿Qué significa físicamente "todos los folios/apoyos pertinentes" dentro del producto actual?

Auditar sin asumir que son:

GASTOS
INVERSIONES
TALLER

Esas son hipótesis que deben verificarse.

## Traza obligatoria

Mapear físicamente los módulos/universos que representan Folios.

Para cada universo encontrado documentar:

- nombre funcional;
- tabla física;
- discriminador físico si existe;
- loader/helper;
- campos de planta;
- campos de periodo;
- concepto/descripcion buscable;
- estatus;
- importe;
- si el dato vive en public.folios o en otra fuente;
- si puede consultarse con loaders existentes sin SQL nuevo.

## Revisar como mínimo

M2 Folios / listado
M6 Gastos / Inversiones
Taller AT
Taller Mayor
Kanban / folio_status
Clasificación de apoyos
IGF reviewable supports

La auditoría debe determinar cuáles realmente pertenecen al universo
de una búsqueda genérica de folios y cuáles son vistas derivadas o
capacidades distintas.

## public.folios

Determinar:

1. Qué clases/categorías/tipos físicos de registros contiene.
2. Qué campo discrimina esas clases.
3. Si GASTOS e INVERSIONES son categorías de la misma tabla.
4. Si TALLER vive en la misma tabla o en otra fuente.
5. Si existe una consulta/helper ya capaz de leer public.folios sin
   limitar category = GASTOS.
6. Si ese helper proyecta:
   concepto
   descripcion
   mes_cargo
   planta_id
   número de folio
   importe
   estatus

No crear una consulta nueva.

## M6

Auditar exactamente:

loadGastosInversionesForChat
queryGastosInversionesFolios

Responder:

- categorías soportadas físicamente;
- si category es obligatorio;
- si acepta GASTOS;
- si acepta INVERSIONES;
- si puede consultar ambas sin cambiar SQL;
- si puede omitirse category;
- qué campos proyecta;
- filtros disponibles.

No modificar M6.

## M2 / listado general

Determinar si ya existe un loader de listado general de Folios por planta.

Si existe:

- qué registros incluye;
- si es realmente más amplio que M6;
- qué campos proyecta;
- si dispone de concepto/descripcion/mes_cargo;
- si puede servir para search sin SQL nuevo.

## TALLER

Determinar físicamente:

- si los folios de Taller son registros de public.folios;
- si existen tipos/categorías identificables;
- si "llantas" podría existir dentro de esa fuente;
- si los loaders actuales permiten una búsqueda textual y temporal;
- si deben formar parte de una consulta genérica "folios/apoyos".

No asumir que TALLER debe incluirse solo porque se llame Folio.

## Apoyos

Determinar qué significa físicamente "apoyo" en este contexto.

Separar:

- folio operativo;
- clasificación de apoyo;
- apoyo revisable IGF;
- gasto;
- inversión;
- taller.

No unir dominios semánticamente distintos únicamente por compartir
la palabra "apoyo".

## Pregunta temporal

Para una futura búsqueda:

"septiembre"

determinar si un único campo temporal puede aplicarse a todos los
universos.

M6 auditado usa:

mes_cargo

Si otros universos no tienen la misma semántica, documentarlo.

No inventar una semántica temporal común.

## Pregunta de concepto

Para:

"llantas"

determinar si:

concepto
descripcion

son campos comunes a todos los Folios pertinentes.

Si otro universo usa campos distintos, documentarlo.

No diseñar todavía un buscador multi-source.

## Opciones de arquitectura a evaluar

Clasificar cuál es físicamente posible:

A. EXISTING_ALL_FOLIOS_LOADER

Ya existe un loader suficientemente amplio y puede reutilizarse.

B. M6_MULTI_CATEGORY_SUFFICIENT

M6 ya puede cubrir todas las categorías pertinentes sin SQL nuevo.

C. EXISTING_LOADERS_UNION_REQUIRED

Se necesitan dos o más loaders existentes, pero no SQL nuevo.

D. PARTIAL_COVERAGE_ONLY

Solo puede garantizarse una cobertura parcial con las fuentes actuales;
la respuesta futura debe declarar el scope.

E. NEW_DATA_ACCESS_REQUIRED

La cobertura correcta exigiría SQL/helper/data access nuevo.

F. SOURCE_SEMANTICS_AMBIGUOUS

No existe contrato físico suficiente para definir qué significa
"todos los folios/apoyos".

G. MULTIPLE_BOUNDARIES

Más de uno aplica; identificar el primero.

## FIRST_BAD_BOUNDARY

Identificar la primera frontera que impide una búsqueda genérica
veraz.

Ejemplos:

- no existe loader all-folios;
- categorías no convergen;
- TALLER es otra fuente;
- concepto no es común;
- mes no es común;
- cobertura semántica no está definida.

No asumir la respuesta.

## Matriz obligatoria

El reporte debe incluir una matriz conceptual equivalente a:

UNIVERSO
SOURCE
LOADER
PLANTA
MES
CONCEPTO
¿INCLUIR EN GENERIC FOLIO SEARCH?
POR QUÉ

Con una fila por cada universo físico encontrado.

## Decisión obligatoria

Al final responder una de estas dos:

GENERIC_FOLIO_SEARCH_CAN_BE_TRUTHFUL_WITH_EXISTING_LOADERS = YES

o

GENERIC_FOLIO_SEARCH_CAN_BE_TRUTHFUL_WITH_EXISTING_LOADERS = NO

Si YES:

decir exactamente qué loader(s) y qué scopes debe consultar.

Si NO:

decir qué falta.

## Fix futuro

Proponer únicamente el FIX mínimo posterior.

No implementarlo.

El FIX recomendado debe impedir explícitamente repetir:

GASTOS_ONLY
→ texto genérico "folios"

## Prohibido

NO implementación.
NO modificar producto.
NO regex nueva.
NO SQL nuevo.
NO DB/schema.
NO LIVE_DB.
NO frontend.
NO crear union de loaders.
NO cambiar M6.
NO cambiar Taller.
NO Action Register como sustituto.
NO merge.
NO push main.
NO deploy.
NO next task.

## Archivos mínimos a inspeccionar

- loaders/helpers M2
- loaders/helpers M6
- Taller AT
- Taller Mayor
- folio_status / Kanban
- clasificacion_apoyos
- igf_reviewable_supports
- lib/director-ia-tools.js
- lib/director-ia-tool-orchestrator.js
- lib/director-ia-chat.js
- server.js solo lectura para localizar fuentes

## Reporte

Crear:

docs/dev-loop/reports/AUDIT-DIRECTOR-IA-GENERIC-FOLIO-SEARCH-COVERAGE-001.md

Debe comenzar exactamente:

CLASIFICACIÓN: ...

FIRST_BAD_BOUNDARY: ...

GENERIC_FOLIO_SEARCH_CAN_BE_TRUTHFUL_WITH_EXISTING_LOADERS: YES/NO

GENERIC FOLIO UNIVERSE:
...

PUBLIC.FOLIOS COVERAGE:
...

M2 COVERAGE:
...

M6 COVERAGE:
...

TALLER COVERAGE:
...

APOYOS SEMANTICS:
...

COMMON MONTH SEMANTICS:
...

COMMON CONCEPT SEMANTICS:
...

FIX MÍNIMO RECOMENDADO:
...

ARCHIVOS QUE TOCARÍA:
...

Después:

CURRENT_TASK → DONE_PENDING_REVIEW

STOP.

NO implementación.
NO merge.
NO deploy.
NO next task.
