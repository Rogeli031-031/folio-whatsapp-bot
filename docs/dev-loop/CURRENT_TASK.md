task_id: G6-APROBACION-DIRECTA-DASHBOARD
status: AUTHORIZED
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-11-23T18:05:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-11-23"

objective: "Permitir que Luis autorice por chat privado autenticado el trabajo normal del dashboard sin editar CURRENT_TASK para cada cambio."

in_scope:
  - docs/dev-loop/CURRENT_TASK.md
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/TASK_TEMPLATE.md
  - docs/dev-loop/reports/README.md

out_of_scope:
  - "Código de la aplicación, contratos Director IA, base de datos, permisos, credenciales y producción."
  - "La tarea de Taller permanece en su rama y no se ejecuta con esta autorización."

contracts_in_force:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md

allowed_actions:
  - "G6: cambiar los documentos del protocolo para aceptar aprobación explícita y verificable de Luis por chat privado para cambios normales y acotados del dashboard."
  - "Registrar en el PR el alcance autorizado, la fecha, la referencia de aprobación y las pruebas, sin guardar conversaciones privadas."
  - "Editar solo en la rama de trabajo y abrir un PR para revisión y merge humano."

forbidden_actions:
  - "Modificar la autorización humana, ampliar el alcance por cuenta del agente o autorizar tareas siguientes."
  - "Autorizar migraciones, cambios de permisos, escrituras en producción o cambios de arquitectura por aprobación genérica."
  - "Push o merge a main, auto-merge, despliegue directo o publicación de chats privados."

max_attempts: 1
result_report_path: docs/dev-loop/reports/G6-APROBACION-DIRECTA-DASHBOARD.md
