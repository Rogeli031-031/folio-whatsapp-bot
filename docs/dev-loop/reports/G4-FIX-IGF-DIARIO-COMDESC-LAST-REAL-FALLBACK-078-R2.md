# G4-FIX-IGF-DIARIO-COMDESC-LAST-REAL-FALLBACK-078-R2

task_id: G4-FIX-IGF-DIARIO-COMDESC-LAST-REAL-FALLBACK-078-R2
outcome: DONE
g4: PASS

base_sha: d3a63cb96c4483a3caa3c85db5f5e6ee0fd4030c
product_sha: eb03de9206508da33b7fcf3fc55d665508bdd37f
implementation_final_sha: 25d64b8e803bf97ac3ab6e0f8f83e859ac941e82
audit_078_r3_sha: 7d76ae2b9e068a095be7fc552d03b87feb7fbc39

## Alcance

`origin/main` sigue en `d3a63cb96c4483a3caa3c85db5f5e6ee0fd4030c`. El merge-base de la rama es ese mismo SHA. La rama remota estaba en `25d64b8e` y el worktree estaba limpio.

Entre el producto `eb03de92` y `25d64b8e` solo cambiaron `docs/dev-loop/CURRENT_TASK.md` y el reporte de implementación. Este G4 no modifica producto ni tests.

## Protecciones

El diff de producto queda en `lib/igf-diario-grafica.js`, `lib/igf-diario-weekly-plant.js` y dos tests.

- Día real con tasa propia finita, incluido 0: fuente `REAL`.
- Día real con venta mayor a 0 y tasa ausente: última tasa capturada anterior. Primero el mismo mes; si no hay, solo el mes inmediato anterior; si no hay, null.
- El antecedente sale del mapa capturado. No entra un forecast, un fallback ya rellenado ni una fecha futura.
- `fecha >= corte` sigue en `resolveComisionCd`. La fuente de ese ramo es `FORECAST` o `NULL`.
- `computePromMesByDow` y `arr.pronostico_dias_seleccion` no están en el diff. `weekdayPromAt` solo se invoca como antes.
- El producto no contiene San Luis, `2026-10-04` ni `-4.33`.
- No hay migraciones ni escrituras de negocio. La carga del mes anterior es un SELECT.
- `dayResultMxn`, `dayMetrics` y `aggregateCovered` no cambiaron. 077 sigue igual.

## Caso San Luis 04/10

El test del producto, no el código de producción, fija la entrada: venta 1701, tasa propia ausente, fuente 2026-10-03 y tasa -4.33. Con la fórmula diaria existente el resultado es 5.691022975903596 $/kg y 9680.430082012017 de importe. Al incorporar esa tasa, la cobertura semanal del escenario queda en 100% de kilos y de días.

## 10/10

La auditoría `7d76ae2b` cerró OUTCOME A. Main y 078-R2 producen el mismo 10/10 proyectado. `LAST_REAL_FALLBACK` no se ejecuta. No hay regresión. La diferencia contra la validación 077 vino de HG y gastos posteriores en base de datos. No se abre un fix de ese día.

## Tests

118/118. Incluyen 078-R2, 054-R1, 054-R2, 054-R3, 055, 069, 069-R1, 069-R2, 070, 070-R1, 072, 074 y 077.

`node --check` de `server.js`, `lib/igf-diario-grafica.js` y `lib/igf-diario-weekly-plant.js`: correcto. `git diff --check` del rango contra main: limpio. El frontend no cambió.

## Cierre

G4 PASS. Se autoriza crear el PR. No se autoriza merge ni deploy.

next_task_proposed: ninguno.
secrets_check: sin secretos.
human_decision_needed: autorización de merge, si el humano la quiere después. Esta tarea no la ejecuta.
