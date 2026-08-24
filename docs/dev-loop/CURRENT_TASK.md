# CURRENT_TASK

```yaml
task_id: "ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-24"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-24.
  Apruebo ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001
  y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A_PENDING_AUDIT
  G3_new_architecture_contract: N/A_PENDING_AUDIT
  G5_contract_conformance: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Auditar el first slice mínimo, seguro y físicamente soportado para que
  Director IA pueda responder preguntas como “¿por qué subió el descuento/kg
  ayer?”, construyendo un pack diario con descuento/kg ponderado, referencia
  comparable, contribución matemática por cliente, evidencia comercial
  relacionada y huecos de información, sin promediar ratios, sin inventar canal
  inexistente y sin convertir contribución matemática en causalidad.

baseline:
  global: "10.5 / 20 = 52.5%"
  percentage_effect: "0.0 pp"

  prior_audit:
    task: "AUDIT-DIRECTOR-IA-CONVERSATIONAL-PRODUCT-GAP-005"
    bottleneck: "daily discount/kg has physical data but no conversational pack"
    failure_class: "MISSING_INFRASTRUCTURE"

product_principle: >
  El código debe proteger fecha, unidades, ponderación, identidad, joins,
  referencia, contribuciones, provenance y authz. GPT debe conservar síntesis,
  explicación narrativa, identificación de evidencia relacionada y formulación
  de qué información falta.

primary_question:
  - "¿Por qué subió el descuento/kg ayer?"

required_followups:
  - "¿Contra qué lo estás comparando?"
  - "¿Fue general o fueron algunos clientes?"
  - "¿Quién movió más el promedio?"
  - "¿Sabemos por qué?"
  - "¿Qué falta saber?"
  - "¿Quién puede aclararlo?"

central_truth_rule: >
  Contribución matemática al cambio del descuento/kg != causa empresarial.

mandatory_physical_audit:

  daily_discount_source:
    inspect:
      - "arr.descuentos_diarios_cliente"
      - "columnas físicas"
      - "fecha"
      - "planta_id"
      - "cliente"
      - "cliente_key si existe o derivación canónica"
      - "monto"
      - "kg"
      - "otros campos realmente disponibles"

    determine:
      - "grain físico exacto"
      - "si hay una fila por cliente/día o múltiples"
      - "null semantics"
      - "qué representa monto"
      - "qué representa kg"
      - "timezone/date semantics"

  related_sales_or_kg_source:
    audit: >
      Confirmar si kg necesario para ponderar ya vive en la misma fuente o si
      requiere otra tabla/join físico. No asumir.

  channel:
    expected: "NOT AVAILABLE"
    requirement: >
      Confirmar físicamente que canal no existe en la fuente daily discount.
      No inventarlo ni reconstruirlo por nombre.

formula:

  plant_daily_discount_kg:
    exact: "SUM(monto) / SUM(kg)"

  rules:
    - "no average-of-averages"
    - "no AVG(cliente_ratio)"
    - "kg_total es denominador"
    - "monto_total es numerador"
    - "reference kg = 0 requiere handling explícito"
    - "null != 0"

  required_validation:
    - "comparar con fórmula vigente del producto/runtime"
    - "confirmar signo/unidad"
    - "confirmar pesos/MXN por kg si ésa es la unidad física"

date_semantics:

  timezone: "America/Mexico_City"
  target_day: "ayer calendario completo"

  rules:
    - "hoy no es día completo"
    - "día sin filas != descuento/kg 0"
    - "fecha objetivo explícita"
    - "no usar UTC del servidor como calendario de negocio"

reference_model:

  mandatory_candidates:

    A_previous_day:
      description: "día inmediatamente anterior"

    B_same_weekday_14d:
      description: "promedio ponderado de mismos días de semana en ventana 14 días"

    C_month_to_date:
      description: "ratio agregado MTD = SUM(monto MTD)/SUM(kg MTD)"

    D_recent_rolling:
      description: "ratio agregado de ventana reciente"

    E_existing_business_reference:
      description: "referencia ya usada físicamente por dashboard/ARR si existe"

  audit_each:
    - "meaning"
    - "availability"
    - "seasonality"
    - "weekday effect"
    - "days with missing rows"
    - "volume mix"
    - "number of observations"

  requirement: >
    Seleccionar exactamente una política default defendible para el first slice
    o demostrar que se requiere otra política. Siempre exponer la referencia.

  important: >
    Si se usa same-weekday, la referencia debe agregarse correctamente como
    SUM(monto_ref)/SUM(kg_ref), salvo que la semántica física exija otra fórmula.
    No promediar ratios diarios.

mathematical_decomposition:

  objective: >
    Determinar qué clientes contribuyeron matemáticamente al cambio del
    descuento/kg planta entre el target y su referencia.

  audit_required:
    - "cliente target monto/kg"
    - "cliente reference monto/kg"
    - "kg target"
    - "kg reference"
    - "cambio por condición de descuento"
    - "cambio por mix/participación si puede descomponerse defendiblemente"
    - "reconciliación al delta planta"

  critical_question: >
    ¿Puede existir una descomposición exacta/reconciliable del cambio del
    ponderado por cliente sin introducir una fórmula arbitraria?

  rules:
    - "cliente con ratio más alto != mayor contribuidor automáticamente"
    - "cliente con más kg puede mover más el ponderado"
    - "mix puede cambiar el promedio aunque ratio individual no cambie"
    - "no crear score"

  output_requirement: >
    Si puede reconciliarse físicamente, documentar fórmula exacta.
    Si no puede hacerse sin supuestos, limitar el first slice y declararlo.

mix_effect:

  mandatory_audit: true

  determine:
    - "si separar rate effect vs mix effect es físicamente defendible"
    - "si requiere baseline por cliente"
    - "si la suma reconcilia exactamente"
    - "si sería demasiado complejo para first slice"

  rule: >
    No implementar una descomposición económica sofisticada solo por elegancia.

business_evidence:

  sources_to_audit:
    - "commercial comments"
    - "DICF actions"

  join_rule:
    - "cliente_key únicamente"
    - "sin join por nombre libre"

  determine:
    - "fecha de comentario"
    - "acción abierta/vencida"
    - "responsable ligado a acción"
    - "evidence related, not causal"

  semantics:
    - "comentario que menciona competencia != prueba causal"
    - "acción != causa del descuento"
    - "responsable de acción != responsable del aumento"

information_gap:

  target_behavior: >
    El pack debe permitir que GPT identifique clientes/contribuidores relevantes
    sin explicación suficiente y diga qué dato falta.

  audit:
    - "cliente contribuidor sin comentario relacionado"
    - "cliente con acción"
    - "cliente sin acción"
    - "responsable físicamente ligado"
    - "qué dato comercial faltaría para explicar una concesión"

  rule: >
    No crear workflow ni recomendación rígida.

routing:

  audit:
    - "planner actual para descuento + ayer"
    - "delta_discount mensual"
    - "financial_diagnosis"
    - "natural follow-up inheritance"

  determine:
    - "nuevo intent requerido sí/no"
    - "si puede reutilizarse intent existente sin mezclar granularidad"
    - "precedencia daily vs monthly"

  principle: >
    Una pregunta explícitamente diaria no debe terminar en un pack mensual.

conversation_state:

  required:
    - "parent intent diario"
    - "active_date efímero"
    - "requery cada turno"
    - "follow-ups abiertos vía strategy B"

  no_cross_session_date_memory: true

authz:

  required:
    - "scope de planta actual"
    - "rol actual"
    - "plantas_permitidas"
    - "no cross-plant"
    - "fail-closed"

absence_error_semantics:

  distinguish:
    - "0 real"
    - "null"
    - "kg = 0"
    - "día sin registros"
    - "referencia sin observaciones"
    - "DATA_NOT_FOUND"
    - "SOURCE_RESTRICTED"
    - "TOOL_ERROR"

reasoning_boundary:

  KEEP_DETERMINISTIC:
    - "target date"
    - "reference"
    - "SUM(monto)"
    - "SUM(kg)"
    - "weighted ratio"
    - "customer identity"
    - "mathematical contribution if proven"
    - "authz"
    - "provenance"
    - "absence/error"

  LET_GPT_REASON:
    - "síntesis"
    - "qué clientes llaman la atención"
    - "qué evidencia podría estar relacionada"
    - "qué sigue sin explicación"
    - "qué información falta"
    - "follow-ups"

  prohibited:
    - "causalidad automática"
    - "recomendación comercial rígida"
    - "concluir que mayor descuento = culpable"

first_slice_candidates:

  A_daily_ratio_only:
    includes:
      - "ayer"
      - "reference"
      - "discount/kg delta"

  B_daily_ratio_plus_customer_comparison:
    includes:
      - "ratio"
      - "reference"
      - "clientes relevantes"

  C_daily_ratio_plus_reconciled_customer_contribution:
    includes:
      - "ratio"
      - "reference"
      - "contribution matemática por cliente"

  D_daily_discount_plus_business_evidence:
    includes:
      - "ratio"
      - "reconciled contribution"
      - "comments/actions"
      - "information gaps"

  requirement:
    - "comparar A/B/C/D"
    - "seleccionar exactamente un first slice"
    - "preferir el mínimo que sostenga la pregunta ejecutiva real"
    - "no seleccionar D si la matemática de contribución no está demostrada"

sales_daily_boundary:
  preserve: "daily_sales_deviation intacto"
  no_refactor_by_symmetry: true

tradeoff_boundary:
  status: "deferred"
  note: >
    Margen por cliente y oferta estructurada de competencia siguen faltando.

persistent_memory:
  preserve: true
  SQL017_execution: false

topic_return_gap:
  preserve_as_deferred: true
  no_fix_here: true

contract_audit:

  inspect:
    - "Constitution"
    - "EKE"
    - "04 IES"
    - "05 RE"

  determine:
    - "G2"
    - "G3"

  expectation: "runtime-only"

tests_to_design_if_ready:

  formula:
    - "SUM(monto)/SUM(kg)"
    - "no average-of-averages"
    - "kg zero"
    - "null"

  date:
    - "yesterday CDMX"
    - "today excluded"

  reference:
    - "selected reference exact formula"
    - "missing observations"

  decomposition:
    - "customer contribution"
    - "reconciliation"
    - "mix effect if selected"
    - "highest ratio != biggest mover"

  evidence:
    - "cliente_key only"
    - "comment != cause"
    - "action != cause"
    - "gap"

  conversation:
    - "¿por qué subió descuento/kg ayer?"
    - "¿contra qué?"
    - "¿quién movió más?"
    - "¿fue general?"
    - "¿sabemos por qué?"
    - "¿qué falta?"

  regression:
    - "daily sales"
    - "action-person routing"
    - "natural followup"
    - "persistent memory"
    - "plant/financial diagnosis"
    - "M9 monthly"
    - "full suite"

readiness_output:

  must_determine:
    - "READY / READY_WITH_LIMITS / NOT_READY"
    - "selected A/B/C/D"
    - "daily source"
    - "date semantics"
    - "formula"
    - "reference"
    - "customer contribution formula or limit"
    - "mix effect yes/no"
    - "business evidence"
    - "routing/intent"
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
    - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001.md"

  read_only:
    - "entire repository except writable files"

out_of_scope:
  - "implementation"
  - "code changes"
  - "test changes"
  - "matrix changes"
  - "contract changes"
  - "SQL execution"
  - "schema changes"
  - "new tables"
  - "tradeoff implementation"
  - "topic stack"
  - "commit"
  - "push"
  - "merge"

acceptance_criteria:
  - "Daily source physically audited."
  - "SUM(monto)/SUM(kg) confirmed or corrected from physical evidence."
  - "No average-of-averages."
  - "Yesterday semantics determined."
  - "Reference candidates compared."
  - "Exactly one reference policy selected."
  - "Customer contribution mathematically audited."
  - "Mix effect audited."
  - "Business evidence joins audited."
  - "Routing audited."
  - "A/B/C/D compared."
  - "Exactly one first slice selected."
  - "G2/G3 determined."
  - "52.5% preserved."
  - "No implementation."
  - "Only task + report changed."
  - "git diff --check clean."

next_task_policy:
  if_ready:
    propose_exactly_one: "IMPL-DIRECTOR-IA-DAILY-DISCOUNT-KG-001"

  if_not_ready:
    propose_exactly_one: "ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-GAP-001"

  rule: "Do not authorize or execute."

expected_terminal_state: >
  DONE_PENDING_REVIEW if READY/READY_WITH_LIMITS with an implementable slice.
  STOPPED if a product/contract decision is required.
  BLOCKED if a gate is missing.

max_attempts: 1

result_report_path: >
  docs/dev-loop/reports/ARCH-DIRECTOR-IA-DAILY-DISCOUNT-KG-READINESS-001.md