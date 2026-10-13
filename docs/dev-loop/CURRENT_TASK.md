task_id: FIX-IGF-DIARIO-WEEKLY-EXECUTIVE-UX-081-R2
status: DONE_PENDING_REVIEW
phase: IMPLEMENTATION

base_sha: "ecd6ec8f728b72b658926b302a17fd034ab38533"
branch: "fix/igf-diario-weekly-executive-ux-081-r2"
product_sha: "5d91d25242f1f76cae0821d0404e1e18a1961a5d"

goal: >
  Corregir los cuatro puntos de UX de la gráfica ejecutiva semanal
  sin mover la retícula ni la matemática de la tabla.

contract:
  - "Gasto corporativo y gasto operativo muestran el importe diario ya repartido, sumado por los grupos CORP_KEYS y OPER_KEYS."
  - "El faltante sigue null. No se convierte a cero ni se reconstruye desde $/kg."
  - "Cinco marcos navy envuelven las filas pedidas."
  - "El selector cierra con segundo click, click fuera y Escape."
  - "El tooltip es del punto bajo el cursor."
  - "HG más negativo sigue verde. Descuento Compra sigue Pendiente."
  - "No hay cambios de DB, Excel ni de la tabla semanal."

completion:
  status: DONE_PENDING_REVIEW
  push_branch_only: true
  create_pr: false
  merge: false
  deploy: false

tests: "081-R2 5/5. Regresiones 067, 077, 078-R2, 079, 080, 081 y 081-R1: 49/49. Build: compile y types PASS. git diff --check limpio."
result_report_path: docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-EXECUTIVE-UX-081-R2.md
