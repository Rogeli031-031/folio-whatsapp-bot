# HG en kilos: dato ausente en la gráfica semanal

Fecha: 2026-10-15. Base: `7bfaf03ce1079c5fd45e44b7c5f2ad71ceb87a22`.
Rama: `fix/igf-hg-kilos-chart`.

## Solicitud y causa

El usuario reportó HG EN KILOS sin puntos ni acumulado en Tehuacán, aunque HG en pesos sí aparecía. Esta corrección responde a esa solicitud directa; no modifica CURRENT_TASK, registros G1 ni contratos.

`resolveControlComprasDays` calculaba `hgKilos` con las capturas y la proyección existentes, pero lo omitía en el objeto de salida. `loadComprasDayMap` recibía solo costo, flete e importe HG; por ello los siguientes pasos entregaban `hg_kilos: null` al visor. La prueba anterior de conciliación inyectaba un mapa que ya incluía `hgKilos` y no recorría el resolver.

## Cambio

Se agrega `hgKilos: row.hgKilos` al objeto final del resolver. La gráfica y su anexo PDF ya consumen ese campo. Se conservan el cálculo, el importe de HG, los kilos vendidos, las capturas en cero, los faltantes y las reglas vigentes de proyección. Las disminuciones físicas mantienen rojo y los aumentos verde.

## Verificación

- Tres regresiones nuevas: las tres fallaban antes del cambio y pasan después. Parten de datos sintéticos de Control de compras, recorren el cargador con caché de datos fuente, la materialización mensual, el agregador semanal, la serialización JSON y el renderer compartido por pantalla/PDF. Comprueban positivos, negativos, ceros, faltantes, proyección y disponibilidad de kilos aun sin costo monetario.
- Revisión amplia de 303 pruebas en 31 archivos: 299 pasaron inicialmente, tres fallaron por expectativas preexistentes y la conversión PDF en Chrome falló por las restricciones del entorno gráfico. Se repitió la suite PDF fuera de esas restricciones: 9/9 pasaron. Resultado combinado: 300 pasan y tres fallos preexistentes.
- Los tres fallos se reprodujeron cargando el archivo original de la base mediante un hook local, sin cambiar los demás archivos de producción (que son idénticos a la base):
  - `compras-flete-tarifa-016.test.js:439`: espera el número 200 en una celda que contiene una fórmula.
  - `compras-last-real-cost-igf-future-blank-045.test.js:112`: busca una fórmula en una celda nula.
  - `igf-diario-weekly-sunsat-multiplant-069.test.js:174`: espera que el panel Todas no incluya el botón Gráfica.
- `node --check lib/compras-excel.js` y `git diff --check` correctos.
- Las evidencias 084 regeneradas por su prueba se restauraron para evitar incluir cambios ajenos. No se cambiaron dependencias, permisos, fórmulas, diseños ni exportación Excel.
- No se ejecutaron migraciones, escrituras en una base de datos real ni despliegues manuales. No se afirma validación productiva con datos reales de Tehuacán. La integración y su publicación siguen pendientes.
