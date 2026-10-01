# IMPL-IGF-GRAFICA-EJES-TENDENCIA-CIERRE-055

status: DONE_PENDING_REVIEW

base_sha: 8f8bbd79aaafed126449d3090338d1d5a8adf5eb

branch: impl/igf-grafica-ejes-tendencia-cierre-055

## Qué cambió

La gráfica de rentabilidad conserva el pipeline 054-R3. Esta tarea solo agrega lectura:

- Eje Y con ticks que siempre incluyen cero, etiqueta a la izquierda y guía horizontal tenue. La línea de cero existente sigue siendo la única línea de cero y queda más brillante.
- Eje X con como máximo 7 etiquetas. El primer punto y el último siempre entran. Los puntos no se mueven.
- Clientes nuevos conserva las barras y superpone la línea de tendencia semanal: SEM -2, SEM -1 y la suma de los días ya ocurridos.
- `month_close` se calcula con todos los puntos del año/mes seleccionado, antes del filtro de rango. `venta_kg` es la suma de B, `resultado_mxn` es la suma de AF y `resultado_per_kg` es AF/B. No promedia AE ni usa la tendencia.

## Eje Y

| caso | dominio | ticks |
| --- | --- | --- |
| mixto $ | -100 a 300 | -100, 0, 100, 200, 300 |
| solo positivo | 40 a 180 | 0, 50, 100, 150, 200 |
| solo negativo | -220 a -15 | -300, -200, -100, 0 |
| $/kg | -0.44 a 1.59 | -1, 0, 1, 2 |

El modal formatea MXN compacto (`$200k`) y $/kg con dos decimales (`$1.00`). `padL` pasó de 64 a 78.

## Eje X

1M, 30 puntos, 7 labels: `01/09`, `06/09`, `11/09`, `16/09`, `20/09`, `25/09`, `30/09`.

5D: `01/09` a `05/09`.

3M, 7 labels sin repetición: `03 jul`, `18 jul`, `02 ago`, `17 ago`, `31 ago`, `15 sep`, `30 sep`.

## Clientes

Entrada SEM -2 = 10 / 20,000 kg, SEM -1 = 7 / 15,000 kg, Lun 1, Mar 2, Mié 0, Jue 3, sin viernes ni fin de semana.

Tendencia: 10, 7, 6. La semana actual queda `SEM ACTUAL · PARCIAL` con `partial=true`. Mié suma 0 porque ya ocurrió. Los días futuros no se agregan como cero.

## Cierre de planta

Mes septiembre 2026, corte 2026-09-03, cobertura completa. Iguala TOTAL MES del Excel.

| | cierre | TOTAL MES |
| --- | --- | --- |
| B | 181,000 | 181,000 |
| AF | 871,231.5744 | 871,231.5744 |
| AE | 4.813434112707182 | 4.813434112707182 |
| AF real | 40,476.8416 | |
| AF proyectado | 830,754.7328 | |
| complete | true | |
| label | CIERRE PROYECTADO | |

## Provincia

Puebla + Acapulco. El cierre suma el AF diario de Provincia y divide entre el B de Provincia. No promedia AE.

| | cierre | TOTAL MES |
| --- | --- | --- |
| B | 357,000 | 357,000 |
| AF | 1,716,963.1488 | 1,716,963.1488 |
| AE | 4.8094205848739495 | 4.8094205848739495 |
| complete | true | |

## Rango

`loadLiveGrafica` con el mismo year/month/corte/planta y rangos `1m`, `5d` y `3m` devuelve el mismo `month_close`. La cantidad de `points` sí cambia.

## Intactos

054, 054-R1, 054-R2, 054-R3, 053A, 053BC, 050 y 052: 75/75. Línea Real, Proyectado, tendencia real, tooltips, Top 10, Descargar Excel, cobertura vacía y gate Todas siguen en su sitio. La gráfica no escribe, no hace DDL, no carga ExcelJS en runtime y no llama OpenAI.

## Desviación

Las etiquetas de 1M salen del muestreo uniforme (01/06/11/16/20/25/30) y no de la serie ilustrativa 01/05/10/15/20/25/30. El contrato admite esa diferencia. Los ticks de $/kg son cuatro (`-1, 0, 1, 2`) porque el redondeo nice no necesita cinco.
