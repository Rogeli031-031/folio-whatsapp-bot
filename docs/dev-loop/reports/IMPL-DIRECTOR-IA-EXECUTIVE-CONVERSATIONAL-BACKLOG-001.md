# IMPL-DIRECTOR-IA-EXECUTIVE-CONVERSATIONAL-BACKLOG-001

```yaml
task_id: "IMPL-DIRECTOR-IA-EXECUTIVE-CONVERSATIONAL-BACKLOG-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
schema_changes: false
data_mutation: false
merge: false
deploy: false
base_main_sha: "567e68e05e4e7d7b5fec8ecd1384bf00bff4a9c7"
branch: "implementation/director-ia-executive-conversational-backlog-001"
g1_human: "AUTHORIZED_BY_HUMAN intacto (authorized_by=HUMAN, authorized_at=2026-09-16)"
secrets_check: "none"
contracts_modified: []
```

## SHA / rama

- `reference_main` / `origin/main`: `567e68e05e4e7d7b5fec8ecd1384bf00bff4a9c7`
- Rama: `implementation/director-ia-executive-conversational-backlog-001`
- No PR. No merge. No deploy.

## Arquitectura implementada

Composición semántica (no phrasebook): `DOMAIN / OPERATION / PLANT / PERIOD / CHANNEL / CATEGORY / CONCEPT / ENTITY / METRIC / RESULT_SET / ORDINAL / FILTERS`.

Módulo compartido nuevo: `lib/director-ia-executive-backlog.js` (normalizadores, extractores, `refineFrame`, `selectOrdinal`). Las 30+ paráfrasis viven solo en tests.

Routing: detectores semánticos en planner, precedencia explícita (descuento agregado antes de ranking de venta; ranking histórico antes de plan de acción; COUNT de folios antes de Expense).

Continuidad: `folio_search_spec` + `active_entities` (`client_ranking.ranked_names`, `entity_set`, `folio_result_set`). Un follow-up reemplaza una dimensión y conserva las compatibles.

## Conversation state — antes / después

Antes (main): `folio_search_spec` era el único result-set rico. `client_ranking` persistía un solo display y perdía `ranked_names`. No había `entity_set` ni orden mostrado de folios. No había intents A/D/G/H/I/J/K.

Después:

- `INHERITABLE_INTENTS` incluye las familias nuevas.
- `client_ranking` conserva `metric` (VENTA_TON|DISCOUNT) y `ranked_names[0..20]`.
- `entity_set` y `folio_result_set` (orden concreto mostrado).
- Follow-up de entity-set no salta a universo global DISMINUYERON.
- Follow-up de folios hereda concepto/planta; ordinal abre el ítem del orden mostrado.

## Result-set contract

- Folios: heredar `concept`, `plant`, `scope`; un filtro nuevo reemplaza solo su dimensión (periodo, estatus, categoría, operación).
- Comercial: si el turno anterior fijó entidades (p. ej. PUBLICO EN GENERAL + GRUPO MOVE), `¿cuánto disminuyeron?` se calcula/refleja sobre ese conjunto.
- Ordinal: `primero/segundo/N/último/penúltimo/F-######-###` usa el orden persistido, no un ranking reconstruido.

## Routing precedence (anti-colisión)

| Pregunta | Intent |
|---|---|
| cuántos folios de llantas | folio_search COUNT |
| cuánto gastamos en llantas | expense_analytics / PROCUREMENT |
| cuánto gastamos en Taller | CATEGORY SUM |
| cuánto gastamos por autotanque de Taller | expense_analytics taller_autotanque_group |
| qué proveedores venden llantas | expense_analytics SUPPLIERS |
| cuánto cuesta cada llanta | UNIT_COST (sin inventar) |
| top 5 descuento | client_discount_ranking |
| descuento agosto vs septiembre | plant_metric_comparison |
| mes más rentable | profitability_period_ranking |
| cómo mejoro rentabilidad | profitability_action_plan |
| abre la venta diaria | open_daily_sales_view (no daily_sales_deviation) |

## Plantas / periodo

- Planta explícita gana sobre heredada/seleccionada. Token de planta nunca es concepto (`Puebla` ≠ concept).
- Periodo: explícito → conversacional compatible → corte/upload seguro → aclaración. Nunca ALL TIME silencioso en LIST/COUNT.
- EXISTENCE ANY se conserva (`¿existe algún folio de llantas?`).
- LIST/COUNT sin periodo: `¿De qué mes o rango de meses quieres los folios de {concepto}?`

## Familias — root cause y estado

