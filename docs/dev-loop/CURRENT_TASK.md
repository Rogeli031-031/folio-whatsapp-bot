task_id: "FIX-IGF-ARR-TOP6-EMBEDDED-CONTRAST-057-R1"

title: "Recuperar fondo y contraste del Top 6 embebido"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-01"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-01"

prior_task:
  task_id: "FIX-IGF-ARR-TOP6-VERTICAL-LAYOUT-057"
  sha: "4eae27960aab0f2c1fe83f75c78498de9591e912"
  status: "DONE_PENDING_REVIEW"

base_sha: "4eae27960aab0f2c1fe83f75c78498de9591e912"

branch: "fix/igf-arr-top6-embedded-contrast-057-r1"

review_finding: >
  057 corrigió correctamente el layout: gráfica full-width y Top 6 debajo.
  Sin embargo el aside embedded quedó con className="w-full", perdiendo
  bg-white, border, rounded y p-3. Como los textos conservan text-slate-800/600/500
  y el padre es bg-slate-950, el Top 6 puede quedar oscuro sobre fondo oscuro.

objective: >
  Mantener exactamente el layout vertical de 057 y restaurar en el Top 6
  embebido el fondo claro, borde, redondeo y padding necesarios para que
  cliente, movimiento, delta, Prev, Actual y comentarios sean legibles.

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

in_scope:
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
  - "test/igf-arr-top6-vertical-layout-057.test.js"
  - "nuevo test 057-R1 si conviene"
  - "docs/dev-loop/reports/FIX-IGF-ARR-TOP6-EMBEDDED-CONTRAST-057-R1.md"
  - "docs/dev-loop/CURRENT_TASK.md solo status"

out_of_scope:
  - "ArrVentaCanalPanel salvo regresión estrictamente necesaria"
  - "IgfDiarioGraficaModal"
  - "server.js"
  - "API"
  - "commercial-trend-engine"
  - "Top 6 data"
  - "comments"
  - "Provincia"
  - "AF/AE"
  - "CIERRE PROYECTADO"
  - "DB/schema"
  - "writes"
  - "OpenAI"
  - "PR"
  - "merge"
  - "deploy"

embedded_aside_contract:
  - "Cuando embedded=true, conservar width 100%."
  - "Agregar rounded-lg."
  - "Agregar border border-slate-200."
  - "Agregar bg-white."
  - "Agregar p-3."
  - "NO agregar lg:w-[640px]."
  - "NO reintroducir lg:w-[240px]."
  - "NO reintroducir max-h-[320px]."

expected_class_concept:
  embedded: "w-full rounded-lg border border-slate-200 bg-white p-3"
  normal: "w-full shrink-0 rounded-lg border border-slate-200 bg-white p-3 lg:w-[640px]"

layout_contract:
  - "Embedded sigue vertical."
  - "Gráfica sigue primero y full-width."
  - "Top 6 sigue debajo y full-width."
  - "Un cliente sigue siendo un renglón."
  - "Seis clientes siguen siendo seis renglones."
  - "Nombre sigue sin truncate en embedded."
  - "Comentarios siguen en columna propia."
  - "No cambiar grid de seis columnas."

normal_modal:
  - "embedded=false queda exactamente igual."
  - "Gráfica izquierda + aside lg:w-[640px]."
  - "ARR fullscreen no cambia."

visual_acceptance:
  - "Top 6 embedded tiene fondo blanco."
  - "Texto slate-800/600/500 tiene contraste legible."
  - "Cada renglón se distingue visualmente."
  - "Comentarios se leen claramente."
  - "CASA y COMISIONISTA usan el mismo estilo."

functional_acceptance:
  - "clientesTop order intacto."
  - "tipo intacto."
  - "delta intacto."
  - "Prev intacto."
  - "Actual intacto."
  - "comentarios intactos."
  - "doble clic intacto."
  - "click simple no abre."
  - "Provincia intacta."
  - "057 intacta salvo contraste."

validation:
  - "057-R1."
  - "057."
  - "056."
  - "056-R1."
  - "018."
  - "019."
  - "git diff --check."

allowed_actions:
  - "crear rama R1 desde base_sha"
  - "ajustar className del aside embedded"
  - "ajustar test"
  - "crear reporte"
  - "commit"
  - "push solo rama R1"

forbidden_actions:
  - "cambiar layout vertical"
  - "cambiar renderer ARR"
  - "cambiar datos"
  - "cambiar backend"
  - "cambiar API"
  - "writes"
  - "DDL"
  - "git add ."
  - "PR"
  - "merge"
  - "deploy"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-ARR-TOP6-EMBEDDED-CONTRAST-057-R1.md"