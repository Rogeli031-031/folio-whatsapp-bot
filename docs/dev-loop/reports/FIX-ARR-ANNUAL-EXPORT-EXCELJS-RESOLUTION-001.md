# FIX-ARR-ANNUAL-EXPORT-EXCELJS-RESOLUTION-001

```yaml
task_id: "FIX-ARR-ANNUAL-EXPORT-EXCELJS-RESOLUTION-001"
outcome: "DONE"
mode: "FIX"
implementation: true
code_changes: true
logic_changes: false
reference_main: "5a3be93c"
branch: "fix/arr-annual-export-exceljs-resolution-001"
build: "frontend-dashboard npm run build → Compiled successfully, exit 0"
cant_resolve_exceljs: false
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar y mergear. No autoriza deploy por este agente."
```

## 1. Resultado

**DONE_PENDING_REVIEW.** Next/Webpack resuelve `exceljs` desde `frontend-dashboard/node_modules`. `npm run build` termina exit 0. No aparece `Can't resolve 'exceljs'`.

No se tocó lógica YTD, workbook, `lib/arr-annual-category-analysis.js`, `server.js`, SQL ni package.json.

## 2. Causa

`lib/arr-annual-category-analysis.js` vive fuera de `frontend-dashboard` y hace `require("exceljs")`. Webpack, con issuer en esa ruta, no mira `frontend-dashboard/node_modules`. El paquete ya estaba declarado e instalado (`exceljs ^4.4.0`).

## 3. Evidencia de `require.resolve("exceljs")`

Se intentó primero el alias:

```
exceljs: require.resolve("exceljs")
```

Eso elimina `Can't resolve 'exceljs'`, pero fija el entry Node (`excel.js` → `exceljs.nodejs.js`). El bundle cliente de `/arr` falla con `Can't resolve 'fs'` (fast-csv, archiver, csv.js).

Por eso no es suficiente. Equivalente autorizado: alias al directorio del paquete para que Webpack aplique el campo `browser` (`./dist/exceljs.min.js`).

## 4. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `frontend-dashboard/next.config.js` | Alias `exceljs` → `path.dirname(require.resolve("exceljs/package.json"))` |
| `test/arr-annual-export-exceljs-resolution.test.js` | Comprueba alias y resolución física |
| `docs/dev-loop/CURRENT_TASK.md` | Solo `status`: AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW |
| `docs/dev-loop/reports/FIX-ARR-ANNUAL-EXPORT-EXCELJS-RESOLUTION-001.md` | Este reporte |

## 5. Diff conceptual

```
antes:
  require("exceljs") desde lib/ fuera de frontend-dashboard
  → Module not found: Can't resolve 'exceljs' (Render)

intento insuficiente:
  alias exceljs = require.resolve("exceljs")
  → encuentra el paquete, usa entry Node, Can't resolve 'fs'

después:
  alias exceljs = dirname(require.resolve("exceljs/package.json"))
  → paquete de frontend-dashboard; Webpack elige browser vs node
```

## 6. Pruebas

- `node --test test/arr-annual-category-analysis.test.js test/arr-annual-export-webpack-alias.test.js test/arr-annual-export-exceljs-resolution.test.js` — 20/20
- `npm run build` en `frontend-dashboard`: `✓ Compiled successfully`, `/arr` generado, `prepare-standalone` ok, exit 0
- El log final no contiene `Can't resolve 'exceljs'` ni `Module not found`
- Sin `npm audit fix`, sin cambios de dependencias

## 7. Contratos

`authorized_*` intactos. Sin merge, sin deploy, sin siguiente tarea.
