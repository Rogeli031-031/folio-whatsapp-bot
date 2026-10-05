# G4-PREP-IGF-ACUMULADO-DEFAULT-PERF-MARGEN-063

task_id: G4-PREP-IGF-ACUMULADO-DEFAULT-PERF-MARGEN-063

outcome: DONE

status: DONE_PENDING_REVIEW

## Verificación

| comprobación | resultado |
| --- | --- |
| rama | `fix/igf-acumulado-default-perf-margen-063` |
| `origin/main` | `abf146ec62f7cfc791cd67eb2da523a46ed43743` |
| product SHA | `fd956d15e5edfb10b75e70660336ebacf46f95c7` |
| source SHA | `abffdb9d83e0e2b5bd243840979f2cb4bf93349f` |
| ahead / behind | 2 / 0 |
| cambios nuevos de producto | ninguno |
| cambios nuevos de tests | ninguno |
| `git diff --check` | limpio |

`main` no se movió. No hubo rebase ni merge. Esta tarea no volvió a implementar 063.

## Alcance ya validado

- IGF Diario acumulado abre por default. Forecast sigue en su botón y no cambió de fórmula.
- La tabla usa una sola request. Antes eran N llamadas a `/api/dashboard/igf-diario-grafica`, una por planta. Después es 1 `GET /api/dashboard/igf-diario-acumulado`.
- El endpoint es read-only y respeta la auth y el alcance de plantas. No arma C&D, clientes nuevos, comentarios, insights, `month_close`, series de gráfica, gastos ni Excel.
- `null` y el vacío no son 0. El cero numérico sigue siendo válido.
- El fixture tipo San Luis queda en 8.20 y no en ~0.91.
- HG conserva el signo natural de Y.
- 062 y M3/T3 permanecen intactos.

## Pruebas ya ejecutadas

063, 059, 059-R1, 061, 062, 053A, 053A-R1, 053A-R2 y 054-R3: PASS. 56 pruebas PASS. `npm run build` PASS. `node --check server.js` PASS.

## Pull Request

base: `main`

head: `fix/igf-acumulado-default-perf-margen-063`

título: `FIX 063: IGF Diario acumulado default, rápido y margen correcto`

número: 103

URL: https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/103

El PR quedó abierto. No se ejecutó merge.

## Reserva humana

El merge G4 lo ejecuta solo el HUMAN_APPROVER. Deploy no está autorizado.

## Protocolo

- archivos tocados: este reporte y `docs/dev-loop/CURRENT_TASK.md` solo `status`
- contratos consultados: `AGENTS.md`, `LOOP_PROTOCOL.md`, `CURRENT_TASK.md`
- contratos modificados: ninguno
- contradicciones: ninguna
- desvíos: ninguno
- next_task_proposed: no autorizado
- secrets_check: sin secretos
- human_decision_needed: merge G4. Deploy no.
