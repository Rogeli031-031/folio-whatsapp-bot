# FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-PROMPT-STATUS-ALIGNMENT-001

IMPLEMENTATION_SHA:
PENDING_COMMIT

BASE_MAIN_SHA:
952ba1b5a44e1c9410a15643d1c7d7feb30b4905

BEFORE:
B-001 addendum solo tiene regla mismatch negativa; no hay comparable positiva = true (base `952ba1b5`)
B-002 user tail dice «period mismatch si existen» sin anclarlo a `alignment.status` = true
B-003 LIVE comparable produjo falso period mismatch (2026-08 vs 2026-09) = true (auditoría)
B-004 LIVE usó «puede estar relacionado» pese a no_causalidad = true
B-005 LIVE atribuyó posible relación Delta Venta → Delta Ingreso = true
B-006 `buildAlignment` ya produce comparable IGF/ARR 2026-09 + M9 2026-08→2026-09 y no cambió = true

PROMPT_CONTROL_MODEL:
Helper local `buildFinancialDiagnosisPromptControl(assembled, question)` concatena un bloque `FINANCIAL_DIAGNOSIS_CONTROL` al `systemPrompt` de `buildFinancialDiagnosisPrompt()`. El export `FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM` quedó byte-idéntico a `952ba1b5` (R-PRECOUNT-050). El user tail viejo se conserva; se añade ancla: mismatch solo si `ALIGNMENT_STATUS=mismatch`.

ALIGNMENT_AUTHORITY_MODEL:
`ALIGNMENT_AUTHORITY=buildAlignment`. El prompt declara que `alignment.status` es autoritativo y no se reinterpreta.

COMPARABLE_MODEL:
Si `alignment.status=comparable`: REQUIRED tratar IGF/ARR/M9 periodos de alignment como comparables. FORBIDDEN: period mismatch, periodo diferente que limita comparación, falta de alineación.

MISMATCH_MODEL:
Si `alignment.status` no es `comparable`: REQUIRED declarar period mismatch. FORBIDDEN tratar los bloques como comparables o el mismo mes.

SOURCE_STATUS_MODEL:
El control ancla `IGF_STATUS`, `ARR_STATUS`, `M9_STATUS`, `M9_DELTA_VENTA_STATUS`, `M9_DELTA_DESCUENTO_STATUS`, `M9_DELTA_INGRESO_STATUS` desde `assembled.sources`. `SOURCE_AVAILABLE` no puede reescribirse como missing/unavailable.

PARTIAL_MODEL:
`SOURCE_PARTIAL`: resultado exacto no disponible solo según `missing_inputs` físicos (`MISSING_INPUTS=`). No inventar razón fuera de esa lista. `CONVENCION_ESTRUCTURAL` no significa periodo sin clientes ni `DATA_NOT_FOUND`.

CAUSALITY_MODEL:
`CAUSAL_EVIDENCE=NONE` siempre (financial_diagnosis actual no provee evidencia causal). FORBIDDEN: debido a (atribución), causó, provocó, explica, puede estar relacionado, podría indicar la causa, sugiere que X ocasionó Y. ALLOWED: describir simultáneamente Delta Ingreso disminuyó y Delta Venta disminuyó. Coexistencia no autoriza causalidad. Si la pregunta es «por qué»/`porque`: REQUIRED declaración equivalente a que con estas fuentes no se puede determinar por qué cayó el ingreso ni atribuir causalidad a venta, descuento o clientes.

TENSION_MODEL:
`TENSION=descriptive_difference_only`. Tensión = diferencia descriptiva entre objetos/fuentes. No es driver, causa, explicación, «podría indicar» ni «puede estar relacionado».

LIVE_NORTH_STAR_MODEL:
Para IGF 2026-09 / ARR 2026-09 / M9 2026-08→2026-09 con `alignment.status=comparable`: permitido describir disminuciones simultáneas de Delta Ingreso y Delta Venta; prohibido afirmar period mismatch o que la caída del ingreso puede estar relacionada con la venta.

001..053:
53/53 PASS. NEW FAILURE = 0.
R-PROMPT-051/052/053 del archivo focal cubren addendum congelado, control no-en-formatter y presencia de IDs.
Task 051 Tier 1 y 052 pre-deploy se ejecutaron como suites aparte (abajo).

SUITES:
- focal R-PROMPT: 53/53
- FD existentes + M9 formatter/pretruncate + M9 + ARR Root1 + ARR + IGF + commercial + continuity: 343/343
- planner: 61/61
- capabilities: 57/57
- tool-orchestrator: 27/28; 1 preexistente vs `base_main_sha` `952ba1b5` (`lib/director-ia-planner.js` + orchestrator unchanged; `¿Qué clientes dejaron de comprar?` planner=`commercial_trend`, script espera `get_commercial_state`)
- commercial_state: 5/5
- TIER 1: 8/8
- pre-deploy --gate: PASS
- NEW FAILURE: 0

FILES:
- lib/director-ia-financial-diagnosis.js
- test/director-ia-financial-diagnosis-prompt-status-alignment.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-PROMPT-STATUS-ALIGNMENT-001.md

RISKS:
- El contrato es solo prompt. El LLM aún puede desobedecerlo. No hay validator post-generation ni retry (fuera de alcance).
- No se demostró LIVE_DB. La prueba es de contrato de prompt, no de wording OpenAI en producción.

FORMATTER_CHANGED:
NO

BUILD_ALIGNMENT_CHANGED:
NO

EVIDENCE_CHANGED:
NO

POST_GENERATION_VALIDATOR_ADDED:
NO

OPENAI_RETRY_ADDED:
NO

M9_LOADERS_CHANGED:
NO

ARR_CHANGED:
NO

PLANNER_CHANGED:
NO

ROUTING_CHANGED:
NO

SERVER_CHANGED:
NO

SQL_CHANGED:
NO

SCHEMA_CHANGED:
NO

DEPENDENCY_CHANGED:
NO

LIVE_DB_USED:
NO

FINAL:
PASS

```yaml
task_id: "FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-PROMPT-STATUS-ALIGNMENT-001"
outcome: "DONE"
mode: "REGRESSION_FIRST"
implementation: true
files_touched:
  - "lib/director-ia-financial-diagnosis.js"
  - "test/director-ia-financial-diagnosis-prompt-status-alignment.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-PROMPT-STATUS-ALIGNMENT-001.md"
files_not_touched:
  - "lib/director-ia-m9-deltas.js"
  - "lib/director-ia-igf-arr.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js"
  - "server.js"
  - "package.json"
  - "package-lock.json"
  - "docs/director-ia/"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FINANCIAL-DIAGNOSIS-CAUSALITY-ALIGNMENT-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "FINANCIAL_DIAGNOSIS_SYSTEM_ADDENDUM no se reescribió para no romper R-PRECOUNT-050; el contrato nuevo vive en helper local de prompt."
next_task_proposed: "ninguna; no autorizada"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy."
base_main_sha: "952ba1b5a44e1c9410a15643d1c7d7feb30b4905"
live_db: false
```
