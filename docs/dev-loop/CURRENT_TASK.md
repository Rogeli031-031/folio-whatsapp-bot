task_id: "FIX-COMPRAS-ASISTENTE-DIRECCION-GLOBAL-051-R1"

title: "Asistente Dirección con rol técnico GA usa Compras global cuando tiene permiso explícito"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-28T09:26:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-28"

prior_task_review: "La 051 está en 7eee26ff422dc40c15d6f0b56ccef4f53ac35709 y no está integrada. Se detectó que algunos Asistentes Dirección tienen rol técnico GA. GA debe seguir sin acceso_compras por default, pero un Asistente Dirección GA con override explícito acceso_compras=true debe ser tratado como perfil global en Compras y comprasT."

objective: "Corregir únicamente el reconocimiento de Asistente Dirección para Compras. Un usuario GA cuyo puesto o nombre de rol sea Asistente Dirección, y que tenga acceso_compras=true explícito, debe abrir Compras con alcance global y comprasT no debe forzar planta_id. Un GA genérico no obtiene acceso por esta corrección."

implementation: true
code_changes: true
schema_changes: false
data_mutation: false

base_sha: "7eee26ff422dc40c15d6f0b56ccef4f53ac35709"

branch: "fix/compras-asistente-direccion-global-051-r1"

in_scope:
  - "lib/compras-dashboard.js"
  - "server.js únicamente si es necesario compartir/reutilizar la detección de Asistente Dirección y evitar lógica duplicada"
  - "test/igf-venta-permiso-compras-whatsapp-051.test.js o una prueba nueva específica 051-R1"
  - "docs/dev-loop/reports/FIX-COMPRAS-ASISTENTE-DIRECCION-GLOBAL-051-R1.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "cambiar defaults de GA"
  - "dar acceso_compras automáticamente a todos los Asistentes Dirección"
  - "cambiar permisos de GG, GO, ZP, CF_CDMX, GV, SG o SEH"
  - "cambiar IGF Diario"
  - "cambiar CONTROL DE COMPRAS"
  - "cambiar frontend salvo que una prueba demuestre que es estrictamente necesario"
  - "cambiar DB o schema"
  - "mutar permisos de usuarios existentes"
  - "PR, merge o deploy"

contracts_in_force:
  - "La 051 permanece vigente."
  - "GA genérico tiene acceso_compras=false por default."
  - "Los overrides de permisos_json mandan."
  - "Asistente Dirección con rol técnico GA y acceso_compras=true explícito obtiene acceso."
  - "Asistente Dirección con rol técnico GA sin override true continúa sin acceso."
  - "La detección de Asistente Dirección debe ser por rol/puesto, nunca por identidad personal, teléfono o una lista de nombres."
  - "Un Asistente Dirección autorizado se considera global para Compras y comprasT."
  - "Un GA genérico con acceso_compras=true continúa limitado a su planta; no se vuelve global solo por tener el permiso."

acceptance_criteria:
  - "GA + puesto Asistente Dirección + acceso_compras=true: permiso efectivo true."
  - "Ese mismo actor es reconocido como global por Compras."
  - "comprasT genera /compras?t=... sin planta_id para ese actor."
  - "El JWT se construye con alcance global coherente con la detección existente de Asistente Dirección."
  - "GA + puesto Asistente Dirección sin acceso_compras=true: comprasT responde sin permiso."
  - "GA genérico sin override: sin permiso."
  - "GA genérico con acceso_compras=true: tiene Compras pero queda limitado a su planta."
  - "AD real sigue global."
  - "GG y GO siguen ligados a su planta."
  - "ZP y CF_CDMX siguen globales."
  - "No se hardcodean nombres personales."

validation:
  - "Probar Asistente Dirección técnico GA con override true."
  - "Probar Asistente Dirección técnico GA sin override."
  - "Probar GA genérico con override true."
  - "Probar AD real."
  - "Probar GG y GO."
  - "Probar ZP y CF_CDMX."
  - "Ejecutar prueba 051 completa y regresión de permisos/Twilio."
  - "Ejecutar git diff --check."

allowed_actions:
  - "crear rama 051-R1 desde base_sha"
  - "editar solo in_scope"
  - "probar"
  - "crear reporte"
  - "commit"
  - "push solo a rama 051-R1"

forbidden_actions:
  - "usar git add ."
  - "modificar public.roles"
  - "hacer migraciones"
  - "modificar usuarios/permisos existentes en DB"
  - "abrir PR"
  - "hacer merge"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-ASISTENTE-DIRECCION-GLOBAL-051-R1.md"