# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005"
status: STOPPED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T13:55:52-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente módulo funcional de Director IA después de completar
  M9 y de falsar la hipótesis de COMPLETE read-only para M4, utilizando la
  capability matrix vigente y evidencia física del repositorio para elegir
  exactamente un siguiente módulo con path realista a COMPLETE.

baseline:
  current_m0_m20_percentage: 42.5
  numerator: 8.5
  denominator: 20

  formula:
    COMPLETE: 1.0
    PARTIAL: 0.5
    INDIRECTA: 0.5
    NOT_STARTED: 0.0
    N_A: "excluido del denominador"

  known_complete:
    - "M3"
    - "M9"
    - "M13"
    - "M16"

  m4_readiness:
    task: "ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001"
    outcome: "PARTIAL_ONLY"
    conclusion: >
      La lectura JSON de Clasificación es implementable pero no satisface
      COMPLETE canónico de M4, porque el propósito vigente incluye
      Clasificación de apoyos + COMPARAR y reconciliación Excel.
    complete_gain_pp: 0.0
    possible_partial_gain_pp_if_human_later_authorizes_read_only: 2.5
    rule: >
      M4 no puede ser seleccionado en esta priorización como candidato a
      COMPLETE read-only bajo la misma hipótesis ya falseada.

primary_goal: >
  Elegir exactamente un módulo restante cuya definición canónica pueda
  alcanzarse legítimamente como COMPLETE con un slice razonable, evitando
  repetir hipótesis ya descartadas y priorizando valor ejecutivo, probabilidad
  de cierre, seguridad y reutilización de infraestructura.

selection_principles:
  - "No elegir por número."
  - "No repetir M4 como COMPLETE read-only."
  - "Excluir COMPLETE y N_A."
  - "No contar M4 como PARTIAL todavía; no fue implementado."
  - "Comparar PARTIAL/INDIRECTA -> COMPLETE = +2.5 pp."
  - "Comparar NOT_STARTED -> COMPLETE = +5.0 pp."
  - "No premiar +5.0 pp si COMPLETE canónico exige write/external/Excel no incluido."
  - "Preferir módulos con definición canónica clara."
  - "Preferir fuentes JSON/helpers reales."
  - "Preferir patrón in-process ya probado por M3/M9."
  - "Preferir read-only si COMPLETE canónico realmente lo permite."
  - "Penalizar mutaciones."
  - "Penalizar GET con side effects."
  - "Penalizar Excel/xlsx si es parte inseparable de COMPLETE."
  - "Penalizar S3/Twilio/WhatsApp/dependencias externas."
  - "Penalizar schema/migrations."
  - "Penalizar authz ambigua o global."
  - "Penalizar colisiones semánticas."
  - "No elegir Health solo por bajo esfuerzo si el valor ejecutivo es claramente menor."
  - "No seleccionar una hipótesis de COMPLETE que ya tenga evidencia contraria."

candidate_scope:
  derive_from: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  include:
    - "PARTIAL"
    - "INDIRECTA"
    - "NOT_STARTED"
    - "BLOCKED si aparece y el blocker debe revalidarse"

  exclude:
    - "COMPLETE"
    - "N_A"

  special_exclusion:
    module: "M4"
    condition: >
      Excluirlo como candidato a COMPLETE read-only. Solo puede reaparecer si
      se evalúa una estrategia distinta que cubra honestamente COMPARAR/Excel,
      con riesgos y gates correspondientes; no repetir la hipótesis ya auditada.

mandatory_revalidation:
  - "Recalcular baseline desde fichas vigentes."
  - "Confirmar que M4 sigue NO INTEGRADA documentalmente."
  - "Incorporar PARTIAL_ONLY de M4 como evidencia."
  - "Confirmar M9 COMPLETE."
  - "Revalidar candidatos que quedaron detrás en 004."
  - "Profundizar en el segundo lugar anterior M6."
  - "Revalidar M1 Health."
  - "Revalidar M2 Kanban/Folios."
  - "Revalidar M7 IGF."
  - "Revalidar M8 ARR."
  - "Revalidar M11 DICF."
  - "Revalidar M12 Action Register."
  - "Revalidar M17 WhatsApp bridge."
  - "Revalidar M20 Home KPI."
  - "Revalidar restantes NOT_STARTED."
  - "Verificar definición canónica de COMPLETE antes de puntuar +5.0 pp."
  - "Verificar wiring real y side effects."

