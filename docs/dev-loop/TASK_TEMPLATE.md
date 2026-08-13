# TASK_TEMPLATE

Plantilla para una futura `CURRENT_TASK`.  
El implementador puede **proponer** una tarea copiando este schema.  
El implementador **no** puede poner `status: AUTHORIZED`.  
El implementador **no** puede escribir `AUTHORIZED_BY_HUMAN`.  
El implementador **no** puede crear, borrar ni modificar `authorized_by`, `authorized_at` ni `human_authorization`.  
Solo HUMAN_APPROVER completa autorización (Gate G1).

Copiar el bloque YAML a `CURRENT_TASK.md` y rellenar. Dejar `status: DRAFT` hasta G1.

---

```yaml
task_id: "TASK-YYYMMDD-NNN"
status: DRAFT
authorized_by: ""
authorized_at: ""
human_authorization: ""

objective: "Una sola frase. Un solo resultado."

in_scope:
  - "rutas/archivos/exactos/permitidos"

out_of_scope:
  - "docs/director-ia/"
  - "06-CHANNEL-PROJECTION"
  - "runtime de Director IA"
  - "main (push/merge)"
  - "secretos, tokens, credenciales"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

allowed_actions:
  - "crear archivos listados en in_scope"
  - "editar archivos listados en in_scope"

forbidden_actions:
  - "escribir AUTHORIZED_BY_HUMAN"
  - "poner status AUTHORIZED"
  - "crear, borrar o modificar authorized_by, authorized_at o human_authorization"
  - "aprobar gates G1–G8"
  - "modificar docs/director-ia/ sin Gate G2/G3"
  - "crear .cursor/ o .cursorrules"
  - "crear GitHub Actions o watchers"
  - "encadenar la siguiente tarea"
  - "commit o push a main"
  - "auto-merge"
  - "almacenar secretos"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/TASK-YYYMMDD-NNN.md"
```

---

## Autorización humana (solo HUMAN_APPROVER)

Cuando el humano autoriza (G1), sustituye en `CURRENT_TASK.md`:

```yaml
status: AUTHORIZED
authorized_by: "HUMAN_APPROVER"
authorized_at: "<ISO-8601 con zona>"
human_authorization: "AUTHORIZED_BY_HUMAN: <nombre> <YYYY-MM-DD>"
```

`authorized_at` es timestamp ISO 8601 con zona horaria. Ejemplo **solo de formato** (no es autorización): `2026-08-12T23:15:00-06:00`.

Sin la línea `human_authorization` exacta, escrita por humano, la tarea no es ejecutable.

---

## Tras la ejecución (implementador)

El implementador, una vez, puede pasar `AUTHORIZED` → `IN_PROGRESS`.  
En esa transición **solo** puede modificar `status` de `AUTHORIZED` a `IN_PROGRESS`.  
No puede crear, borrar ni modificar `authorized_by`, `authorized_at` ni `human_authorization`.  
`IN_PROGRESS` no es autorización independiente: exige G1 heredado intacto.  
Al terminar, deja uno de: `DONE_PENDING_REVIEW` | `STOPPED` | `BLOCKED`.  
Escribe el reporte en `result_report_path`.  
No cierra la tarea (`CLOSED` / `REJECTED` son humanos).  
No autoriza la siguiente.

---

## Reportes

Ver `docs/dev-loop/reports/README.md`.

Campos mínimos del reporte:

```yaml
task_id: "TASK-YYYMMDD-NNN"
outcome: "DONE | STOPPED | BLOCKED"
files_touched: []
files_not_touched: []
contracts_consulted: []
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```
