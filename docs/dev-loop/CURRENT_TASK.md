task_id: "FIX-IGF-PROVINCIA-MISSING-NO-CERO-053A-R1"

title: "IGF Diario Provincia no convierte métricas faltantes en cero"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-28"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-28"

prior_task_review: "La 053A está en 31cd8b6a2fa0b71100700bbd6ae6522078ef222c y no está integrada. La ponderación provincial es correcta cuando todas las plantas tienen dato, pero weightedAcross puede convertir implícitamente una métrica faltante en cero al dividir entre toda la venta provincial."

objective: "Corregir únicamente la consolidación de IGF Diario Provincia para que una planta con VENTA KG positiva y una métrica faltante no sea tratada como cero. Si falta un dato requerido en una planta que sí vendió, la métrica provincial correspondiente debe quedar vacía. Plantas con venta cero o vacía no bloquean la consolidación."

implementation: true

code_changes: true

schema_changes: false

data_mutation: false

base_sha: "31cd8b6a2fa0b71100700bbd6ae6522078ef222c"

branch: "fix/igf-provincia-missing-no-cero-053a-r1"

in_scope:
  - "lib/igf-diario-puebla.js"
  - "test/igf-diario-provincia-multiplanta-053a.test.js o prueba nueva específica 053A-R1"
  - "docs/dev-loop/reports/FIX-IGF-PROVINCIA-MISSING-NO-CERO-053A-R1.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "cambiar generación de hojas por planta"
  - "cambiar soportes ocultos"
  - "cambiar server.js"
  - "cambiar frontend"
  - "cambiar compras-excel.js"
  - "cambiar fecha de corte"
  - "cambiar fórmulas de IGF individual"
  - "cambiar reglas 050 a 052"
  - "AH comentario del día"
  - "VENTAS/clientes nuevos"
  - "DB/schema"
  - "PR, merge o deploy"

contracts_in_force:
  - "La 053A permanece vigente."
  - "IGF Diario Provincia representa a todas las plantas como una sola empresa."
  - "Una métrica faltante no equivale a cero."
  - "Si una planta tiene VENTA KG > 0 y la métrica requerida está vacía/no numérica, la métrica provincial correspondiente queda vacía."
  - "Una planta con VENTA KG = 0 o VENTA KG vacía no bloquea la métrica provincial."
  - "No sustituir faltantes con cero."
  - "No inventar carry provincial."
  - "Las hojas individuales no cambian."
  - "HG absoluto y RESULTADO absoluto siguen sumándose según el contrato 053A."
  - "Los ratios provinciales siguen siendo ponderados por kilos cuando todos los datos necesarios existen."

metrics_requiring_complete_positive_sale_coverage:
  - "PRECIO/INGRESO"
  - "COSTO KG"
  - "FLETE KG"
  - "GASTO CORPORATIVO por kg"
  - "GASTO OPERATIVO por kg"
  - "C&D por kg"

acceptance_criteria:
  - "Puebla venta 10000 kg, costo 12; Acapulco venta 30000 kg, costo vacío: COSTO KG Provincia queda vacío, no 3.00."
  - "Si Acapulco venta es 0 y costo está vacío, Puebla costo 12 produce COSTO KG Provincia = 12."
  - "Si todas las plantas con venta positiva tienen costo, se conserva la ponderación normal."
  - "La misma regla aplica a flete, corporativo, operativo y C&D."
  - "Si una planta tiene venta positiva pero INGRESO vacío, PRECIO Provincia no se calcula desde un ingreso incompleto."
  - "VENTA KG Provincia sigue siendo suma de ventas disponibles."
  - "HG absoluto X y RESULTADO absoluto AF mantienen el contrato 053A."
  - "Las hojas IGF Diario individuales son idénticas a 053A."
  - "El orden de hojas no cambia."
  - "Los alias Querétaro/Tehuacán no cambian."
  - "El corte/proyección no cambia."
  - "Semana y TOTAL MES de Provincia no deben ocultar un faltante material: si dentro del periodo existe venta positiva en una fila donde la métrica provincial está vacía por falta de datos, el ratio agregado correspondiente también debe quedar vacío."

validation:
  - "Probar venta positiva + costo faltante."
  - "Probar venta cero + costo faltante."
  - "Probar todas las plantas completas."
  - "Repetir para flete, corporativo, operativo y C&D."
  - "Probar ingreso faltante con venta positiva."
  - "Probar Semana y TOTAL MES con un día incompleto."
  - "Guardar y reabrir XLSX."
  - "Ejecutar 053A completa."
  - "Ejecutar regresión relacionada con IGF Diario."
  - "git diff --check."

allowed_actions:
  - "crear rama 053A-R1 desde base_sha"
  - "editar solo in_scope"
  - "ejecutar pruebas"
  - "crear reporte"
  - "commit"
  - "push solo a la rama 053A-R1"

forbidden_actions:
  - "usar git add ."
  - "tocar frontend-dashboard/.next"
  - "modificar DB"
  - "abrir PR"
  - "hacer merge"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-PROVINCIA-MISSING-NO-CERO-053A-R1.md"