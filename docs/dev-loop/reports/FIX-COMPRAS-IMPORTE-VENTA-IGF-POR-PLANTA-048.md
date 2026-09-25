# FIX-COMPRAS-IMPORTE-VENTA-IGF-POR-PLANTA-048

status: DONE_PENDING_REVIEW

## Qué cambió

La rama sale de `main` en `d64d98fa`. `4182e0a3` no es ancestro. No hubo cherry-pick de la 046.

En CONTROL DE COMPRAS, COMPRA KG sigue el promedio calendario. El costo proyectado es el último costo real por kilo. El importe proyectado es ese costo por la venta pronosticada del día, en kilos. Sin costo real o sin venta, el importe queda vacío. Un importe real prevalece. La compra real del corte actualiza el costo de los días siguientes.

IGF Diario se reserva con el código de la planta y reutiliza la identidad de la 047. El encabezado usa el nombre humano. Los canales se eligen con `plantsEquivalent`. Los gastos salen del mini de esa planta. Sin planta no se crea la hoja. El corte de la 045 se conserva.

## Aserciones ajustadas

- `030`: sin mapa de venta, el importe proyectado queda vacío. Antes era el promedio calendario del importe.
- `045`: la prueba ahora pasa la venta del día. Si esa venta es igual a los kilos proyectados, el importe coincide con el producto anterior.
- `036`: la hoja se reserva para cualquier planta exportada, no solo Puebla. El libro sin planta sigue sin reservarla. Los gastos del mini se buscan por la planta pedida.

## Verificación

- PEMEX, corte 2026-09-24: 23/09 conserva 19370 kg y 236938.17. El 25 y el 26 conservan COMPRA KG 38709.1666… y el costo 236938.17/19370. El importe del 25 es ese costo por esa venta (Excel lo muestra como $473,499.18). El del 26 es 449819.
- Puebla: una hoja `IGF Diario Puebla`, primera, `PLANTA PUEBLA`, gastos 1034293 y 2998518. El 25 deja B y AF vacías.
- Código `Queretaro` y nombre `Querétaro`: una hoja `IGF Diario Queretaro`, `PLANTA QUERÉTARO`, gastos 800 y 900, venta de Querétaro. Al reabrir sigue una sola hoja.
- Acapulco: una hoja `IGF Diario Acapulco`, con su venta y sus gastos.
- 120/120 entre 048, 047, 045, 044–036, 030, 026, 024, 022, 021 y 020. `git diff --check` sin hallazgos.
