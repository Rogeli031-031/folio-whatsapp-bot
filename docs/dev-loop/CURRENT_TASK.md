task_id: "IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-002"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-16"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Reaplicar sobre el main actual la capacidad de Director IA para reconocer al
  usuario autenticado por identidad física y saludarlo por su nombre real,
  tomando como referencia la implementación previa
  IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-001, sin mergear su rama histórica.

source_reference:
  previous_task: "IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-001"
  previous_branch: "implementation/director-ia-user-identity-greeting-001"
  previous_commit: "c3125b82"
  rule: >
    Usar esa implementación como referencia funcional, pero reaplicar únicamente
    los cambios necesarios sobre el main actual. No mergear ni rebasear la rama
    histórica completa.

identity_contract:
  source:
    actor: "req.dashboardAuth.actor_id"
    name: "usuarios.nombre_persona"

  rules:
    - >
      La identidad del usuario se determina exclusivamente desde el actor
      autenticado del request.
    - >
      No usar planta seleccionada como identidad.
    - >
      No usar memoria conversacional para decidir quién habla.
    - >
      No usar role, puesto o usuarios.nombre como sustituto de nombre_persona.
    - >
      No inferir títulos u honoríficos.

greeting_contract:
  examples:
    - input: "hola"
      with_name: "Hola, {nombre_persona}. ¿En qué te ayudo?"
      without_name: "Hola. ¿En qué te ayudo?"

    - input: "buenos días"
      with_name: "Buenos días, {nombre_persona}. ¿En qué te ayudo?"
      without_name: "Buenos días. ¿En qué te ayudo?"

    - input: "buenas tardes"
      with_name: "Buenas tardes, {nombre_persona}. ¿En qué te ayudo?"
      without_name: "Buenas tardes. ¿En qué te ayudo?"

    - input: "buenas noches"
      with_name: "Buenas noches, {nombre_persona}. ¿En qué te ayudo?"
      without_name: "Buenas noches. ¿En qué te ayudo?"

fallback_contract:
  rule: >
    Si el lookup de identidad falla, el chat debe continuar con saludo neutro.
    Nunca debe fallar toda la conversación por no poder recuperar nombre_persona.

cross_user_protection:
  rule: >
    El usuario A nunca puede recibir el nombre del usuario B. La resolución debe
    hacerse por actor_id de cada request y no mediante estado global compartido.

simple_greeting_rule:
  rule: >
    Un saludo simple no debe responder con "Estoy en {planta}" ni usar planta,
    ubicación o contexto comercial como parte del saludo.

honorific_rule:
  prohibited:
    - "Ingeniero"
    - "Licenciado"
    - "Doctor"
    - "Gerente"
  rule: >
    No usar ningún honorífico salvo que exista un campo físico explícito y
    autorizado para ello. Ese campo no forma parte de este slice.

must_preserve:
  - "Expense Analytics"
  - "EXECUTIVE_STATUS"
  - "DIAGNOSIS"
  - "PERFORMANCE"
  - "smalltalk"
  - "planner actual"
  - "aislamiento por planta"
  - "autorización actual"

in_scope:
  - "resolución actor_id -> usuarios.nombre_persona"
  - "saludos hola/buenos días/buenas tardes/buenas noches"
  - "fallback neutral"
  - "protección cross-user"
  - "tests"
  - "reporte"
  - "CURRENT_TASK"

out_of_scope:
  - "preferred_salutation"
  - "títulos/honoríficos"
  - "memory relationship layer"
  - "recordar preferencias personales"
  - "modificar SQL/schema"
  - "crear campos nuevos"
  - "saludo proactivo por horario del servidor"
  - "merge a main"
  - "deploy"
  - "siguiente tarea"

implementation_principle: >
  Reaplicar la mínima lógica de identidad necesaria sobre el main actual,
  reutilizando la implementación previa como referencia. No arrastrar cambios
  obsoletos de la rama histórica.

required_tests:
  positive:
    - "hola con nombre"
    - "buenos días con nombre"
    - "buenas tardes con nombre"
    - "buenas noches con nombre"

  fallback:
    - "actor sin nombre_persona"
    - "lookup DB falla"
    - "saludo sigue respondiendo"

  security:
    - "usuario A no recibe nombre de usuario B"
    - "no cache global de identidad"
    - "no memoria como fuente de identidad"

  semantic:
    - "no aparece planta en saludo simple"
    - "no aparece role como tratamiento"
    - "no aparece puesto como tratamiento"
    - "no se inventa Ingeniero"

  regression:
    - "Expense Analytics sigue pasando"
    - "EXECUTIVE_STATUS sigue pasando"
    - "DIAGNOSIS sigue pasando"
    - "PERFORMANCE sigue pasando"
    - "smalltalk no regresiona"

success_metrics:
  - "saludo con nombre correcto cuando nombre_persona existe"
  - "fallback neutro cuando no existe"
  - "0 contaminación cross-user"
  - "0 honoríficos inventados"
  - "0 uso de planta como identidad"
  - "0 cambios SQL/schema"

allowed_actions:
  - "crear rama implementation/director-ia-user-identity-greeting-002"
  - "consultar rama/commit previo solo como referencia"
  - "reaplicar cambios mínimos sobre main actual"
  - "agregar/ajustar tests"
  - "documentar evidencia"
  - "commit/push solo a rama autorizada"

forbidden_actions:
  - "mergear la rama histórica completa"
  - "rebasear la rama histórica sobre main como solución automática"
  - "crear campos nuevos"
  - "modificar SQL/schema"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-002.md"

final_state: "DONE_PENDING_REVIEW"