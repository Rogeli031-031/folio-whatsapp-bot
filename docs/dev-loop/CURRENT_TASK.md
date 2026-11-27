task_id: IGF-TALLER-ACAPULCO-APP-SERGIO
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-11-26T19:31:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-11-26"
objective: "Preparar y probar la conexión de la versión actual de la app de Sergio al IGF de Acapulco. Separar las pipas de Gas Uribe de las cilindreras de HidroGas."
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
  - "Otras plantas, datos reales y cambios a la app instalada de Sergio."
contracts_in_force:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
allowed_actions:
  - "Implementar y probar con datos ficticios en base aislada; hacer commit y push solo en feat/igf-taller-acapulco-app-sergio y abrir un PR borrador con instrucciones de activación y reversión."
forbidden_actions:
  - "Escribir datos, aplicar SQL, configurar credenciales o activar la conexión en producción."
  - "Modificar el historial original, publicar datos reales, modificar campos de autorización, fusionar, desplegar o hacer push directo a main."
max_attempts: 1
result_report_path: docs/dev-loop/reports/IGF-TALLER-ACAPULCO-APP-SERGIO.md
