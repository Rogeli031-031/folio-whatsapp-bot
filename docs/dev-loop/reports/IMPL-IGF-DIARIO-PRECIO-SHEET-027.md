# IMPL-IGF-DIARIO-PRECIO-SHEET-027

## Identidad

```yaml
task_id: "IMPL-IGF-DIARIO-PRECIO-SHEET-027"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "server.js"
  - "lib/dashboard-arr-forecast.js"
  - "test/igf-diario-precio-sheet-027.test.js"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRECIO-SHEET-027.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "schema DB"
  - "VBA"
  - "arr.precio_detalle"
  - "arr.precio_diario"
  - "frontend"
  - "lib/compras-excel.js"
  - "Director IA"
  - "frontend-dashboard/.next (no commiteado)"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | IMPL-IGF-DIARIO-PRECIO-SHEET-027 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 187a4b643300f695273205d1250c5bae318dbf5b |
| branch | implementation/igf-diario-precio-sheet-027 |
| schema_changes | false |
| data_mutation | false |

## Hoja

El Excel de IGFDiario con `require_plant=1` abre así:

1. Provincia Venta Diaria
2. Provincia Comisiones
3. PRECIO
4. CONTROL DE COMPRAS

Después siguen las hojas que ya existían. CONTROL DE COMPRAS usa el mismo `appendComprasWorksheet` y el mismo payload. Solo cambia de lugar cuando PRECIO va delante.

La hoja se llama exactamente `PRECIO`. A1 es `Fecha`. B1 es `PRECIO`.

## Fuente

`loadPrecioDiario` lee solo `arr.precio_diario`:

```sql
SELECT fecha, precio
  FROM arr.precio_diario
 WHERE plant_code = $1
   AND fecha >= $2::date
   AND fecha < $3::date
 ORDER BY fecha ASC
```

`plant_code` va por parámetro. Es el mismo código ya resuelto para el Excel (`provinciaPlantCode` o canon) después de autorizar la planta. No se usa `arr.precio_detalle` y no se recalcula el precio.

El servidor carga esas filas solo dentro de `require_plant`, después del 400 y del 403. El libro global de KPI Financieros no recibe `precioDiario` y no agrega la hoja.

## Mes y vacíos

La columna A lista cada día calendario del mes como fecha Excel, con formato `dd-mmm`. Septiembre queda en 30 filas.

Si el día no está en la tabla, o `precio` es null, la celda B queda vacía. No se escribe 0 ni se arrastra el precio anterior.

El número se guarda tal como llega y se muestra con `0.00000000`. 19.7690271 no se redondea a 19.77.

## Pruebas

- `test/igf-diario-precio-sheet-027.test.js`: pass (A–S).
- `test/igf-diario-ui-scoped-view-025.test.js`: pass.
- `test/forecast-excel-plant-compras-024.test.js`: pass.
- `test/arr-forecast-excel-daily-category-023.test.js`: pass.
- `test/compras-hg-costo-importe-020.test.js`: pass.

No hubo cambios de frontend. No se corrió `npm run build`.
