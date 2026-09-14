```yaml
task_id: "IMPL-DIRECTOR-IA-DIAGNOSIS-INDEPENDENT-SIGNALS-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Mejorar DIAGNOSIS para que, aun cuando falte igf_meta del periodo abierto,
  pueda mostrar señales ejecutivas independientes del target que ya existen
  físicamente o ya son calculadas por runtime, sin inventar riesgos, prioridad,
  causalidad ni una segunda lógica de diagnóstico.

source_audit:
  task_id: "AUDIT-DIRECTOR-IA-DIAGNOSIS-EVIDENCE-COVERAGE-001"
  report: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DIAGNOSIS-EVIDENCE-COVERAGE-001.md"
  audit_commit: "743444fa"

production_problem:
  plant: "Acapulco"
  period: "2026-09"
  prompts:
    - "¿Qué debería preocuparme?"
    - "¿Qué riesgos ves?"
    - "¿Dónde estamos fallando?"
  current_result:
    - "TARGET_MISSING_FOR_PERIOD como única OBSERVATION"
    - "DEVIATION vacía"
    - "RISK vacío"
  business_issue: >
    La respuesta es formalmente segura pero no aporta suficiente valor ejecutivo.

audit_findings:
  - >
    TARGET_MISSING_FOR_PERIOD no corta el pack. Simplemente es la única señal
    que dispara en el run productivo observado.
  - >
    ARR vacío + forecast missing + overdue 0 reproduce el resultado casi vacío.
  - >
    Venta to-date puede existir sin target y no requiere afirmar cumplimiento.
  - >
    FORECAST_MISSING y SOURCE_UNAVAILABLE son gaps ya derivados.
  - >
    Algunos movimientos de clientes ya son calculados pero no siempre se proyectan
    a DIAGNOSIS.
  - >
    TARGET_MISSING_FOR_PERIOD debe tratarse como DATA_GAP secundario.

primary_goal: >
  Permitir que DIAGNOSIS proyecte señales independientes del target ya disponibles,
  manteniendo separadas OBSERVATION, DEVIATION, RISK y DATA_GAP.

supported_signal_types:
  observation:
    examples:
      - "venta to-date del periodo"
      - "cliente dejó de comprar, si ya existe la señal física"
      - "cliente aumentó o disminuyó, si ya está calculado"
  deviation:
    examples:
      - "solo cuando ya existe referencia física comparable"
  risk:
    rule: >
      Únicamente riesgos ya tipados por runtime. No crear nuevas reglas.
  data_gap:
    examples:
      - "TARGET_MISSING_FOR_PERIOD"
      - "FORECAST_MISSING"
      - "SOURCE_UNAVAILABLE"

required_changes:
  target_missing:
    before: "OBSERVATION protagonista"
    after: "DATA_GAP secundario"
    rule: >
      No debe presentarse como sustituto del diagnóstico completo.

  sales_to_date:
    rule: >
      Si existe venta real del periodo, puede mostrarse como OBSERVATION aun sin meta.
      No decir que está bien, mal, arriba o abajo de objetivo sin target.

  existing_gaps:
    rule: >
      Proyectar gaps ya derivados como FORECAST_MISSING o SOURCE_UNAVAILABLE cuando
      existan, etiquetados como DATA_GAP y no como riesgo.

  client_movers:
    rule: >
      Proyectar movimientos de clientes ya calculados y trazables como OBSERVATION
      o DEVIATION según contrato vigente. No convertir automáticamente cliente perdido,
      aumento o disminución en riesgo nuevo.

required_output_behavior:
  - >
    Si existen riesgos tipados, mostrarlos en RISK.
  - >
    Si no existen riesgos tipados pero sí observaciones o gaps, responder con esos datos.
  - >
    Si no existe ningún riesgo, puede decir explícitamente:
    "No detecto riesgos tipados en este contexto."
  - >
    No llenar RISK con DATA_GAP.
  - >
    No presentar labels técnicos crudos como única respuesta cuando pueda redactarse
    una explicación ejecutiva clara.
  - >
    Mantener evidencia y trazabilidad.

example_expected_shape: >
  Diagnóstico ejecutivo — Acapulco — septiembre 2026

  Observaciones:
  - Venta acumulada del periodo: X toneladas.
  - N clientes presentan movimiento relevante ya calculado.

  Riesgos:
  - No detecto riesgos tipados en este contexto.

  Huecos de información:
  - No existe meta física cargada para septiembre.
  - Forecast no disponible, si corresponde.

  Sin afirmar causas ni recomendaciones.

prohibited_claims:
  - "vamos mal" sin referencia
  - "vamos bien" sin referencia
  - "esto es un riesgo" sin regla tipada
  - "la causa es"
  - "esto ocurrió porque"
  - "deberías hacer"
  - "lo más importante es"
  - "este cliente es el principal problema" sin PRIORITY autorizada

protected_boundaries:
  performance:
    rule: >
      Falta de target impide evaluar cumplimiento de venta. No modificar.
  cause_explanation:
    rule: "No implementar."
  priority:
    rule: "No implementar ni ordenar hallazgos como ranking ejecutivo."
  recommendation:
    rule: "No implementar."
  executive_status:
    rule: "No modificar semántica."
  daily_executive_brief:
    rule: "No modificar."
  month_close_result:
    rule: "No modificar."
  pre_close:
    rule: >
      Reutilizar señales existentes; no crear segundo motor.

signals_in_scope:
  - "TARGET_MISSING_FOR_PERIOD"
  - "FORECAST_MISSING"
  - "SOURCE_UNAVAILABLE"
  - "venta to-date"
  - "clientes lost ya calculados"
  - "clientes positivos ya calculados"
  - "clientes que disminuyeron ya calculados"
  - "otros movers ya disponibles en la misma frontera física"

signals_explicitly_out_of_scope:
  - "14d si requiere integración nueva"
  - "M9 si requiere integración nueva"
  - "month_close agosto como fallback automático"
  - "KPIs nuevos"
  - "proyectos"
  - "nuevas reglas de overdue"
  - "ranking"
  - "priorización"
  - "causalidad"
  - "recomendaciones"

tests_required:
  positive:
    - "sin target + venta to-date disponible"
    - "sin target + FORECAST_MISSING"
    - "sin target + SOURCE_UNAVAILABLE"
    - "sin target + client movers disponibles"
    - "riesgo tipado existente sigue apareciendo"
    - "observaciones y DATA_GAP pueden coexistir"
    - "RISK vacío produce lenguaje ejecutivo claro y no una tabla vacía"

  negative:
    - "TARGET_MISSING_FOR_PERIOD no aparece como RISK"
    - "venta to-date no se convierte en cumplimiento"
    - "cliente perdido no genera riesgo nuevo si no existe regla tipada"
    - "movimiento positivo no se interpreta como 'vamos bien'"
    - "comentario no se convierte en causa"
    - "no se crea ranking"
    - "no se crea recomendación"
    - "no cruce de planta"
    - "no cruce de periodo"

  regression:
    - "DIAGNOSIS actual sigue reconociendo las frases soportadas"
    - "EXECUTIVE_STATUS sigue funcionando"
    - "PERFORMANCE sigue funcionando"
    - "month_close_result sigue funcionando"
    - "daily_executive_brief sigue funcionando"
    - "PRE_CLOSE sigue funcionando"

success_metrics:
  - >
    En ausencia de target, DIAGNOSIS puede devolver observaciones independientes
    si existen.
  - >
    TARGET_MISSING_FOR_PERIOD queda como DATA_GAP y no como diagnóstico principal.
  - "0 riesgos nuevos inventados."
  - "0 afirmaciones causales."
  - "0 recomendaciones."
  - "0 prioridad subjetiva."
  - "0 cruces de planta o periodo."
  - "0 segunda lógica de riesgo."

implementation_principle: >
  Reutilizar únicamente información ya disponible en la frontera actual del pack
  o helpers directamente existentes y contractualmente compatibles. No ampliar
  el alcance para traer nuevas familias completas de datos.

in_scope:
  - "lib/director-ia-executive-diagnosis-observations-risks.js"
  - "frontera mínima necesaria en composeExecutiveCycle / deriveRisksAndGaps si aplica"
  - "proyección de signals/gaps ya existentes"
  - "tests y fixtures"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DIAGNOSIS-INDEPENDENT-SIGNALS-001.md"

out_of_scope:
  - "nuevas sources"
  - "SQL/schema"
  - "frontend"
  - "PRIORITY"
  - "CAUSE_EXPLANATION"
  - "Reasoning Engine N5 runtime"
  - "recomendaciones"
  - "saludo/identidad"
  - "Taller Expense Analytics"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

allowed_actions:
  - "crear rama implementation/director-ia-diagnosis-independent-signals-001"
  - "modificar la frontera mínima necesaria"
  - "reusar señales existentes"
  - "agregar tests/fixtures"
  - "ejecutar sondas locales/read-only"
  - "documentar evidencia"
  - "commit y push únicamente a la rama autorizada si el protocolo vigente lo permite"

forbidden_actions:
  - "inventar riesgos"
  - "inventar causas"
  - "inventar prioridad"
  - "inventar recomendaciones"
  - "crear fallback de target"
  - "usar forecast como target"
  - "modificar SQL"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "iniciar saludo/identidad"
  - "iniciar Taller"
  - "iniciar PRIORITY"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-DIAGNOSIS-INDEPENDENT-SIGNALS-001.md"

final_state: "DONE_PENDING_REVIEW"
```
