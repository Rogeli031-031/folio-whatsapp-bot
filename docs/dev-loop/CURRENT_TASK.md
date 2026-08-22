# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-M16-CAPABILITY-MATRIX-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T21:51:51-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21T21:51:51-06:00.
  Apruebo DOCS-DIRECTOR-IA-M16-CAPABILITY-MATRIX-SYNC-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

result:
  report: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M16-CAPABILITY-MATRIX-SYNC-001.md"
  m16_previous: "NOT_STARTED / NO INTEGRADA"
  m16_after: "COMPLETE"
  g2: N/A
  percentage_before: 32.5
  percentage_after: 37.5
  next_task_authorized: false

objective: >
  Sincronizar exclusivamente la capability matrix M0-M20 para reflejar el
  estado real de M16 — análisis de posibles duplicados de folios — ya integrado
  en main, determinando si la evidencia física satisface la definición canónica
  de COMPLETE sin redefinir arquitectura ni ampliar M16 a mutaciones.

baseline_in_force:
  source_readiness: "ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001"
  implementation_task: "IMPL-DIRECTOR-IA-M16-DUPLICADOS-001"
  implementation_state: "integrated_in_main"
  current_matrix_state: "NOT_STARTED"
  expected_state_if_evidence_matches: "COMPLETE"
  current_m0_m20_percentage: 32.5
  target_m0_m20_percentage_if_complete: 37.5

implemented_capability:
  mode: "read_only"
  semantics: "possible_duplicates_only"
  path:
    - "pregunta"
    - "duplicate_folios"
    - "get_duplicate_folios"
    - "executor read-only"
    - "loadDuplicateFoliosForChat"
    - "loadFoliosParaDuplicados"
    - "findDuplicatePairs"
    - "evidencia estructurada"
    - "respuesta Director IA"
  internal_http: false
  cycle_integration: false
  new_ui: false
  mutations: false
  authz_preserved: true
  heuristic:
    same_rounded_amount: true
    concept_similarity_threshold: 0.72
    confirmed_duplicate: false

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M16-CAPABILITY-MATRIX-SYNC-001.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

evidence_read_only:
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M16-DUPLICADOS-001.md"
  - "lib/director-ia-duplicados.js"
  - "lib/folio-duplicados-load.js"
  - "lib/director-ia-capabilities.js"
  - "lib/director-ia-tools.js"
  - "lib/director-ia-chat.js"
  - "server.js"
  - "test/director-ia-duplicados.test.js"
  - "scripts/test-director-ia-capabilities.js"
  - "scripts/test-director-ia-tool-orchestrator.js"

out_of_scope:
  - "modificar runtime"
  - "modificar backend"
  - "modificar frontend"
  - "modificar tests"
  - "modificar contratos arquitectónicos"
  - "modificar DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "modificar M0-M15"
  - "modificar M17-M20"
  - "cancelar folios"
  - "resolver duplicados"
  - "mutar folios"
  - "añadir UI"
  - "integrar M16 al cycle"
  - "crear endpoint nuevo"
  - "cambiar algoritmo findDuplicatePairs"
  - "cambiar threshold 0.72"
  - "commit"
  - "push"
  - "merge"
  - "siguiente tarea"

canonical_check:
  question: >
    Verificar en DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md qué significa M16 y si
    la capacidad read-only integrada satisface de forma completa esa definición.
  rule:
    - >
      Si la definición canónica de M16 exige solamente análisis/consulta de
      posibles duplicados y la implementación integrada cubre fuente real,
      wiring, authz, semántica y tests, puede marcarse COMPLETE.
    - >
      Si la definición canónica exige cancelación, resolución o mutación para
      ser COMPLETE, STOP y solicitar G2; no reinterpretar la matriz.
    - >
      No usar el endpoint existente como única evidencia de COMPLETE.
    - >
      COMPLETE requiere integración real accesible desde Director IA.

semantic_invariants:
  - >
    M16 analiza posibles duplicados; no confirma duplicidad de manera humana o
    determinística cuando el algoritmo no lo sustenta.
  - "No afirmar fraude."
  - "No afirmar intención."
  - "No afirmar que un folio debe cancelarse."
  - >
    El estado COMPLETE de capability significa que la capacidad canónica de M16
    está integrada, no que el algoritmo tenga certeza absoluta.
  - >
    No confundir COMPLETE de integración con confirmación de duplicidad.

