# IMPL-IGF-DIARIO-DATOS-PLANTA-082

```yaml
task_id: IMPL-IGF-DIARIO-DATOS-PLANTA-082
outcome: DONE
product_sha: e8211579b593a2318c3b5d0ba74b2ab2135898c3
files_touched:
  - lib/igf-diario-datos-planta.js
  - lib/dashboard-arr-forecast.js
  - test/impl-igf-diario-datos-planta-082.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/IMPL-IGF-DIARIO-DATOS-PLANTA-082.md
  - docs/dev-loop/reports/evidence-082/san-luis.xlsx
  - docs/dev-loop/reports/evidence-082/morelos.xlsx
  - docs/dev-loop/reports/evidence-082/san-luis-full.xlsx
  - docs/dev-loop/reports/evidence-082/morelos-full.xlsx
  - docs/dev-loop/reports/evidence-082/san-luis-ak.png
  - docs/dev-loop/reports/evidence-082/san-luis-mx.png
  - docs/dev-loop/reports/evidence-082/san-luis-zag.png
files_not_touched:
  - server.js
  - lib/arr-load.js
  - lib/igf-diario-puebla.js
  - lib/igf-diario-weekly-excel.js
  - lib/igf-diario-weekly-plant.js
  - frontend-dashboard
  - docs/director-ia
contracts_consulted:
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: none
human_decision_needed: []
```

## Hoja

En la exportación de una planta con RESUMEN, el orden de creación queda:

1. RESUMEN
2. DatosPlanta
3. IGF Diario {planta}
4. el resto, en el orden en que ya se creaba

TODAS y `renderProvinciaDiariaSheets` no agregan DatosPlanta.

## Columnas

C, G y K salen de `arr.ventas_diarias_cliente` en una sola consulta por fecha, canal y subcanal. El canal desconocido no entra. Predios y el subcanal vacío quedan dentro del total del canal y no se escriben como cero en Portátil, Autotanque o Carburación. No hay proyección de venta en esta hoja.

P–Q, T–U, W–X, Z–AB y AD salen del payload de compras. El proveedor se busca por nombre. Antes del corte, el costo es importe/kg del día. Desde el corte se reutiliza `buildComprasDailyEstimateContext`. La tarifa es la del proveedor, incluida la tarifa 0. AD conserva el signo de los kilos.

M, N, R, AF y AG tienen encabezado y celdas de datos vacías.

## Formato

No hay plantilla medible en el repositorio. Anchos, alturas y bordes son una aproximación de las capturas: fondo blanco, Calibri, encabezados en negrita, bordes grises finos, separadores de ancho 2.5, fila 1 a 22, fila 2 a 32 y filas de datos a 18. La fecha se guarda como serial de Excel del día calendario. Al reabrir, ExcelJS la devuelve en UTC (`2026-10-01T00:00:00.000Z`).

## Evidencia

Los XLSX de `docs/dev-loop/reports/evidence-082/` son fixtures locales. No son una extracción de producción.

Pruebas 082: 9/9. Regresiones 077, 078-R2, 079, 080, 069-R1, 027 y 036: verdes. `forecast-excel-plant-compras-024.test.js` líneas 507 y 538 fallan sobre `server.js`, archivo no modificado en esta tarea; es el fallo ya conocido de esa prueba.

## G4

Resultado: PASS. No hubo corrección de producto ni de pruebas.

El generador completo `generarDashboardArrForecast` se ejecutó con el mismo cliente falso, el mismo payload, octubre 2026 y el corte fijo en la base `9c9879490c752b55448782c7dcf230d89ef2fc96` y en el producto `e8211579b593a2318c3b5d0ba74b2ab2135898c3`. San Luis usó corte `2026-10-11`. Morelos usó corte `2026-10-06`.

En ambas plantas el HEAD solo agrega `DatosPlanta` entre `RESUMEN` y `IGF Diario {planta}`. Las hojas previas coinciden por nombre en valores, fórmulas, formatos, anchos, combinaciones e imágenes. `RESUMEN` conserva su imagen. No hay nombres definidos ni referencias `#REF!`. `server.js` no cambia entre base y HEAD.

