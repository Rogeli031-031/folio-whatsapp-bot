task_id: "FIX-IGF-GRAFICA-CORTE-CD-CLIENTES-054-R2"

title: "Cerrar paridad de corte, C&D mensual y contexto de clientes nuevos"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-28"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-28"

prior_task_review: "054-R1 está en 12d9381b18bae8697accf1cea34ec2d27a538101. La paridad B/C/F/G/X/AC/AE/AF quedó corregida en los casos probados, pero la auditoría encontró tres bordes: venta capturada en la fecha exacta del corte puede ganar sobre forecast; C&D primary/fallback se decide una sola vez para toda la ventana en vez de mes por mes; y el loader de clientes puede omitir el mes anterior necesario para newClientEvents."

objective: "Cerrar únicamente los tres bordes restantes de 054: fecha exacta del corte siempre proyectada, resolución C&D primary/fallback por mes exactamente como Excel, y conservación del mes calendario anterior para clasificar clientes nuevos sin ampliar innecesariamente las consultas financieras."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "12d9381b18bae8697accf1cea34ec2d27a538101"

branch: "fix/igf-grafica-corte-cd-clientes-054-r2"

in_scope:
  - "lib/dashboard-arr-forecast.js"
  - "lib/igf-diario-grafica.js"
  - "tests 054/054-R1 afectados"
  - "nuevo test 054-R2"
  - "docs/dev-loop/reports/FIX-IGF-GRAFICA-CORTE-CD-CLIENTES-054-R2.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "rediseñar modal"
  - "cambiar AF/AE"
  - "cambiar costo/flete/HG salvo regresión"
  - "cambiar definición de cliente nuevo 053BC"
  - "cambiar Top 10"
  - "cambiar seguridad"
  - "DB/schema"
  - "writes/DDL"
  - "OpenAI"
  - "PR, merge o deploy"

cutoff_contract:
  - "Contrato 050: fecha < corte = real."
  - "Contrato 050: fecha >= corte = proyectado."
  - "La fecha exacta del corte nunca debe conservar venta capturada como real para IGF."
  - "Si fecha == corte y existe venta real + forecast, gana forecast."
  - "Venta y C&D deben usar la misma frontera temporal."
  - "No permitir día híbrido donde venta sea real y C&D proyectado."
  - "Después del corte también sigue ganando forecast."
  - "Antes del corte sigue ganando dato real."

shared_cutoff_helper_contract:
  - "Corregir la lógica compartida usada por Excel y gráfica, no solo el endpoint."
  - "Auditar canalIsAfterCutoff, projectMissingVenta y helpers equivalentes."
  - "No hacer reemplazo global ciego de > por >=."
  - "Cambiar únicamente comparaciones que representen la frontera fecha real/proyectada del contrato 050."
  - "Excel y gráfica deben seguir usando el mismo helper."

cd_month_contract:
  - "La decisión primary/fallback de C&D se hace por MES calendario."
  - "Debe reproducir getDescuentoPorKiloGrid."
  - "Si un mes tiene al menos una fila primary, ese mes usa primary y NO fallback."
  - "Si ese mes completo no tiene filas primary, usar fallback ventas/descuentos para ese mes."
  - "La existencia de primary en septiembre no puede impedir fallback de agosto."
  - "La existencia de primary en un mes no rellena huecos de otro mes."
  - "No hacer fallback por día ni por planta si el Excel lo decide a nivel mensual."
  - "En el mes abierto, después de resolver el dato real mensual, la proyección sigue entrando mediante resolveComisionCd/promDescTotal."
  - "Meses históricos cerrados no usan forecast."

cd_loader_contract:
  - "Preferir loadCdMonthIndex(client, year, month) o equivalente."
  - "Puede cachearse por YYYY-MM."
  - "No ejecutar un query primary y fallback por cada planta."
  - "Resolver cada mes una sola vez y compartirlo entre plantas."
  - "Query count debe crecer por meses, no por días ni por plantas."

