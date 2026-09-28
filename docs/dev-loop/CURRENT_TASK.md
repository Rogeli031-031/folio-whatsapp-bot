task_id: "FIX-IGF-VENTA-PRECISA-PERMISO-COMPRAS-WHATSAPP-051"

title: "IGF Diario usa CASA + COMISIONISTA y Compras obtiene permiso específico y comando comprasT"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-28T08:16:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-28"

prior_task_review: "main está en 83fc6bf4db77351b1bf7ecb477d44f6b041af1ee. La 050 quedó integrada. Se conserva su contrato de proyección desde el corte hasta fin de mes, pero se corrige únicamente la fuente de VENTA KG: la columna total de Provincia Venta Diaria está redondeada y debe sustituirse por CASA + COMISIONISTA."

objective: "Corregir VENTA KG de IGF Diario para usar (CASA + COMISIONISTA) * 1000 con la precisión de las columnas de canal. Crear el permiso específico acceso_compras, aplicarlo al módulo Compras y habilitar el comando WhatsApp comprasT para abrir Compras con el alcance correspondiente al usuario."

implementation: true

code_changes: true

schema_changes: false

data_mutation: false

base_sha: "83fc6bf4db77351b1bf7ecb477d44f6b041af1ee"

branch: "fix/igf-venta-permiso-compras-whatsapp-051"

in_scope:
  - "lib/igf-diario-puebla.js"
  - "lib/usuario-permisos.js"
  - "lib/compras-dashboard.js"
  - "server.js"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "frontend-dashboard/lib/auth.ts solo si hace falta resolver acceso_compras en frontend sin romper tokens existentes"
  - "pruebas nuevas y regresiones estrictamente relacionadas"
  - "docs/dev-loop/reports/FIX-IGF-VENTA-PRECISA-PERMISO-COMPRAS-WHATSAPP-051.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "cambiar el motor de Pronóstico"
  - "cambiar Provincia Venta Diaria"
  - "cambiar Provincia Comisiones"
  - "cambiar CONTROL DE COMPRAS"
  - "cambiar fórmulas o captura de compras"
  - "cambiar PRECIO"
  - "cambiar la semántica del corte de la 050"
  - "crear roles nuevos"
  - "cambiar permisos no relacionados con Compras"
  - "modificar base de datos o schema"
  - "Director IA"
  - "frontend-dashboard/.next"
  - "PR, merge o despliegue"

contracts_in_force:
  - "AGENTS.md y docs/dev-loop/LOOP_PROTOCOL.md"
  - "La 050 sigue vigente: fecha < corte es real y fecha >= corte es proyectado; IGF Diario continúa hasta fin de mes."
  - "VENTA KG de IGF Diario NO usa la columna total redondeada de la planta."
  - "VENTA KG = (CASA + COMISIONISTA) * 1000 de Provincia Venta Diaria para la misma planta y fecha."
  - "Las columnas CASA y COMISIONISTA se localizan dinámicamente por planta mediante la equivalencia existente; no hardcodear J/K."
  - "El nuevo permiso se llama acceso_compras y debe controlar UI, APIs y comando WhatsApp."
  - "No basta ocultar el botón: un usuario sin acceso_compras debe recibir 403 en /api/compras."
  - "Los overrides explícitos de permisos_json continúan prevaleciendo sobre defaults."
  - "comprasT es case-insensitive y solo funciona para usuarios con acceso_compras."

roles_with_default_compras:
  - "GG"
  - "GO / Gerente Operaciones"
  - "Director ZP usando las claves/aliases ya reconocidas por el sistema: ZP, DIR_ZP, DIRZP, DIRECTOR_ZP, DZP y equivalentes existentes"
  - "Contralor CDMX usando CF_CDMX/CDMX según la clave existente"
  - "AD cuando la clave real sea Asistente Dirección"
  - "si existen en el catálogo las claves DZC o AZP mencionadas por el aprobador, deben considerarse equivalentes para acceso_compras; no crear esos roles si no existen"

roles_without_default_compras:
  - "GA genérico no recibe Compras solamente por ser GA"
  - "GV"
  - "SG"
  - "SEH"
  - "cualquier otro rol no autorizado, salvo override individual explícito"

acceptance_criteria:
  - "IGF Diario Tehuacán: si Provincia Venta Diaria J=14.114 y K=25.642, VENTA KG debe ser (14.114+25.642)*1000 = 39756 kg y no el total redondeado de la columna B."
  - "La fórmula debe referenciar las columnas CASA y COMISIONISTA correctas de la planta exportada."
  - "Puebla, Acapulco, Tehuacán, Querétaro, San Luis y Morelos siguen resolviendo sus propios canales."
  - "El contrato de la 050 continúa: el día del corte y los posteriores siguen proyectados hasta fin de mes."
  - "PERMISOS_CATALOGO incluye acceso_compras con etiqueta Acceso a Compras."
  - "UsuariosAdminModal muestra automáticamente el nuevo checkbox porque consume el catálogo del backend."
  - "GG, GO y perfiles corporativos autorizados tienen acceso_compras por default; un override false lo puede quitar."
  - "Un usuario no autorizado no puede consultar, crear, editar, borrar, subir factura ni descargar Excel de /api/compras."
  - "El botón Compras de IGF Forecast solo aparece cuando el usuario tiene acceso efectivo."
  - "La página Compras rechaza o muestra acceso no autorizado cuando falta el permiso."
  - "comprasT devuelve un enlace firmado válido por 20 horas."
  - "Para GG/GO con planta asignada, comprasT abre Compras directamente en su planta."
  - "Para perfiles corporativos/globales autorizados y sin planta, comprasT abre Compras sin forzar una planta para que puedan seleccionar dentro de su alcance."
  - "Un usuario de una planta no puede cambiar planta_id en la URL/API para entrar a otra planta."
  - "GO puede ejecutar comprasT a pesar de la restricción especial nivel 6."
  - "Un usuario sin acceso_compras recibe un mensaje claro de WhatsApp indicando que no tiene permiso."

validation:
  - "Crear prueba de precisión IGF donde el total redondeado difiera de CASA+COMISIONISTA."
  - "Probar Puebla, Tehuacán y una planta con alias."
  - "Probar acceso_compras defaults y overrides true/false."
  - "Probar todas las rutas /api/compras con permiso true y false."
  - "Probar alcance de planta para GG/GO."
  - "Probar alcance global para ZP/AD/CF_CDMX o aliases reales equivalentes."
  - "Probar comprasT con GG, GO, perfil global autorizado y usuario sin permiso."
  - "Probar que GO no sea bloqueado por la restricción de nivel 6."
  - "Ejecutar regresión 050, 049, 048 y pruebas existentes de compras-dashboard."
  - "Ejecutar git diff --check."

allowed_actions:
  - "crear la rama 051 desde base_sha en árbol aislado"
  - "editar solo archivos in_scope"
  - "crear pruebas"
  - "crear reporte"
  - "commit"
  - "push solamente a la rama 051"

forbidden_actions:
  - "usar git add ."
  - "tocar frontend-dashboard/.next"
  - "crear roles o modificar public.roles"
  - "hacer migraciones o mutaciones de datos"
  - "abrir PR"
  - "hacer merge"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-VENTA-PRECISA-PERMISO-COMPRAS-WHATSAPP-051.md"