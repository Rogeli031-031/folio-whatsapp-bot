```yaml
task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Auditar la especialización DIAGNOSIS de la familia ejecutiva de Director IA,
  representada por preguntas como "¿Qué debería preocuparme?", "¿Dónde estamos
  fallando?" y "¿Qué está funcionando y qué no?", para determinar qué anomalías,
  desviaciones, riesgos y causas puede afirmar hoy con evidencia real y qué debe
  fallar cerrado antes de cualquier implementación.

parent_family:
  intent: "EXECUTIVE_STATUS"
  relationship: >
    DIAGNOSIS es una especialización subordinada. No sustituye ni amplía
    indiscriminadamente EXECUTIVE_STATUS.

canonical_questions:
  - "¿Qué está pasando?"
  - "¿Qué debería preocuparme?"
  - "¿Qué está funcionando y qué no?"
  - "¿Dónde estamos fallando?"
  - "¿Dónde tenemos problemas?"
  - "¿Qué está saliendo mal?"
  - "¿Qué se está deteriorando?"
  - "¿Qué riesgos ves?"
  - "¿Cuál es el principal problema?"
  - "¿Por qué estamos mal?"

core_principle: >
  Distinguir estrictamente entre DETECCIÓN, DESVIACIÓN, RIESGO y CAUSALIDAD.
  Detectar que algo empeoró no autoriza explicar por qué empeoró.

diagnostic_levels:
  observation:
    description: >
      Hecho directamente soportado por una fuente.
    examples:
      - "ventas bajaron"
      - "cliente dejó de comprar"
      - "acción está vencida"

  deviation:
    description: >
      Diferencia contra una referencia física válida.
    examples:
      - "venta por debajo de meta"
      - "gasto arriba de presupuesto"
      - "descuento cambió respecto al periodo comparable"

  risk:
    description: >
      Condición que puede requerir atención porque cumple una regla objetiva y
      trazable.
    requirement: >
      Debe existir regla explícita; no inferir riesgo subjetivo.

  hypothesis:
    description: >
      Explicación posible, no confirmada.
    requirement: >
      Debe etiquetarse explícitamente como hipótesis y conservar evidencia.

  confirmed_cause:
    description: >
      Relación causal demostrada por evidencia suficiente.
    requirement: >
      No afirmar causa por simple correlación temporal.

must_distinguish:
  - "hecho"
  - "anomalía"
  - "desviación"
  - "riesgo"
  - "hipótesis"
  - "causa confirmada"

questions_to_answer:
  - "¿Qué dominios permiten detectar anomalías hoy?"
  - "¿Qué referencias físicas permiten detectar desviaciones?"
  - "¿Qué reglas de riesgo existen realmente?"
  - "¿Dónde existe causalidad documentada?"
  - "¿Dónde solo existen correlaciones?"
  - "¿Qué preguntas pueden responderse con hechos sin causalidad?"
  - "¿Qué preguntas requieren aclaración?"
  - "¿Qué preguntas deben fallar cerrado?"
  - "¿Qué continuidad conversacional necesita DIAGNOSIS?"
  - "¿Qué debe pasar ante '¿por qué?' después de una desviación?"

domains_to_audit:
  - "ventas"
  - "volumen"
  - "ingresos"
  - "descuento"
  - "ARR"
  - "IGF"
  - "clientes"
  - "movimiento de clientes"
  - "Action Register"
  - "acciones vencidas"
  - "proyectos"
  - "presupuesto"
  - "gastos"
  - "inversiones"
  - "apoyos"
  - "KPIs"
  - "month_close_result"

classification_required:
  - "OBSERVATION_SUPPORTED"
  - "DEVIATION_SUPPORTED"
  - "RISK_RULE_SUPPORTED"
  - "HYPOTHESIS_ONLY"
  - "CAUSE_SUPPORTED"
  - "NO_DIAGNOSTIC_REFERENCE"
  - "AMBIGUOUS"
  - "OUT_OF_SCOPE"

required_probe_examples:
  - "¿Qué debería preocuparme?"
  - "¿Dónde estamos fallando?"
  - "¿Qué está funcionando y qué no?"
  - "¿Qué riesgos ves?"
  - "¿Cuál es el principal problema?"
  - "¿Por qué estamos debajo de la meta?"
  - "¿Por qué bajaron las ventas?"
  - "¿Qué clientes están empeorando?"
  - "¿Qué acciones vencidas tengo?"
  - "¿Dónde estamos gastando de más?"

causality_rules:
  - "correlación temporal != causa"
  - "comparación contra meta != explicación causal"
  - "caída de un cliente != causa del resultado total sin cuantificación"
  - "comentario humano puede soportar hipótesis, no necesariamente causa confirmada"
  - "una causa debe tener evidencia identificable y trazable"

risk_rules_to_audit:
  - "acciones vencidas"
  - "desviación contra meta"
  - "caída significativa de clientes"
  - "clientes que dejaron de comprar"
  - "descuento fuera de patrón si existe benchmark válido"
  - "presupuesto excedido si existe comparación física"
  - "proyectos con señales objetivas de atraso si el sistema lo soporta"
  - "datos faltantes críticos"

continuity_cases:
  - conversation:
      - "¿Cómo vamos contra la meta?"
      - "¿Qué debería preocuparme?"
    expected: >
      Puede reutilizar contexto de planta, periodo y métrica, pero no inventar
      causas.

  - conversation:
      - "Las ventas están abajo."
      - "¿Por qué?"
    expected: >
      Solo explicar causas si existe evidencia causal; de lo contrario declarar
      que puede identificar contribuyentes o hipótesis, no causa confirmada.

  - conversation:
      - "¿Qué clientes están empeorando?"
      - "¿Cuál pesa más?"
    expected: >
      Auditar si existe cuantificación real de contribución.

functional_contract_should_define:
  parent_intent: >
    Determinar si DIAGNOSIS debe ser una especialización de EXECUTIVE_STATUS
    o una intención subordinada separada.
  evidence_levels: >
    Definir qué etiqueta corresponde a hecho, desviación, riesgo, hipótesis y causa.
  risk_selection: >
    Definir si "qué debería preocuparme" puede ordenar problemas y bajo qué regla.
  causality: >
    Prohibir afirmaciones causales sin evidencia suficiente.
  missing_evidence: >
    Definir comportamiento fail-closed.
  continuity: >
    Definir contexto heredable y límites.
  output_shape: >
    Proponer estructura con hallazgo, evidencia, nivel de certeza y causa/hipótesis
    cuando corresponda.

in_scope:
  - "lectura de planner"
  - "lectura de capabilities"
  - "lectura de tool orchestrator"
  - "lectura de contratos IES/Reasoning Engine relevantes"
  - "lectura de ARR/IGF/clientes/Action Register/presupuestos/proyectos"
  - "sondas read-only"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-001.md"

out_of_scope:
  - "implementación runtime"
  - "crear nueva intención"
  - "modificar planner"
  - "modificar tools"
  - "modificar SQL"
  - "modificar frontend"
  - "implementar PRIORITY"
  - "implementar recomendaciones"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "siguiente tarea"

acceptance_criteria:
  - "Se separa físicamente observación, desviación, riesgo, hipótesis y causa."
  - "Cada dominio auditado queda clasificado."
  - "Se documentan reglas reales de riesgo existentes."
  - "Se identifica dónde hay causalidad y dónde no."
  - "Se define comportamiento correcto ante '¿por qué?'."
  - "Se prohíben causas inventadas."
  - "Se propone un slice mínimo implementable."
  - "No se implementa nada."

allowed_actions:
  - "crear rama audit/director-ia-executive-diagnosis-001"
  - "auditar código, contratos y fuentes"
  - "ejecutar pruebas read-only"
  - "crear reporte"
  - "commit y push únicamente a la rama de auditoría si el protocolo vigente lo permite"

forbidden_actions:
  - "implementar DIAGNOSIS"
  - "inventar reglas de riesgo"
  - "inventar causalidad"
  - "modificar SQL"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "iniciar PRIORITY"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-DIAGNOSIS-001.md"

final_state: "DONE_PENDING_REVIEW"
```
