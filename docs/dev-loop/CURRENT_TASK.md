# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-EKS-PHYSICAL-DECISIONS-002"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: AUTHORIZED
  G3_new_architecture_contract: N/A

objective: >
  Formalizar en el contrato 03 las decisiones de arquitectura física del
  Executive Knowledge Store (EKS) aprobadas por HUMAN_APPROVER a partir
  de la evidencia y recomendaciones producidas por
  ARCH-EKS-PHYSICAL-DECISIONS-001, sin implementar runtime productivo.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EKS-PHYSICAL-DECISIONS-001.md"
  - "docs/dev-loop/reports/ARCH-EKS-PHYSICAL-DECISIONS-002.md"
  - "docs/dev-loop/reports/IMPL-EKS-READINESS-002.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "lectura de contratos relacionados únicamente para verificar compatibilidad"

out_of_scope:
  - "escribir código runtime productivo"
  - "crear implementación EKS"
  - "crear archivos .js, .ts o SQL de implementación"
  - "modificar 04-IES-STANDARD.md"
  - "modificar 05-REASONING-ENGINE.md"
  - "modificar 06-CHANNEL-PROJECTION.md"
  - "modificar DIRECTOR_IA_CONSTITUTION.md"
  - "modificar LOOP_PROTOCOL.md"
  - "modificar TASK_TEMPLATE.md"
  - "tomar nuevas decisiones arquitectónicas no aprobadas"
  - "commit"
  - "push"
  - "merge"
  - "crear o ejecutar IMPL-EKS-001"
  - "encadenar otra tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

approved_architecture_decisions:
  D1_persistence_engine_colocation: "P1"
  D2_snapshot_representation: "R3"
  D3_versioning_concurrency: "V2 + UNIQUE(trace_id, version)"
  D4_get_snapshot_semantics: "G_LATEST"
  D5_list_versions_grouping: "L_TRACE"
  D6_migration_strategy: "M1"
  D7_integrity: >
    I_DIGEST. El contrato debe exigir un digest criptográfico determinista
    sobre una representación canónica. El algoritmo criptográfico específico
    permanece como decisión de implementación y no debe congelarse en 03.
  D8_connection_pool: "POOL_DEDICATED"
  D9_implementation_order: "O_EKS_FIRST using 03B fixtures"

allowed_actions:
  - "leer la evidencia producida por ARCH-EKS-PHYSICAL-DECISIONS-001"
  - "leer IMPL-EKS-READINESS-002"
  - "verificar compatibilidad con contracts_in_force"
  - "registrar únicamente las decisiones D1-D9 aprobadas"
  - "modificar 03-EXECUTIVE-KNOWLEDGE-STORE.md únicamente si G2 es autorizado"
  - "crear el reporte obligatorio"
  - "actualizar CURRENT_TASK mediante las transiciones permitidas por LOOP_PROTOCOL.md"

forbidden_actions:
  - "reinterpretar o sustituir las decisiones D1-D9"
  - "introducir nuevas decisiones arquitectónicas"
  - "seleccionar un algoritmo criptográfico específico para D7"
  - "modificar contratos fuera de 03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "implementar EKS"
  - "escribir código productivo"
  - "autoaprobar G1"
  - "autoaprobar G2"
  - "escribir AUTHORIZED_BY_HUMAN"
  - "commit"
  - "push"
  - "merge"
  - "crear o ejecutar la siguiente tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-EKS-PHYSICAL-DECISIONS-002.md"