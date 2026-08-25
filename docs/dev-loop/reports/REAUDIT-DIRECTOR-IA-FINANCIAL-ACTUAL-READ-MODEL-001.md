# Reauditoría — REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001

```yaml
task_id: "REAUDIT-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS"
mode: "REAUDIT"
implementation: false
code_changed: false
test_changed: false
sql_changed: false
docs_director_ia_changed: false
impl_working_tree_preserved: true
audit_report_preserved: true
fix_working_tree_preserved: true
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Reauditoría. 0.0 pp. La matriz NO cambia."
next_task_proposed: "DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-SYNC-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Executive verdict

**PASS.**

Los cinco hallazgos cerrados por `FIX-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-001` **no se reproducen**. La cadena física

`FINAL` exacto → loader RAW → empresa/planta autorizada → `financial.actual.fields` → `formatMonthCloseContext` → contexto GPT

conserva `ACTUAL_FINANCIAL` / `FINANCE_PROVIDED` / `FINANZAS` / `FINAL` y la provenance de versión. No hay mezcla con `TARGET_COMMITMENT`, `FORECAST`, `ACTUAL_COMMERCIAL` ni `RUNTIME_COMPUTED`.

No aparece defecto material nuevo (leak AUTHZ, forecast/target-as-actual, SUPERSEDED-as-actual, overwrite de reconciliación, periodo histórico incorrecto, o `RUNTIME_COMPUTED` etiquetado `FINANCE_PROVIDED`).

Residuales preexistentes (matcher por inclusión, GG `SELECT *` luego filtra, “cómo vamos financieramente” → `unknown`) no reabren el FIX.

## 2. Scope

Sujeto: working tree IMPL + AUDIT + FIX, sin commit. Rama `implementation/director-ia-financial-actual-read-model-001` ≠ `main`. HEAD `4651e302`.

Consulta read-only: G3 v1.0, ARCH B, IMPL, AUDIT, FIX, DECISION AUTHZ. Los reportes **no** se tomaron como prueba.

Inspección física independiente:

- `lib/director-ia-financial-actual.js` (loader, authz antes de SQL)
- `lib/director-ia-month-close-result.js` (`composeFinancialActual`, `formatFinancialActualContext`, `formatMonthCloseContext`, `buildMonthClosePrompt`, `isMonthCloseQuestion`, `resolveCloseMonth`)
- `lib/director-ia-capabilities.js` (`isMonthCloseQuery`)
- `lib/director-ia-planner.js` (sin intent `financial_actual`)
- `lib/director-ia-conversation-state.js` / `lib/director-ia-chat.js` (state + inherit)
- `lib/director-ia-pre-meeting.js`, `lib/director-ia-ies-builder.js`
- `lib/director-ia-igf-arr.js` (`findIgfRowForPlant`)
- `test/director-ia-financial-actual.test.js`

Probes in-process (sin editar tests) + reejecución:

| Suite | Resultado |
|-------|-----------|
| Focal `financial-actual` + `month-close-result` | **50 pass / 0 fail** |
| Director IA + `igf-financial-final` | **1056 pass / 0 fail / 0 skipped** |

Escritura de esta tarea: solo `CURRENT_TASK.md` y este reporte. No restore. No reset. No clean.

## 3. Critical chain proof

Intento independiente (mock SQL del loader + `assembleMonthClosePack` + `buildMonthClosePrompt`), sentinels:

| Paso | Evidencia física |
|------|------------------|
| FINAL físico | `financial_state === "FINAL"` en JS tras `SELECT` GLOBAL `year/month`; sin `LIMIT 1`, sin `MAX`, sin `is_current` |
| loader RAW | `venta_ton=987.654`, `util_oper_importe=123456.78`, `resultado_final_importe=-45678.9`, `impuesto_kg=null`; `presupuesto_kg` ausente |
| empresa autorizada | fila `empresa=Puebla` vía `findIgfRowForPlant`; authz ZP **antes** de `client.query` |
| `financial.actual.fields` | pack conserva `987.654` |
| `formatMonthCloseContext` | serializa `fields.* origin=FINANCE_PROVIDED` |
| contexto GPT | `userContent` de `buildMonthClosePrompt` contiene los sentinels |

Clases en cada paso: `truth_class=ACTUAL_FINANCIAL`, `field_origin=FINANCE_PROVIDED`, `source_owner=FINANZAS`, `financial_state=FINAL`.

## 4. GPT context projection proof

Hallazgo 1 (MAJOR original) **no reproducible**.

`formatFinancialActualContext` (SUPPORTED + `ACTUAL_FINANCIAL`) proyecta:

- 17 stored; `null` se escribe `null` (`impuesto_kg=null`)
- `year`, `month`, `version_id`, `version_number`, `finalized_at`, `finalized_by`, `empresa`, `plant`
- `created_at` solo con `role=upload_timestamp`
- sin `presupuesto_kg` / `folios_carro_kg`

Probe: sentinels `[987.654, 7.321, 123456.78, -45678.9]` todos presentes en el prompt. Labels `ACTUAL_FINANCIAL` / `FINANCE_PROVIDED` / `FINANZAS` / `FINAL` presentes. Provenance completa presente.

El pack ya tenía fields (IMPL). El canal GPT ahora los transporta (FIX). El MAJOR queda cerrado.

## 5. Truth-class separation

Hallazgo 2 **no reproducible**.

Valores distintos simultáneos en el mismo contexto:

| Objeto | Valor | Clase |
|--------|-------|-------|
| `financial.actual.fields.venta_ton` | `987.654` | `ACTUAL_FINANCIAL` / `FINANCE_PROVIDED` |
| `financial.target.venta_ton` | `555.111` | `TARGET_COMMITMENT` |
| `financial.forecast.venta_ton` | `333.222` | `FORECAST` |

ARR `sales.actual_ton` queda `ACTUAL_COMMERCIAL`. Compose no copia forecast/target a actual. Test focal A/B/C + probe de sentinels.

## 6. Reconciliation proof

Hallazgo 3 **no reproducible**.

Caso Finance `987.654` vs ARR `10` (kg 10000 / 1000):

- código `FINANCIAL_ACTUAL_RECONCILIATION_GAP`
- `finance_venta_ton=987.654 class=ACTUAL_FINANCIAL`
- `arr_venta_ton=10 class=ACTUAL_COMMERCIAL`
- instrucción “No elijas un ganador”
- `overwrite: false`

No promedia. No elige. No oculta. No convierte uno en el otro. Test 7.2 vs 10 también PASS.

## 7. Routing proof

Hallazgo 4 **no reproducible**. Probe independiente (no solo tests):

| Pregunta | Intent | `isMonthCloseQuestion` |
|----------|--------|------------------------|
| “Cuál fue la utilidad real de julio?” | `month_close_result` | true |
| “Cuál fue la utilidad operativa real de julio?” | `month_close_result` | true |
| “Cuál fue el resultado final real de julio?” | `month_close_result` | true |
| “Cómo cerramos financieramente julio?” | `month_close_result` | true |
| “cómo va IGF” | `igf_status` | false |
| “Cómo vamos este mes?” | `unknown` | false |
| “Cómo vamos financieramente?” | `unknown` | false |

Sin intent `financial_actual` en planner. Cues: `util(idad)` + `real(mente\|es)?`, no frase literal de usuario. El test de phrasebook de product copy sigue PASS.

## 8. SUPERSEDED/FINAL proof

Hallazgo 5 **no reproducible**.

Mismo YYYY-MM: v5 `SUPERSEDED` (venta 1) + v6 `FINAL` (venta 22.5). Loader:

- `version_id=6`, `version_number=6`, `financial_state=FINAL`, `fields.venta_ton=22.5`
- SUPERSEDED solo (sin FINAL) → `FINANCIAL_ACTUAL_NOT_FINAL`, `fields=null`

Filtro físico: `String(row.financial_state) === "FINAL"`. Nunca retorna SUPERSEDED como actual.

## 9. Cross-plant proof

Hallazgo 6 **no reproducible**.

Una FINAL GLOBAL con Puebla (`venta_ton=11`) y Querétaro (`44`):

| Solicitud | Resultado |
|-----------|-----------|
| Puebla / ZP | solo Puebla `11` |
| Querétaro / ZP | solo Querétaro `44` |
| GG assigned Puebla | allow `11` |
| GG assigned Puebla pidiendo Querétaro | `FINANCIAL_ACTUAL_UNAUTHORIZED` (0 SQL) |
| planta inexistente | `LINE_NOT_FOUND_FOR_PLANT`, `fields=null` |

ZP/AD: ALL_PLANTS según request. No fallback a primera empresa. TOTALES las salta el matcher.

## 10. Historical YYYY-MM proof

Hallazgo 7 **no reproducible**.

Entry point `loadMonthCloseResultForChat` con `now=2026-08-25` y pregunta “utilidad real de julio”:

- `resolveCloseMonth` → `{ year: 2026, month: 7, source: "explicit" }`
- loader invocado `2026-7` (no agosto)
- pack `month=2026-07`; contexto `financial.actual.month=7` y `util_oper_importe=70707`
- sin `upload_day`; sin mes UI

`parseCloseMonth` usa el nombre de mes, no `cdmxTodayParts` para el número.

## 11. Failure semantics

| Caso | Código | Fields en GPT | Distinción |
|------|--------|---------------|------------|
| A versions, ninguna FINAL | `FINANCIAL_ACTUAL_NOT_FINAL` | no | ≠ FORECAST (forecast sigue etiquetado FORECAST) |
| B 0 versions | `FINANCIAL_ACTUAL_MISSING_FOR_PERIOD` | no | ≠ 0 |
| C >1 FINAL | `FINANCIAL_ACTUAL_VERSION_AMBIGUOUS` | no | fail closed; no `LIMIT 1` |
| D unauthorized | `FINANCIAL_ACTUAL_UNAUTHORIZED` | no | ≠ MISSING; SQL no corre |
| E source failure | `FINANCIAL_ACTUAL_SOURCE_UNAVAILABLE` | no | catch del loader |

Probe de contexto: UNAUTHORIZED / AMBIGUOUS emiten status + instrucción, **sin** `fields.*`.

## 12. Authz regression

DECISION: ZP+AD ALL_PLANTS; GG ASSIGNED; resto DENY.

`canViewFinancialActual` corre en L99; SQL en L110. Test GG/GV deny: `queries=0`.

| Actor | Resultado |
|-------|-----------|
| ZP + aliases (`DIR_ZP`, `DIRZP`, `DZP`, `DIR-ZP`, `DIRECTORZP`, `DIRECTOR_ZP`, nombre “Director ZP”) | ALL_PLANTS |
| AD (ignora `plantas_permitidas`) | ALL_PLANTS |
| GG + assigned | allow |
| GG otra / lista vacía | DENY |
| GA, GV, CF_CDMX, CDMX, GO, SG, SEH, ZC, `""`, null | DENY |

Authz backend. No permiso por prompt/state.

## 13. Open-month behavior

Mes abierto + FORECAST + sin FINAL:

- “cómo va IGF” / “cómo proyectamos cerrar el IGF…” → `igf_status` (forecast/current)
- “cómo vamos este mes” → no `month_close_result`
- Si wording sí entra a month_close y no hay FINAL: `financial.actual=NOT_FINAL`, **sin** fields de falso actual; forecast permanece FORECAST

No se inventa actual. No forecast-as-actual.

## 14. Conversation-state / followups

`conversationStateForIntent` / `buildConversationState` persisten solo:

`parent_intent`, `planta_id`, `active_entities`, `last_evidence_bundle_type`, `pending_information_gap` (nombres de hueco, no P&L), `active_period_months`, `meeting_type`, `previous_frame`.

`work_item_memory.month_close_not_persisted: true`. Evidence: requery.

Probe follow-up desde cierre julio (`active_period_months=["2026-07"]`):

| Pregunta | Inherit | Mes (con `reuse_inherited_month`) |
|----------|---------|-----------------------------------|
| “Contra la meta?” | `month_close_result` | julio (incluso `now` septiembre) |
| “Y el forecast?” | `month_close_result` vía unknown + `forceIntent` | mismo YYYY-MM; forecast latest etiquetado FORECAST |
| “Por qué?” | `kind=why` hereda | requery; addendum: mover ≠ causa |

Sin `reuse_inherited_month` y sin mes explícito, `resolveCloseMonth` cae a último COMPLETE (septiembre → agosto). El chat **sí** setea `reuse_inherited_month` cuando el parent es `month_close_result`. No es persistencia de fields.

## 15. Pre_meeting / IES boundary

- `lib/director-ia-pre-meeting.js`: cero `loadFinancialActual` / `ACTUAL_FINANCIAL`. Solo usa `isMonthCloseQuestion` como exclusión.
- `lib/director-ia-ies-builder.js`: cero referencias.
- Planner: cero intent `financial_actual`.
- Tests IES / pre_meeting: sin consumo del loader.

FIX no integró accidentalmente IES ni pre_meeting.

## 16. Test coverage matrix

| INVARIANT | TEST EXISTS | PASS | EVIDENCE | GAP |
|-----------|-------------|------|----------|-----|
| sentinel actual values in GPT context | sí | sí | formatMonthCloseContext + probe prompt | |
| provenance in GPT context | sí | sí | year/month/version_id/number/finalized_*/empresa/plant | |
| null preserved | sí | sí | `impuesto_kg=null` | |
| actual/target/forecast distinct | sí | sí | 987.654 / 555.111 / 333.222 | |
| reconciliation both values preserved | sí | sí | 7.2 vs 10; probe 987.654 vs 10 | |
| “utilidad real” routing | sí | sí | probe + test | |
| IGF routing regression | sí | sí | `cómo va IGF` → `igf_status` | |
| SUPERSEDED ignored | sí | sí | par v5/v6 + SUPERSEDED-only | |
| cross-plant isolation | sí | sí | Puebla vs Querétaro | |
| GG assigned allow | sí | sí | planta 1 | |
| GG other plant deny | sí | sí | queries=0 | |
| historical July E2E | sí | sí | `loadMonthCloseResultForChat` now agosto | |
| NOT_FINAL context | sí | sí | sin `fields.*`; forecast intacto | |
| MISSING context | sí | sí | sin `fields.*`; ≠ 0 | |
| AMBIGUOUS | sí (loader) | sí | contexto: probe, no test focal | MINOR test |
| unauthorized | sí (loader) | sí | contexto: probe, no test focal | MINOR test |
| source unavailable | sí | sí | | |
| raw-vs-computed boundary | sí | sí | 17 fields; no GET/presupuesto/folios | |
| no pre_meeting | source + grep | sí | | |
| no IES | source + grep | sí | | |
| “y el forecast” follow-up | no test focal | — | probe inherit + forceIntent | MINOR test |

## 17. New findings

Ningún hallazgo material nuevo.

**OBSERVATION** (preexistentes, no bloquean):

1. `findIgfRowForPlant` por inclusión (ARCH lo autorizó). Tests usan `plant_code: "Querétaro"`; `QRO` no matchea “Querétaro”.
2. GG autorizado hace `SELECT *` de líneas GLOBAL y filtra en JS. No es leak de respuesta.
3. “cómo vamos financieramente” → `unknown` (no afirma actual).
4. Hueco de test: contexto GPT de AMBIGUOUS/UNAUTHORIZED (código verificado por probe).
5. Hueco de test: follow-up “y el forecast” (código verificado por probe).

Ninguno es CRITICAL/MAJOR.

## 18. Blocking vs non-blocking

**No bloquea** sync documental. Los 5 hallazgos de AUDIT están cerrados y no son reproducibles.

No FIX adicional. No DECISION.

## 19. Final verdict

**PASS.**

Baseline: **10.5 / 20 = 52.5%**. Delta: **0.0 pp**.

## 20. NEXT_TASK

`DOCS-DIRECTOR-IA-FINANCIAL-ACTUAL-READ-MODEL-SYNC-001`

No autorizada. No ejecutada.

STOP.
