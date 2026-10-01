task_id: "FIX-IGF-ARR-VISUAL-PARITY-COMMENTS-056-R1"

title: "Reutilizar visual ARR real en IGF y completar comentarios Provincia"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-01"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-01"

prior_task:
  task_id: "IMPL-IGF-GRAFICA-ARR-CANALES-LAYOUT-056"
  sha: "3755443cdb962214277a3ce07729d4b9abf3a49d"
  status: "DONE_PENDING_REVIEW"

base_sha: "3755443cdb962214277a3ce07729d4b9abf3a49d"

branch: "fix/igf-arr-visual-parity-comments-056-r1"

review_findings: >
  056 resolvió correctamente tendencia amarilla, alineación de semanas,
  eliminación visual de Clientes Nuevos, CASA/COMISIONISTA con el motor ARR,
  Top 6, doble clic, Provincia y seguridad.
  Sin embargo ArrVentaCanalPanel creó una visualización paralela 320x120
  simplificada. No reproduce la gráfica ARR mostrada por el usuario:
  faltan ejes X/Y, área sombreada, labels, hover, tooltip y composición
  gráfica + Top 6 + Últimos comentarios.
  Además Provincia puede devolver comentarios vacíos porque intenta resolver
  "Provincia" como una planta individual.

objective: >
  Hacer que CASA y COMISIONISTA dentro del modal IGF utilicen exactamente
  el mismo componente visual/presentacional que ArrVentaGraficaModal,
  manteniendo el mismo endpoint, cálculos, ejes, área, tendencia, hover,
  tooltips, Top 6 y comentarios. Corregir además la resolución de comentarios
  cuando el scope es Provincia.

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

in_scope:
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
  - "frontend-dashboard/components/ArrVentaCanalPanel.tsx"
  - "frontend-dashboard/components/IgfDiarioGraficaModal.tsx"
  - "frontend-dashboard/lib/api.ts solo si es estrictamente necesario"
  - "server.js"
  - "lib/commercial-trend-engine.js solo si hace falta exponer scope resuelto"
  - "tests 056 y nuevo 056-R1"
  - "docs/dev-loop/reports/FIX-IGF-ARR-VISUAL-PARITY-COMMENTS-056-R1.md"
  - "docs/dev-loop/CURRENT_TASK.md solo status"

out_of_scope:
  - "cambiar AF/AE"
  - "cambiar CIERRE PROYECTADO"
  - "cambiar cálculo commercialTrend"
  - "cambiar selección Top 6"
  - "cambiar definición de canal"
  - "cambiar Delta Ingreso Cliente Forecast"
  - "cambiar Clientes Nuevos backend"
  - "DB/schema"
  - "writes nuevos"
  - "OpenAI"
  - "PR"
  - "merge"
  - "deploy"

primary_rule:
  - "Debe existir UNA sola implementación visual de la gráfica ARR."
  - "ArrVentaGraficaModal y los paneles embebidos IGF deben renderizar ese mismo contenido."
  - "No mantener una gráfica 320x120 paralela con otra matemática/render."
  - "No duplicar linearTrend."
  - "No duplicar escala X/Y."
  - "No duplicar ticks."
  - "No duplicar hover/tooltip."
  - "No duplicar areaPath/linePath."

shared_visual:
  preferred_design: >
    Extraer dentro de ArrVentaGraficaModal.tsx o a un componente compartido
    una vista presentacional reusable, por ejemplo ArrVentaSerieView /
    ArrVentaGraficaContent. ArrVentaGraficaModal conserva el shell modal
    y usa esa vista. ArrVentaCanalPanel obtiene data con fetchArrVentaSerie
    y usa exactamente esa misma vista.
  requirements:
    - "Mismo eje Y toneladas."
    - "Mismos ticks Y."
    - "Mismo eje X y labels de fechas."
    - "Misma área sombreada bajo Venta."
    - "Misma línea de venta."
    - "Misma línea verde de tendencia."
    - "Mismo punto final."
    - "Mismo hover/click por fecha."
    - "Mismo tooltip con toneladas y descuento."
    - "Mismo cálculo y formatting."
    - "Mismo Top 6 delta."
    - "Mismos Prev / Actual."
    - "Mismos últimos comentarios."
    - "Mismos badges Aumentó/Disminuyó/Nuevo/Dejó de comprar."

