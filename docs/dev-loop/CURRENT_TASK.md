```yaml
task_id: "IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-PARAPHRASE-COVERAGE-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Ampliar de forma controlada la cobertura lingüística de la intención existente
  EXECUTIVE_STATUS para que todas las frases clasificadas por la auditoría como
  PARAPHRASE_PURE lleguen a la misma capacidad ejecutiva, sin absorber
  especializaciones TIME, PERFORMANCE, DIAGNOSIS, PRIORITY, ambigüedades ni
  falsos positivos.

source_audit:
  task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-HOW-ARE-WE-DOING-INTENT-001"
  report: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-EXECUTIVE-HOW-ARE-WE-DOING-INTENT-001.md"
  audit_commit: "32621a11"

known_baseline:
  total_battery: 50
  currently_reaching_executive_status: 18
  currently_unknown: 31
  known_time_collision:
    phrase: "¿Cómo va el día de hoy?"
    rule: >
      No debe ser absorbida por EXECUTIVE_STATUS. Debe respetarse la semántica
      temporal / daily brief definida por runtime.
  known_false_positive:
    phrase: "¿Qué tal estás?"
    rule: >
      Debe seguir siendo conversación dirigida a Director IA, no estado de planta.
  known_wrong_route:
    phrase: "Dame una lectura rápida de cómo cerramos el indicador."
    current_route: "month_close_result"
    rule: >
      No corregir esta colisión dentro de este slice salvo que la auditoría la
      haya clasificado explícitamente como PARAPHRASE_PURE. Mantener fuera del
      alcance cualquier reparación de intención ambigua o de indicador.

primary_goal: >
  Cerrar únicamente el hueco de reconocimiento lingüístico de las paráfrasis
  puras de EXECUTIVE_STATUS. No agregar nueva lógica ejecutiva, nuevas fuentes,
  nuevas tools ni nuevas respuestas.

implementation_principle: >
  Resolver la intención por semántica generalizable y no mediante una lista
  frágil de 50 frases hardcodeadas. Si se agregan ejemplos o patrones, deben
  representar una regla reusable y preservar las fronteras ya auditadas.

required_behavior:
  - "Toda frase marcada PARAPHRASE_PURE en la auditoría debe resolver a EXECUTIVE_STATUS."
  - "Las paráfrasis deben funcionar en primer turno cuando existe el contexto requerido."
  - "La respuesta debe seguir usando el contrato actual de EXECUTIVE_STATUS."
  - "No agregar campos, fuentes o afirmaciones nuevas a la respuesta."
  - "No cambiar semántica de planta, periodo, evidencia o autorización."
  - "No degradar las 18 frases que ya funcionan."
  - "No absorber frases clasificadas como especializaciones."

protected_boundaries:
  time:
    examples:
      - "¿Cómo va el día de hoy?"
    requirement:
      - "No resolver como EXECUTIVE_STATUS general si la semántica temporal requiere otra ruta."
      - "No romper daily_executive_brief ni rutas temporales existentes."

  performance:
    examples:
      - "¿Estamos cumpliendo?"
      - "¿Estamos dentro de los objetivos o fuera?"
      - "¿El rendimiento va de acuerdo a lo planeado?"
      - "¿Estamos logrando las metas trazadas para el periodo?"
    requirement:
      - "No convertirlas en EXECUTIVE_STATUS en este slice."

  diagnosis:
    examples:
      - "¿Qué debería preocuparme?"
      - "¿Qué está funcionando y qué no?"
      - "¿Dónde estamos fallando?"
      - "¿Dónde tenemos problemas?"
    requirement:
      - "No convertirlas en EXECUTIVE_STATUS en este slice."

  priority:
    examples:
      - "¿Qué tengo que atender?"
      - "¿Qué es lo más importante ahorita?"
      - "¿Dónde debería poner atención?"
      - "¿Qué requiere mi atención?"
      - "¿Qué tenemos pendiente importante?"
    requirement:
      - "No convertirlas en EXECUTIVE_STATUS en este slice."

  false_positive:
    examples:
      - "¿Qué tal estás?"
    requirement:
      - "Debe seguir siendo conversación con Director IA."

  ambiguous:
    examples:
      - "Preséntame el balance general de la jornada."
      - "Dame una lectura rápida de cómo cerramos el indicador."
    requirement:
      - "No forzar estas frases a EXECUTIVE_STATUS salvo evidencia contractual explícita."

tests_required:
  - "Construir o reutilizar una batería automatizada basada en las 50 frases auditadas."
  - "Etiquetar expected intent por frase según el reporte de auditoría."
  - "Verificar todas las PARAPHRASE_PURE."
  - "Verificar que las fronteras protegidas no sufran regresión."
  - "Reportar cobertura antes y después."
  - "Reportar número exacto de PARAPHRASE_PURE PASS."
  - "Reportar cualquier frase que siga en unknown."
  - "Reportar cualquier frase que cambie a una intención incorrecta."
  - "Ejecutar tests existentes de planner/CEL relacionados."

success_metrics:
  - "100% de las frases auditadas como PARAPHRASE_PURE alcanzan EXECUTIVE_STATUS."
  - "0 falsos positivos nuevos en TIME, PERFORMANCE, DIAGNOSIS, PRIORITY y conversación personal."
  - "Las 18 frases previamente funcionales continúan funcionando."
  - "No se altera el contenido contractual de la respuesta de EXECUTIVE_STATUS."
  - "No se introduce acceso a nuevas fuentes."
  - "No se introduce una nueva intención paralela."

in_scope:
  - "lib/director-ia-planner.js y/o capa CEL física que la auditoría identifique como propietaria de EXECUTIVE_STATUS"
  - "tests relacionados con planner/CEL/EXECUTIVE_STATUS"
  - "batería automatizada de las 50 frases o fixture equivalente"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-PARAPHRASE-COVERAGE-001.md"

out_of_scope:
  - "nueva intención PERFORMANCE"
  - "nueva intención DIAGNOSIS"
  - "nueva intención PRIORITY"
  - "reimplementación de daily_executive_brief"
  - "nuevas tools"
  - "nuevas fuentes"
  - "SQL"
  - "schema"
  - "frontend"
  - "Action Register behavior"
  - "IGF behavior"
  - "ARR behavior"
  - "cambios en permisos"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

allowed_actions:
  - "crear rama implementation/director-ia-executive-status-paraphrase-coverage-001"
  - "modificar únicamente la capa mínima responsable del reconocimiento de intención"
  - "agregar fixtures y tests"
  - "ejecutar sondas locales"
  - "documentar cobertura antes/después"
  - "commit y push únicamente a la rama de trabajo si el protocolo vigente lo permite"

forbidden_actions:
  - "hardcodear respuesta por frase"
  - "crear una intención nueva para resolver este slice"
  - "absorber especializaciones"
  - "cambiar output contract de EXECUTIVE_STATUS"
  - "cambiar fuentes de evidencia"
  - "cambiar SQL"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "iniciar siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-PARAPHRASE-COVERAGE-001.md"

final_state: "DONE_PENDING_REVIEW"
```
