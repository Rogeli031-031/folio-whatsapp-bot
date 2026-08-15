# CURRENT_TASK

Tarea vigente del Loop v0.1.
Este archivo es mutable y representa **solo** la tarea actual.
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "IMPL-EKS-READINESS-002"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15T12:15:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G1_task_authorization:  AUTHORIZED
  G2_change_existing_contract: N/A
  G3_new_architecture_contract: N/A

objective: >
  Auditar el estado real de origin/main y producir un diseño técnico de readiness
  para implementar el Executive Knowledge Store (EKS) conforme al contrato 03,
  reutilizando la infraestructura existente cuando sea compatible, sin escribir
  runtime productivo, modificar contratos ni tomar decisiones tecnológicas
  definitivas que requieran aprobación humana.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-EKS-READINESS-002.md"
  - "lectura del estado real de origin/main"
  - "lectura de archivos de configuración y dependencias relevantes"
  - "lectura de package.json y archivos equivalentes de dependencias"
  - "lectura de infraestructura de persistencia/base de datos existente"
  - "auditoría de patrones de acceso, persistencia, migraciones y configuración existentes"
  - "diseño técnico de readiness únicamente dentro del reporte"

out_of_scope:
  - "modificar cualquier archivo en docs/director-ia/"
  - "escribir o modificar código runtime productivo"
  - "crear archivos .js, .ts, .sql u otros artefactos de implementación"
  - "modificar configuración de aplicación, base de datos o entornos"
  - "modificar AGENTS.md"
  - "modificar docs/dev-loop/LOOP_PROTOCOL.md"
  - "modificar docs/dev-loop/TASK_TEMPLATE.md"
  - "modificar docs/dev-loop/reports/README.md"
  - "tomar decisiones tecnológicas definitivas"
  - "implementar EKS"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

execution_rules:
  - "ejecutar únicamente desde una rama de trabajo distinta de main"
  - "tratar origin/main como referencia integrada"
  - "auditar antes de proponer"
  - "no asumir PostgreSQL, JSONB, pg, pooling, migraciones ni ninguna tecnología antes de verificar el repositorio"
  - "separar claramente hechos observados del repositorio, requisitos contractuales, inferencias y alternativas propuestas"
  - "no seleccionar definitivamente motor de base de datos, formato de almacenamiento, esquema físico, librería de migraciones o estrategia de concurrencia"
  - "el EKS debe tratarse como componente mecánico y append-only conforme al contrato 03"
  - "no introducir lógica de IA, LLM, confianza, materiality, coverage, facts, evidence o diagnosis dentro del EKS"
  - "cualquier contradicción o ambigüedad contractual implica STOP conforme a LOOP_PROTOCOL.md"

required_report:
  - "inventario de infraestructura de persistencia realmente encontrada en el repositorio"
  - "dependencias y configuración relevantes realmente encontradas"
  - "qué infraestructura existente podría reutilizarse y bajo qué condiciones"
  - "alternativas comparativas para persistencia física del EKS, sin elección definitiva"
  - "alternativas para representar snapshots append-only, con trade-offs"
  - "propuesta no vinculante de interfaces técnicas necesarias para cumplir contrato 03"
  - "estrategia comparativa de versionado de Knowledge Snapshots"
  - "alternativas de estrategia de migraciones, si resultan necesarias"
  - "plan inicial de pruebas basado en 03B cuando el contrato lo soporte"
  - "decisiones que requieren aprobación humana antes de implementación"
  - "riesgos, gaps, contradicciones o información faltante"
  - "recomendación de siguiente tarea, explícitamente no autorizada"

allowed_actions:
  - "leer AGENTS.md y LOOP_PROTOCOL.md"
  - "leer contracts_in_force"
  - "inspeccionar el repositorio y origin/main en modo lectura"
  - "leer configuración, dependencias y código existente únicamente para auditoría"
  - "comparar alternativas técnicas en el reporte sin convertirlas en decisiones arquitectónicas"
  - "crear únicamente docs/dev-loop/reports/IMPL-EKS-READINESS-002.md"
  - "actualizar CURRENT_TASK únicamente mediante las transiciones permitidas por LOOP_PROTOCOL.md"

forbidden_actions:
  - "seleccionar definitivamente PostgreSQL u otro motor como decisión arquitectónica"
  - "seleccionar definitivamente JSONB, estructura física de tablas, librería de migraciones o estrategia de concurrencia"
  - "modificar código de aplicación"
  - "modificar contratos arquitectónicos"
  - "implementar EKS"
  - "añadir lógica de IA o LLM al EKS"
  - "añadir cálculos de confianza, materiality, coverage, facts, evidence o diagnosis al EKS"
  - "crear archivos adicionales fuera de in_scope"
  - "cambiar de rama durante la ejecución"
  - "escribir AUTHORIZED_BY_HUMAN"
  - "poner status AUTHORIZED"
  - "autoaprobar cualquier gate"
  - "commit"
  - "push"
  - "merge"
  - "encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-EKS-READINESS-002.md"