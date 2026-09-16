task_id: "FIX-DIRECTOR-IA-GREETING-AND-GENERIC-EXPENSE-KEYWORD-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-16"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Corregir dos fallas observadas en producción:
  1) limpiar honoríficos del nombre usado como vocativo en el saludo de Director IA,
  sin modificar la identidad persistida;
  2) permitir que Expense Analytics reconozca de forma genérica consultas del tipo
  "cuánto gastamos en [concepto] en [periodo]" sin requerir que el concepto esté
  predefinido en una lista especial.

production_evidence:
  greeting_observed:
    input: "hola"
    output: "Hola, Ing. Luis Rogelio Zaragoza. ¿En qué te ayudo?"
    issue: >
      nombre_persona contiene un honorífico persistido y el saludo lo reproduce
      literalmente.

  expense_observed:
    input: "cuanto gastamos en aceite en febrero?"
    output: >
      No se pudo determinar una intención clara con las reglas actuales...
    issue: >
      Expense Analytics no entra porque "aceite" no está en la lista especial de
      componentes y no hay dominio explícito Taller/Gastos/Inversiones.

greeting_fix:
  source_of_identity:
    actor: "req.dashboardAuth.actor_id"
    persisted_name: "usuarios.nombre_persona"

  rule: >
    Mantener nombre_persona como fuente física de identidad, pero aplicar una
    normalización solo de presentación para el vocativo del saludo.

  strip_only_leading_honorifics:
    - "Ing."
    - "Ing"
    - "Ingeniero"
    - "Lic."
    - "Lic"
    - "Licenciado"
    - "Dr."
    - "Dr"
    - "Doctor"
    - "Dra."
    - "Dra"
    - "Doctora"
    - "Arq."
    - "Arq"
    - "Arquitecto"
    - "Arquitecta"

  examples:
    - persisted: "Ing. Luis Rogelio Zaragoza"
      greeting_name: "Luis Rogelio Zaragoza"
    - persisted: "Luis Rogelio Zaragoza"
      greeting_name: "Luis Rogelio Zaragoza"

  critical_rule: >
    No modificar usuarios.nombre_persona en DB. La limpieza aplica únicamente al
    texto mostrado en el saludo.

generic_expense_keyword_contract:
  mother_pattern: >
    Consulta cuantitativa de gasto con verbo/expresión de gasto + concepto libre +
    periodo explícito o resoluble.

  examples_must_route:
    - "¿cuánto gastamos en aceite en febrero?"
    - "¿cuánto gasté en baterías en marzo?"
    - "¿cuánto se gastó en pintura en enero?"
    - "¿cuánto gastamos en filtros de aceite de enero a marzo?"
    - "¿cuánto gastamos en uniformes en agosto?"
    - "¿cuánto se gastó en extintores en febrero?"

  routing_rule: >
    Si existe cue inequívoco de gasto/importe y un keyword/concepto libre usable,
    Expense Analytics puede aceptar la consulta aunque no exista dominio explícito
    Taller/Gastos/Inversiones y aunque el keyword no esté en una lista especial.

  do_not_require:
    - "keyword predefinido"
    - "Taller explícito"
    - "Gastos explícito"
    - "Inversiones explícito"

  must_still_reject:
    - "preguntas sin cue de gasto/métrica"
    - "consultas financieras IGF/rentabilidad/utilidad"
    - "exportaciones Excel"
    - "Taller Mayor"
    - "preguntas ambiguas sin concepto usable"

keyword_contract:
  rule: >
    Reutilizar extractKeyword/normalización existente. No crear catálogo manual de
    aceite, baterías, pintura, filtros, uniformes, etc.

  examples:
    "cuanto gastamos en aceite en febrero": "aceite"
    "cuanto gastamos en filtros de aceite en marzo": "filtros aceite"
    "cuanto se gasto en pintura en enero": "pintura"

