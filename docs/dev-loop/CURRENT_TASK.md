# CURRENT_TASK

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-CARRY-FORWARD-STYLE-039"
title: "Cerrar días sin compras y reproducir el formato de IGF Diario Puebla"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T14:57:19-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"

prior_task_review: "Autorizo usar el commit 038 como base de la 039. No autorizo todavía integrar el PR 83 ni desplegar."

objective: "En IGF Diario Puebla, cerrar días ya transcurridos sin compras usando el último costo y flete válidos de cada variable, y reproducir el formato visual y los dígitos del ejemplo."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "b8b15fa2a770d898d8777793704f8b6c85b21793"
branch: "fix/igf-diario-puebla-carry-forward-style-039"

in_scope:
  - "lib/igf-diario-puebla.js: arrastre histórico, fórmulas semanales y formato de esta hoja"
  - "lib/dashboard-arr-forecast.js: pasar a la hoja la fecha de corte efectiva"
  - "test/igf-diario-puebla-039.test.js: casos nuevos"
  - "pruebas 036 y 037: ajustar únicamente aserciones que cambien por el formato o posición de filas autorizados"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-CARRY-FORWARD-STYLE-039.md"
  - "docs/dev-loop/CURRENT_TASK.md: únicamente transiciones de status después de esta autorización"

out_of_scope:
  - "cambiar o rellenar CONTROL DE COMPRAS"
  - "arrastrar valores en el día del corte o en fechas futuras"
  - "cambiar otras plantas, datos PostgreSQL, ARR mini o cálculo de gastos"
  - "copiar el importe OPERATIVOS antiguo del ejemplo"
  - "cambiar el significado de X: sigue siendo IMPORTE HG"
  - "frontend-dashboard/.next, AGENTS.md y LOOP_PROTOCOL.md"
  - "PR, merge a main y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "El arrastre se aplica únicamente a fechas anteriores al corte efectivo de la exportación; sin corte seleccionado, usar hoy en Ciudad de México, igual que Compras."
  - "Buscar hacia atrás por separado para F=COSTO KG y G=FLETE KG. Aceptar solo números distintos de cero; omitir vacíos, texto, cero, filas de subtotal y fechas posteriores."
  - "Conservar las fórmulas y el dato bruto de CONTROL DE COMPRAS. La celda arrastrada en IGF debe seguir siendo fórmula, y actualizarse al cambiar su fuente."
  - "Si no existe un valor anterior válido para una variable, dejar esa variable y los resultados dependientes vacíos."
  - "Conservar domingos e inhábiles: M y T vacías y amarillas; septiembre 2026 conserva 25 días hábiles."
  - "Usar cambios.xlsx y las dos capturas como referencia VISUAL; no copiar sus fórmulas rotas, encabezado HG incorrecto ni el OPERATIVOS antiguo."

acceptance_criteria:
  - "Con corte 2026-09-24, el 19/09 está en fila 28. CONTROL DE COMPRAS O28 y AJ28 permanecen sin dato; IGF F28 toma 11.965423104349892 y G28 toma 1.23 del 18/09, mediante fórmulas y con fondo amarillo."
  - "El 19/09 muestra H28 aproximadamente 6.33556606 y AF28 aproximadamente 31042.20 antes del formato visual; AF28 se muestra como $31,042."
  - "La semana 3 y TOTAL MES incorporan el resultado del 19. Un día con costo real válido conserva su costo; F y G pueden retroceder a días distintos."
  - "Dos o más días históricos seguidos sin dato arrastran el último valor válido de cada variable. Cero y vacío se omiten."
  - "El 24/09, día de corte en curso, y el 25/09 no reciben este arrastre histórico."
  - "El precio ponderado C12 calcula aproximadamente 18.908463847 y muestra 18.91. Sustituir el uso dudoso de N(rango) en los promedios semanales por operaciones escalares verificables, sin perder ponderación por kg ni convertir vacíos en ceros."
  - "Formato de referencia: título negro sobre blanco Calibri 20; encabezados de grupo blancos con letras negras; encabezados inferiores #2F2F2F con letras blancas; fechas #B8CCE4; resultados H/O/V/AA azul claro #DCE6F1; AF azul #95B3D7; inhábiles M/T amarillo #FFFF00; F/G arrastrados amarillo #FFFF00; primer cuadro de semana y TOTAL MES negros, resto de subtotal gris claro #F2F2F2. Negativos visibles en rojo como en el ejemplo."
  - "Dígitos visibles diarios: B/D/X sin decimales y con separador de miles; C/F/G/H/M/O/T/V/Y/AA/AC/AE con 2 decimales; AF como moneda sin decimales. Subtotales: B sin decimales, métricas por kg y AF con 2 decimales. M3 y T3 como moneda con separador de miles y 2 decimales. Mantener precisión interna de las fórmulas."
  - "Aplicar dimensiones del ejemplo: A 16.5547, B 14, D 15.2188, H 13.5547, M 23.2188, O 15.5547, T 21.3320, V 20.7773, X 14.7773, Y 13, AA/AC 20.7773, AE/AF 16.5547 y AH 65.8867; separadores E/I/J/K/L/N/P/Q/R/S/U/W/Z/AB/AD/AG 2.2188; C/F/G ancho predeterminado. Alturas: fila 1 25.8, 3 18, 4 14.4, 5 23.4 y subtotales 18.6."
  - "Conservar AH como columna visual COMENTARIO DEL DIA, vacía si no hay fuente. En septiembre 2026, última semana en fila 45 y TOTAL MES en fila 47, con las filas de separación del ejemplo. Para otros meses, conservar semanas lunes-domingo y no insertar fechas de otro mes."
  - "Los importes M3 y T3 siguen saliendo del ARR mini del mes: septiembre 2026 muestra 1034293 y 2998518, respectivamente."
  - "La exportación abre sin reparaciones, IGF Diario Puebla sigue primera y las demás hojas conservan sus datos."

validation:
  - "Probar arrastre independiente de F y G, ceros, vacíos, primer día sin antecedente, días consecutivos, corte actual y días futuros."
  - "Probar estilos, formatos numéricos, anchos, alturas, filas semanales, C12 y totales."
  - "Ejecutar 039, 038, 037, 036, 024, 026, 027, 028, 029 y 030; git diff --check."
  - "Registrar en el reporte qué se comprobó mediante fórmulas y qué requiere recálculo de Excel; ExcelJS no recalcula."

allowed_actions:
  - "crear rama 039 desde base_sha en un árbol aislado"
  - "editar únicamente in_scope"
  - "ejecutar pruebas, crear reporte, commit y push únicamente a rama 039"

forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "usar git add . o tocar cambios ajenos de frontend-dashboard/.next"
  - "abrir PR, hacer merge a main o desplegar"
  - "encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-CARRY-FORWARD-STYLE-039.md"