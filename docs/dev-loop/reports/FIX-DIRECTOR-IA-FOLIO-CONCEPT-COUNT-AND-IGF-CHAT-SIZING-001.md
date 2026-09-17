# FIX-DIRECTOR-IA-FOLIO-CONCEPT-COUNT-AND-IGF-CHAT-SIZING-001

```yaml
task_id: "FIX-DIRECTOR-IA-FOLIO-CONCEPT-COUNT-AND-IGF-CHAT-SIZING-001"
outcome: "DONE"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
new_tables: false
new_indexes: false
merge: false
deploy: false
reference_main: "13554948682dd13075a8eecf4848a2ca96177d42"
branch: "fix/director-ia-folio-concept-count-igf-chat-sizing-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "Revisar. Este agente no mergea, no abre PR, no despliega y no abre la siguiente tarea."
```

## 1. Estado final

**DONE_PENDING_REVIEW.**

“¿Cuántos folios fueron de llantas?” (y 29 paráfrasis equivalentes) ya no cae a gasto/atribución exclusiva. Va a Folios COUNT por concepto libre, con periodo explícito o aclaración, wording veraz y continuidad de result-set.

El modal `large` de IGF baja de ~1024×780 a ~900×620 (acotado al viewport). Action Register default no cambia.

## 2. SHA base

`origin/main` = `13554948682dd13075a8eecf4848a2ca96177d42`

## 3. Rama

`fix/director-ia-folio-concept-count-igf-chat-sizing-001`

## 4. Commit

Se registra en el cierre de git (SHA del commit de esta rama).

## 5. Root cause COUNT vs SPEND

Traza de `¿Cuántos folios fueron de llantas de enero a agosto?`:

1. `hasCountCue` (“cuántos folios”) + `hasExclusiveComponentToken` (“llantas”)
2. `isExpenseAnalyticsQuestion` = true
3. Planner elige `expense_analytics` **antes** de `folio_search`
4. `hasFolioMatchFrame` es false (no dice “contienen”)
5. `attributable` = true → métrica `ATTRIBUTABLE_COMPONENT_COST`
6. Respuesta: *“No puedo determinar con exactitud cuánto corresponde exclusivamente a llantas…”*

`¿Cuántos folios contienen la palabra llanta…?` también entraba a Expense, pero con `hasFolioMatchFrame` y métrica COUNT, por eso “funcionaba”.

## 6. Regla semántica

Reusable, sin phrasebook:

- Cues de conteo de folios/apoyos/registros (`cuántos folios`, `número de folios`, `cuenta los folios`, `en cuántos folios`, etc.)
- Más concepto libre
- Precedencia sobre Expense (`isExpenseAnalyticsQuestion` retorna false)
- No aplica a “cuántos folios de Taller hubo…” (COUNT de categoría)
- No aplica si hay colisión de gasto/suma/precio/proveedor/beneficiario

Sin periodo seguro: no historial `ANY`. Pregunta:

`¿De qué mes o rango de meses quieres los folios de <concepto>?`

## 7. 30 paráfrasis / follow-ups / anti-collisions

Cubiertas en `test/director-ia-folio-concept-count.test.js` (solo tests). 30/30 → `folio_search` + `analysis_mode=COUNT`. 15/15 follow-ups heredan concepto y periodo. 9 conceptos libres. Anti-collisions: gastamos=expense, suman≠COUNT, existence/list/unit/proveedores/beneficiarios ≠ COUNT.

## 8. Periodo y result-set

- Explícito: RANGE/SINGLE real (`enero a agosto` → 2026-01..2026-08)
- Heredado/seleccionado: el contrato Folios existente
- Si no hay periodo: `missing_period` + aclaración
- Tras COUNT se persiste `folio_search_spec`. Follow-ups (`¿Cuáles son?`, SUM, latest/oldest, importes, pagados/pendientes, fechas/estatus, detalle) no piden de nuevo concepto/periodo/planta.

## 9. Chat IGF

| | Antes | Ahora |
|---|---|---|
| large width | `min(1024px, 100vw-32px)` | `min(900px, 100vw-48px)` |
| large height | `min(780px, 100vh-32px)` | `min(620px, 100vh-48px)` |
| overlay large | `p-4` | `p-6` |
| default | `max-w-lg` / `max-h-[85vh]` | igual |

1700/1440/1366: 900×620, no fullscreen. 1024: 900×≤620, sin overflow horizontal. Selector/cambiar planta/reset intactos.

## 10. Archivos

- `lib/director-ia-folio-search.js`
- `lib/director-ia-expense-analytics.js`
- `lib/director-ia-conversation-state.js` (follow-up “cuáles están pendientes”)
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatModal.tsx`
- `test/director-ia-folio-concept-count.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-FOLIO-CONCEPT-COUNT-AND-IGF-CHAT-SIZING-001.md`

No se tocó `lib/director-ia-planner.js` ni `acciones/page.tsx`.

## 11. Tests exactos

```
node --test test/director-ia-folio-concept-count.test.js
+ expense-analytics-core, expense-generic-keyword
+ folio-search-truthful, aggregation-followup, morphology, period-range, compositional
+ seh-followup-folio-existence, user-identity-greeting
→ 257 pass / 0 fail

npx tsc --noEmit → 0
npx next build → Compiled successfully
```

## 12. Regresiones / limitaciones

- Expense Taller COUNT, gastamos/exacto llantas, greeting/smalltalk, existence 30/30 y planner freeze (091) OK.
- Suites históricas `locator-boundary` / `post-concept-analytic-tail` ya fallan en `HEAD` de main (p. ej. `liquidaciones` dispara `\bliquid` de paid-status). No se “arreglaron” aquí.
- `tienen-palabra` 051/053 congelan conversation-state y frontend; este task los modifica a propósito.
- Sin token no se valida click live de IGF. Dimensiones large son CSS contractuales.

## 13–16. Confirmaciones

- `schema_changes=false`
- `data_mutation=false`
- `merge=false`
- `deploy=false`

## 17. STOP

Fin de la tarea. Espera revisión humana.

NO PR. NO merge. NO deploy. NO siguiente tarea.
