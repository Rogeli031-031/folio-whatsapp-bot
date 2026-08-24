# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente frente global de Director IA desde el baseline 50.0%,
  comparando todos los módulos no COMPLETE por valor ejecutivo marginal,
  reasoning value, actionability, frecuencia, fuentes físicas, seguridad y
  costo de integración. No continuar M18 por inercia ni elegir M12 solo por
  haber quedado segundo previamente.

baseline:
  numerator: 10.0
  denominator: 20
  percentage: 50.0

  recent_changes:
    - "M2 profundo: status + history + documents metadata"
    - "M4 = PARTIAL con query comparativa mes_a vs mes_b"
    - "M6 = PARTIAL con query GASTOS / INVERSIONES"
    - "M18 = PARTIAL con presupuesto semanal read-only"
    - "M4 COMPARAR/Excel fuera"
    - "M6 Export fuera"
    - "M18 writes/cheques/WhatsApp fuera"

  rule: >
    Esta tarea no cambia estados ni porcentaje. El 50.0% es baseline, no criterio
    principal de decisión.

primary_question: >
  ¿Qué módulo o slice pendiente aporta ahora el mayor incremento neto de
  inteligencia ejecutiva, considerando todo lo ya integrado y penalizando
  duplicación, writes, dependencias externas, canales y semántica débil?

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
  Usar exclusivamente nombres y propósitos de las fichas canónicas vigentes.
  Ignorar etiquetas incorrectas de prompts anteriores.

mandatory_rechecks:
  - "M1"
  - "M2 restante"
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
  - "M18 restante"
  - "M20"
  - "cualquier otro módulo no COMPLETE vigente"

special_rechecks:

  M12:
    required:
      - "Action Register ya integrado"
      - "qué huecos reales quedan"
      - "notas / includeNotes"
      - "si notas agregan contexto causal/seguimiento"
      - "si habilitan preguntas nuevas o solo enriquecen respuestas existentes"
      - "fuente física"
      - "read-only"
      - "authz"
      - "primer slice útil"

  M7:
    required:
      - "IGF actual"
      - "qué ya se consulta"
      - "qué preguntas financieras siguen faltando"
      - "si aporta causalidad/contexto nuevo"
      - "qué se solapa con M6"

  M8:
    required:
      - "ARR actual"
      - "qué falta"
      - "qué duplica M9"
      - "valor incremental"

  M11:
    required:
      - "DICF actual"
      - "qué ya responde"
      - "qué falta"
      - "si puede aportar causas, acciones o seguimiento nuevo"
      - "si mejora reasoning ejecutivo"

  M20:
    required:
      - "Home KPI"
      - "qué agrega sobre M3"
      - "si es resumen redundante"
      - "si tiene fuente nueva"

  M18_remaining:
    required:
      - "presupuesto semanal ya integrado"
      - "evaluar únicamente writes/cheques/WhatsApp restante"
      - "penalizar continuidad por inercia"
      - "no contar PARTIAL nuevamente"

  M4_remaining:
    required:
      - "query comparativa ya integrada"
      - "evaluar solo COMPARAR/Excel restante"
      - "penalizar writes y Excel"

  M6_remaining:
    required:
      - "query ya integrada"
      - "evaluar solo Export/xlsx restante"

  WhatsApp_modules:
    required:
      - "canal != conocimiento"
      - "no premiar transporte por sí mismo"
      - "solo contar nueva información ejecutiva"

evaluation_model:

  executive_value:
    weight: "VERY_HIGH"
    evaluate:
      - "preguntas directivas nuevas"
      - "detección de riesgo/desviación"
      - "capacidad para decidir dónde mirar"
      - "reducción de navegación manual"

  reasoning_value:
    weight: "VERY_HIGH"
    evaluate:
      - "evidencia nueva para explicación"
      - "contexto causal"
      - "capacidad de combinar M2/M3/M4/M6/M9/M12/M18"
      - "profundidad diagnóstica"

  incremental_value:
    weight: "VERY_HIGH"
    evaluate:
      - "qué no sabe hoy Director IA"
      - "qué hueco nuevo cubre"
      - "qué duplica"

  actionability:
    weight: "HIGH"
    evaluate:
      - "responsable"
      - "acción"
      - "planta"
      - "cliente"
      - "partida"
      - "riesgo"
      - "fecha"
      - "prioridad"

  frequency:
    weight: "HIGH"

  implementation_path:
    weight: "MEDIUM"
    evaluate:
      - "fuente física"
      - "helper"
      - "intent"
      - "tool"
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
      - "stubs"

  percentage_effect:
    weight: "LOW"

mandatory_question_map:
  for_each_candidate:
    - "qué preguntas NUEVAS habilita"
    - "qué preguntas ya responde"
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
  - "No continuar M18/M4/M6 por inercia."
  - "No elegir M12 por ranking previo."
  - "Penalizar duplicación con capacidades actuales."
  - "Preferir hechos observables."
  - "Preferir fuentes estructuradas."
  - "Preferir in-process."
  - "Preferir valor diagnóstico/actionable."
  - "Penalizar writes/dependencias externas/stubs."

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
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004.md"

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
  - "Baseline 10.0/20 = 50.0% verificado."
  - "Nombres canónicos verificados desde matriz."
  - "Todos los candidatos relevantes reevaluados."
  - "M12 reevaluado desde cero."
  - "M18 restante evaluado sin inercia."
  - "M4/M6 restantes evaluados sin inercia."
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
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline 50.0%"
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

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-004.md"