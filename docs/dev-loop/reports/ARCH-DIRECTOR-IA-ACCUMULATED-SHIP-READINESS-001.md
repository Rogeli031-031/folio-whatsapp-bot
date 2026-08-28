# ARCH-DIRECTOR-IA-ACCUMULATED-SHIP-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-ACCUMULATED-SHIP-READINESS-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "READY_FOR_PACKAGE_PLAN"
mode: "ARCHITECTURE / SHIP READINESS"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
sql_executed: false
docs_director_ia_changes: false
commit: false
push: false
merge: false
deploy: false
local_head: "1ebd81a9bae045d1ee7d4936449b19adc4be47b3"
origin_main: "1ebd81a9bae045d1ee7d4936449b19adc4be47b3"
ahead: 0
behind: 0
modified: 14
untracked: 30
inventory_complete: true
cel_ship_dependency: "PRE_CLOSE_SHARED_COMPOSER"
isolated_cel_ship: false
orphan_count: 0
unknown_owner_count: 0
unreviewed_material_count: 0
blocking_ship_count: 0
manual_chat_validation: "PENDING"
production_manual_validation: "NOT_YET_TESTABLE"
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
next_task_proposed: "PACKAGE-DIRECTOR-IA-ACCUMULATED-SHIP-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Executive verdict

**READY_FOR_PACKAGE_PLAN.**

El working tree acumulado puede formar **una unidad de ship coherente** (paquete PRE_CLOSE + CEL + Steering infra + docs/evidencia). No hay UNKNOWN_OWNER material, ni runtime UNREVIEWED, ni capability huérfana, ni SQL ingobernable.

**No** es desplegable como CEL aislado. Hecho físico:

`CEL_SHIP_DEPENDENCY = PRE_CLOSE_SHARED_COMPOSER`  
`ISOLATED_CEL_SHIP = NO`

`lib/director-ia-chat.js` hace `require` de **ambos** al cargar el módulo. Separar CEL de PRE_CLOSE rompe el arranque del chat.

Steering **viaja** por coherencia (store + SQL + contrato + G2) y queda **DORMANT** en chat. Ship de infraestructura ≠ activar Steering en chat.

Esta tarea no commitea, no empaqueta, no despliega, no aplica SQL.

## 2. Git facts (rechecked)

```
LOCAL_HEAD   = 1ebd81a9bae045d1ee7d4936449b19adc4be47b3
ORIGIN_MAIN  = 1ebd81a9bae045d1ee7d4936449b19adc4be47b3
branch       = implementation/director-ia-pre-close-steering-composition-001
ahead/behind = 0 / 0
modified     = 14
untracked    = 30
```

Todo el trabajo nuevo vive en working tree. Render/`origin/main` no contienen CEL ni PRE_CLOSE composer ni SQL 020.

## 3. Inventory (complete)

Clases: PRODUCT_CODE | TEST | SQL | CANONICAL_DOC | DEV_LOOP_REPORT | CURRENT_TASK | CONTRACT | OTHER.

Ship: YES = viaja en el paquete. NO = artefacto de loop efímero. CONDITIONAL = viaja si el paquete incluye esa capability (aquí: sí, porque el paquete es conjunto).

### 3.1 Modified (14)

