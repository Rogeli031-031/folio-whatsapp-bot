# Simulador: tamaño, zoom y selección histórica

Solicitud del usuario: ampliar la gráfica, agregar zoom in/out y filtrar semanas, incluyendo las anteriores 40 y 41. Continuación de la integración y publicación autorizadas en este chat; no se alteran CURRENT_TASK ni aprobaciones en archivo.

Base: db3c5c6971f4098f42a6b7d9f437e20e8845eb04. Rama: feature/igf-simulador-zoom-historico.

## Cambios

- La gráfica usa el ancho disponible del modal y un viewport SVG que sigue su tamaño real. Se elimina el espacio lateral creado por el viewBox fijo y se encuadra la geometría dibujada en lugar de un cubo hipotético completo.
- Zoom 50–400% con botones +/−, deslizador, porcentaje y Ajustar gráfica. El zoom y el giro no modifican importes ni supuestos. Vista inicial restaura cámara y zoom.
- Historial de mes anterior + mes seleccionado por defecto: noviembre incluye octubre y sus semanas 40, 41, etc. Se pueden solicitar 1, 2, 3 o 6 meses, incluso cruzando diciembre/enero.
- Se reutiliza el endpoint semanal existente con la misma planta, corte y bandera de versión. No se alteran las APIs ni las fórmulas financieras. Semanas compartidas por meses adyacentes se deduplican por fecha de inicio, prefiriendo el contexto del mes posterior.
- Casilla por semana y Mostrar todas/Ocultar todas. Solo las semanas con cobertura financiera completa se pueden graficar; las demás aparecen identificadas como incompletas. La tabla conserva todas las semanas cargadas y marca las ocultas.
- El ritmo mensual equivalente histórico se normaliza con los días del mes seleccionado; la tabla conserva fechas e importes del periodo original.
- Errores parciales de carga identifican el mes fallido y conservan los resultados de otros meses. Las consultas se cancelan al cerrar o cambiar de rango.

## Validación

20/20 pruebas relacionadas pasan: historial/cambio de año/deduplicación, selección individual y total, zoom/límites/restauración, giro/cancelación, datos financieros incompletos, propuestas, categorías y regresión de apertura del dashboard.

TypeScript, compilación de producción y preparación standalone pasan. Los archivos .next generados no se incluyen. La publicación y verificación visual se registran en el PR al concluir; no se modifican registros operativos, presupuestos ni propuestas guardadas.
