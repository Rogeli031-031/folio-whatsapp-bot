task_id: G6-MERGE-DASHBOARD-POR-CHAT
status: AUTHORIZED
authorized_by: HUMAN_APPROVER
authorized_at: "<fecha y hora ISO 8601 con zona>"
human_authorization: "<línea de autorización escrita por Luis>"
objective: "Permitir que Mía integre un PR ordinario del Dashboard solo tras la aprobación explícita de Luis en chat privado para ese PR y ese commit, sin que Luis use PowerShell."
in_scope:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/TASK_TEMPLATE.md
  - docs/dev-loop/reports/README.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/G6-MERGE-DASHBOARD-POR-CHAT.md
out_of_scope:
  - "Código de la aplicación, contratos de Director IA, migraciones, permisos, datos, credenciales, infraestructura y despliegues manuales."
contracts_in_force:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
allowed_actions:
  - "G6: documentar integración asistida con aprobación humana por PR y commit, controles de GitHub vigentes y registro de la aprobación ordinaria sin reemplazar CURRENT_TASK."
  - "Editar, verificar, guardar y subir solo en g6/merge-dashboard-por-chat; abrir PR para revisión y merge humano."
forbidden_actions:
  - "Cambiar autorizaciones humanas, desactivar protecciones, habilitar auto-merge, publicar chats privados, o hacer push o merge a main con esta tarea."
max_attempts: 1
result_report_path: docs/dev-loop/reports/G6-MERGE-DASHBOARD-POR-CHAT.md
