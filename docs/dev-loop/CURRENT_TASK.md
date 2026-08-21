# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-STORAGE-DECISION-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T16:36:49-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21T16:36:49-06:00.
  G1 autorizado.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: PENDING_IF_REQUIRED
  G8_calibration_materiality_signature: N/A

objective: >
  Decidir exclusivamente el modelo físico mínimo de persistencia para
  query_context_metadata en EKS, partiendo del contrato vigente que la define
  como metadata del Snapshot y no del Knowledge Bundle. Comparar una columna
  JSONB nullable en eks.snapshots frente a una tabla EKS 1:1, elegir exactamente
  una opción y dejar el siguiente IMPL sin decisiones arquitectónicas abiertas.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-STORAGE-DECISION-001.md"

  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-METADATA-READINESS-001.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/04-INTERPRETATION-EVIDENCE-SNAPSHOT.md (solo lectura)"

  - "lib/director-ia-eks.js (solo lectura)"
  - "lib/director-ia-real-cycle.js (solo lectura)"
  - "lib/director-ia-real-input-arr.js (solo lectura)"
  - "lib/director-ia-ies-builder.js (solo lectura)"
  - "sql/015_director_ia_eks.sql (solo lectura)"
  - "scripts/apply-director-ia-eks-schema.js (solo lectura)"
  - "tests EKS relevantes (solo lectura)"

out_of_scope:
  - "implementar persistencia"
  - "modificar SQL"
  - "modificar PostgreSQL"
  - "modificar runtime"
  - "modificar contratos"
  - "crear migration"
  - "hacer smoke"
  - "commit"
  - "push"
  - "merge"
  - "crear siguiente implementación"

baseline_in_force:
  contract:
    - "query_context_metadata es metadata del Snapshot, no del Bundle"
    - "no participa en digest D7"
    - "D1-D9 permanecen intactos"
  runtime:
    - "query_context_metadata se crea antes del ciclo"
    - "no se persiste en eks.snapshots.bundle"
    - "se reinyecta en memoria antes de construir IES"
  production:
    - "EKS PostgreSQL ya existe en producción"
    - "eks.snapshots y eks.trace_locks están creadas"
    - "ciclo productivo real ya completó HTTP 200"

candidates:
  A_column_jsonb_nullable:
    description: >
      Agregar query_context_metadata JSONB NULL como sibling de bundle dentro
      de eks.snapshots.

  B_table_one_to_one:
    description: >
      Crear una tabla EKS separada 1:1 ligada al snapshot_id para almacenar
      query_context_metadata.

audit_questions:
  D1_contract_fit:
    question: >
      ¿Qué opción representa mejor "metadata del Snapshot" sin convertirla en
      parte del Bundle?

  D2_append_atomicity:
    question: >
      ¿Qué opción permite persistir snapshot + metadata con atomicidad más
      simple en el append actual?

  D3_read_path:
    question: >
      ¿Cuál simplifica más get_snapshot/list_versions/replay sin N+1 ni joins
      innecesarios?

  D4_backward_compatibility:
    question: >
      ¿Cuál soporta mejor snapshots históricos sin metadata mediante NULL/ausencia?

  D5_integrity:
    question: >
      Confirmar que ninguna opción debe incluir metadata en integrity/digest D7.

  D6_schema_complexity:
    question: >
      Comparar ALTER TABLE ADD COLUMN nullable frente a CREATE TABLE + PK/FK/
      lifecycle 1:1.

  D7_operational_risk:
    question: >
      ¿Cuál tiene menor riesgo de rollout en la PostgreSQL productiva existente?

  D8_concurrency:
    question: >
      ¿Cuál mantiene más naturalmente la transacción/locking/versionado EKS
      actual?

  D9_query_cost:
    question: >
      Evaluar costo de lectura/escritura y complejidad de índices.

  D10_data_lifecycle:
    question: >
      ¿La metadata tiene exactamente el mismo lifecycle que el snapshot o puede
      existir/actualizarse independientemente?

  D11_null_semantics:
    question: >
      ¿NULL en snapshots históricos es contractualmente aceptable y suficiente
      para fail-closed replay?

  D12_security:
    question: >
      ¿Alguna opción expone más riesgo de lectura accidental de metadata
      sensible?

  D13_migration:
    question: >
      Definir el DDL mínimo necesario para la opción elegida, sin ejecutarlo.

  D14_tests:
    question: >
      Definir tests mínimos obligatorios para append/get_snapshot/históricos/
      digest/atomicidad.

  D15_gates:
    question: >
      Determinar si implementar la opción elegida requiere G2/G3 o solo G1.

  D16_decision:
    question: >
      Elegir exactamente A o B. No dejar ambas abiertas.

mandatory_comparison_matrix:
  columns:
    - "criterion"
    - "A_column_jsonb_nullable"
    - "B_table_one_to_one"
    - "winner"
    - "evidence"

  rows:
    - "contract fit"
    - "append atomicity"
    - "read simplicity"
    - "backward compatibility"
    - "digest isolation"
    - "DDL complexity"
    - "production rollout risk"
    - "concurrency"
    - "query cost"
    - "lifecycle alignment"
    - "security"
    - "testability"

decision_rules:
  - "No persistir metadata dentro de bundle JSONB."
  - "No modificar D1-D9."
  - "No incluir metadata en digest/integrity."
  - "Preferir la opción de menor complejidad si ambas cumplen el contrato."
  - "No crear tabla separada si la metadata comparte exactamente lifecycle y atomicidad con snapshot sin beneficio demostrable."
  - "No elegir columna si el contrato/código exige lifecycle independiente."
  - "Históricos sin metadata deben seguir siendo legibles."
  - "No backfill salvo necesidad demostrada."
  - "No implementar."

required_output:
  - "decisión única A o B"
  - "rationale"
  - "DDL propuesto mínimo (no ejecutar)"
  - "impacto exacto en insertSnapshot"
  - "impacto exacto en get_snapshot"
  - "impacto en list_versions"
  - "impacto en replay/IES"
  - "compatibilidad histórica"
  - "impacto en integrity"
  - "tests requeridos"
  - "gates del siguiente IMPL"
  - "exactamente un NEXT_TASK"

acceptance_criteria:
  - "A y B comparados con evidencia física"
  - "una sola opción elegida"
  - "no queda decisión de storage abierta para implementación"
  - "DDL mínimo definido"
  - "compatibilidad histórica definida"
  - "digest D7 preservado"
  - "gates definidos"
  - "exactamente un NEXT_TASK"
  - "sin implementación"
  - "git diff --check limpio"
  - "solo CURRENT_TASK y reporte modificados"

expected_terminal_state: >
  DONE_PENDING_REVIEW si puede elegirse un modelo físico único conforme al
  contrato vigente. BLOCKED/STOPPED si elegir exige redefinir contrato.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-STORAGE-DECISION-001.md"

decision_result:
  outcome: DONE_PENDING_REVIEW
  chosen: A_column_jsonb_nullable
  rejected: B_table_one_to_one
  rationale: >
    03 §8 persiste metadata junto a las columnas de almacén; comparte lifecycle
    e INSERT atómico con el snapshot; NULL cubre históricos; menor complejidad
    que tabla 1:1. El IMPL no puede sustituir A por B.
  ddl_minimum: >
    ALTER TABLE eks.snapshots ADD COLUMN IF NOT EXISTS query_context_metadata JSONB;
  gates_for_impl:
    G1: required
    G2: not_required
    G3: not_required
    G8: N/A
  next_task_proposed: "IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001"
  next_task_not_authorized: true