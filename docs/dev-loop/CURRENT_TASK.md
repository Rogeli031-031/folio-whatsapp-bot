task_id: "FIX-IGF-ARR-DESKTOP-OPTIMIZED-LAYOUT-058"

title: "Optimizar distribución desktop de Rentabilidad, CASA y COMISIONISTA"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-01"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-01"

base_sha: "137574f5cad04585a46b6b34b4fb13772f1e8415"

branch: "fix/igf-arr-desktop-optimized-layout-058"

visual_reference: >
  Implementar la propuesta visual aprobada por el usuario:
  Rentabilidad IGF a la izquierda; CASA y COMISIONISTA apiladas a la derecha.
  Cada canal muestra gráfica full-width y debajo Top 6 en seis renglones.
  La columna derecha gana ancho respecto a producción actual para hacer
  legibles gráfica, nombres, métricas y comentarios.

objective: >
  Optimizar el uso del espacio del modal IGF en desktop sin modificar ninguna
  matemática ni fuente de datos. Redistribuir el ancho entre Rentabilidad
  y ARR, compactar verticalmente CASA/COMISIONISTA y hacer que los Top 6
  sean legibles de un vistazo, conservando toda la funcionalidad 057-R1.

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

in_scope:
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx"
  - "frontend-dashboard/components/ArrVentaCanalPanel.tsx"
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx solo estilos embedded"
  - "tests 058"
  - "tests 057/057-R1 afectados"
  - "docs/dev-loop/reports/FIX-IGF-ARR-DESKTOP-OPTIMIZED-LAYOUT-058.md"
  - "docs/dev-loop/CURRENT_TASK.md solo status"

out_of_scope:
  - "server.js"
  - "API ARR"
  - "commercial-trend-engine"
  - "cálculo Top 6"
  - "comentarios"
  - "Provincia"
  - "AF/AE"
  - "month_close"
  - "forecast"
  - "DB/schema"
  - "writes"
  - "OpenAI"
  - "PR"
  - "merge"
  - "deploy"

desktop_master_layout:
  - "Mantener dos columnas."
  - "Izquierda aproximadamente 46%."
  - "Derecha aproximadamente 54%."
  - "Puede ajustarse entre 45/55 y 48/52 según breakpoint."
  - "La derecha debe ser perceptiblemente más ancha que en producción actual."
  - "No dejar que la gráfica Rentabilidad domine ~60% si eso comprime ARR."
  - "Gap entre columnas reducido pero respirable."

desktop_left:
  - "Título y toggle intactos."
  - "Gráfica Rentabilidad intacta."
  - "Semanas intactas y alineadas."
  - "CIERRE PROYECTADO intacto."
  - "Reducir espacios muertos verticales innecesarios."
  - "No aumentar artificialmente altura de Rentabilidad para igualar derecha."

desktop_right:
  - "CASA arriba."
  - "COMISIONISTA abajo."
  - "Mismo ancho."
  - "Misma estructura."
  - "Cada canal visualmente funciona como una unidad compacta."

channel_panel:
  - "Título del canal sobre fondo oscuro."
  - "Gráfica inmediatamente debajo."
  - "Top 6 inmediatamente debajo de la gráfica."
  - "No usar aside lateral."
  - "No usar scroll interno."
  - "No separar gráfica y Top6 con espacios grandes."

embedded_chart_height:
  desktop_target: "aprox 220-260 px visuales"
  - "Conservar viewBox 980x460 y renderer único."
  - "Escalar visualmente el SVG mediante wrapper/CSS, no cambiar matemática."
  - "Ejes X/Y deben seguir legibles."
  - "Tooltip debe seguir funcionando."
  - "No recortar puntos, labels ni tendencia."
  - "CASA y COMISIONISTA misma altura."

top6_desktop:
  - "Tabla/lista compacta."
  - "Seis clientes visibles consecutivamente."
  - "Un renglón por cliente."
  - "Sin tarjetas altas."
  - "Fila objetivo aproximadamente 42-56 px, permitiendo más si comentario requiere wrap."
  - "No imponer altura fija que corte comentarios."

top6_columns:
  - "#"
  - "Cliente"
  - "Movimiento"
  - "Δ venta"
  - "Prev"
  - "Actual"
  - "Últimos comentarios"

top6_width_priority:
  - "Cliente recibe mucho más espacio que hoy."
  - "Últimos comentarios recibe el otro bloque ancho."
  - "Movimiento, delta, prev y actual son columnas compactas."
  - "No comprimir nombre para favorecer columnas numéricas."

suggested_embedded_grid:
  desktop: >
    28px
    minmax(180px, 1.8fr)
    minmax(72px, 0.7fr)
    minmax(78px, 0.7fr)
    minmax(62px, 0.55fr)
    minmax(62px, 0.55fr)
    minmax(190px, 1.8fr)

