# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T13:55:52-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Determinar cuál debe ser el siguiente frente funcional de Director IA
  priorizando valor ejecutivo real por encima del porcentaje de COMPLETE,
  aceptando explícitamente que el frente ganador pueda requerir varios slices
  y atravesar estados PARTIAL antes de alcanzar COMPLETE.

strategic_context:
  previous_task: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-005"
  previous_outcome: "STOPPED"

  current_m0_m20_percentage: 42.5
  numerator: 8.5
  denominator: 20

  conclusion_from_005: >
    No existe actualmente un módulo restante que pueda alcanzar legítimamente
    COMPLETE en un único slice razonable sin reinterpretar el contrato,
    incorporar capacidades clase C o abordar dependencias mayores.

  strategy_change: >
    El porcentaje deja de ser el criterio primario de selección. El siguiente
    frente se elegirá por la capacidad que más aumente la utilidad real de
    Director IA para diagnóstico, explicación, seguimiento y toma de decisiones
    ejecutivas.

non_regression:
  - "No reducir capacidades existentes."
  - "No romper M3."
  - "No romper M9."
  - "No romper M13."
  - "No romper M16."
  - "No degradar módulos PARTIAL/INDIRECTA existentes."
  - "No modificar contratos para inflar porcentaje."
  - "No reinterpretar COMPLETE."
  - "No convertir capacidades clase C en read-only ficticio."
  - "Preservar authz."
  - "Preservar scope por planta."
  - "Preservar separación semántica entre dominios."

primary_question: >
  Si el porcentaje M0-M20 deja de ser el objetivo inmediato, ¿qué frente
  funcional pendiente produciría el mayor aumento real en la capacidad de
  Director IA para ayudar a un director a entender qué está pasando, por qué
  está pasando, qué requiere atención y qué seguimiento existe?

decision_horizon: >
  Evaluar el valor del frente completo y también una trayectoria incremental.
  Un ganador puede requerir varios slices. No descartarlo únicamente porque no
  llegue a COMPLETE en el primer slice.

evaluation_model:

  executive_value:
    weight: "VERY_HIGH"
    questions:
      - "¿Responde preguntas frecuentes y materialmente importantes para dirección?"
      - "¿Ayuda a detectar desviaciones, riesgos, responsables o causas?"
      - "¿Mejora diagnóstico y toma de decisiones?"
      - "¿Permite conectar información que hoy está fragmentada?"
      - "¿Reduce necesidad de navegar manualmente el dashboard?"

  reasoning_value:
    weight: "VERY_HIGH"
    questions:
      - "¿Aporta evidencia útil al Reasoning Engine?"
      - "¿Permite explicar causas, cambios o seguimiento?"
      - "¿Puede combinarse legítimamente con capacidades ya integradas?"
      - "¿Aumenta la profundidad de respuestas sin mezclar semánticas?"

  frequency_of_use:
    weight: "HIGH"
    questions:
      - "¿Qué tan frecuentemente podría usarlo un director?"
      - "¿Es una consulta ocasional o cotidiana?"

  actionability:
    weight: "HIGH"
    questions:
      - "¿La información conduce a una decisión o seguimiento?"
      - "¿Identifica responsables, fechas, clientes, plantas, desviaciones o pendientes?"

  information_uniqueness:
    weight: "HIGH"
    questions:
      - "¿Añade información que Director IA no puede obtener hoy?"
      - "¿O duplica capacidades existentes?"

  implementation_path:
    weight: "MEDIUM"
    questions:
      - "¿Existe backend/fuente/helper reutilizable?"
      - "¿Puede crecer incrementalmente?"
      - "¿Existe un primer slice seguro y útil?"

  risk:
    weight: "MEDIUM"
    questions:
      - "¿Requiere writes?"
      - "¿Requiere Excel?"
      - "¿Requiere S3/Twilio/WhatsApp?"
      - "¿Tiene GET con side effects?"
      - "¿Requiere migration/schema?"
      - "¿Tiene authz difícil?"
      - "¿Tiene colisión semántica?"

  completion_percentage:
    weight: "LOW"
    rule: >
      Registrar impacto potencial en la matriz, pero no usarlo como criterio
      dominante para elegir ganador.

mandatory_candidates:
  - "M1 Health"
  - "M2 Kanban / Folios"
  - "M4 Clasificación de apoyos + COMPARAR"
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
  - "M18 Folios relacionados"
  - "M20 Home KPI"
  - "cualquier otro módulo M0-M20 no COMPLETE y no N_A"

