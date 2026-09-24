# CURRENT_TASK

```yaml
task_id: "FIX-IGF-DIARIO-PUEBLA-CALC-037"
title: "Corregir faltantes, subtotales y calendario de IGF Diario Puebla"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T13:50:22-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"

objective: "Corregir los cálculos de IGF Diario Puebla cuando falten gastos o datos diarios, hacer seguros sus subtotales y aplicar el descanso de transmisión presidencial en la fecha correcta."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "dc1580ab840b660e1667e16fe1ed3f8597228020"
branch: "fix/igf-diario-puebla-calc-037"

in_scope:
  - "lib/igf-diario-puebla.js: gastos faltantes, fórmulas de subtotal y calendario de esta hoja"
  - "server.js: validar que un gasto null, undefined o vacío no se convierta en cero al pasar los importes del ARR mini"
  - "test/igf-diario-puebla-037.test.js: pruebas de las correcciones"
  - "pruebas existentes directamente afectadas, solo para ejecutarlas"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-CALC-037.md"
  - "docs/dev-loop/CURRENT_TASK.md: únicamente transiciones de status después de esta autorización humana"

out_of_scope:
  - "modificar la tarea o el reporte 036"
  - "cambiar cálculos del ARR mini, IGF Forecast, PRECIO, CONTROL DE COMPRAS o demás hojas"
  - "cambiar lib/feriados-mx.js o el calendario de otros módulos"
  - "cambiar plantas distintas de Puebla/GT Puebla o la exportación global"
  - "frontend, esquemas y datos de PostgreSQL"
  - "docs/director-ia/, AGENTS.md, LOOP_PROTOCOL.md y TASK_TEMPLATE.md"
  - "PR, merge a main y despliegue"
  - "archivos preexistentes de frontend-dashboard/.next"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "La tarea 036 terminó en DONE_PENDING_REVIEW; esta es una tarea nueva, autorizada por el humano."
  - "La rama 037 parte exactamente de base_sha y conserva los demás comportamientos aceptados de la 036."
  - "Los domingos y descansos obligatorios dejan M y T vacías y amarillas; una falta de presupuesto en día hábil es un caso distinto."
  - "El importe cero explícito es válido; null, undefined y texto vacío no son un importe cero."

acceptance_criteria:
  - "En día hábil, si falta M3 o M no puede calcularse, O queda vacío en vez de copiar H. Si falta T3 o T no puede calcularse, V queda vacío en vez de copiar O. Los resultados dependientes no muestran un margen que omita silenciosamente ese gasto."
  - "En domingo o descanso obligatorio, M y T permanecen realmente vacías y amarillas; O y V conservan el comportamiento previsto para un día sin distribución de esos gastos."
  - "M3/T3 ausentes permanecen vacías. Un cero recibido explícitamente del ARR mini permanece cero."
  - "Los subtotales semanales ponderados funcionan cuando una celda diaria es vacía o una fórmula devuelve texto vacío; no multiplican directamente rangos que puedan contener texto. Mantener ponderación por kg y los mismos días de cada semana."
  - "Si B, D, X o AF no contienen ningún número válido durante una semana o durante el mes, su subtotal queda vacío en vez de mostrar un cero aparente. Si contienen números válidos, se suman."
  - "El descanso por transmisión del Poder Ejecutivo Federal es el 1 de octubre cada seis años a partir de 2024; no marcar el 1 de diciembre por ese motivo. Los demás domingos y descansos mantienen su comportamiento."
  - "Septiembre 2026 conserva 25 días hábiles y sus inhábiles 6, 13, 16, 20 y 27."
  - "La primera pestaña, las referencias por fecha, las columnas F/G/X y el resto de las plantas conservan el comportamiento de la 036."

validation:
  - "Cubrir un día hábil con M3 ausente, otro con T3 ausente y un presupuesto explícito igual a cero; comprobar O, V y los resultados dependientes."
  - "Cubrir un domingo con venta y M/T vacías, separado del caso de presupuesto faltante en día hábil."
  - "Cubrir semanas con valores numéricos mezclados con fórmulas que devuelven texto vacío, y semanas sin valores válidos; comprobar ponderados y sumas semanales y mensuales."
  - "Cubrir octubre de 2024 y 2030, y octubre y diciembre de 2036 para distinguir el 1 de octubre del 1 de diciembre."
  - "Ejecutar 036, 024, 026, 027, 028, 029 y 030, además de la nueva 037; git diff --check."
  - "Si hay motor de recálculo disponible, comprobar un libro de prueba recalculado. Si no lo hay, registrar esa limitación sin afirmar que ExcelJS calcula fórmulas."

allowed_actions:
  - "crear la rama 037 desde base_sha"
  - "editar únicamente archivos in_scope"
  - "ejecutar pruebas y crear el reporte 037"
  - "hacer commit y push únicamente a la rama 037"

forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "editar, descartar, añadir al índice o commitear frontend-dashboard/.next"
  - "usar git add ."
  - "inventar importes ausentes o cierres empresariales"
  - "abrir PR, fusionar a main o desplegar"
  - "encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-PUEBLA-CALC-037.md"
```