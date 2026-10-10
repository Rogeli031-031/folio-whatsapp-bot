# AUDIT-IGF-DIARIO-SAN-LUIS-0410-RUNTIME-073

status: DONE_PENDING_REVIEW

mode: READ_ONLY

sha_live: 5de98adc664185351afe0c69e29222903ba2b47e

servicio: folio-whatsapp-bot

base: folios-db

planta: San Luis

planta_id: 5

clave: SANLUIS

provincia_plant_code: San Luis

## Runtime

`origin/main` sigue en `5de98adc664185351afe0c69e29222903ba2b47e`. Ese es el SHA desplegado en `folio-whatsapp-bot`. La conexión de lectura respondió. No hubo INSERT, UPDATE, DELETE ni DDL.

`arr.upload_log` no tiene filas. El corte no sale de una carga guardada. El endpoint semanal usa el `upload_day` que manda el cliente.

La semana visible, 128,462 kg, y el domingo en blanco coinciden con corte `2026-10-08` y también con corte `2026-10-09`. Las dos fechas dejan el 04/10 antes del corte y producen la misma suma. La última venta capturada de San Luis en octubre es `2026-10-08`.

## Fuentes

| Pieza | Fuente |
| --- | --- |
| Total Provincia Venta Diaria | `arr.venta_toneladas_diarias_provincia.venta_ton`. Si el mes entero está vacío, el fallback es `ROUND(SUM(arr.ventas_diarias_cliente.kg)/1000, 0)`. |
| Captura Casa y Comisionista | `arr.ventas_diarias_cliente`, agrupada por `SQL_VENTAS_PLANTA`. `canalTonMaps` parte el kg con `canonicalArrCanal`. |
| Forecast Casa y Comisionista | Promedio por día de semana de `computePromMesByDow` sobre el lookback de 28 días hasta el corte. Lo lee `weekdayPromAt`. No es una fila de forecast del 04/10. |
| `resolveCanalTon` | `lib/dashboard-arr-forecast.js`. En la fecha de corte: captura válida, luego pronóstico, luego null. Antes y después conserva la regla anterior. |
| `materializePlantMonth` | `lib/igf-diario-grafica.js`. Venta KG solo si Casa y Comisionista son números: `(casa + comisionista) * 1000`. |
| IGF Diario semanal | `GET /api/dashboard/igf-diario-semanal`. `loadMonthBundle` arma el mes y `aggregateWeek` suma los días con venta numérica. |

## Tabla del 04/10/2026

Corte efectivo de la pantalla: `2026-10-08` o `2026-10-09`. El 04/10 es anterior a ese corte.

| Campo | Fuente | Valor bruto | Valor normalizado | Resultado |
| --- | --- | --- | --- | --- |
| Total planta | `venta_toneladas_diarias_provincia` | sin fila del 01/10 al 10/10 | null | no hay 2.000 t guardadas |
| Casa captura | 3 filas `canal = Casa` | 976.86 + 336.42 + 387.72 = 1701.0000 kg | 1.701 t | captura válida |
| Comisionista captura | `ventas_diarias_cliente` | sin filas | null | no es 0 |
| Casa forecast | prom domingo, corte 08/10 | 1.56 | 1.56 t | no se usa: la captura real gana y el día es anterior al corte |
| Comisionista forecast | prom domingo, índice 6 | `""` | null | no hay pronóstico aplicable |
| Casa resolved | `resolveCanalTon` | 1.701 | 1.701 t | 1.701 |
| Comisionista resolved | `resolveCanalTon` | null | null | null |
| Venta KG | ambos canales numéricos | Casa numérica y Comisionista null | null | null |
| Precio | `arr.precio_diario` | 21.1269958848 | 21.13 | existe |
| Costo | compra del 04/10 | null | 11.610643796802265 arrastrado del 03/10 | 11.61 |
| Flete | compra del 04/10 | null | 1.1106941914592188 arrastrado del 03/10 | 1.11 |
| Margen bruto | precio − costo − flete | 8.4056578965 | 8.41 | no usa la venta |
| HG | compra del día | -2747.736 | -2747.74 | no usa la venta |

