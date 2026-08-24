# CURRENT_TASK

```yaml
task_id: "DOCS-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-SYNC-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo DOCS-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-SYNC-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Sincronizar exclusivamente la documentación de capacidades con el first
  slice commercial_materiality_and_coverage ya integrado en main dentro de
  plant_diagnosis. No modificar código, runtime, tests ni contratos.

baseline:
  numerator: 10.5
  denominator: 20
  percentage: 52.5
  delta: "0.0 pp"

document_runtime_path: >
  plant_diagnosis
    → commercial_state SELECT-only
    → kg_mes_real observado
    → concentración comercial top-N
    → cobertura DICF por cliente_key
    → evidencia ejecutiva
    → una llamada OpenAI

mandatory_documentation:

  materiality:
    magnitude: "kg_mes_real"
    unit: "kg observados del mes de la fila"
    rules:
      - "kg_mes_forecast - kg_mes_real NO se documenta como venta perdida"
      - "null != 0"
      - "magnitudes homogéneas"
      - "periodo explícito"
      - "denominador explícito"

  concentration:
    top_n: 5
    deterministic: true
    rules:
      - "concentración matemática != causalidad"
      - "top-N identifica dónde se concentra la magnitud observada"
      - "no score compuesto"

  coverage:
    join_key: "cliente_key"
    canonical_pattern: "M11/buildClienteKey"
    rules:
      - "sin join por nombre libre"
      - "acción DICF asociada es cobertura registrada"
      - "sin acción DICF != prueba de que nadie esté trabajando el caso"
      - "responsable de acción != responsable de caída"
      - "acción vencida != negligencia"
      - "acción cerrada != éxito"

  recommendation_boundary:
    allowed: >
      El chat legado puede sugerir textualmente qué casos conviene revisar
      primero sobre evidencia observada.

    prohibited:
      - "Recommendation N5"
      - "MAT_*"
      - "fingir IES"
      - "causalidad"
      - "mandato"
      - "writes"

  preserved_runtime:
    - "seis fuentes de plant_diagnosis"
    - "commercial_state SELECT-only sobre arr.dicf_cliente_mes"
    - "sin computeDicf"
    - "sin cache writes"
    - "sin M9"
    - "una llamada OpenAI"
    - "provenance separada"
    - "partial failure"
    - "authz existente"
    - "financial_diagnosis intacto"

  explicitly_deferred:
    - "economic recovery trade-off"
    - "margen por cliente"
    - "oferta estructurada de competencia"
    - "daily deviation explanation"
    - "por qué bajó la venta ayer"
    - "por qué subió descuento/kg diario"
    - "evidence-gap closure workflow"
    - "identificar quién debe aportar información salvo vínculo físico"
    - "before → action → after"
    - "director agenda"
    - "follow-up/reprioritization"
    - "persist recommendations"

module_state:
  rule: >
    Esta profundización transversal no cambia ningún módulo de estado ni suma
    cobertura.

  global_before: "10.5 / 20 = 52.5%"
  global_after: "10.5 / 20 = 52.5%"
  delta: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
    - "docs/dev-loop/reports/DOCS-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-SYNC-001.md"

  read_only:
    - "lib/director-ia-plant-diagnosis.js"
    - "lib/director-ia-chat.js"
    - "test/director-ia-plant-diagnosis.test.js"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-001.md"
    - "docs/director-ia/**"

out_of_scope:
  - "código"
  - "runtime"
  - "tests"
  - "contratos"
  - "Constitución"
  - "04 IES"
  - "05 Reasoning Engine"
  - "cambiar estados de módulos"
  - "cambiar porcentaje"
  - "implementar nuevas capacidades"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "commercial_materiality_and_coverage documentado."
  - "kg_mes_real documentado con semántica correcta."
  - "forecast-real no descrito como venta perdida."
  - "top-N=5 y concentración documentados."
  - "denominador y periodo documentados."
  - "cliente_key documentado."
  - "sin join por nombre."
  - "límites de cobertura DICF documentados."
  - "límites de causalidad documentados."
  - "chat legado != N5 documentado."
  - "capacidades diferidas explícitas."
  - "10.5/20 = 52.5% preservado."
  - "ningún otro módulo cambia."
  - "solo tres archivos autorizados cambian."
  - "git diff --check limpio."

next_task:
  propose_only: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-INTELLIGENCE-001"
  authorize: false
  execute: false

expected_terminal_state: "DONE_PENDING_REVIEW"

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/DOCS-DIRECTOR-IA-EXECUTIVE-PRIORITIZATION-SYNC-001.md