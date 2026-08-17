# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa solo la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto no es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "ARCH-EVIDENCE-N3-RULES-PHYSICAL-DECISIONS-002"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-17T16:17:33-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-17"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: AUTHORIZED
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Resolver y registrar contractualmente la realización física mínima de
  Evidence N3 no causal que puede implementarse sin G8, conforme a la auditoría
  ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001. Congelar interfaz de evidence rules,
  identidad/versionado de reglas, contrato físico de Evidence N3, regla
  determinística inicial de contradicción y frontera explícita respecto de
  causalidad, thresholds, severity, materiality y clasificación B/C/D/E,
  sin implementar runtime en esta tarea.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001.md (solo lectura)"
  - "docs/dev-loop/reports/ARCH-EVIDENCE-N3-RULES-PHYSICAL-DECISIONS-002.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md (solo lectura)"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md (solo lectura)"
  - "docs/director-ia/04-IES-STANDARD.md (solo lectura)"
  - "docs/director-ia/05-REASONING-ENGINE.md (solo lectura)"

  - "lib/director-ia-evidence-builder.js (solo lectura)"
  - "test/director-ia-evidence-builder.test.js (solo lectura)"
  - "lib/director-ia-e2e.js (solo lectura)"
  - "test/director-ia-e2e.test.js (solo lectura)"

out_of_scope:
  - "implementar Evidence N3"
  - "modificar lib/director-ia-evidence-builder.js"
  - "crear tests N3"
  - "crear fixtures N3"

  - "definir reglas productivas de tendencia"
  - "definir reglas productivas de desviación"
  - "definir reglas productivas de deterioro"
  - "definir reglas productivas de co-ocurrencia con thresholds"
  - "crear causal rules"

  - "clasificar B/C/D/E productivamente"
  - "inventar criterio Tipo E"
  - "forzar A -> E"
  - "resolver conflictos"

  - "calibrar wi"
  - "calibrar k"
  - "calibrar Fs"
  - "calibrar materiality"
  - "calibrar severity"
  - "definir thresholds"
  - "activar G8"

  - "modificar Constitución"
  - "modificar Executive Knowledge Engine"
  - "modificar 03A"
  - "modificar 04"
  - "modificar 05"
  - "modificar otros runtimes"
  - "modificar server.js"
  - "modificar package.json"

  - "commit"
  - "push"
  - "merge"
  - "crear IMPL-EVIDENCE-N3-001"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"

audit_result_in_force:
  source: "docs/dev-loop/reports/ARCH-EVIDENCE-N3-PHYSICAL-DECISIONS-001.md"
  implementation_status: "NO-GO"
  confirmed_facts:
    - "RULE_REGISTRY.evidence_rules está vacío"
    - "to_n3() devuelve [] de forma fail-closed"
    - "to_n4() devuelve [] de forma fail-closed"
    - "runtime actual tipifica contradicción simple como Tipo A"
    - "no existen ramas físicas B/C/D/E"
    - "Tipo E no puede inferirse de contradicción simple"
    - "franja N3 no causal puede existir sin G8"
    - "severity/materiality/wi/k/Fs/thresholds siguen fuera"
    - "clasificación B/C/D/E sigue sin criterio físico congelado"

