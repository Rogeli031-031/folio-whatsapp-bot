# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T13:55:52-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar físicamente M4 — Clasificación de apoyos — para determinar si la
  consulta read-only de la matriz JSON de clasificación puede constituir
  legítimamente COMPLETE para el módulo, separándola expresamente de COMPARAR,
  Excel y cualquier escritura, y definir el delta exacto de implementación sin
  modificar todavía runtime, contratos ni capability matrix.

baseline:
  source_task: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004"
  source_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004.md"

  current_m0_m20_percentage: 42.5
  current_numerator: 8.5
  denominator: 20

  module: "M4"
  module_name: "Clasificación de apoyos + COMPARAR"
  current_state: "NOT_STARTED / NO INTEGRADA"
  candidate_target: "COMPLETE read-only"
  potential_gain_pp_if_complete: 5.0
  projected_numerator_if_complete: 9.5
  projected_percentage_if_complete: 47.5

prioritization_hypothesis:
  read_surface:
    endpoint: "GET /api/dashboard/clasificacion-apoyos or equivalent current route"
    expected_behavior:
      - "SELECT/read-only"
      - "buildClasificacionMatrix or equivalent"
      - "planta_id scoped"
      - "mes_a / mes_b"
      - "A != B"
      - "JSON response"

  excluded_surfaces:
    - "COMPARAR POST/write"
    - "Excel reconciliation"
    - "agregar/actualizar/rechazar folios"
    - "mutations"

primary_question: >
  ¿Puede M4 alcanzar legítimamente COMPLETE mediante un único slice read-only
  que permita a Director IA consultar directamente la matriz de Clasificación
  de apoyos para planta y periodos autorizados, usando la fuente JSON real,
  mientras COMPARAR, Excel y las escrituras permanecen explícitamente fuera?

critical_contract_question: >
  Verificar físicamente si la definición canónica vigente de M4 permite
  considerar COMPLETE a la capacidad de consulta read-only o si COMPLETE exige
  necesariamente reconciliación COMPARAR/Excel y/o escritura. No reinterpretar
  la matriz para obtener +5.0 pp.

