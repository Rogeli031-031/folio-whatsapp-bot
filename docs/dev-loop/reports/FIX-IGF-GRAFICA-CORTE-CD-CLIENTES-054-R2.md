# FIX-IGF-GRAFICA-CORTE-CD-CLIENTES-054-R2

status: DONE_PENDING_REVIEW

base_sha: 12d9381b18bae8697accf1cea34ec2d27a538101

branch: fix/igf-grafica-corte-cd-clientes-054-r2

## Resultado

Se cerraron los tres bordes de la auditoría de 054-R1. No se redefinió AE/AF, el carry de precio, el costo, el flete, el HG, la definición de cliente nuevo, el Top 10, el gate ni el modal.

1. La frontera compartida de IGF queda `fecha >= corte` → proyectado. Excel y gráfica usan los mismos helpers (`canalIsAfterCutoff`, `projectMissingVenta`, `projectedCanalValue`, `resolveCanalTon`).
2. C&D primary/fallback se resuelve con `loadCdMonthIndex(client, year, month)`, una vez por mes calendario y compartido entre plantas.
3. `loadPlantFacts` arranca en `customerFactsStart`. Compras y C&D siguen en `financialStart` y en los meses de la ventana visible.

## Caso corte

Corte `2026-09-03`. Puebla. Captura real del 03/09: CASA 4 t + COMISIONISTA 5 t = 9,000 kg. Forecast del jueves: CASA 10.250 t + COMISIONISTA 20.500 t = 30,750 kg. El primario de C&D del 03/09 es -0.99 y no se usa.

| fecha | estado | captura | B Excel | B gráfica | AC Excel | AC gráfica | AE Excel | AE gráfica | AF Excel | AF gráfica |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-02 | real | 10,000 kg | 10000 | 10000 | -0.40 | -0.40 | 4.04768416 | 4.04768416 | 40476.8416 | 40476.8416 |
| 2026-09-03 | proyectado | 9,000 kg ignorada | 30750 | 30750 | -0.35 | -0.35 | 4.80778347 | 4.80778347 | 147839.3416 | 147839.3416 |
| 2026-09-04 | proyectado | forecast | 12000 | 12000 | -0.22 | -0.22 | 4.60307013 | 4.60307013 | 55236.8416 | 55236.8416 |

El día exacto del corte sin forecast finito sigue en blanco, no en cero. Así el 23/09 de 028 conserva la celda de canal vacía. Un día posterior al corte sin forecast sigue en 0. La ruta `cutoffDay` sin `corteYmd` no cambió.

## Caso C&D multi-mes

| mes | mode | valor | consultas |
| --- | --- | --- | --- |
| agosto, primary vacío | fallback | Puebla 15/08 = -0.44 | primary + fallback de ese mes |
| septiembre, primary presente | primary | Puebla 10/09 = -0.77 | solo primary de ese mes |

El primary de septiembre no bloquea el fallback de agosto.

Caso inverso: agosto con primary queda en primary (-0.44 el 15/08) y no consulta fallback. Septiembre sin primary usa fallback en fechas reales (10/09 = 0.19). El 15/09, ya en corte, usa `promDescTotal` -0.35 y no el 0.19 del fallback.

Ventana 3M, dos plantas: 3 consultas primary (julio, agosto, septiembre) y 1 fallback (solo agosto). No hay consulta por planta.

## Caso clientes nuevos

Rango `1m` de septiembre de 2026, ventana visual desde 2026-09-01:

- `financialStart` = 2026-09-01. Compras y C&D no retroceden a agosto.
- `customerFactsStart` = 2026-08-01. Ventas y descuentos sí cargan agosto.

CLIENTE A con 100 kg en agosto y 850 kg el 17/09 no es nuevo. CLIENTE B sin compra en agosto sí es nuevo el 17/09. Top 10: 850 kg y descuento 603.5/850. La mini gráfica queda en SEM -2, SEM -1 y Jue 17. Agosto no aparece en `points`.

Enero 2027:

- `customerFactsStart` = 2026-12-01
- `financialStart` y compras = 2027-01-01
- C&D no consulta diciembre
- diciembre con 100 kg: no es nuevo en enero
- diciembre sin compra: nuevo el 17/01

## Pruebas

`test/igf-diario-grafica-corte-cd-clientes-054-r2.test.js`: 20/20.

Regresión 054, 054-R1, 054-R2, 053BC, 053A, 053A-R1, 053A-R2, 052, 050, 023, 024, 025, 026, 027, 028, 029, 030, 033, 049: 180/180.

`git diff --check`: limpio.

## Intactos

UI 054, toggle $/kg, tendencia con índices reales, Top 10, mini gráfica, Excel, gate Todas antes de `pool.connect()`. Sin XLSX en runtime, sin writes, sin DDL, sin OpenAI.

## Desviaciones

- El día exacto del corte sin forecast de canal queda `null`. Convertirlo en 0 rompería 028. Los días estrictamente posteriores al corte sin forecast siguen en 0, igual que 023.
- `loadLiveGrafica` reenvía `opts.todayYmd` al panel de clientes nuevos. Si no viene, el panel sigue usando la fecha de negocio. Sirve para fijar el ancla en la prueba; la ruta de producción no lo manda.
- `director-ia-cutoff-aware-forecast-semantics` y `director-ia-prom-cutoff-runtime-parity` fallan en el enrutamiento conversacional (`profitability_period_ranking` y prompt nulo). Esos archivos no están en el diff. No se tocaron.
