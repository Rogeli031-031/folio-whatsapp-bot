task_id: IGF-TALLER-QUERETARO-CARGA
status: IN_PROGRESS
authorized_by: HUMAN_APPROVER
authorized_at: "2026-11-24T23:25:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-11-24"
objective: "Habilitar la carga del Excel mensual original de taller en IGF Forecast > IGF Diario acumulado > Querétaro y guardar cada pestaña con su fecha en un historial exclusivo de Querétaro."
in_scope:
  - docs/dev-loop/CURRENT_TASK.md
  - lib/igf-queretaro-taller-xlsx.js
  - lib/igf-queretaro-taller-upload.js
  - frontend-dashboard/components/IgfForecastClient.tsx
  - frontend-dashboard/components/IgfDiarioTallerUpload.tsx
  - frontend-dashboard/lib/api.ts
  - server.js
  - sql/20261125_igf_taller_diario_queretaro.sql
  - test/igf-queretaro-taller-xlsx.test.js
  - test/igf-queretaro-taller-upload.test.js
  - docs/dev-loop/reports/IGF-TALLER-QUERETARO-CARGA.md
out_of_scope:
  - "Puebla, Acapulco, ventas, compras, HG, folios y exportación."
  - "Contratos, protocolo, credenciales y cambios en producción."
contracts_in_force:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
allowed_actions:
  - "Implementar y probar solo en feat/igf-taller-queretaro-carga. Preparar y probar migración aislada fuera de producción sin habilitar cuentas. Abrir PR borrador."
  - "Confirmar mes y año y previsualizar los cortes. Usar las pestañas como días; no usar TODAY() como corte. No importar padrón ni hojas ocultas como cortes. Conservar alertas por fechas y no completar huecos."
  - "Guardar cortes por fecha y contenido de la hoja sin duplicar; conservar revisiones cuando cambie el contenido. Probar con 12 cortes y 120 registros en la muestra original sin publicarla."
forbidden_actions:
  - "Aplicar la migración, conceder permisos o cargar archivos en producción."
  - "Modificar autorizaciones humanas, publicar archivos reales o secretos, cambiar main, fusionar o desplegar."
max_attempts: 1
result_report_path: docs/dev-loop/reports/IGF-TALLER-QUERETARO-CARGA.md
