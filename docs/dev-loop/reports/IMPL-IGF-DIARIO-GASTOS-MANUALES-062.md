# IMPL-IGF-DIARIO-GASTOS-MANUALES-062

task_id: IMPL-IGF-DIARIO-GASTOS-MANUALES-062

outcome: DONE

status: DONE_PENDING_REVIEW

base_sha: eb6dd697d9a80fcc573dac62d8a59dfecf4bea08

branch: implementation/igf-diario-gastos-manuales-062

sha: pendiente del commit de esta entrega

## Schema

Tabla `arr.igf_diario_gastos_manual`, creada con `CREATE TABLE IF NOT EXISTS` en cada lectura o escritura. No hay FK. No hay INSERT de valores iniciales ni migración de cálculos automáticos.

Columnas:

- `plant_code VARCHAR(40) NOT NULL`
- `year SMALLINT NOT NULL`
- `month SMALLINT NOT NULL`
- `operativos NUMERIC(18,2) NULL`
- `corporativos NUMERIC(18,2) NULL`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_by TEXT NULL`

PK: `(plant_code, year, month)`.

Si los dos importes quedan NULL, la fila se elimina.

## Endpoints

- `GET /api/dashboard/igf-diario-gastos-manuales?year=2026&month=10`
- `PATCH /api/dashboard/igf-diario-gastos-manuales`

Ambos pasan por `dashboardAuthMiddleware`, `dashboardBlockGAFinancialKpis` y `dashboardBlockGVForbidden`.

PATCH exige `year`, `month` y `plant_code`. Un campo omitido no se modifica. `null` restaura el automático de ese campo. Un número finito, incluido 0, se guarda. La planta se resuelve con `resolveForecastExportPlant` y se valida con `assertPlantaPermitidaDashboard`. `updated_by` sale de `Dashboard:{actor_id}`.

GET devuelve solo las filas del periodo visibles para el alcance actual. GG, GA y AD con `plantas_permitidas` no ven ni escriben otra planta. ZP, AD y CF_CDMX sin lista siguen con alcance global. No se agregó ningún rol nuevo.

## Null y cero

```
effective = manual != null ? manual : automatico
```

0 es override. No se usa `override || automatico`. La ausencia de fila conserva el cálculo automático.

La clave es planta + año + mes. El corte no forma parte de la tabla ni de la consulta.

## UI

La edición existe solo con `igfTableMode === "igf_diario"`. Forecast sigue leyendo `igfMini` y no aplica overrides.

En filas de planta, OPERATIVOS y CORPORATIVOS se abren con un clic y se confirman con Guardar. Auto restaura ese campo. Cancelar descarta el borrador. Zona Provincia no es editable; se vuelve a sumar.

Tras guardar no hay recarga de página. El estado local actualiza gasto, utilidad operativa, resultado final y Zona Provincia. Venta, Margen, Com. y Desc., Impuestos, HG e INGRESO no se recalculan. El ingreso de cada fila se copia tal cual.

## Excel

`paintIgfChrome` sigue escribiendo corporativos en M3 (columna 13, fila 3) y operativos en T3 (columna 20, fila 3). No se cambiaron las fórmulas internas.

La descarga individual pasa el par efectivo a `fillIgfDiarioPuebla`. Planta=Todas resuelve el par de cada hoja con su override mensual y deja en automático a la planta sin override. IGF Diario Provincia conserva `SUM` de M3 y de T3 de esas hojas.

## Pruebas

062: PASS (12).

059: PASS.

059-R1: PASS.

061: PASS (3).

053A, 053A-R1, 053A-R2 y 054-R3: PASS.

`frontend-dashboard` `npm run build`: PASS.

`node --check server.js`: PASS.

`git diff --check`: limpio. `.next` no entra al commit.

## Archivos

- `lib/igf-diario-gastos-manuales.js`
- `server.js`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/igf-diario-gastos-manuales-062.test.js`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
- este reporte

## Protocolo

Forecast no consume la tabla. No hay merge, deploy ni push a `main`.
