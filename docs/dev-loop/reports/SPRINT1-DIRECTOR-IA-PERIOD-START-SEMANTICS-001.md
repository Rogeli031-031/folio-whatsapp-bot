# SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-001

```yaml
task_id: SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-001
outcome: DONE
task_type: IMPLEMENTATION
files_touched:
  - lib/director-ia-dashboard-forecast-adapter.js
  - lib/director-ia-authoritative-forecast-run-pack.js
  - lib/director-ia-conversational-executive-layer.js
  - test/director-ia-period-start-semantics.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-001.md
files_not_touched:
  - lib/dashboard-arr-forecast.js
  - fórmula lastClosedDay / total_mes_sum
  - Forecast / ARR / IGF / PROM
  - commercial-trend-engine / movers / comentarios
  - client_profile
  - Dashboard / gráfica / 1M-3M
  - docs/director-ia/
contracts_consulted:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-AUDIT-001.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/dev-loop/LOOP_PROTOCOL.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "G5/G1 humano transcrito a CURRENT_TASK. Rama sprint1-period-start-semantics-001 (no main)."
next_task_proposed: ""
secrets_check: none
CLIENT_HISTORICAL_RANGE_STARTED: NO
```

## Causa raíz (auditoría)

`total_mes_sum = 0` el día 1 es correcto (ventana de días cerrados vacía). Se transportaba sin metadata. CEL decía «se han vendido 0 t». El LLM infería «falta de actividad comercial significativa».

## Solución mínima

No se recalcula venta. No se altera `total_mes_sum` ni `lastClosedDay` del sheet.

1. **Metadata reutilizada.** `deriveLastClosedDay(year, month, cutoff)` replica la regla ya existente (`isCorteEnMes ? max(0, día−1) : día`) usando `getPronosticoCorteYmdStr` + fecha de corte. No edita `dashboard-arr-forecast.js`.
2. **`classifyActualToDateKind`** distingue:
   - `NO_CLOSED_DAYS_YET` (`lastClosedDay === 0` y hay número)
   - `ZERO_OBSERVED` (`lastClosedDay > 0` y venta === 0)
   - `VALUE_OBSERVED` (venta > 0)
   - `UNAVAILABLE` (sin corte)
   - `NULL` (corte presente, venta null)
   - `SOURCE_UNAVAILABLE` (source_error)
3. **Punto donde se preserva NO_CLOSED_DAYS_YET:** `emptyActual` / `buildAuthoritativeForecastRunPack` y el adapter al copiar `actual_to_date`. CEL lee `period_start_status` + `last_closed_day`.
4. **Verbalización.** Si `NO_CLOSED_DAYS_YET`: «aún no hay días cerrados del mes para reportar venta acumulada al corte». No «se han vendido 0 t». El 0 numérico se conserva en el pack (`venta=0`, `AVAILABLE`).
5. **Guard acotado.** Solo si el pack tiene `NO_CLOSED_DAYS_YET`: quita «se han vendido 0 t/toneladas», «falta de actividad comercial», «no hubo actividad», «la planta no vendió», «mal desempeño» y «lo que indica [falta/caída/mal desempeño]». No es phrasebook general: con `ZERO_OBSERVED` el guard no actúa.

## Matriz A–H

| Caso | Resultado |
|---|---|
| A día 1, 0 | `NO_CLOSED_DAYS_YET`; no afirma actividad cero |
| B día 2, >0 | `VALUE_OBSERVED`; «se han vendido N t» |
| C día 2, 0 | `ZERO_OBSERVED`; 0 verbalizable; no es NO_CLOSED_DAYS_YET |
| D mitad, 0 | `ZERO_OBSERVED` |
| E mitad, >0 | `VALUE_OBSERVED` |
| F source error | `SOURCE_UNAVAILABLE`; «no disponible» |
| G null | `NULL`; ausencia ≠ 0; no es NO_CLOSED_DAYS_YET |
| H 0 con días cerrados | `ZERO_OBSERVED`; 0 conservado |

## Regresiones

Forecast venta/descuento/utilidad/resultado, IGF stored, tendencias CASA/COMISIONISTA, movers, comentarios, no-causa, riesgos, ejecución, DICF, AR, client_profile, commercial trend, Forecast NL («¿Qué descuento proyectamos para el cierre/cerrar el mes?») siguen en la suite.

`dashboard-arr-forecast.js` no se modificó.

## Tests

Focal `test/director-ia-period-start-semantics.test.js`: **13/13**.

Suite `node --test test/director-ia*.js`: **1333** tests. Fallo único: `director-ia-dashboard-cycle-endpoint` `fetch failed: bad port` (harness HTTP, fuera de alcance). Re-run aislado: **24/24**. No es regresión de esta tarea.

## Limitaciones

- `ZERO_OBSERVED` no distingue día missing vs 0 almacenado en el mapa (el TOTAL ya colapsaba eso). Fuera de este contrato.
- El 0 del día 1 sigue existiendo numéricamente; solo cambia la interpretación ejecutiva.
- Production pass pendiente de validación humana.

```
VALUE_CORRECTNESS_PRESERVED = YES
NO_CLOSED_DAYS_YET_PRESERVED = YES
ZERO_OBSERVED_PRESERVED = YES
NULL_PRESERVED = YES
UNAVAILABLE_PRESERVED = YES
FORECAST_FORMULA_CHANGED = NO
DASHBOARD_BEHAVIOR_CHANGED = NO
CLIENT_HISTORICAL_RANGE_STARTED = NO
TESTS = 13/13 focal; suite 1333 (1 flake HTTP out-of-scope, re-run pass)
PRODUCTION_PASS = NOT_YET_PROVEN
```

STOP. No CLOSED ni APPROVED. Un DONE no autoriza otra tarea.
