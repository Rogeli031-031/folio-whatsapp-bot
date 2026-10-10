# G4-PREP-FIX-IGF-DIARIO-SINGLE-CHANNEL-REAL-SALES-074

resultado: PASS

status: DONE_PENDING_REVIEW

origin/main: 5de98adc664185351afe0c69e29222903ba2b47e

merge-base: 5de98adc664185351afe0c69e29222903ba2b47e

ahead/behind: 2 / 0

product_sha: b3bf21e92aaee5b674ca08463cbdb6f57bb52b15

implementation_final_sha: f892b2804d8ecc0d2ca253a4cd0569551bb0a93a

branch: fix/igf-diario-single-channel-real-sales-074

merge: false

deploy: false

auto_merge: false

## 1. Base

`origin/main` sigue en `5de98adc664185351afe0c69e29222903ba2b47e`. Ese SHA es el merge-base. La rama está 2 commits adelante y 0 atrás.

Commits exclusivos, del más antiguo al más nuevo:

1. `b3bf21e92aaee5b674ca08463cbdb6f57bb52b15` — FIX 074: conservar Venta KG con un solo canal real
2. `f892b2804d8ecc0d2ca253a4cd0569551bb0a93a` — docs: registra FIX 074 de venta con un solo canal

Al inicio de G4 el único cambio local era `docs/dev-loop/CURRENT_TASK.md`, la transición documental a G4.

## 2. Producto hacia cierre

`b3bf21e9..f892b280` toca solo:

- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-IGF-DIARIO-SINGLE-CHANNEL-REAL-SALES-074.md`

No hay código funcional ni tests en ese rango.

## 3. Contrato anterior y contrato 074

Antes, Venta KG exigía los dos canales numéricos. En backend: `typeof casa === "number" && typeof com === "number"`. En Excel: `IF(AND(ISNUMBER(Casa), ISNUMBER(Comisionista)), (Casa + Comisionista) * 1000, "")`. Un canal ausente dejaba el día null o en blanco. Por eso 1.701 t + null daba null.

074 agrega canales ya resueltos:

- número + número = suma
- número + ausente = número
- ausente + número = número
- ausente + ausente = null

El 0 explícito es número: 0 + número = número, número + 0 = número, 0 + 0 = 0. Null, undefined, cadena vacía y NaN son ausencia. No hay conversión global de null a 0. El 0 interno de la fórmula Excel es el sumando del canal que no es numérico, y solo corre cuando el otro sí lo es.

## 4. Puntos de agregación y paridad

Helper nuevo: `lib/igf-diario-venta-kg.js`.

- `sumPresentChannels` aplica la matriz.
- `ventaKgFromCanalTons` multiplica esa suma por 1000.
- `ventaKgFormula` escribe la misma regla en Excel: `IF(OR(ISNUMBER(Casa), ISNUMBER(Comisionista)), (IF(ISNUMBER(Casa), Casa, 0) + IF(ISNUMBER(Comisionista), Comisionista, 0)) * 1000, "")`.

Usos:

- `materializePlantMonth` llama a `ventaKgFromCanalTons` después de `resolveCanalTon` por canal.
- `writeDay` en `lib/igf-diario-puebla.js` escribe la columna B con `ventaKgFormula`.
- `writeDetailedDay` en `lib/igf-diario-expense-excel.js` usa la misma fórmula. Octubre pasa por este writer.
- `ventaKgFromRows` queda alineado con `sumPresentChannels`. El loader no lo llama; 054-R1 sigue afirmando esa ausencia.

`both()` no cambió. Precio, ingreso, HG, C&D y resultado siguen exigiendo los dos números.

Semanal y Todas no se reescribieron. `aggregateWeek` suma `ventaKg` finitos y omite null. `consolidateMetrics` y `provincePoint` suman la `venta_kg` ya calculada. Un día de 1,701 kg entra en la semana y en Todas por ese valor, no por una segunda fórmula.

## 5. San Luis 04/10 y semana 41

La evidencia de 073 es Casa 1.701 t y Comisionista sin filas. El resultado esperado es 1,701 kg. No es 2,000, no es 17,251, no sale del total de planta y no fabrica Comisionista con pronóstico.

El diff de `lib/` contra `origin/main` no contiene `SANLUIS`, `San Luis`, `2026-10-04`, `1701`, `130162.74` ni `130163`. Esos valores viven en el fixture de prueba.

La semana 41 parte de 128,461.74 kg. El agregador existente suma 1,701 y queda en 130,162.74 kg. El formato semanal vigente, `maximumFractionDigits: 0`, muestra 130,163. Ese entero no está escrito en producto. RESUMEN no se parchó.

## 6. Ingreso

`dayIngreso` sigue siendo `precio * ventaKg` cuando ambos son finitos. El precio de referencia 21.1269958848 no se sustituye por 21.13. La prueba N compara el producto de esa precisión contra `21.13 * venta` y exige que no coincidan.

## 7. 20/09, 27/09 y un día que no es domingo

La misma función cubre Casa 1.80306 t el 20/09/2026 y Casa 1.42344 t el 27/09/2026. También cubre el 06/10/2026, que no es domingo, con un solo canal. No hay condición `isSunday` en el diff de producto. `isSunday` sigue limitado a gastos inhábiles.

## 8. Protección 069-R1

Casa null y Comisionista null siguen en Venta KG null, no en 0. La semana suma los demás días. La prueba L de 074 y la prueba I de 072 lo confirman.

## 9. Protección 072

`lib/dashboard-arr-forecast.js` no tiene diff contra `origin/main`. `resolveCanalTon` no cambió.

- Antes del corte, la captura real gana al pronóstico.
- En la fecha exacta de corte, cada canal sigue: real válido, luego pronóstico válido, luego null. Si el canal ausente tiene pronóstico, 072 lo resuelve y 074 suma esos dos números. El caso de San Luis está antes del corte y su Comisionista no tiene pronóstico.
- Después del corte, el pronóstico sigue ganando. Si falta el pronóstico, el canal sigue en 0 por 072. El agregador de 074, ante dos null, sigue en null.

No cambió `upload_day`, el corte ni el cálculo de pronóstico. La prueba F de 072 conservó las resoluciones 1.2 t y null, y pasó la venta de null a 1,200 kg por la suma nueva.

## 10. Protección 070 y 070-R1

No hay diff en descuentos, comentario del día, compras, costo, flete ni HG. `both()` de esas columnas permanece. Un Venta KG recuperado puede cambiar importes que ya se multiplicaban por B. Eso es el efecto matemático de tener la venta, no un contrato nuevo de esas columnas.

## 11. Pruebas

Lote ejecutado: 115/115.

- 074: matriz A–O, 20/09, 27/09, día no domingo, ingreso y Todas.
- 072: 12/12.
- 054-R1, 054-R2 y 054-R3.
- 069, 069-R1 y 069-R2.
- 070 y 070-R1.
- Fórmulas de 036, 048, 049, 050 y 051, actualizadas en el commit de producto para reconocer la nueva columna B.

`node --check server.js` limpio. `git diff --check` limpio en `origin/main...f892b280`. No hubo cambio de frontend, así que no hubo build.

## 12. Archivos

Funcionales:

- `lib/igf-diario-venta-kg.js`
- `lib/igf-diario-grafica.js`
- `lib/igf-diario-puebla.js`
- `lib/igf-diario-expense-excel.js`

Tests:

- `test/fix-igf-diario-single-channel-real-sales-074.test.js`
- `test/change-igf-diario-cutoff-real-sales-precedence-072.test.js`
- `test/igf-diario-puebla-036.test.js`
- `test/compras-importe-venta-igf-por-planta-048.test.js`
- `test/igf-corte-proyeccion-compras-importe-049.test.js`
- `test/igf-diario-continuar-proyeccion-desde-corte-050.test.js`
- `test/igf-venta-permiso-compras-whatsapp-051.test.js`

## 13. Hallazgos

No hay desviación funcional que impida el Pull Request.

Residual previo, fuera del diff de 074: `categoryVentaMaps` sigue omitiendo un canal cuya magnitud no es mayor que 0 antes de llegar a `resolveCanalTon`. 074 no lo toca. Un cero explícito que ya llegó resuelto a la agregación sí se conserva.

Después del corte, un canal sin pronóstico sigue en 0 por 072. Eso no es una conversión nueva de null a 0 dentro del agregador.

## 14. Cierre

G4 = PASS.

No merge. No deploy. No auto-merge. El merge preferido, si se autoriza después, es squash, y lo ejecuta solo el aprobador humano.
