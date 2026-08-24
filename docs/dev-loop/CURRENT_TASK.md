# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente frente global de Director IA desde el baseline 52.5%,
  comparando módulos no COMPLETE, profundizaciones materiales, gaps transversales
  y específicamente la capacidad de transformar evidencia ya ensamblada en
  priorización ejecutiva y recomendaciones accionables, sin inventar causalidad
  ni reabrir contratos salvo evidencia de necesidad.

baseline:
  numerator: 10.5
  denominator: 20
  percentage: 52.5

  recent_capabilities:
    - "M5 Taller por AT"
    - "M7 composición IGF"
    - "M11 expediente comercial"
    - "M12 revision notes"
    - "M18 presupuesto semanal"
    - "financial_diagnosis multi-source"
    - "plant_diagnosis multi-source"

  rule: >
    Esta tarea no cambia estados ni porcentaje.

primary_question: >
  ¿Cuál es ahora el mayor cuello de botella de Director IA:
  falta de cobertura, falta de evidencia, falta de conexión entre fuentes o
  falta de capacidad para convertir evidencia ya reunida en prioridades y
  recomendaciones ejecutivas accionables?

special_candidate:
  name: "executive_prioritization_and_recommendation"

  audit_not_assume: true

  motivating_gap: >
    plant_diagnosis ya puede reunir seis fuentes, pero una respuesta que solo
    enumera acciones, clientes, KPI y riesgos sigue siendo vaga. Falta determinar
    si Director IA puede identificar materialidad, concentración, excepciones,
    cobertura de acción y recomendar qué revisar primero.

  target_behavior_examples:
    - "Estas son las 3 cosas que debes revisar primero."
    - "Este cliente concentra la mayor pérdida y no tiene acción."
    - "Esta acción está vencida y corresponde al segundo mayor impacto observable."
    - "Esta evidencia justifica investigar primero este frente."
    - "No puedo afirmar la causa; sí puedo recomendar dónde revisar primero."

  forbidden_assumption: >
    No asumir que esta capacidad ya está permitida ni que requiere contrato nuevo.
    Auditar físicamente Constitución, IES, Reasoning Engine, planner, chat y runtime.

priority_model:

  executive_value:
    weight: "CRITICAL"

  actionability:
    weight: "CRITICAL"

  materiality_value:
    weight: "CRITICAL"
    evaluate:
      - "magnitud"
      - "concentración"
      - "desviación observable"
      - "urgencia físicamente soportada"
      - "cobertura de acción"
      - "acciones vencidas"
      - "ausencia de seguimiento"
      - "impacto económico observable"

  reasoning_value:
    weight: "CRITICAL"

  evidence_connectivity:
    weight: "CRITICAL"

  new_domain_value:
    weight: "VERY_HIGH"

  incremental_value:
    weight: "VERY_HIGH"

  frequency:
    weight: "HIGH"

  source_readiness:
    weight: "MEDIUM"

  implementation_cost:
    weight: "MEDIUM"

  risk:
    weight: "MEDIUM"
    penalize:
      - "causalidad inventada"
      - "score arbitrario"
      - "writes"
      - "Excel"
      - "S3"
      - "Twilio"
      - "external dependencies"
      - "contract reopening"
      - "duplicación"

  percentage_effect:
    weight: "LOW"

mandatory_rechecks:
  - "M1"
  - "M2 restante"
  - "M4 restante"
  - "M5 restante"
  - "M6 restante"
  - "M7 restante"
  - "M8"
  - "M10"
  - "M11 restante"
  - "M12 restante"
  - "M14"
  - "M15"
  - "M17"
  - "M18 restante"
  - "M20"
  - "executive_prioritization_and_recommendation"
  - "cualquier otro gap transversal físico"

executive_prioritization_audit:

  contracts:
    inspect:
      - "CONSTITUTION"
      - "04-IES-STANDARD.md"
      - "05-REASONING-ENGINE.md"
      - "EXECUTIVE_KNOWLEDGE_ENGINE"
      - "planner contracts"

    determine:
      - "si Recommendation ya existe contractualmente"
      - "si Recommendation exige evidence anchors"
      - "si materiality/prioritization ya está permitida"
      - "si hypothesis vs recommendation está separada"
      - "si hace falta G2/G3"

  runtime:
    inspect:
      - "plant_diagnosis assembled evidence"
      - "financial_diagnosis assembled evidence"
      - "chat prompts"
      - "reasoning instructions"
      - "response formatting"
      - "source provenance"

    determine:
      - "si el modelo hoy recibe datos suficientes para priorizar"
      - "si falta un ranking/materiality step"
      - "si falta una estructura de recommendation"
      - "si el problema es prompt/wiring o contrato"

  materiality:
    determine:
      - "qué magnitudes comparables existen"
      - "qué concentración puede calcularse"
      - "qué impacto económico existe"
      - "qué vencimiento existe"
      - "qué ausencia de acción puede observarse"
      - "qué campos NO son comparables"

    rules:
      - "no crear score arbitrario"
      - "no mezclar unidades incompatibles"
      - "no convertir magnitud en causalidad"
      - "prioridad debe explicarse con evidencia"

  recommendation:
    determine:
      - "qué tipo de acciones puede recomendar sin write"
      - "revisar"
      - "validar"
      - "contactar"
      - "pedir resultado"
      - "asignar seguimiento"
      - "escalar para revisión"

    rule: >
      Recomendación ejecutiva no equivale a acción automática. Debe conservar
      control humano y evidencia de por qué se sugiere.

  ranking_shape:
    candidate_hypothesis:
      - "priority"
      - "finding"
      - "materiality_basis"
      - "evidence_refs"
      - "recommended_next_step"
      - "uncertainty"
      - "limitations"

    rule: >
      Esta forma es hipótesis de runtime, no contrato nuevo. Verificar si puede
      mapearse a Recommendation vigente.

  causal_boundary:
    - "priorizar != probar causa"
    - "materialidad != causalidad"
    - "correlación != explicación causal"
    - "recomendación de investigar != afirmar motivo"

  actionability_boundary:
    - "sugerir siguiente paso != ejecutar write"
    - "no crear/editar acciones"
    - "no enviar mensajes"
    - "no asignar responsables automáticamente"

