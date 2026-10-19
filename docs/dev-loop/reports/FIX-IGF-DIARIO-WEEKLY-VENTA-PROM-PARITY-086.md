# FIX-IGF-DIARIO-WEEKLY-VENTA-PROM-PARITY-086

status: DONE_PENDING_REVIEW

base_sha: 14afd8b0b9deda77e9be1de8083e78995144880f
branch: fix/igf-diario-weekly-venta-prom-parity-086
product_sha: 95195aac073d3247fb8b690ddd1f5540489ddf5f

## Qué cambió

Desde la fecha de corte inclusive, la Venta en Kilos del IGF Diario semanal toma `promVentaTotal` del paquete de Pronóstico ya cargado y lo pasa a kilos. Antes del corte, la venta queda como la resuelve hoy el mes materializado.

`loadMonthBundle` marca solo el mes abierto. `daysFromBuilt` aplica `applyWeeklyProjectedTotalSale` antes de devolver ese mes. Casa, Comisionista y el resto de los campos no se tocan. Si el PROM Total falta o no es finito, `ventaKg` queda null. El cero explícito sigue siendo 0 kg.

## Pruebas

- 086: 10/10
- 067: pass
- 074: pass. `resolveCanalTon` sigue priorizando la captura en el día de corte fuera de esta sustitución.
- 077: pass
- 069: el archivo de TODAS ya contiene el botón «Gráfica» de 085. Esa aserción falla en la base autorizada. 086 no modifica frontend.

`node --check lib/igf-diario-weekly-plant.js` salió en 0. No hubo build de frontend.

## Límites

No hay query nueva, hardcode de planta ni de fecha. No hay PR, merge, deploy ni escrituras a la base.

## Cierre humano para apertura de 087
CLOSED_BY_HUMAN: Luis rogelio Zaragoza alvarez 2026-10-19
