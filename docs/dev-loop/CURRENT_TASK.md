task_id: "FIX-IGF-DIARIO-UNA-HOJA-POR-PLANTA-047"
title: "Dejar una sola hoja IGF Diario cuando el código y el nombre de la planta no se escriben igual"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-25T13:02:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-25"
prior_task_review: "La 045 ya está en main, en c055554c. La 046 no se integra: con código Queretaro y nombre Querétaro crea dos hojas IGF, la primera vacía. CURRENT_TASK de la 046 se equivoca al decir que la 045 no está en main."

objective: "Crear y llenar una sola hoja IGF Diario por planta, aunque el código no lleve acento y el nombre sí."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "4182e0a3fcf247555b04f08d6cb0edada59f3aac"
branch: "fix/igf-diario-una-hoja-por-planta-047"

in_scope:
  - "lib/igf-diario-puebla.js: si ya existe una hoja IGF Diario de la misma planta, escribir ahí; no crear otra por un acento"
  - "lib/dashboard-arr-forecast.js: reservar y llenar con el mismo nombre de hoja"
  - "test/igf-diario-una-hoja-por-planta-047.test.js"
  - "prueba 046: ajustar solo la aserción que choque con una sola hoja"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-UNA-HOJA-POR-PLANTA-047.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"
out_of_scope:
  - "cambiar el importe proyectado, COMPRA KG o el costo por kilo"
  - "cambiar el contenido de IGF Diario Puebla"
  - "frontend-dashboard/.next, base de datos, PR, merge y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "Queretaro y Querétaro son la misma planta. El libro queda con una sola hoja IGF Diario, en primer lugar, y esa hoja trae los datos."
  - "La reserva y el llenado no pueden inventar dos nombres. Si la hoja ya existe, se llena esa."
  - "Puebla sigue con una sola hoja IGF Diario Puebla. Los días posteriores al corte siguen en blanco."
  - "La 045 ya está en main. La 046 no se fusiona ni se despliega."

acceptance_criteria:
  - "Código Queretaro y nombre Querétaro: el archivo abre con una sola hoja IGF Diario. No existe una segunda. La primera trae la venta, el precio y los gastos de Querétaro. Con corte 2026-09-24, del 25 al 30 la columna A conserva la fecha y B:AF quedan vacías."
  - "Puebla sigue abriendo con IGF Diario Puebla, una sola hoja, con sus datos."
  - "El importe proyectado de CONTROL DE COMPRAS no cambia."

validation:
  - "Reproducir reserva con Queretaro y llenado con Querétaro, guardar y reabrir el XLSX."
  - "Ejecutar 047, 046, 045, 044, 043, 042, 041, 040, 039, 038, 037, 036, 030, 026, 024, 022, 021 y 020; git diff --check."

allowed_actions:
  - "crear la rama 047 desde base_sha en un árbol aislado"
  - "editar solo in_scope, probar, reportar, commit y push solo a la rama 047"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "usar git add .; tocar .next; abrir PR; fusionar o desplegar"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-UNA-HOJA-POR-PLANTA-047.md"