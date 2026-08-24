# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente frente global de Director IA desde el baseline 52.5%,
  reevaluando módulos no COMPLETE, profundizaciones materiales y oportunidades
  transversales de reasoning. Elegir únicamente por valor ejecutivo marginal
  real, novelty, evidence connectivity, actionability, riesgo y costo de
  integración; no por porcentaje, facilidad ni ranking previo.

baseline:
  numerator: 10.5
  denominator: 20
  percentage: 52.5

  recent_capabilities:
    - "M5 Taller por AT read-only"
    - "M7 composición IGF"
    - "M11 expediente comercial"
    - "M12 revision notes"
    - "M18 presupuesto semanal"
    - "financial_diagnosis = IGF + ARR + M9 en una corrida"
    - "provenance multi-source"
    - "partial failures explícitos"

  rule: >
    Esta tarea no cambia estados ni porcentaje.

primary_question: >
  ¿Cuál es ahora el cuello de botella más importante para que Director IA sea
  más útil a un director: un dominio todavía silencioso, una evidencia material
  aún oculta, una profundización de alto valor o un gap transversal de reasoning
  físicamente comprobable?

candidate_classes:
  - "módulo/dominio todavía no integrado"
  - "slice adicional material de un módulo PARTIAL"
  - "evidencia ya cargada pero no expuesta"
  - "wiring transversal de reasoning/evidence"
  - "gap de actionability"

canonical_source:
  matrix: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

canonical_rule: >
  Para candidatos de módulo usar exclusivamente nombres, propósito y estado
  vigentes de la matriz canónica.

priority_model:

  executive_value:
    weight: "CRITICAL"
    evaluate:
      - "preguntas directivas nuevas"
      - "riesgos que hoy quedan invisibles"
      - "qué merece atención"
      - "qué decisión mejora"

  reasoning_value:
    weight: "CRITICAL"
    evaluate:
      - "mejor diagnóstico"
      - "mejor explicación"
      - "mejores hipótesis soportadas"
      - "menos respuesta descriptiva"

  evidence_connectivity:
    weight: "CRITICAL"
    evaluate:
      - "conecta evidencia físicamente relacionable"
      - "preserva provenance"
      - "reduce silos"
      - "no inventa joins"

  new_domain_value:
    weight: "VERY_HIGH"

  actionability:
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
      - "writes"
      - "Excel"
      - "S3"
      - "Twilio/WhatsApp"
      - "external dependencies"
      - "semantic ambiguity"
      - "stubs"
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
  - "cualquier otro módulo no COMPLETE"

special_rechecks:

  M10:
    required:
      - "definición canónica exacta"
      - "qué parte es narrativa weekly discount"
      - "fuente física real"
      - "qué duplica ARR/M9"
      - "qué parte depende de Twilio"
      - "qué slice estrictamente read-only existe"
      - "preguntas ejecutivas realmente nuevas"
      - "frecuencia y actionability"

  M8:
    required:
      - "ARR actual"
      - "qué falta después de M9 y financial_diagnosis"
      - "evidencia no expuesta"
      - "si existe valor incremental"

  M14:
    required:
      - "definición canónica"
      - "usuarios/permisos"
      - "qué preguntas ejecutivas habilita"
      - "fuente y authz"
      - "riesgo de exposición"

  M15:
    required:
      - "PDF/documentos"
      - "metadata M2 ya integrada"
      - "contenido/S3/OCR restante"
      - "valor ejecutivo"
      - "dependencias"
      - "riesgo"

  M17:
    required:
      - "definición canónica exacta"
      - "fuente"
      - "preguntas nuevas"
      - "read-only slice"
      - "dependencias"

  M20:
    required:
      - "Home KPI"
      - "fuente nueva o resumen"
      - "si financial_diagnosis ya cubre su valor"
      - "si agrega priorización real"

  recent_partial_modules:
    required:
      - "M5/M7/M11/M12/M18 no continuar por inercia"
      - "solo considerar gap nuevo y material"

