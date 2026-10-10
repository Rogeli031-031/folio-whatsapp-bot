# AUDIT-IGF-DIARIO-WEEKLY-FINANCIAL-COVERAGE-076

Auditoría de solo lectura. Sin cambio de producto, sin tests, sin escritura en base de datos, sin PR funcional, sin merge y sin deploy. La decisión 075 se mantiene: el 04/10 diario sigue con `com_desc_kg`, `resultado_kg` y `resultado_mxn` en null. La ausencia de tasa no es cero.

## Base

- `origin/main`: `f6dbbe76021ce52f8f2559836239a95f415c2615`
- Rama: `audit/igf-diario-weekly-financial-coverage-076`
- Código auditado: `lib/igf-diario-weekly-plant.js`, `lib/igf-diario-weekly-excel.js`, `lib/dashboard-arr-forecast.js`, `server.js`, `frontend-dashboard/components/IgfDiarioWeeklyPlantPanel.tsx`
- Contrato previo: `docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-COVERAGE-RESUMEN-5D-069-R1.md` y `test/fix-igf-diario-weekly-coverage-resumen-5d-069-r1.test.js`
- La reproducción llamó `loadWeeklyPlant` y `loadWeeklyAll` sobre producción con la transacción en solo lectura. No se envió DDL ni DML.

## Corte usado

`arr.upload_log` no tiene filas para 2026-09 ni 2026-10. Con `corteYmd` vacío el runtime no reproduce la pantalla: la venta de la semana sale 0.

La pantalla autenticada (1,701 kg el domingo y 130,162.74 kg en la semana) se reproduce con corte `2026-10-08` y con corte `2026-10-09`. En ambos el domingo es real, su venta es 1,701 y las tres métricas semanales salen null.

Esta auditoría usa **corte 2026-10-09**. Con ese corte, del 04 al 08 son reales y el 09 y el 10 son proyectados. El 08 conserva la tasa capturada -3.95. Con corte `2026-10-08` el 08 pasa a proyectado, su tasa pasa a -4.10 y la semana sigue null. La cobertura parcial de ese corte alterno queda anotada al final.

## Contrato semanal actual

Helpers reales en `lib/igf-diario-weekly-plant.js`. `finite` acepta 0. Null y cadena vacía quedan null.

| Métrica | Fórmula | Null | Cero | Venta 0 o sin venta |
| --- | --- | --- | --- | --- |
| `venta_kg` | `sumKnown` de `ventaKg` | se omite | entra a la suma | el 0 entra; el null se omite |
| `precio_kg` | ingreso cubierto / venta | null si falta ingreso de un día con venta > 0 | el precio 0 es finito | no pondera |
| `ingreso_mxn` | `sumCovered` de `precio * venta` solo en venta > 0 | un día con venta y sin precio anula la semana | 0 es número | un día sin venta no anula |
| `costo_kg`, `flete_kg` | `weighted`: suma(métrica × venta) / suma(venta) en venta > 0 | si un día con venta > 0 trae null, la métrica semanal queda null | 0 pondera | venta 0 o null no entra y no anula |
| `margen_kg` | precio − costo − flete | null si falta uno | calcula con ceros | — |
| gastos y margen neto | dinero del componente / venta | un gasto null en un día con venta > 0 anula ese componente | 0 es dinero | un día sin venta se omite |
| HG importe | `sumKnown` | se omite | entra | — |
| `sobrante_con_hg_kg` | sobrante antes − HG/kg | null si falta una pata | calcula | — |
| `com_desc_kg` | `weighted` de `cdKg` | un día con venta > 0 y tasa null anula la semana | la tasa 0 pondera | sin venta positiva no entra |
| `resultado_mxn` | `sumCovered` de `dayResultMxn` en venta > 0 | un día con venta y resultado null anula la semana | 0 entra | sin venta positiva no entra |
| `resultado_kg` | si hay importe y venta > 0: importe / venta de toda la semana. Si no, sobrante con HG + comisión, solo cuando ambos existen | null si falta el importe o la comisión | 0 es número | — |

`dayResultMxn` existe solo si venta, precio, costo, flete, HG, `cdKg` y los siete gastos son finitos:

`(precio − costo − flete) × venta − suma(gastos) − HG + cdKg × venta`

`materializePlantMonth` resuelve cada día antes de agregar. La semana no vuelve a leer canales ni descuentos.

