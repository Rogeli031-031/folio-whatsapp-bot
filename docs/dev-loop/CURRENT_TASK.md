task_id: "FIX-IGF-ARR-EMBEDDED-ASPECT-LABELS-058-R1"

title: "Corregir proporción SVG embebida y labels Prev/Actual"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-02"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-02"

prior_task:
  task_id: "FIX-IGF-ARR-DESKTOP-OPTIMIZED-LAYOUT-058"
  sha: "e6f6246330f1364006fb0a7e8d91653df5018280"
  status: "DONE_PENDING_REVIEW"

base_sha: "e6f6246330f1364006fb0a7e8d91653df5018280"

branch: "fix/igf-arr-embedded-aspect-labels-058-r1"

review_findings: >
  058 optimiza correctamente la proporción 44/56 y 46/54 y compacta el Top 6.
  Quedan dos bordes visuales: embedded fuerza preserveAspectRatio="none",
  deformando verticalmente el SVG; y Prev/Actual usan md:hidden aunque el
  header tabular solo aparece desde xl, dejando valores sin etiqueta entre
  md y xl.

objective: >
  Mantener intacto el layout aprobado de 058, eliminando la deformación
  del SVG ARR embebido mediante una altura interna compacta del viewBox
  y manteniendo visibles Prev/Actual hasta el mismo breakpoint xl en que
  aparece la cabecera tabular.

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

in_scope:
  - "frontend-dashboard/components/ArrVentaGraficaModal.tsx"
  - "test/igf-arr-desktop-optimized-layout-058.test.js"
  - "test/igf-arr-top6-vertical-layout-057.test.js"
  - "test/igf-arr-top6-embedded-contrast-057-r1.test.js"
  - "nuevo test 058-R1"
  - "docs/dev-loop/reports/FIX-IGF-ARR-EMBEDDED-ASPECT-LABELS-058-R1.md"
  - "docs/dev-loop/CURRENT_TASK.md solo status"

out_of_scope:
  - "IgfDiarioGraficaModal salvo regresión"
  - "ArrVentaCanalPanel"
  - "server.js"
  - "API"
  - "commercial-trend-engine"
  - "Top 6 data"
  - "comments"
  - "Provincia"
  - "AF/AE"
  - "month_close"
  - "DB/schema"
  - "writes"
  - "OpenAI"
  - "PR"
  - "merge"
  - "deploy"

embedded_svg_contract:
  - "Eliminar preserveAspectRatio='none'."
  - "No estirar X/Y de forma independiente."
  - "Mantener preserveAspectRatio='xMidYMid meet'."
  - "Mantener W=980."
  - "Modo normal conserva H=460."
  - "Modo embedded usa H compacto cercano a 330."
  - "H debe formar parte del mismo cálculo chart/useMemo."
  - "Agregar embedded a dependencies del useMemo."
  - "No duplicar renderer."

expected_chart_geometry:
  normal:
    W: 980
    H: 460
  embedded:
    W: 980
    H: 330

embedded_height_rationale:
  - "Con ancho aproximado 700 px: 700*330/980 ≈ 236 px."
  - "Con ancho aproximado 760 px: ≈256 px."
  - "Eso cumple el objetivo visual 220–260 px sin deformación."

svg_class:
  - "Volver a h-auto w-full en embedded y normal."
  - "No fijar h-[240px]."
  - "No usar overflow:hidden para simular compresión."

chart_math:
  - "linearTrend intacta."
  - "yMin/yMax intactos."
  - "ticks intactos."
  - "xLabels intactos."
  - "paths intactos."
  - "Solo innerH cambia porque H embedded es menor."
  - "Datos de venta/tendencia no cambian."

tooltip:
  - "Tooltip debe usar coordenadas del mismo chart.H."
  - "No debe quedar fuera del viewBox embedded."
  - "Hover/click intactos."

responsive_labels:
  - "Header tabular embedded aparece desde xl."
  - "Prev y Actual deben mantener prefijo visible mientras no haya header."
  - "Cambiar md:hidden -> xl:hidden."
  - "En < xl mostrar 'Prev 46.58' y 'Actual 61.73'."
  - "En >= xl ocultar prefijos porque existen columnas PREV / ACTUAL."

layout_058:
  - "44/56 desde xl permanece."
  - "46/54 desde 2xl permanece."
  - "Gap permanece."
  - "Top 6 siete columnas permanece."
  - "Nombre completo permanece."
  - "Comentarios permanecen."
  - "No scroll interno."

normal_arr_contract:
  - "embedded=false sigue usando H=460."
  - "Modal ARR normal visualmente intacto."
  - "Mode cliente intacto."
  - "018/019 PASS."

acceptance_criteria:
  - "No existe preserveAspectRatio='none'."
  - "SVG usa xMidYMid meet."
  - "W=980."
  - "H embedded=330."
  - "H normal=460."
  - "embedded está en dependencies de chart useMemo."
  - "SVG usa h-auto w-full."
  - "No h-[240px]."
  - "Prev/Actual usan xl:hidden."
  - "No md:hidden en esos dos labels."
  - "44/56 y 46/54 intactos."
  - "Top6 intacto."
  - "Double click intacto."
  - "Provincia intacta."
  - "No backend."

validation:
  - "058-R1."
  - "058."
  - "057."
  - "057-R1."
  - "056."
  - "056-R1."
  - "018."
  - "019."
  - "git diff --check."

allowed_actions:
  - "crear rama R1 desde base_sha"
  - "ajustar H dentro del renderer compartido"
  - "corregir preserveAspectRatio"
  - "corregir breakpoints Prev/Actual"
  - "ajustar tests"
  - "crear reporte"
  - "commit"
  - "push solo rama R1"

forbidden_actions:
  - "cambiar proporciones 058"
  - "cambiar Top6 layout"
  - "cambiar cálculo ARR"
  - "cambiar backend"
  - "cambiar API"
  - "writes"
  - "DDL"
  - "git add ."
  - "PR"
  - "merge"
  - "deploy"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-ARR-EMBEDDED-ASPECT-LABELS-058-R1.md"