# Ejes extendidos y lectura de la superficie

Continuación solicitada por el usuario del simulador publicado: extender los ejes y aclarar si las áreas gris/azul representan probabilidad. La integración y publicación siguen el flujo autorizado en este chat. No se alteran CURRENT_TASK ni campos de aprobación.

Base: 9fcfcd834e7e2cd44f221ae0fb089ef62ece6b9d. Rama: feature/igf-simulador-ejes-extendidos.

## Cambio

Los tres ejes ahora tienen líneas independientes extendidas más allá de la malla, flechas de dirección, nombres/unidades y marcas intermedias legibles. Venta y descuento cruzan el origen cero; resultado incluye valores negativos, cero y positivos. El encuadre de Ajustar gráfica incluye los extremos de los ejes; las líneas giran y escalan junto a la superficie.

La leyenda distingue superficie gris (pérdida), azul (utilidad), línea blanca (equilibrio) y los puntos del escenario. Aclara que el tamaño visible de las áreas no representa porcentaje ni probabilidad. El modelo sigue siendo determinístico; no se agregan supuestos estadísticos.

Se conservan las fórmulas, los límites de la malla de escenarios, datos históricos, filtros, zoom y propuestas. Se extienden las líneas de referencia, sin extrapolar registros reales ni modificar datos operativos.

## Validación

22/22 pruebas relacionadas pasan: tres ejes con flechas/unidades, marcas intermedias y negativas en rangos asimétricos, leyenda, zoom, giro, filtro e historial, identidad financiera y regresión de permisos/apertura.

Compilación de producción y TypeScript verificados antes de publicar. Los artefactos .next generados se excluyen. La verificación de despliegue y navegador se registra en el PR al concluir.
