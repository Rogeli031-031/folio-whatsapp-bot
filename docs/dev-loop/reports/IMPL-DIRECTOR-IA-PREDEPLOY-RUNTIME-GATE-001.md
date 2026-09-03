# IMPL-DIRECTOR-IA-PREDEPLOY-RUNTIME-GATE-001

```yaml
task_id: "IMPL-DIRECTOR-IA-PREDEPLOY-RUNTIME-GATE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "TEST_INFRASTRUCTURE_ONLY"
implementation: true
runtime_product_changed: false
planner_changed: false
chat_changed: false
conversation_state_changed: false
docs_director_ia_changed: false
live_db: false
tier1_pass: 8
tier1_fail: 0
runtime_pass: 0
runtime_fail: 4
harness_fail: 0
http_5xx_official_turns: 0
http_500_erick_with_available_igf: "NOT_REPRODUCED"
http_500_erick_empty_final: "REPRODUCED (handlePostChat ok:false → 500)"
predeploy_gate: "FAIL"
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana del gate. PRE-DEPLOY GATE=FAIL es el éxito de esta infra. No autoriza FIX de producto ni deploy."
```

## A. Inventario de entrada chat / stubs

Reutilizado, no inventado:

| Pieza | Origen físico |
| --- | --- |
| Entrada | `handlePostChat` → `askDirectorIa` (`lib/director-ia-chat.js`, exportado) |
| HTTP | la fórmula real `result.status \|\| (result.ok ? 200 : 500)` |
| Loader HM | `loadHistoricalMarginForChat` **real** (no se reemplazó) |
| Plant/IGF | mismos `resolvePlanta` + `queryVersions/Latest/Lines` que `test/director-ia-historical-margin.test.js` (`makeSource` / `closedFinal`) |
| Pool | `{ connect → query: rows [] }` — no LIVE_DB |
| `openaiChat` | transport stub `STUB_OPENAI_TRANSPORT` para no llamar OpenAI; **nunca** es criterio de PASS |
| Env | `ENABLE_DIRECTOR_IA=true`, `AI_ENABLED=true` (paridad de rama de chat) |

No se hardcodeó FAIL. No se inyectó un loader que tire a propósito.

## B. Diseño Capa B

Fronteras: `HTTP_STATUS` → `INTENT_ROUTE` → `EVIDENCE_BUNDLE` → `METRIC_PACK` → `USER_VISIBLE_OUTCOME`.

Asserts estructurales: HTTP/throw, `context_meta.mode`, `parent_intent`, `last_evidence_bundle_type`, pack (margen / descuento / plant_diagnosis / clarificación), texto genérico de intención. No match de prosa GPT.

TIER 1 (`CASES`, 8) no se mezcló con `RUNTIME_CASES`. Expectations TIER 1 intactas.

## C. TIER 1 BEFORE / AFTER

`npm run test:director-ia:golden`

BEFORE (solo Capa A): 8 PASS / 0 FAIL / HARNESS 0.

AFTER (mismo TIER 1 + Capa B): TIER 1 **8/8 PASS**. Mismos veredictos.

## D. RUNTIME por caso (observado, no fabricado)

Comando único: `npm run test:director-ia:golden` o `npm run test:director-ia:predeploy`.

```text
PRE-DEPLOY DIRECTOR IA
TIER 1
8/8 PASS
RUNTIME
R-RUNTIME-001  Historical margin ERICK  FAIL  FIRST_BAD_BOUNDARY=METRIC_PACK
R-RUNTIME-002  Margin → discount  FAIL  FIRST_BAD_BOUNDARY=METRIC_PACK
R-RUNTIME-003  Plant/executive → discount  FAIL  FIRST_BAD_BOUNDARY=METRIC_PACK
R-RUNTIME-004  First-turn discount  FAIL  FIRST_BAD_BOUNDARY=METRIC_PACK
HTTP 5xx ...................................... 0
PRE-DEPLOY GATE = FAIL
```

GATE `--gate`: exit 1.

