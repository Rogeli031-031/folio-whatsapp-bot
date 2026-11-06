# Plan al cierre · Base ARR y selección en Categorías

task_id: FIX-IGF-PLAN-CATEGORIAS-SELECCION
outcome: DONE
product_sha: a4467a1209b8010455ba146d2376929bb43bc923

El exportador anterior anulaba todo el subtotal de descuentos de una subcategoría si alguna de sus cuentas DICF tenía un descuento incompleto. La pantalla Categorías del mes emplea la mezcla ARR de la planta. La pantalla y la hoja ahora llaman a la misma función con la misma venta base y el mismo corte. Una tasa conocida de cero conserva su valor y un dato desconocido queda marcado como pendiente.

La hoja muestra la referencia ARR, el cierre por categoría y, debajo, una línea por comprador seleccionado. La variación neta de kilos y descuentos descuenta la referencia DICF de cada cuenta antes de sumar la propuesta. Las tasas de los subtotales se ponderan por los kilos de su periodo. La hoja IGF conserva su propia base financiera.

## Verificación

- Pasaron 53 pruebas del plan y el simulador. Incluyen transferencias entre cuentas del mismo comprador, descuento explícito cero, cobertura pendiente, selección vacía, exportación y recuperación del HG.
- Se abrió y descargó el plan en una base temporal para las seis plantas en dos cortes. En los doce casos se verificaron el volumen de la base, el cierre, la presencia exclusiva de los compradores elegidos en el detalle y el total comercial de la selección.
- Se verificó en privado el archivo de referencia del usuario contra datos ARR agregados del mismo corte. Se reprodujo el descuento de CASA de la pantalla y se conciliaron la venta adicional y el cambio comercial del pie con el plan.

## Alcance y decisión

- Se modificaron el servicio de categorías del simulador, el servicio y exportador de Plan al cierre, sus pruebas, la ficha y el reporte. Se añadieron la referencia ARR compartida y la composición de la hoja Categorías.
- Fuera de alcance: presupuestos y puntos de producción, datos de compradores y cálculo del resultado financiero IGF.
- Contratos consultados: Constitución de Director IA, índice de arquitectura y protocolo de desarrollo supervisado. Contratos modificados: ninguno.
- Contradicciones y desvíos: ninguno.
- secrets_check: el diff contiene código, pruebas sintéticas y documentación. El Excel privado y los datos de producción quedaron fuera de Git.
- human_decision_needed: integración de la solicitud a producción.
- next_task_proposed: ninguna.
