# Propuesta para la revisión del responsable
task_id: "FIX-IGF-PLAN-AL-CIERRE-MULTIPLANTA"
status: IN_PROGRESS
authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-11-05T17:33:46-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Alvarez 2026-11-05"
base_sha: "9ca8701f5cc01a43aaea64a68f757e7137dd90a8"
branch: "fix/igf-plan-al-cierre-multiplanta"
objective: "Permitir abrir el plan por comprador en cada planta del IGF con datos suficientes, incluso cuando el catálogo usa otro alias o falta el DICF precalculado del corte."
in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "lib/igf-plan-al-cierre.js"
  - "lib/dicf.js"
  - "lib/dashboard-arr-forecast.js"
  - "lib/igf-simulation-routes.js"
  - "frontend-dashboard/components/IgfPlanAlCierre.tsx"
  - "frontend-dashboard/lib/igf-plan-al-cierre.js"
  - "test/igf-plan-al-cierre.test.js"
  - "test/igf-simulation-ui.test.js"
  - "docs/dev-loop/reports/FIX-IGF-PLAN-AL-CIERRE-MULTIPLANTA.md"
out_of_scope:
  - "Cambiar ventas, descuentos, propuestas, presupuestos, permisos, configuración del servicio o nombres en los catálogos de producción."
  - "Modificar el comportamiento de los usuarios actuales de DICF fuera del Plan al cierre o redefinir contratos de Director IA."
contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
allowed_actions:
  - "Implementar y probar en la rama de la ficha. Registrar y subir únicamente los cambios de la tarea y abrir su PR para revisión humana."
  - "Comprobar en lectura los totales por planta, evitando cifras o identidades de clientes en Git."
forbidden_actions:
  - "Autoaprobar gates, escribir a main, fusionar o sustituir información financiera faltante por ceros."
  - "Recalcular escribiendo cachés productivas para suplir diferencias de alias o fuentes incompletas."
max_attempts: 1
result_report_path: "docs/dev-loop/reports/FIX-IGF-PLAN-AL-CIERRE-MULTIPLANTA.md"
acceptance:
  - "Validar Puebla, Tehuacán, Acapulco, Querétaro, San Luis y Morelos. Las identidades equivalentes autorizadas se resuelven con la misma regla en DICF, ventas, descuentos, categoría y Excel; sin coincidencias parciales entre plantas ni doble conteo."
  - "Reusar una referencia DICF válida si existe. Si falta, reconstruir en lectura con las reglas nativas de DICF y datos de la misma planta hasta el día anterior al corte. No depender de abrir KPI Financieros previamente."
  - "Usar la versión de margen y datos conocida al corte. Informar carencias de evidencia. No utilizar ventas, descuentos o versiones posteriores ni una fecha distinta disfrazada de corte solicitado."
  - "Probar la paridad entre referencia existente y reconstruida, incluidas inactivas, compra al contado, tasas faltantes y plantas con acentos, así como la protección de plantas y puntos por permisos."
  - "El plan de la planta conserva el orden A–J, selección, exportación, recuperación de Excel y guardado o reapertura del mismo punto. El DICF normal mantiene su comportamiento."
