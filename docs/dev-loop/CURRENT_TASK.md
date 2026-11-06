# HG editable en Plan al cierre
task_id: "IMPL-IGF-PLAN-AL-CIERRE-HG"
status: AUTHORIZED
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-11-06T13:13:31-06:00"
human_authorization: "Sí, autorizo el HG editable"
authorization_channel: "Respuesta explícita del responsable en el chat IA en Tomza para registrar esta tarea."
base_sha: "5bf53e7ef815e9a79cb179ec5c3ed57f3b6f2fcf"
branch: "feat/igf-plan-al-cierre-hg"
objective: "Editar HG como porcentaje de la venta mensual del escenario en Plan al cierre y conservarlo en su punto y su Excel para las seis plantas."
in_scope:
  - "frontend-dashboard/components/IgfPlanAlCierre.tsx, frontend-dashboard/lib/igf-plan-al-cierre.js y sus consumidores directos del simulador"
  - "lib/igf-plan-al-cierre.js, lib/igf-plan-al-cierre-excel.js y pruebas específicas del plan y del simulador"
  - "docs/dev-loop/CURRENT_TASK.md y docs/dev-loop/reports/IMPL-IGF-PLAN-AL-CIERRE-HG.md"
out_of_scope:
  - "Cambios de HG en los datos reales, presupuestos, compras, DICF o propuestas productivas; migraciones de datos; modificaciones al protocolo."
contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
allowed_actions:
  - "Implementar, probar, registrar el reporte, subir la rama de esta ficha y abrir la solicitud de integración para revisión humana."
forbidden_actions:
  - "Fusionar a main, escribir datos productivos, sustituir evidencia faltante por cero, o cambiar el resultado base para simular el nuevo HG."
acceptance:
  - "Abrir con HG del corte o HG del punto guardado. Aceptar cero y valores negativos dentro de los límites del simulador y explicar si falta la valoración de HG."
  - "Mostrar kilos generados e impacto del HG en pesos, calculados sobre la venta total del plan. Actualizar el resultado IGF sin alterar la ganancia comercial por comprador."
  - "Mantener el mismo punto al editar, su corte y base originales, y hacer coincidir la gráfica y el Excel con el resultado del plan."
  - "Mantener la compatibilidad con puntos y archivos anteriores. Probar edición, reapertura, exportación, recuperación del Excel y ausencia de doble conteo."
max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-PLAN-AL-CIERRE-HG.md"
