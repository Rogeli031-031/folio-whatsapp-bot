# Reporte — IMPL-EKS-INTEGRATION-001

```yaml
task_id: "IMPL-EKS-INTEGRATION-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EKS-INTEGRATION-001.md"
  - "lib/director-ia-eks.js"
  - "server.js"
  - "package.json"
  - ".env.example"
  - "test/director-ia-eks-integration.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "lib/director-ia-chat.js"
  - "sql/015_director_ia_eks.sql"
  - "scripts/apply-director-ia-eks-schema.js"
  - "test/director-ia-eks.test.js"
contracts_consulted:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Productor de Knowledge Bundle / Evidence Builder / IES siguen desconectados. Este reporte no es G5."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
```

## Ejecución

- Rama: `implementation/eks-integration-001` (no `main`; no se cambió de rama).
- G1 intacto: `authorized_by`, `authorized_at`, `human_authorization` no modificados por el implementador.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → integración mínima + tests + este reporte → `DONE_PENDING_REVIEW` (solo `status`).
- Pruebas: `node --test test/director-ia-eks.test.js test/director-ia-eks-integration.test.js` — 20 passed, 0 failed.
- Sin commit. Sin push. Sin merge. Sin siguiente tarea.

## Dónde quedó integrado EKS

| Sitio | Qué hace | Qué no hace |
|-------|----------|-------------|
| `lib/director-ia-eks.js` `createEksRuntime` | Lifecycle interno: `start` / `stop` / `getStatus`. Pool dedicado (D8). Flag `ENABLE_DIRECTOR_IA`. Reutiliza `DATABASE_URL` sin hardcodear. | No cambia `validate_structure` / `append_snapshot` / `get_snapshot` / `list_versions`. No append al start. |
| `server.js` | Tras crear el `Pool` operacional, `createEksRuntime({ operationalPool: pool })` + `start()`. `SIGTERM`/`SIGINT` llaman `stop()`. | No rutas `/eks`. No `append_snapshot`. No chat/dashboard. No lee tablas operacionales como conocimiento. |
| `.env.example` | Documenta `EKS_POOL_MAX` (no secreto) y que EKS sigue `ENABLE_DIRECTOR_IA`. | No copia `.env` real. |
| `package.json` | Script `test:eks`. | Sin dependencias nuevas. |

## Qué sigue deliberadamente desconectado

- Evidence Builder / Observation Pipeline / IES / Reasoning Engine / Channel Projection
- Chat (`lib/director-ia-chat.js`) y dashboard
- Endpoints HTTP públicos de EKS
- Comandos WhatsApp de EKS
- Persistencia automática de Snapshots desde flujos de negocio
- Aplicación automática del SQL M1 al arrancar (sigue siendo `scripts/apply-director-ia-eks-schema.js`)

## Comportamiento de configuración

- `ENABLE_DIRECTOR_IA` ausente/false → EKS deshabilitado, sin pool (mismo patrón que Director IA).
- Flag activo y sin `DATABASE_URL` → deshabilitado con warning; no aborta el proceso.
- Flag activo y `DATABASE_URL` presente → un pool dedicado ≠ pool operacional; `start()` idempotente.

## Verificaciones

- `git diff --check`: avisos solo en el encabezado humano de `CURRENT_TASK.md` (líneas 3, 4, 7). El implementador no los reescribió. Archivos de integración: sin avisos.
- `docs/director-ia/`: no modificado.
- Tests EKS existentes: pasan. Tests de integración: pasan.
- Sin LLM, sin endpoints públicos, sin `ON CONFLICT DO UPDATE` sobre Snapshots.
