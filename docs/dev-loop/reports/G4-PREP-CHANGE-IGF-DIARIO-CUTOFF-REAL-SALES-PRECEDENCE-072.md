# G4-PREP-CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072

status: DONE_PENDING_REVIEW

## Base

origin/main: ad8a8ba8e00557993a8da62f735f9fe6ee020ada

merge-base: ad8a8ba8e00557993a8da62f735f9fe6ee020ada

ahead/behind antes de este G4: 2 / 0

working tree limpio en `change/igf-diario-cutoff-real-sales-precedence-072`

producto: 3f2e41cff5ede48449a952a5eb7b19db4374b8c2

documental: 73156c80355c9cf862fd1bcdfd647c2570ab23ca

El producto es ancestro del documental. Este commit G4 es solo documentación.

## Commits exclusivos antes del G4

- 3f2e41cff5ede48449a952a5eb7b19db4374b8c2 CHANGE 072: conservar la venta real en la fecha de corte
- 73156c80355c9cf862fd1bcdfd647c2570ab23ca docs: anota el SHA de CHANGE 072

## Auditoría producto → documental

`3f2e41cf..73156c80` contiene solo:

- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072.md

No hay producto ni tests en ese rango.

## Archivos de origin/main...HEAD

Funcional:

- lib/dashboard-arr-forecast.js

Tests:

- test/change-igf-diario-cutoff-real-sales-precedence-072.test.js
- test/igf-diario-grafica-corte-cd-clientes-054-r2.test.js
- test/igf-diario-grafica-produccion-coverage-054-r3.test.js

Documentación:

- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072.md
- docs/dev-loop/reports/G4-PREP-CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072.md

El diff de producto agrega `finiteCanalTon` y una rama de igualdad dentro de `resolveCanalTon`. No toca resumen semanal, gráfica, descuentos, comentarios, compras ni frontend.

## Contrato 054-R2 anterior

En la fecha de corte, `fecha >= corte` entraba a la rama proyectada. El pronóstico sustituía la captura. Sin pronóstico, el canal quedaba null y la captura se perdía.

La prueba anterior exigía Casa 4 t → 10.25 t de pronóstico y, sin pronóstico, null. B del corte era 30,750 kg.

## Contrato 072

Antes del corte: sin cambio. La captura numérica se conserva, incluido 0. Si la captura falta, sigue el relleno por pronóstico que ya existía.

Fecha exacta de corte, por canal: captura válida, si falta pronóstico válido, si falta null.

Después del corte: sin cambio. Si hay pronóstico, gana el pronóstico aunque exista captura. Si no hay pronóstico, el canal sigue en 0 por `projectedCanalValue`.

## Fecha menor, igual y mayor

La igualdad `ymd === corte` retorna antes de `canalIsAfterCutoff`. Esa función sigue usando `fecha >= corte` para el día posterior y para el color de celda. El día de corte ya no entra a la rama que descarta la captura.

Prueba A: 2026-10-03 con captura 4 y pronóstico 9 devuelve 4. Sin captura, devuelve 9.

Prueba G: 2026-10-05 con captura 1.2 y pronóstico 0.8 devuelve 0.8. Sin pronóstico, devuelve 0. El día materializado con captura 1.2 y 0.4 y pronóstico 0.3 y 0.5 queda en 800 kg.

054-R2 prueba 1: el 2026-09-04 con captura 99 y pronóstico 8 devuelve 8. Sin pronóstico, devuelve 0. La prueba 6 mantiene B del día posterior en 12,000 kg de pronóstico.

## Resolución por canal

`materializePlantMonth` llama `resolveCanalTon` una vez para Casa y otra para Comisionista. `writeCanalPairCells` hace lo mismo. Venta KG sigue siendo `(casa + comisionista) * 1000` solo cuando ambos son números.

La matriz de pruebas cubre real+real, real+pronóstico, pronóstico+real y pronóstico+pronóstico. Si un canal no tiene ni captura ni pronóstico, queda null y Venta KG queda null. No se rellena desde el total de planta.

