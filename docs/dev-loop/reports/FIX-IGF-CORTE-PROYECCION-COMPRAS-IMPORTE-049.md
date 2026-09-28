# FIX-IGF-CORTE-PROYECCION-COMPRAS-IMPORTE-049

## Resultado

La fecha seleccionada es el último día con información en IGF Diario. Hasta ese día, la venta usa la captura si existe y el pronóstico del día de semana si no hay registro. El importe proyectado de cada proveedor es sus propios kilos por su propio costo.

| Campo | Valor |
| --- | --- |
| Rama | `fix/igf-corte-proyeccion-compras-importe-049` |
| Base | `982fe9a15175d467d7312faa29e04c34471ed48d` |
| Pruebas | 123/123 |
| `git diff --check` | limpio |

## Archivos

- `lib/dashboard-arr-forecast.js`
- `lib/compras-excel.js`
- `test/igf-corte-proyeccion-compras-importe-049.test.js`
- `test/compras-importe-venta-igf-por-planta-048.test.js`
- `test/compras-daily-average-fill-030.test.js`
- `test/igf-diario-pronostico-fill-028.test.js`
- `test/arr-forecast-excel-daily-category-023.test.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)

## Venta e IGF

Un día posterior al corte deja la fecha en A y B:AF vacías, sin fórmulas. El día del corte sí puede mostrar datos. Si hay captura, incluida un cero, se conserva. Si no hay registro, se usa `promVentaTotal`, `promVentaCasa` y `promVentaComisionista`. La venta pronosticada ya no entra a CONTROL DE COMPRAS; se eliminó `forecastVentaKgByYmd`.

Un canal que no tuvo registro queda ausente, no en cero. La prueba 023 documenta ese cambio: COMISIONISTA sin fila ya no es 0. La prueba 028 deja el día de corte sin registro para seguir comprobando el pronóstico de ese día; un cero capturado en el corte ya no se reemplaza.

### Acapulco, corte 2026-09-27

- 25/09: CASA 4 y COMISIONISTA 0, ambos reales.
- 26/09 y 27/09: CASA 1 y COMISIONISTA 2, pronóstico.
- 28/09 al 30/09: solo la fecha. B:AF vacías. Se conserva al reabrir.

### Tehuacán, corte 2026-09-27

- 25/09: CASA 1.5 y COMISIONISTA 2.5, reales.
- 26/09 y 27/09: CASA 5 y COMISIONISTA 6, pronóstico.
- 28/09 al 30/09: solo la fecha. B:AF vacías. Se conserva al reabrir.

### Corte 2026-09-25

Del 26 al 30, en Acapulco y Tehuacán, B:AF quedan vacías. La semana 4 suma hasta el 25 (`B32:B36`) y no incluye el 26.

## Compras

La 048 multiplicaba el último costo por la venta pronosticada. Esa regla queda sustituida: el importe proyectado es COMPRA KG × COSTO KG del mismo proveedor. Las pruebas 048 y 030 lo documentan. Sin venta, el importe ya no queda vacío si hay kilos y costo.

Fila proyectada del 25/09, corte 2026-09-25:

- `D = IF(AND(ISNUMBER(B8),ISNUMBER(C8)),B8*C8,"")`
- `H = IF(AND(ISNUMBER(F8),ISNUMBER(G8)),F8*G8,"")`
- `L` vacío: TOMZA TEPEJI no tiene costo real, así que costo e importe quedan vacíos.

El 20/09 conserva la captura: 19370 kg e importe 236938.17. El 27/09, con captura real, conserva 250 y no usa la fórmula. Al reabrir, las fórmulas y el histórico siguen igual.

Consolidado de esa fila proyectada: `SUM(B8,F8,J8)` y `SUM(D8,H8,L8)`. Con los kilos y costos de la prueba, la suma es 813.75 kg y 9931.724681423164 de importe. No usa la venta de la planta.

## Pruebas

123/123: 049, 048, 047, 045, 044 a 036, 030, 026, 024, 022, 021 y 020. `git diff --check` limpio.
