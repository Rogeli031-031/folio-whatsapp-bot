# IMPL-IGF-MARGEN-VERTICAL-PRECIO-RANGOS-065-R1

status: DONE_PENDING_REVIEW

product_sha: 73d1b716044f600ed60e9ad0285ef385038ecb25

base_sha: 7d102e95bd2aad2428800e0e0935bac5692ab81e

branch: implementation/igf-margen-vertical-precio-rangos-065-r1

## Schema

La tabla `arr.igf_diario_margen_manual` de 065 se conserva. El `CREATE TABLE IF NOT EXISTS` de una instalación nueva incluye `precio NUMERIC(18,6) NULL`.

Para la tabla que ya existe:

`ALTER TABLE arr.igf_diario_margen_manual ADD COLUMN IF NOT EXISTS precio NUMERIC(18,6) NULL`

El ensure ejecuta ambas sentencias y es idempotente. No hay seed, ni `UPDATE` de filas actuales, ni copia desde Compras.

La fila se elimina solo cuando `precio`, `costo_kg` y `flete_kg` quedan los tres NULL.

## Precio, Costo y Flete

Los tres campos son independientes. Un número, incluido 0, es override. `null` restaura solo ese campo. Un campo omitido conserva el otro.

Si `fecha < corte`, se ignoran los tres overrides y se usa el automático. Si `fecha >= corte` y el periodo es octubre 2026 o posterior, el efectivo es el manual cuando el número existe, y el automático cuando no. No se usa truthiness: 0 cuenta.

## Rangos

El modal tiene tres bloques con su propio Desde, Hasta y Valor: PRECIO (C), COSTO KG (F) y FLETE KG (G).

Aplicar al rango y Restaurar automático en rango cambian el borrador local. No escriben la base. Guardar cambios manda el lote en un solo PATCH.

El rango incluye todos los días calendario, incluidos domingos. Desde debe ser menor o igual que Hasta, ambas fechas del mes y ambas mayores o iguales al corte. Un inicio anterior al corte se rechaza completo; no se recorta. Si ninguna fecha del mes es editable, los controles quedan deshabilitados.

En la misma variable gana la última acción. Variables distintas no se pisan. Una edición individual posterior gana ese día; un rango posterior vuelve a ganar ese día.

Restaurar Precio pone `precio: null` y conserva Costo y Flete. Restaurar Costo conserva Precio y Flete. Restaurar Flete conserva Precio y Costo. La pantalla muestra de inmediato el automático.

## UI

El modal horizontal de 065 queda reemplazado por un listado vertical, una fecha por renglón, con scroll vertical:

FECHA | PRECIO | COSTO KG | FLETE KG | MARGEN BRUTO

Antes del corte todo es solo lectura. Desde el corte, Precio, Costo y Flete son inputs y cada uno tiene un botón Auto. Margen bruto es texto calculado. La pantalla muestra entre 2 y 6 decimales. El cálculo interno usa el valor efectivo completo.

## Fórmulas

Margen bruto: `PRECIO efectivo - COSTO efectivo - FLETE efectivo`. Si falta uno, el margen es null.

Acumulado, sin cambio de algoritmo: `SUM(H * VentaKg) / SUM(VentaKg)`. Los tres overrides se aplican antes de `totalMesMarginAndHg`. Un precio manual cambia el margen acumulado. HG no cambia. Zona Provincia se recalcula por la ponderación existente.

Ejemplo de prueba, no hardcodeado en producto. Corte 05/10. Precio 05-10 = 20.10, Costo 08-15 = 12.55, Flete 05-31 = 1.27.

- 08/10: C 20.10, F 12.55, G 1.27, H 6.28
- 11/10: C vuelve al automático, F 12.55, G 1.27

## Excel

Desde octubre, en la hoja planta, si la fecha es mayor o igual al corte y hay precio manual, C es ese número. Si no, C conserva la fórmula automática. F y G siguen la regla de 065. H permanece fórmula `IF(AND(ISNUMBER(C),ISNUMBER(F),ISNUMBER(G)),C-F-G,"")`.

Todas usa solo los overrides de cada planta. Provincia deriva C por ingreso/venta de las hojas planta, y F y G por la ponderación de esas hojas. H de Provincia sigue siendo C-F-G. No hay override de Provincia.

## Performance

No hay consulta nueva de precio. El `SELECT` mensual existente ahora lee `precio, costo_kg, flete_kg`. Sigue habiendo una sola `listMonthOverrides` antes del loop de plantas. Para una planta en octubre el conteo sigue en 3: ventas, precio de la serie y una carga de overrides.

## Endpoints

Siguen siendo los de 065:

- `GET /api/dashboard/igf-diario-margen-diario`
- `PATCH /api/dashboard/igf-diario-margen-diario`

Cada día del GET incluye precio efectivo, `precio_automatico`, `precio_manual`, y los pares equivalentes de costo y flete, más `margen_bruto` y `editable`.

El PATCH acepta `precio`, `costo_kg` y `flete_kg` por fecha. Al menos uno debe venir. Valida el lote antes de `BEGIN` y hace rollback completo si falla.

## Pruebas

`test/igf-margen-vertical-precio-rangos-065-r1.test.js`: 6/6. Cubre DDL, filas 065 intactas, precio manual, corte, 0, null, omitido, borrado de los tres, GET, PATCH, lote, listado vertical, rangos independientes, calendario, rechazos, overlaps, restauración, Excel C/F/G/H, Todas, Provincia, acumulado ponderado, HG, una carga, Forecast, 063 y 064-R1.

`test/igf-diario-margen-diario-editable-065.test.js`: 8/8.

Regresiones en verde, 100 pruebas: 064-R1, 064, 063-R1, 063, 062, 061, 059-R1, 059, Excel 036-044, 054-R1 y 054-R3.

`frontend npm run build` terminó en 0. `node --check server.js` terminó en 0. `git diff --check` limpio.

## Archivos

- `lib/igf-diario-margen-manual.js`
- `lib/igf-diario-expense-excel.js`
- `lib/igf-diario-puebla.js`
- `frontend-dashboard/lib/igf-margen-rangos.js`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/igf-margen-vertical-precio-rangos-065-r1.test.js`
- `test/igf-diario-margen-diario-editable-065.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-IGF-MARGEN-VERTICAL-PRECIO-RANGOS-065-R1.md`

## SHA

Producto: `73d1b716044f600ed60e9ad0285ef385038ecb25`

Base: `7d102e95bd2aad2428800e0e0935bac5692ab81e`