TODAS no crea la hoja: `DatosPlanta` solo se inserta cuando la exportación es de una planta y trae resumen semanal. La prueba 082 cubre que `appendIgfDiarioTodas` y `renderProvinciaDiariaSheets` no la mencionan.

### Conciliación de venta

La venta es captura de `arr.ventas_diarias_cliente`. No hay pronóstico de venta en la hoja. Las compras desde el corte salen del estimador ya existente.

San Luis, 4 de octubre, ambos canales: C 1650, G 1250, K 400. C = G + K. D 1000 y E 200; F queda vacío. Predios, 50 kg, entra en G y en C, y no se escribe como cero en Carburación. D + E + F = 1200, así que G queda 50 kg arriba de esos subcanales. El canal desconocido Predio, 999 kg, no entra en C, G ni K. Sin esa exclusión C sería 2649.

San Luis, 6 de octubre, solo CASA: C = G = 10 y K queda vacío. No se fuerza C = G + K.

San Luis, 9 de octubre, solo COMISIONISTA: C = K = 40 y G queda vacío.

San Luis, 7 de octubre, kilos capturados en cero: C, D, G, I y K quedan en 0.

Morelos, 2 de octubre, ambos canales: C 100 = G 20 + K 80. El 3 de octubre, solo COMISIONISTA: C = K = 15 y G queda vacío. Las columnas siguen el nombre del proveedor, no el orden del arreglo.

### Cero y ausencia en compras

`arr.compras` exige `kg > 0`. Un kilo capturado en cero no puede persistir. El grid marca la ausencia con `kg: 0`, `importe: 0`, `count: 0` e `ids: []`. `purchaseOf`, antes del corte, deja vacíos el kilo y el costo cuando `rawKg` es nulo o `<= 0`. Ese cero es ausencia, no una captura. No se afirma que todo cero numérico del payload se conserve.

El costo capturado en cero sí se conserva: San Luis, 4 de octubre, TOMZA TUXPAN, 500 kg e importe 0, escribe costo 0. La tarifa 0 de TOMZA TEPEJI se escribe. El HG 0 del 5 de octubre se escribe. El HG negativo del 4 de octubre se escribe como -787.

Desde el corte, San Luis el 11 de octubre proyecta PEMEX a 140 kg con costo 12 y TOMZA TUXPAN a 50 kg. El costo proyectado de TOMZA TUXPAN queda vacío porque el estimador no trae `costo_kg` para ese promedio. Morelos, corte 6 de octubre, proyecta PEMEX a 2 kg y TOMZA TEPEJI a 40 kg. Es el estimador existente, no un pronóstico nuevo de venta.

### Columnas vacías y evidencia visual

M, N, R, AF y AG tienen encabezado y datos vacíos en las 31 filas. Los separadores también quedan vacíos.

`evidence-082/san-luis-full.xlsx` y `morelos-full.xlsx` salen del generador completo con fixture local. No son producción ni una validación autenticada. Las vistas `san-luis-ak.png`, `san-luis-mx.png` y `san-luis-zag.png` muestran A–K, M–X y Z–AG. El ajuste del navegador parte los encabezados; en el XLSX los anchos medidos son 16, 14 y 2.5 en el separador. El formato sigue siendo una aproximación, sin plantilla original.

### Pruebas G4

En HEAD: 70 pruebas, 68 verdes, 2 fallos. En la base `9c987949`, la suite 024: 26 pruebas, 24 verdes, 2 fallos. `git diff --check` limpio.

| Prueba | Aserción | BASE | HEAD |
| --- | --- | --- | --- |
| el endpoint exige planta solo con require_plant, autoriza y nombra el archivo | `Dashboard_ARR_Forecast_${String(resolvedPlant.canon` | FALLA | FALLA |
| 2) caller histórico conserva el workbook global | `Dashboard_ARR_Forecast_${year}_${month}.xlsx` | FALLA | FALLA |

Las dos aserciones leen `server.js`. Ese archivo no entra en el diff. No se editaron ni se desactivaron pruebas.
