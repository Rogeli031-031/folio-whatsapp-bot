# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-23"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-23.
  Apruebo IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001 y autorizo G1.

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar un expediente comercial factual read-only por cliente para M11,
  reuniendo estado comercial, comentarios almacenados, acciones DICF,
  historial de las acciones y resultado_cierre cuando existan, únicamente
  después de resolver de forma inequívoca un cliente dentro de una planta
  autorizada y sin inferir causalidad, motivo, solución, efectividad o
  responsabilidades no observadas.

baseline:
  readiness_task: "ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001"
  readiness_report: "docs/dev-loop/reports/ARCH-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-READINESS-001.md"

  module: "M11 — DICF"
  state_before: "PARTIAL"
  state_after: "PARTIAL"

  global:
    numerator_before: 10.0
    denominator: 20
    percentage_before: 50.0
    numerator_after: 10.0
    percentage_after: 50.0
    gain_pp: 0.0

readiness_findings:
  client_identity:
    canonical_runtime_key: "planta_id + cliente_key"

    dicf_actions:
      cliente_key: "NOT NULL"
      construction: "buildClienteKey"

    commercial_state:
      cliente_key_persisted: false
      rule: >
        Derivar únicamente con la misma función/canonización físicamente usada
        por el runtime actual para relacionar acciones abiertas.

    comments:
      cliente_key: "nullable"
      rule: >
        Solo incluir comentarios con cliente_key utilizable y coincidente.
        Comentarios sin clave no se unen por nombre libre.

    entities:
      cliente_key: false
      rule: >
        Entidades comerciales sirven para resolución, no constituyen por sí
        mismas una clave física de join.

    action_history:
      relation: "por acción"

    resultado_cierre:
      relation: "por acción"

  resolution:
    rule: >
      El expediente solo se construye después de resolver exactamente un cliente.
      Ambigüedad => clarificación. No seleccionar silenciosamente un candidato.

  select_only:
    critical_rule: >
      No reutilizar loadCommercialStateForChat tal cual si su path ejecuta
      computeDicf con escritura de caché.

    allowed_strategy:
      - "lectura directa SELECT-only de fuente materializada existente"
      - "arr.dicf_cliente_mes si corresponde físicamente"
      - "helper nuevo SELECT-only que reproduzca solo la lectura necesaria"

    forbidden:
      - "computeDicf si persiste/cachea"
      - "writes indirectos"
      - "HTTP interno"

architecture:
  intent: "expediente_comercial"

  do_not_reuse_as_intent:
    - "client_analysis"

  reason: >
    client_analysis arrastra bitácora y no representa la semántica del
    expediente comercial factual.

  preferred_path: >
    expediente_comercial
    -> get_commercial_dossier
    -> loadCommercialDossierForChat
    -> resolver cliente único
    -> autorizar planta
    -> leer commercial state SELECT-only
    -> leer comentarios por cliente_key
    -> leer acciones DICF por cliente_key
    -> leer historial/cierre por action id
    -> recorte determinista
    -> evidencia estructurada separada
    -> respuesta

source_rules:
  commercial_state:
    requirements:
      - "SELECT-only"
      - "planta"
      - "periodo observado"
      - "estado/categoría física"
      - "cliente_key derivado con canonización existente"

  comments:
    requirements:
      - "cliente_key coincidente"
      - "planta coincidente"
      - "texto almacenado"
      - "autor almacenado si existe"
      - "timestamp si existe"

    forbidden:
      - "join por nombre"
      - "comentarios con cliente_key null unidos heurísticamente"

  actions:
    source: "arr.dicf_acciones"

    requirements:
      - "planta_id"
      - "cliente_key"
      - "action id"
      - "acción"
      - "responsable"
      - "fecha"
      - "estatus"
      - "resultado_cierre si existe"

  history:
    rule: >
      Cargar únicamente historial físicamente relacionado con las acciones
      seleccionadas. No unir historial directamente al cliente si la relación
      física es action -> history.

context_limits:
  clients: 1
  comments: 8
  chars_per_comment: 500
  actions: 8
  history_events: 8

  rules:
    - "recorte determinista"
    - "orden temporal explícito"
    - "truncation explícito para texto recortado"
    - "no completar texto"
    - "no ampliar límites silenciosamente"

semantic_invariants:
  - "estado comercial != causa"
  - "comentario != motivo probado"
  - "comentario != diagnóstico validado"
  - "acción DICF != solución demostrada"
  - "acción cerrada != acción exitosa"
  - "resultado_cierre != impacto causal"
  - "responsable de acción != responsable del desempeño comercial"
  - "cronología != causalidad"
  - "correlación != causalidad"
  - "cliente_key derivado != cliente_key persistido"
  - "comentario sin cliente_key no se une por nombre"