proposed_human_decisions:

  D1_rule_registry:
    decision: "EVIDENCE_RULE_REGISTRY_V1"
    meaning: >
      Evidence Builder mantiene un registry explícito, versionado y cerrado de
      evidence rules. Una Evidence N3 solo puede existir como resultado de una
      rule registrada.

    minimum_rule_fields:
      - "rule_id"
      - "rule_version"
      - "rule_category"
      - "causal"
      - "input_contract"
      - "output_contract"
      - "status"

    constraints:
      - "causal=false para todas las rules de esta versión"
      - "status debe ser ACTIVE para ejecutarse"
      - "rule_id/version quedan persistidos en Evidence N3"
      - "runtime no inventa rules dinámicamente"
      - "ninguna rule depende de LLM"

  D2_initial_rule_scope:
    decision: "NON_CAUSAL_CONTRADICTION_RULE_V1_ONLY"
    meaning: >
      La primera implementación N3 autorizable contiene una única categoría
      productiva: contradicción determinística entre facts comparables.
      Tendencia, desviación, deterioro, co-ocurrencia y causalidad permanecen
      diferidas.

    allowed_category:
      - "CONTRADICTION"

    deferred_categories:
      - "CO_OCCURRENCE"
      - "TREND"
      - "DEVIATION"
      - "DETERIORATION"
      - "CONSISTENCY_RELATION"
      - "CAUSAL_RELATION"

  D3_fact_comparability:
    decision: "FACT_COMPARABILITY_KEY_V1"
    meaning: >
      Dos o más facts pueden entrar a la rule de contradicción únicamente si
      comparten el mismo scope lógico de comparación.

    comparison_key:
      - "entity canonical identity"
      - "metric_or_event"
      - "period"

    required:
      - "todos los facts tienen fact_id"
      - "misma entidad canónica o mismo scope sin entidad cuando contractualmente permitido"
      - "mismo metric_or_event"
      - "mismo period"
      - "valores comparables bajo representación existente"

    prohibited:
      - "comparar periodos distintos como contradicción"
      - "comparar métricas distintas"
      - "comparar entidades distintas"
      - "resolver entity ambiguity dentro de N3"

  D4_contradiction_condition:
    decision: "DISTINCT_VALUE_CONTRADICTION_V1"
    meaning: >
      Para facts comparables, si existen dos o más valores distintos
      representados de forma estable, se puede emitir Evidence N3 de
      contradicción.

    condition:
      - "fact_count >= 2"
      - "distinct_normalized_values >= 2"

    rules:
      - "no threshold"
      - "no probability"
      - "no severity"
      - "no causalidad"
      - "no declara cuál fact es verdadero"
      - "no resuelve el conflicto"

  D5_evidence_n3_schema:
    decision: "EVIDENCE_N3_PHYSICAL_V1"
    required_fields:
      - "evidence_id"
      - "evidence_type"
      - "statement"
      - "supporting_fact_ids"
      - "applied_rule"
      - "materiality"
      - "causal_status"
      - "traceability"

    evidence_type:
      allowed:
        - "CONTRADICTION"

    applied_rule_fields:
      - "rule_id"
      - "rule_version"

    causal_status:
      value: "NON_CAUSAL"

    materiality_rule:
      default: "MATERIALITY_NOT_ASSESSED"
      propagation: >
        Si facts soporte ya contienen materiality evaluada por una regla
        autorizada futura, N3 puede preservar/derivar según contrato vigente.
        Esta tarea no define rollup MAT_*.

  D6_statement_semantics:
    decision: "NON_CAUSAL_CONTRADICTION_STATEMENT_V1"
    meaning: >
      El statement de Evidence N3 describe únicamente que existen facts
      incompatibles bajo el mismo scope de comparación.

    allowed_semantics:
      - "facts incompatibles"
      - "valores en contradicción"
      - "fuentes/facts reportan valores distintos"

    forbidden_semantics:
      - "X causó Y"
      - "X probablemente es incorrecto"
      - "la fuente A tiene razón"
      - "el valor verdadero es..."
      - "hay fraude"
      - "hay error humano"
      - "hay mala gestión"

  D7_support_and_lineage:
    decision: "TRACEABLE_FACT_SUPPORT_V1"
    meaning: >
      Evidence N3 debe citar todos los facts utilizados y conservar referencias
      suficientes a su linaje sin reescribir N1/N2.

    rules:
      - "supporting_fact_ids no vacío"
      - "mínimo 2 facts para CONTRADICTION"
      - "facts deben existir en el mismo Bundle"
      - "N3 no duplica ObservationRecord"
      - "N3 no altera content_author_id/extracted_by/triggered_by"
      - "traceability referencia trace_id y rule identity"

  D8_rule_identity:
    decision: "RULE_IDENTITY_STABLE_V1"
    meaning: >
      La identidad de una rule es una constante contractual estable, no el
      nombre accidental de una función JS.

    initial_rule:
      rule_id: "N3_CONTRADICTION_SAME_SCOPE_DISTINCT_VALUE"
      rule_version: "1.0"
      causal: false
      status: "ACTIVE"

  D9_determinism:
    decision: "N3_DETERMINISTIC_OUTPUT_V1"
    meaning: >
      Mismos facts ordenados semánticamente + misma rule version producen el
      mismo conjunto lógico de Evidence N3, salvo IDs inyectados.

    rules:
      - "orden de entrada no cambia semántica"
      - "supporting_fact_ids en orden estable"
      - "sin reloj ambiental"
      - "sin random"
      - "sin LLM"
      - "sin IO"

  D10_conflict_relationship:
    decision: "N3_CONTRADICTION_DOES_NOT_RETYPE_CONFLICT_V1"
    meaning: >
      La Evidence N3 de contradicción y el conflicto compuesto son artefactos
      distintos. Emitir Evidence N3 no autoriza cambiar Tipo A a B/C/D/E.

    rules:
      - "runtime actual puede seguir tipificando contradicción simple como A"
      - "N3 CONTRADICTION puede soportar facts_in_tension"
      - "clasificador A-E queda fuera de esta implementación"
      - "Tipo E sigue bloqueado hasta criterio contractual futuro"

  D11_conflict_type_a:
    decision: "TYPE_A_DEFAULT_FOR_SIMPLE_VALUE_CONFLICT_V1"
    meaning: >
      Mientras no exista clasificador A-E completo, una contradicción simple
      de valores dentro del mismo scope puede continuar siendo Tipo A OPEN.

    constraints:
      - "no secondary_types inventados"
      - "governance_escalation=false"
      - "severity no calibrada"
      - "no resolución automática"

  D12_resolution_boundary:
    decision: "NO_RESOLUTION_RULES_IN_N3_V1"
    meaning: >
      Esta realización N3 no implementa resolution rules ni transiciones a
      RESOLVED/SUPERSEDED.

    allowed:
      - "OPEN existente"
      - "UNDER_REVIEW solo si upstream válido ya lo trae según contrato"

    forbidden:
      - "crear RESOLVED"
      - "resolver por weight_assessment"
      - "inferir cierre desde N3"

  D13_g8_boundary:
    decision: "N3_V1_G8_FREE_SUBSET"
    meaning: >
      La rule inicial no depende de G8 porque no usa thresholds, confidence
      scoring, materiality scoring, severity, wi, k, Fs ni causalidad.

    explicitly_deferred_to_g8:
      - "thresholds"
      - "trend thresholds"
      - "deviation thresholds"
      - "deterioration thresholds"
      - "severity calibration"
      - "materiality calibration"
      - "confidence calibration"
      - "wi"
      - "k"
      - "Fs"

  D14_n4_boundary:
    decision: "N4_REMAINS_OUT_OF_SCOPE_V1"
    meaning: >
      La existencia de Evidence N3 no autoriza crear diagnósticos N4 sin una
      diagnostic rule y soporte explícitos.

  D15_reasoning_unlock:
    decision: "N3_MAY_ENABLE_N5_WITHOUT_GUARANTEE_V1"
    meaning: >
      Evidence N3 válida puede satisfacer la precondición estructural de
      supporting_evidence_ids del Reasoning Engine, pero no obliga al RE a
      emitir hipótesis ni recommendations.

    rules:
      - "RE conserva sus gates"
      - "N3 no crea hypothesis"
      - "N3 no cambia hypothesis_strength"
      - "N3 no garantiza causal inference"

  D16_first_implementation_scope:
    decision: "IMPL_EVIDENCE_N3_CONTRADICTION_ONLY_V1"
    meaning: >
      Un futuro IMPL-EVIDENCE-N3-001 deberá implementar únicamente registry +
      rule CONTRADICTION + Evidence N3 schema + tests/regresión asociados.

    implementation_constraints:
      - "sin G8"
      - "sin B/C/D/E classifier nuevo"
      - "sin N4"
      - "sin causalidad"
      - "sin thresholds"
      - "sin provider/LLM"
      - "sin nuevas fuentes"
      - "sin cambios OP/EKS/IES/RE/CP"

