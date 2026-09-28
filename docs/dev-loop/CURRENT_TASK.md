task_id: "FIX-IGF-CORTE-PROYECCION-COMPRAS-IMPORTE-049"
title: "Proyectar los huecos hasta el corte y calcular el importe de compras con sus propios kilos"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-27T20:54:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-27"
prior_task_review: "main está en 982fe9a15175d467d7312faa29e04c34471ed48d. La 048 queda sustituida en el importe de compras: ya no se multiplica por la venta pronosticada."

objective: "Hasta la fecha seleccionada, IGF Diario y la venta de la planta usan el dato real si existe y la proyección si falta. Después de esa fecha, IGF Diario deja B:AF vacías. El importe proyectado de cada proveedor es sus kilos por su costo."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "982fe9a15175d467d7312faa29e04c34471ed48d"
branch: "fix/igf-corte-proyeccion-compras-importe-049"

in_scope:
  - "lib/dashboard-arr-forecast.js: hojaA, writeProvinciaCanalColumns y writeCanalPairCells proyectan el día solo cuando falta el dato real, usando el pronóstico que ya existe"
  - "lib/compras-excel.js: importe proyectado = COMPRA KG × COSTO KG del mismo proveedor, con fórmula Excel en la fila proyectada"
  - "lib/igf-diario-puebla.js: solo si hace falta conservar que el día de corte puede tener datos y los días posteriores quedan vacíos"
  - "test/igf-corte-proyeccion-compras-importe-049.test.js"
  - "prueba 048: actualizar solo las aserciones del importe por venta, y documentarlo"
  - "docs/dev-loop/reports/FIX-IGF-CORTE-PROYECCION-COMPRAS-IMPORTE-049.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"
out_of_scope:
  - "identidad Querétaro/Queretaro, nombres de hoja, gastos por planta, permisos, Director IA, base de datos y otros módulos del dashboard"
  - "un segundo motor de pronóstico o un parámetro nuevo de fecha"
  - "frontend-dashboard/.next, PR, merge y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "La fecha seleccionada es el último día que IGF Diario puede mostrar. Un día posterior deja la fecha en A y B:AF vacías, sin fórmulas. Semana y TOTAL MES no suman esos días."
  - "En un día hasta el corte, el dato real capturado prevalece, incluido un cero real. Si no hay registro, se usa el pronóstico del día de semana: promVentaTotal, promVentaCasa y promVentaComisionista."
  - "En compras, una fecha anterior al corte conserva la captura. Desde el corte, COMPRA KG sigue el promedio calendario y COSTO KG el último costo real. IMPORTE = kilos × costo de ese proveedor: D=B×C, H=F×G, L=J×K. El consolidado suma esos proveedores. No se usa la venta de la planta."
  - "Sin costo real o sin kilos, el importe queda vacío. Un importe real capturado prevalece."

acceptance_criteria:
  - "Corte 2026-09-27 y último real el 25: Acapulco y Tehuacán muestran el 25 real, el 26 y el 27 proyectados, y del 28 al 30 solo la fecha. CASA y COMISIONISTA siguen la misma regla. Al reabrir el XLSX se conserva."
  - "Corte 2026-09-25: del 26 al 30, B:AF vacías."
  - "Compras, corte 2026-09-25: una fila proyectada tiene D=B*C, H=F*G y L=J*K, cada proveedor con su propio importe. El histórico no cambia. El corte proyecta si no hay captura. Un real prevalece. Sin costo, costo e importe vacíos. El consolidado suma B+F+J y D+H+L."

validation:
  - "Probar Acapulco y Tehuacán con corte 27 y corte 25. Guardar y reabrir."
  - "Probar la fila proyectada de compras y el consolidado. Guardar y reabrir."
  - "Ejecutar 049, 048, 047, 045, 044 a 036, 030, 026, 024, 022, 021 y 020; git diff --check."

allowed_actions:
  - "crear la rama 049 desde base_sha en un árbol aislado"
  - "editar solo in_scope, probar, reportar, commit y push solo a la rama 049"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "reutilizar una rama antigua; usar git add .; tocar .next; abrir PR; fusionar o desplegar"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-CORTE-PROYECCION-COMPRAS-IMPORTE-049.md"