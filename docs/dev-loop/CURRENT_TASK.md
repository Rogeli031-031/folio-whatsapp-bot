# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente frente global de Director IA desde el baseline 50.0%,
  comparando todos los módulos no COMPLETE por valor ejecutivo marginal,
  reasoning value, actionability, frecuencia, novedad de evidencia, fuentes
  físicas, seguridad y costo de integración. Favorecer capacidades que permitan
  explicar, priorizar o decidir mejor, no simplemente añadir otro listado.

baseline:
  numerator: 10.0
  denominator: 20
  percentage: 50.0

  current_depth:
    - "M2: status + history + documents metadata"
    - "M3: plantas/KPIs/proyectos"
    - "M4: comparativo mensual de clasificación"
    - "M6: GASTOS / INVERSIONES query"
    - "M9: deltas comerciales"
    - "M12: Action Register + notas de revisión"
    - "M13"
    - "M16"
    - "M18: presupuesto semanal read-only"

  rule: >
    Esta tarea no cambia estados ni porcentaje.

primary_question: >
  ¿Qué capacidad pendiente añade ahora el mayor valor neto de inteligencia
  ejecutiva, especialmente para explicar causas, conectar evidencia, priorizar
  atención o convertir hechos ya disponibles en mejores decisiones?

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
  Usar nombres y propósitos exactos de las fichas canónicas vigentes.

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
  - "M12 restante"
  - "M14"
  - "M15"
  - "M17"
  - "M18 restante"
  - "M20"
  - "cualquier otro módulo no COMPLETE"

priority_shift:
  rule: >
    Como la cobertura de consultas estructuradas ya es amplia, aumentar el peso
    de reasoning_value, evidence_connectivity y actionability. No premiar una
    integración solo porque agrega otra tabla/listado.

evaluation_model:

  executive_value:
    weight: "VERY_HIGH"
    evaluate:
      - "preguntas directivas nuevas"
      - "riesgos/desviaciones"
      - "dónde mirar"
      - "qué merece atención"

  reasoning_value:
    weight: "CRITICAL"
    evaluate:
      - "explica por qué"
      - "aporta causa/contexto"
      - "conecta fuentes"
      - "permite construir hipótesis mejor soportadas"
      - "mejora recomendaciones"
      - "reduce respuestas meramente descriptivas"

  evidence_connectivity:
    weight: "VERY_HIGH"
    evaluate:
      - "conecta M3 con M9"
      - "conecta M4/M6 con acciones"
      - "conecta revisiones M12 con resultados"
      - "permite triangular evidencia"
      - "evita silos"

  incremental_value:
    weight: "VERY_HIGH"
    evaluate:
      - "qué no sabe hoy"
      - "qué hueco real cubre"
      - "qué duplica"

  actionability:
    weight: "VERY_HIGH"
    evaluate:
      - "responsable"
      - "acción"
      - "prioridad"
      - "riesgo"
      - "fecha"
      - "seguimiento"

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
      - "stubs"
      - "semantic ambiguity"
      - "duplicación"

  percentage_effect:
    weight: "LOW"

special_rechecks:

  M5:
    required:
      - "definición canónica exacta"
      - "Taller por AT si corresponde"
      - "qué evidencia nueva aporta"
      - "Excel dependency"
      - "colisiones con TALLER/AR"
      - "valor mensual vs diario"

  M7:
    required:
      - "IGF ya integrado on-demand"
      - "qué falta para pasar de KPI a explicación"
      - "qué evidencia subyacente existe"
      - "si permite responder por qué margen/ingreso/forecast se mueve"
      - "qué se solapa con M6"

  M8:
    required:
      - "ARR ya integrado"
      - "qué profundidad falta"
      - "duplicación con M9"
      - "capacidad causal nueva"

  M11:
    required:
      - "DICF actual"
      - "comentarios/causas/acciones disponibles"
      - "qué ya consume Director IA"
      - "qué evidencia no consume"
      - "si puede conectar estado comercial con causas y acciones"

  M12_remaining:
    required:
      - "notas ya integradas"
      - "qué más queda"
      - "si otro slice agrega dominio nuevo o solo más detalle"
      - "no continuar por inercia"

  M20:
    required:
      - "si Home KPI es resumen redundante"
      - "si tiene evidencia propia"
      - "si aporta reasoning"

  remaining_write_heavy:
    required:
      - "M4 COMPARAR"
      - "M6 Export"
      - "M18 operations"
      - "WhatsApp/channel modules"
      - "penalizar salvo valor ejecutivo desproporcionado"

cross_source_opportunity:
  required: >
    Identificar si algún módulo pendiente desbloquea conexiones útiles entre
    fuentes ya integradas. Si una capacidad nueva permite unir evidencia que hoy
    vive aislada, otorgarle valor adicional, pero sin inventar joins o causalidad.

mandatory_question_map:
  for_each_candidate:
    - "qué preguntas NUEVAS habilita"
    - "qué preguntas ya responde Director IA"
    - "qué sería duplicado"
    - "qué aporta al reasoning"
    - "qué conexiones de evidencia habilita"
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
    - "evidence_connectivity"
    - "incremental_value"
    - "actionability"
    - "frequency"
    - "source_ready"
    - "wiring_ready"
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
  - "No elegir por ranking anterior."
  - "No continuar M12/M18/M4/M6 por inercia."
  - "Penalizar listados redundantes."
  - "Premiar contexto causal verificable."
  - "Premiar conexión de evidencia."
  - "Premiar actionability."
  - "Preferir hechos físicos a inferencias."
  - "Preferir in-process."
  - "Penalizar writes/dependencias externas/stubs."

winner_requirements:
  exactly_one: true

  must_include:
    - "ganador"
    - "segundo lugar"
    - "preguntas nuevas"
    - "reasoning nuevo"
    - "conexión de evidencia"
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
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005.md"

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
  - "Todos los candidatos relevantes reevaluados."
  - "Reasoning value ponderado explícitamente."
  - "Evidence connectivity ponderada explícitamente."
  - "Se identificaron preguntas nuevas."
  - "Se identificaron conexiones de evidencia."
  - "Se verificaron fuentes físicas."
  - "Se verificó wiring."
  - "Se verificó authz."
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
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline 50.0%"
    - "capacidad actual"
    - "huecos globales"
    - "reasoning gaps"
    - "evidence connectivity gaps"
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
  frente aporta suficiente valor marginal sin decisión contractual. BLOCKED si
  falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-005.md"