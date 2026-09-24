# CURRENT_TASK

```yaml
task_id: "FIX-IGF-PRECIO-ACCENTED-PLANTS-033"
title: "PRECIO — recuperar datos de Querétaro y Tehuacán sin alterar otras plantas"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-24T11:36:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-24"

objective: "Mostrar en la hoja PRECIO los precios existentes de Querétaro y Tehuacán, guardados en arr.precio_diario bajo códigos con acento, sin cambiar la lectura de las demás plantas."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "08f2d37dc9e8a00d89709f76e69760b43d3bc502"
branch: "fix/igf-precio-accented-plants-033"

in_scope:
  - "lib/dashboard-arr-forecast.js: únicamente loadPrecioDiario y auxiliares estrictamente necesarios"
  - "test/igf-diario-precio-sheet-027.test.js"
  - "test/igf-diario-precio-carry-forward-029.test.js"
  - "test/igf-diario-precio-plant-aliases-033.test.js"
  - "docs/dev-loop/reports/FIX-IGF-PRECIO-ACCENTED-PLANTS-033.md"
  - "docs/dev-loop/CURRENT_TASK.md: únicamente transición de status"

out_of_scope:
  - "otras plantas y otras fuentes de precio"
  - "modificar registros, códigos o esquema en PostgreSQL"
  - "server.js, autorización de planta y frontend"
  - "CONTROL DE COMPRAS, HG EN KILOS y proyección del día de corte"
  - "AGENTS.md, LOOP_PROTOCOL.md y contratos de Director IA"
  - "PR, merge a main y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "la rama 032 en base_sha; conservar íntegro su cambio de promedios"
  - "arr.precio_diario es la fuente exclusiva de la hoja PRECIO"
  - "la consulta de precios queda limitada a la planta autorizada y al mes solicitado"
  - "appendPrecioWorksheet conserva precisión, formato de ocho decimales y arrastre dentro del mismo mes"

acceptance_criteria:
  - "En septiembre de 2026 existen 23 precios válidos bajo plant_code 'Querétaro' y 23 bajo 'Tehuacán'; los códigos sin acento 'Queretaro' y 'Tehuacan' tienen cero registros."
  - "Una exportación autorizada para Queretaro obtiene exclusivamente precios de Queretaro y Querétaro; una de Tehuacan, exclusivamente de Tehuacan y Tehuacán."
  - "Si ambos códigos de una misma planta contienen precio válido para una fecha, prevalece el código exacto recibido por loadPrecioDiario. No duplicar fechas ni mezclar plantas."
  - "Puebla y todas las demás plantas conservan exactamente la consulta de un solo código y el comportamiento actual. No aplicar búsqueda difusa ni fallback general."
  - "La hoja PRECIO de Querétaro y Tehuacán muestra los precios reales disponibles; los huecos posteriores heredan el último precio válido del mismo mes conforme a la tarea 029."
  - "Los días anteriores al primer precio válido del mes siguen vacíos. No inventar precios ni tomarlos de IGF, compras u otra tabla."
  - "No cambiar el orden ni los nombres de las hojas, la precisión del número ni el formato visual."
  - "No cambiar datos persistidos ni introducir una dependencia de extensiones SQL."

validation:
  - "Pruebas sintéticas de ambos pares de códigos: datos solo bajo código con acento, código exacto con datos, coexistencia con prioridad exacta y ausencia total de datos."
  - "Comprobar que Puebla y una cuarta planta usan la consulta vigente y no reciben precios ajenos."
  - "Regresiones 027, 029 y exportación por planta 024; ejecutar cualquier prueba adicional directamente afectada."
  - "git diff --check, git status y reporte con SHA final."

allowed_actions:
  - "editar únicamente archivos in_scope"
  - "ejecutar pruebas"
  - "crear reporte 033"
  - "commit y push únicamente a la rama 033"

forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "alterar datos en pgAdmin o PostgreSQL"
  - "modificar el cálculo de las demás plantas"
  - "abrir PR, fusionar a main o desplegar"
  - "poner status APPROVED o CLOSED"
  - "encadenar otra tarea"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-PRECIO-ACCENTED-PLANTS-033.md"
```