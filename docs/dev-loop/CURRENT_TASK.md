# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente frente global de Director IA desde el baseline 45.0%,
  comparando todos los módulos no COMPLETE por valor ejecutivo marginal,
  capacidad de razonamiento, actionability, frecuencia, fuentes físicas,
  seguridad y costo de integración. No continuar M6 por inercia ni elegir por
  porcentaje.

strategic_context:
  previous_task: "DOCS-DIRECTOR-IA-M6-CAPABILITY-MATRIX-SYNC-001"
  previous_outcome: "M6 PARTIAL"
  prior_global_task: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001"

baseline:
  numerator: 9.0
  denominator: 20
  percentage: 45.0

  recent_changes:
    - "M2 profundizado: status + history + documents metadata"
    - "M6 pasó NO INTEGRADA -> PARTIAL mediante query read-only"
    - "M6 Export/Excel sigue fuera"

  rule: >
    Esta tarea no modifica porcentaje ni estados. El porcentaje es secundario.

primary_question: >
  ¿Qué frente pendiente produce ahora el mayor incremento neto de inteligencia
  ejecutiva, considerando lo que Director IA ya sabe y penalizando duplicación,
  dependencias externas, writes e inferencias débiles?

candidate_source:
  canonical_matrix: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  include:
    - "PARTIAL"
    - "INDIRECTA"
    - "NO INTEGRADA"
    - "NOT_STARTED"
    - "bloqueados reconsiderables"

  exclude:
    - "COMPLETE"
    - "N_A"

mandatory_candidates:
  - "M1 Health"
  - "M4 Clasificación + COMPARAR"
  - "M5"
  - "M6 remaining Export"
  - "M7 IGF"
  - "M8 ARR"
  - "M10 WhatsApp operativo"
  - "M11 DICF"
  - "M12 Action Register"
  - "M14"
  - "M15"
  - "M17"
  - "M18"
  - "M20"
  - "cualquier otro módulo no COMPLETE vigente"

canonical_labels_rule: >
  Usar nombres y propósitos directamente de las fichas canónicas vigentes.
  Si prompts anteriores intercambiaron etiquetas M5/M14/M15/M18 u otras,
  ignorar esas etiquetas y seguir la matriz real.

evaluation_model:

  executive_value:
    weight: "VERY_HIGH"
    evaluate:
      - "preguntas directivas nuevas"
      - "detección de desviaciones/riesgos"
      - "capacidad de explicar qué requiere atención"
      - "reducción de navegación manual"

  reasoning_value:
    weight: "VERY_HIGH"
    evaluate:
      - "evidencia nueva para diagnóstico"
      - "capacidad causal/contextual"
      - "combinación con M2/M3/M6/M9/M12"
      - "profundidad adicional real"

  incremental_value:
    weight: "VERY_HIGH"
    evaluate:
      - "qué no puede responder hoy"
      - "qué duplica"
      - "qué hueco neto cubre"

  actionability:
    weight: "HIGH"
    evaluate:
      - "identifica planta"
      - "cliente"
      - "partida"
      - "responsable"
      - "acción"
      - "riesgo"
      - "fecha"

  frequency:
    weight: "HIGH"

  implementation_path:
    weight: "MEDIUM"
    evaluate:
      - "fuente/helper existente"
      - "intent/tool"
      - "executor"
      - "in-process"
      - "primer slice útil"

  risk:
    weight: "MEDIUM"
    penalize:
      - "writes"
      - "Excel"
      - "S3"
      - "Twilio/WhatsApp"
      - "side effects"
      - "cross-module coupling"
      - "semantic ambiguity"

  percentage:
    weight: "LOW"

mandatory_rechecks:

  M4:
    - "mantener PARTIAL_ONLY para query read-only"
    - "COMPARAR/Excel clase C fuera del slice"
    - "evaluar si ahora sigue teniendo valor marginal suficiente"

  M6:
    - "query ya integrada"
    - "evaluar únicamente valor restante de Export"
    - "penalizar continuidad por inercia"
    - "no contar PARTIAL otra vez"

  M7:
    - "auditar qué partes reales de IGF ya están integradas"
    - "qué preguntas financieras faltan"
    - "si puede aportar explicación/causalidad nueva"
    - "qué source/helper real existe"
    - "qué diferencia tiene respecto a M6"

  M8:
    - "auditar ARR actual"
    - "separar ARR de M9 deltas"
    - "determinar valor incremental"

  M11:
    - "auditar DICF actual"
    - "qué evidencia aporta"
    - "si permite explicar causa/seguimiento"
    - "qué falta para mayor profundidad"

  M12:
    - "Action Register ya integrado parcialmente"
    - "identificar huecos reales"
    - "evitar duplicar history M2"

  M18:
    - "usar definición canónica real"
    - "auditar presupuesto/finanzas según ficha"
    - "no mezclar etiquetas de prompts previos"

  WhatsApp_modules:
    - "canal != conocimiento"
    - "valorar solo información nueva o capacidad ejecutiva nueva"

