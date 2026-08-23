# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23T12:40:00-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente módulo funcional de Director IA después de completar
  M3, utilizando la capability matrix vigente y evidencia física del
  repositorio para elegir exactamente un módulo que maximice probabilidad de
  alcanzar COMPLETE, ganancia funcional y reutilización de infraestructura,
  minimizando riesgo, dependencias y cambios arquitectónicos.

baseline:
  current_m0_m20_percentage: 40.0
  numerator: 8.0
  denominator: 20

  formula:
    COMPLETE: 1.0
    PARTIAL: 0.5
    INDIRECTA: 0.5
    NOT_STARTED: 0.0
    N_A: "excluido del denominador"

  completed_since_previous_prioritization:
    - "M3 — Plantas / KPIs / Proyectos"

  already_complete:
    - "M3"
    - "M13"
    - "M16"

  note: >
    No volver a priorizar M3, M13 ni M16. Derivar todos los estados actuales
    directamente de DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md y no asumir que la
    lista anterior permanece vigente.

primary_goal: >
  Elegir exactamente un siguiente módulo con un path realista a COMPLETE,
  priorizando valor ejecutivo y probabilidad de cierre completo sobre facilidad
  superficial o numeración secuencial.

selection_principles:
  - "No elegir por número de módulo."
  - "No asumir que M4 sigue después de M3."
  - "Preferir COMPLETE real sobre un slice que solo deje PARTIAL."
  - "Preferir read-only cuando el valor funcional sea comparable."
  - "Preferir reutilización de endpoints/helpers/tools existentes."
  - "Penalizar mutaciones y acciones clase C."
  - "Penalizar dependencias externas."
  - "Penalizar S3/Twilio/WhatsApp/archivos manuales cuando exista alternativa."
  - "Penalizar migrations o schema changes."
  - "Penalizar ambigüedad de authz."
  - "Penalizar colisión semántica entre dominios."
  - "No usar puntuación arbitraria sin explicar componentes."
  - "Comparar PARTIAL->COMPLETE contra NOT_STARTED->COMPLETE bajo la fórmula real."

candidate_scope:
  derive_from: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"

  include:
    - "PARTIAL"
    - "INDIRECTA"
    - "NOT_STARTED"
    - "BLOCKED solo si aparece físicamente y el blocker debe revalidarse"

  exclude:
    - "COMPLETE"
    - "N_A"

potential_gain:
  partial_to_complete_pp: 2.5
  indirecta_to_complete_pp: 2.5
  not_started_to_complete_pp: 5.0

mandatory_revalidation:
  - "Recalcular baseline desde la matriz actual."
  - "Verificar si otros módulos cambiaron desde la priorización 002."
  - "Revalidar blockers anteriores."
  - "Revalidar infraestructura añadida durante M3 que pudiera beneficiar otros módulos."
  - "No asumir que blockers antiguos siguen vigentes."
  - "No asumir que un endpoint existente equivale a integración Director IA."
  - "Verificar wiring real Planner -> tool -> executor -> fuente -> respuesta."

evaluation_dimensions:

  canonical_definition:
    question: >
      ¿Qué exige exactamente COMPLETE para este módulo según la matriz vigente?

  current_state:
    question: >
      ¿Está PARTIAL, INDIRECTA, NOT_STARTED o BLOCKED?

  potential_gain:
    question: >
      ¿Qué ganancia porcentual real aporta pasar a COMPLETE?

  backend_readiness:
    question: >
      ¿Existen handlers, endpoints, helpers, loaders o servicios reutilizables?

  director_ia_readiness:
    question: >
      ¿Existe intent, tool, capability o wiring parcial ya declarado?

  data_source:
    question: >
      ¿Existe una fuente primaria real y estable?

  authz:
    question: >
      ¿Puede conservarse exactamente o hacerse más restrictiva sin rediseño?

  dependencies:
    question: >
      ¿Cuántas dependencias internas, humanas o externas requiere?

  db_migration:
    question: >
      ¿Requiere migration, backfill o cambio de schema?

  external_services:
    question: >
      ¿Depende de S3, Twilio, WhatsApp, Excel externo u otro proveedor?

  implementation_effort:
    question: >
      ¿El delta es wiring pequeño, integración media o dominio nuevo?

  testability:
    question: >
      ¿Puede cubrirse con tests determinísticos locales?

  semantic_risk:
    question: >
      ¿Existe riesgo de convertir dato parcial, heurística o correlación en una
      conclusión fuerte?

  production_risk:
    question: >
      ¿Incluye escritura, dinero, permisos, documentos o acciones irreversibles?

  completeness_feasibility:
    question: >
      ¿Puede alcanzar COMPLETE en un solo slice razonable?

