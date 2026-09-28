# FIX-IGF-DIARIO-CONTINUAR-PROYECCION-DESDE-CORTE-050

## Identidad

```yaml
task_id: "FIX-IGF-DIARIO-CONTINUAR-PROYECCION-DESDE-CORTE-050"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/igf-diario-puebla.js"
  - "test/igf-diario-continuar-proyeccion-desde-corte-050.test.js"
  - "test/compras-last-real-cost-igf-future-blank-045.test.js"
  - "test/igf-corte-proyeccion-compras-importe-049.test.js"
  - "test/igf-diario-puebla-036.test.js"
  - "test/compras-importe-venta-igf-por-planta-048.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-CONTINUAR-PROYECCION-DESDE-CORTE-050.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "lib/compras-excel.js"
  - "server.js"
  - "frontend"
  - "lib/dashboard-arr-forecast.js"
  - "Provincia Venta Diaria"
  - "Provincia Comisiones"
  - "PRECIO"
  - "fórmula de Compras"
  - "base de datos"
  - "Director IA"
  - "frontend-dashboard/.next"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "036 y 048 también fijaban VENTA KG como CASA+COMISIONISTA y, en 048, filas vacías después del corte. Esas aserciones se actualizaron porque la 050 sustituye ese contrato. No se relajó ninguna otra aserción."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | FIX-IGF-DIARIO-CONTINUAR-PROYECCION-DESDE-CORTE-050 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 164310afb26466424c64c1a03139f11a94b93162 |
| branch | fix/igf-diario-continuar-proyeccion-desde-corte-050 |
| schema_changes | false |
| data_mutation | false |
| git_diff_check | clean |

## Antes y ahora

Antes, el corte era el último día visible de IGF Diario. La condición `fecha > corte` marcaba el día como futuro y `writeDay` regresaba después de escribir la fecha, dejando B:AF vacías. Esos días no entraban en los subtotales ni en TOTAL MES. VENTA KG se armaba sumando CASA y COMISIONISTA y multiplicando por 1000.

Ahora el corte es el primer día proyectado.

- `fecha < corte` es real. Si falta costo o flete histórico, se conserva el carry existente: la fórmula prueba el valor del día y, si no es un número distinto de cero, el de los días históricos anteriores. El amarillo condicional de ese hueco sigue en el mismo camino.
- `fecha >= corte` es proyectado, incluido el día de corte. La fila se llena hasta el último día del mes. No hay carry histórico adicional: costo y flete referencian solo la celda de esa fecha en CONTROL DE COMPRAS.
- Todos los días del mes entran en `dayRows`, en el rango de la semana y en TOTAL MES.

IGF Diario no calcula un segundo pronóstico. Lee con fórmulas las hojas que ya traen el valor real o proyectado.

## Fuentes

VENTA KG referencia la columna total de la planta en Provincia Venta Diaria, multiplicada por 1000. `plantTotalCol` recorre la fila 1, omite DÍA, CASA, COMISIONISTA y Tot Provincia, y acepta la columna con `plantEquivalent` (o, si no hay callback, el encabezado que contiene PUEBLA). No se asume la columna B.

PRECIO sigue en `PRECIO`. COSTO KG y FLETE KG siguen en CONTROL DE COMPRAS, columnas COSTO KG y TARIFA del consolidado. HG sigue en CONTROL DE COMPRAS. C&D sigue en Provincia Comisiones, columna 2. INGRESO, MARGEN BRUTO, MARGEN NETO, SOBRANTE, RESULTADO y RESULTADO POR KG conservan sus fórmulas y corren hasta fin de mes.

## Sustitución de contrato en pruebas

045 y 049 exigían B:AF vacías después del corte. Ese contrato queda sustituido. 045 ahora exige proyección hasta el último día y que Semana 4, Semana 5 y TOTAL MES incluyan esos días. 049 corte 25 exige filas proyectadas del 25 al 30. 049 corte 27 exige la columna total de Acapulco y de Tehuacán, no CASA+COMISIONISTA.

036 exigía `'Provincia Venta Diaria'!L2+'Provincia Venta Diaria'!M2)*1000`. Ahora exige la columna total de Puebla (`B2*1000` en ese fixture) y rechaza la suma L+M.

048 exigía la suma de canales y una fila 36 vacía cuando el corte era el 24. Ahora exige la columna total de la planta y que el día posterior al corte siga lleno.

## Pruebas

31 pruebas, 0 fallos: 050, 049, 048, 047, 045 y 044 a 036.

`git diff --check` no reportó errores.

ExcelJS no recalcula. Las pruebas comparan el texto de la fórmula y reabren el XLSX.

### Puebla, corte 2026-09-25

Fuente en toneladas, columna D (un señuelo "Otra" ocupa la B). CASA = 10 y COMISIONISTA = 20, suma 30, distinta del total.

| Día | Toneladas | VENTA KG |
|---|---|---|
| 25 | 42 | 42000 |
| 26 | 49.500 | 49500 |
| 27 | 21.5 | 21500 |
| 28 | 57 | 57000 |
| 29 | 61.5 | 61500 |
| 30 | 45.5 | 45500 |

El 26 referencia `D27*1000`. PRECIO, COSTO KG (`O`), FLETE KG (`AJ`), HG (`T`) y C&D referencian la fila de ese día. INGRESO es `C*B`, MARGEN BRUTO es `C-F-G` y RESULTADO es `AE*B`. Semana 4 suma `B32:B38` (21–27). Semana 5 suma `B41:B43` (28–30). TOTAL MES incluye `B39` y `B45`.

El día 24, con costo vacío, la fórmula de COSTO KG incluye O28. El día 25 incluye O30 y no incluye O28.

### Puebla, corte 2026-09-27

Los días 1 a 30 tienen fórmula de venta. El 26, histórico y sin costo propio, referencia O30. El 27 referencia O32 y no arrastra O30.

### Acapulco

La columna total está en E. El 26 referencia `E27*1000`, no la columna B ni CASA+COMISIONISTA ni Puebla.

### Alias

Código `Queretaro`, encabezado `Querétaro`. La hoja es `IGF Diario Queretaro` y el rótulo `PLANTA QUERÉTARO`. El 26 referencia `F27*1000`.

## Límite

No se abrió el libro en Excel de escritorio. `canalCols` sigue en el archivo y ya no lo llama el llenado. No hay PR, merge ni despliegue.
