# CURRENT_TASK

```yaml
task_id: "IMPL-DIRECTOR-IA-M16-DUPLICADOS-001"
status: DONE_PENDING_REVIEW

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T21:38:25-06:00"
human_authorization: >
  AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21T21:38:25-06:00.
  Apruebo IMPL-DIRECTOR-IA-M16-DUPLICADOS-001 y autorizo G1.

result:
  report: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M16-DUPLICADOS-001.md"
  focal_tests: "17/17 pass"
  director_ia_suite: "416/416 pass"
  scripts: "capabilities 20/20; planner 28/28; orchestrator 19/19"
  m16_operational_complete_iff: true
  capability_matrix_updated: false
  next_task_authorized: false

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Implementar M16 — análisis read-only de posibles duplicados de folios —
  conectando el intent duplicate_folios y el tool get_duplicate_folios con
  ejecución real in-process sobre la lógica existente de duplicados, respetando
  scope/authz y preservando una semántica explícita de "posibles duplicados",
  sin mutaciones, sin HTTP interno, sin integración al cycle constitucional y
  sin UI nueva.

architecture_decision_in_force:
  source_task: "ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001"
  mode: "read_only"
  internal_http: false
  cycle_integration: false
  new_ui: false
  mutations: false
  semantics: "possible_duplicates_only"

baseline:
  module: "M16"
  module_name: "Análisis duplicados de folios"
  current_capability_state: "NOT_STARTED"
  current_m0_m20_percentage: 32.5
  target_capability_state_if_successful: "COMPLETE"
  potential_gain_if_complete_pp: 5.0
  target_m0_m20_percentage_if_complete: 37.5
  readiness_task: "ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001"
  can_reach_complete_in_one_read_only_slice: true

known_physical_evidence:
  - "findDuplicatePairs ya existe."
  - "GET /api/folios/duplicados/analisis ya existe."
  - "El intent duplicate_folios ya existe."
  - "El tool get_duplicate_folios ya está declarado."
  - "get_duplicate_folios actualmente tiene executor null."
  - >
    detectUnsupportedDirectorIaDomain corta actualmente duplicate_folios con
    SOURCE_NOT_INTEGRATED antes de OpenAI, contexto o ejecución de tools.
  - >
    El registry prohíbe executor mientras get_duplicate_folios permanezca
    declarado como not integrated.
  - >
    findDuplicatePairs usa un criterio heurístico: mismo importe redondeado más
    similitud de concepto >= 0.72.
  - >
    El resultado representa posibles duplicados/candidatos a duplicidad, no
    duplicados confirmados.
  - >
    El readiness eligió integración in-process y descartó HTTP interno.
  - "Cancelar folio no forma parte de este slice."

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M16-DUPLICADOS-001.md"
  - "implementación existente de findDuplicatePairs"
  - "intent duplicate_folios"
  - "detectUnsupportedDirectorIaDomain exclusivamente para duplicate_folios"
  - "tool get_duplicate_folios"
  - "tool registry Director IA"
  - "tool dispatcher Director IA"
  - "executors Director IA"
  - "loader/service read-only mínimo necesario para preservar authz/scope"
  - "evidencia estructurada de posibles duplicados"
  - "manejo de happy / empty / error"
  - "tests focales de duplicados"
  - "tests de intent/tool/executor"
  - "tests Director IA relevantes"

out_of_scope:
  - "cancelar folios"
  - "editar folios"
  - "cambiar estados de folios"
  - "marcar folios como resueltos"
  - "fusionar folios"
  - "borrar folios"
  - "INSERT sobre folios"
  - "UPDATE sobre folios"
  - "DELETE sobre folios"
  - "persistir decisiones de duplicidad"
  - "confirmar automáticamente un duplicado"
  - "clasificar automáticamente como fraude"
  - "crear endpoint HTTP nuevo"
  - "usar HTTP interno contra /api/folios/duplicados/analisis"
  - "integrar M16 al cycle constitucional"
  - "modificar el cycle constitucional"
  - "frontend nuevo"
  - "UI nueva"
  - "nueva tabla"
  - "SQL"
  - "migration"
  - "cambio de schema"
  - "modificar contratos arquitectónicos"
  - "modificar capability matrix"
  - "modificar otros módulos M0-M20"
  - "package.json"
  - "lockfiles"
  - "Render config"
  - "variables productivas"
  - "deploy manual"
  - "smoke productivo"
  - "commit"
  - "push"
  - "merge"
  - "ejecutar siguiente tarea"

semantic_invariants:
  - >
    findDuplicatePairs es heurístico y no autoriza afirmar que un par de folios
    sea un duplicado confirmado.
  - >
    El lenguaje permitido debe utilizar "posible duplicado", "posibles
    duplicados", "candidato a duplicidad" o una formulación semánticamente
    equivalente.
  - >
    Un score o threshold de similitud no debe convertirse en certeza.
  - "No afirmar fraude a partir del análisis de duplicidad."
  - "No afirmar intención del usuario que creó el folio."
  - "No afirmar error humano como hecho si la evidencia no lo demuestra."
  - "No mutar folios."
  - "No resolver duplicados automáticamente."
  - "No recomendar una mutación automática como conclusión del tool."
  - >
    Empty significa que no se encontraron candidatos bajo los criterios
    aplicados; no demuestra que sea imposible que existan duplicados.
  - >
    Error de fuente/tool no puede convertirse en respuesta de negocio ni en
    afirmación de que no existen duplicados.

required_flow:
  - "pregunta del usuario"
  - "detección de intent duplicate_folios"
  - "duplicate_folios deja de caer en SOURCE_NOT_INTEGRATED"
  - "routing normal de Director IA"
  - "tool get_duplicate_folios"
  - "executor read-only"
  - "loader/service in-process"
  - "fuente real de folios respetando scope/authz"
  - "findDuplicatePairs"
  - "evidencia estructurada"
  - "respuesta Director IA con semántica de posibles duplicados"

implementation_requirements:

  unsupported_domain_gate:
    - >
      Ajustar exclusivamente el corte que hoy realiza
      detectUnsupportedDirectorIaDomain para que duplicate_folios deje de
      responder SOURCE_NOT_INTEGRATED una vez que la capacidad esté realmente
      conectada.
    - "No habilitar accidentalmente otros dominios."
    - "Otros dominios no integrados deben conservar su comportamiento actual."
    - >
      No eliminar globalmente la protección SOURCE_NOT_INTEGRATED para resolver
      M16.

  tool_registry:
    - "get_duplicate_folios debe dejar de tener executor null."
    - >
      Ajustar únicamente la condición/metadata declared_not_integrated necesaria
      para reflejar que M16 ya está integrado.
    - >
      Mantener las invariantes del registry para todos los demás tools.
    - "No habilitar executors de tools ajenos a M16."

  executor:
    - "Debe ser estrictamente read-only."
    - "Debe ejecutarse in-process."
    - "No debe realizar HTTP interno."
    - "Debe reutilizar la lógica existente de duplicados."
    - "No debe duplicar findDuplicatePairs."
    - >
      Debe reutilizar o extraer el mínimo loader/service necesario para preservar
      el mismo scope/authz que protege el análisis existente.
    - "Debe manejar happy path."
    - "Debe manejar empty."
    - "Debe manejar error de fuente de forma fail-safe."
    - "Debe devolver evidencia estructurada."
    - "No debe realizar escrituras."
    - "No debe llamar endpoints de cancelación."
    - "No debe cambiar estados de folios."

  source_reuse:
    - >
      Preferir reutilización directa de findDuplicatePairs y de la capa
      read-only que carga los folios autorizados.
    - >
      Si el handler HTTP existente mezcla carga/authz con transporte HTTP,
      extraer únicamente la mínima función reutilizable necesaria sin cambiar
      contratos externos.
    - >
      No copiar y pegar queries o lógica de duplicidad si pueden reutilizarse
      desde una unidad existente.
    - >
      Mantener sin cambios observables el endpoint
      GET /api/folios/duplicados/analisis salvo que una extracción interna
      puramente refactor preserve exactamente su contrato.

  scope_authz:
    - >
      Preservar el mismo scope y autorización que aplica el análisis existente.
    - >
      No permitir que un executor directo salte restricciones que actualmente
      impone el handler/service existente.
    - "No ampliar visibilidad de plantas."
    - "No ampliar visibilidad de folios."
    - "No inventar un scope nuevo."
    - >
      Utilizar contexto Director IA existente cuando ya contenga planta,
      identidad o autorización necesaria.
    - >
      Si durante la implementación se descubre que no puede preservarse authz
      sin una decisión arquitectónica nueva, detener la tarea.

  duplicate_algorithm:
    - "Reutilizar findDuplicatePairs."
    - "No alterar threshold 0.72 en esta tarea."
    - "No recalibrar el algoritmo."
    - "No cambiar el criterio de mismo importe redondeado."
    - >
      No introducir nuevas señales heurísticas sin una tarea de arquitectura o
      calibración separada.
    - >
      La implementación de integración no debe convertirse en una modificación
      material del algoritmo de duplicidad.

  output:
    - "cantidad de pares/candidatos encontrados"
    - "identificadores de los folios necesarios para sustentar la respuesta"
    - "evidencia/campos relevantes que ya soporte la lógica existente"
    - "similitud/score si existe físicamente en el resultado"
    - "criterio aplicable sin inventar metadata"
    - "scope/filtros aplicados cuando estén disponibles"
    - "empty explícito"
    - "error estructurado/fail-safe"
    - >
      El output debe ser suficiente para que la capa de respuesta no necesite
      inventar por qué dos folios fueron considerados candidatos.

  response_semantics:
    - >
      Expresar los hallazgos como posibles duplicados detectados mediante los
      criterios del análisis.
    - >
      Si se expone el criterio, describirlo de forma fiel al algoritmo real.
    - "No afirmar confirmación humana."
    - "No afirmar fraude."
    - "No afirmar que uno de los dos folios deba cancelarse."
    - "No recomendar cancelación automática."
    - >
      Si no hay resultados, indicar únicamente que no se encontraron candidatos
      bajo los criterios aplicados.
    - >
      Si falla la fuente, utilizar el manejo de error/abstención existente y no
      presentar cero duplicados.

  cycle:
    - "No integrar M16 al cycle constitucional."
    - "No modificar OP/EB/EKS/IES/RE/CP para satisfacer M16."
    - >
      La capacidad M16 se completa mediante tool conversacional read-only según
      la decisión del readiness.

  frontend:
    - "No crear UI nueva."
    - >
      Utilizar la superficie Director IA existente para presentar la capacidad.
    - >
      No crear tabla, panel o dashboard de duplicados como parte de este slice.

  contracts:
    - "No crear contrato arquitectónico nuevo."
    - "No modificar contratos existentes."
    - >
      Si el código demuestra que el contrato existente es insuficiente y se
      requiere uno nuevo, STOP y reportar G3 REQUIRED.

tests_required:

  intent_and_gate:
    - "duplicate_folios se detecta como antes."
    - >
      duplicate_folios ya no termina en SOURCE_NOT_INTEGRATED una vez integrado.
    - >
      al menos un dominio que siga no integrado conserva
      SOURCE_NOT_INTEGRATED.
    - >
      el cambio de gate no debe habilitar dominios adicionales.

  registry:
    - "get_duplicate_folios tiene executor real."
    - "registry acepta el tool integrado."
    - >
      invariantes de tools no integrados continúan funcionando.

  executor_happy:
    - "ejecuta fuente real/read-only mediante dependencia controlable en test"
    - "reutiliza findDuplicatePairs"
    - "devuelve evidencia estructurada"
    - "conserva semántica de posible duplicidad"

  executor_empty:
    - "lista vacía / cero candidatos"
    - "no se interpreta como error"
    - >
      no produce una afirmación más fuerte que 'no se encontraron candidatos
      bajo los criterios aplicados'

  executor_error:
    - "error de fuente"
    - "error fail-safe"
    - "no se convierte en empty"
    - "no produce afirmación de negocio falsa"

  authz_scope:
    - "scope requerido se transmite/preserva"
    - "no se amplía planta/visibilidad"
    - >
      incluir test de aislamiento/cross-scope si la implementación física
      existente dispone de esa restricción.

  semantics:
    - >
      la evidencia/respuesta usa posible duplicado o semántica equivalente.
    - "no contiene afirmación de duplicado confirmado cuando no corresponde."
    - "no contiene inferencia automática de fraude."

  no_mutation:
    - "ninguna ruta de cancelación se invoca"
    - "ningún UPDATE/DELETE/INSERT se introduce"
    - "ningún cambio de estado forma parte del executor"

  no_internal_http:
    - >
      el executor no hace fetch/HTTP contra
      /api/folios/duplicados/analisis.
    - "la integración es in-process"

  cycle_regression:
    - "cycle constitucional relevante permanece verde"
    - "no se añade M16 al cycle"

  relevant_suite:
    - >
      ejecutar tests focales nuevos/modificados y la suite Director IA relevante
      disponible en el repositorio.
    - >
      registrar comandos exactos, número de tests, pass y fail en el reporte.

definition_of_complete:
  statement: >
    M16 = COMPLETE IFF get_duplicate_folios posee ejecución read-only real
    accesible desde Director IA, consulta la fuente real de folios reutilizando
    findDuplicatePairs, preserva el scope/authz requerido, devuelve evidencia
    estructurada de posibles duplicados, maneja correctamente happy/empty/error,
    no convierte la heurística en certeza, no requiere mutaciones, no utiliza
    HTTP interno y los tests focales e integración relevantes están verdes.

  iff:
    - "get_duplicate_folios tiene executor real"
    - "duplicate_folios alcanza el tool integrado"
    - "SOURCE_NOT_INTEGRATED deja de aplicar a M16"
    - "otros dominios no integrados continúan bloqueados"
    - "consulta fuente real"
    - "findDuplicatePairs es reutilizado"
    - "scope/authz se preserva"
    - "devuelve evidencia estructurada"
    - "happy funciona"
    - "empty funciona"
    - "error funciona fail-safe"
    - "heurística no se convierte en certeza"
    - "no afirma fraude"
    - "no realiza mutaciones"
    - "no utiliza HTTP interno"
    - "no requiere UI nueva"
    - "no requiere integración al cycle"
    - "tests focales verdes"
    - "suite Director IA relevante verde"

acceptance_criteria:
  - "M16 funciona end-to-end como capacidad read-only."
  - "findDuplicatePairs es reutilizado."
  - "No existe HTTP interno."
  - "No existe endpoint nuevo."
  - "No existe UI nueva."
  - "No existe integración M16 al cycle."
  - "No existen mutaciones."
  - "Authz/scope se preserva."
  - "La respuesta representa posibles duplicados, no confirmados."
  - "Happy/empty/error están cubiertos."
  - "SOURCE_NOT_INTEGRATED se retira únicamente para M16."
  - "Otros dominios permanecen protegidos."
  - "Tests focales verdes."
  - "Suite Director IA relevante verde."
  - "git diff --check limpio."
  - "Scope de archivos respetado."
  - "Reporte de implementación creado."
  - >
    El resultado deja evidencia suficiente para una tarea documental posterior
    que pueda decidir el cambio de M16 NOT_STARTED a COMPLETE; esta tarea no
    modifica por sí misma la capability matrix.

verification:
  required:
    - "ejecutar tests focales de M16"
    - "ejecutar tests relevantes de Director IA"
    - "git diff --check"
    - "git status"

  report:
    - "comandos ejecutados"
    - "tests totales"
    - "pass"
    - "fail"
    - "archivos modificados"
    - "confirmación de ausencia de mutaciones"
    - "confirmación de ausencia de HTTP interno"
    - "confirmación de ausencia de cambios al cycle"
    - "confirmación de ausencia de UI nueva"

stop_conditions:
  - >
    Si para completar M16 hace falta cancelar, editar, resolver o mutar folios,
    STOP.
  - "Si hace falta arquitectura nueva, STOP y reportar G2 REQUIRED."
  - "Si hace falta contrato arquitectónico nuevo, STOP y reportar G3 REQUIRED."
  - "Si aparece materia que requiera G8, STOP."
  - >
    Si no puede preservarse authz/scope mediante la arquitectura existente,
    STOP.
  - "Si hace falta endpoint nuevo, STOP."
  - "Si hace falta HTTP interno, STOP."
  - "Si hace falta integrar M16 al cycle, STOP."
  - "Si hace falta UI nueva para satisfacer la definición canónica, STOP."
  - "Si hace falta migration/schema/SQL, STOP."
  - >
    Si el único camino requiere modificar materialmente findDuplicatePairs o
    recalibrar su heurística, STOP y separar esa decisión.
  - >
    Si aparece cualquier cambio fuera del scope necesario, no ampliarlo
    silenciosamente.

report_requirements:
  path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M16-DUPLICADOS-001.md"
  must_include:
    - "resumen ejecutivo"
    - "autorización y gates"
    - "baseline"
    - "arquitectura implementada"
    - "mapa end-to-end final"
    - "gap anterior"
    - "cambio realizado"
    - "archivos modificados"
    - "loader/service utilizado"
    - "findDuplicatePairs reutilizado"
    - "scope/authz"
    - "tool/executor"
    - "unsupported-domain gate"
    - "evidencia estructurada"
    - "semántica"
    - "happy/empty/error"
    - "tests y resultados"
    - "regresiones verificadas"
    - "confirmación no HTTP interno"
    - "confirmación no mutaciones"
    - "confirmación no cycle"
    - "confirmación no UI"
    - "definition_of_complete evaluada punto por punto"
    - "riesgos residuales"
    - "acciones no realizadas"
    - "git diff --check"
    - "git status"

final_scope_rule: >
  Modifica únicamente los archivos de código, tests y documentación
  estrictamente necesarios para implementar M16 conforme a
  ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001. No aproveches la tarea para
  refactors, limpieza general o cambios adyacentes.

expected_terminal_state: >
  DONE_PENDING_REVIEW si M16 queda integrado end-to-end como análisis
  read-only de posibles duplicados, con authz/scope preservado, semántica
  correcta y tests verdes. STOPPED/BLOCKED si aparece cualquiera de las
  stop_conditions.

max_attempts: 1

next_task_policy:
  - "No abrir automáticamente otra tarea."
  - "No modificar la capability matrix en esta implementación."
  - >
    Si M16 satisface COMPLETE IFF, registrar únicamente que queda elegible para
    sincronización documental posterior.
  - "No autorizar ninguna tarea posterior."

result_report_path: "docs/dev-loop/reports/IMPL-DIRECTOR-IA-M16-DUPLICADOS-001.md"
```

