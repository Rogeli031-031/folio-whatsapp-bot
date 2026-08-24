# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A_PENDING_AUDIT
  G3_new_architecture_contract: N/A_PENDING_AUDIT
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar el first slice mínimo, seguro y físicamente soportado para que
  Director IA pueda responder preguntas de desviación diaria como
  “¿por qué bajó la venta ayer?” y “¿por qué subió el descuento/kg ayer?”,
  entregando a GPT un paquete diario con valor observado, referencia comparable,
  desviación matemática, contribución por dimensiones disponibles y evidencia
  relacionada, sin convertir contribución matemática en causalidad.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  prior_audit:
    task: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-002"
    bottleneck: "daily question intercepted/lost by monthly path"
    failure_class: "MISSING_INFRASTRUCTURE"

product_principle: >
  El código debe calcular y reunir correctamente hechos, periodos, unidades,
  referencias y contribuciones matemáticas. GPT debe conservar la explicación
  conversacional, la síntesis, las hipótesis etiquetadas y la identificación
  de información faltante.

primary_questions:
  - "¿Por qué bajó la venta ayer?"
  - "¿Por qué subió el descuento por kg ayer?"

central_distinction:
  detection: "qué valor tuvo ayer y contra qué referencia"
  mathematical_explanation: "qué dimensiones contribuyeron al movimiento"
  business_explanation: "qué evidencia comercial/operativa existe"
  information_gap: "qué parte sigue sin explicación"

truth_rule: >
  Mathematical contribution != business cause.

mandatory_physical_audit:

  source_inventory:
    inspect:
      - "tablas ARR/ventas/descuentos con columna fecha"
      - "queries actuales de M9"
      - "financial-diagnosis.js"
      - "planner routing de daily language"
      - "discount calculations actuales"
      - "client/channel fields disponibles"
      - "commercial_state / DICF / comments / bitácora para evidencia relacionada"

    determine:
      - "fuente diaria exacta para venta"
      - "fuente diaria exacta para descuento"
      - "granularidad real"
      - "cliente disponible sí/no"
      - "canal disponible sí/no"
      - "importe/monto/kg disponibles"
      - "fecha timezone semantics"
      - "planta_id"

  planner:
    inspect:
      - "frases con ayer/hoy/diario"
      - "financial_diagnosis routing"
      - "delta_sales"
      - "delta_discount"
      - "unknown/clarification"

    determine:
      - "qué intent debería recibir daily deviation"
      - "si se necesita intent nuevo"
      - "si puede subintentarse sin romper monthly paths"
      - "qué frases deben resolverse"

  daily_sales:
    required:
      - "valor de venta del día objetivo"
      - "unidad física exacta"
      - "planta"
      - "fecha"
      - "desglose por cliente si existe"
      - "desglose por canal si existe"

  daily_discount:
    required:
      - "monto descuento diario"
      - "kg diario"
      - "descuento/kg ponderado"
      - "planta"
      - "fecha"
      - "cliente si existe"
      - "canal si existe"

    formula_rule: >
      Auditar fórmula física exacta. No promediar promedios de descuento/kg.
      Si el indicador diario es monto_total / kg_total, preservar ese denominador.

reference_model:

  primary_question: >
    ¿Contra qué debe compararse “ayer” para que la respuesta sea útil y no
    engañosa?

  mandatory_candidates:
    A_previous_day:
      description: "día inmediatamente anterior"

    B_same_weekday_recent:
      description: "promedio de mismos días de semana recientes"

    C_month_to_date_daily_average:
      description: "promedio diario del mes al corte"

    D_recent_rolling_average:
      description: "promedio móvil de N días comparables"

    E_existing_business_reference:
      description: >
        cualquier referencia ya usada físicamente por dashboard/ARR/producto

  audit_each:
    - "business meaning"
    - "availability"
    - "weekend/holiday effects"
    - "seasonality"
    - "zero/missing days"
    - "partial day risk"
    - "number of observations"
    - "whether already canonical"

  requirement: >
    Seleccionar UNA referencia default defendible para first slice o concluir
    que debe preguntarse/mostrar más de una. No inventar una referencia
    simplemente porque sea fácil.

  rule: >
    Siempre exponer qué referencia se utilizó.

