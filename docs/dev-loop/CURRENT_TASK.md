```yaml
task_id: "IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Implementar saludo personalizado en Director IA usando exclusivamente la identidad
  física del usuario autenticado, resolviendo actor_id hacia usuarios.nombre_persona,
  sin inventar títulos, sin usar la planta como identidad y manteniendo aislamiento
  estricto entre usuarios.

source_audit:
  task_id: "AUDIT-DIRECTOR-IA-USER-IDENTITY-GREETING-001"
  report: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-USER-IDENTITY-GREETING-001.md"
  audit_commit: "d31fe03b"

known_facts:
  - "req.dashboardAuth contiene actor_id, role, plantas y permisos."
  - "El token típico de Director IA no incluye nombre de persona."
  - "req.dashboardUser / req.user no existen en esta ruta."
  - "El nombre físico está en usuarios.nombre_persona."
  - "No existe campo físico de título/honorífico."
  - "La planta seleccionada no representa identidad."
  - "La memoria se particiona por usuario:{actor_id} y no define quién habla."

primary_goal: >
  Cuando el usuario envía un saludo simple, Director IA debe responder de forma
  natural usando nombre_persona si está disponible para ese actor_id.

supported_greetings:
  - "hola"
  - "buen día"
  - "buenos días"
  - "buenas tardes"
  - "buenas noches"
  - "qué tal"
  - "que tal"

name_resolution:
  source: "usuarios.nombre_persona"
  key: "actor_id del usuario autenticado"
  rule: >
    Resolver exclusivamente la fila correspondiente al actor_id de la sesión actual.
    No usar memoria, planta, correo, rol o contexto de otro usuario como sustituto.

title_resolution:
  status: "NOT_AVAILABLE"
  rule: >
    No inferir Ingeniero, Licenciado, Doctor, Don, Señora ni otro tratamiento a
    partir de rol, puesto, correo, nombre o cualquier otra señal.

greeting_contract:
  with_name:
    examples:
      hola: "Hola, {nombre_persona}. ¿En qué te ayudo?"
      buenos_dias: "Buenos días, {nombre_persona}. ¿En qué te ayudo?"
      buenas_tardes: "Buenas tardes, {nombre_persona}. ¿En qué te ayudo?"
      buenas_noches: "Buenas noches, {nombre_persona}. ¿En qué te ayudo?"

  without_name:
    examples:
      hola: "Hola. ¿En qué te ayudo?"
      buenos_dias: "Buenos días. ¿En qué te ayudo?"
      buenas_tardes: "Buenas tardes. ¿En qué te ayudo?"
      buenas_noches: "Buenas noches. ¿En qué te ayudo?"

salutation_echo_rule: >
  Reflejar el tipo de saludo expresado por el usuario. No depender del reloj del
  servidor para convertir automáticamente "hola" en buenos días/tardes/noches.

plant_rule:
  prohibited:
    - "Hola. Estoy en Acapulco."
    - "Estoy en {planta}."
  allowed: >
    La planta puede mencionarse después solo cuando sea relevante para una consulta
    operativa o el usuario la mencione explícitamente.

privacy_rules:
  - "No exponer identidad de otro usuario."
  - "No reutilizar nombre de sesiones previas de otro actor_id."
  - "No usar memoria global para resolver identidad."
  - "No mencionar email, role, permisos ni puesto en el saludo."
  - "No usar usuarios.nombre como sustituto de nombre_persona si la auditoría lo distingue como puesto."

implementation_principle: >
  Resolver identidad en una frontera mínima y reutilizable, evitando consultas
  duplicadas por cada frase si ya existe una carga de usuario autorizada disponible
  en el request. No crear un segundo sistema de identidad.

required_behavior:
  - "hola + nombre disponible → saludo personalizado"
  - "hola + nombre ausente → saludo neutro"
  - "buenos días → conservar buenos días"
  - "buenas tardes → conservar buenas tardes"
  - "buenas noches → conservar buenas noches"
  - "no mencionar planta en saludo simple"
  - "no inventar título"
  - "otro usuario recibe exclusivamente su propio nombre"
  - "smalltalk no debe consultar datos ejecutivos innecesarios"

fallback_behavior:
  user_lookup_failure: >
    Si la búsqueda de identidad falla, el saludo debe continuar sin nombre. No fallar
    toda la conversación por no poder personalizar.
  null_name: >
    Saludo neutro.
  empty_name: >
    Saludo neutro.

protected_boundaries:
  authorization:
    rule: "No modificar permisos ni auth."
  memory:
    rule: "No modificar almacenamiento o contrato de memoria."
  plant_context:
    rule: "No eliminar contexto de planta para consultas operativas."
  executive_status:
    rule: "No modificar."
  diagnosis:
    rule: "No modificar."
  performance:
    rule: "No modificar."
  frontend:
    rule: "No requiere cambios salvo evidencia física estrictamente necesaria."

tests_required:
  positive:
    - "hola con nombre_persona"
    - "buenos días con nombre_persona"
    - "buenas tardes con nombre_persona"
    - "buenas noches con nombre_persona"
    - "usuario sin nombre_persona"
    - "lookup de identidad falla y greeting sigue funcionando"

  isolation:
    - "usuario A no recibe nombre de usuario B"
    - "dos actor_id distintos producen identidades distintas"
    - "memoria no reemplaza identidad autenticada"

  negative:
    - "no aparece 'Estoy en Acapulco' en saludo simple"
    - "no aparece Ingeniero si no existe título"
    - "no usa role como tratamiento"
    - "no usa puesto como tratamiento"
    - "no usa planta como nombre"
    - "no filtra identidad entre sesiones"

  regression:
    - "smalltalk existente sigue funcionando"
    - "consultas operativas siguen recibiendo planta"
    - "EXECUTIVE_STATUS sin regresión"
    - "DIAGNOSIS sin regresión"
    - "PERFORMANCE sin regresión"

success_metrics:
  - "100% de saludos soportados usan nombre_persona cuando existe."
  - "0 títulos inventados."
  - "0 menciones de planta como identidad."
  - "0 cruces de identidad entre usuarios."
  - "fallo de lookup de identidad no rompe el chat."
  - "sin cambios SQL/schema."

in_scope:
  - "frontera auth/chat necesaria para resolver actor_id → usuarios.nombre_persona"
  - "smalltalk/greeting runtime"
  - "director-ia-chat si aplica"
  - "tests y fixtures"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-001.md"

out_of_scope:
  - "preferred_salutation persistido"
  - "campo de título/honorífico"
  - "memoria personal de largo plazo"
  - "Taller Expense Analytics"
  - "PRIORITY"
  - "CAUSE_EXPLANATION"
  - "SQL/schema"
  - "frontend adicional"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

allowed_actions:
  - "crear rama implementation/director-ia-user-identity-greeting-001"
  - "modificar la mínima frontera necesaria"
  - "agregar helper reutilizable de identidad si es necesario"
  - "agregar tests"
  - "ejecutar sondas locales"
  - "documentar evidencia"
  - "commit y push únicamente a la rama autorizada si el protocolo vigente lo permite"

forbidden_actions:
  - "hardcodear Ingeniero Zaragoza"
  - "inventar título"
  - "usar nombre de otro usuario"
  - "crear nueva tabla/campo"
  - "modificar SQL"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "iniciar Taller"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-USER-IDENTITY-GREETING-001.md"

final_state: "DONE_PENDING_REVIEW"
```
