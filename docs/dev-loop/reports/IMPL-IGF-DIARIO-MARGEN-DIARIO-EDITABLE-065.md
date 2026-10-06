# IMPL-IGF-DIARIO-MARGEN-DIARIO-EDITABLE-065

status: DONE_PENDING_REVIEW

product_sha: 76e667bc5ea824564a47a7432d41fc0d206328ea

base_sha: e14185996626b22cf170c40c5cbcd2010cd4e8bc

branch: implementation/igf-diario-margen-diario-editable-065

## Schema

Tabla nueva, creada con `CREATE TABLE IF NOT EXISTS` al primer uso. No hay seed, ni migración, ni copia desde Compras.

`arr.igf_diario_margen_manual`

| Campo | Tipo |
| --- | --- |
| plant_code | VARCHAR(40) NOT NULL |
| year | SMALLINT NOT NULL |
| month | SMALLINT NOT NULL |
| fecha | DATE NOT NULL |
| costo_kg | NUMERIC(18,6) NULL |
| flete_kg | NUMERIC(18,6) NULL |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() |
| updated_by | TEXT NULL |

PRIMARY KEY `(plant_code, year, month, fecha)`.

La fila se guarda con el `canon` de la planta. Si costo y flete quedan ambos NULL, la fila se elimina. Un override de una fecha anterior al corte nuevo permanece almacenado y deja de aplicarse.

## Endpoints

`GET /api/dashboard/igf-diario-margen-diario`

Params: `year`, `month`, `plant_code`, `upload_day`, `version_as_of_corte` opcional.

Respuesta: `year`, `month`, `plant_code`, `corte`, `days[]` con `fecha`, `precio`, `costo_kg`, `flete_kg`, `margen_bruto`, `editable`, `costo_manual`, `flete_manual`. También devuelve `costo_automatico` y `flete_automatico` para restaurar en el modal sin mostrar una fila Precio.

`PATCH /api/dashboard/igf-diario-margen-diario`

Body: `year`, `month`, `plant_code`, `upload_day`, `changes[]` de `{ fecha, costo_kg?, flete_kg? }`.

Valida todo el lote antes de escribir. Luego `BEGIN`, escrituras, `COMMIT`. Cualquier fallo hace `ROLLBACK` completo.

Controles, iguales a la distribución diaria existente:

- ambos: `dashboardAuthMiddleware`, `dashboardBlockGAFinancialKpis`, `dashboardBlockGVForbidden`
- lectura: `overrideVisible`
- escritura: `assertPlantaPermitidaDashboard`

## Corte y precedencia

El corte es la Fecha de carga del dashboard (`upload_day`).

Para cada fecha, un solo helper (`manualApplies` / `applyMarginOverrides` / `appliedManualNumber`):

- periodo anterior a octubre 2026, corte ausente, o `fecha < corte`: costo y flete efectivos son la fuente automática actual. El manual se ignora.
- `fecha >= corte` y periodo >= 2026-10: el número manual, incluido 0, reemplaza solo ese campo. Si ese campo no tiene número almacenado, queda el automático actual.
- Precio: siempre la resolución actual. No es editable y no se muestra como fila.

`editable` es `fecha >= corte` y periodo >= 2026-10.

Margen bruto: si precio, costo y flete son numéricos, `precio - costo - flete`. Si alguno falta, `null`. No se usa `Number(null)` ni se convierte vacío a 0.

## null y 0

Campo omitido en el PATCH: no cambia.

Número, incluido 0: crea o actualiza ese override.

`null`: restaura el automático de ese campo.

Costo y flete son independientes. Si después de la operación ambos quedan NULL, se borra la fila.

## Identidad de planta

Reusa `canonicalForecastPlantKey` y `plantsEquivalent` de 063-R1. La escritura usa el canon y borra alias de la misma fecha en la misma transacción.

Resuelve Tehuacan/Tehuacán y Queretaro/Querétaro/GTM Queretaro/GTM Querétaro. No hay hardcode por planta ni de los números del ejemplo.

## UI

Solo IGF Diario acumulado, desde octubre 2026. El Margen de cada planta es un botón discreto. Zona Provincia sigue siendo texto.

Modal: `Margen diario — {planta}`. Tabla horizontal con scroll y primera columna fija: FECHA, COSTO KG, FLETE KG, MARGEN BRUTO. Sin fila Precio.