| FAMILY | Previo | Root cause | Implementation | DIRECT | FOLLOWUPS | COLLISIONS | RESULT |
|---|---|---|---|---|---|---|---|
| A CLIENT_DISCOUNT_RANKING | C | unknown; no métrica DISCOUNT agregada | detector + `loadClientRankingForChat` por `arr.descuentos_diarios_cliente`; no pide cliente | 30/30 | 10 | 10 | PASS |
| B CLIENT_MOVEMENT | B | listas DICF sin dos periodos explícitos; INACTIVO no contractual | familia única AUMENTARON/DISMINUYERON/DEJARON/NUEVOS/INACTIVOS; `require_two_periods`; `inactive_supported=false`; routing comercial existente | 30/30 | 10 | n/a | PASS |
| C RANKING + ENTITY-SET | D | `ranked_names` se perdían; follow-up iba a DISMINUYERON global | persistir set; forceIntent; respuesta acotada a esas entidades | 30+15 | 15 | 10 | PASS |
| D CLIENT_CONTACT_LOOKUP | C/B | no había lookup de chat; dashboard sí | `searchClienteContactosByPlant` fail-closed, sin cross-plant, sin inventar | 30/30 | 10 | n/a | PASS |
| E SEH LIST | B | COUNT sí, LIST solo en “cuáles son” | `METRICS.LIST` + listado agrupado por ubicación | 30/30 | (SEH existentes) | COUNT vs LIST | PASS |
| F FOLIO_FINANCIAL_BY_PLANT | C | Puebla caía a concept; depositado≠campo | planta extraída; `depositado_physical=false`; no mapear a PAGADO | 30/30 | n/a | 10 | PASS |
| G PROFITABILITY_PERIOD_RANKING | C | respondía forecast vigente | intent propio; `prefer_closed` / `exclude_forecast_as_winner` | 30/30 | 10 | vs action plan | PASS |
| H PERIOD_COMPARISON | C | no resolvía “ese mes” | intent + detector con periodo previo; no causalidad inventada | 30+15 | 15 | n/a | PASS |
| I PLANT vs CLIENT disc/margen | C | exigía cliente en agregado | PLANT_* sin cliente; cliente/GRUPO MOVE excluido | 30+30 | 10 | vs CLIENT | PASS |
| J ACTION_PLAN | C | repetía mini IGF | intent ejecutivo HECHO/DESVIACION/OPORTUNIDAD/ESCENARIO/ACCION/HUECO | 30/30 | n/a | vs ranking | PASS |
| K OPEN_DAILY_SALES_VIEW | C | unknown | `ui_action` estructurada; `do_not_pretend_opened` | 30/30 | n/a | vs query/análisis | PASS |
| L FOLIO_PERIOD_CLARIFICATION | A/B | LIST decía otro wording | mismo ask de mes; EXISTENCE ANY intacto | 30/30 | n/a | vs ANY | PASS |
| M RESULT_REFINEMENT | D | `\bliquid` comía liquidaciones; follow-up no heredaba | paid ≠ liquidaciones; inherit concept | 30/30 | 10 | vs paid global | PASS |
| N FOLIO_RESULT_NAVIGATION | C | ordinal → unknown | `folio_result_set` + `OPEN_FOLIO` | 30/30 | 10 | vs unknown | PASS |
| O CATEGORY_SUM | B | “hemos” como concepto | stopwords funcionales; category=Taller concept=null | 30/30 | n/a | vs concept real | PASS |
| P TALLER BY AUTOTANQUE | C | concept=autotanque | `group_by=AUTOTANQUE`; identidad textual `public.folios.unidad` AT/PT | 30/30 | n/a | vs concept | PASS |
| Q PROCUREMENT | A/D | ya en Expense; huecos de routing | no duplicar; completar detectores SUPPLIERS/BENEFICIARIES/UNIT_COST | 30+30+30 | n/a | vs COUNT | PASS |
| FOLIO COUNT (existente) | A | — | no reabierto; 30/30 verde | 30/30 | 15 | vs Expense | PASS |

## Archivos modificados

- `lib/director-ia-executive-backlog.js` (nuevo)
- `lib/director-ia-planner.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-conversation-state.js`
- `lib/director-ia-client-ranking.js`
- `lib/director-ia-folio-search.js`
- `lib/director-ia-expense-analytics.js`
- `lib/director-ia-seh-operation-status.js`
- `lib/cliente-contacto.js`
- `test/director-ia-executive-conversational-backlog.test.js` (nuevo)
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-CONVERSATIONAL-BACKLOG-001.md`

No tocados: `docs/director-ia/`, `sql/`, schema, frontend, deploy.

## Tests ejecutados

```
node --test test/director-ia-executive-conversational-backlog.test.js
→ 15/15 pass

node --test test/director-ia-folio-concept-count.test.js
             test/director-ia-user-identity-greeting.test.js
             test/director-ia-seh-operation-status.test.js
             test/director-ia-expense-analytics-core.test.js
             test/director-ia-folio-search-truthful.test.js
             test/director-ia-new-clients-purchase-discount.test.js
→ 130/130 pass
```

Utterances explícitas en fixtures: ≥555 (A–Q + C follow + I dual + Q triple). No se generan en runtime.

## Regresiones

Verdes: greeting identity, EXECUTIVE_STATUS, DIAGNOSIS, Expense Analytics, Folio existence/count/result-set/truthful, SEH COUNT/STATUS/follow-up, new clients, COUNT-by-concept 30/30.

## Limitaciones físicas / fail-closed

- **depositado**: no hay campo físico de depósito en Folios. No se traduce a PAGADO.
- **INACTIVOS**: `inactive_supported=false` si la fuente no define ventana contractual.
- **Autotanque**: extracción textual de `unidad` (AT/PT), no columna estructurada de identidad.
- **unit cost**: `invent_unit_cost=false`; no se divide importe de folio mixto.
- **contacto**: solo `arr.cliente_contactos` de la planta autorizada; 0 filas = no inventar; >1 = aclarar.
- **mejor mes**: no declara ganador el forecast abierto; si faltan meses FINAL, se declara.
- **OPEN_DAILY_SALES_VIEW / OPEN_FOLIO**: acción estructurada; no se finge que la UI abrió.
- **acción plan**: no crea DICF/AR; solo detecta hueco si hay evidencia.
- **comentarios**: declaraciones, no causa demostrada.

## Diff conceptual

Helpers compartidos + intents tipados + continuidad de result-set/entity-set/ordinal. Sin phrasebook de producción. Sin schema/data mutation.

`schema_changes=false`  
`data_mutation=false`  
`merge=false`  
`deploy=false`
