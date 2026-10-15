task_id: "IMPL-IGF-DIARIO-WEEKLY-ANALYTICAL-PDF-085"
status: "DONE_PENDING_REVIEW"
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-10-14T21:13:50.7827226-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis rogelio Zaragoza Alvarez 2026-10-14"
base_sha: "c409e3078c636302397557096b118df04a514393"
branch: "implementation/igf-diario-weekly-analytical-pdf-085"
objective: "Anteponer el informe analítico de la planta y semanas seleccionadas, fiel al maestro, y conservar íntegro el anexo vectorial 084 en una sola descarga."
in_scope:
  - "frontend-dashboard/components/IgfDiarioWeeklyExecutiveModal.tsx"
  - "frontend-dashboard/lib/igf-diario-weekly-executive-pdf.js"
  - "frontend-dashboard/lib/igf-diario-weekly-analytical-report.js"
  - "frontend-dashboard/lib/igf-diario-weekly-analytical-report.d.ts"
  - "frontend-dashboard/lib/igf-diario-weekly-analytical-pdf.js"
  - "frontend-dashboard/lib/igf-diario-weekly-analytical-pdf.d.ts"
  - "frontend-dashboard/public/fonts/DejaVuSans.ttf"
  - "frontend-dashboard/public/fonts/DejaVuSans-Bold.ttf"
  - "frontend-dashboard/public/fonts/DejaVuSans-LICENSE.txt"
  - "test/impl-igf-diario-weekly-analytical-pdf-085.test.js"
  - "test/impl-igf-diario-weekly-executive-pdf-084.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/authorizations/G1-085.json" # solo versionar el registro humano intacto
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-EXECUTIVE-PDF-084.md" # solo versionar la anotacion humana preexistente
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-ANALYTICAL-PDF-085.md"
  - "docs/dev-loop/reports/evidence-085/"
out_of_scope:
  - "Motor financiero, API, DB, importadores y Excel"
  - "Rediseño de pantalla, selector, renderer 084 y salida TODAS"
  - "frontend-dashboard/lib/igf-diario-weekly-executive-chart.js y su .d.ts"
  - "lib/igf-diario-weekly-plant.js"
  - "Navegación de gastos 083, permisos y otras descargas"
  - "Ranking de otras plantas, clientes, Laynes, Pemex, IA remota y WhatsApp"
  - "PDF maestro o sus páginas como activos/evidencia del repositorio"
  - "Dependencias npm, package/lockfiles y cambios de Noto Sans"
  - "Contratos, AGENTS, LOOP_PROTOCOL y TASK_TEMPLATE"
  - "Checkout antiguo, cambios de 080 y archivos ajenos"
  - "PR, merge, push a main, migrations y deploy"
contracts_in_force:
  - "AGENTS.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/TASK_TEMPLATE.md"
  - "Gráfica ejecutiva 081, sus revisiones y exportación 084"
  - "ESPECIFICACION_PDF_SEMANAL_POR_PLANTA.md del paquete G1 revisado, aceptada expresamente en el acto humano"
allowed_actions:
  - "Con G1 vigente, implementar solo las rutas exactas aprobadas"
  - "Derivar un informe determinista del snapshot sin alterar cifras fuente"
  - "Obtener DejaVu Sans/Bold y conservar licencia en las rutas permitidas"
  - "Componer páginas analíticas y anexo usando jsPDF/svg2pdf existentes"
  - "Ejecutar pruebas locales/headless/standalone con fixtures sintéticos"
  - "Versionar sin editar G1-085.json y la anotacion de cierre humano 084 recibidos al iniciar"
  - "Crear commit de producto/tests y congelar PRODUCT_SHA"
  - "Crear commit posterior de documentación/evidencia y FINAL_SHA"
  - "Publicar con push únicamente la rama implementation/igf-diario-weekly-analytical-pdf-085"
forbidden_actions:
  - "Crear o modificar campos de autorización, autoaprobar gates o cerrar/rechazar tareas"
  - "Modificar G1-085.json o la anotacion/cierre humano 084; esos archivos se reciben ya preparados"
  - "Implementar desde DRAFT o reutilizar el G1 de 084"
  - "Alterar datos/denominadores para forzar conciliación"
  - "Inventar ceros, causas, procedencia, capturas o validación productiva"
  - "Ocultar residuales en Otras partidas"
  - "Copiar archivos de fuente extraídos del maestro o publicar el maestro"
  - "Escribir en la DB productiva o usar cifras reales como fixture público"
  - "Instalar dependencias no autorizadas o ejecutar npm audit fix"
  - "Git reset destructivo, git clean o stash automático del trabajo antiguo"
  - "Commit/push a main, PR, merge, auto-merge o deploy"
  - "Encadenar tareas, watchers o seguir automáticamente hasta pasar"
max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-ANALYTICAL-PDF-085.md"
accepted_decisions:
  D1: true
  D2: true
  D3: true
  D4: true
  D5: true
  D6: true
human_setup:
  record_path: "docs/dev-loop/authorizations/G1-085.json"
  predecessor_task: "IMPL-IGF-DIARIO-WEEKLY-EXECUTIVE-PDF-084"
  predecessor_resolution: "CLOSED_BY_HUMAN"
  production_pdf_validation: "NOT_VERIFIED_BY_THIS_INSTALLER"
  implementation_started: false
  expected_initial_head: "c409e3078c636302397557096b118df04a514393"
  administrative_files_may_be_uncommitted: true
