# INTEGRATION-IGF-FORECAST-ACUMULADO-059-R1

task_id: INTEGRATION-IGF-FORECAST-ACUMULADO-059-R1

outcome: DONE

status: DONE_PENDING_REVIEW

main_reference_sha: c907696506594860e286db432cb07cbf3f3f5c72

source_sha: 8a4c49f5b482d78e6157f871afb7bb64adcdb856

source_branch: fix/igf-forecast-acumulado-hg-compras-tarifa-059-r1

branch: integration/igf-forecast-acumulado-059-r1

## Unidad integrada

`main` es ancestro de `8a4c49f5`. La rama fuente está ahead 2 / behind 0:

- `48863b0f` FIX 059: acumulado IGF Diario en Forecast y tarifa día 1
- `8a4c49f5` FIX 059-R1: evitar acumulado obsoleto y mezcla Forecast

No hay commits de producto posteriores a `8a4c49f5`. Esta integración no modifica código ni tests. Agrega solo este reporte y la transición de `status` en `CURRENT_TASK.md`.

## Identidad de Acapulco

Producción, 2026-10-03:

- Acapulco es `public.plantas.id = 1`, nombre Acapulco, clave ACAPULCO.
- `public.plantas.id = 12` es E10, no Acapulco.
- La prueba inicial de la auditoría 060 contra `planta_id = 12` no representaba Acapulco.
- Con id 1, septiembre 2026 tiene 3 proveedores, 72 compras, 30 HG y 3 tarifas.
- Con id 1, octubre 2026 al corte 2026-10-03 tiene 3 proveedores, 4 compras, 2 HG y 3 tarifas.
- `resolveControlComprasDays` entrega COSTO y FLETE numéricos para ese id.
- En main, el 2026-10-01 hereda el costo anterior y el flete queda null.
- 059 cubre ese flete del día 1 con `tarifa_consolidada_anterior`.
- No hay migración, alias ni cambio de IDs. No se incorpora el reporte 060 local.

## Contratos que siguen en los dos commits

- Forecast conserva el mini original.
- Margen del acumulado es H del TOTAL MES, ponderado por B. La fila no está fija.
- HG del acumulado es el negativo de Y del TOTAL MES, ponderado por B.
- No hay H48 ni Y48.
- Si falta margen o HG de una planta, el modo queda incompleto y no usa la fila Forecast.
- Zona Provincia se arma solo después de esa cobertura, con una sola metodología.
- Un corte, mes o versión nuevos limpian el acumulado anterior. Un error no lo restaura.
- La tarifa propia válida del día 1 prevalece.
- Sin tarifa propia, se usa la última tarifa consolidada histórica válida.
- No se usa el día 2, ni cero, ni la tarifa suelta de un proveedor.
- No hay cambios de schema ni de datos.

## Diff respecto de main

Doce archivos, ya contenidos en 059 y 059-R1: cliente Forecast, tipos de la API, compras, Excel, forecast, gráfica, Puebla, los dos tests y sus reportes. `git diff --check` de `c9076965...8a4c49f5`: limpio.

## Pruebas

75 PASS, 0 FAIL.

- 059 y 059-R1
- 052
- 036 y 037
- 054, 054-R1, 054-R2 y 054-R3
- 055

`frontend-dashboard` `npm run build`: PASS. Los artefactos `.next` no entran en el commit.

## Decisión humana

G4 no está aprobado. Merge a `main` y deploy quedan fuera de esta tarea.

## Protocolo

- archivos tocados: este reporte y `docs/dev-loop/CURRENT_TASK.md` solo `status`
- archivos de producto: ninguno en este commit
- contratos consultados: `AGENTS.md`, `LOOP_PROTOCOL.md`, `CURRENT_TASK.md`, `origin/main` en `c9076965`
- contratos modificados: ninguno
- contradicciones: ninguna
- desvíos: ninguno
- next_task_proposed: no autorizado
- secrets_check: sin secretos
- human_decision_needed: G4, merge y deploy
