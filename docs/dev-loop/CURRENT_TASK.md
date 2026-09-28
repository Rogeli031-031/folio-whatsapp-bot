task_id: "FIX-IGF-TODAS-SCOPE-GLOBAL-053A-R2"

title: "Exportar IGF Todas solo con alcance global"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-28"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-28"

prior_task_review: "La 053A está en 31cd8b6a2fa0b71100700bbd6ae6522078ef222c y la 053A-R1 en 3e0ea1e9549b4c0539639de6b53f433f74d430d1. La matemática provincial ya quedó corregida. Falta cerrar autorización: igf_diario_todas=1 actualmente puede construir un libro con todas las plantas sin validar alcance global."

objective: "Permitir IGF Diario Todas únicamente a usuarios con alcance global reconocido por el dashboard. Un usuario limitado a una o más plantas no debe poder obtener IGF Diario Provincia ni hojas/soportes de otras plantas manipulando la URL."

implementation: true

code_changes: true

schema_changes: false

data_mutation: false

base_sha: "3e0ea1e9549b4c0539639de6b53f433f74d430d1"

branch: "fix/igf-todas-scope-global-053a-r2"

in_scope:
  - "server.js"
  - "frontend-dashboard/lib/auth.ts"
  - "frontend-dashboard/components/IgfForecastClient.tsx"
  - "test/forecast-excel-plant-compras-024.test.js"
  - "test/igf-diario-ui-scoped-view-025.test.js"
  - "test/igf-diario-provincia-multiplanta-053a.test.js si hace falta"
  - "prueba nueva específica 053A-R2"
  - "docs/dev-loop/reports/FIX-IGF-TODAS-SCOPE-GLOBAL-053A-R2.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "cambiar lib/igf-diario-puebla.js"
  - "cambiar fórmulas Provincia"
  - "cambiar lib/compras-excel.js"
  - "cambiar lib/dashboard-arr-forecast.js salvo que una prueba demuestre necesidad estricta de exportar un helper de autorización, lo cual debe evitarse si es posible"
  - "cambiar permisos de Compras"
  - "cambiar roles"
  - "cambiar DB/schema"
  - "cambiar fecha de corte"
  - "AH comentario del día"
  - "VENTAS/clientes nuevos"
  - "PR, merge o deploy"

contracts_in_force:
  - "053A y 053A-R1 permanecen vigentes."
  - "El rol global existente para alcance de planta se conserva: ZP, AD y CF_CDMX."
  - "No crear una segunda definición incompatible de alcance global."
  - "Un usuario que no sea global no puede descargar IGF Diario Todas aunque edite manualmente query params."
  - "La validación autoritativa debe estar en backend."
  - "Frontend solo mejora UX; nunca sustituye el 403 del backend."
  - "El export individual por planta mantiene la validación actual con assertPlantaPermitidaDashboard."
  - "El caller histórico de /api/arr/dashboard-excel sin igf_diario_todas=1 y sin require_plant debe conservar su comportamiento actual."
  - "La restricción nueva aplica específicamente al modo igf_diario_todas=1."
  - "No filtrar silenciosamente Todas a una sola planta: si no tiene alcance global, responder 403."
  - "No construir ni cargar compras/precio de otras plantas antes de validar el alcance global."

global_scope_roles:
  - "ZP"
  - "AD"
  - "CF_CDMX"

non_global_examples:
  - "GG"
  - "GO"
  - "GA"
  - "GV"
  - "SG"
  - "SEH"
  - "cualquier otro rol que no tenga semántica global existente"

acceptance_criteria:
  - "ZP + igf_diario_todas=1 => permitido."
  - "AD + igf_diario_todas=1 => permitido."
  - "CF_CDMX + igf_diario_todas=1 => permitido."
  - "GG con una planta + igf_diario_todas=1 => 403."
  - "GO con una planta + igf_diario_todas=1 => 403."
  - "GA sigue bloqueado por dashboardBlockGAFinancialKpis como antes."
  - "GV sigue bloqueado por dashboardBlockGVForbidden como antes."
  - "Usuario no global no llega a listIgfDiarioProvinciaPlants ni a comprasDashboard.loadMonth para otras plantas."
  - "Manipular manualmente la URL no evita el 403."
  - "igf_diario_todas=1 junto con plant_code/require_plant se rechaza como combinación inválida en vez de intentar mezclar ambos modos."
  - "Export individual Puebla sigue permitido para quien tenga acceso a Puebla."
  - "Export individual Puebla sigue rechazado para quien no tenga acceso."
  - "El export histórico global sin igf_diario_todas=1 conserva exactamente el comportamiento previo."
  - "El frontend evita abrir IGF Diario Todas si el token no tiene rol global y muestra un mensaje claro."
  - "El backend sigue siendo autoridad incluso si el frontend es bypassed."

validation:
  - "Probar ZP."
  - "Probar AD."
  - "Probar CF_CDMX."
  - "Probar GG con plantas_permitidas."
  - "Probar GO local."
  - "Probar GA y GV mantienen sus bloqueos actuales."
  - "Probar URL manipulada."
  - "Probar combinación igf_diario_todas=1 + plant_code."
  - "Probar export individual permitido."
  - "Probar export individual prohibido."
  - "Probar caller histórico sin flag Todas."
  - "Ejecutar 024, 025, 053A, 053A-R1 y nueva 053A-R2."
  - "git diff --check."

allowed_actions:
  - "crear rama 053A-R2 desde base_sha"
  - "editar solo in_scope"
  - "crear pruebas"
  - "crear reporte"
  - "commit"
  - "push solo a rama 053A-R2"

forbidden_actions:
  - "usar git add ."
  - "cambiar permisos_json"
  - "crear roles"
  - "hacer migraciones"
  - "tocar frontend-dashboard/.next"
  - "abrir PR"
  - "hacer merge"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-TODAS-SCOPE-GLOBAL-053A-R2.md"