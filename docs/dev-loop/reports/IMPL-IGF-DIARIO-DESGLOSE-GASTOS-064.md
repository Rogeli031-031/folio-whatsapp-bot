# IMPL-IGF-DIARIO-DESGLOSE-GASTOS-064

status: DONE_PENDING_REVIEW

base_sha: 7da3851c7bee0a629a2348478b3a1408985e5945

branch: implementation/igf-diario-desglose-gastos-064

product_sha: 8335d52c16ed0aa361e34f7cfe6c7895cb34823b

## Schema

Tabla nueva `arr.igf_diario_gastos_desglose`. PK `(plant_code, year, month)`.

Campos NUMERIC(18,2) NULL:

- gasto_corporativo, inversiones, impuestos_federales
- presupuesto_nomina_gastos, presupuesto_imss_sua, extraordinarios, provisiones_planta

También `updated_at` y `updated_by`. Creación con `CREATE TABLE IF NOT EXISTS`. No inserta datos, no migra y no reclasifica históricos. `arr.igf_diario_gastos_manual` sigue igual.

Un grupo corporativo está activo solo si los 3 números existen. Uno operativo, solo si los 4 existen. 0 cuenta. null no activa el grupo.

## Endpoints

- `GET /api/dashboard/igf-diario-gastos-desglose?year=&month=`
- `PATCH /api/dashboard/igf-diario-gastos-desglose`

PATCH corporativos exige `group: "corporativos"` y los 3 conceptos. PATCH operativos exige `group: "operativos"` y los 4. null u omitido se rechaza. Un periodo anterior a octubre 2026 se rechaza.

Ambos usan `dashboardAuthMiddleware`, `dashboardBlockGAFinancialKpis`, `dashboardBlockGVForbidden`. La escritura usa `assertPlantaPermitidaDashboard`. No se ampliaron permisos.

## Transacción

Desglose y total 062 se escriben en el mismo `BEGIN`/`COMMIT`. Si el sync falla, `ROLLBACK` y no queda desglose a medias. La suma usa centavos: 0.1 + 0.2 + 0.3 = 0.6.

## Compatibilidad 062

Al guardar corporativos, `arr.igf_diario_gastos_manual.corporativos` queda con la suma y `operativos` no se toca. Al guardar operativos, al revés. Sin desglose, el total efectivo sigue siendo el de 062 (manual si existe, si no el automático).

## Gate desde 2026-10

`usesDetailedExpenseLayout(year, month)` es true solo si `year > 2026` o `year === 2026 && month >= 10`.

- 2026-09 => false
- 2026-10 => true
- 2027-01 => true

La UI no llama el endpoint de desglose antes de octubre.

## UI y modal

Desde octubre la tabla sigue con una columna OPERATIVOS y una CORPORATIVOS. El número abre un modal. Zona Provincia no se edita. No hay edición inline ni etiquetas Manual/Auto. Antes de octubre se conserva la edición 062, incluidas Manual y Auto.

Modal corporativos: Gasto Corporativo, Inversiones, Impuestos Federales, TOTAL en vivo, Guardar y Cancelar.

Modal operativos: Presupuesto Nómina/Gastos, Presupuesto IMSS/SUA, Extraordinarios, Provisiones de la Planta, TOTAL en vivo, Guardar y Cancelar.

Impuestos Federales no sustituye la columna financiera Impuestos.

## Fallback sin desglose

Si el grupo no está completo, el total efectivo es el agregado 062. En el modal se muestra el total actual sin desglose y los conceptos quedan vacíos. No se copia el total a un concepto. Corporativos y operativos son independientes.

## Mapa legacy, antes de octubre

A FECHA, B VENTA KG, C PRECIO, D INGRESO, F COSTO KG, G FLETE KG, H MARGEN BRUTO, M IMPORTE corporativos, O MARGEN NETO, T IMPORTE operativos, V SOBRANTE, X IMPORTE HG, Y IMPORTE HG POR KG, AA sobrante post HG, AC C&D, AE RESULTADO POR KG, AF RESULTADO, AH comentario, AI ventas, AJ/AK carry ocultos. No hay columna R nueva.

## Mapa nuevo, desde octubre

J Gasto Corporativo, K Inversiones, L Impuestos Federales, M total corporativos, O MARGEN NETO, Q Nómina/Gastos, R IMSS/SUA, S Extraordinarios, T Provisiones, U total operativos, W sobrante, Y IMPORTE HG, Z IMPORTE HG POR KG, AB sobrante post HG, AD C&D, AF RESULTADO POR KG, AG RESULTADO, AI comentario, AJ ventas, AK/AL carry ocultos.

## Fórmulas diarias

Con desglose, día hábil y B > 0: `(monto mensual / hábiles) / B`. Día hábil con B vacío o 0: blank. Inhábil: 0 numérico en los 7 conceptos. M del día = J+K+L. U del día = Q+R+S+T.

Sin desglose, J:L y Q:T quedan vacíos. M y U conservan el agregado 062.

O = H - M. W = O - U. Z = Y / B. AB = W - Z. AF = AB + AD. AG = AF * B.

## Fórmula semanal

No promedia las celdas diarias. Para cada concepto:

`((monto mensual / hábiles del mes) * hábiles de esa semana) / Venta KG de la semana`

Un hábil con B = 0 sigue dentro del conteo de hábiles, así que su dinero no desaparece. Si la venta semanal no es positiva, el resultado queda blank. M semana = J+K+L. U semana = Q+R+S+T.

## TOTAL MES

`monto mensual / Venta KG TOTAL MES`. La fila se localiza por la etiqueta TOTAL MES, no por un número fijo. M = J+K+L. U = Q+R+S+T.

## Provincia

Desde octubre usa el mismo layout. J3:L3 y Q3:T3 suman los componentes de las hojas. M3 y U3 suman los totales efectivos, incluido el agregado de una planta sin desglose. Durante la transición J+K+L puede no explicar todo M. No se inventa la clasificación.

## Individual y Todas

Individual y cada hoja de Todas usan el layout nuevo desde octubre y el legacy antes. Provincia nueva solo desde octubre. No hay rama fija para Puebla.

## Septiembre intacto

En 2026-09, M sigue en la columna 13 y T en la 20. X/Y, AA, AC, AE/AF, AH/AI y el carry AJ/AK siguen en su sitio. No aparece el encabezado de IMSS/SUA ni la columna R nueva. Las fórmulas diarias siguen en `$M$3` y `$T$3`.

## Pruebas

- `test/igf-diario-desglose-gastos-064.test.js`: 21/21.
- 063-R1, 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054-R3 y Excel 036–041: 75/75 en la corrida conjunta, y 059-R1 5/5 al repetir.
- `frontend npm run build`: PASS.
- `node --check server.js`: PASS.
- `git diff --check`: limpio.

El ajuste de 062 solo mueve la lectura del total operativo de octubre de T3 a U3, porque ese mes ya usa el layout nuevo. Septiembre no se tocó.

## Archivos

- `lib/igf-diario-expense-layout.js`
- `lib/igf-diario-gastos-desglose.js`
- `lib/igf-diario-expense-excel.js`
- `lib/igf-diario-gastos-manuales.js`
- `lib/igf-diario-puebla.js`
- `lib/dashboard-arr-forecast.js`
- `server.js`
- `frontend-dashboard/lib/igf-expense-layout.ts`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/igf-diario-desglose-gastos-064.test.js`
- `test/igf-diario-gastos-manuales-062.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-IGF-DIARIO-DESGLOSE-GASTOS-064.md`

NO MERGE. NO DEPLOY.
