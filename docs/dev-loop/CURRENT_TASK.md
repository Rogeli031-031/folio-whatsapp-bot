# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente frente global de Director IA después de EXIT_M2,
  comparando todos los módulos no COMPLETE por valor ejecutivo marginal,
  profundidad de razonamiento, frecuencia de uso, actionability, fuentes
  físicas existentes, seguridad y costo de integración. El porcentaje M0-M20
  es un dato secundario y no debe dominar la decisión.

strategic_context:
  previous_task: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-003"
  previous_outcome: "EXIT_M2"

  reason_for_exit_m2: >
    M2 ya cubre sus preguntas ejecutivas principales mediante comentarios,
    folio_status, history y documents metadata. Los huecos restantes requieren
    inferencias inseguras, dependencias de otros módulos o superficies clase C,
    y su valor marginal inmediato es menor.

baseline:
  global_percentage: 42.5
  numerator: 8.5
  denominator: 20

  rule: >
    No cambiar porcentaje durante esta tarea. No contar profundizaciones de
    módulos ya PARTIAL como nuevos puntos.

current_high_value_capabilities:
  - "M3: Plantas / KPIs / Proyectos"
  - "M9: Delta Venta / Descuento / Ingreso"
  - "M12: Action Register parcial/operativo"
  - "M13"
  - "M16"
  - "M2 profundo: comentarios + status + history + documents metadata"

primary_question: >
  ¿Qué módulo o frente pendiente produce ahora el mayor incremento de utilidad
  ejecutiva para Director IA, considerando lo que ya sabe y evitando duplicar
  capacidades existentes?

candidate_scope:
  derive_from: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  include:
    - "PARTIAL"
    - "INDIRECTA"
    - "NO INTEGRADA / NOT_STARTED"
    - "BLOCKED si su blocker puede reconsiderarse"

  exclude:
    - "COMPLETE"
    - "N_A"
    - "M2 como siguiente frente inmediato, salvo evidencia extraordinaria nueva"

mandatory_candidates:
  - "M1 Health"
  - "M4 Clasificación + COMPARAR"
  - "M5 Presupuestos / Cheques"
  - "M6 GASTOS / INVERSIONES"
  - "M7 IGF"
  - "M8 ARR"
  - "M10 WhatsApp operativo"
  - "M11 DICF"
  - "M12 Action Register"
  - "M14 Documentos / PDFs"
  - "M15 Usuarios / permisos"
  - "M17 WhatsApp bridge"
  - "M18 Folios financieros / presupuestos"
  - "M20 Home KPI"
  - "cualquier otro módulo no COMPLETE relevante"

evaluation_model:

  executive_value:
    weight: "VERY_HIGH"
    questions:
      - "¿Qué preguntas directivas nuevas habilita?"
      - "¿Ayuda a detectar desviaciones, causas, responsables o prioridades?"
      - "¿Reduce navegación manual?"
      - "¿Aumenta capacidad de diagnóstico?"

  reasoning_value:
    weight: "VERY_HIGH"
    questions:
      - "¿Aporta evidencia causal/contextual útil?"
      - "¿Se combina bien con M3/M9/M12/M2?"
      - "¿Permite explicar por qué ocurre algo, no solo qué ocurrió?"

  incremental_value:
    weight: "VERY_HIGH"
    questions:
      - "¿Qué añade que Director IA todavía no sabe?"
      - "¿Duplica capacidades existentes?"
      - "¿Qué tan grande es el hueco ejecutivo que cubre?"

  actionability:
    weight: "HIGH"
    questions:
      - "¿La respuesta conduce a una decisión o seguimiento?"
      - "¿Identifica planta, cliente, responsable, partida o riesgo?"

  frequency:
    weight: "HIGH"
    questions:
      - "¿Es consulta diaria/semanal/ocasional?"
      - "¿Qué tan cerca está de la operación directiva cotidiana?"

  implementation_path:
    weight: "MEDIUM"
    questions:
      - "¿Hay fuente/helper/backend real?"
      - "¿Existe intent/tool?"
      - "¿Puede integrarse in-process?"
      - "¿Hay primer slice útil y seguro?"

  risk:
    weight: "MEDIUM"
    questions:
      - "¿Requiere writes?"
      - "¿Requiere Excel?"
      - "¿Requiere S3/Twilio/WhatsApp?"
      - "¿Tiene side effects?"
      - "¿Tiene authz compleja?"
      - "¿Tiene colisión semántica?"

  percentage_effect:
    weight: "LOW"
    rule: >
      Registrar impacto potencial, pero nunca elegir ganador por porcentaje.

