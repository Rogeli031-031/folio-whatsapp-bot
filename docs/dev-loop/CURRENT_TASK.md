```yaml
task_id: "AUDIT-DIRECTOR-IA-TALLER-EXPENSE-ANALYTICS-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Auditar físicamente la capacidad actual de Director IA para responder consultas
  agregadas de gastos de Taller, Gastos e Inversiones por periodo, palabra/concepto,
  categoría, estatus y otras dimensiones disponibles, con el objetivo de definir
  una familia general de Expense Analytics antes de implementar.

business_questions:
  - "¿Cuánto gasté en Taller en agosto?"
  - "¿Cuánto gasté en Taller de enero a agosto?"
  - "¿Cuánto gasté en llantas en enero?"
  - "¿Cuánto fue de llantas?"
  - "¿Cuánto gasté en refacciones?"
  - "¿Qué fue lo más caro del Taller?"
  - "¿Cuántos folios de Taller hubo?"
  - "¿Cuál fue el promedio por folio?"
  - "¿Qué unidad gastó más?"
  - "¿Qué proveedor recibió más?"
  - "¿Cuánto gasté solo en folios PAGADOS?"
  - "¿Y solo en Taller?"
  - "¿Y en febrero?"
  - "¿Cuánto suman esos folios?"

known_production_evidence:
  case_1:
    question: "¿Cuánto gasté en apoyos de taller en enero?"
    observed_behavior: >
      Director IA buscó mes_cargo=2026-01 y concepto="apoyos de taller" y respondió
      que no encontró coincidencias.
    concern: >
      Puede estar usando la frase completa como concepto en vez de separar dominio,
      métrica, periodo y término de búsqueda.

  case_2:
    question: "¿Qué folios contienen la palabra llantas en enero?"
    observed_behavior: >
      Encontró 7 folios en Acapulco y devolvió sus importes.

  case_3:
    follow_up: "¿Cuál es la suma del mes?"
    observed_behavior: >
      Perdió el hilo y respondió que no pudo determinar intención.
    note: >
      Este fallo de continuidad no se implementará en esta auditoría, pero debe
      documentarse como dependencia o hueco relacionado.

important_semantic_distinction:
  folio_match_total: >
    Suma total de importes de folios cuyo texto contiene una palabra como "llantas".
  attributable_component_cost: >
    Monto exclusivamente correspondiente a esa partida dentro del folio.
  rule: >
    No asumir que ambos valores son equivalentes. Si un folio contiene llantas y
    otras partidas, el importe total del folio no puede llamarse "gasto en llantas"
    salvo que exista desglose físico.

core_questions:
  - "¿Cuál es la fuente física de Taller/Gastos/Inversiones?"
  - "¿Qué tablas/helpers/tools usa Director IA hoy?"
  - "¿Qué columna representa importe?"
  - "¿Qué columna representa mes_cargo?"
  - "¿Qué columnas representan categoría, descripción, concepto, proveedor, unidad y estatus?"
  - "¿Existe desglose por partida dentro del folio?"
  - "¿Existe cantidad y precio unitario por concepto?"
  - "¿Existe forma de atribuir monto exacto a llantas/refacciones/motor/etc.?"
  - "¿Qué filtros soporta físicamente hoy?"
  - "¿Qué agregaciones pueden hacerse con exactitud?"
  - "¿Qué consultas de rango de meses son posibles?"
  - "¿Cómo distingue Taller vs Gastos vs Inversiones?"
  - "¿Cómo se representa PAGADO/PENDIENTE/etc.?"
  - "¿Qué dimensiones no existen y no deben inventarse?"
  - "¿Qué consultas actuales caen a keyword search en vez de expense analytics?"

dimensions_to_audit:
  - "planta"
  - "mes_cargo"
  - "rango de meses"
  - "categoría"
  - "descripción"
  - "concepto"
  - "palabra clave"
  - "importe"
  - "estatus"
  - "beneficiario"
  - "proveedor"
  - "unidad/vehículo"
  - "folio"
  - "subpartida/desglose"
  - "cantidad"
  - "precio unitario"

aggregations_to_audit:
  - "SUM importe"
  - "COUNT folios"
  - "AVG importe por folio"
  - "MAX folio"
  - "MIN folio"
  - "ranking por importe si la dimensión existe"
  - "group by mes"
  - "group by categoría"
  - "group by proveedor"
  - "group by unidad"
  - "group by estatus"

classification_required:
  - "EXACT_SUPPORTED"
  - "FOLIO_TOTAL_ONLY"
  - "KEYWORD_MATCH_ONLY"
  - "DIMENSION_MISSING"
  - "BREAKDOWN_MISSING"
  - "AMBIGUOUS"
  - "OUT_OF_SCOPE"

required_probe_questions:
  - "¿Cuánto gasté en Taller en agosto?"
  - "¿Cuánto gasté en Taller de enero a agosto?"
  - "¿Cuánto gasté en llantas en enero?"
  - "¿Cuánto suman los folios que contienen llantas en enero?"
  - "¿Cuántos folios de Taller hubo en agosto?"
  - "¿Cuál fue el folio de Taller más caro en agosto?"
  - "¿Cuál fue el promedio por folio de Taller?"
  - "¿Cuánto gasté solo en PAGADOS?"
  - "¿Qué proveedor recibió más?"
  - "¿Qué unidad tuvo más gasto?"
  - "¿Cuánto fue de refacciones?"
  - "¿Cuánto fue exclusivamente de llantas?"

required_real_case:
  plant: "Acapulco"
  period: "2026-01"
  keyword: "llantas"
  requirement: >
    Auditar los 7 folios ya observados y determinar qué puede afirmarse exactamente:
    suma de folios coincidentes vs gasto atribuible exclusivamente a llantas.

must_define_contract:
  domain_resolution: >
    Cómo interpretar palabras como Taller, Gastos e Inversiones como dominio/categoría.
  period_resolution: >
    Cómo resolver mes único, rango enero-agosto y expresiones relativas.
  keyword_resolution: >
    Cómo tratar "llantas", "refacciones", etc. cuando solo existen dentro de descripción.
  aggregation_resolution: >
    Cuándo sumar folios completos y cómo etiquetar ese resultado correctamente.
  exact_cost_rule: >
    No llamar "gasto en X" al importe total de folios coincidentes si no existe
    desglose por partida.
  status_filtering: >
    Definir cómo filtrar PAGADO, PENDIENTE u otros estados físicos.
  continuation_dependency: >
    Documentar que follow-ups como "¿cuánto suman?" requieren continuidad de result-set,
    pero no implementarla aquí.

required_matrix_1:
  columns:
    - "campo/dimensión"
    - "fuente física"
    - "disponible"
    - "tipo"
    - "usable para filtro"
    - "usable para agrupación"
    - "observaciones"

required_matrix_2:
  columns:
    - "pregunta"
    - "intención actual"
    - "dato requerido"
    - "soportada hoy"
    - "clasificación"
    - "respuesta correcta conceptual"

required_matrix_3:
  columns:
    - "consulta"
    - "puede dar cifra exacta"
    - "solo puede sumar folios coincidentes"
    - "requiere desglose"
    - "debe aclarar limitación"

protected_boundaries:
  folio_keyword_search:
    rule: >
      No romper la búsqueda actual de folios por palabra.
  continuity:
    rule: >
      No implementar result-set continuity en esta auditoría.
  sql:
    rule: "No modificar."
  frontend:
    rule: "No modificar."
  causal_analysis:
    rule: "Fuera de alcance."
  recommendations:
    rule: "Fuera de alcance."

success_criteria:
  - "Se identifica la fuente física exacta de Taller/Gastos/Inversiones."
  - "Se documentan todas las dimensiones reales disponibles."
  - "Se sabe qué agregaciones pueden responderse exactamente."
  - "Se diferencia gasto por categoría vs keyword match."
  - "Se demuestra si existe o no desglose por partida."
  - "Se resuelve conceptualmente el caso de los 7 folios con llantas."
  - "Se propone una familia general de Expense Analytics."
  - "Se propone un slice mínimo de implementación."
  - "No se implementa nada."

in_scope:
  - "lectura de planner/capabilities/tool orchestrator"
  - "lectura de helpers de folios/gastos/taller/inversiones"
  - "lectura de SQL existente"
  - "sondas read-only"
  - "tests read-only"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-TALLER-EXPENSE-ANALYTICS-001.md"

out_of_scope:
  - "implementación"
  - "SQL/schema"
  - "nuevas tablas"
  - "desglose artificial de partidas"
  - "result-set conversational continuity"
  - "saludo/identidad"
  - "PRIORITY"
  - "CAUSE_EXPLANATION"
  - "frontend"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

allowed_actions:
  - "crear rama audit/director-ia-taller-expense-analytics-001"
  - "auditar código y fuentes"
  - "ejecutar sondas read-only"
  - "crear reporte"
  - "commit y push únicamente a la rama de auditoría si el protocolo vigente lo permite"

forbidden_actions:
  - "implementar expense analytics"
  - "inventar desglose"
  - "sumar conceptos parciales como si fueran importes exactos"
  - "modificar SQL"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "iniciar continuidad de resultados"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-TALLER-EXPENSE-ANALYTICS-001.md"

final_state: "DONE_PENDING_REVIEW"
```
