task_id: "G4-PREP-IMPL-IGF-DIARIO-DESCUENTOS-RESUMEN-SEMANAL-TODAS-070"

title: "Preparar integración de IMPL 070"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-09"

main_reference_sha: "9b9fa20e6b19279ec6384dfe78f93581e5ed6ecd"

branch: "implementation/igf-diario-descuentos-resumen-semanal-todas-070"

product_sha: "daa3123b663cdb6de04fb5518b0966dcc46e3022"

implementation_final_sha: "6bc33faa19100d6c4d68866cbfa90a6ecab93430"

objective: >
  Preparar G4 y Pull Request de IMPL 070 hacia main.
  Auditar la implementación ya terminada, verificar que el producto
  corresponde al alcance autorizado y preparar el PR para revisión humana.
  No modificar producto ni tests.
  No hacer merge ni deploy.

verified_scope:
  descuentos:
    - "Nueva columna AK DESCUENTOS."
    - "Compara descuento $/kg contra la compra real inmediatamente anterior del mismo cliente."
    - "Puede cruzar semana y mes."
    - "Solo aparecen clientes cuyo descuento cambió."
    - "Delta de disminución en verde."
    - "Delta de aumento en rojo."
    - "Solo el delta usa rich text de color."
    - "Fuente: arr.descuentos_diarios_cliente y arr.ventas_diarias_cliente."
    - "Descuento $/kg = SUM(monto) / SUM(kg)."
    - "AK auxiliar existente fue desplazada, no sobrescrita."

  final_column_map:
    septiembre:
      AH: "COMENTARIO DEL DIA"
      AI: "VENTAS"
      AJ: "costo auxiliar oculto"
      AK: "DESCUENTOS"
      AL: "flete auxiliar oculto"

    octubre:
      AI: "COMENTARIO DEL DIA"
      AJ: "VENTAS"
      AK: "DESCUENTOS"
      AL: "costo auxiliar oculto"
      AM: "flete auxiliar oculto"

  resumen_semanal_todas:
    - "RESUMEN SEMANAL después de Concepto y antes de la primera planta."
    - "Venta en Kilos = suma."
    - "Ingreso Generado = suma."
    - "HG = suma."
    - "RESULTADO (Importe) = suma."
    - "Métricas $/kg = ponderación por Venta en Kilos."
    - "Null no se convierte a cero."
    - "Venta 0 no participa en ponderación."
    - "RESULTADO ($/kg) respeta elegibilidad de la métrica."

  excel_resumen:
    - "Selección Todas genera TODAS CONSOLIDADO."
    - "Tabla y gráfica consumen la misma serie consolidada."
    - "Export individual permanece sin cambio."
    - "069-R2 permanece: labels, positivo/negativo, línea cero, real/proyectado y null como hueco."

validated_tests:
  - "123 pruebas PASS."
  - "070 PASS."
  - "053BC PASS."
  - "064–069-R2 PASS."
  - "node --check server.js PASS."
  - "frontend build PASS."

in_scope:
  - "git fetch origin."
  - "Verificar origin/main exacto."
  - "Verificar ancestry."
  - "Verificar ahead/behind."
  - "Verificar product SHA."
  - "Verificar implementation final SHA."
  - "Auditar rango product_sha..implementation_final_sha."
  - "Revisar diff completo origin/main...HEAD."
  - "Verificar específicamente desplazamiento seguro de auxiliares AK/AL/AM."
  - "Verificar fórmula y fuente de DESCUENTOS."
  - "Verificar agregación RESUMEN SEMANAL Todas."
  - "Verificar RESUMEN Excel Todas."
  - "Crear reporte G4."
  - "Actualizar CURRENT_TASK."
  - "Commit exclusivamente documental G4."
  - "Push únicamente a rama 070."
  - "Crear PR hacia main."
  - "Verificar PR final."
  - "STOP."

out_of_scope:
  - "Modificar producto."
  - "Modificar tests."
  - "Modificar fórmula de descuentos."
  - "Modificar agregación financiera."
  - "Modificar columnas."
  - "Modificar gráfica."
  - "Modificar DB."
  - "Modificar ARR."
  - "Modificar Forecast."
  - "Modificar Folios."
  - "Rebase."
  - "Merge."
  - "Deploy."
  - "Auto-merge."

pr_contract:
  base: "main"
  head: "implementation/igf-diario-descuentos-resumen-semanal-todas-070"
  title: "IMPL 070: descuentos por cliente y resumen semanal consolidado"
  preferred_merge: "Squash and merge"
  merge_executor: "HUMAN_APPROVER_ONLY"

merge_contract:
  merge_authorized: false
  deploy_authorized: false
  auto_merge: false

required_g4_checks:
  - >
    Confirmar que daa3123b663cdb6de04fb5518b0966dcc46e3022
    pertenece a la rama.
  - >
    Confirmar que 6bc33faa19100d6c4d68866cbfa90a6ecab93430
    corresponde al cierre reportado.
  - >
    Auditar exactamente:
    daa3123b663cdb6de04fb5518b0966dcc46e3022
    ..
    6bc33faa19100d6c4d68866cbfa90a6ecab93430
  - >
    Después del SHA producto no debe existir ningún cambio funcional
    de producto o tests.
  - >
    Confirmar que el diff completo contra main corresponde únicamente
    a IMPL 070 y su documentación.
  - >
    Confirmar que la inserción de AK no destruyó auxiliares existentes.
  - >
    Confirmar que no quedaron fórmulas/referencias obsoletas apuntando
    a las antiguas posiciones AK/AL.
  - >
    Confirmar que el consolidado Todas no usa promedio simple.
  - >
    Confirmar que tabla y gráfica RESUMEN Todas consumen el mismo consolidado.

stop_conditions:
  - "Si origin/main != 9b9fa20e6b19279ec6384dfe78f93581e5ed6ecd, STOP."
  - "Si product_sha no pertenece a la rama, STOP."
  - "Si implementation_final_sha no corresponde al cierre reportado, STOP."
  - "Si después del product SHA hay cambios funcionales o de tests, STOP."
  - "Si aparecen cambios fuera del alcance 070, STOP."
  - "Si existe una referencia rota por desplazamiento AK/AL/AM, STOP."
  - "Si RESUMEN SEMANAL usa promedio simple en alguna métrica $/kg, STOP."
  - "Si tabla y gráfica Todas no tienen paridad, STOP."
  - "Si PR tiene conflictos o no es mergeable, STOP."
  - "No rebase."
  - "No merge."
  - "No deploy."

result_report_path: >
  docs/dev-loop/reports/G4-PREP-IMPL-IGF-DIARIO-DESCUENTOS-RESUMEN-SEMANAL-TODAS-070.md

completion:
  status: "DONE_PENDING_REVIEW"
  merge: false
  deploy: false