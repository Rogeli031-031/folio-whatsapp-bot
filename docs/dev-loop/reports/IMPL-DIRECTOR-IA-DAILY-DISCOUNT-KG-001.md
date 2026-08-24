# Reporte — IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001

```yaml
task_id: "IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001"
outcome: "DONE_PENDING_REVIEW"
determination: "IMPLEMENTED"
first_slice: "D"
intent: "daily_discount_deviation"
destination: "chat legado (askDirectorIa + planner + OpenAI existente), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
timezone: "America/Mexico_City"
target_day: "ayer calendario completo (hoy excluido)"
reference: "same_weekday_14d_pooled, ventana 14 días, N observaciones explícito, SUM(monto_ref)/SUM(kg_ref)"
plant_formula: "SUM(monto)/SUM(kg)"
average_of_averages: false
channel_contribution: false
causality_programmed: false
m9_modified: false
sql_017_executed: false
persistent_daily_memory: false
raw_history_as_fact: false
openai_calls_per_turn: 1
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Daily discount/kg is not module coverage."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001.md"
  - "lib/director-ia-daily-discount.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-tools.js"
  - "test/director-ia-daily-discount.test.js"
  - "scripts/test-director-ia-planner.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
files_not_touched:
  - "docs/director-ia/"
  - "frontend-dashboard/"
  - "server.js"
  - "sql/"
  - "package.json"
  - "lockfiles"
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-financial-diagnosis.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-DAILY-DISCOUNT-KG-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea (CLOSED/REJECTED) y, si aplica, autoriza NEXT_TASK."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

Quedó implementado el first slice **D — `daily_discount_deviation`**.

El chat legado rutea «¿Por qué subió el descuento/kg ayer?» (y equivalentes con **ayer** + descuento) a un intent nuevo **`daily_discount_deviation`**. No usa `delta_discount` ni `financial_diagnosis` mensuales.

El runtime arma un pack con:

1. **summary** — fecha objetivo CDMX, `SUM(monto)/SUM(kg)` de ayer, delta vs referencia.
2. **reference** — same-weekday 14 días **pooled** (`SUM(monto_ref)/SUM(kg_ref)`), N observaciones. No promedio de ratios diarios.
3. **customer contributors** — `contrib_i = monto_i_t/K_t − monto_i_r/K_r`, reconciliado con `R_target − R_ref`.
4. **business evidence** — DICF y comentarios **solo por `cliente_key`**.
5. **information gaps** — contribuidores materiales sin evidencia suficiente.
6. **limitations** y **provenance**.

No hay contribución por canal. GPT recibe pack fresco + HILO. Contribución ≠ causa. Comentario ≠ causa. Acción ≠ causa. Responsable ≠ culpable.

Baseline intacto: **10.5 / 20 = 52.5%**, **0.0 pp**. M9 mensual **no** se modificó.

NEXT_TASK (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-DAILY-DISCOUNT-KG-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-daily-discount-kg-001` (≠ `main`).
- HEAD de partida: `da087c39 Merge branch 'architecture/director-ia-daily-discount-kg-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. `AUTHORIZED` → `IN_PROGRESS` solo cambió `status`.
- Transición final: `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge, matriz, contratos, frontend, server.js, SQL, M9.

---

## Qué se implementó

### Pack — `lib/director-ia-daily-discount.js`

- Monto: `arr.descuentos_diarios_cliente` (`fecha`, `plant_code`, `cliente_norm`, `monto`).
- Kg: `arr.ventas_diarias_cliente` → `SUM(kg)` al grano cliente/día/planta. Canal de venta solo para derivar `cliente_key`; **no** prorratea monto.
- Join FULL OUTER al grano cliente/día. Planta: `SQL_PROV_MAP` como venta diaria.
- **Ayer:** `America/Mexico_City`. Hoy no es día cerrado. Día sin filas ≠ 0. kg=0 → ratio indefinido, no 0.
- **Planta y referencia:** `SUM(monto)/SUM(kg)`. No AVG de ratios.
- **Referencia B:** same ISODOW, ventana 14 días cerrados, días con filas, pooled. N explícito. No día anterior. No M9.
- **Contribución:** `contrib_i = monto_i_t / K_t − monto_i_r / K_r`. `SUM(contrib_i)` reconcilia `R_target − R_ref` (`RECONCILE_TOLERANCE = 1e-8`). Ratio alto ≠ mayor mover.
- DICF + `arr.cliente_comentarios` unidos **solo** por `cliente_key`. No join por nombre.
- Authz igual que venta diaria / M9 (GA/GV `SOURCE_RESTRICTED`, planta, fail-closed).
- Addendum de sistema: GPT interpreta; no plantilla causal; no canal; no M9.

### Planner

Intent `daily_discount_deviation` **después** de `daily_sales_deviation` y **antes** de `delta_discount` / `financial_diagnosis`. Exige `\bayer\b` + descuento. Venta+descuento en la misma frase no se fusiona: se preserva `daily_sales_deviation`. «cómo cambió el descuento» (sin ayer) sigue `delta_discount`.

### Continuidad

`INHERITABLE_INTENTS` incluye `daily_discount_deviation`. `active_date` efímero. Follow-ups del producto: contra qué / quién movió más el promedio / fue general / sabemos por qué / qué falta / quién puede aclararlo. `forceIntent` en chat. Requery cada turno. Estrategia B natural preservada.

### Tools

`get_daily_discount_deviation` (dominio `arr`, on demand). El chat ejecuta in-process; el plan de tools no despacha M9.

---

## Confirmaciones

- Intent diario: `daily_discount_deviation`.
- Ayer CDMX: `America/Mexico_City`, día completo, hoy excluido.
- Referencia pooled same-weekday 14d: `SUM(monto_ref)/SUM(kg_ref)`.
- Fórmula planta: `SUM(monto)/SUM(kg)`.
- Contribuciones reconciliadas con `R_target − R_ref`.
- Sin canal y sin prorrateo.
- Evidencia/gaps por `cliente_key` canónico.
- GPT recibe pack fresco + HILO; interpreta, no programa causa.
- Causalidad no programada.
- M9 unchanged (`lib/director-ia-m9-deltas.js` no tocado).
- Tests verdes.
- Baseline **52.5%** (0.0 pp).

---

## Tests

```
node --test test/director-ia-daily-discount.test.js              21/21
node --test test/director-ia-daily-deviation.test.js             pass
node --test test/director-ia-action-person-routing.test.js       pass
node --test test/director-ia-natural-followup.test.js            pass
node --test test/director-ia-persistent-memory.test.js           pass
node scripts/test-director-ia-planner.js                         58/58
node scripts/test-director-ia-capabilities.js                    56/56
node scripts/test-director-ia-tool-orchestrator.js               28/28
node --test test/director-ia-*.test.js                           835/835
git diff --check                                                 limpio
```

Las cuatro suites de regresión diaria/AR/follow-up/memoria corrieron juntas: **72/72**.

---

## Alcance respetado

- No matriz. No contratos. No schema. No SQL 017.
- No mix/rate. No canal. No tradeoff.
- No corrección de M9 (su promedio de ratios mensuales permanece).
- No IES. No Reasoning Engine.
- No commit. No push. No merge.

---

## NEXT_TASK (propuesta únicamente)

`DOCS-DIRECTOR-IA-DAILY-DISCOUNT-KG-SYNC-001`

No autorizado. No ejecutado. STOP.
