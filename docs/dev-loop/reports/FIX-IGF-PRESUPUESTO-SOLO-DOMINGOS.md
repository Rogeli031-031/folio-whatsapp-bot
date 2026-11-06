# Presupuesto IGF · Gastos de lunes a sábado

task_id: FIX-IGF-PRESUPUESTO-SOLO-DOMINGOS
outcome: DONE
product_sha: 34add2cb830322ffc558bbffb911947c775bb972

El importador y los lectores del presupuesto detallado usan domingo como único día de gasto obligatoriamente cero. Las asignaciones anteriores que ya cubrían el monto mensual se respetan al reemplazar parte del mes. El calendario histórico sigue aplicando al formato anterior a octubre de 2026.

## Evidencia

- Se reprodujo el rechazo del gasto corporativo de Acapulco el lunes 16 de noviembre con la versión previa. El calendario anterior contaba 24 días.
- Pasaron 144 pruebas de importación, edición, distribución, Excel, calendario histórico, vista semanal, gráfica y Director IA. La comprobación de tipos del dashboard también pasó.
- Con datos de prueba de noviembre de 2026 se revisó, guardó y consultó el presupuesto en las seis plantas. Hubo 25 días editables. Los domingos 1, 8, 15, 22 y 29 quedaron en cero.
- En Acapulco se comprobó un importe fijo de 17.35 en la vista semanal y en la fórmula del Excel del lunes 16. Se verificaron también el viernes 25 de diciembre, los conceptos en cero, los domingos con gasto incorrecto y una importación parcial sobre un mes fijado con el calendario previo.

## Alcance y decisión

- Archivos tocados: ficha, importador de presupuesto, mensaje de Subir Presupuesto, calendario IGF, distribución diaria, lectores semanal, gráfico, Excel y Director IA, pruebas de importación y desglose, y este reporte.
- Fuera del cambio: calendarios de ventas y compras, datos y presupuestos de producción, contratos arquitectónicos.
- Contratos consultados: Constitución de Director IA, índice arquitectónico y protocolo de desarrollo supervisado.
- Contratos modificados: ninguno. El responsable indicó expresamente que su decisión escrita en el chat se registrara en la ficha para esta tarea.
- Contradicciones o desvíos de alcance: ninguno.
- secrets_check: revisión del diff y pruebas con datos sintéticos.
- human_decision_needed: revisión de la solicitud e integración a producción.
- next_task_proposed: ninguna.
