```yaml
task_id: "IMPL-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-OBSERVATIONS-RISKS-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Implementar la especialización DIAGNOSIS de Director IA únicamente para
  responder preguntas ejecutivas de preocupación/problemas mediante
  observaciones, desviaciones y riesgos ya soportados físicamente por runtime,
  sin afirmar causas confirmadas ni introducir hipótesis no soportadas.

source_audit:
  task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-001"
  report: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-001.md"
  audit_commit: "4e89914f"

parent_family:
  intent: "EXECUTIVE_STATUS"
  relationship: >
    DIAGNOSIS es una especialización subordinada. No sustituye EXECUTIVE_STATUS
    ni convierte cualquier estado ejecutivo en diagnóstico.

supported_levels:
  - "OBSERVATION"
  - "DEVIATION"
  - "RISK"

unsupported_levels:
  - "HYPOTHESIS"
  - "CONFIRMED_CAUSE"

canonical_questions:
  - "¿Qué debería preocuparme?"
  - "¿Qué me debería preocupar?"
  - "¿Dónde estamos fallando?"
  - "¿Dónde tenemos problemas?"
  - "¿Qué está funcionando y qué no?"
  - "¿Qué riesgos ves?"
  - "¿Cuál es el principal problema?"
  - "¿Qué está saliendo mal?"
  - "¿Qué se está deteriorando?"

known_baseline:
  concern_phrase_gap:
    phrase: "¿Qué debería preocuparme?"
    current_behavior: "unknown"
    cause: >
      El detector reconoce variantes como 'preocupa' pero no cubre
      correctamente 'preocuparme'.
  cause_question:
    example: "¿Por qué estamos debajo de la meta?"
    current_behavior: "CAUSE_EXPLANATION"
    rule: >
      No implementar explicación causal en este slice.

allowed_signal_types:
  observation:
    examples:
      - "cliente dejó de comprar"
      - "acción está vencida"
      - "folio/incidencia objetiva existente"
      - "métrica bajó respecto a referencia válida"

  deviation:
    examples:
      - "venta real por debajo de igf_meta.venta_ton"
      - "cambio negativo vs periodo comparable"
      - "desviación física ya calculada por runtime"

  risk:
    source_rule: >
      Solo reglas de riesgo existentes y tipadas físicamente. No crear nuevas
      reglas subjetivas.
    examples:
      - "FORECAST_BELOW_TARGET"
      - "lost client"
      - "overdue action"
      - "otras reglas PRE_CLOSE existentes verificadas por auditoría"

prohibited_claims:
  - "la causa es"
  - "esto ocurrió porque"
  - "seguramente se debe a"
  - "el responsable es"
  - "recomiendo hacer X"
  - "lo más importante es X" # PRIORITY queda fuera
  - "esta es la causa principal"
  - "este comentario confirma la causa"

diagnostic_contract:
  input_context:
    - "planta explícita o contexto válido"
    - "periodo cuando la señal lo requiera"
  output:
    must_distinguish:
      - "observación"
      - "desviación"
      - "riesgo"
    must_include_when_available:
      - "hallazgo"
      - "tipo de hallazgo"
      - "evidencia/fuente"
      - "periodo"
      - "planta"
      - "valor o referencia relevante"
    must_not_include:
      - "causa no demostrada"
      - "hipótesis libre"
      - "recomendación"
      - "priorización subjetiva"

aggregation_rule: >
  Cuando existan varios hallazgos, Director IA puede agruparlos por tipo o
  dominio, pero no debe ordenarlos como prioridad salvo que exista una regla
  objetiva ya soportada y autorizada explícitamente.

linguistic_scope:
  must_cover:
    - "preocuparme"
    - "me debería preocupar"
    - "problemas"
    - "fallando"
    - "riesgos"
    - "saliendo mal"
    - "deteriorando"
  must_not_absorb:
    - "¿Por qué...?"
    - "¿Qué hago?"
    - "¿Qué atiendo primero?"
    - "¿Qué es lo más importante?"
    - "¿Qué tal estás?"

protected_boundaries:
  cause_explanation:
    rule: >
      Preguntas causales continúan fuera. No responderlas con causalidad inventada.
  priority:
    rule: >
      No seleccionar 'lo más importante' ni 'qué atender primero'.
  performance:
    rule: >
      Puede reutilizar una desviación de performance como hallazgo, pero no
      modificar el contrato de PERFORMANCE.
  executive_status:
    rule: >
      No degradar la cobertura existente de EXECUTIVE_STATUS.
  daily_executive_brief:
    rule: "No modificar."
  month_close_result:
    rule: "No modificar su semántica causal ni de target."

continuity_cases:
  - conversation:
      - "¿Cómo vamos contra la meta de venta?"
      - "¿Qué debería preocuparme?"
    expected: >
      Puede reutilizar planta, periodo y desviación ya establecida y añadir otros
      riesgos soportados del mismo contexto, sin explicar causas.

  - conversation:
      - "¿Qué debería preocuparme?"
      - "¿Por qué?"
    expected: >
      No inventar causa. Si CAUSE_EXPLANATION no está implementado, aplicar
      comportamiento fail-closed o aclaración existente.

  - conversation:
      - "¿Qué riesgos ves en Puebla?"
      - "¿Y Acapulco?"
    expected: >
      Resolver nueva planta sin cruzar evidencia entre plantas.

tests_required:
  positive:
    - "¿Qué debería preocuparme?"
    - "¿Qué me debería preocupar?"
    - "¿Dónde estamos fallando?"
    - "¿Dónde tenemos problemas?"
    - "¿Qué riesgos ves?"
    - "¿Qué está funcionando y qué no?"
    - "un caso con desviación de venta vs meta"
    - "un caso con cliente perdido"
    - "un caso con acción vencida"

  negative:
    - "¿Por qué estamos debajo de la meta? no obtiene causa inventada"
    - "comentario humano no se convierte en causa confirmada"
    - "Action Register no se convierte en causalidad"
    - "¿Qué tengo que atender? no entra aquí"
    - "¿Qué es lo más importante? no entra aquí"
    - "¿Qué tal estás? no entra aquí"
    - "no cruce de planta"
    - "no cruce de periodo"

  regression:
    - "EXECUTIVE_STATUS sigue funcionando"
    - "PERFORMANCE venta vs meta sigue funcionando"
    - "daily_executive_brief sigue funcionando"
    - "month_close_result sigue funcionando"
    - "planner sin regresiones relevantes"

success_metrics:
  - "Las frases DIAGNOSIS soportadas llegan a la ruta correcta."
  - "¿Qué debería preocuparme? deja de caer en unknown."
  - "0 afirmaciones causales nuevas."
  - "0 recomendaciones nuevas."
  - "0 priorización subjetiva."
  - "0 cruces de planta."
  - "0 cruces de periodo."
  - "0 reglas de riesgo inventadas."

implementation_principle: >
  Reutilizar señales, reglas y evidencia existentes. No construir un segundo
  motor de riesgo ni duplicar lógica PRE_CLOSE.

in_scope:
  - "planner mínimo requerido para reconocer DIAGNOSIS"
  - "capa ejecutiva/CEL mínima necesaria"
  - "reutilización de señales OBSERVATION/DEVIATION/RISK existentes"
  - "tests y fixtures"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-OBSERVATIONS-RISKS-001.md"

out_of_scope:
  - "CAUSE_EXPLANATION"
  - "Reasoning Engine N5 runtime"
  - "hipótesis en chat"
  - "causa confirmada"
  - "recomendaciones"
  - "PRIORITY"
  - "nuevas reglas de riesgo"
  - "nuevas fuentes"
  - "SQL"
  - "schema"
  - "frontend"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

allowed_actions:
  - "crear rama implementation/director-ia-executive-diagnosis-observations-risks-001"
  - "modificar la mínima frontera runtime necesaria"
  - "agregar tests/fixtures"
  - "ejecutar sondas locales/read-only"
  - "documentar evidencia"
  - "commit y push únicamente a la rama de trabajo si el protocolo vigente lo permite"

forbidden_actions:
  - "inventar causas"
  - "inventar hipótesis"
  - "inventar reglas de riesgo"
  - "crear recomendaciones"
  - "crear priorización"
  - "modificar SQL"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "iniciar PRIORITY"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-OBSERVATIONS-RISKS-001.md"

final_state: "DONE_PENDING_REVIEW"
```
