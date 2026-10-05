# G4-PREP-IGF-DIARIO-DESGLOSE-GASTOS-064

status: DONE_PENDING_REVIEW

## Referencias

| Campo | Valor |
| --- | --- |
| main SHA | `7da3851c7bee0a629a2348478b3a1408985e5945` |
| product SHA | `8335d52c16ed0aa361e34f7cfe6c7895cb34823b` |
| delivery SHA | `a4356094c9c36c84401a01e57a165fb6411c7a18` |
| rama | `implementation/igf-diario-desglose-gastos-064` |
| ahead / behind | 2 / 0 al verificar, antes de este preparativo |
| PR | [#105](https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/105) |

`origin/main` seguía en `7da3851c7bee0a629a2348478b3a1408985e5945` después de `git fetch origin`. No hubo rebase ni merge. `git diff --check` quedó limpio. Este preparativo no cambia lib, frontend, server, tests, schema, fórmulas, layout ni endpoints.

## Gate octubre 2026

`usesDetailedExpenseLayout` es verdadero solo si el año es posterior a 2026, o si es 2026 y el mes es octubre o después. 2026-09 queda en falso. 2026-10 y 2027-01 quedan en verdadero.

## Septiembre legacy intacto

En 2026-09, M sigue siendo el total de corporativos y T el de operativos. HG sigue en X/Y, el sobrante posterior en AA, C&D en AC, el resultado en AE/AF, el comentario en AH, las ventas en AI y el carry oculto en AJ/AK. No hay columna R nueva ni encabezados J/K/L/Q/R/S/T de conceptos. La UI conserva Manual y Auto.

## Schema

Tabla `arr.igf_diario_gastos_desglose`. Llave `plant_code`, `year`, `month`. Conceptos: `gasto_corporativo`, `inversiones`, `impuestos_federales`, `presupuesto_nomina_gastos`, `presupuesto_imss_sua`, `extraordinarios`, `provisiones_planta`. Creación idempotente, sin migración, sin datos iniciales y sin tocar históricos. El 0 es válido. Un grupo se activa solo cuando todos sus números existen.

## Endpoints

- `GET /api/dashboard/igf-diario-gastos-desglose?year=&month=`
- `PATCH /api/dashboard/igf-diario-gastos-desglose`

El PATCH corporativo exige los 3 conceptos. El operativo exige los 4. Un periodo anterior a octubre 2026 se rechaza. Siguen `dashboardAuthMiddleware`, los bloqueos financieros y `assertPlantaPermitidaDashboard`. No se ampliaron permisos.

## Transacción y sync 062

El desglose y el total de `arr.igf_diario_gastos_manual` se guardan en la misma transacción. Si una escritura falla, hay rollback. Guardar corporativos actualiza solo `corporativos` y conserva `operativos`. Guardar operativos hace lo contrario. La suma usa centavos.

## Fallback agregado

Si el grupo no tiene desglose completo, el total efectivo sigue siendo el agregado 062. El modal muestra el total actual sin desglose y no llena un concepto con ese importe. Corporativos y operativos son independientes.

## Modales

Corporativos: Gasto Corporativo, Inversiones e Impuestos Federales, con TOTAL en vivo, Guardar y Cancelar.

Operativos: Presupuesto Nómina/Gastos, Presupuesto IMSS/SUA, Extraordinarios y Provisiones de la Planta, con TOTAL en vivo, Guardar y Cancelar.

Desde octubre no se muestran Manual ni Auto. Zona Provincia no se edita. La tabla web no agrega siete columnas.

## J/K/L/M y Q/R/S/T/U

J Gasto Corporativo, K Inversiones, L Impuestos Federales, M total corporativos. Q Presupuesto Nómina/Gastos, R Presupuesto IMSS/SUA, S Extraordinarios, T Provisiones de la Planta, U total operativos. Sin desglose, J:L y Q:T quedan vacíos y M/U conservan el agregado.

## Desplazamiento desde R

La columna R nueva corre todo lo que estaba desde R hacia la derecha. O sigue siendo margen neto. W es sobrante de operación, Y/Z el HG, AB el sobrante posterior, AD el C&D, AF/AG el resultado, AI el comentario, AJ las ventas y AK/AL el carry oculto.

## Fórmulas diarias

En día hábil con venta mayor que cero: `(monto mensual / hábiles del mes) / Venta KG del día`. Si la venta del día es cero o no es numérica, la celda queda en blanco. En inhábil, los siete conceptos escriben 0. Con desglose, M del día es J+K+L y U del día es Q+R+S+T. O = H - M. W = O - U. Z = Y / B. AB = W - Z. AF = AB + AD. AG = AF * B.

## Fórmula semanal

`((monto mensual / hábiles del mes) * hábiles de esa semana) / Venta KG de la semana`. No es un promedio de las celdas diarias. Un día hábil con venta cero conserva su dinero. Si la venta semanal no es positiva, el resultado queda en blanco. M de la semana es J+K+L y U es Q+R+S+T.

## TOTAL MES

Cada concepto es `monto mensual / Venta KG TOTAL MES`. La fila se encuentra por la etiqueta TOTAL MES. M es J+K+L y U es Q+R+S+T.

## Provincia

Desde octubre, IGF Diario Provincia usa el layout nuevo. J/K/L y Q/R/S/T se ponderan por Venta KG. M y U suman el total efectivo de todas las plantas, incluido el agregado de una planta que aún no tiene desglose. J+K+L puede no explicar todo M durante la transición. No se inventa la clasificación. Zona Provincia no se captura.

## Individual y Todas

Desde octubre, la hoja individual y cada hoja de Todas usan el layout nuevo, y Provincia también. Antes de octubre, todo queda legacy. Aplica a todas las plantas. No hay un caso fijo de Puebla.

## Forecast y 063-R1

Forecast no consume el desglose. Margen, HG, Com. y Desc. y la columna financiera Impuestos quedan intactos. La paridad de plantas de 063-R1 y el desempeño de 063 no se modificaron en este preparativo.

## Pruebas

- 064: 21/21.
- 063-R1, 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054-R3 y Excel 036-041: 75/75.
- 059-R1 al repetir: 5/5.
- `frontend npm run build`: PASS.
- `node --check server.js`: PASS.
- `git diff --check`: limpio antes de este reporte.

## Pull request

- Número: 105
- URL: https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/105
- Base: `main`
- Head: `implementation/igf-diario-desglose-gastos-064`
- Título: IMPL 064: desglose Corporativos y Operativos en IGF Diario
- Estado al abrirlo: open, mergeable true, mergeable_state clean, head `a4356094c9c36c84401a01e57a165fb6411c7a18`

NO MERGE. NO DEPLOY. El merge queda reservado al HUMAN_APPROVER.