## Reglas de ejecución

Ejecutar estrictamente esta tarea y nada más.

La autorización humana válida es:

- `HUMAN_APPROVER`
- `2026-08-21T21:38:25-06:00`
- G1 `AUTHORIZED`
- G2 `N/A`
- G3 `N/A`
- G8 `N/A`

La decisión arquitectónica de
`ARCH-DIRECTOR-IA-M16-DUPLICADOS-READINESS-001` está en vigor.

### Invariante principal

M16 es una capacidad de **análisis read-only de posibles duplicados**.

El algoritmo existente es heurístico. La integración no debe transformar una
coincidencia heurística en una afirmación de duplicado confirmado.

### Implementación esperada

El camino objetivo es:

`pregunta`
→ `duplicate_folios`
→ `get_duplicate_folios`
→ `executor read-only`
→ `loader/service in-process`
→ `findDuplicatePairs`
→ `evidencia estructurada`
→ `respuesta Director IA`

No usar HTTP interno.

No integrar al cycle constitucional.

No crear UI.

No mutar folios.

### Prohibiciones

No cancelar folios.

No modificar folios.

No cambiar estados.

No resolver automáticamente duplicados.

No crear endpoint nuevo.

No crear migration.

No modificar SQL/schema.

No modificar contratos arquitectónicos.

No modificar la capability matrix.

No ampliar el scope de esta tarea.

### Cierre

Al terminar:

1. Ejecutar los tests focales.
2. Ejecutar la suite Director IA relevante.
3. Ejecutar `git diff --check`.
4. Ejecutar `git status`.
5. Crear el reporte definido.
6. Actualizar este archivo con los resultados reales.
7. Si todos los criterios se cumplen, usar `status = DONE_PENDING_REVIEW`.
8. No hacer commit.
9. No hacer push.
10. No hacer merge.
11. No ejecutar ni autorizar una siguiente tarea.

STOP.