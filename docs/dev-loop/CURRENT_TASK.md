# IGF Diario · Resumen semanal de compras, venta y HG en AL
task_id: IMPL-IGF-DIARIO-AL-RESUMEN-SEMANAL
status: DONE_PENDING_REVIEW
authorized_by: HUMAN_APPROVER
authorized_at: 2026-11-09T14:58:02-06:00
human_authorization: "en la columna AL en el resumen de cada semana, quiero que pongas el % HG generado"
authorization_channel: "Solicitud directa de este chat, registrada conforme a la preferencia vigente del usuario de autorizar aquí."
base_sha: b34b222adf8838fe37d1635107d9c3079684f53b
branch: feat/igf-diario-al-resumen-semanal
objective: "Mostrar en AL el HG porcentual semanal, HG en kg, compras, mezcla Tuxpan/Tepeji, venta total y diferencia compras menos venta."
in_scope: "Generador Excel IGF Diario de las seis plantas (ambos formatos), módulo AL, pruebas de regresión y reporte."
out_of_scope: "Datos productivos, resumen mensual, fórmulas financieras existentes, contratos, importación de compras y cambios ajenos."
contracts_in_force: "Constitución, índice de arquitectura y LOOP_PROTOCOL, sin modificación."
allowed_actions: "Registrar solicitud, implementar, probar, commit, push de rama, crear PR, Squash and merge y verificar producción."
publication_authorization: "lo envias a produccion, aprobado"
publication_authorization_channel: "Autorización explícita del usuario en este chat para este resumen semanal."
forbidden_actions: "Mezclar cambios ajenos o publicar archivos privados."
acceptance: "HG semanal = suma HG kg / suma venta total kg; mezcla de compras ponderada por kg; Tuxpan suma Pemex y Tomza; diferencia negativa roja, positiva verde y cero neutro; fórmulas recalculables, faltantes y proyecciones identificados; resumen diario conservado."
result_report_path: docs/dev-loop/reports/IMPL-IGF-DIARIO-AL-RESUMEN-SEMANAL.md
max_attempts: 1
