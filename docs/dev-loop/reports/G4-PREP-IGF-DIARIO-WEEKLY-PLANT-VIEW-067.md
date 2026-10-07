# G4-PREP-IGF-DIARIO-WEEKLY-PLANT-VIEW-067

outcome: DONE_PENDING_REVIEW
main: `d58216dd128c459df6ac9aff4a05a75f9505d8a6`
rama: `fix/igf-diario-weekly-crossmonth-result-kg-067-r2`
ahead / behind antes de este commit: 6 / 0
PR: https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/111
base: `main`
head: `fix/igf-diario-weekly-crossmonth-result-kg-067-r2`
merge: no
deploy: no

## Cadena

| Entrega | Producto | Cierre |
| --- | --- | --- |
| 067 | `d04c01ebdcb3779da1eccfb4b5642568c392e509` | `940cc0907fc1aab6a23708cc49f192aa42f2b24a` |
| 067-R1 | `c4c806b19683a4153d2724b772cf4ce68807f82c` | `0dd2bb5847ed328fe5b73dec0d25297fb275f568` |
| 067-R2 | `39b1236880a14a194ba41bfbaf330e79ff1aa8d2` | `9328caef1f7c2a5e78b1a6988ed405a377a0317c` |

No hay cambios de producto después de `9328caef`. Este commit solo documenta el PR.

## Condición visual

Con planta y modo IGF Diario se muestra el panel semanal vertical. En ese modo no se pide ni se pinta la comparación contra el mes anterior. Con planta y modo Forecast, la comparación `Comparación IGF Forecast vs última versión del mes anterior` sigue. Planta Todas no abre ninguno de los dos paneles.

## Semanas ISO

La semana va de lunes a domingo. La del 28/09/2026 al 04/10/2026 es la ISO 40 y no se corta el 01/10. El corte 06/10/2026 abre del 05/10/2026 al 11/10/2026. Anterior y siguiente mueven exactamente 7 días.

## Fórmulas

Venta es la suma de B. Ingreso es la suma de D. Precio es ingreso / venta. Costo y flete se ponderan por venta. Margen es precio − costo − flete. El resultado en pesos suma el resultado diario con precisión completa. En una semana detallada, el resultado por kilo sigue siendo sobrante con HG más comisiones y descuentos.

## 064-R1 y 065-R1

J, K, L, Q, R, S y T salen del schedule diario de 064-R1. Un override de ese día cambia el importe de la semana. Precio, costo y flete efectivos pasan por 065-R1.

## Resultado legacy y fallback

Antes de octubre, el resultado que ya existe en el punto se transporta. No se inventan J/K/L/Q/R/S/T, margen neto ni sobrantes. La semana 40 suma el resultado legado de septiembre y el resultado detallado de octubre. Si la cadena detallada no existe, el importe es numérico y la venta es distinta de cero, el resultado por kilo es importe / venta. En el fixture: venta 700 kg, importe 1944, $/kg 2.777142857142857, y el producto vuelve al importe con diferencia 0. Sin importe, o con venta 0, el resultado por kilo queda null.

## Gráfica

Venta usa eje kg. Margen, precio, costo, flete, comisiones y resultado por kilo usan $/kg. Ingreso, HG y resultado importe usan pesos. El título de la serie es `Gráfica · {métrica}`. Sin serie, el título sigue siendo `Gráfica · Rentabilidad IGF Diario`. Las ventanas 1D, 5D, 1M, 3M, YTD, 1A, 5A y Todo permanecen.

## Performance

No hay consulta por concepto ni por día dentro del armado semanal. Los schedules se construyen en memoria. El desglose y la distribución se leen una vez por mes involucrado. La vista no parsea XLSX para calcular la semana.

## Pruebas

067: 8/8. Regresión reportada, incluidas 054–056-R1, 059–066-R1 y Excel 036–044: 184/184. Build del dashboard correcto. `node --check server.js` correcto. `git diff --check` sin errores de contenido.

## PR

Número 111. https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/111

El merge y el deploy no se ejecutan aquí.