response_policy:
  allowed_language:
    - "estado observado"
    - "comentario registrado"
    - "acción registrada"
    - "historial registrado"
    - "resultado de cierre registrado"
    - "antes/después temporal cuando las fechas lo soporten"

  forbidden_language_without_explicit_evidence:
    - "la causa fue"
    - "esto provocó"
    - "el responsable de la caída es"
    - "la acción resolvió"
    - "la acción fue efectiva"
    - "el comentario demuestra"
    - "gracias a esta acción"

authz:
  model: "DICF / commercial state vigente"

  required:
    - "JWT/contexto"
    - "rol"
    - "planta_id"
    - "plantas_permitidas"
    - "cross-planta bloqueado"
    - "fail-closed"
    - "GA/GV según reglas vigentes del dominio"

  ordering:
    - "resolver solicitud/planta"
    - "autorizar"
    - "resolver cliente"
    - "consultar expediente"

  rule: >
    Ninguna consulta de datos de otra planta puede ocurrir antes de confirmar
    autorización.

planner:
  required:
    - "agregar expediente_comercial"
    - "detectar preguntas de expediente integral por cliente"
    - "preservar commercial_state"
    - "preservar dicf_focused"
    - "preservar client_analysis"
    - "preservar Action Register"
    - "no absorber consultas de listas comerciales"

  example_intents:
    positive:
      - "Dame el expediente comercial de Cliente X"
      - "¿Qué está pasando con Cliente X y qué acciones tenemos?"
      - "Muéstrame estado, comentarios y acciones de Cliente X"
      - "¿Qué sabemos comercialmente de Cliente X?"

    negative:
      - "¿Qué clientes dejaron de comprar?"
      - "¿Qué clientes aumentaron?"
      - "¿Qué acciones están vencidas?"
      - "¿Qué dice la bitácora de Cliente X?"

tools:
  tool_name: "get_commercial_dossier"

  required_inputs:
    - "planta_id"
    - "referencia del cliente resoluble"

  executor:
    required: true

  execution:
    - "in-process"
    - "SELECT-only"

capabilities:
  required:
    - "registrar capacidad real del expediente"
    - "tool executable"
    - "M11 permanece PARTIAL"

evidence:
  required_sections:
    - "client_identity"
    - "commercial_state"
    - "comments"
    - "dicf_actions"
    - "action_history"
    - "close_result"

  source_labels:
    required: true

  rule: >
    Mantener procedencia por componente para impedir que el modelo mezcle
    comentario, estado y acción como si fueran un mismo hecho.

zero_data_semantics:
  commercial_state: >
    Ausencia de estado no implica cliente inactivo ni pérdida.

  comments: >
    0 comentarios significa que no se encontraron comentarios enlazables con la
    clave disponible; no significa que nadie haya comentado jamás.

  actions: >
    0 acciones significa que no se encontraron acciones DICF para la clave
    consultada; no significa que no exista ningún seguimiento fuera de DICF.

  history: >
    0 eventos significa que no se encontraron eventos físicos para las acciones
    seleccionadas.

  close_result: >
    Ausencia de resultado_cierre no debe reinterpretarse.

tests_required:
  focal:
    - "intent expediente_comercial"
    - "tool executable"
    - "executor"
    - "cliente único"
    - "cliente ambiguo -> clarificación"
    - "cliente inexistente"
    - "commercial state"
    - "cliente_key derivado correctamente"
    - "comentarios por cliente_key"
    - "comentario cliente_key null excluido"
    - "no join comentarios por nombre"
    - "acciones por planta_id + cliente_key"
    - "historial por action id"
    - "resultado_cierre por acción"
    - "1 cliente máximo"
    - "8 comentarios máximo"
    - "500 chars comentario"
    - "truncation explícito"
    - "8 acciones máximo"
    - "8 eventos historial máximo"
    - "0 comentarios"
    - "0 acciones"
    - "0 historial"
    - "nulls"
    - "orden temporal"
    - "planta autorizada"
    - "planta no autorizada"
    - "plantas_permitidas"
    - "cross-planta"
    - "GA/GV"
    - "no causalidad"
    - "no motivo inferido"
    - "no solución inferida"
    - "no responsable inferido"
    - "no client_analysis hijack"
    - "listas comerciales preservadas"
    - "dicf_focused preservado"
    - "sin computeDicf con write/cache"
    - "sin HTTP interno"
    - "sin writes"

  regression:
    - "capabilities"
    - "planner"
    - "tool orchestrator"
    - "suite Director IA completa"

