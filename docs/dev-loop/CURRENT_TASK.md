task_id: IGF-TALLER-ACAPULCO-APP-SERGIO
status: AUTHORIZED
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-11-26:MM:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez AAAA-MM-DD"

objective: "Preparar y probar la conexión de la versión actual de la app de Sergio al IGF de Acapulco para Uribe e HidroGas."

in_scope:
  - docs/dev-loop/CURRENT_TASK.md
  - server.js
  - lib/igf-acapulco-taller-app.js
  - lib/igf-acapulco-taller-upload.js
  - lib/igf-acapulco-productividad-taller.js
  - sql/032_igf_acapulco_taller_app.sql
  - test/igf-acapulco-taller-app.test.js
  - docs/dev-loop/reports/IGF-TALLER-ACAPULCO-APP-SERGIO.md

out_of_scope:
  - "Otras plantas, ventas, compras, folios y cambios al protocolo."
  - "Historial existente, datos reales de prueba y producción."
  - "Credenciales reales, permisos activos y despliegue."

contracts_in_force:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md

allowed_actions:
  - "Implementar en una rama dedicada y probar solo en una base aislada con datos ficticios."
  - "Preparar el receptor autenticado y validar reenvíos, entradas y salidas, separación por empresa, cobertura y convivencia con Excel."
  - "Probar pipas Uribe en el IGF y cilindreras HidroGas solo en historial de taller."
  - "Abrir un PR borrador con evidencia y pasos de activación y reversión."

forbidden_actions:
  - "Cambiar campos humanos o autoaprobar gates."
  - "Fusionar o subir directamente a main."
  - "Aplicar migraciones, credenciales, permisos o despliegues en producción."
  - "Reemplazar la base de Sergio ni modificar el histórico."

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IGF-TALLER-ACAPULCO-APP-SERGIO.md"
