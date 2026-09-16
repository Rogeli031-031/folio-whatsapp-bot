task_id: "IMPL-DIRECTOR-IA-SEH-OPERATION-STATUS-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-16"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Implementar en Director IA una capacidad de lectura para consultar el estado
  operativo de SEH - Seguridad e Higiene usando la misma fuente física que alimenta
  las pantallas SEH del dashboard.

  Debe responder sobre:
  - estaciones de carburación
  - autotanques/pipas
  - extintores de planta
  - sistema contra incendio
  - extintores por ubicación específica
  - estado agregado de todos los extintores de una planta

north_star: >
  Director IA debe poder responder preguntas ejecutivas y operativas de SEH sin
  contar renglones como activos distintos, sin inventar vigencias y sin crear una
  segunda fuente de verdad.

source_contract:
  rule: >
    Reutilizar la misma fuente física/endpoint/tablas que usa actualmente
    fetchSehBoard en el dashboard SEH.

  prohibited:
    - "scrapear HTML"
    - "leer datos renderizados desde frontend"
    - "crear tabla espejo"
    - "duplicar persistencia SEH"
    - "inventar datos faltantes"

  required_discovery:
    - "identificar endpoint real usado por fetchSehBoard"
    - "identificar tablas/columnas físicas usadas por SEH"
    - "documentar categoria, locacion, descripcion, componente, nombre, vence"
    - "reutilizar el mismo aislamiento/autorización por planta"

seh_domain:
  semantic_class: "seh_operation_status"

  scopes:
    - "STATION"
    - "AUTOTANK"
    - "PLANT"
    - "FIRE_SYSTEM"
    - "ALL_EXTINGUISHERS"
    - "ALL_SEH"

  metrics:
    - "COUNT"
    - "LIST"
    - "STATUS"
    - "EXPIRED"
    - "EXPIRING_SOON"
    - "NEXT_EXPIRATION"

entity_resolution:
  fields:
    - "location_name"
    - "unit_name"

  examples:
    - question: "¿Cuántos extintores tenemos en Pie de la Cuesta?"
      scope: "STATION"
      entity: "PIE DE LA CUESTA"
      metric: "COUNT"

    - question: "¿Cuántos extintores tiene el autotanque ECO 39?"
      scope: "AUTOTANK"
      entity: "AUTOTANQUE ECO 39"
      metric: "COUNT"

    - question: "¿Cómo están los extintores del cuarto de control?"
      scope: "PLANT"
      entity: "CUARTO DE CONTROL"
      metric: "STATUS"

station_contract:
  identity_rule: >
    Para ESTACION - OPERACION, LOCACION identifica la estación física.

  dedup_rule: >
    Si una misma LOCACION aparece varias veces porque tiene varios extintores,
    debe contarse una sola estación para métricas de cantidad/listado de estaciones.

  extinguisher_rule: >
    Los renglones NO se deduplican para contar extintores.
    Cada registro de extintor representa un equipo registrado.

  example: >
    PIE DE LA CUESTA repetido 6 veces = 1 estación + 6 extintores.

autotank_contract:
  identity_rule: >
    Para AUTOTANQUE - OPERACION, LOCACION identifica la unidad/autotanque.

  dedup_rule: >
    Si el mismo autotanque aparece varias veces por tener varios extintores,
    debe contarse una sola pipa/autotanque para COUNT/LIST de unidades.

  extinguisher_rule: >
    Cada registro de extintor asociado a la unidad sí cuenta individualmente.

plant_contract:
  rule: >
    Para PLANTA - OPERACION, analizar los registros de extintores de planta
    por LOCACION/DESCRIPCION/COMPONENTE/VENCE.

  no_asset_count_inference: >
    No usar LOCACION para inferir número de plantas. La planta ya viene del contexto
    físico/seleccionado o de una planta explícita en la pregunta.

fire_system_contract:
  category: "SISTEMA CONTRA INCENDIO"

  fields:
    - "nombre"
    - "vence"

  rule: >
    Clasificar estado usando vence cuando exista. Si no existe fecha usable,
    reportar SIN FECHA. No asumir VIGENTE.

