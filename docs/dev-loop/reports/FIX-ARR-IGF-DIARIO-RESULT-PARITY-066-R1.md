# FIX-ARR-IGF-DIARIO-RESULT-PARITY-066-R1

Producto: `9b3bb1cac11a5efbba9d2de300c6e8ed4fc67669`
Base: `1b7584683947d057ef49652d76399aa20a3bbafd`
Rama: `fix/arr-igf-diario-result-parity-066-r1`

## Causa de la venta

`applyFinancialsToMiniRow` tomaba `row.ventaTon`, la venta del pronóstico. Desde octubre la venta financiera es `financials.ventaTon`, equivalente a B TOTAL MES / 1000. Si ese dato falta, queda null. No vuelve a la venta anterior.

Esa venta alimenta el ingreso, el impuesto por kilo, el resultado, el mini, ARR y la zona.

## Causa de los impuestos

066 dejó corporativos en J+K y el gasto visible en operativos + corporativos. El resultado seguía siendo ingreso − operativos − corporativos, así que L salía de la clasificación y también del resultado. El Excel sí carga L dentro de AG.

## Fórmula

Antes: `utilidad − corporativos`.

Después:

```
ingreso = (margen + descuento − HG) × venta kg
utilidad = ingreso − operativos
resultado = utilidad − corporativos − impuestos federales
```

Corporativos sigue siendo J+K. El gasto visible no suma L. L se resta una sola vez, como importe, no como $/kg además del importe. Cero explícito vale. Si falta venta, operativos, corporativos o impuestos federales, el resultado queda null.

## Equivalencia con AG

AG del Excel acumula la carga de J, K y L. El dashboard muestra J+K y L por separado, y el resultado vuelve a juntar esa misma carga. El cálculo usa la precisión del helper, no los decimales visibles de H, AD o Z.

## Histórico y zona

Septiembre sigue con la venta y el resultado anteriores. La zona suma las ventas TOTAL MES y los resultados corregidos. Un resultado null no se convierte en cero.

## Performance

No hay consulta nueva. El acumulado de una planta sigue en 3 lecturas y el desglose mensual sigue siendo una lectura de la ruta.

## Pruebas

`test/arr-igf-diario-result-parity-066-r1.test.js`: 5/5. 066: 10/10. Regresión 059 a 065-R1 y Excel 036-044: 100/100. `node --check server.js` correcto. Build del dashboard correcto. `git diff --check` sin errores de contenido.

## Archivos

- `frontend-dashboard/lib/igf-october-mini.js`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/arr-igf-diario-result-parity-066-r1.test.js`
- `test/arr-igf-diario-financial-sources-066.test.js`
