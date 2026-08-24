# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Priorizar el siguiente frente global de Director IA desde el baseline 52.5%,
  comparando tanto módulos no COMPLETE como oportunidades transversales de
  reasoning/evidence connectivity. Determinar qué aporta mayor valor ejecutivo
  marginal: abrir un dominio nuevo o conectar/mejorar el razonamiento entre
  dominios ya integrados, sin elegir por porcentaje, facilidad o ranking previo.

baseline:
  numerator: 10.5
  denominator: 20
  percentage: 52.5

  recent_depth:
    - "M2: folio status/history/doc metadata"
    - "M4: comparativo mensual"
    - "M5: Taller por AT"
    - "M6: GASTOS/INVERSIONES"
    - "M7: composición IGF"
    - "M9: deltas comerciales"
    - "M11: expediente comercial"
    - "M12: Action Register + revision notes"
    - "M18: presupuesto semanal"

  rule: >
    Esta tarea no cambia estados ni porcentaje.

primary_question: >
  ¿Cuál es ahora el mayor hueco de inteligencia ejecutiva de Director IA:
  un dominio que todavía no puede consultar o una capacidad transversal que
  impide conectar evidencia ya disponible para producir mejores diagnósticos,
  prioridades o recomendaciones?

candidate_classes:

  module_candidates:
    source: "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    include:
      - "PARTIAL"
      - "INDIRECTA"
      - "NO INTEGRADA"
      - "NOT_STARTED"
      - "bloqueados reconsiderables"
    exclude:
      - "COMPLETE"
      - "N_A"

  transversal_candidates:
    allowed_only_if_physically_grounded: true
    examples_to_audit_not_assume:
      - "cross-domain evidence assembly"
      - "reasoning input enrichment"
      - "executive prioritization across existing facts"
      - "correlation/temporal comparison with explicit non-causal semantics"
      - "evidence provenance improvements"

    rule: >
      Una oportunidad transversal solo puede competir si existe un hueco
      físico/arquitectónico concreto. No inventar una nueva capa genérica por
      intuición ni reabrir contratos congelados sin necesidad.

canonical_labels_rule: >
  Para módulos, usar exclusivamente nombres, estados y propósitos de la matriz
  canónica vigente.

priority_model:

  executive_value:
    weight: "CRITICAL"
    evaluate:
      - "qué pregunta directiva nueva resuelve"
      - "qué decisión mejora"
      - "qué riesgo/prioridad hace visible"

  reasoning_value:
    weight: "CRITICAL"
    evaluate:
      - "mejora explicación"
      - "mejora diagnóstico"
      - "permite hipótesis mejor soportadas"
      - "reduce respuestas meramente descriptivas"

  evidence_connectivity:
    weight: "CRITICAL"
    evaluate:
      - "conecta hechos físicamente relacionables"
      - "preserva provenance"
      - "evita silos"
      - "no inventa joins ni causalidad"

  new_domain_value:
    weight: "VERY_HIGH"
    evaluate:
      - "abre un dominio silencioso"
      - "reduce SOURCE_NOT_INTEGRATED"
      - "habilita preguntas no cubiertas"

  actionability:
    weight: "VERY_HIGH"
    evaluate:
      - "responsable"
      - "acción"
      - "fecha"
      - "planta"
      - "cliente"
      - "folio"
      - "partida"
      - "prioridad observable"

  incremental_value:
    weight: "VERY_HIGH"

  frequency:
    weight: "HIGH"

  implementation_path:
    weight: "MEDIUM"
    evaluate:
      - "fuente/helper real"
      - "in-process"
      - "SELECT-only"
      - "intent/tool/executor"
      - "primer slice"

  risk:
    weight: "MEDIUM"
    penalize:
      - "writes"
      - "Excel"
      - "S3"
      - "Twilio"
      - "side effects"
      - "stubs"
      - "semantic ambiguity"
      - "contract reopening"
      - "duplicación"

  percentage_effect:
    weight: "LOW"

mandatory_module_rechecks:
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
      - "qué significa weekly discount/narrativa si aplica"
      - "qué evidencia nueva aporta"
      - "qué duplica M9/ARR"
      - "qué parte depende de Twilio/WhatsApp"
      - "qué slice estrictamente read-only existe"
      - "si abre preguntas realmente nuevas"

  M8:
    required:
      - "ARR actual"
      - "qué falta respecto a M9"
      - "si existe fuente oculta o composición no expuesta"
      - "si aporta valor incremental real"

  M20:
    required:
      - "si Home KPI tiene fuente propia"
      - "si solo resume M3"
      - "si habilita priorización cross-domain"

  M14_M15_M17:
    required:
      - "usar definición canónica real"
      - "fuentes físicas"
      - "dependencias externas"
      - "si existe slice read-only defendible"
      - "valor ejecutivo nuevo"

  M5_remaining:
    required:
      - "query Taller/AT ya integrada"
      - "no continuar por inercia"
      - "evaluar solo Excel/duplicados/restante"

  M7_M11_M12_remaining:
    required:
      - "ya profundizados"
      - "evaluar solo huecos realmente nuevos"

  M4_M6_M18_remaining:
    required:
      - "restante principalmente write/Excel/channel"
      - "penalizar"

