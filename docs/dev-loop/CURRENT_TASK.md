# CURRENT_TASK

task_id: AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-REGRESSION-RECOVERY-001

status: DONE_PENDING_REVIEW

authorized_by: "Human Approver"

authorized_at: "2026-09-01T18:03:20-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver approved AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-REGRESSION-RECOVERY-001 to compare pre-historical_margin behavior against current main, locate all regressions and define recovery requirements. Audit/read-only only. No implementation, rollback, merge, deploy or next task."

task_type: AUDIT

branch: audit/director-ia-historical-margin-regression-recovery-001

base_main_sha: 50fb33e5a4e6cf57ddd53cb6001e87e25c7193da

behavior_baseline_sha: 1f7774d7bff5fdd71f4e7b88433dde178f4fef86

implementation_authorized: NO

merge_authorized: NO

deploy_authorized: NO

rollback_authorized: NO

max_attempts: 1

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-REGRESSION-RECOVERY-001.md

## Objective

Determinar exhaustivamente qué capacidades conversacionales o rutas preexistentes de Director IA fueron alteradas, contaminadas o rotas por la integración de historical_margin; localizar el primer punto causal de cada regresión; y producir un contrato de recuperación que (A) recupere todo comportamiento preexistente defendible, (B) preserve historical_margin, (C) no restaure bugs antiguos, (D) no amplíe alcance, (E) no implemente nada en esta auditoría.

## Notes

El SHA `1f7774d7` es referencia de comportamiento pre-historical_margin. NO es autorización de rollback.

TESTS VERDES != ausencia de regresión conversacional.

LIVE_DB no bloquea la auditoría de continuidad. Mayo DATA_NOT_FOUND live es frente separable.

## Human production evidence (to verify, not assume)

Planta: Acapulco. SHA integrado: 50fb33e5.

- T1 «cual es el margen de mayo?» → historical_margin DATA_NOT_FOUND copy. Causa live mayo NOT_PROVEN.
- T2 «margen en mayo?» → equivalente historical_margin.
- T3 «cuanto fue la venta con su descuento por mes de febrero a abril?» → HTTP 500. El humano afirma que Director IA ya la había respondido. Probar ruta histórica; no asumirla.
- T4 «como vamos?» → «No pude resolver un periodo de margen histórico. No invento el mes.» REGRESIÓN CRÍTICA OBSERVADA.

## in_scope

- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-REGRESSION-RECOVERY-001.md
- read-only: lib/director-ia-conversation-state.js
- read-only: lib/director-ia-planner.js
- read-only: lib/director-ia-chat.js
- read-only: lib/director-ia-historical-margin.js
- read-only: lib/director-ia-conversational-executive-layer.js
- read-only: lib/director-ia-financial-diagnosis.js
- read-only: lib/director-ia-client-profile.js
- read-only: lib/director-ia-new-clients.js
- read-only: lib/director-ia-commercial-trend.js
- read-only: lib/director-ia-month-close-result.js
- read-only: lib/director-ia-igf-arr.js
- read-only: test/director-ia-*.test.js
- read-only: server.js (solo boundary HTTP/API)
- read-only: frontend Chat Director IA (HTTP error + conversation_state)
- git history / worktrees temporales detached (sin alterar commits)
- SELECT-only si DATABASE_URL ya está configurada (mayo separable)

## out_of_scope

- docs/director-ia/ (sin G2/G3)
- runtime edits
- revert / rollback a 1f7774d7
- quitar historical_margin
- cambiar INHERITABLE_INTENTS / planner / conversation-state
- server.js writes
- frontend writes
- SQL / schema / migrations / DB writes
- merge main / deploy / voice
- abrir implementación o next task
- cliente de mayor venta, rentabilidad, movers completos, Taller, AT-03, depósitos, tanques, baterías
- hardcode Acapulco/mayo/febrero/marzo/abril
- secretos

## contracts_in_force

- docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
- docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
- docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md
- docs/dev-loop/LOOP_PROTOCOL.md

## allowed_actions

- inspeccionar código, tests, git, frontend (read-only)
- comparar baseline 1f7774d7 vs current 50fb33e5 en worktrees temporales
- stubs/inyección determinística para routing (sin DB)
- SELECT-only si LIVE_DB ya existe
- ejecutar `node --test test/director-ia-*.test.js` en CURRENT (registrar; no añadir tests)
- escribir únicamente el reporte de auditoría listado
- actualizar solo status de esta CURRENT_TASK tras G1 (AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW)

## forbidden_actions

- escribir AUTHORIZED_BY_HUMAN
- poner status AUTHORIZED
- crear, borrar o modificar authorized_by, authorized_at o human_authorization
- aprobar gates G1–G8
- modificar runtime / planner / conversation-state / INHERITABLE_INTENTS
- revertir, merge, deploy
- implementar recuperación
- almacenar secretos

## Required work after G1 only

1. Reverificar hechos A–G (INHERITABLE_INTENTS, unknown inherit, planner substitution, detector exige margen, venta+descuento no es historical_margin, compare_months ≠ rango inclusivo, suite verde no cubre estas transiciones).
2. A/B reproducible baseline vs current para cada síntoma (campos de traza listados en el prompt de auditoría).
3. Clasificar cada caso: REGRESSION | PREEXISTING_GAP | NEW_CAPABILITY | EXPECTED_CHANGE | NOT_PROVEN.
4. Arqueología de la pregunta venta+descuento (A1–A7). No inventar capacidad nueva. No asumir feb–abr = dos endpoints.
5. Golden G1–G12 first-turn + H1–H10 after historical_margin parent. H10 expected intent solo después de probar baseline.
6. INHERITABLE_INTENT_TRANSITION_MATRIX completa (preguntas de fixtures existentes).
7. Continuidad propia M1–M3 (no proponer deshabilitar inherit de margen).
8. Trace HTTP 500 + post-error conversation_state / frontend.
9. FIRST_DIVERGENCE_FUNCTION / CONDITION / BASELINE / CURRENT / COMMIT por regresión.
10. Causalidad de commits: 1f7774d7, 93404936, 9afacbec, 1db7e005, e7e9b901, 50fb33e5. Documentar asimetría: 1db7e005 cubre executive→margin, no margin→executive.
11. LIVE_DB = PROVEN | NOT_PROVEN. Mayo no bloquea continuidad.
12. Registrar suite CURRENT. Si 1440/0: SUITE GREEN BUT REGRESSION NOT COVERED. Diseñar matriz de tests futuros; no añadir tests ahora.
13. Recovery invariants 1–7 (contrato, no código).
14. Reporte con secciones A–S del prompt.

## Completion (after authorized execution)

status: DONE_PENDING_REVIEW

STOP. NO IMPLEMENTATION. NO MERGE. NO DEPLOY. NO NEXT TASK.

## G1 (solo HUMAN_APPROVER)

Para autorizar, el humano debe escribir:

```
status: AUTHORIZED
authorized_by: "Human Approver"
authorized_at: "2026-09-01T18:03:20-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver approved AUDIT-DIRECTOR-IA-HISTORICAL-MARGIN-REGRESSION-RECOVERY-001 to compare pre-historical_margin behavior against current main, locate all regressions and define recovery requirements. Audit/read-only only. No implementation, rollback, merge, deploy or next task."
```

Sin esa línea exacta, escrita por humano, esta tarea no es ejecutable.
