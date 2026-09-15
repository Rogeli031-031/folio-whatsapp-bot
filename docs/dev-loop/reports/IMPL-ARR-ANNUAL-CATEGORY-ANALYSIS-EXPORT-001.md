# IMPL-ARR-ANNUAL-CATEGORY-ANALYSIS-EXPORT-001

```yaml
task_id: "IMPL-ARR-ANNUAL-CATEGORY-ANALYSIS-EXPORT-001"
outcome: "DONE"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
test_changes: true
docs_director_ia_changes: false
schema_changes: false
sql_changes: false
dashboard_arr_calc_changes: false
evaluacion_broken: false
casa_replaced: false
comisionista_replaced: false
causality_inferred: false
reference_main: "1884f183"
branch: "implementation/arr-annual-category-analysis-export-001"
next_task_proposed: null
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar este slice. No autoriza merge, deploy ni causalidad."
```

## 1. Resultado

**DONE_PENDING_REVIEW.** El botón *Exportar Excel* de ARR sigue entregando un único `.xlsx`. Ahora incluye dos hojas nuevas:

- `CASA ANUAL`
- `COMISIONISTA ANUAL`

No se sustituyeron `CASA` ni `COMISIONISTA`. `EVALUACION` sigue apuntando a `CASA!B7` / `COMISIONISTA!B7`.

## 2. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `lib/arr-annual-category-analysis.js` | Nuevo. Periodo YTD, agregación, movimientos, comentarios, escritura de hojas. |
| `server.js` | GET `/api/arr/annual-category-analysis` (read-only). |
| `frontend-dashboard/lib/api.ts` | `fetchArrAnnualCategoryAnalysis`. |
| `frontend-dashboard/lib/arr-export-excel.ts` | Añade las hojas nuevas **después** de EVALUACION. |
| `frontend-dashboard/app/arr/ArrClient.tsx` | El mismo botón pide el payload anual. |
| `test/arr-annual-category-analysis.test.js` | Casos 1–24. |
| `test/artifacts/arr-annual-category-analysis-sample.xlsx` | Workbook de prueba regenerado por el test. |
| `docs/dev-loop/CURRENT_TASK.md` | Solo `status`: AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW. |

No se tocó `docs/director-ia/`. No se tocó schema. No se tocó Director IA. No se cambiaron cálculos del dashboard ARR.

## 3. Fuente física de cada campo

| Campo | Fuente |
|-------|--------|
| Venta YTD | `arr.ventas_diarias_cliente` — `SUM(kg)` entre `fecha` inicio y fin |
| Categoría CASA/COMISIONISTA | `canal` (misma regla que `categoriaEsComisionista`) |
| Subcategoría | `subcanal` físico: Autotanque / Portátil / Carburación |
| Planta | `plant_code` alineado a Puebla, Tehuacán, Acapulco, Querétaro, San Luis, Morelos |
| Cliente | `cliente_norm` |
| Comentario | último `body` activo de `arr.cliente_comentarios` por planta + nombre |
| Movimiento | comparación YTD toneladas, misma familia DICF (dejaron / nuevos / aumentaron / disminuyeron) aplicada a kg, no a ingreso mensual |

No se creó tabla nueva. El SELECT reutiliza la misma tabla que el forecast ARR.

## 4. Criterio YTD

Mes seleccionado en ARR (`selB`, ej. `2026-09`):

- Actual: `2026-01-01` → `2026-09-30`
- Anterior: `2025-01-01` → `2025-09-30`

No entra octubre. El último día es el calendario del mes seleccionado.

Δ TON = venta YTD actual − venta YTD mismo rango año anterior.

Matriz:

- B Autotanque, C Portátil, D Carburación
- E = `B+C+D` (fórmula Excel)
- TOTAL = `SUM` de las seis plantas; E del total = `B11+C11+D11`

## 5. Consolidación de plantas

El API no filtra por la empresa del dropdown. Consulta los `plant_code` de las seis plantas (con y sin tilde). El dropdown solo sigue sirviendo a EVALUACION / ARR de la planta activa.

## 6. Clasificación de movimientos

Sobre toneladas YTD, no sobre el ingreso mensual DICF:

| Condición | Tipo | Sección |
|-----------|------|---------|
| prev > 0 y curr ≤ 0 | DEJARON DE COMPRAR | IMPACTO NEGATIVO |
| prev > 0 y curr > 0 y curr < prev | DISMINUYERON | IMPACTO NEGATIVO |
| prev ≤ 0 y curr > 0 | NUEVOS | IMPACTO POSITIVO |
| prev > 0 y curr > 0 y curr > prev | AUMENTARON | IMPACTO POSITIVO |

Delta 0 o ambos 0: no se lista.

## 7. Comentarios

Último comentario activo por `planta_id` + `lower(trim(cliente_nombre))`.

- Si existe: se copia el `body`.
- Si no: `Sin comentario registrado`.
- No se antepone «porque». No se afirma causa.

## 8. Contribución

`delta_cliente / delta_planta_categoría_subcategoría`.

Si el denominador es 0 o no finito: `—`. No se inventa porcentaje.

## 9. EVALUACION no se rompió

`applyEvaluacionFormulas` sigue usando `CASA` y `COMISIONISTA`.

El test crea un workbook con:

- `EVALUACION!F7 = (CASA!B7+CASA!B9+COMISIONISTA!B9)*1000`
- `CASA!B7 = 12.5`
- `COMISIONISTA!B7 = 3.2`

Tras añadir las hojas anuales, esos valores y la fórmula permanecen. Recarga ExcelJS sin corrupción.

## 10. Pruebas

`node --test test/arr-annual-category-analysis.test.js` — 16/16.

Cubren existencia de hojas, seis plantas, B/C/D/E, TOTAL, YTD, año anterior, cuatro movimientos, planta/categoría/subcategoría, delta, comentario, fail-closed de causa, EVALUACION, CASA/COMISIONISTA intactas, workbook recargable.

Workbook de prueba: `test/artifacts/arr-annual-category-analysis-sample.xlsx`.

## 11. Diff conceptual

```
antes:
  Exportar Excel → ARR + ARR Plan + CASA + COMISIONISTA (+ META/EVALUACION)
  CASA/COMISIONISTA = foto mensual de la planta del dropdown

después:
  mismo archivo
  + CASA ANUAL / COMISIONISTA ANUAL
  matriz YTD de las 6 plantas
  clientes +/− con YTD, delta, contribución y comentario observado
```

## 12. Limitaciones

- Subcanales que no sean Autotanque / Portátil / Carburación no entran a la matriz ni al detalle. No se reclasifican.
- Un solo `autoFilter` por hoja (límite ExcelJS); queda en la tabla de impacto negativo.
- Si el API anual falla, el Excel actual se descarga igual, sin las hojas nuevas (no se inventa el YTD).
- El comentario es evidencia registrada, no causa.

## 13. Contratos

Consultados: `CURRENT_TASK`, `LOOP_PROTOCOL`, `origin/main` `1884f183`.

Modificados en `docs/director-ia/`: ninguno.

`authorized_*`: no tocados.
