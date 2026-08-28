# PACKAGE-DIRECTOR-IA-ACCUMULATED-SHIP-001

```yaml
task_id: "PACKAGE-DIRECTOR-IA-ACCUMULATED-SHIP-001"
outcome: "DONE_PENDING_REVIEW"
package_verdict: "PACKAGE_READY_WITH_LIMITS"
mode: "PACKAGE / SHIP PREPARATION"
implementation: false
commits_created: false
git_add: false
push: false
merge: false
deploy: false
sql_executed: false
local_head: "1ebd81a9bae045d1ee7d4936449b19adc4be47b3"
origin_main: "1ebd81a9bae045d1ee7d4936449b19adc4be47b3"
modified: 14
untracked_at_inspect: 30
manifest_file_count: 45
unassigned: 0
multi_assigned_ambiguous: 0
unknown_owner: 0
orphan: 0
atomic_commit_required: "CU-CHAT-RUNTIME"
can_commit_sequentially_with_green_head: true
test_evidence_fresh: true
retest_required_before_commit: false
sql_before_code: "SAFE"
code_before_sql: "SAFE"
cel_ship_dependency: "PRE_CLOSE_SHARED_COMPOSER"
isolated_cel_ship: false
manual_chat_validation: "PENDING"
production_manual_validation: "NOT_YET_TESTABLE"
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
next_task_proposed: "REVIEW-DIRECTOR-IA-ACCUMULATED-SHIP-PACKAGE-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Executive result

**PACKAGE_READY_WITH_LIMITS.**

El working tree (14 modified + 30 untracked al inspeccionar, + este reporte) queda asignado a **exactamente una** unidad o a metadata de loop. Cierre de dependencias PRE_CLOSE+CEL demostrado por `require`. Steering viaja y permanece DORMANT en chat. SQL 020 gobernado; **no** hay script de rollback.

El límite no bloqueante: reversibilidad SQL no demostrada. El paquete es **un solo merge futuro**. Las cuatro unidades pueden commitearse en secuencia con HEAD verde **si** CU-CHAT-RUNTIME viaja como **un** commit atómico. Partir esos 14 archivos deja `require` roto.

No commit. No `git add`. No SQL. No deploy.

## 2. Git revalidation

```
LOCAL_HEAD  = 1ebd81a9bae045d1ee7d4936449b19adc4be47b3
ORIGIN_MAIN = 1ebd81a9bae045d1ee7d4936449b19adc4be47b3
ahead/behind = 0 / 0
modified = 14
untracked (inspect) = 30
```

Ningún product code dirty posterior al REAUDIT CEL / suite 1141 salvo lo ya incluido en ese árbol (ARCH/PACKAGE/CURRENT_TASK son loop).

## 3. Manifest (complete)

SHIP: YES = viaja en el paquete de producto. NO = metadata de loop (no producto).

### 3.1 LOOP_METADATA (1)

| PATH | GIT | UNIT | OWNER | ORIGIN | REVIEW | SHIP | RUNTIME | DEPS | NOTES |
|------|-----|------|-------|--------|--------|------|---------|------|-------|
| docs/dev-loop/CURRENT_TASK.md | M | LOOP_METADATA | LOOP | task vigente | n/a | **NO** | N_A | none | No es artefacto de producto. Gobernar fuera del merge o resetear tras CLOSED. |

### 3.2 CU-CHAT-RUNTIME (14)

| PATH | GIT | OWNER | ORIGIN | REVIEW | SHIP | RUNTIME | DEPS |
|------|-----|-------|--------|--------|------|---------|------|
| lib/director-ia-executive-cycle-composer.js | ?? | PRE_CLOSE | IMPL PRE_CLOSE | REAUDIT PASS | YES | ACTIVE | loaders HEAD |
| lib/director-ia-conversational-executive-layer.js | ?? | CEL | IMPL+FIX CEL | REAUDIT PASS | YES | ACTIVE | composer |
| lib/director-ia-chat.js | M | MIXED PRE_CLOSE+CEL | PRE_CLOSE+CEL | both REAUDIT | YES | ACTIVE | composer + CEL |
| lib/director-ia-planner.js | M | PRE_CLOSE | IMPL PRE_CLOSE | REAUDIT | YES | ACTIVE | composer |
| lib/director-ia-capabilities.js | M | PRE_CLOSE | IMPL PRE_CLOSE | REAUDIT | YES | ACTIVE | none new |
| lib/director-ia-conversation-state.js | M | PRE_CLOSE | IMPL PRE_CLOSE | REAUDIT | YES | ACTIVE | none new |
| lib/director-ia-tools.js | M | PRE_CLOSE | IMPL PRE_CLOSE | REAUDIT | YES | ACTIVE | lists composer |
| test/director-ia-pre-close-steering.test.js | ?? | PRE_CLOSE | IMPL+FIX | REAUDIT | YES | N_A | composer |
| test/director-ia-conversational-executive-status.test.js | ?? | CEL | IMPL+FIX | REAUDIT | YES | N_A | CEL+composer |
| test/director-ia-plant-diagnosis.test.js | M | CEL | IMPL CEL | REAUDIT | YES | N_A | chat CEL |
| test/director-ia-conversational-continuity.test.js | M | CEL | FIX M2 catalog | REAUDIT | YES | N_A | CEL |
| test/director-ia-natural-followup.test.js | M | CEL | FIX M2 catalog | REAUDIT | YES | N_A | CEL |
| test/director-ia-intra-session-topic-return.test.js | M | CEL | FIX M2 catalog | REAUDIT | YES | N_A | CEL |
| test/director-ia-persistent-memory.test.js | M | CEL | FIX M2 catalog | REAUDIT | YES | N_A | CEL |

**ATOMIC_COMMIT_REQUIRED = YES** para este conjunto. `chat.js` y `planner.js` `require` composer; `chat.js` y CEL `require` el otro. Un commit intermedio con solo parte de estos 7 product files deja `require` roto.

### 3.3 CU-STEERING-INFRA (3)

| PATH | GIT | OWNER | ORIGIN | REVIEW | SHIP | RUNTIME | DEPS |
|------|-----|-------|--------|--------|------|---------|------|
| sql/020_executive_steering_capture.sql | ?? | STEERING | IMPL physical | REAUDIT | YES | DORMANT until apply+caller | public.plantas, public.usuarios |
| lib/director-ia-executive-steering-capture.js | ?? | STEERING | IMPL+FIX | REAUDIT | YES | DORMANT | SQL 020 if persist |
| test/director-ia-executive-steering-capture.test.js | ?? | STEERING | IMPL+FIX | REAUDIT | YES | N_A | lib + SQL text |

Contrato v1.0: **CU-DOCS** (una sola asignación). Steering **depende del paquete**, no del archivo duplicado.

**Chat:** `director-ia-chat.js` y `server.js` **no** `require` el capture. Deploy arranca **sin** SQL 020.

### 3.4 CU-DOCS (4)

| PATH | GIT | OWNER | ORIGIN | REVIEW | SHIP | RUNTIME | DEPS |
|------|-----|-------|--------|--------|------|---------|------|
| docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md | M | MIXED PRE_CLOSE+Steering | DOCS/G2 | G2 closed | YES | N_A | contract |
| docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md | M | MIXED PRE_CLOSE+Steering | DOCS/G2 | G2 closed | YES | N_A | composer+020 refs |
| docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md | M | MIXED PRE_CLOSE+Steering | DOCS/G2 | G2 closed | YES | N_A | contract |
| docs/director-ia/EXECUTIVE-STEERING-CAPTURE-CONTRACT.md | ?? | STEERING | DOCS contract | G3/G2 | YES | N_A | none |

Consistencia (solo lectura): PRE_CLOSE = SUPPORTED_WITHIN_PRE_CLOSE; Steering físico IMPLEMENTED; chat/Plaud/Council/live/POST_CAPTURE_READ = PENDING*. CEL no declara validación de producción.

### 3.5 CU-EVIDENCE (23)

Todos: PACKAGE_UNIT=CU-EVIDENCE, GIT=??, SHIP=YES, RUNTIME=N_A, DEPS=cadena propia. No se borra ningún reporte. ARCH readiness asignó el contrato a dos unidades; este PACKAGE lo deja **solo** en CU-DOCS (MULTI_ASSIGNED_AMBIGUOUS=0).

| PATH | OWNER | ORIGIN | REVIEW | NOTES |
|------|-------|--------|--------|-------|
| docs/dev-loop/reports/IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md | PRE_CLOSE | IMPL PRE_CLOSE | closed by REAUDIT | composer + wiring |
| docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md | PRE_CLOSE | AUDIT PRE_CLOSE | closed by FIX/REAUDIT | findings chain |
| docs/dev-loop/reports/FIX-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md | PRE_CLOSE | FIX PRE_CLOSE | closed by REAUDIT | |
| docs/dev-loop/reports/REAUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md | PRE_CLOSE | REAUDIT PRE_CLOSE | PASS | runtime evidence |
| docs/dev-loop/reports/DOCS-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-SYNC-001.md | PRE_CLOSE | DOCS SYNC | closed | canonical sync |
| docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-CYCLE-NEXT-GAP-001.md | PRE_CLOSE | AUDIT next-gap | closed | post PRE_CLOSE gap |
| docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-001.md | STEERING | ARCH | closed | domain |
| docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md | STEERING | ARCH physical | closed | first slice |
| docs/dev-loop/reports/DECISION-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-AUTHZ-001.md | STEERING | DECISION AUTHZ | RESOLVED | |
| docs/dev-loop/reports/DOCS-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-CONTRACT-001.md | STEERING | DOCS contract | G3/G2 | |
| docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md | STEERING | IMPL | closed by REAUDIT | 020 + lib |
| docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md | STEERING | AUDIT | closed by FIX/REAUDIT | |
| docs/dev-loop/reports/FIX-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md | STEERING | FIX | closed by REAUDIT | |
| docs/dev-loop/reports/REAUDIT-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-001.md | STEERING | REAUDIT | PASS | store dormant |
| docs/dev-loop/reports/G2-DIRECTOR-IA-EXECUTIVE-STEERING-CAPTURE-PHYSICAL-SYNC-001.md | STEERING | G2 | closed | docs sync |
| docs/dev-loop/reports/ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001.md | CEL | ARCH | closed | first slice C |
| docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-E2E-001.md | CEL | AUDIT E2E | closed | harness |
| docs/dev-loop/reports/IMPL-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001.md | CEL | IMPL | closed by REAUDIT | |
| docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001.md | CEL | AUDIT | PASS_WITH_FINDINGS | closed by FIX/REAUDIT |
| docs/dev-loop/reports/FIX-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001.md | CEL | FIX | closed by REAUDIT | M1/M2/M3 |
| docs/dev-loop/reports/REAUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001.md | CEL | REAUDIT | PASS | 1141 suite |
| docs/dev-loop/reports/ARCH-DIRECTOR-IA-ACCUMULATED-SHIP-READINESS-001.md | PACKAGE | ARCH readiness | READY_FOR_PACKAGE_PLAN | input de este PACKAGE |
| docs/dev-loop/reports/PACKAGE-DIRECTOR-IA-ACCUMULATED-SHIP-001.md | PACKAGE | this task | this report | manifest + gates |

### 3.6 Counts

| unit | n |
|------|---|
| LOOP_METADATA | 1 |
| CU-CHAT-RUNTIME | 14 |
| CU-STEERING-INFRA | 3 |
| CU-DOCS | 4 |
| CU-EVIDENCE | 23 |
| **manifest total** | **45** |

UNASSIGNED=0. MULTI_ASSIGNED_AMBIGUOUS=0. UNKNOWN_OWNER=0. ORPHAN=0.

## 4. CU-CHAT-RUNTIME closure

Requires físicos:

```
chat.js        → conversational-executive-layer.js
chat.js        → executive-cycle-composer.js
CEL            → executive-cycle-composer.js
planner.js     → executive-cycle-composer.js
```

CEL **no** viaja sin `lib/director-ia-executive-cycle-composer.js`.
PRE_CLOSE **no** viaja en runtime de chat sin el mismo composer + `chat.js` + `planner.js`.

`CEL_SHIP_DEPENDENCY = PRE_CLOSE_SHARED_COMPOSER`
`ISOLATED_CEL_SHIP = NO`

## 5. SQL 020

| Item | Value |
|------|--------|
| included | **YES** (CU-STEERING-INFRA) |
| SQL_BEFORE_CODE | **SAFE** — CREATE IF NOT EXISTS; tablas vacías; sin caller |
| CODE_BEFORE_SQL | **SAFE** hoy — chat/server no tocan 020; persist caller futuro fallaría |
| idempotency | IF NOT EXISTS schema/tables/indexes |
| constraints | types, RECORDED-only, vigor, FKs plantas/usuarios |
| startup dep | **none** |
| active runtime dep | **none** |
| rollback | **LIMIT: no DOWN script. No afirmar reversibilidad.** |

## 6. ACTUAL_FINANCIAL

Ningún dirty/untracked propiedad de AF. Ya en `origin/main`. No mezclado por nombre.

## 7. Active vs dormant

| CAPABILITY | UNIT | ACTIVE_AFTER_DEPLOY | DORMANT | CHAT_CONNECTED | REQUIRES_SQL | FUTURE_BRIDGE |
|------------|------|---------------------|---------|----------------|--------------|---------------|
| PRE_CLOSE | CU-CHAT-RUNTIME | YES if ENABLE_DIRECTOR_IA | no | YES | no new | no |
| CEL | CU-CHAT-RUNTIME | YES if ENABLE_DIRECTOR_IA | no | YES | no | later needs |
| Steering store | CU-STEERING-INFRA | lib present unused | YES | NO | YES to persist | POST_CAPTURE_READ |
| Steering chat | frontier in CEL | PENDING text only | capture/read YES | frontier only | no | YES |
| POST_CAPTURE_READ | ledger/evidence | NO | YES | NO | n/a | YES |
| ACTUAL_FINANCIAL | already main | month_close only | rest PENDING | specialized | 018/019 shipped | no new |
| Plaud | evidence/docs | NO | YES | NO | n/a | PENDING_INTEGRATION |
| Council | evidence/docs | NO | YES | NO | n/a | PENDING |
| live | evidence/docs | NO | YES | NO | n/a | PENDING |

Flags: `ENABLE_DIRECTOR_IA`; wording CEL también `AI_ENABLED` / `OPENAI_API_KEY`. Sin flag STEERING.

## 8. Dependency graph

```
CU-EVIDENCE     → (none runtime; traces all)
CU-DOCS         → facts of CHAT-RUNTIME + STEERING (same package)
CU-STEERING-INFRA → HEAD (plantas/usuarios); contract in CU-DOCS same merge
CU-CHAT-RUNTIME → HEAD + composer+CEL+chat atomic; NOT Steering SQL
```

**CAN_COMMIT_SEQUENTIALLY_WITH_GREEN_HEAD = YES**

Condición: LC-CHAT es **un** commit. LC-EVIDENCE / LC-DOCS / LC-STEERING en cualquier orden no rompen load (Steering no es `require` de `server.js` ni `chat.js`).

Cualquier split interno de CU-CHAT-RUNTIME: **HEAD roto** (`chat.js` y `planner.js` requieren composer; `chat.js` y CEL se requieren mutuamente).

**ATOMIC_COMMIT_REQUIRED = YES** para el conjunto CU-CHAT-RUNTIME (7 product files + 7 tests).

Merge futuro: las cuatro unidades juntas. CURRENT_TASK fuera del paquete de producto.

## 9. Future commit plan (NOT created, no git add)

| LOGICAL_COMMIT_ID | UNIT | FILES | PURPOSE | DEPENDS_ON | PRE_COMMIT_GATE | POST_COMMIT_TEST_GATE |
|-------------------|------|-------|---------|------------|-----------------|------------------------|
| LC-EVIDENCE | CU-EVIDENCE | 23 reports | trazabilidad | none | package accept | n/a (docs) |
| LC-DOCS | CU-DOCS | 4 canonical | sync repo↔runtime | same package facts | docs PENDING* honest | n/a |
| LC-STEERING | CU-STEERING-INFRA | 3 | store dormant | HEAD | no chat require | steering tests if isolated |
| LC-CHAT | CU-CHAT-RUNTIME | 14 | PRE_CLOSE+CEL **atomic** | composer+CEL together | require closure | `node --test test/director-ia-*.js` |

CURRENT_TASK: no entra en LC-*.

## 10. PACKAGE_ACCEPTANCE_GATE

| Gate | Result |
|------|--------|
| MANIFEST_COMPLETE | PASS |
| ZERO_UNASSIGNED | PASS |
| ZERO_UNKNOWN_OWNER | PASS |
| ZERO_ORPHAN | PASS |
| DEPENDENCY_CLOSURE | PASS |
| CEL_PRE_CLOSE_CLOSURE | PASS |
| STEERING_DORMANT_BOUNDARY | PASS |
| SQL_SEQUENCING_GOVERNED | PASS |
| DOCS_CONSISTENT | PASS |
| EVIDENCE_COMPLETE | PASS |
| GIT_DIFF_CHECK_CLEAN | PASS (evaluado al cierre) |

**PACKAGE_ACCEPTANCE = PASS** (límite: SQL rollback).

## 11. Test freshness

Después de CEL REAUDIT / 1141: solo CURRENT_TASK, ARCH readiness, este PACKAGE. **Sin** cambio de product code posterior.

`TEST_EVIDENCE_FRESH = YES`
`RETEST_REQUIRED_BEFORE_COMMIT = NO` (por freshness). El LC-CHAT POST_COMMIT_TEST_GATE sigue siendo la suite Director IA **cuando** se autorice commit.

## 12. Ship order (not executed)

```
PACKAGE ACCEPT
  → COMMIT(S)  [LC-EVIDENCE, LC-DOCS, LC-STEERING, LC-CHAT atomic]
  → PACKAGE REVIEW (next task)
  → MERGE (human)
  → SQL 020 (human; seguro antes o con deploy)
  → DEPLOY (human)
  → SMOKE
  → HUMAN CHAT VALIDATION
