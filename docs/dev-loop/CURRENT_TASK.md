# Compras · Reconocer PEMEX TEPEJI en la columna existente
task_id: FIX-COMPRAS-PEMEX-TEPEJI-ALIAS
status: DONE_PENDING_REVIEW
authorized_by: HUMAN_APPROVER
authorized_at: 2026-11-09T14:09:33-06:00
human_authorization: "Usar la columna actual de TEPEJI"
authorization_channel: "Respuesta explícita en este chat a la clasificación de las compras PEMEX TEPEJI reportadas. Fecha de registro de recepción."
base_sha: c98af2c07e433a13c78674322060b9581a544344
branch: fix/compras-pemex-tepeji-alias
objective: "Reconocer el origen PEMEX TEPEJI del Excel de compras como el proveedor canónico TOMZA TEPEJI."
in_scope: "Alias exacto en lib/compras-dashboard.js, pruebas de conciliación y registro de validación."
out_of_scope: "Cambiar HG, aplicar compras en producción, crear un proveedor distinto, modificar contratos o incorporar otros cambios."
contracts_in_force: "Constitución, índice de arquitectura y LOOP_PROTOCOL. La decisión del usuario se registra por chat conforme a su preferencia vigente."
allowed_actions: "Registrar la decisión, implementar, probar, commit, push de rama y preparar PR para revisión."
forbidden_actions: "Mezclar cambios ajenos, publicar archivos privados, aplicar conciliaciones productivas o integrar/desplegar sin autorización de publicación de esta corrección."
acceptance: "Reconoce el alias en seis plantas; reutiliza TOMZA TEPEJI; conserva facturas, HG y separación URIBE/HIDROGAS; rechaza nombres desconocidos; prueba el archivo reportado solo en lectura."
result_report_path: docs/dev-loop/reports/FIX-COMPRAS-PEMEX-TEPEJI-ALIAS.md
max_attempts: 1
