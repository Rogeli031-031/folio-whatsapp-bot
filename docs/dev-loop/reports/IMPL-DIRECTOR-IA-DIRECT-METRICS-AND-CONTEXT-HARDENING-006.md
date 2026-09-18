# IMPL-DIRECTOR-IA-DIRECT-METRICS-AND-CONTEXT-HARDENING-006

## Identidad

| Campo | Valor |
|---|---|
| task_id | IMPL-DIRECTOR-IA-DIRECT-METRICS-AND-CONTEXT-HARDENING-006 |
| outcome | DONE |
| base_sha | 6a22ace37ba9a43270d2a3f8820a48ff3097d88b |
| branch | implementation/director-ia-direct-metrics-context-hardening-006 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Contratos consultados

- `docs/director-ia/` no se modificó (sin G2/G3).
- `origin/main` `6a22ace` como base.
- OPS-VERIFY-DIRECTOR-IA-RUNTIME-SHA-AFTER-005-001: fallos A–F confirmados en runtime 005.

## Contratos modificados

Ninguno.

## Archivos tocados

- `lib/director-ia-direct-metrics-context-hardening-006.js` (nuevo)
- `lib/director-ia-planner.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-client-movement.js`
- `lib/director-ia-executive-backlog.js`
- `lib/director-ia-conversation-state.js`
- `lib/director-ia-commercial-runtime-004.js` (pronombres de herencia)
- `lib/director-ia-predictive-commercial.js` (nunca vacío)
- `test/director-ia-direct-metrics-context-hardening-006.test.js`
- `test/fixtures/director-ia-direct-metrics-context-hardening-006.js`
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-DIRECT-METRICS-AND-CONTEXT-HARDENING-006.md`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)

## Qué se corrigió

1. **COUNT + agosto.** `total de clientes nuevos` ya no cae a `expense_analytics`. Pending: `pending_intent=client_movement`, `pending_family=NUEVOS`, `pending_operation=COUNT`. `agosto` responde `En agosto de 2026 entraron 68 clientes nuevos.`
2. **Result set DEJARON.** Se persisten `result_set_family`, `result_set_period`, `result_set_ids`, `result_set_operation`. `sanitizeActiveEntities` ya no borra `client_movement` por falta de `display`.
3. **Pronombres.** `ellos`, `esos`, `esos clientes`, `los anteriores`, `los que mencionaste`, `los de arriba`, `ese grupo`, `ese conjunto` conservan familia. `por ellos` calcula `SUM(ABS(delta_kg))` sobre ese conjunto.
4. **DEJARON ↛ DISMINUYERON** en follow-up agregado.
5. **CHURN_RISK / EXPECTED_NEXT_PURCHASE** nunca vacíos: `RESULT_WITH_EVIDENCE` \| `INSUFFICIENT_EVIDENCE` \| `CLARIFICATION_REQUIRED`.
6. **Intent `igf_direct_metric`** para DISCOUNT, COMMISSION, HG, CORPORATE_EXPENSE, OPERATING_EXPENSE, TOTAL_EXPENSE, MARGIN, TAX, PROFITABILITY, OPERATING_PROFIT, FINAL_RESULT, SALES.
7. **Comisión** = alias ejecutivo de IGF DESC./DESCUENTO (`com_desc_kg`). No es Comisionista.
8. **Respuesta corta** de una métrica. Sin MATERIALIDAD COMERCIAL, AR, DICF, Bitácora ni diagnóstico completo.
9. **HG vs HG$** documentado en `IGF_HG_FIELD_CONTRACT`: ambos son `hg_kg` (MXN/kg). `hg_pct` es otra columna. No se mezclan.
10. **Actual vs proyectado** distinguido. Si solo hay cifra proyectada, se declara explícitamente.

## HG vs HG$

| Etiqueta | Campo físico | Unidad | Uso |
|---|---|---|---|
| HG / HG$ / HG ($/kg) | `hg_kg` | MXN/kg | «¿Qué HG tenemos?» |
| HG (%) | `hg_pct` | % | Solo si el usuario pide porcentaje |

## Gate

- [x] pending COUNT + agosto funciona
- [x] DEJARON no cambia a DISMINUYERON
- [x] «por ellos» conserva result set
- [x] churn risk nunca vacío
- [x] expected next purchase nunca vacío
- [x] descuento directo funciona
- [x] comisión directa funciona
- [x] comisión != Comisionista
- [x] HG directo funciona
- [x] HG/HG$ documentados y no mezclados
- [x] corporativo directo funciona
- [x] rentabilidad/margen/resultado diferenciados
- [x] respuesta directa es corta
- [x] >=390 utterances (13×30)
- [x] >=180 anti-collisions
- [x] >=80 multi-turn
- [x] suites 006/005/004/003 verdes
- [x] rentabilidad executive routing verde

## Desvíos

Ninguno material. Rentabilidad bare sigue en `igf_status` (respuesta existente). Descuento/HG/comisión/corporativo usan `igf_direct_metric` corto.

## next_task_proposed

No autorizado. No se abre.

## secrets_check

No se guardaron secretos, tokens ni credenciales.

## human_decision_needed

Revisión G1 de este DONE. Merge/PR/deploy no ejecutados.

## Cierre

CURRENT_TASK → DONE_PENDING_REVIEW.

STOP.

NO PR. NO merge. NO deploy. NO siguiente tarea.
