task_id: "FIX-DIRECTOR-IA-SEH-FOLLOWUP-AND-FOLIO-EXISTENCE-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-16"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Corregir dos huecos conversacionales de Director IA:

  1. SEH_OPERATION_STATUS debe heredar correctamente el contexto previo ante
     preguntas elípticas sobre extintores vencidos, vigencia, ubicación y fecha.

  2. Folios debe permitir consultas existenciales por concepto libre sin exigir
     mes_cargo cuando el usuario solo pregunta si existe algún folio relacionado
     con ese concepto.

north_star: >
  El usuario no debe tener que repetir planta, scope, entidad ni periodo cuando
  la intención ya está determinada por el contexto o cuando la pregunta es
  simplemente existencial.

seh_followup_contract:
  source: "SEH_OPERATION_STATUS existente"

  rule: >
    Si el turno anterior estableció un conjunto SEH y el nuevo turno contiene una
    métrica o referencia SEH inequívoca pero omite planta/scope/entity, heredar el
    contexto SEH anterior.

  inheritable_context:
    - "plant"
    - "scope"
    - "entity"
    - "domain=SEH"
    - "extinguisher set"

  required_metrics:
    - "EXPIRED"
    - "EXPIRING_SOON"
    - "STATUS"
    - "NEXT_EXPIRATION"
    - "LOCATION"
    - "EXPIRATION_DATE"

  examples:
    - prior: "¿Cuántos extintores tenemos en Acapulco?"
      followup: "¿Cuál extintor está vencido?"
      expected: >
        Responder sobre ALL_EXTINGUISHERS + Acapulco heredados.

    - prior: "¿Cuál extintor está vencido?"
      followup: "¿Dónde está?"
      expected: >
        Mantener la entidad/result-set del extintor vencido.

    - prior: "¿Dónde está?"
      followup: "¿Cuándo venció?"
      expected: >
        Responder la fecha del mismo extintor.

  safety_rule: >
    No heredar contexto SEH si el nuevo turno introduce una planta, entidad,
    scope o dominio explícito incompatible.

seh_acceptance_30:
  - "¿Cuál extintor está vencido?"
  - "¿Qué extintor está vencido?"
  - "¿Cuál de los extintores está vencido?"
  - "¿Qué extintores están vencidos?"
  - "¿Cuál es el extintor vencido?"
  - "¿Cuál fue el que venció?"
  - "¿Qué equipo está vencido?"
  - "¿Cuál de ellos está vencido?"
  - "¿Cuál es el vencido?"
  - "¿Qué extintor ya venció?"
  - "¿Cuál extintor ya caducó?"
  - "¿Qué extintor ya caducó?"
  - "¿Cuál tiene la fecha vencida?"
  - "¿Qué extintor tiene vencimiento atrasado?"
  - "¿Cuál ya no está vigente?"
  - "¿Qué extintor dejó de estar vigente?"
  - "¿Cuál de los registrados ya venció?"
  - "¿Qué extintor aparece como vencido?"
  - "¿Cuál aparece en rojo por vencimiento?"
  - "¿Cuál es el que tiene fecha pasada?"
  - "¿Qué extintor tiene la fecha de vencimiento vencida?"
  - "¿Cuál es el extintor fuera de vigencia?"
  - "¿Qué equipo contra incendio está vencido?"
  - "¿Cuál de esos extintores está fuera de vigencia?"
  - "¿Cuál es el extintor que mencionaste como vencido?"
  - "¿Cuál era el vencido?"
  - "¿Me dices cuál está vencido?"
  - "Dime cuál extintor está vencido"
  - "Señálame el extintor vencido"
  - "¿Cuál es exactamente el extintor vencido?"

seh_followup_secondary:
  - "¿Dónde está?"
  - "¿En qué ubicación está?"
  - "¿Cuándo venció?"
  - "¿Qué fecha tiene?"
  - "¿Hay otro vencido?"
  - "¿Cuál vence primero?"
  - "¿Cuál vence primero de los vigentes?"
  - "¿Hay alguno por vencer?"
  - "¿Cuál está por vencer?"
  - "¿Cuándo vence el próximo?"

