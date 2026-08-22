# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T21:16:47-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21T21:16:47-06:00.
  G1 autorizado.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

result:
  report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001.md"
  can_reach_complete_in_one_read_only_slice: YES
  recommended_alternative: "A"
  next_task_proposed: "IMPL-DIRECTOR-IA-M16-DUPLICADOS-001"
  next_task_authorized: false

objective: >
  Auditar exclusivamente M16 — Duplicados de folios — para determinar si puede
  pasar de NOT_STARTED a COMPLETE mediante un slice de lectura, reutilizando la
  capacidad física existente de análisis de duplicados y conectándola al
  Director IA sin introducir mutaciones, cancelaciones, nuevas tablas ni nueva
  arquitectura.

baseline:
  module: "M16"
  current_state: "NOT_STARTED"
  potential_gain_if_complete_pp: 5.0
  current_m0_m20_percentage: 32.5
  target_percentage_if_complete: 37.5
  prioritization_source: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-001"

known_physical_evidence:
  - "findDuplicatePairs existe"
  - "GET /api/folios/duplicados/analisis existe"
  - "intent duplicate_folios existe"
  - "tool get_duplicate_folios existe pero sin executor conectado"
  - "cancelación de folio queda fuera de este slice"

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001.md"

  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (solo lectura)"

  - "implementación física de findDuplicatePairs (solo lectura)"
  - "endpoint GET /api/folios/duplicados/analisis (solo lectura)"
  - "intent duplicate_folios (solo lectura)"
  - "tool get_duplicate_folios (solo lectura)"
  - "tool registry/executors Director IA (solo lectura)"
  - "chat/context/cycle integration relevante (solo lectura)"
  - "auth/authz relevante (solo lectura)"
  - "tests de duplicados y Director IA relevantes (solo lectura)"

out_of_scope:
  - "implementar"
  - "cancelar folios"
  - "mutar folios"
  - "crear endpoints nuevos"
  - "crear tablas/migrations"
  - "modificar contratos"
  - "modificar matriz"
  - "frontend nuevo salvo que la auditoría demuestre necesidad"
  - "smoke productivo"
  - "commit"
  - "push"
  - "merge"
  - "siguiente tarea"

audit_questions:
  D1_canonical_definition:
    question: >
      ¿Qué exige exactamente M16 en la capability matrix para poder considerarlo
      COMPLETE?

  D2_duplicate_engine:
    question: >
      ¿Qué hace findDuplicatePairs exactamente, sobre qué datos opera y qué
      output devuelve?

  D3_endpoint:
    question: >
      ¿Cómo funciona GET /api/folios/duplicados/analisis: auth, filtros, shape,
      límites y errores?

  D4_intent:
    question: >
      ¿Cómo se detecta duplicate_folios y qué lenguaje natural cubre hoy?

  D5_tool_contract:
    question: >
      ¿Qué contrato/shape tiene get_duplicate_folios y por qué hoy no tiene
      executor?

  D6_executor:
    question: >
      ¿Cuál es el lugar correcto para conectar el executor reutilizando la
      lógica existente sin duplicarla?

  D7_read_only:
    question: >
      Confirmar que M16 COMPLETE puede alcanzarse con lectura/análisis בלבד,
      dejando cualquier cancelación/mutación completamente fuera.

  D8_authz:
    question: >
      ¿Qué auth/authz debe respetar el Director IA al consultar duplicados?
      ¿Necesita planta/rol/filtros?

  D9_scope:
    question: >
      ¿El análisis es global, por planta, por rango temporal o por otro criterio?
      ¿Qué necesita el usuario para una respuesta consistente?

  D10_semantics:
    question: >
      ¿Qué puede afirmar Director IA a partir de duplicate pairs y qué no puede
      inferir automáticamente?

  D11_response:
    question: >
      ¿Cuál debe ser el output mínimo del tool para que Director IA responda
      con evidencia: folios, score/criterio, campos comparados, límites?

  D12_cycle_vs_chat:
    question: >
      ¿M16 debe integrarse al chat/intent legado, al pipeline constitucional,
      o puede completarse mediante tool read-only sin tocar el cycle?

  D13_tests:
    question: >
      ¿Qué tests mínimos hacen falta para considerar M16 COMPLETE?

  D14_frontend:
    question: >
      ¿Hace falta UI nueva o basta la superficie conversacional/Director IA
      existente?

  D15_gates:
    question: >
      ¿El siguiente IMPL requiere solo G1 o también G2/G3?

  D16_complete:
    question: >
      Definir de forma binaria y verificable cuándo M16 pasa a COMPLETE.

  D17_next_task:
    question: >
      Proponer exactamente un NEXT_TASK mínimo y sin mutaciones.

mandatory_findings:
  - "ruta exacta de findDuplicatePairs"
  - "ruta exacta del endpoint de análisis"
  - "shape real de request/response"
  - "auth/authz"
  - "intent duplicate_folios"
  - "tool get_duplicate_folios"
  - "punto exacto donde falta wiring/executor"
  - "si se requiere o no frontend"
  - "si se requiere o no backend nuevo"
  - "si se requiere o no integración al cycle"
  - "semántica segura de respuesta"
  - "tests necesarios"
  - "gates"
  - "definición binaria de COMPLETE"
  - "exactamente un NEXT_TASK"

decision_rules:
  - "M16 debe ser read-only en este slice."
  - "Cancelar folios queda fuera."
  - "No crear mutaciones."
  - "No duplicar lógica si findDuplicatePairs ya es reusable."
  - "Preferir conectar tool existente antes que crear endpoint nuevo."
  - "No llevar M16 al cycle constitucional si el contrato no lo exige."
  - "No declarar COMPLETE solo porque existe endpoint."
  - "Exigir wiring + authz + semántica + tests."
  - "No implementar en esta tarea."

acceptance_criteria:
  - "gap físico identificado con evidencia"
  - "se determina si COMPLETE es viable en un solo slice"
  - "cancelación/mutación explícitamente fuera"
  - "executor/wiring exacto identificado"
  - "auth/authz definidos"
  - "semántica segura definida"
  - "tests mínimos definidos"
  - "gates definidos"
  - "exactamente un NEXT_TASK"
  - "sin implementación"
  - "git diff --check limpio"
  - "solo CURRENT_TASK y reporte modificados"

expected_terminal_state: >
  DONE_PENDING_REVIEW si M16 puede completarse con un slice read-only bien
  definido. BLOCKED/STOPPED si requiere nueva arquitectura, mutaciones o una
  decisión contractual no autorizada.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001.md"