# CURRENT_TASK

```yaml
task_id: "MIGR-DIRECTOR-IA-EKS-PROD-SCHEMA-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Aplicar en la PostgreSQL productiva usada por folio-whatsapp-bot el artefacto
  canónico sql/015_director_ia_eks.sql ya versionado en main, verificar la
  existencia de eks.snapshots y eks.trace_locks, y ejecutar exactamente un
  smoke autenticado posterior solo si ambas tablas existen.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "sql/015_director_ia_eks.sql (solo lectura)"
  - "scripts/apply-director-ia-eks-schema.js (solo lectura)"
  - "PostgreSQL productiva de folio-whatsapp-bot"
  - "verificación read-only con to_regclass"
  - "un único smoke autenticado post-migración"

out_of_scope:
  - "modificar código"
  - "modificar sql/015_director_ia_eks.sql"
  - "crear migrations nuevas"
  - "modificar contratos"
  - "modificar Render config/env"
  - "modificar DATABASE_URL"
  - "commit"
  - "push"
  - "merge"
  - "cualquier DDL distinto al artefacto canónico 015"

execution_procedure:
  preferred:
    - "Render Shell del Web Service folio-whatsapp-bot"
    - "ejecutar exactamente: node scripts/apply-director-ia-eks-schema.js"
  fallback:
    - "si no existe Shell, abrir el archivo real sql/015_director_ia_eks.sql en la misma sesión pgAdmin donde to_regclass devolvió NULL"
    - "no copiar DDL desde chat"
    - "envolver en BEGIN/COMMIT si se usa pgAdmin"

pre_migration_evidence:
  database_check:
    query: >
      SELECT to_regclass('eks.snapshots') AS snapshots,
      to_regclass('eks.trace_locks') AS trace_locks;
    snapshots: null
    trace_locks: null
    result: "EKS_SCHEMA_MISSING"

  production_failure:
    event: "cycle_request_failed"
    request_id: "5838a0df-453d-49e7-8c0b-55818e5a9b93"
    planta_id: 2
    duration_ms: 740
    http_status: 500
    code: "INTERNAL_ERROR"
    result: "PRE_MIGRATION_FAILURE"

migration_result:
  executed_by: "HUMAN_OPERATOR"
  mechanism: "Render Shell del Web Service folio-whatsapp-bot"
  command: "node scripts/apply-director-ia-eks-schema.js"
  result: PASS
  script_output:
    snapshots: "eks.snapshots"
    trace_locks: "eks.trace_locks"

post_migration_gate:
  verification_method: "pgAdmin sobre la misma PostgreSQL productiva previamente inspeccionada"
  query: >
    SELECT to_regclass('eks.snapshots') AS snapshots,
    to_regclass('eks.trace_locks') AS trace_locks;
  required_result:
    snapshots: "eks.snapshots"
    trace_locks: "eks.trace_locks"
  observed_result:
    snapshots: "eks.snapshots"
    trace_locks: "eks.trace_locks"
  result: PASS

production_smoke:
  base_url: "https://folio-whatsapp-bot.onrender.com"
  planta_id: 2
  year: 2026
  month: 8
  timeout_ms: 90000

  readiness:
    status: 200
    enabled: true
    ready: true
    result: PASS

  cycle:
    http_status: 200
    acquisition_status: "ACQUIRED_OK"
    ies_status: "VALIDATED"
    reasoning_status: "ABSTAIN"
    trace_id: "trace_4_80881100-54c7-4fc2-8233-13687043119d"
    duration_ms: 1136
    result: PASS

  production_log_confirmation:
    event: "cycle_request_completed"
    request_id: "38602d55-6b7f-4f99-a851-0748aa2f8581"
    planta_id: 2
    http_status: 200
    acquisition_status: "ACQUIRED_OK"
    ies_status: "VALIDATED"
    reasoning_status: "ABSTAIN"
    trace_id: "trace_4_80881100-54c7-4fc2-8233-13687043119d"
    duration_ms: 1136
    result: PASS

production_evidence:
  interpretation: >
    El HTTP 500 observado antes de la migración ocurrió cuando eks.snapshots y
    eks.trace_locks no existían en la PostgreSQL productiva. Después de aplicar
    el artefacto canónico sql/015_director_ia_eks.sql y verificar ambas tablas
    mediante to_regclass, el ciclo autenticado productivo completó con HTTP 200,
    ACQUIRED_OK, IES VALIDATED y trace_id no nulo.

  reasoning_status_note: >
    reasoning_status ABSTAIN es un resultado fail-closed válido del Reasoning
    Engine y no constituye fallo del smoke ni del ciclo.

acceptance_criteria:
  canonical_015_applied: PASS
  eks_snapshots_exists: PASS
  eks_trace_locks_exists: PASS
  readiness_http_200: PASS
  readiness_enabled: PASS
  readiness_ready: PASS
  authenticated_production_cycle_http_200: PASS
  acquisition_ok: PASS
  ies_validated: PASS
  trace_id_non_null: PASS
  production_log_completed_event: PASS
  no_code_changes_required: PASS
  no_contract_changes_required: PASS
  no_render_env_changes_required: PASS

final_result: PASS

review_note: >
  MIGR-DIRECTOR-IA-EKS-PROD-SCHEMA-001 cumplió el objetivo autorizado:
  el schema EKS productivo fue creado mediante el script oficial del repo,
  verificado independientemente en PostgreSQL y validado con un ciclo real
  autenticado de planta 2 / agosto 2026. No se requieren más smokes dentro
  de esta tarea.

next_action: >
  Revisión humana para transición de DONE_PENDING_REVIEW a CLOSED.
  No ejecutar más cambios productivos dentro de esta tarea.

expected_terminal_state: >
  DONE_PENDING_REVIEW si la migración canónica aplica correctamente,
  ambas tablas existen y el smoke autenticado devuelve status 200
  con trace_id no nulo.

max_attempts: 1
