# FIX-COMPRAS-IMPORTE-POR-VENTA-IGF-PLANTA-046

status: DONE_PENDING_REVIEW

## Qué cambió

En CONTROL DE COMPRAS, COMPRA KG proyectado sigue siendo el promedio de días calendario anteriores al corte. El costo por kilo proyectado es el último costo real del proveedor (`importe real / kilos reales` de la misma fecha anterior), sin redondeo intermedio. El importe proyectado es ese costo por la venta pronosticada del día, en kilos, la misma venta en toneladas que escribe Provincia Venta Diaria multiplicada por 1000. No se multiplica por los kilos de compra. Un importe real capturado prevalece. Sin costo real válido o sin venta pronosticada, el importe queda vacío.

En IGF Diario, los días posteriores al corte conservan la fecha en la columna A y dejan B:AF vacías, sin fórmulas. La primera hoja se reserva para la planta exportada: Puebla sigue en `IGF Diario Puebla` y Querétaro abre en `IGF Diario Querétaro`, con su venta, precio, compras y gastos ARR.

## Verificación

- PEMEX TUXPAN, corte 2026-09-24: el 23/09 conserva 19370 kg e importe 236938.17. El 25/09 y el 26/09 conservan COMPRA KG 38709.1666… y el mismo costo 236938.17/19370. El importe del 25 es ese costo por la venta de ese día (el producto que Excel muestra como $473,499.18). El del 26 es 449819 porque su venta es distinta.
- El 24/09 sin importe real usa la misma regla. Otro proveedor sin costo real queda vacío.
- IGF Diario Puebla y Querétaro, corte 2026-09-24: la fila del 25 deja B y AF vacías. M3 y T3 de Puebla siguen en 1034293 y 2998518. El libro de Querétaro se reabrió con `IGF Diario Querétaro` en primer lugar.
- 117/117 en 046, 045, 044, 043, 042, 041, 040, 039, 038, 037, 036, 030, 026, 024, 022, 021 y 020. `git diff --check` sin hallazgos.

## Límite

ExcelJS no recalcula. El costo 12.232 y el importe $473,499.18 son el formato de celda (`0.000` y `#,##0.00`) sobre el producto exacto. La venta pronosticada solo entra si el libro se genera con la proyección de la planta; un payload de compras sin ese mapa deja el importe proyectado vacío.
