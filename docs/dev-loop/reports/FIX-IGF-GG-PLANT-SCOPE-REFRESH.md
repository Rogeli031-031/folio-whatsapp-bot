# IGF: alcance del GG y actualización del pronóstico

Fecha: 2026-10-15. Base: `50c361973180b7880dc0c60eae20176c802c318f`.
Rama: `fix/igf-gg-plant-scope`.

## Solicitud humana

Corregir el acceso del gerente general a los cálculos de su planta y quitar avisos de otras plantas. Durante el trabajo se pidió actualizar la pantalla principal al cerrar la selección de días del pronóstico. Esta implementación responde a esas solicitudes directas; no modifica CURRENT_TASK, autorizaciones G1 ni contratos del Director IA.

## Causas y corrección

- Forecast y mini devolvían todas las plantas, mientras el acumulado del GG estaba limitado a su planta. La validación conjunta interpretaba las demás como faltantes y ocultaba los controles. Ahora ambos endpoints de Forecast, el acumulado y los gastos aplican el alcance autenticado antes de responder. Los totales globales no se devuelven a usuarios de alcance local.
- La pantalla abre la planta autorizada y reserva Todas para ZP, AD y CF_CDMX. El mini conserva el código de edición y usa la misma etiqueta del selector; se reconoce el alias exacto `GTM - San Luis P.`. Un faltante real de la propia planta conserva su aviso.
- Pronóstico, HG, margen y gastos comprueban la planta en el servidor. Un alcance local vacío no se considera global. El snapshot guardado por un GG y el recálculo ARR se limitan a plantas autorizadas. Las restricciones GA/GV permanecen.
- El guardado del pronóstico actualizaba Forecast pero reutilizaba el acumulado anterior. Ahora invalida ese acumulado y refresca el resumen y la semana. La clave de caché incluye sesión y revisión para impedir reutilizar respuestas anteriores.
- Cerrar el pronóstico guarda los días pendientes; mientras guarda impide envíos duplicados. Si falla, conserva la ventana, selección y error para reintentar. Cambiar de sesión limpia los datos de la sesión anterior.

## Verificación

- 107/107 pruebas en 12 archivos: permisos y respuestas de los seis GG; alias; alcance vacío; roles globales; GA/GV; lecturas y escrituras propias/ajenas; recálculo ARR; controles de la pantalla; cierre, error y respuesta antigua del pronóstico; regresiones de acumulado, gastos, margen y exportación por planta.
- Los tests nuevos ejecutan los handlers reales con dependencias de almacenamiento simuladas y el componente React con estado y respuestas controladas. No se usaron tokens reales ni se escribieron datos de usuarios.
- TypeScript sin errores; compilación de producción terminada correctamente (13 páginas). Aviso preexistente de Browserslist desactualizado; Next omite lint según la configuración del proyecto.
- `node --check server.js` y `git diff --check` correctos.
- No cambian fórmulas financieras, PDF, Excel, dependencias, migraciones ni contratos. No se ejecutó deploy manual, merge ni escritura en producción.

## Estado

Implementación preparada para revisión e integración. El funcionamiento con una sesión real de GG en producción se comprobará después de integrar y desplegar el cambio; no se afirma que ya esté en producción.