M10_recheck:
  required:
    - "definición canónica"
    - "weekly discount read-only"
    - "fuente real"
    - "qué duplica ARR/M9"
    - "qué aporta intra-mes"
    - "qué depende de Twilio"
    - "preguntas nuevas"
    - "actionability"
    - "state after slice"
    - "percentage effect"

other_transversal_review:
  required:
    - "buscar otros gaps físicos concretos"
    - "no repetir financial/plant diagnosis por inercia"
    - "no crear una capa abstracta sin evidencia"

mandatory_question_map:
  for_each_candidate:
    - "qué pregunta nueva responde"
    - "qué decisión mejora"
    - "qué acción sugiere"
    - "qué materialidad usa"
    - "qué evidencia soporta la prioridad"
    - "qué no puede afirmar"
    - "qué ya está cubierto"
    - "qué duplica"

physical_audit:
  for_each_candidate:
    - "sources"
    - "helpers"
    - "planner/tool/runtime"
    - "context"
    - "authz"
    - "physical keys"
    - "units"
    - "side effects"
    - "contract impact"
    - "semantic risk"
    - "first useful slice"
    - "state after slice"
    - "percentage effect"

mandatory_table:
  columns:
    - "rank"
    - "candidate"
    - "type"
    - "current_state"
    - "new_questions"
    - "executive_value"
    - "actionability"
    - "materiality_value"
    - "reasoning_value"
    - "evidence_connectivity"
    - "new_domain_value"
    - "source_ready"
    - "wiring_ready"
    - "contract_impact"
    - "risk"
    - "first_slice"
    - "state_after_slice"
    - "percentage_effect"
    - "decision"

ranking_rules:
  - "No elegir por porcentaje."
  - "No elegir por facilidad."
  - "No elegir M10 por ranking previo."
  - "No elegir prioritization solo porque surgió en conversación."
  - "Debe existir gap físico/contractual verificable."
  - "No usar scores arbitrarios."
  - "Premiar acción concreta soportada por evidencia."
  - "Premiar materialidad defendible."
  - "Penalizar recomendaciones genéricas."
  - "Penalizar causalidad inferida."
  - "Preferir read-only e in-process."

winner_requirements:
  exactly_one: true
  second_place_exactly_one: true

  must_include:
    - "ganador"
    - "tipo"
    - "segundo lugar"
    - "preguntas nuevas"
    - "acción ejecutiva nueva"
    - "base de materialidad"
    - "por qué gana"
    - "por qué pierde segundo"
    - "first slice"
    - "state after"
    - "percentage effect"
    - "G2/G3"
    - "risks"
    - "dependencies"

next_task_policy:
  if_prioritization_readiness:
    pattern: "ARCH-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-READINESS-001"

  if_module_readiness:
    pattern: "ARCH-DIRECTOR-IA-<MODULE>-<SLICE>-READINESS-001"

  if_other_transversal:
    pattern: "ARCH-DIRECTOR-IA-<SLICE>-READINESS-001"

  rule: >
    Proponer exactamente una NEXT_TASK. No autorizar ni ejecutar.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010.md"

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
  - "modificar matriz"
  - "modificar contratos"
  - "reabrir IES/RE"
  - "crear scoring nuevo"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Baseline 10.5/20 = 52.5% verificado."
  - "Todos los candidatos relevantes reevaluados."
  - "Executive prioritization auditada físicamente."
  - "Recommendation contractual auditada."
  - "Materialidad físicamente defendible auditada."
  - "No se inventó scoring."
  - "M10 reevaluado desde cero."
  - "Existe ranking."
  - "Existe exactamente un ganador."
  - "Existe exactamente un segundo."
  - "Existe exactamente una NEXT_TASK."
  - "No se implementó."
  - "No se modificó matriz."
  - "No se modificaron contratos."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "current capability map"
    - "module gaps"
    - "reasoning gaps"
    - "executive prioritization gap"
    - "recommendation contract audit"
    - "materiality audit"
    - "actionability audit"
    - "candidates"
    - "ranking"
    - "winner"
    - "runner-up"
    - "first slice"
    - "state after"
    - "percentage effect"
    - "contract impact"
    - "gates"
    - "risks"
    - "dependencies"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un ganador defendible. STOPPED si executive
  prioritization requiere decisión contractual nueva o ningún candidato
  justifica inversión. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-010.md"