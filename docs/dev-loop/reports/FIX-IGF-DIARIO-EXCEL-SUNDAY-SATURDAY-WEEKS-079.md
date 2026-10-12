# FIX-IGF-DIARIO-EXCEL-SUNDAY-SATURDAY-WEEKS-079

task_id: FIX-IGF-DIARIO-EXCEL-SUNDAY-SATURDAY-WEEKS-079
outcome: DONE
base_sha: 0f96e3ed54df4b57c4ccba620e51205a23b22f9a
branch: fix/igf-diario-excel-sunday-saturday-weeks-079
product_sha: d8385a32e6930b47366002e325c02e4cb980166d

## Causa

`weeksOf` en `lib/igf-diario-puebla.js` cerraba el bloque cuando el día UTC era domingo. La hoja `IGF Diario {planta}` y `IGF Diario Provincia` heredan esa función, en el layout legacy y en el detallado de octubre. RESUMEN no la usa: toma `sundayOfWeekContainingDate` y `saturdayOfWeekContainingDate` de `lib/igf-diario-weekly-plant.js`.

Por eso octubre 2026 quedaba jueves–domingo y luego lunes–domingo. El 04/10 cerraba el primer bloque y el 11/10 quedaba dentro del bloque que empezaba el 05/10.

## Contrato

`weeksOf` cierra el bloque cuando la fecha es el sábado de `saturdayOfWeekContainingDate`. El resto del mes, si no llega al sábado, forma el último bloque parcial. No se mueven días entre meses.

La etiqueta `Semana N` usa `weekNumber` del mismo módulo. Octubre 2026:

- 01–03 Semana 40
- 04–10 Semana 41
- 11–17 Semana 42
- 18–24 Semana 43
- 25–31 Semana 44

## Morelos, octubre 2026, hoja IGF Diario Morelos

Antes, cierre en domingo:

- 01/10 fila 6, 03/10 fila 8, 04/10 fila 9, resumen fila 10 del 01–04
- 10/10 fila 17, 11/10 fila 18, resumen fila 19 del 05–11
- 17/10 fila 26, 18/10 fila 27, resumen fila 28 del 12–18
- 24/10 fila 35, 25/10 fila 36, resumen fila 37 del 19–25
- 31/10 fila 44, resumen fila 46 del 26–31

Después, cierre en sábado:

- 01/10 fila 6, 03/10 fila 8, resumen fila 9, fórmula `B6:B8`, Semana 40
- 04/10 fila 11, 10/10 fila 17, resumen fila 18, fórmula `B11:B17`, Semana 41
- 11/10 fila 20, 17/10 fila 26, resumen fila 27, fórmula `B20:B26`, Semana 42
- 18/10 fila 29, 24/10 fila 35, resumen fila 36, fórmula `B29:B35`, Semana 43
- 25/10 fila 38, 31/10 fila 44, resumen fila 46, fórmula `B38:B44`, Semana 44

El 11/10 no entra en `B11:B17`. Puebla produce las mismas filas. La fórmula de precio del 04/10 sigue apuntando a `PRECIO!B5` y la del 11/10 a `PRECIO!B12`.

## Otras superficies

- Provincia comparte `weeksOf` y `weekNumber`. Queda en el mismo calendario. La consolidación no cambió.
- RESUMEN sigue en `weekOf`. Semana 42 = 11/10/2026–17/10/2026.
- Los valores diarios de venta, precio, ingreso, costo, flete, margen, gastos, HG, sobrante, comisiones y resultado no cambiaron de fuente. Solo cambió el bloque al que pertenece cada fecha.

## Pruebas

143/143 en 079, 036–044, 053a, 053a-r1, 053a-r2, 053bc, 054, 054-r1, 056, 064, 064-r1, 069, 069-R1, 069-R2, 070, 077 y 078-R2.

`node --check` de `server.js`, `lib/igf-diario-grafica.js`, `lib/igf-diario-puebla.js`, `lib/igf-diario-expense-excel.js` y `lib/igf-diario-weekly-plant.js`: limpio.

`git diff --check`: limpio.

## Alcance

No hubo PR, merge ni deploy.

contracts_modified: ninguno
secrets_check: sin secretos
human_decision_needed: revisión humana. No autoriza la siguiente tarea.
next_task_proposed: ninguna
