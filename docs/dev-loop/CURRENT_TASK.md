# CURRENT_TASK

```yaml
task_id: "IMPL-IGF-DIARIO-PUEBLA-036"
title: "Excel Forecast — agregar IGF Diario Puebla como primera hoja"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T13:25:15-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"

objective: "Generar como primera hoja del Excel Forecast de Puebla un IGF diario con fórmulas vinculadas por fecha, gastos mensuales del ARR y distribución automática sobre días hábiles."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "1ed42aec58e3205defa2f871a9b9116abc2c59e0"
branch: "feat/igf-diario-puebla-036"

in_scope:
  - "lib/dashboard-arr-forecast.js: insertar y poblar la hoja únicamente en exportaciones autorizadas de Puebla"
  - "lib/igf-diario-puebla.js: nuevo generador y calendario específico de la hoja"
  - "server.js: únicamente la ruta /api/arr/dashboard-excel para pasar los gastos del ARR mini del mismo mes, corte y planta"
  - "test/igf-diario-puebla-036.test.js"
  - "pruebas de exportación directamente afectadas"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PUEBLA-036.md"
  - "docs/dev-loop/CURRENT_TASK.md: únicamente transición de status"

out_of_scope:
  - "modificar el archivo cambios.xlsx o usarlo como plantilla copiada"
  - "cambiar los cálculos existentes de ARR, Pronostico, PRECIO, COMPRAS o IGF Forecast"
  - "cambiar lib/feriados-mx.js o el forecast mensual existente"
  - "agregar esta hoja a otras plantas o a la exportación global"
  - "frontend, esquemas o datos de PostgreSQL"
  - "AGENTS.md, LOOP_PROTOCOL.md y contratos de Director IA"
  - "PR, merge a main y despliegue"
  - "los ocho cambios locales preexistentes de frontend-dashboard/.next"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "origin/main en base_sha; la 035 ya está integrada"
  - "El archivo cambios.xlsx es referencia visual y de relaciones, no fuente autorizada de importes ni de fórmulas copiadas."
  - "M3 y T3 usan CORPORATIVOS y OPERATIVOS de la misma respuesta ARR mini que consume el resumen ARR, para Puebla, mes y fecha de corte de la exportación."
  - "Los días inhábiles automáticos son domingos y descansos obligatorios federales aplicables; no deducirlos de una venta en cero."
  - "Fechas de cierre empresarial adicionales requieren una fuente explícita; no inventarlas."

acceptance_criteria:
  - "La primera pestaña se llama exactamente IGF Diario Puebla solo al exportar Puebla/GT Puebla; las demás conservan sus nombres y orden relativo."
  - "A contiene fechas reales de Excel del mes; semanas de lunes a domingo, con subtotal Semana 1, Semana 2, etc., y última semana parcial. No crear un día 31 en meses de 30 días."
  - "Para cada fecha, identificar filas origen por fecha y columnas por encabezado/planta cuando corresponda; no usar desplazamientos fijos que se rompan al insertar subtotales."
  - "B = (CASA + COMISIONISTA de Provincia Venta Diaria) * 1000; C = PRECIO del día; D = C*B."
  - "F = CONTROL DE COMPRAS O del día; G = CONTROL DE COMPRAS AJ del día; H = C-F-G."
  - "M3 = CORPORATIVOS del ARR mini Puebla del mismo periodo y corte; T3 = OPERATIVOS de esa misma fuente. Nunca usar cifras escritas a mano ni confundir con otra versión del libro."
  - "M = (M3 / días hábiles del mes) / B en día hábil con B positivo; O = H-M."
  - "T = (T3 / días hábiles del mes) / B en día hábil con B positivo; V = O-T."
  - "X = CONTROL DE COMPRAS T del día, que es IMPORTE HG; Y = X/B; AA = V-Y."
  - "AC = Provincia Comisiones B del día; AE = AA+AC; AF = AE*B."
  - "Titular X como importe HG y Y como importe HG por kg; no llamar kilos a la columna X."
  - "M y T quedan realmente vacías y amarillas los domingos y demás inhábiles; las otras columnas siguen calculándose aunque exista venta ese día."
  - "Septiembre 2026: inhábiles 6, 13, 16, 20 y 27; divisor 25. El 16 puede tener venta y aun así M/T vacías."
  - "El divisor se recalcula para cada mes y año, incluyendo feriados móviles. Una fecha inhábil que también cae domingo se descuenta una sola vez."
  - "Permitir fechas empresariales adicionales únicamente si se proporcionan explícitamente; documentar que hoy no existe una fuente empresarial de esos cierres."
  - "Subtotales semanales y TOTAL MES: sumar B, D, X y AF; métricas por kg mediante agregación ponderada por los kg del periodo. No promedios simples ni semanas que omitan días."
  - "Si falta un precio, costo, tarifa, comisión, importe o presupuesto requerido, no convertir el faltante en un cero aparente. Evitar #DIV/0! cuando B sea cero."
  - "Conservar presentación por bloques, fechas azules, subtotales oscuros y M/T amarillas en inhábiles."

validation:
  - "Probar primera y última semana parcial de septiembre 2026, 16/09 con venta y M/T vacías, divisor 25 y un mes con otro número de hábiles."
  - "Probar relación por fecha del domingo 06/09 con CONTROL DE COMPRAS fila 13 y las fechas posteriores al 23/09."
  - "Probar encabezados CASA/COMISIONISTA, columnas correctas de HG, comisiones y resultados hasta el último día."
  - "Probar gastos ARR mini del periodo/planta seleccionados, datos faltantes, B=0, cierre adicional explícito y ausencia de contaminación entre plantas."
  - "Probar que otras plantas y el libro global no reciben la hoja; conservar sus órdenes previos."
  - "Ejecutar pruebas 024, 026, 027, 028, 029, 030 y demás regresiones directamente afectadas; git diff --check."
  - "Registrar en reporte fórmulas representativas, origen M3/T3, conteo hábil y limitaciones de recálculo ExcelJS."

allowed_actions:
  - "crear la rama 036 desde base_sha"
  - "editar únicamente archivos in_scope"
  - "ejecutar pruebas"
  - "crear reporte 036"
  - "commit y push únicamente a la rama 036"

forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "editar, descartar, añadir al índice o commitear frontend-dashboard/.next"
  - "usar git add ."
  - "inventar presupuestos o fechas de cierre de la empresa"
  - "abrir PR, fusionar a main o desplegar"
  - "encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/IMPL-IGF-DIARIO-PUEBLA-036.md"
```