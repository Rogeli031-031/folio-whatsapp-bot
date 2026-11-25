task_id: IGF-TALLER-XLSX-VALORES
status: DONE_PENDING_REVIEW
objective: "Aceptar los Excel originales de Uribe e HidroGas leyendo los resultados guardados de las fórmulas en campos permitidos, sin ejecutarlas ni relajar la validación de empresa, fecha o unidad."
repository: Rogeli031-031/folio-whatsapp-bot
branch: fix/igf-taller-xlsx-valores

in_scope:
  - "lib/igf-acapulco-taller-xlsx.js"
  - "test/igf-acapulco-taller-xlsx.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IGF-TALLER-XLSX-VALORES.md"
out_of_scope:
  - "Cambios a la base, permisos, contratos o despliegue"
  - "Escrituras o merge a main"
  - "Subir el Excel real o sus datos a GitHub"
contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
allowed_actions:
  - "Implementar"
  - "Probar fuera de producción (incluye prueba local del Excel real)"
  - "Abrir un PR (commit y push solo a la rama indicada)"
forbidden_actions:
  - "No autoaprobar gates, no exponer datos y no tocar rutas fuera de alcance."
max_attempts: 1
result_report_path: docs/dev-loop/reports/IGF-TALLER-XLSX-VALORES.md
owner_chat_attestation:
  method: verified_owner_chat
  approved_at: "2026-11-25T02:06:06.295253+00:00"
  receipt_id: "0dbd40a3-bebe-4432-95f8-db12f0102d0f"
  scope_sha256: "e7f3f8d9cc94d2259f2214965ce1d0cb790d220b206852136c87ccfe837d66b9"
