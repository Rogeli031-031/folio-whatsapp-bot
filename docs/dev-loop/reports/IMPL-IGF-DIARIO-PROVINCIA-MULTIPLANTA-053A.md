# IMPL-IGF-DIARIO-PROVINCIA-MULTIPLANTA-053A

## Identidad

```yaml
task_id: "IMPL-IGF-DIARIO-PROVINCIA-MULTIPLANTA-053A"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "lib/dashboard-arr-forecast.js"
  - "lib/igf-diario-puebla.js"
  - "lib/compras-excel.js"
  - "server.js"
  - "frontend-dashboard/lib/api.ts"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "test/igf-diario-provincia-multiplanta-053a.test.js"
  - "test/forecast-excel-plant-compras-024.test.js"
  - "test/igf-diario-ui-scoped-view-025.test.js"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PROVINCIA-MULTIPLANTA-053A.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "PostgreSQL / schema"
  - "frontend-dashboard/.next"
  - "docs/director-ia/"
  - "AH comentario (053B)"
  - "VENTAS / clientes nuevos (053C)"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "Los soportes por planta se llaman ~N Venta, ~N Comis, ~N Precio y ~N Compras. El nombre largo __Puebla__Provincia Venta Diaria supera el límite de 31 caracteres de Excel."
  - "El Excel global del KPI no recibe hojas IGF. Solo IGF Forecast con Planta=Todas envía igf_diario_todas=1."
  - "014 y 016 siguen en FAIL de baseline. No se tocaron sus aserciones."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | IMPL-IGF-DIARIO-PROVINCIA-MULTIPLANTA-053A |
| outcome | DONE_PENDING_REVIEW |
| base_sha | c15b77779f8173dc3fff6ca6effc371b50d45285 |
| branch | impl/igf-diario-provincia-multiplanta-053a |
| schema_changes | false |
| data_mutation | false |

## Lectura

El export individual sigue en `includeIgfDiario = Boolean(exportPlant)`. Reserva y llena `IGF Diario` con los soportes de siempre: Provincia Venta Diaria, Provincia Comisiones, PRECIO y CONTROL DE COMPRAS. Esa llamada no recibe `supports`.

Todas no es el Excel global del KPI. IGF Forecast, con el selector vacío, abre la misma URL sin `require_plant` y con `igf_diario_todas=1`. El servidor arma un paquete por planta con `listIgfDiarioProvinciaPlants`, `loadPrecioDiario`, `comprasDashboard.loadMonth` y `computeIgfForecastMiniPayload`. Cada hoja individual se llena con `fillIgfDiarioPuebla` sobre copias de `hojaA`, `hojaB`, `appendPrecioWorksheet` y `appendComprasWorksheet` filtradas a esa planta. Las cuatro copias quedan ocultas.

`IGF Diario Provincia` referencia las celdas de esas hojas. No vuelve a pronosticar. B, D, X y AF se suman. C, F, G, M, T y AC se ponderan por kilos. H = C − F − G, O = H − M, V = O − T, AA = V − Y. AE = AF / B. En domingo, M y T quedan vacíos y O = H, igual que la hoja de planta. M3 y T3 suman los importes mensuales. Semana y TOTAL MES reutilizan `writeWeek` y `writeTotal` sobre las filas diarias de Provincia.

El nombre visible sale de `public.plantas`. Si el mismo canon tiene fila con acento y sin acento, queda la acentuada. El orden sigue `FORECAST_EXPORT_PLANT_ALIASES`.

## Prueba numérica

Día 1, Tehuacán sin kilos. Puebla 10,000 kg a precio 20, costo 12, flete 1, corporativo 1.00, operativo 0.50, HG −1,000, C&D 0.40, resultado 50,000. Acapulco 30,000 kg a precio 22, costo 14, flete 2, corporativo 2.00, operativo 1.50, HG −3,000, C&D 0.20, resultado 90,000.

| Métrica | Provincia |
|---|---|
| Venta kg | 40,000 |
| Ingreso | 860,000 |
| Precio | 21.50 |
| Costo kg | 13.50 |
| Flete kg | 1.75 |
| Corporativo kg | 1.75 |
| Operativo kg | 1.25 |
| HG importe | −4,000 |
| HG por kg | −0.10 |
| C&D kg | 0.25 |
| Resultado | 140,000 |
| Resultado por kg | 3.50 |

El precio simple sería 21. El resultado por kg no es AA + AC (3.60). Un segundo día con Tehuacán en 20,000 kg confirma la misma ponderación a tres plantas. Tras guardar y reabrir el XLSX, precio, costo, corporativo y resultado se conservan.

Catálogo de prueba, una sola vez y en este orden: Puebla, Tehuacán, Acapulco, Querétaro, San Luis, Morelos. No aparecen Queretaro ni Tehuacan al mismo tiempo.

La hoja Querétaro dentro de Todas, después de normalizar el nombre del soporte, coincide en venta, precio, costo, flete, gastos, HG, C&D y resultado con el export individual. El individual sigue llamándose IGF Diario Queretaro, como antes de 053A. Dentro de Todas la hoja visible es IGF Diario Querétaro.

Con corte 2026-09-25 la hoja de planta mantiene el contrato 050. Provincia solo apunta a la celda F de esa hoja.

Orden visible de la prueba: IGF Diario Provincia, IGF Diario Puebla, IGF Diario Acapulco, IGF Diario Tehuacán, IGF Forecast. El soporte ~1 Venta queda oculto. En el export real el orden de plantas es el del catálogo y las hojas de usuario que ya existían permanecen después.

## Pruebas

- `test/igf-diario-provincia-multiplanta-053a.test.js`: 5 pass.
- Regresión 013, 014, 016, 020, 021, 022, 024, 025, 026, 027, 028, 029, 030, 033, 036–045, 047–052 y 053A: 256 pass, 2 fail.
- FAIL baseline, sin cambio de aserción: 014 TOTAL MES HG actual −3148, esperado −787. 016 día 01/09 flete actual fórmula `IF(COUNT(W6,AA6,AE6)=0,"",SUM(W6,AA6,AE6))`, esperado 200.
- `git diff --check`: limpio.

## Desviaciones

- Nombres cortos de soporte por el límite de 31 caracteres. La fórmula de la hoja individual es la misma; solo cambia el nombre de la hoja citada.
- `compras-excel.js` acepta `sheetName` opcional. El default sigue siendo CONTROL DE COMPRAS. El fallback del día 1 de la 052 no se modificó.
- 024 y 025 dejaron de exigir que Todas bloquee la descarga. El 400 del servidor con `require_plant=1` y sin planta sigue igual.
