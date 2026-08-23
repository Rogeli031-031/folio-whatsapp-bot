# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T13:41:00-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente módulo funcional de Director IA después de completar
  M9, utilizando la capability matrix vigente y evidencia física del
  repositorio para elegir exactamente un módulo con el mejor balance entre
  valor ejecutivo, probabilidad real de COMPLETE, esfuerzo, reutilización,
  testabilidad, authz y riesgo.

baseline:
  current_m0_m20_percentage: 42.5
  numerator: 8.5
  denominator: 20

  formula:
    COMPLETE: 1.0
    PARTIAL: 0.5
    INDIRECTA: 0.5
    NOT_STARTED: 0.0
    N_A: "excluido del denominador"

  recently_completed:
    - "M3 — Plantas / KPIs / Proyectos"
    - "M9 — Delta Venta / Descuento / Ingreso"

  known_complete:
    - "M3"
    - "M9"
    - "M13"
    - "M16"

  note: >
    Recalcular físicamente todos los estados desde la capability matrix vigente.
    No asumir que ninguna lista histórica permanece correcta.

primary_goal: >
  Elegir exactamente un siguiente módulo con path realista a COMPLETE.
  Priorizar cierre funcional verdadero sobre numeración secuencial, facilidad
  superficial o ganancia teórica que solo pueda producir PARTIAL.

selection_principles:
  - "No elegir por número."
  - "No asumir que sigue M4, M10 o M1."
  - "Excluir COMPLETE y N_A."
  - "Comparar PARTIAL/INDIRECTA -> COMPLETE contra NOT_STARTED -> COMPLETE."
  - "PARTIAL/INDIRECTA -> COMPLETE aporta +2.5 pp."
  - "NOT_STARTED -> COMPLETE aporta +5.0 pp."
  - "No premiar +5.0 pp si el slice realista solo llega a PARTIAL."
  - "Preferir read-only cuando el valor sea comparable."
  - "Preferir infraestructura JSON/helpers existente."
  - "Preferir intents/tools ya declarados si son semánticamente correctos."
  - "Penalizar mutaciones."
  - "Penalizar endpoints GET con side effects."
  - "Penalizar Excel/xlsx cuando no exista contrato JSON reutilizable."
  - "Penalizar S3, Twilio, WhatsApp u otras dependencias externas."
  - "Penalizar migrations/schema."
  - "Penalizar authz ambigua."
  - "Penalizar colisiones semánticas."
  - "Considerar infraestructura nueva de M3 y M9 si reduce el delta."
  - "No elegir Health solo porque sea barato si otro módulo comparable aporta mayor valor ejecutivo."

candidate_scope:
  derive_from: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  include:
    - "PARTIAL"
    - "INDIRECTA"
    - "NOT_STARTED"
    - "BLOCKED si aparece y debe revalidarse"

  exclude:
    - "COMPLETE"
    - "N_A"

mandatory_revalidation:
  - "Recalcular baseline desde fichas M0-M20."
  - "Confirmar M9 COMPLETE."
  - "Confirmar denominador real."
  - "Revalidar todos los blockers de priorización 003."
  - "Revisar si infraestructura M9 ayuda a otros módulos."
  - "Revisar si infraestructura M3 ayuda a otros módulos."
  - "Verificar wiring real, no solo endpoints existentes."
  - "Verificar side effects de endpoints GET/POST relevantes."
  - "Revalidar scope por planta."
  - "Revalidar roles GA/GV y permisos específicos."
  - "Revalidar si algún candidato puede llegar a COMPLETE en un único slice."

