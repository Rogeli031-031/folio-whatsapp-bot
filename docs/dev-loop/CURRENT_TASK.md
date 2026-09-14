```yaml
task_id: "AUDIT-DIRECTOR-IA-DIAGNOSIS-EVIDENCE-COVERAGE-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Auditar por qué DIAGNOSIS reconoce correctamente preguntas ejecutivas como
  "¿Qué debería preocuparme?" pero devuelve una respuesta prácticamente vacía,
  dominada por TARGET_MISSING_FOR_PERIOD, aun cuando Director IA dispone de otras
  fuentes ejecutivas potencialmente útiles. Determinar qué evidencia física puede
  agregarse de forma segura al diagnóstico sin inventar causalidad, prioridad ni riesgo.

production_evidence:
  plant: "Acapulco"
  period: "2026-09"

  prompts:
    - "¿Qué debería preocuparme?"
    - "¿Qué riesgos ves?"
    - "¿Dónde estamos fallando?"

  observed_output_summary:
    - "OBSERVATION: TARGET_MISSING_FOR_PERIOD"
    - "DEVIATION: ninguna"
    - "RISK: ninguna"

  business_problem: >
    La respuesta cumple formalmente el contrato de DIAGNOSIS pero no aporta una
    lectura ejecutiva útil. Falta meta de septiembre, pero esa ausencia no debería
    impedir mostrar otras señales físicas disponibles si existen.

core_question: >
  ¿Por qué composeExecutiveCycle / deriveRisksAndGaps termina exponiendo solo
  TARGET_MISSING_FOR_PERIOD para Acapulco septiembre, y qué otras señales reales
  disponibles pueden incorporarse al diagnóstico sin crear nueva verdad?

audit_goal: >
  Separar claramente:
  1. señales disponibles físicamente;
  2. señales que DIAGNOSIS ya consume;
  3. señales que existen pero no llegan al pack;
  4. señales que no deben agregarse por falta de contrato/evidencia.

must_audit_sources:
  - "ARR"
  - "IGF"
  - "movimiento de clientes"
  - "clientes que dejaron de comprar"
  - "clientes que disminuyeron"
  - "clientes que aumentaron"
  - "comparativos de volumen/venta"
  - "14d / same-weekday si existe físicamente"
  - "M9 / histórico comparable"
  - "Action Register"
  - "acciones vencidas"
  - "proyectos"
  - "KPIs"
  - "folios"
  - "gastos"
  - "inversiones"
  - "apoyos"
  - "PRE_CLOSE risks"
  - "igf_meta"
  - "month_close_result"

must_answer:
  - "¿Qué señales ejecutivas reales existen hoy para Acapulco 2026-09?"
  - "¿Cuáles llegan actualmente a composeExecutiveCycle?"
  - "¿Cuáles llegan a deriveRisksAndGaps?"
  - "¿Cuáles se pierden antes de DIAGNOSIS?"
  - "¿Cuáles existen pero están fuera de cobertura contractual?"
  - "¿TARGET_MISSING_FOR_PERIOD está ocupando indebidamente el diagnóstico?"
  - "¿Debe clasificarse como DATA_GAP secundario en lugar de hallazgo protagonista?"
  - "¿Qué señales pueden mostrarse aunque falte meta mensual?"
  - "¿Qué señales requieren target y deben omitirse cuando falta?"
  - "¿Qué señales pueden expresarse como observación?"
  - "¿Qué señales pueden expresarse como desviación?"
  - "¿Qué señales ya tienen regla de riesgo tipada?"
  - "¿Qué fuentes no pueden agregarse todavía sin inventar riesgo o prioridad?"

classification_required:
  - "AVAILABLE_AND_CONSUMED"
  - "AVAILABLE_NOT_CONSUMED"
  - "AVAILABLE_BUT_NOT_CONTRACTED"
  - "TARGET_DEPENDENT"
  - "DATA_GAP_ONLY"
  - "NOT_AVAILABLE"
  - "OUT_OF_SCOPE"

diagnostic_levels:
  observation:
    requirement: >
      Hecho físico disponible y trazable. No necesita target si la observación
      por sí sola es válida.
  deviation:
    requirement: >
      Necesita una referencia física válida y comparable.
  risk:
    requirement: >
      Solo si existe una regla tipada ya soportada.
  data_gap:
    requirement: >
      Ausencia de información. No debe convertirse automáticamente en el foco
      principal si existen señales ejecutivas más útiles.

specific_hypotheses_to_test:
  - >
    TARGET_MISSING_FOR_PERIOD entra como observation y desplaza otras señales
    porque el pack PRE_CLOSE corta o reduce la evaluación cuando falta target.
  - >
    Movimiento de clientes existe físicamente pero no está conectado al pack
    usado por DIAGNOSIS.
  - >
    Acciones vencidas existen pero requieren otra tool/contexto que no se carga.
  - >
    Comparativos ARR/14d/M9 existen pero no se proyectan como deviations al pack.
  - >
    DIAGNOSIS consume solo un subconjunto PRE_CLOSE diseñado para otro propósito.
  - >
    Algunas señales potenciales no tienen regla objetiva y no deben agregarse
    todavía.

required_real_case_probe:
  plant: "Acapulco"
  period: "2026-09"
  requirement: >
    Ejecutar sondas read-only suficientes para demostrar qué datos reales están
    disponibles y qué termina efectivamente llegando a la salida DIAGNOSIS.

required_matrix_1:
  columns:
    - "fuente"
    - "señal"
    - "dato disponible"
    - "función/tool que lo obtiene"
    - "llega a composeExecutiveCycle"
    - "llega a deriveRisksAndGaps"
    - "llega a DIAGNOSIS"
    - "clasificación"
    - "observaciones"

required_matrix_2:
  columns:
    - "señal"
    - "puede mostrarse sin target"
    - "nivel permitido"
    - "regla/evidencia"
    - "debe aparecer en ¿Qué debería preocuparme?"
    - "motivo"

required_behavior_to_define:
  - >
    Si falta igf_meta pero existen observaciones/riesgos independientes del target,
    DIAGNOSIS no debe quedar vacío.
  - >
    TARGET_MISSING_FOR_PERIOD debe tratarse como hueco de información, no como
    sustituto del diagnóstico completo.
  - >
    No inventar riesgo para llenar la respuesta.
  - >
    No inventar prioridad.
  - >
    No inventar causalidad.
  - >
    No convertir cualquier dato negativo en riesgo.

candidate_signals_to_evaluate:
  - "clientes que dejaron de comprar"
  - "clientes que disminuyeron"
  - "clientes que aumentaron"
  - "caída de kg vs periodo comparable"
  - "acciones vencidas"
  - "riesgos PRE_CLOSE existentes"
  - "FORECAST_BELOW_TARGET cuando exista target"
  - "proyecto con señal objetiva soportada"
  - "dato crítico faltante"
  - "desviación real vs meta cuando exista meta"

protected_boundaries:
  cause_explanation:
    rule: "No explicar por qué ocurrió un hallazgo."
  priority:
    rule: "No ordenar por importancia salvo regla objetiva ya existente."
  recommendation:
    rule: "No decir qué hacer."
  performance:
    rule: "No modificar contrato de venta vs meta."
  executive_status:
    rule: "No modificar su contrato en esta auditoría."
  sql:
    rule: "No modificar ni crear fuentes."

success_criteria:
  - "Se identifica físicamente por qué la respuesta productiva queda casi vacía."
  - "Se demuestra qué señales reales existen para Acapulco."
  - "Se documenta qué señales no están conectadas a DIAGNOSIS."
  - "Se define el tratamiento correcto de TARGET_MISSING_FOR_PERIOD."
  - "Se propone un slice mínimo de implementación que agregue valor real."
  - "No se inventan nuevas reglas de riesgo."
  - "No se implementa nada."

in_scope:
  - "lectura de lib/director-ia-executive-diagnosis-observations-risks.js"
  - "lectura de composeExecutiveCycle"
  - "lectura de deriveRisksAndGaps"
  - "lectura de tools/fuentes ejecutivas necesarias"
  - "sondas read-only"
  - "tests read-only"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DIAGNOSIS-EVIDENCE-COVERAGE-001.md"

out_of_scope:
  - "implementación"
  - "nuevas reglas de riesgo"
  - "priorización"
  - "causalidad"
  - "recomendaciones"
  - "saludo/identidad"
  - "Taller Expense Analytics"
  - "SQL/schema"
  - "frontend"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

allowed_actions:
  - "crear rama audit/director-ia-diagnosis-evidence-coverage-001"
  - "auditar código y fuentes"
  - "ejecutar sondas read-only"
  - "crear reporte"
  - "commit y push únicamente a la rama de auditoría si el protocolo vigente lo permite"

forbidden_actions:
  - "modificar runtime"
  - "inventar señales"
  - "inventar reglas"
  - "inventar prioridades"
  - "inventar causas"
  - "modificar SQL"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "iniciar siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DIAGNOSIS-EVIDENCE-COVERAGE-001.md"

final_state: "DONE_PENDING_REVIEW"
```