Antes del corte no hay inputs. Desde el corte, Costo y Flete son inputs. Margen bruto se recalcula al teclear. Acciones: Guardar cambios, Cancelar, Restaurar Costo automático, Restaurar Flete automático.

Al guardar: PATCH atómico, refresco del detalle, refresco de `/igf-diario-acumulado` por nonce y limpieza de caché. Mini y Zona Provincia se recalculan con esa respuesta. No hay refresh de página.

## Fórmulas

Margen diario: `PRECIO - COSTO KG - FLETE KG`.

Acumulado, sin cambio de algoritmo: `SUM(MargenBruto * VentaKg) / SUM(VentaKg)` sobre días donde venta y margen son numéricos. Los overrides se aplican después del arrastre y antes de `totalMesMarginAndHg`. HG no cambia. Con el margen cambian ingreso derivado, utilidad, resultado final y Zona Provincia, porque la zona sigue siendo la ponderación de los márgenes de planta por venta.

Ejemplo de prueba, no hardcodeado en producto: 20.06 - 12.60 - 1.23 = 6.23. Con ventas 100 kg el 04/10 (margen automático 6.54) y 200 kg el 05/10 (margen 6.23), el acumulado es la ponderación, distinta del promedio simple.

## Excel

Desde octubre 2026, en cada hoja planta:

- `fecha >= corte` y costo manual numérico: columna F es ese valor. Si no, F conserva la fórmula automática.
- igual para G y el flete manual.
- `fecha < corte`: se ignora el manual y F/G conservan la lógica automática.
- H nunca es un valor fijo. Permanece `IF(AND(ISNUMBER(C),ISNUMBER(F),ISNUMBER(G)),C-F-G,"")`.

Todas: una sola lectura del mes y cada planta recibe solo sus overrides.

IGF Diario Provincia: F y G siguen siendo la ponderación de las hojas planta. H sigue siendo C-F-G. No hay override de Zona Provincia.

Antes de octubre 2026 no se aplica manual. Septiembre rechaza la escritura.

## Performance

Acumulado de Todas carga `listMonthOverrides` una vez, antes del loop de plantas, y agrupa en memoria `planta -> fecha -> override`. El detalle del modal consulta una planta al hacer click.

Para una planta en octubre, `query_count` pasa de 2 a 3: ventas, precio y una carga de overrides. Esa carga son `CREATE TABLE IF NOT EXISTS` más un `SELECT` del mes, no una consulta por planta. El test 063 quedó actualizado a ese conteo y exige un solo `SELECT` de `arr.igf_diario_margen_manual`.

## Histórico

Un override con fecha anterior al corte se conserva en la tabla y no entra al costo, al flete, al margen ni a las columnas F/G del Excel.

## Pruebas

`test/igf-diario-margen-diario-editable-065.test.js`: 8 pruebas, 8 en verde. Cubren DDL, ausencia de seed, octubre/septiembre, corte, PATCH rechazado, independencia de costo y flete, 0, null, campo omitido, borrado, lote, rollback, corte nuevo, precio no editable, margen 6.23, null distinto de 0, ponderación por venta, cambio de acumulado y de zona, HG idéntico, Excel F/G/H, histórico, aislamiento entre plantas, Provincia derivada, Tehuacán, Querétaro y una sola carga de overrides. Forecast sigue exponiendo el detalle de pronóstico. 064-R1 conserva el promedio inicial 35325.09 del fixture 953777.33. 063 conserva `finiteMetric(null) === null` y `finiteMetric(0) === 0`.

Regresiones en verde, 151 pruebas más la corrección de conteo: 064-R1, 064, 063-R1, 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054, 054-R1, 054-R2, 054-R3, Excel 036-044.

`frontend npm run build` terminó en 0. `node --check server.js` y los módulos tocados terminaron en 0. `git diff --check` no reportó errores de espacio.

## Archivos

- `lib/igf-diario-margen-manual.js`
- `lib/igf-diario-grafica.js`
- `lib/igf-diario-expense-excel.js`
- `lib/igf-diario-puebla.js`
- `lib/dashboard-arr-forecast.js`
- `server.js`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/igf-diario-margen-diario-editable-065.test.js`
- `test/igf-acumulado-default-perf-margen-063.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-IGF-DIARIO-MARGEN-DIARIO-EDITABLE-065.md`

## SHA

Producto: `76e667bc5ea824564a47a7432d41fc0d206328ea`

Base: `e14185996626b22cf170c40c5cbcd2010cd4e8bc`
