# IMPL-ARR-IGF-DIARIO-FINANCIAL-SOURCES-066

Producto: `f3677bf43cd59ed38068fcb858193b55d83c21bf`
Base: `67e13b780c0301e31fa7f27c2ed0de1eb3df59`
Rama: `implementation/arr-igf-diario-financial-sources-066`

## Gate octubre

`usesOctoberContract` reutiliza `usesDetailedExpenseLayout`. Aplica en 2026-10, 2026-11 y después. Septiembre 2026 y cualquier mes anterior conservan el cálculo previo, incluido `-Math.abs` del descuento y la reconstrucción `abs(HG / HG%)`.

## Helper TOTAL MES

`lib/igf-diario-monthly-financials.js` pondera `SUM(métrica × ventaKg) / SUM(ventaKg)` solo con días en los que ambos valores son numéricos. El cero explícito cuenta. Vacío, null y no numérico no entran. No hay fila fija ni lectura de XLSX.

Salida por planta: ventaKg, ventaTon, costoKg, fleteKg, margenKg, comDescKg, hgKg, hgDollar, hgPct, operativosImporte, gastoCorporativoImporte, inversionesImporte, impuestosFederalesImporte, corporativosImporte, impuestoKg, gastoImporte.

## Margen

H mensual = `SUM(H_dia × B_dia) / SUM(B_dia)` después de los overrides de precio, costo y flete. ARR y el mini leen ese margen desde octubre.

## Descuento / AD

AD mensual = `SUM(AD_dia × B_dia) / SUM(B_dia)`, con el signo original. Fixture de prueba: `(-4.2 × 250 + -4.36 × 750) / 1000 = -4.32`. Pronóstico, mini y ARR reciben ese mismo número. Un valor positivo se conserva positivo. Octubre no pasa el descuento por `abs`.

## Pronóstico

Lookback, PROM y la selección de días siguen armando el valor futuro de cada fecha. La venta PROY conserva el cierre anterior por día de semana. Desde octubre, `proy_desc_kg` ya no redondea el dinero por día de semana: materializa C&D y venta de cada fecha y pondera el mes una sola vez. Cambiar los días del PROM produce otro AD.

## Operativos

Importe mensual Q+R+S+T: nómina/gastos + IMSS/SUA + extraordinarios + provisiones. Si falta un componente, el importe queda null.

## Corporativos

Gasto corporativo + inversiones. Impuestos federales no entran. Si J o K no están separados, corporativos queda null. No se reparte un agregado.

## Impuestos

Impuestos federales / venta kg proyectada. Con venta <= 0 queda null. El gasto no los vuelve a sumar y el resultado final no los resta otra vez.

## HG y HG$

HG$ = costo kg mensual + flete kg mensual. `hgPct = (Z / (F+G)) × -1`. Si F+G es 0 o falta un dato, el porcentaje queda null. Z conserva su signo. La pantalla de ARR sigue mostrando `hgPct × 100`.

## Fórmulas posteriores

Ingreso sigue siendo `(margen + descuento − HG) × venta × 1000`. Utilidad de operación = ingreso − operativos. Resultado final = utilidad − corporativos. La rentabilidad ARR de clientes sigue siendo ingreso − gasto. Solo cambian los insumos de octubre.

## Zona

Venta suma plantas. Margen, descuento, impuesto y HG se ponderan por venta. Los importes se suman. Si falta un importe, la zona no lo convierte en cero.

## Histórico

Septiembre usa el contrato anterior. Octubre usa 066. La comparación visible sigue siendo mes B − mes A, sin recalcular septiembre.

## 065-R1 y 064-R1

Un precio, costo o flete manual cambia F, G, H, HG$ y el margen según corresponda. El desglose J/K/L y Q/R/S/T no cambia de layout. El Excel puede seguir mostrando M = J+K+L. ARR clasifica corporativos como J+K e impuestos como L/B.

## Performance

El acumulado de una planta en octubre sigue en 3 consultas dentro de `loadIgfDiarioAcumulado` (ventas, precio y un lote de overrides). El desglose mensual se lee una vez en la ruta, no por planta. ARR pide el acumulado una vez por mes.

## Pruebas

`test/arr-igf-diario-financial-sources-066.test.js`: 10/10. Regresión 059, 059-R1, 061, 062, 063, 063-R1, 064, 064-R1, 065, 065-R1 y Excel 036-044: 100/100. `node --check server.js` correcto. `frontend-dashboard` `npm run build` correcto.

## Archivos

- `lib/igf-diario-monthly-financials.js`
- `frontend-dashboard/lib/igf-october-mini.js`
- `lib/dashboard-arr-forecast.js`
- `lib/igf-diario-grafica.js`
- `server.js`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `frontend-dashboard/app/arr/ArrClient.tsx`
- `test/arr-igf-diario-financial-sources-066.test.js`
