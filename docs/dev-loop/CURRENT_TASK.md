```yaml
task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-HOW-ARE-WE-DOING-INTENT-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Auditar y definir la intención ejecutiva representada por preguntas como
  "¿Cómo vamos?", usando una batería de 50 formulaciones naturales para
  determinar cuáles son paráfrasis puras, especializaciones, ambiguas o falsos
  positivos, y establecer el contrato funcional completo de esa capacidad
  antes de cualquier implementación.

scope_goal: >
  Pasar de resolver preguntas individuales a definir una familia completa de
  conversación ejecutiva que pueda reconocer múltiples formulaciones con el
  mismo propósito sin memorizar frases una por una.

canonical_question:
  - "¿Cómo vamos?"

input_question_battery:
  group_a_directas:
    - "¿Cómo vamos?"
    - "¿Cómo estamos?"
    - "¿Cómo estamos yendo?"
    - "¿Qué tal vamos?"
    - "¿Cómo está la planta?"
    - "¿Cómo marcha todo?"
    - "¿Cómo va el día de hoy?"
    - "¿Qué tal marcha el negocio?"
    - "¿Cómo se ve la situación?"
    - "¿Cómo avanza la operación?"

  group_b_ejecutivo:
    - "Dame el estado actual."
    - "Dame un panorama de cómo vamos."
    - "Dame el resumen ejecutivo."
    - "¿Cuál es la situación actual?"
    - "¿Cómo está el negocio?"
    - "Preséntame el balance general de la jornada."
    - "Requiero el estatus operativo general."
    - "Despliégame el reporte de situación de la planta."
    - "Dame una lectura rápida de cómo cerramos el indicador."
    - "Pásame el reporte ejecutivo de cómo nos encontramos."

  group_c_informal:
    - "A ver, ¿cómo vamos?"
    - "Cuéntame cómo estamos."
    - "¿Qué tal las cosas?"
    - "¿Cómo pinta esto?"
    - "¿Cómo anda la planta?"
    - "¿Qué onda con los números de hoy?"
    - "A ver, ¿cómo andamos por aquí?"
    - "¿Qué dice el tablero de control?"
    - "Ponme al tanto de cómo marcha todo."
    - "¿Cómo se está viendo el panorama en este momento?"

  group_d_desempeno:
    - "¿Estamos bien o mal?"
    - "¿Cómo está el desempeño?"
    - "¿Vamos mejorando?"
    - "¿Estamos cumpliendo?"
    - "¿Cómo vienen los resultados?"
    - "¿Qué tal está rindiendo la operación?"
    - "¿Estamos dentro de los objetivos o fuera?"
    - "¿Cómo va el nivel de cumplimiento actual?"
    - "¿El rendimiento va de acuerdo a lo planeado?"
    - "¿Estamos logrando las metas trazadas para el periodo?"

  group_e_diagnostico:
    - "¿Qué está pasando?"
    - "¿Qué debería preocuparme?"
    - "¿Qué está funcionando y qué no?"
    - "¿Dónde estamos fallando?"
    - "¿Dónde tenemos problemas?"

  group_f_prioridad:
    - "¿Qué tengo que atender?"
    - "¿Qué es lo más importante ahorita?"
    - "¿Dónde debería poner atención?"
    - "¿Qué requiere mi atención?"
    - "¿Qué tenemos pendiente importante?"

audit_questions:
  - "¿Qué significa funcionalmente la intención madre?"
  - "¿Qué preguntas son realmente equivalentes?"
  - "¿Qué preguntas agregan filtro temporal?"
  - "¿Qué preguntas agregan filtro de dominio?"
  - "¿Qué preguntas agregan comparación contra objetivo?"
  - "¿Qué preguntas agregan diagnóstico de riesgo?"
  - "¿Qué preguntas agregan priorización?"
  - "¿Qué preguntas requieren contexto previo?"
  - "¿Qué preguntas pueden producir falsos positivos?"
  - "¿Qué herramientas y fuentes actuales pueden soportarla?"
  - "¿Qué herramientas o fuentes faltan?"
  - "¿Qué continuidad conversacional necesita conservarse?"
  - "¿Qué debe ocurrir si falta planta, periodo, objetivo o contexto?"

classification_required:
  - "PARAPHRASE_PURE"
  - "SPECIALIZATION_TIME"
  - "SPECIALIZATION_DOMAIN"
  - "SPECIALIZATION_PERFORMANCE"
  - "SPECIALIZATION_DIAGNOSIS"
  - "SPECIALIZATION_PRIORITY"
  - "AMBIGUOUS"
  - "FALSE_POSITIVE"

must_detect_examples:
  - phrase: "¿Qué tal estás?"
    expected: "FALSE_POSITIVE"
    rationale: >
      Debe interpretarse como conversación dirigida a Director IA, no como
      consulta ejecutiva de planta o negocio.

  - phrase: "Preséntame el balance general de la jornada."
    expected: "AMBIGUOUS"
    rationale: >
      La expresión balance general puede confundirse con un concepto contable
      formal y no debe mapearse ciegamente a estado ejecutivo general.

  - phrase: "Dame una lectura rápida de cómo cerramos el indicador."
    expected: "AMBIGUOUS"
    rationale: >
      Requiere saber qué indicador se está tratando por contexto previo.

  - phrase: "¿Cómo va el día de hoy?"
    expected: "SPECIALIZATION_TIME"

  - phrase: "¿Estamos cumpliendo?"
    expected: "SPECIALIZATION_PERFORMANCE"

  - phrase: "¿Qué debería preocuparme?"
    expected: "SPECIALIZATION_DIAGNOSIS"

  - phrase: "¿Qué tengo que atender?"
    expected: "SPECIALIZATION_PRIORITY"

functional_contract_should_define:
  intent_name: >
    Proponer el nombre final de la intención madre. No asumir que debe llamarse
    executive_status si existe una opción mejor y más consistente con el planner.
  plant_context: >
    Definir qué ocurre con planta activa, planta explícita, ausencia de planta y
    continuidad entre plantas.
  time_context: >
    Definir periodo por defecto y manejo de expresiones como hoy, actual,
    periodo, cierre y comparación.
  evidence: >
    Toda afirmación debe estar respaldada por fuentes reales. No inventar
    desempeño, riesgo, cumplimiento, prioridad ni tendencia.
  missing_data: >
    Definir cuándo debe responder parcialmente, cuándo declarar ausencia y
    cuándo pedir aclaración.
  continuity: >
    Definir el estado conversacional necesario para seguimientos como
    "¿Y en clientes?", "¿Y Acapulco?", "¿Por qué dices eso?" y
    "¿Qué es lo que más te preocupa?".
  output_shape: >
    Proponer estructura ejecutiva de respuesta sin generar datos ficticios.

domains_to_evaluate:
  - "KPIs"
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
  - "riesgos"
  - "prioridades"

out_of_scope:
  - "implementación runtime"
  - "cambios en planner"
  - "cambios en tool orchestrator"
  - "cambios SQL"
  - "cambios de esquema"
  - "cambios frontend"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "siguiente tarea"

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-HOW-ARE-WE-DOING-INTENT-001.md"
  - "lectura de planner, capabilities y tool orchestrator"
  - "lectura de documentación Director IA necesaria para determinar cobertura real"
  - "pruebas read-only o sondas locales si son necesarias para demostrar comportamiento actual"

required_report_sections:
  - "Resumen ejecutivo"
  - "Definición propuesta de la intención madre"
  - "Contrato funcional"
  - "Clasificación de las 50 preguntas"
  - "Preguntas equivalentes reales"
  - "Especializaciones"
  - "Ambigüedades"
  - "Falsos positivos"
  - "Contexto de planta"
  - "Contexto temporal"
  - "Continuidad conversacional"
  - "Fuentes disponibles"
  - "Herramientas disponibles"
  - "Herramientas faltantes"
  - "Huecos actuales"
  - "Riesgos de implementación"
  - "Recomendación del siguiente capability slice"

acceptance_criteria:
  - "Las 50 preguntas quedan clasificadas individualmente."
  - "No se fuerza que las 50 pertenezcan a una sola intención plana."
  - "Se define una intención madre y sus especializaciones."
  - "Se identifican falsos positivos y ambigüedades."
  - "Se documenta qué contexto debe conservarse."
  - "Se documentan fuentes y herramientas actuales."
  - "Se identifican huecos reales de runtime."
  - "Se propone un siguiente slice de implementación por capacidad, no por frase."
  - "No se implementa nada."
  - "El reporte termina con recomendación concreta y criterio de entrada a implementación."

allowed_actions:
  - "crear rama audit/director-ia-executive-how-are-we-doing-intent-001"
  - "auditar código y contratos actuales"
  - "ejecutar pruebas read-only"
  - "crear reporte"
  - "commit y push únicamente a la rama de auditoría si el protocolo vigente lo permite"

forbidden_actions:
  - "modificar comportamiento runtime"
  - "implementar nueva intención"
  - "modificar planner"
  - "modificar tools"
  - "modificar SQL"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "iniciar siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-HOW-ARE-WE-DOING-INTENT-001.md"

final_state: "DONE_PENDING_REVIEW"
```
