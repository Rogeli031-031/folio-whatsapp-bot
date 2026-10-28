# FIX-IGF-DIARIO-COMDESC-NO-DISCOUNTS-ZERO-078-R3

STATUS: DONE_PENDING_REVIEW
BASE_SHA: 2a6c4a20044f3d0b0158a00600dbabe73645ff2a
BRANCH: fix/igf-diario-comdesc-no-discounts-zero-078-r3
PRODUCT_SHA: 4f9a99778db7169c3b5a9aeb9ba7817925491f89
FINAL_SHA: el commit de esta evidencia; se confirma en el cierre, no dentro de este archivo

ROOT_CAUSE: Si el mes tenía alguna fila en `arr.descuento_por_kilo_diario_provincia`, los loaders no rellenaban los huecos. El fallback anterior exigía filas de descuento, así que un día con venta y cero filas no producía tasa. `resolveRealDayComDesc` recibía `ownRate` ausente y aplicaba `LAST_REAL_FALLBACK`. San Luis 25/10 heredaba 24/10 = -3.54.

NEW_BUSINESS_RULE: Venta positiva y `COUNT` de `arr.descuentos_diarios_cliente` igual a 0 para esa planta y fecha implica tasa 0 real. La regla humana del 2026-10-28 sustituye, para ese caso evidenciado, la herencia que exigía 078-R2 en San Luis 04/10. No convierte un caso desconocido en cero.

ZERO_EVIDENCE_SOURCE: Una sola consulta agrupada del mes, `SQL_COMDESC_EVIDENCE`, compartida por `getDescuentoPorKiloGrid` y `loadCdMonthIndex`. Si `total_kg > 0` y `row_count = 0`, la tasa materializada es 0. `mergeDiscountRates` conserva la fila primaria, incluido el 0 explícito. El resolver no cambió: `ownRate = 0` sigue siendo `REAL` con `sourceDate` null. Si la consulta de evidencia falla, no se inventa cero y el fallback legítimo permanece.

SAN_LUIS_04: 0 real. Venta positiva y cero filas de descuento.
SAN_LUIS_11: 0 real. Misma evidencia.
SAN_LUIS_18: 0 real. Misma evidencia.
SAN_LUIS_25: 0 real. Venta del fixture 1798.74 kg y cero filas. Ya no hereda -3.54.

PROVINCIA_COMISIONES_PARITY: La celda de planta del 25/10 queda en 0. `descuentoCategoriaRate(1798.74, 0)` es 0 y `descuentoCategoriaRate(0, 0)` es null. CASA con venta y monto 0 es 0; COMISIONISTA sin kilos no fabrica tasa; el total no es -3.54. No se abrió el tablero productivo.

WEEKLY_PARITY: El domingo entra con cd 0. El ponderado de C&D y el resultado semanal se recalculan. Venta y los demás componentes del fixture no se mueven. El delta de resultado semanal es el mismo delta del día.

MONTHLY_PARITY: `comDescKg` del fixture pasa a 0. Ingreso, utilidad operativa y resultado final se mueven por el contrato de octubre, en el mismo delta ya redondeado. Venta, margen, HG y gastos del fixture no cambian.

FORECAST_INPUT_EFFECT: `computePromMesByDow` no se modificó. Con solo la tasa del 24/10, el promedio de domingo queda vacío. Al incorporar los cuatro domingos reales en 0, el promedio de domingo (índice 6) queda en 0. La proyección recibe ese cero; la fórmula no cambió.

RESULT_DAY_DELTA: +6367.5396 MXN en el fixture. Es `(0 - (-3.54)) * 1798.74`. No está hardcodeado en producto.
RESULT_WEEK_DELTA: +6367.5396 MXN en el fixture de semana. Solo cambia el domingo.
RESULT_MONTH_DELTA: +6368 MXN en la mini de octubre del fixture. La diferencia de 0.4604 frente al delta crudo es el redondeo entero de Ingreso. El delta de Ingreso y el de Resultado Final son el mismo número.

UNCHANGED_VENTA: sí, 1798.74
UNCHANGED_PRECIO: sí, 20 en el fixture
UNCHANGED_COSTO: sí, 10 en el fixture
UNCHANGED_FLETE: sí, 1 en el fixture
UNCHANGED_MARGEN: sí, 9 en el fixture
UNCHANGED_GASTOS: sí, 0 en el fixture
UNCHANGED_HG: sí, importe -50 y el mismo $/kg

UNEXPECTED_DEPENDENCIES: ninguna. Las métricas marcadas NO permanecen iguales. Los movimientos de C&D, resultado, ingreso, utilidad operativa, resultado final y promedio de domingo salen de la tasa nueva.

078_R2_UPDATED: sí. El caso que exigía heredar 03/10 en San Luis 04/10 ahora espera 0 cuando el loader materializa esa evidencia. Siguen verdes: forecast no usado como real, fallback no encadenado, mes anterior inmediato, filas futuras que no preceden, sin venta queda null, y `ownRate` 0 es real 0. La evidencia desconocida sigue en `LAST_REAL_FALLBACK`.

