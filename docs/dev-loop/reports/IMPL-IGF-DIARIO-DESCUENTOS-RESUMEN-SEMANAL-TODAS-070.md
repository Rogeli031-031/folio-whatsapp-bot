# IMPL-IGF-DIARIO-DESCUENTOS-RESUMEN-SEMANAL-TODAS-070

status: DONE_PENDING_REVIEW

base_sha: 9b9fa20e6b19279ec6384dfe78f93581e5ed6ecd

product_sha: daa3123b663cdb6de04fb5518b0966dcc46e3022

branch: implementation/igf-diario-descuentos-resumen-semanal-todas-070

## 1. Fuente de descuento/comisión

La columna AK no usa el C&D de planta ni la referencia de 14 días del mismo día de la semana.

Por cliente y fecha:

- kilos: `SUM(arr.ventas_diarias_cliente.kg)`
- monto: `SUM(arr.descuentos_diarios_cliente.monto)`

El $/kg es `monto / kg` solo cuando kg > 0 y el monto es numérico. En la gráfica individual del cliente ese cociente es "Descuento ($/kg)". No hay un segundo campo de comisión. El texto de AK usa las palabras pedidas, "Bajó su comisión" y "Subió su comisión", sobre ese mismo cociente.

No se lee el comentario, ni la tarifa, ni un valor redondeado de una gráfica. El redondeo a 3 decimales es solo para decidir si cambió y para escribir el texto.

## 2. Compra anterior

Compra real = fecha con kg > 0 de ese cliente en la misma planta. La anterior es la fecha previa más reciente con kg > 0, no el día calendario anterior, no la semana fija y no un promedio. Puede cruzar semana y mes.

La consulta no tiene fecha inicial: llega hasta el día elegible del comentario. Así una compra de septiembre sigue siendo la anterior de una compra de octubre aunque el comentario del día solo precargue el mes previo.

Si no hay compra anterior, si falta el monto, o si los dos $/kg quedan iguales a 3 decimales, el cliente no se lista.

## 3. JOSE ALBERTO LAYNES PEREZ

Compra anterior 5.185. Compra actual 4.907.

delta = 4.907 − 5.185 = −0.278

`JOSE ALBERTO LAYNES PEREZ — Bajó su comisión respecto a su última compra de $5.185/kg a $4.907/kg = -$0.278/kg`

El caso inverso, 4.907 a 5.185, dice "Subió su comisión" y el delta es `+$0.278/kg`.

## 4. Rich text

Solo el token final del delta lleva color. Verde `FF15803D` si bajó. Rojo `FFDC2626` si subió. El nombre y el resto quedan sin color. Varios clientes van en líneas separadas, cada una con su propio delta coloreado. La prueba escribe el XLSX y lo vuelve a abrir: el color sigue en el rich text.

COMENTARIO DEL DIA y el bloque COMPRAS no se modifican y no reciben este texto.

## 5. Qué había en AK

En octubre, AK (columna 37) era el auxiliar oculto del arrastre de costo: 0 o 1. AL (38) era el auxiliar oculto del flete. Los ceros de la captura son esas banderas, no una columna libre.

En septiembre, AJ (36) era el auxiliar de costo y AK (37) el de flete. También estaba ocupada.

## 6. Mapa final AH–AM

Septiembre:

- AH 34 COMENTARIO DEL DIA
- AI 35 VENTAS
- AJ 36 auxiliar de costo, oculto
- AK 37 DESCUENTOS, visible
- AL 38 auxiliar de flete, oculto

Octubre:

- AI 35 COMENTARIO DEL DIA
- AJ 36 VENTAS
- AK 37 DESCUENTOS, visible
- AL 38 auxiliar de costo, oculto
- AM 39 auxiliar de flete, oculto

La fórmula amarilla sale de la dirección de la celda auxiliar. Al mover el índice, F sigue en AJ y G pasa a AL en septiembre. En octubre, costo pasa a AL y flete a AM. No quedó una letra AK fija dentro de la fórmula.

## 7. Fórmula de consolidación

`consolidateMetrics` es la única función. La usa la columna RESUMEN SEMANAL, cada día Dom–Sáb y la hoja RESUMEN de Todas, incluida su gráfica.

## 8. Conceptos SUM

Suma de valores numéricos. Un null se omite y no se vuelve 0. Si nadie aporta número, el resultado es null.