client_name:
  - "Mostrar nombre completo."
  - "Permitir máximo wrap natural."
  - "No truncate en embedded."
  - "No ellipsis salvo breakpoint realmente estrecho."

comments:
  - "Mantener máximo 2 comentarios por cliente."
  - "En desktop priorizar el comentario más reciente visualmente."
  - "Segundo comentario puede aparecer debajo si cabe."
  - "No ocultar datos."
  - "No cambiar backend."

visual_density:
  - "Reducir padding vertical excesivo en filas."
  - "Header Top 6 compacto."
  - "Bordes finos."
  - "Usar fondo blanco actual."
  - "Mantener jerarquía clara sin tarjetas innecesarias."
  - "Evitar que cada fila parezca una tarjeta independiente."

channel_color:
  - "CASA conserva amarillo."
  - "COMISIONISTA conserva azul."
  - "Tendencia conserva verde."
  - "No cambiar colores del motor ARR."

main_chart:
  - "Rentabilidad conserva azul Real."
  - "Proyectado punteado."
  - "Tendencia real amarilla."
  - "No cambiar geometría ni datos."

weekly_cards:
  - "Mantener 5 semanas."
  - "Mantener alineación por fechas."
  - "No ampliar verticalmente."
  - "CIERRE PROYECTADO sigue separado y destacado."

range_controls:
  - "Mantener en footer inferior."
  - "Siguen controlando Rentabilidad + CASA + COMISIONISTA."
  - "No agregar controles duplicados."

scroll_behavior:
  - "Solo scroll vertical del modal general."
  - "No scroll interno en CASA."
  - "No scroll interno en COMISIONISTA."
  - "No scroll interno en Top 6."
  - "Evitar overflow horizontal desktop."

breakpoints:
  large_desktop:
    - "dos columnas ~46/54."
  desktop_1366:
    - "dos columnas si sigue siendo legible."
    - "se permite 44/56."
    - "Top6 puede reducir comentario o envolver."
  tablet:
    - "si ya no cabe legible, apilar."
  mobile:
    - "Rentabilidad."
    - "Semanas + cierre."
    - "CASA gráfica."
    - "CASA Top6."
    - "COMISIONISTA gráfica."
    - "COMISIONISTA Top6."

double_click:
  - "Fila completa continúa interactiva."
  - "Doble clic abre gráfica cliente."
  - "Click simple no abre."
  - "No cambiar modal cliente."

functional_contract:
  - "Top6 sigue exactamente data.clientes_top."
  - "No sort."
  - "No recompute."
  - "No nuevo fetch."
  - "Provincia intacta."
  - "Comentarios intactos."
  - "Rango intacto."
  - "IGF financiero intacto."

acceptance_criteria:
  - "La columna ARR es notablemente más ancha que en 057."
  - "CASA gráfica ocupa todo el ancho de columna derecha."
  - "COMISIONISTA igual."
  - "Top 6 CASA muestra 6 rows legibles."
  - "Top 6 COMISIONISTA muestra 6 rows legibles."
  - "Nombre del cliente se aprecia claramente."
  - "Movimiento, delta, Prev y Actual se leen sin apretarse."
  - "Comentarios tienen espacio útil."
  - "No scroll interno."
  - "No gran hueco entre gráfica y Top6."
  - "Izquierda conserva Rentabilidad/semanas/cierre."
  - "ARR normal fullscreen no cambia."
  - "Double click intacto."
  - "Provincia intacta."
  - "No backend."

validation:
  - "1920x1080."
  - "1600x900."
  - "1366x768."
  - "CASA con nombres largos."
  - "COMISIONISTA con nombres largos."
  - "0/1/2 comentarios."
  - "6 clientes."
  - "1M."
  - "3M."
  - "Provincia."
  - "double click."
  - "057."
  - "057-R1."
  - "056."
  - "056-R1."
  - "018."
  - "019."
  - "git diff --check."

allowed_actions:
  - "crear rama 058 desde base_sha"
  - "ajustar layout desktop IGF"
  - "ajustar CSS embedded ARR"
  - "compactar Top6"
  - "agregar tests"
  - "crear reporte"
  - "commit"
  - "push solo rama 058"

forbidden_actions:
  - "cambiar renderer matemático"
  - "cambiar datos Top6"
  - "cambiar comentarios backend"
  - "cambiar API"
  - "cambiar IGF financiero"
  - "writes"
  - "DDL"
  - "git add ."
  - "PR"
  - "merge"
  - "deploy"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-ARR-DESKTOP-OPTIMIZED-LAYOUT-058.md"