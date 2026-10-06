# G4-PREP-IGF-MARGEN-VERTICAL-PRECIO-RANGOS-065-R1

Estado: DONE_PENDING_REVIEW. El merge y el deploy quedan reservados al HUMAN_APPROVER.

## Referencias

- `origin/main`: `7d102e95bd2aad2428800e0e0935bac5692ab81e`
- product SHA: `73d1b716044f600ed60e9ad0285ef385038ecb25`
- delivery SHA: `f7c374099a89453856639b6fff253e3fa0112591`
- Rama: `implementation/igf-margen-vertical-precio-rangos-065-r1`
- Posición verificada antes de este prep: ahead 2, behind 0
- `git diff --check`: limpio

Este prep no modifica producto, tests, schema, endpoints, rangos, fórmulas ni el conteo de consultas.

## Schema

Tabla existente `arr.igf_diario_margen_manual`. La clave sigue siendo `plant_code`, `year`, `month`, `fecha`.

Columna nueva: `precio NUMERIC(18,6) NULL`.

El `CREATE TABLE IF NOT EXISTS` de una instalación nueva incluye precio. La tabla de 065 recibe:

`ALTER TABLE arr.igf_diario_margen_manual ADD COLUMN IF NOT EXISTS precio NUMERIC(18,6) NULL`

El DDL es idempotente. No hay seed, ni `UPDATE` de filas existentes, ni migración automática del precio. La fila se elimina solo cuando precio, costo y flete quedan los tres NULL.

## UI

El modal es un listado vertical, una fecha por renglón:

FECHA | PRECIO | COSTO KG | FLETE KG | MARGEN BRUTO

El orden corresponde a A, C, F, G y H. Margen bruto no se edita ni se persiste. Es `C - F - G`.

Precio, Costo y Flete son editables solo si la fecha es mayor o igual al corte y el periodo es octubre 2026 o posterior. Antes del corte los tres quedan en solo lectura.

Hay tres rangos independientes, cada uno con Desde, Hasta y Valor: PRECIO (C), COSTO KG (F) y FLETE KG (G). Aplicar al rango cambia el borrador, no la base. Guardar cambios envía un solo PATCH.

Desde debe ser menor o igual que Hasta, ambas fechas del mes y ambas mayores o iguales al corte. Un inicio anterior al corte se rechaza completo. El rango incluye todos los días calendario.

En la misma variable gana la última acción. Variables distintas no se pisan. Una edición individual posterior gana ese día; un rango posterior vuelve a ganarlo. Restaurar, individual o por rango, afecta solo esa variable. `0` es override válido. `null` restaura el automático. Un campo omitido conserva el otro.

## Fórmulas y Excel

H permanece `IF(AND(ISNUMBER(C),ISNUMBER(F),ISNUMBER(G)),C-F-G,"")`.

El acumulado sigue `SUM(MargenBruto * VentaKg) / SUM(VentaKg)`. Un precio manual cambia ese margen. HG permanece intacto. Zona Provincia se recalcula.

En Excel, C es el precio efectivo, F y G conservan la lógica de 065, y H sigue siendo fórmula. Todas aísla los overrides por planta. Provincia deriva C, F y G de las hojas planta.

Fixture de prueba, no hardcode de producto: Precio 05/10–10/10 = 20.10, Costo 08/10–15/10 = 12.55, Flete 05/10–31/10 = 1.27. El 08/10 queda C 20.10, F 12.55, G 1.27, H 6.28. El 11/10 el precio vuelve al automático.

## Performance

El `SELECT` mensual existente incluye `precio`, `costo_kg` y `flete_kg`. `listMonthOverrides` sigue ejecutándose una vez antes del loop. No hay consulta extra de precio ni N+1 nuevo. Para una planta en octubre el conteo sigue en 3.

Forecast permanece intacto. 065 permanece intacto. 064-R1 permanece intacto.

## Pruebas ya corridas en el delivery

- 065-R1: 6/6
- 065: 8/8
- 064-R1, 064, 063-R1, 063, 062, 061, 059-R1, 059, Excel 036-044 y regresiones relacionadas: 100/100
- `frontend npm run build`: 0
- `node --check server.js`: 0
- `git diff --check`: limpio

## Pull request

- Número: 108
- URL: https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/108
- Base: `main`
- Head: `implementation/igf-margen-vertical-precio-rangos-065-r1`
- Título: IMPL 065-R1: margen vertical con Precio y rangos C/F/G
- mergeable: true
- mergeable_state: clean
- merged: false

NO MERGE. NO DEPLOY.
