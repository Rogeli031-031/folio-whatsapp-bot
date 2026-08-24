# Reporte — DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
mode: "DOCUMENTATION_SYNC_ONLY"
implemented_capability: "client_profile"
source_strategy: "B — reusable longitudinal client read model"
routing_strategy: "B — canonical client_profile parent"
implementation: false
code_changes: false
test_changes: false
contract_changes: false
sql_execution: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Longitudinal client profile is not module coverage."
director_ia_suite: "947/947"
git_diff_check: "clean"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-SYNC-001.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "lib/"
  - "test/"
  - "scripts/"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-LONGITUDINAL-CLIENT-PROFILE-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
```

## Resumen ejecutivo

La documentación quedó sincronizada con el runtime **ya integrado** de `client_profile` (source **B**, routing **B**).

**Principio documentado:** una vez hay `cliente_key`, hablar de ese cliente no depende del módulo de origen.

**Path documentado:**

```text
pregunta de perfil / top volumen / follow-up de cliente activo
  → client_profile
  → resolver cliente_key + planta + meses
  → loadClientProfileForChat
  → alinear kg / descuento/kg / comments / DICF por mes
  → HILO
  → una llamada OpenAI
  → síntesis ejecutiva (GPT)
```

Handoff documentado:

```text
commercial_trend → mover → active_entity cliente_key
  → ¿Qué sabemos de él?
  → client_profile (fresh requery; no reusa evidencia de trend)
```

**NEXT_TASK** (no autorizada, no ejecutada): `AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011`.

---

## Ejecución

- Rama: `docs/director-ia-longitudinal-client-profile-sync-001` (≠ `main`).
- HEAD: `9b99dc79`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, commit, push, merge.

---

## Qué se documentó en el inventario

En `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`:

- Sección **Perfil longitudinal de cliente `client_profile`** (no es módulo M0–M20).
- Fuente de catálogo transversal del mismo read model.
- Routing chat, `parent_intent` inheritable, slot `active_period_months`.
- Handoff `commercial_trend` → perfil; el periodo de tendencia **no** es el del perfil.
- M8 / M9 / M11 / M12 / M13: sync transversal; M8 **sigue PARCIAL**; M9 **sigue COMPLETA**; M11 **sigue PARCIAL**; M12 **sigue PARCIAL**; M13 **sigue COMPLETA**.
- Parte 4: handoff + follow-ups de perfil + ingreso unsupported.
- Parte 9 / scoring: suite **947/947**; 52.5% intacto.

Invariantes explícitos:

| Invariante | Documentado |
|------------|-------------|
| Source B / routing B | Sí. `lib/director-ia-client-profile.js` |
| `cliente_key` obligatorio | Sí. No `cliente_nombre`. No fuzzy. |
| 3 meses calendario CDMX | Sí. Actual PARTIAL. Previos COMPLETE. |
| 3M calendario ≠ 90d trailing | Sí. Distinto de `commercial_trend`. |
| kg/mes = `SUM(kg)` | Sí |
| descuento/kg = `SUM(monto)/SUM(kg)` | Sí. No AVG de ratios. |
| Ingreso actual = `UNSUPPORTED_METRIC` | Sí. Fórmula DICF no es actual. No 0. No disfrazar forecast. |
| Comments / DICF keyed | Sí. Comentario ≠ causa. Acción ≠ resultado. |
| Action Register sin `cliente_key` | Sí. No join inventado. Acciones de cliente = DICF. |
| Handoff trend → perfil + requery | Sí. No reusa evidencia de trend. |
| Follow-ups conservan identidad/periodo | Sí |
| Coincidencia temporal ≠ causalidad | Sí |
| Partial-data; missing ≠ zero | Sí |
| 52.5% | 10.5 / 20. 0.0 pp. |

Los ejemplos de hilo se marcan **no phrasebook de producción**.

Preservado: `commercial_trend`, brief diario, daily sales/discount, cross-metric, action-person, topic return, IGF reviewable, persistent memory.

Diferido: fuente de ingreso mensual actual; Taller Mayor; SEH; saludo; closed-month IGF.

---

## Evidencia de tests (citada; no reejecutada)

| Suite | Resultado |
|-------|-----------|
| Focal client_profile | **14/14** |
| Suite Director IA | **947/947** |
| `git diff --check` | clean |

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.** Esta sync no mueve módulos.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-011`

STOP.
