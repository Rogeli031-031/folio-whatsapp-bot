# Resumen semanal de compras, venta y HG en AL

Fecha: 2026-11-09. Base: `b34b222adf8838fe37d1635107d9c3079684f53b`.

## Solicitud y autorización

El usuario solicitó en este chat el resumen semanal en AL: HG porcentual sobre venta total, compras, mezcla Tuxpan/Tepeji, venta y diferencia compras menos venta con color según signo. Autorizó su publicación: «lo envias a produccion, aprobado». Se registra la autorización recibida por chat conforme a su preferencia explícita vigente. La tarea previa #179 ya está integrada; no se incorporan cambios ajenos.

## Cambio

- Las seis hojas de planta, en formato histórico y detallado, muestran HG semanal = suma de HG físico / venta total semanal. No se promedian porcentajes diarios ni se usa solo venta CASA.
- Compras y HG enlazan los días exactos de CONTROL DE COMPRAS. Tuxpan suma PEMEX TUXPAN y TOMZA TUXPAN; Tepeji usa TOMZA TEPEJI. El denominador incluye todas las compras. Se excluyen bloques duplicados de fletes y subtotales.
- AL de la fila semanal contiene el resumen. AL de la separación inmediatamente inferior contiene la diferencia numérica recalculable: rojo negativo, verde positivo, negro cero. Se reutilizan filas existentes sin insertar ni desplazar fórmulas.
- AO:AR son auxiliares ocultas de totales; AM/AN conservan sus banderas originales. Se preservan los resúmenes diarios y las fórmulas financieras.
- Semanas recortadas al mes, proyecciones y cobertura parcial se identifican. Una fuente completamente ausente no se convierte en cero; denominadores no positivos no producen porcentajes. La diferencia no se etiqueta como inventario físico.

## Validación

Ejecución conjunta de siete archivos de pruebas: **74 pruebas, 72 aprobadas, 2 fallos preexistentes**. Todas las pruebas nuevas y las regresiones de AL, HG, calendario, mezcla de proveedores y desglose de gastos pasan.

Los dos fallos de `forecast-excel-plant-compras-024.test.js` son verificaciones estáticas de nombres antiguos del archivo de descarga. Se reprodujeron en una extracción limpia de `HEAD` base (26 pruebas: 24 aprobadas y los mismos 2 fallos). No se modifican ni ese contrato de descarga ni esos tests.

Pruebas nuevas: doce combinaciones (seis plantas × septiembre/noviembre) con proveedores reordenados, proveedor adicional, ambos Tuxpan, bloques de flete, límites de mes, fórmulas y formato condicional conservados tras serializar y reabrir el XLSX.

Verificación independiente con el motor de hojas de cálculo `@oai/artifact-tool` sobre los XLSX generados: doce combinaciones recalculadas y contrastadas con sumas de datos sintéticos. Ejemplo solicitado: 15,585 HG kg / 177,136 venta kg = **8.80%**, compras **118,420 kg**, Tuxpan **100%**, Tepeji **0%**, diferencia **−58,716 kg**.

Al editar compras Tepeji +100,000 kg, el mismo archivo recalcula compras a 218,420 kg, reparto 54.22%/45.78% y diferencia +41,284 kg. Se verificaron también cero, compras ausentes, HG parcial, venta cero y proyección. Previsualizaciones revisadas: diferencia roja y verde, texto completo y legible. Son datos sintéticos de prueba, no nuevas capturas de producción.

`git diff --check` sin errores. No se cambian datos productivos, contratos, presupuestos, importaciones ni el resumen mensual. Publicación autorizada; comprobar el SHA desplegado y una descarga nueva después de integrar.