evaluation_dimensions:
  canonical_complete:
    question: >
      ¿Qué exige exactamente COMPLETE para el módulo y puede cubrirse en el
      slice propuesto sin reinterpretación?

  current_state:
    question: >
      ¿PARTIAL, INDIRECTA, NOT_STARTED o BLOCKED?

  potential_gain:
    question: >
      ¿Cuál es la ganancia real si alcanza COMPLETE?

  executive_value:
    question: >
      ¿Qué valor aporta al diagnóstico y toma de decisiones del Director IA?

  backend_readiness:
    question: >
      ¿Qué endpoints/helpers/queries/loaders existen físicamente?

  director_ia_readiness:
    question: >
      ¿Hay intent/tool/capability/wiring parcial?

  source_contract:
    question: >
      ¿Existe fuente primaria estructurada y semántica estable?

  authz:
    question: >
      ¿Puede preservarse o reforzarse sin fuga de información?

  plant_scope:
    question: >
      ¿Puede respetar planta_id/plantas_permitidas?

  dependencies:
    question: >
      ¿Qué dependencias funcionales necesita?

  external_dependency:
    question: >
      ¿Depende de Excel, S3, Twilio, WhatsApp u otra integración externa?

  mutation_risk:
    question: >
      ¿Alguna superficie aparentemente de lectura escribe o modifica estado?

  db_change:
    question: >
      ¿Requiere schema, migration o backfill?

  effort:
    question: >
      ¿El delta es bajo, medio o alto?

  testability:
    question: >
      ¿Puede probarse de forma determinística local?

  semantic_risk:
    question: >
      ¿Existe colisión, ambigüedad o riesgo de conclusión falsa?

  complete_feasibility:
    question: >
      ¿Puede alcanzar COMPLETE en un único slice razonable?

mandatory_candidate_table:
  columns:
    - "module"
    - "canonical_purpose"
    - "canonical_complete_requirement"
    - "current_state"
    - "potential_gain_pp"
    - "executive_value"
    - "existing_backend"
    - "existing_intent_or_tool"
    - "primary_source"
    - "authz_ready"
    - "plant_scope"
    - "dependencies"
    - "external_dependency"
    - "mutation_risk"
    - "db_change"
    - "estimated_effort"
    - "testability"
    - "semantic_risk"
    - "can_reach_complete_in_one_slice"
    - "evidence"

ranking_rules:
  - "Rankear todos los candidatos relevantes."
  - "No reutilizar ranking 004 sin revalidación."
  - "M4 PARTIAL_ONLY debe afectar el aprendizaje de la priorización."
  - "No confundir implementación parcial útil con COMPLETE."
  - "Preferir certeza contractual de COMPLETE."
  - "Preferir +5.0 pp solo si COMPLETE está realmente sustentado."
  - "Aceptar +2.5 pp si tiene P(COMPLETE) claramente superior."
  - "Preferir valor ejecutivo sobre Health si riesgo/esfuerzo son comparables."
  - "Penalizar dependencias externas o write."
  - "Explicar explícitamente por qué pierde el segundo lugar."

special_candidate_rechecks:

  m1_health:
    required:
      - "definición exacta COMPLETE"
      - "health-proyectos global vs M3 plant scope"
      - "si puede corregirse sin rediseño"
      - "valor ejecutivo"

  m2_kanban_folios:
    required:
      - "GET /folios/:id side effect"
      - "timeline"
      - "documents"
      - "folio_status executor"
      - "si COMPLETE puede ser read-only legítimo"
      - "dependencias M18"

  m6_gastos_inversiones:
    required:
      - "revalidar segundo lugar de 004"
      - "xlsx endpoints"
      - "helpers JSON internos si existen"
      - "expense_analysis"
      - "investment_analysis"
      - "colisión semántica con IGF 'gastos'"
      - "si COMPLETE exige exportación Excel"
      - "si las dos familias caben en un slice"

  m7_igf:
    required:
      - "annex ya integrado"
      - "sources.igf=false"
      - "qué exige COMPLETE"
      - "si falta solo wiring/context"
      - "authz"
      - "valor ejecutivo"

  m8_arr:
    required:
      - "annex ya integrado"
      - "sources.arr=false"
      - "qué exige COMPLETE"
      - "upload dependency"
      - "read-only vs carga"
      - "valor ejecutivo"

  m11_dicf:
    required:
      - "qué sí está integrado"
      - "qué falta"
      - "comentarios"
      - "acciones"
      - "si COMPLETE exige escritura"
      - "valor ejecutivo"

  m12_action_register:
    required:
      - "estatus"
      - "responsables"
      - "overdue"
      - "cierres"
      - "histórico"
      - "si COMPLETE exige write"
      - "valor ejecutivo"

  m17_whatsapp:
    required:
      - "bridge actual"
      - "dependencia Twilio/WhatsApp"
      - "si COMPLETE exige canal externo"
      - "si existe camino purely read-only"

  m20_home_kpi:
    required:
      - "por qué INDIRECTA"
      - "fuente"
      - "qué exige COMPLETE"
      - "si es wiring pequeño"
      - "valor ejecutivo"

  remaining_not_started:
    required:
      - "revalidar definición canónica"
      - "no otorgar +5.0 teórico sin COMPLETE real"

