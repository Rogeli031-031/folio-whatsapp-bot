# G4-PREP-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069

```yaml
task_id: "G4-PREP-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/G4-PREP-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069.md"
files_not_touched:
  - "lib/"
  - "server.js"
  - "frontend-dashboard/"
  - "test/"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed:
  - "Squash and merge queda reservado al HUMAN_APPROVER."
```

| Campo | Valor |
|---|---|
| main | 8ceb0d4657256999746d09905ec1d43373c02faf |
| rama | implementation/igf-diario-weekly-sunsat-multiplant-069 |
| producto | 7b2fa3340a65bef44119b9583355ff33a73bbcd1 |
| final antes de este commit | 843423bd5b2f4364f1a4fdee83734abe28e9e9d0 |
| ahead / behind | 2 / 0 |
| PR | https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/114 |
| merge | no |
| deploy | no |

`git rev-list --left-right --count origin/main...HEAD` dio `0 2` antes de este commit. `git diff --check origin/main...HEAD` quedó limpio. El commit posterior al producto solo toca `CURRENT_TASK.md` y el reporte de IMPL 069.

## Cadena

| Paso | SHA |
|---|---|
| producto | 7b2fa3340a65bef44119b9583355ff33a73bbcd1 |
| docs | 843423bd5b2f4364f1a4fdee83734abe28e9e9d0 |

## Domingo-sábado

`sundayOfWeekContainingDate` abre la semana y `saturdayOfWeekContainingDate` la cierra. `weekNumber` y `weekYear` sustituyen la semántica ISO. El ancla `2026-10-06` es la Semana 41, del `2026-10-04` al `2026-10-10`. La anterior es `2026-09-27`–`2026-10-03`. La siguiente es `2026-10-11`–`2026-10-17`. No queda `SEMANA ISO` en el módulo semanal ni en los paneles.

La semana no se parte al cambiar de mes: `2026-10-01` sigue en `2026-09-27`–`2026-10-03`. La semana que contiene el 1 de enero es la Semana 1 del año nuevo. `2026-01-01` abre `2025-12-28`–`2026-01-03`. `2027-01-01` abre `2026-12-27`–`2027-01-02`.

## Todas

En IGF Diario, con Planta Todas, el panel `IGF Diario semanal · Todas` queda entre la tabla superior y Folios en Depósito y Cierre. Forecast no lo monta.

El frontend hace una sola llamada `GET /api/dashboard/igf-diario-semanal?todas=1`. El catálogo sale de `listIgfDiarioProvinciaPlants` y la etiqueta de `igfLabelForForecastPlant`. Columnas: GT Puebla, Tehuacan, Acapulco, GTM Queretaro, GTM San Luis, Morelos. Zona Provincia se excluye. Cada planta pasa por `assertPlantaPermitidaDashboard`. El `comprasCache` es uno solo. No hay consulta por día ni por concepto. `query_count` suma las lecturas de `loadMonthBundle` por planta y por mes que toca la semana. `loadPrecioDiario` queda fuera del contador, igual que en 067.

## Planta individual

Columnas: Concepto, Semana, Dom, Lun, Mar, Mié, Jue, Vie, Sáb. Semana es la primera columna numérica y sale de `aggregateWeek` sobre los siete días. Cada día sale de `aggregateWeek([day], corte)`. La respuesta trae exactamente siete días. NULL sigue como `—`. La gráfica permanece y el renglón elige la métrica.

## Filas

Margen se llama Margen Bruto. Los bloques se separan con borde grueso y padding, sin filas falsas. Las filas ámbar son Venta en Kilos, Precio de Venta al Público, Ingreso Generado, Margen Bruto, Margen Neto, ambos sobrantes y ambos RESULTADO. RESULTADO (Importe) es `strongest`. Negativo en rojo. Resultado positivo en verde. Concepto queda sticky y la tabla tiene scroll horizontal.

## Fórmulas

No hay fórmula nueva. Siguen venta, ingreso, precio, costo y flete ponderados, margen bruto, 064/064-R1, 065/065-R1, el precio inicial 068-R1, HG, C&D con signo, resultado $/kg e importe a precisión completa. El legacy anterior a octubre no inventa J/K/L/Q/R/S/T.

## Seguridad

Siguen `dashboardAuthMiddleware`, el bloqueo de GV y `assertPlantaPermitidaDashboard`. `todas=1` no combina con `plant_code` y no amplía el catálogo. La serie sigue exigiendo una planta.

## Pruebas ya registradas

069 y las regresiones 067, 068-R2, 068-R1, 068, 066-R1, 066, 065-R1, 065, 064-R1 y 064: 89/89. `node --check server.js` correcto. Build del dashboard correcto.

## Archivos del PR

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
- `docs/dev-loop/reports/G4-PREP-IGF-DIARIO-WEEKLY-SUNSAT-MULTIPLANT-069.md`

PR #114. Base `main`. Head `implementation/igf-diario-weekly-sunsat-multiplant-069`. Título `IMPL 069: IGF Diario semanal domingo-sábado y comparativo por plantas`. Preferencia posterior: Squash and merge. Este preparativo no fusiona ni despliega.
