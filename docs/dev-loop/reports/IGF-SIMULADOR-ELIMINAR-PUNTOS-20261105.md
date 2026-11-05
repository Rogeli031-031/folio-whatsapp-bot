# Eliminar puntos guardados

Solicitud directa del usuario: disponer de una opción para eliminar propuestas en Puntos guardados. Continuación del flujo de integración/publicación autorizado. No se alteran contratos, aprobaciones ni CURRENT_TASK.

Base 91cb97e91f6b8ab09b0029dfaf42b6b1a40bfe99. Rama feat/igf-eliminar-puntos.

- Columna Acciones con Eliminar para cada punto. Confirmación explícita con número, comentarios e indicación de eliminación definitiva; Cancelar no realiza ninguna petición.
- Reutiliza el DELETE existente, acotado por ID, planta, año y mes y protegido por el acceso vigente. Sin cambios al servidor ni al formato guardado.
- Al completar, elimina el punto de la tabla, selección de comparación, tarjeta y marcador. Si era el escenario activo, restaura el corte actual. Los demás puntos se conservan.
- Un fallo conserva la propuesta y la confirmación con el mensaje de error para reintentar. Bloqueo de doble envío durante la petición.

Validación: 36 pruebas relacionadas aprobadas, incluyendo cancelar sin DELETE, fallo/reintento, parámetros de alcance, eliminación de un único punto, limpieza de la comparación y restauración del escenario activo. Compilación de producción y TypeScript. La comprobación visual en producción debe abrir/cancelar la confirmación; no eliminar propuestas reales de prueba.