## Relación con 069-R1

069-R1 reemplazó `sumOf`, que anulaba la semana ante cualquier null, por tres helpers:

- `sumKnown` omite null. Lo usan venta y HG importe.
- `weighted` omite los días sin venta positiva y aborta si un día con venta > 0 trae la métrica en null.
- `sumCovered` suma solo días con venta > 0 y aborta si uno de esos días trae null.

El reporte de 069-R1, secciones 4 y 5, lo dice en contrato: un día sin venta no invalida el ponderado; un día con venta positiva y sin la métrica sí deja null la métrica semanal; un día con venta positiva y resultado incompleto deja null el Resultado Importe. El test lo fija: un día con `cdKg` null produce `resultado_mxn` semanal null.

No es un helper accidental ni un hueco de 069-R1. Es la rama que 069-R1 escribió para el día que sí tiene venta. Antes de 074 el domingo tenía venta null, no entraba a esa rama y no anulaba la semana. 074 dejó la venta en 1,701. El mismo helper ahora sí entra al domingo y aborta.

## Semana 41, San Luis, corte 2026-10-09

Valores internos del runtime. La pantalla redondea kilos a entero y dinero a dos decimales.

| Fecha | Estado | Venta KG | com_desc_kg | Sobrante con HG | resultado_kg | resultado_mxn | Completo |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2026-10-04 | real | 1,701 | null | 10.021022975903595 | null | null | no |
| 2026-10-05 | real | 16,585.100000000002 | -3.86 | 4.257101085660512 | 0.39710108566051233 | 6,585.961215788164 | sí |
| 2026-10-06 | real | 19,285.86 | -4.08 | 1.6411460246867429 | -2.4388539753132576 | -47,035.396328334944 | sí |
| 2026-10-07 | real | 11,057.64 | -3.37 | -3.0120209111316494 | -6.38202091113165 | -70,570.08970776577 | sí |
| 2026-10-08 | real | 28,843.14 | -3.95 | 4.0531430876439245 | 0.10314308764392376 | 2,974.970516945963 | sí |
| 2026-10-09 | proyectado | 22,960 | -4.07 | 2.9030671597719206 | -1.1669328402280807 | -26,792.778011636736 | sí |
| 2026-10-10 | proyectado | 29,730 | -4.30 | 3.911162542937308 | -0.38883745706269274 | -11,560.137598473855 | sí |

El 04/10 no se rellena. Su ingreso interno es 35,937.0200000448, el margen 8.405657896538516 y el HG -2,747.736. Coinciden con la pantalla.

## Cadena del null

```text
04/10 cdKg null
    → dayResultMxn null, porque exige tasa finita
    → día com_desc_kg, resultado_mxn y resultado_kg null
    → weighted aborta com_desc_kg semanal en el primer día con venta
    → sumCovered aborta resultado_mxn semanal en ese mismo día
    → resultado_kg semanal queda null
```

`resultado_mxn` semanal no se calcula a partir de `com_desc_kg` semanal. Los dos leen el día incompleto. `resultado_kg` semanal usa sobrante + comisión y, si el importe existe, lo reemplaza por importe / venta total. Como el importe semanal es null, el reemplazo no ocurre.

`weighted` es el primer helper semanal que ve el null. `sumKnown` de la venta no aborta: por eso la venta semanal sí existe.

## Escenario A — contrato actual

Con corte 2026-10-09:

- `com_desc_kg` semanal = null
- `resultado_kg` semanal = null
- `resultado_mxn` semanal = null
- `missing_components` = exactamente esas tres claves
- `venta_kg` semanal = 130,162.74

La pantalla muestra 130,163 porque el kilo semanal se redondea a entero.

## Escenario B — cobertura parcial, sin escribir código

El 04/10 diario permanece null. La fórmula parcial es la del helper actual, saltando el día incompleto en vez de abortar. El denominador son los kilos de los días que sí entran, no los kilos de la semana.

Días incluidos: venta > 0 y métrica numérica. Entran el 05, 06, 07, 08, 09 y 10. El 09 y el 10 entran porque el contrato actual sí usa un proyectado cuando el número existe.

- `com_desc_kg` = -515,185.6446 / 128,461.74 = **-4.010420881734904**
- `resultado_mxn` = suma de los seis importes = **-146,397.4699134772**
- `resultado_kg` = -146,397.4699134772 / 128,461.74 = **-1.1396192353729382**

