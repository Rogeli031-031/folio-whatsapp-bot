# FIX-IGF-DIARIO-WEEKLY-CROSSMONTH-RESULT-KG-067-R2

Producto: `39b1236880a14a194ba41bfbaf330e79ff1aa8d2`
Base: `0dd2bb5847ed328fe5b73dec0d25297fb275f568`
Rama: `fix/igf-diario-weekly-crossmonth-result-kg-067-r2`
outcome: DONE_PENDING_REVIEW

## Semana mixta

En `aggregateWeek` la fórmula detallada sigue primero: `resultado_kg = sobrante_con_hg_kg + com_desc_kg` cuando esa cadena existe. El día legado de 067-R1 conserva `resultado_per_kg` cuando el punto lo trae.

Si después de eso `resultado_kg` sigue null, `resultado_mxn` es numérico y `venta_kg` es numérico y distinto de cero, `resultado_kg = resultado_mxn / venta_kg`. Si falta el importe, o la venta es null o cero, el resultado por kilo permanece null. No se inventan J/K/L/Q/R/S/T, margen neto ni sobrantes.

## Semana 40

28/09/2026–04/10/2026, fixture de la prueba: venta 100 kg cada día.

- Venta KG = 700
- Resultado Importe = 1944 (120 de septiembre legado + 1824 del detalle de octubre, 456 por día)
- Resultado $/kg = 1944 / 700 = 2.777142857142857
- `resultado_kg * venta_kg - resultado_mxn` = 0

Gasto corporativo, inversiones, impuestos, nómina, IMSS, extraordinarios, provisiones, margen neto y sobrantes de la semana mixta siguen null.

## Pruebas

067 ampliado: 8/8. Regresión ya reportada, con 056 y 056-R1: 184/184. `node --check server.js` correcto. Build del dashboard correcto. `git diff --check` sin errores de contenido.

## Archivos

- `lib/igf-diario-weekly-plant.js`
- `test/igf-diario-weekly-plant-view-067.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-CROSSMONTH-RESULT-KG-067-R2.md`
