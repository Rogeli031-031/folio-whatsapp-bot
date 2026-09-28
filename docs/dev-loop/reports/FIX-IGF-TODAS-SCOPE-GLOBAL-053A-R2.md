# FIX-IGF-TODAS-SCOPE-GLOBAL-053A-R2

## Identidad

```yaml
task_id: "FIX-IGF-TODAS-SCOPE-GLOBAL-053A-R2"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "server.js"
  - "frontend-dashboard/lib/auth.ts"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "test/igf-diario-todas-scope-global-053a-r2.test.js"
  - "test/igf-diario-ui-scoped-view-025.test.js"
  - "docs/dev-loop/reports/FIX-IGF-TODAS-SCOPE-GLOBAL-053A-R2.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "lib/igf-diario-puebla.js"
  - "lib/dashboard-arr-forecast.js"
  - "lib/compras-excel.js"
  - "PostgreSQL / schema"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "La ventana de la prueba 025 pasó de 2200 a 2500 caracteres para seguir viendo el botón IGFDiario junto al mes. La aserción no cambió."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | FIX-IGF-TODAS-SCOPE-GLOBAL-053A-R2 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 3e0ea1e9549b4c0539639de6b53f433f74d430d1 |
| branch | fix/igf-todas-scope-global-053a-r2 |
| schema_changes | false |
| data_mutation | false |

## Lectura

`dashboardHasGlobalPlantScope` reconoce solo ZP, AD y CF_CDMX, la misma lista que ya usaba Action Register. `assertDashboardPlantaAccessForActionRegister` ahora llama a ese helper.

`GET /api/arr/dashboard-excel` evalúa `igf_diario_todas` después de los bloqueos de GA y GV, y antes de `pool.connect`. Si el flag llega junto con `plant_code` o `require_plant`, responde 400. Si el rol no es global, responde 403. En ambos casos no se llama `listIgfDiarioProvinciaPlants`, `loadMonth` ni `loadPrecioDiario` de las otras plantas.

Sin el flag, el caller histórico sigue igual. El export individual sigue en `resolveForecastExportPlant` y `assertPlantaPermitidaDashboard`.

En el cliente, `tokenHasGlobalPlantScope` lee solo el role del JWT. Con Planta = Todas, un rol local no abre la descarga y muestra el mensaje de alcance. Una planta seleccionada no usa ese bloqueo.

## Pruebas

ZP, AD y CF_CDMX con `igf_diario_todas=1` pasan el gate. GG y GO reciben 403 aunque `plantas_permitidas` tenga una planta o venga vacío. GA y GV siguen en sus 403 anteriores, antes del gate nuevo. Todas más `plant_code` y `require_plant` da 400. El export individual de Puebla no entra al gate. Una petición sin flag no recibe el 403 nuevo.

El 403 está antes de `pool.connect` y, por tanto, antes de armar las seis plantas.

- `test/igf-diario-todas-scope-global-053a-r2.test.js`: pass.
- 024, 025, 053A, 053A-R1 y 051-R1: pass.
- Conjunto: 64 pass, 0 fail.
- Matemática, orden de hojas, soportes, export individual, alias y corte no se tocaron: 053A y R1 siguen pasando.
- `git diff --check`: limpio.

## Desviaciones

La prueba 025 amplió la ventana de lectura del encabezado de 2200 a 2500 caracteres. El botón y el mes siguen en el mismo orden.
