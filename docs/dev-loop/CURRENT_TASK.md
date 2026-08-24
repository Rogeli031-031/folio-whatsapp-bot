# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente frente global de Director IA desde el baseline 50.0%,
  reevaluando todos los módulos no COMPLETE por valor ejecutivo marginal,
  razonamiento, conexión de evidencia, actionability, frecuencia, novedad real,
  fuentes físicas y riesgo. Favorecer un dominio nuevo o una mejora de reasoning
  material; no elegir por porcentaje ni por ranking previo.

baseline:
  numerator: 10.0
  denominator: 20
  percentage: 50.0

  recent_depth:
    - "M7: composición IGF"
    - "M11: expediente comercial factual"
    - "M12: notas de revisión"
    - "M18: presupuesto semanal"
    - "M4: comparativo mensual"
    - "M6: GASTOS/INVERSIONES"
    - "M2: status/history/doc metadata"

  rule: >
    Esta tarea no cambia estados ni porcentaje.

primary_question: >
  ¿Qué capacidad pendiente aporta ahora el mayor valor neto nuevo a Director IA:
  un dominio todavía silencioso o una mejora de razonamiento suficientemente
  material como para superar a los demás candidatos?

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

priority_model:

  new_domain_value:
    weight: "CRITICAL"
    evaluate:
      - "abre preguntas que hoy Director IA no puede responder"
      - "reduce silencios funcionales"
      - "no es simplemente una variante de otra consulta"

  reasoning_value:
    weight: "CRITICAL"
    evaluate:
      - "explica mejor"
      - "conecta evidencia"
      - "mejora diagnóstico"
      - "mejora priorización"

  evidence_connectivity:
    weight: "VERY_HIGH"

  executive_value:
    weight: "VERY_HIGH"

  actionability:
    weight: "VERY_HIGH"

  incremental_value:
    weight: "VERY_HIGH"

  frequency:
    weight: "HIGH"

  implementation_path:
    weight: "MEDIUM"

  risk:
    weight: "MEDIUM"
    penalize:
      - "writes"
      - "Excel"
      - "S3"
      - "Twilio"
      - "side effects"
      - "semantic ambiguity"
      - "duplication"
      - "stubs"

  percentage_effect:
    weight: "LOW"

mandatory_rechecks:
  - "M1"
  - "M2 restante"
  - "M4 restante"
  - "M5"
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

  M5:
    required:
      - "usar definición canónica exacta"
      - "Taller/AT si corresponde"
      - "qué preguntas nuevas abre"
      - "qué parte es SELECT-only"
      - "qué dependencia Excel existe"
      - "frecuencia real"
      - "si sigue siendo otra lista o un dominio operativo nuevo"
      - "estado después de primer slice"
      - "efecto porcentual real"

  M8:
    required:
      - "ARR actual"
      - "qué huecos reales quedan"
      - "duplicación con M9"
      - "si existe una vista/atributo hoy no expuesto"

  M20:
    required:
      - "Home KPI"
      - "si añade evidencia propia"
      - "si solo resume M3"
      - "valor incremental real"

  M7_remaining:
    required:
      - "composition ya integrada"
      - "evaluar solo huecos nuevos"
      - "no continuar por inercia"

  M11_remaining:
    required:
      - "dossier ya integrado"
      - "evaluar solo huecos nuevos"

  M12_remaining:
    required:
      - "revision notes ya integradas"
      - "evaluar solo huecos nuevos"

  M18_remaining:
    required:
      - "weekly budget query ya integrada"
      - "restante write-heavy"
      - "penalizar"

  M4_M6_remaining:
    required:
      - "restante principalmente Excel/writes"
      - "penalizar"

hidden_evidence_review:
  required: >
    Buscar campos, líneas o estructuras ya cargadas en runtime pero todavía
    omitidas del reasoning. Solo cuentan si aportan preguntas nuevas o reasoning
    materialmente mejor que los módulos candidatos.

mandatory_question_map:
  for_each_candidate:
    - "qué preguntas nuevas habilita"
    - "qué ya responde"
    - "qué duplica"
    - "qué razonamiento nuevo aporta"
    - "qué evidencia nueva expone"
    - "qué conexión habilita"
    - "qué NO puede afirmar"

physical_audit:
  for_each_candidate:
    - "fuente"
    - "helper"
    - "query"
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
    - "new_domain_value"
    - "new_questions"
    - "reasoning_value"
    - "evidence_connectivity"
    - "executive_value"
    - "actionability"
    - "incremental_value"
    - "frequency"
    - "source_ready"
    - "wiring_ready"
    - "dependencies"
    - "risk"
    - "first_slice"
    - "state_after_slice"
    - "percentage_effect"
    - "decision"

ranking_rules:
  - "No elegir por porcentaje."
  - "No elegir por facilidad sola."
  - "No elegir por ranking anterior."
  - "No continuar M7/M11/M12/M18/M4/M6 por inercia."
  - "Premiar dominio nuevo si aporta valor ejecutivo fuerte."
  - "Premiar reasoning oculto solo si es material."
  - "Penalizar listas redundantes."
  - "Penalizar write-heavy y external dependencies."
  - "Preferir SELECT-only e in-process."

winner_requirements:
  exactly_one: true

  must_include:
    - "ganador"
    - "segundo lugar"
    - "preguntas nuevas"
    - "valor de dominio nuevo"
    - "reasoning nuevo"
    - "por qué gana"
    - "por qué pierde segundo"
    - "primer slice"
    - "estado posterior"
    - "efecto porcentual"
    - "riesgos"
    - "dependencias"

next_task_policy:
  if_readiness_needed:
    pattern: "ARCH-DIRECTOR-IA-<MODULE>-<SLICE>-READINESS-001"

  if_fully_verified:
    pattern: "IMPL-DIRECTOR-IA-<MODULE>-<SLICE>-001"

  rule: >
    Proponer exactamente una NEXT_TASK. No autorizar ni ejecutar.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007.md"

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
  - "modificar tests"
  - "modificar frontend"
  - "modificar SQL"
  - "hacer writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Baseline 10.0/20 = 50.0% verificado."
  - "Todos los módulos no COMPLETE relevantes reevaluados."
  - "New-domain value ponderado explícitamente."
  - "Reasoning value ponderado explícitamente."
  - "Hidden evidence revisada."
  - "Se identificaron preguntas nuevas."
  - "Se verificaron fuentes."
  - "Existe ranking."
  - "Existe exactamente un ganador."
  - "Existe exactamente un segundo lugar."
  - "Existe exactamente una NEXT_TASK."
  - "No se implementó."
  - "No se modificó matriz."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "current capabilities"
    - "new-domain gaps"
    - "reasoning gaps"
    - "hidden evidence gaps"
    - "candidatos"
    - "tabla"
    - "ranking"
    - "ganador"
    - "segundo"
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
  DONE_PENDING_REVIEW si existe un ganador defendible. STOPPED si ningún frente
  restante aporta valor marginal suficiente. BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-007.md"