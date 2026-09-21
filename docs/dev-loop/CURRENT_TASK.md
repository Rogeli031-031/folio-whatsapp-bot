# CURRENT_TASK

```yaml
task_id: "IMPL-COMPRAS-HG-KILOS-014"
title: "Compras — HG EN KILOS manual por día, independiente del consolidado"
status: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"

authorized_by: "HUMAN"
authorized_at: "2026-09-21T13:16:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN"

objective: "Agregar a Compras un bloque independiente HG EN KILOS a la derecha de CONSOLIDADO, persistido por planta y fecha, con subtotales semanales y total mensual derivados, sin modificar la lógica existente de compras."

implementation: true
code_changes: true

schema_changes: true
data_mutation: true

base_sha: "de00d2e1a028d41e6d096f2059aeb6ddfb408092"
branch: "implementation/compras-hg-kilos-014"

merge_authorized: false
deploy_authorized: false
next_task_authorized: false

in_scope:
  - "lib/compras-dashboard.js"
  - "lib/compras-excel.js"
  - "sql/ nueva migración para arr.compras_hg"
  - "server.js solo si es necesario para ensure/registro del patrón existente"
  - "frontend-dashboard/components/ComprasClient.tsx"
  - "frontend-dashboard/lib/compras-format.ts"
  - "frontend-dashboard/lib/api.ts"
  - "test/compras-hg-kilos-014.test.js y/o extensión controlada de test/compras-dashboard-013.test.js"
  - "docs/dev-loop/reports/IMPL-COMPRAS-HG-KILOS-014.md"
  - "docs/dev-loop/CURRENT_TASK.md"

out_of_scope:
  - "docs/director-ia/"
  - "cálculos actuales COMPRA KG / COSTO KG / IMPORTE / CONSOLIDADO"
  - "arr.compras: no agregar hg_kilos"
  - "proveedores"
  - "facturas existentes"
  - "múltiples compras mismo proveedor/día"
  - "filtro de las 6 plantas"
  - "main"
  - "deploy"
  - "secretos, tokens o credenciales"

contracts_in_force:
  - "dev-loop vigente del repositorio"
  - "autorización humana obligatoria"
  - "no merge ni deploy sin autorización posterior"

functional_contract:

  storage:
    - "Crear arr.compras_hg como almacenamiento independiente."
    - "Un valor HG por planta + fecha."
    - "UNIQUE (planta_id, fecha)."
    - "hg_kilos debe aceptar positivos, negativos y cero."
    - "Vacío significa ausencia/borrado del dato; NO convertir vacío silenciosamente en 0."
    - "Guardar created_by_usuario_id, updated_by_usuario_id, created_at, updated_at."
    - "No guardar subtotales semanales ni total mensual."

  ui:
    - "Agregar bloque independiente 'HG EN KILOS' a la derecha de CONSOLIDADO."
    - "Dejar separación horizontal visible entre CONSOLIDADO y HG."
    - "No modificar el ancho/lógica/contenido de los bloques de compras existentes salvo lo mínimo necesario para insertar HG a la derecha."
    - "Una celda editable por cada fecha."
    - "Valores alineados a la derecha."
    - "Formato entero con separador de miles."
    - "Permitir valor negativo, positivo y cero."
    - "Vacío debe verse vacío."
    - "Mantener exactamente las mismas filas y semanas de la hoja Compras."

  weekly:
    - "En cada fila Semana N mostrar SUM(hg_kilos) de los días de esa misma semana."
    - "Usar la agrupación semanal existente de Compras."
    - "No persistir subtotal."

  monthly:
    - "En TOTAL MES mostrar SUM(hg_kilos) del mes."
    - "No persistir total mensual."

  persistence:
    - "El valor debe sobrevivir refresh, cierre de navegador, cambio de planta, cambio de mes y sesiones futuras."
    - "Cada planta mantiene sus propios HG."
    - "Cada mes recupera exclusivamente los días correspondientes."

  api:
    - "Extender GET mensual de Compras para incluir HG del periodo o añadir estructura equivalente coherente con el endpoint existente."
    - "Crear endpoint de UPSERT/DELETE HG o equivalente."
    - "Validar autenticación."
    - "Validar autorización de planta en backend."
    - "Validar fecha YYYY-MM-DD."
    - "Validar número finito."
    - "No confiar en planta_id enviado por frontend sin autorización."
    - "Cross-plant debe responder 403."

  excel:
    - "Agregar HG EN KILOS al archivo generado por Descargar Excel."
    - "Colocarlo a la derecha de CONSOLIDADO con separación visual."
    - "Incluir valores diarios."
    - "Incluir subtotal Semana N."
    - "Incluir TOTAL MES."
    - "No alterar fórmulas ni bloques actuales de compras."

schema_contract:
  table: "arr.compras_hg"
  columns:
    - "id"
    - "planta_id"
    - "fecha DATE"
    - "hg_kilos NUMERIC"
    - "created_by_usuario_id"
    - "updated_by_usuario_id"
    - "created_at"
    - "updated_at"
  constraints:
    - "UNIQUE (planta_id, fecha)"
    - "FK planta_id -> public.plantas(id)"
  note:
    - "No agregar hg_kilos a arr.compras."

acceptance_tests:
  - "guardar HG positivo"
  - "guardar HG negativo"
  - "guardar HG = 0 como valor explícito"
  - "vaciar una celda elimina/deja ausente el dato, no lo transforma en 0"
  - "recargar mes recupera HG"
  - "cerrar/volver mantiene HG porque está en DB"
  - "planta A no mezcla HG con planta B"
  - "mes A no mezcla HG con mes B"
  - "actualizar valor existente no duplica fila"
  - "Semana 1 suma correctamente"
  - "Semana 2 suma correcta"
  - "TOTAL MES suma correctamente"
  - "cross-plant rechazado"
  - "Excel contiene bloque HG EN KILOS"
  - "Excel conserva subtotales semanales y total mensual"
  - "bloques actuales COMPRA KG/COSTO KG/IMPORTE/CONSOLIDADO no cambian"

validation:
  - "node --test test/compras-hg-kilos-014.test.js"
  - "si se amplía test/compras-dashboard-013.test.js, ejecutar también ese archivo"
  - "cd frontend-dashboard && npm run build"
  - "NO commitear frontend-dashboard/.next"

result_report_path: "docs/dev-loop/reports/IMPL-COMPRAS-HG-KILOS-014.md"

closure:
  - "Al terminar poner CURRENT_TASK en DONE_PENDING_REVIEW."
  - "Commit + push únicamente a implementation/compras-hg-kilos-014."
  - "STOP."
  - "NO PR."
  - "NO merge."
  - "NO deploy."
  - "NO siguiente tarea."
```