winner_requirements:
  exactly_one: true

  must_have:
    - "definición COMPLETE inequívoca"
    - "evidencia física"
    - "fuente real"
    - "path implementable"
    - "authz determinable"
    - "tests posibles"
    - "gates claros"
    - "probabilidad razonable de COMPLETE"

  must_explain:
    - "por qué gana"
    - "estado actual"
    - "ganancia real"
    - "valor ejecutivo"
    - "delta físico"
    - "dependencias"
    - "riesgos"
    - "feasibility COMPLETE"
    - "por qué pierde segundo lugar"
    - "si necesita readiness o puede ir directo a IMPL"

next_task_policy:
  exactly_one: true

  if_readiness_needed:
    propose: "ARCH-DIRECTOR-IA-<MODULO>-READINESS-001"

  if_gap_fully_determined:
    propose: "IMPL-DIRECTOR-IA-<MODULO>-001"

  rules:
    - "No autorizar NEXT_TASK."
    - "No ejecutar NEXT_TASK."
    - "No proponer múltiples tareas."
    - "No encadenar."

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005.md"

  read_only:
    - "docs/dev-loop/LOOP_PROTOCOL.md"
    - "docs/dev-loop/TASK_TEMPLATE.md"
    - "docs/dev-loop/reports/README.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M9-DELTAS-001.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/director-ia/**"
    - "lib/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "test/**"
    - "scripts/**"
    - "sql/**"
    - "package.json"
    - "package-lock.json"

out_of_scope:
  - "implementar"
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
  - "ejecutar writes"
  - "smoke productivo"
  - "usar secretos"
  - "commit"
  - "push"
  - "merge"
  - "ejecutar siguiente tarea"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

allowed_actions:
  - "leer físicamente matriz, reportes, código y tests"
  - "recalcular baseline"
  - "incorporar resultado PARTIAL_ONLY de M4"
  - "revalidar candidatos"
  - "trazar wiring y fuentes"
  - "verificar side effects"
  - "comparar COMPLETE feasibility"
  - "rankear"
  - "elegir exactamente un ganador"
  - "proponer exactamente una NEXT_TASK"
  - "escribir reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"

forbidden_actions:
  - "modificar código"
  - "modificar capability matrix"
  - "modificar arquitectura"
  - "repetir M4 read-only como COMPLETE"
  - "aprobar gates"
  - "ejecutar NEXT_TASK"
  - "commit"
  - "push"
  - "merge"

required_output:
  - "baseline recalculado"
  - "estado vigente M0-M20"
  - "impacto de M4 PARTIAL_ONLY"
  - "candidatos restantes"
  - "tabla comparativa"
  - "blockers revalidados"
  - "ranking"
  - "ganador único"
  - "segundo lugar"
  - "ganancia real"
  - "valor ejecutivo"
  - "evidencia física"
  - "delta físico"
  - "dependencias"
  - "riesgos"
  - "COMPLETE feasibility"
  - "NEXT_TASK"
  - "gates"
  - "acciones no realizadas"
  - "git diff --check"
  - "git status"

acceptance_criteria:
  - "Baseline 42.5% recalculado."
  - "M4 sigue sin sumar nada al porcentaje porque no fue implementado."
  - "PARTIAL_ONLY de M4 se incorpora al ranking."
  - "M4 no vuelve a ganar por la misma hipótesis falseada."
  - "Todos los candidatos restantes relevantes fueron revalidados."
  - "Definición COMPLETE se verificó antes de asignar ganancia."
  - "Hay exactamente un ganador."
  - "Hay exactamente una NEXT_TASK."
  - "NEXT_TASK no autorizada."
  - "No se implementó nada."
  - "No se modificó capability matrix."
  - "No se modificaron contratos."
  - "Solo CURRENT_TASK y reporte modificados."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "M4 PARTIAL_ONLY"
    - "estado M0-M20"
    - "candidatos"
    - "tabla comparativa"
    - "blockers"
    - "ranking"
    - "ganador"
    - "segundo lugar"
    - "ganancia real"
    - "valor ejecutivo"
    - "evidencia"
    - "delta físico"
    - "dependencias"
    - "riesgos"
    - "COMPLETE feasibility"
    - "NEXT_TASK"
    - "gates"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un ganador claro y un siguiente slice
  implementable. STOPPED si ningún candidato puede priorizarse sin decisión
  arquitectónica/contractual. BLOCKED si falta gate o dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005.md"