evaluation_dimensions:

  canonical_definition:
    question: >
      ¿Qué exige exactamente COMPLETE según la capability matrix vigente?

  current_state:
    question: >
      ¿PARTIAL, INDIRECTA, NOT_STARTED o BLOCKED?

  potential_gain:
    question: >
      ¿Qué ganancia porcentual real aporta COMPLETE?

  executive_value:
    question: >
      ¿Qué valor aporta al uso real de Director IA como inteligencia ejecutiva?

  backend_readiness:
    question: >
      ¿Existen endpoints, helpers, queries o loaders reutilizables?

  director_ia_readiness:
    question: >
      ¿Existen intents, tools, capabilities o wiring parcial?

  source_quality:
    question: >
      ¿La fuente es primaria, estructurada y estable?

  authz:
    question: >
      ¿Puede preservarse o reforzarse sin rediseño?

  plant_scope:
    question: >
      ¿Puede mantenerse el aislamiento por planta?

  dependencies:
    question: >
      ¿Qué dependencias internas, externas o humanas requiere?

  db_or_migration:
    question: >
      ¿Requiere schema/migration/backfill?

  external_services:
    question: >
      ¿Depende de Excel, S3, Twilio, WhatsApp o servicios externos?

  effort:
    question: >
      ¿El delta es pequeño, medio o alto?

  testability:
    question: >
      ¿Puede probarse localmente de forma determinística?

  semantic_risk:
    question: >
      ¿Puede inducir conclusiones falsas, ambigüedad o colisión con otro dominio?

  production_risk:
    question: >
      ¿Implica escritura, dinero, documentos o acciones irreversibles?

  completeness_feasibility:
    question: >
      ¿Puede llegar a COMPLETE en un único slice razonable?

mandatory_candidate_table:
  columns:
    - "module"
    - "canonical_purpose"
    - "current_state"
    - "potential_gain_pp"
    - "executive_value"
    - "existing_backend"
    - "existing_frontend"
    - "existing_intent_or_tool"
    - "source"
    - "authz_ready"
    - "plant_scope"
    - "dependencies"
    - "db_or_migration"
    - "external_dependency"
    - "estimated_effort"
    - "testability"
    - "semantic_risk"
    - "production_risk"
    - "can_reach_complete_in_one_slice"
    - "evidence"

ranking_rules:
  - "Rankear todos los candidatos relevantes."
  - "Explicar por qué cada candidato queda arriba o abajo."
  - "No usar puntuación arbitraria sin justificarla."
  - "Preferir +5.0 pp solo si COMPLETE es realista."
  - "Aceptar +2.5 pp si P(COMPLETE) es claramente mayor."
  - "Preferir módulos que reutilicen el patrón in-process probado por M3/M9."
  - "No priorizar mutación si existe alternativa read-only comparable."
  - "No priorizar dependencia externa innecesaria."
  - "Penalizar endpoints cuyo GET tenga side effects."
  - "Penalizar dominios donde el criterio de COMPLETE no esté claro."

special_rechecks:

  m1_health:
    verify:
      - "health"
      - "health-db"
      - "health-proyectos"
      - "health-director-ia"
      - "scope global vs planta"
      - "si COMPLETE puede definirse sin fuga cross-planta"
      - "valor ejecutivo real"

  m2_folios_kanban:
    verify:
      - "folio_status"
      - "folio_history"
      - "folio_documents"
      - "kanban"
      - "GET con possible side effects"
      - "maybeAdvanceFolioToComprobaciones"
      - "authz"
      - "si read-only COMPLETE es posible sin tocar mutación"

  m4_clasificacion:
    verify:
      - "JSON read existente"
      - "COMPARAR"
      - "dependencia Excel"
      - "escritura"
      - "si COMPLETE puede limitarse legítimamente a lectura"

  m7_igf:
    verify:
      - "qué falta para COMPLETE"
      - "sources.igf"
      - "annex"
      - "GET context"
      - "si delta es wiring o contrato"

  m8_arr:
    verify:
      - "qué falta para COMPLETE"
      - "sources.arr"
      - "annex"
      - "upload dependency"
      - "si read-only puede cerrar COMPLETE"

  m11_dicf:
    verify:
      - "qué falta respecto al estado PARTIAL"
      - "comentarios"
      - "acciones"
      - "wiring"
      - "si ya existe infraestructura suficiente para COMPLETE"

  m12_action_register:
    verify:
      - "qué falta respecto al estado PARTIAL"
      - "board"
      - "acciones"
      - "responsables"
      - "cierres"
      - "si COMPLETE exige escritura o solo lectura"

  m17_whatsapp_bridge:
    verify:
      - "qué parte está integrada"
      - "qué parte depende de WhatsApp/Twilio"
      - "si COMPLETE requiere canal externo"

  m20_home_kpi:
    verify:
      - "por qué es INDIRECTA"
      - "fuente real"
      - "valor ejecutivo"
      - "si puede cerrar COMPLETE fácilmente"

  not_started_modules:
    verify:
      - "si alguno ganó infraestructura reutilizable por M3/M9"
      - "si alguno puede ahora pasar directamente a COMPLETE"
      - "si alguno sigue limitado a PARTIAL"

