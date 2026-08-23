# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente slice de M2 — Kanban / Folios — después de la
  integración de folio_status + history, usando valor ejecutivo, cobertura
  incremental real, seguridad read-only, costo/dependencias y fidelidad a la
  definición canónica de M2. No asumir que documents sea el ganador.

baseline:
  module: "M2 — Kanban / Folios"
  current_state: "PARTIAL"

  integrated:
    - "comentarios de folio"
    - "folio_status"
    - "consulta por id"
    - "consulta por numero_folio"
    - "varios folios"
    - "listado por planta"
    - "filtro/listado por etapa"
    - "history read-only"
    - "eventos históricos no deduplicados"

  global_percentage:
    current: 42.5
    numerator: 8.5
    denominator: 20

  rule: >
    Esta tarea no debe cambiar el estado ni el porcentaje. Debe calcular el
    efecto futuro del candidato ganador sin otorgarlo anticipadamente.

primary_question: >
  ¿Cuál es el siguiente slice real de M2 que aporta mayor valor ejecutivo
  incremental después de folio_status + history, sin reinterpretar COMPLETE,
  sin introducir writes y sin duplicar capacidades ya cubiertas?

mandatory_candidates:
  - id: "kanban_flow"
    questions:
      - "¿Qué folios hay actualmente en cada etapa?"
      - "¿Cómo está distribuido el flujo?"
      - "¿Qué folios llevan más tiempo en su etapa?"
      - "¿Qué puede afirmarse sin convertir antigüedad en retraso?"

  - id: "documents"
    questions:
      - "¿Qué documentos/metadatos están asociados al folio?"
      - "¿Qué parte es DB metadata?"
      - "¿Qué parte depende de S3/M15?"
      - "¿Puede existir un slice útil sin leer el contenido del PDF?"

  - id: "financial_status"
    questions:
      - "¿Qué información financiera pertenece realmente a M2?"
      - "cheque"
      - "póliza"
      - "presupuesto"
      - "¿son una sola capacidad o varios dominios?"
      - "¿qué dependencia existe con M18?"

  - id: "other"
    questions:
      - "¿La ficha canónica contiene otro hueco M2 de mayor valor?"
      - "¿Existe un slice no considerado en la priorización anterior?"

canonical_audit:
  required:
    - "leer ficha M2 completa y vigente"
    - "no inferir alcance desde el número del módulo"
    - "separar propósito canónico de endpoints existentes"
    - "separar capacidad ya integrada de capacidad faltante"
    - "identificar qué exige COMPLETE"
    - "no redefinir COMPLETE para facilitar implementación"

executive_value:
  evaluate:
    - "frecuencia probable de consulta directiva"
    - "capacidad para responder qué está pasando"
    - "capacidad para detectar dónde mirar"
    - "valor para seguimiento diario"
    - "valor para decisiones"
    - "redundancia con M3 KPIs"
    - "redundancia con M12 Action Register"
    - "redundancia con folio_status"
    - "redundancia con history"

physical_readiness:
  for_each_candidate_determine:
    - "fuente física"
    - "tabla/helper"
    - "SELECT-only sí/no"
    - "handler HTTP asociado"
    - "side effects"
    - "posibilidad in-process"
    - "authz"
    - "scope planta"
    - "dependencias"
    - "semántica observada"
    - "inferencias necesarias"
    - "tests posibles"
    - "riesgo"

kanban_specific_rules:
  - "No usar GET /api/dashboard/kanban como path Director IA si muta."
  - "No llamar maybeAdvanceFolioToComprobaciones."
  - "Buscar SELECT/helper equivalente seguro."
  - "History ya permite conocer timestamps de eventos."
  - "Tiempo en etapa puede calcularse solo si la evidencia física lo soporta."
  - "Tiempo en etapa no equivale a retraso."
  - "No inventar SLA."
  - "No inventar condición atorado."
  - "No inventar prioridad."

documents_specific_rules:
  - "Separar metadata documental de contenido."
  - "Separar DB de S3."
  - "No asumir que existencia de metadata significa contenido accesible."
  - "No afirmar documento faltante sin regla física/canónica."
  - "No integrar M15 indirectamente."
  - "No descargar ni procesar documentos en esta tarea."

financial_specific_rules:
  - "No agrupar cheque, póliza y presupuesto artificialmente."
  - "Distinguir M2 de M18."
  - "No convertir stub HTTP en capacidad."
  - "No autorizar writes."
  - "No reinterpretar propósito canónico."

