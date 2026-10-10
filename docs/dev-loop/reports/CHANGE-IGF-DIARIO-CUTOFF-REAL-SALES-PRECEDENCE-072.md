# CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072

status: DONE_PENDING_REVIEW

base_sha: ad8a8ba8e00557993a8da62f735f9fe6ee020ada

product_sha: 3f2e41cff5ede48449a952a5eb7b19db4374b8c2

branch: change/igf-diario-cutoff-real-sales-precedence-072

072 sustituye exclusivamente la precedencia de venta Casa/Comisionista en la fecha exacta de corte de 054-R2. El resto de 054-R2 permanece.

## 1. Contrato 054-R2 anterior

`resolveCanalTon` trataba `fecha >= corte` como proyectado. En la fecha exacta de corte el pronóstico sustituía la captura. Si ese canal no tenía pronóstico, el resultado era null y la captura se descartaba.

La prueba 1 de 054-R2 exigía `resolveCanalTon(4, corte, corte, …, 10.25) === 10.25` y, sin pronóstico, `=== null`. La prueba 2 exigía Venta KG del corte = 30,750 kg de pronóstico, no los 9,000 kg capturados.

El día posterior al corte seguía en pronóstico. Sin pronóstico posterior, el canal devolvía 0.

## 2. Evidencia de 071

071 no modificó producto. El diagnóstico, sobre el código de `ad8a8ba8`, mostró:

- La columna total de Provincia Venta Diaria usa corte + 1. La fecha de corte sigue siendo real.
- Casa y Comisionista pasan por `resolveCanalTon`, donde `fecha >= corte` descarta la captura.
- Venta KG es `(casa + comisionista) * 1000` solo si ambos canales son numéricos. Un canal null deja la venta null.
- El domingo no es la causa. `isSunday` solo marca gastos inhábiles. El 04/10/2026 cae en domingo y el pronóstico de ese día de la semana suele venir vacío, así que el descarte se ve ahí.

## 3. Contradicción entre total planta y canales

El total de planta puede mostrar 2.000 t en la fecha de corte. Los canales, con la regla anterior, podían quedar null el mismo día. IGF Diario no copia esa columna total: arma Venta KG desde Casa y Comisionista.

## 4. Nuevo contrato 072

Antes del corte, el comportamiento vigente se conserva, incluida la captura real y el relleno por pronóstico cuando la captura falta.

En la fecha exacta de corte, cada canal se resuelve solo:

captura válida, si no hay captura entonces pronóstico válido, si no hay pronóstico entonces null.

Después del corte, el pronóstico vigente se conserva. Una captura posterior no gana. Si falta el pronóstico, el canal sigue devolviendo 0.

## 5. Precedencia por canal

La rama nueva está en `resolveCanalTon`, antes de la rama `fecha > corte`. Casa y Comisionista la invocan por separado desde Excel y desde `materializePlantMonth`.

Ejemplo en la fecha de corte: Casa real 1.2 t y Comisionista sin real con pronóstico 0.8 t. Casa = 1.2, Comisionista = 0.8, Venta KG = 2,000 kg.

Si un canal sigue null, no se convierte en 0. Venta KG conserva el `AND` de los dos canales.

## 6. Cero frente a null

La validez usa `finiteCanalTon`. `null`, `""` y un número no finito quedan ausentes. `0` es finito y es una captura válida.

No se usa `real || forecast`, porque 0 es falsy. En la fecha de corte, 0 real gana al pronóstico. Un pronóstico 0 solo entra si la captura falta.

## 7. Caso San Luis 04/10/2026

Corte 2026-10-04. La prueba K alimenta los canales, no la columna total: Casa 1.2 t y Comisionista 0.8 t, con pronóstico 9 t en ambos. Esos canales suman 2.000 t. Venta KG sale 2,000 kg. El total de planta no es argumento de `materializePlantMonth`.

No hay en el repositorio el reparto productivo Casa/Comisionista de ese día. La reconciliación de la prueba es la suma de esas dos capturas. Si en operación un canal no tiene captura ni pronóstico, Venta KG sigue null; 072 no inventa los 2,000 desde el total.

## 8. Antes y después

Antes, en la fecha de corte, Casa 1.2 y Comisionista 0.8 con pronóstico distinto quedaban en el pronóstico, o en null si el pronóstico faltaba. Venta KG podía quedar null.

Después, esas capturas válidas producen Casa 1.2, Comisionista 0.8 y Venta KG 2,000 kg.

En el oráculo de 054-R2, el 2026-09-03 capturado (4 t + 5 t) pasa de 30,750 kg de pronóstico a 9,000 kg reales. El estado del día sigue siendo proyectado porque la fecha es el corte. C&D del corte sigue en pronóstico.

## 9. Semana 41

El agregador semanal no se modificó. Con Venta KG del 04/10 en 2,000, `weekDayRecords` muestra 2,000 en el domingo y `aggregateWeek` lo suma. El ingreso de ese día es `precio * venta` (21.13 * 2,000).

069-R1 sigue vigente: un domingo realmente null no anula la semana. La prueba I lo confirma con venta semanal 1,000 tomada del lunes.

## 10. Protección posterior al corte

Fecha posterior, captura y pronóstico presentes: gana el pronóstico. La prueba G espera 0.8 t y 0.5 t, Venta KG 800, no la captura 1.2 + 0.4.

Sin pronóstico después del corte, el canal sigue en 0, como 054-R2.

## 11. Cambio de la prueba 054-R2

Las pruebas 1 y 2 se transformaron. Ahora demuestran que en el corte la captura válida gana al pronóstico y que B usa 9,000 kg. Conservan el día posterior en pronóstico, el 0 sin pronóstico posterior y la comparación `fecha >= corte` de la rama posterior.

054-R3 tenía captura 4 t + 5 t el día de corte y exigía 30,750 kg. Esa expectativa pasó a 9,000 kg. 054-R1 no captura ese día, así que su B de corte sigue en 30,750 kg de pronóstico.

## 12. Archivos modificados

- lib/dashboard-arr-forecast.js
- test/change-igf-diario-cutoff-real-sales-precedence-072.test.js
- test/igf-diario-grafica-corte-cd-clientes-054-r2.test.js
- test/igf-diario-grafica-produccion-coverage-054-r3.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072.md

No cambió la fuente Provincia Venta Diaria, Ingreso, Precio, Compras, Costo, Flete, DESCUENTOS, el resumen semanal, la gráfica ni el esquema de base de datos.

## 13. Pruebas

072: 12/12, matriz A–L. 054-R2: 20/20. 054-R1 y 054-R3 incluidas en el lote de regresión. 069, 069-R1, 069-R2, 070 y 070-R1 pasan. El lote de regresión fue 44/44. `node --check server.js` limpio. `git diff --check` limpio. No hubo cambio de frontend.

## 14. SHA producto

3f2e41cff5ede48449a952a5eb7b19db4374b8c2

## 15. SHA final

El commit documental que agrega este reporte. Es el HEAD de `change/igf-diario-cutoff-real-sales-precedence-072` después de ese commit.