| Caso | Ruta ejecutada | HTTP oficial | Pack | FIRST_BAD_BOUNDARY | Evidencia de que no es mock-FAIL |
| --- | --- | --- | --- | --- | --- |
| R-RUNTIME-001 | handlePostChat → askDirectorIa → intent `historical_margin` → `loadHistoricalMarginForChat` real | 200 | historical_margin `compare_months` planta | METRIC_PACK | Respuesta real: `Enero 2026: 7.10 $/kg` / `Agosto 2026: 8.20 $/kg`. Ignora ERICK. No es rango. |
| R-RUNTIME-002 | parent HM 200; segundo turno inherit+unknown salta clarificación; cae a contexto genérico AR | 403 | unknown | METRIC_PACK | Error real de `askDirectorIa`: `Sin acceso a esta planta`. No es pack de descuento. |
| R-RUNTIME-003 | `como vamos?` → CEL/`plant_diagnosis`; `descuento de agosto?` **sigue** `plant_diagnosis` | 200 | plant_diagnosis | METRIC_PACK | `context_meta.mode=plant_diagnosis` en ambos turnos. El stub de OpenAI no decide el pack. |
| R-RUNTIME-004 | unknown sin inherit → `buildUnknownClarificationResult` | 200 | clarification | METRIC_PACK | Texto real del planner: `No se pudo determinar una intención clara con las reglas actuales`. |

### R-RUNTIME-001 y el HTTP 500

Con IGF FINAL disponible (fixture honesto, mismo shape que los tests HM):

* `http_500_with_available_igf: **NOT_REPRODUCED**`
* HTTP 200, compare de planta.

Con la **misma** pregunta y el **mismo** loader, sin filas FINAL:

* `http_500_empty_igf: http=500 veracity=DATA_NOT_FOUND operation=compare_months`
* El body es fail-closed (“sin margen FINAL defendible”).
* `handlePostChat` convierte `ok:false` sin `status` en HTTP 500.

Eso es un 500 **natural** del mapeo HTTP, no un throw fabricado. No es paridad demostrada con el 500 de producción **si** producción tenía FINAL y aun así 500.

Frontera que falta para paridad del 500 de Render: el pool/SQL real de `igf.versions` / `igf.compromiso_lines` (LIVE_DB, fuera de alcance). El harness no declara el gate confiable como cinturón de ese 500 de producción.

El caso oficial sigue FAIL por métrica (planta `compare_months`, sin ERICK), que TIER 1 no ve.

## E. Limitaciones vs producción

* No LIVE_DB. IGF es fixture de cierre FINAL, no el store de Render.
* R-RUNTIME-002 no llega a componer GPT con Action Register real: se corta en auth de planta (403). En producción, con auth+AR, el fallthrough podría ser otra prosa; el defecto observable aquí es: **no hay ruta de descuento**.
* `openaiChat` evita OpenAI live. PASS/FAIL no usa ese texto.
* `now` fijo 2026-09-01.
* El 500 de ERICK con datos FINAL **no** se reprodujo in-process.

PRE-DEPLOY GATE = FAIL es correcto para detener deploy por R2/R3/R4 y por el contrato de margen-cliente. **No** afirma “reprodujimos el 500 de Render con datos FINAL”.

## F. Archivos

Tocados:

* `test/fixtures/director-ia-golden-cases.js` (`RUNTIME_CASES`; `CASES` TIER 1 sin cambios de expectation)
* `test/helpers/director-ia-runtime-golden-harness.js` (nuevo)
* `test/director-ia-golden-regression.test.js`
* `scripts/director-ia-golden-regression.js`
* `package.json` (alias `test:director-ia:predeploy`)
* `docs/dev-loop/CURRENT_TASK.md` (solo `status`)
* `docs/dev-loop/reports/IMPL-DIRECTOR-IA-PREDEPLOY-RUNTIME-GATE-001.md`

No tocados: `lib/**`, `server.js`, `docs/director-ia/`, conversation-state, planner, tools, historical-margin product.

`git diff lib server.js`: vacío.

## G. Suites

```text
node --test test/director-ia-golden-regression.test.js
```

4/4 pass.

## H. Git

* base: `3722dbcd` (`origin/main`, merge del metric-switch)
* branch: `implementation/director-ia-predeploy-runtime-gate-001` (≠ `main`)
* commit SHA: se anota tras el commit de implementación
* no push a `main`
* no merge
* no deploy
* no FIX de producto
* no siguiente tarea
