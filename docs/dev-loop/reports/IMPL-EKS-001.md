# Reporte — IMPL-EKS-001

```yaml
task_id: "IMPL-EKS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EKS-001.md"
  - "lib/director-ia-eks.js"
  - "sql/015_director_ia_eks.sql"
  - "scripts/apply-director-ia-eks-schema.js"
  - "test/director-ia-eks.test.js"
  - "fixtures/director-ia/eks/case-a-03b.json"
  - "fixtures/director-ia/eks/case-b-03b.json"
files_not_touched:
  - "docs/director-ia/"
  - "server.js"
  - "package.json"
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "código productivo fuera de in_scope"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Integración de EKS a server/chat/dashboard permanece no autorizada. Este reporte no es G5."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "Aplicar sql/015_director_ia_eks.sql en un entorno no productivo es decisión operativa humana; esta tarea no lo ejecutó contra una base real."
```

## Ejecución

- Rama: `implementation/eks-001` (no `main`; no se cambió de rama).
- G1 intacto: `authorized_by`, `authorized_at`, `human_authorization` no modificados por el implementador.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → runtime mínimo + tests + este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- `node --test test/director-ia-eks.test.js`: 11 passed, 0 failed.
- Sin commit. Sin push. Sin merge. Sin integración a `server.js`. Sin IMPL siguiente.

## D1–D9 aplicadas

| ID | Cómo |
|----|------|
| D1 P1 | Esquema/tablas nuevas `eks.snapshots` y `eks.trace_locks`. `createDedicatedPool` usa el mismo tipo de motor/`DATABASE_URL` que el producto, sin tocar tablas operacionales. |
| D2 R3 | Metadatos de almacén + columna `bundle` opaca (encoding JSONB en SQL; no descompone N2–N4). |
| D3 | `max(version)+1` bajo bloqueo por `trace_id`; `UNIQUE(trace_id, version)`; solo INSERT. |
| D4 G_LATEST | `get_snapshot({ snapshot_id })` exacto; `get_snapshot({ trace_id })` versión máxima. |
| D5 L_TRACE | `list_versions(trace_id)` ordenado por `version`. |
| D6 M1 | `sql/015_director_ia_eks.sql` + `scripts/apply-director-ia-eks-schema.js` (`CREATE IF NOT EXISTS`, objetos nuevos). |
| D7 I_DIGEST | Digest determinista sobre JSON canónico (claves ordenadas). Algoritmo de **realización** (documentado abajo); no se congeló en `03`. No es firma IES. |
| D8 | `createDedicatedPool` — Pool propio, no el de `server.js`. |
| D9 | Fixtures 03B A/B; EB no implementado; cifras marcadas ficticias. |

## Decisión de implementación (no contractual) — D7

Realización: `sha256` hex con prefijo `sha256:` sobre `canonicalJson(bundle)`. El contrato 03 no nombra algoritmo.

## Tests

Cubiertos: Bundle A con diagnósticos; Bundle B `NO_CONOZCO` sin diagnósticos; rechazo no-Bundle; append v1/v2; inmutabilidad de v1 y del objeto de entrada; get por id; get latest; list ordenado; integrity estable; concurrencia de version; guards de SQL/runtime append-only.

Almacén de las pruebas locales: memoria con la misma semántica append-only (para no usar datos productivos ni `.env`). Persistencia P1 en motor de aplicación: SQL + `createEks({ pool })`.

## Gaps

- El repo ya tenía `sql/015_director_ia_bitacora_normalize_planta.sql`. El archivo autorizado `sql/015_director_ia_eks.sql` convive con otro `015_*`. No se renumeró (fuera de in_scope).
- El apply script no se ejecutó contra ninguna base (prohibido leer producción / copiar secretos).
- EKS no está cableado a `server.js`, chat ni dashboard.
- `03` sigue declarando implementación PENDIENTE en control documental (G2 no autorizado en esta tarea).

## Verificaciones

- `git diff --check`: aviso de trailing whitespace en línea 27 de `CURRENT_TASK.md` (YAML humano; el implementador no la reescribió; solo cambió `status`). Archivos nuevos de esta tarea: sin avisos.
- `docs/director-ia/`: no modificado.
- `server.js`: no modificado.
- Runtime: sin LLM, sin tools, sin `ON CONFLICT DO UPDATE` sobre snapshots, sin mutación de snapshots.