new_clients_context_contract:
  - "newClientEvents necesita el mes calendario anterior al mes seleccionado."
  - "Para septiembre debe poder ver agosto."
  - "Para enero debe poder ver diciembre del año anterior."
  - "El rango visual 1D/5D/1M no puede recortar esa historia necesaria."
  - "Separar customerFactsStart de financialStart."
  - "financialStart = inicio del primer mes realmente mostrado por el rango."
  - "customerFactsStart = mínimo entre financialStart y previousMonthStart(year, month)."
  - "loadPlantFacts ventas/descuentos debe usar customerFactsStart."
  - "Compras, precio y C&D financiero no necesitan retroceder al mes anterior si ese mes no está en la gráfica."
  - "No alterar el periodo mostrado al usuario."

new_clients_examples:
  - "Agosto 100 kg, septiembre 850 kg => NO nuevo."
  - "Agosto 0 kg, septiembre 850 kg => nuevo."
  - "Diciembre 100 kg, enero 500 kg => NO nuevo."
  - "Diciembre 0 kg, enero 500 kg => nuevo."

parity_contract:
  - "B/C/F/G/X/AC/AE/AF siguen coincidiendo con Excel."
  - "Fecha exacta del corte debe probarse con captura real existente y forecast distinto."
  - "No basta probar fecha de corte sin captura real."
  - "Rangos multi-mes deben probar C&D con modos distintos por mes."

acceptance_criteria:
  - "Corte 03/09, captura real 9,000 kg y forecast 30,750 kg: B Excel y gráfica deben ser 30,750."
  - "02/09 sigue usando captura real."
  - "04/09 sigue proyectado."
  - "AC en la fecha exacta del corte usa forecast igual que Excel."
  - "No existe combinación B real + AC forecast en el corte."
  - "Agosto sin primary C&D + septiembre con primary: agosto usa fallback y septiembre primary."
  - "Agosto primary + septiembre sin primary: agosto primary y septiembre fallback."
  - "Cada mes cerrado usa su decisión propia."
  - "1M septiembre carga agosto para clasificar nuevos aunque no muestre agosto."
  - "Cliente con compra agosto no aparece como nuevo septiembre."
  - "Cliente sin compra agosto sí aparece."
  - "Cruce enero/diciembre funciona."
  - "Top 10 conserva volumen/descuento actual."
  - "Mini gráfica conserva Semana -2, Semana -1 y semana actual."
  - "No aumenta financialStart solo para clientes nuevos."
  - "Tendencia R1 sigue correcta."
  - "Gate global sigue intacto."
  - "No XLSX runtime."
  - "No writes/DDL."
  - "No OpenAI."

validation:
  - "Test explícito fecha == corte con venta capturada distinta al forecast."
  - "Comparar B/AC/AE/AF Excel vs gráfica en esa fecha."
  - "Test día anterior."
  - "Test día posterior."
  - "Test multi-mes agosto fallback + septiembre primary."
  - "Test inverso agosto primary + septiembre fallback."
  - "Test 1M con contexto de mes anterior."
  - "Test enero/diciembre."
  - "Test cliente no nuevo por compra previa."
  - "Test cliente nuevo sin compra previa."
  - "Ejecutar 054, R1, R2."
  - "Ejecutar 053BC."
  - "Ejecutar 050 y pruebas forecast afectadas."
  - "git diff --check."

allowed_actions:
  - "crear rama R2 desde base_sha"
  - "ajustar helpers compartidos de frontera de corte"
  - "crear loader C&D mensual cacheable"
  - "separar financialStart y customerFactsStart"
  - "agregar pruebas"
  - "crear reporte"
  - "commit"
  - "push solo a rama R2"

forbidden_actions:
  - "usar query por día"
  - "usar query C&D por planta"
  - "generar XLSX en runtime"
  - "cambiar definición comercial de nuevo"
  - "cambiar UI salvo que test requiera ajuste estrictamente técnico"
  - "usar git add ."
  - "tocar frontend-dashboard/.next"
  - "hacer migraciones"
  - "abrir PR"
  - "hacer merge"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-GRAFICA-CORTE-CD-CLIENTES-054-R2.md"