| path | owner | origin / chain | type | dep | runtime | reviewed | ship | unit |
|------|-------|----------------|------|-----|---------|----------|------|------|
| `docs/dev-loop/CURRENT_TASK.md` | LOOP | task vigente | CURRENT_TASK | none | n/a | n/a | **NO** (efímero) | — |
| `lib/director-ia-planner.js` | PRE_CLOSE | IMPL+…+REAUDIT PRE_CLOSE | PRODUCT_CODE | composer | ACTIVE | REAUDIT PASS | YES | CU-CHAT-RUNTIME |
| `lib/director-ia-capabilities.js` | PRE_CLOSE | same | PRODUCT_CODE | none | ACTIVE | REAUDIT PASS | YES | CU-CHAT-RUNTIME |
| `lib/director-ia-conversation-state.js` | PRE_CLOSE | same | PRODUCT_CODE | none | ACTIVE | REAUDIT PASS | YES | CU-CHAT-RUNTIME |
| `lib/director-ia-tools.js` | PRE_CLOSE | same | PRODUCT_CODE | composer listed | ACTIVE | REAUDIT PASS | YES | CU-CHAT-RUNTIME |
| `lib/director-ia-chat.js` | **MIXED** PRE_CLOSE+CEL | PRE_CLOSE + IMPL/FIX/REAUDIT CEL | PRODUCT_CODE | composer + CEL | ACTIVE | both REAUDIT PASS | YES | CU-CHAT-RUNTIME |
| `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md` | MIXED PRE_CLOSE+Steering | DOCS SYNC + G2 | CANONICAL_DOC | contract 020 | doc | G2 closed | YES | CU-DOCS |
| `docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md` | MIXED PRE_CLOSE+Steering | same | CANONICAL_DOC | contract | doc | G2 closed | YES | CU-DOCS |
| `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md` | MIXED PRE_CLOSE+Steering | same | CANONICAL_DOC | composer+020 | doc | G2 closed | YES | CU-DOCS |
| `test/director-ia-plant-diagnosis.test.js` | CEL | IMPL/FIX CEL | TEST | CEL chat wiring | test | CEL REAUDIT | YES | CU-CHAT-RUNTIME |
| `test/director-ia-conversational-continuity.test.js` | CEL | FIX M2 catalog | TEST | CEL | test | CEL REAUDIT | YES | CU-CHAT-RUNTIME |
| `test/director-ia-natural-followup.test.js` | CEL | FIX M2 catalog | TEST | CEL | test | CEL REAUDIT | YES | CU-CHAT-RUNTIME |
| `test/director-ia-intra-session-topic-return.test.js` | CEL | FIX M2 catalog | TEST | CEL | test | CEL REAUDIT | YES | CU-CHAT-RUNTIME |
| `test/director-ia-persistent-memory.test.js` | CEL | FIX M2 catalog | TEST | CEL | test | CEL REAUDIT | YES | CU-CHAT-RUNTIME |

### 3.2 Untracked product / SQL / tests / contract (8)

| path | owner | origin | type | dep | runtime | reviewed | ship | unit |
|------|-------|--------|------|-----|---------|----------|------|------|
| `lib/director-ia-executive-cycle-composer.js` | PRE_CLOSE | IMPL PRE_CLOSE | PRODUCT_CODE | loaders HEAD | ACTIVE | REAUDIT PASS | YES | CU-CHAT-RUNTIME |
| `lib/director-ia-conversational-executive-layer.js` | CEL | IMPL+FIX CEL | PRODUCT_CODE | composer | ACTIVE | REAUDIT PASS | YES | CU-CHAT-RUNTIME |
| `lib/director-ia-executive-steering-capture.js` | STEERING | IMPL+FIX Steering | PRODUCT_CODE | SQL 020 if persist | **DORMANT** (no chat/server require) | REAUDIT PASS | YES | CU-STEERING-INFRA |
| `sql/020_executive_steering_capture.sql` | STEERING | IMPL Steering | SQL | plantas/usuarios | **DORMANT** until apply+caller | REAUDIT PASS | YES | CU-STEERING-INFRA |
| `test/director-ia-pre-close-steering.test.js` | PRE_CLOSE | IMPL+FIX | TEST | composer | test | REAUDIT | YES | CU-CHAT-RUNTIME |
| `test/director-ia-conversational-executive-status.test.js` | CEL | IMPL+FIX | TEST | CEL+composer | test | REAUDIT | YES | CU-CHAT-RUNTIME |
| `test/director-ia-executive-steering-capture.test.js` | STEERING | IMPL+FIX | TEST | memory client; reads SQL text | test | REAUDIT | YES | CU-STEERING-INFRA |
| `docs/director-ia/EXECUTIVE-STEERING-CAPTURE-CONTRACT.md` | STEERING | DOCS contract | CONTRACT | none | doc | G3/G2 | YES | CU-STEERING-INFRA + CU-DOCS |

### 3.3 Untracked DEV_LOOP_REPORT (21 + este archivo)

Deben viajar como evidencia histórica. No son runtime. Ship **YES**. Unidad **CU-EVIDENCE** (o junto a su capability).

**PRE_CLOSE:** ARCH-PRE-CLOSE (si existiera en árbol; aquí IMPL/AUDIT/FIX/REAUDIT/DOCS-SYNC PRE_CLOSE), AUDIT-EXECUTIVE-CYCLE-NEXT-GAP.

Presentes:  
`IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md`  
`AUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md`  
`FIX-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md`  
`REAUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md`  
`DOCS-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-SYNC-001.md`  
`AUDIT-DIRECTOR-IA-EXECUTIVE-CYCLE-NEXT-GAP-001.md`