date_semantics:

  audit:
    - "timezone del negocio"
    - "definición de ayer"
    - "fecha local de planta vs CDMX si aplica"
    - "día incompleto"
    - "queries ejecutadas cerca de medianoche"

  requirement: >
    “Ayer” debe mapear a una fecha calendario estable y completa.

mathematical_decomposition:

  sales:
    audit:
      - "contribución por cliente"
      - "contribución por canal"
      - "contribución por producto si existe"

    principle: >
      Si total ayer - referencia = delta, auditar si la contribución de cada
      dimensión puede reconstruir ese delta con una base comparable.

  discount:
    audit:
      - "efecto por cliente sobre monto/kg ponderado"
      - "efecto por canal"
      - "cambio de mix"
      - "cambio de descuento dentro del cliente"

    crucial_rule: >
      No afirmar que el cliente con mayor descuento/kg es quien más movió el
      promedio. Debe considerarse su volumen/peso en el denominador.

  concentration:
    allowed:
      - "top contributors"
      - "share of total mathematical deviation"

    rule: >
      Top contributor != cause.

business_evidence_layer:

  audit_sources:
    - "DICF actions"
    - "commercial comments"
    - "bitácora"
    - "Action Register if relevant"

  required_determination:
    - "qué se puede asociar físicamente por cliente_key"
    - "qué solo se puede asociar por planta"
    - "qué ventanas temporales son razonables"
    - "qué comentario es anterior/posterior al evento"
    - "qué evidencia no debe presentarse como causa"

  rule: >
    La readiness debe distinguir evidencia relacionada de explicación causal.

information_gap_layer:

  target_behavior: >
    Si una parte relevante de la desviación no tiene explicación registrada,
    el pack debe permitir a GPT identificar qué información falta.

  audit:
    - "qué cliente/contribuyente sigue sin explicación"
    - "acción existente sí/no"
    - "comentario reciente sí/no"
    - "responsable físicamente ligado a una acción sí/no"

  rule: >
    No crear workflow ni mensajes. Solo preparar evidencia/limitations para que
    GPT pueda decir qué falta saber.

conversation_continuity:

  required:
    - "¿Por qué bajó la venta ayer?"
    - "¿Contra qué estás comparando?"
    - "¿Qué clientes explican más?"
    - "¿Sabemos por qué?"
    - "¿Qué falta investigar?"

  audit:
    - "cómo se integra con structured_conversation_state"
    - "si period continuity necesita entrar en first slice"
    - "si active date debe formar parte del estado"
    - "qué follow-ups pueden funcionar sin almacenar periodo persistente"

  rule: >
    No ampliar a cross-session daily memory en este slice salvo necesidad
    demostrada.

first_slice_candidates:

  candidate_a:
    name: "daily_sales_detection_only"
    includes:
      - "ayer"
      - "referencia"
      - "delta total"

  candidate_b:
    name: "daily_sales_decomposition"
    includes:
      - "valor"
      - "referencia"
      - "delta"
      - "top contributors"

  candidate_c:
    name: "daily_sales_plus_business_evidence"
    includes:
      - "detección"
      - "contribución matemática"
      - "comments/actions evidence"
      - "information gaps"

  candidate_d:
    name: "sales_and_discount_daily_pack"
    includes:
      - "venta diaria"
      - "descuento/kg diario"
      - "decompositions"

  requirement:
    - "comparar A/B/C/D"
    - "seleccionar exactamente un first slice"
    - "no elegir por porcentaje"
    - "preferir el slice mínimo que responda una pregunta ejecutiva real"

