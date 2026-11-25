task_id: IGF-TALLER-TEHUACAN-CARGA
status: DONE_PENDING_REVIEW
authorized_by: HUMAN_APPROVER
authorized_at: "2026-11-24T23:25:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-11-24"
objective: "Habilitar la carga del Excel E8 original en IGF Forecast > IGF Diario acumulado > Tehuacán con fecha de corte confirmada e historial exclusivo."
in_scope:
  - docs/dev-loop/CURRENT_TASK.md
  - lib/igf-tehuacan-taller-xlsx.js
  - lib/igf-tehuacan-taller-upload.js
  - frontend-dashboard/components/IgfForecastClient.tsx
  - frontend-dashboard/components/IgfDiarioTallerUpload.tsx
  - frontend-dashboard/lib/api.ts
  - server.js
  - sql/20261125_igf_taller_diario_tehuacan.sql
  - test/igf-tehuacan-taller-xlsx.test.js
  - test/igf-tehuacan-taller-upload.test.js
  - docs/dev-loop/reports/IGF-TALLER-TEHUACAN-CARGA.md
out_of_scope:
  - "Otras plantas, ventas, compras, HG, folios y exportación."
  - "Contratos, protocolo, credenciales y producción."
contracts_in_force:
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
allowed_actions:
  - "Implementar, probar migración y carga en base aislada y abrir PR borrador solo desde feat/igf-taller-tehuacan-carga. No habilitar cuentas."
  - "Verificar origen E8, mostrar 6 unidades con la muestra privada, pedir fecha real y distinguir fecha estimada de salida efectiva. Conservar reparaciones, importes faltantes y avisos, sin sumar datos del padrón como otro corte. Guardar por revisión, sin duplicar."
forbidden_actions:
  - "Aplicar SQL, permisos o cargas en producción; fusionar o desplegar."
  - "Modificar campos humanos, publicar el Excel real, secretos o modificar main."
max_attempts: 1
result_report_path: docs/dev-loop/reports/IGF-TALLER-TEHUACAN-CARGA.md
