# CURRENT_TASK

```yaml
task_id: "FIX-DIRECTOR-IA-SEMANTIC-FOLLOWUPS-017"
title: "Director IA — aliases de gasto por concepto y continuidad de ranking de descuentos"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-21T17:15:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Corregir dos regresiones semánticas: búsqueda de gasto por conceptos equivalentes como llantas/llanta/neumáticos y continuidad conversacional del ranking de descuentos ante periodos relativos como mes anterior. Blindar ambas capacidades con 50 paráfrasis de prueba sin convertirlas en phrasebook de producción."

implementation: true
code_changes: true

schema_changes: false
data_mutation: false

base_sha: "0f39d0638cf2a8acd78f2baf665e0fdf1499af0c"
branch: "fix/director-ia-semantic-followups-017"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "lib/director-ia-expense-analytics.js"
  - "lib/director-ia-folio-search.js solo si se necesita un matcher compartido"
  - "lib/director-ia-executive-context-sales-entity-010.js"
  - "lib/director-ia-planner.js"
  - "lib/director-ia-chat.js solo si la persistencia del contexto requiere corrección mínima"
  - "módulo actual de client_discount_ranking"
  - "tests de expense analytics"
  - "tests de client_discount_ranking"
  - "tests de conversación/context inheritance"
  - "nuevo fixture de 50 paráfrasis"
  - "docs/dev-loop/reports/FIX-DIRECTOR-IA-SEMANTIC-FOLLOWUPS-017.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "DB/schema"
  - "public.folios"
  - "ARR data"
  - "fórmula de descuento $/kg ya contractual"
  - "Compras/HG/Flete"
  - "docs/director-ia/ salvo necesidad contractual demostrada"
  - "PR"
  - "merge"
  - "deploy"

contracts_in_force:
  - "semántica > phrase whitelist"
  - "EXPLICIT CURRENT TURN > INHERITED CONTEXT > GENERIC FALLBACK"
  - "no inventar evidencia"
  - "DATA_NOT_FOUND != 0"
  - "las paráfrasis viven en tests/fixtures, no en producción"

validation:
  - "nuevo test 017"
  - "suite Expense Analytics"
  - "suite keyword expense"
  - "suite client_discount_ranking"
  - "suite conversational inheritance"
  - "008/010/012 si resultan afectadas"
  - "50/50 paráfrasis nuevas"

result_report_path: "docs/dev-loop/reports/FIX-DIRECTOR-IA-SEMANTIC-FOLLOWUPS-017.md"

closure:
  - "Al terminar poner CURRENT_TASK en DONE_PENDING_REVIEW."
  - "Commit + push únicamente a fix/director-ia-semantic-followups-017."
  - "STOP."
  - "NO PR."
  - "NO merge."
  - "NO deploy."
  - "NO siguiente tarea."
```
