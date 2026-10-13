# IMPL-IGF-DIARIO-DATOS-PLANTA-082

```yaml
task_id: IMPL-IGF-DIARIO-DATOS-PLANTA-082
outcome: DONE
product_sha: e8211579b593a2318c3b5d0ba74b2ab2135898c3
files_touched:
  - lib/igf-diario-datos-planta.js
  - lib/dashboard-arr-forecast.js
  - test/impl-igf-diario-datos-planta-082.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/IMPL-IGF-DIARIO-DATOS-PLANTA-082.md
  - docs/dev-loop/reports/evidence-082/san-luis.xlsx
  - docs/dev-loop/reports/evidence-082/morelos.xlsx
files_not_touched:
  - server.js
  - lib/arr-load.js
  - lib/igf-diario-puebla.js
  - lib/igf-diario-weekly-excel.js
  - lib/igf-diario-weekly-plant.js
  - frontend-dashboard
  - docs/director-ia
contracts_consulted:
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: none
human_decision_needed: []
```

## Hoja

En la exportación de una planta con RESUMEN, el orden de creación queda:

1. RESUMEN
2. DatosPlanta
3. IGF Diario {planta}
4. el resto, en el orden en que ya se creaba

TODAS y `renderProvinciaDiariaSheets` no agregan DatosPlanta.

## Columnas

C, G y K salen de `arr.ventas_diarias_cliente` en una sola consulta por fecha, canal y subcanal. El canal desconocido no entra. Predios y el subcanal vacío quedan dentro del total del canal y no se escriben como cero en Portátil, Autotanque o Carburación. No hay proyección de venta en esta hoja.

P–Q, T–U, W–X, Z–AB y AD salen del payload de compras. El proveedor se busca por nombre. Antes del corte, el costo es importe/kg del día. Desde el corte se reutiliza `buildComprasDailyEstimateContext`. La tarifa es la del proveedor, incluida la tarifa 0. AD conserva el signo de los kilos.

M, N, R, AF y AG tienen encabezado y celdas de datos vacías.

## Formato

No hay plantilla medible en el repositorio. Anchos, alturas y bordes son una aproximación de las capturas: fondo blanco, Calibri, encabezados en negrita, bordes grises finos, separadores de ancho 2.5, fila 1 a 22, fila 2 a 32 y filas de datos a 18. La fecha se guarda como serial de Excel del día calendario. Al reabrir, ExcelJS la devuelve en UTC (`2026-10-01T00:00:00.000Z`).

## Evidencia

Los XLSX de `docs/dev-loop/reports/evidence-082/` son fixtures locales. No son una extracción de producción.

Pruebas 082: 9/9. Regresiones 077, 078-R2, 079, 080, 069-R1, 027 y 036: verdes. `forecast-excel-plant-compras-024.test.js` líneas 507 y 538 fallan sobre `server.js`, archivo no modificado en esta tarea; es el fallo ya conocido de esa prueba.