arr_original_regression:
  - "ArrVentaGraficaModal debe verse y funcionar igual que antes."
  - "Los tests 018/019 deben continuar pasando."
  - "El botón GRAFICA de DeltaIngresoClienteForecastModal sigue abriendo el mismo modal."
  - "Mode cliente conserva Venta Ton + Descuento $/kg + tendencia + Movimiento + comentarios."
  - "No degradar la gráfica ARR original para facilitar embedded."

embedded_mode:
  - "Crear modo embedded en la vista compartida, no una implementación visual distinta."
  - "En embedded ocultar únicamente:"
  - "shell fixed/fullscreen"
  - "botón Cerrar"
  - "selector CASA/COMISIONISTA"
  - "botones propios de rango"
  - "Mantener gráfica, ejes, área, tooltip, Top 6 y comentarios."
  - "El rango lo sigue controlando IGF."

embedded_layout:
  desktop:
    - "Cada canal debe parecer una versión compacta de la gráfica ARR de la captura."
    - "Gráfica a la izquierda."
    - "Top 6 y Últimos comentarios a la derecha."
    - "CASA arriba."
    - "COMISIONISTA abajo."
    - "No reducir a sparkline."
  dimensions:
    - "No fijar SVG conceptual a 320x120."
    - "Usar el mismo viewBox/layout base ARR o un responsive derivado del mismo componente."
    - "Debe conservar ejes legibles."
    - "Objetivo aproximado por panel: 260-330 px de alto en desktop."
  mobile:
    - "Gráfica arriba."
    - "Top 6/comentarios debajo."
    - "Sin overflow destructivo."

channel_identity:
  - "CASA conserva amarillo."
  - "COMISIONISTA conserva azul."
  - "Tendencia conserva verde."
  - "No cambiar colores ARR actuales."

top6_contract:
  - "Top 6 = data.clientes_top."
  - "No sort adicional."
  - "No recalcular delta."
  - "Mostrar las mismas seis filas del ARR normal."
  - "Mostrar comentarios asociados a cada cliente igual que ARR."
  - "Doble clic sigue abriendo mode=cliente."

double_click:
  - "Click simple no abre."
  - "Doble clic abre ArrVentaGraficaModal mode=cliente."
  - "clienteNorm exacto del item."
  - "province flag se conserva."
  - "Cliente modal z-index > IGF."
  - "Cerrar cliente deja IGF abierto."

igf_layout:
  - "Mantener Rentabilidad IGF izquierda."
  - "Mantener semanas alineadas de 056."
  - "Mantener CIERRE PROYECTADO en columna separada."
  - "Mantener tendencia IGF amarilla."
  - "Derecha sigue CASA + COMISIONISTA."
  - "Clientes Nuevos permanece fuera del render."

province_comments_problem:
  current_issue: >
    /api/arr/venta-serie con provincia=1 usa correctamente todos los plant codes
    para venta/Top6, pero la carga de comentarios intenta resolver empresa
    "Provincia" o plantCode "Provincia" como una planta individual.
  required_behavior:
    - "Para provincia=1, obtener todos los planta_id del mismo scope Provincia."
    - "No resolver literalmente una planta llamada Provincia."
    - "Usar las mismas plantas autorizadas por resolveAllProvinciaPlantCodes."
    - "Mapear esos plant codes a public.plantas / planta_id canónico o equivalentes."
    - "Consultar arr.cliente_comentarios para todos esos planta_id."
    - "Máximo 2 comentarios recientes por cliente Top 6."
    - "Para gráfica mode=cliente en Provincia, los comentarios también deben ser del scope Provincia."
    - "No mezclar comentarios de plantas fuera de arr.provincia_plants."
    - "No duplicar un mismo comentario por aliases equivalentes."

province_security:
  - "provincia=1 sigue protegido por igfDiarioTodasRequestBlock."
  - "El gate debe correr antes de pool.connect()."
  - "Usuarios locales siguen recibiendo 403."
  - "No permitir empresa=Provincia sin provincia=1."
  - "La corrección de comentarios no puede debilitar el gate."