folio_existence_contract:
  semantic_family: "FOLIO_EXISTENCE_BY_CONCEPT"

  rule: >
    Si la pregunta es existencial sobre folios relacionados con un concepto libre,
    NO exigir mes_cargo.

  examples:
    - "¿Existe un folio de extintores?"
    - "¿Hay algún folio de aceite?"
    - "¿Tenemos folios de llantas?"

  required_behavior: >
    Buscar si existe al menos un folio relacionado con el concepto usando las
    fuentes actuales de Folios.

  response_if_found: >
    Indicar que sí existen registros y, cuando sea barato/seguro, incluir conteo
    básico. No inventar periodo ni asumir mes.

  response_if_not_found: >
    Indicar que no se encontraron folios relacionados con el concepto bajo el
    universo consultado.

  period_rule: >
    Solo aplicar filtro temporal si el usuario proporciona explícitamente periodo.

  no_forced_month: >
    Una pregunta existencial no debe responder "Indica el mes (mes_cargo)" salvo
    que la fuente física requiera obligatoriamente un periodo y no exista una vía
    histórica segura. En ese caso documentar la limitación en vez de inventar.

  concept_rule: >
    Concepto libre. No crear whitelist manual de extintores, aceite, llantas, etc.

  reuse:
    - "normalización existente"
    - "resolución de conceptos existente"
    - "fuente actual de Folios"
    - "autorización y aislamiento actuales"

folio_existence_30:
  - "¿Existe un folio de extintores?"
  - "¿Hay algún folio de extintores?"
  - "¿Tenemos algún folio de extintores?"
  - "¿Hay folios de extintores?"
  - "¿Existen folios relacionados con extintores?"
  - "¿Tenemos folios relacionados con extintores?"
  - "¿Hay algún folio que mencione extintores?"
  - "¿Existe algún folio que contenga la palabra extintores?"
  - "¿Tenemos algún folio con extintores?"
  - "¿Hay algún registro de folio sobre extintores?"
  - "¿Hay folios por compra de extintores?"
  - "¿Existe algún folio por extintores?"
  - "¿Tenemos algún apoyo registrado para extintores?"
  - "¿Hay algún gasto registrado en folios por extintores?"
  - "¿Aparecen extintores en algún folio?"
  - "¿Se ha generado algún folio de extintores?"
  - "¿Se registró algún folio relacionado con extintores?"
  - "¿Existe algún folio histórico de extintores?"
  - "¿Hay algún folio donde salga extintores?"
  - "¿Tenemos antecedentes de folios de extintores?"
  - "¿Hay folios asociados a extintores?"
  - "¿Existe algún folio con concepto de extintores?"
  - "¿Hay algún folio que tenga que ver con extintores?"
  - "¿Tenemos compras de extintores registradas en folios?"
  - "¿Hay algún folio abierto o pagado de extintores?"
  - "¿Puedes revisar si existe un folio de extintores?"
  - "Revisa si tenemos folios de extintores"
  - "Búscame si hay algún folio de extintores"
  - "Dime si existe algún folio de extintores"
  - "Quiero saber si tenemos algún folio relacionado con extintores"

concept_generalization_tests:
  - "¿Existe un folio de aceite?"
  - "¿Hay algún folio de llantas?"
  - "¿Tenemos folios de baterías?"
  - "¿Existe un folio de pintura?"
  - "¿Hay folios de uniformes?"
  - "¿Tenemos algún folio de válvulas?"

folio_followup_contract:
  required: true

  examples:
    - turn_1: "¿Existe un folio de extintores?"
      turn_2: "¿Cuántos hay?"
      expected: "mantener concepto extintores"

    - turn_1: "¿Hay folios de extintores?"
      turn_2: "¿Cuál fue el más reciente?"
      expected: "mantener concepto extintores"

    - turn_1: "¿Hay folios de extintores?"
      turn_2: "¿Cuánto suman?"
      expected: >
        Mantener concepto extintores y responder solo si la métrica puede
        calcularse con la semántica actual sin atribución falsa.

    - turn_1: "¿Hay folios de extintores?"
      turn_2: "¿Cuáles están pagados?"
      expected: "mantener concepto y filtrar por estatus si la fuente lo permite"

