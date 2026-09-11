# FIX-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-CLIENT-WRAPPER-001

```yaml
task_id: FIX-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-CLIENT-WRAPPER-001
outcome: DONE
mode: REGRESSION_FIRST
implementation: true
code_changes: true
commits: true
push: false
merge: false
schema_changes: false
docs_director_ia_changed: false
live_db: false
base_main_sha: "ccee6a22b0df20aafb472afd45f78c729a502431"
head_at_start: "d20659a1326fdbc963a764fce577441d1a8460dc"
branch: fix/director-ia-month-close-historical-mini-client-wrapper-001
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/README.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-LIVE-PARITY-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
files_touched:
  - lib/director-ia-month-close-result.js
  - test/director-ia-month-close-historical-mini-client-wrapper.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-MONTH-CLOSE-HISTORICAL-MINI-CLIENT-WRAPPER-001.md
files_not_touched:
  - server.js
  - lib/director-ia-chat.js
  - lib/director-ia-planner.js
  - lib/director-ia-executive-cycle-composer.js
  - lib/director-ia-dashboard-forecast-adapter.js
  - frontend-dashboard/
  - docs/director-ia/
  - sql/
next_task_proposed: null
next_task_authorized: false
next_task_executed: false
human_decision_needed:
  - "G5: aceptar o rechazar este FIX."
  - "Tras deploy LIVE: validar números de agosto. Si difieren del dashboard, un slice posterior de cutoff/upload_day puede ser necesario. No está autorizado."
```

## Cambio

En `loadMonthCloseResultForChat`, el loader histórico ahora recibe el primer argumento de la función (`pool`, root handle) en lugar del Client ya adquirido (`db`).

Antes:

```
opts.loadIgfForecastMiniPayload(db, { year, month, plantName, plantCode })
```

Después:

```
opts.loadIgfForecastMiniPayload(pool, { year, month, plantName, plantCode })
```

`db` sigue usándose para sales, discount, target, forecast, financial actual y comentarios. No se tocó el wrapper, `server.js`, `upload_day`, composer, planner ni C4.

## North Star de fixture

Pool → month_close `acquire()` Client → mini loader recibe Pool → wrapper `pool.connect()` propio → compute → fila Acapulco → `VISIBLE_NOT_FINAL`.

El fixture pre-fix (pasar el Client checked-out al wrapper) sigue reproduciendo `Client has already been connected` → `historical_mini=null` → `DATA_MISSING`.

`DATA_MISSING` permanece cuando el mini está realmente ausente (rows vacíos / fila sin valores defendibles).
