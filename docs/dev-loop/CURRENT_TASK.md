# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-DIRECTOR-IA-REAL-CYCLE-COMPLETION-READINESS-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T23:24:33-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING_IF_REQUIRED
  G3_new_architecture_contract: PENDING_IF_REQUIRED
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar el estado físico del Director IA después de integrar el primer
  vertical slice real ARR -> MINIMAL_EXECUTION_ENVELOPE -> OP -> EB -> EKS,
  y determinar exactamente cuál es el siguiente incremento mínimo para
  completar un ciclo productivo real sin inventar arquitectura ni mezclar
  prematuramente persistencia, sesión, chat, WhatsApp o nueva epistemología.
  Comparar explícitamente continuar desde EKS hacia IES -> RE -> CP contra
  introducir antes persistencia/sesión u otra infraestructura, y emitir un
  único NEXT_TASK recomendado.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-CYCLE-COMPLETION-READINESS-001.md"

  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-POST-N4-READINESS-001.md (solo lectura)"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-INPUT-INTEGRATION-001.md (solo lectura)"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-REAL-INPUT-ARR-001.md (solo lectura)"

  - "docs/director-ia/* (solo lectura)"

  - "lib/director-ia-real-input-arr.js (solo lectura)"
  - "lib/director-ia-observation-pipeline.js (solo lectura)"
  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "lib/director-ia-op-eb-eks-integration.js (solo lectura, si existe)"
  - "lib/director-ia-e2e.js (solo lectura)"
  - "existing EKS runtime(s) (solo lectura)"
  - "existing IES runtime(s) (solo lectura)"
  - "existing Reasoning Engine runtime(s) (solo lectura)"
  - "existing Channel Projection runtime(s) (solo lectura)"
  - "existing Director IA factories/orchestrators (solo lectura)"

  - "test/director-ia-*.test.js (solo lectura)"
  - "fixtures/director-ia/** (solo lectura)"

  - "server.js (solo lectura)"
  - "package.json (solo lectura)"
  - "existing dashboard/API runtime (solo lectura)"
  - "existing persistence/session/runtime storage code (solo lectura)"
  - "existing WhatsApp/Twilio/chat code (solo lectura)"

out_of_scope:
  - "implementar el siguiente ciclo"
  - "modificar contratos"
  - "modificar runtimes"
  - "modificar tests"
  - "modificar fixtures"
  - "modificar server.js"
  - "modificar package.json"

  - "wire WhatsApp"
  - "wire Twilio"
  - "wire chat legado"
  - "crear memoria conversacional"
  - "crear WhoAmI"
  - "crear small talk"

  - "crear persistencia"
  - "crear sesión"
  - "crear DB schema"
  - "crear endpoint productivo"

  - "crear nueva fuente"
  - "crear nueva tool"
  - "crear nueva métrica"

  - "modificar N1-N5"
  - "crear causalidad"
  - "crear B/C/D/E"
  - "usar G8"

  - "commit"
  - "push"
  - "merge"
  - "crear implementación"
  - "encadenar siguiente tarea"

baseline_in_force:
  real_input:
    status: IMPLEMENTED
    path:
      - "authenticated planta_id input"
      - "Director IA ARR facade"
      - "existing ARR source"
      - "MINIMAL_EXECUTION_ENVELOPE"
      - "Observation Pipeline"
      - "Evidence Builder"
      - "EKS"

  source:
    runtime: "get_arr_snapshot / loadArrProyForPlant"
    metric: "venta_ton"

  verified_regression:
    focused_tests: 24
    director_ia_tests: 292
    failures: 0

  architectural_boundaries:
    - "WhatsApp/chat remain outside N1-N5"
    - "OP owns AcquisitionStatus/ObservationRecord"
    - "EB consumes OP output"
    - "RE consumes IES"
    - "CP is presentation"
    - "trace_id originates at real-cycle facade"
    - "technical empty is not business absence"

