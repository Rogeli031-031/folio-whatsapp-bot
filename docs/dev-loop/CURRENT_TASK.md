# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-EKS-INTEGRATION-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15T19:57:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A

objective: >
  Integrar de forma mínima y controlada el runtime ya implementado del
  Executive Knowledge Store (EKS) con la infraestructura de ejecución del
  producto, conforme a docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md v1.2,
  sin conectar todavía productores de Knowledge Bundle, chat, dashboard,
  Evidence Builder ni otros módulos de Director IA.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EKS-INTEGRATION-001.md"

  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md (solo lectura)"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md (solo lectura)"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md (solo lectura)"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md (solo lectura)"

  - "lib/director-ia-eks.js"
  - "server.js"
  - "package.json"
  - ".env.example"

  - "sql/015_director_ia_eks.sql (solo lectura salvo corrección estrictamente necesaria para integración)"
  - "scripts/apply-director-ia-eks-schema.js (solo lectura salvo corrección estrictamente necesaria para integración)"
  - "test/director-ia-eks.test.js"
  - "test/director-ia-eks-integration.test.js"

out_of_scope:
  - "modificar cualquier contrato en docs/director-ia/"
  - "modificar la Constitución"
  - "modificar 03B"
  - "modificar 04-IES-STANDARD.md"
  - "modificar 05-REASONING-ENGINE.md"
  - "modificar 06-CHANNEL-PROJECTION.md"

  - "implementar Evidence Builder"
  - "implementar Observation Pipeline"
  - "implementar IES Builder"
  - "implementar Reasoning Engine"
  - "implementar Channel Projection"

  - "hacer que chat o dashboard escriban directamente en EKS"
  - "crear endpoints públicos de EKS"
  - "crear comandos WhatsApp para EKS"
  - "leer ARR, IGF, folios, bitácora u otras tablas operacionales como conocimiento"
  - "crear Knowledge Bundles desde fuentes productivas"
  - "persistir datos productivos durante las pruebas"

  - "añadir LLM o IA dentro de EKS"
  - "recalcular confidence, materiality, coverage, facts, evidence o diagnosis"
  - "mutar Knowledge Bundles"
  - "usar UPDATE o DELETE sobre Knowledge Snapshots"
  - "usar ON CONFLICT DO UPDATE sobre Knowledge Snapshots"

  - "cambiar las decisiones físicas D1-D9"
  - "cambiar el algoritmo criptográfico a nivel contractual"
  - "modificar meta-protocolo"

  - "commit"
  - "push"
  - "merge"
  - "encadenar siguiente tarea"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

approved_physical_decisions:
  D1_persistence_engine_colocation: "P1"
  D2_snapshot_representation: "R3"
  D3_versioning_concurrency: "V2 + UNIQUE(trace_id, version)"
  D4_get_snapshot_semantics: "G_LATEST"
  D5_list_versions_grouping: "L_TRACE"
  D6_migration_strategy: "M1"
  D7_integrity: "I_DIGEST"
  D8_connection_pool: "POOL_DEDICATED"
  D9_implementation_order: "O_EKS_FIRST"

integration_goal:
  - "hacer disponible EKS como servicio interno del runtime"
  - "usar configuración existente de DATABASE_URL sin duplicar secretos"
  - "mantener pool dedicado lógico para EKS"
  - "permitir inicialización y cierre controlados del pool EKS"
  - "no producir Knowledge Bundles en esta tarea"
  - "no persistir Snapshots automáticamente desde ningún flujo de negocio"
  - "no exponer EKS directamente a usuarios o canales"

required_behavior:
  - "el runtime principal puede inicializar el servicio EKS de forma explícita"
  - "la ausencia de configuración requerida debe fallar de forma controlada o dejar EKS deshabilitado según el patrón existente del producto"
  - "el pool EKS debe ser independiente del pool operacional existente"
  - "no debe abrirse un pool por request"
  - "debe existir cierre limpio del pool al finalizar el proceso cuando corresponda"
  - "la integración no altera validate_structure, append_snapshot, get_snapshot ni list_versions"
  - "la integración no cambia semántica append-only"
  - "la integración no escribe ningún Snapshot por sí sola"
  - "la integración debe conservar compatibilidad con ENABLE_DIRECTOR_IA cuando corresponda al patrón existente"
  - "ningún secreto debe quedar hardcodeado"

