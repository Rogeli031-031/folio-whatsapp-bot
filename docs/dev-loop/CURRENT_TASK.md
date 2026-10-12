task_id: FIX-IGF-DIARIO-WEEKLY-EXECUTIVE-GRID-081-R1
status: DONE_PENDING_REVIEW
phase: IMPLEMENTATION

base_sha: "70acf3ca5ab123949a5557df3e53519e479ee018"
branch: "fix/igf-diario-weekly-executive-grid-081-r1"
product_sha: "beff940988798b7c6c7e27171fdadf70aea7e347"

goal: >
  Corregir solo el layout de la gráfica ejecutiva semanal para que cada
  semana tenga su mini-gráfica y el delta quede entre columnas.

contract:
  - "No recalcula métricas ni cambia API, DB, Excel ni los contratos 077 a 081."
  - "La semana sigue siendo domingo-sábado."
  - "GASTO conserva los siete componentes."
  - "Descuento Compra permanece Pendiente."

completion:
  status: DONE_PENDING_REVIEW
  push_branch_only: true
  create_pr: false
  merge: false
  deploy: false

tests: "081-R1 4/4. 081 y regresiones 077, 078-R2, 079, 080 y panel 067: 43/43."
result_report_path: docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-EXECUTIVE-GRID-081-R1.md
