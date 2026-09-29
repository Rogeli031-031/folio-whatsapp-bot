# FIX-IGF-GRAFICA-PRODUCCION-COVERAGE-054-R3

status: DONE_PENDING_REVIEW

base_sha: f62288cb131ea43866d19c75b0d517b9d3ab1e76

branch: fix/igf-grafica-produccion-coverage-054-r3

## Causa

La gráfica respondía 200 y cargaba clientes nuevos, pero AF/AE salían null. Tres inputs financieros no seguían al Excel:

1. PRECIO se pedía con `plant.nombre` (`GT Puebla`). El Excel usa `provinciaPlantCode || canon` (`Puebla`).
2. Corporativo y operativo se buscaban solo contra nombre y canon. Un alias de planta dejaba ambos null.
3. Compras no usaba `loadMonth`. La gráfica armaba proveedores, compras, HG y tarifas por su cuenta, y `safeQuery` convertía un error SQL en `[]`. El resultado era cobertura incompleta en $ y en $/kg, con semanas en blanco, sin fallar el endpoint.

## Corrección

- `loadMonthCore` es el armado numérico compartido. `loadMonth` sigue con `ensureProviders: true`. `loadMonthReadOnly` no crea proveedores ni escribe.
- La gráfica resuelve F/G/X con `resolveControlComprasDays` sobre ese payload, una vez por planta y mes.
- La clave de precio es `provinciaPlantCode || canon || nombre`.
- Gastos comparan nombre, canon, `provinciaPlantCode` y clave.
- Error de compras, HG, tarifas, precio o gastos: log `[igf-diario-grafica]` + componente y HTTP 500 genérico.
- La respuesta incluye `coverage_summary`. Si `numeric_points === 0`, el modal dice qué falta y deja visibles Clientes Nuevos y Top 10.

## Puebla

| | valor |
| --- | --- |
| nombre | GT Puebla |
| canon | Puebla |
| provinciaPlantCode | Puebla |
| precio antes | GT Puebla |
| precio ahora | Puebla |

Con precio bajo `Puebla`, C queda numérico por carry y el 02/09 tiene AF/AE numéricos.

## Acapulco

Antes: `numeric_points = 0`, semanas en blanco, cobertura incompleta en $ y $/kg.  
Después, con el payload de `loadMonth`: `numeric_points > 0` y `resultado_mxn` / `resultado_per_kg` numéricos el 02/09.

## Compras

`loadMonth` y `loadMonthReadOnly` producen el mismo F/G/X cuando los proveedores ya existen. El read-only no ejecuta INSERT/UPDATE/DELETE.

| fecha | F | G | X |
| --- | --- | --- | --- |
| 2026-09-01 | 13, heredado del día 2 | vacío hasta que hay tarifa propia | vacío |
| 2026-09-02 | 13 | 2 | -150 |
| 2026-09-03 | 13 | 2 | vacío si no hay kilos HG; el corte proyecta con el resolver de Excel |
| 2026-09-04 | 13 | 2 | igual que el corte |

Día 1 sin histórico sigue la regla 052.

## Paridad

Corte `2026-09-03`. Captura del 03/09 ignorada. Forecast 30,750 kg. Excel y gráfica coinciden:

| fecha | estado | B | C | F | G | X | AC | AE | AF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-02 | real | 10000 / 10000 | 20.50 / 20.50 | 13 / 13 | 2 / 2 | -150 / -150 | -0.40 / -0.40 | iguales | iguales |
| 2026-09-03 | proyectado | 30750 / 30750 | 20.50 / 20.50 | 13 / 13 | 2 / 2 | iguales | -0.35 / -0.35 | iguales | iguales |
| 2026-09-04 | proyectado | 12000 / 12000 | 20.70 / 20.70 | 13 / 13 | 2 / 2 | iguales | -0.22 / -0.22 | iguales | iguales |

## Cobertura

Ejemplo con HG realmente vacío el 02/09: `resultado_mxn` null, `resultado_per_kg` null, `missing_by_component.HG > 0`, `numeric_points = 0`. El modal muestra `Sin rentabilidad calculable para este periodo.` y `Falta: HG · N días`.

## Consultas

Una planta, sin fila por día:

| rango | compras del mes | HG | tarifas |
| --- | --- | --- | --- |
| 1M | 1 | 1 | 2 (mes + semilla) |
| 3M | 3 | 3 | 6 |

Dos plantas en 3M: 6 lecturas de compras, una por planta y mes. No se repite el mismo par.

## Error SQL

Si `arr.compras_hg` lanza, `loadLiveGrafica` rechaza. El endpoint responde 500 con `No se pudo armar la gráfica IGF Diario` y no devuelve el mensaje SQL.

## Pruebas

054-R3: 8/8.  
054, 054-R1, 054-R2, 053A, 053A-R1, 053A-R2, 053BC, 050, 052, 013, 020, 021, 022, 024, 025, 026, 027, 028, 029, 030, 033, 045, 048, 049 y el resto del lote: 287/289.

014 y 016 fallan igual en la base `f62288cb` (HG total -2361 vs -787, y la fórmula de flete incompleto). No vienen de este cambio.

`git diff --check`: limpio.

## Intactos

Sin writes desde la gráfica, sin DDL, sin XLSX en runtime, sin OpenAI. Excel sigue llamando `loadMonth` con proveedores requeridos. Clientes nuevos, Top 10, toggle, tendencia, corte de R2, C&D por mes, mes anterior y gate Todas siguen. Descargar Excel no cambió.

## Desviaciones

- Un fallo del contexto de pronóstico se sigue registrando y la proyección queda null. No está en la lista de errores financieros que deben ser 500.
- `query_count` de ventas sigue contando una consulta de más, como ya hacía `loadPlantFacts`. Las lecturas de compras sí son una por planta y mes.
