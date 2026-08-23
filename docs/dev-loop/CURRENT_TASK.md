# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente frente global de Director IA desde el baseline 47.5%,
  comparando todos los módulos no COMPLETE por valor ejecutivo marginal,
  capacidad de razonamiento, actionability, frecuencia, fuentes físicas,
  seguridad, dependencia y costo de integración. No continuar M4 por inercia
  ni elegir M18 solo por haber quedado segundo en una priorización anterior.

baseline:
  numerator: 9.5
  denominator: 20
  percentage: 47.5

  recent_changes:
    - "M2 profundizado: status + history + documents metadata"
    - "M6 = PARTIAL con query GASTOS / INVERSIONES"
    - "M4 = PARTIAL con comparativo mes_a vs mes_b"
    - "M4 COMPARAR/Excel siguen fuera"
    - "M6 Export/Excel sigue fuera"

  rule: >
    Esta tarea no cambia estados ni porcentaje. El 47.5% es baseline, no criterio
    principal de decisión.

primary_question: >
  ¿Qué módulo o slice pendiente produce ahora el mayor incremento neto de
  inteligencia ejecutiva para Director IA, considerando todo lo ya integrado
  y penalizando duplicación, writes, dependencias externas e inferencias débiles?

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

canonical_labels_rule: >
  Usar exclusivamente nombres, propósitos y estados vigentes de las fichas
  canónicas. No reutilizar etiquetas incorrectas de prompts previos.

mandatory_rechecks:
  - "M1"
  - "M4 restante"
  - "M5"
  - "M6 restante"
  - "M7"
  - "M8"
  - "M10"
  - "M11"
  - "M12"
  - "M14"
  - "M15"
  - "M17"
  - "M18"
  - "M20"
  - "cualquier otro módulo no COMPLETE vigente"

special_rechecks:

  M4_remaining:
    required:
      - "query comparativa ya integrada"
      - "evaluar únicamente COMPARAR/Excel restante"
      - "penalizar writes"
      - "penalizar continuidad por inercia"
      - "no contar PARTIAL otra vez"

  M6_remaining:
    required:
      - "query GASTOS/INVERSIONES ya integrada"
      - "evaluar solo Export/xlsx restante"
      - "no contar PARTIAL otra vez"

  M7:
    required:
      - "qué sabe ya Director IA de IGF"
      - "qué preguntas financieras siguen sin respuesta"
      - "qué evidencia causal/contextual puede aportar"
      - "qué source/helper físico existe"
      - "qué se solapa con M6"

  M8:
    required:
      - "qué sabe ya de ARR"
      - "qué falta"
      - "qué duplica M9"
      - "qué valor incremental queda"

  M11:
    required:
      - "DICF actual"
      - "qué consultas ya existen"
      - "qué evidencia causal o de seguimiento falta"
      - "si profundizar DICF mejora reasoning ejecutivo"

  M12:
    required:
      - "Action Register actual"
      - "qué huecos reales quedan"
      - "si agrega valor superior a otro módulo"
      - "no duplicar M2 history"

  M18:
    required:
      - "leer definición canónica exacta"
      - "fuentes físicas"
      - "presupuestos semanales"
      - "cheques si realmente pertenecen"
      - "writes/dependencias"
      - "primer slice read-only posible"
      - "valor semanal"
      - "si realmente supera otros candidatos ahora"

  M20:
    required:
      - "Home KPI"
      - "qué aporta sobre M3"
      - "si es resumen duplicado o evidencia nueva"

  WhatsApp_modules:
    required:
      - "canal != conocimiento"
      - "no premiar transporte por sí mismo"
      - "solo valorar si aporta información ejecutiva nueva"

evaluation_model:

  executive_value:
    weight: "VERY_HIGH"
    evaluate:
      - "preguntas directivas nuevas"
      - "detección de desviaciones/riesgos"
      - "capacidad para decidir dónde mirar"
      - "reducción de navegación manual"

  reasoning_value:
    weight: "VERY_HIGH"
    evaluate:
      - "nueva evidencia para diagnóstico"
      - "contexto causal"
      - "capacidad de combinarse con M2/M3/M4/M6/M9/M12"
      - "explicación, no solo listado"

  incremental_value:
    weight: "VERY_HIGH"
    evaluate:
      - "qué no sabe hoy Director IA"
      - "qué hueco neto cubre"
      - "qué duplica"

  actionability:
    weight: "HIGH"
    evaluate:
      - "planta"
      - "cliente"
      - "responsable"
      - "partida"
      - "riesgo"
      - "fecha"
      - "acción posible"

  frequency:
    weight: "HIGH"

  implementation_path:
    weight: "MEDIUM"
    evaluate:
      - "fuente física"
      - "helpers"
      - "intent"
      - "tool"
      - "executor"
      - "in-process"
      - "first useful slice"

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
      - "stubs"

  percentage_effect:
    weight: "LOW"
    rule: >
      Registrar impacto futuro real, pero nunca elegir por porcentaje.

mandatory_question_map:
  for_each_candidate:
    - "qué preguntas NUEVAS habilita"
    - "qué ya puede responder Director IA"
    - "qué sería duplicado"
    - "qué no soporta la fuente"

physical_audit:
  for_each_candidate:
    - "fuente primaria"
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
  - "No elegir por número."
  - "No elegir por porcentaje."
  - "No elegir por facilidad solamente."
  - "No continuar M4 ni M6 por inercia."
  - "No elegir M18 por ranking previo."
  - "Penalizar duplicación con capacidades actuales."
  - "Preferir hechos observables."
  - "Preferir datos estructurados."
  - "Preferir integración in-process."
  - "Preferir valor diagnóstico y actionable."
  - "Penalizar writes y dependencias externas."
  - "Penalizar stubs."

winner_requirements:
  exactly_one: true

  must_include:
    - "ganador"
    - "segundo lugar"
    - "preguntas nuevas"
    - "por qué gana"
    - "por qué pierde el segundo"
    - "primer slice"
    - "estado posterior"
    - "efecto porcentual"
    - "riesgos"
    - "dependencias"
    - "gates"

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
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003.md"

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
  - "Baseline 9.5/20 = 47.5% verificado."
  - "Nombres canónicos verificados desde matriz."
  - "Todos los candidatos relevantes reevaluados."
  - "M4 restante evaluado sin inercia."
  - "M6 restante evaluado sin inercia."
  - "M18 reevaluado desde cero."
  - "Se identificaron preguntas ejecutivas nuevas."
  - "Se midió valor incremental."
  - "Se verificaron fuentes físicas."
  - "Se verificó wiring."
  - "Se verificó authz."
  - "Se verificó scope planta."
  - "Se verificaron dependencias."
  - "Se produjo ranking."
  - "Existe exactamente un ganador."
  - "Existe exactamente un segundo lugar."
  - "Existe exactamente una NEXT_TASK."
  - "No se implementó nada."
  - "No se modificó matriz."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline 47.5%"
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
  DONE_PENDING_REVIEW si existe un ganador global defendible. STOPPED si ningún
  frente restante aporta suficiente valor marginal sin decisión contractual.
  BLOCKED si falta gate humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-003.md"