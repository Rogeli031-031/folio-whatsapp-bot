# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T16:45:00-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21T16:45:00-06:00.
  G1 autorizado.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Persistir query_context_metadata como metadata sibling del Snapshot EKS
  mediante una columna JSONB nullable en eks.snapshots, conforme a la decisión
  arquitectónica cerrada en
  ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-STORAGE-DECISION-001. Mantener intactos
  D1-D9, el digest D7 sobre bundle, la semántica append-only, el lifecycle del
  snapshot y la compatibilidad con snapshots históricos sin metadata.

architecture_decision_in_force:
  storage_model: "A_column_jsonb_nullable"
  table: "eks.snapshots"
  column: "query_context_metadata"
  type: "JSONB"
  nullable: true
  table_one_to_one: false
  backfill_required: false
  historical_null_allowed: true
  digest_d7_includes_metadata: false

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001.md"

  - "lib/director-ia-eks.js"
  - "lib/director-ia-real-input-arr.js"
  - "lib/director-ia-real-cycle.js"
  - "lib/director-ia-ies-builder.js (solo si hace falta preservar lectura/fail-closed sin cambio contractual)"

  - "sql/015_director_ia_eks.sql"
  - "scripts/apply-director-ia-eks-schema.js (solo si requiere verificación de nueva columna sin cambiar su propósito)"

  - "tests EKS relevantes"
  - "tests real-input-arr / real-cycle relevantes"
  - "tests nuevos focales si son necesarios"

out_of_scope:
  - "tabla EKS 1:1"
  - "persistir query_context_metadata dentro de bundle"
  - "incluir query_context_metadata en D7/integrity"
  - "modificar D1-D9"
  - "crear contrato nuevo"
  - "backfill de snapshots históricos"
  - "reescribir snapshots existentes"
  - "modificar semántica ARR/OP/EB/IES/RE/CP"
  - "modificar frontend"
  - "modificar endpoint HTTP salvo plumbing estrictamente necesario"
  - "retry"
  - "persistencia adicional"
  - "nuevas dependencias"
  - "package.json"
  - "lockfiles"
  - "commit"
  - "push"
  - "merge"
  - "chain next task"

required_ddl:
  canonical_change: >
    ALTER TABLE eks.snapshots
      ADD COLUMN IF NOT EXISTS query_context_metadata JSONB;
  constraints:
    - "nullable"
    - "sin default materializado"
    - "sin backfill"
    - "sin index salvo necesidad demostrada y autorizada"
    - "sin cambio en bundle"
    - "sin cambio en integrity"

required_runtime_behavior:
  append_snapshot:
    - "persistir query_context_metadata en la misma transacción del snapshot"
    - "preservar locking/versionado actual"
    - "metadata y snapshot deben compartir atomicidad"
    - "si metadata no existe, persistir NULL"
    - "no modificar bundle antes de calcular/persistir integrity"

  get_snapshot:
    - "devolver query_context_metadata como sibling del snapshot"
    - "snapshots históricos con NULL deben seguir siendo legibles"
    - "no fabricar metadata"

  list_versions:
    - "preservar comportamiento actual"
    - "no requerir cargar metadata si hoy solo lista versiones"
    - "no introducir N+1"

  replay_ies:
    - >
      si query_context_metadata está presente, permitir que el consumidor use
      la metadata persistida en lugar de depender exclusivamente de reinyección
      en memoria.
    - >
      si un snapshot histórico tiene NULL y IES requiere esa metadata para una
      conclusión segura, mantener comportamiento fail-closed.
    - "no inferir ni reconstruir metadata ausente"

  integrity:
    - "D7 se mantiene calculado exclusivamente sobre bundle"
    - "query_context_metadata no cambia integrity existente"
    - "persistir metadata no debe invalidar snapshots históricos"

migration_rules:
  - "actualizar sql/015_director_ia_eks.sql de forma idempotente"
  - >
    el SQL debe soportar tanto DB nueva como DB productiva donde eks.snapshots
    ya existe.
  - "no modificar datos existentes"
  - "no DROP/TRUNCATE/DELETE/UPDATE"
  - "no aplicar migración productiva desde Cursor"
  - >
    si hace falta acto humano posterior en producción, documentarlo en el
    reporte y STOP antes de ejecutarlo.

required_tests:
  schema:
    - "schema nuevo incluye query_context_metadata JSONB nullable"
    - "aplicar SQL sobre tabla existente agrega columna sin backfill"
    - "reaplicar SQL es idempotente"

  append:
    - "append con metadata la persiste"
    - "append sin metadata persiste NULL"
    - "bundle persistido no contiene query_context_metadata"
    - "integrity no cambia por metadata"
    - "metadata se escribe dentro de la misma transacción"

  get_snapshot:
    - "devuelve metadata presente"
    - "devuelve NULL/ausencia explícita para histórico sin metadata"
    - "no muta el bundle"

  list_versions:
    - "regresión sin cambio semántico"

  real_cycle:
    - >
      el ciclo nuevo puede recuperar/propagar la metadata persistida sin
      introducir una segunda fuente contradictoria.
    - "ARR/OP/EB/EKS/IES/RE/CP sigue verde"
    - "no cambia estados fail-closed"

  backward_compatibility:
    - "snapshot histórico sin columna/valor sigue legible tras migration"
    - "sin backfill"

  regression:
    - "EKS suites verdes"
    - "real-input-arr verdes"
    - "real-cycle verdes"
    - "test/director-ia-*.test.js verdes"

acceptance_criteria:
  - "query_context_metadata persiste como columna sibling JSONB nullable"
  - "no tabla 1:1"
  - "no metadata dentro de bundle"
  - "D7 intacto"
  - "append snapshot + metadata atómico"
  - "get_snapshot devuelve metadata"
  - "históricos NULL compatibles"
  - "sin backfill"
  - "sql/015 idempotente"
  - "sin código frontend"
  - "sin cambio contractual"
  - "sin nuevas dependencias"
  - "G2/G3/G8 no usados"
  - "focused tests verdes"
  - "full Director IA regression verde"
  - "git diff --check limpio"
  - "reporte creado"

production_followup:
  required_if_code_passes: true
  actions:
    - >
      aplicar el artefacto SQL canónico actualizado a la PostgreSQL productiva
      mediante acto humano separado y autorizado.
    - >
      verificar read-only que information_schema.columns contiene
      eks.snapshots.query_context_metadata con data_type jsonb y nullable.
    - >
      ejecutar como máximo un smoke autenticado posterior si el loop humano lo
      autoriza.
  prohibited_during_this_task:
    - "ejecutar ALTER TABLE en producción"
    - "ejecutar smoke productivo"
    - "modificar Render env"

conditional_stop_conditions:
  - >
    si implementar la columna obliga a redefinir D1-D9 o el modelo de Snapshot,
    STOP.
  - >
    si resulta necesaria tabla 1:1, STOP: contradice la decisión arquitectónica
    cerrada.
  - >
    si metadata debe entrar en digest/integrity, STOP: requiere nueva decisión.
  - >
    si hace falta backfill para que el sistema funcione, STOP y reportar.
  - >
    si aparece necesidad de G2/G3/G8, STOP.

forbidden_actions:
  - "modificar contratos"
  - "tabla 1:1"
  - "backfill"
  - "cambiar integrity"
  - "migrar producción"
  - "hacer smoke productivo"
  - "add dependencies"
  - "commit"
  - "push"
  - "merge"
  - "chain next task"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la persistencia sibling queda implementada y testeada
  localmente, con SQL idempotente listo para un acto humano posterior en
  producción.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001.md"