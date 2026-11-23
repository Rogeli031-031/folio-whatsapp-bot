task_id: "IMPL-IGF-ACAPULCO-PRODUCTIVIDAD"
status: AUTHORIZED
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-11-23T15:57:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-11-23"

objective: "Agregar las ocho hojas de productividad aprobadas al inicio del Excel de IGF Diario, solo para Acapulco."

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md: actualizar estado conforme al protocolo"
  - "lib/dashboard-arr-forecast.js: integrar las hojas en la descarga actual"
  - "lib/igf-acapulco-productividad*.js: lectura, cálculo y formato"
  - "test/igf-acapulco-productividad*.test.js: pruebas"
  - "docs/dev-loop/reports/IMPL-IGF-ACAPULCO-PRODUCTIVIDAD.md: evidencia"

out_of_scope:
  - "Cambios a otras plantas, hojas existentes, permisos y datos de producción"
  - "Migraciones, secretos y contratos del proyecto"
  - "Push a main, merge o despliegue por el implementador"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

allowed_actions:
  - "Implementar y probar dentro del alcance"
  - "Registrar evidencia, guardar en la rama de la tarea y abrir PR para revisión humana"

forbidden_actions:
  - "Alterar la autorización humana ni aprobar gates"
  - "Hacer merge, desplegar, modificar datos productivos o incorporar secretos"

acceptance: "Solo Acapulco recibe ocho hojas nuevas al inicio. Se conservan las hojas existentes. Las ventas de domingo suman al total, pero el domingo no cuenta para el promedio."
max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-ACAPULCO-PRODUCTIVIDAD.md"