expiration_contract:
  statuses:
    VIGENTE: "vence en más de 30 días"
    POR_VENCER: "vence entre hoy y 30 días inclusive"
    VENCIDO: "vence antes de hoy"
    SIN_FECHA: "no existe fecha de vencimiento válida"

  date_source: >
    Usar una fecha actual controlable/injectable en tests. No codificar la fecha
    actual dentro de fixtures.

  critical_rule: >
    SIN_FECHA nunca cuenta como VIGENTE.

all_extinguishers_contract:
  question_family:
    - "¿Están vigentes los extintores de Acapulco?"
    - "¿Cómo están los extintores en Acapulco?"
    - "¿Tenemos extintores vencidos en Acapulco?"

  required_scope: >
    Si la pregunta habla de "los extintores de [planta]" sin limitar a estaciones,
    autotanques o planta física, debe considerar:
    ESTACIONES + AUTOTANQUES + PLANTA.

  excludes:
    - "sistema contra incendio que no sea extintor"

all_seh_contract:
  question_family:
    - "¿Cómo está Seguridad e Higiene en Acapulco?"
    - "Dame el estatus de seguridad contra incendio de Acapulco"

  required_scope: >
    Resumir estaciones + autotanques + extintores de planta + sistema contra incendio.

station_count_contract:
  examples:
    - "¿Cuántas estaciones tenemos en Acapulco?"
    - "¿Cuántas estaciones de carburación hay en Acapulco?"
    - "Dime el número de estaciones que tenemos en Acapulco"
    - "¿Cuáles son nuestras estaciones de Acapulco?"

  count_rule: >
    COUNT DISTINCT de LOCACION normalizada dentro del universo ESTACION.

autotank_count_contract:
  examples:
    - "¿Cuántas pipas tenemos en Acapulco?"
    - "¿Cuántos autotanques tenemos en Acapulco?"
    - "Dime cuántas unidades de autotanque hay en Acapulco"
    - "¿Cuáles son las pipas de Acapulco?"

  count_rule: >
    COUNT DISTINCT de LOCACION normalizada dentro del universo AUTOTANQUE.

location_specific_contract:
  required_examples:
    - "¿Cuántos extintores tenemos en Pie de la Cuesta?"
    - "¿Cuántos extintores hay en Pie de la Cuesta?"
    - "Dime cuántos extintores tiene Pie de la Cuesta"
    - "¿Cuál es el total de extintores en Pie de la Cuesta?"
    - "¿Cuántos equipos extintores están registrados en Pie de la Cuesta?"
    - "¿Cuántos extintores aparecen para Pie de la Cuesta?"
    - "¿Qué cantidad de extintores tiene la estación Pie de la Cuesta?"
    - "¿Cuántos extintores tiene la estación de Pie de la Cuesta?"
    - "¿Cuál es el estatus de los extintores de Pie de la Cuesta?"
    - "¿Cómo están los extintores de Pie de la Cuesta?"
    - "¿Están vigentes los extintores de Pie de la Cuesta?"
    - "¿Todos los extintores de Pie de la Cuesta están vigentes?"
    - "¿Hay extintores vencidos en Pie de la Cuesta?"
    - "¿Tenemos algún extintor por vencer en Pie de la Cuesta?"
    - "¿Qué extintores están vencidos en Pie de la Cuesta?"
    - "¿Qué extintores vencen pronto en Pie de la Cuesta?"
    - "Dame el estado de los extintores de Pie de la Cuesta"
    - "Revísame los extintores de Pie de la Cuesta"
    - "¿Cómo está Pie de la Cuesta en tema de extintores?"
    - "¿Cuántos extintores tiene Pie de la Cuesta y cuál es su estatus?"

location_resolution_rule: >
  Resolver ubicaciones de forma case-insensitive y tolerante a acentos/espacios,
  pero no hacer fuzzy matching agresivo que pueda mezclar dos estaciones distintas.

plant_resolution:
  precedence:
    - "planta explícita en la pregunta"
    - "planta seleccionada/autorizada del dashboard"
    - "si entidad específica resuelve inequívocamente a una planta permitida, usarla"
    - "si queda ambigüedad real, pedir aclaración"

  prohibited:
    - "cruzar plantas no autorizadas"
    - "asumir Acapulco por defecto"
    - "resolver una estación homónima a ciegas"

