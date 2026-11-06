# Conciliación del pronóstico en Categorías

task_id: FIX-IGF-CATEGORIAS-TOTAL-PRONOSTICO

product_sha: cce8848dd68ae0dea35bd7273acfb0cf464a46ee

Las filas TOTAL SIN PLAN y TOTAL DEL PLAN toman los kilos, descuentos en pesos y tasas del mismo escenario que la hoja IGF. El subtotal por clientes conserva el desglose original. La diferencia respecto al pronóstico se muestra en una fila de conciliación separada. Cuando el importe del desglose está incompleto, el ajuste queda pendiente y se presenta el total financiero conocido.

Pasaron 81 pruebas específicas. En Edge y con PostgreSQL temporal se descargaron y revisaron libros de seis plantas para dos cortes, con cero compradores y con selección. En las 24 exportaciones los kilos, importe y tasa coincidieron entre Categorías e IGF. Con cero compradores también coincidieron el total inicial y el de cierre. Se comprobó la reapertura e importación del escenario seleccionado.

Alcance del producto limitado a la generación del libro. Se verificaron el conjunto de archivos y la ausencia de datos privados en el cambio. La integración y verificación en producción continúan la corrección autorizada por el responsable.