- Venta en Kilos
- Ingreso Generado
- HG
- RESULTADO (Importe)

## 9. Conceptos WEIGHTED

`SUM(valor_i * venta_i) / SUM(venta_i)`

- Precio de Venta al Público
- Costo del Gas LP
- Flete Terrestre
- Margen Bruto
- Gasto Corporativo
- Inversiones
- Impuestos Federales
- Margen Neto
- Presupuesto Nómina/Gastos
- Presupuesto IMSS/SUA
- Extraordinarios
- Provisiones de la Planta
- Sobrante de Operación antes del HG
- Sobrante de Operación con el HG
- Comisiones y Descuentos
- RESULTADO ($/kg)

Ejemplo: 100,000 kg a 20.00 y 50,000 kg a 22.00 dan 20.666…, no 21.00.

## 10. Null y cero

Una planta entra al denominador de una métrica solo si su venta es numérica y mayor que 0 y esa métrica es numérica. Venta 0 no mueve el ponderado. Venta null tampoco. Una métrica null no entra ni al numerador ni al denominador de esa métrica, y no se sustituye por cero. Otra métrica de la misma planta sí puede entrar.

RESULTADO ($/kg) ponderado coincide con `SUM(RESULTADO Importe) / SUM(Venta kg)` cuando cada planta incluida tiene `resultado_kg = resultado_mxn / venta`. Eso es lo que ya escribe la semana de una planta completa. Si una planta tiene venta y su resultado es null, el ponderado la deja fuera y la suma de importe tampoco la suma; la venta sí entra en el total de kilos. Las dos expresiones dejan de ser iguales por esa regla de elegibilidad. No se creó una tercera fórmula.

La columna Semana consolida las métricas semanales de las plantas. No promedia las siete celdas diarias.

## 11. RESUMEN Excel de Todas

La exportación Todas reserva la hoja RESUMEN y la deja primera, sin reordenar las hojas IGF entre sí. El título es TODAS CONSOLIDADO. Cada día y la columna Semana salen del mismo `resumen` que arma `loadWeeklyAll`.

La exportación de una planta sigue abriendo el RESUMEN de esa planta. No usa el consolidado.

## 12. Gráfica

`fillResumen` dibuja `days[].metrics` del mismo objeto. Se mantienen las etiquetas numéricas, verde positivo, rojo negativo, línea cero, real continuo, proyectado punteado, null como hueco y `summary_metric`.

## 13. Pruebas

`test/impl-igf-diario-descuentos-resumen-semanal-todas-070.test.js` cubre el ejemplo JOSE, el alza roja, el cruce de semana y de mes, el rich text reabierto, el desplazamiento AK/AL/AM, la ponderación, el null, la venta 0 y la hoja RESUMEN.

Regresión ejecutada, 123 pruebas en verde: 070, 069-R2, 069-R1, 069, 068-R2, 068-R1, 068, 067, 066-R1, 066, 065-R1, 065, 064-R1, 064, 053BC, 043 y 042.

`node --check server.js` limpio. `npm run build` del frontend terminó en 0. El enlace standalone de `.next` repite el EPERM conocido de la unión `node_modules`; el build igual cierra en 0. `git diff --check` limpio. `.next` no se commitea.

## 14. SHA producto

daa3123b663cdb6de04fb5518b0966dcc46e3022

## 15. SHA final

El commit documental que agrega este reporte y deja `CURRENT_TASK.md` en DONE_PENDING_REVIEW. Es el HEAD de `implementation/igf-diario-descuentos-resumen-semanal-todas-070` después de ese commit.

## Archivos

- lib/igf-diario-descuentos-columna.js
- lib/igf-diario-puebla.js
- lib/igf-diario-expense-excel.js
- lib/igf-diario-weekly-plant.js
- lib/dashboard-arr-forecast.js
- server.js
- frontend-dashboard/components/IgfDiarioWeeklyAllPlantsPanel.tsx
- frontend-dashboard/lib/api.ts
- test/impl-igf-diario-descuentos-resumen-semanal-todas-070.test.js
- test/igf-diario-comentario-ventas-053bc.test.js
- test/igf-diario-desglose-gastos-064.test.js
- test/igf-diario-puebla-042.test.js
- test/igf-diario-puebla-043.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/IMPL-IGF-DIARIO-DESCUENTOS-RESUMEN-SEMANAL-TODAS-070.md
