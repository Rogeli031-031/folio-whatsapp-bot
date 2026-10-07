# IMPL-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069

Estado: DONE_PENDING_REVIEW

Base: `8ceb0d4657256999746d09905ec1d43373c02faf`

Producto: `7b2fa3340a65bef44119b9583355ff33a73bbcd1`

Rama: `implementation/igf-diario-weekly-sunsat-multiplant-069`

## Semana domingo-sábado

IGF Diario Semanal ya no usa semana ISO lunes-domingo. El ancla `2026-10-06` abre domingo `2026-10-04` y cierra sábado `2026-10-10`.

La etiqueta visible es `SEMANA 41 · 04/10/2026–10/10/2026`. No aparece `SEMANA ISO`.

Helpers que determinan la semana:

- `sundayOfWeekContainingDate`
- `saturdayOfWeekContainingDate`
- `weekNumber`
- `weekYear`

Se eliminaron `mondayOfIsoWeekContainingDate`, `sundayOfIsoWeekContainingDate`, `isoWeek` e `isoWeekYear` del módulo semanal. `weekOf`, `navigationFor`, `weekIntersectsMonth`, `datesOfWeek`, `stitchWeek` y `loadWeeklySeries` parten del domingo. La serie de la gráfica sigue un día, pero el día se resuelve dentro de la semana domingo-sábado.

La semana que contiene el 1 de enero es la Semana 1 y pertenece al año nuevo. El rango de fechas es la fuente autoritativa.

| Ancla | Desde | Hasta | Número |
| --- | --- | --- | --- |
| 2026-10-06 | 2026-10-04 | 2026-10-10 | 41 de 2026 |
| anterior | 2026-09-27 | 2026-10-03 | 40 de 2026 |
| siguiente | 2026-10-11 | 2026-10-17 | 42 de 2026 |
| 2026-10-01 | 2026-09-27 | 2026-10-03 | no se parte |
| 2026-01-01 | 2025-12-28 | 2026-01-03 | 1 de 2026 |
| 2027-01-01 | 2026-12-27 | 2027-01-02 | 1 de 2027 |
| 2026-12-26 | 2026-12-20 | 2026-12-26 | sigue en 2026 |

## Todas las plantas

En IGF Diario con Planta Todas el orden es: tabla superior, `IGF Diario semanal · Todas`, Folios en Depósito y Cierre.

`GET /api/dashboard/igf-diario-semanal?todas=1` devuelve todas las plantas en una respuesta. El frontend hace una sola llamada. No hay request por planta, por día ni por concepto.

El catálogo y el orden salen de `listIgfDiarioProvinciaPlants`. La etiqueta sale de `igfLabelForForecastPlant`. No hay IDs fijos. Zona Provincia se excluye. El alcance sigue `assertPlantaPermitidaDashboard`: un usuario con plantas limitadas solo recibe las suyas.

Etiquetas del catálogo existente, en orden:

`GT Puebla`, `Tehuacan`, `Acapulco`, `GTM Queretaro`, `GTM San Luis`, `Morelos`.

## Planta individual

Columnas: Concepto, Semana, Dom, Lun, Mar, Mié, Jue, Vie, Sáb. Semana es la primera columna numérica y es `aggregateWeek` de los siete días. Cada día llama `aggregateWeek([día], corte)`. No hay fórmula paralela.

La respuesta trae `metrics` y `days` con exactamente siete elementos `{ fecha, weekday, estado, metrics }`.

Corte: `fecha < corte` es real; `fecha >= corte` es proyectado. La semana queda `real`, `parcial` o `proyectada`. El día proyectado lleva un tono más oscuro.

## Filas y resaltado

Orden: Venta en Kilos, Precio de Venta al Público, Ingreso Generado, Costo del Gas LP, Flete Terrestre, Margen Bruto, Gasto Corporativo, Inversiones, Impuestos Federales, Margen Neto, Presupuesto Nómina/Gastos, Presupuesto IMSS/SUA, Extraordinarios, Provisiones de la Planta, Sobrante de Operación antes del HG, HG, Sobrante de Operación con el HG, Comisiones y Descuentos, RESULTADO ($/kg), RESULTADO (Importe).

Margen pasó a Margen Bruto. La definición está en `frontend-dashboard/lib/igf-diario-weekly-rows.ts` y la usan los dos paneles.

Los bloques se separan con borde grueso y más padding (`separatorBefore`). No hay filas vacías ni ceros de relleno en la API.

Resaltadas, con fondo ámbar discreto en Concepto y banda sutil en el renglón: Venta en Kilos, Precio de Venta al Público, Ingreso Generado, Margen Bruto, Margen Neto, Sobrante de Operación antes del HG, Sobrante de Operación con el HG, RESULTADO ($/kg), RESULTADO (Importe). RESULTADO (Importe) usa la banda más fuerte. Negativo en rojo. Resultado positivo en verde. Cero queda neutro. NULL se muestra `—`.

La gráfica de una planta se conserva: el renglón elige la métrica y siguen 1D, 5D, 1M, 3M, YTD, 1A, 5A, Todo, Real, Proyectado y Tendencia. No hay gráfica nueva de todas las plantas. Forecast no cambia.

