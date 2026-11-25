task_id: IGF-TALLER-PUEBLA-CARGA
status: AUTHORIZED
authorized_by: HUMAN_APPROVER
authorized_at: "2026-11-24T23:25:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-11-24"
objective: "Habilitar Reporte diario de taller en IGF Forecast > IGF Diario acumulado > Puebla, con vista previa del Excel original y guardado en un historial exclusivo de Puebla."
in_scope:
  - docs/dev-loop/CURRENT_TASK.md
  - lib/igf-puebla-taller-xlsx.js
  - lib/igf-puebla-taller-upload.js
  - frontend-dashboard/components/IgfForecastClient.tsx
  - frontend-dashboard/components/IgfDiarioTallerUpload.tsx
  - frontend-dashboard/lib/api.ts
  - server.js
  - sql/20261125_igf_taller_diario_puebla.sql
  - test/igf-puebla-taller-xlsx.test.js
  - test/igf-puebla-taller-upload.test.js
  - docs/dev-loop/reports/IGF-TALLER-PUEBLA-CARGA.md
out_of_scope:
  - "Acapulco, ventas, compras, HG, folios y exportación de productividad."
  - "Contratos, protocolo, credenciales y cambios en producción."
contracts_in_force:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
allowed_actions:
  - "Implementar y probar solo en feat/igf-taller-puebla-carga. Preparar y probar la migración fuera de producción, con permisos separados para Puebla sin habilitar cuentas automáticamente. Abrir PR borrador."
  - "Mostrar fecha a confirmar, 6 registros de 5 unidades con la muestra, ambas reparaciones T-16 y avisos por fechas faltantes o contradictorias. Guardar por revisión, sin duplicar una carga idéntica."
forbidden_actions:
  - "Aplicar la migración, conceder permisos o cargar archivos en producción con esta autorización."
  - "Modificar autorizaciones humanas, publicar archivos reales o secretos, cambiar main, fusionar o desplegar."
max_attempts: 1
result_report_path: docs/dev-loop/reports/IGF-TALLER-PUEBLA-CARGA.md
