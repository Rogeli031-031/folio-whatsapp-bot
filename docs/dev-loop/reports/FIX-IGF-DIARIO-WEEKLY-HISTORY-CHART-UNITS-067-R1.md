# FIX-IGF-DIARIO-WEEKLY-HISTORY-CHART-UNITS-067-R1

Producto: `c4c806b19683a4153d2724b772cf4ce68807f82c`
Base 067: `940cc0907fc1aab6a23708cc49f192aa42f2b24a`
Rama: `fix/igf-diario-weekly-history-chart-units-067-r1`

## Resultado histórico

`loadMonthBundle` dejaba `legacyResultadoMxn` en null. El resultado anterior a octubre existía en `built.points` y no llegaba al día.

`daysFromBuilt` relaciona `financial_days` y `points` por fecha. Si el mes no tiene desglose 064, copia `resultado_mxn` y `resultado_per_kg` ya materializados. No recalcula la fórmula legacy ni reparte el gasto en J/K/L/Q/R/S/T.

Octubre sigue con el contrato detallado y no usa ese resultado legado. Si el punto no trae resultado, el día queda null. No se convierte en cero.

La semana 40, 28/09/2026–04/10/2026, suma el resultado de septiembre que ya existe y el resultado detallado de octubre. Los componentes nuevos de septiembre siguen null. La serie de Resultado conserva el punto. La serie de Gasto Corporativo deja el hueco.

## Eje y título

Con una métrica de la tabla, el eje usa `seriesUnit`: kilos en Venta, pesos en Ingreso, HG y Resultado importe, y pesos por kilo en Precio, Costo, Flete, Margen, C&D y Resultado por kilo. Sin métrica de serie, el modal sigue en pesos o pesos por kilo como antes.

El título pasa a `Gráfica · {métrica}`. El nombre de la planta queda al centro. Sin serie, el título sigue siendo `Gráfica · Rentabilidad IGF Diario`.

## Pruebas

067 ampliado: 8/8. Regresión previa, incluida la 056 del título: 180/180. `node --check server.js` correcto. Build del dashboard correcto. `git diff --check` sin errores de contenido.

## Archivos

- `lib/igf-diario-weekly-plant.js`
- `frontend-dashboard/components/IgfDiarioGraficaModal.tsx`
- `test/igf-diario-weekly-plant-view-067.test.js`