response_contract:
  station_count_example: >
    Acapulco tiene N estaciones de carburación registradas en SEH.

  autotank_count_example: >
    Acapulco tiene N autotanques registrados en SEH.

  location_status_example: >
    Pie de la Cuesta tiene N extintores registrados:
    X vigentes, Y por vencer, Z vencidos y W sin fecha.

  all_extinguishers_example: >
    En Acapulco hay N extintores registrados considerando estaciones,
    autotanques y planta:
    X vigentes, Y por vencer, Z vencidos y W sin fecha.

  status_detail_rule: >
    Si existen vencidos o por vencer, identificar entidad/ubicación,
    descripción y fecha cuando esté disponible.

  no_fake_data: >
    Si no hay registros, decirlo explícitamente. No completar cantidades.

conversation_continuity:
  required: true

  inheritance_scope:
    - "SEH domain"
    - "planta"
    - "scope"
    - "entity/location"
    - "extinguishers"

  examples:
    - turn_1: "¿Cuántos extintores tenemos en Pie de la Cuesta?"
      turn_2: "¿Y cuál es su estatus?"
      expected: "mantiene Pie de la Cuesta + extintores"

    - turn_1: "¿Cómo están los extintores de Pie de la Cuesta?"
      turn_2: "¿Hay alguno vencido?"
      expected: "mantiene misma entidad"

    - turn_1: "¿Hay alguno vencido?"
      turn_2: "¿Cuál vence primero?"
      expected: "NEXT_EXPIRATION sobre mismo conjunto"

  safety_rule: >
    No heredar contexto SEH si la pregunta nueva contiene una entidad/planta/dominio
    explícito incompatible.

acceptance_suite_plant_level:
  - "¿Cuántas estaciones tenemos en Acapulco?"
  - "¿Cuántas estaciones de carburación hay en Acapulco?"
  - "Dime el número de estaciones que tenemos en Acapulco"
  - "¿Cuáles son nuestras estaciones de Acapulco?"
  - "¿Cómo están los extintores de las estaciones de Acapulco?"
  - "¿Están vigentes los extintores de las estaciones en Acapulco?"
  - "¿Tenemos algún extintor vencido en las estaciones de Acapulco?"
  - "¿Qué extintores de estaciones están por vencer en Acapulco?"
  - "¿Cuántas pipas tenemos en Acapulco?"
  - "¿Cuántos autotanques tenemos en Acapulco?"
  - "Dime cuántas unidades de autotanque hay en Acapulco"
  - "¿Cuáles son las pipas de Acapulco?"
  - "¿Cómo están los extintores de los autotanques de Acapulco?"
  - "¿Están vigentes todos los extintores de las pipas de Acapulco?"
  - "¿Hay alguna pipa con extintor vencido en Acapulco?"
  - "¿Qué extintores de los autotanques vencen pronto?"
  - "¿Cómo están los extintores de la planta de Acapulco?"
  - "¿Cuál es el estatus del sistema contra incendio de Acapulco?"
  - "¿Están vigentes los extintores de Acapulco?"
  - "Dame el estatus de seguridad contra incendio de Acapulco"

acceptance_suite_location_specific:
  - "¿Cuántos extintores tenemos en Pie de la Cuesta?"
  - "¿Cuántos extintores hay en Pie de la Cuesta?"
  - "Dime cuántos extintores tiene Pie de la Cuesta"
  - "¿Cuál es el total de extintores en Pie de la Cuesta?"
  - "¿Cuántos equipos extintores están registrados en Pie de la Cuesta?"
  - "¿Cuántos extintores aparecen para Pie de la Cuesta?"
  - "¿Qué cantidad de extintores tiene la estación Pie de la Cuesta?"
  - "¿Cuántos extintores tiene la estación de Pie de la Cuesta?"
  - "¿Cuál es el estatus de los extintores de Pie de la Cuesta?"
  - "¿Cómo están los extintores de Pie de la Cuesta?"
  - "¿Están vigentes los extintores de Pie de la Cuesta?"
  - "¿Todos los extintores de Pie de la Cuesta están vigentes?"
  - "¿Hay extintores vencidos en Pie de la Cuesta?"
  - "¿Tenemos algún extintor por vencer en Pie de la Cuesta?"
  - "¿Qué extintores están vencidos en Pie de la Cuesta?"
  - "¿Qué extintores vencen pronto en Pie de la Cuesta?"
  - "Dame el estado de los extintores de Pie de la Cuesta"
  - "Revísame los extintores de Pie de la Cuesta"
  - "¿Cómo está Pie de la Cuesta en tema de extintores?"
  - "¿Cuántos extintores tiene Pie de la Cuesta y cuál es su estatus?"

