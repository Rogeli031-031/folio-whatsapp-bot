# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar y priorizar el siguiente slice de M2 — Kanban / Folios — después
  de folio_status, seleccionando exactamente un candidato por valor ejecutivo,
  frecuencia de uso, reutilización de fuentes existentes, seguridad read-only,
  costo de integración y ajuste a la definición canónica vigente de M2.

baseline:
  module: "M2 — Kanban / Folios"
  current_state: "PARTIAL"
  global_percentage: 42.5
  numerator: 8.5
  denominator: 20

  already_integrated:
    - "comentarios de folio"
    - "folio_status por id"
    - "folio_status por numero_folio"
    - "varios folios"
    - "listado por planta"
    - "filtro/listado por etapa"
    - "estatus observado"
    - "etapa derivada"

  current_safe_path: >
    folio_status -> get_folio_status -> loadFolioStatusForChat ->
    SELECT-only -> evidencia -> respuesta

  state_rule: >
    No asumir que el próximo slice lleva M2 a COMPLETE. El estado resultante
    debe determinarse contra la ficha canónica vigente, no por conveniencia.

primary_question: >
  ¿Cuál es el siguiente slice de M2 que produce mayor valor ejecutivo real
  para Director IA con el menor riesgo y delta arquitectónico, preservando
  read-only cuando sea posible y sin reinterpretar la definición canónica
  del módulo?

candidate_families:
  - id: "history"
    examples:
      - "historial del folio"
      - "cambios de etapa/estatus"
      - "quién hizo qué"
      - "cuándo ocurrió"
    note: "Auditar fuente física; no asumir que existe path seguro."

  - id: "documents"
    examples:
      - "documentos asociados"
      - "PDFs"
      - "existencia/tipo de documentos"
    note: >
      Separar metadatos read-only de descarga/binario/S3. No asumir que todo
      documents debe integrarse en un solo slice.

  - id: "financial_status"
    examples:
      - "cheque"
      - "póliza"
      - "presupuesto"
      - "estatus financiero del folio"
    note: >
      Determinar si existe una consulta ejecutiva coherente y SELECT-only.
      No fusionar fuentes distintas solo para cerrar M2.

  - id: "kanban_flow"
    examples:
      - "qué folios llevan demasiado tiempo en una etapa"
      - "antigüedad por etapa"
      - "flujo/atascos"
      - "movimiento del tablero"
    note: >
      Separar hechos observables de inferencias como retrasado/atorado.
      No usar handlers mutantes.

  - id: "other"
    note: >
      Permitir candidato distinto solo si surge físicamente de la definición
      canónica y del repositorio y tiene mayor valor ejecutivo.

evaluation_dimensions:
  - "valor ejecutivo"
  - "frecuencia probable de consulta"
  - "capacidad para explicar qué está pasando"
  - "complementariedad con folio_status"
  - "fuente física existente"
  - "SELECT-only/read-only"
  - "riesgo de side effects"
  - "authz"
  - "scope planta"
  - "reutilización de helpers"
  - "planner existente"
  - "tools existentes"
  - "delta de implementación"
  - "testabilidad"
  - "dependencias externas"
  - "riesgo de reinterpretación contractual"
  - "estado M2 resultante"
  - "impacto porcentual real"

mandatory_audit:

  canonical_m2:
    - "leer ficha M2 completa vigente"
    - "identificar propósito canónico"
    - "inventariar capacidades cubiertas"
    - "inventariar capacidades faltantes"
    - "determinar qué exige realmente COMPLETE"

  physical_sources:
    - "buscar helpers existentes"
    - "buscar queries SQL"
    - "buscar tablas/vistas"
    - "buscar endpoints"
    - "buscar side effects"
    - "buscar S3/filesystem si aplica"
    - "buscar joins financieros si aplica"

  history:
    - "fuente"
    - "SELECT-only sí/no"
    - "semántica"
    - "authz"
    - "scope planta"
    - "planner/tool actuales"
    - "delta"

  documents:
    - "fuente"
    - "metadata vs binary"
    - "SELECT-only sí/no"
    - "S3/dependencias"
    - "authz"
    - "scope planta"
    - "planner/tool actuales"
    - "delta"

  financial_status:
    - "cheques"
    - "pólizas"
    - "presupuestos"
    - "relación real con folio"
    - "SELECT-only sí/no"
    - "authz"
    - "delta"

  kanban_flow:
    - "timestamps reales disponibles"
    - "antigüedad observable"
    - "movimientos reales"
    - "definición de atascado/retrasado"
    - "si requiere nueva semántica"
    - "si puede mantenerse factual"

  director_ia_wiring:
    - "intents existentes"
    - "tools existentes"
    - "executors"
    - "capabilities"
    - "UNSUPPORTED_RULES"
    - "SOURCE_NOT_INTEGRATED"
    - "chat routing"

ranking_rules:
  must_not:
    - "elegir por número de módulo"
    - "elegir porque ya existe intent"
    - "elegir porque mueve porcentaje"
    - "elegir history por ser NEXT_TASK nominal"
    - "elegir documents por ser el siguiente campo de la matriz"
    - "inventar COMPLETE"
    - "agrupar múltiples slices para forzar COMPLETE"

  prefer:
    - "alto valor ejecutivo"
    - "hechos observables"
    - "fuente existente"
    - "SELECT-only"
    - "in-process"
    - "authz reutilizable"
    - "sin contrato nuevo"
    - "sin infraestructura nueva"
    - "tests determinísticos"

