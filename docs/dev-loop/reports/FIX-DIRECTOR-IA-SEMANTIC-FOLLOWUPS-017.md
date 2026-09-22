# FIX-DIRECTOR-IA-SEMANTIC-FOLLOWUPS-017

## Identidad

```yaml
task_id: "FIX-DIRECTOR-IA-SEMANTIC-FOLLOWUPS-017"
outcome: "DONE"
files_touched:
  - "lib/director-ia-expense-analytics.js"
  - "lib/director-ia-executive-context-sales-entity-010.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-client-ranking.js"
  - "test/director-ia-semantic-followups-017.test.js"
  - "test/fixtures/director-ia-semantic-followups-017.js"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-SEMANTIC-FOLLOWUPS-017.md"
  - "docs/dev-loop/CURRENT_TASK.md"
files_not_touched:
  - "docs/director-ia/"
  - "public.folios / schema DB"
  - "fórmula discount $/kg"
  - "fuentes ARR"
  - "plantScopeIds / permisos"
  - "Compras / HG / Flete"
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
| task_id | FIX-DIRECTOR-IA-SEMANTIC-FOLLOWUPS-017 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 0f39d0638cf2a8acd78f2baf665e0fdf1499af0c |
| branch | fix/director-ia-semantic-followups-017 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Auditoría previa

### A. Expense Analytics pierde aliases

`normalizeKeywordConcept("llantas")` y `keywordAliases("llanta")` ya existían en `lib/director-ia-executive-context-sales-entity-010.js`.

Expense Analytics filtraba con `rowMatchesKeyword` → `textMatchesSearch(field, keyword)`.

`textMatchesSearch` exige que el campo **contenga el literal** del usuario. Si el folio dice `llanta` o `neumáticos` y la pregunta dice `llantas`, `h.includes("llantas")` es falso y se responde:

`No encontré folios que coincidan con "llantas"`.

La canonicalización ocurría **después** de filtrar, solo al redactar la respuesta.

### B. Follow-up de ranking

Turno suelto `"que descuentos tenia el mes anterior?"` **no** es `client_discount_ranking` (no hay cue de ranking). Hoy cae a `executive_sales_context` / IGF (`isIgfDiscountQuestion` es verdadero).

Tras `top 10` + `septiembre`, `conversation_state` sí guarda:

- `parent_intent = client_discount_ranking`
- `metric = DISCOUNT`
- `discount_metric = DISCOUNT_PER_KG`
- `limit = 10`
- `ranking_direction = TOP`
- `period = 2026-09`

La dimensión que se perdía era **family**: el chat forzaba `igf_direct_metric` **antes** de evaluar continuidad de ranking. El planner solo heredaba si `detected.intent === "unknown"`.

Además, `"mes anterior"` no se resolvía contra el periodo confirmado: `extractRankingPeriod` heredaba septiembre o usaba el calendario del sistema.

## Fix

Matcher compartido de 010 (`normalizeKeywordConcept` + `keywordAliases` + `rowMatchesKeywordConcept`). Expense Analytics lo usa **antes** de filtrar. Campos: concepto, descripcion, subcategoria, beneficiario. Sin listas duplicadas. Sin fuzzy abierto.

Precedencia: `EXPLICIT CURRENT TURN > INHERITED CONTEXT > GENERIC FALLBACK`.

- Planner: `client_discount_ranking` hereda sobre fallback genérico (`igf_direct_metric` de descuento, `client_profile` de periodo, `unknown`). `venta` explícita bloquea herencia.
- Chat: no fuerza IGF si el padre es ranking y el turno es continuidad, salvo métrica explícita distinta.
- Periodo relativo (`mes anterior` / `previo` / `pasado` / `un mes antes`) = `previousYearMonth(last confirmed period)`. Enero 2026 → diciembre 2025.
- `tarifa`/`sort`: `menor descuento` → BOTTOM. Fórmula `$/kg = ABS(SUM(monto))/SUM(kg)` intacta.

Las 50 paráfrasis viven solo en `test/fixtures/director-ia-semantic-followups-017.js`.

## Tests

- `test/director-ia-semantic-followups-017.test.js` → 8/8 (50/50 paráfrasis + precedencia + año + DATA_NOT_FOUND)
- Expense Analytics core → verde
- Generic keyword expense → verde
- 010 → verde
- 015 → verde
- Conversational continuity → verde
- 008 → verde
- 012 → verde

Suites de ranking físico (`client-rankings-physical-source`, `client-discount-range-and-no-data`, folio-navigation) ya fallaban en `0f39d063` sin este diff (p. ej. `quiénes tienen más descuento` → `igf_direct_metric`). No se reabrieron.

## Cierre

- CURRENT_TASK → `DONE_PENDING_REVIEW`
- Commit + push solo a `fix/director-ia-semantic-followups-017`
- NO PR / NO merge / NO deploy / NO siguiente tarea