cross_scope_examples:
  - "¿Cuántos extintores tiene el autotanque ECO 39?"
  - "¿Están vigentes los del ECO 39?"
  - "¿Cómo están los extintores del cuarto de control?"
  - "¿Qué extintor vence primero en la planta?"
  - "¿Tenemos algún equipo del sistema contra incendio sin fecha?"

must_preserve:
  - "autorización por planta"
  - "aislamiento de planta"
  - "planner actual"
  - "conversation state actual"
  - "EXECUTIVE_STATUS"
  - "DIAGNOSIS"
  - "Expense Analytics"
  - "saludo por identidad"
  - "capabilities existentes"

in_scope:
  - "adapter/read model SEH para Director IA"
  - "routing semántico SEH_OPERATION_STATUS"
  - "conteo distinto de estaciones"
  - "conteo distinto de autotanques"
  - "conteo de extintores"
  - "estatus de vigencia"
  - "sistema contra incendio"
  - "resolución por ubicación"
  - "continuidad conversacional SEH"
  - "tests"
  - "reporte"
  - "CURRENT_TASK"

out_of_scope:
  - "editar SEH"
  - "guardar cambios"
  - "subir/borrar fotos"
  - "modificar fechas"
  - "modificar esquema DB"
  - "crear tablas nuevas"
  - "Regulación SEH"
  - "Carpetas Legales"
  - "mutaciones"
  - "merge a main"
  - "deploy"
  - "siguiente tarea"

required_tests:
  source:
    - "usa fuente física existente SEH"
    - "sin segunda tabla"
    - "sin HTML scraping"

  stations:
    - "misma locacion repetida 6 veces => 1 estación"
    - "los 6 extintores siguen contando como 6"
    - "COUNT"
    - "LIST"

  autotanks:
    - "misma unidad repetida => 1 autotanque"
    - "extintores no se deduplican"

  expiration:
    - "vigente > 30 días"
    - "por vencer 0-30 días"
    - "vencido < hoy"
    - "sin fecha"
    - "sin fecha no cuenta como vigente"

  all_extinguishers:
    - "agrega ESTACION + AUTOTANQUE + PLANTA"
    - "no agrega duplicado por scope accidental"

  fire_system:
    - "status por nombre/vence"
    - "sin fecha visible"

  entity_resolution:
    - "Pie de la Cuesta"
    - "AUTOTANQUE ECO 39"
    - "Cuarto de control"
    - "acentos/case"
    - "no fuzzy agresivo"

  continuity:
    - "¿Y cuál es su estatus?"
    - "¿Hay alguno vencido?"
    - "¿Cuál vence primero?"
    - "¿Cuándo vence el próximo?"

  acceptance:
    - "20 frases plant-level"
    - "20 frases location-specific"

  regression:
    - "EXECUTIVE_STATUS"
    - "DIAGNOSIS"
    - "Expense Analytics"
    - "smalltalk"
    - "saludo"

success_metrics:
  - "40/40 frases de aceptación correctamente clasificadas"
  - "conteo correcto por activo vs extintor"
  - "estatus consistente con regla visual SEH"
  - "0 cruces de planta"
  - "0 mutaciones"
  - "0 segunda fuente de verdad"

allowed_actions:
  - "crear rama implementation/director-ia-seh-operation-status-001"
  - "leer código SEH existente"
  - "crear adapter read-only"
  - "extender planner/capabilities de forma mínima"
  - "integrar conversation state SEH"
  - "crear tests"
  - "crear reporte"
  - "commit/push solo a rama autorizada"

forbidden_actions:
  - "modificar datos SEH"
  - "PUT/POST/DELETE desde Director IA"
  - "crear tablas nuevas"
  - "copiar SEH a otra fuente"
  - "scraping HTML"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-SEH-OPERATION-STATUS-001.md"

final_state: "DONE_PENDING_REVIEW"