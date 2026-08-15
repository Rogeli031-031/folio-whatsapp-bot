# Reporte — ARCH-EKS-PHYSICAL-DECISIONS-002

```yaml
task_id: "ARCH-EKS-PHYSICAL-DECISIONS-002"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/dev-loop/reports/ARCH-EKS-PHYSICAL-DECISIONS-002.md"
files_not_touched:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/reports/ARCH-EKS-PHYSICAL-DECISIONS-001.md"
  - "docs/dev-loop/reports/IMPL-EKS-READINESS-002.md"
  - "código productivo"
  - "sql/"
  - "scripts/"
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/reports/ARCH-EKS-PHYSICAL-DECISIONS-001.md"
  - "docs/dev-loop/reports/IMPL-EKS-READINESS-002.md"
contracts_modified:
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-EKS-001 permanece no autorizado. Este reporte no es G5."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no abre implementación."
```

## Ejecución

- Rama: `architecture/eks-physical-decisions` (no `main`; no se cambió de rama).
- G1 intacto: `authorized_by`, `authorized_at`, `human_authorization` no modificados por el implementador.
- G2 leído: `G2_architecture_change: AUTHORIZED` (humano); usado solo para editar `03`.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → registro D1–D9 en `03` y este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `max_attempts: 1`. Sin runtime. Sin JS/TS/SQL de implementación. Sin commit, push, merge. Sin IMPL-EKS-001.

## Qué se registró en `03` v1.2

Únicamente `approved_architecture_decisions` de `CURRENT_TASK.md`, con el significado de `ARCH-EKS-PHYSICAL-DECISIONS-001`:

| ID | Valor registrado |
|----|------------------|
| D1 | P1 |
| D2 | R3 |
| D3 | V2 + UNIQUE(trace_id, version) |
| D4 | G_LATEST |
| D5 | L_TRACE |
| D6 | M1 |
| D7 | I_DIGEST (digest determinista sobre representación canónica; algoritmo **no** congelado) |
| D8 | POOL_DEDICATED |
| D9 | O_EKS_FIRST con fixtures `03B` |

Cambios en `03`:

- Versión 1.1 → 1.2.
- §3 `integrity` alineado a D7 (sin nombrar algoritmo; no firma IES).
- §4 `append_snapshot` / `get_snapshot` / `list_versions` alineados a D3–D5.
- Nueva §7 Realización física v1 (D1–D9).
- Implementación sigue **PENDIENTE**.
- No se corrigió la numeración duplicada de invariantes §6 (fuera de D1–D9).
- No se nombró PostgreSQL, JSONB ni SHA-256 como norma.

## Verificaciones

- `git diff --check`: sin errores.
- Otros contratos: no modificados.
- Código productivo: no modificado.
