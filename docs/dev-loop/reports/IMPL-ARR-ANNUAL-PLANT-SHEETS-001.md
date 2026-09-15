# IMPL-ARR-ANNUAL-PLANT-SHEETS-001

```yaml
task_id: "IMPL-ARR-ANNUAL-PLANT-SHEETS-001"
outcome: "DONE"
mode: "IMPL"
implementation: true
code_changes: true
logic_changes: false
ytd_reimplemented: false
reference_main: "422667f0"
branch: "implementation/arr-annual-plant-sheets-001"
build: "frontend-dashboard npm run build → Compiled successfully, exit 0"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar y mergear. No autoriza deploy por este agente."
```

## 1. Resultado

**DONE_PENDING_REVIEW.** El Excel ARR añade seis hojas de planta. Cada una muestra CASA y COMISIONISTA del mismo YTD ya calculado. Las hojas CASA, COMISIONISTA, EVALUACION, CASA ANUAL y COMISIONISTA ANUAL siguen intactas.

No se recalculó YTD. No hay consultas nuevas por planta.

## 2. Dónde estaba el dataset anual

| Pieza | Ubicación |
|-------|-----------|
| Periodo YTD enero→mes vs año anterior | `compareRanges` / `ytdRange` en `lib/arr-annual-category-analysis.js` |
| Agregación y clasificación | `buildAnnualAnalysis` |
| Matriz consolidada | `payload.casa.matrix` / `payload.comisionista.matrix` |
| Clientes + movimiento + contribución | `payload.*.negative` / `payload.*.positive` |
| Comentarios | `buildCommentMap` + `lookupComment` (mismo contrato) |
| CASA ANUAL / COMISIONISTA ANUAL | `writeCategorySheet` / `appendAnnualCategorySheets` |
| Carga SQL | `loadAnnualCategoryAnalysis` (sin cambios) |

Las hojas de planta filtran ese payload por `planta`. No hay segunda fuente.

## 3. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/arr-annual-category-analysis.js` | Presentación: `appendAnnualPlantSheets` + helpers. `buildAnnualAnalysis` no cambia. |
| `test/arr-annual-plant-sheets.test.js` | Contrato de las seis hojas y equivalencia vs consolidado |
| `test/artifacts/arr-annual-plant-sheets-sample.xlsx` | Workbook de prueba |
| `docs/dev-loop/CURRENT_TASK.md` | Solo `status`: AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW |
| `docs/dev-loop/reports/IMPL-ARR-ANNUAL-PLANT-SHEETS-001.md` | Este reporte |

`frontend-dashboard/lib/arr-export-excel.ts` no se tocó: sigue llamando `appendAnnualCategorySheets`, que ahora también escribe las seis hojas.

## 4. Estructura de cada hoja

Orden: PUEBLA, TEHUACAN, ACAPULCO, QUERETARO, SAN LUIS, MORELOS.

1. Título + periodo (el mismo `period_label` del consolidado)
2. `CASA · ANÁLISIS ANUAL YTD` — Autotanque / Portátil / Carburación / Total Δ TON
3. `CLIENTES CASA CON IMPACTO NEGATIVO`
4. `CLIENTES CASA CON IMPACTO POSITIVO`
5. `COMISIONISTA · ANÁLISIS ANUAL YTD` — misma matriz de 4 columnas
6. `CLIENTES COMISIONISTA CON IMPACTO NEGATIVO`
7. `CLIENTES COMISIONISTA CON IMPACTO POSITIVO`

Columnas de cliente (sin PLANTA): SUBCATEGORÍA, CLIENTE, YTD anterior, YTD actual, delta, movimiento, contribución, comentario.

## 5. Equivalencia contra consolidado

Para cada planta, las celdas Autotanque / Portátil / Carburación de la sección CASA coinciden con la fila homónima de CASA ANUAL (B/C/D). Igual para COMISIONISTA ANUAL. Los clientes de cada hoja son exactamente el filtro `c.planta === planta` del payload.

Ejemplo del fixture: Puebla CASA Autotanque −1.5, Portátil −2, Carburación 0. PUEBLA no incluye `OTRA PLANTA` (Morelos) ni `CLIENTE COMI BAJA` (Tehuacán).

## 6. Pruebas

- `node --test test/arr-annual-category-analysis.test.js test/arr-annual-plant-sheets.test.js test/arr-annual-export-webpack-alias.test.js test/arr-annual-export-exceljs-resolution.test.js` — 27/27
- Workbook de prueba: `test/artifacts/arr-annual-plant-sheets-sample.xlsx` (abre con ExcelJS)
- `npm run build` en `frontend-dashboard`: `✓ Compiled successfully`, `/arr` generado, exit 0

## 7. Diff conceptual

```
antes:
  appendAnnualCategorySheets → CASA ANUAL + COMISIONISTA ANUAL

después:
  mismo payload
  → CASA ANUAL + COMISIONISTA ANUAL (sin cambio de layout)
  → 6 hojas de planta = filtro por planta, CASA encima y COMISIONISTA debajo
```

## 8. Contratos

`authorized_*` intactos. Sin merge, sin deploy, sin siguiente tarea.
