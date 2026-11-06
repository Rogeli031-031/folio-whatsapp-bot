# Categorías y compradores seleccionados en la descarga del plan
task_id: "FIX-IGF-PLAN-CATEGORIAS-SELECCION"
status: IN_PROGRESS
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-11-06T13:41:03-06:00"
human_authorization: "Sí, autorizo la corrección"
authorization_channel: "Respuesta explícita en el chat de IA en Tomza sobre la base de Categorías y los compradores marcados."
base_sha: "e482faacdda08c56756bde4cb0a006ab02249fa8"
branch: "fix/igf-plan-categorias-seleccion"
objective: "Exportar en Categorías la base de ventas y descuentos que usa el tablero y debajo el plan con los compradores escogidos y sus totales en las seis plantas."
in_scope:
  - "lib/igf-simulation-routes.js, lib/igf-plan-al-cierre*.js y ayudantes compartidos del resumen ARR."
  - "Pruebas de categorías, exportación y reapertura del plan; ficha y reporte de la tarea."
out_of_scope:
  - "Reescribir DICF/ARR, cambiar el resultado IGF, modificar datos o selecciones de producción."
contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
allowed_actions:
  - "Implementar en rama, validar con el Excel y datos sintéticos, subir la rama y abrir una solicitud de integración."
forbidden_actions:
  - "Fusionar a main, atribuir descuentos desconocidos a cuentas sin evidencia o divulgar datos reales de clientes en el repositorio."
acceptance:
  - "Base ARR idéntica al tablero para la planta, mes, corte y volumen base. Tratar explícitamente ceros, ausencia de datos y subtotales ponderados por kg."
  - "Debajo de la base, identificar solo a los compradores seleccionados, meta y venta adicional, descuentos y variación comercial con totales. Diferenciar cartera, selección e IGF y evitar duplicar el cierre de referencia."
  - "Exportar también puntos anteriores; conservar edición, reimportación, HG, las hojas de cartera y el control de acceso."
max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-PLAN-CATEGORIAS-SELECCION.md"
