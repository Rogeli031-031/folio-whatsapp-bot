# Plan al cierre · Fuente de descuento
task_id: "IMPL-IGF-PLAN-BASE-DESCUENTO"
status: IN_PROGRESS
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-11-06T14:16:41-06:00"
human_authorization: "Sí, autorizo el selector"
authorization_channel: "Chat IA en Tomza; autorización para registrar esta ficha."
base_sha: "88b3a9a78b0e3e836d26057a665dbfa0e5b7397b"
branch: "feat/igf-plan-base-descuento"
objective: "Comparar y elegir el descuento base ARR o IGF Diario con idéntica venta y propuestas, conciliando utilidad del plan, punto en la gráfica y Excel."
in_scope:
  - "Servicio, cálculo, exportación e importación de Plan al cierre y sus consumidores directos en el simulador."
  - "Reutilizar la referencia ARR y el cálculo de descuento IGF Diario del corte, con pruebas específicas y reporte."
out_of_scope:
  - "Modificar las series oficiales de ARR, IGF, DICF, proyecciones, clientes, descuentos registrados, permisos o puntos productivos."
contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
allowed_actions:
  - "Implementar y probar con datos sintéticos o en lectura. Subir la rama y abrir la solicitud para revisión."
forbidden_actions:
  - "Escribir en producción, fingir tasas faltantes o fusionar esta rama sin instrucción humana."
acceptance:
  - "Usar los mismos kg base y los mismos kg de plan para ambos cálculos; respetar cambios netos por comprador, HG y gastos."
  - "Identificar fuente y resultado al comparar, guardar y reabrir; paridad con gráfica y Excel; compatibilidad con puntos y libros previos."
  - "Verificar el ejemplo #18 y las seis plantas, descuentos cero, faltantes e intentos de usar referencias obsoletas."
max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-PLAN-BASE-DESCUENTO.md"
