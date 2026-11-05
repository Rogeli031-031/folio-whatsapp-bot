# Navegar semanas anteriores en la tabla Por semanas

Solicitud directa del usuario: permitir retroceder también en la vista de columnas Por semanas. Continuación del flujo de integración/publicación autorizado. Sin cambios a contratos, aprobaciones ni CURRENT_TASK.

Base 5e7ed77da9ee18dd52923f20726ed76815c7f26e. Rama feat/igf-periodos-semanas-historicas.

- Semana anterior desplaza una semana hacia atrás la ventana completa de columnas, manteniendo el número de columnas del mes seleccionado: noviembre 45–49 → 44–48 → 43–47.
- Semana siguiente permite volver hacia el mes seleccionado; Volver al mes seleccionado restaura la ventana original. El futuro conserva el horizonte original del mes.
- Se mantiene año/mes de contexto, planta/Todas, corte, versión y fuente IGF Diario. Los meses históricos siguen usando datos reales y no se sustituyen por Forecast ni por cero.
- El parámetro period_week_start es opcional y exclusivo de semanas. Se valida fecha real, inicio en domingo y límite futuro antes de consultar datos. Se reutiliza loadPeriodColumns/loadBundles sin cambiar fórmulas.
- El rango visible se muestra en fechas. El historial se reinicia al cambiar planta, mes/año o corte. La vista mensual conserva su selección de fuente y mes inicial.

Validación: 25 pruebas relacionadas aprobadas, con ventanas desplazadas, cruce de año, fechas inválidas/futuras, métricas iguales a la semana individual, conservación del contexto y navegación individual/Todas. Se mejora el arnés de pruebas para respetar dependencias de efectos como React. Compilación de producción/TypeScript, sintaxis del servidor y revisión de diferencias.
