task_id: "FIX-IGF-DIARIO-ACENTO-DESDE-MAIN-047"
title: "Reconstruir desde main una sola hoja IGF Diario aunque el nombre lleve acento"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-09-25T13:13:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-25"
prior_task_review: "La 047 publicada en 38110165 sale de la 046 y no se integra, porque arrastraría la 046. La 045 ya está en main, en c055554c. La 046 permanece fuera de main."

objective: "Reconstruir, desde main y sin ningún cambio de la 046, la búsqueda de la hoja IGF Diario para que Queretaro y Querétaro sean la misma hoja."
implementation: true
code_changes: true
schema_changes: false
data_mutation: false
base_sha: "c055554c8850b63b9f2065df2a80de6eb93c8f15"
branch: "fix/igf-diario-acento-desde-main-047"

in_scope:
  - "lib/igf-diario-puebla.js: localizar la hoja IGF Diario por nombre normalizado, sin distinguir acentos ni mayúsculas, y reutilizar la que ya existe"
  - "test/igf-diario-acento-desde-main-047.test.js"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-ACENTO-DESDE-MAIN-047.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"
out_of_scope:
  - "cualquier cambio de la 046, incluido el importe proyectado, server.js, la hoja IGF para todas las plantas y las pruebas 030, 036 y 045"
  - "cherry-pick de la 046"
  - "frontend-dashboard/.next, base de datos, PR, merge y despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "La rama sale de c055554c. No contiene la 046."
  - "IGF Diario Queretaro e IGF Diario Querétaro son la misma hoja. Se reserva la primera y el llenado con el nombre acentuado escribe ahí. El nombre reservado no se reemplaza."
  - "Puebla sigue con una sola hoja IGF Diario Puebla, como en main."
  - "El código de planta, el nombre humano y la identidad de la hoja permanecen separados."

acceptance_criteria:
  - "Reservar con Queretaro y llenar con Querétaro deja una sola hoja IGF Diario. El nombre sigue siendo IGF Diario Queretaro. Al guardar y reabrir sigue habiendo una sola."
  - "Puebla conserva una sola hoja IGF Diario Puebla."
  - "El diff contra main no toca lib/compras-excel.js ni server.js, ni ninguna lógica de la 046."

validation:
  - "Probar Queretaro/Querétaro y Puebla, guardar y reabrir."
  - "Ejecutar la prueba nueva y las pruebas IGF Diario que existan en main; git diff --check; git diff c055554c."

allowed_actions:
  - "crear la rama desde base_sha en un árbol aislado"
  - "editar solo in_scope, probar, reportar, commit y push solo a esa rama"
forbidden_actions:
  - "modificar authorized_by, authorized_at o human_authorization"
  - "reutilizar la rama fix/igf-diario-una-hoja-por-planta-047"
  - "usar git add .; tocar .next; abrir PR; fusionar o desplegar"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-ACENTO-DESDE-MAIN-047.md"