daily_discount_boundary:

  mandatory: >
    Aunque el first slice elegido sea ventas, la readiness debe dejar auditado
    el camino exacto para descuento/kg y si comparte infraestructura o requiere
    slice independiente.

  rule: >
    No meter descuento/kg en el IMPL solo por similitud si aumenta demasiado el
    riesgo o el scope.

authz:

  required:
    - "planta actual"
    - "plantas_permitidas"
    - "roles actuales"
    - "fail-closed"
    - "no cross-plant"

  rule: >
    Daily pack no puede ampliar access respecto de monthly data.

absence_error_semantics:

  distinguish:
    - "0 real"
    - "null"
    - "día sin registros"
    - "día incompleto"
    - "SOURCE_RESTRICTED"
    - "DATA_NOT_FOUND"
    - "TOOL_ERROR"

  rule: >
    Día sin registros no debe convertirse automáticamente en venta cero.

reasoning_boundary:

  KEEP_DETERMINISTIC:
    - "fecha objetivo"
    - "reference period"
    - "valor observado"
    - "monto/kg"
    - "delta"
    - "weighted calculations"
    - "contributor arithmetic"
    - "provenance"
    - "authz"
    - "missing/error"

  LET_GPT_REASON:
    - "síntesis"
    - "qué llama la atención"
    - "relación con comments/actions"
    - "explicación narrativa"
    - "hipótesis etiquetadas"
    - "qué falta saber"
    - "preguntas de seguimiento"

  rule: >
    No programar causalidad ni recomendaciones rígidas.

contract_audit:

  inspect:
    - "Constitution"
    - "EKE"
    - "04 IES"
    - "05 Reasoning Engine"

  determine:
    - "G2"
    - "G3"
    - "si daily pack es runtime-only"

  rule: "No modificar contratos."

tests_to_design_if_ready:

  date:
    - "ayer correcto"
    - "timezone"
    - "día incompleto"

  sales:
    - "daily total"
    - "reference"
    - "delta"
    - "top contributors"
    - "contributors sum"
    - "null/missing"

  discount:
    - "weighted discount/kg"
    - "no average-of-averages"
    - "client contribution"

  evidence:
    - "comments related not causal"
    - "action coverage"
    - "unexplained contributor"

  conversation:
    - "¿por qué bajó ayer?"
    - "¿contra qué?"
    - "¿qué clientes?"
    - "¿sabemos por qué?"
    - "¿qué falta?"

  regression:
    - "monthly M9 preserved"
    - "financial_diagnosis preserved"
    - "plant_diagnosis preserved"
    - "conversation continuity preserved"
    - "persistent memory preserved"

readiness_output:

  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "exact first slice"
    - "daily sales source"
    - "daily discount source"
    - "date semantics"
    - "default reference"
    - "sales formula"
    - "discount/kg formula"
    - "decomposition dimensions"
    - "business evidence joins"
    - "information gap behavior"
    - "conversation integration"
    - "authz"
    - "G2/G3"
    - "percentage effect"
    - "deferred capabilities"

percentage_policy:
  before: "10.5 / 20 = 52.5%"
  after_readiness: "10.5 / 20 = 52.5%"
  expected_impl_effect: "0.0 pp"

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "tests changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "schema changes"
  - "new tables"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Daily sales source audited."
  - "Daily discount source audited."
  - "Yesterday semantics determined."
  - "Reference candidates compared."
  - "Exactly one default/reference policy determined."
  - "Mathematical decomposition audited."
  - "Weighted discount math audited."
  - "Business evidence layer audited."
  - "Information-gap layer audited."
  - "Conversation follow-ups audited."
  - "A/B/C/D compared."
  - "Exactly one first slice selected."
  - "G2/G3 determined."
  - "52.5% preserved."
  - "No implementation."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-DAILY-DEVIATION-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-DAILY-DEVIATION-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if READY/READY_WITH_LIMITS with one implementable first
  slice. STOPPED if a product/contract decision is required first. BLOCKED if
  a gate is missing.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-DEVIATION-READINESS-001.md