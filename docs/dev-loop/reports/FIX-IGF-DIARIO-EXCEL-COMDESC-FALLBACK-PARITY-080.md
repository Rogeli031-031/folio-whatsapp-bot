# FIX-IGF-DIARIO-EXCEL-COMDESC-FALLBACK-PARITY-080

task_id: FIX-IGF-DIARIO-EXCEL-COMDESC-FALLBACK-PARITY-080
outcome: DONE
base_sha: f9ca41b8194f8c7598054735283800b277873f26
branch: fix/igf-diario-excel-comdesc-fallback-parity-080
product_sha: d7081e522beb27f307b7dfcfa2c9e39bd3e774b8

## Causa

El dashboard semanal resuelve la comisión en `materializePlantMonth` con `resolveRealDayComDesc`. Un día real con venta y sin tasa propia toma la última tasa real del mismo mes o, si no hay, del mes inmediato anterior.

La hoja `IGF Diario {planta}` no calcula esa comisión. La columna AD (C&D) es la fórmula `both` contra `Provincia Comisiones`. Esa hoja la escribe `hojaB` con `resolveComisionCd`: antes del corte solo la captura, y desde el corte el forecast. San Luis 04/10/2026 no tiene captura, así que la celda quedaba vacía. AB (sobrante con HG) sí tenía valor. AF y AG exigen que AD sea numérico, y por eso RESULTADO ($/kg) y RESULTADO (Importe) también quedaban vacíos.

Antes del cambio, con corte 2026-10-09:

- Dashboard: com_desc -4.33, source LAST_REAL_FALLBACK, source_date 2026-10-03
- Provincia Comisiones, día 04: vacío
- IGF Diario San Luis fila 11: AD, AF y AG vacíos en pantalla

## Contrato

`hojaB` sigue usando `resolveComisionCd` en el día proyectado. En el día real llama a `resolveRealDayComDesc`, el mismo helper del dashboard. No hay una segunda regla. La captura del grid no se reescribe: el mapa de tasas excluye fechas desde el corte, así que un cero forzado por el corte no entra como antecedente. ACUM de la hoja de comisiones sigue ponderando solo la captura.

El importe de RESULTADO del layout detallado usa dos decimales, para que 9680.430082 se vea como 9,680.43.

## San Luis 04/10/2026

Corte 2026-10-09. Venta 1,701 kg. Sobrante con HG 10.021022975903595.

- Provincia Comisiones B5 = -4.33
- IGF Diario San Luis fila 11, columna AD (30), encabezado C&D: fórmula sobre `Provincia Comisiones!B5`. Valor mostrado: -4.33
- Columna AF (32), encabezado RESULTADO POR KG: `AB11+AD11`. 10.021022975903595 + (-4.33) = 5.691022975903595. Formato de dos decimales: 5.69
- Columna AG (33), encabezado RESULTADO: `AF11*B11`. 5.691022975903595 * 1701 = 9680.430082012017. Formato de dos decimales: 9,680.43
- source LAST_REAL_FALLBACK, source_date 2026-10-03

03/10 conserva -4.33 propio. 05/10 conserva -3.86 propio. 10/10 proyectado queda en forecast -4.3 y no usa el fallback. Un cero explícito en día real sigue en cero. Sin antecedente permitido, la celda sigue vacía.

## Semanas

Semana 41 queda en la fila 18, después del 10/10 (fila 17) y antes del 11/10 (fila 20). La fórmula es `B11:B17`. No regresa el bloque 05–11.

- Semana 40 = 01–03
- Semana 41 = 04–10
- Semana 42 = 11–17
- Semana 43 = 18–24
- Semana 44 = 25–31

RESUMEN sigue en `weekOf`: Semana 41 = 04/10–10/10 y Semana 42 = 11/10–17/10. Provincia toma la columna AD de cada planta; la consolidación y la cobertura de 077 no se modificaron.

## Pruebas

080: 3/3. 077, 078-R2, 079 y las suites IGF Diario/Excel corridas junto con 080: 106/108.

Los 2 fallos son `forecast-excel-plant-compras-024.test.js`. Comparan una ventana fija de `server.js`. Ese archivo no cambió en 080.

`node --check server.js`: limpio. `git diff --check`: limpio.

## Alcance

No hubo PR, merge ni deploy. No hubo migraciones ni escrituras a la base.

Archivos tocados: `lib/dashboard-arr-forecast.js`, `lib/igf-diario-expense-excel.js`, `test/fix-igf-diario-excel-comdesc-fallback-parity-080.test.js`, este reporte y `docs/dev-loop/CURRENT_TASK.md`.

contracts_modified: ninguno
secrets_check: sin secretos
human_decision_needed: revisión humana. No autoriza la siguiente tarea.
next_task_proposed: ninguna
desvios: ninguno
