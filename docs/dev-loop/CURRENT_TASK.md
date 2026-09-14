```yaml
task_id: "IMPL-DIRECTOR-IA-PERFORMANCE-SALES-TARGET-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Implementar la especialización PERFORMANCE únicamente para evaluar cumplimiento
  de venta real contra la meta física de venta de planta-mes almacenada en
  igf_meta.meta_lines.venta_ton, preservando fail-closed cuando no exista meta
  o cuando la pregunta no identifique de forma suficiente la referencia.

source_audit:
  task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-001"
  report: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-001.md"
  audit_commit: "89a887c9"

parent_family:
  intent: "EXECUTIVE_STATUS"
  relationship: >
    PERFORMANCE es una especialización subordinada. No sustituye ni amplía
    indiscriminadamente EXECUTIVE_STATUS.

supported_reference:
  type: "TARGET_COMMITMENT"
  source: "igf_meta.meta_lines.venta_ton"
  scope: "venta total de planta por YYYY-MM"

primary_questions:
  - "¿Estamos cumpliendo la meta de venta?"
  - "¿Cómo vamos contra la meta de venta?"
  - "¿Qué porcentaje de la meta de venta llevamos?"
  - "¿Vamos arriba o abajo de la meta?"
  - "¿Cuánto nos falta para cumplir la meta de venta?"
  - "¿Superamos la meta de venta?"
  - "¿Cómo cerramos contra la meta?"
  - "¿Cuál es el cumplimiento de venta del mes?"

required_inputs:
  - "planta canónica o contexto de planta válido"
  - "periodo YYYY-MM explícito o resoluble por contrato vigente"
  - "venta real comparable del mismo periodo"
  - "igf_meta.meta_lines.venta_ton del mismo periodo y planta"

required_calculations:
  attainment_pct: >
    venta_real_ton / meta_venta_ton * 100 cuando meta_venta_ton > 0
  variance_ton: >
    venta_real_ton - meta_venta_ton
  remaining_ton: >
    max(meta_venta_ton - venta_real_ton, 0)
  over_target_ton: >
    max(venta_real_ton - meta_venta_ton, 0)

required_semantics:
  - "cumpliendo: attainment_pct >= 100"
  - "por debajo: attainment_pct < 100"
  - "desviación siempre expresada contra la meta física"
  - "no interpretar forecast como meta"
  - "no interpretar presupuesto como meta"
  - "no interpretar histórico como meta"
  - "no usar mejora vs mes anterior como sinónimo de cumplimiento"

fail_closed_cases:
  target_missing:
    code: "TARGET_MISSING_FOR_PERIOD"
    behavior: >
      Si no existe meta de venta física para la planta y periodo, no afirmar
      cumplimiento, incumplimiento ni porcentaje de meta.

  ambiguous_metric:
    examples:
      - "¿Estamos cumpliendo?"
      - "¿Vamos bien?"
    behavior: >
      No asumir automáticamente que la métrica es venta. Resolver por contexto
      solo si el contrato conversacional vigente demuestra una meta de venta
      activa; en caso contrario, pedir o requerir aclaración según el patrón
      fail-closed existente.

  ambiguous_period:
    behavior: >
      No comparar venta de un periodo contra meta de otro.

  invalid_target:
    behavior: >
      Si la meta es null, cero no válido o inconsistente según contrato físico,
      no calcular attainment artificial.

protected_boundaries:
  forecast:
    rule: "Solo puede expresarse como vs proyección, nunca como cumplimiento."
  budget:
    rule: "No usar presupuesto semanal de folios como meta de planta."
  historical:
    rule: "Puede soportar tendencia, no cumplimiento."
  executive_status:
    rule: "No convertir todas las preguntas generales de estado en PERFORMANCE."
  diagnosis:
    rule: "No implementar diagnóstico de causas."
  priority:
    rule: "No implementar priorización."
  time:
    rule: "No modificar daily_executive_brief."

continuity_cases:
  - conversation:
      - "¿Cómo vamos contra la meta de venta en Puebla?"
      - "¿Y Acapulco?"
    expected: >
      Heredar periodo y métrica solo si el conversation_state vigente lo permite;
      resolver nueva planta sin cruzar datos.

  - conversation:
      - "¿Qué porcentaje llevamos?"
      - "¿Cuánto nos falta?"
    expected: >
      Heredar la referencia de meta de venta si fue establecida explícitamente
      en el turno anterior.

  - conversation:
      - "¿Estamos cumpliendo la meta de venta?"
      - "¿Por qué?"
    expected: >
      No inventar causalidad. Este slice solo puede explicar resultado,
      meta y desviación; diagnóstico causal queda fuera.

output_contract:
  must_include_when_available:
    - "planta"
    - "periodo"
    - "venta real"
    - "meta de venta"
    - "porcentaje de cumplimiento"
    - "desviación en toneladas"
  optional:
    - "toneladas faltantes"
    - "toneladas por encima de meta"
  prohibited:
    - "causas no demostradas"
    - "recomendaciones"
    - "juicios de desempeño de otras métricas"
    - "forecast tratado como target"

implementation_principle: >
  Reutilizar físicamente fuentes y herramientas existentes cuando sea posible.
  No duplicar lógica IGF ni crear una segunda verdad de meta o venta.

tests_required:
  positive:
    - "meta existe y venta < meta"
    - "meta existe y venta = meta"
    - "meta existe y venta > meta"
    - "pregunta por porcentaje de cumplimiento"
    - "pregunta por cuánto falta"
    - "pregunta por arriba/abajo de meta"
  negative:
    - "meta ausente → TARGET_MISSING_FOR_PERIOD"
    - "pregunta '¿Estamos cumpliendo?' sin referencia suficiente no inventa venta"
    - "forecast no se usa como meta"
    - "presupuesto no se usa como meta"
    - "histórico no se usa como meta"
    - "no cruce de planta"
    - "no cruce de periodo"
  regression:
    - "EXECUTIVE_STATUS sigue funcionando"
    - "daily_executive_brief sigue funcionando"
    - "month_close_result no se rompe"
    - "planner existente sin regresiones relevantes"

success_metrics:
  - "100% de preguntas explícitas de venta vs meta soportadas por contrato llegan a la ruta correcta."
  - "100% de ausencia de target falla cerrado."
  - "0 casos donde forecast/presupuesto/histórico autoricen 'cumplimos'."
  - "0 cruces de planta."
  - "0 cruces de periodo."
  - "0 nueva capacidad paralela de meta."
  - "0 cambios SQL."

in_scope:
  - "planner mínimo requerido para reconocer PERFORMANCE explícito de venta/meta"
  - "executor/tool orchestration mínimo requerido"
  - "lectura de igf_meta existente"
  - "lectura de venta real existente"
  - "tests"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PERFORMANCE-SALES-TARGET-001.md"

out_of_scope:
  - "metas de otras métricas"
  - "metas por cliente"
  - "metas de descuento"
  - "metas de margen"
  - "creación/edición de metas"
  - "forecast como target"
  - "presupuesto como target"
  - "diagnóstico causal"
  - "priorización"
  - "recomendaciones"
  - "frontend"
  - "SQL/schema"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

allowed_actions:
  - "crear rama implementation/director-ia-performance-sales-target-001"
  - "modificar la mínima frontera runtime necesaria"
  - "agregar tests y fixtures"
  - "ejecutar sondas locales/read-only"
  - "documentar evidencia"
  - "commit y push únicamente a la rama de trabajo si el protocolo vigente lo permite"

forbidden_actions:
  - "inventar target"
  - "crear fallback a forecast"
  - "crear fallback a presupuesto"
  - "crear fallback a histórico"
  - "modificar SQL"
  - "crear nueva tabla"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "implementar DIAGNOSIS"
  - "implementar PRIORITY"
  - "iniciar siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-PERFORMANCE-SALES-TARGET-001.md"

final_state: "DONE_PENDING_REVIEW"
```
