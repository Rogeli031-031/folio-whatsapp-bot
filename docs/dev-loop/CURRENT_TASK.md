```yaml
task_id: "AUDIT-DIRECTOR-IA-USER-IDENTITY-GREETING-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Auditar cómo obtiene Director IA la identidad del usuario autenticado y cómo
  construye hoy los saludos, para definir un contrato de saludo personalizado
  por usuario sin hardcodear nombres, sin confundir planta con identidad y sin
  exponer información no autorizada.

production_evidence:
  prompt: "hola"
  observed_response: >
    Hola. Estoy en Acapulco. ¿Qué quieres revisar?
  problem:
    - "No identifica a la persona con la que está hablando."
    - "Usa la planta como si fuera identidad o ubicación personal."
    - "El saludo se siente genérico y poco humano."

target_experience:
  example_for_current_user: >
    Hola, buen día, Ingeniero Zaragoza. ¿En qué te ayudo?
  rule: >
    El ejemplo NO debe hardcodearse. Cada usuario debe recibir un saludo basado
    exclusivamente en su propia identidad autenticada y en datos permitidos.

core_questions:
  - "¿De dónde sale físicamente el usuario autenticado?"
  - "¿Qué datos de identidad están disponibles en runtime?"
  - "¿Nombre completo?"
  - "¿Nombre corto?"
  - "¿Rol?"
  - "¿Título o forma de trato?"
  - "¿Correo?"
  - "¿Planta?"
  - "¿Existe preferencia de cómo llamarlo?"
  - "¿Cómo llega esa identidad al endpoint/chat de Director IA?"
  - "¿Dónde se genera hoy la respuesta de smalltalk/saludo?"
  - "¿Por qué aparece 'Estoy en Acapulco'?"
  - "¿Qué parte pertenece a user identity y qué parte a plant context?"
  - "¿Qué fallback debe usarse si no hay nombre?"
  - "¿Qué datos NO deben usarse en el saludo?"

must_distinguish:
  user_identity:
    examples:
      - "nombre"
      - "apellido"
      - "rol"
      - "forma de trato permitida"

  plant_context:
    examples:
      - "Acapulco"
      - "Puebla"
      - "planta seleccionada"

  conversational_context:
    examples:
      - "hora del día"
      - "última interacción"
      - "tema activo"

rule: >
  Planta seleccionada != identidad del usuario.
  Director IA no debe decir "Estoy en Acapulco" para un saludo simple salvo que
  exista una razón conversacional explícita para mencionar la planta.

audit_paths:
  - "frontend/session/auth context"
  - "backend auth middleware"
  - "usuario actual"
  - "payload de /director-ia o endpoint equivalente"
  - "smalltalk / greeting intent"
  - "director-ia-chat"
  - "conversation_state si aplica"
  - "tabla/modelo de usuarios si se consulta en runtime"

classification_required:
  - "IDENTITY_AVAILABLE"
  - "IDENTITY_PARTIAL"
  - "ROLE_AVAILABLE"
  - "TITLE_AVAILABLE"
  - "PLANT_CONTEXT_ONLY"
  - "NOT_AVAILABLE"
  - "NOT_SAFE_TO_USE"

required_cases:
  - case: "usuario con nombre completo"
    expected: >
      Puede dirigirse por nombre/forma de trato conforme al contrato definido.

  - case: "usuario con nombre pero sin título"
    expected: >
      No inventar Ingeniero/Licenciado/Doctor.

  - case: "usuario sin nombre usable"
    expected: >
      Saludo natural sin nombre, por ejemplo "Hola, buen día. ¿En qué te ayudo?"

  - case: "usuario con planta seleccionada"
    expected: >
      No presentar la planta como si fuera identidad o ubicación personal.

  - case: "otro usuario"
    expected: >
      Nunca reutilizar identidad, trato ni nombre del usuario actual.

  - case: "hola / buenos días / buenas tardes / buenas noches"
    expected: >
      Auditar si el runtime distingue saludo por hora o si conviene mantener una
      forma neutral.

privacy_and_auth:
  - "No exponer datos de otro usuario."
  - "No inferir título profesional por nombre, correo o rol si no existe dato explícito."
  - "No usar información sensible en saludo."
  - "Respetar permisos y usuario autenticado."
  - "No depender de memoria global compartida para identificar al usuario."

contract_to_define:
  preferred_name_resolution: >
    Orden de precedencia para decidir cómo dirigirse al usuario.
  title_resolution: >
    Definir si existe un campo físico para 'Ingeniero', 'Licenciado', etc.
    Si no existe, no inventarlo.
  greeting_style: >
    Definir si debe ser cálido, breve y natural.
  plant_mention: >
    Cuándo mencionar la planta y cuándo no.
  fallback: >
    Comportamiento si falta identidad.
  multi_user_isolation: >
    Garantizar que cada sesión use exclusivamente la identidad del usuario
    autenticado.

required_report_sections:
  - "Resumen ejecutivo"
  - "Ruta física de autenticación"
  - "Campos de identidad disponibles"
  - "Campos de rol/título disponibles"
  - "Cómo llega identidad al chat"
  - "Origen de la respuesta actual"
  - "Por qué aparece la planta en el saludo"
  - "Separación identidad vs planta"
  - "Contrato propuesto de saludo"
  - "Fallbacks"
  - "Riesgos multiusuario"
  - "Slice mínimo de implementación"

success_criteria:
  - "Se identifica la fuente física de identidad."
  - "Se sabe exactamente qué nombre/trato puede utilizarse."
  - "Se determina si 'Ingeniero' existe físicamente o no."
  - "Se explica por qué hoy responde 'Estoy en Acapulco'."
  - "Se define cómo personalizar por usuario sin hardcode."
  - "Se define fallback seguro."
  - "Se propone un slice mínimo de implementación."
  - "No se implementa nada."

in_scope:
  - "lectura de auth/session/auth context"
  - "lectura de smalltalk/greeting runtime"
  - "lectura de director-ia-chat"
  - "lectura de frontend/backend necesaria para seguir identidad"
  - "sondas read-only"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-USER-IDENTITY-GREETING-001.md"

out_of_scope:
  - "implementación"
  - "memoria personal de largo plazo"
  - "preferencias nuevas persistidas"
  - "SQL/schema"
  - "frontend UX adicional"
  - "Taller"
  - "PRIORITY"
  - "CAUSE_EXPLANATION"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

allowed_actions:
  - "crear rama audit/director-ia-user-identity-greeting-001"
  - "auditar código y flujo de auth"
  - "ejecutar sondas read-only"
  - "crear reporte"
  - "commit y push únicamente a la rama de auditoría si el protocolo vigente lo permite"

forbidden_actions:
  - "hardcodear Ingeniero Zaragoza"
  - "inventar títulos"
  - "usar identidad de otro usuario"
  - "modificar SQL"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "iniciar Taller"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-USER-IDENTITY-GREETING-001.md"

final_state: "DONE_PENDING_REVIEW"
```
