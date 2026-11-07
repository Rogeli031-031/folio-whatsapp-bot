# IGF Diario · Resumen de compras, venta y HG en AL
task_id: IMPL-IGF-DIARIO-RESUMEN-COMPRAS-HG-AL
status: DONE_PENDING_REVIEW
authorized_by: HUMAN_APPROVER
authorized_at: 2026-11-07T11:31:40-06:00
human_authorization: "Sí, implementar y publicar"
authorization_channel: "Respuesta explícita en este chat a registrar la nueva tarea y publicarla para las seis plantas tras probarla. Registro de recepción de la autorización."
human_percentage_choice: "Venta total — 3.16 %"
base_sha: 4d684a5f006b0b2cd07af18bffd44746740cfe2c
branch: feat/igf-diario-resumen-compras-hg
objective: "Agregar en AL del Excel IGF Diario de cada planta el resumen diario de compras, venta total, saldo compras menos ventas y HG registrado en kg y porcentaje de venta total."
in_scope: "Exportador IGF Diario de las seis plantas, lectura de columnas de compras por encabezado y fecha, desplazamiento de auxiliares que ocupan AL, pruebas y verificación de descarga."
out_of_scope: "Cambiar datos productivos, fórmulas financieras existentes, inferir inventario medido, sumar HG al saldo compras menos ventas, modificar contratos o Plan al cierre."
contracts_in_force: "Constitución, índice de arquitectura y LOOP_PROTOCOL consultados. La autorización expresa del usuario permite registrar su respuesta y ejecutar la publicación."
allowed_actions: "Registrar autorización, implementar, probar, commit, push de rama, crear PR, Squash and merge y verificar despliegue y Excel."
forbidden_actions: "Mezclar cambios ajenos, publicar secretos, reemplazar faltantes por cero o atribuir causalidad al HG."
acceptance: "Tehuacán 06/11/2026 compras 23670 kg, venta 12259.60 kg, saldo 11410.40 kg y HG 388 kg sobre venta total 3.16 %. Preservar ceros explícitos y diferenciar faltantes. Marcar proyecciones. Comprobar seis plantas, fechas, fórmula, auxiliares y archivo exportado."
result_report_path: docs/dev-loop/reports/IMPL-IGF-DIARIO-RESUMEN-COMPRAS-HG-AL.md
max_attempts: 1
