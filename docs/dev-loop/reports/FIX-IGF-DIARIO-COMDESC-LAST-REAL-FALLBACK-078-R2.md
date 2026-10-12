# FIX-IGF-DIARIO-COMDESC-LAST-REAL-FALLBACK-078-R2

task_id: FIX-IGF-DIARIO-COMDESC-LAST-REAL-FALLBACK-078-R2
outcome: DONE
product_sha: eb03de9206508da33b7fcf3fc55d665508bdd37f
base_sha: d3a63cb96c4483a3caa3c85db5f5e6ee0fd4030c
branch: fix/igf-diario-comdesc-last-real-fallback-078-r2

## Contrato implementado

Día real, con Venta KG > 0 y sin tasa real propia de comisión/descuento:

1. Si la tasa capturada del propio día es finita, se usa. El 0 explícito cuenta.
2. Si no hay tasa propia, se usa la última tasa real anterior de la misma planta dentro del mes calendario.
3. Si en ese mes no hay antecedente, se usa la última tasa real del mes calendario inmediato anterior.
4. Si tampoco existe, queda null.

No se usa una fecha posterior, un forecast, un promedio ni una tasa que este mismo fallback haya rellenado. La búsqueda lee solo el mapa capturado (`arr.descuento_por_kilo_diario_provincia`, o el agregado de clientes cuando ese mes no tiene primario).

Un día proyectado (`fecha >= corte`) sigue en `resolveComisionCd`: el forecast sustituye la captura, incluido un 0 explícito. `computePromMesByDow`, `weekdayPromAt` y `arr.pronostico_dias_seleccion` no se modificaron.

La procedencia queda en el día resuelto y en el registro semanal: `REAL`, `LAST_REAL_FALLBACK`, `FORECAST` o `NULL`. En el fallback también va `source_date`.

## San Luis 04/10/2026

Corte de la reproducción: 2026-10-09. Lectura de producción, sin escrituras.

| Campo | Valor |
| --- | --- |
| Venta KG | 1701 |
| Tasa propia | ausente |
| Tasa resuelta | -4.33 |
| Fuente | LAST_REAL_FALLBACK |
| Fecha fuente | 2026-10-03 |
| Sobrante con HG | 10.021022975903595 |
| RESULTADO ($/kg) | 5.691022975903596 |
| RESULTADO (Importe) | 9680.430082012017 |

El importe sale de la fórmula diaria ya existente: `sobrante_con_hg_kg + com_desc_kg`, multiplicado por la venta. No hay fórmula nueva.

05/10 a 08/10 conservan su tasa real y el mismo importe que la validación de 077. 09/10 sigue proyectado con forecast -3.85. 10/10 sigue proyectado con forecast -4.3 y venta 29730. Su importe en esta lectura es -30568.656805829625; en la validación de 077 era -12529.461765140528. La tasa y la venta de ese sábado no cambiaron con esta regla.

## Semana 41

| Campo | Valor |
| --- | --- |
| Venta total | 119853.8 |
| Venta cubierta | 119853.8 |
| Cobertura kg | 100 |
| Días cubiertos | 7/7 |
| Cobertura días | 100 |
| com_desc_kg | -3.98660998316282 |
| resultado_kg | -1.63073095748737 |
| resultado_mxn | -195449.30203249975 |
| Kilos reales cubiertos | 77472.74 |
| Kilos proyectados cubiertos | 42381.06 |

Los 1701 kg pasan de no cubiertos a cubiertos. La matemática de 077 no se tocó. 77472.74 = 75771.74 + 1701.

## Todas / Provincia

PASS.

Venta y kilos cubiertos: 1256265.1700000002. Cobertura de kilos y de días: 100%. Días cubiertos: 42/42. `resultado_kg` = `resultado_mxn / kg_covered` (-0.250123764000236 y -314221.7729027964). El numerador y el denominador cubren los mismos kilos.

## Tests

110/110 en la corrida final: 078-R2, 069, 069-R1, 069-R2, 070, 070-R1, 072, 074, 077, 054-R1, 054-R2 y 054-R3.

055 pasó sobre este mismo diff de producto antes del cierre documental.

`node --check` de `server.js`, `lib/igf-diario-grafica.js` y `lib/igf-diario-weekly-plant.js`: correcto. `git diff --check`: limpio. El frontend no cambió.

## Archivos

Tocados: `lib/igf-diario-grafica.js`, `lib/igf-diario-weekly-plant.js`, `test/fix-igf-diario-comdesc-last-real-fallback-078-r2.test.js`, `test/igf-diario-grafica-corte-cd-clientes-054-r2.test.js`.

No tocados: forecast, selección PROM, esquema, migraciones, frontend.

Contratos consultados: resolución vigente de `resolveComisionCd`, fórmula diaria de `dayResultMxn` / `dayMetrics`, cobertura de 077.

Contratos modificados: ninguno en `docs/director-ia/`.

Contradicciones: ninguna. La decisión de negocio de esta tarea autoriza el antecedente real; 078-R1 sigue describiendo la selección del PROM y no se reabre.

Desvíos: ninguno.

next_task_proposed: ninguno.

secrets_check: sin secretos.

human_decision_needed: no. El cierre queda en revisión humana. No hay PR, merge ni deploy.
