# CURRENT_TASK

Tarea vigente del Loop v0.1.

```yaml
task_id: "HOTFIX-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-TYPES-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-21T11:22:03-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-21"

gates:
  G1_task_authorization: AUTHORIZED
  G2_architecture_change: N/A
  G3_new_architecture_contract: N/A
  G8_calibration_materiality_signature: N/A

objective: >
  Corregir exclusivamente el fallo de compilación TypeScript del cliente
  Director IA dashboard introducido por cycle-client-core.d.ts, preservando
  la API/runtime existente. Demostrar que el build real del frontend pasa,
  además de los tests focales y regresión Director IA.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/HOTFIX-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-TYPES-001.md"

  - "frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts"
  - "frontend-dashboard/modules/director-ia/components/DirectorIaCyclePanel.tsx (solo si el fix mínimo de tipos lo requiere)"
  - "frontend-dashboard/modules/director-ia/lib/api.ts (solo si el fix mínimo de tipos lo requiere)"
  - "test/director-ia-dashboard-cycle-client.test.js (solo si hace falta ajustar cobertura de tipado/build)"

  - "frontend-dashboard/package.json (solo lectura)"
  - "package.json (solo lectura)"

out_of_scope:
  - "modificar cycle-client-core.js runtime"
  - "modificar endpoint backend"
  - "modificar server.js"
  - "modificar Director IA cognitive runtimes"
  - "modificar contratos"
  - "migrar arquitectura frontend"
  - "agregar dependencias"
  - "modificar package.json"
  - "cambiar semántica del cliente"
  - "cambiar UI"
  - "commit"
  - "push"
  - "merge"

known_failure:
  environment: "Render frontend build"
  failure_stage: "TypeScript type checking"
  file: "frontend-dashboard/modules/director-ia/components/DirectorIaCyclePanel.tsx"
  line: 45
  expression: "createDirectorIaCycleUiSession()"
  error: "This expression is not callable"

root_cause_in_force:
  file: "frontend-dashboard/modules/director-ia/lib/cycle-client-core.d.ts"
  finding: >
    El default export del declaration file está declarado con una forma que hace
    que TypeScript no preserve correctamente las funciones del objeto default
    como callables. createDirectorIaCycleUiSession y potencialmente
    executeDirectorIaCycleRequest quedan mal tipados al consumir el default
    import.

preferred_fix:
  strategy: >
    Corregir cycle-client-core.d.ts manteniendo intacta la API runtime/default
    export existente. Preferir declare const con un object type explícito y
    export default de ese valor, o una forma TypeScript equivalente que preserve
    correctamente las signatures callable.

  avoid:
    - "migrar cycle-client-core.js a TypeScript"
    - "reescribir arquitectura de imports salvo necesidad real"
    - "cambiar runtime JS"
    - "introducir any para ocultar el error"
    - "usar ts-ignore"

required_validation:
  - "build real del frontend con el mismo comando usado por Render"
  - "type checking pasa"
  - "test focal director-ia-dashboard-cycle-client pasa"
  - "test/director-ia-*.test.js pasa"
  - "git diff --check limpio"
  - "git status solo muestra archivos autorizados"

acceptance_criteria:
  - "Render failure reproducible locally before fix or root cause confirmed"
  - "createDirectorIaCycleUiSession vuelve a ser callable para TypeScript"
  - "executeDirectorIaCycleRequest queda correctamente callable si aplica"
  - "no ts-ignore"
  - "no any para silenciar"
  - "runtime JS unchanged"
  - "UI semantics unchanged"
  - "frontend build passes"
  - "focused tests pass"
  - "Director IA regression passes"
  - "report created"

expected_terminal_state: >
  DONE_PENDING_REVIEW si el frontend compila con el fix mínimo de tipos y todas
  las regresiones quedan verdes. BLOCKED/STOPPED si arreglarlo exige cambio de
  runtime/API/dependency o arquitectura fuera de scope.

max_attempts: 1
result_report_path: "docs/dev-loop/reports/HOTFIX-DIRECTOR-IA-DASHBOARD-CYCLE-CLIENT-TYPES-001.md"
