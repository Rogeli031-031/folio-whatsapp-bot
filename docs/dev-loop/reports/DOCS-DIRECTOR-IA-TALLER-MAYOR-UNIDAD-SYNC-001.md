# Reporte — DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001

```yaml
task_id: "DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001"
outcome: "DONE_PENDING_REVIEW"
mode: "DOCUMENTATION_SYNC_ONLY"
implemented_capability: "taller_mayor"
source_strategy: "B — reusable Taller Mayor unit read model"
routing_strategy: "B — canonical taller_mayor parent"
implementation: false
code_changes: false
test_changes: false
contract_changes: false
sql_execution: false
matrix_changes: false
m5_complete: false
modules_changed: []
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "Taller Mayor unit read model is not module coverage. M5 remains PARTIAL."
director_ia_suite: "964/964"
focal_taller_mayor: "17/17"
git_diff_check: "clean"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-SYNC-001.md"
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
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-TALLER-MAYOR-UNIDAD-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp). M5 sigue PARTIAL."
```

## Resumen ejecutivo

La documentación quedó sincronizada con el runtime **ya integrado** de `taller_mayor` (source **B**, routing **B**).

**Identidad documentada:** `(planta_id, token canónico de public.folios.unidad)`. No económico. No placa. No unit master. No fuzzy. No merge cross-plant.

**Path documentado:**

```text
pregunta Taller Mayor / lista por unidad / follow-up del hilo
  → taller_mayor
  → planta + mes_cargo + token canónico
  → loadTallerMayorForChat
  → expand + recorte Mayor + agrupar por unidad
  → HILO
  → una llamada OpenAI
  → síntesis ejecutiva (GPT)
```

«El más alto» = unidad con mayor `SUM(importe)`. N Folios → `active_unit` sí, `active_folio` no silent pick. Con Folio activo, «¿Todavía se puede detener?» evalúa **ese** Folio (`classifyCancellationEligibility`); no abre IGF reviewable de planta.

**NEXT_TASK** (no autorizada, no ejecutada): `AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012`.

---

## Ejecución

- Rama: `docs/director-ia-taller-mayor-unidad-sync-001` (≠ `main`).
- HEAD: `a650c2dc Merge branch 'architecture/director-ia-taller-mayor-unidad-001'`.
- G1 intacto: `HUMAN_APPROVER` / `2026-08-24`. Solo se cambió `status`.
- `max_attempts: 1`. Sin código, tests, contratos, SQL, matriz, commit, push, merge.

---

## Qué se documentó en el inventario

En `docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`:

- Sección **Taller Mayor por unidad `taller_mayor`** (no es módulo M0–M20).
- Fuente de catálogo transversal del mismo read model.
- Routing chat, `parent_intent` inheritable, kinds `unit`/`folio`, slot `active_period_months`.
- Parte 4: lista, ranking, detalle, reviewability del Folio activo, historial, IGF hipotético filtrado.
- M5 / M13 / Parte 9: sync transversal; M5 **sigue PARTIAL**; M13 **sigue COMPLETA**.
- Scoring: suite **964/964**; 52.5% intacto.

Invariantes explícitos:

| Invariante | Documentado |
|------------|-------------|
| Source B / routing B | Sí. `lib/director-ia-taller-mayor.js` |
| Identidad `(planta_id, token canónico)` | Sí. No económico. No placa. No unit master. |
| Same plant / no fuzzy / no cross-plant | Sí |
| `REPARACIÓN MAYOR` / `matchTallerTipoCol` | Sí. No importe. No concepto. |
| «este mes» = YYYY-MM CDMX / `mes_cargo` | Sí |
| Lista agrupada + `SUM(importe)` | Sí |
| N Folios → no silent pick | Sí |
| `active_unit` / `active_folio` + requery | Sí |
| Reviewability del Folio activo | Sí. No hop IGF plant-wide. |
| reviewable ≠ cancelar/recomendación/ahorro/reversión | Sí. Read-only. |
| Historial same-plant + token; expansión explícita | Sí |
| Cross-domain IGF conserva Folio/unidad | Sí. No mutation. No savings. |
| GPT sintetiza; no diagnóstico mecánico | Sí |
| 52.5% / M5 PARTIAL | 10.5 / 20. 0.0 pp. |

Los ejemplos de hilo se marcan **no phrasebook de producción**.

Preservado: `folio_status`, `taller_at`, IGF reviewable plant-wide, `client_profile`, `commercial_trend`, brief diario, daily sales/discount, topic return, persistent memory.

Diferido: mantenimiento predictivo; catálogo/placa/económico; mutaciones; «mes pasado» robusto; overlay IGF de planta; Excel/duplicados M5.

---

## Evidencia de tests (citada; no reejecutada)

| Suite | Resultado |
|-------|-----------|
| Focal taller_mayor | **17/17** |
| Suite Director IA | **964/964** |
| `git diff --check` | clean |

---

## Porcentaje

10.5 / 20 = **52.5%**. **0.0 pp.** Esta sync no mueve módulos. M5 **sigue PARTIAL**.

---

## NEXT_TASK (exactamente una; no autorizada; no ejecutada)

`AUDIT-DIRECTOR-IA-PRODUCTION-CONVERSATION-GAP-012`

STOP.
