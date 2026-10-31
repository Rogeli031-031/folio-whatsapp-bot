# Compras: Tuxpan y Tepeji en Excel y desplazamiento de tabla

Solicitud directa del usuario del 2026-10-31, continuación de PR 152. Base: ec7c7649e3d50f56088f8f42f33d99cfef68ca4e. Rama: feature/compras-excel-origen-scroll.

- El exportador compartido de CONTROL DE COMPRAS agrega TUXPAN y TEPEJI después del bloque de Flete. Conserva posiciones y referencias de todas las columnas anteriores.
- Cada semana, incluidas las parciales, muestra el porcentaje en 18 pt y los kilos debajo en 10 pt. TOTAL MES incluye su porcentaje y kilos debajo. TUXPAN suma PEMEX TUXPAN y TOMZA TUXPAN; TEPEJI usa TOMZA TEPEJI, con identificación por nombre normalizado.
- Fórmulas simples SUM e IF enlazan los kilos de proveedor y el consolidado de la semana/mes que ya muestra el Excel. Conserva la estimación existente del exportador: no sustituye esos kilos por los capturados que muestra la web. El mensual usa kilos del mes, sin promediar porcentajes. Sin compras muestra raya y 0 kg.
- Las nuevas fórmulas llevan resultados almacenados para lectores que no recalculan. Se comprobó serialización y reapertura del xlsx, fórmulas, combinaciones y tamaños. Render del archivo generado confirma porcentajes y kilos legibles.
- La tabla web ahora tiene un contenedor de altura acotada con desplazamiento vertical/horizontal y foco de teclado. En producción se observó una tabla de 1200 px dentro de una página de 1410 px con viewport de 926 px, sin avance del desplazamiento en la prueba inicial. En la versión local corregida, el contenedor pasó desde 0 hasta el máximo de 831 px con PageDown y Ctrl+End; TOTAL MES queda accesible sin cambiar zoom.

Validación: 57 pruebas, 54 aprobadas, 3 fallos preexistentes. Las mismas suites históricas en la base dieron 49 pruebas, 46 aprobadas y los mismos 3 fallos: la aserción antigua de colspan en 088-R3 y dos aserciones de texto de server.js en 024. Las 4 pruebas nuevas de Excel y las 4 de participación existentes pasan. Sintaxis backend y diff correctos. Compilación frontend y TypeScript correctos; el primer intento local requirió repetir fuera de las restricciones de permisos de carpetas temporales.

Sin migraciones, consultas nuevas ni cambios a datos productivos. Archivos de prueba, imágenes, servidores ficticios y compilados no forman parte del cambio.
