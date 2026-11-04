# Comparación simultánea de propuestas

Solicitud directa del usuario: seleccionar varios puntos guardados y compararlos en la gráfica, identificados por número y comentarios, y colocar el botón verde hasta arriba. Continuación del flujo de integración/publicación autorizado; no se alteran contratos, aprobaciones ni CURRENT_TASK.

Base: bbc270da84289552c98deabda7c1b44b4e02fc3f. Rama: feat/igf-comparar-puntos.

- Casillas independientes en Puntos guardados, con Mostrar todos/Ocultar todos. Marcar una propuesta solo afecta su visibilidad; no sustituye la superficie activa ni recalcula el resultado de otros puntos.
- Número sobre cada marcador, comentario en su descripción y leyenda visible con color, número, comentario, venta, descuento, HG, resultado y corte. Las propuestas conservan sus supuestos originales y pueden quedar fuera de la superficie activa.
- Pulsar el número carga el escenario para editarlo sin perder las otras propuestas comparadas. Guardar un nuevo punto lo agrega a la comparación; al abrir el simulador la selección de puntos y semanas está vacía.
- Agregar punto / propuesta pasa a la primera posición de Categorías del mes y queda fijo durante el desplazamiento de su contenido.

Validación: 33 pruebas relacionadas, incluyendo dos propuestas con supuestos distintos (resultados $600000 y $1800000), selección/desmarcado independiente, conservación de resultados al cambiar el escenario activo, comentarios y colores en gráfica, y ubicación del botón antes del editor. Compilación de producción/TypeScript y revisión del diff. Sin cambios al servidor, a los datos reales o al formato de propuestas guardadas.