Dividir ese importe entre los 130,162.74 kg de la semana daría -1.1247263995324406. Esa división imputa resultado a los 1,701 kg desconocidos. No es el escenario B.

Si además se dejaran fuera los proyectados, quedarían solo 75,771.74 kg reales: comisión -3.8787474670635778, importe -108,044.55430336659 y resultado -1.4259215151106017. Eso ya no es el contrato actual; es un filtro extra de real contra proyectado.

## Cobertura

Días con venta: 7. Días financieramente completos: 6. Cobertura por días: **6/7 = 85.71428571428571%**.

Kilos de la semana: **130,162.74**. Kilos con resultado numérico: **128,461.74**. Cobertura por kilos: **98.69317440613189%**.

Los 1,701 kg del domingo son **1.306825593868107%** de la semana.

La cobertura por kilos no es 6/7. El domingo es poco volumen. Además, de los 128,461.74 kg cubiertos, 75,771.74 son reales (58.213080% de la semana) y 52,690 son proyectados (40.480094% de la semana, 41.016103% de lo cubierto). Decir 98.69% no significa que el 98.69% sea venta ya capturada.

## Real, proyectado y desconocido

| Fecha | Clase con corte 2026-10-09 |
| --- | --- |
| 04/10 | real incompleto / desconocido |
| 05/10–08/10 | real completo |
| 09/10–10/10 | proyectado completo |

Una implementación futura tiene que distinguir esas cuatro clases. Un proyectado completo no es un real completo.

## Otros casos, 2026-09-01 a 2026-10-10

Días con kilos capturados y sin filas de descuento, todas las plantas:

| Planta | Fecha | Kg capturados |
| --- | --- | ---: |
| San Luis | 2026-09-27 | 1,423.4400 |
| San Luis | 2026-10-04 | 1,701.0000 |
| Puebla | 2026-10-09 | 6,191.1000 |

Con corte 2026-10-09, Puebla el 09/10 es proyectado y su semana 41 sí tiene comisión y resultado. No anula el consolidado.

San Luis, semana 27/09–03/10, corte 2026-09-30: el 27/09 queda en 1,423.44 kg y `com_desc_kg` null. Esa semana también deja null la comisión y el resultado. Es el mismo mecanismo, no otro bug.

En la semana 41 y en esa ventana, los días que anulan son dos, los dos de San Luis. Las otras cinco plantas de la semana 41 no tienen un día con venta y sin tasa. Es recurrente en los domingos cortos de San Luis y excepcional en el resto de la provincia.

## Todas, Provincia, Excel y gráfica

`loadWeeklyAll` arma el resumen `TODAS CONSOLIDADO` con `consolidateMetrics`. No hay un segundo agregador de Provincia: Todas es ese resumen. El Excel sin planta usa el mismo objeto. El Excel de una planta usa `loadWeeklyPlant`.

Para unidades `kg` y `mxn`, el consolidado suma los números y omite null. Para $/kg, pondera las plantas que tienen venta > 0 y métrica numérica, y omite la planta cuya métrica es null.

Semana 41, corte 2026-10-09:

| Planta | Venta KG | com_desc_kg | resultado_kg | resultado_mxn |
| --- | ---: | ---: | ---: | ---: |
| GT Puebla | 198,392.58000000002 | -4.091834660348688 | -1.2287265978966393 | -243,770.23987133687 |
| Tehuacan | 189,485.24 | -4.018263004548533 | 0.09889690675844724 | 18,739.504112381997 |
| Acapulco | 295,901.08 | -0.13795262051764048 | 0.011835445398274188 | 3,502.1210756303626 |
| GTM Queretaro | 165,750.47999999998 | -4.547602906489321 | 0.12669906475538997 | 21,000.43079875697 |
| GTM San Luis | 130,162.74 | null | null | null |
| Morelos | 258,700.61000000002 | -3.9876279124351504 | 0.22602904365512322 | 58,473.851471297006 |
| TODAS | 1,238,392.73 | -3.0673963555164216 | -0.12818127437001642 | -142,054.33241327055 |

Un null de San Luis no anula Todas. El importe de Todas es la suma de las otras cinco plantas. El resultado por kilo de Todas es ese importe dividido entre 1,108,229.99 kg, que es la venta de Todas menos San Luis. La venta de Todas sí incluye los 130,162.74 kg de San Luis. El consolidado enseña todos los kilos y un resultado que no los cubre, sin decirlo.

