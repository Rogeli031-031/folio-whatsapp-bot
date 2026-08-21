# CURRENT_TASK

```yaml
task_id: "MIGR-DIRECTOR-IA-EKS-QUERY-CONTEXT-METADATA-PROD-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T16:58:42-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21T16:58:42-06:00.
  G1 autorizado para aplicar sql/015_director_ia_eks.sql actualizado
  en la PostgreSQL productiva de folio-whatsapp-bot.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Aplicar en la PostgreSQL productiva de folio-whatsapp-bot el artefacto canónico
  sql/015_director_ia_eks.sql ya integrado en main para materializar la columna
  eks.snapshots.query_context_metadata JSONB nullable, verificarla de forma
  independiente y ejecutar exactamente un smoke autenticado posterior.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/MIGR-DIRECTOR-IA-EKS-QUERY-CONTEXT-METADATA-PROD-001.md"
  - "sql/015_director_ia_eks.sql (solo lectura)"
  - "scripts/apply-director-ia-eks-schema.js (solo lectura)"
  - "PostgreSQL productiva usada por folio-whatsapp-bot"
  - "verificación read-only en information_schema.columns"
  - "un único smoke autenticado posterior"

out_of_scope:
  - "modificar código"
  - "modificar SQL"
  - "modificar contratos"
  - "modificar Render env"
  - "modificar DATABASE_URL"
  - "backfill"
  - "UPDATE de snapshots históricos"
  - "crear índices adicionales"
  - "tabla 1:1"
  - "commit"
  - "push"
  - "merge"
  - "más de un smoke"

migration_artifact:
  canonical_file: "sql/015_director_ia_eks.sql"
  official_runner: "node scripts/apply-director-ia-eks-schema.js"
  expected_change:
    table: "eks.snapshots"
    column: "query_context_metadata"
    data_type: "jsonb"
    nullable: true
    backfill: false

preconditions:
  - "main integrado y desplegado con el cambio de sql/015"
  - "eks.snapshots existe"
  - "eks.trace_locks existe"
  - "no ejecutar DDL manual distinto al artefacto canónico"

execution_procedure:
  preferred:
    location: "Render Shell del Web Service folio-whatsapp-bot"
    command: "node scripts/apply-director-ia-eks-schema.js"
  fallback:
    location: "misma sesión pgAdmin de PostgreSQL productiva"
    rule: >
      abrir y ejecutar el archivo real sql/015_director_ia_eks.sql del repo,
      no copiar DDL desde chat.

post_migration_verification:
  query: >
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'eks'
      AND table_name = 'snapshots'
      AND column_name = 'query_context_metadata';
  required_result:
    column_name: "query_context_metadata"
    data_type: "jsonb"
    is_nullable: "YES"

smoke:
  max_attempts: 1
  base_url: "https://folio-whatsapp-bot.onrender.com"
  planta_id: 2
  year: 2026
  month: 8
  timeout_ms: 90000
  required_result:
    readiness_status: 200
    cycle_status: 200
    trace_id: "non-null"

smoke_interpretation:
  - "HTTP 200 del ciclo es obligatorio"
  - "trace_id no nulo es obligatorio"
  - "ABSTAIN es resultado válido"
  - "ACQUIRED_OK no implica conclusión de negocio"
  - "no repetir el smoke en esta tarea si falla"

stop_conditions:
  - "si el script de migración falla, STOP"
  - "si la columna no aparece como jsonb nullable, STOP"
  - "si el smoke devuelve distinto de 200, STOP"
  - "si trace_id es null, STOP"
  - "no ejecutar segundo smoke"

acceptance_criteria:
  - "artefacto canónico aplicado en producción"
  - "query_context_metadata existe en eks.snapshots"
  - "tipo jsonb"
  - "nullable YES"
  - "sin backfill"
  - "sin cambios de código"
  - "sin cambios de contratos"
  - "sin cambios de Render env"
  - "smoke autenticado HTTP 200"
  - "trace_id no nulo"
  - "reporte creado"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la migración productiva aplica correctamente,
  la columna queda verificada como JSONB nullable y el único smoke autenticado
  devuelve HTTP 200 con trace_id no nulo.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/MIGR-DIRECTOR-IA-EKS-QUERY-CONTEXT-METADATA-PROD-001.md"

documented_result:
  canonical_artifact_applied: "sql/015_director_ia_eks.sql"
  official_runner: "node scripts/apply-director-ia-eks-schema.js"
  column_exists: true
  table: "eks.snapshots"
  column: "query_context_metadata"
  data_type: "jsonb"
  is_nullable: "YES"
  backfill: false
  additional_db_changes: false
  independent_pgadmin_verification: "PASS"
  smoke_attempts: "1/1"
  smoke_readiness_status: 200
  smoke_enabled: true
  smoke_ready: true
  smoke_cycle_status: 200
  smoke_acquisition_status: "ACQUIRED_OK"
  smoke_trace_id: "trace_23_1ec35dbd-3453-49eb-9d2e-c8fb12b8ab44"
  smoke_trace_id_non_null: true
  production_criteria_satisfied: true
  note: >
    ACQUIRED_OK documenta que el ciclo operacional completó correctamente.
    No se interpreta como conclusión de negocio.
```