# Compras: participación en kilos de Tuxpan y Tepeji

Solicitud directa del usuario del 2026-10-31. Base: f9cf1e15d0ce47f7b70769c29ba59253d2dbfdee. Rama: feature/compras-participacion-tuxpan-tepeji.

- Agrega TUXPAN y TEPEJI a la derecha de HG en Control de Compras. Cada bloque semanal muestra porcentaje en 22 px y kilos en 12 px debajo; TOTAL MES muestra ambos acumulados.
- TUXPAN suma PEMEX TUXPAN y TOMZA TUXPAN. TEPEJI usa TOMZA TEPEJI. Identificación por nombre normalizado, sin depender del orden ni del id de los proveedores.
- Cada porcentaje divide los kilos de su origen entre el consolidado de kilos del mismo periodo. El total mensual se calcula desde los kilos mensuales, sin promediar porcentajes. Sin compras muestra raya y 0 kg; si solo compra un origen, muestra 0% / 100%.
- Reutiliza los totales efectivos semanales/mensuales recibidos por la pantalla. No agrega consultas ni modifica compras, importes, HG, fletes, exportación Excel o datos productivos.
- Celdas semanales combinadas abarcan los días de esa semana y su subtotal, incluyendo la primera/última semana parcial. Conserva la separación entre semanas y permite desplegar Flete.

Validación: 4/4 pruebas de cálculo y 20/20 regresiones de separadores. TypeScript y compilación de producción correctos. Revisión visual local de octubre/Morelos con API ficticia de solo lectura: cinco bloques semanales, total mensual, porcentaje de mayor tamaño y kilos debajo. Con Flete desplegado, todas las filas conservan 40 columnas efectivas y doce celdas de participación (cinco semanas más mes, dos orígenes). git diff --check correcto. Artefactos compilados restaurados y excluidos del cambio.

Sin migraciones ni escrituras en datos productivos. Integración pendiente de revisión humana según el flujo del repositorio.