secondary_questions:
  - >
    ¿Cuál es la ruta real actual de Clasificación de apoyos y cuál es su método?
  - >
    ¿Qué handler/helper construye la matriz y qué consultas ejecuta?
  - >
    ¿La ruta de lectura tiene side effects directos o indirectos?
  - >
    ¿Qué tabla/vista/campos constituyen la fuente primaria?
  - >
    ¿Qué representan filas, columnas, categorías, periodos y totales?
  - >
    ¿Qué diferencia existe entre Clasificación de apoyos y COMPARAR?
  - >
    ¿Qué diferencia existe entre la consulta JSON y la reconciliación Excel?
  - >
    ¿COMPARAR forma parte inseparable del propósito canónico de M4 o es una
    capacidad de escritura separable?
  - >
    ¿La capability matrix vigente define explícitamente CONSULTAR/COMPARAR como
    una sola condición de COMPLETE?
  - >
    ¿Cómo se aplica planta_id?
  - >
    ¿Qué authz aplica a GV, priv_clave u otros roles/permisos?
  - >
    ¿mes_a y mes_b son obligatorios? ¿Qué formato usan?
  - >
    ¿Qué ocurre si mes_a = mes_b?
  - >
    ¿Qué ocurre con periodos sin datos?
  - >
    ¿Qué valores son cero por semántica fuente y cuáles son null/unknown?
  - >
    ¿Existe ya intent, capability o tool relacionada con clasificacion_apoyos?
  - >
    ¿UNSUPPORTED_RULES o early returns bloquean actualmente el dominio?
  - >
    ¿Puede reutilizarse el patrón in-process M3/M9?
  - >
    ¿Qué loader/executor mínimo sería necesario?
  - >
    ¿Qué tests serían suficientes para demostrar COMPLETE read-only?

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md"

  read_only:
    - "docs/dev-loop/LOOP_PROTOCOL.md"
    - "docs/dev-loop/TASK_TEMPLATE.md"
    - "docs/dev-loop/reports/README.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004.md"
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
    - "lib/director-ia-m3-plantas-kpis-proyectos.js"
    - "lib/director-ia-m9-deltas.js"
    - "lib/clasificacion-apoyos-excel.js"
    - "lib/clasificacion-comparar.js"
    - "lib/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "test/**"
    - "scripts/**"
    - "sql/**"
    - "package.json"
    - "package-lock.json"

out_of_scope:
  - "implementar M4"
  - "modificar runtime"
  - "modificar backend"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "crear migrations"
  - "modificar schema"
  - "modificar capability matrix"
  - "modificar contratos"
  - "crear tools"
  - "crear intents"
  - "cambiar authz"
  - "ejecutar COMPARAR"
  - "generar Excel"
  - "subir Excel"
  - "actualizar folios"
  - "agregar folios"
  - "rechazar folios"
  - "mutar clasificación"
  - "mutar Action Register"
  - "mutar ARR"
  - "HTTP interno"
  - "dispatcher genérico"
  - "cycle constitucional"
  - "smoke productivo"
  - "secretos o credenciales"
  - "commit"
  - "push"
  - "merge"
  - "abrir o ejecutar automáticamente la siguiente tarea"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/01-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"

allowed_actions:
  - "leer físicamente archivos del repositorio"
  - "verificar definición canónica de M4"
  - "trazar endpoint JSON de clasificación"
  - "trazar handler -> helper -> queries -> fuente"
  - "verificar side effects"
  - "verificar separación lectura/COMPARAR/Excel"
  - "verificar planner/tools/capabilities actuales"
  - "verificar authz"
  - "verificar scope por planta"
  - "verificar periodos"
  - "verificar null/zero semantics"
  - "examinar tests existentes"
  - "determinar delta físico"
  - "determinar feasibility de COMPLETE"
  - "determinar gates"
  - "proponer exactamente una NEXT_TASK"
  - "escribir únicamente CURRENT_TASK y reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"

forbidden_actions:
  - "implementar código"
  - "modificar cualquier archivo fuera de los dos writable"
  - "reinterpretar COMPLETE para obtener +5.0 pp"
  - "asumir que COMPARAR es separable sin evidencia contractual"
  - "asumir que COMPARAR es inseparable sin evidencia contractual"
  - "asumir que GET es read-only sin verificar side effects"
  - "usar Excel como fuente si existe JSON primario"
  - "ejecutar POST de escritura"
  - "crear o modificar folios"
  - "ampliar acceso cross-planta"
  - "bypassear GV/priv_clave"
  - "usar HTTP interno"
  - "aprobar G2/G3/G4/G5/G6/G7/G8"
  - "commit"
  - "push"
  - "merge"
  - "encadenar implementación"

audit_workstreams:

  canonical_definition:
    required:
      - "leer ficha completa M4 en capability matrix"
      - "leer resúmenes/Parte 9 relacionados"
      - "identificar propósito empresarial exacto"
      - "identificar capacidades de lectura"
      - "identificar capacidades de escritura"
      - "determinar si COMPLETE read-only es contractualmente legítimo"
      - "detectar ambigüedad CONSULTAR vs COMPARAR"

  classification_read:
    inspect:
      - "ruta GET/lectura actual"
      - "handler"
      - "buildClasificacionMatrix o equivalente"
      - "queries"
      - "public.folios u otras fuentes"
      - "shape JSON"
      - "categorías"
      - "mes_a"
      - "mes_b"
      - "totales"
      - "campos derivados"
      - "side effects"
    determine:
      - "fuente primaria"
      - "semántica exacta"
      - "path reusable in-process"
      - "campos mínimos de evidencia"
      - "si puede responder preguntas ejecutivas útiles"

  comparar_boundary:
    inspect:
      - "lib/clasificacion-comparar.js"
      - "endpoints COMPARAR"
      - "métodos POST"
      - "operaciones de escritura"
      - "actualizar/agregar/rechazar"
      - "dependencia Excel"
    determine:
      - "frontera exacta entre lectura y reconciliación"
      - "si COMPARAR es clase C"
      - "si queda legítimamente fuera de COMPLETE read-only"
      - "si su exclusión requeriría cambio contractual"

  excel_boundary:
    inspect:
      - "lib/clasificacion-apoyos-excel.js"
      - "endpoints Excel"
      - "qué información contiene vs JSON"
      - "si aporta información que no existe en lectura JSON"
    determine:
      - "si Excel es exportación de lectura o requisito canónico adicional"
      - "si COMPLETE exige archivo"
      - "si puede quedar fuera sin pérdida funcional canónica"

  planner_and_tools:
    inspect:
      - "clasificacion_apoyos capability"
      - "intents relacionados"
      - "tools existentes"
      - "executor actual"
      - "UNSUPPORTED_RULES"
      - "early returns"
      - "routing chat"
    determine:
      - "qué wiring existe"
      - "qué wiring falta"
      - "si se necesita intent nuevo"
      - "si se necesita tool nueva"
      - "si una tool existente está semánticamente mal asignada"
      - "si puede usarse patrón M3/M9"

  authz:
    required:
      - "mapear JWT"
      - "mapear planta_id"
      - "mapear plantas_permitidas si aplica"
      - "mapear GV"
      - "mapear priv_clave"
      - "mapear cualquier permiso específico"
      - "confirmar que path Director IA puede ser igual o más restrictivo"
      - "confirmar no cross-planta"

  periods:
    required:
      - "formato real mes_a/mes_b"
      - "A != B"
      - "validación existente"
      - "defaults si existen"
      - "qué ocurre si falta uno"
      - "qué ocurre con periodos vacíos"
      - "no inventar periodos"

  data_contract:
    required:
      - "identificar fuente primaria"
      - "identificar valores observados"
      - "identificar agregados"
      - "identificar derivados"
      - "identificar zeros legítimos"
      - "identificar null/unknown"
      - "no convertir ausencia/error en cero"
      - "identificar freshness si existe"
      - "identificar unidad monetaria/cantidad"

  architecture_fit:
    required:
      - "determinar si M4 cabe en arquitectura existente"
      - "determinar si necesita G2"
      - "determinar si necesita G3"
      - "determinar si toca OP/EB/EKS/IES/Reasoning"
      - "determinar si entra al cycle"
      - "no pedir gates preventivamente"

  implementation_slice:
    required:
      - "describir archivos probablemente afectados"
      - "describir loader/helper mínimo"
      - "describir intent/tool/executor mínimo"
      - "describir wiring chat"
      - "describir tests"
      - "determinar si un único slice puede cerrar COMPLETE"
      - "determinar si necesita readiness adicional"

semantic_invariants:
  - "Clasificación read-only ≠ COMPARAR."
  - "Clasificación read-only ≠ Excel reconciliation."
  - "No convertir una comparación de periodos en autorización para escribir."
  - "No afirmar que una diferencia implica error o corrección necesaria."
  - "No inventar categorías."
  - "No inventar periodos."
  - "No convertir ausencia de datos en cero salvo semántica fuente."
  - "No ampliar acceso a privados."
  - "No ampliar scope de planta."
  - "Toda conclusión debe ser trazable a la matriz JSON real."
  - "COMPARAR/Excel solo pueden quedar fuera de COMPLETE si la definición canónica lo permite."
  - "No modificar la definición canónica durante readiness."

completion_test:
  question: >
    ¿Puede Director IA, después de un único slice de implementación read-only,
    consultar directamente la matriz de Clasificación de apoyos para planta y
    periodos autorizados, responder consistentemente con evidencia real y
    satisfacer la definición canónica vigente de M4 COMPLETE sin ejecutar
    COMPARAR, Excel ni escrituras?

  outcomes:
    YES:
      requirement: >
        Evidencia física y contractual suficiente para que lectura JSON sea
        COMPLETE.
      next_task: "IMPL-DIRECTOR-IA-M4-CLASIFICACION-001"

    PARTIAL_ONLY:
      requirement: >
        La lectura JSON es implementable pero no satisface por sí sola COMPLETE.
      consequence: >
        No prometer +5.0 pp. Determinar si el siguiente slice debe implementar
        lectura como PARTIAL o si conviene detener y repriorizar.

    STOPPED:
      requirement: >
        COMPLETE exige COMPARAR/Excel/escritura o existe contradicción que
        requiere decisión humana/arquitectónica.

mandatory_evidence_table:
  columns:
    - "surface"
    - "canonical_requirement"
    - "current_state"
    - "endpoint_or_helper"
    - "source"
    - "method"
    - "side_effects"
    - "authz"
    - "plant_scope"
    - "period_contract"
    - "response_shape"
    - "existing_director_ia_wiring"
    - "missing_delta"
    - "required_for_complete"
    - "testability"
    - "risk"
    - "evidence"

mandatory_gap_table:
  columns:
    - "gap_id"
    - "surface"
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
      - "definición canónica permite COMPLETE read-only"
      - "matriz JSON cubre información canónica de consulta"
      - "fuente primaria real"
      - "sin side effects"
      - "authz preservable"
      - "scope planta preservable"
      - "periodos definidos"
      - "semántica null/zero definida"
      - "COMPARAR separable contractualmente"
      - "Excel separable contractualmente"
      - "sin mutaciones"
      - "sin HTTP interno"
      - "sin migration"
      - "sin contrato nuevo"
      - "tests determinísticos posibles"
      - "un único slice cierra gaps"

    then:
      next_task: "IMPL-DIRECTOR-IA-M4-CLASIFICACION-001"

  partial_only:
    when:
      - "lectura JSON es válida y útil"
      - "pero COMPLETE canónico exige COMPARAR y/o Excel"

    then:
      outcome: "DONE_PENDING_REVIEW with PARTIAL_ONLY determination"
      rule: >
        No proponer DOCS COMPLETE ni prometer +5.0 pp. Proponer como máximo una
        tarea que refleje honestamente el estado contractual.

  contract_or_architecture_decision_required:
    when:
      - "definición COMPLETE es ambigua"
      - "COMPARAR no puede separarse sin reinterpretar contrato"
      - "Excel contiene requisito canónico no cubierto por JSON"
      - "authz no puede preservarse"
      - "GET tiene side effects indispensables"
      - "se necesita modificar contrato arquitectónico"

    then:
      outcome: "STOPPED or BLOCKED"
      next_task: "none until human review"

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
    state: "N/A"

required_output:
  - "resumen ejecutivo"
  - "baseline 42.5%"
  - "definición canónica M4"
  - "determinación COMPLETE vs PARTIAL_ONLY"
  - "estado físico Clasificación JSON"
  - "frontera COMPARAR"
  - "frontera Excel"
  - "planner/tools/capabilities"
  - "authz"
  - "scope planta"
  - "periodos"
  - "contrato de datos"
  - "tabla de evidencia"
  - "tabla de gaps"
  - "riesgos semánticos"
  - "riesgos productivos"
  - "dependencias"
  - "fit arquitectónico"
  - "G2 sí/no"
  - "G3 sí/no"
  - "feasibility COMPLETE"
  - "ganancia real posible"
  - "delta físico"
  - "archivos probables de implementación"
  - "tests requeridos"
  - "exactamente una NEXT_TASK o STOP/BLOCKED justificado"
  - "acciones no realizadas"
  - "git diff --check"
  - "git status"

acceptance_criteria:
  - "Se verificó físicamente la definición canónica de M4."
  - "Se verificó físicamente la lectura JSON."
  - "Se verificó buildClasificacionMatrix o equivalente."
  - "Se verificaron queries/fuentes."
  - "Se verificaron side effects."
  - "Se verificó COMPARAR."
  - "Se verificaron escrituras de COMPARAR."
  - "Se verificó la superficie Excel."
  - "Se determinó si COMPARAR es separable de COMPLETE."
  - "Se determinó si Excel es separable de COMPLETE."
  - "Se verificó authz."
  - "Se verificó scope por planta."
  - "Se verificaron periodos."
  - "Se verificó null/zero semantics."
  - "Se verificó Planner/tools/capabilities."
  - "No se implementó nada."
  - "No se modificó capability matrix."
  - "No se modificaron contratos."
  - "No se modificó runtime/backend/frontend/tests."
  - "Solo CURRENT_TASK y reporte fueron modificados."
  - "No se promete +5.0 pp si solo se alcanza PARTIAL."
  - "Hay conclusión inequívoca COMPLETE/PARTIAL_ONLY/STOPPED."
  - "Hay exactamente una NEXT_TASK si procede."
  - "NEXT_TASK permanece no autorizada."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline 42.5%"
    - "ganancia teórica +5.0 pp"
    - "ganancia real confirmada o rechazada"
    - "definición canónica M4"
    - "Clasificación JSON"
    - "COMPARAR"
    - "Excel"
    - "COMPLETE vs PARTIAL_ONLY"
    - "Planner/tools/capabilities"
    - "authz"
    - "scope planta"
    - "periodos"
    - "contrato de datos"
    - "tabla de evidencia"
    - "tabla de gaps"
    - "riesgos"
    - "dependencias"
    - "fit arquitectónico"
    - "feasibility"
    - "NEXT_TASK"
    - "gates"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe una determinación inequívoca de COMPLETE
  read-only o PARTIAL_ONLY y un siguiente paso acotado. STOPPED si la definición
  canónica requiere decisión humana o contractual. BLOCKED si falta gate o dato
  indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md"