## 0 y null

`finiteCanalTon` trata `null`, `""` y no finito como ausencia. `Number.isFinite(0)` es verdadero, así que 0 es captura. No hay `real || forecast`.

En la fecha de corte, 0 real gana a un pronóstico 1.5. La prueba J lo fija y, con Casa 0 y Comisionista 0.8, Venta KG es 800. Un canal ausente en esa fecha devuelve null, no 0.

Después del corte, la ausencia de pronóstico sigue devolviendo 0. Esa regla no se aplicó a la fecha exacta de corte.

Hallazgo residual, fuera del diff: `categoryVentaMaps` solo guarda un canal si `Number > 0`. Un 0 que no llega al resolver se ve como ausencia y puede tomar pronóstico. 072 no cambió ese mapa. El 0 que sí llega a `resolveCanalTon` prevalece.

## San Luis 04/10

Fixture de la prueba K: planta San Luis, corte 2026-10-04, Casa 1.2 t, Comisionista 0.8 t, pronóstico 9 t en ambos. Venta KG = 2,000. La suma sale de los dos canales. El total de planta no es argumento.

Prueba L: semana 41, domingo 04/10 a sábado 10/10. `weekDayRecords` muestra 2,000 en el domingo. `aggregateWeek`, sin cambios en este diff, suma 2,000. El ingreso es `21.13 * 2,000` = 42,260. No hay parche en el resumen.

## 054-R3: 30,750 a 9,000

Corte del fixture: 2026-09-03. Captura de ese día: Casa 4 t y Comisionista 5 t. `(4 + 5) * 1000 = 9,000`.

El pronóstico del jueves, índice 3, es Casa 10.25 t y Comisionista 20.5 t. `(10.25 + 20.5) * 1000 = 30,750`.

30,750 era el pronóstico que el contrato anterior imponía. 9,000 es la captura real válida. Con 072, 9,000 debe ganar. El cambio de la aserción es el efecto esperado. C&D del corte no se tocó: sigue en pronóstico.

054-R1 no captura el 2026-09-03, así que su B de corte sigue en 30,750 de pronóstico. La regresión pasó.

## Domingo

El diff de `lib/dashboard-arr-forecast.js` no agrega `Sunday`, `domingo`, `isSunday`, `04/10` ni `San Luis`. La misma rama de igualdad corre para el miércoles 16/09 de la prueba B y para el domingo 04/10 de las pruebas H y K. `isSunday` no participa en la venta.

Esas cadenas aparecen en el archivo de pruebas como datos del caso pedido, no como una condición nueva de producto.

## Protección 069-R1 y 070-R1

069-R1 no está en el diff. La prueba I deja el domingo de corte en null y la semana en 1,000 kg tomados del lunes. La regresión 069-R1 sigue pasando, incluido el domingo null que no se convierte en cero.

070 y 070-R1 no están en el diff. DESCUENTOS, el comentario, las compras y la gráfica no tienen cambio funcional. Sus pruebas pasan.

## Pruebas repetidas en G4

072: 12/12 PASS.

054-R2: 20/20 PASS.

054-R1, 054-R3, 069, 069-R1, 069-R2, 070 y 070-R1: 44/44 PASS.

Lote completo: 76/76 PASS.

`node --check server.js`: PASS.

`git diff --check origin/main...HEAD`: PASS.

Frontend: sin archivos en el diff.

## Riesgos y hallazgos

El color de la celda del día de corte sigue marcado como proyectado porque `canalIsAfterCutoff` conserva `>=` y el relleno usa esa bandera. El valor ya es la captura. 054-R2 sigue exigiendo estado proyectado. No cambia la cifra.

`categoryVentaMaps` sigue omitiendo el canal en 0 antes de llegar al resolver. No forma parte de este diff.

No hay otro cambio funcional.

## Cierre

NO MERGE.

NO DEPLOY.

NO AUTO-MERGE.

Merge preferido, si el aprobador humano lo ejecuta: Squash and merge.

Ejecutor del merge: HUMAN_APPROVER_ONLY.