amount_semantics:
  rule: >
    Mantener el contrato de veracidad actual de Expense Analytics.

  if_only_folio_total_available: >
    Puede sumar importes completos de los folios que coincidan con el keyword,
    pero debe decir claramente que el total corresponde a los folios coincidentes
    y no necesariamente al costo exclusivo del concepto.

  if_exact_attribution_requested_and_not_available: >
    Fallar cerrado y explicar que no puede determinar el importe exclusivo.

  forbidden:
    - "inventar desglose"
    - "atribuir 100% del folio al concepto sin advertencia"
    - "convertir coincidencia textual en costo exacto"

must_preserve:
  - "actor_id -> usuarios.nombre_persona"
  - "fallback neutro del saludo"
  - "aislamiento cross-user"
  - "Expense Analytics actual"
  - "llantas/refacciones"
  - "Taller"
  - "Gastos"
  - "Inversiones"
  - "SUM/COUNT/AVG/MAX/MIN"
  - "periodos y rangos"
  - "estatus"
  - "limitaciones de atribución"
  - "EXECUTIVE_STATUS"
  - "DIAGNOSIS"
  - "PERFORMANCE"
  - "smalltalk"

in_scope:
  - "normalización de vocativo"
  - "routing genérico de gasto por keyword"
  - "tests"
  - "CURRENT_TASK"
  - "reporte"

out_of_scope:
  - "modificar usuarios.nombre_persona en DB"
  - "crear preferred_salutation"
  - "agregar memoria personal"
  - "crear catálogo de conceptos"
  - "modificar SQL/schema"
  - "mejorar atribución por partidas"
  - "continuidad conversacional de result-set"
  - "merge a main"
  - "deploy"
  - "siguiente tarea"

required_tests:
  greeting:
    - "Ing. Luis Rogelio Zaragoza -> Luis Rogelio Zaragoza"
    - "Luis Rogelio Zaragoza permanece igual"
    - "Lic./Dr./Arq. se limpian solo al inicio"
    - "no se mutilan nombres que contengan esas letras internamente"
    - "fallback sigue funcionando"
    - "cross-user sigue aislado"

  generic_expense:
    - "cuánto gastamos en aceite en febrero -> Expense Analytics"
    - "cuánto gasté en baterías en marzo -> Expense Analytics"
    - "cuánto se gastó en pintura en enero -> Expense Analytics"
    - "cuánto gastamos en filtros de aceite de enero a marzo -> Expense Analytics"
    - "cuánto gastamos en uniformes en agosto -> Expense Analytics"
    - "keyword correcto"
    - "periodo correcto"
    - "no requiere dominio explícito"

  veracity:
    - "folio total only conserva disclaimer"
    - "exacto/exclusivo falla cerrado si no hay atribución"
    - "no inventa componente"

  regression:
    - "Expense Analytics suite completa"
    - "saludo identidad suite completa"
    - "smalltalk"
    - "EXECUTIVE_STATUS"
    - "DIAGNOSIS"
    - "PERFORMANCE"

success_metrics:
  - "hola ya no muestra Ing./Lic./Dr./Arq. como vocativo"
  - "aceite entra a Expense Analytics"
  - "conceptos libres equivalentes entran sin catálogo manual"
  - "0 cambios de schema"
  - "0 degradación de contratos de veracidad"

allowed_actions:
  - "crear rama fix/director-ia-greeting-generic-expense-keyword-001"
  - "modificar helper de identidad mínimo"
  - "modificar gate/router de Expense Analytics mínimo"
  - "agregar tests"
  - "actualizar CURRENT_TASK"
  - "crear reporte"
  - "commit/push solo a rama autorizada"

forbidden_actions:
  - "editar usuarios.nombre_persona en DB"
  - "agregar catálogo manual de conceptos"
  - "modificar SQL/schema"
  - "relajar limitaciones de atribución"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-DIRECTOR-IA-GREETING-AND-GENERIC-EXPENSE-KEYWORD-001.md"

final_state: "DONE_PENDING_REVIEW"