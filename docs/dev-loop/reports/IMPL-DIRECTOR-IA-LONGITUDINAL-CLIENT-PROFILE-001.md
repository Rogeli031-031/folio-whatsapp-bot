# Reporte — IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001

```yaml
task_id: "IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
source_strategy: "B — reusable longitudinal client read model"
routing_strategy: "B — canonical client_profile parent"
new_intent: "client_profile"
phrasebook: false
second_llm_router: false
persistence: false
internal_http: false
income_actual: "UNSUPPORTED_METRIC"
period: "current_calendar_month_CDMX_plus_2_prior"
current_month: "PARTIAL"
destination: "chat legado (planner + conversation_state + in-process loader); NO Motor N1–N5; NO IES; NO Reasoning Engine; NO HTTP interno; NO persistencia"
g2: "N/A"
g3: "N/A"
g8: "N/A"
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Longitudinal client profile is not module coverage."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001.md"
  - "lib/director-ia-client-profile.js"
  - "lib/director-ia-chat.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-conversation-state.js"
  - "lib/director-ia-tools.js"
  - "test/director-ia-client-profile.test.js"
  - "test/director-ia-intra-session-topic-return.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "lib/director-ia-capabilities.js"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

**SOURCE B + ROUTING B implementados.**

Hay un read model reutilizable en `lib/director-ia-client-profile.js`. Alinea por mes calendario, antes de GPT: kg (`SUM`), descuento/kg (`SUM(monto)/SUM(kg)`), comments y DICF por `cliente_key`.

Intent padre: `client_profile`. Tras `active_entity` con `cliente_key`, «qué sabemos / tiene acciones / cómo ha comprado» **no** rehereda `commercial_trend`.

Ingreso actual: **UNSUPPORTED_METRIC**. No se inventa. No se pone 0. Action Register no se une (sin `cliente_key`).

**NEXT_TASK** (no autorizada, no ejecutada): `DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001`.

---

## Ejecución

- Rama: `implementation/director-ia-longitudinal-client-profile-001` (≠ `main`).
- HEAD base: `a9c98c4e Merge branch 'architecture/director-ia-longitudinal-client-profile-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin contratos, schema, SQL de producto, matriz, persistencia, commit, push, merge.

---

## Confirmaciones

| Requisito | Hecho |
|-----------|--------|
| Reusable profile | `loadClientProfileForChat` + `assembleClientProfilePack` |
| `client_profile` routing | planner + forceIntent + INHERITABLE |
| `cliente_key` | obligatorio; derive vía grupos DICF; no join por nombre |
| 3 months | mes actual CDMX + 2 previos |
| PARTIAL | mes actual abierto |
| kg/month | `SUM(kg)` alineado |
| discount/month | `SUM(monto)/SUM(kg)` |
| income unsupported | `UNSUPPORTED_METRIC`; prompt prohíbe 0 y fórmula-como-actual |
| comments/DICF | `cliente_key` only |
| trend handoff | pronoun/action + key → `client_profile`; requery fresco |
| actions boundary | DICF keyed; AR `supported: false` |
| tests | 947/947 |
| 52.5% | 0.0 pp |

---

## Routing B (sin phrasebook)

`trendFollowUp` ya no traga `pronoun`/`action` cuando hay `cliente_key` canónico y la pregunta es de perfil.

Handoff:

```text
commercial_trend → mover → active_entity
→ ¿Qué sabemos de él? → client_profile (requery)
```

Follow-ups del padre conservan keys, planta y `active_period_months`.

Holdouts («cuéntame cómo viene este cliente», etc.) generalizan por clase semántica y **no** están en `lib/`.

No se tocan: Taller Mayor, SEH, saludo, IGF mes cerrado, ingreso actual, schema.

Se preservan: `commercial_trend`, brief diario, daily sales/discount, action-person, topic return, IGF reviewable, persistent memory.

---

## Tests

| Suite | Resultado |
|-------|-----------|
| `test/director-ia-client-profile.test.js` | 14/14 |
| `node --test test/director-ia-*.test.js` | **947/947** |

Regresión de topic-return: `FRAME_ALLOWED` admite `active_period_months` (slot de estado, no evidencia).

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.**

---

## NEXT_TASK

Propuesta exacta, **no autorizada, no ejecutada**:

`DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001`

STOP.
