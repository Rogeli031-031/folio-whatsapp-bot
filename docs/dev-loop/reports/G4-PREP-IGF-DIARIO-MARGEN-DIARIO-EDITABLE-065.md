# G4-PREP-IGF-DIARIO-MARGEN-DIARIO-EDITABLE-065

Estado: DONE_PENDING_REVIEW. El merge y el deploy quedan reservados al HUMAN_APPROVER.

## Referencias

- `origin/main`: `e14185996626b22cf170c40c5cbcd2010cd4e8bc`
- product SHA: `76e667bc5ea824564a47a7432d41fc0d206328ea`
- delivery SHA: `8103e73ef68064de449f3fc7772d1e39242a5ff6`
- Rama: `implementation/igf-diario-margen-diario-editable-065`
- Posición verificada antes de este prep: ahead 2, behind 0
- `git diff --check`: limpio

Este prep no modifica producto, tests, schema, endpoints, fórmulas ni el conteo de consultas.

## Schema

Tabla `arr.igf_diario_margen_manual`.

PRIMARY KEY: `plant_code`, `year`, `month`, `fecha`.

`costo_kg NUMERIC(18,6) NULL`, `flete_kg NUMERIC(18,6) NULL`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_by TEXT NULL`.

`CREATE TABLE IF NOT EXISTS`. Sin seed, sin migración y sin copia desde Compras. No modifica CONTROL DE COMPRAS. Si costo y flete quedan ambos NULL, la fila se elimina.

## Endpoints

- `GET /api/dashboard/igf-diario-margen-diario`
- `PATCH /api/dashboard/igf-diario-margen-diario`

El PATCH acepta varios días, valida todo antes de escribir y usa `BEGIN` / escrituras / `COMMIT`. Un fallo hace `ROLLBACK` completo. Rechaza fecha anterior al corte y periodos anteriores a octubre 2026.

## Corte

El corte es la Fecha de carga del dashboard. Ejemplo: `2026-10-05`.

- `2026-10-04` y cualquier fecha anterior: solo lectura.
- `2026-10-05` y cualquier fecha posterior: Costo KG y Flete KG editables.
- Margen Bruto nunca se captura.

Costo y Flete son independientes. `0` es un override válido. `null` restaura el automático de ese campo. Un campo omitido conserva el otro.

Si existe número manual y la fecha es mayor o igual al corte, ese número reemplaza la fuente automática de ese campo. Si no existe, se usa el automático actual. El Precio siempre es la resolución actual.

Un override guardado detrás de un corte nuevo permanece en la tabla y deja de aplicarse. Si el corte pasa a `2026-10-06`, el override del `2026-10-05` ya no entra al cálculo.

## Fórmulas

Margen bruto diario: `precio - costo_kg_efectivo - flete_kg_efectivo`.

Ejemplo de prueba: `20.06 - 12.60 - 1.23 = 6.23`. Esos números no están hardcodeados en el producto.

Acumulado: `SUM(MargenBrutoDia * VentaKgDia) / SUM(VentaKgDia)`. HG permanece intacto.

## UI

Solo IGF Diario acumulado. El Margen de cada planta es clickeable. Zona Provincia no lo es.

El modal es horizontal: FECHA, COSTO KG, FLETE KG y MARGEN BRUTO. No hay fila Precio. Hay scroll horizontal. El margen se recalcula al editar.

## Excel

Desde octubre 2026, F toma el costo efectivo y G el flete efectivo. Antes del corte se ignora el manual.

H conserva la fórmula `IF(AND(ISNUMBER(C),ISNUMBER(F),ISNUMBER(G)),C-F-G,"")`.

Todas aplica a cada planta solo sus overrides. Provincia deriva F y G de las hojas planta y H sigue siendo C-F-G. No hay override de Zona Provincia.

## Identidad y performance

Tehuacan/Tehuacán y GTM Queretaro/Querétaro siguen resolviéndose por la identidad de 063-R1. No hay hardcode por planta.

`listMonthOverrides` corre una vez antes del loop de plantas. No hay una consulta de overrides por planta. El conteo de la ruta acumulada pasa de 2 a 3: ventas, precio y una carga mensual. Esa carga es un solo `SELECT` de `arr.igf_diario_margen_manual`.

Forecast permanece intacto. 064-R1 permanece intacto.

## Pruebas ya corridas en el delivery

- 065: 8/8
- Regresiones 064-R1, 064, 063-R1, 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054, 054-R1, 054-R2 y 054-R3: en verde
- Excel 036-044: en verde
- `frontend npm run build`: 0
- `node --check server.js`: 0
- `git diff --check`: limpio

## Pull request

- Número: 107
- URL: https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/107
- Base: `main`
- Head: `implementation/igf-diario-margen-diario-editable-065`
- Título: IMPL 065: margen diario editable por Costo KG y Flete KG
- mergeable: true
- mergeable_state: clean
- merged: false

NO MERGE. NO DEPLOY.