```

SQL puede ir después del deploy **hoy** (chat no usa 020). Más seguro: aplicar 020 **antes** de cualquier caller persistente.

## 13. Manual chat gate (frozen; PENDING)

| # | UI | Question | EXPECTED_ROUTE | EXPECTED_BEHAVIOR | FAILURE_SIGNAL |
|---|-----|----------|----------------|-------------------|----------------|
| 1 | Acapulco | Hola | greeting | contextual; no STALE | lista AR/DICF; promesa Plaud |
| 2 | Acapulco | ¿Cómo vamos? | CEL EXECUTIVE_STATUS | ancla Acapulco; no unknown | dump / unknown |
| 3 | Acapulco | ¿Cómo vamos hoy? | CEL not daily | estado planta | brief venta/descuento |
| 4 | Acapulco | Dame el resumen diario | daily (o unknown legado) | no CEL | pack CEL |
| 5 | Acapulco | ¿Cómo va Puebla? | CEL explicit / 403 | Puebla o deny | respuesta Acapulco |
| 6 | — | Prepárame para el pre-cierre | PRE_CLOSE | composer PRE_CLOSE | pack CEL o month_close FINAL |

No wording GPT literal.
`MANUAL_CHAT_VALIDATION = PENDING`
`PRODUCTION_MANUAL_VALIDATION = NOT_YET_TESTABLE`

## 14. Rollback (not executed)

| Layer | Plan |
|-------|------|
| GIT_ROLLBACK | revert LC-* / paquete |
| DEPLOY_ROLLBACK | redeploy `1ebd81a9bae045d1ee7d4936449b19adc4be47b3` |
| SQL_ROLLBACK_LIMIT | sin DOWN; tablas inertes sin caller; DROP = DBA humano |

HEAD conocido intacto.

## 15. Matrix

**10.5 / 20 = 52.5%**. Delta **0.0 pp**.

## 16. Exactly one NEXT_TASK

`REVIEW-DIRECTOR-IA-ACCUMULATED-SHIP-PACKAGE-001`

Revisión humana del manifiesto/paquete **antes** de autorizar commits. No deploy. No autorizada. No ejecutada.
