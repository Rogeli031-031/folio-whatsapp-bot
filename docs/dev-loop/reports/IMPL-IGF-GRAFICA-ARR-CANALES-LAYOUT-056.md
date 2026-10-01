# IMPL-IGF-GRAFICA-ARR-CANALES-LAYOUT-056

status: DONE_PENDING_REVIEW

base_sha: cb2a25337e17091a04d3c36990f739b62f87df19

branch: impl/igf-grafica-arr-canales-layout-056

## Qué cambió

La tendencia real de rentabilidad IGF pasa de blanco a amarillo sólido `#facc15`. La leyenda usa `bg-yellow-300`. Proyectado sigue en `#fcd34d` punteado. La regresión, `xFirst` y `xLast` no cambian.

Las tarjetas semanales usan `fecha_desde` / `fecha_hasta` sobre los puntos del eje. El grid tiene una columna por punto. El cierre queda en una columna fija de 180 px, fuera de ese grid. B, AF y AE no se recalculan.

Clientes Nuevos y Top 10 nuevos salen del render de este modal. El endpoint y `newClientsPanel` siguen.

La columna derecha monta dos `ArrVentaCanalPanel`: CASA y COMISIONISTA. Ambos llaman `fetchArrVentaSerie` con el rango IGF. El Top 6 es `clientes_top`. Doble clic abre `ArrVentaGraficaModal` con `mode="cliente"`. Un clic no abre. Cerrar el cliente deja el modal IGF montado.

`provincia=1` agrega todas las plantas de `arr.provincia_plants` con el mismo `loadCommercialTrend`. El gate `igfDiarioTodasRequestBlock` corre antes de `pool.connect()`. Sin el flag, la etiqueta Provincia no resuelve una planta.

## Semanas

Septiembre 2026 empieza martes.

| semana | fecha_desde | fecha_hasta | grid |
| --- | --- | --- | --- |
| 1 | 2026-09-01 | 2026-09-06 | columnas 1 a 7 |
| última | 2026-09-28 | 2026-09-30 | 3 columnas, no ocupa el 27 |

Abril 2026 empieza miércoles: 2026-04-01 a 2026-04-05, 5 columnas.

## Cierre

El caso 055 sigue igual: venta 181,000 kg, AF 871,231.5744, AE 4.813434112707182. Provincia TOTAL MES también sigue.

## Provincia

Códigos del resolver de prueba: Puebla y Acapulco. OTRA queda fuera.

Serie del 2026-09-01: 10 + 4 = 14 ton.

Top 6: un solo CLIENTE UNO, actual 14, previo 4. No se concatenan tops por planta.

La gráfica del cliente usa el mismo `cliente_norm` sobre esos códigos: 9 + 5 = 14 ton.

## Intactos

055, 054, 054-R1, 054-R2, 054-R3, 053BC, 053A, 050, 052, 018 y 019 pasan. Delta Ingreso sigue abriendo GRAFICA. El modal ARR de canal conserva Venta CASA / Venta COMISIONISTA. Sin writes nuevos, sin DDL nuevo, sin ExcelJS nuevo y sin OpenAI.

## Desviación

`ArrVentaGraficaModal` no se reescribió encima del panel. Los tests 018 y 019 exigen que el gráfico de cliente, el descuento y el fetch canónico sigan en ese archivo. El panel embedded llama el mismo `fetchArrVentaSerie`.

Cinco pruebas del planner `commercial_trend` ya fallan en la base `cb2a2533`, sin este diff. El motor OLS, el rango y el top-6 de ese archivo sí pasan.
