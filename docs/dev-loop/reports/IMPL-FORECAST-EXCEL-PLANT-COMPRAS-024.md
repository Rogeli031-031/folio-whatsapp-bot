# IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024

## Identidad

```yaml
task_id: "IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/lib/api.ts"
  - "server.js"
  - "lib/dashboard-arr-forecast.js"
  - "lib/compras-excel.js"
  - "test/forecast-excel-plant-compras-024.test.js"
  - "docs/dev-loop/reports/IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "lib/compras-dashboard.js (reutilizado loadMonth / ensureComprasTables; sin cambio de fórmulas)"
  - "frontend-dashboard/app/page.tsx"
  - "schema DB"
  - "Director IA"
  - "frontend-dashboard/.next (build local; no commiteado)"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "La primera entrega hizo plant_code obligatorio en GET /api/arr/dashboard-excel y el botón de KPI Financieros (app/page.tsx) recibía HTTP 400. La corrección exige planta solo con require_plant=1, que envía IgfForecastClient. El caller histórico sin ese flag vuelve al workbook global y no incluye CONTROL DE COMPRAS."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | IMPL-FORECAST-EXCEL-PLANT-COMPRAS-024 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | ae321d5e98daff1b03f7b843630e76f8db43b55b |
| branch | implementation/forecast-excel-plant-compras-024 |
| schema_changes | false |
| data_mutation | false |

## Selector

Se reutiliza el selector existente `plantaFilter` de IGF Forecast (`Planta:` / `Todas` + empresas del forecast). No hay un segundo selector.

`Todas` (`plantaFilter === ""`) no abre la descarga. Muestra el texto visible: `Selecciona una planta para descargar el Excel Forecast.`

## plant_code y planta_id

`getDashboardExcelDownloadUrl` agrega `plant_code` con el valor del selector (`GT Puebla`, `Acapulco`, etc.).

El backend no confía en el frontend:

1. `plant_code` vacío → 400.
2. `resolveForecastExportPlant` exige alias exacto (sin `includes`) contra el catálogo Puebla, Tehuacán, Acapulco, Querétaro, San Luis, Morelos. `GT Puebla` ↔ Puebla, `GTM Querétaro` ↔ Querétaro, `GTM San Luis` ↔ San Luis.
3. El id sale de `public.plantas` por equivalencia de `nombre` o `clave`.
4. El código de provincia para ARR/cat-sub sale de `resolveArrClientesMesPlantCode`.
5. `assertPlantaPermitidaDashboard` → 403 si el rol GG/GA/AD no tiene esa planta.

## Hojas filtradas

Con planta seleccionada, el dataset se reduce antes de escribir. No se ocultan columnas de otras plantas.

| Hoja | Filtro |
|---|---|
| Provincia Venta Diaria | `scopeProvinciaGrid` |
| Provincia Comisiones | `scopeProvinciaGrid` |
| CASA / COMISIONISTA | mismas grillas de canal, ya scopeadas |
| Pronóstico | solo plantas equivalentes a la seleccionada |
| IGF Forecast | filas `empresa` y resumen (etiqueta IGF, p. ej. GT Puebla) |
| IGF de meses anteriores | mismas filas y resumen |
| Proy cat-sub, Proy cat-sub Forecast, Enero–Mayo | `plantCodeFilter` canónico |
| Clientes desc mes e históricas | `plantCode` |
| IGF Ejecutivo (respaldo sin plantilla) | bloque provincia y centro equivalentes |
| Puebla | solo si la planta exportada es Puebla |

`forecastKgByPlant` del cierre IGF también queda limitado a la planta.

## Excepciones

- La plantilla mini de IGF sigue reservando filas en blanco del layout de seis plantas. Esas celdas no llevan nombre de otra planta. Las fórmulas del mini y el resumen usan solo la planta seleccionada.
- El filtro de planta aplica cuando la descarga trae `require_plant=1` y una planta válida. Sin ese flag el libro sigue siendo el global histórico.

## Compatibilidad KPI

La primera entrega respondía 400 si faltaba `plant_code`. El botón de KPI Financieros en `frontend-dashboard/app/page.tsx` llama `getDashboardExcelDownloadUrl(token, year, month)` y no tiene selector de planta, así que quedó roto.

Corrección: el requisito de una planta no es global. IGF Forecast envía `plant_code` y `require_plant=1`. El backend no mira `Referer`.

| Llamada | Resultado |
|---|---|
| IGF Forecast + Todas | el cliente no abre la descarga |
| IGF Forecast + planta + `require_plant=1` | libro de esa planta y hoja CONTROL DE COMPRAS |
| `require_plant=1` sin `plant_code` | HTTP 400 |
| KPI sin `require_plant` | libro global, HTTP distinto de 400, sin CONTROL DE COMPRAS y sin inventar planta |

El nombre con planta (`Dashboard_ARR_Forecast_Puebla_2026_9.xlsx`) queda en el flujo `require_plant`. El histórico conserva `Dashboard_ARR_Forecast_<year>_<month>.xlsx`.

## CONTROL DE COMPRAS

Tercera hoja, nombre exacto `CONTROL DE COMPRAS`, solo si `require_plant=1` resolvió una planta válida. El flujo global no la agrega.

Orden: Provincia Venta Diaria, Provincia Comisiones, CONTROL DE COMPRAS, luego el resto.

`appendComprasWorksheet(wb, payload, opts)` concentra el render. `buildComprasWorkbook` crea el libro y llama a ese helper. Forecast inserta la misma hoja en su libro. Un solo `writeHgBlock`.

El payload es `loadMonth(client, plantaId, year, month)` tras `ensureComprasTables`, el mismo loader de `GET /api/compras`. Incluye proveedores, consolidado, HG, flete completo (`VALOR DEL FLETE SEGÚN ORIGEN`), semanas y TOTAL MES. Las fórmulas de COSTO e IMPORTE no se reescribieron.

## Tres decimales

En Provincia Venta Diaria, toneladas del bloque principal, del bloque CASA/COMISIONISTA y de ACUM, PROM, PROY, Comp y Dif Comp usan `numFmt` `#,##0.000`. El número guardado no se redondea. Comisiones en $/kg no cambia de contrato por esta regla.

## Archivo

`Dashboard_ARR_Forecast_<canon>_<year>_<month>.xlsx`

Ejemplo: `Dashboard_ARR_Forecast_Puebla_2026_9.xlsx`

## Pruebas

- `test/forecast-excel-plant-compras-024.test.js`: 26 pass. Los 21 anteriores siguen en verde. Se agregó la compatibilidad: KPI sin `plant_code` no entra al 400, el flujo sin `require_plant` conserva el libro global, `require_plant=1` sin planta responde 400, con planta queda scoped, y CONTROL DE COMPRAS solo aparece con planta válida.
- `test/arr-forecast-excel-daily-category-023.test.js`: pass.
- Compras 013, 014, 016 y 020: pass.
- `cd frontend-dashboard && npm run build`: exit 0.

La página IGF en vivo no se recorrió con sesión autenticada. El bloqueo de Todas y la URL se cubren en el fuente del cliente y en el build de tipos.