REGRESSIONS: 163 pruebas de la tanda crítica, 159 en verde, 4 en rojo. Los cuatro rojos ya fallaban en la base o son ajenos a este diff:
- 078-R2 `el producto no fija la planta, la fecha ni la tasa del caso`: `lib/igf-diario-weekly-plant.js` ya llama `weekdayPromAt` para venta en `2a6c4a20`. Este diff no toca ese archivo.
- 069 `filas, separadores visuales y resaltado no meten registros falsos`: el panel Todas ya tiene el botón Gráfica.
- 059 `sin histórico la TARIFA del día 1 queda vacía y el dato propio prevalece`: tarifa de compras, confirmada en rojo con los loaders de C&D revertidos.
- 070 `el RESUMEN de Todas y su gráfica usan el mismo consolidado`: el `indexOf` de la cadena exacta de `addWorksheet("RESUMEN")` ya es -1 en la base.

En verde dentro de esta tanda: 078-R3, el resto de 078-R2, 070-R1, 072, 074, 077, 079, 069-R1, 069-R2, 054-R1, 054-R2, 054-R3, 059-R1, 066, 066-R1, 067, 080 y 086. 054-R2 y 054-R1 actualizaron el conteo de consultas y el candado de código: la evidencia se consulta aunque el mes primario no esté vacío, y la fila primaria sigue ganando, incluido el 0.

TYPECHECK: `node frontend-dashboard/node_modules/typescript/bin/tsc --noEmit -p frontend-dashboard` en verde. `node --check` de los dos loaders y del test nuevo en verde.
BUILD: `npm run build` en verde. Compilación, tipos, 13 páginas estáticas y `prepare-standalone` copió `.next/static` y `public`. Los artefactos de build se restauraron y no entran al commit. El primer intento falló porque el junction de `frontend-dashboard/node_modules` no tenía `jspdf` ni `svg2pdf.js`; se sustituyó por un `npm ci` local del lockfile. El `node_modules` del repo principal sigue en su sitio.
DIFF_CHECK: `git diff --check` sin errores de espacio. Aviso de LF/CRLF en `CURRENT_TASK.md`.

NO DB WRITES
NO MIGRATION
NO PR
NO MERGE
NO DEPLOY

## San Luis 25, antes y después

Fixture en proceso. La venta 1798.74 kg y el C&D previo -3.54 son la evidencia de producción. Precio, costo, flete, margen, gastos y HG son insumos fijos del test para demostrar que solo se mueve C&D. No hubo lectura de la base productiva.

| Métrica | Antes | Después | ¿Cambio esperado? |
| --- | --- | --- | --- |
| Venta | 1798.74 | 1798.74 | No |
| Precio | 20 | 20 | No |
| Costo | 10 | 10 | No |
| Flete | 1 | 1 | No |
| Margen bruto | 9 | 9 | No |
| Gastos | 0 | 0 | No |
| HG importe | -50 | -50 | No |
| HG $/kg | -0.027797235842867786 | -0.027797235842867786 | No |
| C&D | -3.54 | 0 | Sí |
| Resultado $/kg | 5.4877972358428675 | 9.027797235842868 | Sí |
| Resultado MXN | 9871.1204 | 16238.66 | Sí, +6367.5396 |

La fórmula diaria no cambió: `resultado_mxn = margen * venta - gastos - hg + cd * venta`.

## Semana y mes del mismo fixture

La semana del test es el 25/10 con el cambio de C&D más el 26/10 con venta 1000 kg y C&D -1, sin tocar ese segundo día. No es el desglose productivo de la semana 44.

| Métrica | Antes | Después | ¿Cambio esperado? |
| --- | --- | --- | --- |
| Venta | 2798.74 | 2798.74 | No |
| ComDesc ponderado | -2.6324487447922995 | -0.3573036437825593 | Sí |
| Resultado $/kg | 6.4032816195859565 | 8.678426720595697 | Sí |
| Resultado MXN | 17921.1204 | 24288.66 | Sí, +6367.5396 |

El mes del test es ese único día pasado por `summarizeDays` y la mini de octubre (`operativos` 100, `corporativos` 40, impuestos federales 10). No es el octubre productivo completo.

| Métrica | Antes | Después | ¿Cambio esperado? |
| --- | --- | --- | --- |
| ComDescKg | -3.54 | 0 | Sí |
| Ingreso | 9871 | 16239 | Sí, redondeo entero |
| UtilOper | 9771 | 16139 | Sí, mismo delta que Ingreso |
| ResultadoFinal | 9721 | 16089 | Sí, +6368 |

Venta en toneladas 1.79874, margen 9, HG y los tres importes de gasto permanecen iguales. El peso de diferencia contra 6367.5396 es el redondeo de Ingreso; Ingreso y Resultado Final se desplazan juntos.

## Regla que no se convirtió en cero ciego

Sin venta el 15/10 no hay tasa. Con filas de descuento el 10/10 la tasa es -0.50. Dos filas que suman monto 0 el 12/10, una de ellas `SIN_CLASIFICAR`, dan 0 real. La fila primaria 0 del 20/10 no se pisa con el monto de evidencia. Si la consulta de evidencia falla, el 25/10 no aparece en el índice y el resolver, con `ownRate` null y antecedente -3.54, sigue en `LAST_REAL_FALLBACK`.
