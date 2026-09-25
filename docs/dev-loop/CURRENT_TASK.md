task_id: "FIX-COMPRAS-IMPORTE-POR-VENTA-IGF-PLANTA-046"
title: "Proyectar el importe con la venta y mostrar IGF Diario en cada planta"
status: "AUTHORIZED"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-25T11:52:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-25"
prior_task_review: "La 045 está en su rama y no está en main. Autorizo usarla como base. No autorizo integración ni despliegue."

objective: "Calcular el importe proyectado de CONTROL DE COMPRAS con el último costo real por kilo y la venta pronosticada del día, dejar en blanco los días posteriores al corte en IGF Diario, y generar esa primera hoja para la planta exportada."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "87d45cb1cc4b8644594b949ffef13c35bc2101ac"
branch: "fix/compras-importe-por-venta-igf-planta-046"

in_scope:
  - "lib/compras-excel.js: importe proyectado = último costo real por kilo × venta pronosticada del día"
  - "lib/igf-diario-puebla.js: hoja IGF Diario de la planta exportada, no solo Puebla; días posteriores al corte en blanco"
  - "lib/dashboard-arr-forecast.js y server.js: solo el enlace necesario para crear esa hoja y pasarle la venta pronosticada y los gastos de la planta"
  - "test/compras-importe-por-venta-igf-planta-046.test.js"
  - "pruebas 030, 036 y 045: ajustar solo aserciones incompatibles con este requisito"
  - "docs/dev-loop/reports/FIX-COMPRAS-IMPORTE-POR-VENTA-IGF-PLANTA-046.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"
out_of_scope:
  - "cambiar el promedio calendario de COMPRA KG, HG EN KILOS u otras hojas"
  - "llenar con ceros los días futuros de IGF Diario"
  - "frontend-dashboard/.next, base de datos, PR, merge y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "COMPRA KG proyectado sigue el promedio de días calendario anteriores al corte."
  - "COSTO KG proyectado muestra el último costo real por kilo del proveedor, importe real / kilos reales de la misma fecha anterior, sin redondeo intermedio."
  - "IMPORTE proyectado = ese costo × la venta pronosticada de esa fecha, la misma venta que ya escribe Provincia Venta Diaria. No se multiplica por los kilos proyectados de compra."
  - "Un importe real capturado prevalece. Sin costo real válido o sin venta pronosticada, el importe queda vacío."
  - "En IGF Diario, con corte 2026-09-24, el 24 conserva sus cálculos y del 25 al 30 la columna A conserva la fecha y B:AF quedan vacías, sin fórmulas."
  - "La primera hoja se genera para la planta exportada. Querétaro no puede descargar el libro sin esa hoja."

acceptance_criteria:
  - "PEMEX TUXPAN, corte 2026-09-24: el 23/09 conserva 19370 kg, costo 12.232 e importe 236938.17. El 25/09 y el 26/09 muestran COMPRA KG 38709.2 y COSTO KG 12.232. El importe del 25 es 473499.18 y el del 26 es 449819.00, porque la venta pronosticada de cada día es distinta."
  - "La misma regla aplica a cada proveedor y a la fecha de corte si a esa fecha le falta el importe real."
  - "IGF Diario Puebla, corte 2026-09-24: filas del 25 al 30 con fecha y B:AF vacías. Semana 4, semana 5 y TOTAL MES no suman esas filas. M3 y T3 de Puebla se conservan."
  - "La descarga de Querétaro abre con la hoja IGF Diario de Querétaro en primer lugar, usando su venta, precio, compras y gastos. Puebla conserva la suya."

validation:
  - "Probar el 25 y el 26 con ventas distintas y el mismo costo 12.232."
  - "Guardar y reabrir un XLSX de Puebla y otro de Querétaro."
  - "Ejecutar 046, 045, 044, 043, 042, 041, 040, 039, 038, 037, 036, 030, 026, 024, 022, 021 y 020; git diff --check."

allowed_actions:
  - "crear la rama 046 desde base_sha en un árbol aislado"
  - "editar solo in_scope, probar, reportar, commit y push solo a la rama 046"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "usar git add .; tocar .next; abrir PR; fusionar o desplegar"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-IMPORTE-POR-VENTA-IGF-PLANTA-046.md"