mandatory_ranking_table:
  columns:
    - "rank"
    - "candidate"
    - "executive_value"
    - "source_ready"
    - "read_only"
    - "authz_ready"
    - "planner_tool_ready"
    - "implementation_delta"
    - "semantic_risk"
    - "external_dependency"
    - "state_after_slice"
    - "percentage_effect"
    - "decision"

decision_rules:

  winner:
    required:
      - "exactamente un slice"
      - "evidencia física suficiente"
      - "alcance acotable"
      - "valor ejecutivo justificable"
      - "estado posterior explícito"
      - "porcentaje posterior explícito"

    next_task_format: >
      ARCH-DIRECTOR-IA-M2-<SLICE>-READINESS-001

  no_winner:
    when:
      - "ningún slice tiene evidencia suficiente"
      - "todos requieren decisión contractual previa"
      - "todos dependen de mutación insegura"
      - "no existe diferenciación defendible"

    outcome: "STOPPED"
    next_task: null

semantic_invariants:
  - "M2 ≠ Action Register."
  - "M2 ≠ M3 KPIs."
  - "estatus actual ≠ historial."
  - "document metadata ≠ document content."
  - "antigüedad ≠ retraso salvo regla explícita."
  - "falta de movimiento ≠ bloqueo salvo evidencia/regla."
  - "cheque ≠ póliza ≠ presupuesto."
  - "No inventar eventos históricos."
  - "No inventar documentos."
  - "No inventar estado financiero."
  - "No usar rutas mutantes por conveniencia."
  - "No ampliar cross-planta."
  - "No reinterpretar COMPLETE."

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001.md"

  read_only:
    - "AGENTS.md"
    - "docs/dev-loop/**"
    - "docs/director-ia/**"
    - "lib/**"
    - "server.js"
    - "frontend-dashboard/**"
    - "test/**"
    - "scripts/**"
    - "sql/**"
    - "package.json"
    - "package-lock.json"

out_of_scope:
  - "implementar"
  - "modificar código"
  - "modificar runtime"
  - "modificar frontend"
  - "modificar tests"
  - "modificar scripts"
  - "modificar SQL"
  - "modificar capability matrix"
  - "modificar contratos"
  - "crear migration"
  - "hacer smoke productivo"
  - "ejecutar writes"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "ejecutar NEXT_TASK"

allowed_actions:
  - "auditar repositorio"
  - "comparar candidatos"
  - "trazar fuentes"
  - "trazar authz"
  - "trazar planner/tools"
  - "trazar side effects"
  - "determinar valor ejecutivo"
  - "determinar estado posterior"
  - "recalcular porcentaje solo si realmente corresponde"
  - "elegir exactamente un ganador"
  - "proponer exactamente una NEXT_TASK"
  - "escribir reporte"
  - "ejecutar git diff --check"
  - "ejecutar git status"

forbidden_actions:
  - "implementar ganador"
  - "editar capability matrix"
  - "cambiar estado M2"
  - "otorgar COMPLETE sin definición canónica"
  - "inventar +2.5 pp"
  - "hacer commit"
  - "hacer push"
  - "hacer merge"
  - "autorizar NEXT_TASK"
  - "ejecutar NEXT_TASK"

required_output:
  - "resumen ejecutivo"
  - "baseline M2"
  - "baseline global 42.5%"
  - "definición canónica M2"
  - "inventario de gaps restantes"
  - "análisis history"
  - "análisis documents"
  - "análisis financial_status"
  - "análisis kanban_flow"
  - "otros candidatos encontrados"
  - "ranking completo"
  - "ganador"
  - "por qué gana"
  - "por qué pierden los demás"
  - "estado M2 después del ganador"
  - "porcentaje después del ganador"
  - "riesgos"
  - "gates"
  - "NEXT_TASK"
  - "acciones no realizadas"
  - "git diff --check"
  - "git status"

acceptance_criteria:
  - "Se leyó la definición canónica completa de M2."
  - "Se verificó físicamente cada familia candidata."
  - "Se identificaron fuentes reales."
  - "Se identificaron side effects."
  - "Se evaluó authz."
  - "Se evaluó scope planta."
  - "Se evaluó planner/tools."
  - "Se evaluó costo de implementación."
  - "Se evaluó riesgo semántico."
  - "Se evaluó valor ejecutivo."
  - "Se produjo ranking comparativo."
  - "Se eligió exactamente un ganador o STOPPED."
  - "No se asumió history."
  - "No se asumió documents."
  - "No se implementó."
  - "No se modificó capability matrix."
  - "No se modificó código."
  - "Solo CURRENT_TASK y reporte fueron modificados."
  - "git diff --check limpio."

next_task_policy:
  winner_found:
    propose_exactly_one: "ARCH-DIRECTOR-IA-M2-<WINNER>-READINESS-001"

  no_winner:
    propose: null

report_requirements:
  path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "baseline"
    - "definición canónica"
    - "gaps M2"
    - "fuentes físicas"
    - "history"
    - "documents"
    - "financial status"
    - "kanban flow"
    - "ranking"
    - "ganador"
    - "estado posterior"
    - "porcentaje posterior"
    - "riesgos"
    - "gates"
    - "NEXT_TASK"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"

expected_terminal_state: >
  DONE_PENDING_REVIEW si existe un ganador defendible. STOPPED si no existe
  candidato suficientemente seguro/valioso sin decisión previa. BLOCKED si
  falta gate o dato humano indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M2-NEXT-SLICE-PRIORITIZATION-001.md"