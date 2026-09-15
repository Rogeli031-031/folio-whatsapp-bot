```yaml
task_id: "IMPL-DIRECTOR-IA-EXPENSE-ANALYTICS-CORE-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-15"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Implementar el núcleo de Expense Analytics para Director IA de forma que pueda
  responder consultas agregadas de Taller, Gastos e Inversiones por periodo,
  categoría, estatus y keyword cuando la evidencia física lo permita, sin confundir
  categorías con clientes y sin llamar "gasto exacto en X" a la suma de folios
  coincidentes cuando no existe desglose atribuible.

source_audit:
  task_id: "AUDIT-DIRECTOR-IA-TALLER-EXPENSE-ANALYTICS-001"
  report: "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-TALLER-EXPENSE-ANALYTICS-001.md"
  audit_commit: "18d37164"

known_findings:
  - >
    "¿Cuánto gasté en Taller en agosto?" cae hoy a client_profile porque
    Taller se interpreta como cliente.
  - >
    "¿Cuánto gasté en apoyos de taller en enero?" no descompone métrica,
    categoría y keyword; busca concepto="apoyos de taller".
  - >
    El verbo "gasté" no dispara SUM de forma confiable.
  - >
    folio_search encuentra cabeceras/folios coincidentes por texto, pero no lee
    detalle_lineas para atribución exacta de una subpartida.
  - >
    detalle_lineas existe con concepto + importe, pero no forma parte de la ruta
    actual y no está autorizado integrarlo en este slice.
  - >
    No existen cantidad ni precio unitario utilizables en esta ruta.
  - >
    SUM(importes de folios que contienen "llantas") != gasto exacto en llantas.
  - >
    "¿Cuál es la suma del mes?" pierde result-set continuity; queda fuera de este slice.

primary_goal: >
  Crear una resolución general de Expense Analytics que separe correctamente:
  dominio/categoría + métrica/agregación + periodo + estatus + keyword,
  reutilizando fuentes actuales y sin introducir desglose artificial.

supported_domains:
  - "Taller"
  - "Gastos"
  - "Inversiones"

supported_metrics:
  - "SUM"
  - "COUNT"
  - "AVG"
  - "MAX"
  - "MIN"

language_cues:
  sum:
    examples:
      - "cuánto gasté"
      - "cuánto gastamos"
      - "cuánto se gastó"
      - "cuánto fue"
      - "cuánto suman"
      - "total"
  count:
    examples:
      - "cuántos folios"
      - "cuántos fueron"
  avg:
    examples:
      - "promedio"
      - "promedio por folio"
  max:
    examples:
      - "el más caro"
      - "mayor gasto"
      - "folio de mayor importe"
  min:
    examples:
      - "el más barato"
      - "menor gasto"

required_semantic_decomposition:
  examples:
    - question: "¿Cuánto gasté en Taller en agosto?"
      expected:
        domain: "Taller"
        metric: "SUM"
        period: "agosto"
        keyword: null

    - question: "¿Cuánto gasté en apoyos de taller en enero?"
      expected:
        domain: "Taller"
        metric: "SUM"
        period: "enero"
        keyword: "apoyos"

    - question: "¿Cuánto suman los folios que contienen llantas en enero?"
      expected:
        domain: null
        metric: "SUM"
        period: "enero"
        keyword: "llantas"
        semantic_label: "TOTAL_FOLIOS_MATCHING_KEYWORD"

    - question: "¿Cuánto gasté exactamente en llantas en enero?"
      expected:
        domain: null
        metric: "ATTRIBUTABLE_COMPONENT_COST"
        period: "enero"
        keyword: "llantas"
        result: "BREAKDOWN_MISSING unless exact detail is physically supported"

category_resolution:
  rule: >
    Taller/Gastos/Inversiones deben resolverse como categorías/dominios operativos,
    no como clientes, cuando aparezcan dentro de consultas de gasto/folio.

client_protection:
  rule: >
    No degradar client_profile cuando exista un cliente real cuyo nombre coincida
    con una palabra de dominio. La resolución debe usar contexto semántico de gasto,
    no una lista ciega.

period_resolution:
  supported:
    - "mes único"
    - "rango explícito de meses"
    - "enero a agosto"
    - "de enero a agosto"
    - "enero-agosto"
  rule: >
    Reutilizar la resolución temporal existente cuando sea compatible.
    No sumar periodos distintos accidentalmente.

status_filtering:
  examples:
    - "solo PAGADOS"
    - "pagados"
    - "pendientes"
  rule: >
    Aplicar únicamente estados físicos existentes en la fuente actual.

keyword_semantics:
  header_match:
    label: "TOTAL_FOLIOS_MATCHING_KEYWORD"
    meaning: >
      Suma/estadística sobre importes completos de folios cuya descripción/concepto
      coincida con el término.
  exact_component_cost:
    label: "ATTRIBUTABLE_COMPONENT_COST"
    meaning: >
      Monto exclusivamente atribuible a la subpartida.
    rule: >
      No soportado en este slice salvo que ya exista en la misma ruta sin integración
      nueva. No usar detalle_lineas todavía.

required_response_rules:
  category_sum:
    example: >
      En agosto 2026, los folios de categoría Taller suman $X MXN.
  keyword_total:
    example: >
      Los folios de enero 2026 que contienen "llantas" suman $X MXN en importe
      total de folios.
  keyword_warning:
    example: >
      Ese total no equivale necesariamente al gasto exclusivo en llantas porque
      algunos folios incluyen otros conceptos.
  exact_cost_missing:
    example: >
      No puedo determinar con exactitud cuánto corresponde exclusivamente a llantas
      con esta fuente, porque la ruta actual no tiene desglose atribuible usable.

must_not_claim:
  - "gasto exacto en llantas" a partir de cabeceras coincidentes
  - "gasto exacto en refacciones" sin desglose
  - "Taller es un cliente"
  - "apoyos de taller" como concepto indivisible cuando Taller es categoría
  - "SUM" si la pregunta pide lista y no agregación
  - "lista" si la pregunta pide cuánto

required_questions:
  - "¿Cuánto gasté en Taller en agosto?"
  - "¿Cuánto gasté en Taller de enero a agosto?"
  - "¿Cuántos folios de Taller hubo en agosto?"
  - "¿Cuál fue el folio de Taller más caro en agosto?"
  - "¿Cuál fue el promedio por folio de Taller en agosto?"
  - "¿Cuánto gasté solo en folios PAGADOS de Taller en agosto?"
  - "¿Cuánto gasté en apoyos de taller en enero?"
  - "¿Cuánto suman los folios que contienen llantas en enero?"
  - "¿Cuánto fue exactamente de llantas en enero?"
  - "¿Cuánto gasté en refacciones en enero?"

protected_boundaries:
  folio_search:
    rule: >
      No romper búsqueda/listado existente por keyword.
  client_profile:
    rule: >
      No romper resolución real de clientes.
  continuity:
    rule: >
      No implementar follow-ups sobre result-set como "¿cuánto suman?" sin repetir
      contexto suficiente.
  detalle_lineas:
    rule: >
      No integrar en este slice.
  sql:
    rule: >
      No modificar schema ni crear tablas.
  frontend:
    rule: >
      No modificar.
  diagnosis:
    rule: >
      No modificar.
  greeting:
    rule: >
      No modificar.

implementation_principle: >
  Introducir la mínima capa de intención/resolución necesaria para Expense Analytics
  reutilizando el query/helper actual de folios/gastos. No crear una segunda fuente
  de verdad ni duplicar lógica SQL si ya existe.

tests_required:
  positive:
    - "Taller + SUM + mes"
    - "Taller + SUM + rango"
    - "Taller + COUNT"
    - "Taller + AVG"
    - "Taller + MAX"
    - "Taller + PAGADO"
    - "Taller + keyword apoyos"
    - "keyword llantas + SUM folios coincidentes"
    - "Gastos + SUM"
    - "Inversiones + SUM"

  semantic:
    - "gasté dispara SUM"
    - "Taller no se resuelve como cliente en contexto de gasto"
    - "apoyos de taller se separa en category=Taller + keyword=apoyos"
    - "llantas exacto vs folios coincidentes se distinguen"

  negative:
    - "gasto exacto en llantas no se inventa"
    - "gasto exacto en refacciones no se inventa"
    - "detalle_lineas no se usa"
    - "no continuidad implícita de result-set"
    - "no cruce de planta"
    - "no cruce de periodo"

  regression:
    - "folio keyword search existente sigue funcionando"
    - "client_profile sigue funcionando con clientes reales"
    - "EXECUTIVE_STATUS sin regresión"
    - "DIAGNOSIS sin regresión"
    - "PERFORMANCE sin regresión"
    - "greeting sin regresión"

success_metrics:
  - >
    "¿Cuánto gasté en Taller en agosto?" deja de caer a client_profile.
  - >
    "¿Cuánto gasté en apoyos de taller en enero?" se descompone correctamente.
  - >
    Las consultas agregadas soportadas devuelven cifra exacta de folios/categoría.
  - >
    Las consultas por keyword etiquetan claramente total de folios coincidentes.
  - >
    Las consultas de costo exclusivo fallan cerrado cuando falta desglose.
  - "0 montos parciales inventados."
  - "0 cambios SQL/schema."
  - "0 cruces de planta."

in_scope:
  - "planner/intención mínima para Expense Analytics"
  - "resolver category/metric/period/status/keyword"
  - "reutilizar folio query/helper existente"
  - "agregaciones SUM/COUNT/AVG/MAX/MIN sobre datos físicamente disponibles"
  - "tests/fixtures"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXPENSE-ANALYTICS-CORE-001.md"

out_of_scope:
  - "detalle_lineas"
  - "costeo exacto por subpartida"
  - "cantidad/precio unitario"
  - "result-set conversational continuity"
  - "ranking por proveedor si requiere nueva dimensión"
  - "ranking por unidad si requiere nueva dimensión"
  - "SQL/schema"
  - "frontend"
  - "PRIORITY"
  - "CAUSE_EXPLANATION"
  - "merge a main"
  - "push directo a main"
  - "deploy"
  - "siguiente tarea"

allowed_actions:
  - "crear rama implementation/director-ia-expense-analytics-core-001"
  - "modificar la mínima frontera runtime necesaria"
  - "reutilizar queries/helpers existentes"
  - "agregar tests/fixtures"
  - "ejecutar sondas locales/read-only"
  - "documentar evidencia"
  - "commit y push únicamente a la rama autorizada si el protocolo vigente lo permite"

forbidden_actions:
  - "inventar desglose"
  - "usar detalle_lineas"
  - "crear nueva tabla/campo"
  - "modificar SQL/schema"
  - "implementar continuidad de resultados"
  - "merge a main"
  - "push a main"
  - "deploy"
  - "iniciar siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXPENSE-ANALYTICS-CORE-001.md"

final_state: "DONE_PENDING_REVIEW"
```