transversal_review:
  required:
    - "financial_diagnosis ya resuelto; no repetir patrón por inercia"
    - "buscar otro gap físico real en planner/orchestrator/context/chat"
    - "auditar si existe pregunta ejecutiva multi-domain actualmente imposible"
    - "determinar si contrato vigente ya la permite"
    - "no crear una nueva capa abstracta"

  candidate_examples_to_audit_not_assume:
    - "plant diagnosis multi-source"
    - "commercial diagnosis multi-source"
    - "folio + budget + actions"
    - "executive prioritization across domains"

  rule: >
    Un transversal solo compite si se identifica un corte físico concreto del
    runtime y puede resolverse sin reabrir contratos o inventar joins.

hidden_evidence_review:
  required: >
    Buscar estructuras ya cargadas en runtime pero omitidas de context,
    summarizers o respuesta. Solo cuentan si habilitan preguntas o reasoning
    materialmente nuevos.

mandatory_question_map:
  for_each_candidate:
    - "qué pregunta NUEVA responde"
    - "qué ya responde Director IA"
    - "qué duplica"
    - "qué evidencia nueva aporta"
    - "qué reasoning nuevo permite"
    - "qué actionability agrega"
    - "qué NO puede afirmar"

physical_audit:
  for_each_candidate:
    - "physical source"
    - "helper/query"
    - "intent"
    - "tool"
    - "executor"
    - "context builder"
    - "authz"
    - "plant scope"
    - "join keys"
    - "side effects"
    - "external dependency"
    - "contract impact"
    - "semantic risk"
    - "testability"
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
    - "reasoning_value"
    - "evidence_connectivity"
    - "new_domain_value"
    - "actionability"
    - "incremental_value"
    - "source_ready"
    - "wiring_ready"
    - "contract_impact"
    - "dependencies"
    - "risk"
    - "first_slice"
    - "state_after_slice"
    - "percentage_effect"
    - "decision"

ranking_rules:
  - "No elegir por porcentaje."
  - "No elegir por facilidad."
  - "No elegir M10 por haber quedado segundo."
  - "No continuar el último ganador por inercia."
  - "Penalizar dominio duplicado."
  - "Penalizar transporte/canal sin conocimiento nuevo."
  - "Premiar fuente física estructurada."
  - "Premiar reasoning material."
  - "Premiar evidence connectivity verificable."
  - "Premiar actionability."
  - "Preferir SELECT-only e in-process."
  - "Penalizar reabrir contratos."

winner_requirements:
  exactly_one: true
  second_place_exactly_one: true

  must_include:
    - "ganador"
    - "tipo de candidato"
    - "segundo lugar"
    - "preguntas nuevas"
    - "por qué gana"
    - "por qué pierde el segundo"
    - "reasoning/evidence gain"
    - "first useful slice"
    - "state after slice"
    - "percentage effect"
    - "G2/G3"
    - "risks"
    - "dependencies"

next_task_policy:
  if_readiness_needed:
    module_pattern: "ARCH-DIRECTOR-IA-<MODULE>-<SLICE>-READINESS-001"
    transversal_pattern: "ARCH-DIRECTOR-IA-<SLICE>-READINESS-001"

  if_fully_verified:
    pattern: "IMPL-DIRECTOR-IA-<SLICE>-001"

  rule: >
    Proponer exactamente una NEXT_TASK. No autorizar ni ejecutar.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009.md"

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
  - "modificar tests"
  - "modificar frontend"
  - "modificar SQL"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Baseline 10.5/20 = 52.5% verificado."
  - "Todos los candidatos relevantes reevaluados."
  - "M10 reevaluado desde cero."
  - "Transversales reevaluados sin inercia."
  - "Hidden evidence auditada."
  - "Se identificaron preguntas nuevas."
  - "Se verificaron fuentes físicas."
  - "Se verificó contract impact."
  - "Existe ranking único."
  - "Existe exactamente un ganador."
  - "Existe exactamente un segundo."
  - "Existe exactamente una NEXT_TASK."
  - "No se implementó."
  - "No se modificó matriz."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline 52.5%"
    - "current capability map"
    - "module gaps"
    - "reasoning gaps"
    - "transversal gaps"
    - "hidden evidence gaps"
    - "candidatos"
    - "ranking"
    - "ganador"
    - "segundo"
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
  DONE_PENDING_REVIEW si existe un ganador defendible. STOPPED si ningún
  candidato restante justifica inversión incremental. BLOCKED si falta gate.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-009.md"