implementation_rules:
  - "reutilizar patrones existentes solo cuando sean compatibles con contrato 03"
  - "mantener EKS aislado de las tablas operacionales"
  - "no introducir dependencias nuevas salvo necesidad técnica estricta y documentada"
  - "no modificar el schema contractual del Knowledge Snapshot"
  - "no modificar D1-D9"
  - "no convertir EKS en singleton global mutable si eso rompe aislamiento o pruebas"
  - "preferir inicialización explícita y testeable"
  - "la integración debe ser reversible y de mínimo alcance"
  - "si la integración requiere una nueva decisión arquitectónica no cubierta por 03 v1.2 o D1-D9: BLOCKED + reporte + STOP"

tests_required:
  - "mantener pasando test/director-ia-eks.test.js"
  - "crear pruebas específicas de integración"
  - "probar inicialización del servicio EKS sin conectar fuentes productivas"
  - "probar que se utiliza un pool dedicado"
  - "probar que no se crea un pool nuevo por operación"
  - "probar cierre controlado del pool"
  - "probar comportamiento cuando EKS está deshabilitado o falta configuración, según patrón real del runtime"
  - "probar que integrar EKS no dispara append_snapshot automáticamente"
  - "probar que chat/dashboard no quedan acoplados al EKS"
  - "probar que server.js no altera Knowledge Bundles ni Snapshots"
  - "mantener guards append-only existentes"

acceptance_criteria:
  - "git diff --check sin errores"
  - "tests existentes de EKS pasan"
  - "tests nuevos de integración pasan"
  - "ningún archivo en docs/director-ia/ modificado"
  - "EKS queda disponible como servicio interno de infraestructura"
  - "pool EKS dedicado implementado o reutilizado conforme D8"
  - "no existe persistencia automática desde chat/dashboard/runtime operacional"
  - "no existe conexión a Evidence Builder porque su runtime sigue fuera de alcance"
  - "no existen nuevos endpoints públicos de EKS"
  - "no existen nuevas llamadas LLM relacionadas con EKS"
  - "no existen UPDATE/DELETE/ON CONFLICT DO UPDATE sobre Knowledge Snapshots"
  - "ningún secreto o DATABASE_URL real se copia al repositorio"
  - "reporte identifica exactamente dónde quedó integrado EKS y qué sigue deliberadamente desconectado"

allowed_actions:
  - "leer contracts_in_force"
  - "leer el runtime EKS existente"
  - "leer server.js y patrones actuales de configuración/conexión"
  - "modificar server.js únicamente para bootstrap/lifecycle interno del EKS"
  - "modificar lib/director-ia-eks.js únicamente si la integración requiere lifecycle/configuración sin cambiar semántica contractual"
  - "modificar .env.example únicamente para documentar variables no secretas estrictamente necesarias"
  - "modificar package.json únicamente si es necesario para scripts de prueba/integración"
  - "crear test/director-ia-eks-integration.test.js"
  - "ajustar tests EKS existentes si es estrictamente necesario sin reducir cobertura"
  - "ejecutar pruebas locales"
  - "ejecutar git diff --check"
  - "crear el reporte obligatorio"
  - "actualizar CURRENT_TASK mediante las transiciones permitidas por LOOP_PROTOCOL.md"

forbidden_actions:
  - "modificar contratos"
  - "crear arquitectura nueva"
  - "cambiar D1-D9"
  - "implementar productor de Knowledge Bundle"
  - "integrar Evidence Builder"
  - "integrar Observation Pipeline"
  - "integrar IES o Reasoning Engine"
  - "integrar EKS con chat"
  - "integrar EKS con dashboard"
  - "crear rutas HTTP públicas para EKS"
  - "leer o escribir datos productivos durante tests"
  - "copiar .env o credenciales"
  - "hardcodear DATABASE_URL"
  - "añadir LLM, tools operacionales o lógica epistemológica"
  - "commit"
  - "push"
  - "merge"
  - "encadenar otra tarea"
  - "autoaprobar gates"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-EKS-INTEGRATION-001.md"