# CURRENT_TASK

```yaml id="m9-readiness-current-task"
task_id: "ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T12:40:00-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente M9 — Delta Venta / Descuento / Ingreso — para determinar
  el delta exacto necesario para llevar su cobertura canónica de INDIRECTA a
  COMPLETE mediante integración read-only en Director IA, preservando
  semántica, authz, scope por planta y fuentes existentes, sin implementar
  todavía y sin redefinir arquitectura.

baseline:
  source_task: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003"
  source_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"
  current_m0_m20_percentage: 40.0
  current_numerator: 8.0
  denominator: 20
  module: "M9"
  module_name: "Delta Venta / Descuento / Ingreso"
  current_state: "INDIRECTA"
  target_state: "COMPLETE"
  potential_gain_pp: 2.5
  projected_percentage_if_complete: 42.5

canonical_scope:
  source: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  business_purpose: >
    Consultar y comparar variaciones entre periodos de venta, descuento e
    ingreso mediante las fuentes delta reales del dashboard.

  canonical_families:
    - "Delta Venta"
    - "Delta Descuento"
    - "Delta Ingreso"

  candidate_runtime_surface:
    intents:
      - "delta_sales"
      - "delta_discount"
      - "delta_income"

    tools:
      - "get_delta_sales"
      - "get_delta_discount"
      - "get_delta_income"

    expected_current_tool_state: "declared but executor null / not fully integrated"

primary_question: >
  ¿Puede M9 alcanzar legítimamente COMPLETE mediante un único slice read-only
  que cablee Delta Venta, Delta Descuento y Delta Ingreso a sus fuentes reales
  existentes, con authz y semántica equivalentes o más restrictivas que el
  dashboard, sin HTTP interno, mutaciones ni cambios arquitectónicos?

secondary_questions:
  - >
    ¿Cuáles son exactamente los endpoints JSON y helpers reales de cada una de
    las tres familias delta?
  - >
    ¿Qué diferencia existe entre endpoints de periodos y endpoints de datos?
  - >
    ¿Hay POST utilizados exclusivamente como consulta read-only y, de ser así,
    tienen efectos secundarios o son POST por shape del request?
  - >
    ¿Qué helpers ARR pueden reutilizarse directamente in-process?
  - >
    ¿Qué campos devuelve cada delta y qué semántica exacta tiene cada uno?
  - >
    ¿Cómo se representan periodo actual, periodo comparación, diferencias y
    porcentajes?
  - >
    ¿Qué valores pueden ser null, cero, faltantes o no calculables?
  - >
    ¿Qué authz aplican actualmente GA, GV y plantas_permitidas?
  - >
    ¿Los tres deltas comparten authz o existen diferencias por familia?
  - >
    ¿Los intents delta_sales/delta_discount/delta_income llegan hoy a tools
    declaradas sin executor?
  - >
    ¿Existe early-return o SOURCE_NOT_INTEGRATED que impida llegar a la fuente?
  - >
    ¿Puede reutilizarse el patrón in-process de M3/M16 sin dispatcher nuevo?
  - >
    ¿Hace falta una tool por familia o puede existir un loader compartido sin
    mezclar semánticas?
  - >
    ¿Qué tests son necesarios para declarar las tres familias consistentes y
    suficientes para COMPLETE?
  - >
    ¿Existe algún conflicto entre M9 y M19 Delta Ingreso AI test que obligue a
    separar expresamente ambos dominios?

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md"

  read_only:
    - "docs/dev-loop/LOOP_PROTOCOL.md"
    - "docs/dev-loop/TASK_TEMPLATE.md"
    - "docs/dev-loop/reports/README.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
    - "docs/director-ia/CONSTITUTION.md"
    - "docs/director-ia/EXECUTIVE_KNOWLEDGE_ENGINE.md"
    - "docs/director-ia/01-OBSERVATION-PIPELINE.md"
    - "docs/director-ia/02-EVIDENCE-BUILDER.md"
    - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
    - "docs/director-ia/04-IES-STANDARD.md"
    - "docs/director-ia/05-REASONING-ENGINE.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-tool-orchestrator.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-context.js"
    - "lib/director-ia-igf-arr.js"
    - "lib/director-ia-m3-plantas-kpis-proyectos.js"
    - "lib/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "test/**"
    - "scripts/**"
    - "sql/**"
    - "package.json"
    - "package-lock.json"

out_of_scope:
  - "implementar M9"
  - "modificar runtime"
  - "modificar backend"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "crear migrations"
  - "modificar schema"
  - "modificar capability matrix"
  - "modificar contratos de docs/director-ia"
  - "crear contratos arquitectónicos"
  - "crear tools"
  - "crear intents"
  - "cambiar authz"
  - "cambiar endpoints"
  - "cambiar semántica de delta"
  - "cargar archivos ARR"
  - "mutar ARR"
  - "mutar folios"
  - "mutar Action Register"
  - "integrar M19"
  - "reabrir M3"
  - "HTTP interno"
  - "cycle constitucional"
  - "smoke productivo"
  - "secretos o credenciales"
  - "commit"
  - "push"
  - "merge"
  - "abrir o ejecutar automáticamente la siguiente tarea"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/director-ia/CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/01-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"

allowed_actions:
  - "leer físicamente archivos del repositorio"
  - "buscar endpoints delta venta/descuento/ingreso"
  - "trazar endpoints a handlers, helpers, queries y tablas/vistas"
  - "trazar Planner -> intent -> tool -> executor actual"
  - "examinar authz GA/GV/planta"
  - "examinar semántica de filtros y periodos"
  - "examinar tests existentes"
  - "determinar delta físico mínimo"
  - "clasificar riesgos"
  - "determinar gates de una eventual implementación"
  - "proponer exactamente una NEXT_TASK"
  - "escribir únicamente CURRENT_TASK y reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"

forbidden_actions:
  - "implementar código"
  - "modificar cualquier archivo fuera de los dos writable"
  - "reinterpretar COMPLETE para facilitar el resultado"
  - "tratar un POST de consulta como mutación sin verificar físicamente efectos"
  - "tratar un POST con efectos secundarios como read-only"
  - "mezclar venta, descuento e ingreso como si fueran el mismo dato"
  - "usar IGF o KPIs de M3 como sustituto de las fuentes delta"
  - "integrar M19 dentro de M9"
  - "ampliar acceso cross-planta"
  - "bypassear GA/GV"
  - "usar HTTP interno"
  - "crear dispatcher genérico"
  - "aprobar G2, G3, G4, G5, G6, G7 o G8"
  - "commit"
  - "push"
  - "merge"
  - "encadenar implementación"

audit_workstreams:

  canonical_definition:
    required:
      - "confirmar definición exacta de M9 en capability matrix"
      - "confirmar por qué hoy figura INDIRECTA"
      - "determinar qué exige COMPLETE para las tres familias"
      - "separar claramente M9 de M19"
      - "identificar cualquier ambigüedad contractual"

  delta_venta:
    inspect:
      - "endpoints delta venta periodos"
      - "endpoints delta venta datos"
      - "helpers getDeltaVentaClientes o equivalentes"
      - "fuentes ARR/tablas/vistas utilizadas"
      - "shape JSON"
      - "filtros por planta"
      - "periodos"
      - "authz"
      - "side effects"
      - "tests existentes"
    determine:
      - "path reusable in-process"
      - "campos mínimos de evidencia"
      - "null/zero semantics"
      - "si intent delta_sales corresponde inequívocamente a esta familia"

  delta_descuento:
    inspect:
      - "endpoints delta descuento periodos"
      - "endpoints delta descuento datos"
      - "helpers getDeltaDescuentoClientes o equivalentes"
      - "fuentes ARR/tablas/vistas utilizadas"
      - "shape JSON"
      - "filtros por planta"
      - "periodos"
      - "authz"
      - "side effects"
      - "tests existentes"
    determine:
      - "path reusable in-process"
      - "campos mínimos de evidencia"
      - "null/zero semantics"
      - "si intent delta_discount corresponde inequívocamente a esta familia"

  delta_ingreso:
    inspect:
      - "endpoints delta ingreso periodos"
      - "endpoints delta ingreso datos"
      - "helpers getDeltaIngresoClientes o equivalentes"
      - "fuentes ARR/tablas/vistas utilizadas"
      - "shape JSON"
      - "filtros por planta"
      - "periodos"
      - "authz"
      - "side effects"
      - "tests existentes"
    determine:
      - "path reusable in-process"
      - "campos mínimos de evidencia"
      - "null/zero semantics"
      - "si intent delta_income corresponde inequívocamente a esta familia"
      - "frontera exacta respecto a M19 Delta Ingreso AI test"

  planner_and_tools:
    inspect:
      - "delta_sales"
      - "delta_discount"
      - "delta_income"
      - "get_delta_sales"
      - "get_delta_discount"
      - "get_delta_income"
      - "capabilities correspondientes"
      - "executor actual"
      - "clarification logic"
      - "UNSUPPORTED_RULES / early returns"
    determine:
      - "qué wiring ya existe"
      - "qué executor falta"
      - "si se requieren loaders separados o compartidos"
      - "si hace falta tocar planner"
      - "si hace falta tocar capabilities"
      - "si hace falta tocar chat"

  authz:
    required:
      - "mapear GA"
      - "mapear GV"
      - "mapear plantas_permitidas"
      - "mapear excepciones por rol si existen"
      - "confirmar que un path M9 puede ser igual o más restrictivo"
      - "identificar cualquier riesgo cross-planta"

  data_contract:
    required:
      - "identificar fuente primaria de cada delta"
      - "distinguir valores observados de derivados"
      - "documentar definición de diferencia absoluta"
      - "documentar definición de diferencia porcentual"
      - "preservar null/unknown"
      - "no forzar división por cero"
      - "no convertir ausencia de periodo en cero"
      - "identificar freshness"
      - "identificar periodo actual y comparativo"
      - "identificar unidad: venta, descuento, ingreso"

  architecture_fit:
    required:
      - "determinar si M9 cabe en arquitectura existente"
      - "determinar si necesita G2"
      - "determinar si necesita G3"
      - "determinar si toca OP/EB/EKS/IES/Reasoning"
      - "determinar si entra o no al cycle"
      - "no solicitar gates preventivamente"

  implementation_slice:
    required:
      - "describir archivos probablemente afectados"
      - "describir loaders/executors mínimos"
      - "describir wiring mínimo"
      - "describir tests mínimos"
      - "determinar si las tres familias caben en una sola IMPL task"
      - "determinar si ese slice puede llevar M9 a COMPLETE"

semantic_invariants:
  - "Delta Venta ≠ Delta Descuento ≠ Delta Ingreso."
  - "M9 ≠ M19."
  - "M9 no usa IGF como sustituto."
  - "M9 no usa KPIs de M3 como sustituto."
  - "No afirmar causalidad a partir de una diferencia."
  - "No afirmar deterioro/mejora sin definir el signo y la métrica."
  - "No inventar periodos."
  - "No convertir división por cero en porcentaje válido."
  - "No convertir null/unknown/fuente ausente en cero."
  - "No ampliar plantas_permitidas."
  - "Toda conclusión conserva trazabilidad a la familia delta correcta."
  - "La auditoría no autoriza carga ARR ni ninguna mutación."

completion_test:
  question: >
    Después de un eventual slice de implementación, ¿Director IA podría
    consultar directamente y responder consistentemente sobre Delta Venta,
    Delta Descuento y Delta Ingreso para periodos autorizados y planta
    autorizada, usando fuentes reales, sin mutaciones, sin confundir familias
    ni M19 y con evidencia estructurada trazable?

  required_answer: >
    YES con evidencia física para proponer IMPL directa; de lo contrario
    STOPPED/BLOCKED o readiness adicional.

mandatory_evidence_table:
  columns:
    - "family"
    - "canonical_requirement"
    - "current_state"
    - "endpoint"
    - "helper"
    - "source"
    - "request_method"
    - "side_effects"
    - "authz"
    - "period_semantics"
    - "response_shape"
    - "existing_intent"
    - "existing_tool"
    - "executor"
    - "missing_delta"
    - "testability"
    - "risk"
    - "evidence"

mandatory_gap_table:
  columns:
    - "gap_id"
    - "family"
    - "missing_capability"
    - "required_for_complete"
    - "reusable_component"
    - "proposed_physical_change"
    - "architecture_change"
    - "contract_change"
    - "authz_change"
    - "estimated_complexity"
    - "blocking"

decision_rules:
  complete_ready:
    all:
      - "Delta Venta consultable read-only"
      - "Delta Descuento consultable read-only"
      - "Delta Ingreso consultable read-only"
      - "las tres usan fuentes reales"
      - "authz preservada o reforzada"
      - "scope por planta preservado"
      - "periodos definidos"
      - "null/division-by-zero semantics preservadas"
      - "M9 separado de M19"
      - "sin mutaciones"
      - "sin HTTP interno"
      - "sin migration"
      - "sin contrato nuevo"
      - "tests determinísticos posibles"
      - "un único slice razonable cierra gaps obligatorios"

    then:
      next_task: "IMPL-DIRECTOR-IA-M9-DELTAS-001"

  architecture_or_semantic_decision_required:
    when:
      - "una familia delta no tiene fuente real reutilizable"
      - "un endpoint supuestamente de consulta tiene efectos secundarios indispensables"
      - "M9 y M19 no pueden separarse sin redefinición"
      - "authz no puede preservarse"
      - "definición de periodo/delta es ambigua y no está sustentada"
      - "se necesita modificar contrato arquitectónico"

    then:
      outcome: "STOPPED o BLOCKED según corresponda"
      next_task: "ninguna implementación hasta decisión humana"

gate_rules:
  G1:
    required: true
    scope: "esta auditoría únicamente"

  G2:
    default: "N/A"
    required_if: "se concluye que debe modificarse contrato arquitectónico existente"

  G3:
    default: "N/A"
    required_if: "se concluye que debe crearse contrato arquitectónico nuevo"

  G4:
    state: "NOT_AUTHORIZED"

  G5:
    state: "NOT_AUTHORIZED"
    note: "NEXT_TASK solo se propone"

  G6:
    state: "N/A"

  G7:
    state: "N/A unless ambiguity_or_contradiction_found"

  G8:
    state: "N/A unless calibration/materiality/signature becomes necessary"

required_output:
  - "resumen ejecutivo"
  - "definición canónica M9"
  - "estado físico Delta Venta"
  - "estado físico Delta Descuento"
  - "estado físico Delta Ingreso"
  - "frontera M9 vs M19"
  - "traza Planner / intents / tools / executors"
  - "mapa authz"
  - "contrato de periodos"
  - "contrato de datos y nulls"
  - "tabla de evidencia"
  - "tabla de gaps"
  - "riesgos semánticos"
  - "riesgos productivos"
  - "dependencias"
  - "fit arquitectónico"
  - "G2 sí/no"
  - "G3 sí/no"
  - "feasibility COMPLETE"
  - "delta físico mínimo"
  - "archivos probables de implementación"
  - "tests requeridos"
  - "exactamente una NEXT_TASK o STOP/BLOCKED justificado"
  - "acciones no realizadas"
  - "git diff --check"
  - "git status"

acceptance_criteria:
  - "Se verificó físicamente la definición canónica de M9."
  - "Se verificó físicamente Delta Venta."
  - "Se verificó físicamente Delta Descuento."
  - "Se verificó físicamente Delta Ingreso."
  - "Se verificaron endpoints y helpers de cada familia."
  - "Se verificaron métodos HTTP y side effects."
  - "Se verificaron intents y tools existentes."
  - "Se verificó executor actual de cada tool."
  - "Se verificó authz GA/GV/planta."
  - "Se verificaron periodos."
  - "Se verificaron nulls y división por cero."
  - "Se distinguió M9 de M19."
  - "No se implementó nada."
  - "No se modificó capability matrix."
  - "No se modificaron contratos."
  - "No se modificó runtime/backend/frontend/tests."
  - "Solo CURRENT_TASK y reporte fueron modificados."
  - "Hay una conclusión inequívoca sobre INDIRECTA -> COMPLETE."
  - "Hay exactamente una NEXT_TASK si procede."
  - "NEXT_TASK permanece no autorizada."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline 40.0%"
    - "ganancia potencial +2.5 pp"
    - "definición canónica M9"
    - "Delta Venta"
    - "Delta Descuento"
    - "Delta Ingreso"
    - "M9 vs M19"
    - "Planner/tools"
    - "authz"
    - "periodos"
    - "contrato de datos"
    - "tabla de evidencia"
    - "tabla de gaps"
    - "riesgos"
    - "dependencias"
    - "fit arquitectónico"
    - "feasibility COMPLETE"
    - "NEXT_TASK"
    - "gates"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la auditoría demuestra un path inequívoco y acotado
  para llevar M9 a COMPLETE en un único slice read-only. STOPPED si encuentra
  contradicción contractual o semántica que requiera decisión humana. BLOCKED
  si falta un gate o dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md"