mandatory_rechecks:

  M4:
    evidence: "ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001"
    rule: >
      Read-only es PARTIAL_ONLY. No tratarlo como COMPLETE sin COMPARAR/Excel.

  M6:
    required:
      - "revalidar valor de query GASTOS/INVERSIONES"
      - "expense_analysis / investment_analysis"
      - "helpers estructurados"
      - "colisión con IGF"
      - "Excel export"
      - "primer slice posible"

  M7:
    required:
      - "qué sabe ya Director IA de IGF"
      - "qué falta"
      - "qué preguntas ejecutivas nuevas habilita"
      - "si aporta causalidad financiera"

  M8:
    required:
      - "qué sabe ya de ARR"
      - "qué falta"
      - "si profundizar ARR duplica M9"
      - "valor incremental real"

  M11:
    required:
      - "DICF actual"
      - "qué consultas existen"
      - "qué falta"
      - "valor causal/seguimiento"
      - "si puede enriquecer reasoning"

  M12:
    required:
      - "Action Register actual"
      - "qué ya cubre"
      - "qué huecos quedan"
      - "si profundizarlo agrega más valor que otro módulo"

  M18:
    required:
      - "presupuestos / cheques / relación financiera con folios"
      - "fuentes"
      - "dependencias"
      - "valor ejecutivo"
      - "si puede ser un frente coherente"

  WhatsApp:
    required:
      - "separar conocimiento de canal"
      - "no premiar integración de transporte por sí sola"
      - "valorar solo si aporta información nueva"

mandatory_question_map:
  for_each_candidate:
    - "preguntas ejecutivas nuevas"
    - "preguntas ya respondibles"
    - "preguntas duplicadas"
    - "preguntas no soportadas por la fuente"

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
    - "testability"
    - "estimated_delta"

mandatory_comparison_table:
  columns:
    - "module"
    - "current_state"
    - "new_executive_questions"
    - "executive_value"
    - "reasoning_value"
    - "incremental_value"
    - "frequency"
    - "actionability"
    - "source_ready"
    - "director_ia_wiring"
    - "authz_fit"
    - "plant_scope"
    - "external_dependency"
    - "mutation_risk"
    - "semantic_risk"
    - "first_useful_slice"
    - "state_after_first_slice"
    - "percentage_effect"
    - "recommendation"

ranking_rules:
  - "Rankear todos los candidatos relevantes."
  - "No elegir por número."
  - "No elegir por porcentaje."
  - "No elegir por facilidad solamente."
  - "Preferir valor incremental neto."
  - "Preferir evidencia estructurada."
  - "Preferir integración in-process."
  - "Preferir hechos observables."
  - "Penalizar duplicación con M2/M3/M9/M12."
  - "Penalizar Excel/S3/Twilio/write si no aportan valor proporcional."
  - "Penalizar ambigüedad semántica."

winner_requirements:
  exactly_one: true

  must_explain:
    - "por qué gana"
    - "qué preguntas nuevas habilita"
    - "por qué es más valioso ahora"
    - "primer slice"
    - "estado después del primer slice"
    - "porcentaje"
    - "riesgos"
    - "dependencias"
    - "por qué pierde el segundo lugar"

next_task_policy:
  if_readiness_needed:
    pattern: "ARCH-DIRECTOR-IA-<MODULE>-READINESS-001"

  if_gap_fully_determined:
    pattern: "IMPL-DIRECTOR-IA-<MODULE>-001"

  rule: >
    Proponer exactamente una NEXT_TASK. No autorizarla ni ejecutarla.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md"

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
  - "Baseline 42.5% verificado."
  - "EXIT_M2 incorporado como contexto."
  - "Todos los candidatos relevantes comparados."
  - "Se midió valor ejecutivo incremental."
  - "Se midió reasoning value."
  - "Se identificaron preguntas nuevas concretas."
  - "Se verificaron fuentes reales."
  - "Se verificó wiring."
  - "Se verificó authz."
  - "Se verificó scope planta."
  - "Se verificaron side effects."
  - "Se produjo ranking."
  - "Existe exactamente un ganador."
  - "Existe exactamente un segundo lugar."
  - "Existe exactamente una NEXT_TASK."
  - "No se implementó nada."
  - "No se modificó matriz."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "EXIT_M2"
    - "capacidad actual Director IA"
    - "huecos globales"
    - "preguntas ejecutivas"
    - "candidatos"
    - "tabla comparativa"
    - "ranking"
    - "ganador"
    - "segundo lugar"
    - "primer slice"
    - "estado posterior"
    - "porcentaje"
    - "riesgos"
    - "dependencias"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un ganador global defendible. STOPPED si ningún
  frente aporta suficiente valor incremental sin decisión humana/contractual.
  BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-001.md"