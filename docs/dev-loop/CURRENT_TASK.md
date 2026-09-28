task_id: "FIX-COMPRAS-DIA1-COSTO-FALLBACK-052"

title: "CONTROL DE COMPRAS día 1 toma costo anterior o, si no existe, costo del día siguiente"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-09-28T10:35:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-09-28"

prior_task_review: "main está en d3d75329dec24b00c352cdb6efc66671367c8069. CONTROL DE COMPRAS ya busca un costo HG anterior incluso fuera del mes para el carry de R, pero O sigue dependiendo únicamente de compras del mismo día y no existe fallback hacia el día 2 cuando el día 1 carece de histórico anterior."

objective: "Solo para el día 1 del mes, cuando no existe compra propia, completar COSTO KG consolidado (columna O en el layout actual) y COSTO HG (columna R) con prioridad al último costo anterior disponible incluso de otro mes; si no existe histórico anterior, tomar el valor del día 2. No alterar ningún otro día."

implementation: true

code_changes: true

schema_changes: false

data_mutation: false

base_sha: "d3d75329dec24b00c352cdb6efc66671367c8069"

branch: "fix/compras-dia1-costo-fallback-052"

in_scope:
  - "lib/compras-dashboard.js: exponer al payload el último costo consolidado válido anterior al inicio del mes si hace falta"
  - "lib/compras-excel.js: aplicar únicamente al día 1 la prioridad histórico anterior -> día 2 para COSTO KG consolidado y COSTO HG"
  - "test/compras-dia1-costo-fallback-052.test.js"
  - "ajustes estrictamente necesarios en pruebas existentes de Compras"
  - "docs/dev-loop/reports/FIX-COMPRAS-DIA1-COSTO-FALLBACK-052.md"
  - "docs/dev-loop/CURRENT_TASK.md: solo transición de status"

out_of_scope:
  - "cambiar kilos de compra"
  - "cambiar importes de compra"
  - "cambiar proveedores"
  - "cambiar proyecciones 046/048/049"
  - "cambiar IGF Diario"
  - "cambiar fecha de corte"
  - "cambiar HG EN KILOS"
  - "cambiar tarifas de flete"
  - "cambiar permisos, comprasT o usuarios"
  - "frontend"
  - "DB/schema"
  - "PR, merge o deploy"

contracts_in_force:
  - "La 051 y 051-R1 permanecen vigentes."
  - "La corrección aplica únicamente al día calendario 1."
  - "Solo aplica cuando el día 1 no tiene compra propia válida para producir su costo."
  - "Prioridad 1: último costo válido anterior al día 1, incluso si pertenece al mes anterior."
  - "Prioridad 2: solo si no existe costo anterior, usar el costo del día 2."
  - "Si tampoco existe costo válido en el día 2, dejar vacío."
  - "No buscar hacia adelante para ningún otro día."
  - "No sobrescribir un costo propio real del día 1."
  - "El valor heredado debe conservar señal visual amarilla."
  - "O representa COSTO KG consolidado."
  - "R representa COSTO HG efectivo, es decir costo consolidado más flete según la lógica ya existente."

acceptance_criteria:
  - "Caso Querétaro septiembre: día 1 sin compra, sin histórico anterior, día 2 COSTO KG=11.380; O del día 1 queda 11.380."
  - "En el mismo caso, día 2 COSTO HG=12.180; R del día 1 queda 12.180."
  - "O y R del día 1 quedan amarillos cuando el valor es heredado."
  - "Si 31/08 tiene COSTO KG=11.500 y día 2 tiene 11.380, día 1 usa 11.500 y no 11.380."
  - "Si el costo HG anterior válido es 12.300 y día 2 es 12.180, R día 1 usa 12.300."
  - "Si día 1 tiene compra propia, usa su propio O y R y no aplica fallback."
  - "Si no hay histórico anterior ni valor válido en día 2, O y R día 1 permanecen vacíos."
  - "Días 2 en adelante no cambian."
  - "Semana y TOTAL MES no cambian por esta corrección salvo por las fórmulas que legítimamente dependan de esos valores diarios."

validation:
  - "Probar día 1 sin compra y sin histórico anterior."
  - "Probar día 1 con histórico del mes anterior."
  - "Probar prioridad histórico anterior sobre día 2."
  - "Probar día 1 con compra propia."
  - "Probar día 1 sin histórico y día 2 también sin costo."
  - "Probar que días 2 a fin de mes no cambian."
  - "Probar O y R tras guardar y reabrir XLSX."
  - "Ejecutar regresión de compras 013, 014, 016, 020, 021, 022, 024, 026, 030, 048, 049 y 051 relacionadas."
  - "Ejecutar git diff --check."

allowed_actions:
  - "crear rama 052 desde base_sha"
  - "editar solo in_scope"
  - "ejecutar pruebas"
  - "crear reporte"
  - "commit"
  - "push solo a la rama 052"

forbidden_actions:
  - "usar git add ."
  - "tocar frontend-dashboard/.next"
  - "hacer migraciones o mutaciones DB"
  - "abrir PR"
  - "hacer merge"
  - "desplegar"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-COMPRAS-DIA1-COSTO-FALLBACK-052.md"