**Steering:**  
`ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-001.md`  
`ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md`  
`DECISION-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-AUTHZ-001.md`  
`DOCS-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-CONTRACT-001.md`  
`IMPL-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md`  
`AUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md`  
`FIX-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md`  
`REAUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md`  
`G2-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-SYNC-001.md`

**CEL / conversacional:**  
`ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001.md`  
`AUDIT-DIRECTOR-IA-CONVERSATIONAL-E2E-001.md`  
`IMPL-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001.md`  
`AUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001.md`  
`FIX-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001.md`  
`REAUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001.md`

**Este ARCH:** `ARCH-DIRECTOR-IA-ACCUMULATED-SHIP-READINESS-001.md` — evidencia de readiness. Ship YES.

Inventory complete: **YES** (44 paths + este reporte al crearse).

## 4. Ownership reconstruction

| Block | What belongs | Status |
|-------|----------------|--------|
| PRE_CLOSE | composer (new); planner/capabilities/state/tools (M); chat PRE_CLOSE handler (M mixed); test pre-close (new); docs sync (M mixed); 6 reports | ARCH→IMPL→AUDIT→FIX→REAUDIT→DOCS **closed** |
| CEL | CEL module (new); chat intercept/greeting/frontier (M mixed); tests CEL + catalog fixtures (M/new); 6 reports | IMPL→AUDIT→FIX→**REAUDIT PASS** |
| STEERING | sql 020, lib capture, test, contract, G2 docs, 9 reports | physical IMPL→AUDIT→FIX→REAUDIT + G2 **closed**; chat **PENDING** |
| ACTUAL_FINANCIAL | **no dirty files**; already in `origin/main` | previously closed; preserve |
| LOOP | CURRENT_TASK.md | do not treat as product |

Ownership from diffs + requires, not filenames alone.

## 5. CEL + PRE_CLOSE (physical)

Preserved: CEL REAUDIT PASS; 1141/1141; LOCAL_E2E PASS; M1/M2/M3 CLOSED_CONFIRMED; F-CUE/F-DICF/F-PER CLOSED_CONFIRMED; F-LEFT DEFERRED_CONFIRMED.

CEL **must travel with**:

1. `lib/director-ia-conversational-executive-layer.js`
2. `lib/director-ia-executive-cycle-composer.js` (`isPreCloseQuestion`)
3. `lib/director-ia-chat.js` (require + intercept)
4. `lib/director-ia-planner.js` (also requires composer — HEAD planner **does not**)

Sin (2)+(3) el `require` de chat/CEL falla al load. **No separar CEL de PRE_CLOSE.**

## 6. Steering

Contract v1.0, store IMPLEMENTED, RECORDED, AUTHZ RESOLVED, physical chain + G2 closed.

Chat read/capture PENDING. POST_CAPTURE_READ PENDING. Plaud/Council/live PENDING.

**Travel:** SQL + lib + tests + contract + G2 docs + reports.  
**Dormant:** no `require` desde `chat.js` ni `server.js`. CEL solo responde frontera PENDING ante lectura de junta.  
**SHIP INFRA ≠ CHAT ON.**

## 7. SQL 020

| Question | Determination |
|----------|----------------|
| ¿Parte del ship? | **YES** (unidad Steering infra) |
| ¿Quién depende? | Solo `lib/director-ia-executive-steering-capture.js` (INSERT/SELECT). Tests usan cliente en memoria. |
| ¿Ruta chat activa la requiere? | **NO** |
| CODE_BEFORE_SQL | Código Steering en repo **sin** tablas: chat/PRE_CLOSE/CEL **no fallan**. Un caller persistente futuro fallaría SQL. Hoy no hay caller HTTP. **Riesgo bajo** si no se conecta chat. |
| SQL_BEFORE_CODE | `CREATE IF NOT EXISTS` tablas vacías. Sin consumidor. **Seguro.** |
| Orden futuro | 1) merge package 2) apply 020 en entorno **antes** de cualquier activación persistente 3) deploy app 4) no activar chat Steering |
| Idempotencia | `IF NOT EXISTS` en schema/tables/indexes. Reaplicable para CREATE. **No** hay DOWN. |
| Rollback SQL | **No demostrado.** No inventar reversibilidad. Rollback = no usar el store; DROP es acto DBA humano. |

**NO ejecutado en esta tarea.**

## 8. Canonical docs

