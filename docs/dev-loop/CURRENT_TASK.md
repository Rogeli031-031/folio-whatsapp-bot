# CURRENT_TASK

```yaml
task_id: "FIX-DIRECTOR-IA-TALLER-FALSE-ZERO-015"
title: "Director IA — corregir keyword residual y falso cero en gasto Taller"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-21T14:33:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Corregir la regresión de Expense Analytics donde expresiones auxiliares como 'he' y 'cuando' se convierten en keyword y filtran erróneamente folios de Taller, y evitar verbalizar DATA_NOT_FOUND como $0.00."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "f27ca3e219f604f8de55dfed2e0b0c14c03b31b0"
branch: "fix/director-ia-taller-false-zero-015"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "lib/director-ia-expense-analytics.js"
  - "lib/director-ia-chat.js solo si una corrección mínima de continuidad es estrictamente necesaria"
  - "lib/director-ia-folio-search.js solo si hace falta para evitar falsos matches de keyword"
  - "tests de Expense Analytics / routing relacionados"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-TALLER-FALSE-ZERO-015.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "public.folios"
  - "migraciones/schema"
  - "Compras/HG"
  - "docs/director-ia/ salvo que el protocolo exija actualizar índice de capacidad; preferir no tocar"
  - "cambiar lógica de planta/equivalentes"
  - "cambiar permisos solo_zp_ad"
  - "cambiar mes_cargo"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "dev-loop vigente"
  - "DATA_NOT_FOUND no equivale a cero"
  - "no inventar importes"
  - "semántica > phrase whitelist"

validation:
  - "tests Expense Analytics / routing / continuidad"
  - "frontend no cambia → no npm run build"

result_report_path: "docs/dev-loop/reports/FIX-DIRECTOR-IA-TALLER-FALSE-ZERO-015.md"

closure:
  - "Al terminar poner CURRENT_TASK en DONE_PENDING_REVIEW."
  - "Commit + push únicamente a fix/director-ia-taller-false-zero-015."
  - "STOP."
  - "NO PR."
  - "NO merge."
  - "NO deploy."
  - "NO siguiente tarea."
```