known_constraints:

  M4:
    evidence: "ARCH-DIRECTOR-IA-M4-CLASIFICACION-READINESS-001"
    rule: >
      Read-only JSON es PARTIAL_ONLY. No volver a tratarlo como COMPLETE sin
      COMPARAR/reconciliación Excel.

  M6:
    known:
      - "expense_analysis / investment_analysis existen"
      - "tools con executor null"
      - "HTTP principal xlsx"
      - "expandCategoriaRows puede aportar superficie estructurada"
      - "riesgo de colisión semántica de 'gastos' con IGF"
    rule: >
      Evaluar valor ejecutivo independientemente de que el primer slice solo
      alcance PARTIAL.

  M2:
    known:
      - "algunas rutas GET tienen side effects"
      - "folio_status/history/documents tienen infraestructura parcial"
    rule: >
      Separar lectura segura de superficies que mutan.

  M7_M8:
    rule: >
      Determinar cuánto valor adicional aportaría completar la integración de
      IGF/ARR dado que ya existen capacidades parciales/annex.

  M11_M12:
    rule: >
      Evaluar especialmente su valor para seguimiento, responsables, causas,
      acciones, cierres e historial.

  M17_M10:
    rule: >
      Separar valor del conocimiento proveniente de WhatsApp del valor del canal
      de comunicación. No confundir canal con inteligencia.

analysis_workstreams:

  current_capability_map:
    required:
      - "recalcular estado M0-M20"
      - "identificar qué puede responder Director IA hoy"
      - "identificar huecos ejecutivos reales"
      - "identificar duplicidades"

  executive_question_map:
    required:
      - "derivar preguntas ejecutivas que cada candidato habilitaría"
      - "compararlas con preguntas ya respondibles"
      - "identificar capacidades netamente nuevas"
      - "clasificar valor diagnóstico"
      - "clasificar valor de seguimiento"
      - "clasificar valor causal"
      - "clasificar valor financiero/comercial/operativo"

  physical_readiness:
    required:
      - "trazar backend existente"
      - "trazar fuentes"
      - "trazar helpers"
      - "trazar intents"
      - "trazar tools"
      - "trazar executors"
      - "trazar authz"
      - "trazar plant scope"
      - "trazar side effects"
      - "trazar dependencias externas"

  incremental_path:
    required:
      - "definir primer slice útil"
      - "definir qué estado alcanzaría"
      - "definir segundo slice si es necesario"
      - "definir trayectoria hasta COMPLETE"
      - "no implementar"

  architecture_fit:
    required:
      - "determinar si usa arquitectura existente"
      - "determinar si requiere G2"
      - "determinar si requiere G3"
      - "determinar si necesita nuevo contrato"
      - "determinar si puede alimentar OP/EB/EKS/IES/Reasoning sin cambios"
      - "no pedir gates preventivamente"

mandatory_comparison_table:
  columns:
    - "module"
    - "current_state"
    - "executive_questions_enabled"
    - "executive_value"
    - "reasoning_value"
    - "frequency"
    - "actionability"
    - "new_information"
    - "existing_backend"
    - "existing_director_ia_wiring"
    - "primary_source"
    - "authz"
    - "plant_scope"
    - "mutation_risk"
    - "external_dependency"
    - "semantic_risk"
    - "first_useful_slice"
    - "state_after_first_slice"
    - "path_to_complete"
    - "estimated_effort"
    - "percentage_effect"
    - "evidence"

winner_requirements:
  exactly_one: true

  selection_basis:
    primary:
      - "executive_value"
      - "reasoning_value"
      - "actionability"
      - "information_uniqueness"
      - "frequency_of_use"

    secondary:
      - "implementation_path"
      - "risk"
      - "testability"

    tertiary:
      - "percentage_effect"

  must_answer:
    - "¿Qué frente gana?"
    - "¿Por qué es más importante para Director IA?"
    - "¿Qué preguntas nuevas podrá contestar?"
    - "¿Qué no puede contestar hoy?"
    - "¿Cuál es el primer slice?"
    - "¿Ese slice sería PARTIAL, INDIRECTA o COMPLETE?"
    - "¿Qué falta después?"
    - "¿Cuál es el camino hasta COMPLETE?"
    - "¿Qué riesgos existen?"
    - "¿Qué gates serían necesarios?"
    - "¿Por qué pierde el segundo lugar?"

percentage_policy:
  rule: >
    No manipular ni cambiar la definición de estados. El baseline permanece
    42.5% hasta que una implementación y posterior sincronización documental
    modifiquen legítimamente una ficha.

  note: >
    Un ganador puede ser elegido incluso si el primer slice solo añade +2.5 pp
    o incluso si inicialmente no cambia la matriz, siempre que aporte mayor
    valor ejecutivo real.

