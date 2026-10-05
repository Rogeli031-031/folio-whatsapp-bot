# IMPL-IGF-DIARIO-REBALANCEO-DIARIO-GASTOS-064-R1

Estado: DONE_PENDING_REVIEW. Sin merge y sin deploy.

Producto: `631d8cae393a509b378cc3a6e06a3165731c1cd4`
Base: `a3e546fccdf7e89b5e4c3b59b148079587106505`
Rama: `implementation/igf-diario-rebalanceo-diario-gastos-064-r1`

## Esquema

Tabla nueva `arr.igf_diario_gastos_distribucion_manual`.

Clave primaria: `plant_code`, `year`, `month`, `concepto`, `fecha`.
`importe NUMERIC(18,2) NOT NULL`, `updated_at`, `updated_by`.

`CREATE TABLE IF NOT EXISTS`. No hay datos semilla, no hay migraciones y no se guardan días inhábiles ni meses anteriores a octubre 2026. Solo se persisten los días fijos. `arr.igf_diario_gastos_desglose` no cambia de esquema.

Conceptos válidos: `gasto_corporativo`, `inversiones`, `impuestos_federales`, `presupuesto_nomina_gastos`, `presupuesto_imss_sua`, `extraordinarios`, `provisiones_planta`.

## Endpoints

- `GET /api/dashboard/igf-diario-gastos-distribucion?year=&month=&plant_code=&concepto=`
- `PATCH` de la misma ruta con `{ year, month, plant_code, concepto, fecha, importe }`

`importe` numérico, incluido 0, fija el día. `null` borra el fijo y restaura el promedio. La respuesta trae el calendario recalculado: `monthly_amount`, `business_days`, `manual_assigned`, `remaining_amount`, `remaining_business_days`, `remaining_average`, `initial_average` y `days[]` con `fecha`, `habil`, `importe_asignado`, `manual`, `editable`.

Auth existente: `dashboardAuthMiddleware`, `dashboardBlockGAFinancialKpis`, `dashboardBlockGVForbidden`. La escritura usa `assertPlantaPermitidaDashboard`.

## Algoritmo

Todo el reparto es en centavos. `remaining_cents` empieza en el monto mensual. Por cada día hábil, en orden:

- si hay override, se asigna ese importe exacto;
- si no, `Math.round(remaining_cents / remaining_business_days)`;
- el último día automático recibe el residuo exacto porque la división entre 1 no redondea.

Después se resta lo asignado y se descuenta un día hábil. Un override futuro no entra en el cálculo de los automáticos anteriores. Los días fijos no se recalculan para cuadrar. El último automático absorbe el centavo. Si el último hábil es manual y no coincide con el saldo, o si un automático quedaría negativo, se rechaza con: `No hay días hábiles posteriores para redistribuir esta diferencia.`

El promedio visible es `Math.round(centavos / días) / 100`.

## Fixture

Monto 953777.33, 27 hábiles, primeros tres días fijos en 37412.69. Esos números no están en el código de producto.

- promedio inicial: 35325.09
- fijo acumulado: 112238.07
- saldo pendiente: 841539.26
- promedio restante: 35064.14
- suma final: 953777.33 exactos

El día 1 automático, antes y después de fijar un día posterior, permanece en 35325.09.

## Monto mensual

Antes de guardar un grupo de 064 se reconstruye el calendario con el monto nuevo y los fijos existentes. Si sigue cerrando, se guarda el monto y se conservan los overrides. Si no, no se escribe el monto y se pide ajustar o restaurar los días fijos.

## UI

Dentro del modal de 064, cada concepto abre Distribución diaria. Muestra monto, promedio inicial, fijo acumulado, saldo pendiente, días restantes y promedio restante. Acciones: Editar importe y Restaurar promedio. El inhábil queda en 0 y no se edita. Al guardar un día, la respuesta sustituye la tabla sin recargar la página. OPERATIVOS y CORPORATIVOS de octubre no recuperan Manual/Auto.

## Excel desde octubre 2026

Día hábil: `IF(AND(ISNUMBER(B),B<>0),asignado/B,"")`.
Inhábil: 0 numérico.
Si B está vacío o es 0, el $/kg del día queda en blanco y el dinero asignado sigue dentro del cierre semanal.
Semana: `IF(OR(NOT(ISNUMBER(B)),B<=0),"",suma_del_dinero_asignado_de_la_semana/B)`. No promedia celdas diarias.
TOTAL MES: monto mensual / Venta KG, `$J$3/B` y equivalentes. M = J+K+L. U = Q+R+S+T.
Provincia semanal: celdas reales de las hojas de planta (`weightedAcross`), no el prorrateo uniforme. El mes de Provincia sigue siendo el monto agregado / Venta KG.
Antes de octubre el layout legacy no cambia. Sin desglose activo, J:L y Q:T siguen vacíos y M/U conservan el agregado de 062.

## Pruebas

`test/igf-diario-rebalanceo-diario-gastos-064-r1.test.js`: 11/11.
Regresión 064: 21/21.
063-R1, 063, 062, 061, 059-R1, 059, 053A, 053A-R1, 053A-R2, 054-R3 y Excel 036–041: 76/76.
`node --check server.js` y `git diff --check` sin hallazgos.
`npm run build` del dashboard terminó en 0. Forecast y `finiteMetric` / `totalMesMarginAndHg` siguen intactos.

## Archivos

- `lib/igf-diario-gastos-distribucion.js`
- `lib/igf-diario-gastos-desglose.js`
- `lib/igf-diario-expense-excel.js`
- `lib/dashboard-arr-forecast.js`
- `server.js`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/igf-diario-rebalanceo-diario-gastos-064-r1.test.js`
- `test/igf-diario-desglose-gastos-064.test.js`

STOP. No hay PR, merge ni deploy.
