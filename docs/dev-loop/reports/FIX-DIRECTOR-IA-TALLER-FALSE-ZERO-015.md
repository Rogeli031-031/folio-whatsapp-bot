# FIX-DIRECTOR-IA-TALLER-FALSE-ZERO-015

## Identidad

```yaml
task_id: "FIX-DIRECTOR-IA-TALLER-FALSE-ZERO-015"
outcome: "DONE"
files_touched:
  - "lib/director-ia-expense-analytics.js"
  - "test/director-ia-taller-false-zero-015.test.js"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-TALLER-FALSE-ZERO-015.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "public.folios"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-folio-search.js"
  - "lib/director-ia-igf-reviewable-supports.js"
  - "plantScopeIds / equivalentes"
  - "permisos solo_zp_ad"
  - "mes_cargo"
  - "Compras/HG"
  - "docs/director-ia/"
  - "frontend-dashboard"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| task_id | FIX-DIRECTOR-IA-TALLER-FALSE-ZERO-015 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | f27ca3e219f604f8de55dfed2e0b0c14c03b31b0 |
| branch | fix/director-ia-taller-false-zero-015 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Causa raíz

`extractKeyword` dejaba auxiliares gramaticales (`he`, `cuando`) como keyword. `rowMatchesKeyword` filtraba folios Taller contra esas residuales. `hemos` ya estaba en `KEYWORD_STOP`; `he` / `cuando` no.

Independiente: `eligible_count === 0` ponía `veracity=DATA_NOT_FOUND` pero verbalizaba `se gastaron $0.00`.

## Corrección

Semántica, no phrasebook:

- `KEYWORD_STOP` + `he`, `has`, `cuando`, `habia`, `habiamos` (`ha`, `han`, `hemos` ya existían).
- Comparación con acentos normalizados (`habíamos` → `habiamos`).
- Conceptos reales (`llantas`, `herramientas`, `refacciones`) se conservan.

Veracidad de SUM:

- 0 filas elegibles → `No encontré folios de Taller con esos filtros.` Sin `$0.00`. `DATA_NOT_FOUND`.
- filas + importes conocidos = 0 → `$0.00` permitido.
- filas + todos los importes null → `Encontré folios de Taller, pero no tienen importe registrado.`
- mezcla known/unknown → suma solo conocidos + nota de importes faltantes.

No se tocó query física, planta, permisos ni `mes_cargo`. Continuidad usa la concatenación vigente del chat; no hizo falta editar `director-ia-chat.js`.

## Tests

- `node --test test/director-ia-taller-false-zero-015.test.js` A–K
- `node --test test/director-ia-expense-analytics-core.test.js`
- `node --test test/director-ia-expense-generic-keyword.test.js`
- `node --test test/director-ia-seh-taller-purchase-evidence-008.test.js`
- `node --test test/director-ia-executive-conversational-backlog.test.js` — el lock `hemos` no es concepto pasa. Dos fallos (`plant_metric_comparison` vs `executive_sales_context` en descuento) son ajenos a keyword Taller y ya existen en `origin/main`.

65/65 en el lote Expense/008/015. Frontend no cambió → no `npm run build`.

## Cierre

- CURRENT_TASK → `DONE_PENDING_REVIEW`
- Commit + push solo a `fix/director-ia-taller-false-zero-015`
- NO PR / NO merge / NO deploy / NO siguiente tarea
