# FIX-IGF-DIARIO-MISSING-COMDESC-DAILY-RESULT-078

STATUS: DONE_PENDING_REVIEW

CLASSIFICATION: BUSINESS_DECISION_REQUIRED

BASE SHA: d3a63cb96c4483a3caa3c85db5f5e6ee0fd4030c

BRANCH: fix/igf-diario-missing-comdesc-daily-result-078

PRODUCT_SHA: no existe

FINAL_SHA: el commit documental de este reporte

NO PR. NO MERGE. NO DEPLOY.

## Resultado

No se modificó producto ni tests. La hipótesis «venta real + tasa ausente → forecast contractual» no está sustentada por el código vigente. Además, el forecast que hoy usa un día proyectado no produce tasa para el domingo 04/10/2026.

## Fuente actual del forecast de com_desc

El día proyectado no estima la tasa por su cuenta. `materializePlantMonth` y la hoja de descuento llaman a `resolveComisionCd` con el valor de `weekdayPromAt(pack.promDescTotal, fecha)`.

`promDescTotal` sale de `computePromMesByDow` sobre el mapa diario de la planta. Ese mapa se arma así:

1. `arr.descuento_por_kilo_diario_provincia.descuento_por_kg`.
2. Si esa fecha no está en el mapa, `mergeDescLookbackGapsFromDiariosCliente` calcula `ROUND(SUM(monto) / SUM(kg), 2)` con `arr.descuentos_diarios_cliente` y `arr.ventas_diarias_cliente`.
3. El promedio es por día de semana, de lunes a domingo. Entra un día del lookback de 28 días hasta el corte si tiene tasa finita y `arr.pronostico_dias_seleccion` no lo desmarca. El resultado se redondea a dos decimales. Sin observaciones, la celda queda vacía y `weekdayPromAt` devuelve null.

La granularidad es planta y día de semana. No es el último día, no es el promedio de los vecinos y no es la tasa de canal. `promDescCasa` y `promDescComisionista` alimentan otras columnas. La tasa del día usa `promDescTotal`.

## Precedencia vigente

`resolveComisionCd` no hace «real, si falta forecast, si no hay forecast null».

- Si la fecha es anterior al corte, usa la tasa capturada cuando es finita. Si falta, devuelve null. El forecast no entra. El 0 capturado es finito y se conservaría.
- Si la fecha es el corte o posterior, sustituye la captura por el forecast. Si el forecast no es finito, devuelve null. Una captura real, incluido 0, no gana.

La venta sí puede usar forecast cuando falta la captura antes del corte. Esa regla vive en `resolveCanalTon` y no se copió a la comisión. 072 y 074 dejaron `resolveComisionCd` intacto.

## Lectura de producción

Corte usado: 2026-10-09. Planta San Luis, id 5. Lookback del promedio: 2026-09-12 a 2026-10-09. La transacción fue de solo lectura.

Promedio contractual por día de semana:

| Día | Tasa |
| --- | --- |
| Lunes | -4 |
| Martes | -4.19 |
| Miércoles | -4.12 |
| Jueves | -3.87 |
| Viernes | -3.85 |
| Sábado | -4.3 |
| Domingo | null |

Domingos dentro del lookback:

| Fecha | Tasa capturada | Seleccionado para el promedio |
| --- | --- | --- |
| 2026-09-13 | -5.99 | no |
| 2026-09-20 | -1.39 | no |
| 2026-09-27 | null | sí |
| 2026-10-04 | null | sí |

Los dos domingos que sí tienen tasa están desmarcados. Por eso la celda de domingo queda vacía.

Comparación con corte 2026-10-09:

| Fecha | Captura en el mapa | Forecast si el día fuera proyectado | Tasa que resuelve el motor |
| --- | --- | --- | --- |
| 2026-10-03 | -4.33 | -4.3 | -4.33, porque es anterior al corte |
| 2026-10-04 | null | null | null |
| 2026-10-05 | -3.86 | -4 | -3.86 |
| 2026-10-09 | -3.41 | -3.85 | -3.85, porque el forecast sustituye la captura |
| 2026-10-10 | 0 | -4.3 | -4.3, porque el forecast sustituye el 0 |

En la semana materializada, el 04/10 sigue con venta 1,701 kg y comisión, resultado por kilo e importe en null. El 05/10 conserva -3.86. El 09/10 proyectado usa -3.85. El 10/10 proyectado usa -4.3.

Si el corte fuera exactamente el 04/10, `resolveComisionCd` también devolvería null, porque el forecast de domingo es null.

## Alternativas para el 04/10

A. Forecast contractual vigente. Valor: null. Usar los domingos desmarcados produciría (-5.99 + -1.39) / 2 = -3.69, pero eso contradice la selección guardada del pronóstico.

B. Última tasa real anterior en el mapa de descuento. Valor: -4.33, del 2026-10-03. No es la regla del día proyectado.

C. Promedio simple de las tasas capturadas el 03/10 y el 05/10. Valor: -4.095. No existe un helper que haga ese promedio.

D. Mantener null. Es el contrato actual. El día sigue incompleto y 077 conserva la cobertura parcial.

Elegir A, B o C cambia el resultado y no está decidido por el código. A, con la selección actual, tampoco llena el día.

## 04/10 y la semana

No hay implementación, así que no hay tasa nueva ni resultado nuevo.

Venta: 1,701 kg.

com_desc_kg: null.

resultado_kg: null.

resultado_mxn: null.

La semana permanece en cobertura parcial con el corte 2026-10-09. 077 no se modificó.

## Cierre

task_id: FIX-IGF-DIARIO-MISSING-COMDESC-DAILY-RESULT-078

outcome: DONE

archivos tocados: `docs/dev-loop/CURRENT_TASK.md` y este reporte

archivos no tocados: producto y tests

contratos consultados: `resolveComisionCd`, `computePromMesByDow`, `weekdayPromAt`, materialización diaria

contratos modificados: ninguno

contradicciones: la precedencia candidata no es la de `resolveComisionCd`

desvíos: ninguno

next_task_proposed: elegir A, B, C o D con una autorización nueva

secrets_check: sin secretos

human_decision_needed: la fuente de la tasa del 04/10
