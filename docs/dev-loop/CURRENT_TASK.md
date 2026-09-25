task_id: "FIX-COMPRAS-IMPORTE-VENTA-IGF-POR-PLANTA-048"
title: "Reconstruir sobre main el importe por venta y el IGF Diario de la planta exportada"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-25T13:32:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-25"
prior_task_review: "main está en d64d98fab41bed67f7c3fccc7de95fa3b72ba80a e incluye la 045 y la 047 por squash. La 046, 4182e0a3, queda descartada como rama de integración. Esta 048 reconstruye la funcionalidad sobre main, sin cherry-pick."

objective: "Calcular el importe proyectado de CONTROL DE COMPRAS con el último costo real por kilo y la venta pronosticada del día, y generar una sola hoja IGF Diario de la planta exportada, con su venta, precio, compras y gastos."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "d64d98fab41bed67f7c3fccc7de95fa3b72ba80a"
branch: "fix/compras-importe-venta-igf-por-planta-048"

in_scope:
  - "lib/compras-excel.js: importe proyectado = último costo real por kilo × venta pronosticada del día"
  - "lib/igf-diario-puebla.js: hoja, nombre visible, canales, precio, compras, gastos y corte de la planta exportada, reutilizando la identidad de hoja de la 047"
  - "lib/dashboard-arr-forecast.js y server.js: reservar esa hoja primero y pasarle la venta y los gastos de la planta exportada"
  - "test/compras-importe-venta-igf-por-planta-048.test.js"
  - "pruebas existentes: ajustar solo aserciones que choquen de forma legítima con este contrato, y documentarlo"
  - "docs/dev-loop/reports/FIX-COMPRAS-IMPORTE-VENTA-IGF-POR-PLANTA-048.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"
out_of_scope:
  - "cherry-pick o ancestro de la 046"
  - "cambiar el promedio calendario de COMPRA KG o HG EN KILOS"
  - "frontend-dashboard/.next, base de datos, Director IA conversacional, UI, PR, merge y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "COMPRA KG proyectado sigue el promedio calendario. COSTO KG proyectado es el último costo real por kilo. IMPORTE proyectado es ese costo por la venta pronosticada del día, en kilos. No se multiplica por los kilos de compra."
  - "Un importe real prevalece. Sin costo real válido o sin venta pronosticada, el importe queda vacío. Una compra real completa del corte actualiza el costo de los días siguientes. Un importe proyectado no es antecedente real."
  - "La hoja se reserva con el código técnico y se reutiliza si el nombre solo cambia por acento o mayúsculas, con la primitiva de la 047. El encabezado visible usa el nombre humano. Querétaro abre con una sola hoja IGF Diario Queretaro y PLANTA QUERÉTARO."
  - "Los canales CASA y COMISIONISTA, el precio, las compras y los gastos son los de la planta exportada. Sin planta, no se crea IGF Diario."
  - "Con corte 2026-09-24, el 24 conserva sus cálculos y del 25 al 30 la columna A conserva la fecha y B:AF quedan vacías. Semana y TOTAL MES no suman esas filas."

acceptance_criteria:
  - "PEMEX TUXPAN, corte 2026-09-24: el 23/09 conserva 19370 kg e importe 236938.17. El 25/09 y el 26/09 conservan la misma COMPRA KG y el mismo costo 236938.17/19370. Sus importes difieren porque la venta de cada día es distinta. El 25 se muestra como 473499.18 cuando su venta es el promedio de kilos; el 26 como 449819.00 cuando su venta es 449819 dividido entre ese costo."
  - "Puebla: una sola IGF Diario Puebla, primera hoja, PLANTA PUEBLA, con su venta, precio, compras y gastos. Del 25 al 30, B:AF vacías."
  - "Código Queretaro y nombre Querétaro: una sola hoja IGF Diario Queretaro, primera, sin una segunda pestaña acentuada. Encabezado PLANTA QUERÉTARO. Venta, precio y gastos de Querétaro. Futuros vacíos. Igual después de reabrir."
  - "Otra planta distinta, Acapulco o Tehuacán, genera su propia hoja y no la de Puebla ni la de Querétaro."
  - "Sin plantCode no aparece IGF Diario."
  - "4182e0a3 no es ancestro de la rama."

validation:
  - "Probar importe, Puebla, Querétaro/Queretaro, otra planta y el libro sin planta. Guardar y reabrir."
  - "Ejecutar 048, las pruebas de Compras 020 a 030 que existan en main y las de IGF Diario Puebla 036 a 047 que existan en main; git diff --check; git diff d64d98fa; comprobar que 4182e0a3 no es ancestro."

allowed_actions:
  - "crear la rama 048 desde base_sha en un árbol aislado"
  - "editar solo in_scope, probar, reportar, commit y push solo a la rama 048"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "cherry-pick de la 046; usar git add .; tocar .next; abrir PR; fusionar o desplegar"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-IMPORTE-VENTA-IGF-POR-PLANTA-048.md"