mandatory_candidate_table:
  columns:
    - "module"
    - "canonical_purpose"
    - "current_state"
    - "potential_gain_pp"
    - "existing_backend"
    - "existing_frontend"
    - "existing_tool_or_intent"
    - "data_source"
    - "authz_ready"
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
  - "Preferir +5.0 pp si P(COMPLETE), esfuerzo y riesgo son razonablemente comparables."
  - "Aceptar +2.5 pp si P(COMPLETE) es claramente superior."
  - "No elegir un +5.0 pp teórico si el slice solo llegaría a PARTIAL."
  - "No priorizar mutación si existe alternativa read-only de valor comparable."
  - "No priorizar un módulo bloqueado por dependencia externa si otro puede cerrar COMPLETE sin ella."
  - "No elegir Health solo por facilidad si existe un módulo de negocio con cierre similar y mayor valor."

winner_requirements:
  exactly_one: true

  must_have:
    - "evidencia física suficiente"
    - "definición canónica clara"
    - "path de implementación identificable"
    - "authz determinable"
    - "tests posibles"
    - "gates determinables"
    - "probabilidad razonable de COMPLETE"

  must_explain:
    - "por qué debe ir primero"
    - "ganancia potencial"
    - "delta físico exacto"
    - "dependencias"
    - "riesgos"
    - "si requiere readiness"
    - "si puede ir directo a IMPL"
    - "gates"
    - "por qué el segundo lugar pierde"

next_task_policy:
  exactly_one: true

  if_specific_readiness_needed:
    propose: "ARCH-DIRECTOR-IA-<MODULO>-READINESS-001"

  if_gap_is_fully_determined:
    propose: "IMPL-DIRECTOR-IA-<MODULO>-001"

  rules:
    - "No autorizar NEXT_TASK."
    - "No ejecutar NEXT_TASK."
    - "No proponer dos alternativas."
    - "No encadenar trabajo."

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"

  read_only:
    - "docs/dev-loop/LOOP_PROTOCOL.md"
    - "docs/dev-loop/TASK_TEMPLATE.md"
    - "docs/dev-loop/reports/README.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-002.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-READINESS-001.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M3-PLANTAS-KPIS-PROYECTOS-001.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-M3-CAPABILITY-MATRIX-SYNC-001.md"
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
  - "modificar contratos arquitectónicos"
  - "crear contratos"
  - "crear tools"
  - "crear intents"
  - "cambiar authz"
  - "smoke productivo"
  - "usar secretos"
  - "commit"
  - "push"
  - "merge"
  - "abrir o ejecutar automáticamente la siguiente tarea"

contracts_in_force:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

allowed_actions:
  - "leer físicamente matriz, código, tests y endpoints"
  - "construir lista de candidatos desde la matriz vigente"
  - "revalidar blockers"
  - "trazar wiring existente"
  - "comparar effort/risk/gain"
  - "determinar P(COMPLETE) cualitativamente con evidencia"
  - "rankear candidatos"
  - "elegir exactamente un ganador"
  - "proponer exactamente una NEXT_TASK"
  - "escribir reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"

forbidden_actions:
  - "modificar código"
  - "modificar documentación de arquitectura"
  - "modificar capability matrix"
  - "aprobar gates"
  - "ejecutar NEXT_TASK"
  - "commit"
  - "push"
  - "merge"

required_output:
  - "baseline formal recalculado"
  - "lista de candidatos derivada de matriz vigente"
  - "tabla comparativa completa"
  - "blockers revalidados"
  - "ranking total"
  - "ganador único"
  - "ganancia potencial"
  - "evidencia física del ganador"
  - "delta físico"
  - "dependencias"
  - "riesgos"
  - "comparación explícita contra segundo lugar"
  - "COMPLETE feasibility"
  - "NEXT_TASK único"
  - "gates del NEXT_TASK"
  - "acciones no realizadas"
  - "git diff --check"
  - "git status"

acceptance_criteria:
  - "La capability matrix vigente fue leída físicamente."
  - "El baseline 40.0% fue recalculado y no asumido."
  - "M3 no vuelve a competir."
  - "M13 y M16 no vuelven a competir."
  - "Todos los módulos no COMPLETE/N_A relevantes fueron considerados."
  - "PARTIAL, INDIRECTA y NOT_STARTED fueron comparados con la fórmula correcta."
  - "Los blockers fueron revalidados."
  - "La infraestructura nueva de M3 fue considerada si beneficia otros módulos."
  - "El ranking tiene evidencia física."
  - "Hay exactamente un ganador."
  - "Hay exactamente una NEXT_TASK."
  - "NEXT_TASK permanece no autorizada."
  - "No se implementó nada."
  - "No se modificó capability matrix."
  - "No se modificaron contratos."
  - "Solo CURRENT_TASK y reporte fueron modificados."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline recalculado"
    - "estado M0-M20"
    - "candidatos"
    - "tabla comparativa"
    - "blockers revalidados"
    - "ranking"
    - "ganador"
    - "segundo lugar y por qué pierde"
    - "ganancia potencial"
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
  arquitectónica o contractual. BLOCKED si falta un gate o dato humano
  indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-NEXT-MODULE-PRIORITIZATION-003.md"