human_approval_scope:
  approve_exactly:
    - "D1_rule_registry"
    - "D2_initial_rule_scope"
    - "D3_fact_comparability"
    - "D4_contradiction_condition"
    - "D5_evidence_n3_schema"
    - "D6_statement_semantics"
    - "D7_support_and_lineage"
    - "D8_rule_identity"
    - "D9_determinism"
    - "D10_conflict_relationship"
    - "D11_conflict_type_a"
    - "D12_resolution_boundary"
    - "D13_g8_boundary"
    - "D14_n4_boundary"
    - "D15_reasoning_unlock"
    - "D16_first_implementation_scope"

g2_contract_changes_authorized_if_approved:
  docs/director-ia/02-EVIDENCE-BUILDER.md:
    allowed:
      - "registrar realización física D1-D16"
      - "registrar Evidence Rule Registry v1"
      - "registrar rule identity inicial"
      - "registrar schema físico Evidence N3 v1"
      - "registrar comparación misma entidad/métrica/periodo"
      - "registrar CONTRADICTION no causal"
      - "registrar materiality NOT_ASSESSED en subset sin G8"
      - "registrar frontera N3/conflict"
      - "registrar scope futuro IMPL-EVIDENCE-N3-001"

    forbidden:
      - "calibrar G8"
      - "crear thresholds"
      - "crear causal rules"
      - "crear B/C/D/E classifier"
      - "inventar Type E"
      - "crear N4 rules"
      - "cambiar definición constitucional N1-N5"
      - "modificar IES/RE"
      - "resolver conflictos"

