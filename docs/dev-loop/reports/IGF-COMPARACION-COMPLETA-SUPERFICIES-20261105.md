# Comparación completa y superficies por escenario

Solicitud directa del usuario tras aprobar el concepto visual: comparar todas las variables, abrir siempre en Vista 3D con giro activo, incluir Vista superior y eliminar Vista inicial. Continuación del flujo de integración/publicación autorizado. Sin cambios a CURRENT_TASK, aprobaciones o contratos.

Base 0449216106bca4ba54f4ad6e48e5fe6eb9bb1809. Rama feat/igf-superficies-comparacion-completa.

- Apertura en Vista 3D con arrastre activo. Vista superior proyecta venta/descuento y curvas de resultado cero, sin altura ni superficies rellenas. Vista inicial y el interruptor de giro se retiran; zoom por arrastre central permanece.
- Se muestran simultáneamente la superficie Actual y las de propuestas seleccionadas, cada una calculada con su propia contribución efectiva y gasto fijo guardados. Un escenario en edición con otra base recibe su propia superficie. Curvas y puntos de equilibrio se calculan por escenario. Controles para ocultar superficies, ver curvas y ajustar opacidad.
- Escala común incluye extremos de todas las superficies y sus equilibrios; se ordenan celdas por profundidad. La malla ajusta su resolución según el número de superficies.
- Comparación completa abre tabla con venta, descuento unitario/total, HG porcentual/kilos/valoración/importe, margen bruto, contribución efectiva, operativos, corporativos, gasto, impuestos fijos, contribución y resultado. Incluye diferencias contra Actual, corte, fuente, comentarios y equilibrios manteniendo venta o descuento, además del equilibrio cercano normalizado.
- Se conserva un desglose financiero de referencia en propuestas nuevas mediante financials en el JSONB existente, con validación y lista de campos permitidos. En propuestas antiguas no se sustituye el desglose ausente por datos del corte actual: se muestra No registrado. Sus modelos y resultados originales permanecen calculables con a/fixed.
- No se recalculan impuestos con otra regla: siguen fijos como en el simulador existente. La comparación no supone igualdad entre variables ni atribuye toda la diferencia al HG.

Validación: 39 pruebas relacionadas aprobadas. Incluye giro activo por defecto, alternancia de vista superior/3D, superficies y curvas diferentes ante cambios de contribución y gasto fijo, ocultado independiente, estabilidad de escenarios, tabla completa con faltantes históricos y validación del desglose persistido. Compilación de producción/TypeScript y comprobaciones de diferencias.