implementation_constraints:
  - "No modificar schema."
  - "No crear migration."
  - "No crear tabla."
  - "No modificar contratos arquitectónicos."
  - "No modificar frontend."
  - "No HTTP interno."
  - "No writes."
  - "No persistir cache."
  - "No usar computeDicf si escribe."
  - "No joins heurísticos."

in_scope:
  writable:
    - "docs/dev-loop/CURRENT_TASK.md"
    - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001.md"
    - "lib/director-ia-capabilities.js"
    - "lib/director-ia-chat.js"
    - "lib/director-ia-planner.js"
    - "lib/director-ia-tools.js"
    - "lib/director-ia-m11-commercial-dossier.js"
    - "scripts/test-director-ia-capabilities.js"
    - "scripts/test-director-ia-planner.js"
    - "scripts/test-director-ia-tool-orchestrator.js"
    - "test/director-ia-m11-commercial-dossier.test.js"

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
  - "docs/director-ia/**"
  - "capability matrix"
  - "server.js"
  - "frontend"
  - "SQL/schema/migrations"
  - "writes"
  - "cache writes"
  - "HTTP interno"
  - "Plaud"
  - "M2"
  - "PDF/S3"
  - "bitácora dentro del expediente"
  - "Action Register"
  - "inferencias causales"
  - "commit"
  - "push"
  - "merge"
  - "sync documental"
  - "NEXT_TASK"

acceptance_criteria:
  - "Existe intent expediente_comercial."
  - "Existe tool get_commercial_dossier ejecutable."
  - "Existe loader dedicado loadCommercialDossierForChat."
  - "Cliente se resuelve de forma única."
  - "Ambigüedad clarifica."
  - "Authz ocurre antes de consultar expediente."
  - "Estado comercial se obtiene SELECT-only."
  - "No se usa path con computeDicf que persista cache."
  - "cliente_key comercial se deriva con canonización física existente."
  - "Comentarios solo se unen por cliente_key válido."
  - "No join por nombre libre."
  - "Acciones se unen por planta_id + cliente_key."
  - "Historial/cierre se unen por acción."
  - "Límites 1/8/500/8/8 respetados."
  - "Truncation explícito."
  - "Evidencia conserva procedencia."
  - "No se infiere causalidad."
  - "No se infiere motivo."
  - "No se infiere solución."
  - "No se infiere responsable de desempeño."
  - "Routing existente preservado."
  - "No HTTP interno."
  - "No writes."
  - "M11 permanece PARTIAL."
  - "10.0/20 = 50.0% permanece."
  - "Tests focales verdes."
  - "Regresión completa verde."
  - "git diff --check limpio."
  - "Solo archivos autorizados modificados."

required_validation:
  - "node --test test/director-ia-m11-commercial-dossier.test.js"
  - "node scripts/test-director-ia-capabilities.js"
  - "node scripts/test-director-ia-planner.js"
  - "node scripts/test-director-ia-tool-orchestrator.js"
  - "node --test test/director-ia-*.test.js"
  - "git diff --check"
  - "git status"

next_task_policy:
  if_success:
    propose_exactly_one: "DOCS-DIRECTOR-IA-M11-COMMERCIAL-DOSSIER-SYNC-001"

  rule: >
    No continuar profundizando M11 por inercia. La sync posterior documenta el
    expediente manteniendo M11 PARTIAL y 50.0%.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001.md"

  must_include:
    - "metadata"
    - "resumen ejecutivo"
    - "archivos modificados"
    - "path físico"
    - "resolución cliente"
    - "authz"
    - "commercial state"
    - "cliente_key derivado"
    - "comments"
    - "dicf actions"
    - "history"
    - "resultado_cierre"
    - "context limits"
    - "truncation"
    - "source provenance"
    - "semantic boundaries"
    - "routing preservation"
    - "SELECT-only evidence"
    - "no computeDicf write/cache"
    - "tests"
    - "M11 state"
    - "percentage"
    - "gates"
    - "acciones no realizadas"
    - "secrets_check"
    - "git diff --check"
    - "git status"
    - "NEXT_TASK"

expected_terminal_state: >
  DONE_PENDING_REVIEW si el expediente comercial factual queda integrado
  SELECT-only, in-process, autorizado y sin inferencias causales. STOPPED si
  aparece una contradicción física respecto de la readiness. BLOCKED si falta
  un gate indispensable.

max_attempts: 1

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M11-EXPEDIENTE-COMERCIAL-001.md"