## Endpoint y forma

`GET /api/dashboard/igf-diario-semanal`

Planta:

```json
{
  "ok": true,
  "scope": "plant",
  "week": {
    "week_year": 2026,
    "week_number": 41,
    "fecha_desde": "2026-10-04",
    "fecha_hasta": "2026-10-10",
    "estado": "parcial"
  },
  "metrics": {},
  "days": [
    { "fecha": "2026-10-04", "weekday": "domingo", "estado": "real", "metrics": {} }
  ]
}
```

`days` trae los siete días. El objeto de arriba solo ilustra el primero.

Todas:

```json
{
  "ok": true,
  "scope": "all",
  "week": {
    "week_year": 2026,
    "week_number": 41,
    "fecha_desde": "2026-10-04",
    "fecha_hasta": "2026-10-10",
    "estado": "parcial"
  },
  "plants": [
    {
      "plant_code": "GT Puebla",
      "empresa": "GT Puebla",
      "metrics": {},
      "complete": false,
      "missing_components": []
    }
  ],
  "query_count": 0
}
```

## query_count

`query_count` suma las consultas que pasan por `countingClient` dentro de `loadMonthBundle`, una vez por planta y por mes que toca la semana. La semana 04/10–10/10 toca un mes. La semana 27/09–03/10 toca dos. El mismo `comprasCache` se comparte entre plantas; la clave es `plantaId|año|mes`.

Entran en el contador, por planta y mes: índice de comisiones y descuentos, ventas, descuentos, compras del mes (cacheadas), overrides de margen y, desde octubre 2026, desglose y overrides de distribución. `buildConceptSchedules` no consulta. No hay bucle por métrica, por día ni por concepto.

Quedan fuera del contador, igual que en 067: `loadPrecioDiario` (una lectura por planta y mes, con el precio inicial de 068-R1) y, en Todas, la resolución única del catálogo.

## Seguridad

Siguen `dashboardAuthMiddleware`, el bloqueo de GA y el bloqueo de GV. `todas=1` no abre plantas fuera del alcance. No se combinan `todas=1` y `plant_code`. La serie histórica sigue exigiendo una planta.

## Cruces y fórmulas

La semana no se parte al cambiar de mes. Antes de octubre no se inventan J/K/L/Q/R/S/T. Si existe resultado legacy, se conserva. El resultado por kilo de una semana mixta sigue siendo importe / venta cuando la cadena detallada no cierra.

No cambió la fórmula de 067: venta = suma B, ingreso = suma D, precio = ingreso / venta, costo y flete ponderados, margen bruto = precio − costo − flete, J/K/L/Q/R/S/T de 064/064-R1, margen neto, sobrantes, HG, comisiones y descuentos, resultado $/kg y resultado importe. El cálculo usa la precisión completa, no los números ya redondeados en pantalla. NULL no pasa a 0.

## Ejemplo de fórmula, semana 41

Fixture de prueba, 100 kg por día, precio 10, costo 4, flete 1, gastos diarios 10/5/4/8/3/2/1, HG 10, C&D −0.2, corte 2026-10-06. No es un extracto de base de datos.

Semana: venta 700, precio 10, ingreso 7000, costo 4, flete 1, margen bruto 5, gasto corporativo 0.1, inversiones 0.05, impuestos 0.04, margen neto 4.8100000000000005, nómina 0.08, IMSS 0.03, extraordinarios 0.02, provisiones 0.01, sobrante antes del HG 4.670000000000001, HG 70, sobrante con HG 4.570000000000001, C&D −0.2, resultado $/kg 4.370000000000001, resultado importe 3059.

Cada día: venta 100, resultado importe 437, resultado $/kg 4.370000000000001. 04/10 y 05/10 reales. 06/10 a 10/10 proyectados. Estado de la semana: parcial.

Identidad: `4.370000000000001 * 700` recupera el importe 3059 dentro de 1e-9.

## Regresiones

`node --test` de 069, 067, 068-R2, 068-R1, 068, 066-R1, 066, 065-R1, 065, 064-R1 y 064: 89/89.

`node --check server.js` correcto.

`npm run build` del dashboard correcto. Las rutas compiladas. El paso standalone registró `EPERM` al crear el symlink de `node_modules` porque en el worktree esa carpeta es una unión; el script termina con salida 0. `.next` no se commiteó.

`git diff --check` limpio en los archivos de producto.

## Archivos

- `lib/igf-diario-weekly-plant.js`
- `server.js`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/lib/igf-diario-weekly-rows.ts`
- `frontend-dashboard/components/IgfDiarioWeeklyPlantPanel.tsx`
- `frontend-dashboard/components/IgfDiarioWeeklyAllPlantsPanel.tsx`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/igf-diario-weekly-plant-view-067.test.js`
- `test/igf-diario-weekly-sunsat-multiplant-069.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069.md`

No se modificaron Forecast, Folios 068, FolioDrawer, el precio de 068-R1 ni la base de datos. No hay merge ni deploy.