Cambios en Index 1.11→1.13, EKE, CAPACIDADES: PRE_CLOSE SUPPORTED_WITHIN_PRE_CLOSE + Steering contract/IMPLEMENTED/PENDING chat. Contrato nuevo untracked.

Necesarios para que el repo **no contradiga** runtime post-ship (PRE_CLOSE en chat; Steering no en chat). Index no menciona CEL por nombre de archivo; CAPACIDADES/ledger CEL viven en código. No se modifica docs en esta tarea.

Constitución / 04 / 05: no sucios.

## 9. Orphan analysis

| class | count | notes |
|-------|-------|-------|
| ORPHAN | **0** | Ledger CEL + filas CAPACIDADES cubren trend/AF/PRE_CLOSE/Steering/POST_CAPTURE/Plaud/Council/live |
| UNKNOWN_OWNER | **0** | Todo path mapeado |
| UNREVIEWED (runtime material) | **0** | Tres cadenas con REAUDIT |
| PARTIALLY_REVIEWED | files mixed (chat, Index, EKE, CAPACIDADES) | cada delta tiene cadena; no es UNREVIEWED |
| BLOCKING_SHIP | **0** *if packaged together* | Isolated CEL **would** block — not proposed |

No-Orphan capability gate: **preserved**.

## 10. Active vs dormant

| CAPABILITY | FILES (core) | SHIP? | ACTIVE_AFTER_DEPLOY? | DORMANT? | REQUIRES_SQL? | CHAT_CONNECTED? | FUTURE_INTEGRATION? |
|------------|--------------|-------|----------------------|----------|---------------|-----------------|---------------------|
| PRE_CLOSE | composer + planner/chat/state/tools/capabilities | YES | YES (if ENABLE_DIRECTOR_IA) | no | no new | YES | no |
| CEL | CEL + chat intercept | YES | YES | no | no | YES | later needs |
| Steering store | sql 020 + capture.js | YES | lib present, **unused** | YES until caller | YES for persist | NO | POST_CAPTURE_READ |
| Steering chat | frontier only in CEL | YES (frontier) | frontier PENDING text | capture/read YES dormant | no | frontier only | YES |
| POST_CAPTURE_READ | ledger only | YES (ledger) | NO | YES | n/a | NO | YES |
| ACTUAL_FINANCIAL | already on main | already shipped | month_close only | rest PENDING | 018/019 already | specialized | no new |
| Plaud | ledger/docs | YES (trace) | NO | YES | n/a | NO | PENDING_INTEGRATION |
| Council | ledger/docs | YES (trace) | NO | YES | n/a | NO | PENDING |
| live | ledger/docs | YES (trace) | NO | YES | n/a | NO | PENDING |

Incluir contratos Plaud/Council/live en trazabilidad **≠** implementarlos.

## 11. Deployment dependencies

| Item | Physical |
|------|----------|
| server.js registration | **none** for CEL/PRE_CLOSE/020/steering |
| chat load requires | CEL + composer (new). Fail if missing. |
| planner load requires | composer (new). |
| startup init | none for 020 |
| flags | `ENABLE_DIRECTOR_IA`; CEL wording also `AI_ENABLED` / `OPENAI_API_KEY` |
| env | same as Director IA today; **no** STEERING flag |
| DB | PRE_CLOSE/CEL reuse existing loaders. 020 **not** needed for chat start |
| auth | existing dashboardAuth / plant access; Steering AUTHZ only if store called |

Present file ≠ active runtime (Steering lib).

## 12. Proposed commit units (NOT executed)

No dividir por “código vs docs vs tests”. `chat.js` y docs canónicos son **mixed**; el load graph **une** CEL y PRE_CLOSE.

| COMMIT_UNIT_ID | scope | files | depends_on | reason | evidence | ship_order |
|----------------|-------|-------|------------|--------|----------|------------|
| CU-CHAT-RUNTIME | PRE_CLOSE + CEL runtime+tests | composer, CEL, chat, planner, capabilities, state, tools, tests CEL/PRE_CLOSE/continuity catalog/plant_diagnosis | HEAD | **Indivisible** por require | 1141; CEL REAUDIT; PRE_CLOSE REAUDIT | 1 (same merge) |
| CU-STEERING-INFRA | store physical + contract + SQL + tests | 020, capture.js, steering test, ESC contract | HEAD (plantas/usuarios) | Dormant; coherencia física | Steering REAUDIT + G2 | 1 (same merge) |
| CU-DOCS | Index, EKE, CAPACIDADES | those 3 M + contract if not in CU-STEERING | CU-CHAT + CU-STEERING facts | repo ≠ contradict runtime | G2 + DOCS SYNC | 1 (same merge) |
| CU-EVIDENCE | 21+ reports | all untracked reports + this ARCH | the three chains | historical audit trail | append-only loop | 1 (same merge) |

