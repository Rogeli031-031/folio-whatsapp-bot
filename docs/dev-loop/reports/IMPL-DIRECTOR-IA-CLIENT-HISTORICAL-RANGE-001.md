# IMPL-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-001

```yaml
task_id: IMPL-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-001
outcome: DONE
task_type: IMPLEMENTATION
files_touched:
  - lib/director-ia-client-profile.js
  - test/director-ia-client-profile.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/IMPL-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-001.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-AUDIT-001.md
files_not_touched:
  - lib/dashboard-arr-forecast.js
  - lib/director-ia-dashboard-forecast-adapter.js
  - lib/director-ia-authoritative-forecast-run-pack.js
  - lib/director-ia-conversational-executive-layer.js
  - lib/commercial-trend-engine.js
  - lib/director-ia-commercial-trend.js
  - lib/director-ia-conversation-state.js
  - lib/director-ia-planner.js
  - lib/director-ia-chat.js
  - schema / migrations
  - docs/director-ia/
  - GRUPO MOVE hint extract
contracts_consulted:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-HISTORICAL-RANGE-AUDIT-001.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/LOOP_PROTOCOL.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "G5/G1 humano transcrito a CURRENT_TASK desde la autorización en chat. Rama implementation/director-ia-client-historical-range-001 (no main)."
next_task_proposed: ""
secrets_check: none
FORECAST_CHANGED: NO
PERIOD_START_CHANGED: NO
DASHBOARD_CHANGED: NO
SCHEMA_CHANGED: NO
GLOBAL_INHERIT_CHANGED: NO
EXPLICIT_CLIENT_PRECEDENCE_REVERTED: NO
IMPLEMENTATION_AUTHORIZED_NEXT: NO
```

## Causa raíz (auditoría)

`parseExplicitMonths` exigía ≥2 nombres de mes y no expandía intervalos. «enero a la fecha» / «desde enero» devolvían `null`. El fallback era inherit o `defaultThreeMonths` (jul–sep el 2026-09-01). SQL y pack nunca veían enero–junio.

## Solución mínima

Solo `lib/director-ia-client-profile.js`. No se tocó Forecast, Period Start, Dashboard, schema, inherit global ni la fórmula de descuento.

1. **`parseExplicitPeriod`** local: desde/a la fecha, todo el año/este año, últimos N meses (1–24), mes individual con ancla (`en`/`solo`/`mes de`), rango de dos meses inclusive, cross-year cronológico. «Julio Pérez» no es julio calendario.
2. **Precedencia:** explicit expandido > `active_period_months` heredado > `defaultThreeMonths`. Sin periodo, el default 3M CDMX se conserva.
3. **Ventana SQL** = min/max cronológico (`query_start`/`query_end`), no first/last del array desordenado.
4. **Pack:** `requested_range`, `query_start`, `query_end`, `source`. Prompt prohíbe falsa completitud.
5. **Alineación intacta:** planta sin cobertura → `DATA_NOT_FOUND`/null. Planta cubierta sin fila de cliente → `ZERO_OBSERVED`. `SUM(kg)=0` → 0 `OK`. Descuento `SUM(monto)/SUM(kg)`.
6. **Fail-closed:** últimos N inválido / año futuro / rango vacío → `ambiguous_period` / `invalid_last_n` / `future_year`, sin caer al default de 3M.
7. **Routing local:** periodo explícito + cliente nombrado o activo entra a `client_profile`. Action-person y trend planta se preservan. No se corrigió el hint `GRUPO`.

## Caso de aceptación (2026-09-01 CDMX)

«Dame los kg y el descuento por cada mes de Erick desde enero a la fecha»

| Campo | Valor |
|-------|--------|
| requested_range | 2026-01 → 2026-09 |
| query_start | 2026-01-01 |
| query_end | 2026-09-30 |
| slots | 2026-01 … 2026-09 |
| septiembre | PARTIAL |
| SQL | incluye enero–septiembre |

## Golden cases

| Frase | Resultado |
|-------|-----------|
| Erick desde enero / de enero a la fecha / todo el año / este año | 2026-01…2026-09 |
| Erick últimos 6 meses | 2026-04…2026-09 |
| Erick en enero | 2026-01 |
| Erick de noviembre a febrero | 2025-11…2026-02; query 2025-11-01…2026-02-28 |
| Erick de enero a agosto | 2026-01…2026-08 inclusive |
| ¿Y desde enero? + inherit jul–sep | explicit ene–sep; Erick se puede conservar |
| ¿Qué sabemos de TORTILLERIA ERICK? | default 07–09 |
| planta sin cobertura | null / DATA_NOT_FOUND |
| planta cubierta sin compras del cliente | ZERO_OBSERVED |
| mes actual | PARTIAL |
| últimos 99 meses | invalid_last_n, no default 3M |
| Julio Pérez tiene algo vencido | action_status (no mes julio) |

## Tests

Focal `test/director-ia-client-profile.test.js`: **24/24**.

`test/director-ia-action-person-routing.test.js`: **pass** (regresión del colisión «Julio»).

Suite `node --test test/director-ia*.js`: **1338/1338**, fail 0.

## Limitaciones restantes

- Hint `Y GRUPO MOVE` → `GRUPO` no se corrigió (fuera de alcance).
- «Ahora dime lo mismo…» sigue siendo `plant_switch`.
- Un mes suelto sin ancla (`Erick enero`) no sustituye el default; usar `en`/`solo`/`desde`.
- No hay `EARLIEST_AVAILABLE_MONTH` de fuente.
- Comments/DICF siguen sin filtrar por el rango de venta.
- `max_tokens` 1000 no se cambió; 12–24 meses pueden apretar la verbalización.

```
DASHBOARD_BEHAVIOR_CHANGED = NO
PRODUCTION_PASS = NOT_YET_PROVEN
IMPLEMENTATION_AUTHORIZED_NEXT = NO
CLIENT_DEEP_DIVE_STARTED = NO
GOLDEN_SET_IMPLEMENTED = NO
MERGE_TO_MAIN = NO
```