mandatory_question_map:
  for_each_candidate:
    - "qué preguntas NUEVAS podrá responder"
    - "qué preguntas ya puede responder"
    - "qué preguntas serían duplicadas"
    - "qué preguntas no soporta la fuente"

physical_audit:
  for_each_candidate:
    - "fuente física"
    - "helpers"
    - "queries"
    - "intent"
    - "tool"
    - "executor"
    - "authz"
    - "plant_scope"
    - "side_effects"
    - "external_dependency"
    - "semantic_risk"
    - "testability"
    - "first_slice"
    - "state_after_slice"
    - "percentage_effect"

mandatory_table:
  columns:
    - "rank"
    - "module"
    - "current_state"
    - "new_executive_questions"
    - "executive_value"
    - "reasoning_value"
    - "incremental_value"
    - "frequency"
    - "actionability"
    - "source_ready"
    - "wiring_ready"
    - "authz_fit"
    - "dependencies"
    - "mutation_risk"
    - "semantic_risk"
    - "first_useful_slice"
    - "state_after_slice"
    - "percentage_effect"
    - "decision"

ranking_rules:
  - "No elegir por porcentaje."
  - "No elegir por número."
  - "No elegir por facilidad sola."
  - "No continuar M6 por inercia."
  - "Penalizar duplicación con M2/M3/M6/M9/M12."
  - "Preferir hechos observables."
  - "Preferir fuentes estructuradas."
  - "Preferir in-process."
  - "Preferir valor diagnóstico/actionable."
  - "Penalizar writes y dependencias externas."

winner_requirements:
  exactly_one: true

  must_include:
    - "ganador"
    - "segundo lugar"
    - "por qué gana"
    - "por qué pierde el segundo"
    - "preguntas nuevas habilitadas"
    - "primer slice"
    - "estado después del slice"
    - "efecto porcentual"
    - "riesgos"
    - "dependencias"
    - "gates necesarios"

next_task_policy:
  if_readiness_needed:
    pattern: "ARCH-DIRECTOR-IA-<MODULE>-<SLICE>-READINESS-001"

  if_gap_fully_verified:
    pattern: "IMPL-DIRECTOR-IA-<MODULE>-<SLICE>-001"

  rule: >
    Proponer exactamente una NEXT_TASK. No autorizar ni ejecutar.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
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
  - "modificar código"
  - "modificar runtime"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "modificar capability matrix"
  - "modificar contratos"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Baseline 9.0/20 = 45.0% verificado."
  - "Nombres canónicos verificados desde matriz."
  - "Todos los candidatos relevantes evaluados."
  - "M6 restante evaluado sin inercia."
  - "Se identificaron preguntas ejecutivas nuevas."
  - "Se midió valor incremental."
  - "Se verificaron fuentes físicas."
  - "Se verificó wiring."
  - "Se verificó authz."
  - "Se verificó scope planta."
  - "Se verificaron dependencias."
  - "Se produjo ranking."
  - "Existe exactamente un ganador."
  - "Existe segundo lugar."
  - "Existe exactamente una NEXT_TASK."
  - "No se implementó nada."
  - "No se modificó matriz."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline 45.0%"
    - "capacidad actual"
    - "huecos globales"
    - "preguntas ejecutivas nuevas"
    - "candidatos"
    - "tabla comparativa"
    - "ranking"
    - "ganador"
    - "segundo lugar"
    - "primer slice"
    - "estado posterior"
    - "efecto porcentual"
    - "riesgos"
    - "dependencias"
    - "gates"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un ganador defendible. STOPPED si ningún
  frente pendiente supera el costo/riesgo marginal sin decisión contractual.
  BLOCKED si falta gate humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-002.md"