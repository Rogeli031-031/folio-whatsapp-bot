# FIX-IGF-DIARIO-UNA-HOJA-POR-PLANTA-047

status: DONE_PENDING_REVIEW

## Qué cambió

Reservar `IGF Diario Queretaro` y luego llenar con el nombre `Querétaro` ya no crea una segunda hoja. La búsqueda ignora el acento y escribe en la hoja que ya existe. Esa hoja queda primera y trae venta, precio y gastos. La reserva y el llenado del Excel usan el mismo código de planta. Puebla sigue con una sola hoja, `IGF Diario Puebla`. El importe proyectado de CONTROL DE COMPRAS no cambió.

## Verificación

- Reserva con `Queretaro` y llenado con `Querétaro`: una sola hoja, `IGF Diario Queretaro`, en primer lugar. Gastos 800 y 900. Con corte 2026-09-24, la fila del 25 deja B y AF vacías. El archivo se reabrió igual.
- Puebla: una sola hoja `IGF Diario Puebla`, con 1034293 y 2998518.
- 119/119 en 047, 046, 045, 044, 043, 042, 041, 040, 039, 038, 037, 036, 030, 026, 024, 022, 021 y 020. `git diff --check` sin hallazgos.

## Límite

La 046 no se fusiona. Esta rama sale de `4182e0a3` y no entra a `main`.
