# Plan al cierre · Selección del descuento base

task_id: IMPL-IGF-PLAN-BASE-DESCUENTO
outcome: DONE_PENDING_REVIEW
product_sha: f231d6b7c0cebc08bcbeacbba4e94a5c98d4249a
base_sha: 88b3a9a78b0e3e836d26057a665dbfa0e5b7397b

Las dos utilidades se calculan con la misma venta de planta y las mismas modificaciones por comprador. El descuento en pesos del escenario es la tasa base elegida multiplicada por los kilos originales, más el cambio de descuento de los compradores seleccionados. La gráfica usa ese importe dividido por los kilos finales. El HG y los gastos corresponden al mismo escenario en ambos casos.

La referencia ARR usa los importes de Categorías del mes para el volumen común. Cuando falta una tasa o cobertura, se indica en el selector. Desde Forecast también se conserva la fuente de los planes anteriores. Guardar un punto conserva las tasas del corte y la elección para las siguientes aperturas. El libro indica la fuente en IGF y contrasta ambas utilidades en Comparación de descuentos.

## Verificación

- 64 pruebas específicas aprobadas. Cubren la tasa cero, la tasa ausente, una referencia que cambia entre apertura y guardado, el cálculo ponderado de Diario desde Forecast y la lectura de libros y puntos del formato anterior.
- Se completaron la validación de tipos y la compilación de producción del tablero.
- En Edge y PostgreSQL temporal se comprobó el flujo para las seis plantas y dos cortes consecutivos. Se seleccionó un comprador, se editó HG, se alternó la fuente y se contrastaron kilos, utilidad del editor, marcador 3D y Excel. En los 12 casos se recuperó el libro y se volvió a guardar el mismo punto con la otra fuente.
- Se reprodujeron las dos utilidades de un plan existente usando su Excel en lectura y el cálculo de la gráfica. El archivo, las cifras privadas y los datos de compradores quedan fuera del repositorio.
- En la batería ampliada de IGF pasaron 467 de 474 pruebas en la primera ejecución. Se reprodujeron en la base anterior seis fallos de pruebas históricas en 025, 050, 053A, 070 y 078-R2. La prueba de PDF 084 aprobó al poder iniciar Chrome. Se excluyeron los archivos de evidencia que regeneran esas pruebas.

Alcance revisado contra la Constitución de Director IA, el índice de arquitectura, el protocolo de desarrollo y la ficha vigente. La decisión pendiente es la integración por el responsable. Los datos productivos se utilizaron únicamente en lectura.
