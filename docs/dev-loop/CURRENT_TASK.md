# CURRENT_TASK

Tarea vigente del Loop v0.1.  
Este archivo es mutable y representa **solo** la tarea actual.  
Sin `status: AUTHORIZED` y sin `AUTHORIZED_BY_HUMAN`, el implementador no edita el repositorio.

Schema: `docs/dev-loop/TASK_TEMPLATE.md`.  
Procedimiento: `docs/dev-loop/LOOP_PROTOCOL.md`.

---

```yaml
task_id: ""
status: IDLE
authorized_by: ""
authorized_at: ""
human_authorization: ""

objective: ""

in_scope: []
out_of_scope: []

contracts_in_force: []

allowed_actions: []
forbidden_actions: []

max_attempts: 1
result_report_path: ""
```

---

## Notas de estado

- `IDLE`: no hay trabajo autorizado.
- El implementador no escribe `AUTHORIZED_BY_HUMAN`.
- El implementador no pone `status: AUTHORIZED`.
- Un reporte no autoriza la siguiente tarea.
