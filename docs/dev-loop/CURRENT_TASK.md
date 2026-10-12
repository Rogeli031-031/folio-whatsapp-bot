task_id: IMPL-IGF-DIARIO-WEEKLY-EXECUTIVE-CHART-081
status: DONE_PENDING_REVIEW
phase: IMPLEMENTATION

base_sha: "dab88ce72ff37aa7396a068d1a18f595658dc16c"
branch: "implementation/igf-diario-weekly-executive-chart-081"
product_sha: "4687a316b9e457fde97de596a8eeeb4a4829a777"

goal: >
  Abrir un visor ejecutivo a pantalla completa desde el botón Gráfica
  de IGF Diario semanal, para una planta y para TODAS, reutilizando
  el contrato financiero ya publicado.

contract:
  - "La tabla semanal y los cálculos existentes no cambian."
  - "GASTO usa los siete componentes ponderados por la venta cubierta."
  - "Descuento Compra permanece pendiente, sin serie inventada."
  - "TODAS muestra el consolidado canónico, no una gráfica por planta."
  - "Cerrar no cambia la semana seleccionada."

protections:
  - "No modificar 077, 078-R2, 079 ni 080."
  - "No DB writes."
  - "No migrations."
  - "No modificar el Excel."
  - "No hardcode de planta ni de semana."

completion:
  status: DONE_PENDING_REVIEW
  push_branch_only: true
  create_pr: false
  merge: false
  deploy: false

tests: "081 8/8. Regresiones 077, 078-R2, 079, 080 y el panel 067: 31/31."
result_report_path: docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-EXECUTIVE-CHART-081.md