comparison_dimensions:
  score_each_0_to_5:
    - "executive_value"
    - "incremental_value_after_status_history"
    - "read_only_safety"
    - "physical_source_clarity"
    - "authz_fit"
    - "plant_scope_fit"
    - "implementation_reuse"
    - "semantic_clarity"
    - "testability"

  penalties_0_to_5:
    - "write_dependency"
    - "external_storage_dependency"
    - "cross_module_dependency"
    - "inference_risk"
    - "contract_ambiguity"
    - "duplication_of_existing_capability"

  rule: >
    El score ayuda a comparar, pero no puede sustituir juicio arquitectónico ni
    convertir un candidato contractualmente incorrecto en ganador.

mandatory_table:
  columns:
    - "candidate"
    - "canonical_gap"
    - "executive_value"
    - "physical_source"
    - "select_only"
    - "in_process_possible"
    - "authz_fit"
    - "plant_scope"
    - "dependencies"
    - "inference_risk"
    - "incremental_coverage"
    - "state_after_slice"
    - "percentage_effect"
    - "recommendation"

winner_rules:
  - "Elegir exactamente un ganador si existe candidato justificable."
  - "No elegir por facilidad de implementación solamente."
  - "No elegir por orden de la ficha."
  - "No elegir documents por default."
  - "No otorgar COMPLETE si el slice deja huecos canónicos."
  - "Si ningún candidato justifica implementación, STOPPED es válido."

percentage_rules:
  - "Baseline = 8.5 / 20 = 42.5%."
  - "Si el ganador solo profundiza un M2 ya PARTIAL, efecto = 0.0 pp."
  - "No otorgar +2.5 pp nuevamente por profundizar el mismo PARTIAL."
  - "Solo cambiaría en el futuro si M2 alcanzara legítimamente COMPLETE."
  - "Esta tarea no modifica el porcentaje."

architecture_rules:
  - "Preferir in-process."
  - "No HTTP interno."
  - "No dispatcher nuevo salvo necesidad demostrada y gate humano."
  - "No contrato nuevo salvo necesidad demostrada y gate humano."
  - "No writes."
  - "No cross-planta."
  - "Fail-closed."

required_decision:
  include:
    - "ganador"
    - "por qué gana"
    - "por qué pierden los demás"
    - "fuente física probable"
    - "riesgos"
    - "readiness requerida"
    - "estado M2 después del slice"
    - "efecto porcentual"
    - "NEXT_TASK exacta"

next_task_policy:
  if_winner:
    pattern: "ARCH-DIRECTOR-IA-M2-<SLICE>-READINESS-001"
    count: 1

  if_no_winner:
    next_task: null

  rule: >
    NEXT_TASK se propone únicamente. No se autoriza ni ejecuta.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002.md"

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
  - "implementar candidato"
  - "modificar código"
  - "modificar runtime"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "modificar schema"
  - "crear migration"
  - "modificar capability matrix"
  - "modificar contratos"
  - "marcar M2 COMPLETE"
  - "cambiar 42.5%"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

acceptance_criteria:
  - "Se leyó la definición canónica vigente de M2."
  - "Se verificó lo ya cubierto por folio_status."
  - "Se verificó lo ya cubierto por history."
  - "Se auditó kanban_flow."
  - "Se auditó documents."
  - "Se auditó financial_status."
  - "Se buscaron otros huecos M2."
  - "Cada candidato tiene fuente física identificada o ausencia explícita."
  - "Cada candidato tiene riesgo de side effects evaluado."
  - "Se evaluó authz."
  - "Se evaluó scope planta."
  - "Se evaluó redundancia con capacidades existentes."
  - "Se eligió exactamente un ganador o se justificó STOPPED."
  - "M2 permanece PARTIAL durante esta tarea."
  - "42.5% permanece sin cambios."
  - "No se implementó nada."
  - "Solo CURRENT_TASK y reporte fueron modificados."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "definición canónica M2"
    - "cobertura actual status + history"
    - "candidatos"
    - "kanban_flow"
    - "documents"
    - "financial_status"
    - "otros huecos"
    - "tabla comparativa"
    - "scoring"
    - "ganador"
    - "razones del ganador"
    - "razones de descarte"
    - "riesgos"
    - "estado M2 posterior"
    - "efecto porcentual"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "gates"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un ganador defendible. STOPPED si ningún slice
  M2 restante justifica implementación sin reinterpretar contrato o introducir
  riesgo indebido. BLOCKED si falta gate o dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-002.md"