task_id: "ARCH-INDEX-SYNC-002"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15T11:41:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G2_architecture_change: AUTHORIZED

objective: >
  Actualizar exclusivamente
  docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  para sincronizar la entrada de 06-CHANNEL-PROJECTION con el estado
  real del contrato integrado en main, respetando estrictamente las
  convenciones documentales ya existentes en el índice.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/reports/ARCH-INDEX-SYNC-002.md"

out_of_scope:
  - "modificar docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "modificar cualquier otro contrato en docs/director-ia/"
  - "runtime de Director IA"
  - "código productivo"
  - ".cursor/"
  - ".cursorrules"
  - ".github/"
  - "GitHub Actions o watchers"
  - "commit, push o merge a main"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

allowed_actions:
  - "leer contracts_in_force"
  - "identificar la convención existente de estado, versión y fecha en el índice"
  - "actualizar exclusivamente la referencia de 06-CHANNEL-PROJECTION en el índice"
  - "actualizar CURRENT_TASK mediante las transiciones permitidas"
  - "crear el reporte de esta tarea"
  - "ejecutar git diff --check y verificaciones de solo lectura"

forbidden_actions:
  - "inventar una nueva convención de estados"
  - "modificar el contenido de 06-CHANNEL-PROJECTION.md"
  - "modificar cualquier contrato distinto del índice"
  - "corregir otras inconsistencias detectadas"
  - "implementar runtime"
  - "crear reglas de Cursor"
  - "autoaprobar gates"
  - "crear una tarea posterior"
  - "commit, push o merge a main"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-INDEX-SYNC-002.md"