**Decisión arquitectónica:** un **paquete único de merge** (varios commits locales permitidos **solo** si no se mergea CU-CHAT sin composer+CEL). No commit aislado de CEL. CURRENT_TASK **fuera** del paquete de producto (o reset humano después).

## 13. Future order (not executed)

```
PACKAGE manifest (next task)
  → human review of package
  → commit(s) on feature branch (no push unless human)
  → package audit / REAUDIT-of-tree if human asks
  → merge to main (human)
  → apply sql/020 on target DB (human; before any persist caller)
  → deploy app (human)
  → smoke (below)
  → MANUAL_CHAT_VALIDATION on Render
```

SQL 020 **después** de merge y **antes** de cualquier activación persistente. Puede ir **después** del deploy de app **hoy**, porque chat no toca 020. Orden más seguro: apply 020 **before or with** deploy to avoid future CODE_BEFORE_SQL if someone wires a caller.

**No push / merge / deploy in this task.**

## 14. Rollback

| Layer | Boundary |
|-------|----------|
| Git | revert package commit(s) on branch/main (human) |
| Runtime | redeploy `1ebd81a9` or `ENABLE_DIRECTOR_IA=false` |
| SQL | **not reversible by this file.** Tables leftover are inert without caller. DROP = DBA humano, no demostrado |

## 15. Smoke (design only; not run)

After deploy, with `ENABLE_DIRECTOR_IA=true`:

1. Process starts; no missing-module for composer/CEL.
2. Chat endpoint responds (not 500 on load).
3. Underspecified status uses CEL path (composer flag / no unknown dump).
4. PRE_CLOSE question still routes to pre_meeting/PRE_CLOSE (not CEL).
5. IGF / month_close / daily inequívoco no rotos.
6. Boot log: no error `executive_steering_events` / 020.
7. GA + other plant still 403.

## 16. Manual chat acceptance (Render; later)

`MANUAL_CHAT_VALIDATION = PENDING`  
`PRODUCTION_MANUAL_VALIDATION = NOT_YET_TESTABLE`

| # | Setup | Question | EXPECTED_ROUTE | EXPECTED_BEHAVIOR | FAILURE |
|---|-------|----------|----------------|-------------------|---------|
| 1 | UI Acapulco | Hola | greeting | Neutral/contextual; no lista STALE; no OpenAI necesario | Lista AR/DICF o promesa Plaud |
| 2 | UI Acapulco | ¿Cómo vamos? | CEL EXECUTIVE_STATUS | Estado de Acapulco; no unknown; no source dump | «intención no clara»; dump MATERIALIDAD-first |
| 3 | UI Acapulco | ¿Cómo vamos hoy? | CEL not daily | Igual familia estado | Brief diario de venta/descuento |
| 4 | UI Acapulco | Dame el resumen diario | daily (o unknown legado si detector no ve «diario» sin hoy) | Preferir daily; **no** CEL | Pack ejecutivo CEL |
| 5 | UI Acapulco | ¿Cómo va Puebla? | CEL explicit / o 403 | Puebla si AUTHZ; deny si no | Respuesta de Acapulco |
| 6 | — | Prepárame para el pre-cierre | PRE_CLOSE | Composer PRE_CLOSE; no CEL | Pack CEL o month_close FINAL |

No exigir wording GPT literal.

## 17. Matrix

**10.5 / 20 = 52.5%**. Delta **0.0 pp**. Readiness ≠ coverage.

## 18. Verdict rationale

READY_FOR_PACKAGE_PLAN because:

- inventory complete
- 0 ORPHAN / UNKNOWN_OWNER / UNREVIEWED material / BLOCKING_SHIP (as a package)
- SQL sequencing governable
- mixed files force **one package**, which is defendable

Not READY_WITH_BLOCKERS: no broken dep if shipped together.

## 19. Exactly one NEXT_TASK

`PACKAGE-DIRECTOR-IA-ACCUMULATED-SHIP-001`

Congelar manifiesto de archivos del paquete, exclusiones (CURRENT_TASK), orden de commits **sin** push/merge/deploy/SQL, y checklist de review. **No** deploy. No autorizada. No ejecutada.
