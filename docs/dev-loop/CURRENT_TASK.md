# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

---

```yaml
task_id: "ARCH-EB-PHYSICAL-DECISIONS-002"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: PENDING
  G3_new_architecture_contract: N/A

objective: >
  Auditar la preparación física y de runtime del Evidence Builder antes de
  implementar código productivo. Identificar exclusivamente las decisiones
  técnicas que todavía deben ser aprobadas por HUMAN_APPROVER para implementar
  posteriormente un Evidence Builder determinístico que consuma las salidas
  contractuales de 03A y produzca Knowledge Bundles compatibles con 03,
  sin redefinir contratos, sin calibrar parámetros pendientes y sin implementar
  runtime en esta tarea.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-001.md"
  - "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-002.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md (solo lectura)"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_1_VERACIDAD.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_3_TOOL_ORCHESTRATOR.md (solo lectura)"

  - "package.json (solo lectura)"
  - "server.js (solo lectura)"
  - "lib/ (solo lectura para inventario)"
  - "test/ (solo lectura para inventario)"

out_of_scope:
  - "modificar cualquier archivo en docs/director-ia/"
  - "modificar Constitución"
  - "modificar Executive Knowledge Engine"
  - "modificar Evidence Builder"
  - "modificar Observation Pipeline"
  - "modificar EKS"
  - "modificar IES"
  - "modificar Reasoning Engine"
  - "modificar Channel Projection"

  - "implementar Evidence Builder"
  - "implementar Observation Pipeline"
  - "implementar Tool Execution"
  - "integrar EB con server.js"
  - "integrar EB con EKS"
  - "persistir Knowledge Bundles"

  - "crear runtime JS/TS/SQL"
  - "modificar código productivo"
  - "modificar tests"

  - "calibrar wi"
  - "calibrar k"
  - "definir umbrales productivos de severidad"
  - "definir escalado productivo de Fs"
  - "definir ventanas productivas de recencia"
  - "crear reglas causales"
  - "crear reglas de negocio no presentes en contratos"

  - "autoaprobar G2"
  - "crear o ejecutar IMPL-EB-001"
  - "commit"
  - "push"
  - "merge"
  - "cambiar de rama durante la ejecución"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

contractual_boundaries:
  observation_pipeline:
    owns:
      - "AcquisitionStatus"
      - "ObservationRecord"
      - "normalización técnica de payload"
      - "resolución declarada de entidad"
      - "preservación de source/content_author_id/extracted_by/triggered_by"
    must_not:
      - "determinar ABSENCE_CONFIRMED"
      - "crear hechos"
      - "crear evidencias"
      - "crear diagnósticos"
      - "determinar Knowledge Coverage"
      - "escribir EKS"

  evidence_builder:
    consumes:
      - "AcquisitionStatus"
      - "ObservationRecord"
      - "Plan/Tool Plan y trazabilidad contractual aplicable"
    owns:
      - "ensamblaje N1 -> N2 -> N3 -> N4"
      - "tipificación EB de ausencia/no-valor"
      - "elevación determinística a ABSENCE_CONFIRMED"
      - "confidence dimensions sin falsa precisión mientras falte calibración"
      - "conflictos compuestos"
      - "resolution_status y transiciones válidas"
      - "materiality mecánica cuando exista ruleset"
      - "MATERIALITY_NOT_ASSESSED cuando no exista ruleset calibrado"
      - "preguntas abiertas neutrales"
      - "producción del Knowledge Bundle"
    must_not:
      - "inventar política"
      - "inventar fuentes"
      - "generar hipótesis"
      - "usar LLM"
      - "resolver conflictos por weight_assessment"
      - "interpretar DATA_NOT_FOUND como ausencia"
      - "inventar parámetros de calibración"

  eks:
    consumes:
      - "Knowledge Bundle"
    owns:
      - "persistencia append-only"
      - "Knowledge Snapshot"
    must_not:
      - "reinterpretar el Bundle"
      - "cambiar resolution_status"
      - "recalcular conocimiento"

known_unresolved_calibration:
  - "wi"
  - "k"
  - "umbrales de severidad"
  - "escalado Fs por tool/dominio"
  - "ventanas de recencia R"
  - "reglas causales aprobadas"

audit_questions:
  - "D1: interfaz física mínima del Evidence Builder"
  - "D2: forma física exacta de entrada AcquisitionStatus + ObservationRecord"
  - "D3: progresión interna N1 -> N2 -> N3 -> N4 sin saltos"
  - "D4: registry/versionado de reglas determinísticas"
  - "D5: estrategia de IDs y trazabilidad"
  - "D6: preservación de lineage e independencia para Cb sin inventar k"
  - "D7: representación de confidence sin falsa precisión"
  - "D8: DATA_NOT_FOUND -> ABSENCE_CONFIRMED rule-driven y fail-closed"
  - "D9: resolution_status y transiciones válidas"
  - "D10: MATERIALITY_NOT_ASSESSED sin ruleset calibrado"
  - "D11: pureza/inmutabilidad del Builder"
  - "D12: validación de Knowledge Bundle contra frontera EKS"
  - "D13: fixtures iniciales contractuales"
  - "D14: orden de implementación OP vs EB"
  - "D15: decisiones que requieren G2 antes de implementación"

required_report:
  - "estado real del repositorio relevante al EB/OP/EKS"
  - "inventario de soporte existente reutilizable"
  - "gaps entre contratos y runtime actual"
  - "respuesta razonada a D1-D15"
  - "alternativas técnicas"
  - "recomendación técnica no vinculante"
  - "riesgos"
  - "decisiones exactas que requieren HUMAN_APPROVER"
  - "identificación explícita de cualquier decisión que requiera G2"
  - "evaluación GO / BLOCKED para futura IMPL-EB-001"
  - "orden recomendado OP/EB sin ejecutarlo"

acceptance_criteria:
  - "rama de ejecución distinta de main"
  - "no se modifica ningún contrato"
  - "no se crea runtime"
  - "no se modifica server.js"
  - "no se modifica package.json"
  - "no se modifica lib/"
  - "no se modifica test/"
  - "no se implementa OP"
  - "no se implementa EB"
  - "no se abre IMPL-EB-001"
  - "no se inventan wi, k, Fs, recencia ni severidad"
  - "no se inventan reglas causales"
  - "D1-D15 respondidas o explícitamente BLOCKED"
  - "reporte diferencia contrato existente de propuesta"
  - "reporte identifica decisiones humanas"
  - "git diff --check sin errores"
  - "únicos cambios permitidos: CURRENT_TASK y reporte"

allowed_actions:
  - "leer contracts_in_force"
  - "leer documentos de soporte indicados"
  - "leer código y tests actuales para inventario sin modificar"
  - "ejecutar búsquedas locales de texto"
  - "ejecutar comandos git de inspección"
  - "ejecutar git diff --check"
  - "crear docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-002.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas por LOOP_PROTOCOL.md"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar código productivo"
  - "modificar tests"
  - "crear runtime"
  - "crear migraciones"
  - "integrar componentes"
  - "calibrar parámetros pendientes"
  - "inventar reglas de negocio"
  - "autoaprobar G2"
  - "crear o ejecutar IMPL-EB-001"
  - "commit"
  - "push"
  - "merge"
  - "cambiar de rama"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si la auditoría puede producir una recomendación completa
  sin modificar contratos. BLOCKED si alguna decisión necesaria exige cambio
  contractual o autorización G2 antes de continuar.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-EB-PHYSICAL-DECISIONS-002.md"