audit_questions:

  D1_current_real_cycle:
    question: >
      ¿Cuál es exactamente el punto terminal del ciclo ARR real actualmente
      implementado y qué objeto físico queda disponible allí?

  D2_eks_to_ies:
    question: >
      ¿Puede el EKS producido por el ciclo ARR alimentar directamente el IES
      existente sin adapter, reinterpretación ni contrato nuevo?

  D3_ies_projection:
    question: >
      ¿Qué campos N2/N3/N4 realmente producidos por ARR sobreviven hoy a la
      proyección EKS -> IES y cuáles se pierden?

  D4_n4_debt:
    question: >
      Reevaluar el debt conocido donde IES clona Diagnosis sin proyectar todos
      los campos adicionales de 04 §8. Determinar si bloquea un ciclo real o
      sigue siendo follow-up no blocker.

  D5_ies_to_re:
    question: >
      ¿Puede el IES resultante alimentar directamente al Reasoning Engine
      existente con el output ARR real?

  D6_reasoning_behavior:
    question: >
      ¿Qué puede producir RE físicamente con un ciclo ARR que solo tenga
      N2/N3/N4 disponibles según los datos reales?

  D7_re_to_cp:
    question: >
      ¿Puede el output de RE alimentar directamente Channel Projection sin
      adapter contractual nuevo?

  D8_cp_output:
    question: >
      ¿Qué objeto final produce CP y es suficiente como respuesta estructurada
      para un caller productivo no conversacional?

  D9_real_full_facade:
    question: >
      ¿Existe ya una fachada/orchestrator que pueda componer
      ARR -> OP -> EB -> EKS -> IES -> RE -> CP, o falta únicamente composición?

  D10_persistence_dependency:
    question: >
      ¿Alguna etapa EKS -> IES -> RE -> CP exige persistencia durable para
      funcionar correctamente en un solo ciclo?

  D11_session_dependency:
    question: >
      ¿Alguna etapa exige sesión conversacional o identidad de usuario para
      ejecutar un ciclo dashboard stateless?

  D12_historical_dependency:
    question: >
      ¿RE requiere conocimiento histórico entre ciclos o puede razonar sobre el
      snapshot/Knowledge Bundle del ciclo actual?

  D13_eks_semantics:
    question: >
      Determinar si EKS es store durable requerido, store lógico/in-memory o
      boundary epistemológico independiente de persistencia física.

  D14_dashboard_return:
    question: >
      ¿Puede un caller dashboard recibir directamente el resultado de CP sin
      introducir chat/WhatsApp?

  D15_server_wiring:
    question: >
      ¿Qué wiring mínimo futuro necesitaría server.js para invocar una fachada
      full-cycle sin conocer internamente OP/EB/EKS/IES/RE/CP?

  D16_error_propagation:
    question: >
      ¿Cómo deben propagarse ACQUIRED_EMPTY, TOOL_ERROR,
      ENTITY_UNRESOLVED y QUERY_SCOPE_INCOMPLETE a través del ciclo completo
      sin convertirse en conclusiones de negocio?

  D17_trace_propagation:
    question: >
      ¿trace_id puede preservarse físicamente hasta RE/CP con los runtimes
      actuales?

  D18_mutation:
    question: >
      ¿La composición completa puede preservar no-mutación de envelopes,
      observations, bundles, IES y outputs?

  D19_candidate_next_increment:
    question: >
      Comparar como mínimo:
      A) full-cycle composition EKS -> IES -> RE -> CP;
      B) persistencia durable antes de RE;
      C) sesión/identidad antes de RE;
      D) wiring dashboard/server antes de completar pipeline.

  D20_minimum_productive_completion:
    question: >
      ¿Cuál es el incremento mínimo que transforma el vertical slice ARR
      existente en un ciclo cognitivo completo demostrable?

  D21_gate_requirements:
    question: >
      Para cada candidato, determinar si requiere solo G1 o también G2/G3/G8.

  D22_next_task:
    question: >
      Emitir exactamente un NEXT_TASK recomendado con scope físico cerrado.

mandatory_pipeline_matrix:
  rows:
    - "ARR source"
    - "MINIMAL_EXECUTION_ENVELOPE"
    - "OP"
    - "EB"
    - "EKS"
    - "IES"
    - "RE"
    - "CP"
    - "caller"

  columns:
    - "stage"
    - "runtime exists"
    - "input physically compatible"
    - "output physically compatible"
    - "trace preserved"
    - "persistence required"
    - "session required"
    - "adapter required"
    - "blocker"

mandatory_artifact_flow_matrix:
  columns:
    - "artifact"
    - "producer"
    - "consumer"
    - "real ARR cycle currently produces it"
    - "schema/contract"
    - "fields preserved"
    - "fields lost"
    - "blocking loss"

mandatory_candidate_matrix:
  rows:
    - "A_FULL_CYCLE_COMPOSITION"
    - "B_PERSISTENCE_FIRST"
    - "C_SESSION_FIRST"
    - "D_SERVER_WIRING_FIRST"

  columns:
    - "candidate"
    - "user/product value unlocked"
    - "architectural prerequisite"
    - "runtime prerequisite"
    - "G2"
    - "G3"
    - "G8"
    - "risk"
    - "recommended"