province_comments_query:
  - "Resolver planta IDs una sola vez por request."
  - "No consultar comentarios por cada cliente."
  - "Mantener consulta batch con nombres del Top 6."
  - "No N+1."

performance:
  - "CASA y COMISIONISTA siguen cargándose en paralelo."
  - "Una request por canal por empresa/range."
  - "AbortController sigue activo en embedded."
  - "No request por hover."
  - "No duplicar fetch porque la vista compartida no debe volver a cargar datos si ya recibe payload."

data_ownership:
  - "ArrVentaCanalPanel puede seguir siendo responsable del fetch embedded."
  - "La vista compartida debe ser presentacional: recibe points/clientesTop/range/canal."
  - "ArrVentaGraficaModal puede conservar su fetch propio y pasar los mismos datos a la vista."
  - "No montar ArrVentaGraficaModal fullscreen dentro de la columna como sustituto."

visual_parity_acceptance:
  - "Embedded CASA tiene ticks Y."
  - "Embedded CASA tiene fechas X."
  - "Embedded CASA tiene área sombreada."
  - "Embedded CASA tiene tendencia verde."
  - "Embedded CASA tiene hover/tooltip."
  - "Embedded CASA tiene Top 6."
  - "Embedded CASA tiene Últimos comentarios."
  - "COMISIONISTA igual."
  - "La matemática gráfica debe ser compartida, no copiada."

province_acceptance:
  - "Provincia CASA serie sigue agregada."
  - "Provincia COMISIONISTA serie sigue agregada."
  - "Top 6 sigue agregado por cliente."
  - "Top 6 Provincia recibe comentarios de las plantas Provincia."
  - "Cliente Provincia recibe comentarios del mismo scope."
  - "Planta ajena no aparece."
  - "Gate local 403."

acceptance_criteria:
  - "No existe mini gráfica visual independiente 320x120 como implementación principal."
  - "ArrVentaCanalPanel usa la vista visual compartida ARR."
  - "No hay segunda función linearTrend en ArrVentaCanalPanel."
  - "No hay segunda implementación de ticks/paths/tooltip."
  - "CASA embebida visualmente corresponde al ARR normal."
  - "COMISIONISTA embebida visualmente corresponde al ARR normal."
  - "ARR normal no cambia funcionalmente."
  - "Delta Forecast GRAFICA no cambia."
  - "Doble clic cliente funciona."
  - "Provincia comments funciona."
  - "056 anterior sigue intacta."
  - "055/054-R3 siguen intactas."
  - "No writes nuevos."
  - "No DDL nuevo."
  - "No OpenAI."

validation:
  - "CASA individual 1M."
  - "COMISIONISTA individual 1M."
  - "CASA 3M."
  - "COMISIONISTA 3M."
  - "hover embedded."
  - "tooltip embedded."
  - "Top6 parity normal vs embedded."
  - "comments parity normal vs embedded."
  - "double click CASA."
  - "double click COMISIONISTA."
  - "Provincia Top6 comments."
  - "Provincia cliente comments."
  - "Provincia gate 403."
  - "planta ajena excluida."
  - "018."
  - "019."
  - "056."
  - "055."
  - "054/R1/R2/R3."
  - "053A/053BC."
  - "050/052."
  - "commercial-trend engine."
  - "git diff --check."

allowed_actions:
  - "crear rama R1 desde base_sha"
  - "refactorizar visual ARR a componente compartido"
  - "adaptar ArrVentaCanalPanel para usar visual compartido"
  - "corregir comentarios Provincia"
  - "agregar tests"
  - "crear reporte"
  - "commit"
  - "push solo rama R1"

forbidden_actions:
  - "crear otra mini gráfica ARR"
  - "duplicar linearTrend"
  - "duplicar paths/ticks"
  - "cambiar Top6"
  - "cambiar matemática commercialTrend"
  - "cambiar IGF financiero"
  - "writes nuevos"
  - "DDL nuevo"
  - "git add ."
  - "tocar frontend-dashboard/.next"
  - "PR"
  - "merge"
  - "deploy"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-ARR-VISUAL-PARITY-COMMENTS-056-R1.md"