required_document_change:
  target_file: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  module: "M16"
  requirements:
    - "Modificar únicamente la entrada/secciones necesarias de M16."
    - "Registrar la fuente real integrada."
    - "Registrar que la cobertura es read-only."
    - >
      Describir los hallazgos como posibles duplicados/candidatos heurísticos.
    - >
      Registrar que cancelar/resolver folios queda fuera de esta capacidad si la
      definición canónica no lo exige.
    - "No alterar otros M."
    - "No modificar otras prioridades salvo lo estrictamente derivado de M16."
    - >
      No inventar endpoints, permisos, tests o capacidades no soportadas por
      evidencia física.

complete_evidence_required:
  - "intent duplicate_folios accesible"
  - "SOURCE_NOT_INTEGRATED retirado únicamente para M16"
  - "get_duplicate_folios con executor real"
  - "fuente real public.folios"
  - "findDuplicatePairs reutilizado"
  - "scope/authz preservado"
  - "evidencia estructurada"
  - "happy/empty/error"
  - "semántica de posibles duplicados"
  - "sin mutaciones"
  - "sin HTTP interno"
  - "sin UI nueva"
  - "sin cycle"
  - "tests focales verdes"
  - "suite Director IA verde"

test_evidence:
  m16_focal:
    tests: 17
    pass: 17
    fail: 0

  director_ia_suite:
    tests: 416
    pass: 416
    fail: 0

  capabilities:
    tests: 20
    pass: 20
    fail: 0

  planner:
    tests: 28
    pass: 28
    fail: 0

  orchestrator:
    tests: 19
    pass: 19
    fail: 0

gate_decision:
  G2:
    default: "PENDING_IF_REQUIRED"
    rule:
      - >
        Si basta con reflejar la implementación ya existente usando el
        vocabulario canónico actual, marcar N/A.
      - >
        Si hay que redefinir M16 para considerar COMPLETE una capacidad que el
        documento define de otra manera, STOP y marcar REQUIRED.
  G3: "N/A"
  G8: "N/A"

percentage_rule:
  formula:
    COMPLETE: 1.0
    PARTIAL: 0.5
    NOT_STARTED: 0.0
    N_A: "excluido"
  before:
    numerator: 6.5
    denominator: 20
    percentage: 32.5
  expected_after_if_m16_complete:
    numerator: 7.5
    denominator: 20
    percentage: 37.5
  restriction: >
    No cambiar el porcentaje si la revisión canónica concluye que M16 no puede
    marcarse COMPLETE.

acceptance_criteria:
  - "La definición canónica de M16 fue revisada."
  - "La decisión COMPLETE/NO COMPLETE está sustentada con evidencia física."
  - >
    Si COMPLETE, DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md refleja la integración
    read-only real sin exagerar semántica.
  - "M0-M15 y M17-M20 permanecen intactos."
  - "No se agregan mutaciones a M16."
  - "No se afirma duplicado confirmado."
  - "No se modifica runtime."
  - "No se modifica código."
  - "No se modifican tests."
  - "No se modifica arquitectura."
  - "G2 queda decidido con evidencia."
  - "git diff --check limpio."
  - "Solo CURRENT_TASK, reporte y capability matrix pueden cambiar."

report_requirements:
  path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M16-CAPABILITY-MATRIX-SYNC-001.md"
  must_include:
    - "estado anterior M16"
    - "definición canónica"
    - "evidencia de implementación"
    - "estado posterior"
    - "razón COMPLETE o razón de STOP"
    - "semántica de posibles duplicados"
    - "scope/authz"
    - "tests"
    - "G2 decision"
    - "porcentaje antes/después si aplica"
    - "archivos modificados"
    - "acciones no realizadas"

stop_conditions:
  - >
    Si la definición canónica exige mutaciones para marcar M16 COMPLETE, STOP.
  - >
    Si hay que redefinir el significado de M16 para justificar COMPLETE, STOP y
    solicitar G2.
  - >
    Si aparece una contradicción entre capability matrix y contratos que no
    pueda resolverse documentalmente sin arquitectura, STOP.
  - "No ampliar el scope."

expected_terminal_state: >
  DONE_PENDING_REVIEW si M16 puede sincronizarse a COMPLETE sin redefinir su
  definición canónica. BLOCKED/STOPPED si hace falta G2.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M16-CAPABILITY-MATRIX-SYNC-001.md"
```