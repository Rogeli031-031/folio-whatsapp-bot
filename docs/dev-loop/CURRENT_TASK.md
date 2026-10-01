task_id: "FIX-IGF-ARR-TOP6-VERTICAL-LAYOUT-057"

title: "Extender gráficas ARR embebidas y poner Top 6 debajo en renglones"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-01"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-01"

base_sha: "0528b93123aa61c199a75fb4b9048701ac9652f0"

branch: "fix/igf-arr-top6-vertical-layout-057"

production_evidence: >
  En producción, CASA y COMISIONISTA usan correctamente ArrVentaSerieView,
  pero en modo embedded la gráfica comparte horizontalmente el espacio con
  un aside de 240px que contiene Top 6 y comentarios. Eso comprime nombres,
  Prev/Actual, delta y comentarios. El usuario solicita extender la gráfica
  y mostrar debajo los seis clientes, un renglón completo por cliente.

objective: >
  Cambiar únicamente el layout embedded de ArrVentaSerieView para que la
  gráfica CASA/COMISIONISTA use todo el ancho disponible y debajo aparezca
  el Top 6 como una lista vertical de seis renglones legibles, sin alterar
  cálculos, datos, interacciones, gráfica ARR normal ni lógica IGF.

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

in_scope:
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
  - "frontend-dashboard/components/ArrVentaCanalPanel.tsx solo si hace falta ajustar contenedor"
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx solo si hace falta spacing"
  - "test/igf-arr-top6-vertical-layout-057.test.js"
  - "tests 056/056-R1 afectados"
  - "docs/dev-loop/reports/FIX-IGF-ARR-TOP6-VERTICAL-LAYOUT-057.md"
  - "docs/dev-loop/CURRENT_TASK.md solo status"

out_of_scope:
  - "server.js"
  - "commercial-trend-engine"
  - "API ARR"
  - "Top 6 calculation"
  - "comments calculation"
  - "Provincia"
  - "AF/AE"
  - "CIERRE PROYECTADO"
  - "range"
  - "DB/schema"
  - "writes"
  - "OpenAI"
  - "PR"
  - "merge"
  - "deploy"

shared_view_rule:
  - "Mantener ArrVentaSerieView como única implementación visual ARR."
  - "NO crear una segunda gráfica para embedded."
  - "NO duplicar linearTrend, ticks, paths ni tooltip."
  - "Solo cambiar composición/layout cuando embedded=true."

normal_modal_contract:
  - "ArrVentaGraficaModal normal conserva exactamente el layout actual."
  - "Mode cliente conserva gráfica izquierda + panel derecho."
  - "Delta Ingreso Cliente Forecast -> GRAFICA sigue igual."
  - "018 y 019 deben seguir pasando."
  - "No modificar experiencia fullscreen."

embedded_layout:
  - "Cuando embedded=true usar layout vertical."
  - "Primero gráfica ARR a todo el ancho."
  - "Después Top 6 debajo."
  - "Eliminar en embedded la columna lateral lg:w-[240px]."
  - "Eliminar max-h-[320px] que obliga scroll interno/corte del contenido."
  - "El panel completo puede crecer verticalmente."
  - "El scroll principal debe ser el del modal IGF, no un scroll interno pequeño."

embedded_chart:
  - "La gráfica debe ocupar width: 100% del panel CASA/COMISIONISTA."
  - "Mantener viewBox 980x460 y mismo renderer."
  - "No cambiar datos ni escala."
  - "Mantener eje Y."
  - "Mantener eje X."
  - "Mantener área."
  - "Mantener línea de tendencia."
  - "Mantener hover."
  - "Mantener tooltip."
  - "Mantener colores CASA/COMISIONISTA."
  - "Puede limitarse visualmente a una altura responsive razonable sin recortar ejes."

top6_position:
  - "Top 6 siempre debajo de la gráfica en embedded."
  - "No a la derecha."
  - "Usar todo el ancho del panel."
  - "Título Top 6 clientes · Δ venta arriba de la lista."
  - "Subtítulo Vs periodo previo · CASA/COMISIONISTA."

top6_rows:
  - "Exactamente un cliente por renglón."
  - "Máximo seis renglones porque clientes_top ya entrega Top 6."
  - "No grid de tarjetas lado a lado."
  - "No truncar nombre del cliente en desktop salvo caso extremo."
  - "Permitir wrap del nombre si es muy largo."
  - "Cada row debe mostrar claramente:"
  - "posición"
  - "nombre completo"
  - "badge de movimiento"
  - "delta ton"
  - "Prev ton"
  - "Actual ton"
  - "hasta 2 últimos comentarios"
  - "autor/fecha del comentario"

