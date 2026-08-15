# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-EKS-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15T14:12:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A


objective: >
  Implementar el runtime mínimo del Executive Knowledge Store (EKS) conforme a
  docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md v1.2, aplicando exactamente
  las decisiones físicas D1-D9 ya aprobadas por HUMAN_APPROVER, usando fixtures
  contractuales de 03B como entrada de prueba y sin modificar contratos
  arquitectónicos.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EKS-001.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"
  - "package.json (solo lectura)"
  - "server.js (solo lectura, únicamente para reutilizar patrones de conexión compatibles)"
  - "lib/director-ia-eks.js"
  - "sql/015_director_ia_eks.sql"
  - "scripts/apply-director-ia-eks-schema.js"
  - "test/director-ia-eks.test.js"
  - "fixtures/director-ia/eks/"

out_of_scope:
  - "modificar cualquier archivo en docs/director-ia/"
  - "modificar la Constitución"
  - "modificar 04-IES-STANDARD.md"
  - "modificar 05-REASONING-ENGINE.md"
  - "modificar 06-CHANNEL-PROJECTION.md"
  - "implementar Evidence Builder"
  - "implementar IES Builder"
  - "implementar Reasoning Engine"
  - "implementar Channel Projection"
  - "conectar EKS a fuentes operacionales"
  - "leer ARR, IGF, folios, bitácora u otras tablas operacionales para generar conocimiento"
  - "añadir LLM o IA dentro de EKS"
  - "recalcular confidence, materiality, coverage, facts, evidence o diagnosis"
  - "modificar Bundle recibido"
  - "usar UPDATE o DELETE sobre Snapshots persistidos"
  - "usar ON CONFLICT DO UPDATE para Snapshots"
  - "fijar un algoritmo criptográfico específico como contrato arquitectónico"
  - "modificar meta-protocolo"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

approved_physical_decisions:
  D1_persistence_engine_colocation: "P1"
  D2_snapshot_representation: "R3"
  D3_versioning_concurrency: "V2 + UNIQUE(trace_id, version)"
  D4_get_snapshot_semantics: "G_LATEST"
  D5_list_versions_grouping: "L_TRACE"
  D6_migration_strategy: "M1"
  D7_integrity: >
    I_DIGEST. Implementar un digest criptográfico determinista sobre una
    representación canónica del Snapshot. El contrato no congela algoritmo;
    la implementación puede elegir uno compatible y documentarlo en el reporte.
  D8_connection_pool: "POOL_DEDICATED"
  D9_implementation_order: "O_EKS_FIRST using 03B fixtures"

required_runtime_interfaces:
  - "validate_structure(bundle)"
  - "append_snapshot(bundle)"
  - "get_snapshot({ snapshot_id })"
  - "get_snapshot({ trace_id }) -> latest version"
  - "list_versions(trace_id)"

implementation_rules:
  - "EKS es mecánico y determinista"
  - "entrada = Knowledge Bundle"
  - "salida = Knowledge Snapshot"
  - "Snapshot persistido es inmutable"
  - "Bundle debe preservarse íntegro, sin reinterpretación"
  - "cada append produce una nueva version monotónica por trace_id"
  - "UNIQUE(trace_id, version) debe proteger el historial"
  - "la asignación de version debe ser segura ante concurrencia"
  - "get_snapshot(trace_id) devuelve la versión más reciente"
  - "list_versions se agrupa por trace_id"
  - "persistencia física separada de tablas operacionales"
  - "usar pool dedicado lógico para EKS"
  - "migración conforme al patrón M1: SQL numerado + script apply-*"
  - "integrity debe detectar mutación del contenido persistido"
  - "NO_CONOZCO y snapshots sin diagnósticos son casos válidos"

fixtures_and_tests:
  - "crear fixtures derivados únicamente de los casos ilustrativos A y B de 03B"
  - "mantener explícitamente que todas las cifras de 03B son ficticias"
  - "probar Bundle válido con diagnósticos"
  - "probar Bundle válido NO_CONOZCO sin diagnósticos"
  - "probar rechazo de payload que no sea Knowledge Bundle"
  - "probar append v1 y v2 para el mismo trace_id"
  - "probar que v1 permanece inmutable"
  - "probar get_snapshot por snapshot_id"
  - "probar get_snapshot por trace_id devuelve latest"
  - "probar list_versions ordenado por version"
  - "probar integrity estable al releer"
  - "probar que no se modifica el Bundle de entrada"

acceptance_criteria:
  - "git diff --check sin errores"
  - "tests del EKS pasan"
  - "ningún archivo de docs/director-ia/ modificado"
  - "ningún contrato redefinido"
  - "runtime EKS implementa validate_structure, append_snapshot, get_snapshot y list_versions"
  - "schema EKS usa almacenamiento append-only"
  - "no existe UPDATE/DELETE de Snapshot en el runtime"
  - "no existe ON CONFLICT DO UPDATE sobre Snapshot"
  - "no hay llamadas a LLM ni tools operacionales"
  - "fixtures 03B A/B cubiertos"
  - "reporte documenta archivos creados, decisiones de implementación y cualquier gap encontrado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer patrones actuales de pg/configuración en modo solo lectura"
  - "crear lib/director-ia-eks.js"
  - "crear sql/015_director_ia_eks.sql"
  - "crear scripts/apply-director-ia-eks-schema.js"
  - "crear test/director-ia-eks.test.js"
  - "crear fixtures bajo fixtures/director-ia/eks/"
  - "ejecutar pruebas locales permitidas"
  - "ejecutar git diff --check"
  - "crear el reporte obligatorio"
  - "actualizar CURRENT_TASK mediante transiciones permitidas por LOOP_PROTOCOL.md"

forbidden_actions:
  - "modificar contratos"
  - "modificar código productivo fuera de los archivos explícitamente in_scope"
  - "integrar EKS al chat, dashboard o server runtime principal"
  - "leer datos de producción"
  - "copiar secretos o .env"
  - "crear conocimiento desde fuentes operacionales"
  - "implementar niveles N1-N4"
  - "implementar IES"
  - "implementar N5"
  - "autoaprobar gates"
  - "commit"
  - "push"
  - "merge"
  - "encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-EKS-001.md"