truthfulness:
  - "No inventar mes_cargo"
  - "No atribuir 100% del importe de un folio al concepto si el folio solo coincide por texto"
  - "No inventar conteos"
  - "No mezclar SEH con Folios"
  - "No usar el último resultado SEH como si fuera un folio"
  - "Si hay coincidencia textual, describirla como folio relacionado/coincidente"

routing_precedence:
  seh: >
    Preguntas sobre estado/vigencia/ubicación/fecha de extintores después de un
    contexto SEH deben permanecer en SEH.

  folios: >
    Preguntas explícitas con "folio", "folios", "apoyo registrado", "compra
    registrada en folios" deben ir a Folios.

  expense: >
    Preguntas sobre cuánto se gastó deben seguir en Expense Analytics.

  examples:
    - "¿Cuál extintor está vencido?" => "SEH"
    - "¿Existe un folio de extintores?" => "FOLIOS"
    - "¿Cuánto gastamos en extintores?" => "EXPENSE_ANALYTICS"

must_preserve:
  - "SEH_OPERATION_STATUS actual"
  - "aislamiento por planta"
  - "vigencia SEH"
  - "Expense Analytics"
  - "folio search existente"
  - "EXECUTIVE_STATUS"
  - "DIAGNOSIS"
  - "saludo"
  - "smalltalk"
  - "planner actual fuera del slice"

in_scope:
  - "parser de follow-ups SEH"
  - "conversation state SEH"
  - "routing existencial de Folios"
  - "existence check por concepto"
  - "continuidad básica del concepto Folios"
  - "tests"
  - "reporte"
  - "CURRENT_TASK"

out_of_scope:
  - "cambiar tablas"
  - "cambiar schema DB"
  - "crear índices nuevos"
  - "mutaciones de folios"
  - "editar SEH"
  - "mejorar line-item attribution"
  - "crear catálogo de conceptos"
  - "búsqueda semántica/vectorial nueva"
  - "merge a main"
  - "deploy"
  - "siguiente tarea"

required_tests:
  seh:
    - "30/30 paráfrasis de extintor vencido"
    - "follow-up ¿Dónde está?"
    - "follow-up ¿Cuándo venció?"
    - "follow-up ¿Hay otro vencido?"
    - "follow-up ¿Cuál vence primero?"
    - "no herencia si cambia planta"
    - "no herencia si cambia dominio"

  folios:
    - "30/30 paráfrasis existenciales"
    - "sin mes explícito no pedir mes"
    - "concepto libre"
    - "extintores"
    - "aceite"
    - "llantas"
    - "baterías"
    - "pintura"
    - "uniformes"
    - "válvulas"
    - "follow-up ¿Cuántos hay?"
    - "follow-up ¿Cuál fue el más reciente?"
    - "follow-up ¿Cuáles están pagados?"

  precedence:
    - "SEH vs Folios"
    - "Folios vs Expense Analytics"
    - "no collision con gasto"

  regressions:
    - "SEH_OPERATION_STATUS existing suite"
    - "Expense Analytics"
    - "EXECUTIVE_STATUS"
    - "DIAGNOSIS"
    - "saludo"
    - "smalltalk"

success_metrics:
  - "30/30 SEH follow-up phrases"
  - "30/30 Folio existence phrases"
  - "0 forced mes_cargo on pure existence queries"
  - "0 routing collisions SEH/Folios/Expense"
  - "0 invented data"
  - "0 cross-plant leakage"

allowed_actions:
  - "crear rama fix/director-ia-seh-followup-folio-existence-001"
  - "modificar parser/routing/state de Director IA"
  - "reutilizar fuente Folios existente"
  - "crear tests"
  - "crear reporte"
  - "commit/push solo a rama"

forbidden_actions:
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "crear tablas"
  - "mutar datos"
  - "iniciar siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-DIRECTOR-IA-SEH-FOLLOWUP-AND-FOLIO-EXISTENCE-001.md"

final_state: "DONE_PENDING_REVIEW"