next_task_policy:
  exactly_one: true

  preferred:
    if_architectural_readiness_needed:
      format: "ARCH-DIRECTOR-IA-<FRONT>-READINESS-001"

    if_first_slice_is_fully_defined:
      format: "IMPL-DIRECTOR-IA-<FRONT>-<SLICE>-001"

  rule: >
    La NEXT_TASK debe representar únicamente el primer slice seguro del frente
    ganador, no todo el roadmap si este requiere varias fases.

  authorization: "NOT_AUTHORIZED"
  execution: "FORBIDDEN"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001.md"

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
  - "cambiar definición COMPLETE/PARTIAL/INDIRECTA"
  - "ejecutar writes"
  - "ejecutar COMPARAR"
  - "ejecutar uploads"
  - "enviar WhatsApp"
  - "usar secretos"
  - "smoke productivo"
  - "commit"
  - "push"
  - "merge"
  - "ejecutar NEXT_TASK"

allowed_actions:
  - "leer repositorio"
  - "recalcular estado actual"
  - "mapear preguntas ejecutivas"
  - "comparar valor"
  - "trazar fuentes"
  - "trazar wiring"
  - "trazar authz"
  - "trazar riesgos"
  - "diseñar trayectoria incremental"
  - "elegir exactamente un frente"
  - "proponer exactamente una NEXT_TASK"
  - "escribir CURRENT_TASK y reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"

forbidden_actions:
  - "modificar archivos fuera de writable"
  - "optimizar por porcentaje como criterio principal"
  - "reinterpretar contratos"
  - "inventar capacidades"
  - "inventar fuentes"
  - "inventar preguntas respondibles"
  - "confundir canal con conocimiento"
  - "confundir UI con fuente"
  - "aprobar gates adicionales"
  - "ejecutar siguiente tarea"
  - "commit"
  - "push"
  - "merge"

required_output:
  - "resumen ejecutivo"
  - "baseline 42.5%"
  - "mapa de capacidades actuales"
  - "mapa de huecos ejecutivos"
  - "tabla comparativa completa"
  - "ranking por valor ejecutivo"
  - "ganador único"
  - "segundo lugar"
  - "preguntas ejecutivas habilitadas por el ganador"
  - "primer slice útil"
  - "estado después del primer slice"
  - "roadmap hasta COMPLETE"
  - "impacto porcentual como dato secundario"
  - "fuentes"
  - "authz"
  - "scope por planta"
  - "riesgos"
  - "dependencias"
  - "fit arquitectónico"
  - "G2 sí/no"
  - "G3 sí/no"
  - "NEXT_TASK única"
  - "acciones no realizadas"
  - "git diff --check"
  - "git status"

acceptance_criteria:
  - "Baseline recalculado y no asumido."
  - "42.5% no se altera durante esta tarea."
  - "Todos los candidatos relevantes fueron evaluados."
  - "M4 PARTIAL_ONLY fue respetado."
  - "No se buscó artificialmente un COMPLETE."
  - "Se evaluó valor ejecutivo real."
  - "Se evaluó valor para razonamiento."
  - "Se identificaron preguntas nuevas concretas."
  - "Se identificó exactamente un ganador."
  - "Se identificó segundo lugar y por qué pierde."
  - "Se definió primer slice seguro."
  - "Se definió estado real después del primer slice."
  - "Se trazó roadmap hasta COMPLETE."
  - "No se implementó nada."
  - "No se modificó capability matrix."
  - "No se modificaron contratos."
  - "Solo CURRENT_TASK y reporte fueron modificados."
  - "Hay exactamente una NEXT_TASK."
  - "NEXT_TASK permanece no autorizada."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "cambio de estrategia"
    - "capacidades actuales"
    - "huecos ejecutivos"
    - "candidatos"
    - "tabla comparativa"
    - "ranking"
    - "ganador"
    - "segundo lugar"
    - "preguntas ejecutivas habilitadas"
    - "primer slice"
    - "estado después del primer slice"
    - "roadmap hasta COMPLETE"
    - "impacto porcentual"
    - "fuentes"
    - "authz"
    - "scope planta"
    - "dependencias"
    - "riesgos"
    - "fit arquitectónico"
    - "gates"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un frente ganador claro y un primer slice
  seguro. STOPPED si ningún frente puede seleccionarse responsablemente sin
  decisión humana adicional. BLOCKED si falta un gate o dato indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EXECUTIVE-VALUE-PRIORITIZATION-001.md"