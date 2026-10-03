task_id: "INTEGRATION-IGF-FORECAST-ACUMULADO-059-R1"

title: "Validación pre-merge de 059 + 059-R1"

status: "DONE_PENDING_REVIEW"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-03T11:33:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-03"

objective: >
  Validar como unidad integrada FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059
  y FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059-R1 contra el main vigente,
  documentar la evidencia final y dejar la rama preparada para decisión humana G4,
  sin modificar código de producto, datos ni base de datos.

source_sha: "8a4c49f5b482d78e6157f871afb7bb64adcdb856"

main_reference_sha: "c907696506594860e286db432cb07cbf3f3f5c72"

source_branch: "fix/igf-forecast-acumulado-hg-compras-tarifa-059-r1"

branch: "integration/igf-forecast-acumulado-059-r1"

prior_tasks:
  - task_id: "FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059"
    sha: "48863b0f29ec983396c64ffb09e3b52805572f36"
  - task_id: "FIX-IGF-FORECAST-ACUMULADO-HG-COMPRAS-TARIFA-059-R1"
    sha: "8a4c49f5b482d78e6157f871afb7bb64adcdb856"

production_evidence:
  - "folio-dashboard Live en c907696506594860e286db432cb07cbf3f3f5c72."
  - "folio-whatsapp-bot Live en c907696506594860e286db432cb07cbf3f3f5c72."
  - "FIX 054-R3 8f8bbd79aaafed126449d3090338d1d5a8adf5eb es ancestro de main."
  - "Acapulco productivo es public.plantas.id=1, nombre Acapulco, clave ACAPULCO."
  - "public.plantas.id=12 corresponde a E10, no a Acapulco."
  - "La prueba inicial de la auditoría 060 contra planta_id=12 no representaba Acapulco."
  - "Con planta_id=1, septiembre 2026 tiene 3 proveedores, 72 compras, 30 HG y 3 tarifas."
  - "Con planta_id=1, octubre 2026 al corte 2026-10-03 tiene 3 proveedores, 4 compras, 2 HG y 3 tarifas."
  - "resolveControlComprasDays entrega COSTO/FLETE numéricos para Acapulco id=1."
  - "En main, 2026-10-01 hereda costo anterior pero flete queda null."
  - "059 agrega el fallback histórico de tarifa consolidada para ese caso del día 1."
  - "No se requiere migración, alias ni modificación de IDs de plantas."

in_scope:
  - "Validación read-only del diff main c907696506594860e286db432cb07cbf3f3f5c72 -> source 8a4c49f5b482d78e6157f871afb7bb64adcdb856."
  - "Ejecutar tests existentes de 059 y 059-R1."
  - "Ejecutar regresiones 052, 036, 037, 054, 054-R1, 054-R2, 054-R3 y 055."
  - "Ejecutar frontend build."
  - "Ejecutar git diff --check."
  - "Verificar ahead 2 / behind 0 respecto de main_reference_sha."
  - "Verificar que no existen commits de producto posteriores a source_sha."
  - "Crear docs/dev-loop/reports/INTEGRATION-IGF-FORECAST-ACUMULADO-059-R1.md."
  - "docs/dev-loop/CURRENT_TASK.md solo para transición de status permitida por LOOP_PROTOCOL."
  - "Commit del reporte y CURRENT_TASK en la rama integration/igf-forecast-acumulado-059-r1."
  - "Push únicamente de integration/igf-forecast-acumulado-059-r1."

out_of_scope:
  - "Modificar frontend-dashboard/components/IgfForecastClient.tsx."
  - "Modificar frontend-dashboard/lib/api.ts."
  - "Modificar lib/compras-dashboard.js."
  - "Modificar lib/compras-excel.js."
  - "Modificar lib/dashboard-arr-forecast.js."
  - "Modificar lib/igf-diario-grafica.js."
  - "Modificar lib/igf-diario-puebla.js."
  - "Modificar tests de producto."
  - "Modificar server.js."
  - "Modificar schema o datos."
  - "Modificar public.plantas."
  - "Migrar compras entre planta_id."
  - "Editar el worktree folio-060-wt."
  - "Editar o incorporar el reporte 060 local incorrecto."
  - "Merge a main."
  - "Push a main."
  - "Deploy."

contracts_in_force:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "origin/main en c907696506594860e286db432cb07cbf3f3f5c72"

acceptance_criteria:
  - "La rama fuente conserva ahead 2 / behind 0 respecto de main."
  - "No hay cambios de producto posteriores a 8a4c49f5b482d78e6157f871afb7bb64adcdb856."
  - "Forecast conserva el comportamiento original."
  - "IGF Diario acumulado usa Margen desde H del TOTAL MES dinámico."
  - "HG acumulado usa negativo de Y del TOTAL MES dinámico."
  - "No existen hardcodes H48/Y48."
  - "No se mezcla Forecast con acumulado cuando falta una planta."
  - "Cambio de periodo/corte invalida acumulado anterior."
  - "Zona Provincia se recalcula con una sola metodología."
  - "Tarifa propia válida del día 1 prevalece."
  - "Sin tarifa propia del día 1 se usa tarifa consolidada histórica válida."
  - "No se usa día 2 como fallback de tarifa."
  - "No se usa cero como fallback."
  - "No se selecciona arbitrariamente la tarifa de un proveedor."
  - "No existen modificaciones a DB/schema/data."
  - "El reporte deja explícito que Acapulco=id1/ACAPULCO e id12=E10."
  - "El reporte deja G4 como decisión exclusivamente humana."

validation:
  - "test/igf-forecast-acumulado-hg-compras-tarifa-059.test.js"
  - "test/igf-forecast-acumulado-hg-compras-tarifa-059-r1.test.js"
  - "regresiones 052, 036, 037, 054, 054-R1, 054-R2, 054-R3, 055"
  - "frontend build"
  - "git diff --check"

forbidden_actions:
  - "Modificar código de producto."
  - "Modificar tests para hacerlos pasar."
  - "Writes o DDL."
  - "Acceso de escritura a producción."
  - "Mover compras entre plantas."
  - "Cambiar IDs o claves de public.plantas."
  - "git add ."
  - "push a main."
  - "merge a main."
  - "crear o aprobar G4."
  - "deploy."
  - "abrir automáticamente una tarea siguiente."

max_attempts: 1

result_report_path: "docs/dev-loop/reports/INTEGRATION-IGF-FORECAST-ACUMULADO-059-R1.md"