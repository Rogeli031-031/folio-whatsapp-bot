# Descuento mensual de ARR en Plan al cierre

task_id: FIX-IGF-PLAN-DESCUENTO-TABLERO
product_sha: 320e5322c78f36c3925dcfe1aa9a133c7fcc5423
outcome: DONE_PENDING_REVIEW

El cálculo ARR usa la columna mensual del tablero. En los meses con el desglose de IGF Diario, ARR presenta el mismo descuento de la planta que el mini IGF Diario. En los meses anteriores se consulta el descuento de la fila Forecast y su proyección para el mes abierto. Se conserva toda la precisión y se aplica el descuento una vez.

La selección del plan y la columna C de la comparación en Excel muestran el signo del tablero. La hoja Categorías identifica el ponderado por cliente. Los puntos anteriores guardados con ese ponderado lo indican en su tarjeta. Al abrirlos, la vista previa aplica la base corregida. El usuario puede guardar el resultado en el mismo punto. Al importar un libro anterior se recuperan los compradores, las metas y el HG con la tasa del tablero.

Pasaron 80 pruebas de regresión y la compilación de producción. En Edge con PostgreSQL temporal se verificaron las seis plantas y dos cortes consecutivos. En los 12 escenarios se cambiaron las dos opciones, se contrastaron la utilidad de la pantalla, la del marcador 3D y la del Excel, y se verificó el guardado, la reapertura y la importación. Se probaron también una tasa cero, un dato faltante, la transición de un punto de formato anterior y una edición con una referencia vencida.

La publicación después de las pruebas fue autorizada en el chat. La verificación productiva es de lectura.
