```yaml id="8z0q1v"
task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Auditar la especialización PERFORMANCE de la familia ejecutiva de Director IA,
  representada por preguntas como "¿Estamos cumpliendo?", para determinar contra
  qué objetivos, metas, presupuestos, planes o benchmarks reales puede comparar
  el sistema hoy, qué fuentes existen, qué evidencia falta y cuál debe ser el
  contrato funcional antes de cualquier implementación.

parent_family:
  intent: "EXECUTIVE_STATUS"
  source_audit: "AUDIT-DIRECTOR-IA-EXECUTIVE-HOW-ARE-WE-DOING-INTENT-001"
  source_implementation: "IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-PARAPHRASE-COVERAGE-001"

canonical_questions:
  - "¿Estamos cumpliendo?"
  - "¿Estamos dentro de los objetivos o fuera?"
  - "¿Cómo va el nivel de cumplimiento actual?"
  - "¿El rendimiento va de acuerdo a lo planeado?"
  - "¿Estamos logrando las metas trazadas para el periodo?"
  - "¿Vamos mejorando?"
  - "¿Cómo está el desempeño?"
  - "¿Cómo vienen los resultados?"
  - "¿Qué tal está rindiendo la operación?"
  - "¿Estamos bien o mal?"

core_question: >
  Cuando un director pregunta si estamos cumpliendo o si vamos bien/mal,
  ¿contra qué referencia real puede y debe comparar Director IA sin inventar
  objetivos, metas o expectativas?

audit_dimensions:
  - "meta explícita"
  - "presupuesto"
  - "forecast"
  - "objetivo comercial"
  - "objetivo de volumen"
  - "objetivo de ingreso"
  - "objetivo de descuento"
  - "objetivo de margen"
  - "objetivo por planta"
  - "objetivo por cliente"
  - "objetivo por periodo"
  - "comparación contra periodo anterior"
  - "comparación contra mismo periodo previo"
  - "comparación contra plan"
  - "comparación contra presupuesto"
  - "comparación contra forecast"
  - "comparación contra KPI con target"

must_distinguish:
  explicit_target:
    description: >
      Existe una meta/objetivo/target físico y trazable en una fuente real.
    expected_behavior: >
      Puede evaluarse cumplimiento contra esa referencia.

  comparative_trend:
    description: >
      Solo existe histórico o periodo anterior, pero no una meta explícita.
    expected_behavior: >
      Puede decir mejorar/empeorar si la métrica lo permite, pero no afirmar
      cumplimiento de una meta inexistente.

  no_reference:
    description: >
      No existe meta, benchmark ni comparación válida.
    expected_behavior: >
      Debe declarar que no puede afirmar cumplimiento sin una referencia.

questions_to_answer:
  - "¿Qué metas explícitas existen físicamente hoy?"
  - "¿Dónde están almacenadas?"
  - "¿Qué dominios tienen target real y cuáles no?"
  - "¿Qué diferencia hay entre target, presupuesto y forecast?"
  - "¿Qué métricas pueden compararse de forma legítima?"
  - "¿Qué métricas solo permiten tendencia y no cumplimiento?"
  - "¿Qué periodos soportan comparación?"
  - "¿Qué contexto de planta debe heredarse?"
  - "¿Qué contexto temporal debe heredarse?"
  - "¿Qué ocurre si el usuario no especifica KPI?"
  - "¿Qué ocurre si existen varias metas posibles?"
  - "¿Qué ocurre si la meta está ausente o es null?"
  - "¿Qué ocurre si existe forecast pero no target?"
  - "¿Qué ocurre si existe presupuesto pero no ejecución comparable?"
  - "¿Qué afirmaciones están prohibidas sin evidencia?"

domains_to_audit:
  - "dashboard KPIs"
  - "ARR"
  - "IGF"
  - "ventas"
  - "volumen"
  - "ingresos"
  - "descuento"
  - "clientes"
  - "presupuestos"
  - "proyectos"
  - "Action Register"
  - "gastos"
  - "inversiones"
  - "apoyos"

classification_required:
  - "TARGET_SUPPORTED"
  - "TREND_ONLY"
  - "FORECAST_ONLY"
  - "BUDGET_ONLY"
  - "NO_REFERENCE"
  - "AMBIGUOUS_REFERENCE"
  - "OUT_OF_SCOPE"

required_probe_examples:
  - "¿Estamos cumpliendo?"
  - "¿Vamos arriba o abajo de la meta?"
  - "¿Estamos vendiendo lo que deberíamos?"
  - "¿Vamos mejor que el mes pasado?"
  - "¿Estamos dentro del presupuesto?"
  - "¿Estamos cumpliendo el forecast?"
  - "¿El descuento está dentro de objetivo?"
  - "¿La planta está rindiendo como debería?"
  - "¿Estamos logrando las metas del mes?"
  - "¿Vamos bien?"

functional_contract_should_define:
  parent_intent: >
    Determinar si PERFORMANCE debe ser una especialización de EXECUTIVE_STATUS
    o una intención propia subordinada.
  reference_resolution: >
    Definir cómo se selecciona target, presupuesto, forecast o comparación.
  evidence_requirement: >
    Toda evaluación de cumplimiento debe citar o enlazar conceptualmente la
    referencia contra la que se compara.
  missing_reference: >
    Prohibido inventar metas. Definir respuesta fail-closed cuando no exista.
  comparison_semantics: >
    Definir diferencia entre cumplir, mejorar, empeorar y desviarse.
  continuity: >
    Definir seguimientos como "¿y en ventas?", "¿y Puebla?", "¿contra qué meta?",
    "¿cuánto nos falta?".
  output_shape: >
    Proponer forma de respuesta con resultado, referencia, desviación y evidencia.

in_scope:
  - "lectura de planner"
  - "lectura de capabilities"
  - "lectura de tool orchestrator"
  - "lectura de módulos KPI/ARR/IGF/presupuesto relevantes"
  - "sondas read-only"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-001.md"

out_of_scope:
  - "implementación runtime"
  - "crear nueva intención"
  - "modificar planner"
  - "modificar tools"
  - "modificar SQL"
  - "modificar frontend"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "DIAGNOSIS"
  - "PRIORITY"
  - "TIME"

acceptance_criteria:
  - "Se determina físicamente dónde existen metas reales."
  - "Se separa target de presupuesto, forecast e histórico."
  - "Cada dominio auditado queda clasificado."
  - "Se define qué preguntas pueden responderse hoy con evidencia."
  - "Se define qué preguntas deben fallar cerrado."
  - "Se prohíbe explícitamente afirmar cumplimiento sin referencia."
  - "Se documenta continuidad conversacional."
  - "Se recomienda un siguiente slice de implementación mínimo."
  - "No se implementa nada."

allowed_actions:
  - "crear rama audit/director-ia-executive-performance-001"
  - "auditar código, contratos y fuentes"
  - "ejecutar pruebas read-only"
  - "crear reporte"
  - "commit y push únicamente a la rama de auditoría si el protocolo vigente lo permite"

forbidden_actions:
  - "implementar PERFORMANCE"
  - "crear metas nuevas"
  - "inferir metas inexistentes"
  - "modificar SQL"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "iniciar siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-001.md"

final_state: "DONE_PENDING_REVIEW"
```
