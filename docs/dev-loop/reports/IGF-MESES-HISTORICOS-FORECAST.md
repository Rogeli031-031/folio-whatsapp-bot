# Recuperar meses vacios desde IGF Forecast

Solicitud directa: completar meses historicos vacios usando IGF Forecast y conservar la informacion que ya se muestra. Base: 1461b35a50b992eb74cd9c404d7bd85a97afdd63. Rama: fix/igf-meses-historicos-forecast.

- Solo vista mensual, meses anteriores al seleccionado y cerrados al corte, sin venta positiva, precio, ingreso ni resultado diario. Octubre y cualquier mes con detalle permanecen intactos.
- Consulta de solo lectura a la ultima version GLOBAL del mes en igf.versions y su igf.compromiso_lines. Respeta version_as_of_corte cuando aplica. Sin recalculos con presupuestos o folios actuales.
- Emparejamiento unico por planta autorizada. Una lectura por mes compartida dentro de la peticion; ninguna fila de otra planta se publica.
- Completa exclusivamente metricas ausentes: venta de toneladas a kilos, margen, C&D con signo de costo, corporativo (gtos/apoyos + bancos corp + otros programas), inversiones, impuestos, provisiones, HG y resultado historico. Conserva cifras existentes, incluidos ceros y HG de septiembre. El cero sintetico de venta de un mes sin detalle se reemplaza por la venta cargada.
- Muestra Gasto operativo, Bancos Planta y Utilidad de Operacion historicos en filas separadas. No asigna el gasto agregado a nomina/IMSS/extraordinarios. No inventa precio publico, costo, flete, ingreso de ventas ni subtotales diarios ausentes del IGF historico.
- Etiqueta version y campos recuperados con asterisco. No fabrica conteos de cobertura diaria a partir de un total mensual.

Validacion: consulta remota SELECT confirma versiones historicas de Puebla en julio, agosto y septiembre. 30/30 pruebas focales, incluyendo guardado de ceros/HG, preservacion de octubre, ausencia/ambiguedad de fuente, corte, cache por mes y consolidado. Compilacion frontend y TypeScript correctos. Prueba visual local con API simulada confirma etiquetas y filas historicas; ruta temporal retirada. diff --check correcto.

Sin merge, despliegue, migracion ni escritura de datos de produccion.
