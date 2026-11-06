# Plan al cierre · Descuento mensual del tablero ARR
task_id: FIX-IGF-PLAN-DESCUENTO-TABLERO
status: IN_PROGRESS
authorized_by: HUMAN_APPROVER
human_authorization: "Sí, corrígelo y publícalo"
authorization_channel: "Chat IA en Tomza, 2026-11-06 (hora de México)"
branch: fix/igf-plan-descuento-tablero
base_sha: 38b2cff9e862966adf950fa0ceab033d3b78e12d
objective: "Usar el descuento mensual del tablero ARR para la simulación, con los kilos y propuestas del IGF al mismo corte."
in_scope: "Las seis plantas. Pantalla, gráfica, puntos, Excel y compatibilidad de los escenarios anteriores; el ponderado por cliente se identifica en el desglose."
out_of_scope: "Actualizar datos financieros oficiales o sobrescribir propuestas de usuarios en producción."
contracts_in_force: "Constitución, índice de arquitectura y protocolo del desarrollo supervisado."
allowed_actions: "Implementar, probar, publicar la rama, crear PR, integrar con squash tras validar y verificar el despliegue."
forbidden_actions: "Fijar la tasa del ejemplo, redondear antes de calcular o modificar datos en producción durante las pruebas."
acceptance: "Paridad con la columna mensual en las seis plantas; un mismo corte y fuente produce igual utilidad en el simulador, la gráfica y el Excel."
result_report_path: docs/dev-loop/reports/FIX-IGF-PLAN-DESCUENTO-TABLERO.md
max_attempts: 1