mandatory_gap_classification:
  allowed_values:
    - "READY"
    - "COMPOSITION_ONLY"
    - "ADAPTER_REQUIRED"
    - "IMPLEMENTATION_REQUIRED"
    - "DEBT_NON_BLOCKING"
    - "CONFIG_REQUIRED"
    - "REQUIRES_G2"
    - "REQUIRES_G3"
    - "REQUIRES_G8"
    - "BLOCKER"

mandatory_decision_rules:
  - >
    No recomendar persistencia primero solo porque un componente se llame
    Knowledge Store; probar dependencia física.
  - >
    No recomendar sesión primero salvo que el ciclo cognitivo actual la exija
    físicamente.
  - >
    No recomendar WhatsApp/chat como mecanismo de validación del ciclo.
  - >
    Preferir el incremento más pequeño que demuestre el pipeline constitucional
    completo con ARR real.
  - >
    Si EKS -> IES -> RE -> CP ya son físicamente compatibles, clasificar el gap
    como COMPOSITION_ONLY.
  - >
    Un debt de proyección no es blocker salvo que cambie materialmente la
    semántica que RE necesita para el caso ARR.
  - >
    No introducir G8 si el ciclo puede operar usando únicamente reglas ya
    aprobadas.
  - >
    No crear nueva epistemología para obtener un GO.

architectural_invariants:
  - "N1 != N2 != N3 != N4 != N5"
  - "N3 != N4 != conflict != severity != impact != materiality"
  - "RE consumes IES only"
  - "CP does not create truth"
  - "technical status does not become business conclusion"
  - "chat is not an epistemic source"
  - "source provenance survives"
  - "trace_id remains cycle-wide"
  - "no credentials enter cognitive artifacts"
  - "no causal claim without approved causal rule"

required_report_sections:
  - "1. Executive verdict"
  - "2. Baseline after ARR integration"
  - "3. Physical pipeline inspection"
  - "4. D1-D22 findings"
  - "5. Pipeline readiness matrix"
  - "6. Artifact flow matrix"
  - "7. EKS -> IES compatibility"
  - "8. IES -> RE compatibility"
  - "9. RE -> CP compatibility"
  - "10. N4 projection debt reassessment"
  - "11. Failure/status propagation"
  - "12. Trace propagation"
  - "13. Persistence dependency"
  - "14. Session dependency"
  - "15. Dashboard/server boundary"
  - "16. Candidate comparison"
  - "17. Gate requirements"
  - "18. Minimum productive completion"
  - "19. Exactly one NEXT_TASK"
  - "20. GO/CONDITIONAL-GO/NO-GO"
  - "21. STOP"

acceptance_criteria:
  - "D1-D22 answered"
  - "full ARR -> CP physical path audited"
  - "EKS -> IES compatibility proven"
  - "IES -> RE compatibility proven"
  - "RE -> CP compatibility proven"
  - "N4 projection debt classified blocker/non-blocker"
  - "persistence dependency proven or disproven"
  - "session dependency proven or disproven"
  - "dashboard return boundary identified"
  - "failure propagation audited"
  - "trace propagation audited"
  - "four candidate next increments compared"
  - "G1/G2/G3/G8 requirements separated"
  - "exactly one NEXT_TASK recommended"
  - "no implementation created"
  - "no contracts modified"
  - "no runtime modified"
  - "git diff --check clean"
  - "only CURRENT_TASK and report changed"

allowed_actions:
  - "read contracts"
  - "read prior reports"
  - "read runtimes/tests/fixtures"
  - "inspect server/dashboard/session/persistence code"
  - "run existing tests if useful"
  - "create readiness report"
  - "update CURRENT_TASK through permitted transitions"
  - "run git diff --check"

forbidden_actions:
  - "modify docs/director-ia/"
  - "modify runtime"
  - "modify tests"
  - "modify fixtures"
  - "modify server.js"
  - "modify package.json"
  - "create persistence"
  - "create session"
  - "wire dashboard"
  - "wire WhatsApp/chat"
  - "create implementation task"
  - "commit"
  - "push"
  - "merge"
  - "autoapprove gates"
  - "chain next task"

expected_terminal_state: >
  DONE_PENDING_REVIEW si puede identificarse un siguiente incremento físico
  único y seguro. BLOCKED/STOPPED si completar el ciclo requiere decisiones
  arquitectónicas no autorizadas que impidan siquiera cerrar el scope.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-REAL-CYCLE-COMPLETION-READINESS-001.md"