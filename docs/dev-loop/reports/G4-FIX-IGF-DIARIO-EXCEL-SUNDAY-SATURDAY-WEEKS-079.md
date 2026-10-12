# G4-FIX-IGF-DIARIO-EXCEL-SUNDAY-SATURDAY-WEEKS-079

task_id: G4-FIX-IGF-DIARIO-EXCEL-SUNDAY-SATURDAY-WEEKS-079
outcome: DONE
g4: PASS
base_sha: 0f96e3ed54df4b57c4ccba620e51205a23b22f9a
branch: fix/igf-diario-excel-sunday-saturday-weeks-079
product_sha: d8385a32e6930b47366002e325c02e4cb980166d
implementation_final_sha: 05a293a7099bab402ab14e5b36b3f8290848af95

## Precheck

`origin/main` sigue en `0f96e3ed54df4b57c4ccba620e51205a23b22f9a`.
La rama remota está en `05a293a7099bab402ab14e5b36b3f8290848af95`.
El árbol de trabajo está limpio.
Entre el producto `d8385a32` y HEAD no hay cambios en `lib`, `test`, `server.js` ni `frontend-dashboard`.

## Diff contra main

El producto toca `lib/igf-diario-puebla.js` y `lib/igf-diario-expense-excel.js`.

- `weeksOf` cierra cuando la fecha es el sábado de `saturdayOfWeekContainingDate`. Ya no cierra en domingo.
- La semana queda domingo-sábado, dentro del mes exportado.
- RESUMEN no cambia: `lib/igf-diario-weekly-plant.js` y `lib/igf-diario-weekly-excel.js` no están en el diff.
- La etiqueta `Semana N` de planta y Provincia usa `weekNumber`.
- Provincia y el layout detallado comparten `weeksOf`. La consolidación no cambió.
- No hay cambio de fórmulas diarias de venta, precio, costo, flete, margen, gastos, HG, sobrante, comisiones ni resultado.
- No hay cambio de forecast, corte ni 078-R2.
- No hay escrituras de base ni migraciones.
- El producto no contiene `Morelos` ni `2026-10-04`. Esas fechas viven solo en el test.

## Octubre 2026

- Semana 40 = 01–03, `B6:B8`
- Semana 41 = 04–10, `B11:B17`. El 04/10 abre y el 10/10 cierra.
- Semana 42 = 11–17, `B20:B26`. El 11/10 abre y el 17/10 cierra.
- Semana 43 = 18–24, `B29:B35`
- Semana 44 = 25–31, `B38:B44`

El 11/10 no entra en `B11:B17`. Puebla repite las mismas filas. RESUMEN conserva Semana 42 = 11/10/2026–17/10/2026.

## Pruebas

143/143. Suites 079, 036–044, 053a, 053a-R1, 053a-R2, 053bc, 054, 054-R1, 056, 064, 064-R1, 069, 069-R1, 069-R2, 070, 077 y 078-R2.

`node --check` de `server.js`, `lib/igf-diario-grafica.js`, `lib/igf-diario-puebla.js`, `lib/igf-diario-expense-excel.js` y `lib/igf-diario-weekly-plant.js`: limpio.

`git diff --check origin/main...HEAD`: limpio.

RESUMEN: PASS
PROVINCIA/TODAS: PASS
DAILY VALUES UNCHANGED: PASS

## Alcance

Este cierre no fusiona ni despliega. El PR queda para autorización humana.

contracts_modified: ninguno
secrets_check: sin secretos
human_decision_needed: autorización de merge. No autoriza deploy.
next_task_proposed: ninguna