El Excel individual de San Luis escribe la columna Semana en —. La gráfica semanal dibuja cada día y abre un hueco donde el día es null. No convierte el hueco en cero y no borra los otros días. El letrero `Faltantes` sale de `missing_components` de la semana de la planta.

## Riesgo de sesgo

El resultado parcial describe 128,461.74 kg. No describe los 1,701 kg del domingo. El domingo tiene sobrante con HG +10.021 y una tasa desconocida.

Si esa tasa se pareciera a las vecinas, cerca de -4, el resultado del domingo quedaría positivo y sacarlo haría ver la semana peor de lo que sería con esa tasa. Si la tasa desconocida fuera mucho más negativa que el sobrante, sacarlo haría ver la semana mejor. Las dos direcciones son posibles. Por eso una cobertura parcial tiene que publicar kilos cubiertos, kilos totales y el porcentaje, y no presentar el número como el resultado de la semana completa.

El corte alterno `2026-10-08` no cambia el escenario A: las tres métricas siguen null y los kilos siguen 130,162.74. Cambia el 08 a proyectado. Su parcial sería comisión -4.044099944465955, importe -150,799.8285234624 y resultado -1.1738890390513346 sobre los mismos 128,461.74 kg.

## Opciones

**A — estricta.** Un día incompleto deja null la semana financiera. Es el contrato vigente. Conserva la integridad: no hay un resultado que finja cubrir kilos desconocidos. Después de 074 esconde seis días ya numéricos y el 98.69317440613189% de los kilos.

**B — cobertura parcial explícita.** El día incompleto sigue null. La semana usa solo días con venta > 0 y métrica numérica. Publica el resultado cubierto, los kilos cubiertos, los kilos totales y el porcentaje. No reparte ese resultado sobre los kilos desconocidos.

**C — imputación.** Rellenar el domingo con forecast, promedio o última tasa. 075 ya cerró que la ausencia es desconocido. Inventar la tasa fabricaría el resultado del domingo y el de la semana.

## Recomendación

**B.**

1. Integridad: no se asigna resultado a los 1,701 kg sin tasa.
2. Exactitud: el ponderado y la suma ya son esas fórmulas; hoy abortan en vez de limitar el denominador. El importe parcial es suma de importes completos. El $/kg parcial es ese importe entre los kilos de esos mismos días.
3. Utilidad: la pantalla deja en blanco una semana cuyo único hueco es el 1.306825593868107% de los kilos, mientras Todas ya omite a San Luis sin decirlo.

Contrato sugerido para una tarea futura, sin implementarlo aquí:

- El día con venta > 0 y sin tasa sigue null en `com_desc_kg`, `resultado_kg` y `resultado_mxn`. El 0 explícito sigue siendo número.
- `com_desc_kg` semanal = suma(`cdKg` × venta) / suma(venta), solo en días con venta > 0 y `cdKg` finito. El denominador es esa suma, no la venta de la semana.
- `resultado_mxn` semanal = suma de `dayResultMxn` de los días con venta > 0 y resultado finito. No se multiplica por los kilos totales.
- `resultado_kg` semanal = ese importe / los kilos de esos mismos días. La identidad importe / venta total queda solo cuando todos los días con venta > 0 están completos.
- Un día sin venta positiva no entra y no anula.
- Junto al número: días completos, días con venta, kilos cubiertos, kilos totales, porcentaje de días y porcentaje de kilos. Dentro de los kilos cubiertos, separar reales y proyectados.
- Los proyectados con número siguen entrando, igual que hoy cuando no hay null, y se etiquetan como proyectados.
- En Todas, la venta que acompaña al resultado no debe incluir los kilos de una planta cuyo resultado fue omitido. El resumen debe mostrar esa planta como no cubierta.
- No usar forecast, promedio ni última tasa para el día desconocido.

## Clasificación

**EXPECTED_BY_CONTRACT.**

069-R1 escribió y probó que un día con venta positiva y resultado incompleto anula la semana. El código de `weighted` y `sumCovered` hace eso. No descarta una tasa capturada. El costo ejecutivo apareció cuando 074 convirtió el domingo en venta positiva. Cambiarlo es un contrato nuevo, no una corrección de un cálculo equivocado.