top6_row_desktop:
  layout: >
    Una fila tipo tabla/grid con columnas estables:
    cliente | movimiento | delta | previo | actual | últimos comentarios.
  - "Nombre debe recibir el mayor ancho."
  - "Delta, Prev y Actual numéricos alineados."
  - "Comentarios reciben un bloque amplio."
  - "No comprimir nombre a una columna de pocos caracteres."
  - "No usar truncate para cliente en embedded desktop."

top6_row_example: |
  1. RESTAURANTE EJEMPLO MUY LARGO | Aumentó | +15.15 ton | Prev 46.58 | Actual 61.73 | PROCESO EN MTTO A SU INSTALACIÓN...
  2. LA MORENA ...                 | Aumentó |  +4.30 ton | Prev 19.57 | Actual 23.87 | SE FUE EL OPERADOR...

top6_mobile:
  - "En pantallas pequeñas cada cliente sigue siendo un solo bloque/renglón lógico."
  - "Puede envolver internamente a 2-3 líneas."
  - "Nombre arriba."
  - "Movimiento/delta/Prev/Actual debajo."
  - "Comentarios al final."
  - "No overflow horizontal obligatorio."

comments:
  - "Conservar comentarios existentes."
  - "Máximo 2 por cliente como ahora."
  - "Si no hay comentario mostrar Sin comentarios."
  - "No hacer fetch nuevo."
  - "No cambiar Provincia comments."

double_click:
  - "Toda la fila del cliente mantiene cursor pointer."
  - "Doble clic abre la gráfica individual."
  - "Click simple NO abre."
  - "clienteNorm exacto."
  - "Cerrar cliente regresa a IGF."

channel_panels:
  - "CASA y COMISIONISTA mantienen la misma estructura."
  - "CASA arriba."
  - "COMISIONISTA abajo."
  - "Cada una tiene su propia gráfica full-width + Top6 vertical debajo."
  - "No mezclar clientes entre canales."

igf_left_side:
  - "No cambiar gráfica de Rentabilidad."
  - "No cambiar semanas."
  - "No cambiar CIERRE PROYECTADO."
  - "No cambiar tendencia amarilla."
  - "Solo la columna derecha crecerá verticalmente."

performance:
  - "No nuevos endpoints."
  - "No requests extra."
  - "No fetch por fila."
  - "No fetch por comentario."
  - "Una request CASA y una COMISIONISTA por range como actualmente."

acceptance_criteria:
  - "CASA: gráfica ocupa todo el ancho del panel."
  - "COMISIONISTA: gráfica ocupa todo el ancho del panel."
  - "Top 6 aparece debajo de cada gráfica."
  - "Se ven seis renglones verticales."
  - "Cada renglón corresponde a un solo cliente."
  - "Nombres largos son legibles."
  - "Delta es legible."
  - "Prev y Actual son legibles."
  - "Comentarios son legibles."
  - "Doble clic sigue funcionando."
  - "No existe lg:w-[240px] para el aside cuando embedded=true."
  - "No existe max-h-[320px] limitando ArrVentaSerieView embedded."
  - "Modal ARR normal conserva layout actual."
  - "Top6 data permanece exactamente data.clientes_top."
  - "No cambios backend."
  - "No cambios matemáticos."

validation:
  - "CASA con 6 clientes y nombres largos."
  - "COMISIONISTA con 6 clientes."
  - "Cliente con 0 comentarios."
  - "Cliente con 1 comentario."
  - "Cliente con 2 comentarios."
  - "double click."
  - "click simple."
  - "1M."
  - "3M."
  - "Provincia."
  - "desktop 1920."
  - "desktop 1366."
  - "mobile."
  - "056."
  - "056-R1."
  - "055."
  - "018."
  - "019."
  - "git diff --check."

allowed_actions:
  - "crear rama 057 desde base_sha"
  - "cambiar layout embedded en ArrVentaSerieView"
  - "ajustar estilos del Top 6 embedded"
  - "agregar tests"
  - "crear reporte"
  - "commit"
  - "push solo rama 057"

forbidden_actions:
  - "cambiar cálculo Top6"
  - "cambiar renderer matemático de la gráfica"
  - "cambiar backend"
  - "cambiar API"
  - "cambiar IGF financiero"
  - "writes"
  - "DDL"
  - "git add ."
  - "PR"
  - "merge"
  - "deploy"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-ARR-TOP6-VERTICAL-LAYOUT-057.md"