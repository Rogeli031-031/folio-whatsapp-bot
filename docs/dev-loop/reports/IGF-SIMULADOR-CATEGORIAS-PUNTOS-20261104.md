# Simulador: edición por subcategoría y puntos comentados

Solicitud directa del usuario: zoom manteniendo presionado el botón central y moviendo el mouse arriba/abajo, sin barra de zoom; apertura sin semanas seleccionadas; edición de venta y descuento por subcategoría más HG porcentual en Categorías del mes; guardar puntos numerados con comentarios y recuperarlos desde la pantalla principal. Continuación del flujo de integración y publicación autorizado en esta conversación. No se alteran CURRENT_TASK, aprobaciones ni contratos.

Base: cadd42571225855fae20544532b93de73bb0b832. Rama: feat/igf-simulador-categorias-propuestas.

## Resultado

- Zoom por arrastre central independiente del giro, con captura de puntero, límites 50–400%, cancelación y prevención de autoscroll. Se retiran deslizador y botones de zoom; Vista inicial restaura cámara y escala.
- Selección explícita de semanas inicialmente vacía, incluso después de la carga asíncrona y al ampliar el historial. Tendencia actual conservada.
- Categorías del mes contiene venta y descuento editables por subcategoría, importes calculados, totales y descuento ponderado por kilos, HG porcentual, comentarios y Agregar punto / propuesta. Hasta editar una fila se conserva la base IGF, sin ocultar las diferencias de ponderación ARR/IGF.
- Puntos guardados abre solamente la lista. Numeración automática mediante el identificador consecutivo existente del servidor; no se calculan números en el cliente. Al seleccionar se recuperan supuestos originales, mezcla, HG y comentarios, reproduciendo el resultado guardado. Los registros anteriores siguen disponibles.
- Comentarios (máximo 2000 caracteres) y mezcla se conservan en el JSONB existente; sin migración. El servidor valida categorías, duplicados, rangos, suma de volumen y ponderación, y recalcula importes. No persiste campos arbitrarios.
- Una mezcla con descuentos desconocidos o volumen cero no muestra una superficie financiera ficticia ni se puede guardar. Restaurar actual recupera el corte seleccionado.

## Validación

32 pruebas relacionadas aprobadas: interacción de zoom, apertura sin semanas tras carga, mezcla 300 t a $2/kg más 700 t a $4/kg → 1000 t y $3.40/kg, guardado y recuperación de HG/comentarios/mezcla/supuestos, rechazo de totales inconsistentes y compatibilidad histórica. Compilación de producción y TypeScript; sintaxis del módulo de propuestas y revisión de diferencias.

Solo cambia el simulador y la validación de sus propuestas. No cambia venta real, descuentos reales, presupuestos ni cálculos del IGF.
