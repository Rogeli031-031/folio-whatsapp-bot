# FIX-ARR-ANNUAL-EXPORT-WEBPACK-ALIAS-001

```yaml
task_id: "FIX-ARR-ANNUAL-EXPORT-WEBPACK-ALIAS-001"
outcome: "DONE"
mode: "FIX"
implementation: true
code_changes: true
logic_changes: false
reference_main: "e2ed5b0a"
branch: "fix/arr-annual-export-webpack-alias-001"
build: "frontend-dashboard npm run build → Compiled successfully, exit 0"
module_not_found: false
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar y mergear. No autoriza deploy por este agente."
```

## 1. Resultado

**DONE_PENDING_REVIEW.** Next/Webpack resuelve `arr-annual-category-analysis.js`. El error `Module not found` desaparece.

No se tocó la lógica YTD ni el contenido de `CASA ANUAL` / `COMISIONISTA ANUAL`.

## 2. Causa

Desde `frontend-dashboard/lib/arr-export-excel.ts`, el import `../../../lib/arr-annual-category-analysis.js` sube tres niveles y sale del repo. `next.config.js` solo aliasaba `ingreso-cliente-marginal.js`.

## 3. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `frontend-dashboard/lib/arr-export-excel.ts` | Import → `../../lib/arr-annual-category-analysis.js` |
| `frontend-dashboard/next.config.js` | Alias de ambas rutas al archivo físico en `lib/` |
| `test/arr-annual-export-webpack-alias.test.js` | Comprueba ruta y aliases |
| `docs/dev-loop/CURRENT_TASK.md` | Solo `status`: AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW |
| `docs/dev-loop/reports/FIX-ARR-ANNUAL-EXPORT-WEBPACK-ALIAS-001.md` | Este reporte |

## 4. Diff conceptual

```
antes:
  arr-export-excel.ts → ../../../lib/arr-annual-category-analysis.js
  (sale del repo; Module not found en Render)

después:
  arr-export-excel.ts → ../../lib/arr-annual-category-analysis.js
  next.config aliasa ../../../ y ../../ al mismo archivo físico
```

## 5. Pruebas

- `node --test test/arr-annual-category-analysis.test.js test/arr-annual-export-webpack-alias.test.js` — 18/18
- `npm run build` en `frontend-dashboard`: `✓ Compiled successfully`, `/arr` generado, exit 0
- El log no contiene `Module not found` ni `Can't resolve`

## 6. Contratos

`authorized_*` intactos. Sin merge, sin deploy, sin siguiente tarea.
