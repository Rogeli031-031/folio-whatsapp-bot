# CURRENT_TASK

Tarea vigente del Loop v0.1.  
Este archivo es mutable y representa **solo** la tarea actual.  
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.  
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

Esto **no** es G1. `DRAFT` no es ejecutable.

---

```yaml
task_id: "LOOP-VALIDATION-001"
status: CLOSED
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-12T23:30:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-12"

objective: "Validar de extremo a extremo el protocolo Loop v0.1 mediante la creación de un único archivo inocuo de validación y su reporte obligatorio."

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/validation/LOOP-VALIDATION-001.md"
  - "docs/dev-loop/reports/LOOP-VALIDATION-001.md"

out_of_scope:
  - "docs/director-ia/"
  - "código productivo"
  - "06-CHANNEL-PROJECTION"
  - "runtime de Director IA"
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/TASK_TEMPLATE.md"
  - "docs/dev-loop/reports/README.md"
  - "main"
  - "secretos, tokens y credenciales"

contracts_in_force:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"

allowed_actions:
  - "durante DRAFT, modificar únicamente CURRENT_TASK.md para preparar esta tarea"
  - "una vez exista G1 humano válido, crear únicamente el archivo de validación indicado"
  - "una vez exista G1 humano válido, crear el reporte obligatorio"
  - "actualizar CURRENT_TASK únicamente mediante las transiciones permitidas por LOOP_PROTOCOL.md"

forbidden_actions:
  - "modificar docs/director-ia/"
  - "modificar código productivo"
  - "modificar el meta-protocolo"
  - "crear archivos adicionales"
  - "commit"
  - "push"
  - "merge"
  - "cambiar de rama"
  - "encadenar otra tarea"
  - "escribir AUTHORIZED_BY_HUMAN"
  - "autoaprobar cualquier gate"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/LOOP-VALIDATION-001.md"
```

---

## Notas de estado

- `DRAFT`: propuesta. No ejecutable. No es G1.
- El implementador no escribe `AUTHORIZED_BY_HUMAN`.
- El implementador no pone `status: AUTHORIZED`.
- Un reporte no autoriza la siguiente tarea.