winner_requirements:
  exactly_one: true

  must_have:
    - "evidencia física suficiente"
    - "definición canónica clara"
    - "fuente real"
    - "path de implementación identificable"
    - "authz determinable"
    - "tests posibles"
    - "gates claros"
    - "probabilidad razonable de COMPLETE"

  must_explain:
    - "por qué gana"
    - "ganancia potencial"
    - "valor ejecutivo"
    - "delta físico"
    - "dependencias"
    - "riesgos"
    - "si requiere readiness"
    - "si puede ir directo a IMPL"
    - "gates"
    - "por qué pierde el segundo lugar"

next_task_policy:
  exactly_one: true

  if_specific_readiness_needed:
    propose: "ARCH-DIRECTOR-IA-<MODULO>-READINESS-001"

  if_gap_is_fully_determined:
    propose: "IMPL-DIRECTOR-IA-<MODULO>-001"

  rules:
    - "No autorizar NEXT_TASK."
    - "No ejecutar NEXT_TASK."
    - "No proponer múltiples alternativas."
    - "No encadenar trabajo."

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004.md"

  read_only:
    - "docs/dev-loop/LOOP_PROTOCOL.md"
    - "docs/dev-loop/TASK_TEMPLATE.md"
    - "docs/dev-loop/reports/README.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M9-DELTAS-READINESS-001.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M9-DELTAS-001.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M9-CAPABILITY-MATRIX-SYNC-001.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
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
  - "crear tools"
  - "crear intents"
  - "cambiar authz"
  - "smoke productivo"
  - "usar secretos"
  - "commit"
  - "push"
  - "merge"
  - "ejecutar siguiente tarea"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

allowed_actions:
  - "leer físicamente matriz, código, tests, endpoints y reportes"
  - "recalcular baseline"
  - "construir candidatos"
  - "revalidar blockers"
  - "trazar wiring"
  - "comparar gain/value/effort/risk"
  - "elegir exactamente un ganador"
  - "proponer exactamente una NEXT_TASK"
  - "escribir reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"

forbidden_actions:
  - "modificar código"
  - "modificar capability matrix"
  - "modificar arquitectura"
  - "aprobar gates"
  - "ejecutar NEXT_TASK"
  - "commit"
  - "push"
  - "merge"

required_output:
  - "baseline formal recalculado"
  - "estado M0-M20 vigente"
  - "candidatos"
  - "tabla comparativa"
  - "blockers revalidados"
  - "impacto de infraestructura M3/M9"
  - "ranking completo"
  - "ganador único"
  - "segundo lugar"
  - "ganancia potencial"
  - "valor ejecutivo"
  - "evidencia física"
  - "delta físico"
  - "dependencias"
  - "riesgos"
  - "COMPLETE feasibility"
  - "NEXT_TASK único"
  - "gates"
  - "acciones no realizadas"
  - "git diff --check"
  - "git status"

acceptance_criteria:
  - "La capability matrix vigente fue leída físicamente."
  - "El baseline 42.5% fue recalculado y no asumido."
  - "M9 no vuelve a competir."
  - "M3, M9, M13 y M16 no compiten si siguen COMPLETE."
  - "Todos los módulos no COMPLETE/N_A relevantes fueron considerados."
  - "Los blockers de 003 fueron revalidados."
  - "Infraestructura M3/M9 fue considerada."
  - "Side effects relevantes fueron verificados."
  - "PARTIAL/INDIRECTA/NOT_STARTED se compararon correctamente."
  - "Hay exactamente un ganador."
  - "Hay exactamente una NEXT_TASK."
  - "NEXT_TASK permanece no autorizada."
  - "No se implementó nada."
  - "No se modificó capability matrix."
  - "No se modificaron contratos."
  - "Solo CURRENT_TASK y reporte fueron modificados."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline recalculado"
    - "estado M0-M20"
    - "candidatos"
    - "tabla comparativa"
    - "blockers revalidados"
    - "infraestructura M3/M9"
    - "ranking"
    - "ganador"
    - "segundo lugar"
    - "ganancia potencial"
    - "valor ejecutivo"
    - "evidencia física"
    - "delta físico"
    - "dependencias"
    - "riesgos"
    - "COMPLETE feasibility"
    - "NEXT_TASK"
    - "gates"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un ganador claro y un siguiente slice
  implementable. STOPPED si no puede elegirse un ganador sin decisión
  arquitectónica o contractual. BLOCKED si falta gate o dato humano
  indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-004.md"