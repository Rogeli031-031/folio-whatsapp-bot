task_id: "FIX-IGF-DIARIO-WEEKLY-VENTA-PROM-PARITY-086"
status: DONE_PENDING_REVIEW
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-10-19T12:29:45.6052483-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-10-19"

base_sha: "14afd8b0b9deda77e9be1de8083e78995144880f"
branch: "fix/igf-diario-weekly-venta-prom-parity-086"

objective: "Hacer que Venta en Kilos proyectada del IGF Diario semanal use exactamente PROM Venta Total desde el corte inclusive, sin cambiar el contrato global de venta."

in_scope:
  - "lib/igf-diario-weekly-plant.js"
  - "test/fix-igf-diario-weekly-venta-prom-parity-086.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/authorizations/G1-086.json"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-VENTA-PROM-PARITY-086.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-ANALYTICAL-PDF-085.md"

out_of_scope:
  - "lib/dashboard-arr-forecast.js"
  - "lib/igf-diario-grafica.js"
  - "lib/igf-diario-venta-kg.js"
  - "frontend-dashboard/"
  - "server.js"
  - "Excel, Compras, Pronóstico y DatosPlanta"
  - "DB, migrations e importadores"
  - "Contratos, AGENTS, LOOP_PROTOCOL y TASK_TEMPLATE"
  - "PR, merge, push a main y deploy"

contracts_in_force:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/TASK_TEMPLATE.md"
  - "049: precedencia general captura/forecast"
  - "074: suma y ausencia de canales"
  - "067/069/077: IGF Diario semanal y cobertura"
  - "085: PDF consume el snapshot semanal sin recalcular"

allowed_actions:
  - "Editar únicamente las rutas autorizadas"
  - "Crear helper semanal puro para sustituir Venta Total en fechas proyectadas"
  - "Usar projection.byPlant[].promVentaTotal ya cargado"
  - "Crear y ejecutar fixtures sintéticos y regresiones"
  - "Commit de producto/tests"
  - "Commit de documentación"
  - "Push únicamente de la rama fix/igf-diario-weekly-venta-prom-parity-086"

forbidden_actions:
  - "Cambiar resolveCanalTon o materializePlantMonth global"
  - "Cambiar el cálculo PROM del módulo Pronóstico"
  - "Usar captura parcial del corte como fallback"
  - "Usar Casa+Comisionista como fallback del total"
  - "Inventar ceros"
  - "Reescalar canales para cuadrar el total"
  - "Escribir en DB productiva"
  - "PR, merge, auto-merge o deploy"
  - "npm audit fix"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-WEEKLY-VENTA-PROM-PARITY-086.md"

accepted_decisions:
  D1: true
  D2: true
  D3: true
  D4: true
  D5: true
  D6: true