g8_reserved_and_unchanged:
  - "wi"
  - "k"
  - "Fs"
  - "materiality"
  - "severity"
  - "thresholds"
  - "causal rules"
  - "trend/deviation/deterioration calibration"

required_report:
  - "D1-D16 registradas"
  - "diff contractual exacto"
  - "confirmación subset N3 sin G8"
  - "confirmación causalidad no autorizada"
  - "confirmación B/C/D/E diferidos"
  - "rule registry final"
  - "rule identity final"
  - "Evidence N3 schema final"
  - "fact comparability final"
  - "conflict relationship final"
  - "N4 boundary"
  - "Reasoning unlock boundary"
  - "GO/NO-GO para IMPL-EVIDENCE-N3-001"

acceptance_criteria:
  - "Evidence Rule Registry queda físicamente definido"
  - "solo CONTRADICTION productiva inicial autorizada"
  - "comparison key definido"
  - "Evidence N3 schema definido"
  - "rule identity estable"
  - "statement no causal definido"
  - "supporting_fact_ids obligatorios"
  - "materiality queda NOT_ASSESSED sin G8"
  - "N3 no re-tipifica conflictos"
  - "Tipo A simple puede continuar"
  - "Tipo E no se inventa"
  - "resolution no se implementa"
  - "N4 sigue fuera"
  - "subset no requiere G8"
  - "02 es único contrato modificable"
  - "ningún runtime modificado"
  - "sin tests/fixtures"
  - "git diff --check limpio"
  - "reporte obligatorio creado"
  - "IMPL-EVIDENCE-N3-001 no se crea"

allowed_actions:
  - "leer contracts_in_force"
  - "leer auditoría 001"
  - "leer Evidence Builder runtime/tests"
  - "comparar D1-D16 con contratos superiores"
  - "si G1+G2 autorizados, modificar únicamente 02-EVIDENCE-BUILDER.md"
  - "crear docs/dev-loop/reports/ARCH-EVIDENCE-N3-RULES-PHYSICAL-DECISIONS-002.md"
  - "actualizar CURRENT_TASK mediante transiciones permitidas"
  - "ejecutar git diff --check"

forbidden_actions:
  - "modificar contratos fuera de 02"
  - "implementar N3"
  - "modificar Evidence Builder runtime"
  - "crear tests/fixtures"
  - "crear thresholds"
  - "usar G8"
  - "crear causal rules"
  - "crear clasificador B/C/D/E"
  - "crear Tipo E"
  - "crear N4"
  - "modificar OP/EKS/IES/RE/CP"
  - "modificar server.js"
  - "modificar package.json"
  - "autoaprobar gates"
  - "crear IMPL-EVIDENCE-N3-001"
  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

expected_terminal_state: >
  DONE_PENDING_REVIEW si D1-D16 pueden registrarse en 02 sin contradicción
  constitucional y sin usar G8.
  BLOCKED o STOPPED si alguna decisión exige thresholds, calibración G8,
  causalidad, Tipo E nuevo, N4 o modificación de otro contrato.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-EVIDENCE-N3-RULES-PHYSICAL-DECISIONS-002.md"