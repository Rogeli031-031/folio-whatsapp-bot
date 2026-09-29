# FIX-IGF-GRAFICA-PARIDAD-EXCEL-054-R1

status: DONE_PENDING_REVIEW

base_sha: 9a5c726257910250965600aabc955b105fa3297a

branch: fix/igf-grafica-paridad-excel-054-r1

## Resultado

La gráfica deja de reconstruir venta, precio, C&D, costo, flete y HG por su cuenta. Cada día recibe el mismo input resuelto que pintan Provincia Venta Diaria, PRECIO, Provincia Comisiones y CONTROL DE COMPRAS. Después de eso solo corre `computePlantDay`. AE y AF no se redefinieron.

Excel sigue siendo el oráculo. En las pruebas el libro se construye con `hojaA`, `hojaB`, `appendPrecioWorksheet`, `appendComprasWorksheet`, `fillIgfDiarioPuebla` y `fillIgfDiarioProvincia`. El runtime no genera XLSX ni evalúa fórmulas.

## Paridad por fecha

Corte `2026-09-03`. Planta Puebla. Pronóstico del jueves: CASA 10.250 t + COMISIONISTA 20.500 t. El 03 no hay venta real. Fallback de C&D no usado: 0.19. Precio 01/09 = 20.50, 04/09 = 20.70.

| fecha | estado | B Excel / gráfica | C Excel / gráfica | F Excel / gráfica | G Excel / gráfica | X Excel / gráfica | AC Excel / gráfica | AE Excel / gráfica | AF Excel / gráfica |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-01 | real | 10000 / 10000 | 20.50 / 20.50 | 13 / 13 | vacío / vacío | vacío / vacío | -0.55 / -0.55 | vacío / vacío | vacío / vacío |
| 2026-09-02 | real | 10000 / 10000 | 20.50 / 20.50 | 13 / 13 | 2 / 2 | -150 / -150 | -0.40 / -0.40 | 4.04768416 / 4.04768416 | 40476.8416 / 40476.8416 |
| 2026-09-03 | proyectado | 30750 / 30750 | 20.50 / 20.50 | 13 / 13 | 2 / 2 | -150 / -150 | -0.35 / -0.35 | 4.80778347 / 4.80778347 | 147839.3416 / 147839.3416 |
| 2026-09-04 | proyectado | 12000 / 12000 | 20.70 / 20.70 | 13 / 13 | 2 / 2 | -150 / -150 | -0.22 / -0.22 | 4.60307013 / 4.60307013 | 55236.8416 / 55236.8416 |

- Venta forecast sin fila real: 03/09 = 30750 kg. Es la fecha exacta del corte.
- Precio carry: 02/09 y 03/09 heredan 20.50. 04/09 usa 20.70. No hay arrastre desde agosto.
- C&D primario: 01/09 = -0.55, no 0.19. Con corte 15/09, el 10/09 real usa -0.77 de `descuento_por_kilo_diario_provincia` y no el ratio de cliente. El 10/09 con corte 03/09 queda proyectado y usa el weekday `-0.35`, el mismo valor que la hoja.
- Costo, flete y HG proyectados: 03/09 y 04/09 coinciden con las celdas F, G y X.
- Día 1 sin histórico: F del 01/09 = F del 02/09 = 13. Con `costo_kg_anterior` 11.5, F del 01/09 = 11.5 en Excel y en la gráfica. El 01/09 no tiene kilos de compra, así que G y X quedan vacíos en ambos lados; el día real completo de la tabla es el 02/09.

## Provincia y semana

Provincia el 02/09, Puebla y Acapulco completas, San Luis con venta 4000 kg y sin flete:

- B 19000 / 19000
- AF 55453.6832 / 55453.6832
- AE 2.91861491 / 2.91861491
- complete = false
- falta: San Luis · FLETE

Provincia en el corte 03/09:

- B 92250 / 92250
- AF 295678.6832 / 295678.6832
- AE 3.20518898 / 3.20518898
- complete = false
- falta: San Luis · FLETE

Semana 1 (01/09–06/09), corte 03/09, estado mixto:

- AF 243553.0248 / 243553.0248
- AE 3.88132310 / 3.88132310

Semana 1 con corte 07/09, estado real:

- AF 40476.8416 / 40476.8416
- AE 0.64504927 / 0.64504927

AE semanal sigue siendo SUM(AF) / SUM(B).

## Tendencia

Puntos sintéticos: índices 0 y 1 reales completos, 2 real incompleto, 3 proyectado, 4 real completo, y un proyectado posterior.

La recta usa x = 0, 1, 4. No reindexa esos puntos como 0, 1, 2. `xFirst = 0`, `xLast = 4`. El cambio de métrica conserva la misma X. El modal dibuja de `xFirst` a `xLast` y no llega a `points.length - 1`.

## Qué quedó intacto

- Modal, toggle `$` / `$/kg`, clientes nuevos, Top 10 y Descargar Excel.
- Gate de Todas antes de `pool.connect()`.
- Fórmulas AE/AF y el contrato 053A-R1: venta positiva con input faltante deja `complete = false`.
- Contrato 049/050/052 del worksheet de CONTROL DE COMPRAS. El resolver es puro y no escribe la hoja.
- Sin XLSX en runtime, sin OpenAI, sin INSERT/UPDATE/DELETE ni DDL en el módulo de la gráfica.

## Queries

Por petición, después de los gates:

- Un contexto de pronóstico del mes abierto, compartido. Si falla, lo proyectado queda vacío.
- Una lectura de `arr.descuento_por_kilo_diario_provincia` para toda la ventana. La segunda consulta, el ratio cliente, solo corre si la primaria no devuelve filas.
- Por planta: ventas por canal y descuentos de cliente. Esas dos alimentan canales y clientes nuevos. AC no sale de `cdKgFromRows`.
- Por planta: proveedores, compras, HG, tarifas, último costo y último HG. El estado diario se resuelve en memoria, mes por mes, encadenando el costo y el HG.
- Por planta y por mes de la ventana: `loadPrecioDiario`, con los alias ya existentes.
- Meses cerrados de 3M/YTD/1A/5A/Todo no arman forecast. El mes seleccionado sí aplica corte.
- No se llama `loadMonth` ni `ensureComprasTables`.

## Desviaciones

- La gráfica no crea proveedores requeridos. Si el Excel de compras los insertara antes de pintar y la tabla estuviera vacía, el flete podría diferir. Con el mismo grid, las celdas coinciden.
- Un día posterior al corte sin forecast de canal queda en 0 porque esa es la celda de Provincia Venta Diaria, no porque la gráfica invente otro pronóstico. Los meses cerrados no hacen eso.
- El contexto de pronóstico lee los mapas de provincia. La respuesta de una planta individual sigue conteniendo solo esa planta.

## Pruebas

160/160 en 054-R1, 054, 053A, 053A-R1, 053A-R2, 053BC, 052, 050, 023, 024, 025, 026, 027, 028, 029, 030, 033 y 049.

`git diff --check` limpio.