transversal_audit:
  required:
    - "leer arquitectura Reasoning Engine/IES vigente"
    - "no modificarla"
    - "identificar si el runtime actual ya puede consumir evidencia multi-dominio"
    - "identificar si el problema real es falta de source, routing, context assembly o reasoning"
    - "buscar gaps concretos, no ideas abstractas"

  questions:
    - "¿Puede una pregunta ejecutiva usar hoy simultáneamente M3 + M9 + M11/M12?"
    - "¿Puede usar M4/M6 + acciones M12 sin inventar join?"
    - "¿Puede combinar IGF M7 con deltas M9 bajo provenance separado?"
    - "¿Existe planner/tool path para diagnóstico cross-domain?"
    - "¿La arquitectura ya lo permite pero el runtime no lo cablea?"
    - "¿Haría falta contrato nuevo o solo wiring?"

  rule: >
    Si el gap transversal requiere reabrir IES/Reasoning Engine congelados,
    penalizar fuertemente y marcar gates necesarios. Si puede hacerse mediante
    runtime/wiring conforme a contrato vigente, puede competir.

mandatory_question_map:
  for_each_candidate:
    - "qué preguntas nuevas habilita"
    - "qué ya responde"
    - "qué duplica"
    - "qué reasoning nuevo aporta"
    - "qué evidencia conecta"
    - "qué clave física soporta la conexión"
    - "qué NO puede afirmar"

physical_audit:
  for_each_candidate:
    - "source"
    - "helper"
    - "query"
    - "intent"
    - "tool"
    - "executor"
    - "context builder"
    - "authz"
    - "plant scope"
    - "side effects"
    - "external dependency"
    - "contract impact"
    - "semantic risk"
    - "testability"
    - "first slice"
    - "state after slice"
    - "percentage effect"

mandatory_table:
  columns:
    - "rank"
    - "candidate"
    - "type_module_or_transversal"
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
  - "No elegir M10 por haber sido segundo."
  - "No continuar M5/M7/M11/M12/M18/M4/M6 por inercia."
  - "Un candidato transversal debe tener gap físico comprobable."
  - "No reabrir arquitectura congelada sin evidencia de necesidad."
  - "Premiar conexiones físicamente defendibles."
  - "Penalizar causalidad inferida."
  - "Preferir SELECT-only e in-process."
  - "Preferir valor ejecutivo material."

winner_requirements:
  exactly_one: true

  must_include:
    - "ganador"
    - "tipo: módulo o transversal"
    - "segundo lugar"
    - "preguntas nuevas"
    - "reasoning nuevo"
    - "evidence connectivity"
    - "por qué gana"
    - "por qué pierde segundo"
    - "primer slice"
    - "estado posterior"
    - "efecto porcentual"
    - "contract/gate impact"
    - "riesgos"
    - "dependencias"

next_task_policy:
  module_readiness:
    pattern: "ARCH-DIRECTOR-IA-<MODULE>-<SLICE>-READINESS-001"

  transversal_readiness:
    pattern: "ARCH-DIRECTOR-IA-<TRANSVERSAL-SLICE>-READINESS-001"

  if_fully_verified:
    pattern: "IMPL-DIRECTOR-IA-<SLICE>-001"

  rule: >
    Proponer exactamente una NEXT_TASK. No autorizar ni ejecutar.

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008.md"

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
  - "reabrir arquitectura"
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
  - "Todos los módulos no COMPLETE relevantes reevaluados."
  - "Oportunidades transversales auditadas físicamente."
  - "No se inventó una capa transversal."
  - "Se verificó impacto contractual de candidatos transversales."
  - "Se identificaron preguntas ejecutivas nuevas."
  - "Reasoning y evidence connectivity ponderados."
  - "Existe ranking."
  - "Existe exactamente un ganador."
  - "Existe exactamente un segundo lugar."
  - "Existe exactamente una NEXT_TASK."
  - "No se implementó."
  - "No se modificó matriz."
  - "Solo CURRENT_TASK y reporte cambiaron."
  - "git diff --check limpio."

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline 52.5%"
    - "current capabilities"
    - "module gaps"
    - "transversal reasoning gaps"
    - "evidence connectivity gaps"
    - "contract impact"
    - "candidatos"
    - "tabla comparativa"
    - "ranking"
    - "ganador"
    - "segundo"
    - "primer slice"
    - "estado posterior"
    - "percentage effect"
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
  candidato aporta valor marginal suficiente sin reabrir contratos.
  BLOCKED si falta gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-GLOBAL-NEXT-MODULE-PRIORITIZATION-008.md"