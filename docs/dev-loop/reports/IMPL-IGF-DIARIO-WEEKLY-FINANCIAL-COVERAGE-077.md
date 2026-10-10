# IMPL-IGF-DIARIO-WEEKLY-FINANCIAL-COVERAGE-077

status: DONE_PENDING_REVIEW

base_sha: f6dbbe76021ce52f8f2559836239a95f415c2615

branch: implementation/igf-diario-weekly-financial-coverage-077

product_sha: cc5ef7975977936e835f8a13375ade170e45d496

decision: B — cobertura parcial explícita

## Contrato anterior

069-R1 sumaba venta conocida y omitía los días sin venta. Si un día con venta mayor que 0 no traía la métrica, `weighted` y `sumCovered` anulaban la semana. Con el fix 074, un domingo con 1,701 kg y sin tasa anulaba `com_desc_kg`, `resultado_kg` y `resultado_mxn` de toda la semana.

## Contrato nuevo

El día incompleto sigue en null. No se convierte en 0, ni se rellena con forecast, promedio o última tasa.

La semana usa solo los días con venta mayor que 0 y métrica numérica:

- `com_desc_kg` = suma(`cdKg` × venta) / suma(venta) de esos días.
- `resultado_mxn` = suma de `dayResultMxn` de los días con resultado finito.
- `resultado_kg` = ese importe / los kilos de esos mismos días.
- Si no hay kilos cubiertos, la métrica queda null y la cobertura es 0%. No es 0.
- Si no hay venta positiva, la cobertura en porcentaje queda null.
- Si todos los días con venta están cubiertos, el resultado coincide con el anterior y la cobertura es 100%. En ese caso la UI no muestra el aviso.

La cobertura publicada, por métrica, es `kg_total`, `kg_covered`, `coverage_kg_pct`, `days_with_sales`, `days_covered`, `coverage_days_pct`, `covered_real_kg` y `covered_projected_kg`. Real y proyectado siguen la regla vigente `fecha >= corte`. No cambian `upload_day`, el corte, el forecast ni `resolveCanalTon`.

## Helper

`aggregateCovered` en `lib/igf-diario-weekly-plant.js`. `weighted` y `sumCovered` siguen para precio, costo, flete, ingreso y gastos. `consolidateCovered` aplica la misma cobertura al consolidado de Todas: la venta total incluye todos los kilos; el resultado suma solo importes cubiertos y divide entre los kilos cubiertos, no entre la venta total.

## Semana de referencia

El fixture de prueba, no una constante de producto, reproduce:

- kilos totales 130,162.74
- kilos cubiertos 128,461.74
- cobertura 98.69317440613189%
- 6/7 días, 85.71428571428571%
- real cubierto 75,771.74
- proyectado cubierto 52,690
- comisión -4.010420881734904
- resultado -1.1396192353729382
- importe -146,397.4699134772

El primer día conserva venta 1,701 y las tres métricas en null.

## UI, Excel y gráfica

Si la cobertura del resultado o de la comisión es menor que 100%, la semana y Todas muestran el texto de cobertura con kilos, días, real y proyectado. Los días con venta y métrica null siguen en la línea de días incompletos. `Faltantes` lista solo métricas semanales que siguen en null.

El Excel escribe el mismo texto en la fila 3 y el mismo importe parcial en la columna Semana. La celda diaria desconocida sigue en —. La gráfica de siete días no dibuja ese día y el subtítulo indica cobertura parcial cuando la métrica es comisión o resultado.

## Archivos

- lib/igf-diario-weekly-plant.js
- lib/igf-diario-weekly-excel.js
- frontend-dashboard/lib/api.ts
- frontend-dashboard/lib/igf-diario-weekly-rows.ts
- frontend-dashboard/components/IgfDiarioWeeklyPlantPanel.tsx
- frontend-dashboard/components/IgfDiarioWeeklyAllPlantsPanel.tsx
- test/impl-igf-diario-weekly-financial-coverage-077.test.js
- test/fix-igf-diario-weekly-coverage-resumen-5d-069-r1.test.js

## Pruebas

107/107: 054-R2, 054-R3, 067, 069, 069-R1, 069-R2, 070, 070-R1, 072, 074 y 077.

`node --check server.js` correcto. `git diff --check` limpio. `npm run build` del frontend terminó con código 0.

069-R1 conserva el resto de su contrato. Solo dejó de exigir null semanal cuando un día con venta no trae tasa: ese día sigue null y la semana publica el parcial.

## Riesgos

El resultado parcial no describe los kilos excluidos. La UI y el Excel lo dicen con la cobertura. Un proyectado numérico entra en los kilos cubiertos y se etiqueta aparte. Todas ya no reparte el resultado de una planta parcial sobre sus kilos desconocidos.
