# FIX-IGF-DIARIO-SINGLE-CHANNEL-REAL-SALES-074

status: DONE_PENDING_REVIEW

base_sha: 5de98adc664185351afe0c69e29222903ba2b47e

product_sha: b3bf21e92aaee5b674ca08463cbdb6f57bb52b15

branch: fix/igf-diario-single-channel-real-sales-074

## 1. Hallazgo 073

San Luis, planta_id 5, 04/10/2026:

- Casa: 3 filas, 1,701.0000 kg, 1.701 t.
- Comisionista: 0 filas. No es un cero guardado.
- No hay fila de total de planta.
- Venta KG quedaba null.

El mismo patrón Casa-only apareció el 20/09/2026 (1,803.0600 kg) y el 27/09/2026 (1,423.4400 kg).

Clasificación de 073: MIXED. El dato no trae Comisionista. El contrato exigía los dos canales numéricos. El código no descartaba una captura Comisionista existente.

## 2. Contrato anterior

`materializePlantMonth` publicaba Venta KG solo con `typeof casa === "number" && typeof com === "number"`. Si un canal resuelto era null, el día quedaba null.

Excel usaba `both()`: `IF(AND(ISNUMBER(Casa), ISNUMBER(Comisionista)), (Casa + Comisionista) * 1000, "")`. Un canal en blanco dejaba B en blanco.

Con corte 08/10 o 09/10, la semana 41 sumaba 128,461.74 kg y se veía como 128,462 kg. El 04/10 no entraba.

## 3. Contrato 074

La agregación ocurre después de que 072 resolvió cada canal:

- número + número = suma
- número + ausente = número
- ausente + número = número
- ausente + ausente = null

Luego, en los puntos que ya convertían toneladas a kilogramos, esa suma se multiplica por 1000.

San Luis 04/10, con los canales ya resueltos en 1.701 t y null, queda en 1,701 kg. No usa 2,000. No usa 17,251. No usa el total de planta. No fabrica Comisionista con pronóstico.

## 4. Ausencia y cero

Null, undefined, cadena vacía y NaN son ausencia. El 0 explícito es número.

- 0 + 5 = 5
- 5 + 0 = 5
- 0 + 0 = 0
- null + null = null

El 0 que aparece dentro de la fórmula Excel es solo el sumando del canal que no es numérico, y solo cuando el otro sí lo es. `OR(ISNUMBER(...))` deja la celda en blanco si ninguno es numérico. `ISNUMBER(0)` es verdadero, así que dos ceros siguen en 0.

No hay conversión global de null a 0.

## 5. Puntos de agregación

- `lib/igf-diario-grafica.js`, `materializePlantMonth`: era el `AND` de tipos. Ahora llama a `ventaKgFromCanalTons`.
- `lib/igf-diario-puebla.js`, `writeDay`, columna B: ahora usa `ventaKgFormula`.
- `lib/igf-diario-expense-excel.js`, `writeDetailedDay`, columna B: la misma fórmula, vía el helper del layout de octubre.
- `ventaKgFromRows`: no lo usa el loader. Se alineó a la misma suma para no conservar `||`, que confunde 0 con ausencia.

`both()` sigue exigiendo los dos números en precio, ingreso, HG, C&D y resultado. No se reescribió.

No se tocó `aggregateWeek`, `consolidateMetrics`, `provincePoint`, `resolveCanalTon`, pronóstico, upload_day, corte, precio, compras, DESCUENTOS ni la gráfica.

## 6. Helper

`lib/igf-diario-venta-kg.js`:

- `sumPresentChannels`
- `ventaKgFromCanalTons`
- `ventaKgFormula`

## 7. San Luis, septiembre y semana 41

04/10/2026 es domingo. 20/09/2026 y 27/09/2026 también. Un martes con un solo canal, 06/10, usa la misma función. No hay rama de domingo.

Semana 41, con los demás días iguales a la evidencia de 073:

- antes: 128,461.74 kg
- el agregador suma 1,701
- después: 130,162.74 kg

El formato semanal existente, `maximumFractionDigits: 0`, muestra 130,163. Ese entero no está escrito como constante de venta.

Ingreso del día: la fórmula existente `precio * ventaKg`, con 21.1269958848 * 1,701. No se redondea el precio a 21.13 antes de multiplicar.

## 8. Protección 069-R1

Casa null y Comisionista null siguen en Venta KG null. La semana suma los otros días y no se anula. Un domingo sin los dos canales queda null.

## 9. Protección 072

`resolveCanalTon` no cambió.

- Antes del corte, la captura real gana al pronóstico.
- En la fecha exacta de corte, cada canal sigue: real válido, luego pronóstico válido, luego null. Si el canal ausente tiene pronóstico, 072 lo resuelve y 074 suma esos dos números. El caso productivo de San Luis está antes del corte y su Comisionista no tiene pronóstico, así que no se inventan 15.55 t.
- Después del corte, el pronóstico sigue ganando. Si el pronóstico falta, el canal sigue en 0 por 072. El agregador de 074, ante dos null, sigue en null y no crea ese 0.

La prueba F de 072 conservó las dos resoluciones (1.2 t y null) y pasó la venta esperada de null a 1,200 kg, que es la suma nueva.

## 10. Pruebas

074: matriz A–O, 20/09, 27/09, día no domingo, ingreso, Todas y filas de un solo canal.

Regresión: 054-R1, 054-R2, 054-R3, 069, 069-R1, 069-R2, 070, 070-R1 y 072. Las fórmulas de 036, 048, 049, 050 y 051 reconocen la nueva B y siguen rechazando el total de planta.

`node --check server.js` limpio. `git diff --check` limpio. No hubo cambio de frontend.

## 11. Archivos

- lib/igf-diario-venta-kg.js
- lib/igf-diario-grafica.js
- lib/igf-diario-puebla.js
- lib/igf-diario-expense-excel.js
- test/fix-igf-diario-single-channel-real-sales-074.test.js
- test/change-igf-diario-cutoff-real-sales-precedence-072.test.js
- test/igf-diario-puebla-036.test.js
- test/compras-importe-venta-igf-por-planta-048.test.js
- test/igf-corte-proyeccion-compras-importe-049.test.js
- test/igf-diario-continuar-proyeccion-desde-corte-050.test.js
- test/igf-venta-permiso-compras-whatsapp-051.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-IGF-DIARIO-SINGLE-CHANNEL-REAL-SALES-074.md

## 12. SHA producto

b3bf21e92aaee5b674ca08463cbdb6f57bb52b15

## 13. SHA final

El commit documental que agrega este reporte. Es el HEAD de `fix/igf-diario-single-channel-real-sales-074` después de ese commit.

No hay PR. No hay merge. No hay deploy.
