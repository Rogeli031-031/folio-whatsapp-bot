# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente frente global de Director IA desde el baseline 50.0%,
  comparando todos los módulos no COMPLETE por valor ejecutivo marginal,
  reasoning value, evidence connectivity, actionability, frecuencia, fuentes
  físicas, seguridad y costo de integración. Favorecer capacidades que mejoren
  explicación, diagnóstico y decisiones, no únicamente cobertura descriptiva.

baseline:
  numerator: 10.0
  denominator: 20
  percentage: 50.0

  recent_depth:
    - "M2: status + history + documents metadata"
    - "M3: KPIs / proyectos"
    - "M4: comparativo mensual"
    - "M6: GASTOS / INVERSIONES query"
    - "M9: deltas comerciales"
    - "M11: expediente comercial factual"
    - "M12: Action Register + notas de revisión"
    - "M18: presupuesto semanal read-only"

  rule: >
    Esta tarea no cambia estados ni porcentaje.

primary_question: >
  ¿Qué capacidad pendiente produce ahora el mayor incremento neto en la capacidad
  de Director IA para explicar qué ocurre, por qué merece atención, qué evidencia
  lo sostiene y qué debe revisar un director?

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
  Usar únicamente nombres, propósitos y estados de las fichas canónicas vigentes.

priority_model:

  reasoning_value:
    weight: "CRITICAL"
    evaluate:
      - "explica variaciones"
      - "aporta contexto"
      - "permite comparar evidencias"
      - "reduce respuestas descriptivas"
      - "mejora hipótesis"
      - "mejora recomendaciones"

  evidence_connectivity:
    weight: "CRITICAL"
    evaluate:
      - "conecta fuentes que hoy están separadas"
      - "usa claves físicas defendibles"
      - "permite triangular hechos"
      - "relaciona resultado con acción sin inventar causalidad"

  executive_value:
    weight: "VERY_HIGH"
    evaluate:
      - "preguntas nuevas de dirección"
      - "riesgos/desviaciones"
      - "priorización"
      - "qué merece atención"

  actionability:
    weight: "VERY_HIGH"
    evaluate:
      - "responsable"
      - "acción"
      - "fecha"
      - "riesgo"
      - "cliente"
      - "planta"
      - "partida"

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
      - "stubs"
      - "ambigüedad"
      - "duplicación"

  percentage_effect:
    weight: "LOW"

mandatory_rechecks:
  - "M1"
  - "M2 restante"
  - "M4 restante"
  - "M5"
  - "M6 restante"
  - "M7"
  - "M8"
  - "M10"
  - "M11 restante"
  - "M12 restante"
  - "M14"
  - "M15"
  - "M17"
  - "M18 restante"
  - "M20"
  - "cualquier módulo no COMPLETE"

special_rechecks:

  M7_IGF:
    required:
      - "auditar igf.compromiso_lines"
      - "auditar qué líneas ya se cargan pero no llegan al contexto/respuesta"
      - "determinar si permiten explicar composición del KPI"
      - "separar composición de causalidad"
      - "comparar contra M6 y M9"
      - "evaluar valor directivo"

  M8_ARR:
    required:
      - "qué datos ARR ya consume Director IA"
      - "qué evidencia queda oculta"
      - "duplicación con M9"
      - "capacidad de explicar movimiento"

  M5:
    required:
      - "definición canónica exacta"
      - "Taller/AT"
      - "dependencia Excel"
      - "valor marginal real"

  M11_remaining:
    required:
      - "expediente ya integrado"
      - "no continuar por inercia"
      - "evaluar únicamente huecos realmente nuevos"

  M12_remaining:
    required:
      - "notas ya integradas"
      - "resto de capacidad"
      - "distinguir detalle de dominio nuevo"

  M20:
    required:
      - "Home KPI"
      - "nueva fuente vs resumen"
      - "reasoning real"

  write_heavy_remaining:
    required:
      - "M4 COMPARAR"
      - "M6 Export"
      - "M18 operations"
      - "WhatsApp/channel"
      - "penalizar salvo valor excepcional"

cross_source_review:
  required: >
    Buscar explícitamente fuentes que ya existen en runtime pero no llegan al
    reasoning, especialmente estructuras internas cargadas pero omitidas de
    annex/context/summarizers.

mandatory_question_map:
  for_each_candidate:
    - "qué preguntas nuevas habilita"
    - "qué ya responde"
    - "qué duplica"
    - "qué razonamiento nuevo aporta"
    - "qué evidencia nueva expone"
    - "qué conexiones permite"
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
    - "plant scope"
    - "side effects"
    - "dependencias"
    - "semantic risk"
    - "testability"
    - "first slice"
    - "state after slice"
    - "percentage effect"

mandatory_table:
  columns:
    - "rank"
    - "module"
    - "current_state"
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
  - "No elegir por ranking anterior."
  - "No continuar M11/M12/M18/M4/M6 por inercia."
  - "No premiar otra lista."
  - "Premiar evidencia que ya existe pero hoy no entra al reasoning."
  - "Premiar composición/explicación físicamente soportada."
  - "Penalizar causalidad inferida."
  - "Preferir SELECT-only."
  - "Preferir in-process."
  - "Penalizar writes/external dependencies."

winner_requirements:
  exactly_one: true

  must_include:
    - "ganador"
    - "segundo lugar"
    - "preguntas nuevas"
    - "reasoning nuevo"
    - "evidencia nueva"
    - "conexiones"
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
    Proponer exactamente una NEXT_TASK y no ejecutarla.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006.md"

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
  - "Reasoning value explícitamente ponderado."
  - "Evidence connectivity explícitamente ponderada."
  - "Se auditaron fuentes cargadas pero no expuestas."
  - "Se identificaron preguntas nuevas."
  - "Se verificaron fuentes físicas."
  - "Se verificó wiring."
  - "Se verificó authz."
  - "Existe ranking."
  - "Existe exactamente un ganador."
  - "Existe exactamente un segundo lugar."
  - "Existe una NEXT_TASK."
  - "No se implementó."
  - "No se modificó matriz."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "capacidad actual"
    - "reasoning gaps"
    - "hidden evidence gaps"
    - "evidence connectivity"
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
  aporta valor marginal suficiente. BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-006.md"