task_id: IMPL-IGF-ACAPULCO-TALLER
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-11-23T17:45:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-11-23"

objective: "En IGF Diario Acapulco, habilitar la carga manual de los Excel de taller Uribe (E9) e HidroGas (E10) para Luis y Diana, guardar el histórico privado en PostgreSQL y usarlo en el Excel de productividad y folios."

in_scope:
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/IMPL-IGF-ACAPULCO-TALLER.md
  - frontend-dashboard/components/DashboardIgfDiario.tsx
  - frontend-dashboard/components/IgfForecastClient.tsx
  - frontend-dashboard/components/IgfDiarioTallerUpload.tsx
  - frontend-dashboard/lib/api.ts
  - server.js
  - sql/027_igf_taller_diario_acapulco.sql
  - lib/dashboard-arr-forecast.js
  - lib/igf-acapulco-taller-upload.js
  - lib/igf-acapulco-taller-xlsx.js
  - lib/igf-acapulco-productividad.js
  - lib/igf-acapulco-productividad-model.js
  - lib/igf-acapulco-productividad-excel.js
  - lib/igf-acapulco-productividad-taller.js
  - test/igf-acapulco-productividad.test.js
  - test/igf-acapulco-productividad-taller.test.js
  - test/igf-acapulco-taller-upload.test.js

out_of_scope:
  - "Otras plantas, cambios a estaciones, ventas, inventarios y folios existentes."
  - "Acceso al correo, carga automática, carga masiva histórica y archivos o datos reales en Git."
  - "Contratos Director IA, credenciales y permisos globales."

contracts_in_force:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md

allowed_actions:
  - "Implementar y probar con datos sintéticos en esta rama; preparar la migración aditiva y abrir PR para revisión humana."
  - "Limitar la carga a las cuentas verificadas de Luis y Diana en Acapulco. Validar empresa, fecha y unidades en vista previa antes de guardar."
  - "Conservar historial y revisiones por empresa y fecha, registrar quién cargó y evitar duplicados del mismo archivo."
  - "Leer en el IGF sólo reportes verificados, conservar litros y distinguir sin reporte de sin unidades en taller."
  - "Tras la migración y el merge humanos, verificar en producción la primera carga manual controlada de Acapulco realizada por Luis o Diana y la descarga del IGF."

forbidden_actions:
  - "Alterar la autorización humana, modificar permisos globales o subir datos reales al repositorio."
  - "Inferir taller, depósito o salida sin evidencia; sobrescribir una revisión o borrar datos."
  - "Aplicar migraciones productivas, push o merge a main, auto-merge o despliegue directo por el implementador."

max_attempts: 1
result_report_path: docs/dev-loop/reports/IMPL-IGF-ACAPULCO-TALLER.md
