# Reporte — IMPL-DIRECTOR-IA-DAILY-DEVIATION-001

```yaml
task_id: "IMPL-DIRECTOR-IA-DAILY-DEVIATION-001"
outcome: "DONE_PENDING_REVIEW"
determination: "IMPLEMENTED"
first_slice: "daily_sales_plus_business_evidence"
intent: "daily_sales_deviation"
destination: "chat legado (askDirectorIa + planner + OpenAI existente), NO Motor N1–N5, NO IES, NO Reasoning Engine"
g2: "N/A"
g3: "N/A"
g8: "N/A"
timezone: "America/Mexico_City"
target_day: "ayer calendario completo (hoy excluido)"
reference: "same_weekday_recent_average, ventana 14 días, N observaciones explícito"
discount_kg_implemented: false
sql_017_executed: false
persistent_daily_memory: false
raw_history_as_fact: false
openai_calls_per_turn: 1
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Daily deviation is not module coverage."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DAILY-DEVIATION-001.md"
  - "lib/director-ia-daily-deviation.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-conversation-state.js"
  - "test/director-ia-daily-deviation.test.js"
  - "test/director-ia-conversational-continuity.test.js"
  - "scripts/test-director-ia-tool-orchestrator.js"
files_not_touched:
  - "docs/director-ia/"
  - "frontend-dashboard/"
  - "server.js"
  - "sql/"
  - "package.json"
  - "lockfiles"
  - "lib/director-ia-financial-diagnosis.js"
  - "lib/director-ia-plant-diagnosis.js"
  - "lib/director-ia-m2-folio-status.js"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "scripts/test-director-ia-planner.js"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-DAILY-DEVIATION-SYNC-001"
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea (CLOSED/REJECTED) y, si aplica, autoriza NEXT_TASK."
  - "El NEXT_TASK no está autorizado ni ejecutado."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

Quedó implementado el first slice **C — `daily_sales_plus_business_evidence`**.

El chat legado rutea «¿Por qué bajó la venta ayer?» (y equivalentes con **ayer** + venta) a un intent nuevo **`daily_sales_deviation`**. No usa `financial_diagnosis` ni `delta_sales` mensuales.

El runtime arma un pack con:

1. **Detección** — fecha objetivo CDMX, kg de ayer, referencia same-weekday 14 días, N observaciones, delta kg y delta %.
2. **Matemática** — contribución por cliente y por canal, top contributors, reconciliación con el total.
3. **Evidencia de negocio** — DICF y comentarios **solo por `cliente_key`**.
4. **Huecos** — contribuidores materiales sin explicación suficiente; acción sí/no; comentario sí/no; responsable solo si está ligado a una acción.

GPT recibe el pack y razona. No hay respuesta final rígida. Contribución ≠ causa. Comentario ≠ prueba. Acción ≠ causa.

Baseline intacto: **10.5 / 20 = 52.5%**, **0.0 pp**.

Descuento/kg **no** implementado. SQL 017 **no** ejecutado. Matriz, contratos y schema **no** tocados.

NEXT_TASK (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-DAILY-DEVIATION-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-daily-deviation-001` (≠ `main`).
- HEAD de partida: `2758c9b4 Merge branch 'architecture/director-ia-daily-deviation-readiness-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. `AUTHORIZED` → `IN_PROGRESS` solo cambió `status`.
- Transición final: `IN_PROGRESS` → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge, matriz, contratos, frontend, server.js, SQL.

---

## Qué se implementó

### Pack — `lib/director-ia-daily-deviation.js`

Fuente de venta: `arr.ventas_diarias_cliente` (kg, fecha, cliente, canal). Authz igual que M9 (GA/GV `SOURCE_RESTRICTED`).

- **Ayer:** zona `America/Mexico_City`. Hoy no es día cerrado.
- **Día sin filas ≠ 0.** Referencia ausente no inventa ceros.
- **Referencia default:** promedio de los mismos ISODOW en `[target-14, target)`, solo días **con filas**. N explícito. **No** día anterior.
- Contribución cliente y canal reconcilian el delta (`RECONCILE_TOLERANCE_KG = 0.05`).
- DICF + `arr.cliente_comentarios` unidos **solo** por `cliente_key`. No join por nombre.
- `DAILY_DISCOUNT_READINESS` conservado como conocimiento (`SUM(monto)/SUM(kg)`, no average-of-averages, sin canal físico, `implemented: false`). Sin queries a descuento diario.
- Addendum de sistema: GPT razona; no plantilla causal.

### Planner

Intent `daily_sales_deviation` **antes** de `financial_diagnosis` / `delta_sales`. Exige `\bayer\b` + venta/vendimos.

«cómo cambió la venta» (sin ayer) sigue `delta_sales`. «por qué cayó el ingreso» sigue `financial_diagnosis`. Descuento/kg ayer **no** entra a este intent.

### Continuidad

`INHERITABLE_INTENTS` incluye `daily_sales_deviation`. `active_date` efímero en el eco (YYYY-MM-DD). No memoria persistente de periodos. Follow-ups: contra qué / clientes / canal / sabemos por qué / qué falta / quién puede aclararlo. Requery cada turno. History crudo no es hecho.

Pendientes persistentes diarios **no** se crean (`daily_not_persisted`). Memoria persistente vigente de otros intents se conserva.

### Tools / chat

`get_daily_sales_deviation` en registry. Una llamada OpenAI por turno. Rama diaria **antes** de financial. Monthly M9 / financial / plant intactos.

---

## Confirmaciones pedidas

| Requisito | Resultado |
|---|---|
| intent diario `daily_sales_deviation` | Sí. Gana sobre financial_diagnosis y delta_sales mensuales. |
| ayer CDMX | Sí. `America/Mexico_City`; hoy excluido. |
| referencia same-weekday 14 días | Sí. N observaciones; no día anterior. Siempre se declara contra qué se compara. |
| contribución por cliente | Sí. Reconcilia el delta. |
| contribución por canal | Sí. Reconcilia el delta. |
| business evidence | Sí. DICF + comments solo `cliente_key`. |
| information gaps | Sí. Material sin evidencia suficiente; acción/comentario sí-no; responsable solo con vínculo físico a acción. |
| conversación completa (7 turnos) | Sí. Pack + HILO; GPT cada turno; `active_date` se mantiene en el eco. |
| no causalidad | Sí. Contribución ≠ causa. Comentario ≠ prueba. Acción ≠ causa. |
| monthly paths intactos | Sí. M9, financial_diagnosis, plant_diagnosis, continuity, persistent memory. |
| no descuento/kg | Sí. Solo constante de readiness. |
| 52.5% | Sí. 10.5 / 20 = 52.5%. 0.0 pp. |

---

## Tests

```
node --test test/director-ia-daily-deviation.test.js              16/16
node --test test/director-ia-conversational-continuity.test.js    20/20
node --test test/director-ia-persistent-memory.test.js            19/19
node scripts/test-director-ia-capabilities.js                     56/56
node scripts/test-director-ia-planner.js                          49/49
node scripts/test-director-ia-tool-orchestrator.js                27/27
node --test test/director-ia-*.test.js                            777/777
git diff --check                                                  limpio
```

---

## Alcance respetado

- No matriz. No contratos. No schema. No SQL 017.
- No IES. No Reasoning Engine. No descuento/kg.
- No commit. No push. No merge.
- `scripts/test-director-ia-planner.js` no se modificó (fuera de writable); el routing diario queda cubierto en el test focal.

---

## NEXT_TASK (propuesta únicamente)

`DOCS-DIRECTOR-IA-DAILY-DEVIATION-SYNC-001`

No autorizado. No ejecutado. STOP.