Clientes de las tres filas Casa: ARISTA VENTA PUBLICO GENERAL 976.86 kg, RAYON VENTA PUBLICO GENERAL 336.42 kg, VILLA HIDALGO VENTA PUBLICO GENERAL 387.72 kg.

## Las 2.000 t

Producción no tiene 2.000 t para San Luis el 04/10. La tabla de toneladas del 01/10 al 10/10 está vacía para esa planta. La única venta capturada es 1,701 kg de Casa, o sea 1.701 t. No hay Comisionista que sume la diferencia. Casa + Comisionista no es el total de planta: el total de planta no existe ese día y el contrato de Venta KG no lo lee.

## Por qué el domingo sale en blanco

Con corte 08/10 o 09/10:

```
Casa = 1.701
Comisionista = null
```

`materializePlantMonth` hace:

```
ventaKg = ambos números ? (casa + comisionista) * 1000 : null
```

El resultado reproducido es `ventaKg = null`.

072 no interviene. Esa regla de la fecha de corte solo corre cuando la fecha es exactamente el corte. El 04/10 es anterior.

Antes del corte, un canal sin captura puede tomar el pronóstico del día de semana. El pronóstico de Comisionista para domingo, con ese corte, es null. El canal se queda null.

Si el corte fuera el propio 04/10, el pronóstico de Comisionista domingo sí existe y vale 15.55 t. La venta quedaría en 17,251 kg. Eso no es 2,000 kg y no es la pantalla actual. La semana con ese corte suma 213,881 kg, no 128,462.

## Semana 41

Con corte 08/10 o 09/10, `aggregateWeek` devuelve 128,461.74 kg. La pantalla lo muestra como 128,462.

| Fecha | Venta KG | Origen |
| --- | --- | --- |
| 04/10 | null | Casa real, Comisionista ausente, sin pronóstico de domingo |
| 05/10 | 16,585.10 | captura de los dos canales |
| 06/10 | 19,285.86 | captura de los dos canales |
| 07/10 | 11,057.64 | captura de los dos canales |
| 08/10 | 28,843.14 | captura de los dos canales |
| 09/10 | 22,960 | pronóstico; no hay captura |
| 10/10 | 29,730 | pronóstico; no hay captura |

El domingo null no entra a la suma. Es el comportamiento de 069-R1.

## 0 y null

Del 01/09 al 10/10 no hay filas de San Luis con `kg = 0`. La ausencia es falta de filas, no un cero capturado.

El mismo patrón, solo Casa, aparece el 20/09 (1,803.06 kg) y el 27/09 (1,423.44 kg). El 06/09, 07/09 y 13/09 sí tienen los dos canales. El blanco no se está convirtiendo en cero.

## Precio, costo, flete, margen y HG

Esas cifras no pasan por el `AND` de los canales.

El precio sale de `arr.precio_diario`. El costo y el flete del 04/10 no tienen compra propia. Como el día es anterior al corte, `resolveCarry` arrastra el último valor distinto de cero, que es el 03/10. El margen es `precio - costo - flete` y no divide entre la venta. El HG del día es el importe `-2747.736`. Ingreso y resultado sí se anulan porque multiplican o dependen de Venta KG.

## Clasificación

MIXED.

DATA: el 04/10 no tiene captura de Comisionista. Tampoco hay una fila de 2.000 t.

CONTRACT: Venta KG exige los dos canales. Un null anula el día. 072 no reescribe los días anteriores al corte, y este domingo es anterior al corte que produce los 128,462 kg.

CODE: no descarta una captura de Comisionista. Esa captura no está. La Casa de 1.701 t sí queda resuelta.

## Siguiente cambio, sin implementarlo

No convertir el null en 0. No sustituir el `AND` por un `OR` sin una decisión de negocio. No copiar una columna total que en producción no trae 2.000 t. No mover el corte al 04/10 para “arreglar” el domingo: eso metería 15.55 t de pronóstico de Comisionista y la venta pasaría a 17,251 kg.

La decisión pendiente es si un día con un solo canal debe publicar los kilos de ese canal. Hoy el contrato dice que no.
